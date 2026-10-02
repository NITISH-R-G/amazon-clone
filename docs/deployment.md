# Deployment

## Decision (current): Vercel + Neon (managed Postgres)

Superseded the earlier "single container with a volume" plan (kept below as the fallback). Reason: the scale-up plan (`docs/scale-up-plan.md`) requires a database that survives redeploys and supports several instances.

- **Database selection** (`src/server/database.ts`, test T48): `DATABASE_URL` set -> managed Postgres through `pg` + `drizzle-orm/node-postgres`, small pool (default 3). Unset -> PGlite (local dev and tests). On Vercel a missing URL is an error, never a silent PGlite.
- **Migrations and seed run at deploy time**, not on requests: the Vercel build runs `vercel-build` = `tsx scripts/db-setup.ts && next build`. Both steps are idempotent. A failed migration fails the build, so a broken schema never goes live.
- **Credentials:** `DATABASE_URL` exists only in the Vercel project's environment. `.env.example` lists names only. The setup script prints error messages, never the connection string.
- **Connection string:** use Neon's *pooled* string (pgbouncer, transaction mode). Checkout's `pg_advisory_xact_lock` is transaction-scoped and works through it. Pick the Neon region closest to the Vercel function region.

### Verified locally against a real PostgreSQL 18 server

`db:setup` applied all migrations and the seed, and re-running it changed nothing (idempotent). The full E2E suite (5 journeys x desktop and mobile) passed against that server, and the users, sessions and orders created by the tests were present in Postgres. A real Neon + Vercel run is still to be verified (see the gate in `docs/scale-up-plan.md`).

### Steps (account owner)

1. Neon: create a project, copy the **pooled** connection string.
2. Vercel: import the GitHub repository `NITISH-R-G/amazon-clone`, add the environment variable `DATABASE_URL` (Production and Preview), deploy.
3. Verify the public URL with the gate checklist.

---

## Fallback: one container with a volume (PGlite)

Run **one long-lived Node container with a persistent volume**, keeping PGlite. No database migration, no new driver, no second service.

Why not the alternatives (checked against what is available, see "Environment inspected"):

- **Vercel (or any serverless host) + PGlite**: the filesystem is ephemeral and every instance has its own database, so carts, accounts and orders would vanish or diverge. Not acceptable.
- **Vercel + managed Postgres (Neon)**: correct and common, but needs a driver change behind the `Database` type, a provisioned database and credentials, none of which exist here. More moving parts than the demo needs.
- **One container + volume**: the app already persists to `PGLITE_DIR`; nothing in the code changes.

## Evidence that PGlite on a disk directory is durable

Production build, `PGLITE_DIR` on disk. Registered a user and placed an order, then killed the server with `Stop-Process -Force` (no shutdown hook), restarted, and signed in. The user and the order were present, and again after a second hard kill. Data directory about 39 MB.

## Constraints that come with it

- **Exactly one instance.** PGlite is in-process; two instances would each have their own copy. Disable autoscaling and zero-downtime overlapping deploys (or accept a brief gap).
- **The volume is the database.** Mount it at `/data` and back it up by snapshotting it.
- No other configuration: `PGLITE_DIR` (default in the image `/data/pglite`) and `PORT`. The session cookie is `Secure` in production, so the host must serve HTTPS (all common hosts do).
- Migrations and the demo seed run on start and are idempotent.
- Out of scope for the demo: horizontal scaling, point-in-time recovery. Move to managed Postgres only if either becomes a requirement; the change is confined to `src/server/runtime.ts`.

## Steps (any host that runs a Dockerfile and offers a volume: Railway, Fly.io, Render with a disk)

1. Push the repository to GitHub (or deploy from the local directory with the host's CLI).
2. Create a service from the `Dockerfile`; one instance.
3. Attach a volume mounted at `/data`.
4. Expose HTTP port 3000 (the image sets `PORT=3000`).
5. After the first deploy, run the tier-1 journey against the public URL (`BASE_URL`-style: register, buy, restart the service, sign in, find the order).

**Not verified:** the image itself has not been built (the Docker daemon is not running here), and no host has been tried. The same `pnpm build && pnpm start` was exercised locally.

## Environment inspected (2026-10-02)

| Item | State |
|---|---|
| GitHub CLI | Logged in (scopes: repo, workflow, read:org, gist). No git remote configured. |
| Vercel CLI | Not installed; its config folder holds no token. |
| v0 / Vercel connector | Connected (team with zero credit usage); not used because serverless cannot hold PGlite. |
| Fly, Railway, Render, Netlify, Cloudflare, AWS, GCP, Azure CLIs | Not installed. |
| Docker | Installed, daemon not running. |
| Database credentials or deploy-related environment variables | None. |
