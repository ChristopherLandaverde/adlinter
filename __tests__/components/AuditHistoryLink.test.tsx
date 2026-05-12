import { act, render, screen } from '@testing-library/react';
import { AuditHistoryLink } from '@/components/AuditHistoryLink';
import { clearHistory, saveEntry } from '@/lib/auditHistory';
import type { AuditResults } from '@/lib/types';

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

function saveAudit(toolName = 'Google Ads') {
  saveEntry({
    toolSlug: toolName.toLowerCase().replace(/\s+/g, '-'),
    toolName,
    fileNames: ['audit.csv'],
    results: emptyResults,
    sourceData: {},
  });
}

describe('AuditHistoryLink', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should render nothing when history is empty', () => {
    const { container } = render(<AuditHistoryLink />);

    expect(container).toBeEmptyDOMElement();
  });

  it('should render the link with count badge when history has entries', () => {
    saveAudit();

    render(<AuditHistoryLink />);

    expect(screen.getByRole('link', { name: /recent audits/i })).toHaveAttribute('href', '/history');
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('should reflect the number of entries in the count badge', () => {
    saveAudit('Google Ads');
    saveAudit('GTM');
    saveAudit('Meta');

    render(<AuditHistoryLink />);

    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('should update when history changes after mount', () => {
    render(<AuditHistoryLink />);

    expect(screen.queryByRole('link', { name: /recent audits/i })).not.toBeInTheDocument();

    act(() => {
      saveAudit();
    });

    expect(screen.getByRole('link', { name: /recent audits/i })).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();

    act(() => {
      clearHistory();
    });

    expect(screen.queryByRole('link', { name: /recent audits/i })).not.toBeInTheDocument();
  });
});
