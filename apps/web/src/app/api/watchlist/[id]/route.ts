import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getDb } from "@repo/db";
import { watchlists } from "@repo/db/schema";
import { eq, and } from "drizzle-orm";
import { headers } from "next/headers";

// PUT — Watchlist aktualisieren
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json() as {
    name?: string;
    industries?: string[];
    keywords?: string[];
    cpcCodes?: string[];
    active?: boolean;
  };

  const db = getDb();
  const [row] = await db
    .update(watchlists)
    .set({
      ...(body.name !== undefined && { name: body.name }),
      ...(body.industries !== undefined && { industries: body.industries }),
      ...(body.keywords !== undefined && { keywords: body.keywords }),
      ...(body.cpcCodes !== undefined && { cpcCodes: body.cpcCodes }),
      ...(body.active !== undefined && { active: body.active }),
      updatedAt: new Date(),
    })
    .where(and(eq(watchlists.id, id), eq(watchlists.userId, session.user.id)))
    .returning();

  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(row);
}

// DELETE — Watchlist löschen
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const db = getDb();

  await db
    .delete(watchlists)
    .where(and(eq(watchlists.id, id), eq(watchlists.userId, session.user.id)));

  return NextResponse.json({ success: true });
}
