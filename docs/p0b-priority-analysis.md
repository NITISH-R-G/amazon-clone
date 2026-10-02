# P0-B priority analysis

Status: written before any Phase 4 code change. Evidence comes from the code, the git history (Phase 3 = `3fc9ef4`..`36a9cac`), a production build driven with Chromium (Playwright) at 1440 and 390, and live HTTP queries against `/s`. Anything not yet exercised is marked **NOT YET VERIFIED**.

## A. Current product state

**Working (verified):**

- Discovery: home (hero, category tiles, three rails), `/s` results with URL-driven filters (category, price bucket, rating, in stock, on sale), sort, pagination, applied-filter chips, mobile filter sheet, empty state; header search with suggestions. 30 products, 6 categories, 5 products with several variants.
- Product page: gallery, rating, price, variant radio group, availability, quantity stepper, shipping/cost note, sticky mobile add-to-cart.
- Cart: add, change quantity, remove with undo, stock clamp message, savings, estimated shipping/tax/total, checkout link, empty state.
- Checkout: single page (address, demo card, summary), server-side re-pricing, idempotent order placement, field validation messages, declined-card message, redirect to confirmation. Confirmed in Chromium at 1440 and 390: decline (`4000 0000 0000 0002`) keeps address and cart, then success with `4242...`.
- Confirmation: order number, items, totals, address, payment brand/last4.
- 35 unit/integration tests (cart, catalog, search, checkout, orders, payments, seed) and one E2E journey (desktop + mobile) all pass. No horizontal overflow and no console errors on cart, checkout, confirmation at 1440 and 390.

**Not working or missing (verified):**

- `auth` and `account` modules are empty. `/sign-in`, `/orders`, `/account` return 404. A guest's order is only reachable through the cookie that placed it, so there is **no way to find an order again** and no order history.
- `Order.status` is the single value `placed`; there is no lifecycle.
- Search is a strict AND of substrings. Measured live: `Echo Spot`, `home and kitchen`, `wireless headphones`, `wireless head`, `wireles headphnes` and `desk lamp` all return zero results; `wireless`, `headphone`, `coffee`, `kitchen`, `mug` return results. Stop words ("and") and one-letter typos break the query, and the empty state does not offer a way out beyond "remove a filter".
- Checkout and confirmation still use the Phase 1 styling (stacked bordered cards, heavy bold headings, green headline): visually behind the Phase 3 pages. On mobile the order total is the last element on the page. After a decline the card number, expiry and code are cleared (sensitive fields are deliberately not echoed) and must be retyped. "Visa Ending In 4242" is mis-capitalised.
- Deployment: PGlite on a serverless host does not keep state between instances; production database is an open decision (`docs/architecture.md` section 12).

**NOT YET VERIFIED:** keyboard order and focus on every route, screen-reader announcements, contrast numbers, the mobile filter sheet and suggestion box under real interaction, widths 320/430/768/1024, 404 and error pages, loading skeletons, Impeccable critique/audit (only `detect` has run, with no findings).

## B. Critical user journeys

### Journey 1: Discovery (Home → Search → Results → PDP)

Works for exact and partial single words. Weak for multi-word, stop-word and misspelled queries (see search findings). Filters and sort are present; combinations are covered by unit tests but not yet by browser tests.

### Journey 2: Purchase (PDP → Add to Cart → Cart → Checkout → Confirmation)

Complete and verified end to end including decline recovery. Friction: totals are known late on mobile checkout; card fields clear after an error; confirmation has no next step beyond "Continue shopping" and no way to return to the order.

### Journey 3: Returning customer (Sign in → Account → Orders → Order detail)

Absent. The largest functional gap: purchase has no lasting consequence, and a guest cart cannot follow a user through authentication because no authentication exists.

### Journey 4: Recovery

| Case | Status |
|---|---|
| out-of-stock | Server rejects (`OUT_OF_STOCK`), cart shows per-line message and blocks checkout. Verified in unit tests; not browser-exercised in this phase. |
| invalid input | Per-field messages with `aria-describedby`; verified by an empty submit in Chromium. |
| payment declined | Clear message, cart and address kept, no charge. Verified. Card fields must be retyped. |
| empty cart | Cart and checkout show empty states with a next action. |
| empty search | Empty state exists; recovery is weak (no suggestions, no category links). |
| removed item | Undo works (cart). |
| checkout failure (server error) | Generic error boundary: "Nothing was charged. Please try again." Not exercised. |
| session/auth boundary | Not applicable until auth exists; stale guest cookie handled (cart treated as empty). |

