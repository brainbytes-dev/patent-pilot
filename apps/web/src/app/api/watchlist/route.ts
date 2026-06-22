import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getDb } from "@repo/db";
import { watchlists } from "@repo/db/schema";
import { eq, and, count } from "drizzle-orm";
import { headers } from "next/headers";
import { getUserTier, TIER_LIMITS } from "@/lib/tier";

// GET — alle Watchlists des Users
export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getDb();
  const rows = await db
    .select()
    .from(watchlists)
    .where(eq(watchlists.userId, session.user.id))
    .orderBy(watchlists.createdAt);

  return NextResponse.json(rows);
}

// POST — neue Watchlist erstellen (Tier-Gate)
export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tier = await getUserTier(session.user.id);
  const limits = TIER_LIMITS[tier];

  const db = getDb();

  const [{ total }] = await db
    .select({ total: count() })
    .from(watchlists)
    .where(eq(watchlists.userId, session.user.id));

  if (limits.watchlists !== Infinity && total >= limits.watchlists) {
    return NextResponse.json(
      { error: "upgrade_required", message: "Mit dem Free-Plan ist nur 1 Watchlist möglich." },
      { status: 403 }
    );
  }

  const body = await req.json() as {
    name?: string;
    industries?: string[];
    keywords?: string[];
    cpcCodes?: string[];
  };
  const { name, industries = [], keywords = [], cpcCodes = [] } = body;

  if (industries.length === 0) {
    return NextResponse.json({ error: "Mindestens eine Branche erforderlich." }, { status: 400 });
  }

  const [row] = await db
    .insert(watchlists)
    .values({
      userId: session.user.id,
      name: name ?? industries.slice(0, 2).join(", "),
      industries,
      keywords,
      cpcCodes,
      onboardingComplete: true,
      active: true,
    })
    .returning();

  return NextResponse.json(row, { status: 201 });
}
