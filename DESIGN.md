# Patentbrief — Design System
# Source: Google Stitch "International Precision" — 2026-06-16

## Section 1: Visual Theme & Atmosphere

**Concept:** Modern Editorial. Balances the Swiss functional precision of SBB with the authoritative editorial depth of Handelsblatt. Built for IP professionals, legal experts, and analysts who need clarity, speed, and trust on Monday morning.

**Aesthetic:** High-contrast legibility. Expansive white space signals premium quality. Sharp structural lines. Serif headlines for narrative flow. Vibrant functional accents guiding through complex data. Emotional response: institutional trust and intellectual rigor.

**Dials:**
- `DESIGN_VARIANCE`: 0.40 — distinctive but disciplined; editorial precision, not experimental
- `MOTION_INTENSITY`: 0.10 — near-static; subtle skeleton loaders only, no distracting animations
- `VISUAL_DENSITY`: 0.65 — data-rich; briefing cards, patent tables, stats all earn their space

**Reference brands:** Handelsblatt (editorial authority) + Swiss precision aesthetics

---

## Section 2: Color Palette

All colors via `globals.css` CSS tokens — never hardcoded hex in components.

### Stitch Token Map

| Stitch Name | Hex | Usage |
|---|---|---|
| `accent` / amber | `oklch(0.61 0.155 72)` | Primary action buttons, brand accents (implemented as amber, not SBB Red) |
| `accent-hover` | `oklch(0.57 0.15 72)` | Hover state |
| `on-accent` | `#ffffff` | Text on accent backgrounds |
| `text-ink` / on-surface | `#1A1A1A` | Headlines, core text |
| `secondary` | `#5e5e5e` | Body text, secondary labels |
| `on-secondary` | `#ffffff` | Text on secondary backgrounds |
| `hb-orange` / tertiary-container | `#EF7C00` | Status highlights, "New" badges, insights |
| `surface-paper` | `#FFFFFF` | Card backgrounds |
| `surface` / background | `#f9f9f9` | Page background |
| `border-subtle` | `#DCDCDC` | All borders (1px lines) |
| `outline` | `#946e68` | Warm outline for UI elements |
| `error` | `#ba1a1a` | Destructive actions |

### CSS Token Implementation (`globals.css`)

```css
/* Light mode */
--background: oklch(0.98 0 0);              /* surface: #f9f9f9 */
--foreground: oklch(0.13 0 0);              /* text-ink: #1A1A1A */
--card: oklch(1 0 0);                       /* surface-paper: #FFFFFF */
--card-foreground: oklch(0.13 0 0);
--primary: oklch(0.13 0 0);                 /* ink black — structural elements */
--primary-foreground: oklch(1 0 0);
--secondary: oklch(0.40 0 0);              /* #5e5e5e secondary gray */
--secondary-foreground: oklch(1 0 0);
--muted: oklch(0.98 0 0);                   /* surface-container-low */
--muted-foreground: oklch(0.42 0 0);
--accent: oklch(0.61 0.155 72);             /* Brand amber — implemented accent */
--accent-foreground: oklch(0.98 0 0);
--border: oklch(0.87 0 0);                  /* border-subtle #DCDCDC */
--ring: oklch(0.61 0.155 72);               /* Amber focus ring */
--radius: 0;                                /* Sharp — 0px corners everywhere */

/* Dark mode */
--background: oklch(0.10 0.015 240);
--foreground: oklch(0.95 0.005 240);
--card: oklch(0.14 0.02 240);
--accent: oklch(0.65 0.155 72);             /* slightly lighter amber in dark */
--border: oklch(0.25 0.03 240);
```

**Patent status colors (semantic):**
- `--status-free: oklch(0.55 0.15 145)` — green: patent entered public domain
- `--status-sale: oklch(0.65 0.15 75)` — amber: patent for sale/license
- `--status-watch: oklch(0.55 0.12 240)` — blue: monitoring

**Never hardcode hex. Always use the token.**

---

## Section 3: Typography

Three-font strategy — each signals a different type of information:

| Font | Variable | Usage |
|---|---|---|
| Source Serif 4 | `font-serif` | Titles, article headlines, storytelling, wordmark |
| Inter / Geist Sans | `font-sans` | All functional UI, body text, data |
| IBM Plex Sans | `font-ibm-plex` | Metadata labels, patent numbers, CPC codes, status chips |

**Scale (4px grid — Stitch spec):**

| Name | Font | Size | Weight | Line Height | Letter Spacing |
|---|---|---|---|---|---|
| display-lg | Source Serif 4 | 48px | 700 | 56px | -0.02em |
| headline-lg | Source Serif 4 | 32px | 600 | 40px | — |
| headline-lg-mobile | Source Serif 4 | 24px | 600 | 32px | — |
| headline-md | Source Serif 4 | 24px | 600 | 32px | — |
| body-lg | Inter/Geist | 18px | 400 | 28px | — |
| body-md | Inter/Geist | 16px | 400 | 24px | — |
| label-caps | IBM Plex Sans | 12px | 600 | 16px | 0.05em |
| button-text | Inter/Geist | 14px | 600 | 20px | — |

**Rules:**
- All German text: real Umlauts (ä/ö/ü). Swiss convention: ss not ß
- Patent numbers, CPC codes, dates, amounts: always `font-ibm-plex` (or `font-mono` fallback)
- Nav wordmark: `font-serif text-2xl font-bold`

