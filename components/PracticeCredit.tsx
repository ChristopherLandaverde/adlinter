// Quiet credit to the practice behind AdLint (UX_AUDIT A-03, reopened
// 2026-11-17 by Christopher in a softer form than the v1.26.2 CTA it replaces).
// A credit plus a mailto: no booking, no paid-review offer. Links carry UTM
// parameters so focosys.io's analytics can see AdLint referrals; AdLint itself
// loads no analytics. Rendered on the page only; the jsPDF export is built
// separately and never includes it.

export type CreditPlacement = 'audit' | 'check';

const utmContent: Record<CreditPlacement, string> = {
  audit: 'audit_results',
  check: 'check_page',
};

export function practiceUrl(placement: CreditPlacement): string {
  const params = new URLSearchParams({
    utm_source: 'adlint',
    utm_medium: 'referral',
    utm_campaign: 'practice_credit',
    utm_content: utmContent[placement],
  });
  return `https://focosys.io/?${params.toString()}`;
}

const subjects: Record<CreditPlacement, string> = {
  audit: 'AdLint audit finding',
  check: 'AdLint check',
};

export function PracticeCredit({ placement }: { placement: CreditPlacement }) {
  const mailto = `mailto:christopher@focosys.io?subject=${encodeURIComponent(subjects[placement])}`;
  return (
    <aside
      aria-label="Who builds AdLint"
      className="rounded-md border border-border bg-surface p-6"
    >
      <p className="mb-2 font-mono text-xs uppercase tracking-wide text-muted">
        Built by FOCO Systems
      </p>
      <p className="max-w-[64ch] text-sm leading-6 text-ink">
        AdLint is built by Christopher Landaverde at FOCO Systems, an independent
        marketing systems practice. When a finding needs more than a settings
        change, tracing it through the CRM and reporting is the work the practice
        does.
      </p>
      <p className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm">
        <a
          href={mailto}
          className="font-medium text-accent hover:text-accent-hover hover:underline"
        >
          Start with the decision you cannot trust: christopher@focosys.io
        </a>
        <a
          href={practiceUrl(placement)}
          target="_blank"
          rel="noopener noreferrer"
          className="text-muted hover:text-ink hover:underline"
        >
          focosys.io ↗
        </a>
      </p>
    </aside>
  );
}
