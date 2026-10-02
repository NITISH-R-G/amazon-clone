# Module contracts (locked for Phase 1)

Eight deep modules; no `pricing` and no `product` module (product display is a view over `catalog`; price math lives in `cart` and `checkout`). A new module needs a concrete requirement that these cannot serve, recorded as an ADR. Signatures below are the contract's **shape**; exact TypeScript lands in the slice that implements each module and is agreed as a test seam first (`docs/agents/workflow.md`).

## Shared vocabulary (tiny, in `lib/`)

- `Money` = integer cents (`number`), currency fixed to USD for now. Never floats.
- `Actor` = `{ userId: string } | { guestToken: string }`: who is acting. Cart and orders are owned by an Actor.
- `Result<T, E>` = `{ ok: true, value: T } | { ok: false, error: E }`; expected failures are values, bugs throw.
- **Ports** (the only things faked in tests): `Clock { now(): Date }`, `IdGenerator { orderNumber(): string; token(): string }`, `PaymentProvider` (module `payments`).
- `Tx`: an opaque database transaction handle. Only `checkout` opens one; `catalog`, `cart` and `orders` expose write functions that accept an optional `tx` so one order is atomic. This is the single cross-module mechanism.

## Rules

1. Import only from `modules/<name>` (its `index.ts`). No module imports `app/` or `components/`.
2. A module owns its tables; no other module queries them.
3. **Orchestration** across modules belongs to `checkout` (placing an order) or to the `app/` server action (e.g. after sign-in: `auth.signIn` then `cart.mergeGuestCart`; `auth.requireUser` then `account.listAddresses`). Modules do not call `auth` to find out who the user is; they receive an `Actor`/`userId`.
4. Dependency direction, no cycles: `checkout → {cart, orders, payments, catalog}`; `cart → catalog`; `search → catalog`. `orders`, `payments`, `auth`, `account`, `catalog` depend on no other module.
5. Test seams are these public interfaces. Fake only the ports above. Everything else runs real against a real test database.

## catalog

1. **Responsibility**: products, variants, categories, prices, stock, images; the source of truth for what is for sale and whether it is available. Also decrements stock for a placed order.
2. **Public interface**: `getProduct(slug) → Product | null` · `getVariant(id) → Variant | null` · `listProducts({ categoryId?, ids?, limit? }) → Product[]` · `listCategories() → Category[]` · `getAvailability(variantId) → { inStock, quantity }` · `decrementStock(lines, tx?) → Result<void, OutOfStock>`.
3. **Inputs**: slugs, ids, filters; `{ variantId, quantity }[]` for stock.
4. **Outputs**: `Product { id, slug, title, brand, description, category, images[], rating, variants[] }`, `Variant { id, attrs, priceCents, listPriceCents?, stock }`.
5. **Owns**: `Category`, `Product`, `Variant`, `ProductImage`, stock counts, seed data.
6. **May call**: nothing (leaf).
7. **Must not know**: carts, orders, users, search ranking, UI.
8. **Unit** (pure, through the interface): money/price helpers it exports, list-price-to-discount percentage. **Integration** (real test DB): get by slug, unknown slug returns null, availability reflects stock, decrement refuses to go below zero and is all-or-nothing across lines. **E2E/browser**: PDP shows title, price, availability (part of the tier-1 purchase journey; no dedicated catalog E2E).

## search

1. **Responsibility**: turn a query plus filters into ranked, filtered, sorted, paginated results with facets; parse and serialise the URL form.
2. **Public interface**: `searchProducts(query: SearchQuery) → SearchResult` · `parseSearchParams(URLSearchParams) → SearchQuery` · `toSearchParams(SearchQuery) → URLSearchParams` · `suggest(text) → Suggestion[]` (P1).
3. **Inputs**: `SearchQuery { text?, categoryId?, priceRange?, minRating?, sort, page, pageSize }`.
4. **Outputs**: `SearchResult { items: ProductSummary[], total, page, facets }`.
5. **Owns**: search index/view if any (none at first: queries catalog tables through `catalog`).
6. **May call**: `catalog`.
7. **Must not know**: cart, checkout, orders, auth, UI.
8. **Unit** (no DB): `parseSearchParams`/`toSearchParams` round trip, invalid params fall back to defaults, sort and page bounds. **Integration**: filters combine, sort order, pagination, empty result, facet counts. **E2E**: search → results → product (inside the purchase journey); filters/back button are tier 3.
   *Not in the tracer bullet.*

