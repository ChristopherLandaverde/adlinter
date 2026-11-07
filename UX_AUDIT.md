# AdLint — UX Audit

A friction-first inventory of every user-facing surface in AdLint. Goal: see the
whole picture before fixing pieces, so we patch patterns (not symptoms) and don't
miss systemic issues.

**Started:** 2026-05-19
**Branch:** `main`
**Method:** headless browser (gstack `/browse`) drives each surface, screenshots
captured to `screenshots/`. Each finding cites the screenshot it came from.

## Severity rubric

- 🔴 **Blocker** — abandons the flow (e.g., demo path forces unrelated form fill)
- 🟡 **Friction** — slows or confuses (e.g., unclear CTA hierarchy, hidden affordance)
- 🔵 **Polish** — cosmetic, consistency, or copy

---

## Executive summary

**Scope: 18 surfaces audited** — 10 tool pages, `/audit` (deep-dive), `/checks`, sample
`/checks/[id]`, `/history`, `/compare`, 2 of 10 `/sources/[key]` (gtm + meta),
`/about`, plus a mobile responsive sweep across 5 key surfaces.

**Findings: 19 total. 4 resolved this session. 15 open.**
- **0 Critical (open)** — both Critical findings shipped: G-01 (sample-data picker friction) + G-03 (Recharts container instability)
- **4 Friction** — A-01, CD-01, FS-01, S-01 — all under ~30 min each
- **11 Polish** — copy, visual consistency, edge cases
- **0 Strategic decisions** — A-03 resolved by removal in v1.26.2 (deferred until AdLint has real traffic)

**Session highlights:**
- 🔴 **G-01 + G-02 fixed in v1.26.0** — sample-data path now bypasses the 5-question survey across all 10 tools (one shared-component fix, 10 surfaces). "Skip — use defaults" promoted to a real secondary button.
- 🔴 **G-03 fixed in v1.26.1** — diagnosed and fixed a Recharts `ResponsiveContainer` minimum-dimension mismatch on `/audit`. This wasn't just a cosmetic warning — it was destabilizing rendering under interaction, likely causing perceived first-paint jank on real devices. Headless interactions (View details drawer, search filter, scroll, screenshots) all now work in a single session, where before they failed mid-flow.

**What's already strong (verified live):**
- Every single-file tool follows an identical clean template — brand icon, check
  count promise, big drop zone, primary CTA, sample button, export instructions,
  privacy footer
- Brand icons render correctly across all tools at brand colors (Meta blue,
  TikTok cyan/magenta, X glyph, Pinterest red, Snapchat yellow, etc.)
- Homepage `?q=` search routes correctly to filtered `/checks` results
- Editorial content on `/checks/[id]` is substantive — the AEO bet's core asset is solid
- Multi-source audit (Full-Stack) tabs work correctly — Google Tag Manager, Google Ads, Cross-Check
- View Details drawer slides in cleanly with full finding breakdown
- Search/filter/sort on findings table all functional
- Privacy assertion in every footer
- `/history` and `/compare` have correctly-designed empty states (these are the pattern `/audit` should follow per A-01)
- `/about` page does its job as the Person @id anchor with prominent "Run a free audit" CTA
- All major surfaces (homepage, tools, audit, /checks) render correctly at 375×812 mobile

---

## Per-tool audits

### 1. GTM Container Auditor (`/tools/gtm-auditor`) — audited 2026-05-19

**Screenshots:**
- `screenshots/gtm-01-initial.png` — landing/upload state
- `screenshots/gtm-02-context-picker.png` — post-"Try with sample data" intermediate
- `screenshots/gtm-03-audit-result.png`, `gtm-04-findings-scrolled.png` — partial captures (browser instability mid-transition)

**What works:**
- Clean tool header with GTM icon, title, and "30 checks will be performed" promise sets clear expectation
- Generous dashed drop zone with prominent primary CTA ("Select GTM Container JSON")
- "How to export your file" 5-step block below — useful onboarding for first-time GTM users
- Footer privacy assertion ("100% private. All processing happens in your browser.") reinforces the wedge

**Findings:**

