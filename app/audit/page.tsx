'use client';

import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { runAudit } from '@/lib/auditEngine';
import { AuditResults, AuditCheck, GTMContainer, AdsData, AdsReportData, Severity } from '@/lib/types';
import { useAuditCounter } from '@/lib/hooks/useAuditCounter';
import { PDFExportButton } from '@/components/PDFExportButton';
import {
  PieChart, Pie, Cell, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend,
} from 'recharts';

// ─── Constants ───────────────────────────────────────────────────────────────

type Source = 'gtm' | 'ads' | 'cross' | 'report';
type Tab = 'gtm' | 'ads';

const severityConfig: Record<Severity, { label: string; color: string; bg: string; border: string; text: string; badge: string; dot: string }> = {
  critical: {
    label: 'Critical',
    color: '#dc2626',
    bg: 'bg-red-50',
    border: 'border-red-400',
    text: 'text-red-700',
    badge: 'bg-red-100 text-red-700',
    dot: 'bg-red-500',
  },
  warning: {
    label: 'Warning',
    color: '#d97706',
    bg: 'bg-amber-50',
    border: 'border-amber-400',
    text: 'text-amber-700',
    badge: 'bg-amber-100 text-amber-700',
    dot: 'bg-amber-500',
  },
  info: {
    label: 'Info',
    color: '#2563eb',
    bg: 'bg-blue-50',
    border: 'border-blue-400',
    text: 'text-blue-700',
    badge: 'bg-blue-100 text-blue-700',
    dot: 'bg-blue-500',
  },
};

const sourceConfig: Record<Source, { label: string; badge: string }> = {
  gtm: { label: 'GTM', badge: 'bg-purple-100 text-purple-700' },
  ads: { label: 'Ads', badge: 'bg-sky-100 text-sky-700' },
  cross: { label: 'Cross-Check', badge: 'bg-orange-100 text-orange-700' },
  report: { label: 'Report', badge: 'bg-teal-100 text-teal-700' },
};

const severityOrder: Record<Severity, number> = { critical: 0, warning: 1, info: 2 };

const DONUT_COLORS = ['#dc2626', '#d97706', '#2563eb', '#16a34a'];

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
    <svg className="w-3.5 h-3.5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
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

function tagChecks(results: AuditResults): TaggedCheck[] {
  const tag = (checks: AuditCheck[], source: Source): TaggedCheck[] =>
    checks.map(c => ({ ...c, source }));
  return [
    ...tag(results.gtm, 'gtm'),
    ...tag(results.ads, 'ads'),
    ...tag(results.cross, 'cross'),
    ...tag(results.report, 'report'),
  ];
}

function countAffectedItems(check: AuditCheck): number {
  if (!check.details) return 0;
  let total = 0;
  for (const value of Object.values(check.details)) {
    if (Array.isArray(value)) total += value.length;
  }
  return total;
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
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Recommendation</h3>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-700 leading-relaxed">
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

// ─── Health Score Ring ────────────────────────────────────────────────────────

function HealthRing({ score, passed, total }: { score: number; passed: number; total: number }) {
  const ringColor = score < 40 ? '#dc2626' : score < 70 ? '#d97706' : '#16a34a';
  const data = [
    { value: score },
    { value: 100 - score },
  ];

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-24 h-24">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={32}
              outerRadius={42}
              startAngle={90}
              endAngle={-270}
              dataKey="value"
              stroke="none"
            >
              <Cell fill={ringColor} />
              <Cell fill="#e5e7eb" />
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-bold text-gray-900">{score}%</span>
        </div>
      </div>
      <span className="text-xs text-gray-500 mt-1">{passed}/{total} passed</span>
    </div>
  );
}

// ─── Donut Chart ─────────────────────────────────────────────────────────────

