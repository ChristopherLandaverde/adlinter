// Entry point for adlint-mcp over stdio: `node cli/mcp/bin.cjs` (or
// `npx tsx cli/mcp/stdio.ts`). Run from source; not published.

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createServer } from './server';

// stdout carries the MCP protocol only. Send any stray console output to stderr.
for (const method of ['log', 'info', 'debug'] as const) {
  console[method] = (...args: unknown[]) => console.error(...args);
}

createServer()
  .connect(new StdioServerTransport())
  .catch(e => {
    process.stderr.write(`adlint-mcp: ${e instanceof Error ? e.message : String(e)}\n`);
    process.exitCode = 1;
  });
