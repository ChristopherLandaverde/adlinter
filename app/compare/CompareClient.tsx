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
  gtm: { label: 'GTM', badge: 'bg-surface-2 text-muted' },
  ads: { label: 'Ads', badge: 'bg-surface-2 text-muted' },
  cross: { label: 'Cross-Check', badge: 'bg-surface-2 text-muted' },
  report: { label: 'Report', badge: 'bg-surface-2 text-muted' },
  meta: { label: 'Meta', badge: 'bg-surface-2 text-muted' },
  tiktok: { label: 'TikTok', badge: 'bg-surface-2 text-muted' },
  linkedin: { label: 'LinkedIn', badge: 'bg-surface-2 text-muted' },
};

const severityStyles: Record<Severity, string> = {
  critical: 'bg-critical/10 text-critical',
  warning: 'bg-warning/10 text-warning',
  info: 'bg-info/10 text-info',
};

const totalCards = [
  { key: 'fixed', label: 'Fixed', className: 'border-pass/20 bg-pass/5 text-pass' },
  { key: 'regressed', label: 'Regressed', className: 'border-critical/20 bg-critical/5 text-critical' },
  { key: 'severityUp', label: 'Severity worse', className: 'border-warning/20 bg-warning/5 text-warning' },
  { key: 'severityDown', label: 'Severity better', className: 'border-accent/20 bg-accent/5 text-accent' },
  { key: 'added', label: 'Added checks', className: 'border-border bg-surface text-muted' },
  { key: 'removed', label: 'Removed checks', className: 'border-border bg-surface text-muted' },
] as const;

const groups: Array<{
  title: string;
  delta: CheckChange['delta'];
  className: string;
}> = [
  { title: 'Regressions', delta: 'now-failing', className: 'text-critical' },
  { title: 'Fixes', delta: 'now-passing', className: 'text-pass' },
  { title: 'Severity worse', delta: 'severity-up', className: 'text-warning' },
  { title: 'Severity better', delta: 'severity-down', className: 'text-accent' },
  { title: 'Added checks', delta: 'added', className: 'text-muted' },
  { title: 'Removed checks', delta: 'removed', className: 'text-muted' },
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
    <section className="rounded-md border border-border bg-surface p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase text-muted">{label}</p>
          <h2 className="mt-1 font-display text-lg font-semibold text-ink">{entry.toolName}</h2>
        </div>
        <span className="rounded-full bg-surface-2 px-2.5 py-1 text-xs font-semibold text-muted">
          {formatDate(entry.timestamp)}
        </span>
      </div>
      {score ? (
        <HealthScoreBadge score={score} size="medium" />
      ) : (
        <div className="flex h-[180px] items-center justify-center rounded-md border border-dashed border-border text-sm font-medium text-muted">
          No saved score
        </div>
      )}
      <div className="mt-5 border-t border-border pt-4 text-sm text-muted">
        <p className="font-medium text-ink">{entry.toolName}</p>
        <p className="mt-1 break-words">{formatFiles(entry.fileNames)}</p>
      </div>
    </section>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <main className="min-h-screen bg-bg">
      <div className="container mx-auto max-w-4xl px-4 py-10">
        <Link href="/history" className="text-sm font-medium text-muted hover:text-ink">
          &larr; Back to history
        </Link>
        <div className="mt-8 rounded-md border border-border bg-surface p-10 text-center">
          <h1 className="font-display text-2xl font-semibold text-ink">{title}</h1>
          <p className="mt-2 text-muted">{body}</p>
          <Link
            href="/history"
            className="mt-6 inline-flex h-10 items-center justify-center rounded-sm bg-accent px-5 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
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
    <li className="rounded-md border border-border bg-surface p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h3 className="font-display font-semibold text-ink">{change.title}</h3>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${source.badge}`}>
              {source.label}
            </span>
            <SeverityChip severity={change.severityA} />
            <span className="text-xs font-medium text-muted">-&gt;</span>
            <SeverityChip severity={change.severityB} />
            <span className="text-xs font-medium text-muted">{transitionLabel(change)}</span>
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
    ? 'text-pass'
    : diff.scoreDelta < 0
      ? 'text-critical'
      : 'text-muted';

  return (
    <main className="min-h-screen bg-bg">
      <header className="border-b border-border bg-surface/85 backdrop-blur-sm">
        <div className="container mx-auto flex items-center justify-between gap-4 px-4 py-4">
          <Link href="/history" className="text-sm font-medium text-muted transition-colors hover:text-ink">
            &larr; Back to history
          </Link>
          <span className="font-display text-xl font-semibold text-accent">AdLint</span>
        </div>
      </header>

      <div className="container mx-auto max-w-6xl px-4 py-10">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-semibold text-ink">Audit comparison</h1>
          <p className="mt-1 text-sm text-muted">
            Older audit on the left, newer audit on the right.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-[1fr_auto_1fr] md:items-center">
          <ScorePanel label="Baseline" entry={diff.a} score={scoreA} />
          <div className="flex items-center justify-center rounded-md border border-border bg-surface px-8 py-8 text-center">
            <div>
              <p className="text-xs font-semibold uppercase text-muted">Score delta</p>
              <p className={`mt-1 font-display text-6xl font-semibold ${deltaClass}`}>{diff.scoreDelta > 0 ? '↑ ' : diff.scoreDelta < 0 ? '↓ ' : ''}{deltaText}</p>
              <p className="mt-1 text-xs text-muted">Baseline &rarr; current</p>
            </div>
          </div>
          <ScorePanel label="Current" entry={diff.b} score={scoreB} />
        </div>

        <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          {totalCards.map((card) => (
            <div key={card.key} className={`rounded-lg border p-4 ${card.className}`}>
              <p className="font-display text-2xl font-semibold">{diff.totals[card.key]}</p>
              <p className="mt-1 text-xs font-semibold uppercase tracking-wide">{card.label}</p>
            </div>
          ))}
        </section>

        <section className="mt-8">
          <h2 className="font-display text-xl font-semibold text-ink">Changes</h2>
          {diff.changes.length === 0 ? (
            <div className="mt-4 rounded-md border border-border bg-surface p-8 text-center">
              <p className="font-semibold text-ink">No check changes found.</p>
              <p className="mt-1 text-sm text-muted">These audits have the same pass/fail and severity state.</p>
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
