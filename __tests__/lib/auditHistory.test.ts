import {
  clearHistory,
  deleteEntry,
  getEntry,
  getHistory,
  saveEntry,
  type AuditHistoryEntry,
} from '@/lib/auditHistory';
import type { AuditResults } from '@/lib/types';

const STORAGE_KEY = 'adlint:auditHistory';

const emptyResults: AuditResults = {
  gtm: [],
  ads: [],
  cross: [],
  report: [],
  meta: [],
  tiktok: [],
  linkedin: [],
  pinterest: [],
  twitter: [],
  snapchat: [],
  summary: { critical: 0, warning: 0, info: 0, passed: 0 },
};

function entry(overrides: Partial<AuditHistoryEntry> = {}): AuditHistoryEntry {
  return {
    id: 'entry-1',
    timestamp: 1000,
    toolSlug: 'google-ads',
    toolName: 'Google Ads',
    fileNames: ['ads.csv'],
    results: emptyResults,
    sourceData: {},
    ...overrides,
  };
}

function newEntry(overrides: Partial<Omit<AuditHistoryEntry, 'id' | 'timestamp'>> = {}) {
  return {
    toolSlug: 'google-ads',
    toolName: 'Google Ads',
    fileNames: ['ads.csv'],
    results: emptyResults,
    sourceData: {},
    ...overrides,
  };
}

describe('auditHistory', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.spyOn(Date, 'now').mockReturnValue(1700000000000);
    Object.defineProperty(window, 'crypto', {
      configurable: true,
      value: { randomUUID: jest.fn(() => 'generated-id') },
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should return an empty array when history is empty', () => {
    expect(getHistory()).toEqual([]);
  });

  it('should parse entries from localStorage and sort newest first', () => {
    const older = entry({ id: 'older', timestamp: 1000 });
    const newer = entry({ id: 'newer', timestamp: 3000 });
    const middle = entry({ id: 'middle', timestamp: 2000 });
    localStorage.setItem(STORAGE_KEY, JSON.stringify([older, newer, middle]));

    expect(getHistory().map((item) => item.id)).toEqual(['newer', 'middle', 'older']);
  });

  it('should return an empty array on corrupt JSON without throwing', () => {
    localStorage.setItem(STORAGE_KEY, '{not-json');

    expect(() => getHistory()).not.toThrow();
    expect(getHistory()).toEqual([]);
  });

  it('should prepend an entry with a generated id and current timestamp', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([entry({ id: 'existing', timestamp: 1 })]));

    const saved = saveEntry(newEntry({ toolName: 'Saved Audit', score: 81, scoreBand: 'good' }));

    expect(saved).toMatchObject({
      id: 'generated-id',
      timestamp: 1700000000000,
      toolName: 'Saved Audit',
      score: 81,
      scoreBand: 'good',
    });
    expect(getHistory().map((item) => item.id)).toEqual(['generated-id', 'existing']);
  });

  it('should trim saved history to the maximum entry count', () => {
    const existing = Array.from({ length: 20 }, (_, index) =>
      entry({ id: `entry-${index}`, timestamp: 1000 - index }),
    );
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));

    saveEntry(newEntry());

    const history = getHistory();
    expect(history).toHaveLength(20);
    expect(history[0].id).toBe('generated-id');
    expect(history.some((item) => item.id === 'entry-19')).toBe(false);
  });

  it('should return the matching entry or null', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([entry({ id: 'first' }), entry({ id: 'second' })]),
    );

    expect(getEntry('second')?.id).toBe('second');
    expect(getEntry('missing')).toBeNull();
  });

  it('should delete an entry by id', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([entry({ id: 'keep' }), entry({ id: 'remove' })]),
    );

    deleteEntry('remove');

    expect(getHistory().map((item) => item.id)).toEqual(['keep']);
  });

  it('should clear history storage', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([entry()]));

    clearHistory();

    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(getHistory()).toEqual([]);
  });
});
