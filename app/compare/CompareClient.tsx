'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { diffAudits, type CheckChange } from '@/lib/auditDiff';
import { getEntry, type AuditHistoryEntry } from '@/lib/auditHistory';
import { getHealthScoreBand, type HealthScore } from '@/lib/healthScore';
import type { AuditSummary, Severity } from '@/lib/types';
import { CheckLearnMoreLink } from '@/components/CheckLearnMoreLink';
import { HealthScoreBadge } from '@/components/HealthScoreBadge';

type Source = CheckChange['source'];

const sourceConfig: Record<Source, { label: string; badge: string }> = {
  gtm: { label: 'GTM', badge: 'bg-purple-100 text-purple-700' },
  ads: { label: 'Ads', badge: 'bg-sky-100 text-sky-700' },
  cross: { label: 'Cross-Check', badge: 'bg-orange-100 text-orange-700' },
  report: { label: 'Report', badge: 'bg-teal-100 text-teal-700' },
  meta: { label: 'Meta', badge: 'bg-blue-100 text-blue-700' },
  tiktok: { label: 'TikTok', badge: 'bg-pink-100 text-pink-700' },
};

const severityStyles: Record<Severity, string> = {
  critical: 'bg-red-100 text-red-700',
  warning: 'bg-amber-100 text-amber-700',
  info: 'bg-blue-100 text-blue-700',
};

const totalCards = [
  { key: 'fixed', label: 'Fixed', className: 'border-green-200 bg-green-50 text-green-700' },
  { key: 'regressed', label: 'Regressed', className: 'border-red-200 bg-red-50 text-red-700' },
  { key: 'severityUp', label: 'Severity worse', className: 'border-amber-200 bg-amber-50 text-amber-700' },
  { key: 'severityDown', label: 'Severity better', className: 'border-blue-200 bg-blue-50 text-blue-700' },
  { key: 'added', label: 'Added checks', className: 'border-gray-200 bg-gray-50 text-gray-700' },
  { key: 'removed', label: 'Removed checks', className: 'border-gray-200 bg-gray-50 text-gray-700' },
] as const;

const groups: Array<{
  title: string;
  delta: CheckChange['delta'];
  className: string;
}> = [
  { title: 'Regressions', delta: 'now-failing', className: 'text-red-700' },
  { title: 'Fixes', delta: 'now-passing', className: 'text-green-700' },
  { title: 'Severity worse', delta: 'severity-up', className: 'text-amber-700' },
  { title: 'Severity better', delta: 'severity-down', className: 'text-blue-700' },
  { title: 'Added checks', delta: 'added', className: 'text-gray-700' },
  { title: 'Removed checks', delta: 'removed', className: 'text-gray-700' },
];

function scoreFromHistory(entry: AuditHistoryEntry): HealthScore | null {
  if (typeof entry.score !== 'number') return null;

  const summary: AuditSummary = entry.results.summary;
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

function formatDate(timestamp: number) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(timestamp);
}

function formatFiles(fileNames: string[]) {
  if (fileNames.length === 0) return '-';
  const joined = fileNames.join(' / ');
  return joined.length > 90 ? `${joined.slice(0, 87)}...` : joined;
}

function transitionLabel(change: CheckChange) {
  const from = change.passedA ? 'passed' : change.severityA;
  const to = change.passedB ? 'passed' : change.severityB;
  return `${from ?? 'not run'} -> ${to ?? 'not run'}`;
}

function ScorePanel({ label, entry, score }: { label: string; entry: AuditHistoryEntry; score: HealthScore | null }) {
  return (
    <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
          <h2 className="mt-1 text-lg font-bold text-gray-900">{entry.toolName}</h2>
        </div>
        <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-600">
          {formatDate(entry.timestamp)}
        </span>
      </div>
      {score ? (
        <HealthScoreBadge score={score} />
      ) : (
        <div className="flex h-[180px] items-center justify-center rounded-lg border border-dashed border-gray-300 text-sm font-medium text-gray-500">
          No saved score
        </div>
      )}
      <div className="mt-5 border-t border-gray-100 pt-4 text-sm text-gray-600">
        <p className="font-medium text-gray-900">{entry.toolName}</p>
        <p className="mt-1 break-words">{formatFiles(entry.fileNames)}</p>
      </div>
    </section>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <div className="container mx-auto max-w-4xl px-4 py-10">
        <Link href="/history" className="text-sm font-medium text-gray-500 hover:text-gray-900">
          &larr; Back to history
        </Link>
        <div className="mt-8 rounded-lg border border-gray-200 bg-white p-10 text-center shadow-sm">
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          <p className="mt-2 text-gray-600">{body}</p>
          <Link
            href="/history"
            className="mt-6 inline-flex items-center justify-center rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-blue-100 transition-colors hover:bg-blue-700"
          >
            Choose audits
          </Link>
        </div>
      </div>
    </main>
  );
}

