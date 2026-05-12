import { diffAudits } from '@/lib/auditDiff';
import type { AuditHistoryEntry } from '@/lib/auditHistory';
import type { AuditCheck, AuditResults } from '@/lib/types';

const emptyResults: AuditResults = {
  gtm: [],
  ads: [],
  cross: [],
  report: [],
  meta: [],
  tiktok: [],
  linkedin: [],
  pinterest: [],
  twitter: [],
  snapchat: [],
  summary: { critical: 0, warning: 0, info: 0, passed: 0 },
};

function check(overrides: Partial<AuditCheck> = {}): AuditCheck {
  return {
    id: 'check-1',
    severity: 'warning',
    passed: false,
    title: 'Conversion check',
    description: 'Checks conversion setup.',
    recommendation: 'Fix conversion setup.',
    ...overrides,
  };
}

function results(checks: AuditCheck[]): AuditResults {
  return {
    ...emptyResults,
    gtm: checks,
    summary: {
      critical: checks.filter((item) => !item.passed && item.severity === 'critical').length,
      warning: checks.filter((item) => !item.passed && item.severity === 'warning').length,
      info: checks.filter((item) => !item.passed && item.severity === 'info').length,
      passed: checks.filter((item) => item.passed).length,
    },
  };
}

function entry(overrides: Partial<AuditHistoryEntry> = {}): AuditHistoryEntry {
  return {
    id: 'audit-1',
    timestamp: 1000,
    toolSlug: 'gtm-auditor',
    toolName: 'GTM Auditor',
    fileNames: ['container.json'],
    results: emptyResults,
    sourceData: {},
    ...overrides,
  };
}

describe('diffAudits', () => {
  it('returns no changes and zero score delta for identical audits', () => {
    const auditA = entry({ score: 67, results: results([check()]) });
    const auditB = entry({ id: 'audit-2', score: 67, results: results([check()]) });

    const diff = diffAudits(auditA, auditB);

    expect(diff.scoreDelta).toBe(0);
    expect(diff.changes).toEqual([]);
    expect(diff.totals).toEqual({
      fixed: 0,
      regressed: 0,
      severityUp: 0,
      severityDown: 0,
      added: 0,
      removed: 0,
    });
  });

  it('counts a passing to failing check as regressed', () => {
    const auditA = entry({ results: results([check({ passed: true })]) });
    const auditB = entry({ id: 'audit-2', results: results([check({ passed: false })]) });

    const diff = diffAudits(auditA, auditB);

    expect(diff.totals.regressed).toBe(1);
    expect(diff.changes[0]).toMatchObject({
      id: 'check-1',
      delta: 'now-failing',
      passedA: true,
      passedB: false,
    });
  });

  it('counts a failing to passing check as fixed', () => {
    const auditA = entry({ results: results([check({ passed: false })]) });
    const auditB = entry({ id: 'audit-2', results: results([check({ passed: true })]) });

    const diff = diffAudits(auditA, auditB);

    expect(diff.totals.fixed).toBe(1);
    expect(diff.changes[0]).toMatchObject({
      id: 'check-1',
      delta: 'now-passing',
      passedA: false,
      passedB: true,
    });
  });

  it('classifies warning to critical as severityUp', () => {
    const auditA = entry({ results: results([check({ severity: 'warning', passed: false })]) });
    const auditB = entry({ id: 'audit-2', results: results([check({ severity: 'critical', passed: false })]) });

    const diff = diffAudits(auditA, auditB);

    expect(diff.totals.severityUp).toBe(1);
    expect(diff.changes[0]).toMatchObject({
      delta: 'severity-up',
      severityA: 'warning',
      severityB: 'critical',
    });
  });

  it('computes score delta from B minus A', () => {
    const auditA = entry({ score: 67 });
    const auditB = entry({ id: 'audit-2', score: 81 });

    expect(diffAudits(auditA, auditB).scoreDelta).toBe(14);
  });

  it('classifies added and removed checks', () => {
    const removed = check({ id: 'removed', title: 'Removed check' });
    const added = check({ id: 'added', title: 'Added check' });
    const auditA = entry({ results: results([removed]) });
    const auditB = entry({ id: 'audit-2', results: results([added]) });

    const diff = diffAudits(auditA, auditB);

    expect(diff.totals.added).toBe(1);
    expect(diff.totals.removed).toBe(1);
    expect(diff.changes.map((change) => change.delta)).toEqual(['added', 'removed']);
  });
});
