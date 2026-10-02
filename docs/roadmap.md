# Delivery roadmap

Goal: not maximum feature count; a highly convincing, polished, **working** product inside the assessment window (planned as ~24 h). Work is cut into **vertical slices**; the first slice is a **tracer bullet** across the whole purchase path, then each stage thickens it. Order by demo impact, user value and risk.

Complexity: **S** ≤ 1 h, **M** 1 to 3 h, **L** 3 to 5 h (focused-agent hours, to re-estimate at Phase 1 start). "Source" = Amazon evidence needed (`docs/recon/site-peel-request.md`); where it is missing the slice proceeds with our own design, recorded as such. Tests follow `docs/agents/workflow.md` (agreed seam, RED→GREEN) and `docs/testing-strategy.md` (E2E added after behaviour works).

Nothing below is started. Phase 1 entry criteria are at the end.

## P0-A: Demo-critical (the smallest complete end-to-end experience)

```
home → search → results → product → cart → checkout → confirmation
```

Guest purchase works first; ownership of orders by an account arrives in P0-B. (Product decision D1 is unchanged: auth at checkout is implemented in P0-B; until then checkout collects an email and creates a guest order.)

| ID | Slice | User value | Depends on | Acceptance criteria | Cx | Test requirement |
|---|---|---|---|---|---|---|
| A0 | Scaffold, tokens, minimal shell | A running, themed app | stack confirmed; Phase 1 unlock | `pnpm dev/build/lint/typecheck/test` pass; tokens from design-tokens §2 applied; header/footer skeleton renders | M | build + one smoke test |
| A1 | **Tracer bullet** (`docs/tracer-bullet.md`): catalog → product display → cart → checkout calculation → order creation → confirmation, guest, 2 seeded products, thin pages; tests T1 to T13 | Proof the whole path works | A0, catalogue decision | A guest completes a purchase and sees an order number; every step uses real module interfaces (`catalog`, `search`, `cart`, `checkout`, `orders`, `payments`) | L | Seam tests for `cart`, `checkout.placeOrder`, `search`; manual browser run; first tier-1 E2E |
| A2 | Real catalogue (≈40 to 60 products, categories, variants, stock states) and home page with rails | Believable store | A1, product-data decision | Seed idempotent; home shows hero, promo cards and ≥ 2 priced rails; empty/error states | M | catalog seam; manual browser |
| A3 | Search and results: query, department, sort, price/rating filters, pagination, URL state, no-results state | Find things | A2; source: results page | `/s` driven by params; back button correct; filters combine | L | `search` seam tests (parse round-trip, filters, sort, pagination) |
| A4 | Product detail: gallery, variants, price, stock, delivery estimate, quantity, add to cart, buy now | Decide and buy | A2; source: PDP (3 states) | Variant changes price/stock/image; out-of-stock disabled with message; mobile sticky bar | L | `catalog` availability; manual a11y/keyboard |
| A5 | Cart: quantity, remove + undo, subtotal, empty state, guest persistence | Control the purchase | A4; source: cart | Survives reload; totals in cents correct; toast + header count | M | `cart` seam (clamp, merge-ready, restore) |
| A6 | Checkout: address, delivery, demo payment, review, place order, declined-payment path | Complete the purchase | A5; source: checkout (4 steps) | Server re-prices; atomic order; double submit safe; declined keeps cart | L | `checkout.placeOrder` seam; `payments` demo; tier-1 failure journey |
| A7 | Order confirmation | Confidence | A6; source: confirmation | Shows order number, items, totals, address matching what was placed | S | `orders.getOrder`; tier-1 purchase journey |

**Scope lock**: P0 is not expanded because Amazon has a feature. A feature joins P0 only by a recorded decision that the purchase journey or its credibility fails without it.

Cut line: if time runs short, A2 shrinks to ~20 products and A3 drops rating filters; A1/A4/A5/A6/A7 do not shrink.

## P0-B: Credibility (surrounding capabilities that make it a product)

