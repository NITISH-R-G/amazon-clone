# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Next.js (App Router), TypeScript (strict), Tailwind CSS, shadcn/ui. Chosen by the user on 2026-10-02 from three options. Recorded again with rationale in `docs/architecture.md`.

## Users

Two audiences, confirmed by the user:

- **Assessment reviewers** who judge a live demo for product judgment, UX thinking, engineering quality and shipping speed.
- **Realistic online shoppers** the UI itself must serve: people who arrive to find a product, compare, add to cart, check out and later track or return an order.

## Product Purpose

Build a working ecommerce application covering discovery, search, product detail, cart, checkout, orders and account, informed by Amazon and Flipkart behaviour. It is not a visual clone of either. Success is a credible live demo where the core purchase journey works end to end and every deliberate departure from the incumbents is explainable.

## Positioning

A serious ecommerce product with premium, restrained product design: conventional commerce behaviour (search, filters, product, cart, checkout, orders, account) with an identity of its own. Amazon and Flipkart are behavioural and product evidence only; each departure from them is recorded in `docs/product-decisions.md`.

## Operating Context

- One-day rebuild; phased (Phase 0 planning/recon, Phase 1 onward implementation).
- Reconstruction reference is the supplied `recon/` directory (saved Amazon pages) plus further Site Peel material on request. `docs/recon/` records what it contains.
- Delivered as a live, deployed demo.

## Capabilities and Constraints

- Core journey: home, search/browse, product detail, cart, checkout, order confirmation, order history.
- Account area: overview, orders, addresses, sign-in. Help/returns surfaces are secondary.
- Payments are simulated; no real money moves. No Amazon backend, tracking, ads or personalisation machinery is reproduced.
- Amazon's proprietary font (Amazon Ember) is not available and not licensed for reuse; a substitute is required.
- Product catalogue, data and imagery for the demo are not yet decided (see `docs/catalogue-decision.md`).
- UNKNOWN / REQUIRES VALIDATION: exact scope of cancellations, tracking, save-for-later and the deals/returns/help depth.

## Brand Commitments

Binding visual constraints from the user (2026-10-02, decision D20; detail in `docs/recon/visual-system-proposal.md`):

- Own identity. Must not look like Amazon, Flipkart, a generic shadcn demo, a Tailwind template or an AI-generated ecommerce starter.
- Apple-level product-design principles (hierarchy, restraint, typography, spacing, clarity, subtle motion, strong accessibility) as inspiration only: no Apple assets, logos, typography or exact layouts.
- Predominantly monochrome: white, near-white, black, near-black, neutral greys. Primary action black on white; secondary white/neutral with a subtle border. **No brand hue** (no orange, green, blue, purple or brown). Semantic colour (red error, green success/savings, blue info) only where meaning requires it.
- Restrained geometry (about 6 to 10 px controls, 8 to 12 px larger surfaces), flat surfaces, borders before shadows, minimal functional shadows, no decorative gradients, no heavy rounding.
- shadcn/ui as the implementation foundation with semantic tokens; compose domain components from primitives.
- Motion only to explain state changes; respect reduced motion; no autoplay carousels.
- Rejected and not to be reintroduced: the earlier "calm market" proposal (warm paper, deep green, orange, earthy palette).
- Amazon trademarks, logo and imagery must not ship; the wordmark is a placeholder until the user decides.

## Evidence on Hand

- `recon/` and `recon-v2/` (git-ignored, local only): saved Amazon pages (home, sign-in step 1, deals, gift cards, account, profile, returns, help, PDP in an unshippable state, search results, cart with items, an early checkout step) and Flipkart pages (home with login modal, cart, checkout order-summary step, payments step; order history assets only). Findings are in `docs/recon/`.
- Open-source references researched, not copied: Your Next Store and the shadcnspace ecommerce template (licence notes in `docs/recon/open-source-reference-analysis.md`).
- Not captured and not to be fabricated: Amazon PDP buy-box states, checkout review, password step; Flipkart PDP and search results; orders list and order detail from either site.

## Product Principles

1. The purchase journey comes first; everything else is secondary to a working add-to-cart, checkout and order-retrieval path.
2. Familiar behaviour, clearer execution: keep the commerce conventions shoppers already know, remove what only exists for an incumbent's benefit.
3. Every state (loading, empty, error, out of stock) is designed, not left to default.
4. Trust is visible: price, delivery, returns and security are never hidden or obscured.
5. Source reconstruction and product improvement stay separate and documented.

## Accessibility & Inclusion

Target WCAG 2.2 AA: full keyboard operation, visible focus, correct landmarks and labels, sufficient contrast, reduced-motion respect, usable at 200% zoom and at 360 px width.
