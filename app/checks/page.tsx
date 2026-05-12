import type { Metadata } from 'next';
import Link from 'next/link';
import { explainerCoverage, getAllExplainersOrStubs } from '@/lib/checks/explainers';
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
            className="flex items-center gap-2 text-sm font-medium text-muted transition-colors hover:text-ink"
          >
            <span aria-hidden="true">&larr;</span> Back to Tools
          </Link>
        </div>
      </header>

      <div className="container mx-auto max-w-5xl flex-1 px-4 py-12">
        <div className="mb-10 max-w-3xl">
          <p className="mb-3 text-sm font-semibold uppercase text-accent">Check reference</p>
          <h1 className="mb-4 font-display text-3xl font-semibold leading-tight text-ink sm:text-4xl">
            Every check the audit engine emits, in one place
          </h1>
          <p className="text-base leading-relaxed text-muted">
            Searchable index of every finding AdLint can produce. Each check links to a page
            explaining what it means and how to fix it — full editorial treatment where it exists,
            a reference stub everywhere else.
          </p>
        </div>

        <ChecksIndexClient explainers={all} documented={documented} total={total} />
      </div>

      <footer className="border-t border-border py-6">
        <div className="container mx-auto px-4 text-center text-xs text-muted">
          AdLint &mdash; 100% private. All processing happens in your browser.
        </div>
      </footer>
    </main>
  );
}
