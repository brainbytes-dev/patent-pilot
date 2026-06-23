-- Complete schema migration generated from packages/db/src/schema.ts

CREATE TABLE IF NOT EXISTS "users" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "email" text NOT NULL UNIQUE,
  "email_verified" boolean NOT NULL DEFAULT false,
  "name" text,
  "image" text,
  "role" text NOT NULL DEFAULT 'user',
  "banned" boolean DEFAULT false,
  "ban_reason" text,
  "ban_expires" timestamp,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "sessions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "token" text NOT NULL UNIQUE,
  "expires_at" timestamp NOT NULL,
  "ip_address" text,
  "user_agent" text,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "accounts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "account_id" text NOT NULL,
  "provider_id" text NOT NULL,
  "access_token" text,
  "refresh_token" text,
  "id_token" text,
  "access_token_expires_at" timestamp,
  "refresh_token_expires_at" timestamp,
  "scope" text,
  "password" text,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "verifications" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "identifier" text NOT NULL,
  "value" text NOT NULL,
  "expires_at" timestamp NOT NULL,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "user_subscriptions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid REFERENCES "users"("id") ON DELETE cascade,
  "stripe_customer_id" text NOT NULL UNIQUE,
  "stripe_subscription_id" text UNIQUE,
  "email" text,
  "status" text NOT NULL DEFAULT 'inactive',
  "plan_id" text,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now(),
  "canceled_at" timestamp
);
CREATE TABLE IF NOT EXISTS "payments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid REFERENCES "users"("id") ON DELETE cascade,
  "stripe_invoice_id" text NOT NULL UNIQUE,
  "stripe_subscription_id" text REFERENCES "user_subscriptions"("stripe_subscription_id"),
  "amount" bigint,
  "currency" text DEFAULT 'usd',
  "status" text NOT NULL DEFAULT 'pending',
  "paid_at" timestamp,
  "failed_at" timestamp,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "mobile_subscriptions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "revenuecat_user_id" text NOT NULL UNIQUE,
  "product_id" text NOT NULL,
  "store" text DEFAULT 'apple',
  "status" text NOT NULL DEFAULT 'active',
  "auto_resume_date" timestamp,
  "expiration_date" timestamp,
  "purchase_date" timestamp,
  "canceled_at" timestamp,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "mobile_payments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "revenuecat_user_id" text NOT NULL REFERENCES "mobile_subscriptions"("revenuecat_user_id"),
  "transaction_id" text UNIQUE,
  "product_id" text NOT NULL,
  "amount" bigint,
  "currency" text DEFAULT 'usd',
  "store" text,
  "status" text NOT NULL DEFAULT 'completed',
  "receipt_data" jsonb,
  "purchased_at" timestamp,
  "failed_at" timestamp,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "patents" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "patent_number" text NOT NULL UNIQUE,
  "title" text,
  "title_de" text,
  "abstract_en" text,
  "abstract_de" text,
  "filing_date" date,
  "grant_date" date,
  "expiry_date" date,
  "lapsed_at" date,
  "owner" text,
  "cpc_codes" text[] DEFAULT '{}',
  "status" text NOT NULL DEFAULT 'active',
  "source" text DEFAULT 'epo',
  "raw_data" jsonb,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "patent_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "patent_id" uuid NOT NULL REFERENCES "patents"("id") ON DELETE cascade,
  "event_type" text NOT NULL,
  "event_date" date NOT NULL,
  "details" jsonb,
  "created_at" timestamp NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "patent_drawings" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "patent_id" uuid NOT NULL REFERENCES "patents"("id") ON DELETE cascade,
  "page" integer NOT NULL,
  "png_data" bytea NOT NULL,
  "created_at" timestamp NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "watchlists" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "name" text,
  "industries" text[] DEFAULT '{}',
  "keywords" text[] DEFAULT '{}',
  "cpc_codes" text[] DEFAULT '{}',
  "active" boolean NOT NULL DEFAULT true,
  "onboarding_complete" boolean NOT NULL DEFAULT false,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "briefings" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "week_of" date NOT NULL,
  "status" text NOT NULL DEFAULT 'pending',
  "html_content" text,
  "text_content" text,
  "sent_at" timestamp,
  "opened_at" timestamp,
  "clicked_at" timestamp,
  "resend_message_id" text,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "briefing_patents" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "briefing_id" uuid NOT NULL REFERENCES "briefings"("id") ON DELETE cascade,
  "patent_id" uuid NOT NULL REFERENCES "patents"("id") ON DELETE cascade,
  "category" text NOT NULL,
  "relevance_score" integer,
  "relevance_reason_de" text,
  "sort_order" integer DEFAULT 0,
  "created_at" timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "idx_sessions_user" ON "sessions"("user_id");
CREATE INDEX IF NOT EXISTS "idx_accounts_user" ON "accounts"("user_id");
CREATE INDEX IF NOT EXISTS "idx_user_subscriptions_status" ON "user_subscriptions"("status");
CREATE INDEX IF NOT EXISTS "idx_user_subscriptions_user_id" ON "user_subscriptions"("user_id");
CREATE INDEX IF NOT EXISTS "idx_payments_subscription" ON "payments"("stripe_subscription_id");
CREATE INDEX IF NOT EXISTS "idx_payments_status" ON "payments"("status");
CREATE INDEX IF NOT EXISTS "idx_payments_user_id" ON "payments"("user_id");
CREATE INDEX IF NOT EXISTS "idx_mobile_subscriptions_status" ON "mobile_subscriptions"("status");
CREATE INDEX IF NOT EXISTS "idx_mobile_subscriptions_store" ON "mobile_subscriptions"("store");
CREATE INDEX IF NOT EXISTS "idx_mobile_payments_subscription" ON "mobile_payments"("revenuecat_user_id");
CREATE INDEX IF NOT EXISTS "idx_mobile_payments_status" ON "mobile_payments"("status");
CREATE INDEX IF NOT EXISTS "idx_patents_number" ON "patents"("patent_number");
CREATE INDEX IF NOT EXISTS "idx_patents_status" ON "patents"("status");
CREATE INDEX IF NOT EXISTS "idx_patents_expiry" ON "patents"("expiry_date");
CREATE INDEX IF NOT EXISTS "idx_patents_lapsed_at" ON "patents"("lapsed_at");
CREATE INDEX IF NOT EXISTS "idx_patent_events_patent" ON "patent_events"("patent_id");
CREATE INDEX IF NOT EXISTS "idx_patent_events_type" ON "patent_events"("event_type");
CREATE INDEX IF NOT EXISTS "idx_patent_events_date" ON "patent_events"("event_date");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_patent_drawings_patent_page" ON "patent_drawings"("patent_id","page");
CREATE INDEX IF NOT EXISTS "idx_patent_drawings_patent" ON "patent_drawings"("patent_id");
CREATE INDEX IF NOT EXISTS "idx_watchlists_user" ON "watchlists"("user_id");
CREATE INDEX IF NOT EXISTS "idx_watchlists_active" ON "watchlists"("active");
CREATE INDEX IF NOT EXISTS "idx_briefings_user" ON "briefings"("user_id");
CREATE INDEX IF NOT EXISTS "idx_briefings_week" ON "briefings"("week_of");
CREATE INDEX IF NOT EXISTS "idx_briefings_status" ON "briefings"("status");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_briefings_user_week" ON "briefings"("user_id","week_of");
CREATE INDEX IF NOT EXISTS "idx_bp_briefing" ON "briefing_patents"("briefing_id");
CREATE INDEX IF NOT EXISTS "idx_bp_patent" ON "briefing_patents"("patent_id");
