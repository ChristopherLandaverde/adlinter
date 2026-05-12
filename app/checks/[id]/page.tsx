import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import {
  explainerSources,
  getExplainerOrStub,
  type CheckExplainer,
  type CheckMockupSpec,
  type ExplainerSource,
} from '@/lib/checks/explainers';
import { checkRegistry } from '@/lib/checks/registry.generated';
import { GTMTagListMock } from '@/components/mockups/GTMTagListMock';
import { GTMTriggerListMock } from '@/components/mockups/GTMTriggerListMock';

function renderMockup(spec: CheckMockupSpec) {
  if (spec.kind === 'gtm-tag-list') {
    return <GTMTagListMock rows={spec.rows} caption={spec.caption} containerLabel={spec.containerLabel} />;
  }
  if (spec.kind === 'gtm-trigger-list') {
    return <GTMTriggerListMock rows={spec.rows} caption={spec.caption} containerLabel={spec.containerLabel} />;
  }
  return null;
}

type PageProps = {
  params: Promise<{ id: string }>;
};

const siteUrl = 'https://adlint.dev';
const authorName = 'Christopher Landaverde';
const authorRole = 'Creator of AdLint · ad-tech tracking specialist';
const defaultLastUpdated = '2026-05-12';

const severityStyles: Record<CheckExplainer['severity'], string> = {
  critical: 'bg-critical/10 text-critical',
  warning: 'bg-warning/10 text-warning',
  info: 'bg-info/10 text-info',
};

const sourceIcon: Record<ExplainerSource, string> = {
  gtm: 'GTM',
  ads: 'ADS',
  report: 'RPT',
  cross: 'CROSS',
  meta: 'META',
  tiktok: 'TT',
  linkedin: 'LI',
  pinterest: 'PIN',
  twitter: 'X',
  snapchat: 'SNAP',
};

function getSourceLabel(source: ExplainerSource) {
  return explainerSources.find((item) => item.key === source)?.label ?? source;
}

