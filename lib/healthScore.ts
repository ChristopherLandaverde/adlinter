import type { AuditCheck, AuditResults, Severity } from './types';

export interface HealthScore {
  score: number;
  band: 'excellent' | 'good' | 'needs-work' | 'critical';
  bandLabel: string;
  bandColor: 'emerald' | 'blue' | 'amber' | 'red';
  totalChecks: number;
  passedChecks: number;
  weightedPoints: number;
  maxWeightedPoints: number;
}

const WEIGHTS: Record<Severity, number> = {
  critical: 10,
  warning: 4,
  info: 1,
};

type HealthScoreBand = Pick<HealthScore, 'band' | 'bandLabel' | 'bandColor'>;

export function getHealthScoreBand(score: number): HealthScoreBand {
  if (score >= 90) {
    return { band: 'excellent', bandLabel: 'Excellent', bandColor: 'emerald' };
  }
  if (score >= 75) {
    return { band: 'good', bandLabel: 'Good', bandColor: 'blue' };
  }
  if (score >= 50) {
    return { band: 'needs-work', bandLabel: 'Needs work', bandColor: 'amber' };
  }
  return { band: 'critical', bandLabel: 'Critical issues', bandColor: 'red' };
}

function allChecks(results: AuditResults): AuditCheck[] {
  return [
    ...results.gtm,
    ...results.ads,
    ...results.cross,
    ...results.report,
    ...results.meta,
    ...results.tiktok,
    ...results.linkedin,
    ...results.pinterest,
    ...results.twitter,
    ...results.snapchat,
  ];
}

export function computeHealthScore(results: AuditResults): HealthScore | null {
  const checks = allChecks(results);
  const totalChecks = checks.length;

  if (totalChecks === 0) return null;

  let passedChecks = 0;
  let weightedPoints = 0;
  let maxWeightedPoints = 0;

  for (const check of checks) {
    const weight = WEIGHTS[check.severity];
    maxWeightedPoints += weight;

    if (check.passed) {
      passedChecks++;
      weightedPoints += weight;
    }
  }

  const rawScore = Math.round(100 * (weightedPoints / maxWeightedPoints));
  const score = Math.max(0, Math.min(100, rawScore));

  return {
    score,
    ...getHealthScoreBand(score),
    totalChecks,
    passedChecks,
    weightedPoints,
    maxWeightedPoints,
  };
}
