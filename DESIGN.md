# Design System — AdLint

The product is the diagnostic. The page is the report.

Every visual decision serves one north star: **"It just told me what was actually broken."** Hierarchy is the brand. The single most-broken thing is the largest pixel. Plain English. No decoration that doesn't serve diagnosis.

## Product Context

- **What this is:** A client-side audit suite for ad-tech tracking. Seven auditors covering GTM, Google Ads, Performance Reports, Meta Pixel, TikTok Pixel, LinkedIn Insight Tag, and a Full-Stack mode.
- **Who it's for:** Agencies and freelancers auditing client work (primary); in-house marketers and growth leads at $1M–$50M companies (secondary). See `PRODUCT.md` for full positioning.
- **Memorable thing:** "It just told me what was actually broken."
- **Project type:** Hybrid — editorial single-page landing, app surfaces (upload, audit results, history, compare, /checks reference).

## The Six Principles

These predate the visual system and govern every screen.

1. **Time-to-first-value under 10 seconds.** The "Try with sample data" button is the highest-leverage feature. It should be co-primary on every entry surface, never buried.
2. **One number anchors everything.** The Tracking Health Score is the largest pixel on the audit page, always above the fold.
3. **Three actions per surface, never more.** One primary, one secondary, one passive. Stop showing every option at once.
4. **Education in the gaps.** Every finding can be clicked through to a /checks/<id> explainer. The reference is the editorial flagship.
5. **The diff is the retention play.** When history exists, "compare to last audit" is a primary CTA on the audit page.
6. **Audits are URLs, not state.** Long-term direction: every audit gets a stable shareable URL. (Not in current scope; flag for later.)

## Aesthetic Direction

- **Direction:** Industrial-editorial. Function-first like a clinical report, typography-driven like a well-set magazine. The page is a diagnostic document.
- **Decoration level:** Minimal-to-intentional. No purple gradients, no 3-column icon feature grids, no decorative blobs. One subtle texture: paper grain on hero surfaces only.
- **Mood:** Confident, expert-readable, calm under pressure. The product talks like a senior tracking engineer — no hype, no condescension.
- **References:** Linear (clarity, minimal chrome), Sentry's issue list (severity-driven hierarchy), Stripe (trust, generous spacing), a well-designed bank statement (numerical authority).
- **Anti-references:** ilovepdf (utility-tool generic), default Vercel/Tailwind starter, Bloomberg-dense, Notion-warm, any AI-slop SaaS.

## Typography

- **Display/Hero:** **General Sans** (Fontshare, free for commercial). Used for h1, h2, section titles, score numbers when oversized. Narrow, confident, anti-convergence.
- **Body:** **Instrument Sans** (Fontshare, free for commercial). Used for paragraphs, descriptions, prose. Humanist sans, readable at small sizes, pairs cleanly with General Sans.
- **UI/Labels:** Same as body (Instrument Sans). Buttons, form labels, secondary text.
- **Data/Numbers/Tabular:** **Geist Mono** (already in stack). Must use `font-feature-settings: 'tnum'` for tabular numerals. Score, counts, deltas, tracking IDs.
- **Code:** Geist Mono.
- **Loading:** Both Fontshare fonts via `<link>` in `app/layout.tsx`. Self-host via `next/font` if performance becomes an issue.
- **Replace:** **Space Grotesk gets retired.** It's the convergence trap — every AI design tool defaults to it as "the safe alternative to Inter." It's currently used site-wide. Replacement is a hard requirement.

### Scale (rem-based, base 16px)
| Token | Size | Use |
|---|---|---|
| `text-display` | 4rem (64px) | Hero score number, top-of-page anchors |
| `text-4xl` | 2.5rem (40px) | h1 page titles |
| `text-3xl` | 2rem (32px) | h2 section heads |
| `text-2xl` | 1.5rem (24px) | h3 finding titles |
| `text-xl` | 1.25rem (20px) | Subheads, large body |
| `text-base` | 1rem (16px) | Body |
| `text-sm` | 0.875rem (14px) | Secondary body, captions |
| `text-xs` | 0.75rem (12px) | Labels, chips, metadata |

## Color

**Light mode primary.** Warm paper-white surfaces. Single accent. Severity colors harmonized to neutrals.

