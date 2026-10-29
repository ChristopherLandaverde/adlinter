import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PDFExportButton } from '@/components/PDFExportButton';
import { useAuditCounter } from '@/lib/hooks/useAuditCounter';
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
  pinterest: [],
  twitter: [],
  snapchat: [],
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
      onRequestUnlock={jest.fn()}
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

  it('should request the unlock dialog instead of downloading when access is gated', async () => {
    const user = userEvent.setup();
    const onRequestUnlock = jest.fn();
    renderButton({ canExportPDF: false, onRequestUnlock });

    await user.click(screen.getByRole('button', { name: /download pdf/i }));

    expect(onRequestUnlock).toHaveBeenCalledTimes(1);
    expect(saveMock).not.toHaveBeenCalled();
  });

  it('reopens the unlock dialog from the PDF button after it was dismissed', async () => {
    const user = userEvent.setup();
    localStorage.clear();
    localStorage.setItem('adlint_audit_count', '4');

    function Harness() {
      const counter = useAuditCounter();
      return (
        <>
          <button type="button" onClick={counter.incrementAuditCount}>
            run audit
          </button>
          <PDFExportButton
            results={results}
            auditType="Google Ads"
            canExportPDF={counter.canExportPDF}
            shouldShowUnlockModal={counter.shouldShowUnlockModal}
            onSubscribe={counter.markAsSubscribed}
            onDismissModal={counter.dismissUnlockModal}
            onRequestUnlock={counter.openUnlockModal}
          />
        </>
      );
    }

    render(<Harness />);
    await user.click(screen.getByRole('button', { name: 'run audit' }));
    expect(screen.getByRole('dialog', { name: 'Unlock professional PDF reports' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /download pdf/i }));
    expect(screen.getByRole('dialog', { name: 'Unlock professional PDF reports' })).toBeInTheDocument();
    expect(saveMock).not.toHaveBeenCalled();
  });

  it('should say what is sent and to whom before the email is submitted', () => {
    renderButton({ canExportPDF: false, shouldShowUnlockModal: true });

    const input = screen.getByLabelText('Email address');
    expect(input).toHaveAccessibleDescription(
      /sends your email address to MailerLite, our email provider.*Nothing from your audit is sent/,
    );
    expect(global.fetch).not.toHaveBeenCalled();
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
    await user.click(screen.getByRole('button', { name: 'Unlock PDF export' }));

    await waitFor(() => {
      expect(screen.getByText('PDF export is unlocked')).toBeInTheDocument();
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
        onRequestUnlock={jest.fn()}
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
    await user.click(screen.getByRole('button', { name: 'Unlock PDF export' }));

    expect(await screen.findByText('Network error. Please check your connection and try again.')).toBeInTheDocument();
    expect(onSubscribe).not.toHaveBeenCalled();
    expect(saveMock).not.toHaveBeenCalled();
  });

  it('renders the unlock form as a labelled modal dialog outside the sticky header', () => {
    const { container } = renderButton({ canExportPDF: false, shouldShowUnlockModal: true });

    const dialog = screen.getByRole('dialog', { name: 'Unlock professional PDF reports' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAccessibleDescription(/free for your first 4 audits/);
    // Portalled to <body>, not rendered inside the button's container.
    expect(container).not.toContainElement(dialog);
    expect(screen.getByLabelText('Email address')).toHaveFocus();
  });

  it('closes the unlock dialog on Escape and from the labelled close button', async () => {
    const user = userEvent.setup();
    const onDismissModal = jest.fn();
    renderButton({ canExportPDF: false, shouldShowUnlockModal: true, onDismissModal });

    await user.keyboard('{Escape}');
    expect(onDismissModal).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('button', { name: 'Close' }));
    expect(onDismissModal).toHaveBeenCalledTimes(2);
  });

  it('announces a submission error and ties it to the email field', async () => {
    const user = userEvent.setup();
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      json: jest.fn().mockResolvedValue({ error: 'Please enter a valid email address.' }),
    });
    renderButton({ canExportPDF: false, shouldShowUnlockModal: true });

    await user.type(screen.getByLabelText('Email address'), 'person@example.com');
    await user.click(screen.getByRole('button', { name: 'Unlock PDF export' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Please enter a valid email address.');
    expect(screen.getByLabelText('Email address')).toHaveAttribute('aria-invalid', 'true');
  });

  it('keeps keyboard focus inside the unlock dialog', async () => {
    const user = userEvent.setup();
    renderButton({ canExportPDF: false, shouldShowUnlockModal: true });
    const dialog = screen.getByRole('dialog');

    // Submit is disabled while the field is empty: Tab wraps to Close.
    await user.tab();
    expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus();
    await user.tab({ shift: true });
    expect(dialog).toContainElement(document.activeElement as HTMLElement);
  });
});