export function generateStaticParams() {
  return checkRegistry.map((entry) => ({ id: entry.id }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const explainer = getExplainerOrStub(id);

  if (!explainer) {
    return { title: 'Check not found' };
  }

  const titleSuffix = explainer.status === 'stub' ? ' (reference)' : '';
  return {
    title: `${explainer.name}${titleSuffix}`,
    description: explainer.directAnswer ?? explainer.summary,
    openGraph: {
      title: `${explainer.name} | AdLint`,
      description: explainer.directAnswer ?? explainer.summary,
      type: 'article',
      url: `${siteUrl}/checks/${explainer.id}`,
    },
    twitter: {
      card: 'summary_large_image',
      title: explainer.name,
      description: explainer.directAnswer ?? explainer.summary,
    },
  };
}

function Section({ id, title, children }: { id?: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="border-t border-border pt-8 scroll-mt-24">
      <h2 className="mb-3 font-display text-xl font-semibold text-ink">{title}</h2>
      <div className="text-base leading-7 text-muted">{children}</div>
    </section>
  );
}

function buildJsonLd(explainer: CheckExplainer, lastUpdated: string) {
  const pageUrl = `${siteUrl}/checks/${explainer.id}`;

  const article = {
    '@context': 'https://schema.org',
    '@type': 'TechArticle',
    headline: explainer.name,
    description: explainer.directAnswer ?? explainer.summary,
    mainEntityOfPage: pageUrl,
    url: pageUrl,
    datePublished: lastUpdated,
    dateModified: lastUpdated,
    author: {
      '@type': 'Person',
      name: authorName,
      url: siteUrl,
    },
    publisher: {
      '@type': 'Organization',
      name: 'AdLint',
      url: siteUrl,
    },
  };

  // FAQ schema only when we have full editorial content; stubs don't qualify.
  if (explainer.status === 'stub') {
    return [article];
  }

  const faq = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: `What is "${explainer.name}"?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: explainer.directAnswer ?? explainer.summary,
        },
      },
      {
        '@type': 'Question',
        name: 'Why does this finding matter?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: explainer.why,
        },
      },
      {
        '@type': 'Question',
        name: 'How do I fix it?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: explainer.howToFix,
        },
      },
    ],
  };

  return [article, faq];
}

export default async function CheckDetailPage({ params }: PageProps) {
  const { id } = await params;
  const explainer = getExplainerOrStub(id);

  if (!explainer) {
    notFound();
  }

  const isStub = explainer.status === 'stub';
  const lastUpdated = explainer.lastUpdated ?? defaultLastUpdated;

  const related = (explainer.relatedChecks ?? [])
    .map((relatedId) => getExplainerOrStub(relatedId))
    .filter((item): item is CheckExplainer => Boolean(item));

  const jsonLd = buildJsonLd(explainer, lastUpdated);

  return (
    <main className="flex min-h-screen flex-col bg-bg">
      {jsonLd.map((schema, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}

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
        <div className="mb-8">
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
            {isStub && (
              <span className="rounded-full border border-dashed border-border px-2.5 py-1 text-xs font-medium text-muted">
                Reference stub
              </span>
            )}
          </div>
          <h1 className="mb-4 font-display text-3xl font-semibold leading-tight text-ink sm:text-4xl">
            {explainer.name}
          </h1>
          <p className="text-lg leading-8 text-ink">
            {explainer.directAnswer ?? explainer.summary}
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
            <span>
              By <span className="font-medium text-ink">{authorName}</span>
            </span>
            <span aria-hidden="true">·</span>
            <span>{authorRole}</span>
            <span aria-hidden="true">·</span>
            <span>
              Last updated <time dateTime={lastUpdated}>{lastUpdated}</time>
            </span>
          </div>

          {isStub && (
            <div className="mt-6 rounded-md border border-dashed border-border bg-surface-2 p-4 text-sm leading-relaxed text-muted">
              This page is a reference stub — the audit engine fully implements this check, but
              the editorial explainer has not been written yet. The basics below come straight
              from the check definition; deep "why" and "how to fix" content is in progress.
            </div>
          )}
        </div>

        <div className="space-y-8">
          <Section id="why" title="Why It Matters">
            <p>{explainer.why}</p>
            {explainer.whyMockup && renderMockup(explainer.whyMockup)}
          </Section>

          <Section id="fix" title="How To Fix It">
            <p>{explainer.howToFix}</p>
            {explainer.fixMockup && renderMockup(explainer.fixMockup)}
          </Section>

          {explainer.example && (
            <Section id="example" title="Example">
              <pre className="overflow-x-auto rounded-md border border-border bg-surface-2 p-4 text-sm leading-6 text-ink">
                <code>{explainer.example}</code>
              </pre>
            </Section>
          )}

          {explainer.citationTemplate && (
            <Section id="cite" title="Cite This Finding">
              <p className="mb-3 text-sm text-muted">
                Drop this into a client deliverable. The citation language is structured so an
                agency can defend the finding without rewriting it.
              </p>
              <blockquote className="rounded-md border-l-2 border-l-accent bg-surface-2 px-4 py-3 text-sm leading-7 text-ink">
                {explainer.citationTemplate}
              </blockquote>
            </Section>
          )}

          {explainer.references && explainer.references.length > 0 && (
            <Section id="references" title="References">
              <ul className="space-y-2">
                {explainer.references.map((ref) => (
                  <li key={ref.url}>
                    <a
                      href={ref.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-accent hover:text-accent-hover hover:underline"
                    >
                      {ref.label}
                    </a>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {related.length > 0 && (
            <Section id="related" title="Related Checks">
              <ul className="space-y-2">
                {related.map((relatedExplainer) => (
                  <li key={relatedExplainer.id}>
                    <Link
                      href={`/checks/${relatedExplainer.id}`}
                      className="font-medium text-accent hover:text-accent-hover hover:underline"
                    >
                      {relatedExplainer.name}
                      {relatedExplainer.status === 'stub' && (
                        <span className="ml-1 text-xs font-normal text-muted">(stub)</span>
                      )}
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
