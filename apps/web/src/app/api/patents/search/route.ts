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

const SELECT_COLS = {
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
} as const;

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const q           = searchParams.get("q")?.trim() ?? "";
  const regionParam = searchParams.get("region") ?? "";
  const nicheParam  = searchParams.get("niche")  ?? "";
  const lang        = searchParams.get("lang")   ?? "";
  const sortParam   = searchParams.get("sort")   ?? "date";
  const limitRaw    = parseInt(searchParams.get("limit")  ?? "24", 10);
  const offsetRaw   = parseInt(searchParams.get("offset") ?? "0",  10);
  const limit  = Number.isFinite(limitRaw)  && limitRaw  > 0 ? Math.min(limitRaw, 100) : 24;
  const offset = Number.isFinite(offsetRaw) && offsetRaw >= 0 ? offsetRaw : 0;

  const tier   = await getUserTier(session.user.id);
  const limits = TIER_LIMITS[tier];

  const db = getDb();

  // Base conditions (always applied)
  const conditions = [
    isNotNull(patents.title),
    sql`${patents.title} NOT IN ('[no data]', '[error]')`,
    or(isNotNull(patents.lapsedAt), sql`${patents.expiryDate} < now()`)!,
  ];

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

  if (lang === "de") conditions.push(isNotNull(patents.titleDe));

  if (regionParam && REGION_PREFIXES[regionParam]) {
    const prefixes = REGION_PREFIXES[regionParam]!;
    conditions.push(or(...prefixes.map((p) => sql`${patents.patentNumber} LIKE ${p + "%"}`))!);
  }

  const orderBySql = sortParam === "name"
    ? sql`COALESCE(title_de, title) ASC NULLS LAST, id ASC`
    : sql`COALESCE(lapsed_at, expiry_date) DESC NULLS LAST, id ASC`;

  // COUNT only on first page — 2.5s scan on every paginated request is too expensive.
  // Client must preserve `total` across pages.
  const isFirstPage = offset === 0;

  try {
    const nichePrefixes = nicheParam ? (NICHE_PREFIXES[nicheParam] ?? []) : [];

    if (nichePrefixes.length > 0) {
      // Niche filter: MATERIALIZED CTE forces the planner to use the trigram GIN index
      // on array_to_string(cpc_codes, ',') before applying the sort.
      // Without MATERIALIZED, the planner chooses the sort index and evaluates CPC per-row
      // (16s). With MATERIALIZED, the CTE is pre-filtered via trigram (~100ms), then sorted.
      const where = and(...conditions)!;
      const cpcLikeOrs = nichePrefixes.map((p) =>
        sql`array_to_string(${patents.cpcCodes}, ',') LIKE ${"%" + p + "%"}`
      );

      const baseWhere = sql`${where} AND (${or(...cpcLikeOrs)!})`;

      const [rows, countResult, breakdown] = await Promise.all([
        db.execute(sql`
          WITH cpc_pre AS MATERIALIZED (
            SELECT id FROM patents
            WHERE title IS NOT NULL
              AND title NOT IN ('[no data]', '[error]')
              AND (${or(...cpcLikeOrs)!})
          )
          SELECT
            p.id, p.patent_number, p.title, p.title_de, p.abstract_de,
            p.filing_date, p.expiry_date, p.lapsed_at, p.owner, p.cpc_codes, p.status
          FROM patents p
          JOIN cpc_pre c ON p.id = c.id
          WHERE ${where}
          ORDER BY ${orderBySql}
          LIMIT ${limit} OFFSET ${offset}
        `),
        isFirstPage
          ? db.select({ count: sql<number>`count(*)::int` }).from(patents).where(baseWhere)
          : Promise.resolve(null),
        isFirstPage
          ? db.select({
              freeCount:          sql<number>`count(*) FILTER (WHERE lapsed_at < now() - interval '12 months' OR (lapsed_at IS NULL AND expiry_date < now()))::int`,
              reinstatable_count: sql<number>`count(*) FILTER (WHERE lapsed_at >= now() - interval '12 months')::int`,
            }).from(patents).where(baseWhere)
          : Promise.resolve(null),
      ]);

      const total  = Array.isArray(countResult) ? (countResult[0]?.count ?? 0) : null;
      const counts = Array.isArray(breakdown) ? breakdown[0] : null;

      return NextResponse.json({
        results: rows,
        total,
        hasMore: (rows as unknown[]).length === limit,
        limit,
        offset,
        freeCount:           counts?.freeCount           ?? null,
        reinstatable_count:  counts?.reinstatable_count  ?? null,
      });
    }

    // Default path (no niche filter): uses idx_patents_enriched_coalesce_date → ~5ms
    const where = and(...conditions);

    const [rows, countResult, breakdown] = await Promise.all([
      db.select(SELECT_COLS).from(patents).where(where).orderBy(orderBySql).limit(limit).offset(offset),
      isFirstPage
        ? db.select({ count: sql<number>`count(*)::int` }).from(patents).where(where)
        : Promise.resolve(null),
      isFirstPage
        ? db.select({
            freeCount:          sql<number>`count(*) FILTER (WHERE lapsed_at < now() - interval '12 months' OR (lapsed_at IS NULL AND expiry_date < now()))::int`,
            reinstatable_count: sql<number>`count(*) FILTER (WHERE lapsed_at >= now() - interval '12 months')::int`,
          }).from(patents).where(where)
        : Promise.resolve(null),
    ]);

    const total  = Array.isArray(countResult) ? (countResult[0]?.count ?? 0) : null;
    const counts = Array.isArray(breakdown)   ? breakdown[0]              : null;

    return NextResponse.json({
      results: rows,
      total,
      hasMore: rows.length === limit,
      limit,
      offset,
      freeCount:          counts?.freeCount          ?? null,
      reinstatable_count: counts?.reinstatable_count ?? null,
    });
  } catch (e) {
    console.error("[patents/search]", e);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
