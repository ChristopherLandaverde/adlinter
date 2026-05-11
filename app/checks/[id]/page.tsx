import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import {
  explainerSources,
  explainers,
  getExplainer,
  type CheckExplainer,
  type ExplainerSource,
} from '@/lib/checks/explainers';

type PageProps = {
  params: Promise<{ id: string }>;
};

const siteUrl = 'https://adlint.dev';

const severityStyles: Record<CheckExplainer['severity'], string> = {
  critical: 'bg-red-100 text-red-700',
  warning: 'bg-amber-100 text-amber-700',
  info: 'bg-blue-100 text-blue-700',
};

const sourceIcon: Record<ExplainerSource, string> = {
  gtm: 'GTM',
  ads: 'ADS',
  report: 'RPT',
  cross: 'X',
  meta: 'META',
  tiktok: 'TT',
};

function getSourceLabel(source: ExplainerSource) {
  return explainerSources.find((item) => item.key === source)?.label ?? source;
}

export function generateStaticParams() {
  return explainers.map((explainer) => ({ id: explainer.id }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const explainer = getExplainer(id);

  if (!explainer) {
    return { title: 'Page not found' };
  }

  return {
    title: explainer.name,
    description: explainer.summary,
    openGraph: {
      title: `${explainer.name} | AdLint`,
      description: explainer.summary,
      type: 'article',
      url: `${siteUrl}/checks/${explainer.id}`,
    },
    twitter: {
      card: 'summary_large_image',
      title: explainer.name,
      description: explainer.summary,
    },
  };
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-t border-gray-200 pt-8">
      <h2 className="mb-3 text-xl font-bold text-gray-900">{title}</h2>
      <div className="text-base leading-7 text-gray-600">{children}</div>
    </section>
  );
}

export default async function CheckDetailPage({ params }: PageProps) {
  const { id } = await params;
  const explainer = getExplainer(id);

  if (!explainer) {
    notFound();
  }

  const related = (explainer.relatedChecks ?? [])
    .map((relatedId) => getExplainer(relatedId))
    .filter((item): item is CheckExplainer => Boolean(item));

  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'TechArticle',
    headline: explainer.name,
    description: explainer.summary,
    mainEntityOfPage: `${siteUrl}/checks/${explainer.id}`,
    url: `${siteUrl}/checks/${explainer.id}`,
    author: {
      '@type': 'Organization',
      name: 'AdLint',
      url: siteUrl,
    },
    publisher: {
      '@type': 'Organization',
      name: 'AdLint',
      url: siteUrl,
    },
  };

  return (
    <main className="flex min-h-screen flex-col bg-gradient-to-b from-gray-50 to-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />

      <header className="border-b border-gray-200 bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <Link
            href="/checks"
            className="flex items-center gap-2 text-sm font-medium text-gray-500 transition-colors hover:text-gray-900"
          >
            <span aria-hidden="true">&larr;</span> Back to Check Reference
          </Link>
          <span className="text-xl font-bold text-blue-600">AdLint</span>
        </div>
      </header>

      <article className="container mx-auto max-w-3xl flex-1 px-4 py-12">
        <div className="mb-10">
          <div className="mb-5 flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-gray-900 px-2 py-1 text-xs font-bold text-white">
              {sourceIcon[explainer.source]}
            </span>
            <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700">
              {getSourceLabel(explainer.source)}
            </span>
            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${severityStyles[explainer.severity]}`}>
              {explainer.severity}
            </span>
          </div>
          <h1 className="mb-4 text-3xl font-bold leading-tight text-gray-900 sm:text-4xl">
            {explainer.name}
          </h1>
          <p className="text-lg leading-8 text-gray-600">{explainer.summary}</p>
        </div>

        <div className="space-y-8">
          <Section title="Why It Matters">
            <p>{explainer.why}</p>
          </Section>

          <Section title="How To Fix">
            <p>{explainer.howToFix}</p>
          </Section>

          {explainer.example && (
            <Section title="Example">
              <pre className="overflow-x-auto rounded-lg border border-gray-200 bg-white p-4 text-sm leading-6 text-gray-800">
                <code>{explainer.example}</code>
              </pre>
            </Section>
          )}

          {related.length > 0 && (
            <Section title="Related Checks">
              <ul className="space-y-2">
                {related.map((relatedExplainer) => (
                  <li key={relatedExplainer.id}>
                    <Link
                      href={`/checks/${relatedExplainer.id}`}
                      className="font-medium text-blue-600 hover:text-blue-700 hover:underline"
                    >
                      {relatedExplainer.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </Section>
          )}
        </div>
      </article>

      <footer className="border-t border-gray-100 py-6">
        <div className="container mx-auto px-4 text-center text-xs text-gray-400">
          AdLint &mdash; 100% private. All processing happens in your browser.
        </div>
      </footer>
    </main>
  );
}
