// Builds the four storyboard frames for docs/images/fix-demo.gif.
//
// 1. Drives a running AdLint (BASE_URL, default http://localhost:3000) with
//    Playwright: the Google Ads Linter on its bundled sample, the
//    wrong-counting-method explainer, and a real re-run on a copy of the sample
//    with one cell changed (Purchase: Count "One" -> "Every").
// 2. Reads every number and title shown in the captions from those pages and
//    writes them to out/run.json.
// 3. Renders each frame from frame.html and screenshots it to out/frames/.
//
// It throws if the app no longer shows what the captions describe, so the GIF
// can't silently drift from the product. See README.md in this folder.

import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const OUT = path.join(HERE, 'out');
const SHOTS = path.join(OUT, 'shots');
const FRAMES = path.join(OUT, 'frames');
const BASE = (process.env.BASE_URL ?? 'http://localhost:3000').replace(/\/$/, '');

const TOOL = 'google-ads-linter';
const SAMPLE_REL = 'public/samples/ads-conversions-sample.csv';
const FIXED_NAME = 'sample-conversions-fixed.csv';
const EXPLAINER_ID = 'wrong-counting-method';
// The findings the "One" cell triggers, and which the fixed copy must clear.
const COUNTING_FINDINGS = [
  'High-Value Conversions with Wrong Counting Method',
  'Wrong Counting Method',
  'Counting Method vs Category Mismatch',
];

fs.mkdirSync(SHOTS, { recursive: true });
fs.mkdirSync(FRAMES, { recursive: true });

function assert(cond, msg) {
  if (!cond) throw new Error(`readme-demo: ${msg}`);
}

// ── Input: the bundled sample and the one-cell fix ───────────────────────────
const sampleText = fs.readFileSync(path.join(ROOT, SAMPLE_REL), 'utf8');
const rows = sampleText.trim().split(/\r?\n/).map((line) => line.split(','));
assert(!sampleText.includes('"'), 'sample CSV has quoted fields; the simple splitter below would break');
const header = rows[0];
const COUNT = header.indexOf('Count');
const CATEGORY = header.indexOf('Category');
assert(COUNT > 0 && CATEGORY > 0, 'sample CSV is missing Count or Category');
const badRow = rows.findIndex((r, i) => i > 0 && r[CATEGORY] === 'Purchase' && r[COUNT] === 'One');
assert(badRow > 0, 'sample no longer has a Purchase row counting "One"');
const fixedRows = rows.map((r, i) => (i === badRow ? r.map((c, j) => (j === COUNT ? 'Every' : c)) : r));
const fixedText = fixedRows.map((r) => r.join(',')).join('\n') + '\n';
const fixedPath = path.join(OUT, FIXED_NAME);
fs.writeFileSync(fixedPath, fixedText);
const STATUS = header.indexOf('Status');
const enabledCount = rows.filter((r, i) => i > 0 && r[STATUS] === 'Enabled').length;
const changedCells = rows.flatMap((r, i) => r.filter((c, j) => c !== fixedRows[i][j])).length;
assert(changedCells === 1, `fixed copy should differ by one cell, differs by ${changedCells}`);

// ── App capture ──────────────────────────────────────────────────────────────
const browser = await chromium.launch();

async function openPage(width) {
  const context = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: 2 });
  return context.newPage();
}

async function shot(page, name, box) {
  const file = path.join(SHOTS, `${name}.png`);
  await page.screenshot({ path: file, fullPage: true, clip: box });
  return { file: pathToFileURL(file).href, width: box.width, height: box.height };
}

async function box(locator) {
  const b = await locator.boundingBox();
  assert(b, `no bounding box for ${locator}`);
  // boundingBox is viewport-relative; fullPage clips are page-relative.
  const scrollY = await locator.page().evaluate(() => window.scrollY);
  return { x: b.x, y: b.y + scrollY, width: b.width, height: b.height };
}

