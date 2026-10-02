# Amazon flow map

Core journeys to understand and eventually reproduce. For every flow: entry point, user intent, important UI states, transitions, required data, failure/empty/loading states, mobile considerations.

**Evidence tag per flow**: `OBSERVED` (in supplied DOM), `PARTIAL` (CSS/links only), `NONE` (no supplied evidence; described from general e-commerce knowledge and **marked UNKNOWN / REQUIRES VALIDATION**). Items under NONE are *our design hypotheses* until Site Peel material confirms Amazon's behaviour. Product improvements are in `docs/product-decisions.md`, not here.

Journey overview (what the supplied source proves exists):

```
Home ─ search ─▶ Results ─▶ PDP ─▶ Cart ─▶ Checkout ─▶ Confirmation ─▶ Orders ─▶ Order detail
  │       (NONE)    (PARTIAL) (NONE) (PARTIAL) (NONE)     (NONE)        (links)   (NONE)
  ├─ Today's Deals (OBSERVED frame)      Account hub (OBSERVED) ─▶ Returns (OBSERVED) / Help (OBSERVED)
  └─ Sign in (OBSERVED step 1)
```

---

## A. Discovery

### A1. Landing / home: `OBSERVED`
- **Entry**: `/`, logo link, any "home" link.
- **Intent**: orient, see deals, jump to a category or search.
- **UI states**: logged-out header ("Hello, sign in"); logged-in header ("Hello, <name>"); deck of 16 promo cards; recently-viewed rail; footer. Seasonal banner and recoloured header variants exist in CSS.
- **Transitions**: card → category/PDP/listing; search → results; account menu → sign in/account; cart → cart.
- **Required data**: promo cards (title, image, links), user greeting, cart count, delivery location, recently viewed items.
- **Failure**: card images fail to load (alt text empty on many images); deck not loaded (loading indicator `#gwm-CardLoadingIndicator` exists). **Empty**: logged-out user has no recently-viewed rail content. **Loading**: card loading indicator; cards are progressively injected.
- **Mobile**: separate mobile shell: UNKNOWN / REQUIRES VALIDATION.

### A2. Category browsing: `PARTIAL`
- **Entry**: sub-nav link, "All" menu, department select, home tile. Evidence: Home & Kitchen resource folder only.
- **Intent**: narrow to a department and scan products.
- **UI states (inferred from CSS)**: result list with product tiles, colour swatches, coupon tiles, pagination; filter sidebar; breadcrumb/category tree (`s-bct`); tiles carousel.
- **Required data**: products (id, title, image, price, rating, count, badges, variants), facets, total count.
- **Failure/empty/loading**: UNKNOWN / REQUIRES VALIDATION (`s-stream-prelude`, `s-suggestion` hint at streamed results and "did you mean").
- **Mobile**: UNKNOWN.

### A3. Search: `PARTIAL`
- **Entry**: header search form (department + text).
- **Intent**: find a product by name/need.
- **UI states (observed)**: department "All" default, input with rotating placeholder, autosuggest panel (two-pane grid) appears while typing; submit by button/Enter.
- **Transitions**: submit → results page for `(department, query)`; suggestion click → results or product.
- **Required data**: department list (60+ options), suggestion service, query history.
- **Failure**: no-results state, typo correction: UNKNOWN. **Empty**: empty query submit: UNKNOWN. **Loading**: suggestion latency: UNKNOWN.
- **Mobile**: UNKNOWN (typically sticky search under the header).

### A4. Search results, filtering, sorting: `PARTIAL`
- Evidence limited to CSS class names (see A2). **No results DOM, no sort control markup, no filter markup.** Entire flow is **UNKNOWN / REQUIRES VALIDATION**; requested from Site Peel.

### A5. Deals: `OBSERVED` frame only
- **Entry**: sub-nav "Today's Deals" / event banner.
- **Intent**: browse discounted products.
- **UI states**: banner "Prime Big Deal Days"; filter bubbles (Lightning Deals, Halloween, New Arrivals, Amazon brands, others); `Discounts grid` (not captured); "More for you".
- **Required data**: deal items (price, list price, % off, claimed %, time left, badge), filter taxonomy.
- **Failure/empty/loading**: UNKNOWN. **Mobile**: UNKNOWN.

---

## B. Product: `NONE` (no PDP captured)

Only fact: PDP URLs follow `/<slug>/dp/<ASIN>`; gift-card cards link there. Everything below is a hypothesis to validate.

| Aspect | Expected (UNKNOWN / REQUIRES VALIDATION) |
|---|---|
| Entry | Product card/link, search result, recommendation, deep link |
| Intent | Decide to buy: price, delivery date, reviews, variants, availability |
| Image gallery | Thumbnails + large zoom image; mobile swipe; video/360 optional |
| Variants | Size/colour/style selectors updating price, image, availability |
| Quantity | 1 to 30 dropdown; max per customer |
| Availability | In stock / low stock / out of stock / "Currently unavailable" |
| Delivery info | Delivery date by destination, free-delivery threshold, location link (header "Deliver to") |
| Add to cart | Button in buy box; success confirmation; header cart count update |
| Buy now | One-click to checkout, skips cart (orange `#ffa41c` button style observed in CSS) |
| Failure | Variant not available, stock changed, price changed |
| Empty | Product not found (404) |
| Loading | Gallery/price skeletons |
| Mobile | Buy box moves below gallery; sticky add-to-cart bar |

