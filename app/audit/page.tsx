'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { runAudit } from '@/lib/auditEngine';
import { AuditResults, AuditCheck, GTMContainer, AdsData, AdsReportData, Severity } from '@/lib/types';
import {
  PieChart, Pie, Cell, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend,
} from 'recharts';

// ─── Constants ───────────────────────────────────────────────────────────────

type Source = 'gtm' | 'ads' | 'cross' | 'report';

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
const BAR_COLORS = { critical: '#dc2626', warning: '#d97706', info: '#2563eb' };

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

function IconMenu() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

function IconOverview() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

function IconGTM() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" d="M7 8l5-5 5 5M7 16l5 5 5-5" />
      <path strokeLinecap="round" d="M12 3v18" />
    </svg>
  );
}

function IconAds() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
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

function IconReport() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
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
        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:bg-transparent lg:backdrop-blur-none"
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
      <div className="relative w-32 h-32">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={42}
              outerRadius={56}
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
          <span className="text-2xl font-bold text-gray-900">{score}%</span>
        </div>
      </div>
      <span className="text-xs text-gray-500 mt-1">{passed}/{total} checks passed</span>
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
        <div className="w-40 h-40 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={70}
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

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
      <h3 className="text-sm font-semibold text-gray-900 mb-4">Issues by Category</h3>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 10, right: 20 }}>
            <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12, fill: '#6b7280' }} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: '#9ca3af' }} width={80} />
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

// ─── Sidebar ─────────────────────────────────────────────────────────────────

type NavFilter = 'all' | Source;

const navItems: { id: NavFilter; label: string; icon: React.ReactNode }[] = [
  { id: 'all', label: 'Overview', icon: <IconOverview /> },
  { id: 'gtm', label: 'GTM Issues', icon: <IconGTM /> },
  { id: 'ads', label: 'Ads Issues', icon: <IconAds /> },
  { id: 'cross', label: 'Cross-Check', icon: <IconCross /> },
  { id: 'report', label: 'Report', icon: <IconReport /> },
];

