'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { clearHistory, deleteEntry, getHistory, type AuditHistoryEntry } from '@/lib/auditHistory';
import { getHealthScoreBand, type HealthScore } from '@/lib/healthScore';
import { getToolBySlug } from '@/lib/tools';
import type { AuditSummary } from '@/lib/types';
import { HealthScoreBadge } from '@/components/HealthScoreBadge';

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

function scoreFromHistory(entry: AuditHistoryEntry): HealthScore | null {
  if (typeof entry.score !== 'number') return null;

  const summary = entry.results.summary;
  const totalChecks = summary.critical + summary.warning + summary.info + summary.passed;

  return {
    score: entry.score,
    ...getHealthScoreBand(entry.score),
    totalChecks,
    passedChecks: summary.passed,
    weightedPoints: 0,
    maxWeightedPoints: 0,
  };
}

function HistoryCard({
  entry,
  onDelete,
  compareMode,
  selected,
  onToggleCompare,
}: {
  entry: AuditHistoryEntry;
  onDelete: (id: string) => void;
  compareMode: boolean;
  selected: boolean;
  onToggleCompare: (entry: AuditHistoryEntry) => void;
}) {
  const tool = getToolBySlug(entry.toolSlug);
  const healthScore = scoreFromHistory(entry);

  return (
    <article className={`rounded-lg border bg-white p-5 shadow-sm ${selected ? 'border-blue-300 ring-2 ring-blue-100' : 'border-gray-200'}`}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            {compareMode && (
              <input
                type="checkbox"
                checked={selected}
                onChange={() => onToggleCompare(entry)}
                aria-label={`Select ${entry.toolName} for comparison`}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
            )}
            <span className="text-2xl" aria-hidden="true">{tool?.icon ?? '🔍'}</span>
            <div className="min-w-0">
              <h2 className="font-bold text-gray-900">{entry.toolName}</h2>
              <p className="text-sm text-gray-500">{relativeTime(entry.timestamp)}</p>
            </div>
          </div>

          <p className="mt-3 text-sm text-gray-600">
            {entry.fileNames.length > 0 ? entry.fileNames.join(' • ') : '—'}
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {healthScore && <HealthScoreBadge score={healthScore} size="small" />}
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
  const [compareMode, setCompareMode] = useState(false);
  const [selectedEntries, setSelectedEntries] = useState<AuditHistoryEntry[]>([]);

  const refresh = () => setEntries(getHistory());

  useEffect(() => {
    refresh();
  }, []);

  const handleDelete = (id: string) => {
    deleteEntry(id);
    setSelectedEntries((selected) => selected.filter((entry) => entry.id !== id));
    refresh();
  };

  const handleClear = () => {
    if (!window.confirm('Clear all saved audit history?')) return;
    clearHistory();
    setSelectedEntries([]);
    refresh();
  };

  const handleToggleCompareMode = () => {
    setCompareMode((enabled) => {
      if (enabled) setSelectedEntries([]);
      return !enabled;
    });
  };

  const handleToggleCompareEntry = (entry: AuditHistoryEntry) => {
    setSelectedEntries((selected) => {
      if (selected.some((item) => item.id === entry.id)) {
        return selected.filter((item) => item.id !== entry.id);
      }

      return [...selected, entry].slice(-2);
    });
  };

  const compareHref = (() => {
    if (selectedEntries.length !== 2) return '#';
    const [a, b] = [...selectedEntries].sort((left, right) => left.timestamp - right.timestamp);
    return `/compare?a=${encodeURIComponent(a.id)}&b=${encodeURIComponent(b.id)}`;
  })();

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
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Audit History</h1>
            <p className="mt-1 text-sm text-gray-500">Saved locally in this browser.</p>
          </div>
          {entries.length > 1 && (
            <button
              onClick={handleToggleCompareMode}
              className={`inline-flex items-center justify-center rounded-lg border px-4 py-2 text-sm font-semibold transition-colors ${
                compareMode
                  ? 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100'
                  : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              Compare mode
            </button>
          )}
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
              <HistoryCard
                key={entry.id}
                entry={entry}
                onDelete={handleDelete}
                compareMode={compareMode}
                selected={selectedEntries.some((item) => item.id === entry.id)}
                onToggleCompare={handleToggleCompareEntry}
              />
            ))}
          </div>
        )}
      </div>

      {compareMode && selectedEntries.length === 2 && (
        <div className="sticky bottom-0 z-10 border-t border-gray-200 bg-white/95 px-4 py-4 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur-sm">
          <div className="container mx-auto flex max-w-4xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-medium text-gray-700">
              2 audits selected for comparison
            </p>
            <Link
              href={compareHref}
              className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-blue-100 transition-colors hover:bg-blue-700"
            >
              Compare these two
            </Link>
          </div>
        </div>
      )}

      <footer className="border-t border-gray-100 py-6">
        <div className="container mx-auto px-4 text-center text-xs text-gray-400">
          AdLint &mdash; 100% private. All processing happens in your browser.
        </div>
      </footer>
    </main>
  );
}
