# Amazon complexity plan: from "polished store" to a structurally Amazon-like commerce system

Status: audit and plan only. No application code was changed to write this. Facts come from the repository (schema, generator, PDP, cart, checkout, search, tests) and one measurement of the generated catalogue. Deployment (Neon, Vercel) and verified reviews are deliberately **not** started; see section 15 for the recommendation and the decisions needed.

Thesis: do not chase Amazon's row counts; represent the **relationships** that make Amazon Amazon:

```
Category -> Product type -> Product -> Variation dimensions -> Variant (SKU) -> Offer (seller, fulfilment) -> Review (verified)
```

A 2,400-product catalogue whose items have real variants, real category-specific attributes, competing offers and verified reviews is worth more than 100,000 flat rows.

## 1. Current architecture assessment

- **Modules (enforced by ESLint):** `catalog`, `search`, `cart`, `checkout`, `orders`, `payments`, `auth` (and an empty `account`). Composition root `src/server/app.ts`. PGlite for dev and tests, `pg` when `DATABASE_URL` is set.
- **Flow:** UI -> thin server action -> module interface -> Drizzle. Cart and orders already refer to a **variant id**, not a product, and orders store a purchase-time snapshot. That is the single most important thing in the current design for this plan: **identity of what was bought is already the variant**.
- **Search:** Postgres full-text + trigram behind `catalog.findProducts` (indexed SQL, facet counts for category and brand).
- **Tests:** 58 unit/integration (real PGlite, only Clock, IdGenerator, PaymentProvider faked) and 12 E2E.
- **Verdict:** the architecture is sound and the boundaries are the right ones. The weakness is the **data model inside `catalog`**, not the module structure.

## 2. Current catalogue model assessment (measured)

| Fact | Value |
|---|---|
| Products / variants / brands | 2,400 / **3,110** / 64 |
| Products with more than one variant | 478 (all curated or generated "Color" options) |
| Variation dimensions per product | **1 at most** (`products.option_name` + `variants.label`) |
| Variant columns | `id`, `product_id`, `label`, `price_cents`, `list_price_cents`, `stock` |
| Images | on the **product** only (`products.images`), two per product, chosen by illustration shape and tone |
| Specs | `products.specs` = `[{label, value}]` jsonb: display text only, not typed, not indexed, not filterable |
| Product types | exist only in the generator (`src/db/catalog/product-types.ts`, 35 types with real, different spec vocabularies); **not persisted** |
| Offers / sellers | none |
| Reviews | none; `rating_tenths` and `rating_count` are seeded numbers on the product |
| Facets | category, brand (counts); price, rating, stock, sale (filters) |

What is good and reusable: the generator already holds, per product type, the **value vocabularies** (RAM, storage, driver size, material...) and a deterministic seeded random generator. Converting that knowledge into persisted attribute definitions is mostly a change of *where it lives*, not new authoring.

## 3. Gap analysis: the ten questions, answered from the code

| # | Question | Answer today | Evidence |
|---|---|---|---|
| 1 | Can one product have multiple variation dimensions? | **No.** One option name per product. Colour x storage can only be flattened into one label ("Black / 256 GB"), which gives no per-dimension picker and no validation. | `products.option_name`, `variants.label`; max 1 dimension measured |
| 2 | Can each variation have its own SKU, price, stock, image set, availability? | Price and stock: yes. Availability: derived from stock. **SKU: no** (the variant id stands in). **Image set: no** (images belong to the product). | `variants` columns; `products.images` |
| 3 | Meaningful combinations (storage, RAM, colour, material, size, processor, generation, capacity, configuration)? | Only as free text. Nothing says which combinations exist or are valid. | no structured selections |
| 4 | Does selecting a variation update price, stock, imagery and delivery? | Price and stock yes (client context). **Imagery no. Delivery no** (one static note and one global estimate). | `purchase-context.tsx`, `purchase-panel.tsx` |
| 5 | Multiple offers for the same product/variant? | **No.** Price and stock live on the variant row. | schema |
| 6 | Does seller/offer selection affect price and fulfilment? | **No** concept of seller or fulfilment. | schema |
| 7 | Can reviews be tied to real purchases? | **No reviews exist.** The data needed for eligibility does exist: `order_items.variant_id` plus order status. | orders schema; lifecycle |
| 8 | Do search and facets operate over structured attributes? | **No.** Text and four fixed filters only. | `find.ts` criteria |
| 9 | Can one architecture represent categories with completely different attribute sets? | **Display only.** Different text per type, but not queryable or comparable. | `ProductSpec` |
| 10 | Does the current model remain compatible with the module boundaries? | **Yes.** Every change below fits inside `catalog` (attributes, variants, offers) or adds one new module (`reviews`); cart and orders only gain snapshot fields. Dependency direction is unchanged. | `docs/modules.md` rules |

