# Target architecture and decisions

Status: decision document, written from `docs/amazon-infrastructure-research.md`. No application code was changed; nothing is installed or deployed. Evidence labels as in the research document: **[DOC]** vendor documentation, **[OBS]** observed or reported behaviour, **[OSS]** open-source pattern, **[OURS]** our design decision.

## 0. Decisions in one page

| Question | Decision |
|---|---|
| Adopt Medusa, Vendure or Saleor? | **No.** Borrow concepts only. Vendure (GPLv3): no code copied, ever. |
| Replace PostgreSQL search? | **No.** Keep it. Synonyms and "did you mean" are optional Tier B additions on Postgres. |
| Stripe test mode? | **Yes**: PaymentIntent + Payment Element behind our `payments` boundary; **webhook is authoritative**, server-side retrieve is the fallback; the demo provider stays for tests and local development. |
| New inventory model? | **Reservations: yes (Tier A, required by Stripe).** Stock locations: Tier B. Warehouse management: cut. |
| Reviews? | **Yes (Tier A)**, verified purchase, demo account with delivered orders. |
| Returns/refunds? | Cancel-before-ship **refund** is Tier A (a paid order must give the money back); the return workflow is Tier B. |
| Promotions? | A small **pure pricing pipeline** and one or two coupon codes: Tier B. |
| Recommendations? | Similar products + recently viewed: Tier B. No ML, no "frequently bought together". |
| Account? | Addresses + reorder: Tier B. Saved cards via SetupIntent: Tier C. |
| Deployment timing? | **Recommend lifting the "do not deploy yet" hold now**: Stripe webhooks need a public HTTPS URL, so a deployed skeleton is a prerequisite of the payments slice, not an afterthought. This is your call; I have not deployed. |

## 1. The target flow

```text
Customer
  -> Discovery      search (Postgres full-text + trigram + structured facets) -> type -> attribute filters
  -> Product        a family of variants (SKU, price, stock, pictures) and offers
  -> Variant        multi-dimension picker resolves one real variant
  -> Offer          buy box or "other sellers": price, shipping, handling, fulfilment
  -> Cart           lines keyed by (variant, offer); coupon applied by the pricing layer
  -> Checkout       address, delivery estimate, final amount re-priced on the server
  -> Order          created as awaiting_payment, stock RESERVED (held with an expiry)
  -> Payment        PaymentIntent created server-side (metadata: order id), confirmed in the browser
  -> Webhook        payment_intent.succeeded (signed) -> payment succeeded
  -> Order paid     reservation committed, stock decremented, cart cleared, order is "placed"
  -> Fulfilment     derived timeline: shipped -> out for delivery -> delivered (seller handling delays it)
  -> Review/Return  verified review after delivery; return -> refund; cancel-before-ship -> refund
```

```text
Search
  -> Catalogue index   the products table itself (generated tsvector incl. attribute values, GIN, trigram)
  -> text + attributes + facets + ranking   catalog.findProducts(criteria)
```

## 2. Module map (existing boundaries preserved)

```text
app/ (pages, server actions, route handlers)        components/ (UI, never touches the database)
        |                                                   |
        v                                                   v
 server actions / route handlers  ---- thin: parse, call one module, redirect or respond
        |
        +--> search     policy: tokens, filler words, exact -> typo -> partial; suggest
        |        \--> catalog.findProducts
        +--> cart       lines by (variant, offer); merge; no pricing rules beyond line totals
        +--> checkout   ORCHESTRATOR: start checkout, confirm payment, cancel, refund
        |        +--> pricing (pure, inside checkout/internal): items -> promotions -> shipping -> tax -> total
        |        +--> cart, catalog (stock + reservations), orders, payments
        +--> orders     orders, items (snapshots), lifecycle (derived), cancel, returns (Tier B)
        +--> payments   PROVIDER PORT: demo provider, Stripe provider; payments, payment_events, refunds
        +--> catalog    products, types, attributes, variants, offers, stock, reservations
        +--> reviews    NEW: reviews, review_votes, aggregates input (verified flag supplied by the app layer)
        +--> auth       users, sessions
        +--> account    addresses (Tier B)
```

Dependency direction is unchanged: `checkout -> {cart, orders, payments, catalog}`; `cart -> catalog`; `search -> catalog`; `orders`, `payments`, `reviews`, `auth`, `account` depend on no other module. The app layer orchestrates `reviews` with `orders` (eligibility), exactly as sign-in orchestrates `auth` with `cart`.

**Interface changes, and why:**

