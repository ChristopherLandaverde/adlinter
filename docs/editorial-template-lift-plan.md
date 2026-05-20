# Editorial Template Lift Plan

## Summary

The `/checks/[id]` page is AdLint's editorial flagship. The content is
strong (practitioner voice, concrete cookie names, real signal flows),
and after v1.27.0 and v1.27.1 the prose itself reads as written by an
operator who has fixed the bug instead of an AI summarizing a doc.

The problem is the *layout*. Every page lays out as: title row → byline
row → "Why It Matters" wall of prose → "How To Fix It" numbered list →
"Example" code block → references list. By the third page in a session,
the reader's eye glides past the prose because every page looks identical.

This plan covers a single-component layout lift that changes the rhythm
of all 178 pages at once. It is not a rewrite. The content fields in
`lib/checks/explainers.ts` stay exactly as they are; only the page
component changes.

## Goals

- Replace the wall-of-prose rhythm with a layout that has visual rest
  stops (callouts, summary card, severity chip on a prominent spot).
- Surface the `directAnswer` field as the page's TL;DR, separately
  styled from the longer `why` paragraphs that follow it.
- Promote the per-check conversion CTA (currently a small button at the
  bottom of a long page) to a banner-CTA component that appears at the
  end and optionally repeats after `why`. Tracked in `UX_AUDIT.md`
  as **CD-01**.
- Keep the same content in the same fields. No editorial team
  intervention required for the layout to apply across all 178 pages.

## Non-Goals

- Not a content rewrite. The humanization pass in v1.27.0 / v1.27.1
  already did that work for the highest-traffic 40 explainers.
- Not a redesign of the global AdLint chrome (header, footer, nav). Those
  stay as-is.
- Not a visual-kind expansion. New mockup kinds (signal flows, annotated
  screenshots, before/after panels) belong in `editorial-visuals-plan.md`.
  This plan reuses the existing `gtm-tag-list` mockup until that ships.
- Not a routing or URL change. URLs stay at `/checks/[id]` so SEO is
  preserved and existing OpenGraph images keep working.

## Current state

The relevant files:

- `app/checks/[id]/page.tsx` — the page component. Reads the explainer
  from the registry, renders title + metadata + sections + references.
- `app/checks/[id]/opengraph-image.tsx` — generates per-check OG cards
  via `next/og`. Not touched by this plan.
- `lib/checks/explainers.ts` — content source. 178 entries, each with
  `summary`, `directAnswer`, `why`, `howToFix`, `example`,
  `citationTemplate`, `references`, `whyMockup`, `fixMockup`,
  `relatedChecks`, plus metadata.
- `DESIGN.md` — design tokens (font scale, spacing, color, radius).

## Target rhythm

A reader scrolling a check page should hit, in order:

1. **Source breadcrumb + severity chip** at the top, prominent enough
   that the severity is visible without reading the title.
2. **Page title** (the check name), large.
3. **Byline + lastUpdated** in a quiet row directly under the title.
   Smaller than the title, larger than body. Should not pull eye off
   the headline.
4. **TL;DR card** rendering the `directAnswer` field. Visually distinct
   from the body: lighter background, accent left-border, no surrounding
   prose. This is the reader's exit ramp if they only have 10 seconds.
5. **"Why It Matters" section.** Prose stays as-is from `explainers.ts`,
   but the section gets a clear `<h2>` and the paragraphs render with
   slightly more line-height than they have today.
6. **`whyMockup` rendered here** instead of after "How To Fix It." The
   broken-state visual belongs with the prose explaining the broken state.
7. **Mid-page banner CTA** ("Audit your own files for this check").
   Optional in v1, recommended in v1.1. The reader has now read the
   diagnosis; the moment to convert them is here, not at the very
   bottom.
8. **"How To Fix It" section** with the numbered list rendered as a
   real ordered list (each step on its own card, not run together).
9. **`fixMockup` rendered after the fix steps.**
10. **"Example" code block,** unchanged.
11. **References list,** unchanged.
12. **Related checks** ("If this matters, this also matters") as a
    horizontal row of compact cards (existing `relatedChecks` data),
    not a vertical list buried at the bottom.
13. **Bottom banner CTA** ("Run a full audit on your own files").
    Full-width on desktop, full-width on mobile.

## Component changes

### New components

- `<TldrCard>` — renders the `directAnswer` content as a left-border
  accent card. Single prop: `children` (the prose). One paragraph of
  styling.
