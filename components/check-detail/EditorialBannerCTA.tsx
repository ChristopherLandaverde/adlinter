import Link from 'next/link';
import type { ExplainerSource } from '@/lib/checks/explainers';
import { totalCheckCount } from '@/lib/checks/counts';

// The most specific tool that runs checks from each source. Cross-source
// checks need GTM + Ads + report together, so they go to the full audit.
const toolSlugBySource: Record<ExplainerSource, string> = {
  gtm: 'gtm-auditor',
  ads: 'google-ads-linter',
  report: 'performance-analyzer',
  cross: 'full-audit',
  meta: 'meta-auditor',
  tiktok: 'tiktok-auditor',
  linkedin: 'linkedin-auditor',
  pinterest: 'pinterest-auditor',
  twitter: 'twitter-auditor',
  snapchat: 'snapchat-auditor',
};

export function toolHrefForSource(source?: ExplainerSource) {
  return `/tools/${source ? toolSlugBySource[source] : 'full-audit'}`;
}

const headings = {
  check: 'Audit your own files for this check',
  audit: 'Run a full audit on your own files',
} as const;

const leads = {
  check: `AdLint runs this check (and ${totalCheckCount - 1} others)`,
  audit: `AdLint runs ${totalCheckCount} checks`,
} as const;

// Full-width conversion banner for editorial templates (UX_AUDIT CD-01).
// 'check' points at the tool that runs this specific check; 'audit' at the
// full audit. Accent ground so it reads as the page's one primary action.
export function EditorialBannerCTA({
  variant,
  source,
}: {
  variant: 'audit' | 'check';
  source?: ExplainerSource;
}) {
  const href = variant === 'check' ? toolHrefForSource(source) : toolHrefForSource();
  return (
    <aside
      aria-label={headings[variant]}
      className="flex flex-col gap-6 rounded-md bg-accent p-6 text-white sm:p-8 md:flex-row md:items-center md:justify-between"
    >
      <div className="max-w-[56ch]">
        <p className="mb-2 font-display text-2xl font-semibold leading-tight">
          {headings[variant]}
        </p>
        <p className="text-sm leading-6 text-white/80">
          {leads[variant]} against your GTM, Google Ads, Meta, TikTok,
          LinkedIn, Pinterest, Twitter/X, and Snapchat exports. Files are audited in your
          browser and never uploaded. No account needed.
        </p>
      </div>
      <Link
        href={href}
        className="inline-flex h-10 shrink-0 items-center justify-center rounded-sm bg-surface px-4 text-sm font-medium text-accent transition-colors duration-150 ease-in-out hover:bg-surface-2 sm:self-start md:self-center"
      >
        Run a free audit
      </Link>
    </aside>
  );
}
