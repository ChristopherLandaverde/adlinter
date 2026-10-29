'use client';

import { useState, useEffect, useCallback } from 'react';

const AUDIT_COUNT_KEY = 'adlint_audit_count';
const SUBSCRIBED_KEY = 'adlint_subscribed';
/** From this audit on, PDF export needs an email unless already subscribed. */
export const UNLOCK_THRESHOLD = 5;
/** Audits with free PDF export before the email ask. */
export const FREE_PDF_AUDITS = UNLOCK_THRESHOLD - 1;

interface UseAuditCounterReturn {
  auditCount: number;
  isSubscribed: boolean;
  shouldShowUnlockModal: boolean;
  incrementAuditCount: () => number;
  markAsSubscribed: () => void;
  dismissUnlockModal: () => void;
  openUnlockModal: () => void;
  canExportPDF: boolean;
}

export function useAuditCounter(): UseAuditCounterReturn {
  const [auditCount, setAuditCount] = useState(0);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [shouldShowUnlockModal, setShouldShowUnlockModal] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const storedCount = localStorage.getItem(AUDIT_COUNT_KEY);
    const storedSubscribed = localStorage.getItem(SUBSCRIBED_KEY);

    const count = storedCount ? parseInt(storedCount, 10) : 0;
    const subscribed = storedSubscribed === 'true';

    setAuditCount(count);
    setIsSubscribed(subscribed);
    setIsInitialized(true);
  }, []);

  // Increment audit count and check if modal should show
  const incrementAuditCount = useCallback((): number => {
    if (typeof window === 'undefined') return 0;

    const currentCount = parseInt(localStorage.getItem(AUDIT_COUNT_KEY) || '0', 10);
    const newCount = currentCount + 1;
    const subscribed = localStorage.getItem(SUBSCRIBED_KEY) === 'true';

    localStorage.setItem(AUDIT_COUNT_KEY, newCount.toString());
    setAuditCount(newCount);

    // Show modal on 5th audit if not subscribed
    if (newCount >= UNLOCK_THRESHOLD && !subscribed) {
      setShouldShowUnlockModal(true);
    }

    return newCount;
  }, []);

  // Mark user as subscribed (after successful email submission)
  const markAsSubscribed = useCallback(() => {
    if (typeof window === 'undefined') return;

    localStorage.setItem(SUBSCRIBED_KEY, 'true');
    setIsSubscribed(true);
    setShouldShowUnlockModal(false);
  }, []);

  // Dismiss modal without subscribing
  const dismissUnlockModal = useCallback(() => {
    setShouldShowUnlockModal(false);
  }, []);

  // Reopen the unlock dialog after it was dismissed (locked PDF button click).
  const openUnlockModal = useCallback(() => {
    setShouldShowUnlockModal(true);
  }, []);

  // PDF export is available before the unlock threshold, or after subscribing.
  const canExportPDF = auditCount < UNLOCK_THRESHOLD || isSubscribed;

  return {
    auditCount,
    isSubscribed,
    shouldShowUnlockModal: isInitialized ? shouldShowUnlockModal : false,
    incrementAuditCount,
    markAsSubscribed,
    dismissUnlockModal,
    openUnlockModal,
    canExportPDF,
  };
}
