import type { Metadata } from 'next';
import Link from 'next/link';
import { explainerCoverage, explainerSources, getAllExplainersOrStubs } from '@/lib/checks/explainers';
import { ChecksIndexClient } from './ChecksIndexClient';

export const metadata: Metadata = {
  title: 'Check reference',
  description:
    'Reference documentation for every check the AdLint audit engine emits, including why each finding matters and how to fix it.',
  openGraph: {
    title: 'Check reference | AdLint',
    description: 'Why-it-matters and how-to-fix documentation for AdLint audit findings.',
    type: 'website',
    url: 'https://adlint.dev/checks',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Check reference',
    description: 'Why-it-matters and how-to-fix documentation for AdLint audit findings.',
  },
};

export default function ChecksPage() {
  const all = getAllExplainersOrStubs();
  const { documented, total } = explainerCoverage();

  // Per-source counts for the category-jump panel.
  const countsBySource = explainerSources.map((source) => ({
    ...source,
    count: all.filter((e) => e.source === source.key).length,
  }));

  return (
    <main className="flex min-h-screen flex-col bg-bg">
      <header className="border-b border-border bg-surface/85 backdrop-blur-sm">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <Link
            href="/"
            className="font-display text-xl font-semibold text-accent transition-colors hover:text-accent-hover"
          >
            AdLint
          </Link>
          <Link
            href="/"
            className="text-sm font-medium text-muted transition-colors hover:text-ink"
          >
            Back to Tools
          </Link>
        </div>
      </header>

      <div className="container mx-auto max-w-3xl flex-1 px-4 py-16">
        <div className="mb-8 text-center">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-accent">
            Check reference
          </p>
          <h1 className="font-display text-2xl font-semibold leading-tight text-ink sm:text-3xl">
            Search 178 ad-tracking audit findings
          </h1>
        </div>

        <ChecksIndexClient explainers={all} documented={documented} total={total} />

        <section aria-labelledby="browse-by-source" className="mt-14 border-t border-border pt-10">
          <h2 id="browse-by-source" className="mb-4 text-[10px] font-semibold uppercase tracking-wider text-muted">
            Or browse by source
          </h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">
            {countsBySource.map((src) => (
              <Link
                key={src.key}
                href={`/sources/${src.key}`}
                className="group flex flex-col rounded-md border border-border bg-surface px-3 py-2.5 transition-colors hover:border-ink/30"
              >
                <span className="text-sm font-medium text-ink group-hover:text-accent">
                  {src.label}
                </span>
                <span className="text-[11px] text-muted">{src.count} checks</span>
              </Link>
            ))}
          </div>
        </section>
      </div>

      <footer className="border-t border-border py-6">
        <div className="container mx-auto px-4 text-center text-xs text-muted">
          AdLint &mdash; 100% private. All processing happens in your browser.
        </div>
      </footer>
    </main>
  );
}
