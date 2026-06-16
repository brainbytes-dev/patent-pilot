import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getDb } from "@repo/db";
import { briefings } from "@repo/db/schema";
import { eq, desc } from "drizzle-orm";
import { headers } from "next/headers";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getDb();
  const rows = await db
    .select({
      id: briefings.id,
      weekOf: briefings.weekOf,
      status: briefings.status,
      sentAt: briefings.sentAt,
    })
    .from(briefings)
    .where(eq(briefings.userId, session.user.id))
    .orderBy(desc(briefings.createdAt))
    .limit(52);

  return NextResponse.json(rows);
}
