#!/usr/bin/env node
// `adlint` bin: runs the TypeScript CLI from source through tsx. Not published.
/* eslint-disable @typescript-eslint/no-require-imports -- CommonJS shim */
require('tsx/cjs');
require('./adlint.ts');
