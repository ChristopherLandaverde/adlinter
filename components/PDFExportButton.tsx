'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { computeHealthScore } from '@/lib/healthScore';
import { FREE_PDF_AUDITS } from '@/lib/hooks/useAuditCounter';
import { AuditResults, AuditCheck, Severity } from '@/lib/types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PDFExportButtonProps {
  results: AuditResults;
  auditType: string;
  canExportPDF: boolean;
  shouldShowUnlockModal: boolean;
  onSubscribe: () => void;
  onDismissModal: () => void;
  /** Called when the locked button is clicked, so a dismissed unlock dialog can reopen. */
  onRequestUnlock: () => void;
}

interface TaggedCheck extends AuditCheck {
  source: 'gtm' | 'ads' | 'cross' | 'report' | 'meta' | 'tiktok' | 'linkedin' | 'pinterest' | 'twitter' | 'snapchat';
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SEVERITY_COLORS: Record<Severity, { bg: string; text: string; hex: string }> = {
  critical: { bg: '#fef2f2', text: '#dc2626', hex: '#dc2626' },
  warning: { bg: '#fffbeb', text: '#d97706', hex: '#d97706' },
  info: { bg: '#eff6ff', text: '#2563eb', hex: '#2563eb' },
};

const SOURCE_LABELS: Record<string, string> = {
  gtm: 'GTM',
  ads: 'Ads',
  cross: 'Cross-Check',
  report: 'Report',
  meta: 'Meta',
  tiktok: 'TikTok',
  linkedin: 'LinkedIn',
  pinterest: 'Pinterest',
  twitter: 'Twitter/X',
  snapchat: 'Snapchat',
};

// ─── Icons ────────────────────────────────────────────────────────────────────

function IconDownload() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
  );
}

function IconLock() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0110 0v4" />
    </svg>
  );
}

function IconX() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function IconSpinner() {
  return (
    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  );
}

function IconCheck() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function tagChecks(results: AuditResults): TaggedCheck[] {
  const tag = (checks: AuditCheck[], source: TaggedCheck['source']): TaggedCheck[] =>
    checks.map(c => ({ ...c, source }));
  return [
    ...tag(results.gtm, 'gtm'),
    ...tag(results.ads, 'ads'),
    ...tag(results.cross, 'cross'),
    ...tag(results.report, 'report'),
    ...tag(results.meta, 'meta'),
    ...tag(results.tiktok, 'tiktok'),
    ...tag(results.linkedin, 'linkedin'),
    ...tag(results.pinterest, 'pinterest'),
    ...tag(results.twitter, 'twitter'),
    ...tag(results.snapchat, 'snapchat'),
  ];
}

// ─── PDF Generation ───────────────────────────────────────────────────────────

