# Delivery roadmap

Prioritised by demo impact, user value and risk. Complexity: **S** ≤ 1 h, **M** 1 to 3 h, **L** 3 to 6 h (rough, focused-agent hours; to re-estimate at Phase 1 start). Dependencies reference item IDs. Phase 0 is complete when this document and the others are committed; **no item below has been started.**

Gate before any item: its requirement and acceptance criteria are written, and any missing Site Peel evidence it depends on is supplied or explicitly waived.

## P0: Must work for a credible live demo

| ID | Feature | User value | Depends on | Acceptance criteria | Cx | Test requirement |
|---|---|---|---|---|---|---|
| P0-1 | Project scaffold: Next.js, TS strict, Tailwind, shadcn init, lint/format, pnpm, CI script | Foundation | user confirms stack (done), shadcn gaps | `pnpm dev/build/lint/typecheck/test` all pass on empty app; tokens from design-tokens §2 applied | S | smoke test; CI script runs |
| P0-2 | Design tokens + font substitute + Impeccable direction | Consistent look | P0-1, `PRODUCT.md` | Tokens in CSS vars; type scale; focus ring; Impeccable `shape`/critique direction recorded in `DESIGN.md` | M | visual check; contrast tests |
| P0-3 | Seeded catalogue + schema + repositories | Real products to browse | P0-1, catalogue decision | ≥ 60 products, 6+ categories, variants, images; seed idempotent | M | repo integration tests |
| P0-4 | Global shell: header (logo, location, search, account, orders, cart), sub-nav, footer, skip links, responsive | Orientation on every page | P0-2 | Matches page-map shell; works 360 to 1536; keyboard-operable menus | L | RTL + E2E shell; axe |
| P0-5 | Home page | First impression, entry points | P0-3, P0-4 | Hero + promo cards + ≥ 2 product rails with price/rating; loading/error states | M | E2E home → PDP click path |
| P0-6 | Search + results page (query, department, pagination, sort, price/rating filters) | Find products | P0-3, P0-4, **Site Peel: results page** | E1/E2 pass; URL-driven; empty-result state | L | unit search domain; integration repo; E1/E2 |
| P0-7 | Product detail page (gallery, variants, price, stock, delivery, quantity, add to cart, buy now) | Decide and buy | P0-3, **Site Peel: PDP** | E3/E4 pass; out-of-stock disabled with message; sticky mobile bar | L | unit pricing; E3/E4; axe |
| P0-8 | Cart (add, quantity, remove + undo, subtotal, empty state, persistence incl. guest cookie) | Control what I buy | P0-7, **Site Peel: cart** | E4/E5 pass; guest cart survives reload | L | unit cart; integration cart actions; E5 |
| P0-9 | Authentication (register, sign in, sign out, protected routes, guest cart merge) | Own my orders | P0-1 | E6/E9 pass; secure cookie; generic error copy | M | integration auth; E6/E9 |
| P0-10 | Checkout (address, delivery, demo payment, review, place order) | Complete a purchase | P0-8, P0-9, **Site Peel: checkout** | E7 passes; server re-prices; transactional order creation; double-submit safe | L | unit pricing/validation; integration checkout; E7/E10 |
| P0-11 | Order confirmation + orders list + order detail | Confidence and retrieval | P0-10 | E8 passes; detail uses purchase-time snapshot | M | integration orders authz; E8 |
| P0-12 | Global states: 404, error, loading skeletons, empty states | Trust, polish | P0-4 | Every data route has skeleton/error/empty; no raw errors shown | M | Playwright forced-failure tests (E10/E11) |
| P0-13 | Deploy (Vercel + hosted DB + env + seed) | Live demo URL | P0-1..P0-12 | Public URL; E7/E8 pass against production | M | smoke E2E vs prod |

## P1: Strong differentiating quality

