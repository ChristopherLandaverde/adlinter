<p align="center">
  <img src="docs/images/logo.png" width="96" height="96" alt="AdLint logo: a white health-score ring, three-quarters drawn, on a navy tile">
</p>

<h1 align="center">AdLint</h1>

<p align="center">
  <strong>Broken conversion tracking doesn't announce itself. Audit your GTM and Google Ads setup from the browser, CLI or your AI agent.</strong>
</p>

<p align="center">
  178 checks · Google Ads, Google Tag Manager and 6 pixel platforms · MCP server for Claude, Cursor and any MCP client · web app runs in your browser, files never uploaded
</p>

<p align="center">
  <a href="https://github.com/ChristopherLandaverde/adlinter/actions/workflows/ci.yml"><img src="https://github.com/ChristopherLandaverde/adlinter/actions/workflows/ci.yml/badge.svg?branch=main" alt="CI"></a>
  <a href="package.json"><img src="https://img.shields.io/github/package-json/v/ChristopherLandaverde/adlinter?color=1E3A8A&label=version" alt="Version"></a>
  <a href="LICENSE"><img src="https://img.shields.io/github/license/ChristopherLandaverde/adlinter?color=1E3A8A" alt="License: MIT"></a>
  <a href="#agentic"><img src="https://img.shields.io/badge/agentic-L1%C2%B7L2%C2%B7L3-1E3A8A" alt="Agentic: L1, L2 and L3"></a>
</p>

<p align="center">
  <a href="https://adlinter.vercel.app">Live demo</a> · <a href="#agentic">For agents</a> · <a href="#try-it">Try it</a> · <a href="#what-it-checks">What it checks</a> · <a href="#known-limits">Known limits</a> · <a href="#privacy">Privacy</a>
</p>

For agencies and freelancers auditing ad tracking they didn't build, and in-house marketers who suspect the numbers are off. A conversion counted twice, an account with no primary conversion, a revenue conversion that fires without a value: the ad platform shows none of these as an error. AdLint reads your GTM container, Google Ads conversion export, performance report or pixel export and tells you what is broken, how badly, and how to fix it. Your own agent can call the same checks through the local `adlint-mcp` server, on exports or the live GTM container and Google Ads conversion actions; every tool is read-only, so deciding what to change stays with you.

<p align="center">
  <img src="docs/images/fix-demo.gif" width="880" alt="Four-frame storyboard on the bundled Google Ads Linter sample. 1 of 4: the sample conversion export, with the Purchase row highlighted because it counts &quot;One&quot;, beside the Google Ads Linter upload screen and its Try with sample data button. 2 of 4: the result, a Tracking Health Score of 74 out of 100 marked &quot;Needs work&quot; with 33 of 42 checks passed, 2 critical, 3 warnings and 4 info, and the most critical findings: No Primary Conversion Designated and High-Value Conversions with Wrong Counting Method. 3 of 4: the Wrong Counting Method finding and its explainer page, which says Google recommends &quot;Every&quot; for sales and lists the fix steps, including setting Count to &quot;Every&quot; in Google Ads. 4 of 4: a copy of the sample with only that cell changed from One to Every, re-run in the app: 87 out of 100 marked &quot;Good&quot;, 36 of 42 checks passed, 2 critical down to 1, and the three counting-method findings cleared, while No Primary Conversion Designated and 5 other findings remain">
  <br><sub>Bundled Google Ads Linter sample, nothing uploaded. Frame 4 is a real re-run on a copy of it with one cell changed: the Purchase row's Count, from One to Every.</sub>
</p>

## Agentic

AdLint is built as an agentic app in four layers: a deterministic engine, typed read-only tools over it, your own agent on top, and you deciding what to change. The agent never computes a finding or a number; it calls the engine and explains what came back.

<p align="center">
  <img src="docs/images/agentic-stack.svg" width="880" alt="AdLint's agentic stack in four layers. Layer 1, Engine: the check registry, 178 checks in lib/checks, which owns every verdict, score and count (L0). Layer 2, Tools: the adlint audit CLI and the adlint-mcp server with audit_export, audit_live_container, list_checks and explain_check, read-only and enforced in code (L1 JSON, L2 MCP). Layer 3, Your agent: Claude, Cursor or any MCP client, reading the live GTM container and Google Ads conversion actions read-only (L3 live read, fixture-verified). Layer 4, You approve: nothing writes; findings are evidence for you to act on (L4 planned).">
