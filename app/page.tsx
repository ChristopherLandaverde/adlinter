'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AuditHistoryLink } from '@/components/AuditHistoryLink';
import { getToolIcon } from '@/components/icons';
import { tools, categories, type ToolConfig, type ToolCategory } from '@/lib/tools';

const siteUrl = 'https://adlint.dev';
const authorName = 'Christopher Landaverde';

// SoftwareApplication is the canonical Schema.org type for browser-based
// utility apps, and is what Google, Bing, and LLM crawlers map to "tool"
// entities in their knowledge graphs. WebApplication is a sub-type but
// less specific; we promote to SoftwareApplication and keep the audit
// suite enumerated as featureList for AEO grounding.
const softwareSchema = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  '@id': `${siteUrl}/#software`,
  name: 'AdLint',
  url: siteUrl,
  applicationCategory: 'BusinessApplication',
  applicationSubCategory: 'Ad-tech tracking audit tool',
  operatingSystem: 'Web Browser',
  description:
    'Privacy-respecting ad-tracking auditor. Audits Google Tag Manager containers, Google Ads accounts, Performance reports, and pixel exports from Meta, TikTok, LinkedIn, Pinterest, Twitter/X, and Snapchat. 178 checks across 10 sources. 100% client-side: nothing is uploaded.',
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD', availability: 'https://schema.org/InStock' },
  featureList: [
    'Google Tag Manager Container Auditor (29 checks)',
    'Google Ads Linter (34 checks)',
    'Performance Report Analyzer (30 checks)',
    'Full-Stack Audit (all Google sources + cross-source consistency)',
    'Meta Pixel Auditor (10 checks)',
    'TikTok Pixel Auditor (10 checks)',
    'LinkedIn Insight Tag Auditor (10 checks)',
    'Pinterest Tag Auditor (10 checks)',
    'Twitter/X Pixel Auditor (10 checks)',
    'Snapchat Pixel Auditor (10 checks)',
    'Tracking Health Score (0-100)',
    'Audit history with diff view',
    'Per-finding citation templates for client deliverables',
  ],
  browserRequirements: 'Requires JavaScript. Modern browser.',
  inLanguage: 'en',
  isAccessibleForFree: true,
  author: { '@type': 'Person', name: authorName, url: siteUrl },
  publisher: { '@type': 'Organization', name: 'AdLint', url: siteUrl },
  sameAs: ['https://github.com/ChristopherLandaverde/adlinter'],
};

// Organization schema gives LLMs a stable entity to anchor mentions of
// "AdLint" against (rather than falling back to disambiguation guesses).
const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  '@id': `${siteUrl}/#organization`,
  name: 'AdLint',
  url: siteUrl,
  logo: `${siteUrl}/icon.svg`,
  description:
    'Privacy-respecting ad-tracking audit suite for agencies and freelancers. Trusted reference for findings cited in client deliverables.',
  foundingDate: '2025-09',
  founder: { '@type': 'Person', name: authorName },
  sameAs: ['https://github.com/ChristopherLandaverde/adlinter'],
};

// WebSite schema with the search action enables the "sitelinks search box"
// in Google results AND gives LLMs a structured way to express that the
// /checks reference is searchable.
const websiteWithSearchSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  '@id': `${siteUrl}/#website`,
  name: 'AdLint',
  url: siteUrl,
  publisher: { '@id': `${siteUrl}/#organization` },
  potentialAction: {
    '@type': 'SearchAction',
    target: `${siteUrl}/checks?q={search_term_string}`,
    'query-input': 'required name=search_term_string',
  },
};

const homepageSchemas = [softwareSchema, organizationSchema, websiteWithSearchSchema];

