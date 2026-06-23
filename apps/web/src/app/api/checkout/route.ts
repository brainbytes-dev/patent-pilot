import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { auth } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import * as Sentry from "@sentry/nextjs";
import { DEMO_MODE } from "@/lib/demo-mode";

// Lazy initialize Stripe client (only when needed)
let stripeClient: Stripe | null = null;

function getStripe() {
  if (!stripeClient && process.env.STRIPE_SECRET_KEY) {
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return stripeClient;
}

function getRequestOrigin(request: NextRequest) {
  const configuredOrigin =
    process.env.APP_URL ??
    process.env.BETTER_AUTH_URL ??
    process.env.NEXTAUTH_URL ??
    process.env.NEXT_PUBLIC_APP_URL;

  if (configuredOrigin) {
    return new URL(configuredOrigin).origin;
  }

  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") ?? "https";
  if (forwardedHost) {
    const host = forwardedHost.split(",")[0]?.trim();
    const proto = forwardedProto.split(",")[0]?.trim();
    if (host && proto) return new URL(`${proto}://${host}`).origin;
  }

  if (request.nextUrl.origin && request.nextUrl.origin !== "null") {
    return new URL(request.nextUrl.origin).origin;
  }

  throw new Error("Unable to determine absolute app origin for Stripe checkout");
}

function buildCheckoutUrl(origin: string, path: unknown, fallbackPath: string) {
  const redirectPath = typeof path === "string" && path.length > 0
    ? path
    : fallbackPath;

  if (/^[a-z][a-z\d+\-.]*:/i.test(redirectPath)) {
    const url = new URL(redirectPath);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      throw new Error("Checkout redirect URL must use http or https");
    }
    return url;
  }

  if (!redirectPath.startsWith("/")) {
    throw new Error("Checkout redirect path must start with /");
  }

  return new URL(redirectPath, `${origin}/`);
}

/**
 * POST /api/checkout
 * Create a Stripe checkout session
 *
 * Body:
 * {
 *   priceId: string;        // Stripe price ID
 *   successUrl?: string;    // URL after successful payment
 *   cancelUrl?: string;     // URL if customer cancels
 * }
 */
export async function POST(request: NextRequest) {
  if (DEMO_MODE) {
    return NextResponse.json({ url: "/?demo=checkout-disabled" });
  }

  try {
    const authSession = await auth.api.getSession({ headers: request.headers });
    const user = authSession?.user;
    if (!user) {
      return NextResponse.json(
        { error: "User not authenticated" },
        { status: 401 }
      );
    }

    // Check rate limit (10 per minute per user)
    const allowed = await checkRateLimit(`checkout:${user.id}`);
    if (!allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    const stripe = getStripe();
    if (!stripe) {
      return NextResponse.json(
        { error: "Stripe is not configured" },
        { status: 500 }
      );
    }

    const { priceId, successUrl, cancelUrl } = await request.json();

    if (!priceId) {
      return NextResponse.json(
        { error: "Price ID is required" },
        { status: 400 }
      );
    }

    const origin = getRequestOrigin(request);
    const checkoutSuccessUrl = buildCheckoutUrl(origin, successUrl, "/dashboard");
    const checkoutCancelUrl = buildCheckoutUrl(origin, cancelUrl, "/");
    const sessionParamSeparator = checkoutSuccessUrl.search ? "&" : "?";

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${checkoutSuccessUrl.toString()}${sessionParamSeparator}session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: checkoutCancelUrl.toString(),
      customer_email: user.email,
      metadata: {
        userId: user.id,
      },
    });

    return NextResponse.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    Sentry.captureException(error, {
      tags: { route: "/api/checkout" },
    });
    console.error("Checkout error:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
