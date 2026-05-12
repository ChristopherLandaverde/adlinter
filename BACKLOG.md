# AdLint — Backlog and Resume Notes

Current state of work toward a "finished, shipped to first users" project. Pick up here.

---

## Tier 1 — blocks calling it shipped

- [x] **#1 Deploy verification.** Vercel auto-deploys on push to `main`. Confirmed live: commit `4b34890` deployed green on 2026-05-12. Edge-runtime constraint on `/checks/[id]/opengraph-image` was removed (fell back to Node serverless) to keep the 5000-line explainer module bundlable.
- [ ] **#2 GSC + sitemap submission.** Needs the user in a browser tab.
   - Add `adlint.dev` as a Domain property at https://search.google.com/search-console
   - Verify via DNS TXT record (add in Vercel DNS panel)
   - Submit `https://adlint.dev/sitemap.xml`
   - Request indexing for `/`, `/checks`, `/about`, `/checks/missing-conversion-linker`, `/sources/gtm`
   - (Optional, 2 min) Add the same domain to Bing Webmaster Tools — ChatGPT and Copilot pull from there
   - First useful Performance-tab signal in ~7 days; real volume in 30–60 days for a new domain
- [x] **#3 Per-check Open Graph images.** `app/checks/[id]/opengraph-image.tsx` generates a 1200×630 card per check (AdLint brand, source label, severity chip, check name, slug, tagline). Verified across critical / warning / info severities. Node runtime; caches forever once generated.
- [x] **#4 End-to-end smoke test on sample data.** GTM auditor + "Try with sample data": audit ran, score rendered 93/Excellent, 3 findings rendered with correct severity, "Learn more" links resolved to `/checks/<id>`. **Pass.**

## Tier 2 — polish before launching

- [x] **#5 Mobile QA pass.** Swept `/`, `/checks`, `/checks/[id]`, `/audit`, `/sources/[key]` at 375×812. No real defects. (Initial "−1 score on /audit" turned out to be a frame of the 700ms count-up animation; DOM correctly contains 93 with aria-label "93 out of 100, Excellent.")
- [x] **#6 Accessibility pass.** Two fixes shipped:
   - `/checks` empty-state captions promoted from `<p>` to `<h2>` to remove an h1 → h3 heading-outline jump
   - Active row in the keyboard-navigable results list now sets `aria-current="true"` so screen readers announce the option Enter will activate
- [ ] **#7 Lighthouse / performance.** One pass on the live site once GSC is in place. CLS on `/checks`, LCP on `/`, JS bundle size on the audit tools.

## Tier 3 — distribution (not "shipping", but "shipping for nothing" otherwise)

- [ ] **#8 Launch surface.** Without distribution, organic + AEO is the only acquisition channel and it has a 3-month lag. Pick one, do it, don't multitask:
   - Soft Show HN post
   - r/PPC or r/GoogleAds when GSC shows first impressions
   - LinkedIn / Twitter "I built this" thread aimed at agency people
   - Direct DM outreach to 5–10 agency contacts with a free-audit offer
- [ ] **#9 First 3 external users.** Even unpaid pilot users. Their findings surface every UX rough edge faster than internal QA.

## Tier 4 — explicitly deferred

- [ ] **AEO measurement loop.** Plan, cheapest first:
   1. Wire up Google Search Console + Vercel Analytics. ~2 hours. Free. Tells us nothing about LLM citation, only Google SERP.
   2. Watch referrer logs for `chatgpt.com`, `perplexity.ai`, `claude.ai`, `gemini.google.com`. Free. Sparse early signal but unambiguous: a real human clicked AdLint from an LLM.
   3. **Homegrown LLM probe.** Nightly Node script that asks ChatGPT, Perplexity, Claude, Gemini ~20 fixed questions ("what is a conversion linker?", "how do I fix duplicate Google Ads conversions?") and logs whether `adlint.dev` appears in the answer or citations. JSON log, no dashboard until 90+ days of data.
   4. **Paid synthetic ranking** (Profound / Athena / Otterly). $50–200/mo. Worth it once we have 6 months of homegrown data and need to justify spend.

   Recommendation when we pick this up: do 1 + 2 immediately (essentially free), build the probe in a day as item 3. Skip 4 for now.

   Honest tradeoff: AEO measurement has a long lag. The probe will return mostly zeros for 2–3 months. That's the baseline, not failure. Do not churn editorial content based on weekly probe noise.

   Why deferred: content is shipped and indexed. Building the loop now would not change today's content; it would just measure it. Building it later is the same cost and we have real data to grade against.

## Known minor defects (not blockers)

- Recharts logs `width(-1) height(-1)` console warning on first render of the score donut. Cosmetic; no user-visible impact. Likely fixable by setting an explicit `minHeight` on the chart container.
- The `/checks` search + results pair is structurally a WAI-ARIA combobox-with-listbox. Current implementation has working keyboard nav and `aria-current`, but a screen-reader user typing in the input won't hear the result count change. Proper `role="combobox"` + `aria-controls` + `aria-activedescendant` wiring is a ~1-hour follow-up if/when an accessibility audit calls it out.

## Where to start next session

If GSC is not yet done → start with #2 above (5 minutes in a browser tab, then come back).
If GSC is done → start with #7 (Lighthouse), then jump to #8 (pick one distribution channel and ship it).
If distribution is in motion → start watching for the first GSC impressions, then build the measurement-loop probe (Tier 4 item 3) when you have real data to grade.
