import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { inngest } from "@/lib/inngest";
import { headers } from "next/headers";

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || (session.user as { role?: string }).role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json() as { userId?: string };
  const userId = body.userId ?? session.user.id;

  await inngest.send({ name: "briefing/generate" as never, data: { userId } });
  return NextResponse.json({ triggered: true, userId });
}
