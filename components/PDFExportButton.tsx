'use client';

import { useState, useRef, useCallback } from 'react';
import { computeHealthScore } from '@/lib/healthScore';
import { AuditResults, AuditCheck, Severity } from '@/lib/types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PDFExportButtonProps {
  results: AuditResults;
  auditType: string;
  canExportPDF: boolean;
  shouldShowUnlockModal: boolean;
  onSubscribe: () => void;
  onDismissModal: () => void;
}

interface TaggedCheck extends AuditCheck {
  source: 'gtm' | 'ads' | 'cross' | 'report' | 'meta' | 'tiktok' | 'linkedin';
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

function IconGift() {
  return (
    <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 11.25v8.25a1.5 1.5 0 01-1.5 1.5H5.25a1.5 1.5 0 01-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 109.375 7.5H12m0-2.625V7.5m0-2.625A2.625 2.625 0 1114.625 7.5H12m0 0V21m-8.625-9.75h18c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125h-18c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
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

  const categories = ['gtm', 'ads', 'cross', 'report', 'meta', 'tiktok', 'linkedin'] as const;
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-slideIn">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <IconX />
        </button>

        {success ? (
          // Success state
          <div className="text-center py-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <div className="text-green-600">
                <IconCheck />
              </div>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">You&apos;re all set!</h2>
            <p className="text-gray-600">PDF export is now unlocked. Enjoy!</p>
          </div>
        ) : (
          // Form state
          <>
            {/* Icon */}
            <div className="text-center mb-4">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-accent/10 text-accent">
                <IconGift />
              </div>
            </div>

            {/* Header */}
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                Unlock Professional PDF Reports
              </h2>
              <p className="text-gray-600 text-sm">
                You&apos;ve run 5 audits! Enter your email to unlock the PDF export feature for free.
              </p>
            </div>

            {/* Features list */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-center gap-2">
                  <span className="text-green-600 shrink-0">✓</span>
                  Export detailed audit reports as PDF
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-600 shrink-0">✓</span>
                  Share professional reports with clients
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-600 shrink-0">✓</span>
                  Keep records for compliance
                </li>
              </ul>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label htmlFor="email" className="sr-only">Email address</label>
                <input
                  ref={inputRef}
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="w-full rounded-sm border border-border px-4 py-3 text-ink placeholder-muted/70 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/10"
                  required
                  disabled={isSubmitting}
                />
                {error && (
                  <p className="mt-2 text-sm text-red-600">{error}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !email}
                className="flex w-full items-center justify-center gap-2 rounded-sm bg-accent px-4 py-3 font-medium text-white transition-colors hover:bg-accent-hover disabled:bg-muted/40"
              >
                {isSubmitting ? (
                  <>
                    <IconSpinner />
                    Unlocking...
                  </>
                ) : (
                  <>
                    Unlock PDF Export
                  </>
                )}
              </button>
            </form>

            {/* Footer note */}
            <p className="text-center text-xs text-gray-500 mt-4">
              No spam, ever. Unsubscribe anytime.
            </p>
          </>
        )}
      </div>
    </div>
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
}: PDFExportButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [showLockedTooltip, setShowLockedTooltip] = useState(false);

  const handleExport = useCallback(async () => {
    if (!canExportPDF) {
      setShowLockedTooltip(true);
      setTimeout(() => setShowLockedTooltip(false), 2000);
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
  }, [canExportPDF, results, auditType]);

  return (
    <>
      {/* Export Button */}
      <div className="relative">
        <button
          onClick={handleExport}
          disabled={isGenerating}
          className={`
            flex h-10 items-center gap-2 rounded-sm px-4 text-sm font-medium transition-colors
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
              Generating...
            </>
          ) : canExportPDF ? (
            <>
              <IconDownload />
              Download PDF
            </>
          ) : (
            <>
              <IconLock />
              Download PDF
            </>
          )}
        </button>

        {/* Locked tooltip */}
        {showLockedTooltip && !canExportPDF && (
          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg whitespace-nowrap">
            Complete 5 audits to unlock PDF export
            <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45" />
          </div>
        )}
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