async function generatePDF(results: AuditResults, auditType: string): Promise<void> {
  // Dynamic import jsPDF to keep bundle size small
  const { default: jsPDF } = await import('jspdf');

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  // Helper functions
  const addPage = () => {
    doc.addPage();
    y = margin;
  };

  const checkPageBreak = (neededHeight: number) => {
    if (y + neededHeight > pageHeight - margin) {
      addPage();
    }
  };

  // ─── Header ─────────────────────────────────────────────────────────────────
  doc.setFillColor(30, 58, 138);
  doc.rect(0, 0, pageWidth, 35, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24);
  doc.setTextColor(255, 255, 255);
  doc.text('AdLint', margin, 18);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  doc.text(`${auditType} Report`, margin, 27);

  doc.setFontSize(10);
  doc.text(new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }), pageWidth - margin, 27, { align: 'right' });

  y = 45;

  // ─── Summary Section ────────────────────────────────────────────────────────
  const allChecks = tagChecks(results);
  const failedChecks = allChecks.filter(c => !c.passed);
  const passedChecks = allChecks.filter(c => c.passed);

  const summary = {
    critical: failedChecks.filter(c => c.severity === 'critical').length,
    warning: failedChecks.filter(c => c.severity === 'warning').length,
    info: failedChecks.filter(c => c.severity === 'info').length,
    passed: passedChecks.length,
    total: allChecks.length,
  };

  const healthScore = computeHealthScore(results);
  const scoreValue = healthScore?.score ?? 0;

  // Summary title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(17, 24, 39); // gray-900
  doc.text('Executive Summary', margin, y);
  y += 10;

  // Health score box
  const scoreBoxWidth = 50;
  const scoreBoxHeight = 30;
  const scoreColor = healthScore?.bandColor === 'red'
    ? '#dc2626'
    : healthScore?.bandColor === 'amber'
      ? '#d97706'
      : healthScore?.bandColor === 'blue'
        ? '#2563eb'
        : '#16a34a';

  doc.setFillColor(...hexToRgb(scoreColor));
  doc.roundedRect(margin, y, scoreBoxWidth, scoreBoxHeight, 3, 3, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(255, 255, 255);
  doc.text(`${scoreValue}%`, margin + scoreBoxWidth / 2, y + 15, { align: 'center' });

  doc.setFontSize(8);
  doc.text('Health Score', margin + scoreBoxWidth / 2, y + 23, { align: 'center' });

  // Summary stats next to health score
  const statsX = margin + scoreBoxWidth + 10;
  const statWidth = (contentWidth - scoreBoxWidth - 10) / 4;

  const stats = [
    { label: 'Critical', value: summary.critical, color: '#B91C1C' },
    { label: 'Warnings', value: summary.warning, color: '#B45309' },
    { label: 'Info', value: summary.info, color: '#475569' },
    { label: 'Passed', value: summary.passed, color: '#166534' },
  ];

  stats.forEach((stat, i) => {
    const x = statsX + i * statWidth;

    doc.setFillColor(248, 250, 252); // slate-50
    doc.roundedRect(x, y, statWidth - 3, scoreBoxHeight, 2, 2, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(...hexToRgb(stat.color));
    doc.text(stat.value.toString(), x + (statWidth - 3) / 2, y + 13, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(107, 114, 128); // gray-500
    doc.text(stat.label, x + (statWidth - 3) / 2, y + 22, { align: 'center' });
  });

  y += scoreBoxHeight + 15;

  // ─── Issues by Category ─────────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(17, 24, 39);
  doc.text('Issues by Category', margin, y);
  y += 8;

  const categories = ['gtm', 'ads', 'cross', 'report', 'meta', 'tiktok', 'linkedin', 'pinterest', 'twitter', 'snapchat'] as const;
  const categoryData = categories.map(cat => ({
    name: SOURCE_LABELS[cat],
    critical: failedChecks.filter(c => c.source === cat && c.severity === 'critical').length,
    warning: failedChecks.filter(c => c.source === cat && c.severity === 'warning').length,
    info: failedChecks.filter(c => c.source === cat && c.severity === 'info').length,
  })).filter(d => d.critical + d.warning + d.info > 0);

  if (categoryData.length > 0) {
    const barHeight = 8;
    const maxTotal = Math.max(...categoryData.map(d => d.critical + d.warning + d.info));
    const barMaxWidth = contentWidth - 30;

    categoryData.forEach(cat => {
      checkPageBreak(barHeight + 5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(107, 114, 128);
      doc.text(cat.name, margin, y + 5);

      const total = cat.critical + cat.warning + cat.info;
      let barX = margin + 25;

      if (cat.critical > 0) {
        const w = (cat.critical / maxTotal) * barMaxWidth;
        doc.setFillColor(220, 38, 38);
        doc.roundedRect(barX, y, w, barHeight, 1, 1, 'F');
        barX += w;
      }
      if (cat.warning > 0) {
        const w = (cat.warning / maxTotal) * barMaxWidth;
        doc.setFillColor(217, 119, 6);
        doc.rect(barX, y, w, barHeight, 'F');
        barX += w;
      }
      if (cat.info > 0) {
        const w = (cat.info / maxTotal) * barMaxWidth;
        doc.setFillColor(37, 99, 235);
        doc.roundedRect(barX, y, w, barHeight, 1, 1, 'F');
      }

      doc.setTextColor(55, 65, 81);
      doc.setFontSize(8);
      doc.text(total.toString(), pageWidth - margin, y + 5.5, { align: 'right' });

      y += barHeight + 4;
    });
  } else {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(10);
    doc.setTextColor(107, 114, 128);
    doc.text('No issues found.', margin, y);
    y += 8;
  }

  y += 10;

  // ─── Failed Checks Table ────────────────────────────────────────────────────
  if (failedChecks.length > 0) {
    checkPageBreak(30);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(17, 24, 39);
    doc.text(`Issues Found (${failedChecks.length})`, margin, y);
    y += 8;

    // Sort by severity
    const sortedChecks = [...failedChecks].sort((a, b) => {
      const order: Record<Severity, number> = { critical: 0, warning: 1, info: 2 };
      return order[a.severity] - order[b.severity];
    });

    // Group by severity for better organization
    const checksBySeverity = {
      critical: sortedChecks.filter(c => c.severity === 'critical'),
      warning: sortedChecks.filter(c => c.severity === 'warning'),
      info: sortedChecks.filter(c => c.severity === 'info'),
    };

    (['critical', 'warning', 'info'] as Severity[]).forEach(severity => {
      const checks = checksBySeverity[severity];
      if (checks.length === 0) return;

      checkPageBreak(20);

      // Severity header
      const severityLabels: Record<Severity, string> = {
        critical: 'Critical Issues',
        warning: 'Warnings',
        info: 'Informational',
      };

      doc.setFillColor(...hexToRgb(SEVERITY_COLORS[severity].bg));
      doc.rect(margin, y, contentWidth, 7, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(...hexToRgb(SEVERITY_COLORS[severity].hex));
      doc.text(`${severityLabels[severity]} (${checks.length})`, margin + 3, y + 5);
      y += 10;

      checks.forEach((check, idx) => {
        checkPageBreak(25);

        // Issue title with source badge
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(17, 24, 39);

        const titleLines = doc.splitTextToSize(check.title, contentWidth - 25);
        doc.text(titleLines, margin + 3, y);

        // Source badge
        doc.setFillColor(243, 244, 246);
        const badgeText = SOURCE_LABELS[check.source];
        const badgeWidth = doc.getTextWidth(badgeText) + 4;
        doc.roundedRect(pageWidth - margin - badgeWidth, y - 4, badgeWidth, 6, 1, 1, 'F');
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(107, 114, 128);
        doc.text(badgeText, pageWidth - margin - badgeWidth + 2, y);

        y += titleLines.length * 4 + 2;

        // Description
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(75, 85, 99);
        const descLines = doc.splitTextToSize(check.description, contentWidth - 6);
        doc.text(descLines.slice(0, 2), margin + 3, y);
        y += Math.min(descLines.length, 2) * 3.5 + 2;

        // Recommendation
        if (check.recommendation) {
          doc.setFillColor(239, 246, 255); // blue-50
          const recLines = doc.splitTextToSize(`→ ${check.recommendation}`, contentWidth - 10);
          const recHeight = Math.min(recLines.length, 2) * 3.5 + 4;

          checkPageBreak(recHeight + 5);

          doc.roundedRect(margin + 3, y, contentWidth - 6, recHeight, 1, 1, 'F');
          doc.setFontSize(7);
          doc.setTextColor(37, 99, 235);
          doc.text(recLines.slice(0, 2), margin + 5, y + 3.5);
          y += recHeight + 3;
        }

        if (idx < checks.length - 1) {
          y += 3;
        }
      });

      y += 5;
    });
  }

  // ─── Passed Checks Section ──────────────────────────────────────────────────
  if (passedChecks.length > 0) {
    checkPageBreak(20);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(17, 24, 39);
    doc.text(`Passed Checks (${passedChecks.length})`, margin, y);
    y += 8;

    doc.setFillColor(240, 253, 244); // green-50
    doc.roundedRect(margin, y, contentWidth, 6, 1, 1, 'F');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(22, 163, 74);
    doc.text(`✓ ${passedChecks.length} checks passed successfully`, margin + 3, y + 4);
    y += 10;

    // List passed checks (compact)
    doc.setFontSize(7);
    doc.setTextColor(75, 85, 99);

    passedChecks.forEach((check, idx) => {
      if (idx >= 15) {
        if (idx === 15) {
          checkPageBreak(5);
          doc.text(`... and ${passedChecks.length - 15} more passed checks`, margin + 3, y);
          y += 4;
        }
        return;
      }

      checkPageBreak(5);
      const line = `✓ ${check.title}`;
      const truncated = line.length > 80 ? line.substring(0, 77) + '...' : line;
      doc.text(truncated, margin + 3, y);
      y += 4;
    });
  }

  // ─── Footer ─────────────────────────────────────────────────────────────────
  const totalPages = doc.internal.pages.length - 1;
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);

    doc.setDrawColor(229, 231, 235);
    doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(156, 163, 175);
    doc.text('Generated by AdLint • adlint.io', margin, pageHeight - 6);
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin, pageHeight - 6, { align: 'right' });
  }

  // Save the PDF
  const filename = `adlint-${auditType.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename);
}

// Helper to convert hex to RGB array
function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
    : [0, 0, 0];
}

// ─── Unlock Modal Component ───────────────────────────────────────────────────

function UnlockModal({
  isOpen,
  onClose,
  onSubscribe,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubscribe: () => void;
}) {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to subscribe. Please try again.');
        setIsSubmitting(false);
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        onSubscribe();
      }, 1500);
    } catch {
      setError('Network error. Please check your connection and try again.');
      setIsSubmitting(false);
    }
  };

  // Escape closes; focus moves into the dialog on open and back on close.
  const onCloseRef = useRef(onClose);
  const dialogRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);
  useEffect(() => {
    if (!isOpen) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    inputRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onCloseRef.current();
        return;
      }
      // Keep Tab inside the dialog while it is open.
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled])')
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      } else if (!dialogRef.current.contains(document.activeElement)) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      previouslyFocused?.focus?.();
    };
  }, [isOpen]);

  if (!isOpen || typeof document === 'undefined') return null;

  // Portal to <body>: the audit header is sticky with a backdrop filter,
  // which makes it the containing block for fixed children and clipped the
  // dialog off the top of the screen.
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink/40" aria-hidden="true" onClick={onClose} />

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="unlock-pdf-title"
        aria-describedby="unlock-pdf-intro"
        className="relative max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-lg border border-border bg-surface p-6"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-sm text-muted transition-colors duration-150 hover:bg-surface-2 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          <IconX />
        </button>

        {success ? (
          <div className="py-2 pr-8" role="status" aria-live="polite">
            <h2 id="unlock-pdf-title" className="flex items-center gap-2 font-display text-xl font-semibold text-ink">
              <span className="text-pass" aria-hidden="true"><IconCheck /></span>
              PDF export is unlocked
            </h2>
            <p id="unlock-pdf-intro" className="mt-2 text-sm leading-6 text-muted">
              Download a PDF report from this audit or any audit you run next.
            </p>
          </div>
        ) : (
          <>
            <div className="mb-6 pr-8">
              <h2 id="unlock-pdf-title" className="font-display text-xl font-semibold text-ink">
                Unlock professional PDF reports
              </h2>
              <p id="unlock-pdf-intro" className="mt-2 text-sm leading-6 text-muted">
                PDF export is free for your first {FREE_PDF_AUDITS} audits. Enter your email to
                keep exporting.
              </p>
            </div>

            <ul className="mb-6 list-disc space-y-1 rounded-md bg-surface-2 py-4 pl-8 pr-4 text-sm leading-6 text-ink marker:text-muted">
              <li>Export detailed audit reports as PDF</li>
              <li>Share professional reports with clients</li>
              <li>Keep records for compliance</li>
            </ul>

            <form onSubmit={handleSubmit}>
              <label htmlFor="email" className="mb-2 block text-sm font-medium text-ink">
                Email address
              </label>
              <input
                ref={inputRef}
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@agency.com"
                className="h-10 w-full rounded-sm border border-input-border bg-surface px-3 text-sm text-ink placeholder:text-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                required
                disabled={isSubmitting}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? 'email-error email-disclosure' : 'email-disclosure'}
              />
              {error && (
                <p id="email-error" role="alert" className="mt-2 text-sm text-critical">
                  {error}
                </p>
              )}
              <p id="email-disclosure" className="mt-3 text-sm leading-6 text-muted">
                This sends your email address to MailerLite, our email provider, and adds it
                to the AdLint mailing list. Nothing from your audit is sent. Your files and
                results stay in this browser.
              </p>

              <button
                type="submit"
                disabled={isSubmitting || !email}
                className="mt-6 flex h-10 w-full items-center justify-center gap-2 rounded-sm bg-accent px-4 text-sm font-medium text-white transition-colors duration-150 hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <IconSpinner />
                    Unlocking…
                  </>
                ) : (
                  'Unlock PDF export'
                )}
              </button>
            </form>

            <p className="mt-4 text-sm text-muted">No spam, ever. Unsubscribe anytime.</p>
          </>
        )}
      </div>
    </div>,
    document.body
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function PDFExportButton({
  results,
  auditType,
  canExportPDF,
  shouldShowUnlockModal,
  onSubscribe,
  onDismissModal,
  onRequestUnlock,
}: PDFExportButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleExport = useCallback(async () => {
    if (!canExportPDF) {
      onRequestUnlock();
      return;
    }

    setIsGenerating(true);
    try {
      await generatePDF(results, auditType);
    } catch (error) {
      console.error('PDF generation failed:', error);
    } finally {
      setIsGenerating(false);
    }
  }, [canExportPDF, results, auditType, onRequestUnlock]);

  return (
    <>
      {/* Export Button */}
      <div className="relative">
        <button
          type="button"
          onClick={handleExport}
          disabled={isGenerating}
          aria-label={isGenerating ? 'Generating PDF' : 'Download PDF'}
          className={`
            flex h-10 w-10 items-center justify-center gap-2 rounded-sm px-0 text-sm font-medium transition-colors sm:w-auto sm:px-4
            ${canExportPDF
              ? 'border border-border bg-surface text-ink hover:border-ink/20'
              : 'bg-surface-2 text-muted hover:text-ink'
            }
            disabled:opacity-50 disabled:cursor-not-allowed
          `}
        >
          {isGenerating ? (
            <>
              <IconSpinner />
              <span className="hidden sm:inline">Generating...</span>
            </>
          ) : canExportPDF ? (
            <>
              <IconDownload />
              <span className="hidden sm:inline">Download PDF</span>
            </>
          ) : (
            <>
              <IconLock />
              <span className="hidden sm:inline">Download PDF</span>
            </>
          )}
        </button>
      </div>

      {/* Unlock Modal */}
      <UnlockModal
        isOpen={shouldShowUnlockModal}
        onClose={onDismissModal}
        onSubscribe={onSubscribe}
      />
    </>
  );
}
