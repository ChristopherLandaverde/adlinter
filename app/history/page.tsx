'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { clearHistory, deleteEntry, getHistory, type AuditHistoryEntry } from '@/lib/auditHistory';
import { getToolBySlug } from '@/lib/tools';
import type { AuditSummary } from '@/lib/types';

const chipStyles: Record<keyof AuditSummary, string> = {
  critical: 'bg-red-100 text-red-700 border-red-200',
  warning: 'bg-amber-100 text-amber-700 border-amber-200',
  info: 'bg-blue-100 text-blue-700 border-blue-200',
  passed: 'bg-green-100 text-green-700 border-green-200',
};

function relativeTime(timestamp: number) {
  const diff = Date.now() - timestamp;
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  const week = 7 * day;

  if (diff < minute) return 'just now';
  if (diff < hour) {
    const minutes = Math.floor(diff / minute);
    return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  }
  if (diff < day) {
    const hours = Math.floor(diff / hour);
    return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  }
  if (diff < week) {
    const days = Math.floor(diff / day);
    return `${days} day${days === 1 ? '' : 's'} ago`;
  }

  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(timestamp);
}

function SeverityChips({ summary }: { summary: AuditSummary }) {
  return (
    <div className="flex flex-wrap gap-2">
      {(Object.keys(summary) as Array<keyof AuditSummary>).map((key) => (
        <span
          key={key}
          className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${chipStyles[key]}`}
        >
          <span className="capitalize">{key}</span>
          <span>{summary[key]}</span>
        </span>
      ))}
    </div>
  );
}

function HistoryCard({ entry, onDelete }: { entry: AuditHistoryEntry; onDelete: (id: string) => void }) {
  const tool = getToolBySlug(entry.toolSlug);

  return (
    <article className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            <span className="text-2xl" aria-hidden="true">{tool?.icon ?? '🔍'}</span>
            <div className="min-w-0">
              <h2 className="font-bold text-gray-900">{entry.toolName}</h2>
              <p className="text-sm text-gray-500">{relativeTime(entry.timestamp)}</p>
            </div>
          </div>

          <p className="mt-3 text-sm text-gray-600">
            {entry.fileNames.length > 0 ? entry.fileNames.join(' • ') : '—'}
          </p>

          <div className="mt-4">
            <SeverityChips summary={entry.results.summary} />
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <Link
            href={`/audit?restore=${encodeURIComponent(entry.id)}`}
            className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-blue-100 hover:bg-blue-700 transition-colors"
          >
            Open
          </Link>
          <button
            onClick={() => onDelete(entry.id)}
            className="text-sm font-medium text-gray-500 hover:text-red-600 transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </article>
  );
}

export default function HistoryPage() {
  const [entries, setEntries] = useState<AuditHistoryEntry[]>([]);

  const refresh = () => setEntries(getHistory());

  useEffect(() => {
    refresh();
  }, []);

  const handleDelete = (id: string) => {
    deleteEntry(id);
    refresh();
  };

  const handleClear = () => {
    if (!window.confirm('Clear all saved audit history?')) return;
    clearHistory();
    refresh();
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex flex-col">
      <header className="border-b border-gray-200 bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <Link
            href="/"
            className="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors text-sm font-medium"
          >
            <span aria-hidden="true">&larr;</span> Back to Tools
          </Link>
          <div className="flex items-center gap-4">
            {entries.length > 0 && (
              <button
                onClick={handleClear}
                className="text-sm font-medium text-gray-500 hover:text-red-600 transition-colors"
              >
                Clear history
              </button>
            )}
            <span className="text-xl font-bold text-blue-600">AdLint</span>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-10 max-w-4xl flex-1">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Audit History</h1>
          <p className="mt-1 text-sm text-gray-500">Saved locally in this browser.</p>
        </div>

        {entries.length === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-white p-10 text-center shadow-sm">
            <h2 className="text-xl font-bold text-gray-900">No audits yet.</h2>
            <p className="mt-2 text-gray-600">Pick a tool to get started.</p>
            <Link
              href="/"
              className="mt-6 inline-flex items-center justify-center rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-blue-100 hover:bg-blue-700 transition-colors"
            >
              Browse tools
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {entries.map((entry) => (
              <HistoryCard key={entry.id} entry={entry} onDelete={handleDelete} />
            ))}
          </div>
        )}
      </div>

      <footer className="border-t border-gray-100 py-6">
        <div className="container mx-auto px-4 text-center text-xs text-gray-400">
          AdLint &mdash; 100% private. All processing happens in your browser.
        </div>
      </footer>
    </main>
  );
}
