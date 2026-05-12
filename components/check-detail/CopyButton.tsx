'use client';

import { useState } from 'react';

export function CopyButton({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [state, setState] = useState<'idle' | 'copied' | 'error'>('idle');

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setState('copied');
      setTimeout(() => setState('idle'), 2000);
    } catch {
      setState('error');
      setTimeout(() => setState('idle'), 2000);
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="inline-flex items-center gap-1.5 rounded-sm border border-border bg-surface px-2 py-1 text-[11px] font-medium text-muted transition-colors hover:border-ink/30 hover:text-ink"
      aria-label={`Copy ${label.toLowerCase()}`}
    >
      {state === 'copied' ? 'Copied' : state === 'error' ? 'Failed' : label}
    </button>
  );
}
