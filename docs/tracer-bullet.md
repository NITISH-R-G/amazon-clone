# Tracer bullet and its test contract

Status: designed, **not started**. No test or code exists. This slice is `A1` in `docs/roadmap.md`. Test seams are the module interfaces in `docs/modules.md`; per `docs/agents/workflow.md` they are **proposed here and need user confirmation before the first test is written**.

## Flow

```
catalog → product display → cart → checkout calculation → order creation → confirmation
```

| Step | Page / action | Module call | Boundary crossed |
|---|---|---|---|
| 1. Product display | `/dp/[slug]` (server component) | `catalog.getProduct(slug)`, `catalog.getAvailability` | UI → `catalog` interface → DB |
| 2. Add to cart | server action on the PDP form | `cart.addItem(actor, variantId, qty)` | UI → `cart` → `catalog` (price, stock) → DB. Guest token cookie created via `IdGenerator.token()` |
| 3. Cart | `/cart` | `cart.getCart(actor)` | UI → `cart` |
| 4. Checkout calculation | `/checkout` | `checkout.getQuote(actor, { address? })` → `quoteCart` | UI → `checkout` → `cart` |
| 5. Order creation | server action "Place order" | `checkout.placeOrder(actor, input)` → `catalog.decrementStock`, `payments.authorize`, `orders.createOrder`, `cart.clearCart` in one `Tx` | UI → `checkout` → four modules → DB transaction; ports `PaymentProvider`, `Clock`, `IdGenerator` |
| 6. Confirmation | `/checkout/confirmation/[id]` | `orders.getOrder(actor, id)` | UI → `orders` (owner-scoped) |

Guest only (`Actor = { guestToken }`). Seed: 3 products. UI is thin and unstyled beyond tokens; real design waits for the Site Peel captures.

## Why this is the tracer bullet

It is the riskiest and most valuable path: money arithmetic, stock integrity, atomic order creation, idempotency and owner-scoped retrieval. It touches **5 of the 8 modules**, the database, a transaction spanning modules, and all three ports. If these boundaries are wrong, everything built later (search, auth, orders list) inherits the flaw; if they are right, the remaining modules slot around them. It ships through real boundaries; nothing in it is throwaway (the thin pages are replaced by designed pages, the modules are final).

## What it proves

- Module interfaces are small enough to test behaviour without reaching inside.
- One order is atomic across `catalog`, `cart`, `orders` via a passed transaction handle.
- Server-side pricing; the client never sends prices.
- Declined payment and out-of-stock leave no side effects.
- Fakes are only needed at the three ports.

## What it intentionally leaves out

Home, search, results, categories, variants UI, gallery, ratings, filters, suggestions; authentication and cart merge; accounts, saved addresses, orders list, cancellation, status simulation; loading/empty/error polish; responsive shell; deploy; visual design and Impeccable polish; Site-Peel-driven fidelity; the full card form (a demo card field only); reviews, deals.

## Seed fixtures (test-support only)

A test helper inserts these rows directly into the tables (a fixture, not a mock). A production seed script comes in A2.

| Product | Variant id | Price | Stock |
|---|---|---|---|
| Test Kettle (`test-kettle`) | `var-kettle` | 2999 | 5 |
| Test Mug (`test-mug`) | `var-mug` | 1200 | 1 |

