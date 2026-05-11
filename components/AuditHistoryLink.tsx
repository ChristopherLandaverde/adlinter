'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getHistory, subscribeToHistoryChanges } from '@/lib/auditHistory';

export function AuditHistoryLink() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const refresh = () => setCount(getHistory().length);
    refresh();
    return subscribeToHistoryChanges(refresh);
  }, []);

  if (count === 0) return null;

  return (
    <Link
      href="/history"
      className="inline-flex items-center gap-2 rounded-sm px-3 py-1.5 text-sm font-medium text-muted transition-colors hover:bg-surface-2 hover:text-ink"
    >
      <span>Recent audits</span>
      <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-accent/10 px-1.5 text-xs font-semibold text-accent">
        {count}
      </span>
    </Link>
  );
}
