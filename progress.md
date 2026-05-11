# AdLint — Progress Log

## v1.19 — Visual Redesign: DESIGN.md Implementation
**Commit:** `TBD`

Implements the design system defined in DESIGN.md end-to-end. The site
goes from default-Tailwind-starter aesthetic to industrial-editorial:
typography-driven, single-accent, no emoji icons, warm paper-white
surfaces. The audit page becomes the brand surface with the score ring
as the largest pixel.

### Changed
- Typography: Space Grotesk retired. Now General Sans (display) + Instrument Sans (body) + Geist Mono (numbers/data). Loaded via Fontshare CDN.
- Iconography: all emoji icons replaced with lucide-react line icons (Tag, DollarSign, LineChart, Search, Facebook, Music2, Linkedin).
- Color: single --accent (#1E3A8A) across all tools. Per-tool color stripes dropped. Warm paper-white background (#FAFAF7) replaces blue gradient. Severity colors harmonized.
- Homepage hero: now sells the diagnostic ("Find what's actually broken in your tracking") instead of price ("100% Free"). Two co-primary CTAs: "Try with sample data" and "Audit your own files."
- Tool workspace: single-color Upload buttons across all tools (was amber on some). Sample-data CTA promoted to co-primary.
- Audit results page: health score is the largest pixel on the page (200px+). Count-up animation on first render. Three CTAs at top (View, Share, Compare-if-history-exists). Per-finding cards redesigned.
- History: score-trend sparkline above entries when 3+ exist.
- Compare: score delta is the headline.
- /checks: editorial typography pass.

### New deps
- lucide-react

### Why
The site's previous look was the default-Tailwind-starter aesthetic — emoji icons, per-tool decorative color stripes, hero selling on price. None of that matches "the page is the diagnostic; the score is the brand." DESIGN.md captures the system; this commit implements it.

---

## v1.17 — Audit-to-Audit Diff View
**Commit:** `a884144`

The repeat-usage hook. Health score gave users a single number; this lets them compare two audits and see what changed. "You went from 67 to 81 since last week" is now an actual screen, not a vague promise.

### New
- `lib/auditDiff.ts` — pure diff helper. Classifies each check as fixed / regressed / severity-up / severity-down / added / removed. Sorts regressions first.
- `app/compare/page.tsx` + `app/compare/CompareClient.tsx` — side-by-side audit comparison via /compare?a=<id>&b=<id>. Score badges on each side with a big delta arrow, totals row, grouped change list.
- `__tests__/lib/auditDiff.test.ts` — covers identical audits, single regression, single fix, severity escalation, score delta math.

### Changed
- `app/history/page.tsx` — Compare-mode toggle. Select 2 entries, "Compare these two" button appears, links to /compare.

### Why
Without diff, users have no reason to come back. Saving an audit was just storage. Now it's a comparison baseline — and the metric to brag about in the share button.

---

## v1.16 — Tracking Health Score
**Commit:** `c44f1aa`

Replaces the "8 critical / 12 warning / 17 info" wall with a single 0-100 anchor — the screenshot-worthy number users can compare and share.

### New
- `lib/healthScore.ts` — pure scoring module. Weighted ratio: critical=10, warning=4, info=1. Passing all checks = 100. Bands: emerald 90+, blue 75-89, amber 50-74, red <50.
- `components/HealthScoreBadge.tsx` — circular SVG progress ring (large variant for audit hero) plus a chip variant (small, for history cards).
- `components/ShareAuditButton.tsx` — Web Share API with clipboard fallback. Copies "AdLint Tracking Health Score: 81/100 — Good — audit yours at https://adlint.dev".

### Changed
- `app/audit/page.tsx` — large badge in the hero, share button next to PDF export
- `app/history/page.tsx` — small badge on each history card
- `lib/auditHistory.ts` — entries now persist score + band so history rendering is fast

### Why
Builds the natural viral loop: users see their score, want to brag (or fix) it, share the link, friend lands on adlint.dev, friend audits theirs. Also gives repeat users a single metric to track over time alongside the diff view (coming).

---

## v1.15 — Per-Check Documentation Framework + 25 Explainers
**Commit:** `f909743`

Audit findings used to be opaque to new users ("Greedy Impression Index — WARNING" with one sentence of context). This ships a documentation framework where every check has a dedicated page explaining why it matters and how to fix it. PR #1 covers 25 of the most-searched / highest-impact checks; long-tail explainers will follow.

### New
- `lib/checks/explainers.ts` — single source of truth. Type, 25 entries, lookup helpers.
- `app/checks/page.tsx` — index page grouped by source with severity chips.
- `app/checks/[id]/page.tsx` — per-check page with Why / How to Fix / Example / Related sections + JSON-LD TechArticle structured data.
- `components/CheckLearnMoreLink.tsx` — inline "Learn more →" link, only renders for checks that have an explainer.

### Changed
- `app/sitemap.ts` — includes every /checks/<id> URL
- `app/audit/page.tsx` — wires the Learn-more link next to each finding
- `app/page.tsx` — header now links to /checks

### Explainers in this PR (25)
GTM, Ads, Report, Cross, Meta, TikTok — see file for the full list. Each has why, how-to-fix, sometimes example and related-checks cross-links.

### Why
Two reasons. UX: users finally know what each finding means and what to do. SEO: each page is an indexable landing page for queries like "what is the greedy impression index" — long tail traffic that today goes to competitors.

---

## v1.14 — "Try with Sample Data" Demo Mode
**Commit:** `51097bf`

Highest-impact conversion change in the roadmap: removes the upload friction wall for first-time visitors by letting them experience an audit in 5 seconds with pre-canned data.

### New
- `public/samples/` — 5 sample files (GTM, Ads, Performance, Meta, TikTok). Meta and TikTok samples crafted to trigger specific checks (duplicates, zero-volume, custom-event-overlap, disabled conversion) so first-time users see the linter's value immediately.
- `lib/tools.ts` — `ToolSample` type and a `samples` field on each enabled tool's config.
- `components/ToolWorkspace.tsx` — "Try with sample data" link below the upload zones. Fetches → parses → writes sessionStorage → transitions to context step.

### Why
- Users had to export and upload their own GTM JSON / Ads CSV / Meta export to see any audit at all. The drop-off from landing → "first audit visible" was the biggest growth blocker.

---

## v1.13 — Round Two of Component Tests
**Commit:** `4fd933a`

Extended component coverage to the pieces v1.12 missed: ToolWorkspace (upload + context flow) and the /history page. `UploadCard` was requested, but `components/UploadCard.tsx` is not present in this repo/HEAD, so it was noted as skipped rather than testing a nonexistent component.

### New test files
- `__tests__/components/ToolWorkspace.test.tsx`
- `__tests__/app/history.test.tsx`
- `__tests__/components/UploadCard.test.tsx` skipped because `components/UploadCard.tsx` is absent

### Total tests
- Was 482. Now 508.

---

## v1.12 — Component & Hook Test Coverage
**Commit:** `f2788b9`

Added the first component-level tests. Tests previously covered only parsers and checks; the React surface was untested.

### New test files
- `__tests__/hooks/useAuditCounter.test.ts`
- `__tests__/lib/auditHistory.test.ts`
- `__tests__/components/AuditContextPicker.test.tsx`
- `__tests__/components/AuditHistoryLink.test.tsx`
- `__tests__/components/FileDropZone.test.tsx`
- `__tests__/components/PDFExportButton.test.tsx`

### Total tests
- Was 445. Now 482.

---

## v1.11 — Audit History (localStorage)
**Commit:** `a0d3cb8`

Every completed audit now saves to localStorage so refresh doesn't lose results and you can compare runs over time. Stays 100% client-side; no backend, no data leaves the browser.

### New
- `lib/auditHistory.ts` — pure helper for get/save/delete entries (max 20, newest first)
- `app/history/page.tsx` — list view with severity chips, relative timestamps, delete + clear actions
- `components/AuditHistoryLink.tsx` — header link with count badge (hides when empty)

### Changed
- `app/audit/page.tsx` — saves the audit + source data on mount; restores from `?restore=<id>` query param
- `app/page.tsx` — homepage header surfaces the AuditHistoryLink

---

## v1.10 — Audit Context Picker
**Commit:** `74cae1c`

The audit engine has had context-aware severity for ~15 checks since v1.2 (agency businesses don't get dinged for missing conversion events, no-values strategies don't get critical purchase-value flags, non-ecommerce businesses skip the e-commerce funnel check entirely). But there was no UI to set the context — every audit ran with `undefined`, falling back to defaults. This shipped the missing UX.

### New component (`components/AuditContextPicker.tsx`)
- 5 optional dropdowns: business model, value strategy, conversion counting, sales cycle, consent needs
- "Skip — use defaults" escape hatch
- Pre-fills from `localStorage['adlint:auditContext']` for returning users

### Flow change (`components/ToolWorkspace.tsx`)
- After files upload, show the context picker as an inline step (replacing the upload UI)
- Both single-file tools (which used to auto-navigate) and multi-file tools (Run Full Audit) now go through the context step
- Submit persists to sessionStorage for the current audit + localStorage for future audits

### Audit wiring (`app/audit/page.tsx`)
- Reads `auditContext` from sessionStorage and passes it to `runAudit` as the third argument
- Removes the `undefined` that was wasting 15 conditional-severity branches

### Deleted
- `backend/` — Python scaffold that was never integrated; product stays 100% client-side

---

## v1.9 — Homepage Copy + JSON-LD Structured Data
**Commit:** `beeb152`

Brought the homepage copy in line with the six-auditor product (footer and hero subtitle were stale from the GTM-only era) and added JSON-LD WebApplication schema for rich search results.

### Copy fixes (`app/page.tsx`)
- Hero subtitle now names all four platforms (GTM, Google Ads, Meta, TikTok) plus performance reports
- Footer text updated to match

### Structured data (`app/page.tsx`)
- Added JSON-LD WebApplication schema with featureList of all six tools
- Declares free offer, browser requirements, application category

### Dependencies
- handlebars: 4.7.8 → 4.7.9
- flatted: 3.3.3 → 3.4.2
- jspdf: 4.1.0 → 4.2.1

---

## v1.8 — SEO Polish, 404 / Error Boundaries, Dependency Bumps
**Commit:** `777a022`

Three small ship-quality items: link previews now work everywhere, broken routes render branded pages, and Next.js + dompurify got patch/minor bumps.

### Metadata (app/layout.tsx)
- Added metadataBase, title template, OG, Twitter card, robots, keywords
- Description now reflects all six auditors (GTM, Ads, Performance, Meta, TikTok)

### Pages
- `app/not-found.tsx` — branded 404 with Back to Tools CTA
- `app/error.tsx` — error boundary with reset() and digest reference

### SEO
- `app/robots.ts` — explicit robots.txt allowing crawl of /
- `app/sitemap.ts` — sitemap listing root and all enabled tool slugs
- `app/tools/[slug]/page.tsx` — `generateMetadata` for per-tool titles, descriptions, and OG tags

### Dependencies
- next: 16.1.6 → 16.2.5
- dompurify: 3.3.1 → 3.4.2

---

## v1.7 — TikTok Pixel Auditor
**Commit:** `0a13dd2`

Added a TikTok Pixel Auditor that mirrors the Meta Pixel Auditor pattern with TikTok-specific standard events and funnel semantics.

### Parser (`lib/parsers/tiktokPixelParser.ts`)
- Parses CSV and JSON exports from TikTok Events Manager
- Handles column aliases for flexible input formats, including pixel code extraction
- Detects TikTok standard vs custom events automatically
- Supports EU/US number formats and skips export summary rows

### Checks (`lib/checks/tiktokChecks.ts`)
- 10 checks total:
  - `tiktok-base-events-active` — critical
  - `tiktok-missing-conversion-events` — critical, or warning for agency/other business models
  - `tiktok-duplicate-events` — warning
  - `tiktok-similar-event-names` — info
  - `tiktok-zero-volume-events` — warning
  - `tiktok-custom-event-standard-alternative` — info
  - `tiktok-completepayment-missing-value` — critical, or info when value strategy is no-values; info/pass when no CompletePayment events are configured
  - `tiktok-ecommerce-funnel` — warning when more than two funnel events are missing, otherwise info
  - `tiktok-event-concentration` — info
  - `tiktok-disabled-conversions` — warning when disabled conversion events are found, otherwise info

### Tool registration
- Enabled `tiktok-auditor` in `lib/tools.ts`
- Added TikTok CSV/JSON parser routing in `app/tools/[slug]/page.tsx`
- Added TikTok result handling and tab routing in `app/audit/page.tsx`

### Tests
- Added comprehensive check coverage in `__tests__/checks/tiktokChecks.test.ts`
- Added parser coverage in `__tests__/parsers/tiktokPixelParser.test.ts`

---

## v1.6 — Audit Results CTA
**Commit:** `a41c651`

Added call-to-action component to the audit results page.

---

## v1.5 — Meta Pixel Auditor
**Commit:** `8f958c9`

New tool that audits Meta Pixel event exports from Meta Events Manager.

### Parser (`lib/parsers/metaPixelParser.ts`)
- Parses CSV and JSON exports from Meta Events Manager
- Handles column aliases for flexible input formats
- Detects standard vs custom events automatically
- Supports EU/US number formats

### Checks (`lib/checks/metaChecks.ts`)
- 10 checks total:
  - Missing PageView Event — critical
  - Missing Conversion Events — critical, or warning for agency/other business models
  - Duplicate Event Names — warning
  - Similar Event Names — info
  - Zero Volume Events — warning
  - Custom Events May Have Standard Alternatives — info
  - Purchase Event Value Tracking — critical, or info when value strategy is no-values; info/pass when no Purchase events are configured
  - E-commerce Funnel Events — warning when more than two funnel events are missing, otherwise info
  - Event Volume Concentration — info
  - Disabled Conversion Events — warning when disabled conversion events are found, otherwise info

### Tool registration
- Added `meta-auditor` slug to `lib/tools.ts` with Meta category
- Split Google category into GTM and Google Ads in category filters
- Removed 'Free' badge from tool cards

---

## v1.4 — Multi-Tool System + Tabbed Dashboard
**Commit:** `b89a9f2`

Major architecture overhaul: split the single audit tool into specialized tools with tiered checks, added tabbed dashboard navigation, PDF export with email capture, and comprehensive test coverage.

### Multi-Tool System (`lib/tools.ts`, `app/tools/[slug]/page.tsx`)
- Created tool configuration system with 6 tools (4 enabled, 2 placeholders):
  - **GTM Container Auditor** (30 checks) — GTM-only analysis
  - **Google Ads Linter** (27 checks) — Ads settings-only analysis
  - **Performance Report Analyzer** (11 checks) — Report-only analysis
  - **Full-Stack Audit** (82 checks) — Cross-source analysis with all files
  - Meta Pixel Auditor (coming soon)
  - TikTok Pixel Auditor (coming soon)
- Added dynamic tool pages with `[slug]` routing
- Refactored home page to tool selection grid with category filters (Google, Meta, TikTok)
- Added reusable `FileDropZone` component extracted from audit page

### New Check Modules (50+ new checks)
- **`lib/checks/structureChecks.ts`** — Naming conventions, deprecated models, window alignment, category hygiene
- **`lib/checks/signalQualityChecks.ts`** — Micro-pollution, primary gaps, signal freshness, value instability
- **`lib/checks/performanceChecks.ts`** — ROAS outliers, statistical anomalies, coefficient of variation
- **`lib/checks/edgeCaseChecks.ts`** — Purchase disabled, zero-value primaries, orphaned secondaries
- **`lib/checks/settingsReportCrossChecks.ts`** — Ghost conversions, volume mismatches, attribution drift

### Dashboard Redesign (`app/audit/page.tsx`)
- Restructured with **tabbed navigation**: Overview, Checks, Export
- Made sidebar filters (source, severity) **global** across all tabs
- Added responsive summary cards with severity breakdown
- Ported from dark theme to light theme matching landing page

### PDF Export + Lead Generation
- Added `PDFExportButton` component with jspdf integration
- Implemented usage-based gating: 2 free exports, then email required
- Added `useAuditCounter` hook for localStorage-based usage tracking
- Added `/api/subscribe` route for email capture (initially file-based; later switched to MailerLite integration via `MAILERLITE_API_KEY` env)

### Test Coverage
- Added comprehensive test suites for new check modules:
  - `structureChecks.test.ts` (244 lines)
  - `signalQualityChecks.test.ts` (186 lines)
  - `performanceChecks.test.ts` (186 lines)
  - `edgeCaseChecks.test.ts` (204 lines)
  - `settingsReportCrossChecks.test.ts` (228 lines)
- Added `adsReportChecks.test.ts` (718 lines) and `adsReportParser.test.ts` (124 lines)
- Added test fixtures: `report-clean.json`, `report-dirty.json`

### UI/UX
- Changed site-wide font from Geist to **Space Grotesk**
- Updated color scheme to light theme with consistent branding

### Dependencies
- Added `jspdf ^3.0.1`

---

## v1.3 — Audit Results Redesign + Python Backend Scaffold
**Commit:** `bfbd5ef`

Redesigned the audit results page with interactive charts and filtering, added a Python backend scaffold, and included test fixture files.

### Frontend — Audit Results Page (`app/audit/page.tsx`)
- Added **recharts** pie and bar charts for visual severity/source breakdowns
- Added **source filter** tabs (GTM, Ads, Cross, Report) and **severity filter** chips
- Added slide-in detail panel for individual check results
- Improved styling: updated severity color palette, added source badge config
- Extracted useMemo/useCallback for filtering and summary computation

### Frontend — CSS (`app/globals.css`)
- Added `slideIn` keyframe animation and `.animate-slideIn` utility
- Added `.line-clamp-1` utility class
- Added Tailwind `@custom-variant dark` directive
- Removed `prefers-color-scheme: dark` media query

### Dependencies
- Added `recharts ^3.7.0`

### Python Backend (`backend/`)
- Scaffolded Python package with `pyproject.toml`
- Added `adlint/gtm_factory.py` module
- Added initial test suite (`tests/test_gtm_factory.py`)

### Misc
- Added `test files/` directory with GTM JSON fixture and reference screenshots
- Updated `.gitignore` for Python artifacts (`.venv`, `__pycache__`, `.pytest_cache`)

---

## v1.2 — Google Ads Performance Report Linter
**Commit:** `1ed7dc7`

Added a new data source (Google Ads API Performance Reports) with 11 checks that analyze runtime metrics unavailable in the existing Conversion Settings CSV.

### New files
- **`lib/utils/stringDistance.ts`** — Extracted shared `levenshtein()` and `areSimilar()` utilities (previously inlined in `adsChecks.ts`)
- **`lib/parsers/adsReportParser.ts`** — Parser with CSV/JSON auto-detect, column alias mapping (Google Ads UI headers + API field names), currency/comma/percent stripping
- **`lib/checks/adsReportChecks.ts`** — 11 check functions split into two arrays:
  - `allReportChecks` (9 pure report checks)
  - `allReportCrossChecks` (2 cross-reference checks that accept Ads settings data)

### Checks added
| ID | Name | Severity | Logic |
|---|---|---|---|
| `vtc-click-ratio` | Greedy Impression Index | WARNING | VTC / click conversions > 3.0 |
| `funnel-volume-inversion` | Leak Detector | INFO | Lower-funnel volume > upper-funnel |
| `roas-sanity` | ROAS Sanity | WARNING | ROAS > 50 or < 0.1 (with volume > 10) |
| `volume-weighted-duplicates` | Active Duplicates | CRITICAL | Fuzzy-match names + both have volume (cross-check) |
| `model-attribution-drift` | Attribution Drift | INFO | Model vs standard differ > 50% |
| `conversion-concentration` | Concentration Risk | WARNING | One action > 90% of total volume |
| `ghost-conversions` | Ghost Conversions | CRITICAL | Enabled in settings, 0 volume in report (cross-check) |
| `micro-conversion-pollution` | Signal Pollution | WARNING | Micro volume > 100x macro volume |
| `all-vs-primary-gap` | Primary Gap | INFO | all_conversions > 2x conversions |
| `value-instability` | Value Instability | WARNING | Value/conv varies > 10x within same category |
| `whale-conversion` | Whale Check | INFO | > 50% value from < 10% volume |

### Modified files
- **`lib/types.ts`** — Added `AdsReportConversion`, `AdsReportData` interfaces; added `report: AuditCheck[]` to `AuditResults`
- **`lib/checks/adsChecks.ts`** — Replaced local Levenshtein functions with import from `stringDistance`
- **`lib/auditEngine.ts`** — Added 4th `reportData` param; runs report checks and includes them in summary aggregation
- **`app/page.tsx`** — Added 3rd upload card (Performance Report, accepts .csv/.json); grid changed to 3-col; updated status messages and how-to instructions
- **`app/audit/page.tsx`** — Reads `reportData` from sessionStorage; passes to `runAudit()`; includes `results.report` in displayed checks; updated audit type label

---

## v1.1 — Product README
**Commit:** `24feb4f`

Replaced the default Next.js boilerplate README with AdLint product documentation.

---

## v1.0 — Initial Release
**Commit:** `985f99e`

Shipped AdLint with a 70-check GTM + Google Ads audit engine.

- GTM container JSON parsing and checks
- Google Ads conversion settings CSV parsing and checks
- Cross-checks (GTM + Ads combined)
- Advanced check suites for GTM, Ads, and cross-file analysis
- Contextual audit support (business model, value strategy, sales cycle, consent)
- Client-side only — all processing in-browser, no data leaves the user's machine
## v1.18 — LinkedIn Insight Tag Auditor
**Commit:** `7088373`

Seventh tool. B2B / SaaS / agency overlap with the existing audience is the highest among the remaining platforms.

### Parser (`lib/parsers/linkedinInsightParser.ts`)
- CSV and JSON exports from LinkedIn Campaign Manager
- Column aliases for the LinkedIn-specific shapes (Conversion Category, Click Window, Account ID, Campaign Attachments, etc.)
- EU/US number formats; summary row skipping

### Checks (`lib/checks/linkedinChecks.ts`) — 10 total
- linkedin-no-active-conversions (critical)
- linkedin-missing-key-conversions (critical / warning for agency)
- linkedin-duplicate-conversions (warning)
- linkedin-similar-conversion-names (info)
- linkedin-zero-volume-conversions (warning)
- linkedin-other-category-overuse (warning >2 Others)
- linkedin-purchase-missing-value (critical / info no-values)
- linkedin-conversion-window-too-short (warning <7 days; respects salesCycle)
- linkedin-unattached-conversions (warning when active but no campaigns)
- linkedin-disabled-key-conversions (warning for disabled Lead/Purchase/SignUp)

### Tool registration
- Enabled `linkedin-auditor` in `lib/tools.ts` (10 checks)
- New `linkedin` parser case, new ExportInstructions, audit page tab routing, PDFExportButton source
- New sample at `public/samples/linkedin-conversions-sample.json`
- 3 explainers added (overuse / unattached / window-too-short)

### Tests
- `__tests__/checks/linkedinChecks.test.ts` + `__tests__/parsers/linkedinInsightParser.test.ts`

---