async function waitForScore(page) {
  await page.waitForURL('**/audit');
  await page.locator('main section').first().waitFor();
  // Let the score-ring count-up (DESIGN.md: ~700ms) finish.
  let last = '';
  for (let i = 0; i < 20; i++) {
    await page.waitForTimeout(400);
    const now = await page.locator('main section').first().innerText();
    if (now === last) break;
    last = now;
  }
}

async function readAudit(page) {
  const scoreText = await page.locator('main section').first().innerText();
  const lines = scoreText.split('\n').map((s) => s.trim()).filter(Boolean);
  const score = Number(scoreText.match(/(\d+)\s*\/100/)?.[1]);
  const label = lines[lines.indexOf('/100') + 1];
  const [, passed, total] = scoreText.match(/(\d+)\/(\d+) checks passed/) ?? [];
  const body = await page.locator('body').innerText();
  const m = body.match(/(\d+)\s*\n\s*Critical\s*\n\s*(\d+)\s*\n\s*Warnings?\s*\n\s*(\d+)\s*\n\s*Info\s*\n\s*(\d+)\s*\n\s*Passed/);
  const top = await page.locator('#results article h3').allInnerTexts();
  const issues = await page
    .locator('table tbody tr td:nth-child(2)')
    .evaluateAll((tds) => tds.map((td) => td.innerText.split('\n')[0].trim()));
  const result = {
    score,
    label,
    passed: Number(passed),
    total: Number(total),
    critical: Number(m?.[1]),
    warnings: Number(m?.[2]),
    info: Number(m?.[3]),
    issues,
    top,
  };
  assert(Number.isFinite(score) && label && result.passed && result.total && m, `could not read the audit page: ${JSON.stringify(result)}`);
  return result;
}

// Right-hand product card: 400px wide, 516px tall below its 30px header.
const RIGHT_W = 400;
const RIGHT_H = 516;
const NARROW = 480;

// Frame 1: the tool screen.
const toolPage = await openPage(NARROW);
await toolPage.goto(`${BASE}/tools/${TOOL}`);
await toolPage.evaluate(() => document.fonts.ready);
const sampleButton = toolPage.getByRole('button', { name: /Try with sample data/ });
const toolName = (await toolPage.locator('h1').innerText()).trim();
const checkCountLine = (await toolPage.getByText(/checks will be performed/).innerText()).trim();
const sampleBox = await box(sampleButton);
const toolShot = await shot(toolPage, 'tool', {
  x: 0,
  y: 0,
  width: NARROW,
  height: sampleBox.y + sampleBox.height + 28,
});

// Frame 2: run the bundled sample.
await sampleButton.click();
await waitForScore(toolPage);
const before = await readAudit(toolPage);
for (const title of COUNTING_FINDINGS) assert(before.issues.includes(title), `sample run no longer shows "${title}"`);
const countingInTop = before.top.filter((t) => COUNTING_FINDINGS.includes(t)).length;
assert(before.top.length === 3 && countingInTop === 2, `frame 2 says two of the top three findings come from the Purchase row; the run shows ${JSON.stringify(before.top)}`);
// Score card down to "N/M checks passed" (the buttons below it are left out).
const scoreSection = await box(toolPage.locator('main section').first());
const passedLine = await box(toolPage.locator('main section').first().getByText(/checks passed/));
const scoreShot = await shot(toolPage, 'score', { ...scoreSection, height: passedLine.y + passedLine.height + 20 - scoreSection.y });
const tiles = toolPage.locator('div.grid.grid-cols-2.flex-1').first();
assert((await tiles.innerText()).includes('Passed'), 'severity count tiles not found');
const tilesShot = await shot(toolPage, 'tiles', await box(tiles));
const results = await box(toolPage.locator('#results'));
const findingsShot = await shot(toolPage, 'findings', {
  x: results.x - 12,
  y: results.y - 12,
  width: results.width + 24,
  height: Math.min(results.height + 12, (RIGHT_H * (results.width + 24)) / RIGHT_W),
});
const wcmCard = toolPage.locator('#results article', { has: toolPage.getByRole('heading', { name: 'Wrong Counting Method', exact: true }) });
const wcmCardShot = await shot(toolPage, 'finding-card', await box(wcmCard));
const wcmDescription = (await wcmCard.locator('p').first().innerText()).trim();

