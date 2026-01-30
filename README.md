# AdLint

**Free, privacy-first audit tool for Google Tag Manager + Google Ads.**

AdLint analyzes your GTM container export and Google Ads conversion CSV to surface tracking issues before they cost you money. All processing runs entirely in the browser — no data ever leaves your machine.

## What It Does

Upload your files, get a full diagnostic report in seconds:

- **70 automated checks** across GTM configuration, Google Ads conversions, and cross-platform alignment
- **Context-aware severity** — checks adapt based on your business model, sales cycle, and consent requirements
- **Smart skipping** — passed informational checks are hidden automatically so you only see what matters
- **Rich inline diagnostics** — every finding includes structured details (affected tags, missing variables, mismatched values) right in the report

### Check Coverage

| Category | Checks | Examples |
|----------|--------|---------|
| GTM Core | 12 | Conversion Linker, consent violations, duplicate tags, enhanced conversions, naming conventions |
| GTM Advanced | 18 | DataLayer analysis, tag sequencing, circular dependencies, trigger overlap, container complexity |
| Ads Core | 11 | Duplicate conversions, zero-value purchases, counting methods, attribution windows, disabled conversions |
| Ads Advanced | 15 | Value outliers, ROAS feasibility, Smart Bidding readiness, primary conversion designation |
| Cross-Platform | 4 | Tag-to-conversion matching, value mismatches, tag count parity |
| Cross Advanced | 10 | Dynamic value passing, conversion label matching, transaction ID deduplication, funnel coverage |

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

## Running Tests

```bash
npm test
```

244 tests covering all checks, parsers, integration scenarios, and edge cases.

## Tech Stack

- Next.js 16 / React 19
- TypeScript
- Tailwind CSS
- Jest (testing)

## Privacy

AdLint is a fully client-side application. Your GTM and Google Ads data is parsed and analyzed in the browser using JavaScript. Nothing is sent to any server.

## License

MIT
