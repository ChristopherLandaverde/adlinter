# AdLint — Progress Log

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
