# AdLint — Backlog

Work that is intentionally deferred. Each item should have a short rationale so future-me knows why it is sitting here instead of shipped.

## AEO measurement loop

**Status:** scoped, not built.

**Goal:** know whether the AEO scaffolding (178 explainers, /sources, llms.txt, schema graph) is actually surfacing AdLint in LLM answers and Google SERPs.

**Plan, cheapest first:**

1. **Google Search Console + Vercel Analytics.** Wire up GSC, submit the sitemap, watch `/checks/*` impressions and average position over 30/60/90 days. ~2 hours setup. Free. Tells us nothing about LLM citation, only Google SERP.
2. **Referrer logs from `chatgpt.com`, `perplexity.ai`, `claude.ai`, `gemini.google.com`.** Free, captures ground truth: a real human clicked AdLint from an LLM. Sparse signal early but unambiguous.
3. **Homegrown LLM probe.** Nightly script that asks ChatGPT, Perplexity, Claude, and Gemini ~20 fixed questions ("what is a conversion linker?", "how do I fix duplicate Google Ads conversions?", "GTM consent mode v2 audit") and logs whether `adlint.dev` appears in the answer or citations. Results in a JSON file we can graph. ~1 day to build. ~$0–20/month in API costs. This is the real AEO scoreboard.
4. **Profound / Athena / Otterly** — paid synthetic ranking probes. $50–200/month. Worth it once we have 6 months of homegrown data and need to justify spend. Not now.

**Recommendation when we pick this up:** do 1 + 2 immediately, build the probe as a small Node script with a fixed question bank and a CSV/JSON log. Do not build a dashboard until there is 90+ days of data; until then, eyeball the log.

**Honest tradeoff:** AEO measurement has a long lag. The probe will return mostly zeros for 2–3 months. That is the baseline, not failure. Do not churn editorial content based on weekly probe noise.

**Why deferred:** content is shipped and indexed. Building the loop now would not change today's content; it would just measure it. Building it later is the same cost and we have real data to grade against.
