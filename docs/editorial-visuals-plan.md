# Editorial Visuals Plan

## Summary

The 178 `/checks/[id]` editorial pages are AdLint's primary AEO/SEO surface
and the asset agencies cite when handing reports to clients. Today every
page carries one or two synthesized mockups (`whyMockup` and `fixMockup`),
both rendered as `gtm-tag-list` tables. The visuals are useful but
monotonous: a reader walking three or four explainer pages sees the same
table shape every time, which dulls the perceived authority of pages that
are otherwise written like real practitioner notes.

This plan covers what to add, in what order, and why each addition is
worth the engineering cost.

## Goals

- Increase visual variety so consecutive explainer pages don't feel like
  the same template repeated 178 times.
- Strengthen citation-grade authority by including evidence that can be
  reproduced (a screenshot of the actual Google Ads UI, a diagram of the
  real signal flow) instead of only synthesized table mockups.
- Reduce eye-skip on the "Why It Matters" section, currently a multi-
  paragraph wall of prose with no visual anchor.
- Preserve the privacy-first wedge: every image must be from the
  publisher's own properties or be a diagram, never a screenshot of a
  real client's account.

## Non-Goals

- This is not a redesign of the editorial template itself. Layout work
  belongs in `editorial-template-lift-plan.md`.
- This is not a permission to commission custom illustrations for every
  check. Cost is too high and the value scales poorly across 178 pages.
- This is not a switch from `gtm-tag-list` to a heavier visual system on
  every page. The table mockups are still the right answer for ~half the
  checks; they just shouldn't be the *only* answer.

## Current state

Each explainer carries three optional visual slots, all defined in
`lib/checks/explainers.ts`:

- `whyMockup` — usually a `gtm-tag-list` showing the broken-state
  configuration that produced the finding.
- `fixMockup` — usually a `gtm-tag-list` showing the same configuration
  after the fix.
- `example` — a small code block or settings stanza embedded inline in
  the "Example" section.

The renderer lives in the `/checks/[id]` page component and only
understands the `gtm-tag-list` shape today. Every other visual idea
requires extending the renderer's discriminated-union switch.

## Visual surfaces to add, in priority order

### Tier 1 — high leverage, cheap to implement

**1. Signal-flow diagrams** _(target: 6–10 checks)_

For checks where the failure is a sequencing or routing problem (the
GCLID handshake, the Conversion Linker setup-tag race, the Enhanced
Conversions hash-and-send chain), the most useful visual is a small
left-to-right flow showing the chain.

Implementation: add a new mockup kind `signal-flow` to the discriminated
union. Each step is `{ label: string; ok: boolean; note?: string }`. The
renderer draws nodes connected by arrows; failed nodes get a red border
and a one-line note. Pure CSS + flexbox, no SVG library.

Estimated effort: 2–3 hours for the component, 30 min per check to
hand-script the steps. Apply first to: `missing-conversion-linker`,
`conversion-linker-sequencing`, `enhanced-conversions-missing-data`,
`enhanced-conversions-user-data`, `conversion-callbacks`.

**2. Severity-bucket cards on the `/checks` browse page**

Already present in the codebase as the "Most Cited Critical Findings"
card row. Extending to show one example finding per source (GTM, Ads,
Meta, TikTok, etc.) at the `/sources/[key]` level would give those pages
a visual hook above the long table.

Estimated effort: 1 hour. The data is already in `explainers.ts`.

### Tier 2 — moderate effort, real visual variety

**3. Annotated screenshots of platform UIs** _(target: 12–20 checks)_

For checks tied to a specific platform UI step (Google Ads Conversion
settings, Meta Events Manager, TikTok pixel diagnostic panel), an
annotated screenshot of the actual platform UI with a red box around
the broken setting is more credible than a synthesized mockup.

The privacy constraint matters: every screenshot must be from
- The publisher's own demo / test account (set up specifically to
  reproduce findings), OR
- Public documentation pages that already show the UI screenshot, OR
- A staged blank account where the failing configuration is reproduced
  deliberately.

Never a client account. Never a screenshot that includes a real customer
identifier, real conversion value, or real account ID.

Implementation: add an `annotated-screenshot` mockup kind with
`{ src: string; width: number; height: number; annotations: Array<{ x, y,
w, h, label }> }`. The renderer overlays SVG rectangles and labels on
top of an `<Image>` component. Store the images in `public/check-visuals/`
keyed by check ID.