## 4. Minimal schema evolution

Principles: additive migrations only (old columns keep working until retired), no table per category, no generic EAV soup, and **every new thing has a reason in the PDP, cart, search or review flow**.

```
categories (existing)                 departments: Audio, Kitchen, Home, Desk, Travel, Wearables (+ Electronics, Fashion, Furniture)
product_types (NEW)                   id, slug, name, category_id            e.g. smartphones, laptops, running-shoes
attribute_defs (NEW)                  id, type_id, key, label, role, facet, values[] (ordered vocabulary), position
                                       role = "variation" | "spec"; facet = shown as a filter
products (existing +)                 + type_id, + attributes jsonb {ram: "8 GB", processor: "..."} (spec values)
                                       + rating_histogram int[5]   (reviews slice)
variants (existing +)                 + sku (unique), + selections jsonb {color: "Black", storage: "256 GB"},
                                       + images jsonb (override; falls back to product images)
sellers (NEW, tiny)                   id, name
offers (NEW, additive)                id, variant_id, seller_id, price_cents, list_price_cents, stock,
                                       fulfilment ("cartly" | "seller"), shipping_cents, handling_minutes
reviews (NEW, module `reviews`)       id, product_id, variant_id?, user_id?, author_name, rating, title, body,
                                       verified, created_at, helpful_count
review_votes (NEW)                    review_id, user_id  (unique pair)
orders / order_items (existing +)     + sku, variant_label, seller_name, fulfilment, offer_id (snapshots)
```

**Why jsonb for values and a table only for definitions.** Attribute *definitions* (what the attributes are, their order, vocabulary and whether they facet) are structured data the UI and search read dynamically: a small table. Attribute *values* per product are a handful of keys; a `jsonb` column with a GIN index filters (`attributes @> '{"ram":"8 GB"}'`) and groups (`jsonb_each_text`) at this scale in milliseconds, and avoids an EAV table with 40,000 rows and a join for every filter. All faceted attributes are **enumerated vocabularies** (strings with a defined order such as "8 GB", "12 GB", "16 GB"), so counting and ordering are trivial and numeric ranges are not needed.

**Backward compatibility.** `variants.label` and `products.option_name` stay and become derived display strings (the cart already shows "Title (Black)"). A migration fills `selections` for existing variants from `option_name`/`label`; `specs` stays as the fallback for products without a type.

**What deliberately stays flat:** one price per variant remains the *first-party offer* (see 6). We do not remove `variants.price_cents` or `stock`.

## 5. Variant strategy

- **Dimensions** come from the type's attribute definitions with `role = variation` (ordered). Smartphone: colour, storage, RAM. Laptop: colour, RAM, storage. Shoe: colour, size. T-shirt: colour, size. Mug: colour. A type can have 0-3 dimensions.
- **A variant exists only for valid combinations.** The generator emits only combinations that make commercial sense (for example 8 GB RAM pairs with 128 and 256 GB; 12 GB with 256 GB to 1 TB), each with its own **SKU**, price (storage and RAM add to the base), stock and image set.
- **Resolution is a pure function**, `resolveVariant(variants, selections) -> variant | null`, plus `optionStates(variants, selections)` giving, for every value of every dimension, whether it is selectable now (a combination exists), and whether it is in stock. This is the heart of the feature and is **unit-tested without a database**. It lives in a pure file exported by `catalog` so the client can use it without pulling in the database layer.
- **Selecting a combination updates:** SKU (shown quietly), price (and was-price), availability and stock message, gallery images (variant images; colour maps to an illustration tone so the picture actually changes), and the delivery estimate (from the chosen offer, see 6). The selection is in the URL (`?sku=...`) so a configuration is shareable and survives refresh and server rendering.
- **When the user picks an unavailable combination:** the picker never offers a dead end; choosing a value that has no valid combination with the current selection moves the other dimensions to the nearest valid variant (same rule Amazon uses).
- **Cart and order store the resolved variant id and a snapshot** (SKU, label such as "Black, 256 GB, 8 GB", seller). Cart already keys on `variant_id`; the change is to carry the extra snapshot fields through.

