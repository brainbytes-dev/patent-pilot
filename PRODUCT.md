# Patentbrief — Product Context

## Product Purpose

Patentbrief is a weekly patent intelligence email newsletter for German Mittelstand companies. Every Monday at 8am: which patents in your technology field just became free (lapsed before 20-year term), which are available for licensing or purchase — summarized in plain German, no patent department needed.

Email is the product. The web app is the archive and subscription management layer.

## Users

**Primary:** Leiter Strategie, CTO, Geschäftsführer at 20-500 person DACH manufacturing and engineering firms. 40-55 years old. Reads Handelsblatt. Opens email on Monday morning with first coffee. Has no patent expertise and no time for database research. Trusts editorial brands.

**Secondary:** IP-aware founders at tech-adjacent Mittelstand companies who know patents matter but lack dedicated resources.

## Brand

**Name:** Patentbrief  
**Domain:** patentbrief.eu  
**Brand house:** BrainBytes Studio (HM Digital Consulting Rühe)  
**Contact:** info@brainbyt.es

**Voice:** Authoritative, clear, German. Like a trusted Handelsblatt column — no startup jargon, no buzzwords, no exclamation marks. The kind of briefing a board member would forward.

**Anti-references:** PatSnap (enterprise complexity), generic SaaS (teal buttons, feature grids), startup landing pages (social proof counters, testimonial carousels, hero metrics).

**Register:** brand (landing/marketing surfaces) + product (dashboard/app surfaces)

## Positioning

- vs. PatSnap/Dennemeyer: enterprise tools cost €50k+/year and require an IP department. We cost €249/month and replace 10 hours of Googling.
- Core insight: 83% of patents lapse before their 20-year term. Most Mittelstand companies have no idea which free IP is available in their field.
- Tagline: "Freie Patente. Jeden Montag. Auf Deutsch."

## Pricing

- Free: 2 briefings trial, no credit card
- Pro: €249/month, no annual contract, cancel anytime

## Technical

- Next.js 16 App Router, Tailwind v4, shadcn/ui
- Better Auth, Drizzle ORM, Neon Postgres
- Inngest for weekly jobs, Resend for email delivery
- EPO OPS API for patent data, AI for curation and summarization
