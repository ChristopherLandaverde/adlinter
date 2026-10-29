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