## 6. Offer strategy (lightweight, additive)

**Smallest design that is honest:** every variant has an implicit **first-party offer** (the variant row itself: "Sold by Cartly, fulfilled by Cartly"). The new `offers` table holds only **additional** seller offers (about 10 to 15 percent of variants, roughly 400 to 600 offers, 6 to 10 invented sellers). This avoids rewriting every cart, checkout and test that reads `variants.price_cents` and `stock`.

- **Buy box rule (one sentence, documented):** the in-stock offer with the lowest *landed* price (price + shipping); ties go to the first-party offer.
- **PDP:** "Sold by X, fulfilled by Y" under the price, an estimated delivery that depends on the offer, and a quiet "N other sellers from $..." that opens a list where each offer has its own **Add to cart**.
- **Cart:** a line stores `offer_id` (null means first-party). The same variant from two sellers is two lines. Price and stock are re-read from the offer at checkout; a vanished offer is a normal `OUT_OF_STOCK`.
- **Checkout:** stock decrement is per offer (or per variant for first-party). Seller-fulfilled lines carry their own `shipping_cents`; first-party keeps the free-over-threshold rule. The order snapshots seller and fulfilment.
- **Delivery:** first-party keeps the demo timeline. A seller offer adds `handling_minutes` to the estimate, and the order's estimate is the latest of its lines. Order status stays one lifecycle per order (no per-line shipments): a stated simplification.
- **Not built:** seller pages, seller ratings, seller dashboards, offer editing, returns by seller.

## 7. Review strategy

- **Module `reviews`** owning `reviews` and `review_votes`. It depends on nothing; the app layer orchestrates (docs/modules.md rule 3), exactly like sign-in plus cart merge today.
- **Verified purchase:** the app layer asks `orders` whether the user has a **completed** purchase of any variant of the product (`hasCompletedPurchase(userId, variantIds)`: not cancelled, delivered by the lifecycle), then passes `verified` to `reviews.submit`. One review per user per product (unique constraint). Server-side authorisation only; the UI hides the form when ineligible and says why.
- **Demo consequence to decide (section 15):** delivered takes 2 hours on the compressed timeline, so a reviewer would have to wait. Options: (a) eligible once **shipped** (5 minutes), stated openly as a demo rule; (b) pre-seed a demo account with an order history of delivered orders. Recommendation: (b), with (a) as the fallback.
- **Aggregates:** products keep `rating_tenths`, `rating_count` and a new `rating_histogram` so search can sort and filter by rating. They are updated **in the same transaction** as the review insert (incremental, never recomputed from scratch, so seeded baselines survive). Seeded reviews are marked synthetic with invented reviewer names and are consistent with the histogram.
- **Volume:** about 1,500 to 2,500 seeded reviews generated from per-sentiment templates per type (roughly 0 to 6 per product, concentrated on popular products). The displayed count stays "ratings" (seed baseline plus real), reviews listed are the real rows.
- **UI:** histogram, most helpful and most recent reviews, "Verified purchase" mark, "Helpful" vote (signed-in, once per review), a review form for eligible users. Nothing else.

## 8. Category-specific attribute strategy

- **Type-driven, data-driven.** Each product type has its own attribute definitions; the PDP "Technical details" table, the facets and the generator all read the same definitions. Adding a type is adding data, not code.
- **Examples the model must express (all enumerated):**
  - Smartphone: RAM, storage, storage type, processor, processor generation, CPU speed, GPU, display size, refresh rate, battery, material, colour. Variation: colour, storage, RAM.
  - Laptop: RAM, storage, storage type, CPU, GPU, display, refresh rate, operating system. Variation: colour, RAM, storage.
  - Furniture (sofa, office chair): material, dimensions, colour, finish, seating capacity. Variation: colour, material.
  - Headphones: driver size, connectivity, battery life, microphone, noise cancellation, colour. Variation: colour.
  - Footwear and apparel: size, colour, material, fit. Variation: size, colour.
- **Hierarchy gives faceting its context:** department (category) -> product type. Attribute facets only make sense inside one type (RAM for phones is meaningless for sofas), exactly like Amazon's department-specific refinements. A type chip or sidebar level is the entry; attribute facets appear when one type is in scope.
- **Existing 35 types are not thrown away:** their spec value lists become attribute definitions (a conversion in the generator), their colour and size lists become variation dimensions.
- **Provenance:** all brands, sellers and products stay invented. The user's example used real brand names (Apple, Samsung, Google) as an illustration of facets; shipping real trademarks in a demo catalogue is a provenance and legal question, so the plan uses invented phone and laptop brands unless told otherwise.

