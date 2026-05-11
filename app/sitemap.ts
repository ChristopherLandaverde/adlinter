import type { MetadataRoute } from 'next';
import { explainers } from '@/lib/checks/explainers';
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
    ...explainers.map((explainer) => ({
      url: `${siteUrl}/checks/${explainer.id}`,
      lastModified,
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    })),
  ];
}