#### 🔴 G-01: Sample-data path is gated by a 5-question survey
Clicking **"Try with sample data →"** does not run the audit. It opens an
**"Refine your audit"** form with 5 dropdowns (business model, value tracking,
conversion counting, sales cycle, consent). A first-time visitor wanting to
*see what the product does* hits a form instead.

The primary CTA on this intermediate screen is **"Continue to results"** (filled
blue button). The bypass — **"Skip — use defaults"** — is a text link to the
right of the primary button: smaller, lower contrast, easy to miss.

**Why this is a blocker:** Sample data has no user-specific context. The picker's
answers tune severity rules to the *user's* situation, which is irrelevant when
the data is synthetic. The picker is the right idea for *real uploads*; for the
demo path it's pure friction. A visitor evaluating AdLint in 30 seconds will
either abandon or click through irritated.

**Recommended fix:** Branch the flow. When `loadedSampleData === true`, bypass
the context picker and run the audit with defaults. The picker only appears for
real file uploads where business context legitimately affects severity.

**Estimated effort:** ~30 min. One conditional in the audit-flow component
(probably `app/tools/[slug]/page.tsx` or the wrapping ToolWorkspace).

#### 🟡 G-02: "Skip — use defaults" affordance is visually subordinate to "Continue"
Even for real uploads where the picker is defensible, the skip path is harder
to see than the primary form-submit. For users who don't have answers to
"business model" or "sales cycle" yet, "Skip" should be at least visually equal.
Consider: same button style, secondary variant (border, no fill).

**Estimated effort:** ~10 min. Style change on the Skip button.

#### 🔵 G-03: Browser instability on the picker → result transition
Headless browser dropped state when transitioning from the context picker to
the audit result. Could be a Recharts initialization issue (see `BACKLOG.md`
known defect about `width(-1) height(-1)` warnings) or a heavy render. Worth
timing on a real user device. May explain anecdotal "slow" feedback.

**Estimated effort:** unknown — needs investigation first.

---

### 2. Google Ads Linter (`/tools/google-ads-linter`) — audited 2026-05-19
- Screenshot: `screenshots/google-ads-linter-01-initial.png`
- Same template as GTM: brand-color Google "G" icon, 27-check counter, single drop zone, sample-data button, export instructions
- **G-01 (context-picker friction) applies — shared component, same fix**

### 3. Google Ads Performance Report (`/tools/performance-analyzer`) — audited 2026-05-19
- Screenshot: `screenshots/performance-analyzer-01-initial.png`
- Same template. Monochrome chart icon (no brand). 11 checks
- **G-01 applies**

### 4. Google Full-Stack Audit (`/tools/full-audit`) — audited 2026-05-19
- Screenshots: `screenshots/full-audit-01-initial.png`, `full-audit-02-post-click.png`
- **Different layout from single-file tools.** Three numbered upload slots (GTM JSON required, Google Ads CSV required, Performance Report optional). "Run Full Audit" button disabled until required files uploaded with helper text "Upload required files to continue"
- **G-01 still applies** — sample-data path lands on the same `AuditContextPicker`
- 🟡 **FS-01: No export instructions on this page.** Single-file tools show a "How to export your file" block. Full-Stack has 3 sources but lists none. A user unsure how to export GTM/Ads has nowhere to look from here. Fix: link to the individual tools' pages for export steps, or fold the per-source instructions into a collapsed accordion

### 5. Meta Pixel Auditor (`/tools/meta-auditor`) — audited 2026-05-19
- Screenshots: `screenshots/meta-auditor-01-initial.png`, `meta-auditor-02-post-click.png`
- Same template. Meta-blue infinity-loop icon rendering correctly. 10 checks. Accepts .csv or .json
- **G-01 applies — verified directly: clicking "Try with sample data" on Meta opens the identical "Refine your audit" form**

### 6. TikTok Pixel Auditor (`/tools/tiktok-auditor`) — audited 2026-05-19
- Screenshot: `screenshots/tiktok-auditor-01-initial.png`
- Same template. TikTok cyan/magenta note icon rendering correctly. 10 checks
- **G-01 applies**
- 🔵 **TT-01: Voice inconsistency.** Tool title says "TikTok **Pixel** Auditor" but the export instructions reference "TikTok **Events** Manager". Both are real TikTok product names. Minor, but tighten to one or call out both

