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
  critical: 'bg-red-100 text-red-700',
  warning: 'bg-amber-100 text-amber-700',
  info: 'bg-blue-100 text-blue-700',
};

function CheckCard({ explainer }: { explainer: CheckExplainer }) {
  return (
    <Link
      href={`/checks/${explainer.id}`}
      className="group block rounded-lg border border-gray-200 bg-white p-5 transition-colors hover:border-blue-200 hover:bg-blue-50/30"
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <h3 className="text-base font-bold leading-tight text-gray-900">{explainer.name}</h3>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${severityStyles[explainer.severity]}`}>
          {explainer.severity}
        </span>
      </div>
      <p className="mb-4 text-sm leading-relaxed text-gray-600">{explainer.summary}</p>
      <span className="text-sm font-medium text-blue-600 group-hover:text-blue-700">
        Read more &rarr;
      </span>
    </Link>
  );
}

function SourceSection({ source }: { source: { key: ExplainerSource; label: string } }) {
  const sourceExplainers = getExplainersBySource(source.key);

  return (
    <section className="border-t border-gray-200 py-10 first:border-t-0 first:pt-0">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">{source.label}</h2>
          <p className="mt-1 text-sm text-gray-500">
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
        <div className="rounded-lg border border-dashed border-gray-200 bg-white p-6 text-sm text-gray-500">
          Coming soon.
        </div>
      )}
    </section>
  );
}

export default function ChecksPage() {
  return (
    <main className="flex min-h-screen flex-col bg-gradient-to-b from-gray-50 to-white">
      <header className="border-b border-gray-200 bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm font-medium text-gray-500 transition-colors hover:text-gray-900"
          >
            <span aria-hidden="true">&larr;</span> Back to Tools
          </Link>
          <span className="text-xl font-bold text-blue-600">AdLint</span>
        </div>
      </header>

      <div className="container mx-auto max-w-5xl flex-1 px-4 py-12">
        <div className="mb-10 max-w-3xl">
          <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-blue-600">
            Check reference
          </p>
          <h1 className="mb-4 text-3xl font-bold leading-tight text-gray-900 sm:text-4xl">
            Audit findings, translated into fixes
          </h1>
          <p className="text-base leading-relaxed text-gray-600">
            Each documented check explains what the finding means, why it affects tracking or bidding, and how to repair the underlying setup.
          </p>
        </div>

        {explainerSources.map((source) => (
          <SourceSection key={source.key} source={source} />
        ))}
      </div>

      <footer className="border-t border-gray-100 py-6">
        <div className="container mx-auto px-4 text-center text-xs text-gray-400">
          AdLint &mdash; 100% private. All processing happens in your browser.
        </div>
      </footer>
    </main>
  );
}