## cart

1. **Responsibility**: the shopper's pending selection: lines, quantities, totals; guest and signed-in; merge on sign-in.
2. **Public interface**: `getCart(actor) → Cart` · `addItem(actor, variantId, qty) → Result<Cart, CartError>` · `setQuantity(actor, lineId, qty)` · `removeItem(actor, lineId)` · `restoreItem(actor, lineId)` (undo) · `mergeGuestCart(guestToken, userId)` · `clearCart(actor, tx?)` · `saveForLater` (P1).
3. **Inputs**: `Actor`, variant ids, quantities.
4. **Outputs**: `Cart { id, lines: [{ id, variantId, title, unitPriceCents, quantity, lineTotalCents, available }], itemCount, subtotalCents }`; a `clamped` flag on a line when quantity was reduced to stock.
5. **Owns**: `Cart`, `CartItem` (including soft-removed rows for undo).
6. **May call**: `catalog` (prices, titles, availability).
7. **Must not know**: shipping, tax, payment, orders, auth, UI.
8. **Unit**: none beyond totals through the interface (totals are tested with the DB-backed interface; no internal tests). **Integration**: add merges the same variant; quantity clamps to stock; remove then restore; subtotal in cents; guest merge into user cart (sum, clamp); unknown variant refused; carts are isolated per actor. **E2E**: add to cart and see it in the cart page (tracer purchase journey); undo and merge-on-sign-in are tier 2/3.

## checkout

1. **Responsibility**: turn a cart into an order: price it (shipping, tax, total), validate stock, take payment, create the order atomically. The only orchestrating module.
2. **Public interface**: `quoteCart(cart, address?) → Quote` (pure) · `getQuote(actor, { address? }) → Result<Quote, CheckoutError>` · `placeOrder(actor, input, ports) → Result<Order, CheckoutError>`, `input = { address, contactEmail, payment, idempotencyKey }`.
3. **Inputs**: `Actor`, `ShippingAddress { name, line1, line2?, city, region, postalCode, country }`, `PaymentInput`, idempotency key. The client never sends prices or totals.
4. **Outputs**: `Quote { subtotalCents, shippingCents, taxCents, totalCents }`; `Order` (from `orders`); `CheckoutError` ∈ `EMPTY_CART | OUT_OF_STOCK | PAYMENT_DECLINED | INVALID_ADDRESS`.
5. **Owns**: pricing rules (provisional demo rules: free shipping at or above 3500 cents else 499; tax 8% rounded half up). No tables (idempotency key is stored on the order).
6. **May call**: `cart`, `catalog` (via `decrementStock`), `orders` (`createOrder`), `payments` (`PaymentProvider`).
7. **Must not know**: `auth`, `account`, `search`, UI, card numbers beyond handing them to `payments`. Addresses arrive as values; saved-address lookup is the app layer's job.
8. **Unit** (no DB): `quoteCart` (free-shipping threshold, tax rounding, empty cart). **Integration**: place order success (order created, cart emptied, stock decremented, one atomic transaction); declined payment leaves cart, stock and orders unchanged; out of stock refused; double submit with the same idempotency key creates one order; totals come from the server. **E2E**: tier-1 purchase journey and the declined-payment failure journey.

## orders