| ID | Slice | User value | Depends on | Acceptance criteria | Cx | Test requirement |
|---|---|---|---|---|---|---|
| B1 | Authentication and **cart merge**: identifier-first sign-in, register, sign-out, protected routes, guest→user cart merge, `returnTo` | Own my orders | A5; source: sign-in step 2, registration | Checkout redirects to sign-in and returns with the cart intact | M | `auth` + `cart.mergeGuestCart` seams; tier-2 auth journey |
| B2 | Orders list and order detail (with status) | Find past orders | A7, B1; source: orders list/detail | User sees only own orders; detail uses purchase snapshot | M | `orders` seam (authz, snapshot, status) |
| B3 | Account and **address book**: overview tile hub, address book used at checkout | Faster repeat purchase | B1 | Add/edit/delete/default address; used in checkout | M | `account` seam |
| B4 | Loading, empty and error states across all data routes | Trust, polish | A-slices | Skeletons, empty-state CTAs, retry on error, designed 404 | M | forced-failure checks; tier-2 states journey |
| B5 | Responsive shell: mobile header, menu sheet, scrolling sub-nav, footer | Works on phones | A0; source: mobile captures (P1 request) | Browser checklist mobile/tablet green | M | manual checklist |
| B6 | Deploy (Vercel + hosted DB + env + seed) | Live URL | all above | Public URL completes the purchase journey | M | tier-1 journey against production |

## Next implementation order (approved after the Phase 1 review)

The tracer (A1) is accepted as the foundation. Domain behaviour is preserved; only the visual layer is revised once Site Peel evidence arrives. Nothing below is started.

**P0-A**
1. Site Peel-informed visual system (tokens, shell, component refinement)
2. Home
3. Search
4. Search results
5. PDP refinement
6. Cart refinement
7. Checkout refinement
8. Confirmation refinement

**P0-B**
9. Authentication
10. Guest-cart merge
11. Orders
12. Account
13. Address book
14. Loading/empty/error system
15. Responsive refinement
16. Deployment (includes the production database decision, `docs/architecture.md` section 12)

Gates: items 1 and 3 to 8 depend on the Site Peel captures; items 2 to 4 also depend on the catalogue decision (`docs/catalogue-decision.md`). Slice IDs A2 to A7 and B1 to B6 above map onto this order.

## P1: Differentiation (only after P0-A and P0-B are green)

| ID | Item | Value | Cx | Notes |
|---|---|---|---|---|
| P1-1 | Search suggestions (accessible combobox) | Faster search | M | `popover` + `command` |
| P1-2 | Richer filtering (facet counts, applied-filter chips, mobile filter sheet) | Better discovery | M | |
| P1-3 | Polished account experience (persistent account nav, profile) | Product judgment (D9) | M | |
| P1-4 | Deals page with filter bubbles | Discovery depth | M | Source: rendered deals grid |
| P1-5 | Improved mobile (sticky bars, gallery swipe, refined sheets) | Most traffic | M | |
| P1-6 | Accessibility refinement to WCAG 2.2 AA (axe sweep, keyboard pass) | Inclusive; reviewer signal | M | |
| P1-7 | Performance budget (images, fonts, caching) | Fast demo | M | LCP < 2.5 s, CLS < 0.1 |
| P1-8 | Richer order simulation (time-derived status, timeline, cancel before shipped) | Realistic post-purchase | M | |
| P1-9 | Save for later; cart undo polish | Matches Amazon cart | S | |
| P1-10 | Impeccable cycle on core pages: critique → audit → polish | Design quality bar | M | |
| P1-11 | Higher-priority E2E coverage (tier 2 first, then tier 3) | Regression safety | M | `docs/testing-strategy.md` |

## P2

Reviews and ratings (list, distribution, submit) · returns hub and start-return flow · help hub with searchable articles · Stripe test-mode payment · recently viewed rail · visual-regression snapshots · structured logging and error reporting.

## P3 (only if significant time remains)

Dark mode · wishlists/lists · spelling correction · recommendations · coupons and gift-card redemption · i18n/currency.

## Explicitly out of scope

Prime, assistant (Rufus/Alexa+), ads/sponsored, seller portal, digital content, Fresh/local market, real payments, email/push.

## Time budget (24 h, guidance)

| Stage | Hours |
|---|---|
| A0 + A1 tracer bullet | 4 |
| A2 to A7 | 8 |
| B1 to B6 | 7 |
| Buffer, verification, fixes | 3 |
| P1 (best items first) | 2 |

If the budget slips, cut P1 entirely, then B3 and B5 depth, before touching any A slice.

## Risks (ranked)

1. **Missing Amazon source** for search results, PDP, cart, checkout, orders: building from assumptions risks wrong fidelity. Mitigation: `docs/recon/site-peel-request.md`; otherwise our own designs, recorded as such.
2. Catalogue content and image rights undecided.
3. Scope vs. window (mitigated by the cut lines above).
4. Deploy account/DB access is user-owned.
5. Logo/trademark decision.

## Phase 1 entry criteria

The user confirms: catalogue/imagery approach, logo approach, font substitute, and the product-decision proposals (or edits them); Site Peel P0 material is supplied or each gap explicitly waived; a GitHub remote exists if issues/PRs are wanted; and the first test seams (module interfaces in `docs/modules.md`) are agreed.
