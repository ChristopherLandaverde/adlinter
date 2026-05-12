#!/usr/bin/env node
// One-shot bulk transformation pass on lib/checks/explainers.ts to strip the
// most common AI-prose tells. Runs once, committed separately, then deleted.

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const file = join(__dirname, '..', 'lib', 'checks', 'explainers.ts');
let content = readFileSync(file, 'utf8');
const original = content;

// Em dashes. Most of mine are " — " between independent clauses,
// where a period works. A few are after a noun phrase to add detail,
// where a comma or parens would be better, but period is safe enough.
content = content.replaceAll(' — ', '. ');
content = content.replaceAll('—', '.');

// Citation template boilerplate. "AdLint detected ..." opens every
// citation. Drop the opener and let the claim lead.
content = content.replaceAll('AdLint detected ', '');
content = content.replaceAll('AdLint flagged ', '');

// "Recommended remediation:" is corporate. Use "Fix:".
content = content.replaceAll('Recommended remediation: ', 'Fix: ');

// Banlist vocabulary observed in my own writing.
content = content.replaceAll('at material risk of ', 'at risk of ');
content = content.replaceAll('material risk of ', 'risk of ');
content = content.replaceAll('are at material risk', 'are at risk');
content = content.replaceAll(' silently ', ' ');
content = content.replaceAll('silently ', '');
content = content.replaceAll('The damage is silent: ', '');
content = content.replaceAll('the practical effect is ', '');
content = content.replaceAll('the practical effect ', 'the effect ');
content = content.replaceAll('The practical effect ', 'The effect ');
content = content.replaceAll(' corrupts ', ' breaks ');
content = content.replaceAll(' corrupting ', ' breaking ');
content = content.replaceAll(' corrupted ', ' broken ');

// "Per Google's documentation on X" -> "Google's docs state" (less robotic).
content = content.replaceAll("Per Google's documentation on the ", "Google's documentation on the ");
content = content.replaceAll("Per Google's ", "Google's ");
content = content.replaceAll('Per industry-standard ', 'Industry-standard ');
content = content.replaceAll('Per the W3C ', 'The W3C ');
content = content.replaceAll('Per measurement-governance ', 'Measurement-governance ');

// Throat-clearing phrases that pad sentences.
content = content.replaceAll('It is worth noting that ', '');
content = content.replaceAll('It is important to note that ', '');
content = content.replaceAll(' compounds because ', ' adds up because ');
content = content.replaceAll(' compound ', ' add up ');
content = content.replaceAll('The damage compounds', 'It adds up');

// Generic boilerplate.
content = content.replaceAll('The check is conservative', 'The check is strict');
content = content.replaceAll('the failure pattern is widespread', 'this shows up in most audits');

// "AdLint identifies" / "AdLint flags" repetitions in citation templates.
// Already handled above; just guard re-applies.

const changed = content !== original;
console.log(`Changed: ${changed}`);
if (changed) {
  writeFileSync(file, content);
  console.log(`Wrote: ${file}`);
}
