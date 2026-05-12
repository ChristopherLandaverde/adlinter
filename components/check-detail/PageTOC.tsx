import Link from 'next/link';

export type TOCEntry = { id: string; label: string };

// Sticky table-of-contents shown at lg+ widths only.
// Server component (no scroll-spy). Anchored links are good enough.
export function PageTOC({ entries }: { entries: TOCEntry[] }) {
  if (entries.length === 0) return null;
  return (
    <aside className="hidden lg:block">
      <nav
        aria-label="On this page"
        className="sticky top-24 ml-8 w-48 border-l border-border pl-4"
      >
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-muted">
          On this page
        </p>
        <ul className="space-y-2">
          {entries.map((entry) => (
            <li key={entry.id}>
              <Link
                href={`#${entry.id}`}
                className="block text-xs leading-snug text-muted transition-colors hover:text-ink"
              >
                {entry.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}
