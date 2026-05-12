import type { MetadataRoute } from 'next';
import { explainerSources, hasFullExplainer } from '@/lib/checks/explainers';
import { checkRegistry } from '@/lib/checks/registry.generated';
import { tools } from '@/lib/tools';

const siteUrl = 'https://adlint.dev';

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return [
    {
      url: `${siteUrl}/`,
      lastModified,
      changeFrequency: 'weekly',
      priority: 1.0,
    },
    {
      url: `${siteUrl}/about`,
      lastModified,
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    },
    ...tools
      .filter((tool) => tool.enabled)
      .map((tool) => ({
        url: `${siteUrl}/tools/${tool.slug}`,
        lastModified,
        changeFrequency: 'monthly' as const,
        priority: 0.8,
      })),
    {
      url: `${siteUrl}/checks`,
      lastModified,
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    },
    // Category landing pages, one per source. These target category-level
    // search queries (e.g. "GTM audit checklist") and are the connective
    // tissue between /checks and the individual /checks/<id> entries.
    ...explainerSources.map((source) => ({
      url: `${siteUrl}/sources/${source.key}`,
      lastModified,
      changeFrequency: 'monthly' as const,
      priority: 0.75,
    })),
    // Full editorial explainers get higher priority; stubs are still
    // indexable but signal lower depth to crawlers.
    ...checkRegistry.map((entry) => ({
      url: `${siteUrl}/checks/${entry.id}`,
      lastModified,
      changeFrequency: 'monthly' as const,
      priority: hasFullExplainer(entry.id) ? 0.6 : 0.4,
    })),
  ];
}
