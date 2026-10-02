# Product decisions

Evidence-based record of where we replicate Amazon and where we deliberately differ. Rules:

0. We are building an **Amazon-inspired commerce product**, not reproducing Amazon's implementation: our own visual identity (logo, imagery, type) with proven commerce interaction patterns preserved.
1. **Default is to replicate** what the supplied source shows. A deviation needs a concrete reason (user value, accessibility, risk, legal, time). Never change something just to look original.
2. **Where Amazon's behaviour is not in the supplied source, we do not claim to know it.** The entry says `UNKNOWN / REQUIRES VALIDATION` and the decision is **Hold**: replicate once captured; until then any design is provisional and marked as ours.
3. Every important decision follows one chain: **Observed evidence → Problem/opportunity → Decision → Reason → Tradeoff → Validation method.** "Amazon does it" is never a reason by itself.
4. Status: **Proposed** → **Confirmed** (user agrees, or validated against captured source) → **Shipped** (verified in browser). All entries are currently **Proposed**; none is implemented.

Evidence references are to `docs/recon/` (page-map, component-inventory, flow-map). Scope tags follow `docs/architecture.md`.

## Register

| ID | Topic | Type | Evidence | Slice |
|---|---|---|---|---|
| D1 | Authentication timing | Replicate (gate behaviour UNKNOWN) | Partial | B1 |
| D2 | Search UX | Replicate + small deviation (single-list suggestions) | Partial | A3, P1-1 |
| D3 | Home product discovery | Deviation (add priced rails) | Observed (logged-out deck has no prices) | A2 |
| D4 | Product page hierarchy | **Hold** | None | A4 |
| D5 | Cart interaction | **Hold** on layout; deviation on feedback (toast + undo) | CSS only | A5 |
| D6 | Checkout structure | **Hold** | None | A6 |
| D7 | Responsive strategy | Deviation (one fluid tree) | Observed (desktop header `min-width:1000px`) | A0, B5 |
| D8 | Loading / empty / error states | Deviation (additive) | Observed (spinner GIF only) | B4 |
| D9 | Account architecture | Replicate hub + small deviation (persistent nav) | Observed (tile hub) | B3, P1-3 |
| D10 | Trust signals, no fake urgency | Deviation by omission | Not observed either way | all |
| D11 | Accessibility | Additive | Observed (skip links, ARIA present; empty alt on product images) | all |
| D12 | Performance | Additive | Observed (64 MB runtime JS) | P1-7 |
| D13 | Payment realism | Constraint (no real money) | n/a | A6 |
| D14 | Logo and imagery | Constraint (legal) | Observed (sprite logo, third-party photos) | A0 |
| D15 | Scope boundaries | Constraint | n/a | all |

---

## D1. Authentication timing

- **Observed evidence**: sign-in is identifier-first (single email/mobile field → Continue; password on a second step, **not captured**); account creation is part of the same entry ("Sign in or create account"); passkey fields present. Guests see a cart count in the header. Whether Amazon gates at "Proceed to checkout" is **UNKNOWN / REQUIRES VALIDATION** (widely believed, not in source).
- **Problem/opportunity**: forcing sign-in earlier hurts browsing; allowing anonymous orders complicates retrieval.
- **Decision**: browsing, search and cart are guest; the guest cart persists and merges on sign-in; sign-in is required to place an order and returns the user to checkout with the cart intact. In P0-A checkout runs as a guest order (email collected); the gate arrives with B1.
- **Reason**: matches Amazon's visible pattern; late auth maximises browse-to-cart; orders need an owner for retrieval.
- **Tradeoff**: guest checkout would convert better but needs email-based order lookup and abuse controls; skipped.
- **Validation method**: `cart.mergeGuestCart` and `auth` seam tests; tier-2 auth journey; confirm the gate and step 2 against Site Peel (sign-in step 2, registration).

## D2. Search UX

