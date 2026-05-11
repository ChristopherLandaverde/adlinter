# gstack

Use the `/browse` skill from gstack for all web browsing. Never use `mcp__claude-in-chrome__*` tools.

Available skills: `/office-hours`, `/plan-ceo-review`, `/plan-eng-review`, `/plan-design-review`, `/design-consultation`, `/design-shotgun`, `/design-html`, `/review`, `/ship`, `/land-and-deploy`, `/canary`, `/benchmark`, `/browse`, `/connect-chrome`, `/qa`, `/qa-only`, `/design-review`, `/setup-browser-cookies`, `/setup-deploy`, `/retro`, `/investigate`, `/document-release`, `/codex`, `/cso`, `/autoplan`, `/plan-devex-review`, `/devex-review`, `/careful`, `/freeze`, `/guard`, `/unfreeze`, `/gstack-upgrade`, `/learn`

## Design System

Always read `DESIGN.md` at the repo root before making any visual or UI decision.
All font choices, colors, spacing, border-radius, motion, and aesthetic direction
are defined there. Do not deviate without explicit user approval.

The current visual state of the site (default-Tailwind-starter look) does NOT match
DESIGN.md. The redesign is in progress. When implementing UI changes:
- Replace Space Grotesk with General Sans (display) + Instrument Sans (body).
- Replace emoji icons (🏷️ 💰 📈 🔍 📘 🎵 💼) with lucide-react line icons.
- Drop the per-tool accent color stripes; use a single `--accent` (#1E3A8A) for CTAs.
- Use warm paper-white `#FAFAF7` for page backgrounds, not cool gray.
- Hero copy sells the diagnostic, not the price.

In QA mode, flag any code that doesn't match DESIGN.md.
