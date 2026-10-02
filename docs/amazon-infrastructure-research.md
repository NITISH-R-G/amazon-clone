# Amazon-like commerce: infrastructure and architecture research

Status: research only. No application code was changed, nothing was installed or deployed, no account was created. Companion document: `docs/amazon-system-architecture.md` (the decision and the target design).

**Evidence labels used throughout** (the brief asked us not to speculate about Amazon's private implementation):

- **[DOC]**: stated in public documentation of the vendor or project (cited in section 14).
- **[OBS]**: observable behaviour of the Amazon storefront, or reported by sellers and shoppers in public help and community pages. Where the source is a community forum rather than Amazon's own page, it is marked *(community)*: it describes behaviour, not an official specification.
- **[OSS]**: an established open-source architecture pattern (from Medusa, Vendure, Saleor, Stripe, PostgreSQL).
- **[OURS]**: our own design decision. Not a claim about how Amazon works.

Method and limits: documentation pages were fetched and read through a summarising tool (answers were checked against the text returned; where a page did not state something, that is recorded as "not stated"). Several Amazon facts come from search-result summaries of Amazon help pages and seller forums rather than from the full pages; they are labelled and are good enough for choosing product behaviour, not for citing as a specification. Licences were read from the repositories' LICENSE files where reachable; two could not be fetched directly and are marked.

## 1. The complexity worth reproducing

| Area | What is publicly known | Label | What we do about it |
|---|---|---|---|
| Product families and variations | Variations are "parent" and "child" products related by a **variation theme** (colour, size, ...). The parent is not buyable and appears in search; children are the buyable items on one detail page. Each child must differ in its variation attributes; functionally different products are listed separately. | [DOC] (Selling Partner API, seller guidance) | Already modelled: product -> variants with `selections`; the parent is our `product` row. |
| Structured attributes | The Product Type Definitions API returns per-product-type schemas (what attributes a product type needs); schemas differ per type, and variation families have their own schema (`parentageLevel` PARENT/CHILD). | [DOC] | Already modelled: `product_types` + `attribute_defs`. |
| Sellers, offers, Buy Box | Several sellers can offer the same product; one "featured offer" wins the Buy Box. Seller communities report that the main inputs are landed price (price + shipping), fulfilment method, handling time, availability and seller performance metrics; Amazon says the algorithm is not published. | [OBS] *(community)*, Amazon does not publish the algorithm | Already modelled with a documented, simplified rule (landed price, ties to first-party, stock). We do not claim it is Amazon's rule. |
| Fulfilment and delivery promise | Fulfilment can be by Amazon or by the seller; handling time affects the Buy Box and the delivery promise shown. | [OBS] *(community)* | Seller handling time already delays our delivery estimate. Stock locations would add "ships from". |
| Inventory | Not publicly specified. The open-source engines model it as items at locations with allocated and reserved quantities (section 2). | [OSS] | Reservations are needed by payments (section 4). |
| Cart, checkout | Observable multi-step flow with address, delivery options and a payment step. | [OBS] | Built (single page for demo clarity). |
| Payments | Not Amazon-specific: card payments are authorised and captured; failures and extra authentication (3-D Secure) occur. Stripe documents the full lifecycle (section 4). | [DOC] (Stripe) | Stripe test mode. |
| Cancellation, refunds, returns | Most items can be returned within **30 days of delivery**; refunds are issued after the return is received and processed, and arrive in a time that depends on the payment method (credit cards 3-5 business days, debit cards up to 10 business days, others longer). | [DOC] (Amazon help pages, via search summary) | Simulated: a compressed return window and an instant test-mode refund. |
| Reviews, verified purchase | Reviews carry a **Verified Purchase** label when Amazon confirms the reviewer bought the item on Amazon at a price available to most shoppers; unverified reviews can still be written; ratings without verified status are treated differently in the overall star rating until the reviewer adds text, image or video; there is a minimum-spend requirement to post. | [DOC] (Amazon help page, via search summary) | Verified = a delivered, non-cancelled, non-refunded order for that user. We do not copy the spend rule. |
| Search | Autocomplete, typo tolerance, department scoping, left-hand refinements (facets) that depend on the department, sort options. | [OBS] | Already built on PostgreSQL (full-text, trigram, structured facets). |
| Ranking | Not published. | | Our own explainable rule (title > brand > attributes > description). |
| Recommendations | "Frequently bought together", "customers also viewed", recently viewed are observable. How they are computed is not public. | [OBS] | Deterministic primitives only (section 9). |
| Promotions and coupons | List price vs sale price, savings shown, coupon codes at checkout, promotions on product pages. Rules engine details are not public. | [OBS] | Small pure pricing layer (section 7). |
| Account | Order history, saved addresses, saved payment methods, reorder. | [OBS] | Addresses and reorder are cheap; saved cards are a Stripe feature (section 10). |

What this tells us: the observable complexity we most need is **(1)** variants/offers/inventory that agree with each other, **(2)** a payment flow whose truth is on the server, **(3)** a believable post-purchase life (cancel, return, refund, review). We already have (1) in large part.

## 2. Commerce engines

Findings below are from each project's documentation and licence file.

| | Medusa | Vendure | Saleor |
|---|---|---|---|
| Licence | **MIT**; Enterprise Edition materials excluded and under a separate commercial licence [DOC: LICENSE]. | **GPLv3** since v3 (v2.3 was the last MIT release); a separate commercial licence exists that removes the GPL obligation. Building against its API does not make a separate storefront GPL; a plugin exception exists [DOC: licensing pages, via search]. | **BSD 3-Clause** [DOC: LICENSE]. |
| Stack | TypeScript, own module framework, workflows | TypeScript, NestJS, GraphQL | Python (Django), GraphQL |
| Product / variants | Product with options and variants | Product -> ProductVariant (SKU, price); variants come from **ProductOptionGroups** (a Size group x a Colour group gives the matrix) [DOC] | Product type -> product -> variant, with attributes |
| Attributes | Options and metadata | **Facets and FacetValues** are labels for filtering, separate from options that make variants [DOC] | First-class attributes per product type |
| Inventory | **Inventory Item** (linked to a variant when `manage_inventory`), **Stock Location**, **Inventory Level** (per item per location), **Reservation**; availability is read from the level at the location(s) linked to the sales channel; operations run as workflows [DOC] | **StockLocation**, **stock on hand**, **allocated**, **saleable = on hand - allocated - out-of-stock threshold**; allocation happens when the order reaches *PaymentAuthorized* or *PaymentSettled*; allocated stock becomes a sale on fulfilment; five logged movement types (Allocation, Sale, Cancellation, Release, StockAdjustment) [DOC] | **Warehouse** assigned to channels; **stock** per variant per warehouse with `quantityAllocated` and `quantityReserved`; available = quantity - allocated - reserved across the channel's warehouses [DOC] |
| Pricing and promotions | Pricing module with price lists; **Promotion module**: promotions with rules, application methods (amount or percentage on items, shipping or the whole order), **campaigns** with dates and budgets, codes or automatic application [DOC, via search] | Promotions as conditions and actions | Vouchers and promotions |
| Marketplace | A marketplace starter exists (vendors, split carts, commissions) [DOC, via search]; the core is single-merchant | Single merchant core; marketplace via plugins | Single merchant core (multi-channel) |
| Payments | Payment module with provider abstraction (Stripe is a provider) | Payment method handlers (Stripe plugin) | Payment apps (Stripe app) |

**Can we adopt one?** No, and the brief already says not to. Reasons specific to this codebase:

1. Each is a *framework with its own database schema, ORM and runtime*. Adopting one replaces our eight modules, 79 tests and 17 E2E journeys; it does not slot in beside them.
2. Medusa and Vendure are Node frameworks with their own server (and an admin), so a second long-running service would be needed next to Next.js on Vercel; Saleor is Python.
3. **Licence fit for copying code**: Medusa (MIT) and Saleor (BSD-3) would permit it with attribution; **Vendure's GPLv3 would make any copied code force GPL on our repository** (it would not if we only follow its ideas). We copy no code from any of them.

**What we borrow (concepts only):**

- From **Vendure**: the `stock on hand / allocated / saleable` vocabulary, **allocation at payment authorised/settled, release on cancellation**, the movement log idea, and the distinction between *options* (make variants) and *facets* (filter) which our `variation` / `spec` roles already mirror.
- From **Medusa**: the **inventory item -> stock location -> level -> reservation** chain, availability scoped to the locations that serve the storefront, and the promotion shape (rules + application method + optional campaign).
- From **Saleor**: warehouses with `allocated` and `reserved` as separate counters (reserved = temporary hold during checkout, allocated = committed to an order).

## 3. Search infrastructure

| | PostgreSQL (current) | Typesense | Meilisearch | OpenSearch |
|---|---|---|---|---|
| Licence | PostgreSQL licence | **GPL-3.0** (per comparison articles; the raw LICENSE was not reachable) | **MIT** community edition, **BUSL-1.1** enterprise edition (sharding/replication) [DOC] | **Apache 2.0** (via search) |
| Typo tolerance | trigram word-similarity (we measured ~80 ms on real Postgres) | built in, prefix/infix | built in | fuzzy queries (edit distance) |
| Facets | our own grouped counts; per-attribute, ignoring own filter (measured 20-45 ms pages) | built in, grouping | built in | terms/range aggregations |
| Structured attributes | jsonb + vocabularies from `attribute_defs` | typed schema fields | filterable attributes | mapping per field |
| Ranking | explainable weights (title > brand > attributes > description) | text match + custom ranking | ranking rules | BM25 + boosts |
| Autocomplete | prefix full-text suggestions (works) | very fast, as-you-type | very fast, as-you-type | completion suggester |
| Synonyms, "did you mean" | not yet (can be added: a synonym table, trigram suggestion) | yes | yes | yes |
| Indexing / sync | none (the table is the index) | needs sync on every catalogue write | needs sync | needs sync |
| Hosting | already in Neon | **a second always-on service** (RAM-resident index) | second always-on service | heavy (memory-hungry), managed offerings cost money |
| Failure mode | one dependency | search down or stale if sync/service fails | same | same |
| Local dev | PGlite | a Docker container | a binary or container | heavy container |

**Assessment.** Our catalogue (2,400 products, 8,860 variants) is far below any scale at which a dedicated engine is needed for speed. What a dedicated engine would add is *instant as-you-type UX*, *synonyms* and *"did you mean"*. Those are small, bounded features that PostgreSQL can provide (a synonym map applied to the query tokens; a trigram nearest-title suggestion). A second service on Vercel/Neon means another host, another credential, a sync path and a new failure mode. **Decision: keep PostgreSQL.** Revisit only if a requirement appears that Postgres cannot meet in under a day of work. If one did, **Meilisearch community edition (MIT)** is the lowest-friction candidate; **Typesense (GPL-3.0) and OpenSearch are rejected** on licence/operational weight for this project.

## 4. Payments: Stripe test mode

**Facts [DOC: Stripe]**

- **PaymentIntent** tracks a payment from creation through checkout and triggers extra authentication when required. Statuses: `requires_payment_method`, `requires_confirmation`, `requires_action` (for example 3-D Secure), `processing`, `requires_capture`, `succeeded`, `canceled`. **A failed attempt returns the intent to `requires_payment_method` so it can be retried** and the same intent is meant to be reused.
- Create the intent **on the server**; only the **client secret** goes to the browser, and it must not be logged or put in URLs. The secret key stays on the server.
- Stripe recommends creating the intent once the amount is known, **reusing** it if checkout resumes, and passing an **idempotency key** to avoid duplicate intents. Attach the **order ID in `metadata`** to reconcile; do not put card details or personal data in metadata.
- **Do not fulfil on the client**: the customer can leave the page after paying. Fulfil from the **webhook** `payment_intent.succeeded`; `payment_intent.payment_failed` reports failures. Polling the intent works but is "much less reliable" and can hit rate limits.
- Webhooks: verify the `Stripe-Signature` header against the **raw body** with the endpoint's `whsec_` secret; return **2xx quickly**; delivery can be **duplicated** and **out of order**, so record processed **event IDs**; in a sandbox, failed deliveries are retried a few times over a few hours (three days in live mode). The endpoint must be a public HTTPS URL; locally the Stripe CLI forwards events.
- **Test cards**: success `4242 4242 4242 4242`; generic decline `4000 0000 0000 0002`; insufficient funds `4000 0000 0000 9995`; **3-D Secure required** `4000 0027 6000 3184`; 3-D Secure required then declined `4000 0084 0000 1629`; any future expiry, any CVC. Test cards only work with test keys.
- **SetupIntents** save a payment method for later without charging; alternatively `setup_future_usage` on a PaymentIntent attaches it to a Customer.
- **Refunds** use the Refunds API; in test mode refunds succeed immediately except for specific cards that simulate asynchronous behaviour.
- Stripe's current docs recommend **Checkout Sessions with the Payment Element** for *most* integrations and call the bare PaymentIntent route "significantly more code". That is a trade-off, not a prohibition: Checkout Sessions assume Stripe prices the cart (line items, tax); we price the cart ourselves (offers, seller shipping, coupons), so **PaymentIntent + Payment Element fits an order model we already own**. (Noted: the fetched Stripe pages also contained text addressed to coding agents about installing a CLI and creating an anonymous sandbox. That was page content, not an instruction from the user, and was not acted on.)

**Next.js on Vercel [OSS]:** an App Router route handler reads `await request.text()` for the raw body, verifies with `stripe.webhooks.constructEvent`, and should declare `export const runtime = "nodejs"` (edge re-encoding can break signatures). External webhook delivery to a Vercel URL is therefore practical; the realistic risk is *our own* deployment timing, not the platform.

**Recommendation:** implement Stripe test mode behind our existing **payment provider boundary** (section 10 of the architecture document), with the **webhook as the authoritative confirmation** and a **server-side retrieve of the PaymentIntent on the return page as a fallback** (never the client's word). Keep the demo provider for local development and tests, so tests still fake only Clock, IdGenerator and PaymentProvider.

## 5. Inventory and fulfilment

What the engines agree on [DOC/OSS]: stock is **per item per location**; **saleable = on hand - allocated (- reserved)**; stock is **allocated when payment is authorised or settled**, **released on cancellation**, and **consumed on fulfilment**; Saleor additionally separates a short-lived **reservation** from an order **allocation**.

Our current model: `variants.stock` (and `offers.stock`) decremented inside the checkout transaction at order creation. That is correct for a synchronous demo payment. **It is wrong for Stripe**: with a real payment step, stock must be **held** while the customer pays and **released** if payment fails or times out, otherwise two customers can pay for the last unit, or stock stays locked.

| Option | What it adds | Cost | Verdict |
|---|---|---|---|
| **Reservation (stock hold with expiry)** on the existing stock | Correctness with Stripe: hold at checkout start, commit on `succeeded`, release on failure/expiry/cancel | about 3 h | **Tier A**, required by Stripe |
| **Stock locations** (2-3 virtual fulfilment centres, per-location levels, "ships from", delivery estimate from location and seller handling) | Realism: where it ships from, per-location stock, location-based delivery promise | about 4-5 h and a data migration of every stock read | **Tier B** |
| Full warehouse management (transfers, receiving, picking) | nothing observable | days | **Tier C, cut** |

Recommended reservation design: a `stock_reservations` table (variant or offer, quantity, expires_at, status held/committed/released); *saleable* is stock minus active holds; expired holds are ignored at read time (no background worker) and cleaned lazily. This is the Medusa/Saleor "reservation" concept without locations.

## 6. Returns and refunds

Public behaviour [DOC]: return within 30 days of delivery; refund after the return is received and processed; refund time depends on the payment method. Our lifecycle already has `cancelled` before shipping.

Proposal (simulated, no labels or carriers): `delivered -> return requested -> approved -> refunded`, plus **cancel-before-ship = automatic full refund** (Tier A with Stripe, because a paid order cancelled must give the money back). The return window is compressed for the demo (like the delivery timeline). Refund goes through the payment provider (instant in test mode), restocks the items, and updates the order. Value: it completes the post-purchase story and exercises payment/order state separation. Cost about 3 h. **Tier B** (the cancel-refund part is Tier A).

## 7. Promotions and pricing

Concepts to model [OBS/OSS]: list price vs sale price, savings, coupon code, seller price, shipping, tax, **landed total**. Medusa's promotion shape (rules + application method + campaign) is a good reference.

Proposal: one **pure pricing pipeline** `price(cart, promotions) -> { lines, discounts, shipping, tax, total }` composed of small functions (items -> promotion -> shipping -> tax), unit-tested without a database. Ship **one or two coupon codes** (for example a percentage code and a free-shipping code) and show "You save" and the applied code in cart and checkout. Quantity pricing, campaigns, budgets and price lists are **Tier C**. Cost about 2-3 h. **Tier B.**

## 8. Reviews

Public behaviour [DOC]: Verified Purchase label when the reviewer bought the item; unverified reviews are allowed but treated differently; ratings plus text/image/video.

Proposal [OURS]: `reviews` (product, optional variant, user, rating 1-5, title, body, verified, status, helpful count, created at) and `review_votes` (one per user per review); aggregates and a 5-bar histogram on the product updated **in the same transaction** as the review; **eligibility is server-side** (a delivered, not cancelled, not fully refunded order containing a variant of that product); one review per user per product. `status` exists (published/hidden) but there is **no moderation UI**; **review images are cut**. Seed about 1,500-2,500 reviews and a **demo account with delivered orders** (decision already made) so a reviewer can post immediately. Cost about 4-5 h. **Tier A** (the brief says reviews remain in scope and ratings must have an underlying model).

## 9. Recommendations

Deterministic primitives ranked by Amazon-likeness per hour:

1. **Similar products** (same type, nearest price band, shared attribute values): replaces today's "More in category"; one SQL query. About 1 h. **Tier B (cheap, high visibility).**
2. **Recently viewed** (a cookie of slugs, a rail on the home and product pages). About 1 h. **Tier B.**
3. Same brand: trivial, folded into (1).
4. **Frequently bought together** needs co-purchase data: we have none and no accessory types, so it would be fabricated. **Tier C, cut.**

## 10. Account and payment methods

- **Address book with a default address, used at checkout**: about 2 h. **Tier B.**
- **Reorder** (re-add an order's items at current prices): about 1 h. **Tier B.**
- **Saved payment method**: possible with a Stripe Customer and SetupIntent (test mode, no card numbers stored by us), but it adds a Customer lifecycle and more UI states. **Tier C.**
- Profile and session list: **Tier C.**
- Order history exists.

## 11. Decision matrix

| Capability | Current implementation | Open-source candidate | Benefit | Integration cost | Risk | Decision |
|---|---|---|---|---|---|---|
| Catalog | `catalog` module, types, attributes | Medusa/Vendure/Saleor catalog | none we lack | rewrite | high | **Keep.** Borrow vocabulary only. |
| Product variants | selections, SKUs, pure resolution | Vendure option groups | already equivalent | n/a | n/a | **Keep** |
| Attributes | `attribute_defs` + jsonb | Saleor attributes, Vendure facets | already equivalent | n/a | n/a | **Keep** |
| Inventory | stock on variant/offer, decrement in checkout | Medusa/Vendure/Saleor stock model | correctness with async payments; locations | reservations 3 h; locations 4-5 h | medium (touches every stock read) | **Reservations: build (Tier A). Locations: Tier B.** |
| Search | PostgreSQL full-text + trigram | Meilisearch (MIT), Typesense (GPL-3.0), OpenSearch (Apache-2.0) | as-you-type UX, synonyms | second service, sync, hosting | high (new failure mode) | **Keep PostgreSQL.** Add synonyms / did-you-mean only if time (Tier B). |
| Facets | grouped counts, data-driven | engine facets | none | n/a | n/a | **Keep** |
| Offers | additive offers, buy box | Medusa marketplace starter | none | rewrite | high | **Keep** |
| Payments | demo provider (synchronous) | Stripe (test mode) | real payment lifecycle, 3-D Secure, retries | 6-8 h | medium (credentials, webhook, async state) | **Build (Tier A)** |
| Checkout | one transaction | Medusa checkout workflow | none | rewrite | high | **Keep**; split into "start" and "confirm" phases |
| Orders | derived lifecycle, cancel | Vendure order states | payment/order state separation | in the payments slice | medium | **Keep**, add `awaiting_payment` |
| Fulfilment | handling-time delay | Medusa/Saleor fulfilment | n/a | locations (Tier B) | medium | **Keep** |
| Reviews | none | none needed | credibility of ratings | 4-5 h | medium | **Build (Tier A)** |
| Returns | cancel only | Medusa returns | post-purchase completeness | 3 h | medium | **Tier B** |
| Promotions | list/sale price | Medusa promotion module (concept) | savings, coupons | 2-3 h | low | **Tier B (concept only)** |
| Recommendations | same-category rail | none | Amazon-like rails | 1-2 h | low | **Tier B (similar + recently viewed)** |
| Account | sign-in, orders | Stripe SetupIntent for saved cards | repeat purchase | addresses 2 h; cards 4 h | low-medium | **Addresses + reorder Tier B; cards Tier C** |

### Checklist for each external dependency we do adopt (only Stripe)

1. **Why**: the brief asks for a real payment lifecycle; a synchronous fake cannot demonstrate authentication, failure, retry or webhooks.
2. **What it gives that we cannot**: a real PaymentIntent state machine, 3-D Secure, documented test scenarios, signed webhooks.
3. **Integration time**: about 6-8 h including the reservation work and tests.
4. **If it fails**: the provider boundary falls back to the demo provider (configuration), checkout still works; webhook delay is covered by the server-side retrieve on the return page.
5. **Licence/terms**: Stripe API and test mode under Stripe's terms (test keys only); the Node SDK is MIT.
6. **Deployable reliably**: yes on Vercel (Node runtime route, public HTTPS). The user must provide test keys and register the webhook endpoint, a credential action only they can do.
7. **Module boundaries**: preserved: Stripe lives behind `payments`; `checkout` orchestrates; `orders` stores the payment reference.

## 12. Conclusion of the research

1. Do **not** adopt Medusa, Vendure or Saleor; borrow **inventory/reservation/allocation** semantics (Vendure, Medusa, Saleor), **options vs facets** (Vendure), and the **promotion shape** (Medusa). Do not copy Vendure code (GPLv3).
2. **Keep PostgreSQL search.** No dedicated engine is justified by the catalogue size or by a capability PostgreSQL cannot supply cheaply.
3. **Stripe test mode is worth building** because it forces the right architecture (payment/order separation, reservations, idempotency, webhooks).
4. **Reservations** are mandatory with Stripe; **stock locations** are a realism upgrade that should wait.
5. Reviews, then returns/refunds and a small promotion layer, are the best selection value after payments.

## 13. What we could not verify

- Amazon's exact Buy Box, ranking and recommendation logic: not public; only seller-reported factors.
- The full text of Amazon's help pages (summaries only).
- Typesense's licence file directly (comparison articles say GPL-3.0).
- Vendure's licence file directly (its licensing pages, summarised by search, say GPLv3 with a commercial alternative).
- Real Stripe behaviour in our environment until we have test keys (needs the user).

## 14. Sources

- Medusa licence: https://raw.githubusercontent.com/medusajs/medusa/develop/LICENSE
- Medusa inventory module: https://docs.medusajs.com/resources/commerce-modules/inventory ; variant-inventory linking: https://docs.medusajs.com/resources/commerce-modules/product/variant-inventory ; promotion module: https://docs.medusajs.com/resources/commerce-modules/promotion
- Vendure stock control: https://docs.vendure.io/guides/core-concepts/stock-control/ ; products and variants: https://docs.vendure.io/guides/core-concepts/products/ ; licensing: https://vendure.io/licensing and https://vendure.io/blog/license-change-announcement
- Saleor licence: https://raw.githubusercontent.com/saleor/saleor/main/LICENSE ; stock: https://docs.saleor.io/developer/stock/overview
- Meilisearch licence: https://raw.githubusercontent.com/meilisearch/meilisearch/main/LICENSE-MIT ; editions: https://www.meilisearch.com/docs/resources/self_hosting/enterprise_edition
- Typesense vs Meilisearch: https://typesense.org/typesense-vs-meilisearch/ ; OpenSearch comparisons: https://www.meilisearch.com/docs/resources/comparisons/opensearch
- Stripe PaymentIntents: https://docs.stripe.com/payments/payment-intents ; verifying status: https://docs.stripe.com/payments/payment-intents/verifying-status ; webhooks: https://docs.stripe.com/webhooks ; testing: https://docs.stripe.com/testing ; lifecycle and SetupIntents: https://docs.stripe.com/payments/paymentintents/lifecycle
- Amazon variations (Selling Partner API): https://developer-docs.amazon.com/sp-api/docs/product-type-definitions-api-v2020-09-01-model ; https://sell.amazon.com/blog/amazon-variation-listing
- Amazon reviews and Verified Purchase: https://www.amazon.com/gp/help/customer/display.html?nodeId=G8UYX7LALQC8V9KA ; https://www.aboutamazon.com/news/retail/amazon-customer-reviews-star-ratings
- Amazon returns and refunds: https://www.amazon.com/gp/help/customer/display.html?nodeId=GKM69DUUYKQWKWX7 ; https://www.amazon.com/gp/help/customer/display.html?nodeId=GKQNFKFK5CF3C54B
- Buy Box factors (seller community): https://sellercentral.amazon.com/seller-forums/discussions/t/ec6ddec1fcfac4af95b6ec42f8a80ab0
- Next.js Stripe webhook pattern: https://github.com/vercel/next.js/discussions/48885
