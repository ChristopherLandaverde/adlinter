import { Fragment } from 'react';
import { splitInlineCode } from './prose';

// DESIGN.md: code is Geist Mono, set on the surface-2 code tone with a
// hairline border and the 4px radius. Sized relative to the surrounding text
// so it works in body prose, the TL;DR card and the citation block alike.
export const inlineCodeClassName =
  'rounded-sm border border-border bg-surface-2 px-1 py-px font-mono text-[0.875em] text-ink';

// Renders an explainer string with its `backtick` spans as <code>. Text is
// passed to React as children, never as HTML, so nothing in the string can
// inject markup.
export function InlineProse({ text }: { text: string }) {
  return (
    <>
      {splitInlineCode(text).map((segment, i) =>
        segment.kind === 'code' ? (
          <code key={i} className={inlineCodeClassName}>
            {segment.value}
          </code>
        ) : (
          <Fragment key={i}>{segment.value}</Fragment>
        )
      )}
    </>
  );
}