function Sidebar({
  activeNav,
  onNavChange,
  isOpen,
  onClose,
  counts,
  onNewAudit,
}: {
  activeNav: NavFilter;
  onNavChange: (nav: NavFilter) => void;
  isOpen: boolean;
  onClose: () => void;
  counts: Record<NavFilter, number>;
  onNewAudit: () => void;
}) {
  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/30 z-30 lg:hidden" onClick={onClose} />
      )}
      <aside className={`
        fixed top-0 left-0 h-full w-60 bg-white border-r border-gray-200 z-40 flex flex-col transition-transform duration-200
        lg:translate-x-0 lg:static lg:z-auto
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Logo */}
        <div className="p-5 border-b border-gray-200">
          <span className="text-xl font-bold text-blue-600">AdLint</span>
          <span className="text-xs text-gray-500 ml-2">Audit</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3">
          {navItems.map(item => {
            const isActive = activeNav === item.id;
            const count = counts[item.id];
            return (
              <button
                key={item.id}
                onClick={() => {
                  onNavChange(item.id);
                  onClose();
                }}
                className={`
                  w-full flex items-center gap-3 px-5 py-2.5 text-sm transition-colors
                  ${isActive
                    ? 'bg-blue-50 text-blue-600 border-l-[3px] border-l-blue-600'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 border-l-[3px] border-l-transparent'
                  }
                `}
              >
                {item.icon}
                <span className="flex-1 text-left">{item.label}</span>
                {item.id !== 'all' && count > 0 && (
                  <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${isActive ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'}`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Bottom */}
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={onNewAudit}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg px-4 py-2.5 transition-colors"
          >
            Run New Audit
          </button>
        </div>
      </aside>
    </>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function AuditPage() {
  const router = useRouter();
  const [results, setResults] = useState<AuditResults | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeNav, setActiveNav] = useState<NavFilter>('all');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedCheck, setSelectedCheck] = useState<TaggedCheck | null>(null);
  const [search, setSearch] = useState('');
  const [severityFilters, setSeverityFilters] = useState<Set<Severity>>(new Set(['critical', 'warning', 'info']));
  const [sortColumn, setSortColumn] = useState<'severity' | 'title' | 'source' | 'affected'>('severity');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [showPassed, setShowPassed] = useState(false);

  useEffect(() => {
    const gtmDataStr = sessionStorage.getItem('gtmData');
    const adsDataStr = sessionStorage.getItem('adsData');
    const reportDataStr = sessionStorage.getItem('reportData');

    if (!gtmDataStr && !adsDataStr && !reportDataStr) {
      router.push('/');
      return;
    }

    const gtmData: GTMContainer | null = gtmDataStr ? JSON.parse(gtmDataStr) : null;
    const adsData: AdsData | null = adsDataStr ? JSON.parse(adsDataStr) : null;
    const reportData: AdsReportData | null = reportDataStr ? JSON.parse(reportDataStr) : null;

    const auditResults = runAudit(gtmData, adsData, undefined, reportData);
    setResults(auditResults);
    setLoading(false);
  }, [router]);

  const handleClosePanel = useCallback(() => setSelectedCheck(null), []);

  // ─── Derived data ────────────────────────────────────────────────────────

  const allTagged = useMemo(() => results ? tagChecks(results) : [], [results]);

  // Smart skipping: filter out passed info checks
  const displayed = useMemo(() => allTagged.filter(c => !(c.severity === 'info' && c.passed)), [allTagged]);

  const failedAll = useMemo(() => displayed.filter(c => !c.passed), [displayed]);
  const passedAll = useMemo(() => displayed.filter(c => c.passed), [displayed]);

  // Nav counts (unfiltered — sidebar always shows totals per source)
  const navCounts = useMemo((): Record<NavFilter, number> => {
    const counts: Record<NavFilter, number> = { all: failedAll.length, gtm: 0, ads: 0, cross: 0, report: 0 };
    for (const c of failedAll) counts[c.source]++;
    return counts;
  }, [failedAll]);

  // ─── Global nav filter applied to everything ────────────────────────────
  const filteredDisplayed = useMemo(() =>
    activeNav === 'all' ? displayed : displayed.filter(c => c.source === activeNav),
    [displayed, activeNav]
  );
  const filteredFailed = useMemo(() => filteredDisplayed.filter(c => !c.passed), [filteredDisplayed]);
  const filteredPassed = useMemo(() => filteredDisplayed.filter(c => c.passed), [filteredDisplayed]);

  // KPI summary derived from filtered data
  const filteredSummary = useMemo(() => {
    const s = { critical: 0, warning: 0, info: 0, passed: 0 };
    for (const c of filteredDisplayed) {
      if (c.passed) { s.passed++; }
      else { s[c.severity]++; }
    }
    return s;
  }, [filteredDisplayed]);

  // Filtered + sorted issues for the table
  const tableData = useMemo(() => {
    let items = [...filteredFailed];

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
  }, [filteredFailed, severityFilters, search, sortColumn, sortDir]);

  // Chart data — derived from filtered data
  const donutData = useMemo(() => {
    return [
      { name: 'Critical', value: filteredSummary.critical, color: DONUT_COLORS[0] },
      { name: 'Warning', value: filteredSummary.warning, color: DONUT_COLORS[1] },
      { name: 'Info', value: filteredSummary.info, color: DONUT_COLORS[2] },
      { name: 'Passed', value: filteredSummary.passed, color: DONUT_COLORS[3] },
    ].filter(d => d.value > 0);
  }, [filteredSummary]);

  const barData = useMemo(() => {
    const buckets: Record<Source, { critical: number; warning: number; info: number }> = {
      gtm: { critical: 0, warning: 0, info: 0 },
      ads: { critical: 0, warning: 0, info: 0 },
      cross: { critical: 0, warning: 0, info: 0 },
      report: { critical: 0, warning: 0, info: 0 },
    };
    for (const c of filteredFailed) {
      buckets[c.source][c.severity]++;
    }
    return (Object.keys(buckets) as Source[])
      .map(key => ({
        name: sourceConfig[key].label,
        ...buckets[key],
      }))
      .filter(d => d.critical + d.warning + d.info > 0);
  }, [filteredFailed]);

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

  // ─── Loading state ───────────────────────────────────────────────────────

  if (loading || !results) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-blue-50 to-white gap-3">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-600 text-lg">Analyzing your setup...</p>
      </div>
    );
  }

  const healthScore = filteredDisplayed.length > 0
    ? Math.round((filteredPassed.length / filteredDisplayed.length) * 100)
    : 100;

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex">
      {/* Sidebar */}
      <Sidebar
        activeNav={activeNav}
        onNavChange={setActiveNav}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        counts={navCounts}
        onNewAudit={() => {
          sessionStorage.clear();
          router.push('/');
        }}
      />

      {/* Main content */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top bar */}
        <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 px-4 lg:px-6 py-3 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"
            >
              <IconMenu />
            </button>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Audit Results</h1>
              <span className="text-xs text-gray-500">{auditType}</span>
            </div>
          </div>
          <button
            onClick={() => router.push('/')}
            className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
          >
            &larr; Back
          </button>
        </header>

        <main className="flex-1 p-4 lg:p-6 overflow-y-auto">
          {/* ── ZONE 1: KPI Strip ──────────────────────────────────────── */}
          <div className="flex flex-col lg:flex-row gap-4 mb-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 flex-1">
              {/* Critical */}
              <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm flex items-start gap-3">
                <div className="p-2 rounded-lg bg-red-50 text-red-600 shrink-0"><IconShield /></div>
                <div>
                  <div className="text-2xl font-bold text-red-600">{filteredSummary.critical}</div>
                  <div className="text-xs text-red-600/80 font-medium">Critical</div>
                  <div className="text-[10px] text-gray-500 mt-0.5">{filteredSummary.critical} of {filteredDisplayed.length} checks</div>
                </div>
              </div>
              {/* Warning */}
              <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm flex items-start gap-3">
                <div className="p-2 rounded-lg bg-amber-50 text-amber-600 shrink-0"><IconAlertTriangle /></div>
                <div>
                  <div className="text-2xl font-bold text-amber-600">{filteredSummary.warning}</div>
                  <div className="text-xs text-amber-600/80 font-medium">Warnings</div>
                  <div className="text-[10px] text-gray-500 mt-0.5">{filteredSummary.warning} of {filteredDisplayed.length} checks</div>
                </div>
              </div>
              {/* Info */}
              <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm flex items-start gap-3">
                <div className="p-2 rounded-lg bg-blue-50 text-blue-600 shrink-0"><IconInfoCircle /></div>
                <div>
                  <div className="text-2xl font-bold text-blue-600">{filteredSummary.info}</div>
                  <div className="text-xs text-blue-600/80 font-medium">Info</div>
                  <div className="text-[10px] text-gray-500 mt-0.5">{filteredSummary.info} of {filteredDisplayed.length} checks</div>
                </div>
              </div>
              {/* Passed */}
              <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm flex items-start gap-3">
                <div className="p-2 rounded-lg bg-green-50 text-green-600 shrink-0"><IconCheckCircle /></div>
                <div>
                  <div className="text-2xl font-bold text-green-600">{filteredSummary.passed}</div>
                  <div className="text-xs text-green-600/80 font-medium">Passed</div>
                  <div className="text-[10px] text-gray-500 mt-0.5">{filteredPassed.length} of {filteredDisplayed.length} checks</div>
                </div>
              </div>
            </div>

            {/* Health ring */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex items-center justify-center lg:w-48 shrink-0">
              <HealthRing score={healthScore} passed={filteredPassed.length} total={filteredDisplayed.length} />
            </div>
          </div>

          {/* ── ZONE 2: Charts ─────────────────────────────────────────── */}
          {filteredFailed.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
              <SeverityDonut data={donutData} />
              <CategoryBarChart data={barData} />
            </div>
          )}

          {/* ── ZONE 3: Issues Table ───────────────────────────────────── */}
          {filteredFailed.length > 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-6">
              {/* Table toolbar */}
              <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row gap-3">
                {/* Search */}
                <div className="relative flex-1">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"><IconSearch /></div>
                  <input
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
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
                        onClick={() => toggleSeverityFilter(sev)}
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
                        <button className="flex items-center gap-1 hover:text-gray-900" onClick={() => handleSort('severity')}>
                          Severity
                          <IconSort active={sortColumn === 'severity'} direction={sortDir} />
                        </button>
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-400 text-xs uppercase tracking-wide">
                        <button className="flex items-center gap-1 hover:text-gray-900" onClick={() => handleSort('title')}>
                          Issue
                          <IconSort active={sortColumn === 'title'} direction={sortDir} />
                        </button>
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-400 text-xs uppercase tracking-wide w-28">
                        <button className="flex items-center gap-1 hover:text-gray-900" onClick={() => handleSort('source')}>
                          Source
                          <IconSort active={sortColumn === 'source'} direction={sortDir} />
                        </button>
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-400 text-xs uppercase tracking-wide w-24">
                        <button className="flex items-center gap-1 hover:text-gray-900" onClick={() => handleSort('affected')}>
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
                            onClick={() => setSelectedCheck(isSelected ? null : check)}
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
                Showing {tableData.length} of {filteredFailed.length} issues
              </div>
            </div>
          ) : (
            <div className="bg-green-50 border border-green-200 rounded-xl p-8 text-center mb-6">
              <div className="text-4xl mb-3">{'\uD83C\uDF89'}</div>
              <h2 className="text-xl font-bold text-green-700 mb-1">All checks passed!</h2>
              <p className="text-green-700/70 text-sm">Your setup looks great. No issues detected.</p>
            </div>
          )}

          {/* ── Passed Checks ──────────────────────────────────────────── */}
          {filteredPassed.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-6">
              <button
                onClick={() => setShowPassed(!showPassed)}
                className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="text-green-600"><IconCheckCircle /></span>
                  <span>Passed Checks ({filteredPassed.length})</span>
                </div>
                <IconChevronRight className={`w-4 h-4 transition-transform ${showPassed ? 'rotate-90' : ''}`} />
              </button>
              {showPassed && (
                <div className="border-t border-gray-200">
                  {filteredPassed.map(check => (
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
        </main>
      </div>

      {/* Slide-over detail panel */}
      <SlideOverPanel check={selectedCheck} onClose={handleClosePanel} />
    </div>
  );
}