// Frame 3: the explainer behind that card's Learn more link.
const learnHref = await wcmCard.getByRole('link', { name: /Learn more/ }).getAttribute('href');
assert(learnHref?.endsWith(`/checks/${EXPLAINER_ID}`), `Learn more on the card points at ${learnHref}`);
const explainerPage = await openPage(520);
await explainerPage.goto(`${BASE}/checks/${EXPLAINER_ID}`);
await explainerPage.evaluate(() => document.fonts.ready);
const explainerTitle = (await explainerPage.locator('h1').innerText()).trim();
const tldr = (await explainerPage.getByLabel('TL;DR').innerText()).replace(/^TL;DR\s*/, '').trim();
for (const phrase of ['Google recommends "Every" for sales', 'the second purchase is dropped']) {
  assert(tldr.includes(phrase), `explainer TL;DR no longer says: ${phrase}`);
}
const references = (await explainerPage.locator('#references').innerText()).trim();
assert(references.includes('Google Ads.'), 'explainer no longer cites Google Ads documentation');
assert(await explainerPage.locator('#cite').count(), 'explainer has no client-report citation section');
// Right card: the chip and title, then as many How To Fix steps as fit.
const headBox = await box(explainerPage.locator('header:has(h1)'));
const h1Box = await box(explainerPage.locator('h1'));
const explainerHeadShot = await shot(explainerPage, 'explainer-head', {
  x: headBox.x - 12,
  y: headBox.y - 12,
  width: headBox.width + 24,
  height: h1Box.y + h1Box.height - headBox.y + 20,
});
const fixSection = await box(explainerPage.locator('#fix'));
const steps = explainerPage.locator('#fix ol li');
const stepTexts = (await steps.allInnerTexts()).map((t) => t.replace(/\s+/g, ' ').trim());
const fixRoom = (RIGHT_H * (fixSection.width + 24)) / RIGHT_W - explainerHeadShot.height;
let fixBottom = fixSection.y;
let stepsShown = 0;
for (let i = 0; i < stepTexts.length; i++) {
  const s = await box(steps.nth(i));
  if (s.y + s.height + 16 - fixSection.y > fixRoom) break;
  fixBottom = s.y + s.height + 16;
  stepsShown = i + 1;
}
assert(stepsShown >= 3, `only ${stepsShown} fix steps fit in the frame`);
const explainerFixShot = await shot(explainerPage, 'explainer-fix', {
  x: fixSection.x - 12,
  y: fixSection.y - 4,
  width: fixSection.width + 24,
  height: fixBottom - fixSection.y + 4,
});

// Frame 4: real re-run on the fixed copy, uploaded through the file input.
const fixPage = await openPage(NARROW);
await fixPage.goto(`${BASE}/tools/${TOOL}`);
await fixPage.locator('input[type=file]').first().setInputFiles(fixedPath);
await fixPage.getByRole('button', { name: /Skip/ }).click(); // same as the sample path: no audit context
await waitForScore(fixPage);
const after = await readAudit(fixPage);
for (const title of COUNTING_FINDINGS) assert(!after.issues.includes(title), `fixed run still shows "${title}"`);
const stillOpen = before.issues.filter((t) => after.issues.includes(t));
const gone = before.issues.filter((t) => !after.issues.includes(t));
const newIssues = after.issues.filter((t) => !before.issues.includes(t));
assert(newIssues.length === 0, `fixed run added findings: ${newIssues.join(', ')}`);
const fixedScoreBox = await box(fixPage.locator('main section').first());
const fixedResults = await box(fixPage.locator('#results'));
const fixedScoreShot = await shot(fixPage, 'score-fixed', fixedScoreBox);
const fixedFindingsShot = await shot(fixPage, 'findings-fixed', {
  x: fixedResults.x - 12,
  y: fixedResults.y - 12,
  width: fixedResults.width + 24,
  height: Math.min(fixedResults.height + 12, (RIGHT_H * (fixedResults.width + 24)) / RIGHT_W - fixedScoreBox.height - 24),
});

