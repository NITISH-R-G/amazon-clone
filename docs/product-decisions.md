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
| D16 | Provisional tracer layouts | Our own design, no source | None | A1 |
| D17 | Checkout form behaviour | Improvement (additive) | Our own manual run | A1 |
| D18 | Visual identity (tracer) | **Superseded by D20** | Observed tokens | A1 |
| D19 | Visual baseline provisional | Process decision | None | A1 |
| D20 | Visual direction: monochrome, Apple-inspired, shadcn | **Approved override** | User direction + reference research | visual system |

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

## D16. Provisional tracer layouts (PDP, cart, checkout)

- **Observed evidence**: none. `recon-v2/` does not exist yet; the five required captures had not arrived when the tracer was built. D4, D5 and D6 remain on Hold.
- **Problem/opportunity**: the tracer needs real pages to prove the purchase path, without inventing Amazon-specific structure.
- **Decision**: our own provisional layouts: PDP as gallery | details | buy box on desktop and a single column on mobile; cart as a line list with a subtotal panel; checkout as one page (address, payment, sticky summary). Labelled provisional everywhere; no Amazon copy or structure claimed.
- **Reason**: conventional commerce patterns, cheap to replace once source arrives; the module layer underneath does not change.
- **Tradeoff**: visual fidelity to Amazon is unknown and likely to need rework in A4/A5/A6.
- **Validation method**: compare against the Site Peel PDP, cart and checkout-review captures when supplied; update D4/D5/D6 from Hold to decisions.

## D17. Checkout form behaviour (tracer)

- **Observed evidence**: Amazon checkout is not captured. Manual run of our form (desktop and 375 px) plus Impeccable critique found: the error banner sat off-screen after a failed submit, the expiry needed a typed slash, the total was not visible next to the buy button, and card-field values were lost after errors.
- **Problem/opportunity**: avoidable errors and uncertainty at the highest-risk step.
- **Decision**: focus and announce the error summary after a failed submit; group the card number and insert the expiry slash while typing; show the order total in the primary button; re-fill non-sensitive fields after an error but never card data; one stable idempotency key per rendered form so a double click cannot place two orders.
- **Reason**: fewer failed attempts and a visible total before commitment (D10).
- **Tradeoff**: small client-side formatting code; card fields are cleared after a decline (safer).
- **Validation method**: domain tests T9, T11, T20, T21 for the server behaviour; manual run; tier-1 E2E.

## D18. Visual identity for the tracer (SUPERSEDED by D20)

- **Observed evidence**: Amazon's tokens are measured in `docs/recon/design-tokens.md` (yellow CTA, teal links, dark header). Its logo is a trademark and its font is proprietary and was not captured.
- **Problem/opportunity**: be recognisably a shopping product without reproducing Amazon's brand.
- **Decision**: keep proven commerce colour roles (yellow primary action, red price/deal, green stock, teal links, dark navy header) with a placeholder wordmark ("Cartly"), our own flat SVG product illustrations, and Inter as the substitute typeface. The Impeccable detector flags Inter as an overused font; kept deliberately for now.
- **Reason**: familiar affordances reduce learning cost; own marks avoid trademark and copyright exposure.
- **Tradeoff**: the typeface is generic; revisit in the P1 Impeccable pass.
- **Validation method**: Impeccable detector on the rendered pages (structural findings: none); user decisions still open on logo and font.

## D19. Visual baseline is provisional until Site Peel evidence arrives

- **Observed evidence**: none for the PDP, cart and checkout. The five required captures (PDP simple, search results, cart with 2 to 3 items, checkout review, sign-in step 2) are not in `recon-v2/` yet.
- **Problem/opportunity**: the tracer UI had to exist to prove the purchase path; polishing it before evidence arrives would be wasted work and could entrench invented structure.
- **Decision**: the current PDP, cart, checkout and confirmation visual structure is **provisional**. The visual system will be revisited after the captures arrive. Domain behaviour (the eight modules, tests T1 to T22) is independent of that revision and is not rewritten for it. No Impeccable audit or polish is run on the placeholder UI.
- **Reason**: evidence first; the module layer confines the cost of a visual revision to `src/app` and `src/components`.
- **Tradeoff**: until then the UI is functional but not faithful to Amazon, and the generic typeface and placeholder wordmark remain.
- **Validation method**: when the captures arrive, map their structure to existing components and routes, record what changed in D4, D5 and D6, and re-run the tier-1 E2E unchanged.

## D20. Visual direction: monochrome, Apple-inspired, shadcn-based (supersedes D18)

- **Observed evidence**: Amazon and Flipkart are dense, promotion-heavy and colour-branded (yellow/orange and navy; blue and yellow tiles). Open-source references (YNS, shadcnspace) lean on very rounded surfaces and marketing-style sections (`docs/recon/open-source-reference-analysis.md`). The tracer's own look borrowed Amazon's colour roles (D18).
- **Problem/opportunity**: the product must not read as Amazon, Flipkart, a generic shadcn demo, a Tailwind template or an AI-generated starter, while staying a serious, usable ecommerce app.
- **Decision (user-approved override)**: a predominantly monochrome system (white, near-white, black, near-black, neutral greys); primary action black on white, secondary white/neutral with a subtle border; hairline borders before shadows, minimal functional shadows; restrained geometry (about 6 to 10 px for controls, 8 to 12 px for larger surfaces); a neutral modern sans (recommendation Hanken Grotesk, to be confirmed by specimens; not Inter, Geist or Figtree) with tabular numerals for prices; semantic colour (red error, green success/savings, blue info) only where meaning requires it; shadcn/ui as the implementation foundation with semantic tokens; motion only to explain state changes, `prefers-reduced-motion` respected, no autoplay carousels. Apple is an inspiration for principles (hierarchy, restraint, typography, spacing, clarity), not for assets, typography or layouts. **Rejected and not preserved**: the "calm market" proposal (warm paper, deep green brand, orange, earthy palette, heavy rounding, decorative gradients).
- **Reason**: restraint and typography give a premium, trustworthy feel and let product imagery and information lead, which suits commerce; a neutral base cannot be mistaken for either incumbent's brand; shadcn tokens keep the system consistent and cheap to change.
- **Tradeoff**: without a brand colour the black primary action must win on size, contrast and placement (not hue); monochrome can read as cold or generic if typography and spacing are weak; fewer cheap attention devices (no coloured badges or banners).
- **Validation method**: contrast checks for every token pair (AA); Impeccable `critique` then `audit` on the first implemented UI, applied selectively; browser review at 360, 768 and 1280 px; a "does the primary action win without colour?" check on PDP, cart and checkout; comparison against the "not to look like" list in `docs/recon/visual-system-proposal.md`.
- **Sub-decisions**: bottom navigation is **not** added by default (decision test in the proposal); dark mode is out of scope for now; the wordmark stays a placeholder until you decide.

