# Product — AdLint

The product is the diagnostic. Every decision answers: does this help an agency hand a client a finding they can defend?

## North Star

**"It just told me what was actually broken."**

A good audit is a list of defensible, citable findings. Each one names what's wrong, points to a platform spec or policy, and is something the agency can show a client without hedging.

## Who It's For

**Primary: agencies and freelancers auditing client work.**
They review ads they didn't make. They need a deliverable that looks credible, holds up to client scrutiny, and doesn't leak the client's creative into a third-party LLM. They run multiple audits a week across different accounts.

**Secondary: in-house marketers and growth leads at $1M–$50M companies.**
They own paid budget, suspect tracking is broken, and don't have engineers on tap. They use AdLint as a second-opinion check before launch or when something looks off.

If a decision serves agency but hurts in-house, agency wins.

## The Wedge

**The private alternative to pasting client work into ChatGPT.**

Agencies are already auditing ads with general AI tools. The blocker isn't capability — it's that pasting a client's unreleased creative into a general LLM is a data-handling problem. AdLint is the version they can use without that conversation.

Privacy posture is part of the product, not a marketing checkbox. Client-side processing where possible. No training on uploads. Explicit, auditable data flows.

## What Makes a Finding Good

1. **Specific.** Names the exact element, line, or setting. Not "improve clarity."
2. **Cited.** Links to platform policy, spec, or documented best practice. The source is the trust.
3. **Severity-ranked.** Critical / warning / info, with criteria the user can verify.
4. **Defensible to a third party.** The agency hands the report to their client; the client believes it because the citation does the work, not the brand of the tool.

The `/checks/<id>` editorial pages are the flagship of this principle. Each one reads like a short article: what the check is, why it matters, the source. They double as SEO landing pages because they're substantively well-written.

## What AdLint Is Not

- **Not a copywriter or generator.** Won't rewrite headlines or produce creative. The agency owns voice; AdLint audits what they wrote.
- **Not a campaign manager.** No write access to ad accounts. No pausing campaigns. Read-only by design — fewer permissions, smaller blast radius, less privacy surface.
- **Not a performance predictor.** Won't forecast CTR, ROAS, or conversion. Findings are about correctness, policy, and clarity. Predictions are not defensible; citations are.

## Surfaces

- **Audit page** — the brand surface. The report the agency delivers.
- **`/checks/<id>` library** — editorial reference. The citation infrastructure.
- **Editorial home** — sells the diagnostic, not the price.

## Success Criteria

We're succeeding when:
- An agency runs an audit, exports the report, and sends it to a client without rewriting it.
- A finding cited in a report survives a client pushback because the source link does the defending.
- The audit results page is screenshotted and shared as proof of work.

We're failing when:
- Findings feel like generic copywriting advice (no citation, no specificity).
- The report needs reformatting before an agency would share it.
- Users ask "can it generate the fix for me?" — that means we drifted into the wrong product.

## Related Docs

- `DESIGN.md` — design system. Visual decisions follow from this product definition.
- `progress.md` — version history with rationale.
- `RELEASING.md` — release process.
- `CLAUDE.md` — instructions for AI collaborators.
