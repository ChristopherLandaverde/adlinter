export type BlogPostStatus = 'published' | 'draft';
export type BlogPostType = 'AdLint update' | 'Google release' | 'Meta release' | 'Tracking guide';

export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  whyItMatters: string;
  publishedAt: string;
  updatedAt?: string;
  status: BlogPostStatus;
  type: BlogPostType;
  source: 'AdLint' | 'Google' | 'Meta' | 'TikTok' | 'LinkedIn' | 'Pinterest' | 'X/Twitter' | 'Snapchat';
  readingTime: string;
  tags: string[];
  affectedTools: string[];
  sourceLinks?: {
    label: string;
    href: string;
  }[];
  sections: {
    heading: string;
    body: string[];
  }[];
}

export const blogPosts: BlogPost[] = [
  {
    slug: 'backchannel-is-open',
    title: 'Backchannel is open',
    description:
      'AdLint now has a lightweight feed for product changes, platform releases, and tracking shifts that deserve more context than a changelog line.',
    whyItMatters:
      'When ad platforms ship measurement changes, agencies need the practical read: what changed, who is affected, and what to check before reporting drifts.',
    publishedAt: '2026-05-20',
    status: 'published',
    type: 'AdLint update',
    source: 'AdLint',
    readingTime: '2 min read',
    tags: ['Product', 'Release notes', 'Monitoring'],
    affectedTools: ['All auditors'],
    sections: [
      {
        heading: 'What changed',
        body: [
          'AdLint now has a dedicated feed called Backchannel. It is the place for meaningful product changes, new audit coverage, and platform release commentary that needs more context than a commit message.',
          'The format is intentionally tight. Each note should explain what changed, why it matters for tracking work, and what someone should check next.',
        ],
      },
      {
        heading: 'Why agencies should care',
        body: [
          'Most platform release notes are written for everyone and no one. A Google or Meta change might matter deeply to one tracking workflow and not at all to another. Backchannel gives AdLint a place to translate those changes into agency-facing implications.',
          'That matters because the real question is rarely "what shipped?" The useful question is "does this change what I need to audit, explain, or defend to a client?"',
        ],
      },
      {
        heading: 'What to check in AdLint',
        body: [
          'For AdLint product launches, use the note to point readers toward the tool or check family that changed. For external platform releases, tie the release back to the relevant auditor and the failure modes it can surface.',
          'When a feature like Ad Agents ships, the note should answer three questions: what it does, what changed for the user, and what a team should try first.',
        ],
      },
    ],
  },
];

export function getPublishedPosts() {
  return blogPosts
    .filter((post) => post.status === 'published')
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}

export function getPublishedPostBySlug(slug: string) {
  return getPublishedPosts().find((post) => post.slug === slug);
}

export function formatBlogDate(date: string) {
  return new Intl.DateTimeFormat('en', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${date}T00:00:00.000Z`));
}
