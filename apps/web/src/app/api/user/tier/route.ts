import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { getUserTier, TIER_LIMITS } from "@/lib/tier";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tier = await getUserTier(session.user.id);
  return NextResponse.json({ tier, limits: TIER_LIMITS[tier] });
}