Provisional demo rules (ours, not Amazon's: **UNKNOWN / REQUIRES VALIDATION** against the checkout capture): shipping 499 cents when subtotal < 3500, else 0; tax 8% of subtotal, rounded half up; total = subtotal + shipping + tax.

## Test contract

Order is the order of work. **One RED test, minimum GREEN, then the next.** Never write them all first. Each expected value is a literal worked by hand, not recomputed from the code. Doubles: `Clock` fixed at `2026-10-03T12:00:00Z`; `IdGenerator` returns `ORD-0001`, tokens `g1`, `g2`; `PaymentProvider` fake returns `Approved{ reference:'pay-1', brand:'visa', last4:'4242' }` unless stated. Nothing else is faked.

| # | Behaviour | Public boundary | Test input | Expected output | Fails when | Minimal implementation |
|---|---|---|---|---|---|---|
| T1 | A product is retrievable by slug with its price and stock | `catalog.getProduct` | slug `test-kettle`; slug `nope` | Product titled "Test Kettle" with one variant `{ id:'var-kettle', priceCents:2999, stock:5 }`; `null` for `nope` | Returns nothing/wrong price; throws on unknown slug | Product/Variant tables, `getProduct` query |
| T2 | Adding an item puts a priced line in the actor's cart | `cart.addItem`, `cart.getCart` | actor `g1`, `var-kettle`, qty 2 | `ok`; one line, quantity 2, `lineTotalCents` 5998; `itemCount` 2; `subtotalCents` 5998 | No line, wrong totals, price read from client | Cart/CartItem tables; `addItem` reading price via `catalog.getVariant` |
| T3 | Adding the same variant again merges into one line | `cart.addItem` | after T2, add `var-kettle` qty 1 | One line, quantity 3, subtotal 8997 | Two lines or wrong quantity | Upsert on (cart, variant) |
| T4 | Quantity above stock is clamped and flagged | `cart.addItem` | fresh cart `g1`, `var-kettle` qty 9 (stock 5) | `ok`; line quantity 5; `clamped: true` | Quantity 9 accepted or an error returned | Clamp to `catalog` stock |
| T5 | Carts are isolated per actor | `cart.getCart` | `g1` has items; read as `g2` | `g2` cart empty, itemCount 0 | `g2` sees `g1`'s lines | Key cart by actor |
| T6 | Pricing: shipping threshold, tax rounding, total | `checkout.quoteCart` (pure, no DB) | cart subtotal 2999; cart subtotal 5998 | `{2999, ship 499, tax 240, total 3738}`; `{5998, ship 0, tax 480, total 6478}` | Wrong threshold side or rounding (239.92 → 240, 479.84 → 480) | Pure function with the provisional rules |
| T7 | Quote is computed from the server-side cart; empty cart is refused | `checkout.getQuote` | `g1` with 2 kettles; `g2` empty | `ok` quote total 6478; `{ ok:false, error:'EMPTY_CART' }` | Uses client numbers; empty cart yields a quote | `getQuote` = `cart.getCart` + `quoteCart` |
| T8 | Placing an order creates it, takes payment, empties the cart and decrements stock | `checkout.placeOrder`, then `cart.getCart`, `catalog.getAvailability` | `g1` with 2 kettles; address `{ name:'A B', line1:'1 Test St', city:'Testville', region:'TS', postalCode:'12345', country:'US' }`, email `a@example.test`, key `k1` | `ok`; order number `ORD-0001`, total 6478, one item `{ title:'Test Kettle', unitPriceCents:2999, quantity:2 }`, `placedAt` `2026-10-03T12:00:00Z`; cart empty; kettle quantity 3; fake provider called once with `amountCents` 6478 | Any of those wrong; payment not called or called with a client amount | `Tx`, `orders.createOrder`, `catalog.decrementStock`, `cart.clearCart`, `placeOrder` sequence |
| T9 | A declined payment changes nothing | `checkout.placeOrder`, `cart.getCart`, `catalog.getAvailability`, `orders.listOrders` | as T8 but fake returns `Declined('card_declined')` | `{ ok:false, error:'PAYMENT_DECLINED' }`; cart still 2 kettles; kettle quantity 5; `listOrders(g1)` empty | Stock or cart changed, order exists | Run all writes inside the transaction; decline aborts it |
| T10 | Stock is re-validated at placement | `checkout.placeOrder`, `orders.listOrders` | `var-mug` stock 1; `g1` and `g2` each add 1; `g1` places (ok); `g2` places | `g2` gets `{ ok:false, error:'OUT_OF_STOCK' }`; no order for `g2` | Oversell, or order created without stock | `decrementStock` refuses below zero, all-or-nothing |
| T11 | Placing twice with the same idempotency key creates one order | `checkout.placeOrder`, `orders.listOrders`, `catalog.getAvailability` | T8 input executed twice with key `k1` | Both calls `ok` with the same order number; `listOrders(g1)` length 1; kettle quantity 3 (decremented once) | Second order, double decrement, or error | Unique idempotency key on the order; return the existing order |
| T12 | An order is visible only to its owner | `orders.getOrder` | order from T8; read as `g1` and as `g2` | `g1` gets the order; `g2` gets `null` | `g2` can read it | Filter by owner in the query |
| T13 | Demo payment adapter rules | `payments.validateCardFormat`, `payments.demoProvider.authorize` | `4242424242424242`, `12/30`, `123`; `4242424242424241`; authorise `4000000000000002` | ok; Luhn-invalid rejected; `Declined` | Invalid card accepted; decline number approved | Luhn + expiry/CVC checks; a decline rule for the one test number |

After T13 is green: build the four thin pages against the modules, run the **manual browser checklist** (`docs/testing-strategy.md`), then add the single tier-1 **E2E purchase journey** (not before).

## Test rules for this slice

- Test only through the interfaces named in the "Public boundary" column. No private helpers, no reading tables to verify what the interface should tell you.
- Do not mock internal modules; `checkout` tests run the real `cart`, `catalog` and `orders` against a real test database.
- **Only** `Clock`, `IdGenerator` and `PaymentProvider` may be faked. If another double seems necessary, stop and explain before adding it.
- Add a behaviour only when a user-visible or money-safety reason exists. Edge cases beyond T1–T13 (zero quantity, negative quantity, tax edge) get a test when the code that handles them is written, one at a time.

## Open items (do not block the contract)

1. Test database: SQLite file, in-process Postgres (PGlite) or a Postgres container; chosen in A0 so tests stay fast and closest to production. The interfaces do not change.
2. Exact `Actor`, `Cart`, `Order` field names are fixed when the first test (T1/T2) is written.
3. Provisional shipping/tax rules are replaced if the checkout capture shows otherwise.
4. The thin pages' layout waits for the PDP, cart and checkout-review captures (`docs/recon/site-peel-request.md`). T1–T13 do not depend on Amazon source and can run first once seams are confirmed.

## Implementation record (Phase 1)

T1 to T13 were implemented exactly as specified, one RED then GREEN at a time. T5 passed on its first run (isolation followed from keying carts by actor); it stays as an invariant guard.

**Additions made while implementing (all additive; no boundary changed):**

| Item | Why |
|---|---|
| Tests T14 to T21: invalid quantity, out-of-stock add, set quantity (+clamp), remove/restore, set-quantity validation and ownership, re-add after remove, `placeOrder` on an empty cart, incomplete address | The UI needs cart editing, and the stop condition requires empty-cart, invalid-quantity, insufficient-stock, declined and success handling; each added test-first |
| `orders.findByIdempotencyKey(actor, key, tx?)` and `orders.getOrder` / `listOrders` | T11 needs a read before the write; T9/T12 need reads. `checkout` also takes a `pg_advisory_xact_lock` on `(actor, key)` so concurrent double submits serialise |
| Optional `tx?: DbOrTx` on read functions (`getProduct`, `getVariant`, `getAvailability`, `getCart`, `listOrders`, …) | Lets `placeOrder` read inside its transaction (consistent snapshot) |
| Modules are factories (`createCatalog({ db })`, `createCart({ db, catalog })`, …) wired in `src/server/app.ts` | Explicit dependency injection; the same wiring is used by the runtime and tests (`src/test-support/app.ts`) |
| Database: PGlite (in-process Postgres) + Drizzle migrations in `drizzle/` | Resolves open item 1; real Postgres semantics and transactions with no native build |
| `CartError` gains `LINE_NOT_FOUND` | Ownership check on line operations |
| ESLint `no-restricted-imports` | Enforces "import modules only through `index.ts`" and "modules do not import `app/` or `components/`" |

Authorising payment inside the database transaction is deliberate for the demo provider (synchronous, no money moves). A real provider would need a two-phase flow; out of scope.
