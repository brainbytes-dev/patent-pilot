import { inngest } from "@/lib/inngest";
import { getDb, sql } from "@repo/db";
import { patents, patentEvents } from "@repo/db/schema";
import { getEpoClient } from "@/lib/epo/client";
import { CPC_BY_INDUSTRY } from "@/lib/epo/cpc-map";
import { eq } from "drizzle-orm";

export const nightlyIngestFn = inngest.createFunction(
  { id: "nightly-patent-ingest", retries: 2 },
  { cron: "0 1 * * *" }, // 01:00 UTC daily
  async ({ step }) => {
    const db = getDb();
    const epo = getEpoClient();

    const watchlistCpcs = await step.run("fetch-active-cpc-codes", async () => {
      const customRows = await db.execute(
        sql`SELECT DISTINCT unnest(cpc_codes) AS cpc FROM watchlists WHERE active = true`
      );
      const industryRows = await db.execute(
        sql`SELECT DISTINCT unnest(industries) AS ind FROM watchlists WHERE active = true`
      );

      const custom = (customRows as Array<Record<string, unknown>>).map((r) => r.cpc as string).filter(Boolean);
      const industryCpcs = (industryRows as Array<Record<string, unknown>>)
        .flatMap((r) => CPC_BY_INDUSTRY[r.ind as string] ?? []);

      return [...new Set([...custom, ...industryCpcs])];
    });

    if (watchlistCpcs.length === 0) {
      return { ingested: 0, reason: "no active watchlists" };
    }

    const results = await step.run("fetch-epo-delta", async () => {
      return epo.searchRecentlyLapsed({ cpcCodes: watchlistCpcs, maxResults: 100 });
    });

    const ingested = await step.run("upsert-patents", async () => {
      let count = 0;
      for (const p of results) {
        await db
          .insert(patents)
          .values({
            patentNumber: p.patentNumber,
            title: p.title,
            abstractEn: p.abstractEn,
            filingDate: p.filingDate,
            grantDate: p.grantDate,
            expiryDate: p.expiryDate,
            owner: p.owner,
            cpcCodes: p.cpcCodes,
            status: p.status,
            rawData: p.rawData as Record<string, unknown>,
          })
          .onConflictDoUpdate({
            target: patents.patentNumber,
            set: { status: p.status, updatedAt: new Date() },
          });

        if (p.status === "lapsed") {
          const existing = await db
            .select({ id: patents.id })
            .from(patents)
            .where(eq(patents.patentNumber, p.patentNumber))
            .limit(1);

          if (existing[0]) {
            await db
              .insert(patentEvents)
              .values({
                patentId: existing[0].id,
                eventType: "LAPSED",
                eventDate: p.expiryDate ?? new Date().toISOString().slice(0, 10),
              })
              .onConflictDoNothing();
          }
        }
        count++;
      }
      return count;
    });

    return { ingested, cpcs: watchlistCpcs.length };
  }
);