</p>

| Ask your agent… | Tool | Reads | Writes |
|---|---|---|---|
| "Audit the GTM export and Google Ads conversions CSV in ~/clients/acme and list the critical findings." | `audit_export` | The files you name (absolute paths or pasted text). No network. | nothing |
| "Check the live GTM container accounts/123/containers/456 and Ads account 123-456-7890 for broken conversion tracking." | `audit_live_container` | The published container version (`versions:live`) and the account's conversion actions (GAQL search only; a `mutate` call is refused in code), with your credentials | nothing |
| "Which critical Google Ads checks does AdLint run?" | `list_checks` | The check registry | nothing |
| "Why does `no-primary-conversion` matter? Give me a citation for the client report." | `explain_check` | The check's `/checks/<id>` explainer | nothing |

AGENTIC.md level: L1 machine-readable · L2 agent-callable · L3 live read (fixture-verified: tested against synthetic API responses, not yet a real account).

The CLI and MCP tools run the GTM, Google Ads and cross-source checks; the performance report and pixel checks are web-app only for now. Details: [Use it from an agent / CLI](#use-it-from-an-agent--cli) · [MCP server](#mcp-server) · [Live mode](#live-mode) · [where the data goes](#privacy).

## Who it's for

| You are | You come to |
|---|---|
| An agency or freelancer auditing ad tracking you didn't build | Hand the client a list of findings, each with a fix and a citation they can check |
| An in-house marketer who suspects the tracking is off | Get a second opinion before launch or when the numbers look wrong, without waiting on an engineer |

## What you get

- **Know which conversions are double-counted.** Duplicate conversion tags in GTM, duplicate conversion actions in Google Ads, duplicate event names in each pixel export.
- **Know whether bidding has a real target.** Missing primary conversion, a micro-conversion set as primary, too little conversion volume for Smart Bidding.
- **Know which Google Ads conversions no tag is sending.** Cross-checks the Google Ads export against the GTM container, including conversion ID and label matching.
- **Know where conversion value is missing or wrong.** Revenue conversions counting with no value, $0 purchases, configured value vs. reported value, purchase events without value on each pixel.
- **A finding you can defend.** One 0-100 Tracking Health Score, findings ranked critical / warning / info, and a `/checks/<id>` page per finding with why it matters, how to fix it, platform documentation and a citation paragraph for your client report.

## Try it

**No install:** open the [live demo](https://adlinter.vercel.app), pick a tool (for example **Google Ads Linter**, the one in the demo above) and click **Try with sample data**. The bundled sample files load and you land on the audit results page. Every tool has a sample.

**Run it locally** (Node 20, the version CI uses):

```bash
git clone https://github.com/ChristopherLandaverde/adlinter.git
cd adlinter
npm ci
npm run dev
```

Open <http://localhost:3000>, pick a tool and click **Try with sample data**, or upload your own export.

## Use it from an agent / CLI

`adlint` runs the same check engine as the web app (`lib/auditEngine.ts`, `lib/checks/*`, `lib/parsers/*`) from Node, on a GTM container export and/or a Google Ads conversions CSV. It prints JSON for a script or an agent to read, or text for a person. It runs from source and is not published to npm.

```bash
npm ci
npx tsx cli/adlint.ts audit \
  --gtm-export public/samples/gtm-container-sample.json \
  --ads-csv public/samples/ads-conversions-sample.csv
echo $?   # 1: at least one critical finding
```

Output on the bundled samples (trimmed with `jq '{schemaVersion, tool, source, summary, findings: [.findings[0]]}'`; the full run has 15 findings):

```json
{
  "schemaVersion": "1",
  "tool": "adlint",
  "source": {
    "mode": "file",
    "gtmExport": "public/samples/gtm-container-sample.json",
    "adsCsv": "public/samples/ads-conversions-sample.csv"
  },
  "summary": {
    "healthScore": 82,
    "band": "good",
    "checksRun": 86,
    "checksPassed": 71,
    "counts": {
      "critical": 3,
      "warning": 6,
      "info": 6,
      "passed": 71
    }
  },
  "findings": [
    {
      "checkId": "no-primary-conversion",
      "severity": "critical",
      "source": "ads",
      "title": "No Primary Conversion Designated",
      "evidence": {
        "observed": "3 conversions enabled, but none marked as Primary for Smart Bidding",
        "details": {
          "enabledConversions": 3,
          "primaryConversions": 0
        }
      },
      "fix": "Designate your most important conversion as Primary to guide Smart Bidding optimization"
    }
  ]
}
```

- **Every number comes from the engine.** `counts` is the engine's own summary, `healthScore` is the same 0-100 score the web app shows, and each finding is one failed check: its ID, severity, title, what it observed (`evidence`) and its recommendation (`fix`). Findings are sorted critical, warning, info.
- **Exit codes:** `0` no critical findings, `1` at least one critical finding, `2` a usage, input or credential error (the message goes to stderr).
- **Options:** `--gtm-export <file>`, `--ads-csv <file>` (either or both; both adds the cross-source checks), `--format json|text` (default `json`). `npx tsx cli/adlint.ts --help` prints the full usage. `npm run adlint -- audit ...` and the `adlint` bin (after `npm link`) run the same thing.
- **What it runs:** the GTM, Google Ads and cross-source checks. The performance report and the pixel exports are not wired into the CLI yet, and there are no flags for audit context, so the engine runs with its defaults.
- **Where the output goes:** the CLI writes to your terminal and nowhere else. If an agent runs it through a shell tool, the JSON goes to the model behind that agent, under that agent's own data terms.

### MCP server

`adlint-mcp` exposes the same engine as read-only [MCP](https://modelcontextprotocol.io) tools over stdio, so an agent such as Claude Code, Claude Desktop or Cursor can call it directly. It runs from source on your machine and is not published to npm or any MCP registry. The tools call the CLI's own modules (`cli/run.ts`, `cli/live/*`, `lib/checks/*`); nothing in the server computes a finding or a number.

| Tool | What it returns |
|---|---|
| `audit_export` | The CLI's JSON report (schema version 1) for a GTM export and/or Google Ads conversions CSV, given as absolute file paths or `~/...` (only read, never written) or as text. No network. |
| `audit_live_container` | The same report from [live mode](#live-mode): `container` (`accounts/<id>/containers/<id>`) and optional `adsCustomerId`. Same credentials, read-only request guard and network list as the CLI. |
| `list_checks` | Check IDs, titles, platform and default severity from the check registry, filterable by `platform` and `severity`. |
| `explain_check` | The `/checks/<id>` explainer for one check: why it matters, how to fix it, citation paragraph and sources. |

Bad input (a missing file, a relative path, both a path and text, a malformed container path, missing credentials) comes back as a tool error, `{"error": {"kind": "usage" | "credentials" | "api" | "refused" | "internal", "message": "..."}}`, not a crash. `refused` means the read-only guard stopped a request before it was sent.

**Connect it** (after `npm ci` in your clone; replace `/path/to/adlinter` with its absolute path):

Claude Code (this adds it for the current project; `claude mcp add -s user adlint -- ...` adds it for every project):

```bash
claude mcp add adlint -- node /path/to/adlinter/cli/mcp/bin.cjs
```

Claude Desktop (`claude_desktop_config.json`) and Cursor (`~/.cursor/mcp.json` or `.cursor/mcp.json` in a project):

```json
{
  "mcpServers": {
    "adlint": {
      "command": "node",
      "args": ["/path/to/adlinter/cli/mcp/bin.cjs"]
    }
  }
}
```

Claude Desktop may not see your shell's `PATH`. If Node comes from nvm or a similar version manager, use the absolute path to `node` (the output of `which node`, for example `/Users/you/.nvm/versions/node/v20.19.0/bin/node`) as `"command"`.

For `audit_live_container`, the server needs the same credentials as live mode on the machine that runs it: Application Default Credentials, plus `GOOGLE_ADS_DEVELOPER_TOKEN` and the other `GOOGLE_ADS_*` variables for Google Ads. Pass them with `-e KEY=value` after the server name in `claude mcp add`, or an `"env"` object in the JSON config. Values set that way are stored in that client's config file.

The `claude mcp add` command above (project scope) was run in this repo, and `claude mcp list` reported the server as connected. The `-s user` variant and the Claude Desktop and Cursor snippets use the same command, but they weren't run.

A real `audit_export` call on the bundled samples, made over stdio with the MCP SDK's client against `node cli/mcp/bin.cjs`. The arguments were the absolute paths of `public/samples/gtm-container-sample.json` (`gtmExportPath`) and `public/samples/ads-conversions-sample.csv` (`adsCsvPath`) in the clone. Relative paths are refused, because the server's working directory is whatever the agent app started it in. The output below is trimmed with `jq '{summary, findings: [.findings[1]]}'`. The full result has 15 findings and is identical to the CLI's JSON for the same files:

```json
{
  "summary": {
    "healthScore": 82,
    "band": "good",
    "checksRun": 86,
    "checksPassed": 71,
    "counts": {
      "critical": 3,
      "warning": 6,
      "info": 6,
      "passed": 71
    }
  },
  "findings": [
    {
      "checkId": "edge-high-value-wrong-counting",
      "severity": "critical",
      "source": "ads",
      "title": "High-Value Conversions with Wrong Counting Method",
      "evidence": {
        "observed": "1 high-value conversion(s) set to count \"One\" — missing repeat purchases",
        "details": {
          "highValueWrongCount": [
            {
              "name": "Purchase",
              "value": 50,
              "count": "One",
              "category": "Purchase"
            }
          ]
        }
      },
      "fix": "Set purchase conversions to count \"Every\" to track all transactions"
    }
  ]
}
```

**Where MCP results go:** the server itself sends nothing anywhere except what live mode documents (Google's APIs and token endpoints). But every tool result goes to the agent that called it, and so to the model behind your own agent (Claude, Cursor's model, or whichever you use), under that agent's data terms. That includes the findings and their evidence (conversion names, values, tag names). If the agent passes an export as text (`gtmExportJson`, `adsCsv`), that text has already been through the model. A test checks that the server, like the CLI, only reaches the network through `cli/live/http.ts` (`__tests__/cli/network.test.ts`).

## Live mode

Live mode reads the published GTM container and the Google Ads conversion actions straight from Google's APIs, so you don't have to export files first. The results go through the same parsers and checks as file mode.

```bash
npx tsx cli/adlint.ts audit \
  --gtm-container accounts/<accountId>/containers/<containerId> \
  --ads-customer <10-digit customer ID>
```

Live mode is verified against synthetic API responses; it has not yet been run against a real account. The fixtures are not recordings: they were built by hand in the shapes the Tag Manager and Google Ads API references document, with made-up IDs. The test suite checks that they give exactly the same findings as the same container and conversion actions read from files (`__tests__/cli/liveMode.test.ts`). Treat live output as a live read (fixture-verified; not yet run against a real account).

| Source | API call | OAuth scope |
|---|---|---|
| GTM | Tag Manager API v2 `accounts.containers.versions.live` (GET) | `https://www.googleapis.com/auth/tagmanager.readonly` |
| Google Ads | `GoogleAdsService` search, GAQL on `conversion_action`, API `v26` (set `ADLINT_GOOGLE_ADS_API_VERSION` to change it) | `https://www.googleapis.com/auth/adwords` |

**Credentials come from your machine.** AdLint never stores, logs or prints them.

- **GTM:** Application Default Credentials, for example `gcloud auth application-default login --scopes=https://www.googleapis.com/auth/tagmanager.readonly,https://www.googleapis.com/auth/cloud-platform`.
- **Google Ads:**
  - `GOOGLE_ADS_DEVELOPER_TOKEN` (required). A developer token without Standard access only works on test accounts.
  - `GOOGLE_ADS_LOGIN_CUSTOMER_ID` when you reach the account through a manager account.
  - OAuth: either `GOOGLE_ADS_CLIENT_ID`, `GOOGLE_ADS_CLIENT_SECRET` and `GOOGLE_ADS_REFRESH_TOKEN`, or Application Default Credentials with the `adwords` scope.

**Read-only, and what that means for Google Ads.** The Google Ads API has a single OAuth scope, `adwords`, and that scope can technically make changes. AdLint only ever reads: the only Google Ads call it makes is `GoogleAdsService` search. Every request goes through one function ([`cli/live/http.ts`](cli/live/http.ts)), which refuses any `mutate` path, any other Google Ads endpoint and any host besides `tagmanager.googleapis.com` and `googleads.googleapis.com`, and a test checks this. To be safe anyway, authorize with a Google Ads user whose access level is **Read only**.

**What leaves your machine:** requests to Google, plus (only if you configured federated credentials) your own credential source. Nothing goes to AdLint. Exactly:

- `tagmanager.googleapis.com` and `googleads.googleapis.com`: the reads above.
- `oauth2.googleapis.com`: Google's OAuth token endpoint, to get or refresh an access token.
- Only with federated (workload identity) or impersonated credentials: `sts.googleapis.com` and `iamcredentials.googleapis.com`, plus the credential source your credentials file names (for example AWS or Azure instance metadata, or a URL you configured).
- Only when it runs on a Google Cloud machine: that machine's metadata server, which is its credential source. The library detects this locally, from the BIOS and Cloud Run or Cloud Functions variables. Elsewhere AdLint turns off google-auth-library's network probe for a metadata server (`METADATA_SERVER_DETECTION=none`, unless you set that variable yourself), so a laptop without credentials fails at once instead of calling out.

Requests never follow redirects. The web app is unchanged: it never calls these APIs, and your files are still never uploaded.

**Mapping:** each conversion action's API fields become the columns of the Google Ads conversions download (for example `MANY_PER_CLICK` → `Every`, `GOOGLE_SEARCH_ATTRIBUTION_DATA_DRIVEN` → `Data-driven`, `REMOVED` → `Removed`). That CSV then goes through the web app's own parser ([`cli/live/googleAds.ts`](cli/live/googleAds.ts)). Removed and hidden actions are included and treated as switched off, as the checks already do for exports. `primary_for_goal` becomes the download's **Action optimization** column (`Primary` or `Secondary`); an action where the API leaves it out gets a blank cell.

## What it checks

| Tool | Input | Checks (registry source) |
|---|---|---|
| GTM Container Auditor | GTM container export (`.json`) | 29 (`gtm`) |
| Google Ads Linter | Google Ads conversions export (`.csv`) | 34 (`ads`) |
| Google Ads Performance Report | Performance report (`.json`) | 26 (`report`) |
| Google Full-Stack Audit | All three Google files | the three above, plus 29 cross-source checks (`cross`) for consistency between them |
| Meta, TikTok, LinkedIn, Pinterest, Twitter/X, Snapchat auditors | Each platform's event or conversion export (`.csv` or `.json`) | 10 per platform |

Counts are the distinct check IDs in [`lib/checks/registry.generated.ts`](lib/checks/registry.generated.ts), which is regenerated from the check files on every build. Run `npm run gen:registry` to print the current total and the count per source. The live [`/checks`](https://adlinter.vercel.app/checks) index lists every check with its explainer page.

<details>
<summary>Example checks per source</summary>

| Source | Examples |
|---|---|
| GTM | Missing Conversion Linker, GDPR consent, preview/debug tags in production, mixed Data Layer versions, circular tag dependencies, trigger conflicts, unused triggers and variables |
| Google Ads | Duplicate conversion actions, no primary conversion, counting method vs category, attribution window analysis, value data for ROAS bidding, Smart Bidding volume |
| Performance report | ROAS sanity, ghost conversions, attribution drift, signal pollution, value concentration, whale check |
| Cross-source | Ads conversions missing GTM tags, conversion ID/label matching, settings vs report counts, configured vs actual value, currency consistency |
| Meta Pixel | Missing PageView, missing conversion events, duplicate or similar event names, purchase value tracking, e-commerce funnel events |
| TikTok Pixel | Base pixel active events, CompletePayment value tracking, duplicate or similar event names, zero-volume events |
| LinkedIn Insight Tag | No active conversions, missing key conversions, Other category overuse, short conversion windows, unattached conversions |
| Pinterest Tag | Missing PageVisit, Checkout value tracking, Conversion API parity, duplicate event names, tag configuration quality |
| Twitter/X Pixel | Missing `conversion_id`, deduplication, event ID format, Tweet engagements used instead of conversions |
| Snapchat Pixel | Pixel ID format, missing PAGE_VIEW, standard event names, CAPI deduplication and currency alignment |

</details>

<details>
<summary>How to get each export</summary>

**GTM container:** Google Tag Manager → **Admin** → **Export Container** → choose the latest version and save the `.json` file.

**Google Ads conversions:** Google Ads → **Tools** → **Conversions** → **Download** → CSV. Keep the **Action optimization** (Primary/Secondary) column if your download has it: without it, the "no primary conversion" check is skipped rather than guessed.

**Meta Pixel events:** Meta Events Manager → Diagnostics or Test Events. CSV or JSON.

**TikTok Pixel events:** TikTok Events Manager → Web Events → Export. CSV or JSON.

**LinkedIn conversion actions:** Campaign Manager → Account Assets → Conversions → Export. CSV or JSON.

**Pinterest Tag events:** Pinterest Ads Manager → Conversions. CSV or JSON.

**Twitter/X Pixel events:** Twitter/X Ads Manager → Events Manager. CSV or JSON.

**Snapchat Pixel events:** Snapchat Ads Manager → Events Manager. CSV or JSON.

</details>

## Features

- **Tracking Health Score:** one 0-100 number computed from weighted severity, with a shareable badge.
- **Severity-ranked findings:** critical, warning and info, the three most critical first, filterable by source and severity.
- **`/checks/<id>` explainers:** why it matters, how to fix it, references to platform documentation and a citation paragraph for client reports.
- **Audit context:** tune severity to your business model, value strategy, sales cycle and consent requirements.
- **History and diff:** audits are saved in this browser; compare any two for a score delta and a list of regressions, fixes and severity shifts.
- **PDF export:** generated in the browser. From the fifth audit, unlocking it asks for an email address (see [Privacy](#privacy)).

## Known limits

- AdLint audits **configuration, not live sites**: exports in the web app and CLI, and the published GTM container and Google Ads conversion actions in the CLI's [live mode](#live-mode). It can't see whether a tag actually fires on a page, what a consent banner does at runtime, or anything the export or API leaves out.
- Live mode is fixture-verified only. It has not yet been run against a real Google account.
- In live mode, an action's Value is its default value (`value_settings.default_value`). For an action that takes dynamic values from the tag (`always_use_default_value` false), that is only the fallback, so value checks such as zero-value purchases read the fallback, not the values the tag sends.
- The "no primary conversion" check (`no-primary-conversion`) only runs when the input says which actions are Primary: an **Action optimization** or **Primary action** column in the CSV, or `primary_for_goal` in live mode. When no row carries that status, the check is reported as skipped (passed, not a finding) instead of failing. Only enabled actions count as Primary, and several Primary actions (one per goal) pass.
- Findings are about configuration correctness and policy. AdLint doesn't predict CTR, ROAS or conversions.
- History, audit context and the PDF unlock state live in one browser's localStorage. Clearing site data or switching browsers loses them.
- The check registry is generated by pattern-matching the check source files (`scripts/generate-check-registry.mjs`), so a check written in an unusual shape could be missed from the count.

## Privacy

- **Your files stay in your browser.** Exports are parsed and audited by JavaScript on the page and never uploaded. Audit history is stored in your browser's localStorage. PDFs are generated in the browser.
- **Email for PDF export (optional).** From your fifth audit, PDF export asks for an email address. The form says this before you submit: the address is sent to AdLint's `/api/subscribe` route ([`app/api/subscribe/route.ts`](app/api/subscribe/route.ts)), which forwards it to MailerLite, the email provider, tagged as a PDF-export sign-up. No audit data is sent with it.
- **Third-party requests.** The site loads its display fonts from Fontshare (`api.fontshare.com`). It loads no analytics scripts.
- **CLI and MCP server.** `adlint` and `adlint-mcp` run on your machine. In file mode (and the `audit_export`, `list_checks` and `explain_check` tools) they make no network requests. In live mode (and `audit_live_container`) they call the Tag Manager and Google Ads APIs and Google's OAuth token endpoint, with your own credentials. With federated or impersonated credentials it also calls Google's STS and IAM Credentials endpoints and the credential source you configured; on a Google Cloud machine, that machine's metadata server. Nothing goes to AdLint. [Live mode](#live-mode) has the exact list. Through the MCP server, tool results also reach the model behind the agent you connect it to ([MCP server](#mcp-server)).

## Roadmap

- **Planned, not built: L4, proposes changes.** The agent would draft a fix into an unpublished GTM workspace, verify it, and leave publishing to a named person who approves it. Today nothing in AdLint writes to GTM or Google Ads.

## Development

```bash
npx tsc --noEmit    # type check
npx jest --ci       # tests: checks, parsers, integration scenarios, hooks, components, CLI
npm run build       # regenerates the check registry, then builds
```

These are the commands CI runs on every push and pull request to `main`. The demo GIF at the top is rebuilt from the running app with [`scripts/readme-demo`](scripts/readme-demo/README.md). Release steps are in [RELEASING.md](RELEASING.md); version history is in [progress.md](progress.md).

Stack: Next.js 16, React 19, TypeScript, Tailwind CSS, Jest. Design system: [DESIGN.md](DESIGN.md). Product principles: [PRODUCT.md](PRODUCT.md).

## License

[MIT](LICENSE)
