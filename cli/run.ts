// adlint: runs AdLint's check engine from the command line.
// runCli() does no process I/O itself, so tests drive it with fakes.

import { readFile } from 'node:fs/promises';
import { parseArgs } from 'node:util';
import { runAudit } from '../lib/auditEngine';
import { parseAdsCSV } from '../lib/parsers/adsParser';
import { parseGTMJSON } from '../lib/parsers/gtmParser';
import type { AdsData, GTMContainer } from '../lib/types';
import { CredentialError, isCliError, UsageError } from './errors';
import { adsTokenProvider, gtmTokenFromAdc, type Env, type TokenProvider } from './live/auth';
import {
  adsConfigFromEnv,
  fetchConversionActions,
  parseCustomerId,
  rowsToAdsData,
} from './live/googleAds';
import { fetchLiveContainer, parseContainerPath } from './live/gtm';
import type { FetchLike } from './live/http';
import { buildReport, formatText, type AdlintReport, type ReportSource } from './report';

export const EXIT_OK = 0;
export const EXIT_CRITICAL = 1;
export const EXIT_ERROR = 2;

export const USAGE = `Usage:
  adlint audit --gtm-export <container.json> [--ads-csv <conversions.csv>] [--format json|text]
  adlint audit --ads-csv <conversions.csv> [--format json|text]
  adlint audit --gtm-container accounts/<id>/containers/<id> [--ads-customer <id>] [--format json|text]
  adlint audit --ads-customer <id> [--format json|text]

File mode reads exports from disk. Live mode reads the published GTM container
(Tag Manager API, tagmanager.readonly) and Google Ads conversion actions
(GoogleAdsService search) with credentials from this machine.

Live-mode environment:
  Tag Manager   Application Default Credentials with the tagmanager.readonly scope
  Google Ads    GOOGLE_ADS_DEVELOPER_TOKEN (required)
                GOOGLE_ADS_LOGIN_CUSTOMER_ID (when access is through a manager account)
                GOOGLE_ADS_CLIENT_ID, GOOGLE_ADS_CLIENT_SECRET, GOOGLE_ADS_REFRESH_TOKEN,
                or Application Default Credentials with the adwords scope
                ADLINT_GOOGLE_ADS_API_VERSION (optional, default v26)

Exit codes: 0 no critical findings, 1 critical findings, 2 usage, input or credential error.
`;

export interface CliDeps {
  env: Env;
  fetch: FetchLike;
  readFile: (path: string) => Promise<string>;
  gtmToken: TokenProvider;
  /** Builds the Google Ads token provider from the environment. */
  adsToken: (env: Env) => TokenProvider;
}

export const defaultDeps = (env: Env): CliDeps => ({
  env,
  fetch: (url, init) => fetch(url, init),
  readFile: path => readFile(path, 'utf8'),
  gtmToken: gtmTokenFromAdc,
  adsToken: adsTokenProvider,
});

export interface CliResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  report?: AdlintReport;
}

interface AuditArgs {
  gtmExport?: string;
  adsCsv?: string;
  gtmContainer?: string;
  adsCustomer?: string;
  format: 'json' | 'text';
}

function parseAuditArgs(argv: string[]): AuditArgs | 'help' {
  const [command, ...rest] = argv;
  if (!command || command === '--help' || command === '-h' || command === 'help') return 'help';
  if (command !== 'audit') throw new UsageError(`Unknown command "${command}"`);

  let values: Record<string, string | boolean | undefined>;
  try {
    ({ values } = parseArgs({
      args: rest,
      options: {
        'gtm-export': { type: 'string' },
        'ads-csv': { type: 'string' },
        'gtm-container': { type: 'string' },
        'ads-customer': { type: 'string' },
        format: { type: 'string', default: 'json' },
        help: { type: 'boolean', short: 'h' },
      },
      strict: true,
      allowPositionals: false,
    }));
  } catch (e) {
    throw new UsageError(e instanceof Error ? e.message : String(e));
  }
  if (values.help) return 'help';

  for (const flag of ['gtm-export', 'ads-csv', 'gtm-container', 'ads-customer', 'format']) {
    const v = values[flag];
    if (typeof v === 'string' && v.trim() === '') {
      throw new UsageError(`--${flag} needs a value, got an empty string`);
    }
  }

  const format = values.format as string;
  if (format !== 'json' && format !== 'text') {
    throw new UsageError(`--format must be json or text, got "${format}"`);
  }
  const args: AuditArgs = {
    gtmExport: values['gtm-export'] as string | undefined,
    adsCsv: values['ads-csv'] as string | undefined,
    gtmContainer: values['gtm-container'] as string | undefined,
    adsCustomer: values['ads-customer'] as string | undefined,
    format,
  };
  const file = args.gtmExport !== undefined || args.adsCsv !== undefined;
  const live = args.gtmContainer !== undefined || args.adsCustomer !== undefined;
  if (file && live) {
    throw new UsageError('Use either file inputs (--gtm-export, --ads-csv) or live inputs (--gtm-container, --ads-customer), not both');
  }
  if (!file && !live) {
    throw new UsageError('Nothing to audit: pass --gtm-export and/or --ads-csv, or --gtm-container and/or --ads-customer');
  }
  return args;
}