---

## C. Cart: `PARTIAL` (CSS only)

- **Entry**: header cart link, "Add to cart" confirmation, "Go to cart".
- **Intent**: review items, change quantity, remove, check subtotal, proceed.
- **UI states (inferred)**: item list (`sc-list-item`), per-item actions (delete / save for later / move to cart), quantity stepper, subtotal + checkout buy-box, saved-for-later list, out-of-stock alternatives popover, recommendations rail (8 thumbnails captured).
- **Transitions**: change qty → recompute subtotal; delete → item removed with undo (UNKNOWN); proceed to checkout → auth gate then checkout.
- **Required data**: line items (product, variant, unit price, qty, availability), subtotal, item count, shipping eligibility, saved items.
- **Failure**: item went out of stock/price changed (`sc-oos-alternatives-popover` supports out-of-stock). **Empty**: empty cart view (copy/CTAs UNKNOWN). **Loading**: spinner GIF (`loading-4x-gray`).
- **Mobile**: UNKNOWN; sticky "Proceed to checkout" typical.

---

## D. Checkout: `NONE`

Sub-steps in scope: authentication → address → delivery → payment → order review → confirmation. Amazon's single-page "place your order" structure and the sign-in step are the only items with any evidence (sign-in is `OBSERVED` step 1).

| Step | Observed | UNKNOWN / REQUIRES VALIDATION |
|---|---|---|
| Authentication | Identifier-first form, passkey autofill fields, "Create account" in same flow, business-account link | Password step, OTP/CAPTCHA step, registration form, error copy, "keep me signed in" |
| Address | n/a | Address list/selector, add-address form fields, validation, default address |
| Delivery | n/a | Shipping speeds, dates, cost, split shipments |
| Payment | n/a | Payment methods, add-card form, gift-card balance, promo code |
| Order review | n/a | Summary layout, totals breakdown (items, shipping, tax, total) |
| Confirmation | n/a | Confirmation page, order number format, email message |

For each: failure states (declined payment, address not serviceable, price change), empty states (no saved address/payment), loading (placing order), mobile (single column, sticky place-order). All hypotheses.

---

## E. Post-purchase

### E1. Orders list / detail / tracking / cancellation: `NONE`
Evidence of existence only: "Returns & Orders" header link, account tile "Track, return, cancel an order, download invoice or buy again", footer "Your Orders". Layout, filters (time range), order card fields, status vocabulary, cancel flow, tracking UI: **UNKNOWN / REQUIRES VALIDATION**.

### E2. Returns: `OBSERVED` (hub only)
Policy banner (30-day window, holiday extension note), "Start a return in your orders", **Gift Returns** by 17-digit order number, **Manage Returns**, **Get product support**, FAQ, NPS survey. The actual return wizard (select item, reason, method, label) is not captured.

---

## F. Account: `OBSERVED` (hub, profile hub)

- **Entry**: header "Account & Lists" → Account; footer "Your Account".
- **Intent**: manage orders, security, addresses, payments, memberships, preferences.
- **UI states**: tile hub of 12 primary tiles + 6 grouped link sections (see `page-map.md` #6); Profile Hub preferences with save confirmation.
- **Transitions**: each tile → its sub-page (**not captured**: Login & security, Addresses, Payments, Orders, Lists, Messages).
- **Required data**: user name, order history, addresses, payment methods, preferences.
- **Failure/empty**: empty values shown as `--`. **Loading**: UNKNOWN. **Mobile**: UNKNOWN (tile grid presumably collapses to 1 to 2 columns).
- Profile/settings relevant to our scope: name, email/phone, password, addresses (decision in product-decisions).

---

## G. Support: `OBSERVED` (hub)

- **Entry**: footer "Help", account "Customer Service", Returns centre.
- **Intent**: resolve an order/return/payment/account problem or find a policy.
- **UI states**: personalised greeting, "What would you like help with today?" with 8 topics, 4 quick cards (Where's my order?, Your Returns, Issues with your payment?, Memberships & Subscriptions), help-library search, "All help topics" index.
- **Transitions**: topic → help article or chatbot/contact flow (**not captured**).
- **Required data**: user's recent orders (for "Where's my order?"), help articles, contact options.
- **Failure/empty/loading**: UNKNOWN. **Mobile**: UNKNOWN.
- Scope proposal: a static help hub with search over a small set of articles (P2).

---

## Evidence gap summary (drives the Site Peel request)

| Flow | Gap |
|---|---|
| Search results / filtering / sorting | **Critical**: no DOM |
| Product detail | **Critical**: no DOM |
| Cart | **Critical**: CSS only |
| Checkout (all steps) | **Critical**: no DOM |
| Order confirmation, orders, order detail | **High**: no DOM |
| Sign-in step 2 / registration | **High**: step 1 only |
| Mobile layouts | **High**: none captured |
| Deals grid | Medium |
| Account sub-pages (addresses, security) | Medium |