### 7. LinkedIn Insight Tag Auditor (`/tools/linkedin-auditor`) — audited 2026-05-19
- Screenshot: `screenshots/linkedin-auditor-01-initial.png`
- Same template. LinkedIn brand-blue "in" mark rendering correctly
- **G-01 applies**

### 8. Pinterest Tag Auditor (`/tools/pinterest-auditor`) — audited 2026-05-19
- Screenshot: `screenshots/pinterest-auditor-01-initial.png`
- Same template. Pinterest white-P-on-red-circle icon rendering correctly. 10 checks
- **G-01 applies**

### 9. Twitter/X Pixel Auditor (`/tools/twitter-auditor`) — audited 2026-05-19
- Screenshot: `screenshots/twitter-auditor-01-initial.png`
- Same template. Black X glyph rendering correctly. 10 checks
- **G-01 applies**

### 10. Snapchat Pixel Auditor (`/tools/snapchat-auditor`) — audited 2026-05-19
- Screenshot: `screenshots/snapchat-auditor-01-initial.png`
- Same template. Snapchat yellow-ghost icon
- **G-01 applies**

---

## Other surfaces

### `/audit` (audit results page, 1855 lines) — audited 2026-05-19, deep-dive completed via v1.26.1 fix work
- Screenshots: `screenshots/audit-01-initial.png` (empty), `audit-walkthrough/01-audit-top.png` (GTM), `06-fullstack-audit.png` (Full-Stack with multi-source tabs), `g03-fix-02-view-details.png` (drawer), `g03-fix-03-search-consent.png` (filtered table)

**What works (verified live):**
- Score donut renders correctly (93/100 GTM, 73/100 Full-Stack); animation removed in v1.26.1 for stable first paint
- "Most critical findings" cards (3) with severity badges, source labels, descriptions, Learn more + View details actions
- Severity counters (Critical / Warning / Info / Passed) with color-coded chips
- Issue Distribution donut with color-coded legend (after G-03 fix, no longer destabilizes interactions)
- Multi-source tabs on Full-Stack — GTM [3 issues], Google Ads [17 issues], Cross-Check [11 issues] — verified working
- View Details drawer (slides in from right) — full breakdown: Description, Recommendation, affected items table. Verified working
- Search input filters findings table live — verified "consent" query → table narrowed to 1 matching warning
- Severity filter pills (Critical / Warning / Info) and sortable columns (Severity / Issue / Source / Items)
- Passed Checks (N) expandable section
- Download PDF button (top right), Share results button, New Audit button
- Bottom CTA: "Book a free 30-min measurement review" — first explicit conversion-to-paid-service surface on the site

**Findings:**

#### 🟡 A-01: Direct visit to `/audit` (without a prior audit run) renders a homepage-style empty state
A user pasting this URL or hitting a stale bookmark sees the marketing surface, not "no audit yet — start one." It looks intentional (custom empty-state with only "Check reference" in the corner, no Audit history link), but the affordance to *start an audit* is missing. **Fix:** add a clear "Start an audit" primary action, or redirect to `/` when there's no audit in localStorage. (~15 min)

#### 🔵 A-02: View Details drawer covers the score donut and key context
The right-side drawer is wide enough that on a 1280px viewport it overlaps the donut and severity counters. A user comparing the drawer detail to the overall context can't see both at once. Either narrow the drawer (max-width 480px?) or shrink the donut/counters when the drawer is open. (~30 min)

#### 🔵 A-03: "Book a free 30-min measurement review" CTA assumes a paid follow-up service
This is the strongest monetization surface on AdLint. It's positioned at the bottom of the audit, which is the right place psychologically (user has seen value). But there's no mention of this offering anywhere else — homepage, /about, /checks. A first-time visitor sees the CTA cold and may discount it. **Decision needed (not just a fix):** is this a real productized offer, or aspirational? If real, surface it on /about. If aspirational, soften the wording or remove until you can fulfill it. (Per PRODUCT.md, AdLint is the diagnostic; productized consulting may drift into "different product" territory)

