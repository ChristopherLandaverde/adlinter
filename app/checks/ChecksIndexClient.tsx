'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  explainerSources,
  type CheckExplainer,
  type ExplainerSource,
} from '@/lib/checks/explainers';

type Severity = CheckExplainer['severity'];

const severityStyles: Record<Severity, string> = {
  critical: 'bg-critical/10 text-critical',
  warning: 'bg-warning/10 text-warning',
  info: 'bg-info/10 text-info',
};

const severities: Severity[] = ['critical', 'warning', 'info'];

export function ChecksIndexClient({
  explainers,
  documented,
  total,
}: {
  explainers: CheckExplainer[];
  documented: number;
  total: number;
}) {
  const [query, setQuery] = useState('');
  const [activeSeverities, setActiveSeverities] = useState<Set<Severity>>(new Set());
  const [activeSources, setActiveSources] = useState<Set<ExplainerSource>>(new Set());
  const [showStubs, setShowStubs] = useState(true);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return explainers.filter((e) => {
      if (!showStubs && e.status === 'stub') return false;
      if (activeSeverities.size > 0 && !activeSeverities.has(e.severity)) return false;
      if (activeSources.size > 0 && !activeSources.has(e.source)) return false;
      if (q && !e.name.toLowerCase().includes(q) && !e.id.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [explainers, query, activeSeverities, activeSources, showStubs]);

  const grouped = useMemo(() => {
    const map = new Map<ExplainerSource, CheckExplainer[]>();
    for (const e of filtered) {
      if (!map.has(e.source)) map.set(e.source, []);
      map.get(e.source)!.push(e);
    }
    return map;
  }, [filtered]);

  function toggleSeverity(s: Severity) {
    setActiveSeverities((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s); else next.add(s);
      return next;
    });
  }

  function toggleSource(s: ExplainerSource) {
    setActiveSources((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s); else next.add(s);
      return next;
    });
  }

  const fullCount = filtered.filter((e) => e.status !== 'stub').length;
  const stubCount = filtered.length - fullCount;

  return (
    <div>
      <div className="mb-6 rounded-md border border-border bg-surface p-4 text-sm leading-relaxed text-muted">
        <span className="font-medium text-ink">{documented}</span> of{' '}
        <span className="font-medium text-ink">{total}</span> checks have full editorial explainers.
        The rest are reference stubs — the audit engine still fires them; the deep "why" pages are
        in progress.
      </div>

      <div className="mb-6 space-y-4">
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by name or ID — try “conversion linker” or “VTC”"
          className="w-full rounded-md border border-border bg-surface px-4 py-2.5 text-sm text-ink placeholder:text-muted focus:border-accent focus:outline-none"
          aria-label="Search checks"
        />

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted">
            Severity
          </span>
          {severities.map((s) => {
            const active = activeSeverities.has(s);
            return (
              <button
                key={s}
                type="button"
                onClick={() => toggleSeverity(s)}
                className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize transition-colors ${
                  active ? severityStyles[s] : 'bg-surface-2 text-muted hover:text-ink'
                }`}
                aria-pressed={active}
              >
                {s}
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted">
            Source
          </span>
          {explainerSources.map((src) => {
            const active = activeSources.has(src.key);
            return (
              <button
                key={src.key}
                type="button"
                onClick={() => toggleSource(src.key)}
                className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                  active
                    ? 'bg-accent text-white'
                    : 'bg-surface-2 text-muted hover:text-ink'
                }`}
                aria-pressed={active}
              >
                {src.label}
              </button>
            );
          })}
        </div>

        <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-muted">
          <input
            type="checkbox"
            checked={showStubs}
            onChange={(event) => setShowStubs(event.target.checked)}
            className="h-4 w-4 rounded border-border accent-accent"
          />
          Include reference stubs (undocumented checks)
        </label>
      </div>

      <div className="mb-4 text-sm text-muted">
        Showing <span className="font-medium text-ink">{fullCount}</span> documented
        {stubCount > 0 && (
          <>
            {' + '}<span className="font-medium text-ink">{stubCount}</span> stubs
          </>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-md border border-dashed border-border bg-surface p-8 text-center text-sm text-muted">
          No checks match those filters. Try clearing severity or source.
        </div>
      ) : (
        <div className="space-y-10">
          {explainerSources.map((src) => {
            const list = grouped.get(src.key);
            if (!list || list.length === 0) return null;
            return (
              <section key={src.key}>
                <h2 className="mb-4 font-display text-xl font-semibold text-ink">
                  {src.label}{' '}
                  <span className="ml-1 text-sm font-normal text-muted">
                    ({list.length})
                  </span>
                </h2>
                <div className="grid gap-3 md:grid-cols-2">
                  {list.map((e) => (
                    <Link
                      key={e.id}
                      href={`/checks/${e.id}`}
                      className={`group block rounded-md border bg-surface p-4 transition-colors ${
                        e.status === 'stub'
                          ? 'border-dashed border-border hover:border-ink/20'
                          : 'border-border hover:border-ink/30'
                      }`}
                    >
                      <div className="mb-2 flex items-start justify-between gap-3">
                        <h3 className="font-display text-sm font-semibold leading-tight text-ink">
                          {e.name}
                        </h3>
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${severityStyles[e.severity]}`}
                        >
                          {e.severity}
                        </span>
                      </div>
                      <p className="line-clamp-2 text-xs leading-relaxed text-muted">
                        {e.directAnswer ?? e.summary}
                      </p>
                      {e.status === 'stub' && (
                        <span className="mt-2 inline-block text-[10px] font-medium uppercase tracking-wider text-muted">
                          Reference stub
                        </span>
                      )}
                    </Link>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
