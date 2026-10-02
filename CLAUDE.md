# Amazon rebuild

A rebuild of the Amazon shopping experience (Next.js, TypeScript, shadcn/ui) that must show product judgment, not a visual clone.

Package manager: `pnpm`. No app is scaffolded yet (Phase 0); standard `pnpm dev|build|lint|test` apply once it is.

## Always

- **Phase 0 until told otherwise**: plan, document, survey. Do not scaffold or write application code until the user unlocks Phase 1.
- `recon/` is read-only reference material containing a real customer's session data. Never modify it, commit it, or copy values from it (see `docs/recon/privacy-notes.md`).
- Never disable, replace or overwrite the capture hooks in `.claude/settings.json` / `.claude/hooks/capture.js`; merge new hooks alongside them. Never hand-edit `.agent-logs/`.
- Do not push, create remotes, deploy, or install dependencies without being asked.
- Unknown facts about Amazon behaviour are `UNKNOWN / REQUIRES VALIDATION`; never invent them.

## Where things are (read when relevant)

- Doing any feature work: `docs/agents/workflow.md` (loop, TDD seams, vertical slices)
- UI work or shadcn components: `docs/ui.md`
- Module boundaries, data, auth, payments: `docs/architecture.md`
- Tests and browser verification: `docs/testing-strategy.md`
- Scope and order of work: `docs/roadmap.md`
- Why we differ from Amazon: `docs/product-decisions.md`
- What Amazon source we have: `docs/recon/README.md`; what we still need: `docs/recon/site-peel-request.md`
- Design context for Impeccable: `PRODUCT.md`

## Agent skills

### Issue tracker

Issues live in GitHub Issues via the `gh` CLI. No git remote is configured yet; see `docs/agents/issue-tracker.md`.

### Triage labels

Default five-label vocabulary (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `GLOSSARY.md` and `docs/adr/` at the repo root, created lazily. See `docs/agents/domain.md`.
