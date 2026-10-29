import { act, renderHook, waitFor } from '@testing-library/react';
import { FREE_PDF_AUDITS, useAuditCounter } from '@/lib/hooks/useAuditCounter';

describe('useAuditCounter', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should initialize with zero audits, unsubscribed state, and PDF access', async () => {
    const { result } = renderHook(() => useAuditCounter());

    await waitFor(() => {
      expect(result.current.canExportPDF).toBe(true);
    });

    expect(result.current.auditCount).toBe(0);
    expect(result.current.isSubscribed).toBe(false);
    expect(result.current.shouldShowUnlockModal).toBe(false);
  });

  it('should read existing count and subscribed flag from localStorage on mount', async () => {
    localStorage.setItem('adlint_audit_count', '7');
    localStorage.setItem('adlint_subscribed', 'true');

    const { result } = renderHook(() => useAuditCounter());

    await waitFor(() => {
      expect(result.current.auditCount).toBe(7);
    });

    expect(result.current.isSubscribed).toBe(true);
    expect(result.current.canExportPDF).toBe(true);
  });

  it('should persist and update count when incrementing audit count', async () => {
    const { result } = renderHook(() => useAuditCounter());

    await waitFor(() => {
      expect(result.current.auditCount).toBe(0);
    });

    let newCount = 0;
    act(() => {
      newCount = result.current.incrementAuditCount();
    });

    expect(newCount).toBe(1);
    expect(result.current.auditCount).toBe(1);
    expect(localStorage.getItem('adlint_audit_count')).toBe('1');
  });

  it('should show the unlock modal when count crosses the threshold and user is not subscribed', async () => {
    localStorage.setItem('adlint_audit_count', '4');

    const { result } = renderHook(() => useAuditCounter());

    await waitFor(() => {
      expect(result.current.auditCount).toBe(4);
    });

    act(() => {
      result.current.incrementAuditCount();
    });

    expect(result.current.auditCount).toBe(5);
    expect(result.current.shouldShowUnlockModal).toBe(true);
    expect(result.current.canExportPDF).toBe(false);
  });

  it('should persist subscription and dismiss the modal when marked subscribed', async () => {
    localStorage.setItem('adlint_audit_count', '4');

    const { result } = renderHook(() => useAuditCounter());

    await waitFor(() => {
      expect(result.current.auditCount).toBe(4);
    });

    act(() => {
      result.current.incrementAuditCount();
      result.current.markAsSubscribed();
    });

    expect(localStorage.getItem('adlint_subscribed')).toBe('true');
    expect(result.current.isSubscribed).toBe(true);
    expect(result.current.shouldShowUnlockModal).toBe(false);
  });

  it('should dismiss the unlock modal without persisting subscription', async () => {
    localStorage.setItem('adlint_audit_count', '4');

    const { result } = renderHook(() => useAuditCounter());

    await waitFor(() => {
      expect(result.current.auditCount).toBe(4);
    });

    act(() => {
      result.current.incrementAuditCount();
    });

    expect(result.current.shouldShowUnlockModal).toBe(true);

    act(() => {
      result.current.dismissUnlockModal();
    });

    expect(result.current.shouldShowUnlockModal).toBe(false);
    expect(localStorage.getItem('adlint_subscribed')).toBeNull();
  });

  it('should reopen the unlock modal after it was dismissed', async () => {
    localStorage.setItem('adlint_audit_count', '4');
    const { result } = renderHook(() => useAuditCounter());
    await waitFor(() => expect(result.current.auditCount).toBe(4));

    act(() => { result.current.incrementAuditCount(); });
    act(() => { result.current.dismissUnlockModal(); });
    expect(result.current.shouldShowUnlockModal).toBe(false);

    act(() => { result.current.openUnlockModal(); });
    expect(result.current.shouldShowUnlockModal).toBe(true);
  });

  it('should allow PDF export below threshold or when subscribed', async () => {
    localStorage.setItem('adlint_audit_count', '4');

    const { result, rerender } = renderHook(() => useAuditCounter());

    await waitFor(() => {
      expect(result.current.auditCount).toBe(4);
    });

    expect(result.current.canExportPDF).toBe(true);

    act(() => {
      result.current.incrementAuditCount();
    });

    expect(result.current.canExportPDF).toBe(false);

    act(() => {
      result.current.markAsSubscribed();
    });
    rerender();

    expect(result.current.canExportPDF).toBe(true);
  });

  // The unlock dialog copy in PDFExportButton describes this rule; keep them in step.
  it('allows PDF export for the first FREE_PDF_AUDITS audits and gates it from the next one', async () => {
    expect(FREE_PDF_AUDITS).toBe(4);

    localStorage.setItem('adlint_audit_count', String(FREE_PDF_AUDITS));
    const free = renderHook(() => useAuditCounter());
    await waitFor(() => expect(free.result.current.auditCount).toBe(FREE_PDF_AUDITS));
    expect(free.result.current.canExportPDF).toBe(true);
    free.unmount();

    localStorage.setItem('adlint_audit_count', String(FREE_PDF_AUDITS + 1));
    const gated = renderHook(() => useAuditCounter());
    await waitFor(() => expect(gated.result.current.auditCount).toBe(FREE_PDF_AUDITS + 1));
    expect(gated.result.current.canExportPDF).toBe(false);
  });
});
