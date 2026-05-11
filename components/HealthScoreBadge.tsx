'use client';

import { useEffect, useState } from 'react';
import type { HealthScore } from '@/lib/healthScore';

interface HealthScoreBadgeProps {
  score: HealthScore;
  size?: 'large' | 'medium' | 'small';
}

function scoreColor(value: number) {
  if (value >= 90) return 'var(--accent)';
  if (value >= 75) return 'var(--pass)';
  if (value >= 50) return 'var(--warning)';
  return 'var(--critical)';
}

export function HealthScoreBadge({ score, size = 'large' }: HealthScoreBadgeProps) {
  const [displayScore, setDisplayScore] = useState(size === 'large' ? 0 : score.score);

  useEffect(() => {
    if (size !== 'large') {
      setDisplayScore(score.score);
      return;
    }

    let frame = 0;
    const duration = 700;
    const start = performance.now();

    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayScore(Math.round(score.score * eased));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [score.score, size]);

  const currentColor = scoreColor(displayScore);

  if (size === 'small') {
    const radius = 20;
    const circumference = 2 * Math.PI * radius;
    const arcLength = circumference * (score.score / 100);

    return (
      <span
        className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-2 py-1 text-xs font-semibold text-ink"
        aria-label={`Tracking Health Score: ${score.score} out of 100, ${score.bandLabel}`}
      >
        <span className="relative h-12 w-12">
          <svg className="h-12 w-12 -rotate-90" viewBox="0 0 48 48" aria-hidden="true">
            <circle cx="24" cy="24" r={radius} fill="none" stroke="var(--border)" strokeWidth="4" />
            <circle
              cx="24"
              cy="24"
              r={radius}
              fill="none"
              stroke={scoreColor(score.score)}
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={`${arcLength} ${circumference}`}
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center font-mono text-xs text-ink">
            {score.score}
          </span>
        </span>
      </span>
    );
  }

  const dimension = size === 'medium' ? 160 : 208;
  const radius = size === 'medium' ? 70 : 92;
  const circumference = 2 * Math.PI * radius;
  const arcLength = circumference * (displayScore / 100);

  return (
    <div
      className="flex flex-col items-center text-center"
      aria-label={`Tracking Health Score: ${score.score} out of 100, ${score.bandLabel}. ${score.passedChecks} of ${score.totalChecks} checks passed.`}
    >
      <div className="relative" style={{ height: dimension, width: dimension }}>
        <svg className="h-full w-full -rotate-90" viewBox={`0 0 ${dimension} ${dimension}`} role="img" aria-hidden="true">
          <circle
            cx={dimension / 2}
            cy={dimension / 2}
            r={radius}
            fill="none"
            stroke="var(--border)"
            strokeWidth="8"
          />
          <circle
            cx={dimension / 2}
            cy={dimension / 2}
            r={radius}
            fill="none"
            stroke={currentColor}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={`${arcLength} ${circumference}`}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`${size === 'medium' ? 'text-[2.75rem]' : 'text-[4rem]'} font-display font-semibold leading-none text-ink`}>{displayScore}</span>
          <span className="mt-1 text-xs font-medium uppercase text-muted">/100</span>
        </div>
      </div>
      <div
        className="mt-4 rounded-full border px-3 py-1 text-sm font-semibold"
        style={{
          color: scoreColor(score.score),
          borderColor: 'color-mix(in srgb, currentColor 20%, transparent)',
          backgroundColor: 'color-mix(in srgb, currentColor 8%, transparent)',
        }}
      >
        {score.bandLabel}
      </div>
      <p className="mt-2 text-xs text-muted">
        {score.passedChecks}/{score.totalChecks} checks passed
      </p>
    </div>
  );
}
