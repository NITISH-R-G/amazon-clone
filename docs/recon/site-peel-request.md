# Site Peel request

The smallest set of Amazon captures that closes the reconstruction gaps found in Phase 0 (`docs/recon/README.md`, `amazon-flow-map.md`). Nothing here duplicates what `recon/` already has (home, sign-in step 1, deals frame, gift cards, account hub, profile hub, returns hub, help hub, recommendations grids, shell, footer, tokens). **Do not scrape the site**; capture only the states below.

## How to capture (applies to every item)

- **Clean browser profile with extensions disabled.** The first recon was contaminated by extension DOM.
- **Throwaway account** (no real name, address, payment or history) for anything behind login (checkout, orders). Use a dummy address and a test card where a form needs one; **stop before paying.** Prefer **logged-out** captures wherever Amazon allows (search, PDP, cart).
- Save with Site Peel as a complete page (HTML + CSS + page assets). JavaScript is **not needed**; skip it if the tool allows.
- Desktop viewport ~1440 × 900 unless stated. Name files `NN-slug.html` (+ `_files`); mobile `NN-slug-mobile.html`.
- Put them in a new folder **`recon-v2/`** at the repo root (do not mix with `recon/`; it is git-ignored the same way).
- Add a **full-page screenshot** only where "visual state matters" is noted below.
- Do not post tokens or account details in chat. The files stay local.

Mobile policy: P0 mobile = **screenshot only** (cheap), P1 mobile = **HTML + CSS** for the four pages whose shell we must rebuild.

---

## P0 source material (blocks the purchase path)

Each row: capture target · HTML · CSS · relevant assets · screenshot · mobile.

| # | Capture (exact state) | HTML | CSS | Relevant assets | Screenshot (visual state matters) | Mobile |
|---|---|---|---|---|---|---|
| 1 | **PDP, simple product**: one in-stock product with no variants, with reviews and a delivery date, logged out | Yes | Yes | Gallery images (main + thumbs), price/rating/Prime icons | Yes: above-the-fold and buy box | Screenshot |
| 2 | **PDP, variants**: product with size and colour (e.g. apparel). Capture default state **and** after selecting a different variant (second save or screenshots showing price/image change) | Yes (default) | Yes | Swatch images, variant thumbnails | Yes: default, variant selected, unavailable variant (struck-out) | Screenshot |
| 3 | **PDP, out of stock**: a "Currently unavailable" product | Yes | Yes | Any status icons | Yes: buy box area | No |
| 4 | **Search results**: any keyword, first page, logged out, scrolled to include the pagination footer | Yes | Yes | Product thumbnails (a handful), badge/star icons | Yes: top and pagination | Screenshot |
| 5 | **Search results with filters**: same keyword with a price range, a rating filter, one brand/department refinement and a non-default sort applied (so the filter sidebar, applied-state chips, sort control and refined URL are visible) | Yes | Yes | Filter icons | Yes: sidebar and sort control, including the sort dropdown open | Screenshot (filter sheet if it exists) |
| 6 | **Cart with multiple items**: 2 or 3 items, one with quantity > 1, showing subtotal and proceed-to-checkout; if offered, one item saved for later | Yes | Yes | Item thumbnails, quantity control | Yes: item action area, subtotal box | Screenshot |
| 7 | **Empty cart**, logged out and logged in if they differ | Yes | Yes | None | Yes | No |
| 8 | **Checkout: address** (address selection and the add/change address form open, with validation error visible if triggerable) | Yes | Yes | None | Yes | Screenshot |
| 9 | **Checkout: delivery** (shipping options and dates for the item) | Yes | Yes | Delivery icons | Yes | Screenshot |
| 10 | **Checkout: payment** (payment method list and the add-card form with an error state if triggerable) | Yes | Yes | Card-brand icons | Yes | Screenshot |
| 11 | **Checkout: review / place order** (final summary with items, totals breakdown). **Do not place the order.** If checkout is a single page, items 8 to 11 can be one page captured in four states | Yes | Yes | None | Yes: totals breakdown and place-order button | Screenshot |
| 12 | **Order confirmation** ("Order placed" page). Requires completing an order; only do this with a throwaway account and a zero-cost or refundable item. **If you would rather not place an order, say so and we waive this item** (we design it ourselves) | Yes | Yes | None | Yes | Screenshot |
| 13 | **Orders list** (Your Orders): throwaway account with ≥ 1 order if available; otherwise the empty state. Include the time-range filter | Yes | Yes | Order thumbnails | Yes | Screenshot |
| 14 | **Order detail and tracking** (order details page and the track-package page for the same order) | Yes (2 pages) | Yes | Status/tracker icons | Yes: the tracker progress bar and status states | Screenshot |
| 15 | **Sign-in step 2**: the password page after entering an identifier, plus the wrong-password error state | Yes | Yes | None | Yes: both states | Screenshot |
| 16 | **Registration**: the "Create account" form (and its validation errors if triggerable) | Yes | Yes | None | Yes | Screenshot |