- **Observed**: header form with department select (60+ options) and text input (`role=searchbox`), rotating placeholder, two-pane autosuggest container. Results page not captured.
- **Problem/opportunity**: the two-pane suggestion panel is dense and hard to make accessible; results must be shareable and testable.
- **Decision**: keep the department select + input pattern. Results state lives in URL params. Suggestions (P1) are one combobox list (recent searches + matching products/categories).
- **Reason**: familiar structure; URL state gives back-button correctness and testable parsing; single list follows the ARIA combobox pattern.
- **Tradeoff**: no personalised or two-pane suggestions; no spelling correction (P3).
- **Validation method**: `search` seam tests (param round-trip); manual keyboard pass; compare results layout to the Site Peel results capture before building A3.

## D3. Home product discovery

- **Observed**: logged-out home is a 16-card promo deck (single-image and 4-tile cards, one video card), a recently-viewed rail, **no prices or ratings** on the deck. Priced, rated product grids appear on the logged-in "Your Amazon.com" page. Logged-in home is **UNKNOWN**.
- **Problem/opportunity**: a promo-only deck gives a new visitor nothing to evaluate or add to cart; our catalogue is small and needs to demonstrate the product path quickly.
- **Decision**: promo cards (structure replicated) plus at least two product rails showing price, rating and a delivery cue.
- **Reason**: reuses `ProductCard`, shows value earlier, keeps Amazon's recognisable deck.
- **Tradeoff**: busier home; needs seeded data.
- **Validation method**: Impeccable critique of hierarchy; manual click path home → PDP.

## D4. Product page hierarchy: HOLD

- **Observed**: **UNKNOWN / REQUIRES VALIDATION**. No PDP captured; only the URL pattern `/dp/<id>` and one gift-card product link.
- **Problem/opportunity**: the PDP is the decision point; price, delivery, availability and the buy action must be visible without hunting.
- **Decision**: none yet. Replicate Amazon's PDP structure once captured (A4 depends on the three PDP captures). Provisional hypothesis (ours, not Amazon's): gallery | details | buy box on desktop, single column with sticky add-to-cart on mobile.
- **Why hold**: designing from memory risks wrong fidelity.
- **Tradeoff**: A4 is blocked or provisional until source arrives.
- **Validation method**: against the PDP captures; manual variant/quantity/add-to-cart run.

## D5. Cart interaction

- **Observed (CSS only)**: stepper, delete, save for later, subtotal buy-box, out-of-stock alternatives popover, saved-for-later list. Layout, copy and delete/undo behaviour **UNKNOWN**.
- **Problem/opportunity**: shoppers need immediate confirmation of an add and safe editing.
- **Decision**: layout **Hold** until the cart capture arrives. Feedback: toast "Added to cart" with a View cart action, optimistic header count, and **undo after remove** (deviation, additive).
- **Reason**: stays in flow; prevents accidental loss.
- **Tradeoff**: optimistic updates need reconciliation on failure.
- **Validation method**: `cart` seam tests (restore, clamp); live-region announcement check; cart capture for layout.

## D6. Checkout structure: HOLD

- **Observed**: **UNKNOWN / REQUIRES VALIDATION**. Nothing captured beyond sign-in step 1.
- **Problem/opportunity**: highest-risk step; must be clear, validated inline, and free of interruptions.
- **Decision**: none until the four checkout captures arrive. Provisional (ours): one page with sections Address → Delivery → Payment → Review, sticky summary, no upsells, total shown before placing the order.
- **Why hold**: replicate Amazon's structure first, then remove friction deliberately.
- **Tradeoff**: A6 provisional until source arrives.
- **Validation method**: `checkout.placeOrder` seam; tier-1 purchase and failure journeys; 360 px manual run.

## D7. Responsive strategy

- **Observed**: Amazon serves a separate mobile shell; the desktop header enforces `min-width:1000px`; CSS bands near 360/768/1000/1100/1280/1700. No mobile DOM captured.
- **Problem/opportunity**: two shells double build and test cost.
- **Decision**: one fluid component tree, mobile-first, Tailwind breakpoints; mobile header collapses to logo + search + cart with a menu sheet.
- **Reason**: fits the window; one thing to test.
- **Tradeoff**: less exact parity with Amazon mobile web (mitigated by P1 mobile captures).
- **Validation method**: manual checklist at 360/768/1280; tier-1 journeys on desktop and mobile.

