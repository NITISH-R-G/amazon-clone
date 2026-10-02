# Technical architecture

Status: proposal for Phase 1. Nothing here is implemented. Stack choice (Next.js App Router + TypeScript + Tailwind + shadcn/ui) was confirmed by the user on 2026-10-02; everything else is a recommendation.

Each decision is tagged **[R]** required for assessment, **[Q]** useful for quality, **[O]** optional if time remains. Rule: do not over-engineer; build the thinnest thing that keeps the purchase journey correct and testable.

## 1. Environment discovered

| Item | Value |
|---|---|
| OS / shell | Windows 11, Git Bash + PowerShell |
| Node | v24.18.0 (satisfies Next.js; Impeccable CLI requires ≥ 22.18) |
| Package managers present | npm 11.16.0, pnpm 11.25.0 |
| Repo | git, branch `main`, no remote, no `package.json` yet |
| Recommended package manager | **pnpm** (installed, fast, strict) |
| Browser tooling | Claude built-in browser (preview) and Claude in Chrome available for verification |
| Deploy target | Vercel (recommended; not set up; deploy not started) |

## 2. Application architecture [R]

Single Next.js application (monorepo unnecessary). Server components by default; client components only for interactivity (search combobox, quantity stepper, gallery, menus). Business logic lives in a framework-free `domain/` layer so it can be unit-tested without React.

```
src/
  app/                        routes (App Router), layouts, loading/error/not-found
  components/
    ui/                       shadcn primitives (generated; do not hand-edit logic)
    shell/                    AmazonHeader, CategoryNav, Footer, ...
    product/ cart/ checkout/ account/   feature components
  domain/                     pure TS: pricing, cart, order state machine, search/filter
  server/                     data access (repositories), auth, services, payment provider
  lib/                        utils, formatting, validation schemas (zod)
  tests/                      e2e/ (Playwright); unit tests colocated *.test.ts
db/                           schema + migrations + seed
```

## 3. Routing [R]

| Route | Purpose | Rendering |
|---|---|---|
| `/` | Home | RSC, cached |
| `/s` | Search/category results (`?k=&i=&price=&rating=&sort=&page=`) | RSC, URL-driven |
| `/dp/[slug]` (or `/[slug]/dp/[id]`) | Product detail | RSC + client buy box; ISR |
| `/cart` | Cart | RSC + server actions |
| `/checkout` | Single-page checkout | Dynamic, auth-gated |
| `/checkout/confirmation/[orderId]` | Confirmation | Dynamic |
| `/orders`, `/orders/[orderId]` | Order list/detail | Dynamic, auth-gated |
| `/account`, `/account/addresses`, `/account/security` | Account | Dynamic, auth-gated |
| `/signin`, `/register` | Auth | |
| `/deals` | Deals listing | RSC [Q] |
| `/help` | Static help hub | Static [O] |
| `not-found`, `error` | Global states | |

The PDP URL mirrors Amazon's `/dp/<id>` pattern (observed in recon).

## 4. Component architecture [R]

- shadcn/ui primitives in `components/ui` (see `docs/recon/component-inventory.md` section 1 for the mapping).
- Amazon-specific components composed from primitives. **Build only what Phase 1 pages need.**
- Props are typed, minimal and data-shaped; presentational components receive plain data, not repositories.
- Tokens come from `docs/recon/design-tokens.md` §2, implemented once in `globals.css` / Tailwind theme.

## 5. State management [R]

| State | Where | Why |
|---|---|---|
| Catalogue, orders, account | Server (RSC fetch + DB) | Source of truth; no client cache needed |
| Search/filter/sort/page | **URL search params** | Shareable, back-button correct, testable |
| Cart | Server (DB) keyed by cart cookie (guest) or user (signed in); **optimistic UI** via `useOptimistic` + server actions | Survives reloads/devices; merge on sign-in |
| Form state | `react-hook-form` + zod [Q] (or native form + server action validation) | Boundary validation |
| Ephemeral UI (menus, dialogs, gallery index) | Local component state | No global store; **no Redux/Zustand** unless proven necessary |

## 6. Data model [R]

Entities (Postgres via Drizzle ORM; SQLite acceptable locally):

- `User(id, email, passwordHash, name, createdAt)`
- `Session` (library-managed)
- `Address(id, userId, fullName, line1, line2, city, region, postalCode, country, phone, isDefault)`
- `Category(id, slug, name, parentId)`
- `Product(id, slug, title, brand, description, categoryId, ratingAvg, ratingCount, status)`
- `Variant(id, productId, sku, attrs jsonb, priceCents, listPriceCents, currency, stock)`
- `ProductImage(id, productId, url, alt, position)`
- `Cart(id, userId?, guestToken?, updatedAt)` and `CartItem(cartId, variantId, quantity)`
- `Order(id, number, userId, status, subtotalCents, shippingCents, taxCents, totalCents, shippingAddress jsonb, paymentRef, placedAt)`
- `OrderItem(orderId, variantId, title, unitPriceCents, quantity, imageUrl)` (snapshot of purchase-time data)
- `Review(id, productId, userId, rating, title, body)` [O]
- Money stored as integer cents. Never floats.

