# Amazon rebuild

A rebuild of the Amazon shopping experience (Next.js, TypeScript, shadcn/ui) that must show product judgment, not a visual clone.

Package manager: `pnpm`. Scripts: `pnpm dev|build|typecheck|lint|test|e2e`.

## Always

- Build in small vertical slices, test-first at the module interfaces (`docs/agents/workflow.md`); the visual system is D20 (`docs/product-decisions.md`).
- `recon/` is read-only reference material containing a real customer's session data. Never modify it, commit it, or copy values from it (see `docs/recon/privacy-notes.md`).
- Never disable, replace or overwrite the capture hooks in `.claude/settings.json` / `.claude/hooks/capture.js`; merge new hooks alongside them. Never hand-edit `.agent-logs/`.
- Do not push, create remotes, deploy, or install dependencies without being asked.
- Next.js here is v16 and differs from older versions: read the relevant guide in `node_modules/next/dist/docs/` before using a Next API (see `AGENTS.md`).
- Unknown facts about Amazon behaviour are `UNKNOWN / REQUIRES VALIDATION`; never invent them.

## Where things are (read when relevant)

- Doing any feature work: `docs/agents/workflow.md` (loop, TDD seams, vertical slices)
- UI work or shadcn components: `docs/ui.md`
- Module contracts and dependency rules: `docs/modules.md`; stack, data, auth, payments: `docs/architecture.md`
- First build and its test contract: `docs/tracer-bullet.md`
- Tests and browser verification: `docs/testing-strategy.md`
- Scope and order of work: `docs/roadmap.md`; open catalogue questions: `docs/catalogue-decision.md`
- Why we differ from Amazon: `docs/product-decisions.md`
- What Amazon source we have: `docs/recon/README.md`; what we still need: `docs/recon/site-peel-request.md`
- Design context for Impeccable: `PRODUCT.md`

## Agent skills

### Issue tracker

Issues live in GitHub Issues via the `gh` CLI. The remote is `origin` (https://github.com/NITISH-R-G/amazon-clone.git, branch `main`); see `docs/agents/issue-tracker.md`.

### Triage labels

Default five-label vocabulary (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `GLOSSARY.md` and `docs/adr/` at the repo root, created lazily. See `docs/agents/domain.md`.
