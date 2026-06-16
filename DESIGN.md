# Patent Pilot — Design System

## Section 1: Visual Theme & Atmosphere

**Concept:** B2B intelligence platform. Feels like Bloomberg Terminal meets modern SaaS — authoritative, data-dense, but not intimidating. The Mittelstand buyer is a 45-year-old Leiter Strategie who opens this on Monday morning with his first coffee. It needs to feel serious and trustworthy.

**Dials:**
- `DESIGN_VARIANCE`: 0.55 — distinctive but professional; not generic SaaS gray, not experimental
- `MOTION_INTENSITY`: 0.15 — almost static; subtle skeleton loaders, no distracting animations
- `VISUAL_DENSITY`: 0.65 — data-rich; briefing cards, patent tables, stats — earn every whitespace

**Mood:** Legal-tech premium. Think Stripe + FT.com. Dark navy authority, amber accent for key actions.

## Section 2: Color Palette

All colors via `globals.css` tokens — never hardcoded hex in components.

```css
/* Light mode */
--background: oklch(0.98 0.005 240);         /* near-white, slight blue tint */
--foreground: oklch(0.12 0.02 240);          /* near-black navy */
--primary: oklch(0.25 0.08 240);             /* deep navy — primary actions */
--primary-foreground: oklch(0.98 0 0);       /* white on navy */
--accent: oklch(0.65 0.15 75);              /* amber — CTAs, badges, highlights */
--accent-foreground: oklch(0.12 0.02 240);   /* navy on amber */
--muted: oklch(0.95 0.005 240);             /* very light blue-gray */
--muted-foreground: oklch(0.50 0.02 240);    /* medium navy-gray */
--card: oklch(1 0 0);                        /* pure white */
--card-foreground: oklch(0.12 0.02 240);
--border: oklch(0.88 0.01 240);             /* subtle blue-tinted border */
--ring: oklch(0.65 0.15 75);               /* amber focus ring */

/* Dark mode */
--background: oklch(0.12 0.02 240);          /* deep navy */
--foreground: oklch(0.95 0.005 240);         /* near-white */
--primary: oklch(0.75 0.10 240);             /* light blue on dark */
--accent: oklch(0.70 0.15 75);              /* amber stays warm */
--card: oklch(0.16 0.025 240);              /* slightly lighter navy */
--border: oklch(0.25 0.03 240);             /* subtle dark border */
```

**Patent status colors (semantic):**
- `--status-free: oklch(0.55 0.15 145)` — green: patent entered public domain
- `--status-sale: oklch(0.65 0.15 75)` — amber: patent for sale/license
- `--status-watch: oklch(0.55 0.12 240)` — blue: monitoring

## Section 3: Typography

**Fonts:** Geist Sans (already installed) for all body text. No additional fonts needed — Geist is already distinctive and technical.

- Display/Hero: `font-sans font-semibold tracking-tight`
- Body: `font-sans font-normal`
- Data/Numbers: `font-mono` (Geist Mono, already installed) for patent numbers, dates, amounts
- All German text: real Umlauts (ä/ö/ü), Swiss standard (ss not ß)

**Scale (8px grid):**
- Headings: text-2xl (24px), text-xl (20px), text-lg (18px)
- Body: text-base (16px), text-sm (14px)
- Caption: text-xs (12px) for patent metadata

## Section 4: Component Stylings

**Buttons:**
- Primary: `bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2`
- Accent CTA: `bg-accent text-accent-foreground hover:bg-accent/90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2`
- All buttons: min-height 40px, padding py-2 px-4 (8px grid)

**Focus states:** 2px ring, 2px offset, ring color = `--ring` (amber). Every interactive element.

**Patent Status Badges:**
- `status-free`: green background, "Frei" label
- `status-sale`: amber background, "Zu erwerben" label
- `status-strategy`: blue background, "Strategie-Impuls" label

**Cards:**
- `rounded-lg border bg-card shadow-sm`
- Patent cards: left color bar (3px) in status color
- Hover: `hover:shadow-md transition-shadow duration-150`

**Sidebar:** Uses existing shadcn sidebar. Navy sidebar in dark mode, white in light.

**Data Tables:** Minimal — no excessive borders. Alternating `bg-muted/30` rows.

## Section 5: Layout Principles

**Grid:** 8px base unit. All spacing = multiples of 8 (or 4 for tight contexts).
- Page padding: px-6 (24px) desktop, px-4 (16px) mobile
- Section gap: gap-6 (24px) between major sections
- Card padding: p-6 (24px)
- Icon gap: gap-2 (8px) minimum
- Footer: py-8 (32px) minimum

**Breakpoints:** Mobile-first, md (768px) and lg (1024px) breakpoints.

**Sidebar width:** `calc(var(--spacing) * 72)` (from starter template — keep)

**Content max-width:** max-w-5xl for dashboard content, max-w-2xl for forms.

## Section 6: Icons

**Library:** Lucide React (already in shadcn/ui dependency tree). One library only.

**Patent-specific icons:**
- Patent free: `FileCheck` or `CheckCircle`
- Patent for sale: `Tag` or `ShoppingBag`
- Strategy: `Lightbulb` or `Compass`
- Watchlist: `Eye` or `Bell`
- Briefing: `Mail` or `FileText`
- Industry: `Building2` (Maschinenbau), `FlaskConical` (Chemie), `Stethoscope` (MedTech)

## Section 7: Do's and Don'ts

**Do:**
- Use the color token system exclusively
- Keep patent number/CPC codes in `font-mono`
- Status badges left-aligned in patent cards
- German dates in format: "16. Juni 2026"
- Amber for the ONE most important CTA per page

**Don't:**
- No decorative animations (MOTION_INTENSITY is low)
- No gradients except subtle `bg-gradient-to-b from-background to-muted/20` on hero
- No emoji in the app UI (this is a B2B tool)
- No rounded-full on non-circular elements
- Never mix icon sizes in the same row/list