| ID | Feature | User value | Depends on | Acceptance criteria | Cx | Test requirement |
|---|---|---|---|---|---|---|
| P1-1 | Search suggestions combobox | Faster search | P0-6 | ARIA combobox pattern; arrow/Enter/Esc; ≤ 8 results; debounced | M | RTL + E1 |
| P1-2 | Accessibility pass to WCAG 2.2 AA | Inclusive; reviewer signal | P0-* | axe clean on key pages; keyboard pass documented | M | E13 |
| P1-3 | Mobile excellence (drawer, sticky bars, filters sheet) | Most traffic | P0-4..P0-10 | Browser checklist mobile all green | M | Playwright mobile project |
| P1-4 | Add-to-cart mini-feedback (toast + header count + undo) polish | Clear feedback | P0-8 | D5 behaviours complete | S | E4/E5 |
| P1-5 | Address book + account area with persistent navigation | Faster repeat checkout | P0-9, P0-10 | E12 passes; AccountNavigation (D9) | M | integration addresses; E12 |
| P1-6 | Order status simulation + cancel before shipped | Realistic post-purchase | P0-11 | E14 passes; state machine enforced | M | unit order; E14 |
| P1-7 | Save for later | Matches Amazon cart | P0-8, **Site Peel: cart** | Move item both ways; persists | S | unit cart; E5 |
| P1-8 | Performance budget (images, fonts, RSC caching) | Fast demo | P0-* | Lighthouse mobile LCP < 2.5 s, CLS < 0.1 on home/results/PDP | M | Lighthouse run recorded |
| P1-9 | Deals page with filter bubbles | Discovery depth | P0-3, P0-5 | Filters work; discount % computed from list price | M | unit pricing; E2E deals |
| P1-10 | Impeccable critique/audit/polish cycle on core pages | Design quality bar | P0-5..P0-11 | Critique findings addressed; audit clean | M | Impeccable audit report committed |

## P2: Polish and depth

| ID | Feature | User value | Depends on | Acceptance criteria | Cx | Test requirement |
|---|---|---|---|---|---|---|
| P2-1 | Reviews & ratings (list, summary distribution, submit) | Social proof | P0-7 | Seeded reviews; verified-buyer rule for submit | M | integration reviews; E2E |
| P2-2 | Returns hub + start-return flow (reference: Online Return Center) | Post-purchase completeness | P0-11 | Policy banner, gift lookup, start return from order | M | unit order; E2E |
| P2-3 | Help hub with searchable articles (reference: Help page) | Support | P0-4 | 8 topics, search, article pages | M | E2E |
| P2-4 | Stripe test-mode payment | Realism | P0-10 | Swap provider; declined/3DS test cards | M | integration + E2E |
| P2-5 | Recently viewed + continue-where-you-left-off rail | Retention | P0-7 | Cookie/DB backed rail | S | integration |
| P2-6 | Visual regression screenshots | Guard UI | P0-* | Baselines for shell, PDP, cart | S | Playwright screenshots |
| P2-7 | Observability (structured logs, error reporting, health) | Operability | P0-13 | Logs for order/payment/auth; `/api/health` | S | integration |

## P3: Only if significant time remains

| ID | Feature | User value | Depends on | Acceptance criteria | Cx | Test requirement |
|---|---|---|---|---|---|---|
| P3-1 | Dark mode | Comfort | tokens | Token-driven; AA in both | M | contrast tests |
| P3-2 | Wishlists / lists | Planning | P0-9 | Create/add/remove | M | E2E |
| P3-3 | Spelling correction / "did you mean" | Search recovery | P0-6 | Suggests on zero-result | M | unit |
| P3-4 | Recommendations ("customers also bought") | Discovery | P0-7 | Heuristic by category/co-purchase | M | unit |
| P3-5 | Coupons, gift cards redemption | Promotions | P0-10 | Code validation, totals update | L | unit pricing |
| P3-6 | i18n / currency switch | Reach | tokens | At least en + one currency | L | unit formatting |

## Explicitly out of scope

Prime, assistant (Rufus/Alexa+), ads/sponsored, seller portal, digital content, Fresh/local market, real payments, email delivery, push notifications.

## Risks (ranked)

1. **Missing source for the money pages** (search, PDP, cart, checkout): building from assumption risks wrong fidelity. Mitigation: Site Peel request in the Phase 0 report; otherwise our own designs recorded as such.
2. **Catalogue and imagery** decision unmade; image rights. Mitigation: owned/licensed demo images.
3. **Scope vs. one day**: P0 is 13 items (~35 to 45 h at the estimates above); a single day needs ruthless trimming or parallel agents. Recommend the P0 minimum cut: 1, 2, 3, 4, 7, 8, 10, 11 + guest-only auth stub; mark 5, 6 simplified.
4. Deployment account/DB access (user-owned).
5. Logo/trademark.

## Phase 1 entry criteria

User confirms: catalogue/imagery approach, logo approach, font substitute, product-decision proposals (D1 to D15) or edits; Site Peel material for the Critical gaps is supplied or the gap waived; a GitHub remote exists if issues/PRs are wanted.
