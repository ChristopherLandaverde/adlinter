import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import HistoryPage from '@/app/history/page';
import { clearHistory, saveEntry } from '@/lib/auditHistory';
import type { AuditResults } from '@/lib/types';

const emptyResults: AuditResults = {
  gtm: [],
  ads: [],
  cross: [],
  report: [],
  meta: [],
  tiktok: [],
  summary: { critical: 0, warning: 0, info: 0, passed: 0 },
};

function saveAudit({
  toolName,
  toolSlug = 'gtm-auditor',
  fileNames = ['audit.csv'],
  summary,
  now,
  score,
}: {
  toolName: string;
  toolSlug?: string;
  fileNames?: string[];
  summary: AuditResults['summary'];
  now: number;
  score?: number;
}) {
  jest.spyOn(Date, 'now').mockReturnValueOnce(now);
  return saveEntry({
    toolSlug,
    toolName,
    fileNames,
    score,
    results: { ...emptyResults, summary },
    sourceData: {},
  });
}

describe('HistoryPage', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.restoreAllMocks();
  });

  afterEach(() => {
    clearHistory();
    jest.restoreAllMocks();
  });

  it('shows empty-state copy and a link home when history is empty', async () => {
    render(<HistoryPage />);

    expect(await screen.findByRole('heading', { name: 'No audits yet.' })).toBeInTheDocument();
    expect(screen.getByText('Pick a tool to get started.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Browse tools' })).toHaveAttribute('href', '/');
  });

  it('lists saved audits in newest-first order', async () => {
    saveAudit({ toolName: 'Old Audit', summary: { critical: 1, warning: 0, info: 0, passed: 3 }, now: 1000 });
    saveAudit({ toolName: 'Newest Audit', summary: { critical: 0, warning: 2, info: 1, passed: 7 }, now: 3000 });
    saveAudit({ toolName: 'Middle Audit', summary: { critical: 0, warning: 1, info: 2, passed: 4 }, now: 2000 });

    const { container } = render(<HistoryPage />);

    await screen.findByText('Newest Audit');
    const cards = Array.from(container.querySelectorAll('article'));
    expect(cards).toHaveLength(3);
    expect(within(cards[0]).getByText('Newest Audit')).toBeInTheDocument();
    expect(within(cards[1]).getByText('Middle Audit')).toBeInTheDocument();
    expect(within(cards[2]).getByText('Old Audit')).toBeInTheDocument();
  });

  it('renders severity chips with each entry summary count', async () => {
    saveAudit({
      toolName: 'Severity Audit',
      summary: { critical: 2, warning: 3, info: 4, passed: 5 },
      now: 1000,
    });

    const { container } = render(<HistoryPage />);

    const card = await waitFor(() => container.querySelector('article') as HTMLElement);
    expect(within(card).getByText('critical')).toBeInTheDocument();
    expect(within(card).getByText('2')).toBeInTheDocument();
    expect(within(card).getByText('warning')).toBeInTheDocument();
    expect(within(card).getByText('3')).toBeInTheDocument();
    expect(within(card).getByText('info')).toBeInTheDocument();
    expect(within(card).getByText('4')).toBeInTheDocument();
    expect(within(card).getByText('passed')).toBeInTheDocument();
    expect(within(card).getByText('5')).toBeInTheDocument();
  });

  it('renders a saved tracking health score when present', async () => {
    saveAudit({
      toolName: 'Scored Audit',
      summary: { critical: 1, warning: 2, info: 0, passed: 8 },
      now: 1000,
      score: 81,
    });

    render(<HistoryPage />);

    expect(await screen.findByLabelText('Tracking Health Score: 81 out of 100, Good')).toBeInTheDocument();
    expect(screen.getByText('Score: 81')).toBeInTheDocument();
  });

  it('adds restore links that include each audit id', async () => {
    const saved = saveAudit({
      toolName: 'Restorable Audit',
      summary: { critical: 0, warning: 0, info: 0, passed: 1 },
      now: 1000,
    });

    render(<HistoryPage />);

    expect(await screen.findByRole('link', { name: 'Open' })).toHaveAttribute(
      'href',
      `/audit?restore=${saved.id}`,
    );
  });

  it('renders uploaded file names and an empty dash fallback', async () => {
    saveAudit({
      toolName: 'Named Files',
      fileNames: ['container.json', 'ads.csv'],
      summary: { critical: 0, warning: 0, info: 0, passed: 1 },
      now: 2000,
    });
    saveAudit({
      toolName: 'No Files',
      fileNames: [],
      summary: { critical: 0, warning: 0, info: 0, passed: 1 },
      now: 1000,
    });

    render(<HistoryPage />);

    expect(await screen.findByText('container.json • ads.csv')).toBeInTheDocument();
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('deletes one card and re-renders without that entry', async () => {
    const user = userEvent.setup();
    saveAudit({ toolName: 'Keep Audit', summary: { critical: 0, warning: 0, info: 0, passed: 1 }, now: 1000 });
    saveAudit({ toolName: 'Delete Audit', summary: { critical: 1, warning: 0, info: 0, passed: 0 }, now: 2000 });
    render(<HistoryPage />);

    await screen.findByText('Delete Audit');
    await user.click(screen.getAllByRole('button', { name: 'Delete' })[0]);

    expect(screen.queryByText('Delete Audit')).not.toBeInTheDocument();
    expect(screen.getByText('Keep Audit')).toBeInTheDocument();
  });

  it('clears history when confirmed', async () => {
    const user = userEvent.setup();
    window.confirm = jest.fn(() => true);
    saveAudit({ toolName: 'Audit One', summary: { critical: 0, warning: 0, info: 0, passed: 1 }, now: 1000 });
    saveAudit({ toolName: 'Audit Two', summary: { critical: 0, warning: 1, info: 0, passed: 1 }, now: 2000 });
    render(<HistoryPage />);

    await user.click(await screen.findByRole('button', { name: 'Clear history' }));

    expect(window.confirm).toHaveBeenCalledWith('Clear all saved audit history?');
    expect(await screen.findByRole('heading', { name: 'No audits yet.' })).toBeInTheDocument();
    expect(screen.queryByText('Audit One')).not.toBeInTheDocument();
  });

  it('keeps history when clear is canceled', async () => {
    const user = userEvent.setup();
    window.confirm = jest.fn(() => false);
    saveAudit({ toolName: 'Audit One', summary: { critical: 0, warning: 0, info: 0, passed: 1 }, now: 1000 });
    render(<HistoryPage />);

    await user.click(await screen.findByRole('button', { name: 'Clear history' }));

    expect(screen.getByText('Audit One')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'No audits yet.' })).not.toBeInTheDocument();
  });

  it('does not render Clear history while history is empty', async () => {
    render(<HistoryPage />);

    expect(await screen.findByRole('heading', { name: 'No audits yet.' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Clear history' })).not.toBeInTheDocument();
  });
});
