'use client';

import { useEffect, useState } from 'react';
import type { HealthScore } from '@/lib/healthScore';

interface ShareAuditButtonProps {
  score: HealthScore;
}

const SHARE_URL = 'https://adlint.dev';

export function ShareAuditButton({ score }: ShareAuditButtonProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;

    const timeout = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(timeout);
  }, [copied]);

  async function handleShare() {
    const title = 'AdLint Tracking Health Score';
    const shareText = `My AdLint Tracking Health Score: ${score.score}/100 (${score.bandLabel})`;
    const copyText = `AdLint Tracking Health Score: ${score.score}/100 — ${score.bandLabel} — audit yours at ${SHARE_URL}`;

    try {
      if (navigator.share) {
        await navigator.share({ title, text: shareText, url: SHARE_URL });
        return;
      }

      await navigator.clipboard.writeText(copyText);
      setCopied(true);
    } catch {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(copyText);
        setCopied(true);
      }
    }
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      className="inline-flex h-10 items-center justify-center rounded-sm border border-border bg-surface px-4 text-sm font-medium text-ink transition-colors hover:border-ink/20"
    >
      {copied ? 'Copied!' : 'Share results'}
    </button>
  );
}
