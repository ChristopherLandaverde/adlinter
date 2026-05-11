import { computeHealthScore } from '@/lib/healthScore';
import type { AuditCheck, AuditResults, Severity } from '@/lib/types';

function check(severity: Severity, passed: boolean): AuditCheck {
  return {
    id: `${severity}-${passed}`,
    severity,
    passed,
    title: 'Check',
    description: 'Description',
    recommendation: 'Recommendation',
  };
}

function results(overrides: Partial<AuditResults> = {}): AuditResults {
  return {
    gtm: [],
    ads: [],
    cross: [],
    report: [],
    meta: [],
    tiktok: [],
    summary: { critical: 0, warning: 0, info: 0, passed: 0 },
    ...overrides,
  };
}

describe('computeHealthScore', () => {
  it('returns null when there are no checks', () => {
    expect(computeHealthScore(results())).toBeNull();
  });

  it('computes a weighted score across all audit sections', () => {
    const score = computeHealthScore(results({
      gtm: [check('critical', true), check('critical', false)],
      ads: [check('warning', true), check('warning', false)],
      meta: [check('info', true), check('info', false)],
    }));

    expect(score).toMatchObject({
      score: 50,
      band: 'needs-work',
      bandLabel: 'Needs work',
      bandColor: 'amber',
      totalChecks: 6,
      passedChecks: 3,
      weightedPoints: 15,
      maxWeightedPoints: 30,
    });
  });

  it('uses the configured band thresholds', () => {
    expect(computeHealthScore(results({ gtm: [check('critical', true)] }))?.band).toBe('excellent');
    expect(computeHealthScore(results({ gtm: [check('critical', true), check('info', false), check('info', false)] }))?.band).toBe('good');
    expect(computeHealthScore(results({ gtm: [check('warning', true), check('warning', false)] }))?.band).toBe('needs-work');
    expect(computeHealthScore(results({ gtm: [check('critical', false), check('info', true)] }))?.band).toBe('critical');
  });
});
