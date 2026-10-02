# Technical architecture

Status: proposal for Phase 1; nothing is implemented. The stack (Next.js App Router, TypeScript strict, Tailwind, shadcn/ui; pnpm on Node 24) was confirmed by the user. Everything else is a recommendation. Tags: **[R]** required for assessment, **[Q]** useful for quality, **[O]** optional if time remains.

Goal: a codebase that is easy for an AI agent to navigate and easy for a human to reason about. Few modules, each deep. Do not add abstractions until a second use or a test seam demands one.

## 1. Principles

1. **Deep modules [R]**: each domain exposes a small public interface (`index.ts`) and hides its logic, data access and rules. Vocabulary: see the `codebase-design` skill (module, interface, depth, seam, adapter).
2. **One entry point per module.** Other code imports only from `modules/<name>` (its `index.ts`), never from its internals. Enforce with an import-restriction lint rule [Q].
3. **A module owns its tables and its rules.** No other module reads its tables; they call its interface.
4. **Seams are the module interfaces.** Tests exercise behaviour through them (see `docs/agents/workflow.md`, `docs/testing-strategy.md`). Fake only the external ports (`Clock`, `IdGenerator`, `PaymentProvider`; see `docs/modules.md`).
5. **Server-first.** Server components read through module interfaces; server actions write through them; client components get plain data.
6. **UI never holds business rules** (pricing, stock, status, authorisation); it renders what modules return.

## 2. Layout

```
src/
  app/            routes, layouts, loading/error/not-found, server actions (thin: parse → call module → revalidate)
  modules/
    catalog/  search/  cart/  checkout/  orders/  auth/  payments/  account/
      index.ts    PUBLIC interface and types only
      internal/   implementation, queries, rules (not importable from outside)
  components/
    ui/           shadcn primitives (docs/ui.md)
    shell/ product/ cart/ checkout/ account/    feature components (plain props)
  lib/            shared utilities: money, dates, zod helpers (small; resist growth)
db/               schema, migrations, seed
tests/e2e/        Playwright journeys (docs/testing-strategy.md)
```

Unit/integration tests are colocated with the module and import only its `index.ts`.

## 3. Modules and public interfaces

**Locked: eight modules** (`catalog`, `search`, `cart`, `checkout`, `orders`, `auth`, `payments`, `account`). Each one's responsibility, interface, inputs/outputs, owned persistence, allowed and forbidden dependencies, and unit/integration/E2E split are in **`docs/modules.md`** (single source; not repeated here). `product` is folded into `catalog`; there is no `pricing` module.

Dependency direction (no cycles): `checkout → {cart, orders, payments, catalog}`, `cart → catalog`, `search → catalog`; the rest are leaves. Cross-module orchestration happens in `checkout` or in thin `app/` server actions.

First build: `docs/tracer-bullet.md` (the thinnest real slice across `catalog`, `cart`, `checkout`, `orders`, `payments`) and its test contract.

## 4. Routing [R]