## 9. Search and facet implications

- `catalog.findProducts` gains `typeSlug` and `attributes: { key: string[] }` criteria, and returns `attributeFacets: { key, label, values: [{ value, count }] }[]` for the type in scope, with the same rule as today (a facet ignores its own filter).
- Filtering is `attributes @> ...` per selected value (OR within an attribute, AND across attributes) with a GIN index; counts are one grouped query over `jsonb_each_text` restricted to the facet keys of the type. Measured scale (5,000 products) keeps this in the low milliseconds on real Postgres; PGlite is slower but acceptable.
- Free text also matches attribute values: the generated `search` tsvector adds `attributes::text` at a low weight, so "256 gb titanium phone" works. Ranking rule unchanged and still explainable.
- URL: `t=<type>`, `a.<key>=<value>` (repeatable). Applied-filter chips and the mobile filter sheet render the dynamic groups from the definitions, **no per-attribute UI code**.
- Not built: numeric range sliders, comparison tables, saved filters.

## 10. Cart and checkout implications

- Cart line: add `sku`, `variantLabel` ("Black, 256 GB, 8 GB"), `sellerName`, `fulfilment`, `offerId`. The cart already merges lines by variant; it merges by (variant, offer) after this change.
- Checkout `placeOrder` re-prices from the offer, decrements stock per offer, snapshots the new fields on `order_items`; `NewOrder` gains the delivery offset. The idempotency and transaction structure are unchanged.
- Orders list and detail show the variant label and the seller; the timeline uses the order's own delivery offset.
- Backwards compatible: first-party lines (the large majority) behave exactly as today.

## 11. UI implications (within D20)

Nothing here needs new visual language.

- **PDP:** one block of option groups (a label with the chosen value, then text pills; unavailable values struck through, selected value outlined black), the same black "Add to cart", gallery that follows the variant, a quiet SKU line, "Sold by X, fulfilled by Y", delivery estimate. "Other sellers" is a plain list with hairlines, not cards. Technical details already exist as a table; they become type-specific.
- **Reviews:** a histogram of thin black bars on neutral grey, review rows separated by hairlines, a small "Verified purchase" text mark in the foreground colour (no new brand colour).
- **Search:** a type level under Category; attribute groups use the same checkbox rows as Brand today, collapsed after six values.
- No new cards, shadows, gradients, rounded containers or colour. Complexity comes from the data.

## 12. Test strategy (test-first, through the public seams)

| Area | Tests |
|---|---|
| Variant resolution (pure) | resolves a full selection; returns the nearest valid variant when a pick has no valid combination; option states mark impossible and out-of-stock values; every dimension value used by a variant exists in its definition |
| Generator invariants | unique SKUs; every variant's selections valid against the type's variation dimensions; no duplicate combination; every product has all spec attributes defined for its type; variant counts per type in range; deterministic |
| Catalog | `findProducts` with `typeSlug` and `attributes`; attribute facets ignore their own filter; text matches attribute values; stock decrement per offer; buy-box choice (cheapest landed, ties to first-party, skips out-of-stock) |
| Cart / checkout / orders | cart stores variant and offer; same variant from two sellers is two lines; checkout preserves SKU, label, seller, fulfilment; stock per offer; offer vanished at checkout; order delivery estimate from the slowest line |
| Reviews | only a user with a delivered, non-cancelled purchase can submit; one per user per product; a verified flag cannot be forged from the client; aggregate and histogram move in the same transaction; helpful vote once per user |
| E2E (additions) | phone PDP: pick colour and storage, price, image and SKU change; add to cart; cart shows the variant label; checkout; order detail shows it. Search: phones, filter RAM 12 GB, results narrow and chips show. Other seller: add from "other sellers", cart shows seller. Review: seeded demo account reviews a delivered product (or ineligible user is told why) |

All new schema is exercised against real PGlite; migrations also run on the real server at deploy.

## 13. Time estimate per slice (focused hours, including tests and browser checks)

