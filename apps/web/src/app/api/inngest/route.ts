import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest";
import { sendWelcomeEmailFn } from "@/inngest/send-welcome-email";
import { paymentFailedReminderFn } from "@/inngest/payment-failed-reminder";
import { subscriptionCanceledFn } from "@/inngest/subscription-canceled";
import { cleanupSessionsFn } from "@/inngest/cleanup-sessions";
import { nightlyIngestFn } from "@/inngest/nightly-ingest";
import { sundayGenerateFn, generateUserBriefingFn } from "@/inngest/sunday-generate";
import { generalBriefFn } from "@/inngest/general-brief";
import { bulkPatentSweepFn } from "@/inngest/bulk-patent-sweep";
import { enrichPatentStubsFn } from "@/inngest/enrich-patent-stubs";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    sendWelcomeEmailFn,
    paymentFailedReminderFn,
    subscriptionCanceledFn,
    cleanupSessionsFn,
    nightlyIngestFn,
    sundayGenerateFn,
    generateUserBriefingFn,
    generalBriefFn,
    bulkPatentSweepFn,
    enrichPatentStubsFn,
  ],
});