| Token | Hex | Role |
|---|---|---|
| `--bg` | `#FAFAF7` | Page background — warm paper, not cool gray |
| `--surface` | `#FFFFFF` | Cards, panels, primary content surfaces |
| `--surface-2` | `#F5F4EE` | Subtle elevation, code blocks, table headers |
| `--ink` | `#1C1917` | Primary text — warm near-black (Tailwind stone-950) |
| `--muted` | `#57534E` | Secondary text, captions, metadata |
| `--border` | `#E7E5E0` | Hairline borders, dividers |
| `--accent` | `#1E3A8A` | Single product accent — CTAs, links, score ring at high values |
| `--accent-hover` | `#1E40AF` | Hover state on accent |
| **Severity** | | |
| `--critical` | `#B91C1C` | Ink-red, not alarm-red. Critical findings, regression chips |
| `--warning` | `#B45309` | Deep amber, not UI yellow. Warnings |
| `--info` | `#475569` | Calm slate. Info findings — "noted" not "alert" |
| `--pass` | `#166534` | Mature deep green. Passing checks, fixes |

**No per-tool brand colors.** Every tool uses the same single-accent system. Severity colors are reserved for findings, not tools.

**Dark mode:** Out of scope for this redesign. Architecture should not block it (use CSS variables, not Tailwind class-name colors directly), but no dark-mode tokens defined until a later phase.

## Iconography

- **Library:** `lucide-react`. Already an indirect dep via shadcn-style components; if not installed, add it.
- **No emoji icons anywhere in the UI.** The current state uses 🏷️ 💰 📈 🔍 📘 🎵 💼 as tool icons. These are removed entirely. Replace with line icons from lucide-react at consistent stroke width (1.5px) and size (24px standard).
- **No icon-in-colored-circle backgrounds.** Icons sit on the surface directly, in `--ink` or `--muted`.

## Layout

- **Approach:** Hybrid — strict grid for app surfaces (audit, history, compare), editorial latitude on home and /checks pages.
- **Grid:** 12-column with 24px gutters at md+, 16px at sm. Max page width 1280px (max-w-7xl).
- **Prose max width:** 72ch on text-heavy surfaces (/checks/<id>, explainers).
- **Border radius:**
  | Token | Value | Use |
  |---|---|---|
  | `rounded-sm` | 4px | Buttons, badges |
  | `rounded-md` | 6px | Cards, panels |
  | `rounded-lg` | 12px | Modals, large containers |
  | `rounded-full` | 9999px | Pills, score ring |
  - **No bubble-radius (e.g. 16px+) on small elements.** This is the SaaS-template signal.

## Spacing

- **Base unit:** 4px (Tailwind default).
- **Density:** Comfortable. Generous around the score ring and headline finding (these need air). Tight inside data tables (legibility from typography, not whitespace).
- **Scale:**
  | Token | px |
  |---|---|
  | `space-1` | 4 |
  | `space-2` | 8 |
  | `space-3` | 12 |
  | `space-4` | 16 |
  | `space-6` | 24 |
  | `space-8` | 32 |
  | `space-12` | 48 |
  | `space-16` | 64 |
  | `space-24` | 96 |

## Motion

- **Approach:** Minimal-functional + one signature.
- **Easing:**
  - Enter: `ease-out`
  - Exit: `ease-in`
  - Move/transition: `ease-in-out`
- **Duration:**
  - Hover micro: `150ms`
  - Panel slide / disclosure: `250ms`
  - Page transition: `400ms`
- **Signature moment:** **Score-ring count-up.** On first render of the audit page, the health-score number animates from 0 to its value over ~700ms. The arc draws around it in sync. This is the only animation that exists for its own sake — it brands the product moment of arrival. Everywhere else, motion serves comprehension only.
- **No scroll-driven parallax, no decorative entrance animations, no Framer Motion gratuitous staggering.** Comprehension > theater.

## Component Patterns

### Buttons
- **Primary:** `bg-accent text-white`, `rounded-sm`, height 40px (`h-10`), text `text-sm font-medium`. Single accent across the app — no per-page color shifts.
- **Secondary:** `bg-surface border border-border text-ink`, otherwise same. For "Skip" actions, secondary CTAs.
- **Ghost:** `text-muted hover:text-ink`, no background. For tertiary actions, links inside cards.
- **Destructive:** `bg-critical text-white`. For delete actions only.
- **No gradient buttons.** No oversized buttons. No bubble-radius.

### Cards
- `bg-surface border border-border rounded-md`. Padding `p-6` (24px) standard, `p-4` for dense layouts.
- **No drop shadows.** Hairline border only. Depth comes from background contrast (`bg-surface` on `bg-bg`).
- Hover state: border color shifts toward `--ink` at 10% opacity. Subtle.

