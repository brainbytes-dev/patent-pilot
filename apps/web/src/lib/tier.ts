import { getDb } from "@repo/db";
import { users, userSubscriptions } from "@repo/db/schema";
import { eq, and } from "drizzle-orm";

export type Tier = "free" | "starter" | "pro";

const STARTER_PRICE_IDS = new Set([
  process.env.NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID,
  process.env.NEXT_PUBLIC_STRIPE_STARTER_YEARLY_PRICE_ID,
].filter(Boolean));

const PRO_PRICE_IDS = new Set([
  process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID,
  process.env.NEXT_PUBLIC_STRIPE_PRO_YEARLY_PRICE_ID,
].filter(Boolean));

function planIdToTier(planId: string | null | undefined): Tier {
  if (!planId) return "free";
  if (PRO_PRICE_IDS.has(planId)) return "pro";
  if (STARTER_PRICE_IDS.has(planId)) return "starter";
  return "free";
}

export async function getUserTier(userId: string): Promise<Tier> {
  const db = getDb();

  const [user] = await db
    .select({ email: users.email })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user?.email) return "free";

  const [sub] = await db
    .select({ planId: userSubscriptions.planId, status: userSubscriptions.status })
    .from(userSubscriptions)
    .where(
      and(
        eq(userSubscriptions.email, user.email),
        eq(userSubscriptions.status, "active")
      )
    )
    .limit(1);

  return planIdToTier(sub?.planId);
}

// Lookup limits per tier
export const TIER_LIMITS = {
  free:    { lookbackDays: 30,  watchlists: 1,         lookahead: false },
  starter: { lookbackDays: null, watchlists: Infinity,  lookahead: false },
  pro:     { lookbackDays: null, watchlists: Infinity,  lookahead: true  },
} satisfies Record<Tier, { lookbackDays: number | null; watchlists: number; lookahead: boolean }>;
