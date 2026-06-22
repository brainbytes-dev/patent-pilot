import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getDb } from "@repo/db";
import { briefings, watchlists, patents } from "@repo/db/schema";
import { eq, count, desc, sql, and, isNotNull } from "drizzle-orm";
import { headers } from "next/headers";
import { CPC_BY_INDUSTRY } from "@/lib/epo/cpc-map";

function buildCpcFilter(industries: string[]) {
  const prefixes = industries.flatMap((i) => CPC_BY_INDUSTRY[i] ?? []);
  if (prefixes.length === 0) return null;
  const likePatterns = prefixes.map((p) => p + "%");
  return sql`EXISTS (
    SELECT 1 FROM unnest(${patents.cpcCodes}) AS c
    WHERE c LIKE ANY(ARRAY[${sql.raw(likePatterns.map((p) => `'${p}'`).join(", "))}])
  )`;
}

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getDb();
  const userId = session.user.id;

  const [briefingCountRows, watchlistRows, latestBriefingRows] = await Promise.all([
    db.select({ count: count() }).from(briefings).where(eq(briefings.userId, userId)),
    db.select().from(watchlists).where(eq(watchlists.userId, userId)).limit(1),
    db
      .select({ id: briefings.id, weekOf: briefings.weekOf })
      .from(briefings)
      .where(eq(briefings.userId, userId))
      .orderBy(desc(briefings.createdAt))
      .limit(1),
  ]);

  const industries: string[] = watchlistRows[0]?.industries ?? [];
  const cpcFilter = buildCpcFilter(industries);

  const [branchRows, weekRows] = await Promise.all([
    cpcFilter
      ? db
          .select({ count: count() })
          .from(patents)
          .where(and(isNotNull(patents.lapsedAt), cpcFilter))
      : db
          .select({ count: count() })
          .from(patents)
          .where(isNotNull(patents.lapsedAt)),
    cpcFilter
      ? db
          .select({ count: count() })
          .from(patents)
          .where(
            and(
              isNotNull(patents.lapsedAt),
              sql`${patents.lapsedAt} >= NOW() - INTERVAL '7 days'`,
              cpcFilter
            )
          )
      : db
          .select({ count: count() })
          .from(patents)
          .where(
            and(
              isNotNull(patents.lapsedAt),
              sql`${patents.lapsedAt} >= NOW() - INTERVAL '7 days'`
            )
          ),
  ]);

  return NextResponse.json({
    briefingsSent: briefingCountRows[0]?.count ?? 0,
    watchlistActive: watchlistRows[0]?.active ?? false,
    onboardingComplete: watchlistRows[0]?.onboardingComplete ?? false,
    patentsInBranch: branchRows[0]?.count ?? 0,
    newThisWeek: weekRows[0]?.count ?? 0,
    latestBriefingId: latestBriefingRows[0]?.id ?? null,
    latestBriefingWeek: latestBriefingRows[0]?.weekOf ?? null,
    industries,
    keywords: watchlistRows[0]?.keywords ?? [],
  });
}