await browser.close();

const run = {
  capturedAt: new Date().toISOString(),
  baseUrl: BASE,
  tool: TOOL,
  toolName,
  checkCountLine,
  sample: SAMPLE_REL,
  fix: { row: rows[badRow][0], column: 'Count', from: 'One', to: 'Every', file: FIXED_NAME },
  before,
  after,
  gone,
  stillOpen,
  findingCard: { title: 'Wrong Counting Method', description: wcmDescription, learnMore: learnHref },
  explainer: { id: EXPLAINER_ID, title: explainerTitle, tldr, references, stepsShown: stepTexts.slice(0, stepsShown) },
};
fs.writeFileSync(path.join(HERE, 'run.json'), JSON.stringify(run, null, 2) + '\n');

// ── Frames ───────────────────────────────────────────────────────────────────
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const ELIDE = new Set(['Attribution model', 'Click-through conversion window', 'View-through conversion window']);
const keep = header.map((h) => !ELIDE.has(h));

function csvCard({ label, file, data, mark, cls, foot }) {
  const lines = data.map((r, i) => {
    const cells = [];
    let elided = false;
    r.forEach((c, j) => {
      if (keep[j]) cells.push(i === mark && j === COUNT ? `<em>${esc(c)}</em>` : esc(c));
      else if (!elided) { cells.push('…'); elided = true; }
    });
    const kind = i === 0 ? 'hdr' : i === mark ? cls : '';
    return `<span class="l ${kind}"><span class="n">${i + 1}</span>${cells.join(',')}</span>`;
  });
  return `<div class="card">
    <div class="card-head"><b>${esc(label)}</b> · ${esc(file)}</div>
    <pre class="csv">${lines.join('')}</pre>
    <div class="card-foot">${foot}</div>
  </div>`;
}

const img = (s, extra = '') => `<img class="shot" src="${s.file}" alt=""${extra}>`;
// Scale a tall shot down to the card's height instead of cropping it.
const fitImg = (s) => {
  const w = Math.min(RIGHT_W, Math.floor((RIGHT_H * s.width) / s.height));
  return `<img class="shot" src="${s.file}" alt="" style="width:${w}px;margin:0 auto">`;
};
const productCard = (url, inner) => `<div class="card"><div class="card-head">${esc(url)}</div><div class="clip">${inner}</div></div>`;
const top = (n, headline) => `<div class="top"><span class="step">${n} / 4</span><span class="headline">${headline}</span></div>`;
const elidedNote = 'Columns 5–7 (attribution model, click and view windows) shortened to … here; they are unchanged.';
const b = (x) => `<b>${esc(x)}</b>`;
const purchase = rows[badRow];

