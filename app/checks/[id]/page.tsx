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
  critical: 'bg-critical/10 text-critical',
  warning: 'bg-warning/10 text-warning',
  info: 'bg-info/10 text-info',
};

const sourceIcon: Record<ExplainerSource, string> = {
  gtm: 'GTM',
  ads: 'ADS',
  report: 'RPT',
  cross: 'X',
  meta: 'META',
  tiktok: 'TT',
  linkedin: 'LI',
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
    <section className="border-t border-border pt-8">
      <h2 className="mb-3 font-display text-xl font-semibold text-ink">{title}</h2>
      <div className="text-base leading-7 text-muted">{children}</div>
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
    <main className="flex min-h-screen flex-col bg-bg">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />

      <header className="border-b border-border bg-surface/85 backdrop-blur-sm">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <Link href="/" className="font-display text-xl font-semibold text-accent transition-colors hover:text-accent-hover">
            AdLint
          </Link>
          <Link
            href="/checks"
            className="flex items-center gap-2 text-sm font-medium text-muted transition-colors hover:text-ink"
          >
            <span aria-hidden="true">&larr;</span> Back to Check Reference
          </Link>
        </div>
      </header>

      <article className="container mx-auto max-w-3xl flex-1 px-4 py-12">
        <div className="mb-10">
          <div className="mb-5 flex flex-wrap items-center gap-2">
            <span className="rounded-sm bg-ink px-2 py-1 text-xs font-bold text-white">
              {sourceIcon[explainer.source]}
            </span>
            <span className="rounded-full bg-surface-2 px-2.5 py-1 text-xs font-semibold text-muted">
              {getSourceLabel(explainer.source)}
            </span>
            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${severityStyles[explainer.severity]}`}>
              {explainer.severity}
            </span>
          </div>
          <h1 className="mb-4 font-display text-3xl font-semibold leading-tight text-ink sm:text-4xl">
            {explainer.name}
          </h1>
          <p className="text-lg leading-8 text-muted">{explainer.summary}</p>
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
              <pre className="overflow-x-auto rounded-md border border-border bg-surface-2 p-4 text-sm leading-6 text-ink">
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
                      className="font-medium text-accent hover:text-accent-hover hover:underline"
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

      <footer className="border-t border-border py-6">
        <div className="container mx-auto px-4 text-center text-xs text-muted">
          AdLint &mdash; 100% private. All processing happens in your browser.
        </div>
      </footer>
    </main>
  );
}