- `payments`: the synchronous `authorize({card})` becomes a two-phase provider port: `createPayment`, `getPayment`, `verifyWebhook`, `refund` (section 4). The old demo behaviour is kept as one implementation of the new port.
- `checkout.placeOrder` is split into `startCheckout` (price, create awaiting-payment order, reserve stock, create payment) and `confirmPayment` (idempotent, called by the webhook and by the return page). `cancelOrder` gains the refund.
- `catalog` gains `reserveStock`, `commitReservation`, `releaseReservation`; availability subtracts active holds.
- `orders` gains payment-related states and `markPaid`; the lifecycle clock starts at the paid time.

## 3. Data model changes

| Table | Owner | Purpose |
|---|---|---|
| `payments(id, order_id, provider, provider_ref unique, status, amount_cents, currency, last_error, created_at, updated_at)` | payments | one row per PaymentIntent; the payment's own state machine |
| `payment_events(event_id pk, payment_id, type, processed_at)` | payments | webhook dedupe (Stripe delivers duplicates and out of order) [DOC] |
| `refunds(id, payment_id, order_id, amount_cents, status, reason, provider_ref)` | payments | refunds for cancellation and returns |
| `stock_reservations(id, order_id, variant_id, offer_id, quantity, expires_at, status held/committed/released)` | catalog | holds while payment is pending [OSS: Saleor/Medusa reservation] |
| `orders` (+ `payment_status`, `paid_at`, `payment_intent_id`) | orders | order and payment are separate facts |
| `reviews`, `review_votes` | reviews | verified reviews, one per user per product, one vote per user per review |
| `products` (+ `rating_histogram`) | catalog | aggregates maintained with the review |
| `coupons(code, kind, value, min_subtotal, active)` (Tier B) | checkout | one or two demo codes |
| `addresses(id, user_id, ..., is_default)` (Tier B) | account | address book |
| `returns(id, order_id, status, requested_at, ...)` (Tier B) | orders | return workflow |
| `inventory_locations`, `stock_levels` (Tier B) | catalog | virtual fulfilment centres |

No change to variants, offers, attributes, search indexes.

## 4. Payments design (Stripe test mode)

### 4.1 Provider port

```ts
interface PaymentProvider {
  createPayment(i: { orderId: string; amountCents: number; idempotencyKey: string }): Promise<{ providerRef: string; clientSecret: string | null }>;
  getPayment(providerRef: string): Promise<{ status: PaymentStatus; lastError: string | null }>;
  verifyWebhook(rawBody: string, signature: string): PaymentEvent | null;   // throws on a bad signature
  refund(i: { providerRef: string; amountCents: number; idempotencyKey: string }): Promise<{ providerRef: string }>;
}
```

- **Stripe provider** (server only; secret key never reaches the browser): `createPayment` creates a PaymentIntent with `metadata[order_id]` and an **idempotency key derived from the order**, returning the client secret [DOC]; `getPayment` retrieves it; `verifyWebhook` uses `constructEvent` on the raw body [DOC]; `refund` uses the Refunds API [DOC].
- **Demo provider** (kept): same port, in-process. Its "client confirmation" is the existing card form posted to a server action, with the documented decline number. **Tests still fake only Clock, IdGenerator and PaymentProvider.**
- Selection by configuration: `STRIPE_SECRET_KEY` present -> Stripe, otherwise demo. A failed Stripe configuration never silently becomes "paid".

### 4.2 Sequence

```text
Browser            Server action / checkout            payments (Stripe)          Stripe            Webhook route
  | submit address   |                                    |                          |                    |
  |----------------->| startCheckout: re-price, create order(awaiting_payment),
  |                  |   reserve stock (expires in 15 min), createPayment ---------->| PaymentIntent      |
  |<-- clientSecret -|<-------------------------------------------------------------|                    |
  | Payment Element confirms with Stripe.js (card data goes to Stripe, never to us) ->|                    |
  |                  |                                                              | requires_action?   |
  |<================ 3-D Secure challenge handled by Stripe.js ====================>|                    |
  |                  |                                                              |--- payment_intent.succeeded (signed) -->|
  |                  |                                              confirmPayment(orderId, event id) <--- verify signature, raw body
  |                  |   idempotent: payment succeeded, order paid, reservation committed, cart cleared
  | redirect to /checkout/confirmation/[id] (server re-reads the order; if still awaiting payment,
  |                  |   getPayment(providerRef) from Stripe and run the same confirmPayment) -> never trusts the browser
```

### 4.3 Two state machines (never mixed)

