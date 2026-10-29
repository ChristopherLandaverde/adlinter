import { InlineProse } from './InlineProse';
import { parseNumberedList, splitParagraphs } from './prose';

// One numbered fix step as its own card. The step number is set in Geist Mono
// (tabular) as a typographic element, not an icon in a coloured circle.
export function HowToFixStep({ number, children }: { number: number; children: string }) {
  return (
    <li className="flex gap-4 rounded-md border border-border bg-surface p-4">
      <span
        aria-hidden="true"
        className="w-6 shrink-0 font-mono text-xl font-medium leading-7 text-accent"
      >
        {String(number).padStart(2, '0')}
      </span>
      <p className="min-w-0 whitespace-pre-line text-base leading-7 text-ink">
        <InlineProse text={children} />
      </p>
    </li>
  );
}

// Renders howToFix as step cards when it is a numbered list, otherwise as
// paragraphs. The text itself is passed through untouched; `code` spans render
// as <code>.
export function HowToFixSteps({ text }: { text: string }) {
  const steps = parseNumberedList(text);
  if (!steps) {
    return (
      <div className="max-w-[72ch] space-y-4 text-base leading-8 text-muted">
        {splitParagraphs(text).map((p, i) => (
          <p key={i} className="whitespace-pre-line">
            <InlineProse text={p} />
          </p>
        ))}
      </div>
    );
  }
  return (
    <ol className="space-y-3">
      {steps.map((step, i) => (
        <HowToFixStep key={i} number={i + 1}>
          {step}
        </HowToFixStep>
      ))}
    </ol>
  );
}
