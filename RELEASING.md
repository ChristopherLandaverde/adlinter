# Releasing AdLint

This checklist exists to preserve context between contributor and AI-agent sessions: `progress.md` is the durable project log, `README.md` is the user-facing source of truth, and CI is the merge gate that keeps releases reproducible.

## Before merging a feature PR

- Tests pass locally: `npm test`
- Production build passes: `npm run build`
- `README.md` reflects any new tool, check count change, or user-facing feature
- If the PR adds a new check, the Check Coverage table is updated

## When tagging a new version

- Bump the version label (`v1.x`) in commit message style
- Add a new entry to the TOP of `progress.md` following the existing format:
  - `## vX.Y — Title`
  - `**Commit:** <sha>`
  - Summary paragraph
  - Sub-sections as relevant: parser, checks, UI, tests, tooling, etc.
- List every new file in the entry
- List every modified file in the entry only if behavior changed

## CI

- `.github/workflows/ci.yml` runs on PR and push to `main`
- CI runs `npm ci`, `npm test -- --ci`, and `npm run build` on Node 20
- If CI fails, fix forward. Do not bypass.

## For AI agents (Claude, Codex)

- Read `progress.md` and `README.md` at the start of every session before making changes
- After any user-facing change, update `README.md` and add a `progress.md` entry in the same PR
- Architecture decisions go in `progress.md`, not in commit messages alone
- Codex implements code changes; Claude does architecture, review, and planning