```text
Payment:  created -> requires_payment_method <-> requires_action -> processing -> succeeded
                              |  (decline: back to requires_payment_method, same PaymentIntent, retry)
                              +-> canceled (hold expired / order cancelled before paying)
          succeeded -> partially_refunded | refunded

Order:    awaiting_payment -> placed(paid) -> shipped -> out_for_delivery -> delivered
          awaiting_payment -> expired        placed -> cancelled (+ refund)       delivered -> return_requested -> return_approved -> refunded (Tier B)
```

The order lifecycle clock (shipped, out for delivery, delivered) starts at `paid_at`, not at order creation.

### 4.4 Rules that make it correct

- **Idempotency:** one PaymentIntent per checkout attempt (idempotency key from the order id); `confirmPayment` is a no-op if the order is already paid; webhook events are recorded by `event.id` so duplicates and reordering are harmless [DOC].
- **Amount authority:** the server re-prices the cart; the PaymentIntent amount is the server's total; if the cart changes, the intent is updated or replaced, never trusted from the client.
- **Retry after failure:** decline returns the intent to `requires_payment_method`; the same intent and order are reused [DOC]; the stock hold remains until it expires.
- **Expiry:** holds and awaiting-payment orders expire after 15 minutes; expiry is applied **lazily** (on read or on the next checkout) with no background worker; the PaymentIntent is cancelled best-effort.
- **No falsely paid orders:** an order becomes `placed` only through `confirmPayment`, which is only reachable from a verified webhook or a server-side retrieve of the intent.
- **Secrets:** `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` only in server environment; the publishable key is the only Stripe value sent to the browser; `.env.example` lists names only.
- **Runtime:** the webhook is an App Router route handler with `export const runtime = "nodejs"` and the raw body from `request.text()` [OSS].
- **Fallback if the webhook cannot be delivered** (misconfiguration, outage): the confirmation page's server-side retrieve completes the order, so a customer is never stuck; the missed webhook is later a no-op. Documented limitation: without a webhook an abandoned tab (customer paid and closed the browser) is only completed when someone loads the page, which is why the webhook is primary.

### 4.5 Acceptance journey (maps your 14 criteria)

| # | Criterion | Verification |
|---|---|---|
| 1-3 | real variant, cart, final amount | existing E2E + unit tests on the pricing pipeline |
| 4 | server creates a PaymentIntent | provider contract test with the fake provider; manual on Stripe test mode |
| 5 | Stripe test UI shown | manual/semi-automated on the deployed preview (Payment Element is an iframe) |
| 6 | success `4242...` | manual + optional Playwright run when keys exist |
| 7 | confirmation verified server-side/webhook | **integration test**: signed webhook payloads built with the SDK's test-signature helper run through `verifyWebhook` and `confirmPayment`; manual `stripe trigger` / real test payment |
| 8 | order -> paid/placed | integration test |
| 9 | inventory committed correctly | integration test (hold -> committed; decline -> released) |
| 10 | confirmation shows payment/order state | E2E on demo provider; manual on Stripe |
| 11 | PaymentIntent id stored on the order | integration test |
| 12 | failed card creates no paid order | integration test (decline event) + manual `4000 0000 0000 0002` |
| 13 | retry after failure works | integration test + manual |
| 14 | duplicate submission safe | integration tests: same idempotency key; duplicate webhook event id; double `confirmPayment` |
| extra | declined / authentication-required / insufficient funds | manual with `4000000000000002`, `4000002760003184`, `4000000000009995` |

Automated E2E runs on the demo provider (deterministic, no keys). A separate, optional Playwright project (skipped without keys) drives the Stripe Payment Element on the deployed URL with test cards; it is expected to be fragile (iframe) and is not part of the required gate.

## 5. Inventory, reservations and (optional) locations

- **Tier A:** `stock_reservations`; *saleable = stock (or offer stock) minus active, unexpired holds*; `startCheckout` holds, `confirmPayment` commits (decrements stock), failure/expiry/cancel releases. Mirrors Vendure's "allocate at payment authorised/settled, release on cancellation" and Saleor's reserved vs allocated counters [DOC].
- **Tier B (stock locations):** 2-3 virtual fulfilment centres (for example East, Central, West), `stock_levels(variant_id|offer_id, location_id, on_hand)`, a nearest-location rule from the shipping state, "ships from" on the product page, delivery estimate = location transit + seller handling. `variants.stock` becomes the sum (kept consistent in the same transaction) so existing reads keep working. Risk is every place that reads stock; do it only after Tier A and the deploy are green.

## 6. Pricing layer (Tier B)