## D8. Loading, empty and error states

- **Observed**: a spinner GIF; empty profile values shown as `--`. Everything else UNKNOWN.
- **Problem/opportunity**: states are where quality shows; unhandled ones look broken in a demo.
- **Decision**: every data route ships skeleton, empty (with a next action) and error (retry) variants; designed 404.
- **Reason**: low cost, high perceived quality.
- **Tradeoff**: more states to verify; no shared abstraction until repetition appears.
- **Validation method**: forced-failure checks; tier-2 states journey.

## D9. Account architecture

- **Observed**: `Your Account` is a 12-tile hub plus grouped link lists; each tile goes to a separate page; no persistent nav. Sub-pages not captured.
- **Problem/opportunity**: shoppers bounce back to the hub between tasks.
- **Decision**: keep the hub as account home; add a persistent account nav on sub-pages (P1-3).
- **Reason**: recognisable entry, less back-and-forth.
- **Tradeoff**: small extra layout work.
- **Validation method**: manual navigation Orders ↔ Addresses without returning to the hub.

## D10. Trust signals, no manufactured urgency

- **Observed**: returns-policy banner, delivery location in header, star ratings with counts. Urgency devices (stock/countdown nudges) not captured either way.
- **Problem/opportunity**: honest persuasion and legal safety for a public demo.
- **Decision**: show total price (items, shipping, tax) before placing the order, delivery date, return window and a demo-payment label. No invented scarcity, countdowns or "bought recently" claims.
- **Reason**: trust and no fabricated claims.
- **Tradeoff**: less conversion pressure than Amazon.
- **Validation method**: content check in Impeccable critique; `checkout.getQuote` tests for displayed totals.

## D11. Accessibility

- **Observed**: skip links, keyboard-shortcut menu, landmarks, `aria-label`s, `aria-expanded` on toggles; empty `alt` on many product images; inconsistent focus styling.
- **Problem/opportunity**: baseline is good but uneven; we can exceed it cheaply.
- **Decision**: WCAG 2.2 AA; one consistent focus ring; meaningful alt text; keyboard-operable menus; live regions for cart changes; reduced motion.
- **Reason**: quality and reviewer signal.
- **Tradeoff**: ongoing checks per slice.
- **Validation method**: manual keyboard pass per slice; axe on key pages (tier 2).

## D12. Performance

- **Observed**: 255 JS files totalling 64 MB across the captures; heavy third-party and ad scripts.
- **Problem/opportunity**: a fast demo is itself a quality signal.
- **Decision**: server components, `next/image`, font subsetting, no third-party scripts; budget LCP < 2.5 s, CLS < 0.1 on mobile (P1-7).
- **Reason**: measurable, cheap with the stack.
- **Tradeoff**: none material.
- **Validation method**: Lighthouse mobile on home/results/PDP.

## D13. Payment realism (constraint)

No real money moves. Demo payment provider behind the `payments` port, clearly labelled, no card data stored; Stripe test mode is P2. Validate with `payments` and `checkout` seam tests (approve, decline).

## D14. Logo and imagery (constraint, needs user)

Amazon's logo exists only as a trademarked sprite and the photos are third-party. Proposal: placeholder wordmark and an owned/licensed catalogue; Amazon-like structure and colour kept. See `docs/recon/asset-inventory.md`.

## D15. Scope boundaries (constraint)

Out of scope: Prime, Rufus/Alexa+ assistant, ads/sponsored placement, seller features, digital content, Fresh/local market, gift-card purchase (the Gift Cards page is a card-pattern reference only), localisation.

## Review log

| Date | Decision | Change |
|---|---|---|
| 2026-10-02 | all | Proposed in Phase 0; Holds on D4, D5 (layout) and D6 until source arrives |
| 2026-10-02 | all | Restructured to the six-field format; added evidence register |
