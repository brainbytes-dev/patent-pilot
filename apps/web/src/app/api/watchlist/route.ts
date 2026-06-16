import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getDb } from "@repo/db";
import { watchlists } from "@repo/db/schema";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as {
    industries?: string[];
    keywords?: string[];
    cpcCodes?: string[];
  };

  const { industries = [], keywords = [], cpcCodes = [] } = body;

  if (industries.length === 0) {
    return NextResponse.json(
      { error: "Mindestens eine Branche erforderlich." },
      { status: 400 }
    );
  }

  const db = getDb();
  await db
    .insert(watchlists)
    .values({
      userId: session.user.id,
      industries,
      keywords,
      cpcCodes,
      onboardingComplete: true,
      active: true,
    })
    .onConflictDoUpdate({
      target: watchlists.userId,
      set: {
        industries,
        keywords,
        cpcCodes,
        onboardingComplete: true,
        updatedAt: new Date(),
      },
    });

  return NextResponse.json({ success: true });
}

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getDb();
  const rows = await db
    .select()
    .from(watchlists)
    .where(eq(watchlists.userId, session.user.id))
    .limit(1);

  return NextResponse.json(rows[0] ?? null);
}
