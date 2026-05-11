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
      className="inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
    >
      {copied ? 'Copied!' : 'Share results'}
    </button>
  );
}
