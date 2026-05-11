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
      className="inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors"
    >
      <span>Recent audits</span>
      <span className="inline-flex min-w-5 h-5 items-center justify-center rounded-full bg-blue-100 px-1.5 text-xs font-semibold text-blue-700">
        {count}
      </span>
    </Link>
  );
}