| Slice | Content | Hours | Risk |
|---|---|---|---|
| A. Attribute system | `product_types`, `attribute_defs`, `attributes`/`selections`/`sku` columns, convert the 35 types to definitions, add 8 rich types (smartphones, laptops, tablets, televisions, sofas, office chairs, running shoes, t-shirts), variant combination generator, variant images by colour, bulk seed, generator tests | 5-6 | Medium (data quality) |
| B. Variants on the PDP | pure `resolveVariant` and option states, multi-dimension picker, gallery and price and availability follow, URL state, tests | 3-4 | Medium |
| C. Cart, checkout, orders carry the variant | snapshot fields, labels in cart/checkout/orders, tests | 1.5 | Low |
| D. Structured facets | `typeSlug` and `attributes` in `findProducts`, attribute facets, type navigation, dynamic filter UI, chips, tests | 3-4 | Medium |
| E. Offers (lightweight) | sellers, offers, generator, buy box, PDP seller line and "other sellers", cart and checkout per offer, delivery offset, tests | 4-5 | Medium-high (touches checkout and stock) |
| F. Reviews | `reviews` module, eligibility, aggregates and histogram, seeded reviews, PDP reviews section and form, helpful vote, tests | 4-5 | Medium |
| G. Deploy gate | Neon + Vercel, 15-point gate on the public URL, re-measured latency | 2-3 | Medium |
| H. QA and Impeccable on the new UI, docs, perf evidence | | 2-3 | Low |

Total if everything is done: about **25-31 hours**. The core of the thesis (A to D) is about **13-16 hours**.

## 14. What to cut if time becomes constrained (in this order)

1. Helpful votes, then the review form (keep seeded reviews and the histogram).
2. Seller-fulfilled delivery offset (all offers use the first-party estimate).
3. The "other sellers" list (keep the buy-box seller line only).
4. Tablets, televisions, office chairs (keep phones, laptops, sofas, running shoes, t-shirts).
5. Type-specific attribute facets beyond the top four per type.
6. Per-variant image overrides (keep one image set per colour).
7. **Never cut:** A (attribute system), B (variant resolution on the PDP), C (cart and order identity), D (structured facets). These four are the difference between "an Amazon clone" and "a polished store".

## 15. Recommended final scope before deployment

**Build, in this order, then deploy and run the gate:**

1. **A + B + C** (variants, attributes, cart and order identity): about 10 to 12 hours. This delivers the Product -> Variations -> Variant story end to end.
2. **D** (structured facets and type navigation): about 3 to 4 hours. This delivers "search understands structured attributes".
3. **E-lite** (offers: first-party plus additional seller offers, buy box, seller line, other-sellers list, per-offer cart and checkout, delivery estimate from the offer, no per-line shipments): about 3 to 4 hours. This delivers Offer and Fulfilment at honest, bounded depth.
4. **F-lite** (reviews: seeded reviews with histogram and verified mark displayed, eligibility-checked review submission, aggregate in the same transaction; no helpful votes unless time remains): about 3 hours.
5. **Deploy + gate + QA** (G, H): about 4 to 5 hours.

That totals roughly **23-28 hours** if nothing is cut; the cut order in section 14 brings it to about **16-18 hours** for a defensible submission (A to D plus deployment and QA).

**Target catalogue shape (bounded, evidence-based):** about **2,400 products, 8 departments, about 43 product types (35 existing + 8 rich), about 100 invented brands, about 7,000-9,000 variants with up to 3 variation dimensions on the rich types, about 400-600 offers, about 6-10 invented sellers, about 1,500-2,500 seeded reviews.** The brief's upper figures (5,000 products, 10,000+ variants, 15-25 categories, 50+ types) are reachable by the generator but not worth the authoring and QA time; the relationships matter, not the counts. Seed time and database size stay small (the 3,110-variant catalogue seeds in 1.3 s and 11 MB; 9,000 variants is roughly 3 to 4 s and 20 MB).

**Decisions I need from you before starting:**

1. **Offer model:** additive (implicit first-party offer plus extra seller offers; recommended, much smaller blast radius) versus uniform (every variant has offers and `variants.price` and `stock` are removed; cleaner, 2 to 3 extra hours and every existing test touched).
2. **Review eligibility in a demo:** pre-seeded demo account with delivered orders (recommended), or eligible from "shipped".
3. **Brand names:** keep all brands invented (recommended) or use real trademarks for the electronics examples.
4. **Deployment timing:** the database and hosting choice is independent of this plan (migrations apply on every deploy), so deploying the current build early to prove the pipeline would not conflict. You asked to stop before deployment, so I am not doing it; say when.

**Not part of this plan:** Seller Central, seller dashboards or pages, millions of rows, queues, Redis, Elasticsearch, microservices, recommendation models, production payments, per-line shipments, returns, wishlists, dark mode.
