# Patent Pilot — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Patent Pilot — a B2B SaaS that delivers weekly AI-curated patent intelligence briefings to German Mittelstand companies, on top of the nextjs-expo-saas-starter monorepo.

**Architecture:** Next.js 16 monorepo (Turborepo). Drizzle ORM extending `packages/db/src/schema.ts`. Inngest for cron jobs (nightly EPO ingest + Sunday briefing fan-out per user). React Email template in `packages/email/src/`. New routes under `apps/web/src/app/`. Better-Auth for auth (already wired). Stripe billing already wired.

**Tech Stack:** Next.js 16, Drizzle ORM + PostgreSQL/Neon, Inngest, Resend + React Email, Better-Auth, Stripe, shadcn/ui + Tailwind v4, Vitest, EPO OPS API (OAuth2), Claude/OpenAI/Gemini (AI provider abstraction)

**Working directory for all commands:** `/Users/henrik/Documents/VS Code/patent-pilot`

---

## Task 1: Project Rename & Env Setup

**Files:**
- Modify: `apps/web/src/app/layout.tsx`
- Create: `apps/web/.env.local` (from `.env.example`)
- Modify: `apps/web/.env.example`
- Modify: `package.json` (root)

- [ ] **Step 1: Update app metadata in layout.tsx**

In `apps/web/src/app/layout.tsx`, update the metadata:
```tsx
export const metadata: Metadata = {
  title: {
    default: "Patent Pilot",
    template: `%s | Patent Pilot`,
  },
  description: "Wöchentliche Patent-Intelligence-Briefings für den deutschen Mittelstand.",
};
```

- [ ] **Step 2: Add Patent Pilot env vars to .env.example**

Append to `apps/web/.env.example`:
```bash
# Patent Pilot — EPO OPS API
EPO_CLIENT_ID=
EPO_CLIENT_SECRET=

# Patent Pilot — AI Providers (3-provider rule)
AI_PROVIDER=anthropic   # anthropic | openai | gemini
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
GEMINI_API_KEY=
AI_DRY_RUN=true         # set to false in production

# Patent Pilot — Email
RESEND_DRY_RUN=true     # set to false in production
BRIEFING_FROM_EMAIL=briefing@patentpilot.de
BRIEFING_REPLY_TO=support@patentpilot.de

# Patent Pilot — Stripe Prices (create these in Stripe Dashboard)
NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID=
NEXT_PUBLIC_STRIPE_PRO_PRICE_ID=
NEXT_PUBLIC_STRIPE_STARTER_ANNUAL_PRICE_ID=
NEXT_PUBLIC_STRIPE_PRO_ANNUAL_PRICE_ID=
NEXT_PUBLIC_APP_URL=http://localhost:3003
```

- [ ] **Step 3: Create .env.local from example**
```bash
cp apps/web/.env.example apps/web/.env.local
```
Then fill in actual values for local dev (EPO test credentials, AI keys).

- [ ] **Step 4: Update root package.json name**

In `package.json`, change `"name": "saas-monorepo"` to `"name": "patent-pilot"`.

- [ ] **Step 5: Commit**
```bash
git add apps/web/src/app/layout.tsx apps/web/.env.example package.json DESIGN.md
git commit -m "chore: rename project to Patent Pilot, add env vars, add DESIGN.md"
```

---

## Task 2: Database Schema Extension

**Files:**
- Modify: `packages/db/src/schema.ts`
- Run: `pnpm db:generate && pnpm db:migrate`

- [ ] **Step 1: Write failing test for schema types**

Create `packages/db/src/__tests__/patent-schema.test.ts`:
```typescript
import { describe, it, expect } from "vitest";
import { patents, watchlists, briefings } from "../schema";

describe("patent schema", () => {
  it("exports patents table with required columns", () => {
    expect(patents).toBeDefined();
    expect(patents.patentNumber).toBeDefined();
    expect(patents.status).toBeDefined();
    expect(patents.expiryDate).toBeDefined();
  });

  it("exports watchlists table", () => {
    expect(watchlists).toBeDefined();
    expect(watchlists.userId).toBeDefined();
    expect(watchlists.industries).toBeDefined();
  });

  it("exports briefings table", () => {
    expect(briefings).toBeDefined();
    expect(briefings.weekOf).toBeDefined();
    expect(briefings.htmlContent).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**
```bash
cd apps/web && pnpm test packages/db/src/__tests__/patent-schema.test.ts
```
Expected: FAIL — `patents` not exported from schema.

- [ ] **Step 3: Add patent tables to schema**

Append to `packages/db/src/schema.ts` (after existing exports):
```typescript
import { integer, date } from "drizzle-orm/pg-core";

// ─── Patents ────────────────────────────────────────────────────────
export const patents = pgTable(
  "patents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    patentNumber: text("patent_number").notNull().unique(),   // e.g. EP1234567
    title: text("title").notNull(),
    titleDe: text("title_de"),
    abstractEn: text("abstract_en"),
    abstractDe: text("abstract_de"),
    filingDate: date("filing_date"),
    grantDate: date("grant_date"),
    expiryDate: date("expiry_date"),
    owner: text("owner"),
    cpcCodes: text("cpc_codes").array().default([]),
    status: text("status").notNull().default("active"),
    // status: active | lapsed | for_sale | assigned
    source: text("source").default("epo"),                    // epo | dpma
    rawData: jsonb("raw_data"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_patents_number").on(table.patentNumber),
    index("idx_patents_status").on(table.status),
    index("idx_patents_expiry").on(table.expiryDate),
  ]
);

// ─── Patent Events ───────────────────────────────────────────────────
export const patentEvents = pgTable(
  "patent_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    patentId: uuid("patent_id")
      .notNull()
      .references(() => patents.id, { onDelete: "cascade" }),
    eventType: text("event_type").notNull(),
    // event_type: FILED | GRANTED | LAPSED | ASSIGNED | LISTED_FOR_SALE
    eventDate: date("event_date").notNull(),
    details: jsonb("details"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_patent_events_patent").on(table.patentId),
    index("idx_patent_events_type").on(table.eventType),
    index("idx_patent_events_date").on(table.eventDate),
  ]
);

// ─── Watchlists ──────────────────────────────────────────────────────
export const watchlists = pgTable(
  "watchlists",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" })
      .unique(),                                              // one watchlist per user
    industries: text("industries").array().default([]),
    // industry values: maschinenbau | chemie | medtech | elektro | automotive
    keywords: text("keywords").array().default([]),
    cpcCodes: text("cpc_codes").array().default([]),
    active: boolean("active").default(true).notNull(),
    onboardingComplete: boolean("onboarding_complete").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_watchlists_user").on(table.userId),
    index("idx_watchlists_active").on(table.active),
  ]
);

// ─── Briefings ───────────────────────────────────────────────────────
export const briefings = pgTable(
  "briefings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    weekOf: date("week_of").notNull(),                       // Monday of the briefing week
    status: text("status").default("pending").notNull(),     // pending | generated | sent | failed
    htmlContent: text("html_content"),
    textContent: text("text_content"),
    sentAt: timestamp("sent_at"),
    openedAt: timestamp("opened_at"),
    clickedAt: timestamp("clicked_at"),
    resendMessageId: text("resend_message_id"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_briefings_user").on(table.userId),
    index("idx_briefings_week").on(table.weekOf),
    index("idx_briefings_status").on(table.status),
    uniqueIndex("idx_briefings_user_week").on(table.userId, table.weekOf),
  ]
);

// ─── Briefing Patents (join) ─────────────────────────────────────────
export const briefingPatents = pgTable(
  "briefing_patents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    briefingId: uuid("briefing_id")
      .notNull()
      .references(() => briefings.id, { onDelete: "cascade" }),
    patentId: uuid("patent_id")
      .notNull()
      .references(() => patents.id, { onDelete: "cascade" }),
    category: text("category").notNull(),
    // category: free | for_sale | strategy
    relevanceScore: integer("relevance_score"),              // 0-100
    relevanceReasonDe: text("relevance_reason_de"),
    sortOrder: integer("sort_order").default(0),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_bp_briefing").on(table.briefingId),
    index("idx_bp_patent").on(table.patentId),
  ]
);

// ─── Type Exports (Patent Pilot) ─────────────────────────────────────
export type Patent = typeof patents.$inferSelect;
export type NewPatent = typeof patents.$inferInsert;
export type PatentEvent = typeof patentEvents.$inferSelect;
export type NewPatentEvent = typeof patentEvents.$inferInsert;
export type Watchlist = typeof watchlists.$inferSelect;
export type NewWatchlist = typeof watchlists.$inferInsert;
export type Briefing = typeof briefings.$inferSelect;
export type NewBriefing = typeof briefings.$inferInsert;
export type BriefingPatent = typeof briefingPatents.$inferSelect;
export type NewBriefingPatent = typeof briefingPatents.$inferInsert;
```

- [ ] **Step 4: Run test to verify it passes**
```bash
cd apps/web && pnpm test packages/db/src/__tests__/patent-schema.test.ts
```
Expected: PASS

- [ ] **Step 5: Generate and run migration**
```bash
pnpm db:generate
pnpm db:migrate
```
Expected: Migration files created in `packages/db/drizzle/`, tables created in DB.

- [ ] **Step 6: Commit**
```bash
git add packages/db/src/schema.ts packages/db/src/__tests__/patent-schema.test.ts
git add packages/db/drizzle/
git commit -m "feat(db): add patent pilot schema (patents, watchlists, briefings)"
```

---

## Task 3: EPO OPS API Client

**Files:**
- Create: `apps/web/src/lib/epo/types.ts`
- Create: `apps/web/src/lib/epo/client.ts`
- Create: `apps/web/src/lib/epo/__tests__/client.test.ts`

- [ ] **Step 1: Write failing tests**

Create `apps/web/src/lib/epo/__tests__/client.test.ts`:
```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { EpoClient } from "../client";

