'use client';

import { Suspense, useEffect, useState, useMemo, useCallback, useRef } from 'react';
import Link from 'next/link';
import { RotateCcw } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { runAudit } from '@/lib/auditEngine';
import { AuditResults, AuditCheck, AuditSummary, GTMContainer, AdsData, AdsReportData, MetaPixelData, TikTokPixelData, LinkedInInsightData, Severity, AuditContext } from '@/lib/types';
import { getEntry, getHistory, saveEntry } from '@/lib/auditHistory';
import { computeHealthScore } from '@/lib/healthScore';
import { useAuditCounter } from '@/lib/hooks/useAuditCounter';
import { getToolBySlug } from '@/lib/tools';
import { AuditHistoryLink } from '@/components/AuditHistoryLink';
import { CheckLearnMoreLink } from '@/components/CheckLearnMoreLink';
import { HealthScoreBadge } from '@/components/HealthScoreBadge';
import { PDFExportButton } from '@/components/PDFExportButton';
import { ShareAuditButton } from '@/components/ShareAuditButton';
import {
  PieChart, Pie, Cell, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend,
} from 'recharts';

// ─── Constants ───────────────────────────────────────────────────────────────

type Source = 'gtm' | 'ads' | 'cross' | 'report' | 'meta' | 'tiktok' | 'linkedin';
type Tab = 'gtm' | 'ads' | 'meta' | 'tiktok' | 'linkedin';

const severityConfig: Record<Severity, { label: string; color: string; bg: string; border: string; text: string; badge: string; dot: string }> = {
  critical: {
    label: 'Critical',
    color: '#B91C1C',
    bg: 'bg-critical/5',
    border: 'border-critical/30',
    text: 'text-critical',
    badge: 'bg-critical/10 text-critical',
    dot: 'bg-critical',
  },
  warning: {
    label: 'Warning',
    color: '#B45309',
    bg: 'bg-warning/5',
    border: 'border-warning/30',
    text: 'text-warning',
    badge: 'bg-warning/10 text-warning',
    dot: 'bg-warning',
  },
  info: {
    label: 'Info',
    color: '#475569',
    bg: 'bg-info/5',
    border: 'border-info/30',
    text: 'text-info',
    badge: 'bg-info/10 text-info',
    dot: 'bg-info',
  },
};

const sourceConfig: Record<Source, { label: string; badge: string }> = {
  gtm: { label: 'GTM', badge: 'bg-surface-2 text-muted' },
  ads: { label: 'Ads', badge: 'bg-surface-2 text-muted' },
  cross: { label: 'Cross-Check', badge: 'bg-surface-2 text-muted' },
  report: { label: 'Report', badge: 'bg-surface-2 text-muted' },
  meta: { label: 'Meta', badge: 'bg-surface-2 text-muted' },
  tiktok: { label: 'TikTok', badge: 'bg-surface-2 text-muted' },
  linkedin: { label: 'LinkedIn', badge: 'bg-surface-2 text-muted' },
};

const severityOrder: Record<Severity, number> = { critical: 0, warning: 1, info: 2 };

const DONUT_COLORS = ['#B91C1C', '#B45309', '#475569', '#166534'];

// ─── Icons (inline SVG for zero-dependency) ──────────────────────────────────

function IconShield() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M12 2l7 4v5c0 5.25-3.5 9.74-7 11-3.5-1.26-7-5.75-7-11V6l7-4z" />
    </svg>
  );
}

function IconAlertTriangle() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
    </svg>
  );
}

function IconInfoCircle() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="12" r="10" />
      <path strokeLinecap="round" d="M12 16v-4m0-4h.01" />
    </svg>
  );
}

function IconCheckCircle() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function IconChevronRight({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
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

function IconSearch() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <circle cx="11" cy="11" r="8" />
      <path strokeLinecap="round" d="M21 21l-4.35-4.35" />
    </svg>
  );
}

function IconSort({ active, direction }: { active: boolean; direction: 'asc' | 'desc' }) {
  if (!active) {
    return (
      <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" d="M7 10l5-5 5 5M7 14l5 5 5-5" />
      </svg>
    );
  }
  return (
    <svg className="w-3.5 h-3.5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      {direction === 'asc'
        ? <path strokeLinecap="round" d="M7 14l5-5 5 5" />
        : <path strokeLinecap="round" d="M7 10l5 5 5-5" />
      }
    </svg>
  );
}

function IconCross() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" d="M8 4v16M16 4v16M4 8h16M4 16h16" />
    </svg>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

interface TaggedCheck extends AuditCheck {
  source: Source;
}

type AuditSourceData = {
  gtmData: GTMContainer | null;
  adsData: AdsData | null;
  reportData: AdsReportData | null;
  metaData: MetaPixelData | null;
  tiktokData: TikTokPixelData | null;
  linkedinData: LinkedInInsightData | null;
};