1. **Responsibility**: what was bought and what happened to it: the purchase-time snapshot, lookup scoped to the owner, status over time, cancellation.
2. **Public interface**: `createOrder(data, tx?) → Order` (called by `checkout` only) · `getOrder(actor, id) → Order | null` · `listOrders(actor) → Order[]` · `cancelOrder(actor, id) → Result<Order, NotCancellable>` (P1) · `statusAt(order, now) → OrderStatus` (pure).
3. **Inputs**: snapshot data (items with title, unit price, image; totals; address; contact email; payment reference; idempotency key; placed-at from `Clock`; number from `IdGenerator`), `Actor`.
4. **Outputs**: `Order { id, number, status, items[], totals, address, placedAt, owner }`.
5. **Owns**: `Order`, `OrderItem`.
6. **May call**: nothing (reads `Clock`).
7. **Must not know**: cart, catalog (it stores a snapshot, never reads live prices), payments, auth, UI.
8. **Unit**: `statusAt` (placed, shipped, delivered derived from elapsed time with a fixed `Clock`). **Integration**: `getOrder` returns only the owner's order; snapshot unchanged after the product's price changes; list is newest first; cancel refused after shipped. **E2E**: confirmation shows the order (tracer); orders list and detail match (tier 1, after B2).

## auth

1. **Responsibility**: identity and sessions: identifier-first sign-in, registration, session lifecycle, route protection.
2. **Public interface**: `checkIdentifier(email) → { exists }` · `register(input) → Result<User, AuthError>` · `signIn(input) → Result<Session, AuthError>` · `signOut()` · `getSession() → Session | null` · `requireUser(returnTo) → User` (redirects).
3. **Inputs**: email, password, `returnTo`.
4. **Outputs**: `User { id, email, name }`, session cookie.
5. **Owns**: `User`, sessions.
6. **May call**: nothing.
7. **Must not know**: cart, orders, checkout, catalog (post-sign-in cart merge is orchestrated in `app/`).
8. **Unit**: password policy and email validation exports. **Integration**: duplicate email refused; wrong password gives a generic error; session persists; protected route redirects with `returnTo`. **E2E**: register, sign out, sign in, protected redirect (tier 2).
   *Not in the tracer bullet.*

## payments

1. **Responsibility**: authorise a payment through a swappable provider; hold card-format rules for the demo provider.
2. **Public interface**: `PaymentProvider.authorize({ amountCents, method, idempotencyKey }) → Approved { reference, brand, last4 } | Declined { reason }` · `demoProvider` (default adapter) · `validateCardFormat(number, expiry, cvc) → Result`.
3. **Inputs**: amount, card method.
4. **Outputs**: approval reference and brand/last4 only; never the full card number.
5. **Owns**: nothing persistent.
6. **May call**: nothing.
7. **Must not know**: carts, orders, users, UI.
8. **Unit**: `validateCardFormat` (Luhn, future expiry, CVC length); `demoProvider` approves a published test number and declines a designated decline number (4000 0000 0000 0002). **Integration**: `checkout` uses a **fake provider** in tests (this is a true boundary). **E2E**: the declined-card path in the failure journey.

## account

1. **Responsibility**: the signed-in user's saved addresses and profile.
2. **Public interface**: `listAddresses(userId)` · `saveAddress(userId, address)` · `deleteAddress(userId, id)` · `setDefaultAddress(userId, id)` · `getProfile(userId)` · `updateProfile(userId, patch)`.
3. **Inputs**: `userId` (from `auth.requireUser`, supplied by `app/`), address and profile fields.
4. **Outputs**: `Address[]`, `Profile`.
5. **Owns**: `Address`, profile fields.
6. **May call**: nothing.
7. **Must not know**: auth internals, cart, checkout, orders.
8. **Unit**: address validation exports. **Integration**: one default address at a time; users cannot read each other's addresses; delete reassigns default. **E2E**: add an address and use it in checkout (tier 3).
   *Not in the tracer bullet.*

## Cross-module test summary

| Test level | Where | Doubles allowed |
|---|---|---|
| Unit | Pure functions exported from a module `index.ts` | none needed |
| Integration | Module interface + real test DB | `Clock`, `IdGenerator`, `PaymentProvider` only |
| E2E / browser | Whole app | none; payment uses the demo provider |

If a test seems to need another double, stop and explain before adding it.