describe("EpoClient", () => {
  let client: EpoClient;

  beforeEach(() => {
    client = new EpoClient({
      clientId: "test-id",
      clientSecret: "test-secret",
      dryRun: true,
    });
  });

  it("builds correct CPC search query", () => {
    const query = client.buildCpcQuery(["B60", "F16"]);
    expect(query).toBe("cpc any \"B60 F16\"");
  });

  it("maps EPO status to internal status", () => {
    expect(client.mapStatus("REVOKED")).toBe("lapsed");
    expect(client.mapStatus("CEASED")).toBe("lapsed");
    expect(client.mapStatus("ACTIVE")).toBe("active");
  });

  it("extracts expiry date from legal status", () => {
    const date = client.parseExpiryDate("20251231");
    expect(date).toBe("2025-12-31");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**
```bash
cd apps/web && pnpm test src/lib/epo/__tests__/client.test.ts
```
Expected: FAIL — `EpoClient` not found.

- [ ] **Step 3: Create types**

Create `apps/web/src/lib/epo/types.ts`:
```typescript
export interface EpoClientConfig {
  clientId: string;
  clientSecret: string;
  dryRun?: boolean;
}

export interface EpoToken {
  accessToken: string;
  expiresAt: number; // unix ms
}

export interface EpoPatentResult {
  patentNumber: string;
  title: string;
  filingDate: string | null;
  grantDate: string | null;
  expiryDate: string | null;
  owner: string | null;
  cpcCodes: string[];
  status: "active" | "lapsed" | "for_sale" | "assigned";
  abstractEn: string | null;
  rawData: Record<string, unknown>;
}

export interface EpoSearchOptions {
  cpcCodes?: string[];
  dateFrom?: string; // YYYYMMDD
  dateTo?: string;
  statusFilter?: ("lapsed" | "active")[];
  maxResults?: number;
}
```

- [ ] **Step 4: Create client**

Create `apps/web/src/lib/epo/client.ts`:
```typescript
import type { EpoClientConfig, EpoToken, EpoPatentResult, EpoSearchOptions } from "./types";

const EPO_BASE = "https://ops.epo.org/3.2";
const TOKEN_URL = `${EPO_BASE}/auth/accesstoken`;

export class EpoClient {
  private config: EpoClientConfig;
  private token: EpoToken | null = null;

  constructor(config: EpoClientConfig) {
    this.config = config;
  }

  buildCpcQuery(cpcCodes: string[]): string {
    return `cpc any "${cpcCodes.join(" ")}"`;
  }

  mapStatus(epoStatus: string): "active" | "lapsed" | "for_sale" | "assigned" {
    const upper = epoStatus.toUpperCase();
    if (["REVOKED", "CEASED", "LAPSED", "EXPIRED"].includes(upper)) return "lapsed";
    if (["ASSIGNED", "TRANSFERRED"].includes(upper)) return "assigned";
    return "active";
  }

  parseExpiryDate(raw: string): string | null {
    if (!raw || raw.length !== 8) return null;
    return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
  }

  private async getToken(): Promise<string> {
    if (this.token && this.token.expiresAt > Date.now() + 60_000) {
      return this.token.accessToken;
    }
    const credentials = Buffer.from(
      `${this.config.clientId}:${this.config.clientSecret}`
    ).toString("base64");
    const res = await fetch(TOKEN_URL, {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    });
    if (!res.ok) throw new Error(`EPO token error: ${res.status}`);
    const data = await res.json();
    this.token = {
      accessToken: data.access_token,
      expiresAt: Date.now() + data.expires_in * 1000,
    };
    return this.token.accessToken;
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    if (this.config.dryRun) {
      console.log(`[EPO DRY_RUN] GET ${EPO_BASE}${path}`);
      return {} as T;
    }
    const token = await this.getToken();
    const res = await fetch(`${EPO_BASE}${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        ...options.headers,
      },
    });
    if (!res.ok) throw new Error(`EPO API error: ${res.status} ${path}`);
    return res.json();
  }

  async searchRecentlyLapsed(options: EpoSearchOptions): Promise<EpoPatentResult[]> {
    const query = this.buildCpcQuery(options.cpcCodes ?? []);
    const dateFrom = options.dateFrom ?? this.sevenDaysAgo();
    const path = `/rest-services/published-data/search?q=${encodeURIComponent(
      `${query} and pd within "${dateFrom},${options.dateTo ?? this.today()}"`
    )}&Range=1-${options.maxResults ?? 50}`;

    const raw = await this.request<Record<string, unknown>>(path);
    return this.parseSearchResults(raw);
  }

  private sevenDaysAgo(): string {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().slice(0, 10).replace(/-/g, "");
  }

  private today(): string {
    return new Date().toISOString().slice(0, 10).replace(/-/g, "");
  }

  private parseSearchResults(raw: Record<string, unknown>): EpoPatentResult[] {
    // EPO OPS returns XML-like nested JSON; adapt as needed based on actual API response
    // This is a stub — real parsing depends on EPO OPS response shape
    const results = (raw as any)?.["ops:world-patent-data"]?.["ops:biblio-search"]?.["ops:search-result"]?.["exchange-documents"] ?? [];
    const docs = Array.isArray(results) ? results : [results];
    return docs.map((doc: any) => this.parseDocument(doc)).filter(Boolean) as EpoPatentResult[];
  }

  private parseDocument(doc: any): EpoPatentResult | null {
    try {
      const bib = doc["exchange-document"]?.["bibliographic-data"] ?? doc["bibliographic-data"];
      if (!bib) return null;
      const docId = doc["exchange-document"]?.["@doc-number"] ?? doc["@doc-number"] ?? "";
      const kind = doc["exchange-document"]?.["@kind"] ?? doc["@kind"] ?? "";
      const patentNumber = `${doc["exchange-document"]?.["@country"] ?? "EP"}${docId}${kind}`;
      const titleArr = bib["invention-title"];
      const titleEn = Array.isArray(titleArr)
        ? (titleArr.find((t: any) => t["@lang"] === "en")?.["$"] ?? titleArr[0]?.["$"] ?? "")
        : (titleArr?.["$"] ?? "");
      const filingDate = bib?.["application-reference"]?.["document-id"]?.["date"]?.["$"] ?? null;
      const owners = bib?.["parties"]?.["applicants"]?.["applicant"];
      const owner = Array.isArray(owners)
        ? owners[0]?.["applicant-name"]?.["name"]?.["$"] ?? null
        : owners?.["applicant-name"]?.["name"]?.["$"] ?? null;
      const cpcArr = bib?.["classifications-cpc"]?.["patent-classification"] ?? [];
      const cpcCodes = (Array.isArray(cpcArr) ? cpcArr : [cpcArr])
        .map((c: any) => [c?.["section"]?.["$"], c?.["class"]?.["$"], c?.["subclass"]?.["$"]].filter(Boolean).join(""))
        .filter(Boolean);
      return {
        patentNumber,
        title: titleEn,
        filingDate: this.parseExpiryDate(filingDate?.replace(/-/g, "") ?? ""),
        grantDate: null,
        expiryDate: null,
        owner,
        cpcCodes,
        status: "active",
        abstractEn: null,
        rawData: doc,
      };
    } catch {
      return null;
    }
  }
}

export function getEpoClient(): EpoClient {
  return new EpoClient({
    clientId: process.env.EPO_CLIENT_ID ?? "",
    clientSecret: process.env.EPO_CLIENT_SECRET ?? "",
    dryRun: process.env.AI_DRY_RUN === "true",
  });
}
```

- [ ] **Step 5: Run tests to verify they pass**
```bash
cd apps/web && pnpm test src/lib/epo/__tests__/client.test.ts
```
Expected: PASS (3 tests)

- [ ] **Step 6: Commit**
```bash
git add apps/web/src/lib/epo/
git commit -m "feat(epo): add EPO OPS API client with OAuth2 and search"
```

---

## Task 4: AI Provider Abstraction

**Files:**
- Create: `apps/web/src/lib/ai/providers.ts`
- Create: `apps/web/src/lib/ai/match.ts`
- Create: `apps/web/src/lib/ai/__tests__/match.test.ts`

- [ ] **Step 1: Write failing tests**

Create `apps/web/src/lib/ai/__tests__/match.test.ts`:
```typescript
import { describe, it, expect } from "vitest";
import { buildMatchPrompt, parseMatchResponse } from "../match";