```text
price(cart, coupon?) = items -> promotion (coupon) -> shipping (first-party rule + seller shipping) -> tax -> total
```

Pure functions, unit-tested without a database, shown as "You save" and "Coupon" lines in cart and checkout. Two demo codes (percentage; free shipping). No campaigns, budgets, quantity pricing or price lists.

## 7. Reviews

As in the research document, section 8: verified flag decided server-side from a delivered, non-cancelled, non-refunded order; aggregates and histogram updated in the same transaction; helpful votes; demo account with delivered orders seeded so a reviewer can post at once; no moderation UI, no review images. Orchestration in the app layer; `reviews` stays independent.

## 8. Recommendations, account

- **Similar products** (same type, nearest price, shared attributes) and **recently viewed** (cookie): Tier B.
- **Addresses with a default, reorder**: Tier B. Saved cards via SetupIntent, profile, sessions: Tier C.

## 9. Search

Unchanged architecture (`catalog.findProducts`, generated `search` vector including attribute values, trigram, structured facets). Optional Tier B additions on Postgres: a **synonym map** applied to tokens (for example "tv" -> "television") and a **"did you mean"** nearest-title suggestion for zero results. No external engine; Meilisearch (MIT) is the documented fallback if a future requirement truly needs as-you-type instant search.

## 10. Infrastructure and deployment topology

```text
Browser ---> Vercel (Next.js, Node runtime) ---> Neon Postgres (pooled)
                  ^         |
   Stripe webhook |         +--> Stripe API (test mode, secret key server-side only)
   (public HTTPS, signed)
```

