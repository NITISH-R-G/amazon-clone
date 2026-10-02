# Build workflow

How work gets done in this repo. Read before starting any feature work. Skills referenced are installed in `.claude/skills/` and are the detailed source; this file only fixes the order and the repo-specific choices.

## The loop

```
understand → spec → tickets → implement → test → browser verify → code review → commit
```

| Step | What | Skill / doc | Done when |
|---|---|---|---|
| understand | Read the relevant `docs/` pointers and the existing module's public interface. Targeted reads, not source dumps | `docs/recon/README.md`, `docs/architecture.md` | You can state the behaviour and the module it belongs to |
| spec | One page: behaviour, acceptance criteria, UNKNOWNs | `to-spec` | Criteria are checkable; unknowns are listed, not guessed |
| tickets | Cut the spec into **vertical slices** (each slice ships behaviour end to end) | `to-tickets`, tracker in `docs/agents/issue-tracker.md` | Each ticket is independently demonstrable |
| implement | One slice at a time, test-first at an agreed seam | `implement`, `tdd` | Slice's tests green, typecheck clean |
| test | Single test files while iterating; full suite once per slice | | Suite green |
| browser verify | Drive the real UI at 360 / 768 / 1280; see `docs/testing-strategy.md` | built-in browser | Checklist items for the slice pass |
| code review | Standards + spec review of the diff; **refactoring happens here, not in the TDD loop** | `code-review` | Findings fixed or consciously deferred |
| commit | Scoped commit on the current branch | | One slice (or less) per commit |

For design-heavy surfaces insert Impeccable around implementation: `shape`/`critique` → direction → implement → `audit` → browser verify → `polish`. Detail lives in the skill; `PRODUCT.md` is its context.

## Behaviour loop (inside "implement")

```
spec → agreed test seam → RED → minimal GREEN → next behaviour → review
```

1. **Agree the seam first.** Before any test, write down the public interface under test and get the user's confirmation. No test at an unconfirmed seam. Seams default to the module interfaces in `docs/architecture.md` §Modules.
2. **Tracer bullet.** Pick the thinnest behaviour that crosses the whole slice (UI → module interface → data) and make that one thing work first. Thicken afterwards.
3. **RED**: one failing test for one behaviour. Watch it fail for the right reason.
4. **GREEN**: the minimum code to pass. No anticipated features.
5. Repeat for the next behaviour. **Never write a feature's whole test suite up front** (horizontal slicing).
6. Review, then refactor under green tests.

## Test rules

- Test **observable behaviour through the public interface**. A test that breaks on a refactor with unchanged behaviour is wrong.
- No tautologies: expected values come from literals, worked examples or the spec, never recomputed with the code's own logic.
- Do not test internals, private helpers, or verify via side channels (reading the DB to confirm what the interface should tell you).
- **Mock only external boundaries**: the payment provider, the clock, randomness / id generation, and third-party APIs. Use the real module and a real (test) database for everything else; prefer in-memory fakes at declared adapters over mocking collaborators.
- Browser/E2E policy and priorities: `docs/testing-strategy.md` (E2E is an expensive loop, added after the behaviour works).

## Slice and ticket rules

- A slice is the smallest change a user (or reviewer) can see working. "Build the cart data layer" is not a slice; "add an item to the cart from a product page and see the count" is.
- A ticket without acceptance criteria is not ready. Missing Amazon evidence is a blocker only when the slice needs it; otherwise record `UNKNOWN / REQUIRES VALIDATION` and design it ourselves (`docs/product-decisions.md`).
- Tracker commands follow `docs/agents/issue-tracker.md` (no remote yet: draft tickets in conversation until a repo exists).

## Source reconstruction

- Use supplied Amazon source (`recon/`, later Site Peel captures) as the reference **instead of rediscovering structure**; read `docs/recon/*` first, then targeted parts of the source.
- Preserve captured source as evidence; extract only what the slice needs; adapt into our own components. Do not copy Amazon scripts, tracking, A/B machinery, tokens or proprietary backend behaviour.
- Keep reconstruction (what Amazon does) separate from improvement (what we chose to do differently); the latter must have an entry in `docs/product-decisions.md`.

## Context discipline

- The filesystem is the source of truth. Inventory, targeted reads, summaries stored in docs.
- Do not dump large files into context; read ranges, grep, or use a subagent for sweeps.
- One feature (slice) at a time. Re-derive nothing already recorded in `docs/`.
- Keep `CLAUDE.md` minimal; add detail to the doc that owns the topic and link from there.

## Git

- Scoped, meaningful commits; no mixed commits, secrets, generated junk or `recon/`.
- Before stopping: `git status`, `git diff --stat`, `git diff --check`.
- Do not modify historical capture logs.

## Tooling note (Windows)

Use the **`sh` launcher** for Impeccable: `sh .claude/skills/impeccable/scripts/impeccable <verb>`. The shipped `impeccable.cmd` has LF line endings and silently exits 127 on Windows. The engine (v0.1.11) is installed and checksum-verified in `~/.impeccable/bin/`.
