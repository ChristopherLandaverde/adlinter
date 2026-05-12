#!/usr/bin/env node
// Pass 2: fix grammatical fallout from the "AdLint detected" removal in pass 1.
// Citation templates now start lowercase or with "that this..." which reads
// broken. Patch into clean sentence openers.

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const file = join(__dirname, '..', 'lib', 'checks', 'explainers.ts');
let content = readFileSync(file, 'utf8');
const original = content;

// citationTemplate fields that now start with lowercase or "that this".
// Match the field opener: citationTemplate:\n      '<first char>
// Replace 'that this -> 'This (drops the "that", caps the T)
content = content.replace(/citationTemplate:\s*\n\s*'that this /g, "citationTemplate:\n      'This ");
content = content.replace(/citationTemplate:\s*\n\s*'that one /g, "citationTemplate:\n      'One ");

// Then capitalize the first letter of any citationTemplate that still starts lowercase.
content = content.replace(/(citationTemplate:\s*\n\s*')([a-z])/g, (m, p1, p2) => p1 + p2.toUpperCase());

// Sentence-internal period followed by lowercase (from the em-dash replacement).
// ". <lowercase>" inside string literals. Be careful not to clobber URLs or filenames.
// Conservative scan: only inside multi-line string literals starting at the column-indent
// pattern of explainer string fields.
// Simpler: any ". <lowercase letter that's NOT part of a URL or filename>"
// We approximate by requiring the period to be followed by a space and a single
// lowercase letter that starts a word longer than 2 chars (filters out e.g. domains).
content = content.replace(/\. ([a-z])([a-z]{2,})/g, (m, c, rest) => `. ${c.toUpperCase()}${rest}`);

// Undo over-capitalization for known sentence fragments that should not be sentence-cased.
// e.g. ". g." in "e.g." — but our regex requires 2+ trailing lowercase, so "g." wouldn't match.
// ". ms" in "5000ms" — same protection. Should be fine.

// Specifically protect URLs in source: pattern. capitalization of url paths after periods.
content = content.replace(/Support\.google\.com/g, 'support.google.com');
content = content.replace(/Developers\.google\.com/g, 'developers.google.com');
content = content.replace(/Tagmanager\.google\.com/g, 'tagmanager.google.com');
content = content.replace(/Web\.dev/g, 'web.dev');
content = content.replace(/Developer\.mozilla\.org/g, 'developer.mozilla.org');

const changed = content !== original;
console.log(`Changed: ${changed}`);
if (changed) {
  writeFileSync(file, content);
  console.log(`Wrote: ${file}`);
}