#### 🔵 A-04: Findings table relies on column sort + filter + search combined
Three filtering mechanisms (severity pills, search, column sort) can interact in ways that aren't obvious. Example: filter to "Critical", search "consent", sort by Source — does the count display update correctly? Worth manual exploratory testing for edge-case states. (~15 min testing, may surface real bugs)

#### 🟢 A-05: Recharts container instability ✅ **FIXED in v1.26.1** (formerly G-03)

### `/checks` (check reference / explainer library) — audited 2026-05-19
- Screenshots: `screenshots/checks-01-initial.png`, `checks-02-scrolled.png`, `checks-03-query-ROAS.png`
- **What works:** centered title "Search 178 ad-tracking audit findings"; prominent search input with helpful placeholder ("try 'consent', 'gclid', or 'ROAS'"); severity filter pills (CRITICAL/WARNING/INFO); curated "Most cited / featured" checks below the search; "Browse by source" 10-tile grid at the bottom; URL `?q=` seeding works end-to-end from the homepage search ✓
- 🔵 **C-01: Title and placeholder both state "178 checks/findings."** Mild redundancy. Pick one location for the count
- 🔵 **C-02: The "Browse by source" tile grid at the bottom uses the same tile pattern we just removed from the homepage.** Consistent in the codebase but contradicts the new visual direction. Tiles are arguably correct here (inventory page, not a landing), but worth deciding intentionally rather than by inertia

### `/checks/[id]` editorial explainer (sample: `/checks/missing-conversion-linker`) — audited 2026-05-19
- Screenshot: `screenshots/check-detail-01.png`
- **What works:** clear h1 with severity chip; author byline + last-updated date; "Why It Matters" + "How To Fix It" + "Example" sections; in-line screenshots showing the actual GTM setting; code block; reference links; related checks; "Audit your own files for this check" CTA at the bottom. This is the AEO/SEO flagship — content is strong
- 🟡 **CD-01: The conversion CTA at the bottom is small.** "Audit your own files for this check" is the page's primary call-to-action — it converts an SEO visitor into a tool user. Currently it's a small button at the very bottom. Make it a full-width banner with a contrasting background, or repeat it after the "Why It Matters" section for users who don't read to the end
- 🔵 **CD-02: Author byline placement is high in the layout.** For an editorial page that's the right call (signals credibility); for an SEO landing where the headline + CTA matter most, the byline competing for top-of-page attention is a tradeoff worth revisiting

### `/` (homepage)
_Redesigned 2026-05-19 in this session — Perplexity-style search-first layout._
Not subject to this audit; the audit is for state *before* redesign so we can
prioritize where redesign effort goes next.

---

## Cross-cutting patterns

**P-1. Shared components are high-leverage.** The `AuditContextPicker` blocker
(G-01) appeared on 10 surfaces because the component renders identically every
time. One fix resolved 10 user-facing problems. Same pattern proved out for
G-03 (one Recharts fix on `/audit` stabilized rendering for everyone). Same
applies to the file drop zone (consistent on 9 tools), the export-instructions
block, and the back-to-tools header link. **When evaluating effort, weight by
surface count.** A 30-minute change to a shared component is worth more than a
2-hour change to a one-off page.

**P-2. Sample-data flow is consistent — and consistently fixed.** All 10 tools
expose a "Try with sample data →" button at the identical position with
identical styling. They all used to feed into the same gated picker. After
v1.26.0, they all now bypass the picker and go straight to `/audit`. **Pattern
consistency was the leverage point** — fixing the shared path fixed 10 user
experiences.

**P-3. Tile-grid pattern is being deprecated on landing surfaces but persists
on inventory pages.** The homepage redesign removed the 10-tile tool grid in
favor of a search-first layout. But `/checks` still uses a 10-tile "browse by
source" grid. Both choices are defensible (inventory pages legitimately list N
things), but **the policy isn't documented in DESIGN.md** yet, so it's drifting
by inertia. (C-02 covers this)

