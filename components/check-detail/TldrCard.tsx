import type { ReactNode } from 'react';

// The page's 10-second exit ramp. Renders the explainer's directAnswer as a
// card set apart from the "Why It Matters" prose: surface-2 background,
// accent left rule, no surrounding prose.
export function TldrCard({ children }: { children: ReactNode }) {
  return (
    <aside
      aria-label="TL;DR"
      className="rounded-md border border-border border-l-4 border-l-accent bg-surface-2 p-4 sm:p-6"
    >
      <p className="mb-2 font-mono text-xs font-medium uppercase tracking-wider text-accent">
        TL;DR
      </p>
      <p className="max-w-[72ch] text-lg font-medium leading-8 text-ink">{children}</p>
    </aside>
  );
}