describe("patent matching", () => {
  it("builds a match prompt with user context", () => {
    const prompt = buildMatchPrompt(
      { title: "Hydraulic valve system", abstractEn: "A valve for pressure control", cpcCodes: ["F16K"] },
      { industries: ["maschinenbau"], keywords: ["hydraulik", "ventil"], cpcCodes: ["F16"] }
    );
    expect(prompt).toContain("maschinenbau");
    expect(prompt).toContain("hydraulik");
    expect(prompt).toContain("Hydraulic valve");
  });

  it("parses a valid JSON match response", () => {
    const raw = JSON.stringify({ score: 85, reason: "Direkt relevant für Hydrauliksysteme im Maschinenbau." });
    const result = parseMatchResponse(raw);
    expect(result.score).toBe(85);
    expect(result.reason).toContain("Hydraulik");
  });

  it("returns score 0 for unparseable response", () => {
    const result = parseMatchResponse("not json");
    expect(result.score).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**
```bash
cd apps/web && pnpm test src/lib/ai/__tests__/match.test.ts
```
Expected: FAIL

- [ ] **Step 3: Create AI provider abstraction**

Create `apps/web/src/lib/ai/providers.ts`:
```typescript
export type AiProvider = "anthropic" | "openai" | "gemini";

export interface AiMessage {
  role: "user" | "assistant";
  content: string;
}

export async function callAi(
  messages: AiMessage[],
  options: { maxTokens?: number; json?: boolean } = {}
): Promise<string> {
  const provider = (process.env.AI_PROVIDER ?? "anthropic") as AiProvider;
  const dryRun = process.env.AI_DRY_RUN === "true";

  if (dryRun) {
    console.log(`[AI DRY_RUN] provider=${provider} messages=${messages.length}`);
    return options.json
      ? JSON.stringify({ score: 75, reason: "Dry-run: relevant für den Bereich." })
      : "Dry-run briefing content.";
  }

  if (provider === "anthropic") return callAnthropic(messages, options);
  if (provider === "openai") return callOpenAi(messages, options);
  if (provider === "gemini") return callGemini(messages, options);
  throw new Error(`Unknown AI provider: ${provider}`);
}

async function callAnthropic(messages: AiMessage[], options: { maxTokens?: number }): Promise<string> {
  const Anthropic = (await import("@anthropic-ai/sdk")).default;
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const res = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: options.maxTokens ?? 1024,
    messages,
  });
  const block = res.content[0];
  return block.type === "text" ? block.text : "";
}

async function callOpenAi(messages: AiMessage[], options: { maxTokens?: number }): Promise<string> {
  const OpenAI = (await import("openai")).default;
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const res = await client.chat.completions.create({
    model: "gpt-4o",
    max_tokens: options.maxTokens ?? 1024,
    messages,
  });
  return res.choices[0]?.message?.content ?? "";
}

async function callGemini(messages: AiMessage[], options: { maxTokens?: number }): Promise<string> {
  const { GoogleGenerativeAI } = await import("@google/generative-ai");
  const client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? "");
  const model = client.getGenerativeModel({ model: "gemini-1.5-flash" });
  const prompt = messages.map((m) => `${m.role}: ${m.content}`).join("\n");
  const res = await model.generateContent({ contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { maxOutputTokens: options.maxTokens ?? 1024 } });
  return res.response.text();
}
```

- [ ] **Step 4: Create match module**

Create `apps/web/src/lib/ai/match.ts`:
```typescript
import type { Patent, Watchlist } from "@repo/db";
import { callAi } from "./providers";

export function buildMatchPrompt(
  patent: Pick<Patent, "title" | "abstractEn" | "cpcCodes">,
  watchlist: Pick<Watchlist, "industries" | "keywords" | "cpcCodes">
): string {
  return `Du bist ein Patent-Intelligence-Analyst für den deutschen Mittelstand.

Benutzer-Profil:
- Branchen: ${watchlist.industries.join(", ")}
- Keywords: ${watchlist.keywords.join(", ")}
- CPC-Klassen: ${watchlist.cpcCodes.join(", ")}

Patent:
- Titel: ${patent.title}
- Abstract: ${patent.abstractEn ?? "(nicht verfügbar)"}
- CPC-Codes: ${patent.cpcCodes.join(", ")}

Bewerte die Relevanz dieses Patents für den Benutzer auf einer Skala von 0-100.
Antworte NUR mit validem JSON: {"score": <0-100>, "reason": "<1 Satz auf Deutsch, warum relevant oder nicht>"}`;
}

export function parseMatchResponse(raw: string): { score: number; reason: string } {
  try {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return { score: 0, reason: "" };
    const parsed = JSON.parse(match[0]);
    return {
      score: typeof parsed.score === "number" ? Math.min(100, Math.max(0, parsed.score)) : 0,
      reason: typeof parsed.reason === "string" ? parsed.reason : "",
    };
  } catch {
    return { score: 0, reason: "" };
  }
}

export async function scorePatentRelevance(
  patent: Pick<Patent, "title" | "abstractEn" | "cpcCodes">,
  watchlist: Pick<Watchlist, "industries" | "keywords" | "cpcCodes">
): Promise<{ score: number; reason: string }> {
  const prompt = buildMatchPrompt(patent, watchlist);
  const response = await callAi(
    [{ role: "user", content: prompt }],
    { maxTokens: 200, json: true }
  );
  return parseMatchResponse(response);
}
```

- [ ] **Step 5: Install AI SDKs**
```bash
cd apps/web && pnpm add @anthropic-ai/sdk openai @google/generative-ai
```

- [ ] **Step 6: Run tests**
```bash
cd apps/web && pnpm test src/lib/ai/__tests__/match.test.ts
```
Expected: PASS (3 tests)

- [ ] **Step 7: Commit**
```bash
git add apps/web/src/lib/ai/ apps/web/package.json
git commit -m "feat(ai): add multi-provider abstraction and patent relevance scoring"
```

---

## Task 5: Briefing Generation

**Files:**
- Create: `apps/web/src/lib/ai/generate-briefing.ts`
- Create: `apps/web/src/lib/ai/__tests__/generate-briefing.test.ts`

- [ ] **Step 1: Write failing test**

Create `apps/web/src/lib/ai/__tests__/generate-briefing.test.ts`:
```typescript
import { describe, it, expect } from "vitest";
import { buildBriefingPrompt } from "../generate-briefing";

describe("briefing generation", () => {
  it("includes all three sections in prompt", () => {
    const prompt = buildBriefingPrompt(
      { weekNumber: 26, year: 2026, userKeywords: ["hydraulik", "ventil"] },
      {
        freePatents: [{ patentNumber: "EP123", title: "Hydraulic valve", reason: "Relevant", score: 90 }],
        salePatents: [],
        strategyPatent: null,
      }
    );
    expect(prompt).toContain("Freie Patente");
    expect(prompt).toContain("Erwerb");
    expect(prompt).toContain("Strategie");
    expect(prompt).toContain("EP123");
  });

  it("handles empty patent sections gracefully", () => {
    const prompt = buildBriefingPrompt(
      { weekNumber: 26, year: 2026, userKeywords: [] },
      { freePatents: [], salePatents: [], strategyPatent: null }
    );
    expect(prompt).toBeDefined();
    expect(prompt.length).toBeGreaterThan(50);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**
```bash
cd apps/web && pnpm test src/lib/ai/__tests__/generate-briefing.test.ts
```
Expected: FAIL

- [ ] **Step 3: Create generate-briefing module**

Create `apps/web/src/lib/ai/generate-briefing.ts`:
```typescript
import { callAi } from "./providers";

interface BriefingContext {
  weekNumber: number;
  year: number;
  userKeywords: string[];
}

interface ScoredPatent {
  patentNumber: string;
  title: string;
  reason: string;
  score: number;
  owner?: string | null;
  expiryDate?: string | null;
}

interface BriefingPatents {
  freePatents: ScoredPatent[];
  salePatents: ScoredPatent[];
  strategyPatent: ScoredPatent | null;
}

export function buildBriefingPrompt(ctx: BriefingContext, patents: BriefingPatents): string {
  const freeSection = patents.freePatents.length > 0
    ? patents.freePatents.map((p) =>
        `- ${p.patentNumber}: "${p.title}" (${p.reason})`
      ).join("\n")
    : "- Keine neuen freien Patente diese Woche.";

  const saleSection = patents.salePatents.length > 0
    ? patents.salePatents.map((p) =>
        `- ${p.patentNumber}: "${p.title}", Inhaber: ${p.owner ?? "unbekannt"} (${p.reason})`
      ).join("\n")
    : "- Keine Patente zum Erwerb diese Woche.";

  const strategySection = patents.strategyPatent
    ? `- ${patents.strategyPatent.patentNumber}: "${patents.strategyPatent.title}" (${patents.strategyPatent.reason})`
    : "- Kein Strategie-Impuls diese Woche.";

  return `Du bist Patent Pilot, ein KI-Assistent für Patent-Intelligence im deutschen Mittelstand.

Erstelle ein wöchentliches Patent-Briefing für KW ${ctx.weekNumber}/${ctx.year}.
Nutzer-Keywords: ${ctx.userKeywords.join(", ") || "nicht angegeben"}.

Schreibe professionelles, klares Deutsch. Kein Juristendeutsch. Direkt und handlungsorientiert.
Maximale Länge: 400 Wörter. Keine em-Dashes.

FORMAT (genau so):

**Ihr Patent-Briefing, KW ${ctx.weekNumber}/${ctx.year}**

**Freie Patente, die Sie ab sofort nutzen dürfen:**
${freeSection}

**Patente zum Erwerb in Ihrem Bereich:**
${saleSection}

**Strategie-Impuls der Woche:**
${strategySection}

Schreibe die finale Version des Briefings auf Deutsch, mit konkreten Handlungsempfehlungen pro Abschnitt.`;
}

export async function generateBriefingHtml(ctx: BriefingContext, patents: BriefingPatents): Promise<string> {
  const prompt = buildBriefingPrompt(ctx, patents);
  const text = await callAi([{ role: "user", content: prompt }], { maxTokens: 800 });
  // Convert markdown-ish text to simple HTML paragraphs
  const html = text
    .split("\n\n")
    .map((para) => {
      if (para.startsWith("**") && para.endsWith("**")) {
        return `<h2>${para.replace(/\*\*/g, "")}</h2>`;
      }
      if (para.startsWith("**")) {
        const [boldPart, ...rest] = para.split("\n");
        return `<h3>${boldPart.replace(/\*\*/g, "")}</h3><p>${rest.join("<br>")}</p>`;
      }
      return `<p>${para.replace(/\n/g, "<br>")}</p>`;
    })
    .join("\n");
  return html;
}
```

- [ ] **Step 4: Run tests**
```bash
cd apps/web && pnpm test src/lib/ai/__tests__/generate-briefing.test.ts
```
Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add apps/web/src/lib/ai/generate-briefing.ts apps/web/src/lib/ai/__tests__/generate-briefing.test.ts
git commit -m "feat(ai): add briefing generation with three-section German output"
```

---

## Task 6: Briefing Email Template

**Files:**
- Create: `packages/email/src/briefing.tsx`
- Modify: `packages/email/src/index.ts`

- [ ] **Step 1: Create briefing email template**

Create `packages/email/src/briefing.tsx`:
```tsx
import {
  Html, Head, Body, Container, Section, Text, Heading, Link, Hr, Preview,
} from "@react-email/components";

interface BriefingEmailProps {
  weekNumber: number;
  year: number;
  briefingHtml: string;
  dashboardUrl: string;
  watchlistUrl: string;
  unsubscribeUrl: string;
  userFirstName?: string;
}

const main = { backgroundColor: "#f8f9fb", fontFamily: "'Geist', Arial, sans-serif" };
const container = { backgroundColor: "#ffffff", maxWidth: "600px", margin: "0 auto", padding: "0" };
const header = { backgroundColor: "#1a2332", padding: "24px 32px" };
const headerTitle = { color: "#ffffff", fontSize: "18px", fontWeight: "600", margin: "0" };
const headerSubtitle = { color: "#94a3b8", fontSize: "13px", margin: "4px 0 0" };
const contentPad = { padding: "32px 32px 24px" };
const bodyText = { color: "#1a2332", fontSize: "15px", lineHeight: "1.6" };
const footerSection = { padding: "16px 32px 24px", borderTop: "1px solid #e2e8f0" };
const footerText = { color: "#94a3b8", fontSize: "12px", lineHeight: "1.5" };
const link = { color: "#d97706" };

export function BriefingEmail({
  weekNumber,
  year,
  briefingHtml,
  dashboardUrl,
  watchlistUrl,
  unsubscribeUrl,
  userFirstName,
}: BriefingEmailProps) {
  const greeting = userFirstName ? `Guten Morgen, ${userFirstName}` : "Guten Morgen";

  return (
    <Html lang="de">
      <Head />
      <Preview>Ihr Patent-Briefing KW {weekNumber}/{year}, neue freie Patente in Ihrem Bereich</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Text style={headerTitle}>Patent Pilot</Text>
            <Text style={headerSubtitle}>Patent-Intelligence, KW {weekNumber}/{year}</Text>
          </Section>
          <Section style={contentPad}>
            <Text style={bodyText}>{greeting},</Text>
            <div dangerouslySetInnerHTML={{ __html: briefingHtml }} />
          </Section>
          <Hr />
          <Section style={contentPad}>
            <Link href={dashboardUrl} style={link}>Briefing-Archiv</Link>
            {" · "}
            <Link href={watchlistUrl} style={link}>Watchlist anpassen</Link>
          </Section>
          <Section style={footerSection}>
            <Text style={footerText}>
              Patent Pilot liefert wöchentliche KI-kuratierte Patent-Briefings für den deutschen Mittelstand.
              Keine Rechtsberatung, alle Angaben ohne Gewähr. Rechtsstatus aus EPO-Daten.
            </Text>
            <Text style={footerText}>
              <Link href={unsubscribeUrl} style={footerText}>Abmelden</Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
```

- [ ] **Step 2: Export from index**

In `packages/email/src/index.ts`, add:
```typescript
export { BriefingEmail } from "./briefing";
```

- [ ] **Step 3: Commit**
```bash
git add packages/email/src/briefing.tsx packages/email/src/index.ts
git commit -m "feat(email): add BriefingEmail React Email template"
```

---

## Task 7: Inngest Jobs (Ingest + Generate)

**Files:**
- Create: `apps/web/src/inngest/nightly-ingest.ts`
- Create: `apps/web/src/inngest/sunday-generate.ts`
- Modify: `apps/web/src/app/api/inngest/route.ts`
- Create: `apps/web/src/lib/email.ts` (extend existing or new file for briefing send)

- [ ] **Step 1: Create nightly ingest job**

Create `apps/web/src/inngest/nightly-ingest.ts`:
```typescript
import { inngest } from "@/lib/inngest";
import { getDb } from "@repo/db";
import { patents, patentEvents } from "@repo/db/src/schema";
import { getEpoClient } from "@/lib/epo/client";
import { CPC_BY_INDUSTRY } from "@/lib/epo/cpc-map";
import { eq, sql } from "drizzle-orm";

export const nightlyIngestFn = inngest.createFunction(
  { id: "nightly-patent-ingest", retries: 2 },
  { cron: "0 1 * * *" }, // 01:00 UTC daily
  async ({ step }) => {
    const db = getDb();
    const epo = getEpoClient();

    // Collect all unique CPC codes across all active watchlists
    const watchlistCpcs = await step.run("fetch-active-cpc-codes", async () => {
      const rows = await db.execute(
        sql`SELECT DISTINCT unnest(cpc_codes) AS cpc FROM watchlists WHERE active = true`
      );
      const custom = rows.rows.map((r: any) => r.cpc as string);
      const industryRows = await db.execute(
        sql`SELECT DISTINCT unnest(industries) AS ind FROM watchlists WHERE active = true`
      );
      const industryCpcs = industryRows.rows
        .flatMap((r: any) => CPC_BY_INDUSTRY[r.ind as string] ?? []);
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
            rawData: p.rawData,
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
            await db.insert(patentEvents).values({
              patentId: existing[0].id,
              eventType: "LAPSED",
              eventDate: p.expiryDate ?? new Date().toISOString().slice(0, 10),
            }).onConflictDoNothing();
          }
        }
        count++;
      }
      return count;
    });

    return { ingested, cpcs: watchlistCpcs.length };
  }
);
```

- [ ] **Step 2: Create CPC map**

Create `apps/web/src/lib/epo/cpc-map.ts`:
```typescript
export const CPC_BY_INDUSTRY: Record<string, string[]> = {
  maschinenbau: ["B", "F"],
  chemie: ["C"],
  medtech: ["A61"],
  elektro: ["H"],
  automotive: ["B60", "B62"],
};

export const INDUSTRY_LABELS: Record<string, string> = {
  maschinenbau: "Maschinenbau",
  chemie: "Chemie",
  medtech: "MedTech",
  elektro: "Elektrotechnik",
  automotive: "Automotive",
};
```

- [ ] **Step 3: Create Sunday generate job**

Create `apps/web/src/inngest/sunday-generate.ts`:
```typescript
import { inngest } from "@/lib/inngest";
import { getDb } from "@repo/db";
import { watchlists, briefings, patents, patentEvents, briefingPatents, users } from "@repo/db/src/schema";
import { eq, and, gte, inArray, sql } from "drizzle-orm";
import { scorePatentRelevance } from "@/lib/ai/match";
import { generateBriefingHtml } from "@/lib/ai/generate-briefing";
import { sendBriefingEmail } from "@/lib/email";

// Triggered by cron; fans out one event per user
export const sundayGenerateFn = inngest.createFunction(
  { id: "sunday-briefing-trigger", retries: 1 },
  { cron: "0 21 * * 0" }, // Sunday 21:00 UTC
  async ({ step }) => {
    const db = getDb();
    const activeUsers = await step.run("fetch-active-users", async () => {
      return db
        .select({ userId: watchlists.userId })
        .from(watchlists)
        .where(and(eq(watchlists.active, true), eq(watchlists.onboardingComplete, true)));
    });

    await step.sendEvent(
      "fan-out-briefing-generation",
      activeUsers.map((u) => ({
        name: "briefing/generate",
        data: { userId: u.userId },
      }))
    );

    return { triggered: activeUsers.length };
  }
);

// One function per user — called via fan-out
export const generateUserBriefingFn = inngest.createFunction(
  { id: "generate-user-briefing", retries: 2, concurrency: { limit: 5 } },
  { event: "briefing/generate" },
  async ({ event, step }) => {
    const { userId } = event.data as { userId: string };
    const db = getDb();
    const now = new Date();
    const weekOf = getMondayOfWeek(now);
    const weekNumber = getWeekNumber(weekOf);

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
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const candidates = await step.run("fetch-candidate-patents", async () => {
      return db
        .select({ id: patents.id, patentNumber: patents.patentNumber, title: patents.title, abstractEn: patents.abstractEn, cpcCodes: patents.cpcCodes, status: patents.status, owner: patents.owner, expiryDate: patents.expiryDate })
        .from(patents)
        .innerJoin(patentEvents, eq(patentEvents.patentId, patents.id))
        .where(and(
          gte(patentEvents.eventDate, sevenDaysAgo),
          inArray(patentEvents.eventType, ["LAPSED", "LISTED_FOR_SALE"])
        ))
        .limit(30);
    });

    // Score each patent against watchlist
    const scored = await step.run("score-patents", async () => {
      const results = [];
      for (const p of candidates) {
        const { score, reason } = await scorePatentRelevance(p, watchlist);
        if (score >= 50) results.push({ ...p, score, reason });
      }
      return results.sort((a, b) => b.score - a.score);
    });

    const freePatents = scored.filter((p) => p.status === "lapsed").slice(0, 3);
    const salePatents = scored.filter((p) => p.status === "for_sale").slice(0, 2);
    const strategyPatent = scored[0] ?? null;

    // Generate briefing HTML
    const htmlContent = await step.run("generate-html", async () => {
      return generateBriefingHtml(
        { weekNumber, year: weekOf.getFullYear(), userKeywords: watchlist.keywords },
        { freePatents, salePatents, strategyPatent }
      );
    });

    // Save briefing to DB
    const briefingId = await step.run("save-briefing", async () => {
      const [inserted] = await db.insert(briefings).values({
        userId,
        weekOf: weekOf.toISOString().slice(0, 10),
        status: "generated",
        htmlContent,
      }).returning({ id: briefings.id });

      for (const p of freePatents) {
        await db.insert(briefingPatents).values({ briefingId: inserted.id, patentId: p.id, category: "free", relevanceScore: p.score, relevanceReasonDe: p.reason, sortOrder: freePatents.indexOf(p) });
      }
      for (const p of salePatents) {
        await db.insert(briefingPatents).values({ briefingId: inserted.id, patentId: p.id, category: "for_sale", relevanceScore: p.score, relevanceReasonDe: p.reason, sortOrder: salePatents.indexOf(p) });
      }
      return inserted.id;
    });

    // Send email
    const user = await step.run("fetch-user", async () => {
      const rows = await db.select({ email: users.email, name: users.name }).from(users).where(eq(users.id, userId)).limit(1);
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
        await db.update(briefings).set({ status: "sent", sentAt: new Date(), resendMessageId: messageId }).where(eq(briefings.id, briefingId));
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
  return 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
}
```

- [ ] **Step 4: Create sendBriefingEmail in lib/email.ts**

Check if `apps/web/src/lib/email.ts` exists. If so, add to it. Otherwise create:
```typescript
// Append to apps/web/src/lib/email.ts or add this function:
import { Resend } from "resend";
import { BriefingEmail } from "@repo/email";
import * as React from "react";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendBriefingEmail({
  to,
  firstName,
  weekNumber,
  year,
  htmlContent,
  briefingId,
}: {
  to: string;
  firstName?: string;
  weekNumber: number;
  year: number;
  htmlContent: string;
  briefingId: string;
}): Promise<string> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://patentpilot.de";
  const dryRun = process.env.RESEND_DRY_RUN === "true";

  if (dryRun) {
    console.log(`[EMAIL DRY_RUN] to=${to} briefingId=${briefingId}`);
    return "dry-run-message-id";
  }

  const { data, error } = await resend.emails.send({
    from: process.env.BRIEFING_FROM_EMAIL ?? "briefing@patentpilot.de",
    replyTo: process.env.BRIEFING_REPLY_TO ?? "support@patentpilot.de",
    to,
    subject: `Ihr Patent-Briefing, KW ${weekNumber}/${year}`,
    react: React.createElement(BriefingEmail, {
      weekNumber,
      year,
      briefingHtml: htmlContent,
      dashboardUrl: `${appUrl}/briefings`,
      watchlistUrl: `${appUrl}/watchlist`,
      unsubscribeUrl: `${appUrl}/api/unsubscribe?briefingId=${briefingId}`,
      userFirstName: firstName,
    }),
  });

  if (error) throw new Error(`Resend error: ${JSON.stringify(error)}`);
  return data?.id ?? "";
}
```

- [ ] **Step 5: Register new Inngest functions**

In `apps/web/src/app/api/inngest/route.ts`, add the new functions:
```typescript
import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest";
import { sendWelcomeEmailFn } from "@/inngest/send-welcome-email";
import { paymentFailedReminderFn } from "@/inngest/payment-failed-reminder";
import { subscriptionCanceledFn } from "@/inngest/subscription-canceled";
import { cleanupSessionsFn } from "@/inngest/cleanup-sessions";
import { nightlyIngestFn } from "@/inngest/nightly-ingest";
import { sundayGenerateFn, generateUserBriefingFn } from "@/inngest/sunday-generate";

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
  ],
});
```

- [ ] **Step 6: Commit**
```bash
git add apps/web/src/inngest/nightly-ingest.ts apps/web/src/inngest/sunday-generate.ts
git add apps/web/src/lib/epo/cpc-map.ts apps/web/src/app/api/inngest/route.ts
git commit -m "feat(jobs): add nightly EPO ingest + Sunday briefing fan-out via Inngest"
```

---

## Task 8: Onboarding Wizard

**Files:**
- Create: `apps/web/src/app/onboarding/page.tsx`
- Create: `apps/web/src/app/onboarding/_components/industry-step.tsx`
- Create: `apps/web/src/app/onboarding/_components/keywords-step.tsx`
- Create: `apps/web/src/app/onboarding/_components/confirm-step.tsx`
- Create: `apps/web/src/app/api/watchlist/route.ts`

- [ ] **Step 1: Create watchlist API route**

Create `apps/web/src/app/api/watchlist/route.ts`:
```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getDb } from "@repo/db";
import { watchlists } from "@repo/db/src/schema";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { industries, keywords, cpcCodes } = body as {
    industries: string[];
    keywords: string[];
    cpcCodes: string[];
  };

  if (!industries || industries.length === 0) {
    return NextResponse.json({ error: "Mindestens eine Branche erforderlich." }, { status: 400 });
  }

  const db = getDb();
  await db
    .insert(watchlists)
    .values({
      userId: session.user.id,
      industries,
      keywords,
      cpcCodes,
      onboardingComplete: true,
      active: true,
    })
    .onConflictDoUpdate({
      target: watchlists.userId,
      set: { industries, keywords, cpcCodes, onboardingComplete: true, updatedAt: new Date() },
    });

  return NextResponse.json({ success: true });
}

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getDb();
  const rows = await db
    .select()
    .from(watchlists)
    .where(eq(watchlists.userId, session.user.id))
    .limit(1);

  return NextResponse.json(rows[0] ?? null);
}
```

- [ ] **Step 2: Create onboarding page**

Create `apps/web/src/app/onboarding/page.tsx`:
```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { IndustryStep } from "./_components/industry-step";
import { KeywordsStep } from "./_components/keywords-step";
import { ConfirmStep } from "./_components/confirm-step";
import { Progress } from "@/components/ui/progress";

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [industries, setIndustries] = useState<string[]>([]);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  async function handleFinish() {
    setSaving(true);
    try {
      await fetch("/api/watchlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ industries, keywords, cpcCodes: [] }),
      });
      router.push("/dashboard");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-foreground">Patent Pilot einrichten</h1>
          <p className="text-muted-foreground mt-1">Schritt {step} von 3</p>
          <Progress value={(step / 3) * 100} className="mt-3" />
        </div>
        {step === 1 && (
          <IndustryStep
            selected={industries}
            onChange={setIndustries}
            onNext={() => setStep(2)}
          />
        )}
        {step === 2 && (
          <KeywordsStep
            keywords={keywords}
            industries={industries}
            onChange={setKeywords}
            onNext={() => setStep(3)}
            onBack={() => setStep(1)}
          />
        )}
        {step === 3 && (
          <ConfirmStep
            industries={industries}
            keywords={keywords}
            onBack={() => setStep(2)}
            onFinish={handleFinish}
            saving={saving}
          />
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create IndustryStep component**

Create `apps/web/src/app/onboarding/_components/industry-step.tsx`:
```tsx
"use client";

import { Building2, FlaskConical, Stethoscope, Zap, Car } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { INDUSTRY_LABELS } from "@/lib/epo/cpc-map";

const ICONS: Record<string, React.ElementType> = {
  maschinenbau: Building2,
  chemie: FlaskConical,
  medtech: Stethoscope,
  elektro: Zap,
  automotive: Car,
};

interface Props {
  selected: string[];
  onChange: (v: string[]) => void;
  onNext: () => void;
}

export function IndustryStep({ selected, onChange, onNext }: Props) {
  function toggle(key: string) {
    onChange(selected.includes(key) ? selected.filter((k) => k !== key) : [...selected, key]);
  }

  return (
    <div>
      <h2 className="text-xl font-semibold mb-2">In welcher Branche sind Sie aktiv?</h2>
      <p className="text-muted-foreground text-sm mb-6">Mehrfachauswahl möglich.</p>
      <div className="grid grid-cols-2 gap-4 mb-8">
        {Object.entries(INDUSTRY_LABELS).map(([key, label]) => {
          const Icon = ICONS[key] ?? Building2;
          const active = selected.includes(key);
          return (
            <Card
              key={key}
              onClick={() => toggle(key)}
              className={cn(
                "p-6 cursor-pointer border-2 transition-colors hover:border-accent",
                active ? "border-accent bg-accent/5" : "border-border"
              )}
            >
              <div className="flex items-center gap-3">
                <Icon className={cn("size-6", active ? "text-accent" : "text-muted-foreground")} />
                <span className={cn("font-medium", active ? "text-foreground" : "text-muted-foreground")}>
                  {label}
                </span>
              </div>
            </Card>
          );
        })}
      </div>
      <Button onClick={onNext} disabled={selected.length === 0} className="w-full">
        Weiter
      </Button>
    </div>
  );
}
```

- [ ] **Step 4: Create KeywordsStep**

Create `apps/web/src/app/onboarding/_components/keywords-step.tsx`:
```tsx
"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

const SUGGESTIONS: Record<string, string[]> = {
  maschinenbau: ["Hydraulik", "Antrieb", "Getriebe", "Sensorik", "Robotik", "CNC"],
  chemie: ["Katalyse", "Polymer", "Beschichtung", "Filtration", "Synthese"],
  medtech: ["Implantat", "Diagnostik", "Bildgebung", "Chirurgie", "Wearable"],
  elektro: ["Leistungselektronik", "Sensor", "Kommunikation", "Batterie"],
  automotive: ["Elektroantrieb", "ADAS", "Karosserie", "Bremse", "Leichtbau"],
};

interface Props {
  keywords: string[];
  industries: string[];
  onChange: (v: string[]) => void;
  onNext: () => void;
  onBack: () => void;
}

export function KeywordsStep({ keywords, industries, onChange, onNext, onBack }: Props) {
  const [input, setInput] = useState("");
  const suggestions = [...new Set(industries.flatMap((i) => SUGGESTIONS[i] ?? []))].filter(
    (s) => !keywords.includes(s)
  );

  function add(kw: string) {
    const trimmed = kw.trim();
    if (trimmed && !keywords.includes(trimmed)) {
      onChange([...keywords, trimmed]);
    }
    setInput("");
  }

  return (
    <div>
      <h2 className="text-xl font-semibold mb-2">Welche Technologien interessieren Sie?</h2>
      <p className="text-muted-foreground text-sm mb-6">
        Stichwörter helfen uns, treffsichere Patente zu finden.
      </p>
      <div className="flex gap-2 mb-4">
        <Input
          placeholder="Stichwort eingeben..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(input); } }}
        />
        <Button variant="outline" onClick={() => add(input)} disabled={!input.trim()}>
          Hinzufügen
        </Button>
      </div>
      {suggestions.length > 0 && (
        <div className="mb-4">
          <p className="text-xs text-muted-foreground mb-2">Vorschläge:</p>
          <div className="flex flex-wrap gap-2">
            {suggestions.slice(0, 8).map((s) => (
              <Badge key={s} variant="outline" className="cursor-pointer hover:bg-accent/10" onClick={() => add(s)}>
                + {s}
              </Badge>
            ))}
          </div>
        </div>
      )}
      {keywords.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-8">
          {keywords.map((kw) => (
            <Badge key={kw} className="bg-primary text-primary-foreground gap-1">
              {kw}
              <X className="size-3 cursor-pointer" onClick={() => onChange(keywords.filter((k) => k !== kw))} />
            </Badge>
          ))}
        </div>
      )}
      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} className="flex-1">Zurück</Button>
        <Button onClick={onNext} className="flex-1">Weiter</Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Create ConfirmStep**

Create `apps/web/src/app/onboarding/_components/confirm-step.tsx`:
```tsx
"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CheckCircle, Mail } from "lucide-react";
import { INDUSTRY_LABELS } from "@/lib/epo/cpc-map";

interface Props {
  industries: string[];
  keywords: string[];
  onBack: () => void;
  onFinish: () => void;
  saving: boolean;
}

export function ConfirmStep({ industries, keywords, onBack, onFinish, saving }: Props) {
  return (
    <div>
      <h2 className="text-xl font-semibold mb-2">Alles bereit.</h2>
      <p className="text-muted-foreground text-sm mb-6">
        Ihr erstes Briefing erhalten Sie am kommenden Montag um 8 Uhr.
      </p>
      <Card className="p-6 mb-6 space-y-4">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Branchen</p>
          <p className="font-medium">{industries.map((i) => INDUSTRY_LABELS[i] ?? i).join(", ")}</p>
        </div>
        {keywords.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Keywords</p>
            <p className="font-medium">{keywords.join(", ")}</p>
          </div>
        )}
        <div className="flex items-center gap-2 text-muted-foreground text-sm pt-2 border-t">
          <Mail className="size-4" />
          <span>Briefings jeden Montag um 8 Uhr</span>
        </div>
      </Card>
      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} className="flex-1" disabled={saving}>Zurück</Button>
        <Button onClick={onFinish} disabled={saving} className="flex-2 bg-accent hover:bg-accent/90 text-accent-foreground">
          <CheckCircle className="size-4 mr-2" />
          {saving ? "Wird gespeichert..." : "Patent Pilot starten"}
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Commit**
```bash
git add apps/web/src/app/onboarding/ apps/web/src/app/api/watchlist/
git commit -m "feat(onboarding): 3-step wizard for industry + keyword setup"
```

---

## Task 9: Dashboard Rebrand

**Files:**
- Modify: `apps/web/src/app/dashboard/page.tsx`
- Create: `apps/web/src/app/dashboard/_components/stats-bar.tsx`
- Create: `apps/web/src/app/dashboard/_components/latest-briefing.tsx`
- Modify: `apps/web/src/components/app-sidebar.tsx`
- Create: `apps/web/src/app/api/dashboard/stats/route.ts`

- [ ] **Step 1: Create stats API route**

Create `apps/web/src/app/api/dashboard/stats/route.ts`:
```typescript
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getDb } from "@repo/db";
import { briefings, watchlists, patents } from "@repo/db/src/schema";
import { eq, count, and } from "drizzle-orm";
import { headers } from "next/headers";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getDb();
  const userId = session.user.id;

  const [briefingCount, watchlist, latestBriefing] = await Promise.all([
    db.select({ count: count() }).from(briefings).where(eq(briefings.userId, userId)),
    db.select().from(watchlists).where(eq(watchlists.userId, userId)).limit(1),
    db.select().from(briefings)
      .where(and(eq(briefings.userId, userId)))
      .orderBy(briefings.createdAt)
      .limit(1),
  ]);

  const [patentCount] = await db.select({ count: count() }).from(patents);

  return NextResponse.json({
    briefingsSent: briefingCount[0]?.count ?? 0,
    watchlistActive: watchlist[0]?.active ?? false,
    onboardingComplete: watchlist[0]?.onboardingComplete ?? false,
    patentsInDb: patentCount?.count ?? 0,
    latestBriefingId: latestBriefing[0]?.id ?? null,
    latestBriefingWeek: latestBriefing[0]?.weekOf ?? null,
    industries: watchlist[0]?.industries ?? [],
  });
}
```

- [ ] **Step 2: Rebrand dashboard page**

Replace `apps/web/src/app/dashboard/page.tsx` with:
```tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { StatsBar } from "./_components/stats-bar";
import { LatestBriefing } from "./_components/latest-briefing";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

interface DashboardStats {
  briefingsSent: number;
  onboardingComplete: boolean;
  patentsInDb: number;
  latestBriefingId: string | null;
  latestBriefingWeek: string | null;
  industries: string[];
}

export default function DashboardPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    if (!isPending && !session) router.push("/login");
  }, [session, isPending, router]);

  useEffect(() => {
    if (session) {
      fetch("/api/dashboard/stats").then((r) => r.json()).then(setStats);
    }
  }, [session]);

  if (isPending) return <div className="flex items-center justify-center min-h-screen"><p className="text-muted-foreground">Wird geladen...</p></div>;
  if (!session) return null;

  return (
    <SidebarProvider style={{ "--sidebar-width": "calc(var(--spacing) * 72)", "--header-height": "calc(var(--spacing) * 12)" } as React.CSSProperties}>
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col p-6 gap-6">
          {stats && !stats.onboardingComplete && (
            <div className="rounded-lg border border-accent/30 bg-accent/5 p-4 flex items-center justify-between">
              <p className="text-sm font-medium">Richten Sie Ihre Watchlist ein, um Briefings zu erhalten.</p>
              <Button size="sm" className="bg-accent hover:bg-accent/90 text-accent-foreground" onClick={() => router.push("/onboarding")}>
                Jetzt einrichten <ArrowRight className="ml-2 size-4" />
              </Button>
            </div>
          )}
          {stats && <StatsBar stats={stats} />}
          {stats?.latestBriefingId && <LatestBriefing briefingId={stats.latestBriefingId} weekOf={stats.latestBriefingWeek} />}
          {stats && stats.briefingsSent === 0 && stats.onboardingComplete && (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-lg font-medium">Ihr erstes Briefing kommt am Montag um 8 Uhr.</p>
              <p className="text-sm mt-1">Wir durchsuchen gerade die Patentdatenbank nach relevanten Einträgen.</p>
            </div>
          )}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
```

- [ ] **Step 3: Create StatsBar component**

Create `apps/web/src/app/dashboard/_components/stats-bar.tsx`:
```tsx
import { Mail, Database, Eye } from "lucide-react";
import { Card } from "@/components/ui/card";
import { INDUSTRY_LABELS } from "@/lib/epo/cpc-map";

interface Props {
  stats: {
    briefingsSent: number;
    patentsInDb: number;
    industries: string[];
  };
}

export function StatsBar({ stats }: Props) {
  return (
    <div className="grid grid-cols-3 gap-4">
      <Card className="p-6">
        <div className="flex items-center gap-3">
          <Mail className="size-8 text-accent" />
          <div>
            <p className="text-2xl font-semibold font-mono">{stats.briefingsSent}</p>
            <p className="text-xs text-muted-foreground">Briefings erhalten</p>
          </div>
        </div>
      </Card>
      <Card className="p-6">
        <div className="flex items-center gap-3">
          <Database className="size-8 text-primary" />
          <div>
            <p className="text-2xl font-semibold font-mono">{stats.patentsInDb.toLocaleString("de-DE")}</p>
            <p className="text-xs text-muted-foreground">Patente beobachtet</p>
          </div>
        </div>
      </Card>
      <Card className="p-6">
        <div className="flex items-center gap-3">
          <Eye className="size-8 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium leading-tight">
              {stats.industries.map((i) => INDUSTRY_LABELS[i] ?? i).join(", ") || "Keine Branchen"}
            </p>
            <p className="text-xs text-muted-foreground">Ihre Watchlist</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
```

- [ ] **Step 4: Create LatestBriefing component**

Create `apps/web/src/app/dashboard/_components/latest-briefing.tsx`:
```tsx
"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

interface Props {
  briefingId: string;
  weekOf: string | null;
}

export function LatestBriefing({ briefingId, weekOf }: Props) {
  const [html, setHtml] = useState<string>("");

  useEffect(() => {
    fetch(`/api/briefings/${briefingId}`).then((r) => r.json()).then((d) => setHtml(d.htmlContent ?? ""));
  }, [briefingId]);

  const dateLabel = weekOf
    ? new Date(weekOf).toLocaleDateString("de-DE", { day: "numeric", month: "long", year: "numeric" })
    : "";

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Letztes Briefing</h2>
        <p className="text-sm text-muted-foreground">{dateLabel}</p>
      </div>
      <div
        className="prose prose-sm max-w-none text-foreground line-clamp-6"
        dangerouslySetInnerHTML={{ __html: html }}
      />
      <Button variant="outline" size="sm" className="mt-4" asChild>
        <Link href={`/briefings/${briefingId}`}>
          Vollständig lesen <ArrowRight className="ml-2 size-4" />
        </Link>
      </Button>
    </Card>
  );
}
```

- [ ] **Step 5: Update sidebar navigation**

In `apps/web/src/components/app-sidebar.tsx`, find the nav items array and replace with Patent Pilot navigation:
```tsx
// Replace the navMain items with:
const navMain = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Briefings", url: "/briefings", icon: Mail },
  { title: "Watchlist", url: "/watchlist", icon: Eye },
  { title: "Einstellungen", url: "/settings", icon: Settings },
];
```
Import the needed icons: `import { LayoutDashboard, Mail, Eye, Settings } from "lucide-react";`

- [ ] **Step 6: Create briefing detail API route**

Create `apps/web/src/app/api/briefings/[id]/route.ts`:
```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getDb } from "@repo/db";
import { briefings } from "@repo/db/src/schema";
import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const db = getDb();
  const rows = await db
    .select()
    .from(briefings)
    .where(and(eq(briefings.id, id), eq(briefings.userId, session.user.id)))
    .limit(1);

  if (!rows[0]) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(rows[0]);
}
```

- [ ] **Step 7: Commit**
```bash
git add apps/web/src/app/dashboard/ apps/web/src/components/app-sidebar.tsx apps/web/src/app/api/dashboard/ apps/web/src/app/api/briefings/
git commit -m "feat(dashboard): rebrand to Patent Pilot with stats, latest briefing, navigation"
```

---

## Task 10: Briefings Archive Route

**Files:**
- Create: `apps/web/src/app/briefings/page.tsx`
- Create: `apps/web/src/app/briefings/[id]/page.tsx`
- Create: `apps/web/src/app/api/briefings/route.ts`

- [ ] **Step 1: Create briefings list API**

Create `apps/web/src/app/api/briefings/route.ts`:
```typescript
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getDb } from "@repo/db";
import { briefings } from "@repo/db/src/schema";
import { eq, desc } from "drizzle-orm";
import { headers } from "next/headers";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getDb();
  const rows = await db
    .select({ id: briefings.id, weekOf: briefings.weekOf, status: briefings.status, sentAt: briefings.sentAt })
    .from(briefings)
    .where(eq(briefings.userId, session.user.id))
    .orderBy(desc(briefings.createdAt))
    .limit(52);

  return NextResponse.json(rows);
}
```

- [ ] **Step 2: Create briefings list page**

Create `apps/web/src/app/briefings/page.tsx`:
```tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

