// The CLI's output contract, schema version 1. Every number in it comes from
// the engine: runAudit() for the checks and their counts, computeHealthScore()
// for the score.

import { computeHealthScore } from '../lib/healthScore';
import type { AuditCheck, AuditResults, Severity } from '../lib/types';

export const SCHEMA_VERSION = '1';

export type CheckSource = 'gtm' | 'ads' | 'cross';

export type ReportSource =
  | { mode: 'file'; gtmExport?: string; adsCsv?: string }
  | {
      mode: 'live';
      gtmContainer?: string;
      gtmContainerVersionId?: string;
      adsCustomer?: string;
      adsConversionActions?: number;
    };

export interface Finding {
  checkId: string;
  severity: Severity;
  source: CheckSource;
  title: string;
  evidence: {
    observed: string;
    details?: Record<string, unknown>;
  };
  fix: string;
}

export interface AdlintReport {
  schemaVersion: typeof SCHEMA_VERSION;
  tool: 'adlint';
  source: ReportSource;
  summary: {
    healthScore: number | null;
    band: string | null;
    checksRun: number;
    checksPassed: number;
    counts: { critical: number; warning: number; info: number; passed: number };
  };
  findings: Finding[];
}

const SEVERITY_ORDER: Record<Severity, number> = { critical: 0, warning: 1, info: 2 };
const SOURCES: CheckSource[] = ['gtm', 'ads', 'cross'];

function toFinding(check: AuditCheck, source: CheckSource): Finding {
  const evidence: Finding['evidence'] = { observed: check.description };
  if (check.details && Object.keys(check.details).length > 0) evidence.details = check.details;
  return {
    checkId: check.id,
    severity: check.severity,
    source,
    title: check.title,
    evidence,
    fix: check.recommendation,
  };
}

export function buildReport(results: AuditResults, source: ReportSource): AdlintReport {
  const findings = SOURCES.flatMap(s =>
    results[s].filter(c => !c.passed).map(c => toFinding(c, s))
  );
  // Stable sort: most severe first, engine order within a severity.
  const sorted = findings
    .map((f, i) => ({ f, i }))
    .sort((a, b) => SEVERITY_ORDER[a.f.severity] - SEVERITY_ORDER[b.f.severity] || a.i - b.i)
    .map(x => x.f);

  const score = computeHealthScore(results);
  return {
    schemaVersion: SCHEMA_VERSION,
    tool: 'adlint',
    source,
    summary: {
      healthScore: score?.score ?? null,
      band: score?.band ?? null,
      checksRun: score?.totalChecks ?? 0,
      checksPassed: score?.passedChecks ?? 0,
      counts: { ...results.summary },
    },
    findings: sorted,
  };
}

export function formatText(report: AdlintReport): string {
  const { summary } = report;
  const lines: string[] = [];
  const src = report.source;
  const inputs =
    src.mode === 'file'
      ? [src.gtmExport && `GTM export ${src.gtmExport}`, src.adsCsv && `Ads CSV ${src.adsCsv}`]
      : [
          src.gtmContainer &&
            `live GTM ${src.gtmContainer}${src.gtmContainerVersionId ? ` (version ${src.gtmContainerVersionId})` : ''}`,
          src.adsCustomer && `live Google Ads customer ${src.adsCustomer}`,
        ];
  lines.push(`AdLint audit: ${inputs.filter(Boolean).join(', ')}`);
  lines.push(
    `Health score: ${summary.healthScore ?? 'n/a'}/100${summary.band ? ` (${summary.band})` : ''}, ${summary.checksPassed} of ${summary.checksRun} checks passed`
  );
  lines.push(
    `Findings: ${summary.counts.critical} critical, ${summary.counts.warning} warning, ${summary.counts.info} info`
  );
  for (const f of report.findings) {
    lines.push('');
    lines.push(`[${f.severity.toUpperCase()}] ${f.title} (${f.checkId}, ${f.source})`);
    lines.push(`  Observed: ${f.evidence.observed}`);
    lines.push(`  Fix: ${f.fix}`);
  }
  return lines.join('\n') + '\n';
}
