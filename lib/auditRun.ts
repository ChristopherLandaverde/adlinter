/**
 * An audit run is one click of "Run audit" / "Try with sample data" (or a
 * restore from history). The results page at /audit can mount many times for
 * the same run: browser back from a check explainer, a refresh, a re-render.
 * Side effects that belong to the run (saving it to history, counting it
 * against the free-audit threshold) are keyed by this id so they happen once
 * per run, not once per mount (#53).
 *
 * The id lives in sessionStorage next to the audit inputs, so it survives
 * navigation within the tab and is scoped to it.
 */

const RUN_ID_KEY = 'auditRunId';
const COUNTED_RUN_KEY = 'auditCountedRunId';

function createRunId(): string {
  if (typeof window !== 'undefined' && window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }
  return `run-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/** Call when the user starts a new audit, before navigating to /audit. */
export function startAuditRun(): string {
  const id = createRunId();
  try {
    sessionStorage.setItem(RUN_ID_KEY, id);
  } catch {
    // sessionStorage unavailable; the results page will mint its own id.
  }
  return id;
}

/** Point the current run at an existing id (e.g. an audit restored from history). */
export function setAuditRunId(id: string): void {
  try {
    sessionStorage.setItem(RUN_ID_KEY, id);
  } catch {
    // No-op.
  }
}

/**
 * The current run's id. Mints and stores one if the results page was reached
 * without startAuditRun() (older tabs, direct navigation), so later remounts of
 * the same page still share it.
 */
export function getOrCreateAuditRunId(): string {
  try {
    const existing = sessionStorage.getItem(RUN_ID_KEY);
    if (existing) return existing;
  } catch {
    return createRunId();
  }
  return startAuditRun();
}

/** True the first time it is called for a run, false after. */
export function claimAuditRunCount(runId: string): boolean {
  try {
    if (sessionStorage.getItem(COUNTED_RUN_KEY) === runId) return false;
    sessionStorage.setItem(COUNTED_RUN_KEY, runId);
  } catch {
    // Without sessionStorage we cannot dedupe; count it.
  }
  return true;
}
