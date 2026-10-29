import { parseNumberedList, splitInlineCode, splitParagraphs } from '@/components/check-detail/prose';
import { explainers } from '@/lib/checks/explainers';

describe('parseNumberedList', () => {
  it('splits newline-separated numbered steps', () => {
    expect(parseNumberedList('1. Open GTM.\n2. Add the tag.\n3. Publish.')).toEqual([
      'Open GTM.',
      'Add the tag.',
      'Publish.',
    ]);
  });

  it('splits inline numbered steps', () => {
    expect(parseNumberedList('1. Open GTM. 2. Publish.')).toEqual(['Open GTM.', 'Publish.']);
  });

  it('returns null for prose', () => {
    expect(parseNumberedList('Open GTM and publish.')).toBeNull();
    expect(parseNumberedList('1. Only one step.')).toBeNull();
  });
});

describe('splitParagraphs', () => {
  it('splits on blank lines and drops empties', () => {
    expect(splitParagraphs('One.\n\nTwo.\n  \nThree.\n\n')).toEqual(['One.', 'Two.', 'Three.']);
  });

  it('keeps single newlines inside a paragraph', () => {
    expect(splitParagraphs('Line a\nline b')).toEqual(['Line a\nline b']);
  });
});

describe('splitInlineCode', () => {
  it('splits a sentence with inline code into text and code segments', () => {
    expect(splitInlineCode('Send the same `event_id` from browser and server.')).toEqual([
      { kind: 'text', value: 'Send the same ' },
      { kind: 'code', value: 'event_id' },
      { kind: 'text', value: ' from browser and server.' },
    ]);
  });

  it('handles several spans, including at the start and end', () => {
    expect(splitInlineCode('`gclid` lands in `_gcl_aw`')).toEqual([
      { kind: 'code', value: 'gclid' },
      { kind: 'text', value: ' lands in ' },
      { kind: 'code', value: '_gcl_aw' },
    ]);
  });

  it('returns plain text unchanged', () => {
    expect(splitInlineCode('No code here.')).toEqual([{ kind: 'text', value: 'No code here.' }]);
  });

  it('leaves unpaired, empty and multi-line backticks as written', () => {
    expect(splitInlineCode('a ` b')).toEqual([{ kind: 'text', value: 'a ` b' }]);
    expect(splitInlineCode('a `` b')).toEqual([{ kind: 'text', value: 'a `` b' }]);
    expect(splitInlineCode('a `b\nc` d')).toEqual([{ kind: 'text', value: 'a `b\nc` d' }]);
  });

  it('loses no characters other than the paired backticks', () => {
    const text = 'Use `ttq.track()` with `value` and `currency`.';
    const rebuilt = splitInlineCode(text)
      .map((s) => (s.kind === 'code' ? `\`${s.value}\`` : s.value))
      .join('');
    expect(rebuilt).toBe(text);
  });
});

describe('explainer content', () => {
  // Every backtick in explainer prose must pair up on its own line, or it
  // renders as a literal backtick on /checks/<id>.
  it('pairs every backtick on the line it opens', () => {
    const unpaired: string[] = [];
    for (const e of explainers) {
      for (const field of ['why', 'howToFix', 'directAnswer', 'summary', 'citationTemplate'] as const) {
        for (const line of (e[field] ?? '').split('\n')) {
          if ((line.match(/`/g) ?? []).length % 2 !== 0) unpaired.push(`${e.id}.${field}`);
        }
      }
    }
    expect(unpaired).toEqual([]);
  });
});
