import type { Metadata } from 'next';
import Link from 'next/link';

const siteUrl = 'https://adlint.dev';
const authorName = 'Christopher Landaverde';
const authorInitials = 'CL';

export const metadata: Metadata = {
  title: `About ${authorName} — Creator of AdLint`,
  description:
    'Christopher Landaverde is an ad-tech tracking specialist and the creator of AdLint, the privacy-respecting audit suite that runs 178 checks across GTM, Google Ads, Meta, TikTok, LinkedIn, Pinterest, Twitter/X, and Snapchat.',
  openGraph: {
    title: `About ${authorName}`,
    description: 'Creator of AdLint. Ad-tech tracking specialist.',
    type: 'profile',
    url: `${siteUrl}/about`,
  },
};

// Person schema gives LLMs a stable entity to anchor any mention of
// "Christopher Landaverde" against (rather than disambiguating to a
// different person with the same name). sameAs links to GitHub for
// cross-corroboration.
const personSchema = {
  '@context': 'https://schema.org',
  '@type': 'Person',
  '@id': `${siteUrl}/about#person`,
  name: authorName,
  url: `${siteUrl}/about`,
  jobTitle: 'Creator of AdLint, Ad-tech tracking specialist',
  description:
    'Creator of AdLint, the privacy-respecting ad-tracking audit suite. Specialises in Google Tag Manager, Google Ads, and pixel-platform measurement implementations.',
  worksFor: { '@id': `${siteUrl}/#organization` },
  knowsAbout: [
    'Google Tag Manager',
    'Google Ads conversion tracking',
    'Meta Pixel',
    'TikTok Pixel',
    'LinkedIn Insight Tag',
    'Pinterest Tag',
    'Snap Pixel',
    'X/Twitter Pixel',
    'Conversions API',
    'Enhanced Conversions',
    'Smart Bidding',
    'Consent Mode v2',
    'GDPR ad-tech compliance',
  ],
  sameAs: ['https://github.com/ChristopherLandaverde'],
};

const breadcrumbSchema = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'AdLint', item: siteUrl },
    { '@type': 'ListItem', position: 2, name: 'About', item: `${siteUrl}/about` },
  ],
};

export default function AboutPage() {
  return (
    <main className="flex min-h-screen flex-col bg-bg">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(personSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />

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

      <article className="container mx-auto max-w-2xl flex-1 px-4 py-16">
        <div className="mb-10 flex items-center gap-5">
          <div className="flex size-16 shrink-0 items-center justify-center rounded-full bg-accent text-xl font-bold text-white">
            {authorInitials}
          </div>
          <div>
            <h1 className="font-display text-3xl font-semibold text-ink sm:text-4xl">
              {authorName}
            </h1>
            <p className="mt-1 text-sm text-muted">
              Creator of AdLint · Ad-tech tracking specialist
            </p>
          </div>
        </div>

        <div className="space-y-5 text-base leading-7 text-muted">
          <p>
            I built AdLint because the way agencies were auditing client tracking was broken.
            Either you pasted the client&apos;s GTM container or their Google Ads conversion CSV
            into ChatGPT (which is a data-handling problem nobody wants to defend in writing),
            or you spent four hours clicking through the platform UIs yourself. Both options
            leave you with findings you can&apos;t cite without rewriting.
          </p>
          <p>
            AdLint runs the audit in your browser. Nothing uploads. Nothing logs. The findings
            are sourced back to the canonical platform documentation so the agency can defend
            them to the client without hedging. The citation paragraph on each finding page is
            written to drop into a deliverable verbatim.
          </p>
          <p>
            I focus on ad-tech tracking implementations: GTM container architecture, Google Ads
            conversion configuration, Smart Bidding signal hygiene, cross-source consistency,
            and pixel implementations across Meta, TikTok, LinkedIn, Pinterest, X, and Snap.
            Every check in AdLint is something I have seen go wrong on a real account, often
            more than once.
          </p>
        </div>

        <section className="mt-12 rounded-md border border-border bg-surface p-6">
          <h2 className="mb-3 font-display text-base font-semibold text-ink">
            About AdLint
          </h2>
          <ul className="space-y-2 text-sm leading-7 text-muted">
            <li>
              <strong className="text-ink">178 checks</strong> across 10 sources (GTM, Google Ads,
              Performance Reports, Cross-Source, Meta, TikTok, LinkedIn, Pinterest, X/Twitter,
              Snapchat).
            </li>
            <li>
              <strong className="text-ink">100% client-side.</strong> Nothing is uploaded.
              The audit engine is a static JavaScript bundle. No backend, no account, no logging
              of audited data.
            </li>
            <li>
              <strong className="text-ink">Free.</strong> No tier, no paywall.
            </li>
            <li>
              <strong className="text-ink">Open source.</strong> The check engine and editorial
              content live in the public{' '}
              <a
                href="https://github.com/ChristopherLandaverde/adlinter"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-accent hover:text-accent-hover hover:underline"
              >
                ChristopherLandaverde/adlinter
              </a>{' '}
              repo.
            </li>
          </ul>
        </section>

        <section className="mt-8">
          <h2 className="mb-3 font-display text-base font-semibold text-ink">Elsewhere</h2>
          <ul className="space-y-2 text-sm leading-7 text-muted">
            <li>
              GitHub:{' '}
              <a
                href="https://github.com/ChristopherLandaverde"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-accent hover:text-accent-hover hover:underline"
              >
                @ChristopherLandaverde
              </a>
            </li>
          </ul>
        </section>

        <section className="mt-12 rounded-md border border-border bg-surface p-6">
          <p className="mb-2 font-display text-base font-semibold text-ink">
            Run a free audit
          </p>
          <p className="mb-4 text-sm leading-relaxed text-muted">
            Pick a source. Upload nothing. Get a citation-ready audit in seconds.
          </p>
          <Link
            href="/"
            className="inline-flex items-center rounded-sm bg-accent px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
          >
            Open AdLint
          </Link>
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