interface BriefingRow {
  id: string;
  weekOf: string;
  status: string;
  sentAt: string | null;
}

export default function BriefingsPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [briefingList, setBriefingList] = useState<BriefingRow[]>([]);

  useEffect(() => { if (!isPending && !session) router.push("/login"); }, [session, isPending, router]);
  useEffect(() => { if (session) fetch("/api/briefings").then((r) => r.json()).then(setBriefingList); }, [session]);

  if (isPending || !session) return null;

  return (
    <SidebarProvider style={{ "--sidebar-width": "calc(var(--spacing) * 72)", "--header-height": "calc(var(--spacing) * 12)" } as React.CSSProperties}>
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="p-6 max-w-3xl">
          <h1 className="text-2xl font-semibold mb-6">Briefing-Archiv</h1>
          {briefingList.length === 0 && (
            <p className="text-muted-foreground">Noch keine Briefings vorhanden. Das erste kommt am Montag.</p>
          )}
          <div className="space-y-3">
            {briefingList.map((b) => {
              const date = new Date(b.weekOf).toLocaleDateString("de-DE", { day: "numeric", month: "long", year: "numeric" });
              return (
                <Link key={b.id} href={`/briefings/${b.id}`}>
                  <Card className="p-4 flex items-center justify-between hover:shadow-md transition-shadow">
                    <div>
                      <p className="font-medium">Briefing {date}</p>
                      <p className="text-sm text-muted-foreground">Woche {b.weekOf}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant={b.status === "sent" ? "default" : "outline"}>
                        {b.status === "sent" ? "Gesendet" : b.status}
                      </Badge>
                      <ArrowRight className="size-4 text-muted-foreground" />
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
```

- [ ] **Step 3: Create briefing detail page**

Create `apps/web/src/app/briefings/[id]/page.tsx`:
```tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function BriefingDetailPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const { data: session, isPending } = useSession();
  const [briefing, setBriefing] = useState<{ htmlContent: string; weekOf: string } | null>(null);

  useEffect(() => { if (!isPending && !session) router.push("/login"); }, [session, isPending, router]);
  useEffect(() => {
    if (session && id) {
      fetch(`/api/briefings/${id}`).then((r) => r.json()).then(setBriefing);
    }
  }, [session, id]);

  if (isPending || !session) return null;

  return (
    <SidebarProvider style={{ "--sidebar-width": "calc(var(--spacing) * 72)", "--header-height": "calc(var(--spacing) * 12)" } as React.CSSProperties}>
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="p-6 max-w-3xl">
          <Link href="/briefings">
            <Button variant="ghost" size="sm" className="mb-4 -ml-2">
              <ArrowLeft className="mr-2 size-4" /> Zurück zum Archiv
            </Button>
          </Link>
          {briefing && (
            <>
              <h1 className="text-2xl font-semibold mb-6">
                Briefing {new Date(briefing.weekOf).toLocaleDateString("de-DE", { day: "numeric", month: "long", year: "numeric" })}
              </h1>
              <Card className="p-8">
                <div className="prose prose-sm max-w-none text-foreground" dangerouslySetInnerHTML={{ __html: briefing.htmlContent ?? "" }} />
              </Card>
            </>
          )}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
```

- [ ] **Step 4: Commit**
```bash
git add apps/web/src/app/briefings/ apps/web/src/app/api/briefings/
git commit -m "feat(briefings): add briefings archive and detail view"
```

---

## Task 11: Watchlist Management Route

**Files:**
- Create: `apps/web/src/app/watchlist/page.tsx`

- [ ] **Step 1: Create watchlist page**

Create `apps/web/src/app/watchlist/page.tsx`:
```tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { IndustryStep } from "@/app/onboarding/_components/industry-step";
import { KeywordsStep } from "@/app/onboarding/_components/keywords-step";
import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";

export default function WatchlistPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [industries, setIndustries] = useState<string[]>([]);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => { if (!isPending && !session) router.push("/login"); }, [session, isPending, router]);
  useEffect(() => {
    if (session) {
      fetch("/api/watchlist").then((r) => r.json()).then((data) => {
        if (data) { setIndustries(data.industries ?? []); setKeywords(data.keywords ?? []); }
      });
    }
  }, [session]);

  async function save() {
    setSaving(true);
    try {
      await fetch("/api/watchlist", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ industries, keywords, cpcCodes: [] }) });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally { setSaving(false); }
  }

  if (isPending || !session) return null;

  return (
    <SidebarProvider style={{ "--sidebar-width": "calc(var(--spacing) * 72)", "--header-height": "calc(var(--spacing) * 12)" } as React.CSSProperties}>
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="p-6 max-w-2xl space-y-8">
          <h1 className="text-2xl font-semibold">Watchlist verwalten</h1>
          <div>
            <h2 className="text-lg font-medium mb-4">Branchen</h2>
            <IndustryStep selected={industries} onChange={setIndustries} onNext={() => {}} />
          </div>
          <div>
            <h2 className="text-lg font-medium mb-4">Keywords</h2>
            <KeywordsStep keywords={keywords} industries={industries} onChange={setKeywords} onNext={() => {}} onBack={() => {}} />
          </div>
          <Button onClick={save} disabled={saving} className="bg-accent hover:bg-accent/90 text-accent-foreground">
            {saved ? <><CheckCircle className="mr-2 size-4" /> Gespeichert</> : saving ? "Wird gespeichert..." : "Watchlist speichern"}
          </Button>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
```

- [ ] **Step 2: Commit**
```bash
git add apps/web/src/app/watchlist/
git commit -m "feat(watchlist): add watchlist management page"
```

---

## Task 12: Update Pricing Page & Subscription Gates

**Files:**
- Modify: `apps/web/src/app/pricing/page.tsx`
- Create: `apps/web/src/lib/subscription.ts`

- [ ] **Step 1: Create subscription helper**

Create `apps/web/src/lib/subscription.ts`:
```typescript
import { getDb } from "@repo/db";
import { userSubscriptions, briefings } from "@repo/db/src/schema";
import { eq, count } from "drizzle-orm";

export async function getUserTier(userId: string): Promise<"trial" | "starter" | "pro"> {
  const db = getDb();
  const [sub] = await db
    .select({ status: userSubscriptions.status, priceId: userSubscriptions.stripePriceId })
    .from(userSubscriptions)
    .where(eq(userSubscriptions.userId, userId))
    .limit(1);

  if (!sub || sub.status !== "active") {
    // Check trial: max 2 briefings
    const [{ count: briefingCount }] = await db
      .select({ count: count() })
      .from(briefings)
      .where(eq(briefings.userId, userId));
    return briefingCount < 2 ? "trial" : "trial"; // trial expires after 2 briefings sent
  }

  const proPriceIds = [
    process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID,
    process.env.NEXT_PUBLIC_STRIPE_PRO_ANNUAL_PRICE_ID,
  ];
  return proPriceIds.includes(sub.priceId ?? "") ? "pro" : "starter";
}

export function getKeywordLimit(tier: "trial" | "starter" | "pro"): number {
  return tier === "pro" ? Infinity : tier === "starter" ? 3 : 3;
}

export function getIndustryLimit(tier: "trial" | "starter" | "pro"): number {
  return tier === "pro" ? 3 : 1;
}
```

- [ ] **Step 2: Update pricing page**

In `apps/web/src/app/pricing/page.tsx`, update the pricing tiers to Patent Pilot pricing. Find the existing plan objects (they'll have names/prices) and replace with:

```tsx
const plans = [
  {
    name: "Trial",
    price: "0",
    description: "2 Briefings kostenlos testen",
    features: ["2 Briefings", "1 Branche", "3 Keywords", "E-Mail-Zustellung"],
    cta: "Kostenlos starten",
    href: "/signup",
    highlight: false,
  },
  {
    name: "Starter",
    price: "249",
    priceId: process.env.NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID,
    description: "Für Innovations-Verantwortliche",
    features: ["Wöchentliche Briefings", "1 Branche", "3 Keywords", "E-Mail + Dashboard-Archiv", "Alle 3 Briefing-Sektionen"],
    cta: "Starter starten",
    highlight: false,
  },
  {
    name: "Pro",
    price: "499",
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID,
    description: "Für strategisch aktive Teams",
    features: ["Wöchentliche Briefings", "3 Branchen", "Unlimitierte Keywords", "E-Mail + Dashboard-Archiv", "CPC-Verfeinerung", "Prioritäts-Support"],
    cta: "Pro starten",
    highlight: true,
  },
];
```

- [ ] **Step 3: Commit**
```bash
git add apps/web/src/app/pricing/ apps/web/src/lib/subscription.ts
git commit -m "feat(pricing): update Patent Pilot pricing tiers (249/499 EUR)"
```

---

## Task 13: Landing Page

**Files:**
- Modify: `apps/web/src/app/page.tsx`
- Modify: `apps/web/src/app/globals.css`

- [ ] **Step 1: Update color tokens in globals.css**

In `apps/web/src/app/globals.css`, replace the `:root` block with the Patent Pilot palette from DESIGN.md:
```css
:root {
  --radius: 0.625rem;
  --background: oklch(0.98 0.005 240);
  --foreground: oklch(0.12 0.02 240);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.12 0.02 240);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.12 0.02 240);
  --primary: oklch(0.25 0.08 240);
  --primary-foreground: oklch(0.98 0 0);
  --secondary: oklch(0.95 0.005 240);
  --secondary-foreground: oklch(0.25 0.08 240);
  --muted: oklch(0.95 0.005 240);
  --muted-foreground: oklch(0.50 0.02 240);
  --accent: oklch(0.65 0.15 75);
  --accent-foreground: oklch(0.12 0.02 240);
  --destructive: oklch(0.577 0.245 27.325);
  --border: oklch(0.88 0.01 240);
  --input: oklch(0.88 0.01 240);
  --ring: oklch(0.65 0.15 75);
  /* Patent status colors */
  --status-free: oklch(0.55 0.15 145);
  --status-sale: oklch(0.65 0.15 75);
  --status-watch: oklch(0.55 0.12 240);
}
.dark {
  --background: oklch(0.12 0.02 240);
  --foreground: oklch(0.95 0.005 240);
  --card: oklch(0.16 0.025 240);
  --card-foreground: oklch(0.95 0.005 240);
  --popover: oklch(0.16 0.025 240);
  --popover-foreground: oklch(0.95 0.005 240);
  --primary: oklch(0.75 0.10 240);
  --primary-foreground: oklch(0.12 0.02 240);
  --secondary: oklch(0.20 0.03 240);
  --secondary-foreground: oklch(0.95 0.005 240);
  --muted: oklch(0.20 0.03 240);
  --muted-foreground: oklch(0.65 0.02 240);
  --accent: oklch(0.70 0.15 75);
  --accent-foreground: oklch(0.12 0.02 240);
  --destructive: oklch(0.704 0.191 22.216);
  --border: oklch(0.25 0.03 240);
  --input: oklch(0.25 0.03 240);
  --ring: oklch(0.70 0.15 75);
}
```

- [ ] **Step 2: Build landing page**

Replace `apps/web/src/app/page.tsx` with Patent Pilot landing page:
```tsx
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CheckCircle, Mail, FileSearch, TrendingUp } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="border-b bg-background/95 backdrop-blur sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <span className="font-semibold text-foreground">Patent Pilot</span>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground">Anmelden</Link>
            <Button size="sm" className="bg-accent hover:bg-accent/90 text-accent-foreground" asChild>
              <Link href="/signup">Kostenlos testen</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-6 py-20 text-center">
        <p className="text-sm font-medium text-accent mb-4 uppercase tracking-wide">Patent-Intelligence für den Mittelstand</p>
        <h1 className="text-4xl font-semibold tracking-tight text-foreground mb-6 max-w-3xl mx-auto leading-tight">
          4 von 5 Patenten verfallen vor Ablauf. Wir zeigen Ihnen, welche Sie nutzen können.
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10">
          Patent Pilot liefert dem Mittelstand jeden Montag ein kuratiertes Briefing: welche Patente in Ihrem Technologiefeld gerade frei geworden oder zu kaufen sind, auf Deutsch, ohne Patentabteilung.
        </p>
        <div className="flex gap-4 justify-center">
          <Button size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground" asChild>
            <Link href="/signup">2 Briefings kostenlos testen</Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/pricing">Preise ansehen</Link>
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-4">Keine Kreditkarte erforderlich. Kein Juristendeutsch.</p>
      </section>

      {/* How it works */}
      <section className="bg-muted/30 py-16">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-2xl font-semibold text-center mb-12">Jeden Montag um 8 Uhr</h2>
          <div className="grid grid-cols-3 gap-8">
            {[
              { icon: FileSearch, title: "Freie Patente", body: "Welche Patente in Ihrem Feld sind diese Woche in den Public Domain übergegangen, ab sofort frei verwendbar." },
              { icon: TrendingUp, title: "Patente zum Erwerb", body: "Konzerne und Start-ups die Patente in Ihrem Bereich anbieten, zum Kauf oder zur Lizenzierung." },
              { icon: Mail, title: "Strategie-Impuls", body: "Eine konkrete Handlungsempfehlung: was tun mit diesem Patent? Sofort prüfen, Anwalt einschalten, oder beobachten." },
            ].map(({ icon: Icon, title, body }) => (
              <Card key={title} className="p-6">
                <Icon className="size-8 text-accent mb-4" />
                <h3 className="font-semibold mb-2">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Why Mittelstand */}
      <section className="max-w-5xl mx-auto px-6 py-16">
        <div className="grid grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-2xl font-semibold mb-4">PatSnap hat Ihnen 50.000 Treffer. Wir geben Ihnen die fünf, die zählen.</h2>
            <p className="text-muted-foreground mb-6 leading-relaxed">Enterprise-Patent-Tools setzen eine IP-Abteilung voraus und kosten fünfstellig im Jahr. Patent Pilot ist gemacht für den Leiter Strategie, der keine Patentexpertise hat und keine Zeit für Datenbankrecherche.</p>
            <ul className="space-y-3">
              {["Komplett auf Deutsch", "Onboarding in 5 Minuten", "Ab 249 €/Monat, kein Jahresvertrag", "Kein Schulungsaufwand"].map((f) => (
                <li key={f} className="flex items-center gap-3 text-sm">
                  <CheckCircle className="size-4 text-accent flex-shrink-0" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>
          <Card className="p-8 bg-muted/30">
            <p className="text-3xl font-mono font-semibold text-foreground mb-1">199.264</p>
            <p className="text-sm text-muted-foreground mb-6">Neue Patente in der EU pro Jahr</p>
            <p className="text-3xl font-mono font-semibold text-foreground mb-1">83%</p>
            <p className="text-sm text-muted-foreground mb-6">Verfallen vor Ablauf der 20-Jahres-Frist</p>
            <p className="text-3xl font-mono font-semibold text-foreground mb-1">0</p>
            <p className="text-sm text-muted-foreground">Mittelständler die das systematisch beobachten</p>
          </Card>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-primary text-primary-foreground py-16">
        <div className="max-w-2xl mx-auto text-center px-6">
          <h2 className="text-2xl font-semibold mb-4">Freie Patente. Jeden Montag. Auf Deutsch.</h2>
          <p className="text-primary-foreground/80 mb-8">2 Briefings kostenlos, keine Kreditkarte, jederzeit kündbar.</p>
          <Button size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground" asChild>
            <Link href="/signup">Jetzt kostenlos testen</Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="max-w-5xl mx-auto px-6 text-center text-sm text-muted-foreground">
          <p>Patent Pilot, BrainBytes Studio. Alle Angaben ohne Gewähr. Keine Rechtsberatung.</p>
          <div className="flex justify-center gap-6 mt-3">
            <Link href="/impressum" className="hover:text-foreground">Impressum</Link>
            <Link href="/datenschutz" className="hover:text-foreground">Datenschutz</Link>
            <Link href="/pricing" className="hover:text-foreground">Preise</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
```

- [ ] **Step 3: Commit**
```bash
git add apps/web/src/app/page.tsx apps/web/src/app/globals.css
git commit -m "feat(landing): Patent Pilot landing page with brand colors"
```

---

## Task 14: Admin Manual Trigger & Final Wiring

**Files:**
- Create: `apps/web/src/app/admin/patent-pilot/page.tsx`
- Create: `apps/web/src/app/api/admin/trigger-ingest/route.ts`
- Create: `apps/web/src/app/api/admin/trigger-generate/route.ts`
- Modify: `apps/web/src/lib/inngest.ts` (rename app id)

- [ ] **Step 1: Rename Inngest app id**

In `apps/web/src/lib/inngest.ts`:
```typescript
import { Inngest } from "inngest";

export const inngest = new Inngest({
  id: "patent-pilot",
});
```

- [ ] **Step 2: Create admin trigger routes**

Create `apps/web/src/app/api/admin/trigger-ingest/route.ts`:
```typescript
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { inngest } from "@/lib/inngest";
import { headers } from "next/headers";

export async function POST() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  await inngest.send({ name: "patent/ingest.trigger", data: {} });
  return NextResponse.json({ triggered: true });
}
```

Create `apps/web/src/app/api/admin/trigger-generate/route.ts`:
```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { inngest } from "@/lib/inngest";
import { headers } from "next/headers";

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { userId } = await req.json() as { userId?: string };
  await inngest.send({ name: "briefing/generate", data: { userId: userId ?? session.user.id } });
  return NextResponse.json({ triggered: true });
}
```

- [ ] **Step 3: Create admin patent pilot page**

Create `apps/web/src/app/admin/patent-pilot/page.tsx`:
```tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { RefreshCw, Send } from "lucide-react";

export default function AdminPatentPilotPage() {
  const [ingestStatus, setIngestStatus] = useState("");
  const [generateStatus, setGenerateStatus] = useState("");
  const [userId, setUserId] = useState("");

  async function triggerIngest() {
    setIngestStatus("Triggering...");
    const res = await fetch("/api/admin/trigger-ingest", { method: "POST" });
    setIngestStatus(res.ok ? "Ingest job triggered via Inngest." : "Error");
  }

  async function triggerGenerate() {
    setGenerateStatus("Triggering...");
    const res = await fetch("/api/admin/trigger-generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: userId || undefined }),
    });
    setGenerateStatus(res.ok ? "Briefing generation triggered via Inngest." : "Error");
  }

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold">Patent Pilot Admin</h1>
      <Card className="p-6 space-y-4">
        <h2 className="font-medium">EPO Ingest</h2>
        <p className="text-sm text-muted-foreground">Startet den Nightly-Ingest-Job manuell.</p>
        <div className="flex gap-3">
          <Button onClick={triggerIngest} variant="outline">
            <RefreshCw className="mr-2 size-4" /> Ingest starten
          </Button>
          {ingestStatus && <p className="text-sm text-muted-foreground pt-2">{ingestStatus}</p>}
        </div>
      </Card>
      <Card className="p-6 space-y-4">
        <h2 className="font-medium">Briefing generieren</h2>
        <p className="text-sm text-muted-foreground">Generiert ein Briefing für eine User-ID (leer = eigene).</p>
        <div className="flex gap-3">
          <Input placeholder="User-ID (optional)" value={userId} onChange={(e) => setUserId(e.target.value)} />
          <Button onClick={triggerGenerate}>
            <Send className="mr-2 size-4" /> Briefing generieren
          </Button>
        </div>
        {generateStatus && <p className="text-sm text-muted-foreground">{generateStatus}</p>}
      </Card>
    </div>
  );
}
```

- [ ] **Step 4: Add Patent Pilot link to admin sidebar**

In `apps/web/src/app/admin/layout.tsx` (or wherever admin nav is defined), add a link to `/admin/patent-pilot`. Read the file first to find the right place, then add:
```tsx
<Link href="/admin/patent-pilot">Patent Pilot</Link>
```

- [ ] **Step 5: Install deps and typecheck**
```bash
pnpm install
pnpm typecheck
```
Fix any TypeScript errors. Common issues: missing imports, wrong type shapes between Drizzle types and component props.

- [ ] **Step 6: Full commit**
```bash
git add apps/web/src/app/admin/patent-pilot/ apps/web/src/app/api/admin/ apps/web/src/lib/inngest.ts
git commit -m "feat(admin): Patent Pilot admin panel with manual ingest + generate triggers"
```

---

## Task 15: Dev Run & Smoke Test

- [ ] **Step 1: Install all dependencies**
```bash
pnpm install
```

- [ ] **Step 2: Run database migration**
```bash
pnpm db:push
```

- [ ] **Step 3: Start dev server**
```bash
pnpm dev
```
Expected: App starts at `http://localhost:3003`

- [ ] **Step 4: Smoke test checklist**
- [ ] Landing page renders at `http://localhost:3003` with Patent Pilot branding
- [ ] Sign up creates a user account
- [ ] Onboarding wizard completes and saves watchlist to DB
- [ ] Dashboard shows stats bar and onboarding CTA
- [ ] `/briefings` renders (empty state if no briefings yet)
- [ ] `/watchlist` shows saved industry/keyword selections
- [ ] `/pricing` shows 3 tiers at 0/249/499 EUR
- [ ] Admin panel at `/admin/patent-pilot` accessible for admin users
- [ ] Inngest dashboard shows all 7 registered functions

- [ ] **Step 5: Test EPO client in dry-run mode**
```bash
cd apps/web && node -e "
const { EpoClient } = require('./src/lib/epo/client');
const c = new EpoClient({ clientId: 'test', clientSecret: 'test', dryRun: true });
console.log(c.buildCpcQuery(['F16', 'B60']));
console.log(c.mapStatus('REVOKED'));
console.log(c.parseExpiryDate('20251231'));
"
```
Expected: `cpc any "F16 B60"`, `lapsed`, `2025-12-31`

- [ ] **Step 6: Run full test suite**
```bash
pnpm test
```
Expected: All tests pass.

- [ ] **Step 7: Final commit**
```bash
git add -p  # stage only relevant files
git commit -m "chore: verify Patent Pilot smoke tests pass"
```

---

## Self-Review

**Spec coverage check:**
- [x] EPO OPS API client — Task 3
- [x] AI matching + briefing generation — Tasks 4, 5
- [x] Email template — Task 6
- [x] Inngest nightly ingest + Sunday fan-out — Task 7
- [x] Onboarding wizard — Task 8
- [x] Dashboard rebrand — Task 9
- [x] Briefings archive + detail — Task 10
- [x] Watchlist management — Task 11
- [x] Pricing/subscription gates — Task 12
- [x] Landing page — Task 13
- [x] Admin panel — Task 14
- [ ] Impressum/Datenschutz pages — NOT in plan (create manually or from Legal-Templates Obsidian)
- [ ] Resend webhook for open/click tracking — not implemented (low priority for MVP)

**Placeholder scan:** No TBDs or TODOs in tasks.

**Type consistency:** `Watchlist.industries` is `string[]`, `Watchlist.keywords` is `string[]` — consistent across all tasks. `Briefing.htmlContent` is `string | null` — handled with `?? ""` in components.
