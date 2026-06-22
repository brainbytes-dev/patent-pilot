import { inngest } from "@/lib/inngest";
import { getDb, sql } from "@repo/db";
import { patents } from "@repo/db/schema";

const OPS = "https://ops.epo.org/3.2/rest-services";
const BATCH = 100; // OPS max per request

// Tracks sweep progress: stores last processed date in DB via a simple key-value pattern
const CURSOR_KEY = "bulk_sweep_cursor";

interface OpsDoc {
  "@country": string;
  "@doc-number": string;
  "@kind": string;
  "@family-id"?: string;
}

interface OpsSearchResult {
  "ops:world-patent-data"?: {
    "ops:biblio-search"?: [{
      "ops:search-result"?: [{
        "ops:publication-reference"?: Array<{ "document-id": OpsDoc[] }>;
      }];
      "@total-result-count"?: string;
    }];
  };
}

async function opsSearch(query: string, range: string): Promise<OpsDoc[]> {
  const url = `${OPS}/published-data/search?q=${encodeURIComponent(query)}&Range=${range}`;
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(15_000),
  });
  if (res.status === 429) throw new Error("OPS_RATE_LIMIT");
  if (!res.ok) throw new Error(`OPS ${res.status}`);
  const data = await res.json() as OpsSearchResult;
  const refs =
    data?.["ops:world-patent-data"]?.["ops:biblio-search"]?.[0]?.[
      "ops:search-result"
    ]?.[0]?.["ops:publication-reference"] ?? [];
  return refs.map((r) => r["document-id"]?.[0]).filter(Boolean) as OpsDoc[];
}

interface OpsDoc2 {
  "@country": string;
  "@doc-number": string;
  "@kind": string;
}

interface OpsBiblioResult {
  "ops:world-patent-data"?: {
    "exchange-documents"?: [{
      "exchange-document": Array<{
        "bibliographic-data"?: [{
          "invention-title"?: Array<{ "#text"?: string; "@lang"?: string }>;
          "patent-classifications"?: [{
            "patent-classification"?: Array<{
              section?: [string];
              class?: [string];
              subclass?: [string];
            }>;
          }];
          "application-reference"?: [{
            "document-id"?: Array<{
              date?: [string];
            }>;
          }];
          parties?: [{
            applicants?: [{
              applicant?: Array<{
                "applicant-name"?: [{ name?: [string] }];
              }>;
            }];
          }];
        }];
        "@country"?: string;
        "@doc-number"?: string;
        "@kind"?: string;
      }>;
    }];
  };
}

async function opsBiblio(number: string): Promise<{
  title: string;
  titleDe: string | null;
  filingDate: string | null;
  owner: string | null;
  cpcCodes: string[];
} | null> {
  try {
    const url = `${OPS}/published-data/publication/epodoc/${number}/biblio`;
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return null;
    const data = await res.json() as OpsBiblioResult;
    const doc =
      data?.["ops:world-patent-data"]?.["exchange-documents"]?.[0]?.[
        "exchange-document"
      ]?.[0];
    if (!doc) return null;

    const biblio = doc["bibliographic-data"]?.[0];

    // Titles
    const titles = biblio?.["invention-title"] ?? [];
    const titleEn = titles.find((t) => t["@lang"] === "en")?.["#text"] ?? titles[0]?.["#text"] ?? "";
    const titleDe = titles.find((t) => t["@lang"] === "de")?.["#text"] ?? null;

    // CPC
    const cpcBlocks = biblio?.["patent-classifications"]?.[0]?.["patent-classification"] ?? [];
    const cpcCodes = cpcBlocks
      .map((c) => `${c.section?.[0] ?? ""}${c.class?.[0] ?? ""}${c.subclass?.[0] ?? ""}`.trim())
      .filter(Boolean)
      .slice(0, 6);

    // Filing date
    const appDocIds = biblio?.["application-reference"]?.[0]?.["document-id"] ?? [];
    const dateRaw = appDocIds[0]?.date?.[0] ?? "";
    const filingDate =
      dateRaw.length === 8
        ? `${dateRaw.slice(0, 4)}-${dateRaw.slice(4, 6)}-${dateRaw.slice(6, 8)}`
        : null;

    // Owner
    const applicants = biblio?.parties?.[0]?.applicants?.[0]?.applicant ?? [];
    const owner = applicants[0]?.["applicant-name"]?.[0]?.name?.[0] ?? null;

    return { title: titleEn || titleDe || "", titleDe, filingDate, owner, cpcCodes: [...new Set(cpcCodes)] };
  } catch {
    return null;
  }
}