**P-4. Brand-icon work from this session is consistent.** Meta infinity loop,
TikTok cyan/magenta note, LinkedIn "in" mark, Pinterest P-on-red, X glyph,
Snapchat ghost, Google "G" — all rendering correctly with brand colors across
homepage dropdown, tool-page headers, and audit-page source tabs. When adding
new platforms (Reddit, Spotify Ads, etc.), follow the same inline-SVG +
brand-color pattern in `components/icons.tsx`.

**P-5. Multi-file tools have less onboarding than single-file tools.** Every
single-file tool shows a "How to export your file" block. The 3-file Full-Stack
tool shows nothing. (FS-01)

**P-6. Empty states: the pattern exists, just inconsistently applied.**
`/history` and `/compare` BOTH have well-designed empty states with primary
CTAs. `/audit` direct-visit does NOT — it falls through to a homepage-like
layout with no "start an audit" affordance. (A-01)

**P-7. Bottom-of-content CTAs are weak across all editorial surfaces.**
`/checks/[id]` (CD-01), `/sources/[key]` (S-01), and the audit result page
(A-03 is in this neighborhood) all rely on a small button at the bottom of
long content. The pattern is consistent — and consistently underweighted.
A single banner-CTA component, dropped into the same slot on all editorial
templates, would fix CD-01 + S-01 in one change.

**P-8. AEO content surfaces lack freshness signals.** `/sources/[key]` pages
have no "Last updated" timestamp. `/checks/[id]` does. LLM crawlers weight
recency signals — equalizing this across all editorial pages is cheap and
worth doing. (S-02)

**P-9. Audit history persistence behavior is unclear.** Sample audits don't
show up in `/history`. Either intentional (samples are demos, not real work)
or a bug (real uploads might not persist either). Worth verifying with a
real-file test. (H-01)

**P-10. Mobile responsiveness is solid.** The 5-surface mobile sweep found
only 2 minor truncation issues (M-01, M-02), both copy-only fixes. The G-03
Recharts container fix works at mobile too. This is a strong baseline.

---

## Prioritized fix backlog

Sorted by `severity × user_impact ÷ effort`. **Total to clear remaining open
Friction items: ~1h 45min. Polish and Strategic items deferred to taste.**

### ✅ Shipped this session

- **G-01** (Critical) — Sample-data path skips context picker. v1.26.0. 10 surfaces.
- **G-02** (Friction) — Skip button equalized with Continue. v1.26.0. Bundled with G-01.
- **G-03** (Critical) — Recharts container instability on `/audit`. v1.26.1. Root cause was 144×144 parent vs Recharts' 200×200 default minimum. Headless interactions now reliable.
- **A-03** (Strategic) — Paid-consultation CTA removed from `/audit`. v1.26.2. Defer until real traffic + first users + testimonials exist.

### 🟡 Friction — clear before launch (~1h 45min total)

1. **A-01: `/audit` empty state needs a "Start an audit" CTA** _(~15 min)_
   When `/audit` is visited without audit data in localStorage, show an explicit
   empty state with a primary action. Don't fall through to a homepage-style
   layout. **Pattern reference:** `/history` and `/compare` already do this
   correctly — copy their shape.

2. **CD-01 + S-01 (bundle): Banner-CTA component for editorial pages** _(~30 min for both)_
   Both `/checks/[id]` and `/sources/[key]` end long content with a small
   bottom-of-page button as the *primary* conversion action. Build one shared
   editorial-CTA component and drop it into both templates. **One component
   change → 50+ surfaces** (178 check explainers + 10 source pages).

3. **FS-01: Add export instructions to Full-Stack Audit** _(~30 min)_
   The 3-file tool has no in-page export guidance. Recommended: link to each
   individual tool page for its export steps (lowest effort, preserves single
   source of truth per platform).

4. **A-02: View Details drawer overlaps the score donut on desktop** _(~30 min)_
   The right-side drawer is wide enough that on 1280px viewport it overlaps
   the donut and severity counters. Narrow the drawer (max-width 480px) or
   shrink the donut/counters when the drawer is open.

### 🟦 Strategic decisions — resolved

