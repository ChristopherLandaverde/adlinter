/**
 * @jest-environment node
 */
import { readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { getExplainerOrStub } from '../../lib/checks/explainers';
import { checkRegistry } from '../../lib/checks/registry.generated';
import { createServer } from '../../cli/mcp/server';
import { runCli, type CliDeps } from '../../cli/run';
import { FAKE, fixture, fixtureFetch, liveRoutes, ROOT, testDeps } from './helpers';

const SAMPLE_GTM = path.join(ROOT, 'public/samples/gtm-container-sample.json');
const SAMPLE_ADS = path.join(ROOT, 'public/samples/ads-conversions-sample.csv');

async function connect(deps: CliDeps = testDeps()) {
  const server = createServer(deps);
  const client = new Client({ name: 'adlint-test', version: '0.0.0' });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  return {
    client,
    call: (name: string, args: Record<string, unknown>) =>
      client.callTool({ name, arguments: args }) as Promise<CallToolResult>,
    close: () => client.close(),
  };
}

const text = (r: CallToolResult) => (r.content[0] as { type: 'text'; text: string }).text;
const errorOf = (r: CallToolResult) => {
  expect(r.isError).toBe(true);
  return JSON.parse(text(r)).error as { kind: string; message: string };
};

describe('adlint-mcp over the in-memory transport', () => {
  it('lists four read-only tools', async () => {
    const { client, close } = await connect();
    const { tools } = await client.listTools();
    expect(tools.map(t => t.name).sort()).toEqual(['audit_export', 'audit_live_container', 'explain_check', 'list_checks']);
    for (const t of tools) {
      expect(t.description).toMatch(/^Read-only\./);
      expect(t.annotations).toMatchObject({ readOnlyHint: true, destructiveHint: false });
      expect(t.outputSchema).toBeDefined();
    }
    await close();
  });

  it('audit_export on the bundled samples returns exactly the CLI\'s JSON report', async () => {
    const cli = await runCli(['audit', '--gtm-export', SAMPLE_GTM, '--ads-csv', SAMPLE_ADS], testDeps());
    const { call, close } = await connect();
    const res = await call('audit_export', { gtmExportPath: SAMPLE_GTM, adsCsvPath: SAMPLE_ADS });

    expect(res.isError).toBeFalsy();
    expect(text(res)).toBe(cli.stdout.trimEnd());
    expect(res.structuredContent).toEqual(JSON.parse(cli.stdout));
    const report = res.structuredContent as { schemaVersion: string; findings: Array<{ evidence: { observed: string } }> };
    expect(report.schemaVersion).toBe('1');
    expect(report.findings.length).toBeGreaterThan(0);
    for (const f of report.findings) expect(typeof f.evidence.observed).toBe('string');
    await close();
  });

  it('audit_export takes the inputs as text too, with the same findings and numbers', async () => {
    const { call, close } = await connect();
    const byPath = await call('audit_export', { gtmExportPath: SAMPLE_GTM, adsCsvPath: SAMPLE_ADS });
    const inline = await call('audit_export', {
      gtmExportJson: readFileSync(SAMPLE_GTM, 'utf8'),
      adsCsv: readFileSync(SAMPLE_ADS, 'utf8'),
    });
    const a = byPath.structuredContent as Record<string, unknown>;
    const b = inline.structuredContent as Record<string, unknown>;
    expect(b.findings).toEqual(a.findings);
    expect(b.summary).toEqual(a.summary);
    expect(b.source).toEqual({ mode: 'file', gtmExport: '(inline gtmExportJson)', adsCsv: '(inline adsCsv)' });
    await close();
  });

  it('only reads file paths: the input files are unchanged and the server source has no write call', async () => {
    const before = [SAMPLE_GTM, SAMPLE_ADS].map(p => ({ m: statSync(p).mtimeMs, c: readFileSync(p, 'utf8') }));
    const reads: string[] = [];
    const { call, close } = await connect(
      testDeps({ readFile: async p => (reads.push(p), readFileSync(p, 'utf8')) })
    );
    await call('audit_export', { gtmExportPath: SAMPLE_GTM, adsCsvPath: SAMPLE_ADS });
    expect(reads).toEqual([SAMPLE_GTM, SAMPLE_ADS]);
    const after = [SAMPLE_GTM, SAMPLE_ADS].map(p => ({ m: statSync(p).mtimeMs, c: readFileSync(p, 'utf8') }));
    expect(after).toEqual(before);

    for (const f of ['server.ts', 'stdio.ts', 'bin.cjs']) {
      const src = readFileSync(path.join(ROOT, 'cli/mcp', f), 'utf8');
      expect(src).not.toMatch(/\b(writeFile|appendFile|createWriteStream|mkdir|rm|unlink|rename|copyFile)\w*\s*\(/);
      expect(src).not.toMatch(/from ['"](node:)?fs(\/promises)?['"]/);
    }
    await close();
  });

  it('audit_live_container takes the CLI\'s live path against the synthetic fixtures', async () => {
    const cliFetch = fixtureFetch(liveRoutes());
    const cli = await runCli(
      ['audit', '--gtm-container', FAKE.container, '--ads-customer', FAKE.customer],
      testDeps({ fetch: cliFetch.fetchImpl })
    );

    const { fetchImpl, requests } = fixtureFetch(liveRoutes());
    const { call, close } = await connect(testDeps({ fetch: fetchImpl }));
    const res = await call('audit_live_container', { container: FAKE.container, adsCustomerId: FAKE.customer });

    expect(res.isError).toBeFalsy();
    expect(res.structuredContent).toEqual(JSON.parse(cli.stdout));
    expect(requests.map(r => `${r.method} ${r.url}`)).toEqual(cliFetch.requests.map(r => `${r.method} ${r.url}`));
    for (const r of requests) {
      expect(new URL(r.url).hostname).toMatch(/^(tagmanager|googleads)\.googleapis\.com$/);
      expect(r.url).not.toMatch(/mutate/i);
      expect(r.redirect).toBe('error');
    }
    for (const secret of [FAKE.gtmToken, FAKE.adsToken, FAKE.developerToken]) {
      expect(JSON.stringify(res)).not.toContain(secret);
    }
    await close();
  });

  it('list_checks reads the registry and filters it', async () => {
    const { call, close } = await connect();
    const all = (await call('list_checks', {})).structuredContent as { count: number; checks: Array<{ id: string; runByAuditTools: boolean }> };
    expect(all.count).toBe(checkRegistry.length);
    expect(all.checks.map(c => c.id)).toEqual(checkRegistry.map(c => c.id));

    const res = (await call('list_checks', { platform: 'ads', severity: 'critical' })).structuredContent as {
      count: number;
      checks: Array<{ id: string; platform: string; severity: string; runByAuditTools: boolean }>;
    };
    const expected = checkRegistry.filter(c => c.source === 'ads' && c.severity === 'critical');
    expect(res.count).toBe(expected.length);
    expect(res.checks.map(c => c.id)).toEqual(expected.map(c => c.id));
    for (const c of res.checks) expect(c).toMatchObject({ platform: 'ads', severity: 'critical', runByAuditTools: true });

    const meta = (await call('list_checks', { platform: 'meta' })).structuredContent as { checks: Array<{ runByAuditTools: boolean }> };
    expect(meta.checks.every(c => !c.runByAuditTools)).toBe(true);
    await close();
  });

  it('explain_check returns the existing explainer content', async () => {
    const { call, close } = await connect();
    const res = await call('explain_check', { checkId: 'no-primary-conversion' });
    const ex = getExplainerOrStub('no-primary-conversion')!;
    expect(res.structuredContent).toMatchObject({
      id: ex.id,
      name: ex.name,
      severity: ex.severity,
      summary: ex.summary,
      why: ex.why,
      howToFix: ex.howToFix,
      citationTemplate: ex.citationTemplate,
      references: ex.references,
    });
    await close();
  });

  describe('bad input gives a structured tool error, and the server keeps serving', () => {
    it.each([
      ['audit_export', {}, 'usage', 'Nothing to audit'],
      ['audit_export', { gtmExportPath: SAMPLE_GTM, gtmExportJson: '{}' }, 'usage', 'not both'],
      ['audit_export', { gtmExportPath: '/nonexistent/container.json' }, 'usage', 'gtmExportPath: cannot read'],
      ['audit_export', { adsCsvPath: SAMPLE_GTM }, 'usage', 'Missing required columns'],
      ['audit_export', { gtmExportJson: 'not json' }, 'usage', 'Invalid JSON format'],
      ['audit_live_container', { container: 'GTM-TEST001' }, 'usage', 'container must look like accounts/'],
      ['audit_live_container', { container: FAKE.container, adsCustomerId: '12345' }, 'usage', 'adsCustomerId must be a 10-digit'],
      ['explain_check', { checkId: 'no-such-check' }, 'usage', 'Unknown checkId'],
    ])('%s %j', async (tool, args, kind, message) => {
      const { client, call, close } = await connect();
      const err = errorOf(await call(tool, args));
      expect(err.kind).toBe(kind);
      expect(err.message).toContain(message);
      expect((await client.listTools()).tools).toHaveLength(4);
      await close();
    });

    it('missing Google Ads developer token: credentials error before any request', async () => {
      const { fetchImpl, requests } = fixtureFetch(liveRoutes());
      const { call, close } = await connect(testDeps({ fetch: fetchImpl, env: {} }));
      const err = errorOf(await call('audit_live_container', { container: FAKE.container, adsCustomerId: FAKE.customer }));
      expect(err.kind).toBe('credentials');
      expect(err.message).toContain('GOOGLE_ADS_DEVELOPER_TOKEN is not set');
      expect(requests).toHaveLength(0);
      await close();
    });

    it('arguments that fail the input schema', async () => {
      const { client, call, close } = await connect();
      for (const [tool, args] of [
        ['audit_live_container', {}],
        ['audit_live_container', { container: 42 }],
        ['list_checks', { severity: 'fatal' }],
        ['nope', {}],
      ] as const) {
        const res = await call(tool, args);
        expect(res.isError).toBe(true);
        expect(text(res)).toMatch(/validation|not found/i);
      }
      expect((await client.listTools()).tools).toHaveLength(4);
      await close();
    });
  });
});

describe('adlint-mcp bin (real process over stdio)', () => {
  it('starts from source, lists the tools and answers a call', async () => {
    const transport = new StdioClientTransport({
      command: process.execPath,
      args: [path.join(ROOT, 'cli/mcp/bin.cjs')],
      cwd: path.dirname(ROOT),
      env: { PATH: process.env.PATH ?? '' },
      stderr: 'pipe',
    });
    const client = new Client({ name: 'adlint-test', version: '0.0.0' });
    await client.connect(transport);
    try {
      const { tools } = await client.listTools();
      expect(tools).toHaveLength(4);
      const res = (await client.callTool({
        name: 'audit_export',
        arguments: { gtmExportPath: fixture('gtm-container-clean.json') },
      })) as CallToolResult;
      expect((res.structuredContent as { schemaVersion: string }).schemaVersion).toBe('1');
    } finally {
      await client.close();
    }
  }, 60000);
});