function ToolCard({ tool }: { tool: ToolConfig }) {
  const Icon = getToolIcon(tool.iconName);

  const card = (
    <div
      className={`group relative rounded-md border border-border bg-surface p-6 transition-colors ${
        tool.enabled
          ? 'cursor-pointer hover:border-ink/20'
          : 'opacity-60 cursor-default'
      }`}
    >
      <div className="flex h-full flex-col">
        <div className="mb-5 flex items-start justify-between gap-4">
          <Icon className="h-6 w-6 text-ink" />
          {!tool.enabled && (
            <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs font-medium text-muted">
              Coming Soon
            </span>
          )}
          {tool.enabled && tool.checkCount > 0 && (
            <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs font-medium text-muted">
              {tool.checkCount} checks
            </span>
          )}
        </div>

        <h3 className="mb-2 font-display text-lg font-semibold text-ink">{tool.name}</h3>
        <p className="mb-5 line-clamp-2 text-sm leading-6 text-muted">{tool.description}</p>

        {tool.enabled && (
          <div className="mt-auto flex items-center text-sm font-medium text-muted transition-colors group-hover:text-ink">
            Open tool
            <span className="ml-1 group-hover:translate-x-1 transition-transform" aria-hidden="true">
              &rarr;
            </span>
          </div>
        )}
      </div>
    </div>
  );

  if (!tool.enabled) return card;

  return (
    <Link href={`/tools/${tool.slug}`} className="block">
      {card}
    </Link>
  );
}

export default function Home() {
  const [filter, setFilter] = useState<'all' | ToolCategory>('all');

  const filtered = filter === 'all' ? tools : tools.filter((t) => t.category === filter);

  return (
    <main className="min-h-screen bg-bg">
      {homepageSchemas.map((schema, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}

      {/* Header */}
      <header className="border-b border-border bg-surface/85 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <Link href="/" className="font-display text-2xl font-semibold text-accent transition-colors hover:text-accent-hover">
            AdLint
          </Link>
          <div className="flex items-center gap-4">
            <AuditHistoryLink />
            <Link
              href="/checks"
              className="inline-flex items-center gap-2 rounded-sm px-3 py-1.5 text-sm font-medium text-muted transition-colors hover:bg-surface-2 hover:text-ink"
            >
              Check reference
            </Link>
            <p className="hidden text-sm text-muted sm:block">
              Ad Tracking Audit Tools
            </p>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="container mx-auto px-4 pt-20 pb-14 text-center">
        <h1 className="mx-auto mb-5 max-w-4xl text-balance font-display text-4xl font-semibold leading-tight text-ink sm:text-5xl">
          Find what&apos;s actually broken in your tracking.
        </h1>
        <p className="mx-auto mb-8 max-w-3xl text-lg leading-8 text-muted">
          Audit GTM, Google Ads, Meta Pixel, TikTok Pixel, LinkedIn Insight Tag, Pinterest Tag, Twitter/X Pixel, Snapchat Pixel, and performance reports in 60 seconds. Everything runs in your browser &mdash; your data never leaves your machine.
        </p>
        <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/tools/full-audit"
            className="inline-flex h-10 items-center justify-center rounded-sm bg-accent px-5 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
          >
            Try with sample data &rarr;
          </Link>
          <a
            href="#tools"
            className="inline-flex h-10 items-center justify-center rounded-sm border border-border bg-surface px-5 text-sm font-medium text-ink transition-colors hover:border-ink/20"
          >
            Browse tools ↓
          </a>
        </div>
      </section>

      <section id="tools" className="scroll-mt-6">
        {/* Filter Pills */}
        <div className="container mx-auto mb-8 max-w-4xl px-4">
          <div className="flex flex-wrap justify-center gap-2">
            {categories.map((cat) => (
              <button
                key={cat.key}
                onClick={() => setFilter(cat.key as 'all' | ToolCategory)}
                className={`rounded-sm px-3 py-1.5 text-sm font-medium transition-colors cursor-pointer ${
                  filter === cat.key
                    ? 'bg-accent text-white'
                    : 'border border-border bg-surface text-muted hover:text-ink'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tool Grid */}
        <div className="container mx-auto max-w-5xl px-4 pb-16">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((tool) => (
              <ToolCard key={tool.slug} tool={tool} />
            ))}
          </div>

          {filtered.length === 0 && (
            <p className="text-center text-gray-400 py-12">
              No tools in this category yet.
            </p>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-6">
        <div className="container mx-auto px-4 text-center text-xs text-muted">
          AdLint &mdash; Free auditors for GTM, Google Ads, Meta Pixel, TikTok Pixel, and LinkedIn. All processing happens in your browser.
        </div>
      </footer>
    </main>
  );
}