5. **A-03: "Book a free 30-min measurement review" CTA** ✅ **RESOLVED in v1.26.2 — removed**
   Decision: remove until AdLint has real traffic and users. A paid-consultation
   pitch on a tool a visitor just discovered asks for trust before the product
   has earned it. Conversion at near-zero, and risks making AdLint feel salesy.
   Revisit after: real GSC impressions (BACKLOG #2), first 3 users (BACKLOG #9),
   and 1-2 testimonials to anchor the offer.

### 🔵 Polish — backlog (sequence by appetite)

6. **TT-01: TikTok voice — pick "Pixel" or "Events Manager"** _(~5 min)_

7. **C-01: Remove redundant "178" count from `/checks`** _(~2 min)_

8. **C-02: Codify tile-grid policy in `DESIGN.md`** _(decision)_
   Tiles for inventory pages, no tiles on landing pages. Document before drift.

9. **H-01: Verify sample audits ↔ /history behavior** _(~10 min verify + ~20 min caption if needed)_
   Either confirm intentional (samples are demos, not real work) and add a
   "Sample audit (not saved to history)" caption, or confirm bug and fix.

10. **M-01: `/audit` title truncates as "Audit Res..." on mobile** _(~10 min)_

11. **M-02: `/checks` search placeholder truncates mid-quote on mobile** _(~10 min)_

12. **CD-02: Test moving author byline below the headline on `/checks/[id]`** _(~10 min, A/B if possible)_

13. **S-02: Add "Last updated" timestamp to `/sources/[key]` template** _(~10 min, propagates to all 10)_

14. **AB-02: Replace initials avatar with photo on /about** _(~10 min, optional)_

15. **A-04: Manual exploratory testing of audit-finding filter combinations** _(~15 min)_
    Severity pills + search + sort combined — surface edge-case bugs before launch.

### ⏸️ Deferred until conditions met

- **AB-01: Add social proof on /about** — deferred until first users exist (per BACKLOG #9)
- **Per-tool synthetic test suite** — deferred per BACKLOG; revisit after launch
- **`/sources/[key]` full audit (8 of 10 unsampled)** — confirm patterns hold beyond gtm + meta
- **`/compare` populated-state audit** — requires 2 real audits in localStorage
---

## Surfaces beyond the tool pages

### `/history` (audit history list) — audited 2026-05-19
- Screenshot: `screenshots/remaining-surfaces/history-01.png`
- **What works:** Clean empty state — "No audits yet." heading + "Pick a tool to get started." description + "Browse tools" primary button. This is exactly the pattern `/audit` (A-01) should follow

**Findings:**

#### 🔵 H-01: Sample-data audits don't appear in history
After running the GTM sample audit (multiple times during G-01 + G-03 verification), `/history` still shows "No audits yet." Either:
- (a) **Intentional** — sample audits don't persist (defensible — they're demos, not real work)
- (b) **Bug** — real uploads also don't persist
**Verify:** upload a real file → check `/history` reflects it. If (a), consider making it explicit in the demo: "Sample audit (not saved to history)" caption on the audit page when the source was sample data. (~10 min to verify + ~20 min to add the caption if you choose to)

### `/compare` (audit diff view) — audited 2026-05-19
- Screenshot: `screenshots/remaining-surfaces/compare-01.png`
- **What works:** Empty state is well-designed — "Choose two audits to compare" heading + "Compare mode on the history page will build the comparison link for you." + "Choose audits" primary button (presumably routes to `/history`)
- 🟢 No friction findings on the empty state. Compare-with-data state not captured this session (requires 2 audits in localStorage)

### `/sources/[key]` AEO landing pages — sampled 2 of 10 on 2026-05-19
- Screenshots: `screenshots/remaining-surfaces/sources-gtm.png`, `sources-meta.png`
- **What works:** Strong editorial content; severity-bucketed sections (Critical / Warning / Info) with check counts; each check has explanation; "Run a free <source> audit" CTA at the bottom; "Back to Check Reference" breadcrumb at top. These are the primary AEO traffic surfaces, and the content is substantive enough to earn citations
- Template appears identical across all 10 sources (only content differs)

**Findings:**

#### 🟡 S-01: Bottom-of-page CTA is too small (matches CD-01 pattern on `/checks/[id]`)
"Run a free Meta Pixel audit" CTA at the bottom of a long editorial page. Same problem as CD-01: the *primary* conversion action on an SEO landing page is a small button at the very bottom. **Fix the same way as CD-01 (full-width banner + repeated mid-page)**. (~20 min, propagate to all 10 source pages since they share a template)

#### 🔵 S-02: No "Last updated" timestamp on source pages
Editorial AEO content gets stronger citations when crawlers/LLMs see a "Last updated" date (signals freshness). `/checks/[id]` pages have this — source pages don't. (~10 min to add to the shared template)

### Mobile responsive sweep (375×812, iPhone 13 mini) — audited 2026-05-19
Screenshots: `screenshots/mobile/{01-home, 02-tool-gtm, 03-tool-full-audit, 04-audit-result, 05-checks}.png`

**Headline:** the new homepage redesign and all major flows render correctly at mobile width. The G-03 Recharts fix works at mobile too (donut renders without warnings). Two minor truncation findings:

#### 🔵 M-01: `/audit` header title truncates as "Audit Res..." on narrow viewports
The audit page top has "AdLint | Audit Res..." with the title cut off. Either shorten the title to "Results" or "Audit", or display the header differently on mobile (just the AdLint wordmark + back action). (~10 min)

#### 🔵 M-02: `/checks` search placeholder truncates mid-quote
Placeholder reads `Search 178 checks — try "` — the example queries (`'consent', 'gclid', or 'ROAS'`) get cut off. Either shorten the desktop placeholder to "Search 178 checks…" and surface example queries as visible chips below the input (which the page already does via the "TRY" chip row), or use a separate shorter placeholder for mobile. (~10 min)

**Mobile validation (passes):**
- Homepage Perplexity-style layout renders cleanly with the 4 prompt chips stacking 2×2
- Single-file tool pages (e.g., GTM) — drop zone, sample button, export instructions all stack cleanly
- Multi-file Full-Stack tool — 3 numbered slots stack vertically, sample data button + disabled Run button render
- Audit results page — score donut, severity counters (2×2 grid), findings table, Issue Distribution donut, View details actions all work
- `/checks` — search input, TRY chips, featured checks, "Browse by source" 2-column tile grid all render

### `/about` (author page) — audited 2026-05-19
- Screenshot: `screenshots/remaining-surfaces/about-01.png`
- **What works:** Author identity (avatar + name + title) at top; clear bio explaining *why* AdLint was built (agencies leaking client data to ChatGPT); technical focus paragraph; "About AdLint" facts block; "Elsewhere" GitHub link; "Run a free audit" CTA — and **this CTA is prominent and well-positioned** (mid-page-ish, not buried). This is the AEO Person @id anchor and it does its job

**Findings:**

#### 🔵 AB-01: No social proof
The strongest credibility signal for an agency tool aimed at agencies is testimonial / case study / "used by N agencies". Currently absent. Once you have first users (per BACKLOG #9), surface 1-2 quotes here. (deferred until users exist)

#### 🔵 AB-02: Author photo is a stylized initials avatar (CL)
Agency clients evaluate trust partly through visual identity. A real photo (or branded illustration) is more humanizing than initials. Optional, low priority. (~10 min)

---

## Next steps

1. **Review this doc** — confirm priorities, flag anything missing
2. **Commit + ship v1.26.0 + v1.26.1** — G-01 (sample picker), G-02 (skip button), G-03 (Recharts) are all done with tests; ready to land
3. **A-03 strategic decision** — is "Book a free 30-min measurement review" a real productized offer? Decide before shipping more, since the answer changes how A-03 reads on the live audit page
4. **Sequence remaining Friction items** — A-01 (15 min), CD-01 + S-01 bundled (30 min), FS-01 (30 min), A-02 (30 min). Total ~1h 45min. Bundle into a v1.27.0 PR after the strategic decision lands
5. **Polish items**: TT-01, C-01, M-01, M-02 are sub-15-min each. Bundle into a "small UX polish" PR whenever convenient
6. **Verify intentional behavior on H-01** — does upload (vs. sample) actually persist to /history? (~10 min in your browser)
7. **Schedule a follow-up audit session** for the 8 unsampled `/sources/[key]` pages and the populated-state `/compare` view, once a real audit is in localStorage
