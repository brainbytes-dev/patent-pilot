import { inngest } from "@/lib/inngest";
import { getDb, sql } from "@repo/db";
import {
  watchlists,
  briefings,
  patents,
  briefingPatents,
  users,
} from "@repo/db/schema";
import { eq, and, isNotNull } from "drizzle-orm";
import { scorePatentRelevance } from "@/lib/ai/match";
import { sendBriefingEmail } from "@/lib/email";
import type { BriefingPatent } from "@repo/email";

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
    const isoYear   = getIsoWeekYear(weekOf);
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

    // Patents die in den letzten 7 Tagen laut INPADOC PG25 erloschen sind
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    const today = now.toISOString().slice(0, 10);

    const [candidates, totalLapsedRow] = await step.run("fetch-candidate-patents", async () => {
      return Promise.all([
        db
          .select({
            id: patents.id,
            patentNumber: patents.patentNumber,
            title: patents.title,
            titleDe: patents.titleDe,
            abstractEn: patents.abstractEn,
            cpcCodes: patents.cpcCodes,
            status: patents.status,
            owner: patents.owner,
            lapsedAt: patents.lapsedAt,
            filingDate: patents.filingDate,
          })
          .from(patents)
          .where(
            and(
              isNotNull(patents.lapsedAt),
              sql`${patents.lapsedAt} >= ${sevenDaysAgo}`,
              sql`${patents.lapsedAt} <= ${today}`,
              isNotNull(patents.title),
              sql`${patents.title} NOT IN ('[no data]', '[error]')`
            )
          )
          .orderBy(sql`lapsed_at DESC`)
          .limit(200),
        db
          .select({ count: sql<number>`count(*)::int` })
          .from(patents)
          .where(
            and(
              isNotNull(patents.lapsedAt),
              sql`${patents.lapsedAt} >= ${sevenDaysAgo}`,
              sql`${patents.lapsedAt} <= ${today}`
            )
          ),
      ]);
    });

    const totalLapsedCount = totalLapsedRow[0]?.count ?? 0;

    const scored = await step.run("score-patents", async () => {
      const results = [];
      for (const p of candidates) {
        const { score, reason } = await scorePatentRelevance(
          { title: p.title ?? p.patentNumber, abstractEn: p.abstractEn, cpcCodes: p.cpcCodes ?? [] },
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

    if (scored.length === 0) {
      return { userId, skipped: true, reason: "no relevant patents this week" };
    }

    const topPatents = scored.slice(0, 5);

    const briefingId = await step.run("save-briefing", async () => {
      const [inserted] = await db
        .insert(briefings)
        .values({
          userId,
          weekOf: weekOfStr,
          status: "generated",
        })
        .returning({ id: briefings.id });

      for (let i = 0; i < topPatents.length; i++) {
        const p = topPatents[i]!;
        await db.insert(briefingPatents).values({
          briefingId: inserted!.id,
          patentId: p.id,
          category: "free",
          relevanceScore: p.score,
          relevanceReasonDe: p.reason,
          sortOrder: i,
        });
      }

      return inserted!.id;
    });

    const user = await step.run("fetch-user", async () => {
      const rows = await db
        .select({ email: users.email, name: users.name })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);
      return rows[0] ?? null;
    });

    if (!user) {
      await step.run("mark-failed-no-user", async () => {
        await db.update(briefings).set({ status: "failed" }).where(eq(briefings.id, briefingId));
      });
      return { userId, skipped: true, reason: "user not found" };
    }

    if (user) {
      await step.run("send-email", async () => {
        const emailPatents: BriefingPatent[] = topPatents.map((p) => ({
          id: p.id,
          patentNumber: p.patentNumber,
          title: p.title ?? p.patentNumber,
          titleDe: p.titleDe ?? undefined,
          cpcCodes: p.cpcCodes ?? [],
          owner: p.owner ?? undefined,
          lapsedAt: p.lapsedAt ?? undefined,
          filingDate: p.filingDate ?? undefined,
          recommendation: p.reason,
        }));

        const messageId = await sendBriefingEmail({
          to: user.email,
          firstName: user.name?.split(" ")[0],
          weekNumber,
          year: isoYear,
          patents: emailPatents,
          totalLapsedCount,
          briefingId,
        });

        await db
          .update(briefings)
          .set({ status: "sent", sentAt: new Date(), resendMessageId: messageId })
          .where(eq(briefings.id, briefingId));
      });
    }

    return { userId, briefingId, patentsScored: scored.length, totalLapsedCount };
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

// ISO-Wochenjahr: an Jahreswechseln kann das ISO-Wochenjahr vom Kalenderjahr abweichen
function getIsoWeekYear(date: Date): number {
  const d = new Date(date);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  return d.getFullYear();
}