Estimated effort: 4 hours for the component + annotation overlay. ~15–30
min per check to capture and annotate. Realistic ship target: 20 checks
in a single focused session.

**4. Before / after numeric panels** _(target: ~30 checks)_

For checks where the failure is a value problem (zero-value-purchases,
mismatched-values, currency-consistency, ghost-conversions), a simple
two-panel "Before: 412 orders, $0 revenue / After: 412 orders, $54,328
revenue" comparison communicates the impact faster than a mockup table.

Implementation: add a `before-after-numbers` kind with two
`{ label, value, sublabel? }` panels and an optional arrow caption.
Pure CSS.

Estimated effort: 1.5 hours. Apply first to all `*-missing-value` checks
across Meta, TikTok, LinkedIn, Pinterest, Twitter/X, Snapchat (six entries
share this pattern).

### Tier 3 — high effort, narrow use

**5. Network-request inspection panels** _(target: ~5 checks)_

For technical checks where the diagnosis happens in DevTools (Twitter/X
`conversion_id` deduplication, Meta CAPI parameter coverage), a styled
mock of a DevTools Network tab showing the failing request payload would
mirror the real diagnostic workflow.

Estimated effort: 4–6 hours for the component (it needs to look enough
like a DevTools panel to read as authoritative). Apply only to the
~5 checks where the diagnosis genuinely lives in the network tab. Lower
priority — diminishing returns past 5 pages.

**6. Custom illustrations**

Not recommended at the 178-check scale. The cost per asset rules it out
unless one specific check becomes a top-10 traffic source and justifies
a one-off investment.

## Recommendation

Phase A (next session, ~6 hours):
- Tier 1.1 (signal-flow diagrams) for the 5 named checks
- Tier 1.2 (severity-bucket cards on `/sources/[key]`)
- Tier 2.4 (before/after numeric panels) for the 6 `*-missing-value`
  checks across platforms

That covers ~13 checks with three new visual treatments, which is enough
variety to break the table-only monotony on the highest-traffic pages
without requiring screenshot capture.

Phase B (later session, ~6 hours):
- Tier 2.3 (annotated screenshots) starting with the 5 most-cited
  Google Ads checks where the UI screenshot is the obvious credibility
  anchor.

Phase C (deferred):
- Tier 3.5 (network-request panels) if one of those technical checks
  starts producing real GSC traffic and justifies the investment.
- Tier 3.6 (illustrations) only if a single check breaks out as a
  marquee asset.

## Constraints

- Every visual must respect `DESIGN.md`. Spacing, color, border-radius,
  font scale come from the design tokens, not from new ad-hoc values.
- No external image dependencies. All assets live in `public/`. No CDN,
  no third-party image hosts.
- No client account screenshots, ever. Demo / staged accounts only.
- Visuals must work at 375x812 mobile. The `gtm-tag-list` renderer
  already does; new kinds need to match.
- File size budget: each visual element under 30 KB unless there's a
  defensible reason. Cumulative `/checks/[id]` page weight stays under
  what it is today.

## Open questions

- Does the team have demo / staged accounts on the major platforms
  (Google Ads, Meta, TikTok, LinkedIn, Pinterest, Twitter/X, Snapchat)
  that can be used for screenshot capture? If not, screenshot-tier
  visuals (Tier 2.3) need to wait until those accounts exist.
- Should signal-flow diagrams ever be interactive (hover a step to see
  the parameter values that flow through it)? Probably not for v1.
  Static is faster, simpler, and renders predictably in OpenGraph
  previews and PDFs. Revisit if engagement metrics suggest readers
  want to explore.
- Is there a place for AI-generated diagrams? Maybe for one-off
  illustrative concepts, but not for the standardized visual kinds
  above. Keep the rendered visuals deterministic from data in
  `explainers.ts` so the content stays cite-able and reproducible.

## Related

- `docs/editorial-template-lift-plan.md` — companion plan for the
  layout structure these visuals live inside.
- `UX_AUDIT.md` — finding **CD-01** (`/checks/[id]` conversion CTA
  prominence) and **S-01** (`/sources/[key]` CTA) are the closest
  related UX-debt items; visual additions should make the bottom CTA
  feel earned rather than tacked on.
