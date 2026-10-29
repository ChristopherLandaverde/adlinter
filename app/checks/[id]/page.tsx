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
import { CopyButton } from '@/components/check-detail/CopyButton';
import { PageTOC, type TOCEntry } from '@/components/check-detail/PageTOC';
import { SeverityChip } from '@/components/check-detail/SeverityChip';
import { TldrCard } from '@/components/check-detail/TldrCard';
import { HowToFixSteps } from '@/components/check-detail/HowToFixSteps';
import { RelatedChecksRow } from '@/components/check-detail/RelatedChecksRow';
import { EditorialBannerCTA } from '@/components/check-detail/EditorialBannerCTA';
import { InlineProse } from '@/components/check-detail/InlineProse';
import { parseNumberedList, splitParagraphs } from '@/components/check-detail/prose';

// "Why" prose: one <p> per paragraph with a little more leading than body
// default, capped at DESIGN.md's 72ch prose width. A few entries write why as
// a numbered list; those keep list rendering.
function WhyProse({ text }: { text: string }) {
  const list = parseNumberedList(text);
  if (list) {
    return (
      <ol className="max-w-[72ch] list-decimal space-y-2 pl-6 marker:font-mono marker:text-xs marker:text-muted">
        {list.map((item, i) => (
          <li key={i}>
            <InlineProse text={item} />
          </li>
        ))}
      </ol>
    );
  }
  return (
    <div className="max-w-[72ch] space-y-5">
      {splitParagraphs(text).map((p, i) => (
        <p key={i} className="whitespace-pre-line">
          <InlineProse text={p} />
        </p>
      ))}
    </div>
  );
}

function renderMockup(spec: CheckMockupSpec, beforeAfter?: 'before' | 'after') {
  if (spec.kind === 'gtm-tag-list') {
    return (
      <GTMTagListMock
        rows={spec.rows}
        caption={spec.caption}
        containerLabel={spec.containerLabel}
        beforeAfter={beforeAfter}
      />
    );
  }
  if (spec.kind === 'gtm-trigger-list') {
    return (
      <GTMTriggerListMock
        rows={spec.rows}
        caption={spec.caption}
        containerLabel={spec.containerLabel}
        beforeAfter={beforeAfter}
      />
    );
  }
  return null;
}

type PageProps = {
  params: Promise<{ id: string }>;
};

const siteUrl = 'https://adlint.dev';
const authorName = 'Christopher Landaverde';
const authorInitials = 'CL';
const authorRole = 'Creator of AdLint · ad-tech tracking specialist';
const defaultLastUpdated = '2026-05-12';

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

// F1: Section variants give the page real rhythm. "story" sections lead the
// page (Why, Fix). "callout" is the deliverable (Cite). "reference" sections
// sit quieter at the bottom (References, Related).
type SectionVariant = 'story' | 'callout' | 'reference';

