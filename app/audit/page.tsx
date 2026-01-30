'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { runAudit } from '@/lib/auditEngine';
import { AuditResults, AuditCheck, GTMContainer, AdsData, Severity } from '@/lib/types';

const severityConfig: Record<Severity, { label: string; bg: string; border: string; text: string; badge: string }> = {
  critical: {
    label: 'Critical',
    bg: 'bg-red-50',
    border: 'border-red-400',
    text: 'text-red-800',
    badge: 'bg-red-100 text-red-700',
  },
  warning: {
    label: 'Warning',
    bg: 'bg-yellow-50',
    border: 'border-yellow-400',
    text: 'text-yellow-800',
    badge: 'bg-yellow-100 text-yellow-700',
  },
  info: {
    label: 'Info',
    bg: 'bg-blue-50',
    border: 'border-blue-400',
    text: 'text-blue-800',
    badge: 'bg-blue-100 text-blue-700',
  },
};

function DetailsRenderer({ details }: { details: Record<string, unknown> }) {
  const entries = Object.entries(details).filter(
    ([, value]) =>
      value !== undefined &&
      value !== null &&
      !(Array.isArray(value) && value.length === 0)
  );

  if (entries.length === 0) return null;

  return (
    <div className="space-y-2">
      {entries.map(([key, value]) => {
        const label = key
          .replace(/([A-Z])/g, ' $1')
          .replace(/[_-]/g, ' ')
          .replace(/^\w/, c => c.toUpperCase())
          .trim();

        // String arrays
        if (
          Array.isArray(value) &&
          value.length > 0 &&
          typeof value[0] === 'string'
        ) {
          return (
            <div key={key}>
              <div className="text-xs font-semibold text-gray-500 mb-1">{label}</div>
              <ul className="list-disc list-inside text-sm text-gray-700 space-y-0.5">
                {(value as string[]).map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
          );
        }

        // Object arrays
        if (
          Array.isArray(value) &&
          value.length > 0 &&
          typeof value[0] === 'object'
        ) {
          return (
            <div key={key}>
              <div className="text-xs font-semibold text-gray-500 mb-1">{label}</div>
              <div className="space-y-1">
                {(value as Record<string, unknown>[]).map((item, i) => (
                  <div
                    key={i}
                    className="bg-white/60 rounded px-3 py-1.5 text-sm text-gray-700 border border-gray-100"
                  >
                    {Object.entries(item).map(([k, v]) => (
                      <span key={k} className="mr-3">
                        <span className="text-gray-400 text-xs">{k}: </span>
                        <span>{String(v)}</span>
                      </span>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          );
        }

        // Simple values (string, number, boolean)
        if (
          typeof value === 'string' ||
          typeof value === 'number' ||
          typeof value === 'boolean'
        ) {
          return (
            <div key={key} className="text-sm text-gray-700">
              <span className="text-gray-400 text-xs">{label}: </span>
              <span className="font-medium">{String(value)}</span>
            </div>
          );
        }

        // Plain objects (key-value)
        if (typeof value === 'object' && !Array.isArray(value) && value !== null) {
          return (
            <div key={key}>
              <div className="text-xs font-semibold text-gray-500 mb-1">{label}</div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1">
                {Object.entries(value as Record<string, unknown>).map(([k, v]) => (
                  <div key={k} className="text-sm text-gray-700">
                    <span className="text-gray-400 text-xs">{k}: </span>
                    <span className="font-medium">{String(v)}</span>
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

function IssueCard({ check }: { check: AuditCheck }) {
  const [expanded, setExpanded] = useState(false);
  const config = severityConfig[check.severity];

  return (
    <div
      className={`${config.bg} border-l-4 ${config.border} rounded-lg p-5 transition-all`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${config.badge}`}>
              {config.label}
            </span>
            {check.requiresBothFiles && (
              <span className="text-xs text-gray-400 font-medium">Cross-check</span>
            )}
          </div>
          <h3 className="text-base font-semibold text-gray-900 mb-1">{check.title}</h3>
          <p className="text-sm text-gray-700">{check.description}</p>
        </div>
        {(check.details || check.recommendation) && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-gray-400 hover:text-gray-600 shrink-0 mt-1"
          >
            {expanded ? 'Less' : 'More'}
          </button>
        )}
      </div>

      {expanded && (
        <div className="mt-3 pt-3 border-t border-gray-200/50 space-y-3">
          <div className="text-sm text-gray-600">
            <strong className="text-gray-700">Recommendation:</strong>{' '}
            {check.recommendation}
          </div>
          {check.details && <DetailsRenderer details={check.details} />}
        </div>
      )}
    </div>
  );
}

function PassedCard({ check }: { check: AuditCheck }) {
  return (
    <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-lg px-4 py-3">
      <span className="text-green-600 text-lg">{'\u2713'}</span>
      <span className="text-sm text-green-800 font-medium">{check.title}</span>
    </div>
  );
}

export default function AuditPage() {
  const router = useRouter();
  const [results, setResults] = useState<AuditResults | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPassed, setShowPassed] = useState(false);

  useEffect(() => {
    const gtmDataStr = sessionStorage.getItem('gtmData');
    const adsDataStr = sessionStorage.getItem('adsData');

    if (!gtmDataStr && !adsDataStr) {
      router.push('/');
      return;
    }

    const gtmData: GTMContainer | null = gtmDataStr ? JSON.parse(gtmDataStr) : null;
    const adsData: AdsData | null = adsDataStr ? JSON.parse(adsDataStr) : null;

    const auditResults = runAudit(gtmData, adsData);
    setResults(auditResults);
    setLoading(false);
  }, [router]);

  if (loading || !results) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 gap-3">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-500 text-lg">Analyzing your setup...</p>
      </div>
    );
  }

  const allChecks = [...results.gtm, ...results.ads, ...results.cross];

  // Smart skipping: filter out passed info checks
  const isSkipped = (c: AuditCheck) => c.severity === 'info' && c.passed;
  const displayedChecks = allChecks.filter(c => !isSkipped(c));

  const failedChecks = displayedChecks.filter(c => !c.passed);
  const passedChecks = displayedChecks.filter(c => c.passed);

  // Sort failures: critical first, then warning, then info
  const severityOrder: Record<Severity, number> = { critical: 0, warning: 1, info: 2 };
  failedChecks.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  const auditType =
    results.gtm.length > 0 && results.ads.length > 0
      ? 'Full Audit (GTM + Ads)'
      : results.gtm.length > 0
        ? 'GTM Audit'
        : 'Ads Audit';

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <span>&larr;</span>
            <span className="text-2xl font-bold text-blue-600">AdLint</span>
          </button>
          <span className="text-sm text-gray-500">{auditType}</span>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl p-5 shadow-sm border border-red-100">
            <div className="text-3xl font-bold text-red-600">{results.summary.critical}</div>
            <div className="text-sm text-red-600 font-medium">Critical</div>
          </div>
          <div className="bg-white rounded-xl p-5 shadow-sm border border-yellow-100">
            <div className="text-3xl font-bold text-yellow-600">{results.summary.warning}</div>
            <div className="text-sm text-yellow-600 font-medium">Warnings</div>
          </div>
          <div className="bg-white rounded-xl p-5 shadow-sm border border-blue-100">
            <div className="text-3xl font-bold text-blue-600">{results.summary.info}</div>
            <div className="text-sm text-blue-600 font-medium">Info</div>
          </div>
          <div className="bg-white rounded-xl p-5 shadow-sm border border-green-100">
            <div className="text-3xl font-bold text-green-600">{results.summary.passed}</div>
            <div className="text-sm text-green-600 font-medium">Passed</div>
          </div>
        </div>

        {/* Score bar */}
        {allChecks.length > 0 && (
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 mb-8">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Health Score</span>
              <span className="text-sm font-bold text-gray-900">
                {Math.round((passedChecks.length / displayedChecks.length) * 100)}%
              </span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
              <div
                className="bg-green-500 h-3 rounded-full transition-all duration-500"
                style={{ width: `${(passedChecks.length / displayedChecks.length) * 100}%` }}
              />
            </div>
            <p className="text-xs text-gray-400 mt-2">
              {passedChecks.length} of {displayedChecks.length} checks passed
            </p>
          </div>
        )}

        {/* Failed Checks */}
        {failedChecks.length > 0 && (
          <section className="mb-8">
            <h2 className="text-lg font-bold text-gray-900 mb-4">
              Issues Found ({failedChecks.length})
            </h2>
            <div className="space-y-3">
              {failedChecks.map(check => (
                <IssueCard
                  key={check.id + check.title}
                  check={check}
                />
              ))}
            </div>
          </section>
        )}

        {failedChecks.length === 0 && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-8 text-center mb-8">
            <div className="text-4xl mb-3">{'\uD83C\uDF89'}</div>
            <h2 className="text-xl font-bold text-green-800 mb-1">All checks passed!</h2>
            <p className="text-green-700 text-sm">
              Your setup looks great. No issues detected.
            </p>
          </div>
        )}

        {/* Passed Checks */}
        {passedChecks.length > 0 && (
          <section className="mb-8">
            <button
              onClick={() => setShowPassed(!showPassed)}
              className="text-sm font-medium text-gray-500 hover:text-gray-700 mb-3 flex items-center gap-1"
            >
              <span>{showPassed ? '\u25BC' : '\u25B6'}</span>
              Passed Checks ({passedChecks.length})
            </button>
            {showPassed && (
              <div className="space-y-2">
                {passedChecks.map(check => (
                  <PassedCard key={check.id + check.title} check={check} />
                ))}
              </div>
            )}
          </section>
        )}

        {/* Actions */}
        <div className="text-center pt-4 pb-8">
          <button
            onClick={() => {
              sessionStorage.clear();
              router.push('/');
            }}
            className="bg-blue-600 text-white px-8 py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200"
          >
            Run Another Audit
          </button>
        </div>
      </div>
    </main>
  );
}
