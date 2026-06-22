import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getDb } from "@repo/db";
import { patents, patentEvents } from "@repo/db/schema";
import { eq, asc, or } from "drizzle-orm";
import { headers } from "next/headers";

const OPS = "https://ops.epo.org/3.2/rest-services";

let cachedToken: { value: string; expiresAt: number } | null = null;

async function getOpsToken(): Promise<string | null> {
  const clientId = process.env.EPO_OPS_CLIENT_ID;
  const clientSecret = process.env.EPO_OPS_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;
  if (cachedToken && Date.now() < cachedToken.expiresAt) return cachedToken.value;

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const res = await fetch("https://ops.epo.org/3.2/auth/accesstoken", {
    method: "POST",
    headers: { Authorization: `Basic ${credentials}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=client_credentials",
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) return null;
  const data = await res.json() as { access_token: string; expires_in: number };
  cachedToken = { value: data.access_token, expiresAt: Date.now() + (data.expires_in - 60) * 1000 };
  return cachedToken.value;
}

interface OpsEnriched {
  inventors: string[];
  abstractEn: string | null;
  abstractDe: string | null;
  claimsEn: string | null;
  applicationNumber: string | null;
  fetchedAt: string;
}

interface OpsLegal {
  lapsedAt: string | null;   // ISO date string
  fetchedAt: string;
}

// Lapse-Event-Codes aus INPADOC: PCCL = Patent ceased (EP-Ebene), plus nationale Varianten
const LAPSE_KINDS = new Set(["PCCL", "LAPD", "LAPS", "LAPL", "LAPR", "PCL", "CEASED"]);

function parseLapseDate(raw: unknown): string | null {
  if (!raw) return null;
  const events: Array<Record<string, unknown>> = Array.isArray(raw)
    ? (raw as Array<Record<string, unknown>>)
    : [raw as Record<string, unknown>];

  let latest: Date | null = null;
  for (const ev of events) {
    const kind   = (ev["@kind"] as string | undefined)?.toUpperCase() ?? "";
    const dateRaw = ev["@effective-date"] as string | undefined;
    const text   = (ev["ops:text"] as string | undefined)?.toLowerCase() ?? "";

    const isLapse =
      LAPSE_KINDS.has(kind) ||
      kind.includes("LAP") ||
      kind.includes("CEAS") ||
      text.includes("lapse") ||
      text.includes("ceased") ||
      text.includes("no longer in force");

    if (isLapse && dateRaw) {
      // OPS gibt Daten als YYYYMMDD zurück
      const normalized = dateRaw.replace(/^(\d{4})(\d{2})(\d{2})$/, "$1-$2-$3");
      const d = new Date(normalized);
      if (!isNaN(d.getTime()) && (!latest || d > latest)) latest = d;
    }
  }
  return latest ? latest.toISOString().split("T")[0]! : null;
}

async function fetchOpsLegalStatus(patentNumber: string, token: string | null): Promise<OpsLegal> {
  const authHeaders: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
  const epodocBase = patentNumber.replace(/[A-Z]\d*$/, "");

  const res = await fetch(`${OPS}/legal/publication/epodoc/${epodocBase}/legal`, {
    headers: { ...authHeaders, Accept: "application/json" },
    signal: AbortSignal.timeout(8000),
  });

  if (!res.ok) return { lapsedAt: null, fetchedAt: new Date().toISOString() };

  try {
    const data = await res.json() as Record<string, unknown>;
    const wpd  = data["ops:world-patent-data"] as Record<string, unknown> | undefined;
    const legal = wpd?.["ops:legal"];

    // legal kann Array (mehrere Länder) oder Objekt (ein Land) sein
    const legalArr: Array<Record<string, unknown>> = Array.isArray(legal)
      ? (legal as Array<Record<string, unknown>>)
      : legal ? [legal as Record<string, unknown>] : [];

    const allEvents = legalArr.flatMap((l) => {
      const evs = l["ops:legal-event"];
      return Array.isArray(evs) ? evs : evs ? [evs] : [];
    });

    const lapsedAt = parseLapseDate(allEvents);
    return { lapsedAt, fetchedAt: new Date().toISOString() };
  } catch {
    return { lapsedAt: null, fetchedAt: new Date().toISOString() };
  }
}

async function fetchOpsEnrichment(patentNumber: string): Promise<OpsEnriched> {
  const token = await getOpsToken();
  const authHeaders: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

  // OPS works without kind code for biblio/claims (e.g. EP2719985 not EP2719985A1)
  const epodocBase = patentNumber.replace(/[A-Z]\d*$/, "");

  const [biblioRes, claimsRes] = await Promise.allSettled([
    fetch(`${OPS}/published-data/publication/epodoc/${epodocBase}/biblio`, {
      headers: { ...authHeaders, Accept: "application/json" },
      signal: AbortSignal.timeout(6000),
    }),
    fetch(`${OPS}/published-data/publication/epodoc/${epodocBase}/claims`, {
      headers: { ...authHeaders, Accept: "application/xml" },
      signal: AbortSignal.timeout(6000),
    }),
  ]);

  let inventors: string[] = [];
  let abstractEn: string | null = null;
  let abstractDe: string | null = null;
  let applicationNumber: string | null = null;

  if (biblioRes.status === "fulfilled" && biblioRes.value.ok) {
    try {
      const data = await biblioRes.value.json() as Record<string, unknown>;
      const wpd = data?.["ops:world-patent-data"] as Record<string, unknown> | undefined;
      const docs = wpd?.["exchange-documents"] as Array<Record<string, unknown>> | undefined;
      const doc = docs?.[0]?.["exchange-document"];
      const exchangeDoc = (Array.isArray(doc) ? doc[0] : doc) as Record<string, unknown> | undefined;
      const biblio = (exchangeDoc?.["bibliographic-data"] as Array<Record<string, unknown>>)?.[0];

      // Inventors
      const parties = (biblio?.["parties"] as Array<Record<string, unknown>>)?.[0];
      const inventorList = (parties?.["inventors"] as Array<Record<string, unknown>>)?.[0];
      const invItems = (inventorList?.["inventor"] as Array<Record<string, unknown>>) ?? [];
      for (const inv of invItems) {
        const name = (inv?.["inventor-name"] as Array<Record<string, unknown>>)?.[0];
        const n = (name?.["name"] as string[] | undefined)?.[0];
        if (n) inventors.push(n);
      }

      // Abstracts
      const abstracts = (biblio?.["abstract"] as Array<Record<string, unknown>>) ?? [];
      for (const ab of abstracts) {
        const lang = ab?.["@lang"] as string | undefined;
        const paras = (ab?.["p"] as Array<Record<string, unknown>>) ?? [];
        const text = paras.map((p) => (p?.["#text"] ?? p) as string).join(" ").trim()
          || (ab?.["#text"] as string ?? "");
        if (lang === "en" && !abstractEn) abstractEn = text || null;
        if (lang === "de" && !abstractDe) abstractDe = text || null;
        if (!abstractEn && text) abstractEn = text;
      }

      // Application number (for EPO Register link)
      const appRef = (biblio?.["application-reference"] as Array<Record<string, unknown>>)?.[0];
      const appDocId = (appRef?.["document-id"] as Array<Record<string, unknown>>)?.[0];
      const appDocNum = (appDocId?.["doc-number"] as string[] | undefined)?.[0];
      if (appDocNum) applicationNumber = appDocNum;
    } catch {
      // OPS parse failure — continue with partial data
    }
  }

  let claimsEn: string | null = null;
  if (claimsRes.status === "fulfilled" && claimsRes.value.ok) {
    try {
      const xml = await claimsRes.value.text();
      // Extract claim text from XML — strip tags, take first 3 independent claims
      const claimMatches = [...xml.matchAll(/<claim[^>]*>([\s\S]*?)<\/claim>/gi)];
      const claimTexts = claimMatches
        .slice(0, 3)
        .map((m) => m[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim())
        .filter(Boolean);
      if (claimTexts.length > 0) claimsEn = claimTexts.join("\n\n");
    } catch {
      // ignore
    }
  }

  return { inventors, abstractEn, abstractDe, claimsEn, applicationNumber, fetchedAt: new Date().toISOString() };
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const db = getDb();

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  const [patent] = await db.select().from(patents).where(
    isUuid ? eq(patents.id, id) : or(eq(patents.patentNumber, id), eq(patents.patentNumber, id.toUpperCase()))
  ).limit(1);
  if (!patent) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const events = await db
    .select()
    .from(patentEvents)
    .where(eq(patentEvents.patentId, patent.id))
    .orderBy(asc(patentEvents.eventDate));

  const token = await getOpsToken();
  const raw = patent.rawData as Record<string, unknown> | null;

  // --- OPS Legal Status (7-Tage-Cache) ---
  const cachedLegal = raw?.["ops_legal"] as OpsLegal | undefined;
  const legalAge = cachedLegal?.fetchedAt ? Date.now() - new Date(cachedLegal.fetchedAt).getTime() : Infinity;
  const legalStale = legalAge > 7 * 24 * 60 * 60 * 1000;

  if (legalStale) {
    try {
      const legal = await fetchOpsLegalStatus(patent.patentNumber, token);
      const newLapsedAt = legal.lapsedAt ? new Date(legal.lapsedAt) : null;
      const currentLapsedAt = patent.lapsedAt ? new Date(patent.lapsedAt as string) : null;

      // DB-Update wenn OPS einen anderen/neueren Lapse-Wert liefert
      const lapsedChanged =
        (newLapsedAt && !currentLapsedAt) ||
        (newLapsedAt && currentLapsedAt && newLapsedAt.getTime() !== currentLapsedAt.getTime());

      db.update(patents)
        .set({
          rawData: { ...(raw ?? {}), ops_legal: legal },
          ...(lapsedChanged ? { lapsedAt: newLapsedAt?.toISOString().split("T")[0] ?? null, status: "lapsed" } : {}),
          updatedAt: new Date(),
        })
        .where(eq(patents.id, id))
        .catch(() => null);

      if (lapsedChanged) {
        (patent as Record<string, unknown>)["lapsedAt"] = newLapsedAt?.toISOString() ?? null;
        (patent as Record<string, unknown>)["status"] = "lapsed";
      }
    } catch {
      // OPS nicht erreichbar — vorhandene DB-Daten nutzen
    }
  }

  // --- OPS Biblio-Enrichment (30-Tage-Cache) ---
  let enriched = raw?.["ops"] as OpsEnriched | undefined;
  const enrichedAge = enriched?.fetchedAt ? Date.now() - new Date(enriched.fetchedAt).getTime() : Infinity;
  const enrichedStale = enrichedAge > 30 * 24 * 60 * 60 * 1000;

  if (enrichedStale) {
    try {
      enriched = await fetchOpsEnrichment(patent.patentNumber);
      db.update(patents)
        .set({ rawData: { ...(raw ?? {}), ops: enriched }, updatedAt: new Date() })
        .where(eq(patents.id, id))
        .catch(() => null);
    } catch {
      enriched = undefined;
    }
  }

  return NextResponse.json({ patent, events, enriched: enriched ?? null });
}
