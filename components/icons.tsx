import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

// Brand marks are inline SVG so we ship zero extra deps and the colors live
// with the geometry. Paths are public-license simple-icons-style marks.

function BrandSvg({ children, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

function StrokeIconBase({ children, ...props }: IconProps) {
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

// ───────────────────────────── Brand marks ─────────────────────────────

// Google Tag Manager — official multi-shape tag mark in Google blue.
export function Tag(props: IconProps) {
  return (
    <BrandSvg {...props}>
      <path
        fill="#8AB4F8"
        d="M12.001 2.504 2.503 12l9.498 9.498 9.497-9.498-9.497-9.496Zm-3.71 13.207L4.583 12l3.708-3.71L12 12l-3.71 3.711Z"
      />
      <path
        fill="#4285F4"
        d="m12.005 2.504-9.5 9.498L12 21.498 21.502 12l-9.497-9.497Z"
        opacity="0.15"
      />
      <path
        fill="#4285F4"
        d="M14.847 6.872 9.715 11.997l5.132 5.133 5.133-5.133-5.133-5.125Z"
      />
      <circle cx="8.293" cy="15.71" r="2.121" fill="#246FDB" />
    </BrandSvg>
  );
}

// Google Ads — Google "G" simplified single-mark, official multi-color palette.
export function DollarSign(props: IconProps) {
  return (
    <BrandSvg {...props}>
      <path
        fill="#FBBC04"
        d="M4.05 16.207 8.6 8.298l4.052 2.336-4.55 7.908-4.052-2.335Z"
      />
      <path
        fill="#34A853"
        d="M19.949 16.207 11.4 1.394 7.348 3.73 15.897 18.54l4.052-2.334Z"
      />
      <circle cx="7.043" cy="18.073" r="2.578" fill="#4285F4" />
    </BrandSvg>
  );
}

// Performance analyzer — neutral monochrome chart, no brand.
export function LineChart(props: IconProps) {
  return (
    <StrokeIconBase {...props}>
      <path d="M3 3v18h18" />
      <path d="m19 9-5 5-4-4-3 3" />
    </StrokeIconBase>
  );
}

// Full-Stack — neutral stacked-layers mark, no brand.
export function Search(props: IconProps) {
  return (
    <StrokeIconBase {...props}>
      <path d="m12 2 9 5-9 5-9-5 9-5Z" />
      <path d="m3 12 9 5 9-5" />
      <path d="m3 17 9 5 9-5" />
    </StrokeIconBase>
  );
}

// Meta — infinity loop in Meta blue.
export function Facebook(props: IconProps) {
  return (
    <BrandSvg {...props}>
      <path
        fill="#0866FF"
        d="M6.915 4.03c-1.968 0-3.683 1.28-4.871 3.113C.704 9.208 0 11.883 0 14.449c0 .706.07 1.369.21 1.973.045.197.099.39.16.578.058.179.124.354.198.521.243.553.553 1.04.92 1.452.74.832 1.732 1.413 2.91 1.413 1.221 0 2.483-.426 3.952-1.886.116-.115.231-.232.349-.353.193-.21.351-.387.523-.59l-.348-.466c-.166-.196-.338-.405-.495-.591-.193-.245-.345-.397-.484-.595-1.067 1.46-2.187 2.16-3.358 2.16-.798 0-1.401-.341-1.74-.97-.243-.42-.345-.97-.345-1.554 0-1.94.954-4.044 2.243-5.41 1.115-1.18 2.476-1.836 3.69-1.836 1.067 0 1.91.484 2.692 1.336.587.643 1.082 1.426 1.61 2.426l1.106-1.812c-.55-.92-1.131-1.715-1.776-2.387C9.987 4.876 8.62 4.029 6.915 4.029Zm10.13 0c-1.706 0-3.072.85-4.302 2.138 1.115 1.252 2.117 2.92 3.111 4.65l.062.108c.323.553.61 1.045.85 1.398.246.34.41.495.512.495.137 0 .278-.014.42-.116.225-.155.366-.42.366-.78 0-.96-.21-2.135-.594-3.075-.418-1.019-.85-1.616-.85-2.305 0-1.367 1.115-2.514 2.498-2.514.768 0 1.49.232 2.158.812.232.196.385.42.643.652l1.13-1.747c-.59-.628-1.293-1.13-2.063-1.426-.7-.27-1.482-.39-1.94-.39Z"
      />
    </BrandSvg>
  );
}

// TikTok — official note mark with cyan/magenta offsets on black.
export function Music2(props: IconProps) {
  return (
    <BrandSvg {...props}>
      <path
        fill="#25F4EE"
        d="M9.37 8.55v-1a6.93 6.93 0 0 0-1-.07A7 7 0 0 0 5.65 21.03a6.93 6.93 0 0 1-1.65-4.4 7 7 0 0 1 5.37-8.08Z"
      />
      <path
        fill="#25F4EE"
        d="M9.51 18.49a3.18 3.18 0 0 0 3.18-3.06V2.62h2.78A4.95 4.95 0 0 1 15.4 1.7h-3.8v12.81a3.18 3.18 0 0 1-3.16 3.06 3.13 3.13 0 0 1-1.48-.37 3.18 3.18 0 0 0 2.55 1.29Zm11.16-12.5V5.1A4.85 4.85 0 0 1 18 4.18a4.91 4.91 0 0 0 2.67 1.81Z"
      />
      <path
        fill="#FE2C55"
        d="M18 4.18a4.91 4.91 0 0 1-1.21-3.23v-.93h-3.27v12.84a3.18 3.18 0 0 1-5.71 1.88 3.18 3.18 0 0 1 1.66-5.92 3.16 3.16 0 0 1 .94.15v-3.3a6.49 6.49 0 0 0-.94-.07A6.93 6.93 0 0 0 4 12.7a6.93 6.93 0 0 0 1.66 4.41A7 7 0 0 0 16 11.95V5.42a8.13 8.13 0 0 0 4.69 1.5V3.65A4.89 4.89 0 0 1 18 4.18Z"
      />
      <path
        fill="currentColor"
        d="M16 11.95V5.42a8.13 8.13 0 0 0 4.69 1.5v-1A4.91 4.91 0 0 1 18 4.18a4.85 4.85 0 0 1-2.67-1.83l-2.78.27v12.81a3.18 3.18 0 0 1-5.85 1.7 3.18 3.18 0 0 1 1.66-5.92 3.16 3.16 0 0 1 .94.15v-3.3a7 7 0 0 0-5.37 8.08 6.93 6.93 0 0 0 1.65 4.4A7 7 0 0 0 16 11.95Z"
      />
    </BrandSvg>
  );
}

// LinkedIn — white "in" on brand-blue square.
export function Linkedin(props: IconProps) {
  return (
    <BrandSvg {...props}>
      <rect width="24" height="24" rx="3" fill="#0A66C2" />
      <path
        fill="#FFFFFF"
        d="M7.5 9.5H4.7v9.3h2.8V9.5ZM6.1 8.3A1.6 1.6 0 1 0 6.1 5a1.6 1.6 0 0 0 0 3.3ZM19.3 18.8h-2.8v-4.5c0-1.1 0-2.5-1.5-2.5s-1.7 1.2-1.7 2.4v4.6H10.5V9.5h2.7v1.3a3 3 0 0 1 2.7-1.5c2.8 0 3.4 1.9 3.4 4.3v5.2Z"
      />
    </BrandSvg>
  );
}

// Pinterest — white "P" on brand-red circle.
export function Bookmark(props: IconProps) {
  return (
    <BrandSvg {...props}>
      <circle cx="12" cy="12" r="11" fill="#E60023" />
      <path
        fill="#FFFFFF"
        d="M12.04 4.93c-3.92 0-5.92 2.78-5.92 5.1 0 1.4.53 2.65 1.68 3.12.19.07.36 0 .41-.2l.17-.65c.05-.2.03-.27-.12-.44a2.6 2.6 0 0 1-.6-1.78c0-2.3 1.74-4.36 4.53-4.36 2.47 0 3.83 1.5 3.83 3.51 0 2.65-1.18 4.9-2.93 4.9-.97 0-1.7-.8-1.47-1.78.27-1.17.8-2.43.8-3.28 0-.76-.4-1.39-1.25-1.39-.99 0-1.79.99-1.79 2.32 0 .85.29 1.42.29 1.42L8.5 17.16c-.34 1.44-.05 3.2-.03 3.38.01.1.14.13.2.05.08-.11 1.14-1.4 1.5-2.81.1-.4.6-2.32.6-2.32.3.55 1.17 1.04 2.1 1.04 2.77 0 4.64-2.5 4.64-5.86 0-2.54-2.15-4.91-5.42-4.91Z"
      />
    </BrandSvg>
  );
}

// X (Twitter) — current X glyph in black.
export function Twitter(props: IconProps) {
  return (
    <BrandSvg {...props}>
      <path
        fill="currentColor"
        d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24h-6.66l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77Z"
      />
    </BrandSvg>
  );
}

// Snapchat — yellow ghost mark.
export function Camera(props: IconProps) {
  return (
    <BrandSvg {...props}>
      <rect width="24" height="24" rx="5" fill="#FFFC00" />
      <path
        fill="#FFFFFF"
        stroke="#000"
        strokeWidth="0.3"
        d="M12 4.5c2.9 0 4.5 2 4.5 4.7 0 .7-.1 2-.2 2.7.4.2 1 .3 1.4.3.4 0 .6.3.6.6 0 .5-1 .9-2 1.1-.1.4.4 1.4 1.4 1.9.7.3 1.4.4 1.5.7.1.4-.4.7-2.1 1-.1.1-.1.5-.3.8-.1.2-.3.2-.6.2-.4 0-1-.2-1.8-.2-1.1 0-1.5.3-2.3.8-.6.4-1.2.7-2.1.7-.9 0-1.5-.3-2.1-.7-.8-.5-1.2-.8-2.3-.8-.8 0-1.4.2-1.8.2-.3 0-.5 0-.6-.2-.2-.3-.2-.7-.3-.8-1.7-.3-2.2-.6-2.1-1 .1-.3.8-.4 1.5-.7 1-.5 1.5-1.5 1.4-1.9-1-.2-2-.6-2-1.1 0-.3.2-.6.6-.6.4 0 1-.1 1.4-.3-.1-.7-.2-2-.2-2.7C7.5 6.5 9.1 4.5 12 4.5Z"
      />
    </BrandSvg>
  );
}

// ─────────────────────────── Registry ───────────────────────────

export const toolIcons = {
  Tag,
  DollarSign,
  LineChart,
  Search,
  Facebook,
  Music2,
  Linkedin,
  Bookmark,
  Twitter,
  Camera,
} as const;

export function getToolIcon(iconName: string) {
  return toolIcons[iconName as keyof typeof toolIcons] ?? Search;
}