## D21. D20 implemented: Hanken Grotesk validated, first slice shipped

- **Typeface:** specimen rendered at 32px/600 and 375px. Hanken Grotesk digits are tabular by default (1111.11 and 8888.88 measure identically), numerals are compact and headings confident. Public Sans is proportional unless `tnum` is set. Hanken stays primary, Public Sans is the fallback; the `.num` utility is kept for safety.
- **Slice:** Home, Search, Results, Product, Cart are built to the D20 tokens: no resting shadows, no gradients, no brand hue, success green only for savings and stock, destructive red only for errors and Remove.
- **Variants:** modelled as one labelled variant list per product (`optionName`), shown as a radio group; the price and availability follow the selected variant.
- **Navigation:** header search plus a scrolling category strip; a sheet menu on mobile. No bottom navigation (deferred by D20).
- **Mobile purchase:** a sticky Add to cart bar appears only while the main button is off-screen.
- **Search state** lives in the URL (`k`, `c`, `min`, `max`, `r`, `stock`, `sale`, `sort`, `page`).

## D22. P0-B: guest checkout stays; accounts add history, not a gate

- **Guest checkout is kept.** Forced registration before paying is a known abandonment cause; checkout offers "Sign in" and works without it. This replaces the roadmap B1 wording "checkout redirects to sign-in" with a softer rule: sign-in is offered, never required.
- **Cart and orders follow the person.** Signing in or registering merges the guest cart into the account cart (quantities add, clamped to stock) and claims the guest's orders into the account history. Orchestration lives in the app layer (`auth-actions.ts`); `auth`, `cart` and `orders` stay unaware of each other (`docs/modules.md` rule 3).
- **Auth is deliberately small:** email + password (scrypt), opaque session cookie whose SHA-256 is stored, 30-day expiry, generic "do not match" error that costs the same for unknown emails, `returnTo` limited to same-site paths. No OAuth, no password reset, no email verification (demo; no email is sent).
- **Orders:** history and detail share one view of the purchase-time snapshot. Status stays `placed`; progression is deferred (see `docs/p0b-priority-analysis.md`).
- **Search** is deterministic: filler words ignored, one-letter typos tolerated for words of 4+ letters, and when no product has every word, products with at least half of the words are shown with an explicit notice. No ranking model.
- **Touch targets:** 44px for coarse pointers; dense controls drop to 36px for fine pointers (still above the 24px WCAG 2.2 AA minimum).

## D23. Scale-up: managed Postgres in production, synthetic catalogue of about 2,400 products

- **Production database:** Neon (managed Postgres) behind `DATABASE_URL`; PGlite remains for local development and every automated test. Supersedes the "not decided" status in `docs/architecture.md` section 12 and the container-with-volume recipe (kept as the fallback in `docs/deployment.md`).
- **Catalogue:** overrides the earlier "40 to 60 hand-authored products" default (`docs/catalogue-decision.md`) on the user's explicit instruction. The data is generated deterministically from our own product types, invented brands and attribute vocabularies, and is clearly synthetic. No Amazon data, identifiers or imagery.
- **Why:** a believable catalogue changes how search, filters, pagination and rails behave, and a real database is a precondition for a live system. Plan, evidence and cut order: `docs/scale-up-plan.md`.

## D24. Order lifecycle: derived status on a compressed demo timeline; cancel until it ships

- **Derived, not stored.** An order's status is computed on read from `placedAt`, one stored fact (`cancelledAt`) and the injected clock. No worker, cron or queue.
- **Demo timeline (simulated, labelled as such in the UI):** shipped after 5 minutes, out for delivery after 30 minutes, delivered after 2 hours. Real retail takes days; a compressed clock lets a reviewer watch an order progress. All thresholds are in one file (`orders/internal/lifecycle.ts`).
- **Cancellation:** allowed only while the order is Placed (the first 5 minutes). It is final, restores stock in the same transaction, and needs no refund because payments are simulated.
- **Product page delivery estimate:** "Get it by ..." uses the same function as the order (`estimatedDeliveryFrom`), so the promise and the order always agree.
- **Search ranking (explainable):** title words rank above brand, then description; a matching category name adds a little; ties go to featured rank, then review count. Misspellings are matched by trigram word similarity (threshold 0.5), only after an exact reading finds nothing.

## Review log

| Date | Decision | Change |
|---|---|---|
| 2026-10-02 | all | Proposed in Phase 0; Holds on D4, D5 (layout) and D6 until source arrives |
| 2026-10-02 | all | Restructured to the six-field format; added evidence register |
| 2026-10-02 | D20 | Visual direction overridden by the user; D18 superseded; "calm market" proposal rejected |
