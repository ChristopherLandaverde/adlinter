#!/usr/bin/env node
// `adlint-mcp` bin: runs the MCP server from source through tsx, over stdio.
// Not published. Works from any directory, because tsx resolves from here.
/* eslint-disable @typescript-eslint/no-require-imports -- CommonJS shim */
require('./console.cjs'); // before anything else can write to stdout
require('tsx/cjs');
require('./stdio.ts');