function tagChecks(results: AuditResults): TaggedCheck[] {
  const tag = (checks: AuditCheck[], source: Source): TaggedCheck[] =>
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

function summarizeChecks(checks: AuditCheck[]): AuditSummary {
  const summary = { critical: 0, warning: 0, info: 0, passed: 0 };

  for (const check of checks) {
    if (check.passed) {
      summary.passed++;
    } else {
      summary[check.severity]++;
    }
  }

  return summary;
}

function countAffectedItems(check: AuditCheck): number {
  if (!check.details) return 0;
  let total = 0;
  for (const value of Object.values(check.details)) {
    if (Array.isArray(value)) total += value.length;
  }
  return total;
}

function detectToolSlug(sourceData: AuditSourceData) {
  const { gtmData, adsData, reportData, metaData, tiktokData, linkedinData } = sourceData;

  if (metaData && !gtmData && !adsData && !reportData && !tiktokData && !linkedinData) return 'meta-auditor';
  if (tiktokData && !gtmData && !adsData && !reportData && !metaData && !linkedinData) return 'tiktok-auditor';
  if (linkedinData && !gtmData && !adsData && !reportData && !metaData && !tiktokData) return 'linkedin-auditor';
  if (gtmData && !adsData && !reportData && !metaData && !tiktokData && !linkedinData) return 'gtm-auditor';
  if (adsData && !gtmData && !reportData && !metaData && !tiktokData && !linkedinData) return 'google-ads-linter';
  if (reportData && !gtmData && !adsData && !metaData && !tiktokData && !linkedinData) return 'performance-analyzer';
  return 'full-audit';
}

function readStringPath(source: unknown, path: string[]) {
  let current = source;
  for (const key of path) {
    if (!current || typeof current !== 'object' || !(key in current)) return null;
    current = (current as Record<string, unknown>)[key];
  }
  return typeof current === 'string' && current.trim() ? current.trim() : null;
}

function collectFileNames(sourceData: AuditSourceData) {
  const names = [
    readStringPath(sourceData.gtmData, ['containerName']) ??
      readStringPath(sourceData.gtmData, ['containerVersion', 'container', 'name']) ??
      readStringPath(sourceData.gtmData, ['containerVersion', 'name']),
    sourceData.adsData ? `${sourceData.adsData.conversions.length} Google Ads conversions` : null,
    sourceData.reportData ? `${sourceData.reportData.conversions.length} performance rows` : null,
    sourceData.metaData?.pixelName ?? sourceData.metaData?.pixelId ?? null,
    sourceData.tiktokData?.pixelName ?? sourceData.tiktokData?.pixelCode ?? null,
    sourceData.linkedinData?.accountName ?? sourceData.linkedinData?.accountId ?? null,
  ];

  return names.filter((name): name is string => !!name);
}

function getIssueBadgeClass(checks: TaggedCheck[]) {
  const failed = checks.filter((check) => !check.passed);

  if (failed.some((check) => check.severity === 'critical')) {
    return 'bg-critical/10 text-critical';
  }

  if (failed.some((check) => check.severity === 'warning')) {
    return 'bg-warning/10 text-warning';
  }

  return 'bg-info/10 text-info';
}

function TabIssueBadge({ count, checks }: { count: number; checks: TaggedCheck[] }) {
  if (count === 0) return null;

  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${getIssueBadgeClass(checks)}`}>
      {count} issue{count === 1 ? '' : 's'}
    </span>
  );
}

function restoreSourceData(sourceData: AuditSourceData) {
  const keys = ['gtmData', 'adsData', 'reportData', 'metaData', 'tiktokData', 'linkedinData'] as const;

  for (const key of keys) {
    const value = sourceData[key];
    if (value === undefined || value === null) {
      sessionStorage.removeItem(key);
    } else {
      sessionStorage.setItem(key, JSON.stringify(value));
    }
  }
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function DetailsRenderer({ details }: { details: Record<string, unknown> }) {
  const entries = Object.entries(details).filter(
    ([, value]) =>
      value !== undefined &&
      value !== null &&
      !(Array.isArray(value) && value.length === 0)
  );

  if (entries.length === 0) return null;

  return (
    <div className="space-y-3">
      {entries.map(([key, value]) => {
        const label = key
          .replace(/([A-Z])/g, ' $1')
          .replace(/[_-]/g, ' ')
          .replace(/^\w/, c => c.toUpperCase())
          .trim();

        if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'string') {
          return (
            <div key={key}>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">{label}</div>
              <div className="space-y-1">
                {(value as string[]).map((item, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm text-gray-700 bg-gray-50 rounded px-3 py-1.5 border border-gray-200">
                    <span className="text-gray-500 shrink-0 mt-0.5">&#x2022;</span>
                    <span className="font-mono text-xs break-all">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        }

        if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'object') {
          return (
            <div key={key}>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">{label}</div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      {Object.keys(value[0] as Record<string, unknown>).map(k => (
                        <th key={k} className="text-left text-xs font-semibold text-gray-500 py-1.5 px-2 uppercase tracking-wide">{k}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(value as Record<string, unknown>[]).map((item, i) => (
                      <tr key={i} className="border-b border-gray-200">
                        {Object.values(item).map((v, j) => (
                          <td key={j} className="py-1.5 px-2 text-gray-700 font-mono text-xs">{String(v)}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        }

        if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
          return (
            <div key={key} className="flex items-center gap-2 text-sm">
              <span className="text-gray-500 text-xs font-semibold uppercase tracking-wide">{label}:</span>
              <span className="font-medium text-gray-700">{String(value)}</span>
            </div>
          );
        }

        if (typeof value === 'object' && !Array.isArray(value) && value !== null) {
          return (
            <div key={key}>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">{label}</div>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(value as Record<string, unknown>).map(([k, v]) => (
                  <div key={k} className="bg-gray-50 rounded px-3 py-1.5 border border-gray-200 text-sm">
                    <span className="text-gray-500 text-xs">{k}: </span>
                    <span className="font-medium text-gray-700">{String(v)}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        }

        return null;
      })}
    </div>
  );
}

// ─── Slide-Over Detail Panel ─────────────────────────────────────────────────

function SlideOverPanel({
  check,
  onClose,
}: {
  check: TaggedCheck | null;
  onClose: () => void;
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  if (!check) return null;

  const config = severityConfig[check.severity];
  const src = sourceConfig[check.source];
  const affected = countAffectedItems(check);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
        onClick={onClose}
      />
      {/* Panel */}
      <div className="fixed right-0 top-0 h-full w-full sm:w-[480px] bg-white shadow-2xl z-50 flex flex-col animate-slideIn border-l border-gray-200">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 p-5 border-b border-gray-200">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${config.badge}`}>
                {config.label}
              </span>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${src.badge}`}>
                {src.label}
              </span>
              {affected > 0 && (
                <span className="text-xs text-gray-500">{affected} item{affected !== 1 ? 's' : ''} affected</span>
              )}
            </div>
            <h2 className="text-lg font-bold text-gray-900 leading-tight">{check.title}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors shrink-0"
          >
            <IconX />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Description */}
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Description</h3>
            <p className="text-sm text-gray-600 leading-relaxed">{check.description}</p>
          </div>

          {/* Recommendation */}
          <div>
            <div className="mb-2 flex items-center justify-between gap-3">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Recommendation</h3>
              <CheckLearnMoreLink id={check.id} />
            </div>
            <div className="rounded-md border border-border bg-surface-2 p-4 text-sm leading-relaxed text-ink">
              {check.recommendation}
            </div>
          </div>

          {/* Affected Items */}
          {check.details && (
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Details</h3>
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <DetailsRenderer details={check.details} />
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ─── Donut Chart ─────────────────────────────────────────────────────────────

function SeverityDonut({ data }: { data: { name: string; value: number; color: string }[] }) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  if (total === 0) return null;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
      <h3 className="text-sm font-semibold text-gray-900 mb-4">Issue Distribution</h3>
      <div className="flex flex-col items-center gap-4 sm:flex-row sm:gap-6">
        <div className="w-36 h-36 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={60}
                dataKey="value"
                stroke="#ffffff"
                strokeWidth={2}
              >
                {data.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value) => {
                  const v = typeof value === 'number' ? value : 0;
                  return `${v} (${Math.round((v / total) * 100)}%)`;
                }}
                contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', backgroundColor: '#ffffff', color: '#374151', fontSize: '13px' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="w-full space-y-2 sm:flex-1">
          {data.map(d => (
            <div key={d.name} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                <span className="text-gray-600">{d.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-gray-900">{d.value}</span>
                <span className="text-gray-500 text-xs w-10 text-right">{total > 0 ? Math.round((d.value / total) * 100) : 0}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Stacked Bar Chart ───────────────────────────────────────────────────────

function CategoryBarChart({ data }: { data: { name: string; critical: number; warning: number; info: number }[] }) {
  const hasData = data.some(d => d.critical + d.warning + d.info > 0);
  if (!hasData) return null;

  const BAR_COLORS = { critical: '#dc2626', warning: '#d97706', info: '#2563eb' };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
      <h3 className="text-sm font-semibold text-gray-900 mb-4">Issues by Category</h3>
      <div className="h-40">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 10, right: 20 }}>
            <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12, fill: '#6b7280' }} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: '#9ca3af' }} width={60} />
            <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', backgroundColor: '#ffffff', color: '#374151', fontSize: '13px' }} />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '12px', color: '#9ca3af' }} />
            <Bar dataKey="critical" name="Critical" stackId="a" fill={BAR_COLORS.critical} radius={[0, 0, 0, 0]} />
            <Bar dataKey="warning" name="Warning" stackId="a" fill={BAR_COLORS.warning} />
            <Bar dataKey="info" name="Info" stackId="a" fill={BAR_COLORS.info} radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ─── Issues Table Component ──────────────────────────────────────────────────

function IssuesTable({
  checks,
  search,
  onSearchChange,
  severityFilters,
  onToggleSeverity,
  sortColumn,
  sortDir,
  onSort,
  selectedCheck,
  onSelectCheck,
  title,
}: {
  checks: TaggedCheck[];
  search: string;
  onSearchChange: (v: string) => void;
  severityFilters: Set<Severity>;
  onToggleSeverity: (sev: Severity) => void;
  sortColumn: 'severity' | 'title' | 'source' | 'affected';
  sortDir: 'asc' | 'desc';
  onSort: (col: 'severity' | 'title' | 'source' | 'affected') => void;
  selectedCheck: TaggedCheck | null;
  onSelectCheck: (check: TaggedCheck | null) => void;
  title: string;
}) {
  const failedChecks = checks.filter(c => !c.passed);

  const tableData = useMemo(() => {
    let items = [...failedChecks];

    // Severity filter
    items = items.filter(c => severityFilters.has(c.severity));

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter(c =>
        c.title.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q)
      );
    }

    // Sort
    items.sort((a, b) => {
      let cmp = 0;
      switch (sortColumn) {
        case 'severity':
          cmp = severityOrder[a.severity] - severityOrder[b.severity];
          break;
        case 'title':
          cmp = a.title.localeCompare(b.title);
          break;
        case 'source':
          cmp = a.source.localeCompare(b.source);
          break;
        case 'affected':
          cmp = countAffectedItems(a) - countAffectedItems(b);
          break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return items;
  }, [failedChecks, severityFilters, search, sortColumn, sortDir]);

  if (failedChecks.length === 0) {
    return (
      <div className="rounded-md border border-pass/20 bg-pass/5 p-6 text-center">
        <div className="mb-2 text-3xl text-pass">{'\u2713'}</div>
        <h3 className="mb-1 font-display text-lg font-semibold text-pass">All {title} checks passed!</h3>
        <p className="text-sm text-pass">No issues detected in this category.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Table toolbar */}
      <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"><IconSearch /></div>
          <input
            type="text"
            value={search}
            onChange={e => onSearchChange(e.target.value)}
            placeholder="Search issues..."
            className="w-full rounded-sm border border-border bg-surface py-2 pl-9 pr-3 text-sm text-ink placeholder-muted/70 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/10"
          />
        </div>
        {/* Severity toggles */}
        <div className="flex items-center gap-1.5">
          {(['critical', 'warning', 'info'] as Severity[]).map(sev => {
            const cfg = severityConfig[sev];
            const active = severityFilters.has(sev);
            return (
              <button
                key={sev}
                onClick={() => onToggleSeverity(sev)}
                className={`
                  flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border transition-colors
                  ${active
                    ? `${cfg.badge} border-transparent`
                    : 'bg-surface-2 text-muted border-border'
                  }
                `}
              >
                <span className={`w-2 h-2 rounded-full ${active ? cfg.dot : 'bg-gray-600'}`} />
                {cfg.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="hidden sm:table-header-group">
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left py-3 px-4 font-semibold text-gray-400 text-xs uppercase tracking-wide w-28">
                <button className="flex items-center gap-1 hover:text-gray-900" onClick={() => onSort('severity')}>
                  Severity
                  <IconSort active={sortColumn === 'severity'} direction={sortDir} />
                </button>
              </th>
              <th className="text-left py-3 px-4 font-semibold text-gray-400 text-xs uppercase tracking-wide">
                <button className="flex items-center gap-1 hover:text-gray-900" onClick={() => onSort('title')}>
                  Issue
                  <IconSort active={sortColumn === 'title'} direction={sortDir} />
                </button>
              </th>
              <th className="text-left py-3 px-4 font-semibold text-gray-400 text-xs uppercase tracking-wide w-28">
                <button className="flex items-center gap-1 hover:text-gray-900" onClick={() => onSort('source')}>
                  Source
                  <IconSort active={sortColumn === 'source'} direction={sortDir} />
                </button>
              </th>
              <th className="text-left py-3 px-4 font-semibold text-gray-400 text-xs uppercase tracking-wide w-24">
                <button className="flex items-center gap-1 hover:text-gray-900" onClick={() => onSort('affected')}>
                  Items
                  <IconSort active={sortColumn === 'affected'} direction={sortDir} />
                </button>
              </th>
              <th className="w-10" />
            </tr>
          </thead>
          <tbody>
            {tableData.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-gray-500 text-sm">
                  No issues match your filters.
                </td>
              </tr>
            ) : (
              tableData.map(check => {
                const cfg = severityConfig[check.severity];
                const src = sourceConfig[check.source];
                const affected = countAffectedItems(check);
                const isSelected = selectedCheck?.id === check.id && selectedCheck?.source === check.source;

                return (
                  <tr
                    key={check.id + check.source}
                    onClick={() => onSelectCheck(isSelected ? null : check)}
                    className={`
                      border-b border-gray-100 cursor-pointer transition-colors
                      ${isSelected
                        ? 'bg-accent/5 border-l-2 border-l-accent'
                        : 'hover:bg-gray-50 border-l-2 border-l-transparent'
                      }
                    `}
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${cfg.dot}`} />
                        <span className={`text-xs font-medium ${cfg.text}`}>{cfg.label}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-gray-900 leading-tight">{check.title}</div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="text-xs text-gray-500 line-clamp-1">{check.description}</span>
                        <CheckLearnMoreLink id={check.id} />
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${src.badge}`}>
                        {src.label}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-500 font-medium">
                      {affected > 0 ? affected : '\u2014'}
                    </td>
                    <td className="py-3 px-2">
                      <IconChevronRight className={`w-4 h-4 transition-transform ${isSelected ? 'rotate-90 text-accent' : 'text-gray-400'}`} />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Table footer */}
      <div className="px-4 py-3 border-t border-gray-200 text-xs text-gray-500">
        Showing {tableData.length} of {failedChecks.length} issues
      </div>
    </div>
  );
}

// ─── Tab Section Component ───────────────────────────────────────────────────

function TabSection({
  checks,
  summary,
  title,
  icon,
  color,
  search,
  onSearchChange,
  severityFilters,
  onToggleSeverity,
  sortColumn,
  sortDir,
  onSort,
  selectedCheck,
  onSelectCheck,
}: {
  checks: TaggedCheck[];
  summary: AuditSummary;
  title: string;
  icon: React.ReactNode;
  color: string;
  search: string;
  onSearchChange: (v: string) => void;
  severityFilters: Set<Severity>;
  onToggleSeverity: (sev: Severity) => void;
  sortColumn: 'severity' | 'title' | 'source' | 'affected';
  sortDir: 'asc' | 'desc';
  onSort: (col: 'severity' | 'title' | 'source' | 'affected') => void;
  selectedCheck: TaggedCheck | null;
  onSelectCheck: (check: TaggedCheck | null) => void;
}) {
  const failed = checks.filter(c => !c.passed);
  const passed = checks.filter(c => c.passed);
  const [showPassed, setShowPassed] = useState(false);

  const donutData = [
    { name: 'Critical', value: summary.critical, color: DONUT_COLORS[0] },
    { name: 'Warning', value: summary.warning, color: DONUT_COLORS[1] },
    { name: 'Info', value: summary.info, color: DONUT_COLORS[2] },
    { name: 'Passed', value: summary.passed, color: DONUT_COLORS[3] },
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-6">
      {/* Total audit KPIs */}
      <div className="flex flex-col lg:flex-row gap-4">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 flex-1">
          <div className="rounded-md border border-border bg-surface p-4 flex items-start gap-3">
            <div className="p-2 rounded-sm bg-critical/10 text-critical shrink-0"><IconShield /></div>
            <div>
              <div className="font-display text-2xl font-semibold text-critical">{summary.critical}</div>
              <div className="text-xs text-critical font-medium">Critical</div>
            </div>
          </div>
          <div className="rounded-md border border-border bg-surface p-4 flex items-start gap-3">
            <div className="p-2 rounded-sm bg-warning/10 text-warning shrink-0"><IconAlertTriangle /></div>
            <div>
              <div className="font-display text-2xl font-semibold text-warning">{summary.warning}</div>
              <div className="text-xs text-warning font-medium">Warnings</div>
            </div>
          </div>
          <div className="rounded-md border border-border bg-surface p-4 flex items-start gap-3">
            <div className="p-2 rounded-sm bg-info/10 text-info shrink-0"><IconInfoCircle /></div>
            <div>
              <div className="font-display text-2xl font-semibold text-info">{summary.info}</div>
              <div className="text-xs text-info font-medium">Info</div>
            </div>
          </div>
          <div className="rounded-md border border-border bg-surface p-4 flex items-start gap-3">
            <div className="p-2 rounded-sm bg-pass/10 text-pass shrink-0"><IconCheckCircle /></div>
            <div>
              <div className="font-display text-2xl font-semibold text-pass">{summary.passed}</div>
              <div className="text-xs text-pass font-medium">Passed</div>
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      {failed.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <SeverityDonut data={donutData} />
        </div>
      )}

      {/* Issues Table */}
      <IssuesTable
        checks={checks}
        search={search}
        onSearchChange={onSearchChange}
        severityFilters={severityFilters}
        onToggleSeverity={onToggleSeverity}
        sortColumn={sortColumn}
        sortDir={sortDir}
        onSort={onSort}
        selectedCheck={selectedCheck}
        onSelectCheck={onSelectCheck}
        title={title}
      />

      {/* Passed Checks */}
      {passed.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <button
            onClick={() => setShowPassed(!showPassed)}
            className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="text-green-600"><IconCheckCircle /></span>
              <span>Passed Checks ({passed.length})</span>
            </div>
            <IconChevronRight className={`w-4 h-4 transition-transform ${showPassed ? 'rotate-90' : ''}`} />
          </button>
          {showPassed && (
            <div className="border-t border-gray-200">
              {passed.map(check => (
                <div
                  key={check.id + check.source}
                  className="flex items-center gap-3 px-4 py-2.5 border-b border-gray-100 last:border-0 text-sm"
                >
                  <span className="text-green-600 shrink-0">{'\u2713'}</span>
                  <span className="text-gray-700 flex-1">{check.title}</span>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${sourceConfig[check.source].badge}`}>
                    {sourceConfig[check.source].label}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Cross-Check Section (Always Visible) ────────────────────────────────────

