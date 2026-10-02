# Technical architecture

Status: proposal for Phase 1; nothing is implemented. The stack (Next.js App Router, TypeScript strict, Tailwind, shadcn/ui; pnpm on Node 24) was confirmed by the user. Everything else is a recommendation. Tags: **[R]** required for assessment, **[Q]** useful for quality, **[O]** optional if time remains.

Goal: a codebase that is easy for an AI agent to navigate and easy for a human to reason about. Few modules, each deep. Do not add abstractions until a second use or a test seam demands one.

## 1. Principles

1. **Deep modules [R]**: each domain exposes a small public interface (`index.ts`) and hides its logic, data access and rules. Vocabulary: see the `codebase-design` skill (module, interface, depth, seam, adapter).
2. **One entry point per module.** Other code imports only from `modules/<name>` (its `index.ts`), never from its internals. Enforce with an import-restriction lint rule [Q].
3. **A module owns its tables and its rules.** No other module reads its tables; they call its interface.
4. **Seams are the module interfaces.** Tests exercise behaviour through them (see `docs/agents/workflow.md`, `docs/testing-strategy.md`). Mock only the external ports in §3.
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

`product` is **folded into `catalog`**: a product page is a view over catalogue data, not a separate domain. Pricing is internal to `cart` (line and subtotal) and `checkout` (quote with shipping/tax); there is no shared "pricing" module.

External **ports** (the only things mocked or faked in tests): `Clock`, `IdGenerator` (order numbers, tokens), `PaymentProvider`. Everything else runs for real against a test database.

| Module | Purpose | Public interface (shape, not final signatures) | Hides | Depends on |
|---|---|---|---|---|
| **catalog** [R] | Products, variants, categories, availability, images | `getProduct(slug)`, `getVariant(id)`, `listCategories()`, `listProducts({ category, ids })`, `getAvailability(variantId)`; types `Product`, `Variant`, `Money` | Schema, joins, price/list-price rules, stock reads, image ordering | none |
| **search** [R] | Query → ranked, filtered, sorted, paginated results with facets | `searchProducts(query: SearchQuery) → { items, total, facets, page }`, `parseSearchParams(URLSearchParams) → SearchQuery`, `suggest(text)` [Q] | Ranking, full-text or LIKE implementation, facet counting, param validation | catalog |
| **cart** [R] | Guest and user carts, quantities, totals | `getCart(ctx)`, `addItem(ctx, variantId, qty)`, `setQuantity(ctx, lineId, qty)`, `removeItem(ctx, lineId)`, `restoreItem(ctx, lineId)` (undo), `mergeGuestCart(guestToken, userId)`, `saveForLater` [Q]; `Cart` includes totals and per-line availability | Persistence, stock clamping, max quantity, subtotal math, guest-token handling | catalog |
| **checkout** [R] | Turn a cart into an order | `getQuote(ctx, { address, shippingMethod })`, `placeOrder(ctx, input) → Result<Order, CheckoutError>` | Server-side re-pricing, stock re-validation, shipping/tax rules, the transaction, idempotency, payment orchestration | cart, orders, payments, account |
| **orders** [R] | Order history and lifecycle | `listOrders(userId)`, `getOrder(userId, id)`, `cancelOrder(userId, id)` [Q]; `createOrder` is used by `checkout` only; `statusAt(order, now)` | Status machine, time-derived progression, purchase-time snapshot, order numbers | none (reads `Clock`) |
| **auth** [R] | Identity and sessions | `checkIdentifier(email)`, `register(input)`, `signIn(input)`, `signOut()`, `getSession()`, `requireUser(returnTo)` | Hashing, session storage, cookie flags, rate limiting, generic error policy | none |
| **payments** [R] | Authorise a payment | `PaymentProvider.authorize({ amount, method }) → Approved | Declined`; demo provider validates card format and declines designated test numbers | Provider choice (demo now, Stripe test later), card validation, brand/last-four extraction | none |
| **account** [Q; addresses required for checkout] | Addresses and profile | `listAddresses(userId)`, `saveAddress`, `deleteAddress`, `setDefaultAddress`, `getProfile`, `updateProfile` | Validation, default-address rule | auth |

Dependency direction (no cycles): `app → checkout → {cart, orders, payments, account} → catalog`; `app → search → catalog`; `app → auth`. `orders` and `payments` do not import `cart`.

### Seams worth testing first

`cart` (totals, merge, stock clamp), `checkout.placeOrder` (re-pricing, atomicity, idempotency, declined payment), `search.searchProducts` + `parseSearchParams` (URL round-trip, filters), `orders.statusAt`, `auth` (register/sign-in/protection). These carry the business risk; UI components are verified in the browser first.

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
