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

## Outcome (after implementation)

| Gap | Result |
|---|---|
| Auth, session, sign-out | Done: `auth` module (T36-T40), `/sign-in`, `/register`, header links, `returnTo` validated (T44). |
| Cart merge, guest-order claim | Done: `cart.mergeGuestCart` (T41-T42), `orders.claimGuestOrders` (T43), orchestrated in `auth-actions.ts`. |
| Orders list/detail | Done: `/orders`, `/orders/[id]`, shared `OrderDetail`; confirmation links to it or invites a guest to create an account. |
| Search brittleness | Done (T45-T47): filler words, 1-letter typos, relaxed matches with notice, recovery links on zero results. E2E found that "some words" matched on stray words, so the relaxed fallback needs at least half of the words. |
| Checkout/confirmation to D20, mobile total, decline retry | Done: hairline sections, collapsible summary with the total on top for small screens, prefill when signed in, "no account needed" prompt, clearer decline message (card fields are cleared deliberately). |
| A11y and responsive audit | Done: see below. Fixes: 320px overflow on results, touch target sizes, unnamed duplicate cart image link, heading skip on results, dead filter sidebar on zero results, cart list stretched to summary height. |
| Production database / hosting | **Open, needs a user decision.** PGlite is in-process: on serverless it would not persist or share state between instances. Options: (a) one long-lived Node host with a persistent volume (Fly/Railway/Render) keeping PGlite, or (b) managed Postgres (Neon) with `drizzle-orm/neon-http` or `node-postgres` behind the existing `Database` type. Nothing else in the code needs to change for either. |
| Address book, order status, delivery estimate | Not built (strategic/defer, per quadrant). |

## Verification log

Chromium (installed Chrome via Playwright), production build, in-memory database. Widths 320, 375, 390, 430, 768, 1024, 1440 for every route below (screenshots taken at each width; those at 1440 and 390 plus 320 results were looked at).

| Route | Checked at every width | Result |
|---|---|---|
| `/`, `/s?k=headphones`, empty search, `/dp/everyday-backpack`, `/cart`, `/checkout` (empty submit and declined card), `/checkout/confirmation/*`, `/sign-in`, `/orders`, `/orders/*`, empty cart | horizontal overflow, console errors, exactly one h1, heading skips, text contrast (computed against the effective background), accessible names, target sizes, focus ring on the first 12 Tab stops | No overflow, no console errors, no contrast failures, no missing focus rings, one h1 everywhere. The remaining flags are checker artefacts: a decorative aria-hidden image link, 43.99px rounding on the cart link, and Chrome reporting a fine pointer after Playwright mouse events. |
| Mobile menu (390) | open with keyboard, Tab 12 times, Escape | Focus stays in the dialog; Escape closes; focus returns to "Open menu". |
| Filter sheet (390) | open, pick price and stock, apply, browser Back | Count on the apply button updates (5 then 1 product); chips show applied filters; Back restores the previous URL state. |
| Search box (1440) | type "head", ArrowDown, Enter; type "zzzz" | Combobox with options; Enter opens the product; no options shown for no match. |
| E2E | 5 journeys on desktop and Pixel 7 | discovery (typo, no result, out of stock), guest purchase then claim, decline then retry, cart survives registration then orders then sign-out, no overflow. 10/10 pass. |

Not done: screen-reader testing (no AT available here), live-server overlay of the Impeccable detector, real-device touch. Contrast numbers come from computed styles, not a tool such as axe.

## Impeccable (inline, degraded: no sub-agent run was authorised for this task)

| Finding | Evidence | Decision | Action |
|---|---|---|---|
| Detector (`impeccable detect --json src`) | `[]` | No findings | None |
| Zero-result page keeps a filter sidebar with nothing to narrow | Screenshot of empty search at 1440 | Accept | Sidebar and mobile Filters button hidden when nothing is found and nothing is applied |
| Cart list stretches to the summary's height, leaving a dead band under the item | Cart at 1440 | Accept | `h-fit` on the list |
| Touch targets under 44px (footer, "View all", wordmark, cart link, quick add, remove, chips) | Audit at 320-430 | Accept | 44px for touch, 36px for fine pointers |
| Dashed border on the shadcn `Empty` component | Empty-search screenshot | Accepted as is | Hairline dashed reads as an intentional "nothing here"; changing the shared primitive is not worth it |
| Suggestions to add colour, imagery, delight or a stronger brand moment on confirmation | n/a | Rejected | Conflicts with D20 (restraint, no decorative colour); the green check is the only semantic colour used |

## Heuristic view (single reviewer, honest scores)

Visibility of status 3 (live filter count, cart badge, pending buttons) · Match to real world 3 · User control 3 (undo remove, back-button-safe filters, guest checkout) · Consistency 3 (checkout and confirmation now match the other pages) · Error prevention 3 · Recognition 3 · Flexibility 3 (suggestions, quick add) · Minimalist design 4 · Error recovery 3 (decline keeps address; zero results offer a way out) · Help 2 (demo notes only). About 30/40.