async function readInput(deps: CliDeps, path: string, flag: string): Promise<string> {
  try {
    return await deps.readFile(path);
  } catch (e) {
    const code = (e as NodeJS.ErrnoException).code;
    throw new UsageError(`${flag}: cannot read "${path}"${code ? ` (${code})` : ''}`);
  }
}

function parseInput<T>(parse: () => T, flag: string, path: string): T {
  try {
    return parse();
  } catch (e) {
    throw new UsageError(`${flag}: ${path}: ${e instanceof Error ? e.message : String(e)}`);
  }
}

async function loadFileInputs(args: AuditArgs, deps: CliDeps) {
  let gtm: GTMContainer | null = null;
  let ads: AdsData | null = null;
  if (args.gtmExport) {
    const text = await readInput(deps, args.gtmExport, '--gtm-export');
    gtm = parseInput(() => parseGTMJSON(text), '--gtm-export', args.gtmExport);
  }
  if (args.adsCsv) {
    const text = await readInput(deps, args.adsCsv, '--ads-csv');
    ads = parseInput(() => parseAdsCSV(text), '--ads-csv', args.adsCsv);
  }
  const source: ReportSource = { mode: 'file' };
  if (args.gtmExport) source.gtmExport = args.gtmExport;
  if (args.adsCsv) source.adsCsv = args.adsCsv;
  return { gtm, ads, source };
}

async function loadLiveInputs(args: AuditArgs, deps: CliDeps) {
  // Validate every flag and env var before asking for any token.
  const containerPath = args.gtmContainer !== undefined ? parseContainerPath(args.gtmContainer) : undefined;
  const customerId = args.adsCustomer !== undefined ? parseCustomerId(args.adsCustomer) : undefined;
  const adsConfig = customerId ? adsConfigFromEnv(deps.env) : undefined;

  let gtm: GTMContainer | null = null;
  let ads: AdsData | null = null;
  const source: Extract<ReportSource, { mode: 'live' }> = { mode: 'live' };

  if (containerPath) {
    const token = await deps.gtmToken();
    const live = await fetchLiveContainer(containerPath, token, deps.fetch);
    gtm = live.container;
    source.gtmContainer = containerPath;
    if (live.containerVersionId) source.gtmContainerVersionId = live.containerVersionId;
  }
  if (customerId && adsConfig) {
    const token = await deps.adsToken(deps.env)();
    const rows = await fetchConversionActions(customerId, token, adsConfig, deps.fetch);
    ads = rowsToAdsData(rows);
    source.adsCustomer = customerId;
    source.adsConversionActions = rows.length;
  }
  return { gtm, ads, source };
}

export async function runCli(argv: string[], deps: CliDeps): Promise<CliResult> {
  try {
    const args = parseAuditArgs(argv);
    if (args === 'help') return { exitCode: EXIT_OK, stdout: USAGE, stderr: '' };

    const isLive = args.gtmContainer !== undefined || args.adsCustomer !== undefined;
    const { gtm, ads, source } = isLive
      ? await loadLiveInputs(args, deps)
      : await loadFileInputs(args, deps);

    const results = runAudit(gtm, ads);
    const report = buildReport(results, source);
    const stdout =
      args.format === 'json' ? JSON.stringify(report, null, 2) + '\n' : formatText(report);
    return {
      exitCode: report.summary.counts.critical > 0 ? EXIT_CRITICAL : EXIT_OK,
      stdout,
      stderr: '',
      report,
    };
  } catch (e) {
    if (isCliError(e)) {
      const prefix = e instanceof CredentialError ? 'adlint: credential error: ' : 'adlint: ';
      const usageHint = e instanceof UsageError ? `\n\n${USAGE}` : '\n';
      return { exitCode: EXIT_ERROR, stdout: '', stderr: `${prefix}${e.message}${usageHint}` };
    }
    // Anything unexpected (including the read-only guard refusing a call).
    const msg = e instanceof Error ? e.message : String(e);
    return { exitCode: EXIT_ERROR, stdout: '', stderr: `adlint: ${msg}\n` };
  }
}
