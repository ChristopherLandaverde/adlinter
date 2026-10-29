import type { CheckExplainer } from '@/lib/checks/explainers';

type Severity = CheckExplainer['severity'];

// DESIGN.md "Severity chips": compact pill, rounded-full, text-xs font-medium
// px-2 py-0.5, severity color at 10% alpha behind full-strength text.
const chipStyles: Record<Severity, string> = {
  critical: 'bg-critical/10 text-critical',
  warning: 'bg-warning/10 text-warning',
  info: 'bg-info/10 text-info',
};

const dotStyles: Record<Severity, string> = {
  critical: 'bg-critical',
  warning: 'bg-warning',
  info: 'bg-info',
};

const labels: Record<Severity, string> = {
  critical: 'Critical',
  warning: 'Warning',
  info: 'Info',
};

export function SeverityChip({ severity }: { severity: Severity }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${chipStyles[severity]}`}
    >
      <SeverityDot severity={severity} />
      {labels[severity]}
    </span>
  );
}

export function SeverityDot({ severity }: { severity: Severity }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block size-1.5 shrink-0 rounded-full ${dotStyles[severity]}`}
    />
  );
}
