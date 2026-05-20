# Backchannel Feature Doc

## Summary

Backchannel is AdLint's editorial feed for tracking changes that matter to agencies: AdLint product changes, ad-platform releases, new audit coverage, and practical notes on measurement shifts.

It should not feel like a generic company blog. It should feel like an informed operator's channel: concise, specific, and useful for deciding what to audit, explain, or watch.

## Goals

- Give important AdLint changes a public home outside the homepage and README.
- Create a stable destination for future Google, Meta, TikTok, and other platform release commentary.
- Keep posts useful to agency operators by focusing on implications, not announcements.
- Prepare the content model for a later Railway-powered release monitor that can draft posts from official sources.

## Non-Goals

- This is not a full CMS.
- This is not an SEO content farm.
- This is not a changelog for every bug fix or dependency bump.
- This should not auto-publish AI-generated posts without review.

## Audience

Primary audience:

- Agency operators, tracking specialists, and freelancers using AdLint to audit client measurement.

Secondary audience:

- Search visitors looking for practical interpretation of platform measurement changes.
- LLM crawlers and answer engines looking for grounded AdLint product and domain context.

## Current Implementation

Routes:

- `/blog` renders the Backchannel feed.
- `/blog/[slug]` renders a single post.

Content source:

- Posts are file-backed in `lib/blog.ts`.
- Posts support `published` and `draft` status.
- Only published posts render publicly.

Current visible metadata:

- Type, e.g. `AdLint update`, `Google release`, `Meta release`, `Tracking guide`.
- Source, e.g. `AdLint`, `Google`, `Meta`.
- Published date.
- Reading time.
- Title and description.

Hidden/future metadata:

- `whyItMatters`.
- `affectedTools`.
- `sourceLinks`.

Those fields stay in the model because they will matter once release monitoring exists, even if they are not currently shown in the UI.

## Content Philosophy

Backchannel posts should answer:

1. What changed?
2. Why does it matter for tracking work?
3. What should someone check next?

The writing should be direct and specific. Avoid promotional launch language, vague excitement, and generic product-marketing phrasing.

Good post topics:

- A new AdLint auditor or check family.
- A platform release that affects conversion tracking, consent, diagnostics, attribution, or API exports.
- A meaningful workflow change, like audit history, diffing, export improvements, or agent-assisted analysis.
- A practical field note on a common measurement failure.

Bad post topics:

- Minor copy changes.
- Dependency upgrades.
- Internal refactors.
- Announcements that do not change what an agency should do.

## Article Template

Preferred section structure:

```text
What changed
Why agencies should care
What to check in AdLint
```

For external platform releases, use:

```text
What changed
Who is affected
What to check before reporting
Sources
```

## Design Direction

Backchannel should stay restrained and editorial:

- Single-column feed until there are enough posts to justify filters.
- No category rail until readers need it.
- No decorative hero imagery.
- No marketing-style feature blocks.
- Dense metadata is fine, but only when it helps scanning.
- Article pages should keep a narrow reading measure and simple section rhythm.

The name is intentionally not literal. "Backchannel" should feel like an insider feed, not a corporate updates page.

## Publishing Workflow

Current manual workflow:

1. Add a post object to `lib/blog.ts`.
2. Keep `status: 'draft'` while writing.
3. Preview locally at `/blog/<slug>`.
4. Change to `status: 'published'`.
5. Run `npm run type-check`.
6. Run `npx eslint app/blog lib/blog.ts app/sitemap.ts`.

Recommended review checklist:

- The post has a concrete audience.
- The title sounds like something a person would say.
- The description explains the value without hype.
- The sections answer what changed, why it matters, and what to check.
- External claims have source links.
- The post does not imply a feature exists before the product actually supports it.

## Future Release Monitor

The later Railway pipeline should feed this same content model.

Proposed flow:

1. Railway cron runs a release-monitor script.
2. The script checks official source lists for Google, Meta, TikTok, and other platforms.
3. New URLs are stored with content hashes and source metadata.
4. A relevance classifier decides whether the release matters to AdLint's domain.
5. Relevant items create draft post candidates.
6. A human reviews and publishes the final post.

The monitor should produce drafts, not public posts.

Potential files:

```text
lib/release-monitor/sources.ts
lib/release-monitor/fetch.ts
lib/release-monitor/classify.ts
lib/release-monitor/state.ts
scripts/check-releases.ts
scripts/draft-release-post.ts
```

Potential database tables once Railway/Postgres exists:

```text
release_sources
release_items
release_candidates
```

## Open Decisions

- Whether posts should stay in `lib/blog.ts` or move to `content/blog/*.mdx`.
- Whether Backchannel should eventually have source filters.
- Whether release candidates should be reviewed in a private app route or as generated files.
- Whether the public URL should remain `/blog` or eventually move to `/backchannel`.
