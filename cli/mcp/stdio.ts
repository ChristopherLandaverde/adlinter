// Entry point for adlint-mcp over stdio: `node cli/mcp/bin.cjs` (or
// `npx tsx cli/mcp/stdio.ts`). Run from source; not published.

// First import: console output goes to stderr (bin.cjs loads it before tsx;
// this covers `npm run adlint-mcp`, which starts here).
import './console.cjs';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createServer } from './server';

createServer()
  .connect(new StdioServerTransport())
  .catch(e => {
    process.stderr.write(`adlint-mcp: ${e instanceof Error ? e.message : String(e)}\n`);
    process.exitCode = 1;
  });