If items 12, 13 or 14 cannot be captured without real orders, that is acceptable: tell us and we proceed with our own design for those, recorded in `docs/product-decisions.md`.

## P1 source material (improves fidelity; not blocking)

| # | Capture | HTML | CSS | Assets | Screenshot | Mobile |
|---|---|---|---|---|---|---|
| 17 | **Home, mobile** (~390 px viewport, logged out) | Yes | Yes | Hero/promo tiles only if different from desktop | Yes | n/a |
| 18 | **Search results, mobile** (same keyword as #4) | Yes | Yes | None new | Yes: results and filter control | n/a |
| 19 | **PDP, mobile** (same product as #1, including sticky add-to-cart if present) | Yes | Yes | None new | Yes | n/a |
| 20 | **Cart, mobile** (same cart as #6) | Yes | Yes | None new | Yes | n/a |
| 21 | **Account & Lists flyout, open** (desktop, hover state) | Yes (DOM with flyout open) | Yes | Flyout icons | Yes | No |
| 22 | **Hamburger "All" drawer, open** (desktop, and mobile if it differs) | Yes | Yes | Section icons | Yes | Screenshot |
| 23 | **Location ("Deliver to") modal, open** | Yes | Yes | None | Yes | Screenshot |
| 24 | **Search suggestions panel, open** (type 2 to 3 letters, panel visible) | Yes | Yes | Suggestion thumbnails if any | Yes | Screenshot |
| 25 | **Today's Deals with the grid rendered**, logged out | Yes | Yes | Deal card images (a few) | Yes: grid and a filter bubble selected | No |

For open-state captures (21 to 24), DevTools "Save as complete" may drop a closed DOM; a screenshot plus the DOM exported with the element expanded is enough.

---

## Already available: do not re-capture

Home deck and shell (logged out) · header, sub-nav, footer · sign-in step 1 · Today's Deals frame and filter bubbles · Gift Cards page (priced product card pattern, carousels, tiles, FAQ) · Your Amazon.com recommendation cards · Your Account tile hub · Profile Hub · Online Return Center hub · Help & Contact Us hub · site CSS statistics and colour/type/spacing tokens · Cart and Home & Kitchen **CSS** (HTML still needed: items 6 and 4).

## What we do with the captures

- Keep the files as read-only evidence in `recon-v2/` (git-ignored). Do not edit them.
- Extract only what the slice needs (structure, copy patterns, states, tokens), write findings into `docs/recon/` (not into context), then rebuild in our own components: no Amazon scripts, tracking or tokens.
- Each capture unlocks a roadmap slice: #1 to #3 → A4, #4 and #5 → A3, #6 and #7 → A5, #8 to #12 → A6/A7, #13 and #14 → B2, #15 and #16 → B1, P1 items → B5 and P1.
- Missing items are not blockers by themselves: the affected slice proceeds with our own design, labelled as such.

## Minimum viable set (if you want the smallest possible effort)

#1, #4, #6, #11 plus #15. That is five captures; everything else can be designed from patterns already in `recon/`, at the cost of fidelity on variants, filters, empty states and orders.
