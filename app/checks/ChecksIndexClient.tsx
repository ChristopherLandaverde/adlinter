'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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

// Curated example queries shown when the search input is empty.
// Each is something we know lands on a high-quality result.
const exampleQueries = [
  'consent',
  'gclid',
  'enhanced conversions',
  'tROAS',
  'duplicate',
  'attribution window',
  'CAPI',
  'data layer',
];

// Featured checks shown on the empty state. These are the highest-value
// landing pages we want first-time visitors to hit.
const featuredIds = [
  'missing-conversion-linker',
  'consent-violations',
  'duplicate-conversions',
  'enhanced-conversions-missing-data',
  'no-primary-conversion',
  'currency-consistency',
];

// Source-key → label lookup (memoised at module load).
const sourceLabel: Record<ExplainerSource, string> = Object.fromEntries(
  explainerSources.map((s) => [s.key, s.label]),
) as Record<ExplainerSource, string>;

export function ChecksIndexClient({
  explainers,
  documented,
  total,
}: {
  explainers: CheckExplainer[];
  documented: number;
  total: number;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [activeSeverities, setActiveSeverities] = useState<Set<Severity>>(new Set());
  const [activeSources, setActiveSources] = useState<Set<ExplainerSource>>(new Set());
  const [showStubs, setShowStubs] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  // Focus the search bar on mount. This is the page's primary affordance.
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matches = explainers.filter((e) => {
      if (!showStubs && e.status === 'stub') return false;
      if (activeSeverities.size > 0 && !activeSeverities.has(e.severity)) return false;
      if (activeSources.size > 0 && !activeSources.has(e.source)) return false;
      if (!q) return true;
      const inName = e.name.toLowerCase().includes(q);
      const inId = e.id.toLowerCase().includes(q);
      const inSummary = (e.directAnswer ?? e.summary).toLowerCase().includes(q);
      return inName || inId || inSummary;
    });
    // Relevance ranking when there's a query: name-matches first, then id, then summary.
    if (!q) return matches;
    return matches.sort((a, b) => {
      const score = (e: CheckExplainer) =>
        (e.name.toLowerCase().startsWith(q) ? 0 : 100) +
        (e.name.toLowerCase().includes(q) ? 0 : 50) +
        (e.id.toLowerCase().includes(q) ? 0 : 25);
      return score(a) - score(b);
    });
  }, [explainers, query, activeSeverities, activeSources, showStubs]);

  // Reset highlighted-row index when results change.
  useEffect(() => {
    setActiveIndex(0);
  }, [query, activeSeverities, activeSources, showStubs]);

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

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (filtered.length === 0) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((i) => Math.min(filtered.length - 1, i + 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((i) => Math.max(0, i - 1));
    } else if (event.key === 'Enter') {
      const target = filtered[activeIndex];
      if (target) router.push(`/checks/${target.id}`);
    } else if (event.key === 'Escape') {
      setQuery('');
    }
  }

  const hasQuery = query.trim().length > 0;
  const hasActiveFilters =
    activeSeverities.size > 0 || activeSources.size > 0 || !showStubs;
  const featured = featuredIds
    .map((id) => explainers.find((e) => e.id === id))
    .filter((e): e is CheckExplainer => Boolean(e));

  return (
    <div>
      {/* Hero search input. The visual anchor of the page. */}
      <div className="mb-3">
        <div className="relative">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-xl text-muted"
          >
            ⌕
          </span>
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search 178 checks — try “consent”, “gclid”, or “tROAS”"
            aria-label="Search AdLint checks"
            className="w-full rounded-lg border border-border bg-surface py-4 pl-14 pr-14 text-lg font-medium text-ink placeholder:font-normal placeholder:text-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 sm:py-5 sm:text-xl"
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                inputRef.current?.focus();
              }}
              aria-label="Clear search"
              className="absolute right-4 top-1/2 -translate-y-1/2 rounded-sm px-2 py-1 text-xs font-medium text-muted hover:text-ink"
            >
              Clear
            </button>
          )}
        </div>
        <p className="mt-2 text-xs text-muted">
          {hasQuery ? (
            <>
              <kbd className="rounded-sm border border-border bg-surface px-1.5 py-0.5 font-mono text-[10px]">
                ↑↓
              </kbd>{' '}
              navigate ·{' '}
              <kbd className="rounded-sm border border-border bg-surface px-1.5 py-0.5 font-mono text-[10px]">
                ↵
              </kbd>{' '}
              open ·{' '}
              <kbd className="rounded-sm border border-border bg-surface px-1.5 py-0.5 font-mono text-[10px]">
                Esc
              </kbd>{' '}
              clear · {filtered.length} of {explainers.length}
            </>
          ) : (
            <>
              {documented} documented + {total - documented} reference stubs · everything searchable
            </>
          )}
        </p>
      </div>

      {/* Filters toggle. Collapsed by default to keep the search bar dominant. */}
      <div className="mb-8 flex flex-wrap items-center gap-2 text-xs">
        <button
          type="button"
          onClick={() => setFiltersOpen((v) => !v)}
          className="rounded-sm border border-border bg-surface px-2.5 py-1 font-medium text-muted hover:text-ink"
          aria-expanded={filtersOpen}
        >
          Filters {hasActiveFilters && <span className="text-accent">·</span>}
        </button>
        {activeSeverities.size > 0 && (
          <span className="text-muted">
            {[...activeSeverities].join(', ')}
          </span>
        )}
        {activeSources.size > 0 && (
          <span className="text-muted">
            {[...activeSources].map((k) => sourceLabel[k]).join(', ')}
          </span>
        )}
        {!showStubs && <span className="text-muted">no stubs</span>}
        {hasActiveFilters && (
          <button
            type="button"
            onClick={() => {
              setActiveSeverities(new Set());
              setActiveSources(new Set());
              setShowStubs(true);
            }}
            className="text-muted underline-offset-2 hover:text-ink hover:underline"
          >
            Clear all
          </button>
        )}
      </div>

      {filtersOpen && (
        <div className="-mt-4 mb-8 space-y-3 rounded-md border border-border bg-surface p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">
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
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">
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
          <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-muted">
            <input
              type="checkbox"
              checked={showStubs}
              onChange={(e) => setShowStubs(e.target.checked)}
              className="h-4 w-4 rounded border-border accent-accent"
            />
            Include reference stubs
          </label>
        </div>
      )}

      {hasQuery ? (
        // RESULTS state: vertical list, keyboard-navigable, highlight active.
        filtered.length === 0 ? (
          <div className="rounded-md border border-dashed border-border bg-surface p-10 text-center text-sm text-muted">
            <p className="mb-2 font-medium text-ink">No results.</p>
            <p>Try a shorter query, or open Filters and clear them.</p>
          </div>
        ) : (
          <ul className="space-y-1.5">
            {filtered.map((e, i) => (
              <li key={e.id}>
                <Link
                  href={`/checks/${e.id}`}
                  onMouseEnter={() => setActiveIndex(i)}
                  aria-current={i === activeIndex ? 'true' : undefined}
                  className={`flex items-start gap-3 rounded-md border px-4 py-3 transition-colors ${
                    i === activeIndex
                      ? 'border-accent/50 bg-accent/[0.03]'
                      : 'border-border bg-surface hover:border-ink/20'
                  }`}
                >
                  <span
                    className={`mt-0.5 shrink-0 rounded-sm px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${severityStyles[e.severity]}`}
                  >
                    {e.severity}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-2">
                      <h3 className="font-display text-sm font-semibold text-ink">{e.name}</h3>
                      <span className="text-[10px] font-medium uppercase tracking-wider text-muted">
                        {sourceLabel[e.source]}
                      </span>
                      {e.status === 'stub' && (
                        <span className="text-[10px] font-medium uppercase tracking-wider text-muted">
                          · stub
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-muted">
                      {e.directAnswer ?? e.summary}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )
      ) : (
        // EMPTY state: example queries + featured findings.
        <div className="space-y-10">
          <section aria-labelledby="try-queries">
            <h2 id="try-queries" className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-muted">
              Try
            </h2>
            <div className="flex flex-wrap gap-2">
              {exampleQueries.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => {
                    setQuery(q);
                    inputRef.current?.focus();
                  }}
                  className="rounded-full border border-border bg-surface px-3 py-1 text-xs text-muted transition-colors hover:border-ink/30 hover:text-ink"
                >
                  {q}
                </button>
              ))}
            </div>
          </section>

          {featured.length > 0 && (
            <section aria-labelledby="featured-findings">
              <h2 id="featured-findings" className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-muted">
                Most-cited critical findings
              </h2>
              <ul className="space-y-1.5">
                {featured.map((e) => (
                  <li key={e.id}>
                    <Link
                      href={`/checks/${e.id}`}
                      className="flex items-start gap-3 rounded-md border border-border bg-surface px-4 py-3 transition-colors hover:border-ink/20"
                    >
                      <span
                        className={`mt-0.5 shrink-0 rounded-sm px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${severityStyles[e.severity]}`}
                      >
                        {e.severity}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-baseline gap-x-2">
                          <h3 className="font-display text-sm font-semibold text-ink">{e.name}</h3>
                          <span className="text-[10px] font-medium uppercase tracking-wider text-muted">
                            {sourceLabel[e.source]}
                          </span>
                        </div>
                        <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-muted">
                          {e.directAnswer ?? e.summary}
                        </p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
