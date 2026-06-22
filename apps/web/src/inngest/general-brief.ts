import { inngest } from "@/lib/inngest";
import { getDb, sql } from "@repo/db";
import { patents, users, briefings, briefingPatents } from "@repo/db/schema";
import { isNotNull, and } from "drizzle-orm";
import { sendBriefingEmail } from "@/lib/email";
import type { BriefingPatent } from "@repo/email";

// Runs Sunday 20:00 UTC — before the personalized brief at 21:00
// Sends a curated 5-7 patent general brief to ALL users
export const generalBriefFn = inngest.createFunction(
  { id: "general-briefing", retries: 1 },
  { cron: "0 20 * * 0" },
  async ({ step }) => {
    const db = getDb();

    // Top patents: recently lapsed, prominent owners, diverse niches
    // "Prominent" = owner with many patents (proxy for large company)
    const topPatents = await step.run("fetch-top-patents", async () => {
      return db
        .select({
          id: patents.id,
          patentNumber: patents.patentNumber,
          title: patents.title,
          titleDe: patents.titleDe,
          owner: patents.owner,
          lapsedAt: patents.lapsedAt,
          expiryDate: patents.expiryDate,
          filingDate: patents.filingDate,
          cpcCodes: patents.cpcCodes,
        })
        .from(patents)
        .where(
          and(
            isNotNull(patents.title),
            sql`${patents.title} NOT IN ('[no data]', '[error]')`,
            // Abgelaufen in den letzten 14 Tagen
            sql`COALESCE(${patents.lapsedAt}, ${patents.expiryDate}) >= now() - interval '14 days'`,
            sql`COALESCE(${patents.lapsedAt}, ${patents.expiryDate}) <= now()`,
            isNotNull(patents.owner),
          )
        )
        // Prominente Anmelder zuerst (längere Namen = eher Firmen, Heuristik)
        .orderBy(sql`length(${patents.owner}) DESC, COALESCE(${patents.lapsedAt}, ${patents.expiryDate}) DESC`)
        .limit(7);
    });

    if (topPatents.length === 0) return { skipped: true, reason: "no patents" };

    const allUsers = await step.run("fetch-all-users", async () => {
      return db.select({ id: users.id, email: users.email, name: users.name }).from(users);
    });

    if (allUsers.length === 0) return { sent: 0 };

    const now = new Date();
    const weekNumber = getWeekNumber(now);
    const year = now.getFullYear();
    const weekOfStr = now.toISOString().slice(0, 10);

    let sent = 0;
    for (const user of allUsers) {
      await step.run(`send-general-brief-${user.id}`, async () => {
        const [inserted] = await db
          .insert(briefings)
          .values({ userId: user.id, weekOf: weekOfStr, status: "generated" })
          .returning({ id: briefings.id });

        const briefingId = inserted!.id;

        for (let i = 0; i < topPatents.length; i++) {
          const p = topPatents[i]!;
          await db.insert(briefingPatents).values({
            briefingId,
            patentId: p.id,
            category: "free",
            relevanceScore: 0,
            relevanceReasonDe: "Kuratierte Auswahl — prominent abgelaufene Patente dieser Woche.",
            sortOrder: i,
          });
        }

        const emailPatents: BriefingPatent[] = topPatents.map((p) => ({
          id: p.id,
          patentNumber: p.patentNumber,
          title: p.title ?? p.patentNumber,
          titleDe: p.titleDe ?? undefined,
          cpcCodes: p.cpcCodes ?? [],
          owner: p.owner ?? undefined,
          lapsedAt: p.lapsedAt ?? undefined,
          filingDate: p.filingDate ?? undefined,
          recommendation: "Gemeinfrei — diese Technologie kann jetzt lizenzfrei genutzt werden.",
        }));

        const messageId = await sendBriefingEmail({
          to: user.email,
          firstName: user.name?.split(" ")[0],
          weekNumber,
          year,
          patents: emailPatents,
          totalLapsedCount: topPatents.length,
          briefingId,
        });

        await db
          .update(briefings)
          .set({ status: "sent", sentAt: new Date(), resendMessageId: messageId })
          .where(sql`${briefings.id} = ${briefingId}`);
      });
      sent++;
    }

    return { sent, patentCount: topPatents.length };
  }
);

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
