# AdLint

**Free, privacy-first audit suite for ad-tech tracking — GTM, Google Ads, Meta Pixel, LinkedIn, and performance reports.**

AdLint analyzes your ad-tech exports to surface tracking issues before they cost you money. All processing runs entirely in the browser — no data ever leaves your machine.

## What It Does

Upload your files, choose the right audit, and get a diagnostic report in seconds:

- **GTM Container Auditor** — 30 checks
- **Google Ads Linter** — 27 checks
- **Performance Report Analyzer** — 11 checks
- **Full-Stack Audit** — 82 checks across GTM, Ads, and performance reports
- **Meta Pixel Auditor** — 10 checks
- **TikTok Pixel Auditor** — 10 checks
- **LinkedIn Insight Tag Auditor** — 10 checks

## Features

- Tabbed audit dashboard with Overview, Checks, and Export views
- PDF export with email capture
- Tracking Health Score: a single 0-100 anchor with a shareable badge, computed from weighted severity
- Audit diff: compare any two audits side-by-side with a score delta and a categorized change list (regressions, fixes, severity shifts, new checks, removed checks)
- Source and severity filtering
- Audit history saved in localStorage; revisit and compare past audits
- Try-with-sample-data button on every tool: see the audit in 5 seconds without exporting anything
- Audit context picker: tune severity rules to your business model, value strategy, sales cycle, and consent requirements
- Context-aware severity based on business model, sales cycle, value strategy, and consent requirements
- /checks reference: 38 per-check documentation pages with why-it-matters and how-to-fix guidance

### Check Coverage

| Category | Checks | Examples |
|----------|--------|---------|
| GTM Core | 12 | Conversion Linker, consent violations, duplicate tags, enhanced conversions, naming conventions |
| GTM Advanced | 18 | DataLayer analysis, tag sequencing, circular dependencies, trigger overlap, container complexity |
| Ads Core | 12 | Duplicate conversions, zero-value purchases, counting methods, attribution windows, disabled conversions |
| Ads Advanced | 15 | Value outliers, ROAS feasibility, Smart Bidding readiness, primary conversion designation |
| Performance Report | 11 | ROAS sanity, ghost conversions, attribution drift, signal pollution, whale conversions |
| Cross-Platform | 4 | Tag-to-conversion matching, value mismatches, tag count parity |
| Cross Advanced | 10 | Dynamic value passing, conversion label matching, transaction ID deduplication, funnel coverage |
| Meta Pixel | 10 | Missing PageView, missing conversion events, duplicate event names, similar event names, zero volume active events, custom events with standard alternatives, purchase value tracking, e-commerce funnel events, event volume concentration, disabled conversion events |
| TikTok Pixel | 10 | Base pixel active events, missing conversion events, duplicate event names, similar event names, zero volume active events, custom events with standard alternatives, CompletePayment value tracking, e-commerce funnel events, event volume concentration, disabled conversion events |
| LinkedIn Insight Tag | 10 | No active conversions, missing key conversions, duplicate conversion names, similar conversion names, zero volume active conversions, Other category overuse, purchase value tracking, short conversion windows, unattached conversions, disabled key conversions |

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and upload your files.

### How to Get Your Files

**GTM Container Export:**
1. Open Google Tag Manager
2. Go to **Admin** > **Export Container**
3. Choose the latest version and save the `.json` file

**Google Ads Conversions:**
1. Open Google Ads
2. Go to **Tools** > **Conversions**
3. Click **Download** and select CSV format

**Meta Pixel Events:**
Export from Meta Events Manager > Diagnostics or Test Events; supports CSV and JSON.

**TikTok Pixel Events:**
Export from TikTok Events Manager > Web Events > Export; supports CSV and JSON.

**LinkedIn Conversion Actions:**
Export from LinkedIn Campaign Manager > Account Assets > Conversions > Export; supports CSV and JSON.

## Running Tests

```bash
npm test
```

Tests cover checks, parsers, integration scenarios, edge cases, hooks, and components.

## Tech Stack

- Next.js 16 / React 19
- TypeScript
- Tailwind CSS
- General Sans + Instrument Sans + Geist Mono typography
- lucide-react line icon style
- Jest (testing)

## Privacy

AdLint is a fully client-side application. Your GTM and Google Ads data is parsed and analyzed in the browser using JavaScript. Nothing is sent to any server.

## License

MIT
