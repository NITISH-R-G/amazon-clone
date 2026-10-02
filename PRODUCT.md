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

Rebuild the Amazon shopping experience, covering discovery, product detail, cart, checkout, orders, account and help, as a working application. It is not a superficial visual clone. Success is a credible live demo where the core purchase journey works end to end and every deliberate improvement over Amazon is explainable.

## Positioning

A faithful but clearer take on the Amazon flow: it keeps Amazon's recognisable structure and familiarity, and removes its density, interruption and dark-pattern friction where that makes the shopper's task easier. Each departure from Amazon is recorded in `docs/product-decisions.md`.

## Operating Context

- One-day rebuild; phased (Phase 0 planning/recon, Phase 1 onward implementation).
- Reconstruction reference is the supplied `recon/` directory (saved Amazon pages) plus further Site Peel material on request. `docs/recon/` records what it contains.
- Delivered as a live, deployed demo.

## Capabilities and Constraints

- Core journey: home, search/browse, product detail, cart, checkout, order confirmation, order history.
- Account area: overview, orders, addresses, sign-in. Help/returns surfaces are secondary.
- Payments are simulated; no real money moves. No Amazon backend, tracking, ads or personalisation machinery is reproduced.
- Amazon's proprietary font (Amazon Ember) is not available and not licensed for reuse; a substitute is required.
- Product catalogue, data and imagery for the demo are not yet decided (see `docs/roadmap.md`, open questions).
- UNKNOWN / REQUIRES VALIDATION: exact scope of cancellations, tracking, save-for-later and the deals/returns/help depth.

## Brand Commitments

Existing name and identity are Amazon's. The user wants the Amazon shopping experience rebuilt, so recognisable Amazon structure and visual intent are binding. Amazon trademarks and logo files must not ship as-is without an explicit decision (see `docs/recon/asset-inventory.md`).

## Evidence on Hand

- `recon/pages/`: 9 saved Amazon pages (home, sign-in, today's deals, gift cards, your account, your Amazon.com, profile hub, returns centre, help) plus resource folders for two further pages (shopping cart, home & kitchen) whose HTML was not saved.
- No product detail page, search results page or checkout page was supplied. Nothing about them may be fabricated; see `docs/recon/README.md`.

## Product Principles

1. The purchase journey comes first; everything else is secondary to a working add-to-cart, checkout and order-retrieval path.
2. Familiar structure, clearer execution: keep what shoppers already know, remove what only exists for Amazon's benefit.
3. Every state (loading, empty, error, out of stock) is designed, not left to default.
4. Trust is visible: price, delivery, returns and security are never hidden or obscured.
5. Source reconstruction and product improvement stay separate and documented.

## Accessibility & Inclusion

Target WCAG 2.2 AA: full keyboard operation, visible focus, correct landmarks and labels, sufficient contrast, reduced-motion respect, usable at 200% zoom and at 360 px width.
