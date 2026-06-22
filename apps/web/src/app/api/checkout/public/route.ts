import { type NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

let stripeClient: Stripe | null = null;
function getStripe() {
  if (!stripeClient && process.env.STRIPE_SECRET_KEY) {
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return stripeClient;
}

const PRICE_IDS: Record<string, Record<string, string>> = {
  starter: {
    monthly: process.env.NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID ?? "",
    yearly: process.env.NEXT_PUBLIC_STRIPE_STARTER_YEARLY_PRICE_ID ?? "",
  },
  pro: {
    monthly: process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID ?? "",
    yearly: process.env.NEXT_PUBLIC_STRIPE_PRO_YEARLY_PRICE_ID ?? "",
  },
};

export async function GET(req: NextRequest) {
  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.redirect(new URL("/#pricing", req.url));
  }

  const plan = req.nextUrl.searchParams.get("plan") ?? "starter";
  const billing = req.nextUrl.searchParams.get("billing") ?? "monthly";
  const priceId = PRICE_IDS[plan]?.[billing];

  if (!priceId) {
    return NextResponse.redirect(new URL("/#pricing", req.url));
  }

  const appUrl = process.env.BETTER_AUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/welcome?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/#pricing`,
      allow_promotion_codes: true,
      subscription_data: {
        metadata: { plan, billing },
      },
    });

    return NextResponse.redirect(session.url!);
  } catch (err) {
    console.error("Public checkout error:", err);
    return NextResponse.redirect(new URL("/#pricing", req.url));
  }
}
