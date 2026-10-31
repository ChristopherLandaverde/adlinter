// stdout carries the MCP protocol only. Loaded first by bin.cjs and
// stdio.ts: every console method that would write to stdout (log, info,
// debug, dir, dirxml, table, group, ...) writes to stderr instead.
/* eslint-disable @typescript-eslint/no-require-imports -- CommonJS shim */
const { Console } = require('node:console');

const toStderr = new Console({ stdout: process.stderr, stderr: process.stderr });
for (const method of Object.keys(toStderr)) {
  if (typeof toStderr[method] === 'function') console[method] = toStderr[method].bind(toStderr);
}