Environment (names only): `DATABASE_URL`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`. Local: PGlite + demo provider; Stripe CLI `listen --forward-to` for webhook tests.

**Failure modes:** webhook missed -> return-page retrieve completes it; Stripe down -> checkout shows an error, no order is marked paid, holds expire; duplicate/out-of-order events -> event-id dedupe and idempotent `confirmPayment`; database down -> error page, nothing paid is lost because Stripe's retries re-deliver the event; abandoned payment -> hold expires, order expires.

## 11. The flagship journey: what is real and what is simulated

| Step | Status |
|---|---|
| Search, filter, structured facets | **Real** (built) |
| Product, multi-dimension variant | **Real** (built) |
| Select offer (buy box / other sellers) | **Real** (built) |
| Add to cart | **Real** (built) |
| Address | **Real** (form; saved addresses Tier B) |
| Shipping and delivery estimate | **Real calculation, simulated timeline** (compressed demo clock, seller handling) |
| Stripe payment | **Real in test mode** (Tier A), demo provider locally |
| Order and order status | **Real** (derived lifecycle, payment state separate) |
| Fulfilment and delivered | **Simulated** (time-derived, no warehouse system; locations Tier B) |
| Verified review | **Real rules, seeded demo account** with delivered orders (Tier A) |
| Return/refund | **Simulated workflow, real provider refund call** (Tier B; cancel-refund Tier A) |

## 12. Tiers (selection value / hours / regression risk)

| Tier | Item | Hours | Risk | Why |
|---|---|---|---|---|
| **A: must** | Deploy skeleton (Neon + Vercel) | 2-3 | medium | prerequisite for webhooks; the brief's gate |
| **A** | Reservations + two-phase checkout + order/payment state separation (on the demo provider first) | 4-5 | **high** (core flow) | makes any real payment safe; fully testable without Stripe |
| **A** | Stripe test mode provider, Payment Element UI, webhook, fallback, refund on cancel, tests | 5-6 | medium | the requested flagship integration |
| **A** | Reviews (verified, aggregates, histogram, helpful votes, seeded demo account) | 4-5 | medium | ratings need a real model |
| **A** | QA: Impeccable on new UI, responsive/a11y audit, live gate, latency on Neon | 3-4 | low | the acceptance gate |
| **B** | Returns workflow (+ restock) | 3 | medium | completes post-purchase |
| **B** | Coupon + pricing pipeline | 2-3 | low | savings behaviour |
| **B** | Similar products + recently viewed | 2 | low | Amazon-like rails |
| **B** | Addresses + reorder | 3 | low | account depth |
| **B** | Stock locations + "ships from" | 4-5 | medium-high | realism; touches stock reads |
| **B** | Search synonyms + did-you-mean | 2 | low | search polish |
| **C: cut** | Replacing search with Typesense/Meilisearch/OpenSearch; adopting a commerce engine; ML or "frequently bought together"; saved cards (SetupIntent); review images and moderation; seller pages; per-line shipments; price lists and campaigns; warehouse management | n/a | n/a | poor value per hour or high risk |

Tier A totals about **18-23 hours**; the remaining budget decides how much of Tier B happens. Tier B items are independent and can be taken in any order.

## 13. Final recommendation

### A. What we should actually build (priority order)

1. Deploy the current build (Neon + Vercel) so a public HTTPS URL exists.
2. Reservations, two-phase checkout and payment/order separation, proved on the demo provider.
3. Stripe test mode behind the provider port, webhook authoritative, fallback retrieve, refund on cancel.
4. Verified reviews with the seeded demo account.
5. Final QA and the live gate (Tier A complete: freeze).
6. Tier B in value order: similar products + recently viewed, coupon pricing layer, returns workflow, addresses + reorder, synonyms, stock locations.

### B. What we should borrow

- **Vendure**: stock on hand / allocated / saleable; allocate on payment, release on cancel; movement-log idea; options vs facets. *Concepts only (GPLv3).*
- **Medusa**: inventory item -> location -> level -> reservation; availability scoped to serving locations; promotion = rules + application method (+ campaign). *Concepts only.*
- **Saleor**: reserved vs allocated counters; warehouses as locations. *Concepts only.*
- **Stripe**: PaymentIntent lifecycle, client secret only in the browser, metadata with the order id, idempotency keys, signed webhooks with event-id dedupe, documented test cards, Refunds API. *Dependency: the Stripe Node SDK (MIT) and Stripe.js / Payment Element.*
- **PostgreSQL**: full-text, trigram, jsonb + GIN (already in use).

### C. What we should NOT borrow

- Medusa/Vendure/Saleor as a platform (replaces our architecture, adds a service, Vendure's licence).
- Typesense (GPL-3.0, second service), OpenSearch (heavy), and Meilisearch for now (second service, sync, hosting) without a capability Postgres cannot supply.
- Checkout Sessions as the pricing authority (we price our own cart); Stripe-hosted tax.
- Any recommendation ML, saved-card management, review images, warehouse management.

### D. Final Amazon-like architecture

Sections 1-3 and 10 above: the existing eight modules plus `reviews`; `payments` becomes a provider port with a Stripe and a demo implementation; `checkout` orchestrates a two-phase, idempotent, reservation-backed flow with a pure pricing layer; `catalog` owns stock and reservations; `orders` separates payment state from a derived fulfilment lifecycle; PostgreSQL remains the search engine; Vercel + Neon + Stripe test mode is the topology.

### E. Implementation sequence (vertical slices, test-first)

1. **Deploy** current build; verify the live gate items that do not need payments; record latency on Neon.
2. **Reservations + two-phase checkout + payment/order states** (demo provider): tests for hold, commit, release, expiry, idempotent confirm, double submit, decline-then-retry; E2E journey updated.
3. **Stripe provider + webhook route + Payment Element + refund-on-cancel**: integration tests with signed test payloads; manual test-card runs (success, decline, insufficient funds, authentication required); register the webhook; verify on the public URL.
4. **Reviews + seeded demo account**: eligibility rules, aggregates, histogram, votes; PDP section; E2E with the demo account.
5. **QA and freeze**: Impeccable on new UI, responsive/a11y, 15-point gate on the live URL, evidence recorded.
6. Tier B slices in the value order of A.6, one commit each, stopping at the hard stop.

### F. 24-hour survival plan (cut order if time runs out)

Cut in this order, never cutting the item after it: stock locations -> addresses/reorder -> returns workflow -> synonyms/did-you-mean -> similar products/recently viewed -> coupon pricing layer -> review helpful votes -> **Stripe provider (fall back to the demo provider, keep reservations and payment/order separation)** -> reviews -> deploy QA depth. **Never cut:** the deployed public URL, reservations with payment/order separation (correctness), and the verified-review model (credibility). If Stripe is cut, the architecture still holds because the provider port, the webhook-shaped confirm path and the state machines are in place and tested with the demo provider.

**Hard stop:** feature freeze when Tier A is deployed and verified on the public URL, or at 65% of the remaining time, whichever comes first; after that only fixes, the gate and evidence.

## 14. What I need from you (not before you say go)

- A decision on **lifting the deploy hold** (recommended: yes, now).
- For deployment: the Neon pooled `DATABASE_URL` and the Vercel project (same three steps as before).
- For Stripe: a **Stripe account in test mode** and its **test** secret key, publishable key and webhook signing secret, entered only in Vercel's environment settings (never in chat or the repository). I will register the webhook URL steps for you to perform in the Stripe dashboard.
