# Amazon rebuild: engineering contract

This file is the authoritative engineering contract for this repository. Where another document conflicts with it, this file wins; raise the conflict instead of silently choosing.

## Product

- We are rebuilding the Amazon shopping experience. The goal is **not** a superficial visual clone.
- The product must demonstrate strong product judgment, UX thinking, engineering quality and shipping speed.
- Reconstruct what Amazon does well; deliberately improve what it does badly. Every deviation from observed Amazon behaviour is recorded in `docs/product-decisions.md` with a rationale. Do not change things just to be different.
- Phase 0 (planning, recon, architecture, environment) precedes any implementation. Do not build product features until Phase 1 is explicitly started.

## UI

- Use **shadcn/ui** wherever an appropriate primitive exists. Prefer existing shadcn primitives over custom recreations.
- Keep spacing, typography, states, interaction patterns, accessibility and responsive behaviour consistent. Tokens live in one place (`docs/recon/design-tokens.md` defines them; code implements them as CSS variables / Tailwind theme).
- Do not introduce arbitrary UI libraries when shadcn/ui is sufficient.
- If a required shadcn component is missing, **identify it and ask before inventing a replacement** when the component materially affects the design.
- Every interactive component needs default, hover, focus-visible, active, disabled, loading and error states where applicable. Keyboard and screen-reader operation are part of "done".
- Design quality bar: Impeccable (`.claude/skills/impeccable`). Workflow: critique, direction, implement, audit, browser verification, polish.

## Source reconstruction

- `recon/` is supplied Amazon source material (saved pages, CSS, images, scripts). It is **read-only reference**: never modify it, never commit it (it is git-ignored, 90 MB, and contains a logged-in session's identifiers and tokens).
- Findings from `recon/` live in `docs/recon/`. Read those documents first; do not re-derive structure that is already recorded. Anything not established there is `UNKNOWN / REQUIRES VALIDATION`.
- More exact source (HTML, CSS, images, SVGs, fonts, icons, page-specific assets) may be supplied through Site Peel. When supplied, use it as the reconstruction reference instead of spending tokens rediscovering structure.
- Keep **source reconstruction** (what Amazon does) separate from **product improvement** (what we chose to do better).
- Do not copy implementation details that are unnecessary. Do not copy Amazon's proprietary JavaScript/backend behaviour, tracking, ad scripts, A/B (weblab) machinery or session tokens. Do not introduce legal, security or privacy issues. Rebuild the visual and product intent cleanly.
- Never put personal data from `recon/` (names, customer IDs, tokens, addresses) into docs, code, fixtures or commits.

## Engineering

- TypeScript with strict mode; no `any` without a written reason.
- Component-driven architecture; reusable primitives; no unnecessary abstraction; no premature optimisation.
- Server/client boundaries are deliberate. Default to server components; `"use client"` only where interactivity requires it.
- Validate at system boundaries (route handlers, server actions, form input, persisted data) with a schema library; trust internal types.
- Every data-driven view has explicit loading, error and empty states.
- Accessibility and responsive behaviour (mobile first, then tablet, desktop) are requirements, not polish.
- Business logic (pricing, cart totals, order state, filtering) is pure, isolated and testable.

## Testing

Adopt test-driven development where practical. Every major feature has:

1. requirement
2. acceptance criteria
3. implementation
4. automated test
5. browser/manual verification
6. regression check

"It renders" is not validation. See `docs/testing-strategy.md`.

## Capture system (do not weaken)

Every prompt and final response is captured automatically to `.agent-logs/` by hooks in `.claude/settings.json` running `.claude/hooks/capture.js`. Do not disable, replace or weaken these hooks. Do not hand-edit `.agent-logs/`. When adding hooks or tooling to `.claude/settings.json`, merge; never overwrite the capture entries. `CAPTURE-TEST.md` records the verification.

## Git

- Commit meaningful, scoped changes; no huge mixed commits. No secrets, generated junk, or `recon/`.
- Do not push, create remotes or deploy without being asked.

## Reference documents

- `docs/recon/README.md`: index of reconstruction findings
- `docs/product-decisions.md`, `docs/architecture.md`, `docs/testing-strategy.md`, `docs/roadmap.md`
- `PRODUCT.md`: durable product context for Impeccable

## Agent skills

### Issue tracker

Issues live in GitHub Issues via the `gh` CLI. No git remote is configured yet; see `docs/agents/issue-tracker.md`.

### Triage labels

Default five-label vocabulary (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `GLOSSARY.md` and `docs/adr/` at the repo root, created lazily. See `docs/agents/domain.md`.
