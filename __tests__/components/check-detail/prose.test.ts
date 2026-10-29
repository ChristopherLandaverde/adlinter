import { parseNumberedList, splitParagraphs } from '@/components/check-detail/prose';

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
