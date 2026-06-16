import { inngest } from "@/lib/inngest";
import { getDb, sql } from "@repo/db";
import {
  watchlists,
  briefings,
  patents,
  patentEvents,
  briefingPatents,
  users,
} from "@repo/db/schema";
import { eq, and, gte, inArray } from "drizzle-orm";
import { scorePatentRelevance } from "@/lib/ai/match";
import { generateBriefingHtml } from "@/lib/ai/generate-briefing";
import { sendBriefingEmail } from "@/lib/email";

// Triggered by cron on Sunday 21:00 UTC — fans out one event per active user
export const sundayGenerateFn = inngest.createFunction(
  { id: "sunday-briefing-trigger", retries: 1 },
  { cron: "0 21 * * 0" },
  async ({ step }) => {
    const db = getDb();

    const activeUsers = await step.run("fetch-active-users", async () => {
      return db
        .select({ userId: watchlists.userId })
        .from(watchlists)
        .where(
          and(eq(watchlists.active, true), eq(watchlists.onboardingComplete, true))
        );
    });

    if (activeUsers.length === 0) return { triggered: 0 };

    await step.sendEvent(
      "fan-out-briefing-generation",
      activeUsers.map((u) => ({
        name: "briefing/generate" as const,
        data: { userId: u.userId },
      }))
    );

    return { triggered: activeUsers.length };
  }
);

// One invocation per user — called via the fan-out above or manually
export const generateUserBriefingFn = inngest.createFunction(
  { id: "generate-user-briefing", retries: 2, concurrency: { limit: 5 } },
  { event: "briefing/generate" },
  async ({ event, step }) => {
    const { userId } = event.data as { userId: string };
    const db = getDb();
    const now = new Date();
    const weekOf = getMondayOfWeek(now);
    const weekNumber = getWeekNumber(weekOf);
    const weekOfStr = weekOf.toISOString().slice(0, 10);

    const watchlist = await step.run("fetch-watchlist", async () => {
      const rows = await db
        .select()
        .from(watchlists)
        .where(eq(watchlists.userId, userId))
        .limit(1);
      return rows[0] ?? null;
    });

    if (!watchlist) return { skipped: true, reason: "no watchlist" };

    // Get patents that lapsed in the last 7 days
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);

    const candidates = await step.run("fetch-candidate-patents", async () => {
      return db
        .select({
          id: patents.id,
          patentNumber: patents.patentNumber,
          title: patents.title,
          abstractEn: patents.abstractEn,
          cpcCodes: patents.cpcCodes,
          status: patents.status,
          owner: patents.owner,
          expiryDate: patents.expiryDate,
        })
        .from(patents)
        .innerJoin(patentEvents, eq(patentEvents.patentId, patents.id))
        .where(
          and(
            gte(patentEvents.eventDate, sevenDaysAgo),
            inArray(patentEvents.eventType, ["LAPSED", "LISTED_FOR_SALE"])
          )
        )
        .limit(30);
    });

    const scored = await step.run("score-patents", async () => {
      const results = [];
      for (const p of candidates) {
        const { score, reason } = await scorePatentRelevance(
          { title: p.title, abstractEn: p.abstractEn, cpcCodes: p.cpcCodes ?? [] },
          {
            industries: watchlist.industries ?? [],
            keywords: watchlist.keywords ?? [],
            cpcCodes: watchlist.cpcCodes ?? [],
          }
        );
        if (score >= 50) {
          results.push({ ...p, score, reason });
        }
      }
      return results.sort((a, b) => b.score - a.score);
    });

    const freePatents = scored.filter((p) => p.status === "lapsed").slice(0, 3);
    const salePatents = scored.filter((p) => p.status === "for_sale").slice(0, 2);
    const strategyPatent = scored[0] ?? null;

    const htmlContent = await step.run("generate-html", async () => {
      return generateBriefingHtml(
        {
          weekNumber,
          year: weekOf.getFullYear(),
          userKeywords: watchlist.keywords ?? [],
        },
        { freePatents, salePatents, strategyPatent }
      );
    });

    const briefingId = await step.run("save-briefing", async () => {
      const [inserted] = await db
        .insert(briefings)
        .values({
          userId,
          weekOf: weekOfStr,
          status: "generated",
          htmlContent,
        })
        .returning({ id: briefings.id });

      for (let i = 0; i < freePatents.length; i++) {
        const p = freePatents[i];
        await db.insert(briefingPatents).values({
          briefingId: inserted.id,
          patentId: p.id,
          category: "free",
          relevanceScore: p.score,
          relevanceReasonDe: p.reason,
          sortOrder: i,
        });
      }
      for (let i = 0; i < salePatents.length; i++) {
        const p = salePatents[i];
        await db.insert(briefingPatents).values({
          briefingId: inserted.id,
          patentId: p.id,
          category: "for_sale",
          relevanceScore: p.score,
          relevanceReasonDe: p.reason,
          sortOrder: i,
        });
      }

      return inserted.id;
    });

    const user = await step.run("fetch-user", async () => {
      const rows = await db
        .select({ email: users.email, name: users.name })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);
      return rows[0] ?? null;
    });

    if (user) {
      await step.run("send-email", async () => {
        const messageId = await sendBriefingEmail({
          to: user.email,
          firstName: user.name?.split(" ")[0],
          weekNumber,
          year: weekOf.getFullYear(),
          htmlContent,
          briefingId,
        });
        await db
          .update(briefings)
          .set({ status: "sent", sentAt: new Date(), resendMessageId: messageId })
          .where(eq(briefings.id, briefingId));
      });
    }

    return { userId, briefingId, patentsScored: scored.length };
  }
);

function getMondayOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d;
}

function getWeekNumber(date: Date): number {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  return (
    1 +
    Math.round(
      ((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7
    )
  );
}