function SeverityDonut({ data }: { data: { name: string; value: number; color: string }[] }) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  if (total === 0) return null;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
      <h3 className="text-sm font-semibold text-gray-900 mb-4">Issue Distribution</h3>
      <div className="flex items-center gap-6">
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
        <div className="space-y-2 flex-1">
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
      <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
        <div className="text-3xl mb-2">{'\u2705'}</div>
        <h3 className="text-lg font-bold text-green-700 mb-1">All {title} checks passed!</h3>
        <p className="text-green-600 text-sm">No issues detected in this category.</p>
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
            className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-gray-200 text-gray-900 placeholder-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                    : 'bg-gray-50 text-gray-500 border-gray-200'
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
          <thead>
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
                        ? 'bg-blue-50 border-l-2 border-l-blue-500'
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
                      <div className="text-xs text-gray-500 mt-0.5 line-clamp-1">{check.description}</div>
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
                      <IconChevronRight className={`w-4 h-4 transition-transform ${isSelected ? 'rotate-90 text-blue-600' : 'text-gray-400'}`} />
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

  const summary = useMemo(() => {
    const s = { critical: 0, warning: 0, info: 0, passed: 0 };
    for (const c of checks) {
      if (c.passed) s.passed++;
      else s[c.severity]++;
    }
    return s;
  }, [checks]);

  const healthScore = checks.length > 0
    ? Math.round((passed.length / checks.length) * 100)
    : 100;

  const donutData = [
    { name: 'Critical', value: summary.critical, color: DONUT_COLORS[0] },
    { name: 'Warning', value: summary.warning, color: DONUT_COLORS[1] },
    { name: 'Info', value: summary.info, color: DONUT_COLORS[2] },
    { name: 'Passed', value: summary.passed, color: DONUT_COLORS[3] },
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-6">
      {/* Section Header with KPIs */}
      <div className="flex flex-col lg:flex-row gap-4">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 flex-1">
          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm flex items-start gap-3">
            <div className="p-2 rounded-lg bg-red-50 text-red-600 shrink-0"><IconShield /></div>
            <div>
              <div className="text-2xl font-bold text-red-600">{summary.critical}</div>
              <div className="text-xs text-red-600/80 font-medium">Critical</div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm flex items-start gap-3">
            <div className="p-2 rounded-lg bg-amber-50 text-amber-600 shrink-0"><IconAlertTriangle /></div>
            <div>
              <div className="text-2xl font-bold text-amber-600">{summary.warning}</div>
              <div className="text-xs text-amber-600/80 font-medium">Warnings</div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm flex items-start gap-3">
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600 shrink-0"><IconInfoCircle /></div>
            <div>
              <div className="text-2xl font-bold text-blue-600">{summary.info}</div>
              <div className="text-xs text-blue-600/80 font-medium">Info</div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm flex items-start gap-3">
            <div className="p-2 rounded-lg bg-green-50 text-green-600 shrink-0"><IconCheckCircle /></div>
            <div>
              <div className="text-2xl font-bold text-green-600">{summary.passed}</div>
              <div className="text-xs text-green-600/80 font-medium">Passed</div>
            </div>
          </div>
        </div>

        {/* Health ring */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex items-center justify-center lg:w-40 shrink-0">
          <HealthRing score={healthScore} passed={passed.length} total={checks.length} />
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
    <div className="mt-8 pt-8 border-t-2 border-orange-200">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-orange-100 text-orange-600">
          <IconCross />
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-900">Cross-Platform Checks</h2>
          <p className="text-sm text-gray-500">Validation across GTM and Google Ads configurations</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {failed.length > 0 && (
            <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-red-100 text-red-700">
              {failed.length} issue{failed.length !== 1 ? 's' : ''}
            </span>
          )}
          {passed.length > 0 && (
            <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-green-100 text-green-700">
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
                    ${isSelected ? 'bg-blue-50 border-l-2 border-l-blue-500' : 'hover:bg-gray-50 border-l-2 border-l-transparent'}
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
                      <p className="text-sm text-gray-500 mt-1">{check.description}</p>
                    </div>
                    <IconChevronRight className={`w-4 h-4 shrink-0 transition-transform ${isSelected ? 'rotate-90 text-blue-600' : 'text-gray-400'}`} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center mb-4">
          <div className="text-3xl mb-2">{'\u2705'}</div>
          <h3 className="text-lg font-bold text-green-700 mb-1">All cross-checks passed!</h3>
          <p className="text-green-600 text-sm">GTM and Google Ads configurations are properly aligned.</p>
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
              <span className="text-green-600"><IconCheckCircle /></span>
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
                  <span className="text-green-600 shrink-0">{'\u2713'}</span>
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

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function AuditPage() {
  const router = useRouter();
  const [results, setResults] = useState<AuditResults | null>(null);
  const [loading, setLoading] = useState(true);
  const [parseError, setParseError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('gtm');
  const [selectedCheck, setSelectedCheck] = useState<TaggedCheck | null>(null);
  const [search, setSearch] = useState('');
  const [severityFilters, setSeverityFilters] = useState<Set<Severity>>(new Set(['critical', 'warning', 'info']));
  const [sortColumn, setSortColumn] = useState<'severity' | 'title' | 'source' | 'affected'>('severity');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

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

  useEffect(() => {
    const gtmDataStr = sessionStorage.getItem('gtmData');
    const adsDataStr = sessionStorage.getItem('adsData');
    const reportDataStr = sessionStorage.getItem('reportData');

    if (!gtmDataStr && !adsDataStr && !reportDataStr) {
      router.push('/');
      return;
    }

    try {
      const gtmData: GTMContainer | null = gtmDataStr ? JSON.parse(gtmDataStr) : null;
      const adsData: AdsData | null = adsDataStr ? JSON.parse(adsDataStr) : null;
      const reportData: AdsReportData | null = reportDataStr ? JSON.parse(reportDataStr) : null;

      const auditResults = runAudit(gtmData, adsData, undefined, reportData);
      setResults(auditResults);
      setLoading(false);

      // Set initial tab based on available data
      if (gtmData && !adsData) setActiveTab('gtm');
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
  }, [router, incrementAuditCount]);

  const handleClosePanel = useCallback(() => setSelectedCheck(null), []);

  // ─── Derived data ────────────────────────────────────────────────────────

  const allTagged = useMemo(() => results ? tagChecks(results) : [], [results]);

  // Filter out passed info checks
  const displayed = useMemo(() => allTagged.filter(c => !(c.severity === 'info' && c.passed)), [allTagged]);

  // Separate checks by category
  const gtmChecks = useMemo(() => displayed.filter(c => c.source === 'gtm'), [displayed]);
  const adsChecks = useMemo(() => displayed.filter(c => c.source === 'ads' || c.source === 'report'), [displayed]);
  const crossChecks = useMemo(() => displayed.filter(c => c.source === 'cross'), [displayed]);

  // Tab counts for badges
  const gtmFailedCount = useMemo(() => gtmChecks.filter(c => !c.passed).length, [gtmChecks]);
  const adsFailedCount = useMemo(() => adsChecks.filter(c => !c.passed).length, [adsChecks]);
  const crossFailedCount = useMemo(() => crossChecks.filter(c => !c.passed).length, [crossChecks]);

  // Check if tabs have data
  const hasGTMData = gtmChecks.length > 0;
  const hasAdsData = adsChecks.length > 0;

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
    return parts.length === 3 ? 'Full Audit' : parts.length > 0 ? `${parts.join(' + ')} Audit` : 'Audit';
  }, [results]);

  // ─── Error state ─────────────────────────────────────────────────────────

  if (parseError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-red-50 to-white gap-4 px-4">
        <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
          <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-gray-900">Unable to Load Audit</h2>
        <p className="text-gray-600 text-center max-w-md">{parseError}</p>
        <button
          onClick={() => {
            sessionStorage.clear();
            router.push('/');
          }}
          className="mt-4 px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
        >
          Start Over
        </button>
      </div>
    );
  }

  // ─── Loading state ───────────────────────────────────────────────────────

  if (loading || !results) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-blue-50 to-white gap-3">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-600 text-lg">Analyzing your setup...</p>
      </div>
    );
  }

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 px-4 lg:px-6 py-4 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-xl font-bold text-blue-600">AdLint</span>
            <div className="h-6 w-px bg-gray-200" />
            <div>
              <h1 className="text-lg font-bold text-gray-900">Audit Results</h1>
              <span className="text-xs text-gray-500">{auditType}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
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
              className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
            >
              New Audit
            </button>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200 sticky top-[73px] z-10">
        <div className="max-w-7xl mx-auto px-4 lg:px-6">
          <nav className="flex gap-1">
            {hasGTMData && (
              <button
                onClick={() => setActiveTab('gtm')}
                className={`
                  relative px-5 py-3 text-sm font-medium transition-colors
                  ${activeTab === 'gtm'
                    ? 'text-purple-600'
                    : 'text-gray-500 hover:text-gray-900'
                  }
                `}
              >
                <div className="flex items-center gap-2">
                  <span>Google Tag Manager</span>
                  {gtmFailedCount > 0 && (
                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                      activeTab === 'gtm' ? 'bg-purple-100 text-purple-600' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {gtmFailedCount}
                    </span>
                  )}
                </div>
                {activeTab === 'gtm' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-600" />
                )}
              </button>
            )}
            {hasAdsData && (
              <button
                onClick={() => setActiveTab('ads')}
                className={`
                  relative px-5 py-3 text-sm font-medium transition-colors
                  ${activeTab === 'ads'
                    ? 'text-sky-600'
                    : 'text-gray-500 hover:text-gray-900'
                  }
                `}
              >
                <div className="flex items-center gap-2">
                  <span>Google Ads</span>
                  {adsFailedCount > 0 && (
                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                      activeTab === 'ads' ? 'bg-sky-100 text-sky-600' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {adsFailedCount}
                    </span>
                  )}
                </div>
                {activeTab === 'ads' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-sky-600" />
                )}
              </button>
            )}
            {crossChecks.length > 0 && (
              <div className="flex items-center px-5 py-3 text-sm text-orange-600">
                <div className="flex items-center gap-2">
                  <IconCross />
                  <span className="font-medium">Cross-Check</span>
                  {crossFailedCount > 0 && (
                    <span className="text-xs px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-600">
                      {crossFailedCount}
                    </span>
                  )}
                  <span className="text-xs text-gray-400 ml-1">(always visible)</span>
                </div>
              </div>
            )}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 lg:px-6 py-6">
        {/* Tab Content */}
        {activeTab === 'gtm' && hasGTMData && (
          <TabSection
            checks={gtmChecks}
            title="Google Tag Manager"
            icon={<span className="text-purple-600">GTM</span>}
            color="purple"
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
            title="Google Ads"
            icon={<span className="text-sky-600">Ads</span>}
            color="sky"
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
      </main>

      {/* Slide-over detail panel */}
      <SlideOverPanel check={selectedCheck} onClose={handleClosePanel} />
    </div>
  );
}
