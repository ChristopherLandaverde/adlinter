import type { ReactNode } from 'react';

// Companion to GTMTagListMock. Renders the GTM Triggers screen with
// the same "obviously synthetic but credible" treatment.
//
// Mobile: stacks as a card list. Desktop: 3-column table layout.

export type GTMTriggerMockRow = {
  name: string;
  type: string;
  fires: string;
  highlight?: 'critical' | 'warning' | 'info' | 'pass';
  note?: string;
};

const highlightStyles: Record<NonNullable<GTMTriggerMockRow['highlight']>, string> = {
  critical: 'bg-critical/5 border-l-2 border-l-critical',
  warning: 'bg-warning/5 border-l-2 border-l-warning',
  info: 'bg-info/5 border-l-2 border-l-info',
  pass: 'bg-emerald-500/5 border-l-2 border-l-emerald-500',
};

const noteStyles: Record<NonNullable<GTMTriggerMockRow['highlight']>, string> = {
  critical: 'text-critical',
  warning: 'text-warning',
  info: 'text-info',
  pass: 'text-emerald-600',
};

export function GTMTriggerListMock({
  rows,
  caption,
  containerLabel = 'GTM-XXXXXXX · Workspace: Default',
  beforeAfter,
}: {
  rows: GTMTriggerMockRow[];
  caption?: ReactNode;
  containerLabel?: string;
  beforeAfter?: 'before' | 'after';
}) {
  return (
    <figure className="my-6 overflow-hidden rounded-md border border-border bg-surface">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-surface-2 px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <span className="rounded-sm bg-ink px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-white">
            Tag Manager
          </span>
          <span className="truncate font-mono text-xs text-muted">{containerLabel}</span>
        </div>
        <div className="flex items-center gap-2">
          {beforeAfter === 'before' && (
            <span className="rounded-sm bg-critical/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-critical">
              Before
            </span>
          )}
          {beforeAfter === 'after' && (
            <span className="rounded-sm bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
              After
            </span>
          )}
          <span className="text-xs font-medium text-muted">Triggers</span>
        </div>
      </header>

      <div className="hidden sm:grid sm:grid-cols-[1fr_140px_180px] border-b border-border bg-surface-2/60 px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted">
        <span>Name</span>
        <span>Type</span>
        <span>Fires On</span>
      </div>

      <ul className="divide-y divide-border">
        {rows.map((row, index) => (
          <li
            key={`${row.name}-${index}`}
            className={`px-4 py-3 text-sm leading-tight sm:grid sm:grid-cols-[1fr_140px_180px] sm:gap-3 ${
              row.highlight ? highlightStyles[row.highlight] : ''
            }`}
          >
            <div className="min-w-0">
              <div className="truncate font-medium text-ink">{row.name}</div>
              {row.note && row.highlight && (
                <div className={`mt-0.5 text-xs ${noteStyles[row.highlight]}`}>{row.note}</div>
              )}
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted sm:mt-0 sm:contents">
              <div className="truncate font-mono sm:text-xs sm:text-muted">
                <span className="sm:hidden text-[10px] font-semibold uppercase tracking-wider text-muted/80">Type: </span>
                {row.type}
              </div>
              <div className="truncate sm:text-xs sm:text-muted">
                <span className="sm:hidden text-[10px] font-semibold uppercase tracking-wider text-muted/80">Fires: </span>
                {row.fires}
              </div>
            </div>
          </li>
        ))}
      </ul>

      {caption && (
        <figcaption className="border-t border-border bg-surface-2/40 px-4 py-2 text-xs leading-relaxed text-muted">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}