function Section({
  id,
  title,
  variant = 'story',
  children,
}: {
  id?: string;
  title: string;
  variant?: SectionVariant;
  children: ReactNode;
}) {
  if (variant === 'reference') {
    return (
      <section id={id} className="border-t border-border pt-6 scroll-mt-24">
        <h2 className="mb-4 font-display text-xs font-semibold uppercase tracking-wider text-muted">
          {title}
        </h2>
        <div className="text-sm leading-6 text-muted">{children}</div>
      </section>
    );
  }
  if (variant === 'callout') {
    return (
      <section id={id} className="scroll-mt-24">
        {children}
      </section>
    );
  }
  return (
    <section id={id} className="border-t border-border pt-8 scroll-mt-24">
      <h2 className="mb-4 font-display text-2xl font-semibold text-ink sm:text-3xl">{title}</h2>
      <div className="text-base leading-8 text-muted">{children}</div>
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
      '@id': `${siteUrl}/about#person`,
      name: authorName,
      url: `${siteUrl}/about`,
    },
    publisher: {
      '@type': 'Organization',
      name: 'AdLint',
      url: siteUrl,
    },
  };

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

  // F12: Sticky TOC entries (only sections that will actually render).
  const tocEntries: TOCEntry[] = [
    { id: 'why', label: 'Why It Matters' },
    { id: 'fix', label: 'How To Fix It' },
    ...(explainer.example ? [{ id: 'example', label: 'Example' }] : []),
    ...(explainer.citationTemplate ? [{ id: 'cite', label: 'For Your Client Report' }] : []),
    ...(explainer.references && explainer.references.length > 0
      ? [{ id: 'references', label: 'References' }]
      : []),
    ...(related.length > 0 ? [{ id: 'related', label: 'Related Checks' }] : []),
  ];

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

      <div className="container mx-auto flex flex-1 px-4 py-12">
        <article className="mx-auto w-full max-w-3xl">
          <header className="mb-10">
            {/* 1. Source breadcrumb + severity chip. The chip is the most
                saturated element above the title so severity reads first.
                Source links up to its category landing page. */}
            <div className="mb-5 flex flex-wrap items-center gap-x-2 gap-y-2 text-xs text-muted">
              <SeverityChip severity={explainer.severity} />
              <span className="font-mono font-medium uppercase tracking-wider">
                {sourceIcon[explainer.source]}
              </span>
              <span aria-hidden="true">·</span>
              <Link
                href={`/sources/${explainer.source}`}
                className="font-medium underline-offset-2 hover:text-ink hover:underline"
              >
                {getSourceLabel(explainer.source)}
              </Link>
              {isStub && (
                <span className="rounded-sm border border-dashed border-border px-2 py-0.5 font-medium uppercase tracking-wider">
                  Reference stub
                </span>
              )}
            </div>

            {/* 2. Title. */}
            <h1 className="font-display text-3xl font-semibold leading-tight text-ink sm:text-4xl">
              {explainer.name}
            </h1>

            {/* 3. Byline directly under the title, quiet (UX_AUDIT CD-02 left
                open: revisit placement with traffic data). Links to /about for
                AEO Person-entity grounding. */}
            <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-muted">
              <Link
                href="/about"
                className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-medium text-white transition-opacity duration-150 hover:opacity-90"
                aria-label={`About ${authorName}`}
              >
                {authorInitials}
              </Link>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <span>
                  By{' '}
                  <Link
                    href="/about"
                    className="font-medium text-ink underline-offset-2 hover:text-accent hover:underline"
                  >
                    {authorName}
                  </Link>
                </span>
                <span aria-hidden="true">·</span>
                <span>{authorRole}</span>
                <span aria-hidden="true">·</span>
                <span>
                  Updated <time dateTime={lastUpdated}>{lastUpdated}</time>
                </span>
              </div>
            </div>

            {isStub && (
              <div className="mt-6 rounded-md border border-dashed border-border bg-surface-2 p-4 text-sm leading-relaxed text-muted">
                This page is a reference stub. The audit engine fully implements this check;
                the editorial explainer has not been written yet.
              </div>
            )}

            {/* 4. TL;DR card: the 10-second exit ramp. */}
            <div className="mt-8">
              <TldrCard>
                <InlineProse text={explainer.directAnswer ?? explainer.summary} />
              </TldrCard>
            </div>
          </header>

          <div className="space-y-10">
            {/* 5–6. Why prose, then the broken-state mockup beside it. */}
            <Section id="why" title="Why It Matters">
              <WhyProse text={explainer.why} />
              {explainer.whyMockup && (
                <div className="mt-6">
                  {renderMockup(explainer.whyMockup, 'before')}
                  <p className="mt-2 text-xs text-muted">
                    Coloured rows show the configuration AdLint flags.
                  </p>
                </div>
              )}
            </Section>

            {/* 8–9. Fix steps as cards, then the corrected-state mockup. */}
            <Section id="fix" title="How To Fix It">
              <HowToFixSteps text={explainer.howToFix} />
              {explainer.fixMockup && (
                <div className="mt-6">
                  {renderMockup(explainer.fixMockup, 'after')}
                  <p className="mt-2 text-xs text-muted">
                    Green rows show the corrected state after the fix.
                  </p>
                </div>
              )}
            </Section>

            {/* F8: Example block gets a header and a copy button. */}
            {explainer.example && (
              <Section id="example" title="Example">
                <figure className="overflow-hidden rounded-md border border-border bg-surface-2">
                  <header className="flex items-center justify-between border-b border-border bg-surface-2/80 px-3 py-1.5">
                    <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted">
                      Configuration
                    </span>
                    <CopyButton text={explainer.example} label="Copy" />
                  </header>
                  <pre className="overflow-x-auto p-4 text-sm leading-6 text-ink">
                    <code>{explainer.example}</code>
                  </pre>
                </figure>
              </Section>
            )}

            {/* F2: Citation block as a deliverable card, not a quote.
                The page's actual differentiator. Dashed accent border,
                explicit "FOR YOUR CLIENT REPORT" label, copy button. */}
            {explainer.citationTemplate && (
              <Section id="cite" title="For Your Client Report" variant="callout">
                <div className="rounded-md border-2 border-dashed border-accent/40 bg-accent/[0.03] p-5">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-accent">
                      For Your Client Report
                    </span>
                    <CopyButton text={explainer.citationTemplate} label="Copy citation" />
                  </div>
                  <p className="text-sm leading-7 text-ink">
                    <InlineProse text={explainer.citationTemplate} />
                  </p>
                  <p className="mt-3 border-t border-accent/15 pt-3 text-xs leading-relaxed text-muted">
                    Drop this paragraph into your client deliverable. Sources back to the
                    canonical platform documentation linked below.
                  </p>
                </div>
              </Section>
            )}

            {/* F6: References as a numbered, smaller, two-column list. Reads
                like footnotes, not a docs page. */}
            {explainer.references && explainer.references.length > 0 && (
              <Section id="references" title="References" variant="reference">
                <ol className="grid gap-2 md:grid-cols-2">
                  {explainer.references.map((ref, i) => (
                    <li key={ref.url} className="flex gap-2">
                      <span className="font-mono text-xs leading-6 text-muted">[{i + 1}]</span>
                      <a
                        href={ref.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs leading-6 text-accent transition-colors hover:text-accent-hover hover:underline"
                      >
                        {ref.label}
                      </a>
                    </li>
                  ))}
                </ol>
              </Section>
            )}

            {/* 12. Related checks as a row of compact cards. */}
            {related.length > 0 && (
              <Section id="related" title="Related Checks" variant="reference">
                <RelatedChecksRow checks={related} />
              </Section>
            )}

            {/* 13. Closing banner CTA (UX_AUDIT CD-01). Points at the tool
                that runs this check. A mid-page repeat after "Why" is plan
                phase 5, deferred until scroll-depth data exists. */}
            <EditorialBannerCTA variant="check" source={explainer.source} />
          </div>
        </article>

        {/* F12: sticky TOC at lg+ widths only. */}
        <PageTOC entries={tocEntries} />
      </div>

      <footer className="border-t border-border py-6">
        <div className="container mx-auto px-4 text-center text-xs text-muted">
          AdLint &mdash; 100% private. All processing happens in your browser.
        </div>
      </footer>
    </main>
  );
}
