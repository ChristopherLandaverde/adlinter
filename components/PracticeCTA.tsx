import { ArrowUpRight } from 'lucide-react';

// Conversion surface on the audit results page. The audit itself is the
// primary action here and PDF export / share / history already occupy the
// action cluster, so this is a quiet bordered panel rather than an
// accent-ground banner (DESIGN.md principle 3: three actions per surface).
// EditorialBannerCTA stays the loud one, because on /checks pages it is the
// only primary action.
//
// Copy constraints from PRODUCT.md, do not loosen them:
// - Files are never uploaded, so this cannot imply the findings were seen.
//   The offer is "bring the findings", not "I reviewed your audit".
// - AdLint is not a generator, campaign manager, or performance predictor.
//   The offer is repair work on tracking systems only.
const PRACTICE_URL =
  'https://focosys.io/?utm_source=adlint&utm_medium=product&utm_campaign=audit_results';

export function PracticeCTA() {
  return (
    <aside
      aria-labelledby="practice-cta-heading"
      className="mt-8 rounded-md border border-border bg-surface p-6 sm:p-8"
    >
      <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
        <div className="max-w-[60ch]">
          <h2
            id="practice-cta-heading"
            className="font-display text-xl font-semibold leading-tight text-ink"
          >
            Some findings need a person, not a tool
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted">
            AdLint shows you what is broken. Server-side tracking, consent
            architecture and CRM source drift usually need someone to own the
            repair end to end. Your files stay in your browser, so bring the
            findings.
          </p>
          <p className="mt-3 text-xs leading-5 text-muted">
            Built by Christopher Landaverde at Focosys, an independent
            marketing systems practice.
          </p>
        </div>

        <a
          href={PRACTICE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-11 shrink-0 items-center gap-2 self-start rounded-sm border border-accent px-4 text-sm font-medium text-accent transition-colors hover:bg-accent hover:text-white md:self-auto"
        >
          Discuss a system review
          <ArrowUpRight className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
          <span className="sr-only">(opens in a new tab)</span>
        </a>
      </div>
    </aside>
  );
}
