'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { History } from 'lucide-react';
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
      aria-label="Recent audits"
      className="inline-flex h-10 items-center gap-2 rounded-sm px-2 text-sm font-medium text-muted transition-colors hover:bg-surface-2 hover:text-ink sm:h-auto sm:px-3 sm:py-1.5"
    >
      <History className="h-4 w-4 sm:hidden" aria-hidden="true" />
      <span className="hidden sm:inline">Recent audits</span>
      <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-accent/10 px-1.5 text-xs font-semibold text-accent">
        {count}
      </span>
    </Link>
  );
}
