import Link from 'next/link';
import { explainerSources, type CheckExplainer } from '@/lib/checks/explainers';
import { SeverityDot } from './SeverityChip';

function sourceLabel(source: CheckExplainer['source']) {
  return explainerSources.find((s) => s.key === source)?.label ?? source;
}

// Related checks as a row of compact cards: horizontal scroll (with snap) on
// narrow screens, a grid from md up. Each card: name, source, severity dot.
export function RelatedChecksRow({ checks }: { checks: CheckExplainer[] }) {
  if (checks.length === 0) return null;
  return (
    <ul className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:grid-cols-3 md:overflow-visible md:px-0 md:pb-0">
      {checks.map((check) => (
        <li key={check.id} className="w-60 shrink-0 snap-start md:w-auto">
          <Link
            href={`/checks/${check.id}`}
            className="flex h-full flex-col gap-3 rounded-md border border-border bg-surface p-4 transition-colors duration-150 ease-in-out hover:border-ink/10"
          >
            <span className="font-display text-base font-semibold leading-snug text-ink">
              {check.name}
            </span>
            <span className="mt-auto flex items-center gap-2 text-xs text-muted">
              <SeverityDot severity={check.severity} />
              <span className="capitalize">{check.severity}</span>
              <span aria-hidden="true">·</span>
              <span>{sourceLabel(check.source)}</span>
              {check.status === 'stub' && <span>(stub)</span>}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
