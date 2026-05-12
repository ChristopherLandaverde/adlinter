import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ToolWorkspace } from '@/components/ToolWorkspace';
import { getToolBySlug, tools } from '@/lib/tools';

type PageProps = {
  params: Promise<{ slug: string }>;
};

const siteUrl = 'https://adlint.dev';
const authorName = 'Christopher Landaverde';

// Each tool slug maps to a /sources/<key> category page for AEO grounding
// (lets Schema.org isPartOf point at the source landing page).
const toolToSourceKey: Record<string, string> = {
  'gtm-auditor': 'gtm',
  'google-ads-linter': 'ads',
  'performance-report-analyzer': 'report',
  'full-audit': 'cross',
  'meta-auditor': 'meta',
  'tiktok-auditor': 'tiktok',
  'linkedin-auditor': 'linkedin',
  'pinterest-auditor': 'pinterest',
  'twitter-auditor': 'twitter',
  'snapchat-auditor': 'snapchat',
};

export function generateStaticParams() {
  return tools.filter((t) => t.enabled).map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const tool = getToolBySlug(slug);

  if (!tool || !tool.enabled) {
    return { title: 'Page not found' };
  }

  return {
    title: tool.name,
    description: tool.description,
    openGraph: {
      title: `${tool.name} | AdLint`,
      description: tool.description,
      type: 'website',
      url: `${siteUrl}/tools/${slug}`,
    },
    twitter: {
      card: 'summary_large_image',
      title: tool.name,
      description: tool.description,
    },
  };
}

export default async function Page({ params }: PageProps) {
  const { slug } = await params;
  const tool = getToolBySlug(slug);

  if (!tool || !tool.enabled) {
    notFound();
  }

  const sourceKey = toolToSourceKey[slug];
  const toolUrl = `${siteUrl}/tools/${slug}`;

  // Per-tool SoftwareApplication schema. Each tool is its own entity
  // in the knowledge graph so LLMs can map specific queries
  // ("Google Tag Manager auditor") to specific tools.
  const toolSchema = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    '@id': `${toolUrl}#software`,
    name: tool.name,
    url: toolUrl,
    applicationCategory: 'BusinessApplication',
    applicationSubCategory: 'Ad-tech tracking audit tool',
    operatingSystem: 'Web Browser',
    description: `${tool.description} Runs ${tool.checkCount} checks. 100% client-side — nothing is uploaded.`,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD', availability: 'https://schema.org/InStock' },
    isAccessibleForFree: true,
    browserRequirements: 'Requires JavaScript. Modern browser.',
    inLanguage: 'en',
    isPartOf: { '@id': `${siteUrl}/#software` },
    author: { '@type': 'Person', '@id': `${siteUrl}/about#person`, name: authorName, url: `${siteUrl}/about` },
    publisher: { '@id': `${siteUrl}/#organization` },
    ...(sourceKey ? { about: { '@id': `${siteUrl}/sources/${sourceKey}#collection` } } : {}),
  };

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'AdLint', item: siteUrl },
      { '@type': 'ListItem', position: 2, name: 'Tools', item: siteUrl },
      { '@type': 'ListItem', position: 3, name: tool.name, item: toolUrl },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(toolSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <ToolWorkspace tool={tool} />
    </>
  );
}