function weekRange(weekOffset: number): { from: string; to: string; label: string } {
  const now = new Date();
  // Go back weekOffset weeks from current week
  const monday = new Date(now);
  monday.setDate(now.getDate() - now.getDay() + 1 - weekOffset * 7);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const fmt = (d: Date) => d.toISOString().slice(0, 10).replace(/-/g, "");
  return { from: fmt(monday), to: fmt(sunday), label: `${fmt(monday)}-${fmt(sunday)}` };
}

export const bulkPatentSweepFn = inngest.createFunction(
  {
    id: "bulk-patent-sweep",
    retries: 1,
    // Throttle: max 60 OPS calls per 15 minutes (anonymous: 500/week, be conservative)
    throttle: { limit: 60, period: "15m", key: "ops-anonymous" },
  },
  { cron: "0 3 * * *" }, // 03:00 UTC daily, after nightly-ingest at 01:00
  async ({ step }) => {
    const db = getDb();

    // Read cursor: which week are we sweeping?
    const cursorRow = await step.run("read-cursor", async () => {
      const rows = await db.execute(
        sql`SELECT value FROM system_config WHERE key = ${CURSOR_KEY} LIMIT 1`
      ).catch(() => []);
      return (rows as Array<{ value: string }>)[0]?.value ?? null;
    });

    // Parse cursor (format: "weekOffset:pageOffset")
    let weekOffset = 0;
    let pageOffset = 1;
    if (cursorRow) {
      const [w, p] = cursorRow.split(":").map(Number);
      weekOffset = w ?? 0;
      pageOffset = p ?? 1;
    }

    const week = weekRange(weekOffset);
    const query = `pd=${week.from}-${week.to} AND pn=EP`;
    const rangeEnd = pageOffset + BATCH - 1;
    const range = `${pageOffset}-${rangeEnd}`;

    const docs = await step.run(`search-week-${week.label}-page-${pageOffset}`, async () => {
      try {
        return await opsSearch(query, range);
      } catch (e) {
        if ((e as Error).message === "OPS_RATE_LIMIT") return [];
        return [];
      }
    });

    const ingested = await step.run("enrich-and-upsert", async () => {
      let count = 0;
      for (const doc of docs) {
        const patentNumber = `${doc["@country"]}${doc["@doc-number"]}${doc["@kind"]}`;
        if (!patentNumber || patentNumber.length < 5) continue;

        // Throttle between biblio calls (1 req / 200ms to stay under rate limit)
        await new Promise((r) => setTimeout(r, 220));

        const biblio = await opsBiblio(patentNumber);
        if (!biblio?.title) continue;

        await db
          .insert(patents)
          .values({
            patentNumber,
            title: biblio.title,
            titleDe: biblio.titleDe ?? undefined,
            filingDate: biblio.filingDate ?? undefined,
            cpcCodes: biblio.cpcCodes,
            owner: biblio.owner ?? undefined,
            status: "active",
            source: "epo",
          })
          .onConflictDoNothing();

        count++;
      }
      return count;
    });

    // Advance cursor
    const nextCursor = await step.run("advance-cursor", async () => {
      let nextWeek = weekOffset;
      let nextPage = pageOffset + BATCH;

      // If fewer results than batch size, this week is exhausted — move to next
      if (docs.length < BATCH) {
        nextWeek = weekOffset + 1;
        nextPage = 1;
        // After sweeping 52 weeks, wrap around to current week
        if (nextWeek > 52) nextWeek = 0;
      }

      const cursor = `${nextWeek}:${nextPage}`;
      await db.execute(
        sql`INSERT INTO system_config (key, value, updated_at)
            VALUES (${CURSOR_KEY}, ${cursor}, now())
            ON CONFLICT (key) DO UPDATE SET value = ${cursor}, updated_at = now()`
      ).catch(() => null); // table may not exist yet — silent fail

      return cursor;
    });

    return {
      week: week.label,
      range,
      found: docs.length,
      ingested,
      nextCursor,
    };
  }
);
