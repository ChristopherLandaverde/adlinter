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

// Some explainers write howToFix as "1. step. 2. step. 3. step." in a single
// string. Render those as a real <ol>. Falls back to <p> for prose paragraphs.
// Match a leading "1." plus subsequent " N." (or "\nN.") to detect a list.
function parseNumberedList(text: string): string[] | null {
  const trimmed = text.trim();
  if (!/^1\.\s/.test(trimmed)) return null;
  const parts = trimmed.split(/\s+(?=\d+\.\s)/);
  if (parts.length < 2) return null;
  return parts.map((p) => p.replace(/^\d+\.\s*/, '').trim()).filter(Boolean);
}

function ProseOrList({ text, listClassName = '' }: { text: string; listClassName?: string }) {
  const list = parseNumberedList(text);
  if (list) {
    return (
      <ol className={`list-decimal space-y-2 pl-6 marker:font-mono marker:text-xs marker:text-muted ${listClassName}`}>
        {list.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ol>
    );
  }
  // Preserve any embedded paragraph breaks (\n\n) and single newlines.
  return <p className="whitespace-pre-line">{text}</p>;
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
        <h2 className="mb-3 font-display text-xs font-semibold uppercase tracking-wider text-muted">
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
          <div className="mb-8">
            {/* F9: smaller, quieter category chips. They whisper context, not shout.
                Source chip now links up to the category landing page (internal-link signal). */}
            <div className="mb-5 flex flex-wrap items-center gap-2">
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted">
                {sourceIcon[explainer.source]}
              </span>
              <span className="text-[11px] font-medium text-muted">·</span>
              <Link
                href={`/sources/${explainer.source}`}
                className="text-[11px] font-medium text-muted underline-offset-2 hover:text-ink hover:underline"
              >
                {getSourceLabel(explainer.source)}
              </Link>
              <span className="text-[11px] font-medium text-muted">·</span>
              <span
                className={`rounded-sm px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${severityStyles[explainer.severity]}`}
              >
                {explainer.severity}
              </span>
              {isStub && (
                <span className="rounded-sm border border-dashed border-border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted">
                  Reference stub
                </span>
              )}
            </div>

            <h1 className="mb-5 font-display text-3xl font-semibold leading-tight text-ink sm:text-4xl">
              {explainer.name}
            </h1>

            {/* F4: Direct answer gets lead-paragraph treatment. Larger, slightly
                heavier, with an accent left rule. The page should make the first
                paragraph feel like the lede of an article, not just body text. */}
            <p className="border-l-2 border-l-accent/60 pl-4 text-lg font-medium leading-8 text-ink sm:text-xl sm:leading-9">
              {explainer.directAnswer ?? explainer.summary}
            </p>

            {/* F7: avatar + byline. Small monogram circle gives the page
                an author identity instead of a flat text strip. */}
            <div className="mt-6 flex flex-wrap items-center gap-3 text-xs text-muted">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent text-[11px] font-bold text-white">
                {authorInitials}
              </div>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <span>
                  By <span className="font-medium text-ink">{authorName}</span>
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
          </div>

          <div className="space-y-8">
            <Section id="why" title="Why It Matters">
              <ProseOrList text={explainer.why} />
              {/* F5: Before/After indicator differentiates the two mockups. */}
              {explainer.whyMockup && renderMockup(explainer.whyMockup, 'before')}
              {/* F13: legend explaining color semantics in the mockup. */}
              {explainer.whyMockup && (
                <p className="mt-2 text-xs text-muted">
                  Coloured rows show the configuration AdLint flags.
                </p>
              )}
            </Section>

            <Section id="fix" title="How To Fix It">
              <ProseOrList text={explainer.howToFix} />
              {explainer.fixMockup && renderMockup(explainer.fixMockup, 'after')}
              {explainer.fixMockup && (
                <p className="mt-2 text-xs text-muted">
                  Green rows show the corrected state after the fix.
                </p>
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
                  <p className="text-sm leading-7 text-ink">{explainer.citationTemplate}</p>
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

            {related.length > 0 && (
              <Section id="related" title="Related Checks" variant="reference">
                <ul className="grid gap-2 md:grid-cols-2">
                  {related.map((relatedExplainer) => (
                    <li key={relatedExplainer.id}>
                      <Link
                        href={`/checks/${relatedExplainer.id}`}
                        className="text-xs leading-6 text-accent transition-colors hover:text-accent-hover hover:underline"
                      >
                        {relatedExplainer.name}
                        {relatedExplainer.status === 'stub' && (
                          <span className="ml-1 text-[10px] font-normal text-muted">(stub)</span>
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            {/* F11: closing CTA. After 1500 words of editorial, the reader is
                now informed. Give them a path forward. */}
            <section className="mt-12 rounded-md border border-border bg-surface p-6">
              <p className="mb-2 font-display text-base font-semibold text-ink">
                Audit your own files for this check
              </p>
              <p className="mb-4 text-sm leading-relaxed text-muted">
                AdLint runs this check (and 177 others) against your GTM, Google Ads,
                Meta, TikTok, LinkedIn, Pinterest, Twitter/X, and Snapchat exports.
                Everything stays in your browser. No uploads, no accounts.
              </p>
              <Link
                href="/"
                className="inline-flex items-center rounded-sm bg-accent px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
              >
                Run a free audit
              </Link>
            </section>
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
