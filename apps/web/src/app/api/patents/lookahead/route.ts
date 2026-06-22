import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getDb } from "@repo/db";
import { patents } from "@repo/db/schema";
import { sql, and, isNotNull, or } from "drizzle-orm";
import { headers } from "next/headers";
import { getUserTier } from "@/lib/tier";

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tier = await getUserTier(session.user.id);
  if (tier !== "pro") {
    return NextResponse.json({ error: "upgrade_required" }, { status: 403 });
  }

  const daysRaw = parseInt(req.nextUrl.searchParams.get("days") ?? "30", 10);
  const days = [30, 60, 90].includes(daysRaw) ? daysRaw : 30;

  const nicheParam = req.nextUrl.searchParams.get("niche") ?? "";
  const regionParam = req.nextUrl.searchParams.get("region") ?? "";
  const limit = Math.min(parseInt(req.nextUrl.searchParams.get("limit") ?? "50", 10), 100);
  const offset = Math.max(parseInt(req.nextUrl.searchParams.get("offset") ?? "0", 10), 0);

  const db = getDb();

  const conditions = [
    isNotNull(patents.title),
    sql`${patents.title} NOT IN ('[no data]', '[error]')`,
    // Läuft in den nächsten N Tagen ab (noch aktiv = kein lapsed_at, expiry_date in Zukunft)
    sql`${patents.lapsedAt} IS NULL`,
    sql`${patents.expiryDate} > now()`,
    sql`${patents.expiryDate} <= now() + interval '${sql.raw(String(days))} days'`,
  ];

  const REGION_PREFIXES: Record<string, string[]> = {
    eu:   ["EP","DE","FR","GB","AT","NL","BE","CH","ES","IT","SE","DK","FI","NO","PT","PL"],
    us:   ["US"],
    asia: ["CN","JP","KR","TW","IN","SG"],
  };
  const NICHE_PREFIXES: Record<string, string[]> = {
    medtech:["A61B","A61C","A61D","A61F","A61G","A61H","A61J","A61L","A61M","A61N"],
    pharma: ["A61K","A61P"],
    biotech:["C12M","C12N","C12Q","C12R","C12S","C40B","A01H"],
    chemistry:["C01","C02","C07","C09","C10","C11","C14"],
    mechanical:["F01","F02","F04","F15","F16","F17"],
    manufacturing:["B21","B22","B23","B24","B25","B26","B27","B28","B29","B30"],
    automotive:["B60","B62","F02B","F02D","F02M"],
    electronics:["H01L","H01M","H01R","H01S","H05"],
    electrical:["H02"],
    energy:["F03","F24","H02J","C10L"],
  };

  if (regionParam && REGION_PREFIXES[regionParam]) {
    const prefixes = REGION_PREFIXES[regionParam]!;
    conditions.push(or(...prefixes.map((p) => sql`${patents.patentNumber} LIKE ${p + "%"}`))!);
  }
  if (nicheParam && NICHE_PREFIXES[nicheParam]) {
    const prefixes = NICHE_PREFIXES[nicheParam]!;
    conditions.push(
      or(...prefixes.map((p) =>
        sql`EXISTS (SELECT 1 FROM unnest(${patents.cpcCodes}) AS _c WHERE _c LIKE ${p + "%"})`
      ))!
    );
  }

  const where = and(...conditions);

  const [rows, countRows] = await Promise.all([
    db.select({
      id: patents.id,
      patentNumber: patents.patentNumber,
      title: patents.title,
      titleDe: patents.titleDe,
      expiryDate: patents.expiryDate,
      filingDate: patents.filingDate,
      owner: patents.owner,
      cpcCodes: patents.cpcCodes,
    })
    .from(patents)
    .where(where)
    .orderBy(sql`${patents.expiryDate} ASC`)
    .limit(limit)
    .offset(offset),
    db.select({ count: sql<number>`count(*)::int` }).from(patents).where(where),
  ]);

  return NextResponse.json({
    results: rows,
    total: countRows[0]?.count ?? 0,
    days,
    hasMore: offset + rows.length < (countRows[0]?.count ?? 0),
  });
}
