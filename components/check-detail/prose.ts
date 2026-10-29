// Pure text helpers for rendering explainer fields. The explainer content in
// lib/checks/explainers.ts is plain strings; these decide how a string is laid
// out without changing a word of it.

// Some explainers write howToFix as "1. step. 2. step. 3. step." in a single
// string (or one step per line). Detect that and return the steps; returns
// null for prose so the caller can fall back to paragraphs.
export function parseNumberedList(text: string): string[] | null {
  const trimmed = text.trim();
  if (!/^1\.\s/.test(trimmed)) return null;
  const parts = trimmed.split(/\s+(?=\d+\.\s)/);
  if (parts.length < 2) return null;
  return parts.map((p) => p.replace(/^\d+\.\s*/, '').trim()).filter(Boolean);
}

// Split prose on blank lines so each paragraph renders as its own <p>.
export function splitParagraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

export type InlineSegment = { kind: 'text' | 'code'; value: string };

// Explainers mark identifiers (`event_id`, `gclid`) with Markdown-style
// backticks. Split a string into plain-text and code segments so the caller
// can render code spans as <code> elements instead of literal backticks.
// A span must open and close on the same line and contain at least one
// character; a backtick without a partner is left in the text as written.
export function splitInlineCode(text: string): InlineSegment[] {
  const segments: InlineSegment[] = [];
  const re = /`([^`\n]+)`/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) segments.push({ kind: 'text', value: text.slice(last, m.index) });
    segments.push({ kind: 'code', value: m[1] });
    last = m.index + m[0].length;
  }
  if (last < text.length) segments.push({ kind: 'text', value: text.slice(last) });
  return segments;
}