function CrossCheckSection({
  checks,
  selectedCheck,
  onSelectCheck,
}: {
  checks: TaggedCheck[];
  selectedCheck: TaggedCheck | null;
  onSelectCheck: (check: TaggedCheck | null) => void;
}) {
  const failed = checks.filter(c => !c.passed);
  const passed = checks.filter(c => c.passed);
  const [showPassed, setShowPassed] = useState(false);

  if (checks.length === 0) return null;

  return (
    <div className="mt-8 border-t border-border pt-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="rounded-sm bg-accent/10 p-2 text-accent">
          <IconCross />
        </div>
        <div>
          <h2 className="font-display text-lg font-semibold text-ink">Cross-Platform Checks</h2>
          <p className="text-sm text-gray-500">Validation across GTM and Google Ads configurations</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {failed.length > 0 && (
            <span className="rounded-full bg-critical/10 px-2.5 py-1 text-xs font-medium text-critical">
              {failed.length} issue{failed.length !== 1 ? 's' : ''}
            </span>
          )}
          {passed.length > 0 && (
            <span className="rounded-full bg-pass/10 px-2.5 py-1 text-xs font-medium text-pass">
              {passed.length} passed
            </span>
          )}
        </div>
      </div>

      {/* Failed Cross-Checks */}
      {failed.length > 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-4">
          <div className="divide-y divide-gray-100">
            {failed.map(check => {
              const cfg = severityConfig[check.severity];
              const isSelected = selectedCheck?.id === check.id && selectedCheck?.source === check.source;

              return (
                <div
                  key={check.id}
                  onClick={() => onSelectCheck(isSelected ? null : check)}
                  className={`
                    p-4 cursor-pointer transition-colors
                    ${isSelected ? 'bg-accent/5 border-l-2 border-l-accent' : 'hover:bg-surface-2 border-l-2 border-l-transparent'}
                  `}
                >
                  <div className="flex items-start gap-3">
                    <span className={`w-2.5 h-2.5 rounded-full shrink-0 mt-1.5 ${cfg.dot}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cfg.badge}`}>
                          {cfg.label}
                        </span>
                      </div>
                      <h3 className="font-medium text-gray-900">{check.title}</h3>
                      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                        <p className="text-sm text-gray-500">{check.description}</p>
                        <CheckLearnMoreLink id={check.id} />
                      </div>
                    </div>
                    <IconChevronRight className={`w-4 h-4 shrink-0 transition-transform ${isSelected ? 'rotate-90 text-accent' : 'text-gray-400'}`} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="mb-4 rounded-md border border-pass/20 bg-pass/5 p-6 text-center">
          <div className="mb-2 text-3xl text-pass">{'\u2713'}</div>
          <h3 className="mb-1 font-display text-lg font-semibold text-pass">All cross-checks passed!</h3>
          <p className="text-sm text-pass">GTM and Google Ads configurations are properly aligned.</p>
        </div>
      )}

      {/* Passed Cross-Checks */}
      {passed.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <button
            onClick={() => setShowPassed(!showPassed)}
            className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="text-pass"><IconCheckCircle /></span>
              <span>Passed Cross-Checks ({passed.length})</span>
            </div>
            <IconChevronRight className={`w-4 h-4 transition-transform ${showPassed ? 'rotate-90' : ''}`} />
          </button>
          {showPassed && (
            <div className="border-t border-gray-200">
              {passed.map(check => (
                <div
                  key={check.id}
                  className="flex items-center gap-3 px-4 py-2.5 border-b border-gray-100 last:border-0 text-sm"
                >
                  <span className="text-pass shrink-0">{'\u2713'}</span>
                  <span className="text-gray-700 flex-1">{check.title}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TopFindings({
  checks,
  onSelectCheck,
}: {
  checks: TaggedCheck[];
  onSelectCheck: (check: TaggedCheck | null) => void;
}) {
  const topFindings = checks
    .filter((check) => !check.passed)
    .sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])
    .slice(0, 3);

  if (topFindings.length === 0) return null;

  return (
    <section id="results" className="mb-8">
      <div className="mb-4">
        <p className="text-xs font-semibold uppercase text-muted">Start here</p>
        <h2 className="font-display text-2xl font-semibold text-ink">Most critical findings</h2>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        {topFindings.map((check) => {
          const cfg = severityConfig[check.severity];
          const src = sourceConfig[check.source];

          return (
            <article
              key={`${check.source}-${check.id}`}
              className={`rounded-md border bg-surface p-5 transition-colors hover:border-ink/20 ${cfg.border}`}
            >
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${cfg.badge}`}>
                  {cfg.label}
                </span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${src.badge}`}>
                  {src.label}
                </span>
              </div>
              <h3 className="font-display text-xl font-semibold leading-tight text-ink">{check.title}</h3>
              <p className="mt-3 text-sm leading-6 text-muted">{check.description}</p>
              {check.recommendation && (
                <div className="mt-4 rounded-md border border-border bg-surface-2 p-3 text-sm leading-6 text-ink">
                  {check.recommendation}
                </div>
              )}
              <div className="mt-4 flex items-center justify-between gap-3">
                <CheckLearnMoreLink id={check.id} />
                <button
                  type="button"
                  onClick={() => onSelectCheck(check)}
                  className="text-xs font-medium text-muted transition-colors hover:text-ink"
                >
                  View details
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

function AuditPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [results, setResults] = useState<AuditResults | null>(null);
  const [loading, setLoading] = useState(true);
  const [parseError, setParseError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('gtm');
  const [selectedCheck, setSelectedCheck] = useState<TaggedCheck | null>(null);
  const [search, setSearch] = useState('');
  const [severityFilters, setSeverityFilters] = useState<Set<Severity>>(new Set(['critical', 'warning', 'info']));
  const [sortColumn, setSortColumn] = useState<'severity' | 'title' | 'source' | 'affected'>('severity');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [canCompare, setCanCompare] = useState(false);
  const tabButtonRefs = useRef<Record<Tab, HTMLButtonElement | null>>({
    gtm: null,
    ads: null,
    meta: null,
    tiktok: null,
    linkedin: null,
  });

  // Audit counter for PDF unlock feature
  const {
    canExportPDF,
    shouldShowUnlockModal,
    incrementAuditCount,
    markAsSubscribed,
    dismissUnlockModal,
  } = useAuditCounter();

  // Track if we've already counted this audit session
  const hasCountedAudit = useRef(false);
  const hasSavedHistory = useRef(false);
  const restoredFromHistory = useRef(false);
  const sourceSnapshot = useRef<(AuditSourceData & { context?: AuditContext }) | null>(null);

  useEffect(() => {
    setCanCompare(getHistory().length >= 2);
    const restoreId = searchParams.get('restore');
    if (restoreId) {
      const entry = getEntry(restoreId);
      if (entry) {
        restoredFromHistory.current = true;
        restoreSourceData({
          gtmData: (entry.sourceData.gtmData as GTMContainer | undefined) ?? null,
          adsData: (entry.sourceData.adsData as AdsData | undefined) ?? null,
          reportData: (entry.sourceData.reportData as AdsReportData | undefined) ?? null,
          metaData: (entry.sourceData.metaData as MetaPixelData | undefined) ?? null,
          tiktokData: (entry.sourceData.tiktokData as TikTokPixelData | undefined) ?? null,
          linkedinData: (entry.sourceData.linkedinData as LinkedInInsightData | undefined) ?? null,
        });

        if (entry.context) {
          sessionStorage.setItem('auditContext', JSON.stringify(entry.context));
        } else {
          sessionStorage.removeItem('auditContext');
        }
      }
    }

    const gtmDataStr = sessionStorage.getItem('gtmData');
    const adsDataStr = sessionStorage.getItem('adsData');
    const reportDataStr = sessionStorage.getItem('reportData');
    const metaDataStr = sessionStorage.getItem('metaData');
    const tiktokDataStr = sessionStorage.getItem('tiktokData');
    const linkedinDataStr = sessionStorage.getItem('linkedinData');
    const contextStr = sessionStorage.getItem('auditContext');

    if (!gtmDataStr && !adsDataStr && !reportDataStr && !metaDataStr && !tiktokDataStr && !linkedinDataStr) {
      router.push('/');
      return;
    }

    try {
      const gtmData: GTMContainer | null = gtmDataStr ? JSON.parse(gtmDataStr) : null;
      const adsData: AdsData | null = adsDataStr ? JSON.parse(adsDataStr) : null;
      const reportData: AdsReportData | null = reportDataStr ? JSON.parse(reportDataStr) : null;
      const metaData: MetaPixelData | null = metaDataStr ? JSON.parse(metaDataStr) : null;
      const tiktokData: TikTokPixelData | null = tiktokDataStr ? JSON.parse(tiktokDataStr) : null;
      const linkedinData: LinkedInInsightData | null = linkedinDataStr ? JSON.parse(linkedinDataStr) : null;
      const context: AuditContext | undefined = contextStr ? JSON.parse(contextStr) : undefined;

      sourceSnapshot.current = { gtmData, adsData, reportData, metaData, tiktokData, linkedinData, context };

      const auditResults = runAudit(gtmData, adsData, context, reportData, metaData, tiktokData, linkedinData);
      setResults(auditResults);
      setLoading(false);

      // Set initial tab based on available data
      if (linkedinData && !gtmData && !adsData && !metaData && !tiktokData) setActiveTab('linkedin');
      else if (tiktokData && !gtmData && !adsData && !metaData && !linkedinData) setActiveTab('tiktok');
      else if (metaData && !gtmData && !adsData && !linkedinData) setActiveTab('meta');
      else if (gtmData && !adsData) setActiveTab('gtm');
      else if (adsData && !gtmData) setActiveTab('ads');

      // Increment audit count once per audit session
      if (!hasCountedAudit.current) {
        hasCountedAudit.current = true;
        incrementAuditCount();
      }
    } catch (err) {
      console.error('Failed to parse audit data:', err);
      setParseError(
        'Failed to load audit data. The uploaded file may be corrupted or in an unexpected format. ' +
        'Please go back and try uploading your files again.'
      );
      setLoading(false);
    }
  }, [router, incrementAuditCount, searchParams]);

  const healthScore = useMemo(() => results ? computeHealthScore(results) : null, [results]);

  useEffect(() => {
    if (!results || restoredFromHistory.current || hasSavedHistory.current || !sourceSnapshot.current) {
      return;
    }

    const { context, ...sourceData } = sourceSnapshot.current;
    const toolSlug = detectToolSlug(sourceData);
    const tool = getToolBySlug(toolSlug);

    saveEntry({
      toolSlug,
      toolName: tool?.name ?? 'Audit',
      fileNames: collectFileNames(sourceData),
      context,
      score: healthScore?.score,
      scoreBand: healthScore?.band,
      results,
      sourceData: {
        gtmData: sourceData.gtmData ?? undefined,
        adsData: sourceData.adsData ?? undefined,
        reportData: sourceData.reportData ?? undefined,
        metaData: sourceData.metaData ?? undefined,
        tiktokData: sourceData.tiktokData ?? undefined,
        linkedinData: sourceData.linkedinData ?? undefined,
      },
    });

    hasSavedHistory.current = true;
    setCanCompare(getHistory().length >= 2);
  }, [results, healthScore]);

  useEffect(() => {
    tabButtonRefs.current[activeTab]?.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'nearest',
    });
  }, [activeTab]);

  const handleClosePanel = useCallback(() => setSelectedCheck(null), []);

  // ─── Derived data ────────────────────────────────────────────────────────

  const allTagged = useMemo(() => results ? tagChecks(results) : [], [results]);

  // Filter out passed info checks
  const displayed = useMemo(() => allTagged.filter(c => !(c.severity === 'info' && c.passed)), [allTagged]);
  const totalSummary = useMemo(() => summarizeChecks(allTagged), [allTagged]);

  // Separate checks by category
  const gtmChecks = useMemo(() => displayed.filter(c => c.source === 'gtm'), [displayed]);
  const adsChecks = useMemo(() => displayed.filter(c => c.source === 'ads' || c.source === 'report'), [displayed]);
  const crossChecks = useMemo(() => displayed.filter(c => c.source === 'cross'), [displayed]);
  const metaChecks = useMemo(() => displayed.filter(c => c.source === 'meta'), [displayed]);
  const tiktokChecks = useMemo(() => displayed.filter(c => c.source === 'tiktok'), [displayed]);
  const linkedinChecks = useMemo(() => displayed.filter(c => c.source === 'linkedin'), [displayed]);

  // Tab counts for badges
  const gtmFailedCount = useMemo(() => gtmChecks.filter(c => !c.passed).length, [gtmChecks]);
  const adsFailedCount = useMemo(() => adsChecks.filter(c => !c.passed).length, [adsChecks]);
  const crossFailedCount = useMemo(() => crossChecks.filter(c => !c.passed).length, [crossChecks]);
  const metaFailedCount = useMemo(() => metaChecks.filter(c => !c.passed).length, [metaChecks]);
  const tiktokFailedCount = useMemo(() => tiktokChecks.filter(c => !c.passed).length, [tiktokChecks]);
  const linkedinFailedCount = useMemo(() => linkedinChecks.filter(c => !c.passed).length, [linkedinChecks]);

  // Check if tabs have data
  const hasGTMData = gtmChecks.length > 0;
  const hasAdsData = adsChecks.length > 0;
  const hasMetaData = metaChecks.length > 0;
  const hasTikTokData = tiktokChecks.length > 0;
  const hasLinkedInData = linkedinChecks.length > 0;

  // ─── Sort handler ────────────────────────────────────────────────────────

  function handleSort(col: typeof sortColumn) {
    if (sortColumn === col) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(col);
      setSortDir('asc');
    }
  }

  function toggleSeverityFilter(sev: Severity) {
    setSeverityFilters(prev => {
      const next = new Set(prev);
      if (next.has(sev)) {
        if (next.size > 1) next.delete(sev);
      } else {
        next.add(sev);
      }
      return next;
    });
  }

  // ─── Audit type label ────────────────────────────────────────────────────

  const auditType = useMemo(() => {
    if (!results) return 'Audit';
    const parts: string[] = [];
    if (results.gtm.length > 0) parts.push('GTM');
    if (results.ads.length > 0) parts.push('Ads');
    if (results.report.length > 0) parts.push('Report');
    if (results.meta.length > 0) parts.push('Meta');
    if (results.tiktok.length > 0) parts.push('TikTok');
    if (results.linkedin.length > 0) parts.push('LinkedIn');
    if (parts.length === 0) return 'Audit';
    if (parts.length === 1) return `${parts[0]} Audit`;
    return `${parts.join(' + ')} Audit`;
  }, [results]);

  // ─── Error state ─────────────────────────────────────────────────────────

  if (parseError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-bg px-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-critical/10">
          <svg className="h-8 w-8 text-critical" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
        </div>
        <h2 className="font-display text-xl font-semibold text-ink">Unable to Load Audit</h2>
        <p className="max-w-md text-center text-muted">{parseError}</p>
        <button
          onClick={() => {
            sessionStorage.clear();
            router.push('/');
          }}
          className="mt-4 rounded-sm bg-accent px-6 py-2.5 font-medium text-white transition-colors hover:bg-accent-hover"
        >
          Start Over
        </button>
      </div>
    );
  }

  // ─── Loading state ───────────────────────────────────────────────────────

  if (loading || !results) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-bg">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent" />
        <p className="text-lg text-muted">Analyzing your setup...</p>
      </div>
    );
  }

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-bg">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-border bg-surface/85 px-4 py-4 backdrop-blur-sm lg:px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3 sm:gap-4">
            <Link href="/" className="font-display text-xl font-semibold text-accent transition-colors hover:text-accent-hover">
              AdLint
            </Link>
            <div className="hidden h-6 w-px bg-border sm:block" />
            <div className="min-w-0">
              <h1 className="truncate font-display text-lg font-semibold text-ink">Audit Results</h1>
              <span className="hidden text-xs text-muted sm:inline">{auditType}</span>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
            <AuditHistoryLink />
            <PDFExportButton
              results={results}
              auditType={auditType}
              canExportPDF={canExportPDF}
              shouldShowUnlockModal={shouldShowUnlockModal}
              onSubscribe={markAsSubscribed}
              onDismissModal={dismissUnlockModal}
            />
            <button
              onClick={() => {
                sessionStorage.clear();
                router.push('/');
              }}
              aria-label="New audit"
              className="inline-flex h-10 w-10 items-center justify-center rounded-sm text-sm text-gray-500 transition-colors hover:bg-surface-2 hover:text-gray-900 sm:h-auto sm:w-auto sm:px-0"
            >
              <RotateCcw className="h-4 w-4 sm:hidden" aria-hidden="true" />
              <span className="hidden sm:inline">New Audit</span>
            </button>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="sticky top-[65px] z-10 border-b border-border bg-surface sm:top-[73px]">
        <div className="max-w-7xl mx-auto px-4 lg:px-6">
          <nav className="flex gap-1 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:overflow-visible">
            {hasGTMData && (
              <button
                ref={(node) => { tabButtonRefs.current.gtm = node; }}
                onClick={() => setActiveTab('gtm')}
                className={`
                  relative flex-shrink-0 whitespace-nowrap px-5 py-3 text-sm font-medium transition-colors
                  ${activeTab === 'gtm'
                    ? 'text-accent'
                    : 'text-gray-500 hover:text-gray-900'
                  }
                `}
              >
                <div className="flex items-center gap-2">
                  <span>Google Tag Manager</span>
                  <TabIssueBadge count={gtmFailedCount} checks={gtmChecks} />
                </div>
                {activeTab === 'gtm' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent" />
                )}
              </button>
            )}
            {hasAdsData && (
              <button
                ref={(node) => { tabButtonRefs.current.ads = node; }}
                onClick={() => setActiveTab('ads')}
                className={`
                  relative flex-shrink-0 whitespace-nowrap px-5 py-3 text-sm font-medium transition-colors
                  ${activeTab === 'ads'
                    ? 'text-accent'
                    : 'text-gray-500 hover:text-gray-900'
                  }
                `}
              >
                <div className="flex items-center gap-2">
                  <span>Google Ads</span>
                  <TabIssueBadge count={adsFailedCount} checks={adsChecks} />
                </div>
                {activeTab === 'ads' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent" />
                )}
              </button>
            )}
            {hasMetaData && (
              <button
                ref={(node) => { tabButtonRefs.current.meta = node; }}
                onClick={() => setActiveTab('meta')}
                className={`
                  relative flex-shrink-0 whitespace-nowrap px-5 py-3 text-sm font-medium transition-colors
                  ${activeTab === 'meta'
                    ? 'text-accent'
                    : 'text-gray-500 hover:text-gray-900'
                  }
                `}
              >
                <div className="flex items-center gap-2">
                  <span>Meta Pixel</span>
                  <TabIssueBadge count={metaFailedCount} checks={metaChecks} />
                </div>
                {activeTab === 'meta' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent" />
                )}
              </button>
            )}
            {hasTikTokData && (
              <button
                ref={(node) => { tabButtonRefs.current.tiktok = node; }}
                onClick={() => setActiveTab('tiktok')}
                className={`
                  relative flex-shrink-0 whitespace-nowrap px-5 py-3 text-sm font-medium transition-colors
                  ${activeTab === 'tiktok'
                    ? 'text-accent'
                    : 'text-gray-500 hover:text-gray-900'
                  }
                `}
              >
                <div className="flex items-center gap-2">
                  <span>TikTok Pixel</span>
                  <TabIssueBadge count={tiktokFailedCount} checks={tiktokChecks} />
                </div>
                {activeTab === 'tiktok' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent" />
                )}
              </button>
            )}
            {hasLinkedInData && (
              <button
                ref={(node) => { tabButtonRefs.current.linkedin = node; }}
                onClick={() => setActiveTab('linkedin')}
                className={`
                  relative flex-shrink-0 whitespace-nowrap px-5 py-3 text-sm font-medium transition-colors
                  ${activeTab === 'linkedin'
                    ? 'text-accent'
                    : 'text-gray-500 hover:text-gray-900'
                  }
                `}
              >
                <div className="flex items-center gap-2">
                  <span>LinkedIn Insight Tag</span>
                  <TabIssueBadge count={linkedinFailedCount} checks={linkedinChecks} />
                </div>
                {activeTab === 'linkedin' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent" />
                )}
              </button>
            )}
            {crossChecks.length > 0 && (
              <div className="flex flex-shrink-0 items-center whitespace-nowrap px-5 py-3 text-sm text-accent">
                <div className="flex items-center gap-2">
                  <IconCross />
                  <span className="font-medium">Cross-Check</span>
                  <TabIssueBadge count={crossFailedCount} checks={crossChecks} />
                  <span className="text-xs text-gray-400 ml-1">(always visible)</span>
                </div>
              </div>
            )}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 lg:px-6 py-6">
        {healthScore && (
          <section className="mb-8 flex flex-col items-center gap-5 rounded-lg border border-border bg-surface p-8">
            <HealthScoreBadge score={healthScore} size="large" />
            <div className="flex flex-wrap items-center justify-center gap-3">
              <a
                href="#results"
                className="inline-flex h-10 items-center justify-center rounded-sm bg-accent px-5 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
              >
                View results
              </a>
              <ShareAuditButton score={healthScore} />
              {canCompare && (
                <Link
                  href="/history"
                  className="inline-flex h-10 items-center justify-center rounded-sm px-3 text-sm font-medium text-muted transition-colors hover:text-ink"
                >
                  Compare to last audit
                </Link>
              )}
            </div>
          </section>
        )}

        <TopFindings checks={displayed} onSelectCheck={setSelectedCheck} />

        {/* Tab Content */}
        {activeTab === 'gtm' && hasGTMData && (
          <TabSection
            checks={gtmChecks}
            summary={totalSummary}
            title="Google Tag Manager"
            icon={<span className="text-accent">GTM</span>}
            color="accent"
            search={search}
            onSearchChange={setSearch}
            severityFilters={severityFilters}
            onToggleSeverity={toggleSeverityFilter}
            sortColumn={sortColumn}
            sortDir={sortDir}
            onSort={handleSort}
            selectedCheck={selectedCheck}
            onSelectCheck={setSelectedCheck}
          />
        )}

        {activeTab === 'ads' && hasAdsData && (
          <TabSection
            checks={adsChecks}
            summary={totalSummary}
            title="Google Ads"
            icon={<span className="text-accent">Ads</span>}
            color="accent"
            search={search}
            onSearchChange={setSearch}
            severityFilters={severityFilters}
            onToggleSeverity={toggleSeverityFilter}
            sortColumn={sortColumn}
            sortDir={sortDir}
            onSort={handleSort}
            selectedCheck={selectedCheck}
            onSelectCheck={setSelectedCheck}
          />
        )}

        {activeTab === 'meta' && hasMetaData && (
          <TabSection
            checks={metaChecks}
            summary={totalSummary}
            title="Meta Pixel"
            icon={<span className="text-accent">Meta</span>}
            color="accent"
            search={search}
            onSearchChange={setSearch}
            severityFilters={severityFilters}
            onToggleSeverity={toggleSeverityFilter}
            sortColumn={sortColumn}
            sortDir={sortDir}
            onSort={handleSort}
            selectedCheck={selectedCheck}
            onSelectCheck={setSelectedCheck}
          />
        )}

        {activeTab === 'tiktok' && hasTikTokData && (
          <TabSection
            checks={tiktokChecks}
            summary={totalSummary}
            title="TikTok Pixel"
            icon={<span className="text-accent">TikTok</span>}
            color="accent"
            search={search}
            onSearchChange={setSearch}
            severityFilters={severityFilters}
            onToggleSeverity={toggleSeverityFilter}
            sortColumn={sortColumn}
            sortDir={sortDir}
            onSort={handleSort}
            selectedCheck={selectedCheck}
            onSelectCheck={setSelectedCheck}
          />
        )}

        {activeTab === 'linkedin' && hasLinkedInData && (
          <TabSection
            checks={linkedinChecks}
            summary={totalSummary}
            title="LinkedIn Insight Tag"
            icon={<span className="text-accent">LinkedIn</span>}
            color="accent"
            search={search}
            onSearchChange={setSearch}
            severityFilters={severityFilters}
            onToggleSeverity={toggleSeverityFilter}
            sortColumn={sortColumn}
            sortDir={sortDir}
            onSort={handleSort}
            selectedCheck={selectedCheck}
            onSelectCheck={setSelectedCheck}
          />
        )}

        {/* Cross-Check Section (Always Visible) */}
        <CrossCheckSection
          checks={crossChecks}
          selectedCheck={selectedCheck}
          onSelectCheck={setSelectedCheck}
        />

        <section className="mt-8 rounded-lg border border-border bg-surface p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase text-accent">
                Need help fixing the root cause?
              </p>
              <h2 className="mt-2 font-display text-2xl font-semibold text-ink">
                Still seeing audit issues after reviewing this report? That usually means the problem is upstream.
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-muted">
                I debug these stacks daily across GTM, Google Ads, Meta CAPI, Enhanced Conversions, LinkedIn Insight Tag, and CRM validation. If the report surfaced {gtmFailedCount + adsFailedCount + crossFailedCount + metaFailedCount + tiktokFailedCount + linkedinFailedCount} live issue{gtmFailedCount + adsFailedCount + crossFailedCount + metaFailedCount + tiktokFailedCount + linkedinFailedCount === 1 ? '' : 's'}, a short review will usually identify what to fix first.
              </p>
            </div>
            <a
              href="https://focosys.io/review"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center rounded-sm bg-accent px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
            >
              Book a free 30-min measurement review
            </a>
          </div>
        </section>
      </main>

      {/* Slide-over detail panel */}
      <SlideOverPanel check={selectedCheck} onClose={handleClosePanel} />
    </div>
  );
}

export default function AuditPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-bg">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent" />
          <p className="text-lg text-muted">Loading audit...</p>
        </div>
      }
    >
      <AuditPageContent />
    </Suspense>
  );
}