function SeverityChip({ severity }: { severity?: Severity }) {
  if (!severity) return null;

  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${severityStyles[severity]}`}>
      {severity}
    </span>
  );
}

function ChangeRow({ change }: { change: CheckChange }) {
  const source = sourceConfig[change.source];

  return (
    <li className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h3 className="font-semibold text-gray-900">{change.title}</h3>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${source.badge}`}>
              {source.label}
            </span>
            <SeverityChip severity={change.severityA} />
            <span className="text-xs font-medium text-gray-400">-&gt;</span>
            <SeverityChip severity={change.severityB} />
            <span className="text-xs font-medium text-gray-500">{transitionLabel(change)}</span>
          </div>
        </div>
        <CheckLearnMoreLink id={change.id} />
      </div>
    </li>
  );
}

export function CompareClient() {
  const searchParams = useSearchParams();
  const aId = searchParams.get('a');
  const bId = searchParams.get('b');

  if (!aId || !bId) {
    return (
      <EmptyState
        title="Choose two audits to compare"
        body="Compare mode on the history page will build the comparison link for you."
      />
    );
  }

  if (aId === bId) {
    return (
      <EmptyState
        title="You're comparing an audit to itself"
        body="Pick two different history entries to see what changed."
      />
    );
  }

  const first = getEntry(aId);
  const second = getEntry(bId);

  if (!first || !second) {
    return (
      <EmptyState
        title="Comparison audit not found"
        body="One of these saved audits is no longer in local history."
      />
    );
  }

  const [older, newer] = first.timestamp <= second.timestamp ? [first, second] : [second, first];
  const diff = diffAudits(older, newer);
  const scoreA = scoreFromHistory(diff.a);
  const scoreB = scoreFromHistory(diff.b);
  const hasScoreDelta = scoreA && scoreB;
  const deltaText = hasScoreDelta
    ? `${diff.scoreDelta > 0 ? '+' : ''}${diff.scoreDelta}`
    : '—';
  const deltaClass = diff.scoreDelta > 0
    ? 'text-green-700'
    : diff.scoreDelta < 0
      ? 'text-red-700'
      : 'text-gray-700';

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <header className="border-b border-gray-200 bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto flex items-center justify-between gap-4 px-4 py-4">
          <Link href="/history" className="text-sm font-medium text-gray-500 transition-colors hover:text-gray-900">
            &larr; Back to history
          </Link>
          <span className="text-xl font-bold text-blue-600">AdLint</span>
        </div>
      </header>

      <div className="container mx-auto max-w-6xl px-4 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Audit comparison</h1>
          <p className="mt-1 text-sm text-gray-500">
            Older audit on the left, newer audit on the right.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-[1fr_auto_1fr] md:items-center">
          <ScorePanel label="Baseline" entry={diff.a} score={scoreA} />
          <div className="flex items-center justify-center rounded-lg border border-gray-200 bg-white px-6 py-4 text-center shadow-sm">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Score delta</p>
              <p className={`mt-1 text-4xl font-bold ${deltaClass}`}>{deltaText}</p>
              <p className="mt-1 text-xs text-gray-500">A -&gt; B</p>
            </div>
          </div>
          <ScorePanel label="Current" entry={diff.b} score={scoreB} />
        </div>

        <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          {totalCards.map((card) => (
            <div key={card.key} className={`rounded-lg border p-4 ${card.className}`}>
              <p className="text-2xl font-bold">{diff.totals[card.key]}</p>
              <p className="mt-1 text-xs font-semibold uppercase tracking-wide">{card.label}</p>
            </div>
          ))}
        </section>

        <section className="mt-8">
          <h2 className="text-xl font-bold text-gray-900">Changes</h2>
          {diff.changes.length === 0 ? (
            <div className="mt-4 rounded-lg border border-gray-200 bg-white p-8 text-center shadow-sm">
              <p className="font-semibold text-gray-900">No check changes found.</p>
              <p className="mt-1 text-sm text-gray-600">These audits have the same pass/fail and severity state.</p>
            </div>
          ) : (
            <div className="mt-4 space-y-8">
              {groups.map((group) => {
                const changes = diff.changes.filter((change) => change.delta === group.delta);
                if (changes.length === 0) return null;

                return (
                  <div key={group.delta}>
                    <h3 className={`mb-3 text-sm font-bold uppercase tracking-wide ${group.className}`}>
                      {group.title} ({changes.length})
                    </h3>
                    <ul className="space-y-3">
                      {changes.map((change) => (
                        <ChangeRow key={`${change.delta}-${change.id}`} change={change} />
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
