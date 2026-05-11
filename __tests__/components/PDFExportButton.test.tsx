import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PDFExportButton } from '@/components/PDFExportButton';
import type { AuditResults } from '@/lib/types';

const saveMock = jest.fn();

jest.mock('jspdf', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    addPage: jest.fn(),
    getTextWidth: jest.fn(() => 20),
    line: jest.fn(),
    rect: jest.fn(),
    roundedRect: jest.fn(),
    save: saveMock,
    setDrawColor: jest.fn(),
    setFillColor: jest.fn(),
    setFont: jest.fn(),
    setFontSize: jest.fn(),
    setPage: jest.fn(),
    setTextColor: jest.fn(),
    splitTextToSize: jest.fn((text: string) => [text]),
    text: jest.fn(),
    internal: {
      pages: [null, {}],
      pageSize: {
        getWidth: () => 210,
        getHeight: () => 297,
      },
    },
  })),
}));

const results: AuditResults = {
  gtm: [
    {
      id: 'gtm-1',
      severity: 'critical',
      passed: false,
      title: 'Missing conversion linker',
      description: 'The container is missing a conversion linker.',
      recommendation: 'Add a conversion linker tag.',
    },
  ],
  ads: [],
  cross: [],
  report: [],
  meta: [],
  tiktok: [],
  linkedin: [],
  summary: { critical: 1, warning: 0, info: 0, passed: 0 },
};

function renderButton(props: Partial<React.ComponentProps<typeof PDFExportButton>> = {}) {
  return render(
    <PDFExportButton
      results={results}
      auditType="Google Ads"
      canExportPDF
      shouldShowUnlockModal={false}
      onSubscribe={jest.fn()}
      onDismissModal={jest.fn()}
      {...props}
    />,
  );
}

describe('PDFExportButton', () => {
  beforeEach(() => {
    jest.useRealTimers();
    saveMock.mockClear();
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should export when PDF access is allowed', async () => {
    const user = userEvent.setup();
    renderButton({ canExportPDF: true });

    await user.click(screen.getByRole('button', { name: /download pdf/i }));

    await waitFor(() => {
      expect(saveMock).toHaveBeenCalledWith(expect.stringMatching(/^adlint-google-ads-/));
    });
  });

  it('should show the locked tooltip instead of downloading when access is gated', async () => {
    const user = userEvent.setup();
    renderButton({ canExportPDF: false });

    await user.click(screen.getByRole('button', { name: /download pdf/i }));

    expect(screen.getByText('Complete 5 audits to unlock PDF export')).toBeInTheDocument();
    expect(saveMock).not.toHaveBeenCalled();
  });

  it('should mark the user subscribed after successful email submission', async () => {
    jest.useFakeTimers();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    const onSubscribe = jest.fn();
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ success: true }),
    });
    renderButton({
      canExportPDF: false,
      shouldShowUnlockModal: true,
      onSubscribe,
    });

    await user.type(screen.getByLabelText('Email address'), 'person@example.com');
    await user.click(screen.getByRole('button', { name: 'Unlock PDF Export' }));

    await waitFor(() => {
      expect(screen.getByText("You're all set!")).toBeInTheDocument();
    });

    act(() => {
      jest.advanceTimersByTime(1500);
    });

    expect(global.fetch).toHaveBeenCalledWith('/api/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'person@example.com' }),
    });
    expect(onSubscribe).toHaveBeenCalledTimes(1);
  });

  it('should export after a successful subscription rerender grants access', async () => {
    const user = userEvent.setup();
    const { rerender } = renderButton({ canExportPDF: false, shouldShowUnlockModal: false });

    rerender(
      <PDFExportButton
        results={results}
        auditType="Google Ads"
        canExportPDF
        shouldShowUnlockModal={false}
        onSubscribe={jest.fn()}
        onDismissModal={jest.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: /download pdf/i }));

    await waitFor(() => {
      expect(saveMock).toHaveBeenCalled();
    });
  });

  it('should show an error and not mark subscribed when fetch rejects', async () => {
    const user = userEvent.setup();
    const onSubscribe = jest.fn();
    (global.fetch as jest.Mock).mockRejectedValue(new Error('network down'));
    renderButton({
      canExportPDF: false,
      shouldShowUnlockModal: true,
      onSubscribe,
    });

    await user.type(screen.getByLabelText('Email address'), 'person@example.com');
    await user.click(screen.getByRole('button', { name: 'Unlock PDF Export' }));

    expect(await screen.findByText('Network error. Please check your connection and try again.')).toBeInTheDocument();
    expect(onSubscribe).not.toHaveBeenCalled();
    expect(saveMock).not.toHaveBeenCalled();
  });
});
