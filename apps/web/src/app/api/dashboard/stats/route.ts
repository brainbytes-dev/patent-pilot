import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getDb } from "@repo/db";
import { briefings, watchlists, patents } from "@repo/db/schema";
import { eq, count, desc } from "drizzle-orm";
import { headers } from "next/headers";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getDb();
  const userId = session.user.id;

  const [briefingCountRows, watchlistRows, latestBriefingRows, patentCountRows] =
    await Promise.all([
      db.select({ count: count() }).from(briefings).where(eq(briefings.userId, userId)),
      db.select().from(watchlists).where(eq(watchlists.userId, userId)).limit(1),
      db
        .select({ id: briefings.id, weekOf: briefings.weekOf })
        .from(briefings)
        .where(eq(briefings.userId, userId))
        .orderBy(desc(briefings.createdAt))
        .limit(1),
      db.select({ count: count() }).from(patents),
    ]);

  return NextResponse.json({
    briefingsSent: briefingCountRows[0]?.count ?? 0,
    watchlistActive: watchlistRows[0]?.active ?? false,
    onboardingComplete: watchlistRows[0]?.onboardingComplete ?? false,
    patentsInDb: patentCountRows[0]?.count ?? 0,
    latestBriefingId: latestBriefingRows[0]?.id ?? null,
    latestBriefingWeek: latestBriefingRows[0]?.weekOf ?? null,
    industries: watchlistRows[0]?.industries ?? [],
    keywords: watchlistRows[0]?.keywords ?? [],
  });
}
