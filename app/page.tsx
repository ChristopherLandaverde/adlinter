'use client';

import { FormEvent, KeyboardEvent, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AuditHistoryLink } from '@/components/AuditHistoryLink';
import { getToolIcon } from '@/components/icons';
import { tools, type ToolConfig } from '@/lib/tools';

const siteUrl = 'https://adlint.dev';
const authorName = 'Christopher Landaverde';

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
    'Google Ads Performance Report (30 checks)',
    'Google Full-Stack Audit (all Google sources + cross-source consistency)',
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
  author: { '@type': 'Person', '@id': `${siteUrl}/about#person`, name: authorName, url: `${siteUrl}/about` },
  publisher: { '@type': 'Organization', name: 'AdLint', url: siteUrl },
  sameAs: ['https://github.com/ChristopherLandaverde/adlinter'],
};

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
  founder: { '@type': 'Person', '@id': `${siteUrl}/about#person`, name: authorName, url: `${siteUrl}/about` },
  sameAs: ['https://github.com/ChristopherLandaverde/adlinter'],
};

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

// Curated example prompts — each routes to a real destination.
const suggestedPrompts: { label: string; href: string }[] = [
  { label: 'Audit my GTM container', href: '/tools/gtm-auditor' },
  { label: 'Check Google Ads conversions', href: '/tools/google-ads-linter' },
  { label: 'Run a full Google audit', href: '/tools/full-audit' },
  { label: 'Why is my ROAS off?', href: '/checks?q=ROAS' },
];

// Brand aliases so "google" matches GTM + Ads, "x" matches Twitter, etc.
const toolAliases: Record<string, string[]> = {
  'gtm-auditor': ['google', 'tag manager', 'gtm', 'container'],
  'google-ads-linter': ['google', 'ads', 'adwords', 'conversion'],
  'performance-analyzer': ['report', 'performance', 'roas'],
  'full-audit': ['full', 'stack', 'all', 'cross', 'everything'],
  'meta-auditor': ['meta', 'facebook', 'fb', 'pixel', 'instagram'],
  'tiktok-auditor': ['tiktok', 'tt', 'bytedance'],
  'linkedin-auditor': ['linkedin', 'insight', 'b2b'],
  'pinterest-auditor': ['pinterest', 'pin'],
  'twitter-auditor': ['twitter', 'x', 'tweet'],
  'snapchat-auditor': ['snap', 'snapchat'],
};

function matchTool(tool: ToolConfig, q: string): boolean {
  if (!q) return true;
  const needle = q.toLowerCase();
  if (tool.name.toLowerCase().includes(needle)) return true;
  if (tool.description?.toLowerCase().includes(needle)) return true;
  const aliases = toolAliases[tool.slug] ?? [];
  return aliases.some((a) => a.includes(needle) || needle.includes(a));
}