const frames = [
  // 1 / 4 — the bundled input.
  top(1, `Bundled sample: a Google Ads conversion export where <code>Purchase</code> counts <code>One</code>.`) +
    `<div class="cols"><div class="left">` +
    csvCard({ label: 'SAMPLE', file: SAMPLE_REL, data: rows, mark: badRow, cls: 'bad', foot: elidedNote }) +
    `<p class="note">${b(enabledCount)} enabled conversion actions. <strong>${esc(purchase[0])}</strong> is in the ${esc(purchase[CATEGORY])} category with a value of ${b(purchase[header.indexOf('Value')])}, and counts ${b('One')} per ad click.</p>` +
    `<p class="note">One click on <strong>Try with sample data</strong> in the ${esc(toolName)} audits this file in the browser.</p>` +
    `</div><div class="right">${productCard(`/tools/${TOOL}`, fitImg(toolShot))}</div></div>`,

  // 2 / 4 — the real result.
  top(2, `Result: ${before.score}/100, ${esc(before.label.toLowerCase())}, with ${before.passed} of ${before.total} checks passed.`) +
    `<div class="cols"><div class="left">` +
    `<div class="card">${img(scoreShot)}</div>` +
    `<div class="card" style="padding:6px">${img(tilesShot)}</div>` +
    `<p class="note">Two of the three most critical findings trace back to the one <strong>Purchase</strong> row counting <strong>One</strong>.</p>` +
    `</div><div class="right">${productCard('/audit · Most critical findings', img(findingsShot))}</div></div>`,

  // 3 / 4 — the explainer.
  top(3, `Learn more on <strong>${esc(run.findingCard.title)}</strong> opens why it matters and how to fix it.`) +
    `<div class="cols"><div class="left">` +
    `<div class="card">${img(wcmCardShot)}</div>` +
    `<p class="note">Google recommends ${b('Every')} for sales. With ${b('One')}, a second purchase after the same ad click is dropped, so conversions and revenue are undercounted.</p>` +
    `<p class="note">Every finding links to its <strong>/checks</strong> page. This one cites Google Ads Help and includes a citation paragraph for the client report.</p>` +
    `</div><div class="right">${productCard(`/checks/${EXPLAINER_ID}`, img(explainerHeadShot) + img(explainerFixShot))}</div></div>`,

  // 4 / 4 — the confirmed re-run.
  top(4, `Re-run on a copy with one cell changed: ${after.score}/100, ${esc(after.label.toLowerCase())}.`) +
    `<div class="cols"><div class="left">` +
    csvCard({ label: 'FIXED COPY', file: FIXED_NAME, data: fixedRows, mark: badRow, cls: 'good', foot: `A copy of the sample with one cell changed: row ${badRow + 1}, Count, One → Every. ${elidedNote}` }) +
    `<p class="note">Score ${b(before.score)} → ${b(after.score)}, checks passed ${b(before.passed)} → ${b(after.passed)} of ${after.total}, ${b(before.critical)} → ${b(after.critical)} critical.</p>` +
    `<div class="card cleared"><div class="card-head"><b>CLEARED</b> · findings in the first run, gone in the re-run</div><ul>${gone.map((t) => `<li><span class="chip">Cleared</span>${esc(t)}</li>`).join('')}</ul></div>` +
    `<p class="note">Still open: <strong>${esc(stillOpen[0])}</strong> and ${b(stillOpen.length - 1)} more.</p>` +
    `</div><div class="right">${productCard('/audit · uploaded fixed copy', img(fixedScoreShot) + img(fixedFindingsShot, ' style="margin-top:12px"'))}</div></div>`,
];

const framePage = await (await chromium.launch()).newPage({ viewport: { width: 880, height: 640 }, deviceScaleFactor: 1 });
await framePage.goto(pathToFileURL(path.join(HERE, 'frame.html')).href);
for (const [i, html] of frames.entries()) {
  await framePage.evaluate((h) => { document.getElementById('stage').innerHTML = h; }, html);
  await framePage.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.images].map((im) => (im.complete ? null : new Promise((r) => { im.onload = im.onerror = r; }))));
  });
  await framePage.screenshot({ path: path.join(FRAMES, `frame-${i + 1}.png`) });
}
await framePage.context().browser().close();

console.log(JSON.stringify({ before: { score: before.score, passed: before.passed, total: before.total }, after: { score: after.score, passed: after.passed }, gone }, null, 2));
console.log(`frames: ${FRAMES}`);
