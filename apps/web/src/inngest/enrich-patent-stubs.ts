import { inngest } from "@/lib/inngest";
import { getDb } from "@repo/db";
import { patents } from "@repo/db/schema";
import { isNull, like, sql } from "drizzle-orm";

const OPS = "https://ops.epo.org/3.2/rest-services";
const OPS_AUTH_URL = "https://ops.epo.org/3.2/auth/accesstoken";

// How many patents to enrich per 15-min cron tick.
// At ~0.45s per OPS call, 600 calls ≈ 270s — fits inside 300s Vercel limit.
const BATCH_SIZE = 600;

// ── Token cache (module-level, shared across invocations in same instance) ──

let cachedToken: { value: string; expiresAt: number } | null = null;

async function getOpsToken(): Promise<string | null> {
  const clientId = process.env.EPO_OPS_CLIENT_ID;
  const clientSecret = process.env.EPO_OPS_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;
  if (cachedToken && Date.now() < cachedToken.expiresAt) return cachedToken.value;

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const res = await fetch(OPS_AUTH_URL, {
    method: "POST",
    headers: { Authorization: `Basic ${credentials}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=client_credentials",
    signal: AbortSignal.timeout(8_000),
  });
  if (!res.ok) return null;
  const data = await res.json() as { access_token: string; expires_in: number };
  cachedToken = { value: data.access_token, expiresAt: Date.now() + (data.expires_in - 60) * 1000 };
  return cachedToken.value;
}

// ── OPS biblio fetch ──────────────────────────────────────────────────────────

interface BiblioResult {
  title: string;
  titleDe: string | null;
  filingDate: string | null;
  owner: string | null;
  cpcCodes: string[];
}

type JsonObj = Record<string, unknown>;

function asList<T>(v: T | T[] | undefined | null): T[] {
  if (Array.isArray(v)) return v;
  return v != null ? [v] : [];
}

async function fetchBiblio(epNumber: string, token: string | null): Promise<BiblioResult | null> {
  // epNumber: bare EP number without kind code (e.g. "2719985")
  const headers: Record<string, string> = { Accept: "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  try {
    const res = await fetch(`${OPS}/published-data/publication/epodoc/EP${epNumber}/biblio`, {
      headers,
      signal: AbortSignal.timeout(8_000),
    });
    if (res.status === 429) throw new Error("RATE_LIMIT");
    if (!res.ok) return null;

    const data = await res.json() as JsonObj;
    const wpd = data["ops:world-patent-data"] as JsonObj | undefined;
    const docs = asList(wpd?.["exchange-documents"]);
    const exDocRaw = (docs[0] as JsonObj | undefined)?.["exchange-document"];
    const exDoc = asList(exDocRaw as JsonObj | JsonObj[])[0] as JsonObj | undefined;
    const biblio = asList((exDoc?.["bibliographic-data"] as JsonObj | JsonObj[] | undefined))[0] as JsonObj | undefined;
    if (!biblio) return null;

    // Titles
    let titleEn = "";
    let titleDe: string | null = null;
    for (const t of asList(biblio["invention-title"] as JsonObj[] | undefined)) {
      const lang = t["@lang"] as string | undefined;
      const text = (t["#text"] ?? t["$"]) as string | undefined;
      if (!text) continue;
      if (lang === "en" && !titleEn) titleEn = text;
      else if (lang === "de" && !titleDe) titleDe = text;
    }
    if (!titleEn) titleEn = titleDe ?? "";

    // Filing date
    let filingDate: string | null = null;
    outer: for (const ref of asList(biblio["application-reference"] as JsonObj[] | undefined)) {
      for (const did of asList(ref["document-id"] as JsonObj[] | undefined)) {
        const d = asList(did["date"] as string[] | undefined)[0];
        if (d && d.length === 8) {
          filingDate = `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`;
          break outer;
        }
      }
    }

    // CPC codes
    const cpcCodes: string[] = [];
    const classifications = asList(
      (asList(biblio["patent-classifications"] as JsonObj[] | undefined)[0] as JsonObj | undefined)
        ?.["patent-classification"] as JsonObj[] | undefined,
    );
    for (const c of classifications) {
      const section = asList(c["section"] as string[] | undefined)[0] ?? "";
      const cls = asList(c["class"] as string[] | undefined)[0] ?? "";
      const sub = asList(c["subclass"] as string[] | undefined)[0] ?? "";
      const code = `${section}${cls}${sub}`.trim();
      if (code) cpcCodes.push(code);
    }

    // Owner
    let owner: string | null = null;
    const parties = asList(biblio["parties"] as JsonObj[] | undefined)[0] as JsonObj | undefined;
    const applicants = asList(
      (asList(parties?.["applicants"] as JsonObj[] | undefined)[0] as JsonObj | undefined)
        ?.["applicant"] as JsonObj[] | undefined,
    );
    for (const a of applicants) {
      const nameObj = asList(a["applicant-name"] as JsonObj[] | undefined)[0] as JsonObj | undefined;
      const n = asList(nameObj?.["name"] as string[] | undefined)[0];
      if (n) { owner = n; break; }
    }

    return { title: titleEn, titleDe, filingDate, owner, cpcCodes: [...new Set(cpcCodes)].slice(0, 8) };
  } catch (e) {
    if ((e as Error).message === "RATE_LIMIT") throw e;
    return null;
  }
}

// ── Inngest function ──────────────────────────────────────────────────────────

export const enrichPatentStubsFn = inngest.createFunction(
  {
    id: "enrich-patent-stubs",
    retries: 0,
    concurrency: { limit: 1 }, // only one instance runs at a time
  },
  { cron: "*/15 * * * *" }, // every 15 minutes = 96 runs/day = ~57k enrichments/day
  async ({ step, logger }) => {
    const db = getDb();

    // Fetch next batch: EP stubs ohne Titel, priorisiert nach:
    // 1. Abgelaufene Patente (status = lapsed)
    // 2. Patente die in <3 Jahren ablaufen (nah an der 20-Jahres-Grenze)
    // 3. Restliche (älteste zuerst)
    const stubs = await step.run("fetch-stubs", async () => {
      return db
        .select({ id: patents.id, patentNumber: patents.patentNumber })
        .from(patents)
        .where(
          sql`${isNull(patents.title)}
              AND ${like(patents.patentNumber, "EP%")}
              AND (
                patents.status = 'lapsed'
                OR (patents.expiry_date IS NOT NULL
                    AND patents.expiry_date <= (CURRENT_DATE + INTERVAL '3 years'))
              )`
        )
        .orderBy(
          sql`CASE WHEN patents.status = 'lapsed' THEN 0 ELSE 1 END`,
          patents.expiryDate,
        )
        .limit(BATCH_SIZE);
    });

    if (stubs.length === 0) {
      logger.info("No stubs to enrich — all EP patents have titles.");
      return { enriched: 0, total: 0 };
    }

    logger.info(`Enriching ${stubs.length} stubs...`);

    const token = await step.run("get-ops-token", () => getOpsToken());

    const results = await step.run("enrich-batch", async () => {
      let enriched = 0;
      let failed = 0;
      let rateLimited = false;

      for (const stub of stubs) {
        if (rateLimited) break;

        // Strip EP prefix + kind code → bare number for OPS
        const epNum = stub.patentNumber.replace(/^EP/, "").replace(/[A-Z]\d*$/, "");

        let biblio: BiblioResult | null = null;
        try {
          biblio = await fetchBiblio(epNum, token);
        } catch (e) {
          if ((e as Error).message === "RATE_LIMIT") {
            rateLimited = true;
            break;
          }
        }

        if (biblio?.title) {
          await db
            .update(patents)
            .set({
              title: biblio.title,
              titleDe: biblio.titleDe ?? undefined,
              filingDate: biblio.filingDate ?? undefined,
              owner: biblio.owner ?? undefined,
              cpcCodes: biblio.cpcCodes,
              updatedAt: new Date(),
            })
            .where(sql`id = ${stub.id}`);
          enriched++;
        } else {
          // Mark with placeholder so we don't retry endlessly for unknown patents
          await db
            .update(patents)
            .set({ title: "[no data]", updatedAt: new Date() })
            .where(sql`id = ${stub.id}`);
          failed++;
        }

        // 0.45s between calls → ~2.2 req/sec (under 65 req/30s OPS limit)
        await new Promise((r) => setTimeout(r, 450));
      }

      return { enriched, failed, rateLimited };
    });

    // Verbleibende prioritäre Stubs zählen
    const remaining = await step.run("count-remaining", async () => {
      const rows = await db
        .select({ count: sql<number>`count(*)` })
        .from(patents)
        .where(sql`
          ${isNull(patents.title)}
          AND ${like(patents.patentNumber, "EP%")}
          AND (
            patents.status = 'lapsed'
            OR (patents.expiry_date IS NOT NULL
                AND patents.expiry_date <= (CURRENT_DATE + INTERVAL '3 years'))
          )
        `);
      return Number(rows[0]?.count ?? 0);
    });

    logger.info(
      `Done: ${results.enriched} enriched, ${results.failed} no-data, ${remaining} remaining`
    );

    return {
      enriched: results.enriched,
      failed: results.failed,
      rateLimited: results.rateLimited,
      remainingStubs: remaining,
      estimatedDaysToComplete: remaining > 0 ? Math.ceil(remaining / (BATCH_SIZE * 96)) : 0,
    };
  },
);
