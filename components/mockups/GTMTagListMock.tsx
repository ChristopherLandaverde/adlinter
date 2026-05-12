import type { ReactNode } from 'react';

// A stylized, non-pixel-faithful representation of the GTM Tags screen.
// Obviously inspired by, not pretending to be Google's interface. Lets
// /checks pages illustrate findings without using real client screenshots
// (privacy posture) or copying Google's exact UI (trademark posture).

export type GTMTagMockRow = {
  name: string;
  type: string;
  firing: string;
  highlight?: 'critical' | 'warning' | 'info' | 'pass';
  note?: string;
};

const highlightStyles: Record<NonNullable<GTMTagMockRow['highlight']>, string> = {
  critical: 'bg-critical/5 border-l-2 border-l-critical',
  warning: 'bg-warning/5 border-l-2 border-l-warning',
  info: 'bg-info/5 border-l-2 border-l-info',
  pass: 'bg-emerald-500/5 border-l-2 border-l-emerald-500',
};

const noteStyles: Record<NonNullable<GTMTagMockRow['highlight']>, string> = {
  critical: 'text-critical',
  warning: 'text-warning',
  info: 'text-info',
  pass: 'text-emerald-600',
};

export function GTMTagListMock({
  rows,
  caption,
  containerLabel = 'GTM-XXXXXXX · Workspace: Default',
}: {
  rows: GTMTagMockRow[];
  caption?: ReactNode;
  containerLabel?: string;
}) {
  return (
    <figure className="my-6 overflow-hidden rounded-md border border-border bg-surface">
      <header className="flex items-center justify-between border-b border-border bg-surface-2 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="rounded-sm bg-ink px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-white">
            Tag Manager
          </span>
          <span className="font-mono text-xs text-muted">{containerLabel}</span>
        </div>
        <span className="text-xs font-medium text-muted">Tags</span>
      </header>

      <div className="grid grid-cols-[1fr_140px_180px] border-b border-border bg-surface-2/60 px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted">
        <span>Name</span>
        <span>Type</span>
        <span>Firing Triggers</span>
      </div>

      <ul className="divide-y divide-border">
        {rows.map((row, index) => (
          <li
            key={`${row.name}-${index}`}
            className={`grid grid-cols-[1fr_140px_180px] gap-3 px-4 py-3 text-sm leading-tight ${
              row.highlight ? highlightStyles[row.highlight] : ''
            }`}
          >
            <div className="min-w-0">
              <div className="truncate font-medium text-ink">{row.name}</div>
              {row.note && row.highlight && (
                <div className={`mt-0.5 text-xs ${noteStyles[row.highlight]}`}>
                  {row.note}
                </div>
              )}
            </div>
            <div className="truncate font-mono text-xs text-muted">{row.type}</div>
            <div className="truncate text-xs text-muted">{row.firing}</div>
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
