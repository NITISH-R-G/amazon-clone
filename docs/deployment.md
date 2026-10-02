# Deployment

## Decision

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
