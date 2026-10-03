# Contributing

Small project, small rules.

## Setup

```bash
pnpm install
pnpm dev
```

Node.js and pnpm 11 are required. No environment variables are needed for local work (PGlite and the demo payment provider are used).

## Workflow

- Branch from `main`; keep a change to one concern. Commit messages: a short imperative summary with a type prefix (`feat:`, `fix:`, `test:`, `docs:`, `perf:`, `chore:`).
- Work test-first at module interfaces (see [docs/agents/workflow.md](docs/agents/workflow.md)). Business rules live in `src/modules/*`; server actions and route handlers stay thin.
- Do not import another module's `internal/` files (ESLint enforces it). Only the clock, the ID generator and the payment provider may be faked in tests.

## Before opening a pull request

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm e2e      # when you touch a user journey (uses installed Google Chrome)
```

## Database

Change the Drizzle schema, then `pnpm db:generate --name <what_changed>`. Never edit a migration that has been merged; add a new one. Migrations that change existing rows need a backfill statement. Prices are integer cents.

## Secrets and data

- Never commit secrets, tokens, connection strings or `.env` files; document variable **names** only (`.env.example`).
- Stripe is test mode only. Never use live keys.
- `recon/` and `recon-v2/` contain private reference captures and are gitignored. Never commit or copy values from them.
- `.agent-logs/` holds captured assistant sessions for the assessment. They are written by the capture hooks; do not edit, rename or regenerate them.

## Pull requests

Describe what changed and why, how you tested it, and anything a reviewer should look at first. Keep unrelated formatting changes out.