## 7. API boundaries [R]

- **Reads**: server components call repositories directly (no internal HTTP).
- **Writes**: server actions for cart/address/checkout/auth forms; route handlers (`/api/*`) only where an external client or a `fetch` boundary is needed (search suggestions `GET /api/suggest`, health).
- **Validation**: every action/handler parses input with a zod schema; returns typed `Result`/field errors; never trusts client prices (the server recomputes totals from DB prices).
- **Errors**: stable error shape `{ code, message, fieldErrors? }`.

## 8. Authentication approach [R]

- Email + password with **Auth.js (credentials + database sessions)** or **Better Auth**; httpOnly, SameSite=Lax session cookie; argon2/bcrypt hashing; CSRF protection via framework defaults.
- Identifier-first UI (matches Amazon): step 1 email, step 2 password, "create account" branch. Registration validates email format and password length; no email verification in scope [O].
- Guest cart merge on sign-in.
- Passkeys, OTP, social login: out of scope.
- Route protection in middleware for `/checkout`, `/orders`, `/account`.

## 9. Cart persistence [R]

Server-side cart row; guest identified by a random, httpOnly cookie token; on sign-in, guest items merge into the user cart (sum quantities, clamp to stock). Cart totals are computed by `domain/cart.ts` (pure, tested). Stock re-validated at checkout.

## 10. Order lifecycle [R]

`placed` → `paid` → `shipped` → `delivered`, plus `cancelled` (allowed only before `shipped`) and `refunded` [O]. A pure state machine in `domain/order.ts` defines legal transitions. Because there is no real fulfilment, `shipped`/`delivered` advance via a **time-based simulation** derived from `placedAt` (computed on read) so tracking/status UI is demonstrable without background jobs. Order creation is a single DB transaction: validate cart → re-price → decrement stock → insert order/items → clear cart.

## 11. Search and filter architecture [R]

- `domain/search.ts`: query normalisation, filter parsing from URL, sort definitions.
- Repository `searchProducts(params)` with Postgres full-text (`tsvector`, ranking) + facet counts; with a catalogue under a few hundred items an in-memory/`LIKE` implementation behind the **same interface** is acceptable to start [R], full-text is [Q].
- Facets: department, price range, rating, availability (Prime-style filters omitted). Sort: featured, price asc/desc, rating, newest.
- Suggestions: `GET /api/suggest?q=` with debounced client combobox [Q].

## 12. Payment strategy [R]

`PaymentProvider` interface (`authorize(amount, method) → {ok, ref} | {declined, reason}`) with a **demo implementation**: validates card number (Luhn), expiry, CVC format; certain test numbers force declines. No card data is stored; only brand + last four. Stripe test mode is an [O] drop-in later. Prominent "demo payment" label.

## 13. Testing architecture [R]

See `docs/testing-strategy.md`. Vitest (unit/integration), React Testing Library for client components [Q], Playwright (E2E + axe) with a seeded test database reset per run, MSW only if external calls appear.

## 14. Deployment architecture [R for live demo]

- Vercel (Next.js native); managed Postgres (Neon or Vercel Postgres); environment variables for `DATABASE_URL`, `AUTH_SECRET`; seed script run at deploy for demo data.
- Preview deployments per branch [Q]; production on `main`.
- Images: `next/image` with local `/public` assets or a bucket [Q].
- **No deploy during Phase 0.**

## 15. Observability and error handling [Q]

- `error.tsx` / `not-found.tsx` per route group; global error boundary; typed server-action results; user-visible retry.
- Structured server logging (`pino` or `console` JSON) with request id; log order placement, payment outcome, auth failures (no PII, no card data).
- Health route `/api/health` [Q]. Sentry or Vercel Analytics [O].

## 16. Security and privacy [R]

Server-side price/total computation, authorisation on every `userId`-scoped query, input validation, output encoding (React default), rate-limit sign-in [Q], no secrets in repo, `.env.example` only. **No Amazon proprietary scripts, tracking, or session tokens from `recon/` enter the codebase.**

## 17. Key tradeoffs

| Decision | Chosen | Rejected | Cost of choice |
|---|---|---|---|
| Framework | Next.js App Router | Vite SPA | Learning curve on RSC boundaries; gains SSR/SEO and route handlers |
| Data | Postgres + Drizzle | SQLite / JSON files | Needs hosted DB for deploy; best fidelity to real order semantics |
| State | Server-first + URL | Client store | Slightly more server round-trips |
| Order progression | Computed from time | Background worker | Not truly stateful, adequate for demo |
| Payments | Local demo provider | Stripe test | Less realistic, zero setup risk |
| Search | Interface + simple impl first | Elastic/Algolia | Weaker relevance; fine at demo catalogue size |

## 18. Open architecture questions (need user input or Site Peel)

1. Catalogue source and size (seed ~60 to 150 products, categories, imagery?).
2. Hosted DB/account for Vercel and domain (user-owned accounts).
3. Auth library preference (Auth.js vs Better Auth), or "delegated".
4. GitHub remote for issues/PRs (issue tracker is GitHub Issues; no remote exists).
