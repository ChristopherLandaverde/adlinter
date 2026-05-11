import type { AuditContext, AuditResults } from './types';
import type { HealthScore } from './healthScore';

const STORAGE_KEY = 'adlint:auditHistory';
const MAX_ENTRIES = 20;
const CHANGE_EVENT = 'adlint:auditHistoryChanged';

export interface AuditHistoryEntry {
  id: string;
  timestamp: number;
  toolSlug: string;
  toolName: string;
  fileNames: string[];
  context?: AuditContext;
  score?: number;
  scoreBand?: HealthScore['band'];
  results: AuditResults;
  sourceData: {
    gtmData?: unknown;
    adsData?: unknown;
    reportData?: unknown;
    metaData?: unknown;
    tiktokData?: unknown;
    linkedinData?: unknown;
  };
}

function isBrowser() {
  return typeof window !== 'undefined';
}

function createId() {
  if (isBrowser() && window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }
  return `audit-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function writeHistory(entries: AuditHistoryEntry[]) {
  if (!isBrowser()) return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    window.dispatchEvent(new Event(CHANGE_EVENT));
  } catch {
    // localStorage may be unavailable or full. History should never break audits.
  }
}

export function getHistory(): AuditHistoryEntry[] {
  if (!isBrowser()) return [];

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((entry): entry is AuditHistoryEntry => (
        !!entry &&
        typeof entry === 'object' &&
        typeof entry.id === 'string' &&
        typeof entry.timestamp === 'number'
      ))
      .sort((a, b) => b.timestamp - a.timestamp);
  } catch {
    return [];
  }
}

export function saveEntry(entry: Omit<AuditHistoryEntry, 'id' | 'timestamp'>): AuditHistoryEntry {
  const saved: AuditHistoryEntry = {
    ...entry,
    id: createId(),
    timestamp: Date.now(),
  };

  if (!isBrowser()) return saved;

  const entries = [saved, ...getHistory()].slice(0, MAX_ENTRIES);
  writeHistory(entries);
  return saved;
}

export function getEntry(id: string): AuditHistoryEntry | null {
  return getHistory().find((entry) => entry.id === id) ?? null;
}

export function deleteEntry(id: string): void {
  if (!isBrowser()) return;
  writeHistory(getHistory().filter((entry) => entry.id !== id));
}

export function clearHistory(): void {
  if (!isBrowser()) return;

  try {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  } catch {
    // No-op.
  }
}

export function subscribeToHistoryChanges(callback: () => void): () => void {
  if (!isBrowser()) return () => {};

  const handleStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) callback();
  };

  window.addEventListener(CHANGE_EVENT, callback);
  window.addEventListener('storage', handleStorage);

  return () => {
    window.removeEventListener(CHANGE_EVENT, callback);
    window.removeEventListener('storage', handleStorage);
  };
}
