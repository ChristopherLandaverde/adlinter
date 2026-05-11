export type ToolCategory = 'gtm' | 'google-ads' | 'meta' | 'tiktok';

export interface ToolFileSlot {
  key: string;               // sessionStorage key
  label: string;
  accept: string;
  required: boolean;
  parser: 'gtm' | 'ads' | 'report' | 'meta' | 'tiktok';
}

export interface ToolConfig {
  slug: string;
  name: string;
  description: string;
  icon: string;
  category: ToolCategory;
  enabled: boolean;
  checkCount: number;
  color: string;             // Tailwind color prefix (e.g. "blue", "emerald")
  fileSlots: ToolFileSlot[];
}

export const tools: ToolConfig[] = [
  {
    slug: 'gtm-auditor',
    name: 'GTM Container Auditor',
    description: 'Audit your Google Tag Manager setup for misconfigurations, missing tags, and consent issues.',
    icon: '🏷️',
    category: 'gtm',
    enabled: true,
    checkCount: 30,
    color: 'blue',
    fileSlots: [
      { key: 'gtmData', label: 'GTM Container JSON', accept: '.json', required: true, parser: 'gtm' },
    ],
  },
  {
    slug: 'google-ads-linter',
    name: 'Google Ads Linter',
    description: 'Check your Google Ads conversion actions for duplicates, wrong values, and attribution issues.',
    icon: '💰',
    category: 'google-ads',
    enabled: true,
    checkCount: 27,
    color: 'emerald',
    fileSlots: [
      { key: 'adsData', label: 'Google Ads Conversions CSV', accept: '.csv', required: true, parser: 'ads' },
    ],
  },
  {
    slug: 'performance-analyzer',
    name: 'Performance Report Analyzer',
    description: 'Analyze conversion performance data for anomalies, ROAS issues, and attribution drift.',
    icon: '📈',
    category: 'google-ads',
    enabled: true,
    checkCount: 11,
    color: 'violet',
    fileSlots: [
      { key: 'reportData', label: 'Performance Report (CSV or JSON)', accept: '.csv,.json', required: true, parser: 'report' },
    ],
  },
  {
    slug: 'full-audit',
    name: 'Full-Stack Audit',
    description: 'Run all checks across GTM, Google Ads, and performance data with cross-source analysis.',
    icon: '🔍',
    category: 'gtm',
    enabled: true,
    checkCount: 82,
    color: 'amber',
    fileSlots: [
      { key: 'gtmData', label: 'GTM Container JSON', accept: '.json', required: true, parser: 'gtm' },
      { key: 'adsData', label: 'Google Ads Conversions CSV', accept: '.csv', required: true, parser: 'ads' },
      { key: 'reportData', label: 'Performance Report (CSV or JSON)', accept: '.csv,.json', required: false, parser: 'report' },
    ],
  },
  {
    slug: 'meta-auditor',
    name: 'Meta Pixel Auditor',
    description: 'Audit your Meta Pixel events for misconfigurations, missing conversions, and optimization issues.',
    icon: '📘',
    category: 'meta',
    enabled: true,
    checkCount: 10,
    color: 'sky',
    fileSlots: [
      { key: 'metaData', label: 'Meta Events Export (CSV or JSON)', accept: '.csv,.json', required: true, parser: 'meta' },
    ],
  },
  {
    slug: 'tiktok-auditor',
    name: 'TikTok Pixel Auditor',
    description: 'Audit your TikTok Pixel setup for event mismatches and missing parameters.',
    icon: '🎵',
    category: 'tiktok',
    enabled: true,
    checkCount: 10,
    color: 'pink',
    fileSlots: [
      { key: 'tiktokData', label: 'TikTok Events Export (CSV or JSON)', accept: '.csv,.json', required: true, parser: 'tiktok' },
    ],
  },
];

export function getToolBySlug(slug: string): ToolConfig | undefined {
  return tools.find((t) => t.slug === slug);
}

export const categories = [
  { key: 'all', label: 'All' },
  { key: 'gtm', label: 'Google Tag Manager' },
  { key: 'google-ads', label: 'Google Ads' },
  { key: 'meta', label: 'Meta' },
  { key: 'tiktok', label: 'TikTok' },
] as const;
