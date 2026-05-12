export type ToolCategory = 'gtm' | 'google-ads' | 'meta' | 'tiktok' | 'linkedin' | 'pinterest' | 'twitter' | 'snapchat';

export interface ToolFileSlot {
  key: string;               // sessionStorage key
  label: string;
  accept: string;
  required: boolean;
  parser: 'gtm' | 'ads' | 'report' | 'meta' | 'tiktok' | 'linkedin' | 'pinterest' | 'twitter' | 'snapchat';
}

export interface ToolSample {
  slotKey: string;            // matches a fileSlot key
  url: string;                // static URL served from public/
  filename: string;           // display name shown when loaded
}

export interface ToolConfig {
  slug: string;
  name: string;
  description: string;
  iconName: string;
  category: ToolCategory;
  enabled: boolean;
  checkCount: number;
  fileSlots: ToolFileSlot[];
  samples?: ToolSample[];
}

export const tools: ToolConfig[] = [
  {
    slug: 'gtm-auditor',
    name: 'GTM Container Auditor',
    description: 'Audit your Google Tag Manager setup for misconfigurations, missing tags, and consent issues.',
    iconName: 'Tag',
    category: 'gtm',
    enabled: true,
    checkCount: 30,
    fileSlots: [
      { key: 'gtmData', label: 'GTM Container JSON', accept: '.json', required: true, parser: 'gtm' },
    ],
    samples: [
      { slotKey: 'gtmData', url: '/samples/gtm-container-sample.json', filename: 'sample-container.json' },
    ],
  },
  {
    slug: 'google-ads-linter',
    name: 'Google Ads Linter',
    description: 'Check your Google Ads conversion actions for duplicates, wrong values, and attribution issues.',
    iconName: 'DollarSign',
    category: 'google-ads',
    enabled: true,
    checkCount: 27,
    fileSlots: [
      { key: 'adsData', label: 'Google Ads Conversions CSV', accept: '.csv', required: true, parser: 'ads' },
    ],
    samples: [
      { slotKey: 'adsData', url: '/samples/ads-conversions-sample.csv', filename: 'sample-conversions.csv' },
    ],
  },
  {
    slug: 'performance-analyzer',
    name: 'Performance Report Analyzer',
    description: 'Analyze conversion performance data for anomalies, ROAS issues, and attribution drift.',
    iconName: 'LineChart',
    category: 'google-ads',
    enabled: true,
    checkCount: 11,
    fileSlots: [
      { key: 'reportData', label: 'Performance Report (CSV or JSON)', accept: '.csv,.json', required: true, parser: 'report' },
    ],
    samples: [
      { slotKey: 'reportData', url: '/samples/performance-report-sample.json', filename: 'sample-report.json' },
    ],
  },
  {
    slug: 'full-audit',
    name: 'Full-Stack Audit',
    description: 'Run all checks across GTM, Google Ads, and performance data with cross-source analysis.',
    iconName: 'Search',
    category: 'gtm',
    enabled: true,
    checkCount: 82,
    fileSlots: [
      { key: 'gtmData', label: 'GTM Container JSON', accept: '.json', required: true, parser: 'gtm' },
      { key: 'adsData', label: 'Google Ads Conversions CSV', accept: '.csv', required: true, parser: 'ads' },
      { key: 'reportData', label: 'Performance Report (CSV or JSON)', accept: '.csv,.json', required: false, parser: 'report' },
    ],
    samples: [
      { slotKey: 'gtmData', url: '/samples/gtm-container-sample.json', filename: 'sample-container.json' },
      { slotKey: 'adsData', url: '/samples/ads-conversions-sample.csv', filename: 'sample-conversions.csv' },
      { slotKey: 'reportData', url: '/samples/performance-report-sample.json', filename: 'sample-report.json' },
    ],
  },
  {
    slug: 'meta-auditor',
    name: 'Meta Pixel Auditor',
    description: 'Audit your Meta Pixel events for misconfigurations, missing conversions, and optimization issues.',
    iconName: 'Facebook',
    category: 'meta',
    enabled: true,
    checkCount: 10,
    fileSlots: [
      { key: 'metaData', label: 'Meta Events Export (CSV or JSON)', accept: '.csv,.json', required: true, parser: 'meta' },
    ],
    samples: [
      { slotKey: 'metaData', url: '/samples/meta-events-sample.json', filename: 'sample-meta-events.json' },
    ],
  },
  {
    slug: 'tiktok-auditor',
    name: 'TikTok Pixel Auditor',
    description: 'Audit your TikTok Pixel setup for event mismatches and missing parameters.',
    iconName: 'Music2',
    category: 'tiktok',
    enabled: true,
    checkCount: 10,
    fileSlots: [
      { key: 'tiktokData', label: 'TikTok Events Export (CSV or JSON)', accept: '.csv,.json', required: true, parser: 'tiktok' },
    ],
    samples: [
      { slotKey: 'tiktokData', url: '/samples/tiktok-events-sample.json', filename: 'sample-tiktok-events.json' },
    ],
  },
  {
    slug: 'linkedin-auditor',
    name: 'LinkedIn Insight Tag Auditor',
    description: 'Audit your LinkedIn conversion actions for missing goals, dormant setup, and value issues.',
    iconName: 'Linkedin',
    category: 'linkedin',
    enabled: true,
    checkCount: 10,
    fileSlots: [
      { key: 'linkedinData', label: 'LinkedIn Conversions Export', accept: '.csv,.json', required: true, parser: 'linkedin' },
    ],
    samples: [
      { slotKey: 'linkedinData', url: '/samples/linkedin-conversions-sample.json', filename: 'sample-linkedin-conversions.json' },
    ],
  },
  {
    slug: 'pinterest-auditor',
    name: 'Pinterest Tag Auditor',
    description: 'Audit your Pinterest Tag events for missing conversions, value issues, and API parity gaps.',
    iconName: 'Bookmark',
    category: 'pinterest',
    enabled: true,
    checkCount: 10,
    fileSlots: [
      { key: 'pinterestData', label: 'Pinterest Events Export (CSV or JSON)', accept: '.csv,.json', required: true, parser: 'pinterest' },
    ],
    samples: [
      { slotKey: 'pinterestData', url: '/samples/pinterest-events-sample.json', filename: 'sample-pinterest-events.json' },
    ],
  },
  {
    slug: 'twitter-auditor',
    name: 'Twitter/X Pixel Auditor',
    description: 'Audit your Twitter/X website events for ID mismatches, deduplication gaps, and weak conversion setup.',
    iconName: 'Twitter',
    category: 'twitter',
    enabled: true,
    checkCount: 10,
    fileSlots: [
      { key: 'twitterData', label: 'Twitter/X Events Export (CSV or JSON)', accept: '.csv,.json', required: true, parser: 'twitter' },
    ],
    samples: [
      { slotKey: 'twitterData', url: '/samples/twitter-events-sample.json', filename: 'sample-twitter-events.json' },
    ],
  },
  {
    slug: 'snapchat-auditor',
    name: 'Snapchat Pixel Auditor',
    description: 'Audit your Snap Pixel events for missing standard events, CAPI alignment, and currency issues.',
    iconName: 'Camera',
    category: 'snapchat',
    enabled: true,
    checkCount: 10,
    fileSlots: [
      { key: 'snapchatData', label: 'Snapchat Events Export (CSV or JSON)', accept: '.csv,.json', required: true, parser: 'snapchat' },
    ],
    samples: [
      { slotKey: 'snapchatData', url: '/samples/snapchat-events-sample.json', filename: 'sample-snapchat-events.json' },
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
  { key: 'linkedin', label: 'LinkedIn' },
  { key: 'pinterest', label: 'Pinterest' },
  { key: 'twitter', label: 'Twitter/X' },
  { key: 'snapchat', label: 'Snapchat' },
] as const;
