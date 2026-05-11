'use client';

import type { HealthScore } from '@/lib/healthScore';

interface HealthScoreBadgeProps {
  score: HealthScore;
  size?: 'large' | 'small';
}

const colorStyles: Record<HealthScore['bandColor'], {
  text: string;
  bg: string;
  border: string;
  stroke: string;
  track: string;
}> = {
  emerald: {
    text: 'text-emerald-700',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    stroke: 'stroke-emerald-500',
    track: 'stroke-emerald-100',
  },
  blue: {
    text: 'text-blue-700',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    stroke: 'stroke-blue-500',
    track: 'stroke-blue-100',
  },
  amber: {
    text: 'text-amber-700',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    stroke: 'stroke-amber-500',
    track: 'stroke-amber-100',
  },
  red: {
    text: 'text-red-700',
    bg: 'bg-red-50',
    border: 'border-red-200',
    stroke: 'stroke-red-500',
    track: 'stroke-red-100',
  },
};

export function HealthScoreBadge({ score, size = 'large' }: HealthScoreBadgeProps) {
  const styles = colorStyles[score.bandColor];

  if (size === 'small') {
    return (
      <span
        className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${styles.bg} ${styles.border} ${styles.text}`}
        aria-label={`Tracking Health Score: ${score.score} out of 100, ${score.bandLabel}`}
      >
        Score: {score.score}
      </span>
    );
  }

  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const arcLength = circumference * (score.score / 100);

  return (
    <div
      className="flex flex-col items-center text-center"
      aria-label={`Tracking Health Score: ${score.score} out of 100, ${score.bandLabel}. ${score.passedChecks} of ${score.totalChecks} checks passed.`}
    >
      <div className="relative h-[120px] w-[120px]">
        <svg className="h-[120px] w-[120px] -rotate-90" viewBox="0 0 120 120" role="img" aria-hidden="true">
          <circle
            className={styles.track}
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            strokeWidth="8"
          />
          <circle
            className={styles.stroke}
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={`${arcLength} ${circumference}`}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl font-bold text-gray-900">{score.score}</span>
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">/100</span>
        </div>
      </div>
      <div className={`mt-3 rounded-full border px-3 py-1 text-sm font-semibold ${styles.bg} ${styles.border} ${styles.text}`}>
        {score.bandLabel}
      </div>
      <p className="mt-2 text-xs text-gray-500">
        {score.passedChecks}/{score.totalChecks} checks passed
      </p>
    </div>
  );
}
