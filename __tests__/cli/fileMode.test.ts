/**
 * @jest-environment node
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { runAudit } from '../../lib/auditEngine';
import { computeHealthScore } from '../../lib/healthScore';
import { parseAdsCSV } from '../../lib/parsers/adsParser';
import { parseGTMJSON } from '../../lib/parsers/gtmParser';
import { runCli } from '../../cli/run';
import { fixture, ROOT, testDeps } from './helpers';

const GTM = fixture('gtm-container-duplicates.json');
const ADS = fixture('ads-wrong-counting.csv');

describe('adlint file mode: JSON schema v1', () => {
  it('pins the output schema on the duplicates container and wrong-counting CSV', async () => {
    const res = await runCli(['audit', '--gtm-export', GTM, '--ads-csv', ADS], testDeps());
    expect(res.stderr).toBe('');
    const out = JSON.parse(res.stdout);

    expect(Object.keys(out)).toEqual(['schemaVersion', 'tool', 'source', 'summary', 'findings']);
    expect(out.schemaVersion).toBe('1');
    expect(out.tool).toBe('adlint');
    expect(out.source).toEqual({ mode: 'file', gtmExport: GTM, adsCsv: ADS });
    expect(Object.keys(out.summary)).toEqual(['healthScore', 'band', 'checksRun', 'checksPassed', 'counts']);
    expect(Object.keys(out.summary.counts)).toEqual(['critical', 'warning', 'info', 'passed']);
    expect(typeof out.summary.healthScore).toBe('number');
    expect(['excellent', 'good', 'needs-work', 'critical']).toContain(out.summary.band);

    expect(out.findings.length).toBeGreaterThan(0);
    for (const f of out.findings) {
      expect(Object.keys(f)).toEqual(['checkId', 'severity', 'source', 'title', 'evidence', 'fix']);
      expect(['critical', 'warning', 'info']).toContain(f.severity);
      expect(['gtm', 'ads', 'cross']).toContain(f.source);
      expect(typeof f.checkId).toBe('string');
      expect(typeof f.title).toBe('string');
      expect(typeof f.fix).toBe('string');
      expect(typeof f.evidence.observed).toBe('string');
      expect(Object.keys(f.evidence).every(k => k === 'observed' || k === 'details')).toBe(true);
    }
    // Most severe first.
    const rank = { critical: 0, warning: 1, info: 2 } as const;
    const ranks = out.findings.map((f: { severity: keyof typeof rank }) => rank[f.severity]);
    expect(ranks).toEqual([...ranks].sort((a, b) => a - b));
  });

  it('takes every number from the engine', async () => {
    const res = await runCli(['audit', '--gtm-export', GTM, '--ads-csv', ADS], testDeps());
    const out = JSON.parse(res.stdout);

    const results = runAudit(
      parseGTMJSON(readFileSync(GTM, 'utf8')),
      parseAdsCSV(readFileSync(ADS, 'utf8'))
    );
    const score = computeHealthScore(results)!;
    expect(out.summary.counts).toEqual(results.summary);
    expect(out.summary.healthScore).toBe(score.score);
    expect(out.summary.band).toBe(score.band);
    expect(out.summary.checksRun).toBe(score.totalChecks);
    expect(out.summary.checksPassed).toBe(score.passedChecks);

    const failed = [...results.gtm, ...results.ads, ...results.cross].filter(c => !c.passed);
    expect(out.findings).toHaveLength(failed.length);
    expect(out.findings.map((f: { checkId: string }) => f.checkId).sort()).toEqual(
      failed.map(c => c.id).sort()
    );
    for (const c of failed) {
      const f = out.findings.find((x: { checkId: string }) => x.checkId === c.id);
      expect(f.severity).toBe(c.severity);
      expect(f.title).toBe(c.title);
      expect(f.evidence.observed).toBe(c.description);
      expect(f.fix).toBe(c.recommendation);
    }
  });

  it('exits 1 when there are critical findings and 0 when there are none', async () => {
    const dirty = await runCli(['audit', '--gtm-export', GTM, '--ads-csv', ADS], testDeps());
    expect(dirty.report!.summary.counts.critical).toBeGreaterThan(0);
    expect(dirty.exitCode).toBe(1);

    const clean = await runCli(['audit', '--gtm-export', fixture('gtm-container-clean.json')], testDeps());
    expect(clean.report!.summary.counts.critical).toBe(0);
    expect(clean.exitCode).toBe(0);
  });

  it('prints a text report with the same numbers', async () => {
    const res = await runCli(['audit', '--gtm-export', GTM, '--format', 'text'], testDeps());
    const { summary } = res.report!;
    expect(res.stdout).toContain(`Health score: ${summary.healthScore}/100`);
    expect(res.stdout).toContain(`Findings: ${summary.counts.critical} critical`);
  });

  it.each([
    [['lint'], 'Unknown command'],
    [['audit'], 'Nothing to audit'],
    [['audit', '--gtm-export', GTM, '--format', 'yaml'], '--format must be json or text'],
    [['audit', '--gtm-export', GTM, '--gtm-container', 'accounts/1/containers/2'], 'not both'],
    [['audit', '--gtm-export', '/nonexistent/container.json'], 'cannot read'],
    [['audit', '--ads-csv', fixture('gtm-container-clean.json')], 'Missing required columns'],
    [['audit', '--gtm-export', ADS], 'Invalid JSON format'],
    [['audit', '--bogus'], 'Unknown option'],
  ])('exits 2 on usage or input error: %j', async (argv, message) => {
    const res = await runCli(argv as string[], testDeps());
    expect(res.exitCode).toBe(2);
    expect(res.stdout).toBe('');
    expect(res.stderr).toContain(message);
  });
});

it('prints help and exits 0 with no command', async () => {
  for (const argv of [[], ['--help'], ['audit', '--help']]) {
    const res = await runCli(argv, testDeps());
    expect(res.exitCode).toBe(0);
    expect(res.stdout).toContain('Usage:');
  }
});

describe('adlint bin (real process)', () => {
  const bin = path.join(ROOT, 'cli/bin.cjs');
  const run = (args: string[]) => {
    try {
      return { code: 0, stdout: execFileSync(process.execPath, [bin, ...args], { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }) };
    } catch (e) {
      const err = e as { status: number; stdout: string; stderr: string };
      return { code: err.status, stdout: err.stdout, stderr: err.stderr };
    }
  };

  it('runs from source and sets the exit code', () => {
    const dirty = run(['audit', '--gtm-export', GTM, '--ads-csv', ADS]);
    expect(dirty.code).toBe(1);
    expect(JSON.parse(dirty.stdout).schemaVersion).toBe('1');

    expect(run(['audit', '--gtm-export', fixture('gtm-container-clean.json')]).code).toBe(0);
    expect(run(['audit', '--format', 'json']).code).toBe(2);
  }, 60000);
});
