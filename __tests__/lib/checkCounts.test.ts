/**
 * Guards every user-visible check count (#46). Counts are derived from the
 * generated check registry; these tests fail when:
 *  - a derived tool count stops matching what the audit engine actually runs
 *    (e.g. a check was added and the registry was not regenerated),
 *  - copy hardcodes a check count instead of deriving it,
 *  - public/llms.txt (a static file) drifts from the registry.
 */
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';
import { tools, type ToolFileSlot } from '@/lib/tools';
import { runAudit } from '@/lib/auditEngine';
import { checkRegistry } from '@/lib/checks/registry.generated';
import { checkCountForModules, checkSourceCount, totalCheckCount } from '@/lib/checks/counts';
import { explainerSources } from '@/lib/checks/explainers';
import { getSourceContent, sourceCheckCount } from '@/lib/checks/sourceContent';
import { parseGTMJSON } from '@/lib/parsers/gtmParser';
import { parseAdsCSV } from '@/lib/parsers/adsParser';
import { parseAdsReportCSV } from '@/lib/parsers/adsReportParser';
import { parseMetaPixelCSV } from '@/lib/parsers/metaPixelParser';
import { parseTikTokPixelCSV } from '@/lib/parsers/tiktokPixelParser';
import { parseLinkedInInsightCSV } from '@/lib/parsers/linkedinInsightParser';
import { parsePinterestCSV } from '@/lib/parsers/pinterestParser';
import { parseTwitterCSV } from '@/lib/parsers/twitterParser';
import { parseSnapchatCSV } from '@/lib/parsers/snapchatParser';
import type { AuditResults } from '@/lib/types';

const root = join(__dirname, '..', '..');

const parsers: Record<ToolFileSlot['parser'], (text: string) => unknown> = {
  gtm: parseGTMJSON,
  ads: parseAdsCSV,
  report: parseAdsReportCSV,
  meta: parseMetaPixelCSV,
  tiktok: parseTikTokPixelCSV,
  linkedin: parseLinkedInInsightCSV,
  pinterest: parsePinterestCSV,
  twitter: parseTwitterCSV,
  snapchat: parseSnapchatCSV,
};

const resultKeys = ['gtm', 'ads', 'cross', 'report', 'meta', 'tiktok', 'linkedin', 'pinterest', 'twitter', 'snapchat'] as const;

/* eslint-disable @typescript-eslint/no-explicit-any */
function runToolOnSamples(slug: string): AuditResults {
  const tool = tools.find((t) => t.slug === slug)!;
  const data: Partial<Record<ToolFileSlot['parser'], any>> = {};
  for (const sample of tool.samples ?? []) {
    const slot = tool.fileSlots.find((s) => s.key === sample.slotKey)!;
    data[slot.parser] = parsers[slot.parser](readFileSync(join(root, 'public', sample.url), 'utf8'));
  }
  return runAudit(
    data.gtm ?? null,
    data.ads ?? null,
    undefined,
    data.report,
    data.meta,
    data.tiktok,
    data.linkedin,
    data.pinterest,
    data.twitter,
    data.snapchat
  );
}
/* eslint-enable @typescript-eslint/no-explicit-any */

describe('tool check counts', () => {
  it.each(tools.map((t) => t.slug))('%s: derived count equals the checks the engine runs', (slug) => {
    const tool = tools.find((t) => t.slug === slug)!;
    const results = runToolOnSamples(slug);
    const emitted = resultKeys.flatMap((key) => results[key]);

    expect(tool.checkCount).toBe(checkCountForModules(tool.checkModules));
    expect(emitted).toHaveLength(tool.checkCount);

    // Every emitted ID is a registry entry from one of the tool's check files.
    for (const check of emitted) {
      const entry = checkRegistry.find((e) => e.id === check.id);
      expect(entry).toBeDefined();
      expect(entry!.modules.some((m) => (tool.checkModules as string[]).includes(m))).toBe(true);
    }
  });

  it('every tool has sample data, so the engine check above covers it', () => {
    for (const tool of tools) expect(tool.samples?.length).toBeGreaterThan(0);
  });
});

describe('totals', () => {
  it('total and source counts come from the registry', () => {
    expect(totalCheckCount).toBe(new Set(checkRegistry.map((e) => e.id)).size);
    expect(checkSourceCount).toBe(explainerSources.length);
    const perSource = explainerSources.reduce((sum, s) => sum + sourceCheckCount(s.key), 0);
    expect(perSource).toBe(totalCheckCount);
  });

  it('source page copy has every {count} filled with the registry count', () => {
    for (const { key } of explainerSources) {
      const content = getSourceContent(key);
      expect(content.tagline).not.toContain('{count}');
      expect(content.intro).not.toContain('{count}');
      expect(content.tagline).toMatch(new RegExp(`^${sourceCheckCount(key)} `));
    }
  });

  it('every source page with a tool CTA points at a real tool', () => {
    for (const { key } of explainerSources) {
      const slug = getSourceContent(key).toolSlug;
      if (slug) expect(tools.map((t) => t.slug)).toContain(slug);
    }
  });
});

describe('public/llms.txt', () => {
  const llms = readFileSync(join(root, 'public', 'llms.txt'), 'utf8');

  it('states the registry total and source count', () => {
    expect(llms).toContain(`${totalCheckCount} checks across ${checkSourceCount} sources`);
    expect(llms).toContain(`all ${totalCheckCount} audit findings`);
  });

  it('states each source page count', () => {
    for (const { key } of explainerSources) {
      const line = llms.split('\n').find((l) => l.includes(`/sources/${key})`));
      expect(line).toBeDefined();
      expect(line).toMatch(new RegExp(`\\): ${sourceCheckCount(key)} `));
    }
  });

  it('states each tool count and links a real tool slug', () => {
    const toolLines = llms.split('\n').filter((l) => l.includes('adlint.dev/tools/'));
    expect(toolLines).toHaveLength(tools.length);
    for (const line of toolLines) {
      const [, slug, count] = line.match(/\/tools\/([\w-]+)\): (\d+) checks/) ?? [];
      const tool = tools.find((t) => t.slug === slug);
      expect(tool).toBeDefined();
      expect(Number(count)).toBe(tool!.checkCount);
    }
  });
});

describe('no hardcoded check counts in source', () => {
  // Explainer prose is editorial content about individual checks, and the
  // registry is generated; everything else must derive counts.
  const skip = new Set(['lib/checks/explainers.ts', 'lib/checks/registry.generated.ts']);

  function sourceFiles(dir: string): string[] {
    return readdirSync(dir).flatMap((name) => {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) return sourceFiles(path);
      return /\.(ts|tsx)$/.test(name) ? [path] : [];
    });
  }

  it('finds no literal "N checks" or spelled-out count in app, components or lib', () => {
    const offenders: string[] = [];
    const digit = /(?<![\w}$])\d+\+? (statistical )?(checks|findings|patterns)\b/g;
    const word = /\b(ten|eleven|twelve|fifteen|twenty|thirty|forty|fifty)[\w-]* (statistical )?(checks|findings)\b/gi;
    for (const dir of ['app', 'components', 'lib']) {
      for (const file of sourceFiles(join(root, dir))) {
        const rel = relative(root, file);
        if (skip.has(rel)) continue;
        const text = readFileSync(file, 'utf8');
        for (const m of [...text.matchAll(digit), ...text.matchAll(word)]) offenders.push(`${rel}: "${m[0]}"`);
      }
    }
    expect(offenders).toEqual([]);
  });
});
