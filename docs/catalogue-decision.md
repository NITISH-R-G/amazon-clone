# Catalogue decision point

Status: **OPEN. Needs the user before the catalogue expands (Home, Search and Results slices).** Until then the two seeded products stay (`src/db/seed-demo.ts`). We never import Amazon's catalogue, identifiers, descriptions or imagery.

## Questions to decide

| # | Decision | Options | Recommendation |
|---|---|---|---|
| 1 | Product dataset source | (a) hand-authored demo set (ours); (b) generated text from a prompt, reviewed by us; (c) an open dataset with a permissive licence | (a) plus (b) for descriptions: our own wording, no third-party text |
| 2 | Image source and licensing | (a) our own flat illustrations (as now); (b) AI-generated product images; (c) openly licensed photos (CC0 or an equivalent permissive licence, attribution kept); (d) user-supplied photos | (c) or (d) for credibility; (a) acceptable for placeholders. Record the licence per image |
| 3 | Number of products for the demo | 12 (minimum for home rails), 40 to 60 (credible search and filters), 150+ | **40 to 60** across 6 to 8 categories: enough for filters, sort, pagination and empty results |
| 4 | Is generated or placeholder imagery acceptable? | yes / no | Acceptable if consistent and not mistaken for a real brand; photos preferred for the hero and home rails |
| 5 | Search dataset requirements | Titles, brands, categories, descriptions, a spread of prices, ratings, stock states, a few near-duplicates for ranking tests | Include at least: 1 out-of-stock, 1 low-stock, 1 discounted, products sharing a brand, products sharing words across categories |

## Constraints (fixed)

- Our own dataset only. No scraped Amazon product, review, price or customer data; no Amazon identifiers (ASINs) in seed data.
- Every image has a recorded source and licence, or is our own.
- Prices in integer cents; stock as integers; slugs unique; seeding idempotent.
- Catalogue growth changes seed data only: the `catalog` and `search` interfaces do not change.

## Needs from the user

Answers to 1 to 4 (even "your call, use the recommended defaults") before Home and Search work starts.