### Severity chips
- Compact pill, `rounded-full`, `text-xs font-medium px-2 py-0.5`.
- Colors: chip background is severity color at 10% alpha, text is severity color at full.
- E.g. critical chip: `bg-red-100 text-red-800` (Tailwind shorthand for the harmonized severity palette).

### Tool entry points
- Replace the current colored-stripe + emoji + check-count card pattern.
- New pattern: simple card with line icon (lucide), tool name in General Sans, one-line description in Instrument Sans, "X checks" as small muted text. No per-card color stripe.
- The 7 tool entry points become equal-weight on home (no decorative differentiation).

### Score ring
- 160px diameter on the audit page (large), 48px on history cards (small chip).
- Stroke width 8px (large), 4px (small).
- Color: `--accent` at 90+, `--pass` at 75-89, `--warning` at 50-74, `--critical` at 0-49.
- Number is centered, `text-display` size on large variant, `text-base` on small.
- Count-up animation on first render only (large variant).

## Hero Copy Direction

The current site sells **price** ("100% Free, 100% Private" in oversized blue). The redesign sells the **diagnostic**.

- **Old hero (current):** "Professional Ad Tracking Audits — 100% Free, 100% Private"
- **New hero:** Something like "Find what's actually broken in your tracking." Subhead names the platforms briefly. Free + private becomes a quiet line near the CTA, not the headline.
- **Two co-primary CTAs:** "Try with sample data →" (immediate value) and "Audit your own files" (commitment). The current site's hidden sample-data link gets promoted to hero-level.

## Page-Level Direction

### Home (`/`)
- Replace tool grid as the dominant element. Lead with one editorial hero pitching the diagnostic.
- Tool entry points appear below the fold, equal-weight, no color differentiation.
- "Try with sample data" gets hero-level visibility.
- Footer text already updated in v1.9 — keep.

### Tool workspace (`/tools/[slug]`)
- Collapse upload + context picker into one screen. Multi-file tools (full-audit) get a single grouped upload area, not 3 separately-numbered zones.
- Single Upload button styling across all tools (no more amber-on-some-tools). All Upload buttons use `--accent`.
- "Try with sample data" remains prominent.

### Audit results (`/audit`) — the brand surface
- Health score badge is the **largest pixel on the page**, hero position.
- Three CTAs at the top: **View results** (primary), **Share / Export PDF** (secondary), **Compare to last audit** (passive, only shows when history exists).
- Tabs (Overview / Checks / Export) collapse into anchored sections or a simpler split.
- Per-finding cards redesigned for diagnostic authority: severity chip + title + plain-language description + "Fix this" callout + Learn-more.
- The 3 most critical findings are spatially larger and appear before the long tail.

### History (`/history`)
- Restyled as a scored timeline ("67 → 73 → 81 over last 30 days") above the entry list, when 3+ entries exist.
- Score badges feature prominently.

### Compare (`/compare`)
- Score delta is the headline. Big number with arrow. Score badges flank the delta.

### /checks reference
- Treat as editorial flagship — already feels right, just align typography and color.
- Each /checks/<id> reads like a magazine entry: title, severity, two-paragraph "Why," two-paragraph "How to fix," optional code/config example, related checks.

## Decisions Log

| Date | Decision | Rationale |
|---|---|---|
| 2026-05-11 | Created via `/design-consultation` after `/office-hours` design doc | Existing system is default-Tailwind-starter; needs deliberate identity. |
| 2026-05-11 | Retire Space Grotesk | Convergence trap; every AI tool defaults to it as the "safe alternative to Inter." |
| 2026-05-11 | Adopt General Sans + Instrument Sans + Geist Mono | Uncommon pair, free, signals taste. Anti-convergence. |
| 2026-05-11 | Warm paper-white surfaces (`#FAFAF7`) | Differentiates from every cool-gray SaaS dashboard. Reframes product as "professional document" not "tool." |
| 2026-05-11 | Single `--accent` (`#1E3A8A`) across all tools, no per-tool brand colors | The seven different tool accent colors had no semantic meaning — decorative slop. |
| 2026-05-11 | Replace all emoji icons with lucide-react line icons | Emoji-as-icon is the primary signal of "free utility tool." Single biggest visual offender. |
| 2026-05-11 | Score-ring count-up as the only signature motion | One moment of theater; everything else serves comprehension. |
| 2026-05-11 | Hero sells the diagnostic, not the price | Current "100% Free, 100% Private" headline is selling cheapness. Audit value comes first. |