## C. Gap matrix

Priority is a judgment from impact, judging signal and journey criticality against cost and risk. It is not a score.

| Gap | User impact | Judging signal | Effort | Risk | Priority |
|---|---|---|---|---|---|
| No auth, no orders list/detail (Journey 3) | High: cannot return to a purchase; a cart cannot persist across sign-in | High: roadmap B1/B2; checks product completeness | M | Low-medium (session cookie, password hashing, merge) | **P1 - do now** |
| Guest to account cart merge and guest-order claim | High: avoids losing the cart or the order on sign-in | High: named explicitly in the brief | S-M | Medium (merge conflicts on stock/quantity) | **P1 - do now** |
| Search is brittle (stop words, typos, multi-word) | High: first query that misses reads as "no such product" | High: search quality is called out | S-M | Low (pure module, test-first) | **P1 - do now** |
| Checkout and confirmation behind the D20 system; mobile total hidden; "Ending In" bug; decline clears card | Medium-high: trust moment of the funnel | High: visible inconsistency in the key flow | M | Low | **P1 - do now** |
| Confirmation has no path to the order or history | Medium | Medium | S (follows the orders slice) | Low | **P1 - do now** |
| Accessibility audit (keyboard, focus, names, contrast, sheet focus) | Medium-high | High | S-M | Low | **P1 - do now** |
| Browser evidence: widths 320/375/390/430/768/1024/1440 on every route | n/a (verification) | High: required evidence | M | Low | **P1 - do now** |
| E2E: discovery, decline-recovery, mobile, auth/cart | n/a (safety net) | High | M | Low | **P1 - do now** |
| Impeccable critique and audit on the real UI | Medium | High | S | Low (reject anything that breaks D20) | **P1 - do now** |
| Deployment: production database and hosting | High for a live demo | High | M | **High**: needs user-owned account decision | Document now, decide with user (Strategic) |
| Address book / account hub | Medium (repeat purchase) | Medium | M | Low | Strategic (after the above) |
| Order status progression (shipped/delivered simulation) | Low-medium | Low-medium | M | Low | Defer |
| Delivery estimate on PDP | Medium | Medium | S | Low (rule is invented: label as demo) | Strategic, only if time remains |
| Order cancellation | Low | Low | M | Medium | Defer |
| Image zoom on PDP | Low (illustrations) | Low | S-M | Low | Defer |

## D. Explicitly rejected work

Not built in this phase: reviews and review submission, wishlists/save for later, recommendations and "customers also bought", coupons and gift cards, subscriptions, returns portal, customer service/help hub, personalization, dark mode, bottom navigation, social login/OAuth, real payment providers, "buy now", loyalty, order cancellation, admin dashboard, AI search, microservices, page-transition animation. Reason: none of them improve a verified journey gap, and each adds surface that has to be tested and designed to D20.

### Priority quadrant

```text
                          HIGH USER VALUE
                                │
   DO NOW                       │   STRATEGIC
   - auth + session + sign-out  │   - address book / account hub
   - cart merge, guest-order    │   - delivery estimate on PDP
     claim                      │   - production DB + deployment (needs user)
   - orders list + detail       │
   - search: stop words,        │
     typo tolerance, recovery   │
   - checkout/confirmation to   │
     D20, mobile total, retry   │
   - a11y audit and fixes       │
   - E2E for 4 journeys         │
   - Impeccable critique+audit  │
  ──────────────────────────────┼──────────────────────────────
   DEFER                        │   AVOID
   - order status simulation    │   - reviews, wishlists, coupons
   - order cancellation         │   - recommendations
   - PDP image zoom             │   - dark mode, bottom nav
                                │   - OAuth, real payments
                          LOW USER VALUE
```

## Verification log (to be extended with evidence as work lands)

| Viewport | Route | Action | Expected | Observed |
|---|---|---|---|---|
| 1440, 390 | `/dp/*` → `/cart` | Add to cart | Cart with line and totals | As expected |
| 1440, 390 | `/checkout` | Empty submit | Field errors, summary unchanged | Field errors shown |
| 1440, 390 | `/checkout` | Decline card `4000...0002` | Error banner, address kept, no order | As expected; card fields cleared |
| 1440, 390 | `/checkout` | Valid card | Redirect to confirmation | As expected |
| 1440, 390 | `/orders`, `/sign-in`, `/account` | GET | Pages | **404** (gap) |
| 1440, 390 | cart, checkout, confirmation | Overflow check | none | none; no console errors |