export default function Home() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const enabledTools = useMemo(() => tools.filter((t) => t.enabled), []);

  const matches = useMemo(
    () => enabledTools.filter((t) => matchTool(t, query.trim())),
    [enabledTools, query],
  );

  // Reset highlight whenever the result set changes.
  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  // Close on outside click.
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(e.target as Node)) setIsOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  function goToActive() {
    const q = query.trim();
    if (matches.length > 0) {
      const target = matches[Math.min(activeIndex, matches.length - 1)];
      router.push(`/tools/${target.slug}`);
      return;
    }
    // No tool match — fall through to the check reference search.
    router.push(q ? `/checks?q=${encodeURIComponent(q)}` : '/checks');
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    goToActive();
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setIsOpen(true);
      setActiveIndex((i) => Math.min(i + 1, Math.max(matches.length - 1, 0)));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  }

  const showDropdown = isOpen && (matches.length > 0 || query.trim().length > 0);

  return (
    <main className="relative flex min-h-screen flex-col bg-bg">
      {homepageSchemas.map((schema, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}

      {/* Minimal corner links — no top nav bar. */}
      <div className="absolute right-4 top-4 z-10 flex items-center gap-4 text-sm text-muted">
        <AuditHistoryLink />
        <Link
          href="/checks"
          className="transition-colors hover:text-ink"
        >
          Check reference
        </Link>
      </div>

      <section className="flex flex-1 items-center justify-center px-4 py-16 sm:py-24">
        <div className="w-full max-w-2xl">
          <div className="mb-10 text-center">
            <p className="mb-4 font-display text-xl font-semibold tracking-tight text-accent sm:text-2xl">
              AdLint
            </p>
            <h1 className="text-balance font-display text-4xl font-semibold leading-tight text-ink sm:text-5xl">
              Find what&apos;s actually broken in your tracking.
            </h1>
          </div>

          <div ref={wrapperRef} className="relative">
            <form
              onSubmit={handleSubmit}
              role="search"
              aria-label="Search tools and audit findings"
            >
              <label htmlFor="home-search" className="sr-only">
                What do you want to audit?
              </label>
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted"
              >
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
              <input
                ref={inputRef}
                id="home-search"
                type="search"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setIsOpen(true);
                }}
                onFocus={() => setIsOpen(true)}
                onKeyDown={handleKeyDown}
                placeholder="What do you want to audit?"
                autoComplete="off"
                role="combobox"
                aria-expanded={showDropdown}
                aria-controls="home-search-listbox"
                aria-autocomplete="list"
                aria-activedescendant={
                  showDropdown && matches.length > 0
                    ? `home-search-option-${matches[Math.min(activeIndex, matches.length - 1)].slug}`
                    : undefined
                }
                className="block w-full rounded-md border border-border bg-surface py-4 pl-12 pr-4 text-base text-ink shadow-sm transition-colors placeholder:text-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
              />
            </form>

            {showDropdown && (
              <div
                ref={dropdownRef}
                id="home-search-listbox"
                role="listbox"
                className="absolute left-0 right-0 top-full z-20 mt-2 max-h-96 overflow-y-auto rounded-md border border-border bg-surface shadow-lg"
              >
                {matches.length > 0 ? (
                  <ul className="py-2">
                    {matches.map((tool, i) => {
                      const Icon = getToolIcon(tool.iconName);
                      const isActive = i === Math.min(activeIndex, matches.length - 1);
                      return (
                        <li
                          key={tool.slug}
                          id={`home-search-option-${tool.slug}`}
                          role="option"
                          aria-selected={isActive}
                        >
                          <Link
                            href={`/tools/${tool.slug}`}
                            onMouseEnter={() => setActiveIndex(i)}
                            onClick={() => setIsOpen(false)}
                            className={`flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                              isActive ? 'bg-surface-2' : 'hover:bg-surface-2'
                            }`}
                          >
                            <Icon className="h-5 w-5 shrink-0 text-ink" />
                            <span className="flex-1 truncate text-sm font-medium text-ink">
                              {tool.name}
                            </span>
                            {tool.checkCount > 0 && (
                              <span className="shrink-0 text-xs text-muted">
                                {tool.checkCount} checks
                              </span>
                            )}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <div className="px-4 py-3 text-sm text-muted">
                    No tools match &ldquo;{query}&rdquo;.{' '}
                    <Link
                      href={`/checks?q=${encodeURIComponent(query.trim())}`}
                      className="text-accent hover:underline"
                      onClick={() => setIsOpen(false)}
                    >
                      Search 178 findings for &ldquo;{query.trim()}&rdquo;
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>

          <ul className="mt-6 flex flex-wrap justify-center gap-x-3 gap-y-2">
            {suggestedPrompts.map((p) => (
              <li key={p.label}>
                <Link
                  href={p.href}
                  className="inline-flex items-center rounded-full border border-border bg-surface px-3 py-1.5 text-sm text-muted transition-colors hover:border-ink/20 hover:text-ink"
                >
                  {p.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  );
}