| Route | Purpose | Notes |
|---|---|---|
| `/` | Home | RSC |
| `/s` | Search/category results (`?k=&i=&price=&rating=&sort=&page=`) | URL is the state |
| `/dp/[slug]` | Product detail (mirrors Amazon's `/dp/<id>`) | RSC + client buy box |
| `/cart` | Cart | server actions |
| `/checkout` | Single-page checkout (address, delivery, payment, review) | auth-gated |
| `/checkout/confirmation/[orderId]` | Confirmation | |
| `/orders`, `/orders/[orderId]` | Orders | auth-gated |
| `/account`, `/account/addresses` | Account | auth-gated |
| `/signin`, `/register` | Identifier-first auth | `returnTo` preserved |
| `/deals` [Q], `/help` [O] | | |
| `not-found`, `error`, `loading` | Every data route | |

## 5. State [R]

Server is the source of truth. Search/filter/sort/page: **URL params**. Cart: database row keyed by guest cookie or user, with optimistic UI (`useOptimistic`) over server actions. Ephemeral UI state (menus, gallery index): local component state. No global client store.

## 6. Data model [R]

Postgres via Drizzle (SQLite acceptable locally). Money is **integer cents**, never floats. Entities: `User`, `Address`, `Category`, `Product`, `Variant`, `ProductImage`, `Cart`, `CartItem`, `Order`, `OrderItem` (purchase-time snapshot of title, unit price, image), `Review` [O]. Each table belongs to exactly one module (§1.3). Schema is created in Phase 1, not before.

## 7. Boundaries and validation [R]

- Reads: server components call module interfaces directly (no internal HTTP).
- Writes: server actions; route handlers only for external consumers or `fetch` boundaries (`/api/suggest`, `/api/health`).
- Every action/handler parses input with a zod schema and returns a typed result `{ ok } | { error: { code, message, fieldErrors? } }`. Never trust client-sent prices or totals; the server recomputes from the database.

## 8. Cross-cutting decisions

- **Authentication [R]**: email + password, identifier-first UI (step 1 email, step 2 password, create-account branch), httpOnly SameSite=Lax session cookie, argon2/bcrypt, Auth.js (credentials, DB sessions) or Better Auth (open). Middleware protects `/checkout`, `/orders`, `/account` and passes `returnTo`. Passkeys, OTP, social login out of scope.
- **Cart persistence [R]**: guest identified by a random httpOnly token; on sign-in guest lines merge into the user's cart (sum, clamp to stock). Stock re-validated at checkout.
- **Order lifecycle [R]**: `placed → paid → shipped → delivered`, plus `cancelled` (only before `shipped`). `shipped`/`delivered` are derived from `placedAt` and the clock when read, so no background worker is needed. Order creation is one transaction: validate → re-price → decrement stock → insert order and items → clear cart.
- **Payments [R]**: demo provider, no card data stored (brand + last four only), clearly labelled "Demo payment: no card is charged". Stripe test mode is a [O] drop-in behind the same port.
- **Search [R]**: begin with the simplest implementation that satisfies the `search` interface (a catalogue of a few hundred items does not need an engine); Postgres full-text is the [Q] upgrade; the interface does not change.
- **Deployment [R for live demo]**: Vercel + managed Postgres, `DATABASE_URL`, `AUTH_SECRET`, seed at deploy. Not started.
- **Observability [Q]**: `error.tsx`/`not-found.tsx` per route group, structured JSON logs for order, payment and auth outcomes (no PII, no card data), `/api/health`; Sentry/analytics [O].
- **Security/privacy [R]**: authorisation on every user-scoped query, no secrets in the repo (`.env.example` only), rate-limit sign-in [Q], no Amazon scripts/tracking/tokens from `recon/` in the codebase.

## 9. Engineering conventions

TypeScript `strict`; no `any` without a written reason. Server components by default; `"use client"` only for interactivity. Every data-driven view has loading, error and empty states. Accessibility (WCAG 2.2 AA) and responsive behaviour (mobile first) are requirements, not polish. No unnecessary abstraction; no premature optimisation.

## 10. Tradeoffs

| Decision | Chosen | Rejected | Cost |
|---|---|---|---|
| Module count | 8 deep modules, `product` folded into `catalog`, no `pricing` module | One module per concept (dozens) | A few modules are larger; far less indirection |
| Framework | Next.js App Router | Vite SPA | RSC learning curve; gains SSR, route handlers |
| Data | Postgres + Drizzle | SQLite/JSON | Needs a hosted DB to deploy |
| Order progression | Derived from time | Worker/queue | Not truly stateful; fine for a demo |
| Payments | Demo provider | Stripe test | Less realistic; zero setup risk |
| Search | Interface first, simple implementation | Search service | Weaker relevance at demo scale |

## 11. Open questions (need the user or Site Peel)

1. Catalogue source and size; image source.
2. Hosted DB and deploy accounts (user-owned).
3. Auth library (Auth.js vs Better Auth), or "delegated".
4. GitHub remote for issues and PRs.
5. Checkout shape and order-detail fields depend on Site Peel captures (`docs/recon/site-peel-request.md`); until then the `checkout` and `orders` interfaces above are provisional.

## 12. Database boundary (reviewed in the Phase 1 hardening pass)

| Question | Answer |
|---|---|
| Why PGlite? | An in-process Postgres (WASM): real Postgres semantics (transactions, savepoints, unique constraints, advisory locks) with no server or native build on Windows. It let the domain tests (T1 to T22) run against a real database. |
| Where is it used? | **Local development** (`pnpm dev`, data in the git-ignored `data/pglite/`), **unit/integration tests** (a fresh in-memory instance per test) and **E2E** (`PGLITE_DIR=memory://`). |
| Is it for production? | **No** (decision D23: managed Postgres via `DATABASE_URL`, see `docs/deployment.md`). It is a local/test engine only. It must not be deployed: serverless filesystems are not persistent and it is single-connection. |
| Production database | **UNKNOWN / REQUIRES VALIDATION.** No decision has been made. Candidate: managed Postgres (Neon or Vercel Postgres). To be decided in the deployment slice with the user (account ownership). No production database was introduced in this pass. |
| Swap boundary | Modules depend only on `DbOrTx` (`lib/db.ts`), a driver-agnostic Drizzle `PgDatabase`. `server/app.ts` types the database as `PgDatabase<PgQueryResultHKT, schema>`, so any Drizzle Postgres driver satisfies it. Only `server/runtime.ts` (runtime) and `test-support/app.ts` (tests) construct a PGlite client. Swapping drivers means changing those two composition points, not modules. (This pass removed the one place that was typed to PGlite.) |
| Migrations portable? | Yes. `drizzle/*.sql` is plain Postgres generated by drizzle-kit (`pg-core`); the only database function in the migrations is the built-in `gen_random_uuid()` (Postgres 13+). Runtime also uses `now()` and `pg_advisory_xact_lock(hashtext(..))`, both standard. The migrator call in `runtime.ts` is the PGlite one; a production driver needs its own migrator invocation over the same SQL files. |
| Known gap | Closed for a local PostgreSQL 18 server (E2E green); the hosted Neon run is verified in the deployment gate. |

## 13. DEMO-ONLY PAYMENT BEHAVIOR (reviewed in the Phase 1 hardening pass)

`checkout.placeOrder` calls `PaymentProvider.authorize` **inside** the database transaction (stock decrement, authorise, create order, clear cart). If any step fails, the whole transaction rolls back; tests T9, T10 and T11 prove this.

**Why this is acceptable for the tracer:** the demo provider is synchronous, in-process, moves no money and has no side effects outside the transaction, so "payment succeeded" and "order committed" cannot diverge.

**Why it must not be used with a real provider:** an external authorisation cannot be undone by a database rollback. With a real provider, a failure after approval (order insert fails, connection drops, commit fails) would leave a charge with no order, and holding a transaction (and its locks) open during a network call hurts throughput.

**What would change (not built; Stripe is P2):**
1. Create the order and reserve stock in a transaction with status `pending_payment`, then commit.
2. Authorise or capture outside the transaction, passing the idempotency key (the port already carries it).
3. On approval mark the order `paid` (or confirm via webhook); on decline or timeout release stock and mark it `cancelled`.
4. Add a reconciliation path for approved-but-unrecorded payments.

The `PaymentProvider` port, the idempotency key and the order status field are the seams that keep this change local to `checkout`.
