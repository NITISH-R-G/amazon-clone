# Site Peel inventory (recon-v2)

Inspection date: 2026-10-02. Method: scripted file walk with content hashing, DOM inspection with cheerio, targeted CSS extraction. `recon-v2/` was not modified. Sensitive values are never reproduced here (see the privacy table).

## What is actually present

543 files, 48.8 MB, five saved pages (Chrome "save complete page" format, desktop viewport, **eight-nine of the same account's logged-in session** except sign-in):

| Saved page | Route (sanitised) | Expected category | What it really is | Files in `_files/` |
|---|---|---|---|---|
| `Amazon Echo Spot (2024 release).html` | `/<slug>/dp/<ASIN>/` (arrived via a search result, query keys `keywords`, `qid`, `sr`, `crid`) | PDP, simple product | A real PDP, **but in the "cannot be shipped to your selected delivery location" state**: no price, no quantity, no Add to cart, no Buy Now | 235 |
| `Amazon.com _ home and kitchen.html` | `/s?k=<query>` (keys `k`, `crid`, `sprefix`, `ref`) | Search results | A real **search results page** for one keyword (20 result cards, sort bar, refinements, result count). Not a filtered state | 88 |
| `Amazon.com Shopping Cart.html` | `/gp/cart/view.html` | Cart with 2 to 3 items | A real cart with **4 items**, subtotal box, recommendation carousels | 104 |
| `Place Your Order - Amazon Checkout.html` | `/checkout/p/<pipeline-id>/kyc` (keys `pipelineType`, `cartItemCount`, `referrer`) | Checkout review | **Not a review page.** An early checkout step ("kyc") showing the delivery-address section plus an "Add ID for customs clearance" panel; the payment and "Review items and shipping" sections are still `Loading...` placeholders and the order summary shows `--` | 90 |
| `Sign in.html` | `/ap/signin?openid...` | Sign-in step 2 with wrong-password state | **Step 1 (identifier) again.** The password input exists but is hidden; five inline error alert templates for the identifier step are present in the DOM; no password-step error state | 21 |

So of the five required captures: **cart and search are usable, the PDP is usable only for its non-purchase regions, checkout and sign-in step 2 are NOT captured.**

## Counts by type

| Type | Files | Notes |
|---|---|---|
| HTML | 10 | 5 pages + 5 ad/helper iframes (`iu3.html`, `iu3(1).html`, `saved_resource.html`) |
| CSS | 129 | Amazon AUI/page bundles (often several per file name) |
| JavaScript | 227 | All saved as `*.download`; Amazon runtime, not reusable |
| JPG | 91 | Product, promo, thumbnail imagery |
| PNG | 46 | Sprites, A+ content images, icons; 4 files have unreadable headers (reported dimensions are bogus) |
| SVG | 20 | 14 on the PDP; 3 recurring UI SVGs (`down-arrow`, `submit-button-*`) plus a handful of small icons (`insight_tick`, `alexa-a-symbol`, `rio_right_arrow_white`, others) |
| GIF | 8 | 1x1 beacons and a 64x64 spinner |
| Extensionless | 12 | Pixel/beacon files |
| Fonts | **0** | None captured (Amazon Ember is referenced remotely) |
| JSON / screenshots | **0 / 0** | No screenshots were supplied; DOM + CSS only |
| Duplicates | 53 groups, 156 files, 13.7 MB redundant | 29 images are byte-identical to files already in `recon/` (nav sprite, spinner, down-arrow, etc.) |

## Per-folder summary

| Folder | JS | CSS | Images | Notable |
|---|---|---|---|---|
| Echo Spot PDP | 83 | 45 | 41 jpg + 37 png + 14 svg + 3 gif | 7 gallery thumbnails (40x60), a 938x1500 and a 463x741 gallery image, A+ marketing banners (up to 5856x900), related-product thumbnails (165x165) |
| Search results | 25 | 13 | 38 jpg (20 result images at `UY218`, 5 at `UL320` carousel, 13 small `FM` thumbs) | The result card images are about 218 px tall |
| Cart | 57 | 27 | 12 jpg (item images `AA180`, recommendations `UL165`/`UL200`) | Cart item images are 180x180 |
| Checkout | 46 | 39 | 1 png (nav sprite) + 2 gifs (loading) | No product imagery at all |
| Sign in | 16 | 5 | none | No images |

## Privacy and contamination check

No sensitive value is reproduced. Result per capture and type (FOUND / NOT FOUND):

| Type | PDP | Search | Cart | Checkout | Sign-in |
|---|---|---|---|---|---|
| Customer first/full name | FOUND (header greeting, "Deliver to") | FOUND (header) | FOUND (header) | **FOUND (full name in the delivery section)** | NOT FOUND |
| Street address | NOT FOUND | NOT FOUND | NOT FOUND | **FOUND (full postal address, twice)** | NOT FOUND |
| City / postal code / country | FOUND (delivery location label) | FOUND | FOUND | **FOUND (with state and country)** | NOT FOUND |
| Email address | One address-shaped string, owner unverified | NOT FOUND | One address-shaped string, owner unverified | NOT FOUND | NOT FOUND |
| Phone number | NOT FOUND as such (many long numeric strings, likely IDs; unverified) | same | same | same | NOT FOUND |
| Account (customer) identifier | FOUND (inline config, several) | FOUND | FOUND | FOUND | NOT FOUND |
| Actor ID | NOT FOUND | NOT FOUND | NOT FOUND | NOT FOUND | NOT FOUND |
| CSRF / anti-forgery tokens | FOUND (many) | FOUND (many) | FOUND (many) | FOUND | FOUND |
| Authentication flow secrets (WebAuthn challenge, flow ids in the saved URL) | NOT FOUND | NOT FOUND | NOT FOUND | NOT FOUND | **FOUND** |
| Session / request identifiers | FOUND | FOUND | FOUND | FOUND | FOUND |
| Cookies | NOT FOUND (Site Peel does not save them) | same | same | same | same |
| Checkout-session id | n/a | n/a | n/a | **FOUND (in the saved URL path)** | n/a |
| Order numbers | NOT FOUND | NOT FOUND | NOT FOUND | NOT FOUND (no order was placed) | NOT FOUND |
| Payment card data | NOT FOUND | NOT FOUND | NOT FOUND | NOT FOUND (payment section had not loaded) | NOT FOUND |
| Behavioural/profile data | recently-viewed and recommendation modules | search personalisation unverified | **FOUND (cart contents and recommendations reflect the user's shopping profile; a gift flag is set)** | n/a | n/a |
| Browser-extension contamination | FOUND (clipboard/text-expander/input-tool nodes) | FOUND | FOUND | FOUND | FOUND |

The account is the same one as in `recon/` (the same customer identifier appears in four `recon-v2` files). The checkout capture is the most sensitive file in the project: it holds a complete real postal address and full name. **All of `recon-v2/` is git-ignored and must stay local** (verified: 0 tracked files).

Disclosure: while inspecting, some tool output transiently displayed a name, a city/postal code and a street address from these captures in the working session. Nothing was written to the repo, docs, tests or logs; later output was masked. See `privacy-notes.md` for recapture recommendations (this capture should be redone from a throwaway account with a fake address).
