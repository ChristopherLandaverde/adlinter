'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { clearHistory, deleteEntry, getHistory, type AuditHistoryEntry } from '@/lib/auditHistory';
import { getHealthScoreBand, type HealthScore } from '@/lib/healthScore';
import { getToolBySlug } from '@/lib/tools';
import type { AuditSummary } from '@/lib/types';
import { HealthScoreBadge } from '@/components/HealthScoreBadge';
import { getToolIcon } from '@/components/icons';

const chipStyles: Record<keyof AuditSummary, string> = {
  critical: 'bg-critical/10 text-critical border-critical/20',
  warning: 'bg-warning/10 text-warning border-warning/20',
  info: 'bg-info/10 text-info border-info/20',
  passed: 'bg-pass/10 text-pass border-pass/20',
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
  const ToolIcon = getToolIcon(tool?.iconName ?? 'Search');

  return (
    <article className={`rounded-md border bg-surface p-5 ${selected ? 'border-accent ring-2 ring-accent/10' : 'border-border'}`}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            {compareMode && (
              <input
                type="checkbox"
                checked={selected}
                onChange={() => onToggleCompare(entry)}
                aria-label={`Select ${entry.toolName} for comparison`}
                className="h-4 w-4 rounded border-border text-accent focus:ring-accent"
              />
            )}
            <ToolIcon className="h-6 w-6 text-ink" />
            <div className="min-w-0">
              <h2 className="font-display font-semibold text-ink">{entry.toolName}</h2>
              <p className="text-sm text-muted">{relativeTime(entry.timestamp)}</p>
            </div>
          </div>

          <p className="mt-3 text-sm text-muted">
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
            className="inline-flex h-10 items-center justify-center rounded-sm bg-accent px-4 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
          >
            Open
          </Link>
          <button
            onClick={() => onDelete(entry.id)}
            className="text-sm font-medium text-muted transition-colors hover:text-critical"
          >
            Delete
          </button>
        </div>
      </div>
    </article>
  );
}

function ScoreTrend({ entries }: { entries: AuditHistoryEntry[] }) {
  const scored = entries
    .filter((entry) => typeof entry.score === 'number')
    .slice(0, 8)
    .reverse();

  if (scored.length < 3) return null;

  const width = 520;
  const height = 120;
  const points = scored.map((entry, index) => {
    const x = scored.length === 1 ? 0 : (index / (scored.length - 1)) * width;
    const y = height - ((entry.score ?? 0) / 100) * height;
    return { x, y, score: entry.score ?? 0 };
  });
  const path = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');

  return (
    <section className="mb-6 rounded-md border border-border bg-surface p-5">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase text-muted">Score trend</p>
          <h2 className="font-display text-xl font-semibold text-ink">
            {points[0].score} &rarr; {points[points.length - 1].score}
          </h2>
        </div>
        <span className="text-sm text-muted">Recent audits</span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-24 w-full overflow-visible" role="img" aria-label="Recent score trend">
        <path d={path} fill="none" stroke="var(--accent)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((point, index) => (
          <circle key={index} cx={point.x} cy={point.y} r="4" fill="var(--surface)" stroke="var(--accent)" strokeWidth="2" />
        ))}
      </svg>
    </section>
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
    <main className="flex min-h-screen flex-col bg-bg">
      <header className="border-b border-border bg-surface/85 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm font-medium text-muted transition-colors hover:text-ink"
          >
            <span aria-hidden="true">&larr;</span> Back to Tools
          </Link>
          <div className="flex items-center gap-4">
            {entries.length > 0 && (
              <button
                onClick={handleClear}
                className="text-sm font-medium text-muted transition-colors hover:text-critical"
              >
                Clear history
              </button>
            )}
            <span className="font-display text-xl font-semibold text-accent">AdLint</span>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-10 max-w-4xl flex-1">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-display text-3xl font-semibold text-ink">Audit History</h1>
            <p className="mt-1 text-sm text-muted">Saved locally in this browser.</p>
          </div>
          {entries.length > 1 && (
            <button
              onClick={handleToggleCompareMode}
              className={`inline-flex items-center justify-center rounded-lg border px-4 py-2 text-sm font-semibold transition-colors ${
                compareMode
                  ? 'border-accent/20 bg-accent/10 text-accent hover:bg-accent/15'
                  : 'border-border bg-surface text-ink hover:border-ink/20'
              }`}
            >
              Compare mode
            </button>
          )}
        </div>

        {entries.length === 0 ? (
          <div className="rounded-md border border-border bg-surface p-10 text-center">
            <h2 className="font-display text-xl font-semibold text-ink">No audits yet.</h2>
            <p className="mt-2 text-muted">Pick a tool to get started.</p>
            <Link
              href="/"
              className="mt-6 inline-flex h-10 items-center justify-center rounded-sm bg-accent px-5 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
            >
              Browse tools
            </Link>
          </div>
        ) : (
          <>
            <ScoreTrend entries={entries} />
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
          </>
        )}
      </div>

      {compareMode && selectedEntries.length === 2 && (
        <div className="sticky bottom-0 z-10 border-t border-border bg-surface/95 px-4 py-4 backdrop-blur-sm">
          <div className="container mx-auto flex max-w-4xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-medium text-gray-700">
              2 audits selected for comparison
            </p>
            <Link
              href={compareHref}
              className="inline-flex h-10 items-center justify-center rounded-sm bg-accent px-5 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
            >
              Compare these two
            </Link>
          </div>
        </div>
      )}

      <footer className="border-t border-border py-6">
        <div className="container mx-auto px-4 text-center text-xs text-muted">
          AdLint &mdash; 100% private. All processing happens in your browser.
        </div>
      </footer>
    </main>
  );
}
