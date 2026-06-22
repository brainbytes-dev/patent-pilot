import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getDb } from "@repo/db";
import { patents } from "@repo/db/schema";
import { ilike, or, sql, and, isNotNull } from "drizzle-orm";
import { headers } from "next/headers";
import { getUserTier, TIER_LIMITS } from "@/lib/tier";

const REGION_PREFIXES: Record<string, string[]> = {
  eu:   ["EP", "DE", "FR", "GB", "AT", "NL", "BE", "CH", "ES", "IT", "SE", "DK", "FI", "NO", "PT", "PL"],
  us:   ["US"],
  asia: ["CN", "JP", "KR", "TW", "IN", "SG"],
};

const NICHE_PREFIXES: Record<string, string[]> = {
  medtech:      ["A61B", "A61C", "A61D", "A61F", "A61G", "A61H", "A61J", "A61L", "A61M", "A61N"],
  pharma:       ["A61K", "A61P"],
  biotech:      ["C12M", "C12N", "C12Q", "C12R", "C12S", "C40B", "A01H"],
  chemistry:    ["C01", "C02", "C07", "C09", "C10", "C11", "C14"],
  polymers:     ["C08"],
  mechanical:   ["F01", "F02", "F04", "F15", "F16", "F17"],
  manufacturing:["B21", "B22", "B23", "B24", "B25", "B26", "B27", "B28", "B29", "B30"],
  automotive:   ["B60", "B62", "F02B", "F02D", "F02M"],
  aerospace:    ["B64"],
  marine:       ["B63"],
  electronics:  ["H01L", "H01M", "H01R", "H01S", "H05"],
  electrical:   ["H02"],
  telecom:      ["H04"],
  software:     ["G06", "G16"],
  optics:       ["G02", "G03"],
  measurement:  ["G01"],
  energy:       ["F03", "F24", "H02J", "C10L"],
  robotics:     ["B25J", "G05B", "G05D"],
  construction: ["E01", "E02", "E03", "E04", "E05", "E06"],
  food:         ["A21", "A22", "A23", "A47J"],
  agriculture:  ["A01"],
  textiles:     ["D01", "D02", "D03", "D04", "D06"],
  packaging:    ["B65"],
  environment:  ["C02F", "B09", "F23G"],
};

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const q = searchParams.get("q")?.trim() ?? "";
  const regionParam   = searchParams.get("region")   ?? "";
  const nicheParam    = searchParams.get("niche")    ?? "";
  const lang          = searchParams.get("lang")     ?? "";
  const sortParam     = searchParams.get("sort")     ?? "date"; // "date" | "name"
  const limitRaw  = parseInt(searchParams.get("limit")  ?? "24", 10);
  const offsetRaw = parseInt(searchParams.get("offset") ?? "0",  10);
  const limit  = Number.isFinite(limitRaw)  && limitRaw  > 0 ? Math.min(limitRaw,  100) : 24;
  const offset = Number.isFinite(offsetRaw) && offsetRaw >= 0 ? offsetRaw : 0;

  const tier = await getUserTier(session.user.id);
  const limits = TIER_LIMITS[tier];

  const db = getDb();
  // Nur enriched Patents anzeigen (title vorhanden, kein Placeholder)
  const conditions = [
    isNotNull(patents.title),
    sql`${patents.title} NOT IN ('[no data]', '[error]')`,
  ];

  // Free-Tier: nur letzte 30 Tage sichtbar
  if (limits.lookbackDays !== null) {
    conditions.push(
      sql`COALESCE(${patents.lapsedAt}, ${patents.expiryDate}) >= now() - interval '${sql.raw(String(limits.lookbackDays))} days'`
    );
  }

  if (q) {
    if (q.length >= 3) {
      conditions.push(
        or(
          sql`search_vector @@ websearch_to_tsquery('simple', ${q})`,
          ilike(patents.patentNumber, `%${q}%`)
        )!
      );
    } else {
      conditions.push(
        or(
          ilike(patents.title, `%${q}%`),
          ilike(patents.titleDe, `%${q}%`),
          ilike(patents.patentNumber, `%${q}%`),
          ilike(patents.owner, `%${q}%`)
        )!
      );
    }
  }

  // Language filter: "de" = only patents with German title (DACH-relevant), "" = all
  if (lang === "de") {
    conditions.push(isNotNull(patents.titleDe));
  }

  // Zeige alle nicht-aktiven: lapsed ODER regulär abgelaufen
  conditions.push(
    or(
      isNotNull(patents.lapsedAt),
      sql`${patents.expiryDate} < now()`
    )!
  );

  // Region filter: EP/DE/FR/... prefix on patent_number
  if (regionParam && REGION_PREFIXES[regionParam]) {
    const prefixes = REGION_PREFIXES[regionParam]!;
    conditions.push(or(...prefixes.map((p) => sql`${patents.patentNumber} LIKE ${p + "%"}`))!);
  }

  // Niche filter: CPC prefix match on any element of cpc_codes array
  if (nicheParam && NICHE_PREFIXES[nicheParam]) {
    const prefixes = NICHE_PREFIXES[nicheParam]!;
    conditions.push(
      or(...prefixes.map((p) =>
        sql`EXISTS (SELECT 1 FROM unnest(${patents.cpcCodes}) AS _c WHERE _c LIKE ${p + "%"})`
      ))!
    );
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  try {
    const [rows, countRows, breakdown] = await Promise.all([
      db
        .select({
          id: patents.id,
          patentNumber: patents.patentNumber,
          title: patents.title,
          titleDe: patents.titleDe,
          abstractDe: patents.abstractDe,
          filingDate: patents.filingDate,
          expiryDate: patents.expiryDate,
          lapsedAt: patents.lapsedAt,
          owner: patents.owner,
          cpcCodes: patents.cpcCodes,
          status: patents.status,
        })
        .from(patents)
        .where(where)
        .orderBy(
          sortParam === "name"
            ? sql`COALESCE(${patents.titleDe}, ${patents.title}) ASC NULLS LAST, id ASC`
            : sql`COALESCE(lapsed_at, expiry_date) DESC NULLS LAST, id ASC`
        )
        .limit(limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(patents)
        .where(where),
      // Nur beim ersten Request (offset=0) den Breakdown berechnen
      offset === 0
        ? db.select({
            freeCount:        sql<number>`count(*) FILTER (WHERE lapsed_at < now() - interval '12 months' OR (lapsed_at IS NULL AND expiry_date < now()))::int`,
            reinstatable_count: sql<number>`count(*) FILTER (WHERE lapsed_at >= now() - interval '12 months')::int`,
          }).from(patents).where(where)
        : Promise.resolve(null),
    ]);
    const total = countRows[0]?.count ?? 0;
    const counts = Array.isArray(breakdown) ? breakdown[0] : null;
    return NextResponse.json({
      results: rows,
      total,
      hasMore: offset + rows.length < total,
      limit,
      offset,
      freeCount: counts?.freeCount ?? null,
      reinstatable_count: counts?.reinstatable_count ?? null,
    });
  } catch (e) {
    console.error("[patents/search]", e);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