- `<EditorialBannerCTA>` — full-width CTA at the bottom and optionally
  mid-page. Single prop: `variant: 'audit' | 'check'` (one for "run a
  full audit," one for "audit your files for this specific check"). The
  destination URL is the existing audit page; the copy varies.
- `<RelatedChecksRow>` — horizontal scroll-friendly row of small cards,
  one per `relatedChecks` entry. Reads the related explainers from the
  registry and renders compact cards (name + source chip + severity
  dot).
- `<HowToFixStep>` — wraps each numbered step in a small card with the
  step number as a visual element. Replaces the current run-together
  rendering of `howToFix` as a single block.

### Modified components

- `app/checks/[id]/page.tsx` — main layout rewrite. Pull each field
  into the slot pattern above. ~150–250 lines depending on how the
  existing render is structured.

### Untouched

- `lib/checks/explainers.ts` — zero changes. All 178 entries already
  carry every field the new layout needs.
- `app/checks/[id]/opengraph-image.tsx` — unchanged. The OG card design
  is independent of the page layout.
- `DESIGN.md` — unchanged. The lift uses existing tokens.

## Implementation phases

### Phase 1 — extract the layout pieces _(~3 hours)_
- Pull the current `/checks/[id]/page.tsx` apart into the section
  components that already exist conceptually (title block, why block,
  fix block, example block, references block, related-checks block).
- No visual change yet. The lift becomes possible because each section
  is a separate component instead of a single inline render.
- Verify type-check + tests + build still pass. Sample 3 pages with
  the live server (a critical, a warning, an info; a Google-source, a
  Meta, a Snapchat) to confirm nothing visual changed.

### Phase 2 — add the new visual pattern _(~3 hours)_
- Add `<TldrCard>` and place `directAnswer` inside it.
- Add `<HowToFixStep>` wrapping the numbered list.
- Add `<RelatedChecksRow>` replacing the vertical related-checks list.
- Move the `whyMockup` placement from the bottom of the page to
  immediately after the `why` prose.
- Move the `fixMockup` placement from below "Example" to immediately
  after the `howToFix` steps.
- Verify on the same 3 sample pages, plus mobile (375×812).

### Phase 3 — bottom CTA _(~1 hour)_
- Add `<EditorialBannerCTA variant="check">` at the bottom of the page,
  full-width, with copy "Audit your own files for this check" (current
  CTA wording, repackaged). Destination: `/tools/full-audit` (or the
  most specific tool that covers this check; can read from explainer
  metadata if needed).
- Resolves UX_AUDIT.md **CD-01** for `/checks/[id]`.

### Phase 4 — propagate to `/sources/[key]` _(~1 hour)_
- The 10 source landing pages use the same template patterns. Apply
  the same `<EditorialBannerCTA>` and (optionally) the `<TldrCard>` to
  the source-level description.
- Resolves UX_AUDIT.md **S-01** in the same change.

### Phase 5 — optional mid-page CTA _(deferred)_
- Insert a second `<EditorialBannerCTA>` between "Why It Matters" and
  "How To Fix It." Defer until GSC shows real session-length data on
  these pages — if average scroll depth is 60%+, mid-page is overkill.
  If most users bail at 30%, mid-page is required.

Total focused-work estimate: ~7 hours across Phase 1–4, deferring
Phase 5.

## Test plan

- TypeScript clean. No new type errors.
- Existing 574 tests still pass. This work doesn't touch test surfaces.
- Build clean. All 178 `/checks/[id]` pages must still pre-render.
  Build time per page should not regress more than 10%.
- Visual regression: sample at least 5 pages spread across severity
  and source. Confirm nothing collapses on mobile and nothing wraps
  awkwardly with the longest titles.
- Lighthouse: CLS on `/checks/[id]` should be the same or better. The
  TL;DR card is a fixed-height element that helps reduce shift.

## Risk

- The current renderer is small; the lift is mostly additive. Low
  structural risk.
- Highest risk is wrapping bugs at extreme content lengths (the longest
  `why` paragraph runs to ~1200 words). Pre-check the top-5-longest
  entries before final merge.
- OG image generation is independent; no risk of breaking it.
- Tests don't cover editorial copy or page-component layout, so a
  regression would need to be caught by visual inspection. Plan for a
  pre-merge browser session on at least the 6 featured checks + 4
  edge cases (longest title, longest why, no whyMockup, no relatedChecks).

## Open questions

- Should the byline + lastUpdated row be moved below the TL;DR card
  instead of directly under the title? Editorial argument: authorship
  is what a citation reader looks for, so it should be high. Conversion
  argument: bylines compete with the headline, so they should be lower.
  Default to "directly under title, smaller than today" for v1; revisit
  if engagement data suggests otherwise (this is UX_AUDIT.md **CD-02**).
- Should `<RelatedChecksRow>` clip to N items on mobile (3?) and scroll
  horizontally, or stack vertically? Probably horizontal scroll with a
  fade-out edge to suggest more content. Avoids a tall stack at the
  bottom of an already-long page.
- Should the TL;DR card be collapsible? Probably not in v1. Adds a
  click target for a reader who is already a click away from the
  full `why` prose underneath.

## Related

- `docs/editorial-visuals-plan.md` — companion plan for the visuals
  this template displays. Both plans can land in either order; they
  don't depend on each other strictly, but template-first means the
  new visual kinds land into a layout that has space for them.
- `UX_AUDIT.md` — open items **CD-01** (this plan resolves it),
  **S-01** (same), **CD-02** (left open, awaiting traffic data).
- `progress.md` — v1.27.0 and v1.27.1 humanization context.
- `PRODUCT.md` — `/checks/<id>` is named as "the flagship of this
  principle. Each one reads like a short article." This plan tries to
  make the layout match that ambition.
