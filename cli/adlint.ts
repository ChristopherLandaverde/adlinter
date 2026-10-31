// Entry point: `npx tsx cli/adlint.ts audit ...`, `npm run adlint -- audit ...`,
// or the `adlint` bin (cli/bin.cjs) after `npm link`.

import { defaultDeps, runCli } from './run';

runCli(process.argv.slice(2), defaultDeps(process.env)).then(
  ({ exitCode, stdout, stderr }) => {
    if (stdout) process.stdout.write(stdout);
    if (stderr) process.stderr.write(stderr);
    process.exitCode = exitCode;
  },
  e => {
    process.stderr.write(`adlint: ${e instanceof Error ? e.message : String(e)}\n`);
    process.exitCode = 2;
  }
);