---

## Section 4: Component Stylings

### Buttons
- **Primary action (amber):** `bg-accent text-accent-foreground border-2 border-accent hover:opacity-90 active:scale-95` — no gradient, no shadow, no radius
- **Ghost/Login button:** `border-2 border-foreground text-foreground hover:bg-foreground hover:text-background uppercase tracking-wider font-semibold text-sm`
- **All buttons:** Sharp (0px radius). `button-text` scale (14px/600/20px). Full-width on mobile.
- **Pricing CTAs:** Full-width within their column, sharp corners.

**Focus states:** 2px ring, 2px offset, ring color = `--ring` (amber). Every interactive element — non-negotiable.

### Cards
- Sharp corners (`rounded-none` or `radius: 0`). `border border-border bg-card`.
- **No shadow by default** — depth via tonal layers and 1px borders, not box-shadow.
- Hover: border transitions to `border-foreground` (black). No shadow change.
- Pricing highlight: 4px `border-t-4 border-accent` top border on the recommended plan. Not a card color change.

### Inputs & Fields
- Sharp corners. `border border-border` full-perimeter for dashboard forms.
- Labels: `label-caps` style — IBM Plex Sans, 12px/600/16px, 0.05em tracking — always above the field.
- Focus: 2px ring in SBB Red.

### Patent Status Chips / Badges
- Sharp rectangles. `bg-muted text-foreground` as base.
- Use `--status-free` (green) or accent (`--accent`, red) only for action-status indicators.
- `hb-orange` (#EF7C00) for "Expiring Soon", "New", "Watch" highlights.

### Pricing Table
- 3-column sharp grid separated by 1px vertical `border-border` lines.
- Plan name: `headline-md` (Source Serif 4, 24px/600).
- Recommended plan: `border-t-4 border-accent` (4px amber top border). No background color change.
- No rounded-full badges. No shadows.

### Separators
- 1px solid `border-border` lines between content blocks — mimics newspaper column dividers.
- No wide gutters as separators. Lines only.

---

## Section 5: Layout Principles

**Grid:** 4px base unit. All spacing = multiples of 4.
- Container max-width: 1280px
- Desktop side margins: 64px (`px-16`)
- Mobile side margins: 16px (`px-4`)
- Gutter between columns: 24px

**Vertical rhythm:** Strict 4px baseline grid.

| Token | Value |
|---|---|
| stack-sm | 8px (gap-2) |
| stack-md | 16px (gap-4) |
| stack-lg | 32px (gap-8) |
| card padding | 24px (p-6) |
| section gap | 32px (gap-8) |
| icon gap minimum | 8px (gap-2) |
| footer padding | 28px (py-7) minimum |

**Editorial grid:** Centered 12-column, 1280px max-width, 64px side margins — creates intentional "framed" newspaper look.

**Dashboard grid:** Fluid. Sidebar + main content. Sidebar width: `calc(var(--spacing) * 72)`.

**Breakpoints:** Mobile-first. md (768px), lg (1024px).

---

## Section 6: Shapes & Elevation

**Shape:** Sharp — 0px radius everywhere. `--radius: 0`. Buttons, cards, inputs, modals, chips — all 90-degree corners. Signals architectural structure and administrative authority.

**Elevation:**
- Base: `surface-paper` (#FFFFFF) for cards. `surface` (#F9F9F9) for page background.
- Depth via tonal layers, NOT shadows. A card "floats" because its bg differs from page bg.
- Borders: 1px `border-subtle` (#DCDCDC) at rest. Transitions to `#000000` on hover — no shadow.
- No `box-shadow` except scroll-triggered header shadow (`shadow-sm` only).

---

## Section 7: Icons

**Library:** Lucide React — one library only, never mix.

**Patent-specific icons:**
- Patent free: `FileCheck` or `CheckCircle`
- Patent for sale: `Tag` or `ShoppingBag`
- Strategy: `Lightbulb` or `Compass`
- Watchlist: `Eye` or `Bell`
- Briefing: `Mail` or `FileText`
- Industry: `Building2` (Maschinenbau), `FlaskConical` (Chemie), `Stethoscope` (MedTech)

**Icon sizing:** `size-4` (16px) inline, `size-5` (20px) standalone, `size-9` or `size-10` for buttons. Never mix sizes in the same row.

---

## Section 8: Do's and Don'ts

**Do:**
- Use the color token system exclusively — never hardcode hex
- Keep patent numbers/CPC codes in `font-ibm-plex` or `font-mono`
- Use `label-caps` (IBM Plex Sans 12px/600/0.05em) for all metadata labels
- German dates: "16. Juni 2026" format
- Amber (`--accent`) for the ONE most important CTA per page
- HB Orange (#EF7C00) for secondary insights and status highlights
- 1px border lines to divide content — not wide gutters or shadows

**Don't:**
- No rounded corners — `rounded-none` or ensure `--radius: 0`
- No decorative animations (MOTION_INTENSITY: 0.10)
- No gradients — flat colors only
- No emoji in the app UI (B2B tool)
- No shadow-based depth — borders and tonal layers only
- No side-stripe / left color bars on cards
- No inline `style` with hex colors
