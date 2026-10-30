/**
 * #53: leaving /audit (e.g. "Learn more") and coming back with the browser
 * back button remounts the results page. The remount must not save the same
 * audit run to history again.
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { render, screen, waitFor } from '@testing-library/react';
import AuditPage from '@/app/audit/page';
import { clearHistory, getHistory } from '@/lib/auditHistory';
import { startAuditRun } from '@/lib/auditRun';
import { parseGTMJSON } from '@/lib/parsers/gtmParser';

// Stable references: the page's load effect depends on router and searchParams.
const mockRouter = { push: jest.fn() };
const mockSearchParams = new URLSearchParams();
jest.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
  useSearchParams: () => mockSearchParams,
}));

jest.mock('recharts', () => {
  const Stub = ({ children }: { children?: React.ReactNode }) => <div>{children}</div>;
  return new Proxy({}, { get: () => Stub });
});

const sampleGtm = parseGTMJSON(
  readFileSync(join(__dirname, '..', '..', 'public', 'samples', 'gtm-container-sample.json'), 'utf8'),
);

async function mountResultsPage() {
  const view = render(<AuditPage />);
  await waitFor(() => expect(getHistory().length).toBeGreaterThan(0));
  await screen.findAllByText(/Learn more/i);
  view.unmount();
}

describe('/audit history saving (#53)', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    clearHistory();
    sessionStorage.setItem('gtmData', JSON.stringify(sampleGtm));
  });

  it('saves one entry when the results page remounts for the same audit run', async () => {
    startAuditRun();
    await mountResultsPage();
    await mountResultsPage(); // browser back from a check explainer

    expect(getHistory()).toHaveLength(1);
  });

  it('counts the audit once per run, not once per mount', async () => {
    startAuditRun();
    await mountResultsPage();
    await mountResultsPage();

    expect(localStorage.getItem('adlint_audit_count')).toBe('1');
  });

  it('saves a second entry when the user starts a new audit', async () => {
    startAuditRun();
    await mountResultsPage();
    startAuditRun();
    await mountResultsPage();

    expect(getHistory()).toHaveLength(2);
  });
});
