# Catalogue schema proposal

Status: **proposal, not implemented.** Specifies the fields and relationships the experience needs so the 40 to 60 hand-authored products (`docs/catalogue-decision.md`) can be seeded once, without reshaping later. The two existing seed products stay until the Home/Search slices start. The module boundary does not change: `catalog` owns these tables; `search` reads through `catalog`'s interface (`docs/modules.md`).

## What each experience needs

| Experience | Needs from the catalogue |
|---|---|
| Home rails | Ordered collections (Featured, Deals, New arrivals, per-category), card fields below |
| Search | Searchable text (title, brand, category, tags, description); stable ids/slugs |
| Filters | Category, brand, price (derived min/max), rating, availability, "on sale" flag |
| Sorting | Featured rank, price low/high, rating, newest, (best sellers = editorial rank) |
| Product card | Primary image, title, rating average + count, display price, list price (if on sale), availability state, one badge |
| Product detail | Image set, brand, title, bullets ("About this item"), specs, description, option groups, variant price/stock/images, availability reason |
| Variants | Option definitions (Color, Size...) with values and swatches; one SKU per combination |
| Ratings | Average + count on the product (denormalised for cards); review rows are P2 |
| Badges | Derived (Deal, Low stock, New) plus one editorial badge |
| Availability | State, quantity, reason |

## Entities and fields

Money is integer cents. Ids are text; slugs are unique. Every row is our own data (no Amazon identifiers).

| Entity | Fields | Notes |
|---|---|---|
| **Category** | `id`, `slug`, `name`, `parentId?`, `position`, `iconKey?`, `imageUrl?` | Two levels at most; icon key for the category strip; 6 to 8 top-level categories |
| **Product** | `id`, `slug`, `title`, `brand`, `description`, `categoryId`, `bullets[]`, `specs` (key/value list), `ratingAvg` (0 to 5, one decimal), `ratingCount`, `featuredRank?`, `badge?` (`bestseller` / `new` / `featured`), `status` (`active` / `draft`), `createdAt`, `tags[]` | Existing columns: `id`, `slug`, `title`, `brand`, `description`, `images` |
| **ProductImage** | `id`, `productId`, `variantId?`, `url`, `alt`, `position`, `width`, `height`, **`source`**, **`licence`** | Replaces the `images` JSON; licence and source are required (catalogue decision) |
| **Option** | `id`, `productId`, `name` (Color / Size / Style), `position`, `kind` (`swatch` / `text`) | Only for products with variants |
| **OptionValue** | `id`, `optionId`, `value`, `swatchHex?`, `imageId?`, `position` | |
| **Variant** | `id`, `productId`, `sku`, `priceCents`, `listPriceCents?`, `stock`, `isDefault`, `status` (`active` / `discontinued`) | Existing: `id`, `productId`, `label`, `priceCents`, `listPriceCents`, `stock`; `label` becomes derived from option values |
| **VariantOptionValue** | `variantId`, `optionValueId` | Join; one value per option per variant |
| **Collection** | `id`, `slug`, `title`, `kind` (`featured` / `deals` / `new` / `custom`) | Drives home rails |
| **CollectionItem** | `collectionId`, `productId`, `position` | |
| **Review** (P2) | `id`, `productId`, `rating`, `title`, `body`, `createdAt`, `authorLabel` | Not in P0 |

## Derived values (not stored)

- **Display price** = min variant price; **list price** = the matching variant's list price when greater; **price range** when variants differ.
- **On sale** = any active variant with `listPriceCents` greater than `priceCents`; **discount %** computed with integers.
- **Availability** (`catalog.getAvailability` returns a state): `in_stock`, `low_stock` (stock 1 to 5), `out_of_stock` (all variants 0), `unavailable` (draft/discontinued), plus an optional `reason` string. Quantity stays an integer.
- **Badges**: `Deal` (on sale), `Low stock` (low), `New` (created in the last 30 days), plus the editorial `badge`.
- **Facets** for `search`: category, brand, price ranges (computed buckets), rating threshold (4+ and up), availability (in stock only), on sale.
- **Search text**: title + brand + category name + tags + description; Postgres full-text (or a simple `LIKE`) behind `search.searchProducts`.

## Relationships

`Category 1-n Product`; `Product 1-n Variant`; `Product 1-n Option 1-n OptionValue`; `Variant n-n OptionValue` (via `VariantOptionValue`); `Product 1-n ProductImage` (optionally scoped to a `Variant`); `Collection n-n Product` (via `CollectionItem`); `Product 1-n Review` (P2). Cart and order tables keep a plain `variantId` text (no cross-module foreign keys), as today.

## Target seed shape (when approved, not now)

40 to 60 products; 6 to 8 categories; 8 to 12 brands; about a quarter with options (Color and/or Size); about 10 on sale; 3 out of stock; 4 low stock; 1 draft (to test visibility); ratings between 3.6 and 4.9 with counts from a dozen to a few thousand. **Ratings and counts are demo values and must be presented as demo data** (no fabricated review text). Prices spread across at least four price bands so filters and sorting are meaningful; a few near-duplicate titles and shared brand names so ranking tests are real. Every image has `source` and `licence`.

## Migration approach (additive)

Existing `products` and `variants` rows stay valid: add columns (`categoryId`, `bullets`, `specs`, `ratingAvg`, `ratingCount`, `featuredRank`, `badge`, `status`, `createdAt`, `tags`) with defaults, then new tables. Tests T1 to T22 must keep passing unchanged; new behaviour (list, search, collections, availability states) is test-first in its own slices. The tracer fixtures (`Test Kettle`, `Test Mug`) remain test-support only.

## Remaining decisions (user)

1. Final category list and brand names (invented brands only; no real trademarks).
2. Image source per the catalogue decision (own illustrations, openly licensed photos, or provided photos) and who supplies them.
3. Variant modelling depth: option tables as above (recommended) or a simple label per variant (faster, less capable).
4. Ratings: synthetic demo values (recommended, clearly labelled) or none.
5. Search implementation: simple matching first behind the `search` interface, Postgres full-text later (recommended).
6. Whether "best sellers" is an editorial rank or omitted.
