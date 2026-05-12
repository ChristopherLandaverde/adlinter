import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import {
  explainers,
  explainerSources,
  getAllExplainersOrStubs,
  type CheckExplainer,
  type ExplainerSource,
} from '@/lib/checks/explainers';
import { sourceContent } from '@/lib/checks/sourceContent';
import { tools } from '@/lib/tools';

type PageProps = {
  params: Promise<{ key: string }>;
};

const siteUrl = 'https://adlint.dev';
const authorName = 'Christopher Landaverde';

const severityStyles: Record<CheckExplainer['severity'], string> = {
  critical: 'bg-critical/10 text-critical',
  warning: 'bg-warning/10 text-warning',
  info: 'bg-info/10 text-info',
};

function isValidSource(key: string): key is ExplainerSource {
  return explainerSources.some((s) => s.key === key);
}

export function generateStaticParams() {
  return explainerSources.map((source) => ({ key: source.key }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { key } = await params;
  if (!isValidSource(key)) return { title: 'Not found' };
  const content = sourceContent[key];
  return {
    title: `${content.headline} — ${content.tagline}`,
    description: content.intro.split('\n')[0],
    openGraph: {
      title: `${content.headline} | AdLint`,
      description: content.tagline,
      type: 'website',
      url: `${siteUrl}/sources/${key}`,
    },
    twitter: {
      card: 'summary_large_image',
      title: content.headline,
      description: content.tagline,
    },
  };
}

export default async function SourceCategoryPage({ params }: PageProps) {
  const { key } = await params;
  if (!isValidSource(key)) notFound();

  const content = sourceContent[key];
  const all = getAllExplainersOrStubs();
  const checks = all.filter((e) => e.source === key);

  // Group by severity. critical → warning → info ordering.
  const grouped: Record<CheckExplainer['severity'], CheckExplainer[]> = {
    critical: checks.filter((c) => c.severity === 'critical'),
    warning: checks.filter((c) => c.severity === 'warning'),
    info: checks.filter((c) => c.severity === 'info'),
  };

  const tool = content.toolSlug ? tools.find((t) => t.slug === content.toolSlug) : undefined;
  const fullCount = checks.filter((c) => c.status !== 'stub').length;

  // CollectionPage schema for the category page. Lists each check as a
  // hasPart with its own URL. Gives LLMs a structured way to express the
  // category-to-individual-pages hierarchy. BreadcrumbList helps both
  // Google sitelinks and AEO grounding.
  const collectionSchema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    '@id': `${siteUrl}/sources/${key}#collection`,
    name: content.headline,
    description: content.tagline,
    url: `${siteUrl}/sources/${key}`,
    inLanguage: 'en',
    isPartOf: { '@id': `${siteUrl}/#website` },
    about: {
      '@type': 'Thing',
      name: content.label,
    },
    author: { '@type': 'Person', '@id': `${siteUrl}/about#person`, name: authorName, url: `${siteUrl}/about` },
    publisher: { '@id': `${siteUrl}/#organization` },
    hasPart: checks.map((c) => ({
      '@type': 'TechArticle',
      '@id': `${siteUrl}/checks/${c.id}#article`,
      headline: c.name,
      url: `${siteUrl}/checks/${c.id}`,
    })),
    numberOfItems: checks.length,
  };

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'AdLint', item: siteUrl },
      { '@type': 'ListItem', position: 2, name: 'Check reference', item: `${siteUrl}/checks` },
      { '@type': 'ListItem', position: 3, name: content.label, item: `${siteUrl}/sources/${key}` },
    ],
  };

  // FAQPage schema seeded from the searchTargets. Helps LLMs match the
  // page against category-level queries even when wording differs.
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: `What is a ${content.label} audit?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: content.intro.split('\n\n')[0],
        },
      },
      {
        '@type': 'Question',
        name: `How many ${content.label} checks does AdLint run?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `AdLint runs ${checks.length} checks across ${content.label}. ${fullCount} have full editorial explainer pages with citation templates designed for client deliverables.`,
        },
      },
      {
        '@type': 'Question',
        name: `Does AdLint upload my ${content.label} data?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'No. AdLint runs entirely in your browser. There is no upload, no account, no server. Your audit files never leave the device. Source code is open and available on GitHub.',
        },
      },
    ],
  };

  const schemas = [collectionSchema, breadcrumbSchema, faqSchema];

  return (
    <main className="flex min-h-screen flex-col bg-bg">
      {schemas.map((schema, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}

      <header className="border-b border-border bg-surface/85 backdrop-blur-sm">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <Link
            href="/"
            className="font-display text-xl font-semibold text-accent transition-colors hover:text-accent-hover"
          >
            AdLint
          </Link>
          <Link
            href="/checks"
            className="text-sm font-medium text-muted transition-colors hover:text-ink"
          >
            Back to Check Reference
          </Link>
        </div>
      </header>

      <article className="container mx-auto max-w-4xl flex-1 px-4 py-12">
        <nav aria-label="Breadcrumb" className="mb-8 text-xs text-muted">
          <Link href="/checks" className="hover:text-ink">
            Check reference
          </Link>
          <span aria-hidden="true" className="mx-2">/</span>
          <span className="text-ink">{content.label}</span>
        </nav>

        <div className="mb-10">
          <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-accent">
            {content.label}
          </p>
          <h1 className="mb-4 font-display text-3xl font-semibold leading-tight text-ink sm:text-4xl">
            {content.headline}
          </h1>
          <p className="border-l-2 border-l-accent/60 pl-4 text-lg font-medium leading-8 text-ink sm:text-xl sm:leading-9">
            {content.tagline}
          </p>
        </div>

        <section className="mb-12 space-y-4 text-base leading-7 text-muted">
          {content.intro.split('\n\n').map((para, i) => (
            <p key={i}>{para}</p>
          ))}
        </section>

        <section className="mb-12 grid grid-cols-3 gap-4 sm:gap-6">
          <div className="rounded-md border border-border bg-surface p-4 text-center">
            <div className="font-display text-2xl font-semibold text-critical">
              {grouped.critical.length}
            </div>
            <div className="text-xs font-medium uppercase tracking-wider text-muted">
              Critical
            </div>
          </div>
          <div className="rounded-md border border-border bg-surface p-4 text-center">
            <div className="font-display text-2xl font-semibold text-warning">
              {grouped.warning.length}
            </div>
            <div className="text-xs font-medium uppercase tracking-wider text-muted">
              Warning
            </div>
          </div>
          <div className="rounded-md border border-border bg-surface p-4 text-center">
            <div className="font-display text-2xl font-semibold text-info">
              {grouped.info.length}
            </div>
            <div className="text-xs font-medium uppercase tracking-wider text-muted">
              Info
            </div>
          </div>
        </section>

        <div className="space-y-12">
          {(['critical', 'warning', 'info'] as const).map((sev) => {
            const list = grouped[sev];
            if (list.length === 0) return null;
            return (
              <section key={sev}>
                <h2 className="mb-5 font-display text-xl font-semibold capitalize text-ink">
                  {sev} ({list.length})
                </h2>
                <ul className="space-y-3">
                  {list.map((check) => (
                    <li key={check.id}>
                      <Link
                        href={`/checks/${check.id}`}
                        className="block rounded-md border border-border bg-surface p-4 transition-colors hover:border-ink/30"
                      >
                        <div className="mb-1 flex flex-wrap items-start justify-between gap-2">
                          <h3 className="font-display text-sm font-semibold leading-tight text-ink">
                            {check.name}
                          </h3>
                          <span
                            className={`shrink-0 rounded-sm px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${severityStyles[check.severity]}`}
                          >
                            {check.severity}
                          </span>
                        </div>
                        <p className="text-xs leading-relaxed text-muted">
                          {check.directAnswer ?? check.summary}
                        </p>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>

        <section className="mt-14 rounded-md border border-border bg-surface p-6">
          <p className="mb-2 font-display text-base font-semibold text-ink">
            Run a free {content.label} audit
          </p>
          <p className="mb-4 text-sm leading-relaxed text-muted">
            AdLint runs every check on this page against your export in seconds.
            Nothing uploaded. Nothing logged. Everything stays in your browser.
          </p>
          {tool ? (
            <Link
              href={`/tools/${tool.slug}`}
              className="inline-flex items-center rounded-sm bg-accent px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
            >
              Open the {content.label} auditor
            </Link>
          ) : (
            <Link
              href="/"
              className="inline-flex items-center rounded-sm bg-accent px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
            >
              Run a free audit
            </Link>
          )}
        </section>
      </article>

      <footer className="border-t border-border py-6">
        <div className="container mx-auto px-4 text-center text-xs text-muted">
          AdLint &mdash; 100% private. All processing happens in your browser.
        </div>
      </footer>
    </main>
  );
}
