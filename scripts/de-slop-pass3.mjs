#!/usr/bin/env node
// Pass 3: catch escape-sequence variants my earlier passes missed.

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const file = join(__dirname, '..', 'lib', 'checks', 'explainers.ts');
let content = readFileSync(file, 'utf8');
const original = content;

// "Per Google\'s" with the escape sequence in the source.
content = content.replaceAll("Per Google\\'s ", "Google\\'s ");
// "Per Google's" without escape (in case any survived as quote-natural strings).
content = content.replaceAll("Per Google's ", "Google's ");

// Also: "Per the W3C", "Per industry-standard", "Per Google\'s" all-form catches.
content = content.replaceAll("Per the W3C ", "The W3C ");
content = content.replaceAll("Per industry-standard ", "Industry-standard ");
content = content.replaceAll("Per measurement-governance ", "Measurement-governance ");
content = content.replaceAll("Per Google\\'s GTM ", "Google\\'s GTM ");
content = content.replaceAll("Per Google\\'s GA4 ", "Google\\'s GA4 ");

const changed = content !== original;
console.log(`Changed: ${changed}`);
if (changed) {
  writeFileSync(file, content);
  console.log(`Wrote: ${file}`);
}
