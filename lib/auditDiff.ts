import type { AuditHistoryEntry } from './auditHistory';
import type { AuditCheck, AuditResults, Severity } from './types';

type Source = 'gtm' | 'ads' | 'cross' | 'report' | 'meta' | 'tiktok';

export interface CheckChange {
  id: string;
  title: string;
  source: Source;
  delta: 'now-failing' | 'now-passing' | 'severity-up' | 'severity-down' | 'added' | 'removed';
  severityA?: Severity;
  severityB?: Severity;
  passedA?: boolean;
  passedB?: boolean;
}

export interface AuditDiff {
  a: AuditHistoryEntry;
  b: AuditHistoryEntry;
  scoreDelta: number;
  changes: CheckChange[];
  totals: {
    fixed: number;
    regressed: number;
    severityUp: number;
    severityDown: number;
    added: number;
    removed: number;
  };
}

interface TaggedCheck extends AuditCheck {
  source: Source;
}

const sources: Source[] = ['gtm', 'ads', 'cross', 'report', 'meta', 'tiktok'];

const severityRank: Record<Severity, number> = {
  critical: 3,
  warning: 2,
  info: 1,
};

const deltaPriority: Record<CheckChange['delta'], number> = {
  'now-failing': 0,
  'severity-up': 1,
  'now-passing': 2,
  'severity-down': 3,
  added: 4,
  removed: 5,
};

function allChecks(results: AuditResults): TaggedCheck[] {
  return sources.flatMap((source) =>
    results[source].map((check) => ({ ...check, source })),
  );
}

function checkMap(results: AuditResults) {
  return new Map(allChecks(results).map((check) => [check.id, check]));
}

function sortSeverity(change: CheckChange) {
  const severity = change.delta === 'now-passing' ||
    change.delta === 'severity-down' ||
    change.delta === 'removed'
    ? change.severityA ?? change.severityB ?? 'info'
    : change.severityB ?? change.severityA ?? 'info';
  return severityRank[severity];
}

function sortChanges(a: CheckChange, b: CheckChange) {
  const deltaDiff = deltaPriority[a.delta] - deltaPriority[b.delta];
  if (deltaDiff !== 0) return deltaDiff;

  const severityDiff = sortSeverity(b) - sortSeverity(a);
  if (severityDiff !== 0) return severityDiff;

  return a.title.localeCompare(b.title);
}

export function diffAudits(a: AuditHistoryEntry, b: AuditHistoryEntry): AuditDiff {
  const aChecks = checkMap(a.results);
  const bChecks = checkMap(b.results);
  const ids = new Set([...aChecks.keys(), ...bChecks.keys()]);
  const changes: CheckChange[] = [];

  for (const id of ids) {
    const checkA = aChecks.get(id);
    const checkB = bChecks.get(id);

    if (!checkA && checkB) {
      changes.push({
        id,
        title: checkB.title,
        source: checkB.source,
        delta: 'added',
        severityB: checkB.severity,
        passedB: checkB.passed,
      });
      continue;
    }

    if (checkA && !checkB) {
      changes.push({
        id,
        title: checkA.title,
        source: checkA.source,
        delta: 'removed',
        severityA: checkA.severity,
        passedA: checkA.passed,
      });
      continue;
    }

    if (!checkA || !checkB) continue;

    if (checkA.passed && !checkB.passed) {
      changes.push({
        id,
        title: checkB.title,
        source: checkB.source,
        delta: 'now-failing',
        severityA: checkA.severity,
        severityB: checkB.severity,
        passedA: checkA.passed,
        passedB: checkB.passed,
      });
      continue;
    }

    if (!checkA.passed && checkB.passed) {
      changes.push({
        id,
        title: checkB.title,
        source: checkB.source,
        delta: 'now-passing',
        severityA: checkA.severity,
        severityB: checkB.severity,
        passedA: checkA.passed,
        passedB: checkB.passed,
      });
      continue;
    }

    if (!checkA.passed && !checkB.passed) {
      const severityDelta = severityRank[checkB.severity] - severityRank[checkA.severity];

      if (severityDelta > 0 || severityDelta < 0) {
        changes.push({
          id,
          title: checkB.title,
          source: checkB.source,
          delta: severityDelta > 0 ? 'severity-up' : 'severity-down',
          severityA: checkA.severity,
          severityB: checkB.severity,
          passedA: checkA.passed,
          passedB: checkB.passed,
        });
      }
    }
  }

  changes.sort(sortChanges);

  return {
    a,
    b,
    scoreDelta: typeof a.score === 'number' && typeof b.score === 'number' ? b.score - a.score : 0,
    changes,
    totals: {
      fixed: changes.filter((change) => change.delta === 'now-passing').length,
      regressed: changes.filter((change) => change.delta === 'now-failing').length,
      severityUp: changes.filter((change) => change.delta === 'severity-up').length,
      severityDown: changes.filter((change) => change.delta === 'severity-down').length,
      added: changes.filter((change) => change.delta === 'added').length,
      removed: changes.filter((change) => change.delta === 'removed').length,
    },
  };
}
