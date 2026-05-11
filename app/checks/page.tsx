import type { Metadata } from 'next';
import Link from 'next/link';
import {
  explainerSources,
  getExplainersBySource,
  type CheckExplainer,
  type ExplainerSource,
} from '@/lib/checks/explainers';

export const metadata: Metadata = {
  title: 'Check reference',
  description: 'Reference documentation for AdLint audit checks, including why each finding matters and how to fix it.',
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

const severityStyles: Record<CheckExplainer['severity'], string> = {
  critical: 'bg-critical/10 text-critical',
  warning: 'bg-warning/10 text-warning',
  info: 'bg-info/10 text-info',
};

function CheckCard({ explainer }: { explainer: CheckExplainer }) {
  return (
    <Link
      href={`/checks/${explainer.id}`}
      className="group block rounded-md border border-border bg-surface p-5 transition-colors hover:border-ink/20"
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <h3 className="font-display text-base font-semibold leading-tight text-ink">{explainer.name}</h3>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${severityStyles[explainer.severity]}`}>
          {explainer.severity}
        </span>
      </div>
      <p className="mb-4 text-sm leading-relaxed text-muted">{explainer.summary}</p>
      <span className="text-sm font-medium text-accent group-hover:text-accent-hover">
        Read more &rarr;
      </span>
    </Link>
  );
}

function SourceSection({ source }: { source: { key: ExplainerSource; label: string } }) {
  const sourceExplainers = getExplainersBySource(source.key);

  return (
    <section className="border-t border-border py-10 first:border-t-0 first:pt-0">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-semibold text-ink">{source.label}</h2>
          <p className="mt-1 text-sm text-muted">
            {sourceExplainers.length > 0
              ? `${sourceExplainers.length} documented checks`
              : 'Coming soon'}
          </p>
        </div>
      </div>

      {sourceExplainers.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {sourceExplainers.map((explainer) => (
            <CheckCard key={explainer.id} explainer={explainer} />
          ))}
        </div>
      ) : (
        <div className="rounded-md border border-dashed border-border bg-surface p-6 text-sm text-muted">
          Coming soon.
        </div>
      )}
    </section>
  );
}

export default function ChecksPage() {
  return (
    <main className="flex min-h-screen flex-col bg-bg">
      <header className="border-b border-border bg-surface/85 backdrop-blur-sm">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <Link href="/" className="font-display text-xl font-semibold text-accent transition-colors hover:text-accent-hover">
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
          <p className="mb-3 text-sm font-semibold uppercase text-accent">
            Check reference
          </p>
          <h1 className="mb-4 font-display text-3xl font-semibold leading-tight text-ink sm:text-4xl">
            Audit findings, translated into fixes
          </h1>
          <p className="text-base leading-relaxed text-muted">
            Each documented check explains what the finding means, why it affects tracking or bidding, and how to repair the underlying setup.
          </p>
        </div>

        {explainerSources.map((source) => (
          <SourceSection key={source.key} source={source} />
        ))}
      </div>

      <footer className="border-t border-border py-6">
        <div className="container mx-auto px-4 text-center text-xs text-muted">
          AdLint &mdash; 100% private. All processing happens in your browser.
        </div>
      </footer>
    </main>
  );
}
