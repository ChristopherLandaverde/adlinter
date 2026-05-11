import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

function IconBase({ children, ...props }: IconProps) {
  return (
    <svg
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

export function Tag(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M20.6 13.1 13.1 20.6a2 2 0 0 1-2.8 0L3 13.3V3h10.3l7.3 7.3a2 2 0 0 1 0 2.8Z" />
      <path d="M7.5 7.5h.01" />
    </IconBase>
  );
}

export function DollarSign(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M12 2v20" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7H14a3.5 3.5 0 0 1 0 7H6" />
    </IconBase>
  );
}

export function LineChart(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M3 3v18h18" />
      <path d="m19 9-5 5-4-4-3 3" />
    </IconBase>
  );
}

export function Search(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </IconBase>
  );
}

export function Facebook(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3Z" />
    </IconBase>
  );
}

export function Music2(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="8" cy="18" r="4" />
      <path d="M12 18V2l7 4" />
    </IconBase>
  );
}

export function Linkedin(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6Z" />
      <rect x="2" y="9" width="4" height="12" />
      <circle cx="4" cy="4" r="2" />
    </IconBase>
  );
}

export const toolIcons = {
  Tag,
  DollarSign,
  LineChart,
  Search,
  Facebook,
  Music2,
  Linkedin,
} as const;

export function getToolIcon(iconName: string) {
  return toolIcons[iconName as keyof typeof toolIcons] ?? Search;
}
