import { claimAuditRunCount, getOrCreateAuditRunId, startAuditRun } from '@/lib/auditRun';

describe('auditRun (#53)', () => {
  beforeEach(() => {
    sessionStorage.clear();
    let n = 0;
    Object.defineProperty(window, 'crypto', {
      configurable: true,
      value: { randomUUID: jest.fn(() => `run-${++n}`) },
    });
  });

  it('startAuditRun issues a fresh id for every new audit', () => {
    const a = startAuditRun();
    const b = startAuditRun();
    expect(a).not.toBe(b);
    expect(getOrCreateAuditRunId()).toBe(b);
  });

  it('getOrCreateAuditRunId is stable across results-page remounts', () => {
    const first = getOrCreateAuditRunId();
    expect(getOrCreateAuditRunId()).toBe(first);
  });

  it('claimAuditRunCount is true once per run', () => {
    const run = startAuditRun();
    expect(claimAuditRunCount(run)).toBe(true);
    expect(claimAuditRunCount(run)).toBe(false);
    expect(claimAuditRunCount(startAuditRun())).toBe(true);
  });
});
