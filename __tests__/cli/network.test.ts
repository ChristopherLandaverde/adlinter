/**
 * @jest-environment node
 */
import { spawn } from 'node:child_process';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { mkdtempSync, readdirSync, readFileSync, statSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { disableMetadataServerProbe } from '../../cli/live/auth';
import { runCli } from '../../cli/run';
import { fixture, ROOT, testDeps } from './helpers';

describe('no network beyond Google APIs', () => {
  // Runs the real CLI in a child process: inside jest, gaxios cannot make its
  // dynamic import, so the library's probe would fail before any request and
  // the test could not tell a probe from no probe.
  it('ADC with no credentials fails without probing the metadata server (real process)', async () => {
    // A stand-in metadata server: a probe from google-auth-library lands here.
    const hits: string[] = [];
    const server = http.createServer((req, res) => {
      hits.push(req.url ?? '');
      res.writeHead(404).end();
    });
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
    const { port } = server.address() as AddressInfo;
    try {
      const empty = mkdtempSync(path.join(os.tmpdir(), 'adlint-noadc-'));
      const env = {
        PATH: process.env.PATH,
        HOME: empty,
        CLOUDSDK_CONFIG: empty,
        GCE_METADATA_HOST: `127.0.0.1:${port}`,
      } as unknown as NodeJS.ProcessEnv;
      const child = spawn(
        process.execPath,
        [path.join(ROOT, 'cli/bin.cjs'), 'audit', '--gtm-container', 'accounts/6000000001/containers/7000000001'],
        { cwd: ROOT, env }
      );
      let stderr = '';
      child.stderr.on('data', d => (stderr += d));
      const code = await new Promise<number | null>(resolve => child.on('close', resolve));

      expect(code).toBe(2);
      expect(stderr).toContain('credential error: Could not get Tag Manager credentials');
      expect(hits).toEqual([]);
    } finally {
      await new Promise(resolve => server.close(resolve));
    }
  }, 60000);

  it('adlint-mcp audit_live_container with no credentials fails without probing the metadata server (real process)', async () => {
    const hits: string[] = [];
    const server = http.createServer((req, res) => {
      hits.push(req.url ?? '');
      res.writeHead(404).end();
    });
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
    const { port } = server.address() as AddressInfo;
    const empty = mkdtempSync(path.join(os.tmpdir(), 'adlint-mcp-noadc-'));
    const client = new Client({ name: 'adlint-test', version: '0.0.0' });
    try {
      await client.connect(
        new StdioClientTransport({
          command: process.execPath,
          args: [path.join(ROOT, 'cli/mcp/bin.cjs')],
          cwd: ROOT,
          env: {
            PATH: process.env.PATH ?? '',
            HOME: empty,
            CLOUDSDK_CONFIG: empty,
            GCE_METADATA_HOST: `127.0.0.1:${port}`,
          },
          stderr: 'pipe',
        })
      );
      const res = (await client.callTool({
        name: 'audit_live_container',
        arguments: { container: 'accounts/6000000001/containers/7000000001' },
      })) as CallToolResult;
      expect(res.isError).toBe(true);
      const { error } = JSON.parse((res.content[0] as { text: string }).text);
      expect(error.kind).toBe('credentials');
      expect(error.message).toContain('Could not get Tag Manager credentials');
      expect(hits).toEqual([]);
    } finally {
      await client.close();
      await new Promise(resolve => server.close(resolve));
    }
  }, 60000);

  it('respects a METADATA_SERVER_DETECTION the user set', () => {
    const env: Record<string, string | undefined> = { METADATA_SERVER_DETECTION: 'assume-present' };
    disableMetadataServerProbe(env);
    expect(env.METADATA_SERVER_DETECTION).toBe('assume-present');
    const unset: Record<string, string | undefined> = {};
    disableMetadataServerProbe(unset);
    expect(unset.METADATA_SERVER_DETECTION).toBe('none');
  });

  it('only cli/live/http.ts sends requests; nothing else in cli/ calls fetch or opens sockets', () => {
    const files: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const p = path.join(dir, name);
        if (statSync(p).isDirectory()) walk(p);
        else if (/\.(ts|cjs|mjs|js)$/.test(name)) files.push(p);
      }
    };
    walk(path.join(ROOT, 'cli'));
    expect(files.length).toBeGreaterThan(5);
    // The MCP server lives under cli/ so this scan covers it: it reaches the
    // network only through the live-mode modules, i.e. cli/live/http.ts.
    for (const f of ['cli/mcp/server.ts', 'cli/mcp/stdio.ts', 'cli/mcp/bin.cjs']) {
      expect(files).toContain(path.join(ROOT, f));
    }

    for (const file of files) {
      const rel = path.relative(ROOT, file);
      const src = readFileSync(file, 'utf8');
      // Bare `fetch(` calls: only the default dependency in run.ts, which
      // live mode hands to cli/live/http.ts (that file calls fetchImpl).
      const fetchCalls = src.match(/(^|[^\w.])fetch\s*\(/gm) ?? [];
      if (rel === path.join('cli', 'run.ts')) expect(fetchCalls).toHaveLength(1);
      else expect({ rel, fetchCalls }).toEqual({ rel, fetchCalls: [] });
      expect(src).not.toMatch(/from ['"](node:)?(http|https|net|tls|dgram)['"]/);
      expect(src).not.toMatch(/require\(['"](node:)?(http|https|net|tls|dgram)['"]\)/);
    }
  });
});

describe('empty flag values', () => {
  it.each([
    ['--gtm-export', ''],
    ['--ads-csv', '  '],
    ['--gtm-container', ''],
    ['--ads-customer', ''],
    ['--format', ''],
  ])('%s %j exits 2', async (flag, value) => {
    const argv = ['audit', flag, value];
    if (flag === '--format') argv.push('--gtm-export', fixture('gtm-container-clean.json'));
    const res = await runCli(argv, testDeps());
    expect(res.exitCode).toBe(2);
    expect(res.stdout).toBe('');
    expect(res.stderr).toContain(`${flag} needs a value`);
  });
});
