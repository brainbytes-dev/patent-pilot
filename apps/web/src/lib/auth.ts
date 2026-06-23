import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { admin, bearer } from "better-auth/plugins";
import { getDb } from "@repo/db";
import * as schema from "@repo/db/schema";
import type { Auth } from "better-auth";

type AuthInstance = Auth<{
  plugins: [ReturnType<typeof nextCookies>, ReturnType<typeof admin>, ReturnType<typeof bearer>];
  database: ReturnType<typeof drizzleAdapter>;
}>;

let authInstance: AuthInstance | null = null;

function initAuth(): AuthInstance {
  if (authInstance) return authInstance;

  authInstance = betterAuth({
    baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3003",
    basePath: "/api/auth",
    secret: process.env.BETTER_AUTH_SECRET || "dev-secret-key",
    // Allow requests with missing/null Origin (React Native doesn't send one).
    // Origins are restricted via TRUSTED_ORIGINS env var in production.
    trustedOrigins: (process.env.TRUSTED_ORIGINS || "http://localhost:3003").split(","),
    emailAndPassword: {
      enabled: true,
      async sendResetPassword({ user, url }: { user: { email: string }; url: string }) {
        const dryRun = process.env.RESEND_DRY_RUN === "true";
        if (dryRun) {
          console.log(`[RESEND_DRY_RUN] Reset-Link für ${user.email}: ${url}`);
          return;
        }
        const apiKey = process.env.RESEND_API_KEY;
        if (!apiKey) {
          console.error("RESEND_API_KEY nicht gesetzt — Reset-Mail nicht gesendet. URL:", url);
          return;
        }
        const { Resend } = await import("resend");
        const resend = new Resend(apiKey);
        await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL ?? "noreply@patentbrief.eu",
          to: user.email,
          subject: "Passwort zurücksetzen — Patentbrief",
          html: `<p>Hallo,</p><p>Klicken Sie auf den folgenden Link um Ihr Passwort zurückzusetzen:</p><p><a href="${url}">${url}</a></p><p>Der Link ist 1 Stunde gültig.</p><p>Patentbrief</p>`,
        });
      },
    },
    advanced: {
      database: {
        generateId: "uuid",
      },
    },
    plugins: [
      nextCookies(),
      admin(),
      bearer(),
    ],
    database: drizzleAdapter(getDb(), {
      provider: "pg",
      schema,
      usePlural: true,
    }),
  }) as unknown as AuthInstance;

  return authInstance;
}

export const auth = new Proxy({} as AuthInstance, {
  get(_, prop) {
    return (initAuth() as Record<string | symbol, unknown>)[prop];
  },
  has(_, prop) {
    return prop in initAuth();
  },
});

export function getAuth() {
  return auth;
}

export type Session = NonNullable<Awaited<ReturnType<AuthInstance["api"]["getSession"]>>>;
