# gstack

Use the `/browse` skill from gstack for all web browsing. Never use `mcp__claude-in-chrome__*` tools.

Available skills: `/office-hours`, `/plan-ceo-review`, `/plan-eng-review`, `/plan-design-review`, `/design-consultation`, `/design-shotgun`, `/design-html`, `/review`, `/ship`, `/land-and-deploy`, `/canary`, `/benchmark`, `/browse`, `/connect-chrome`, `/qa`, `/qa-only`, `/design-review`, `/setup-browser-cookies`, `/setup-deploy`, `/retro`, `/investigate`, `/document-release`, `/codex`, `/cso`, `/autoplan`, `/plan-devex-review`, `/devex-review`, `/careful`, `/freeze`, `/guard`, `/unfreeze`, `/gstack-upgrade`, `/learn`

## Product

Always read `PRODUCT.md` at the repo root before making product, copy, or scope decisions.
Primary user is agencies/freelancers auditing client work. The wedge is privacy — the
trustable alternative to pasting client creative into ChatGPT. Findings must be
defensible and citable. AdLint is not a generator, not a campaign manager, not a
performance predictor.

## Design System

Always read `DESIGN.md` at the repo root before making any visual or UI decision.
All font choices, colors, spacing, border-radius, motion, and aesthetic direction
are defined there. Do not deviate without explicit user approval.

In QA mode, flag any code that doesn't match DESIGN.md or PRODUCT.md.

## Merging

Standing permission from the owner (Christopher Landaverde, 2026-10-30): agents merge their own pull requests, user-visible ones included, without asking, when all of these hold:
- CI is green on GitHub on the PR's latest commit (`gh pr checks <n>`; local runs don't count).
- An agent other than the author reviewed the diff and posted `Blocking findings: none`.
- The PR merges cleanly into `main`.

Merge with `gh pr merge <n> --squash --delete-branch`, then confirm `main` CI passes. Still stop and ask for: releases, tags, store or package publishing, deploys, repo settings or visibility, spending money, and deleting anything you didn't create. Never push directly to `main` or force-push a shared branch.
