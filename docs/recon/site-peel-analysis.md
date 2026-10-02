# Site Peel analysis (recon-v2)

Tags: **OBSERVED** (visible in the supplied DOM/CSS), **PARTIAL** (some evidence), **NOT OBSERVED** (no evidence; nothing is filled from general knowledge). All captures are desktop; there is no mobile evidence. Product copy (titles, prices) is Amazon/third-party content and is cited only to describe structure.

Read `site-peel-inventory.md` first: two of the five captures are not what was expected (the PDP is in an unshippable state, the checkout is an early "kyc" step, the sign-in is step 1).

## 1. PDP (simple product: Echo Spot)

State captured: **the item cannot be shipped to the selected delivery location.** Purchase region is therefore degraded.

| Region | Status | Evidence |
|---|---|---|
| Global header (logo, deliver-to, department select + search, language, account, returns & orders, cart) | OBSERVED | Same shell as `recon/` home; sub-nav and footer present |
| Navigation / sub-nav | OBSERVED | Present; the sticky in-page jump links "Buying options / Compare / Videos / Reviews" exist as skip-links |
| Breadcrumbs | **NOT OBSERVED** | No breadcrumb element in the DOM |
| Gallery | OBSERVED | Left column: vertical thumbnail strip (about 7 thumbs at 40x60, plus a video/360 tile), large main image (938x1500 source) with "Click to see full view" zoom, share/list controls |
| Title | OBSERVED | `h1` with the product title (very long, brand + model + feature list), 24 px / 32 px |
| Byline | OBSERVED | "Visit the ... Store" link under the title |
| Rating | OBSERVED | Inline: 4.5 star glyph, "4.5 out of 5 stars", count "(46,047)" as a link to reviews |
| Review count | OBSERVED | As above |
| Social proof ("bought in past month") | PARTIAL | Container present; empty on this page. Present on result cards in the search capture |
| Price | **NOT OBSERVED** | Price containers exist but are empty (`corePrice`, `apex_price_refresh`); an error slot (`price-block-error-message`) exists |
| Discount / deal treatment | **NOT OBSERVED** | `dealBadge` container empty |
| Availability | OBSERVED (one state) | "This item cannot be shipped to your selected delivery location. Please choose a different delivery location." No in-stock / low-stock / out-of-stock states |
| Delivery information | PARTIAL | Only the "Deliver to <name> - <city> <zip>" ingress link (opens a location chooser) and the unshippable message; no delivery date |
| Variants | OBSERVED | Inline selector rows for Color (swatch images, current value shown in the row title) and Size; "Make a Color selection" prompt; per-swatch availability slot |
| Quantity | **NOT OBSERVED** | No quantity control in the DOM |
| Purchase CTA (Add to cart) | **NOT OBSERVED** | Absent (buy box replaced by the unshippable message) |
| Buy Now | **NOT OBSERVED** | Absent |
| Secondary actions | PARTIAL | "Add to List" (wish list) with its in-page success/error messages; an "Add to Auto Buy" label exists in the DOM; share tile in the gallery block |
| Seller information ("Ships from / Sold by") | **NOT OBSERVED** | Containers empty |
| Supporting information | OBSERVED | "About this item" (8 bullets), A+ marketing sections ("Meet Echo Spot", "Go beyond the clock"...; wide banners up to 5856x900), "Compare Echo Devices", "Technical Details", sustainability section, "Customers also bought these items from Amazon Devices" carousel (cards with image, title, rating + count, "N offers from $X" price line), a Q&A search box ("Search this page"), 13 customer review blocks with a rating summary |
| Assistant chat panel | OBSERVED | Dockable Alexa chat panel and suggested-question chips; out of scope |
| Footer | OBSERVED | Standard footer |

**Layout (desktop), from CSS:** three floated columns: left column (gallery) and a right column (buy box) fixed at 244 px wide with a 20 px left margin; the centre column takes the remaining width (`margin-right: 300px` leaves room for the buy box). A two-column variant sets the left column to 50% width and moves the buy box out of flow (`position: fixed; left: 100vw`). The header enforces `min-width: 1000px` (the PDP is the only capture carrying that rule). **Responsive:** no mobile DOM; only CSS media queries (see `design-evidence.md`).

**Hierarchy observed:** title (24/32) is the heaviest text; rating row is small (12 to 14 px) and inline with the title block; sections below the fold are separated by rules and large A+ imagery; the page is dense, with about 40 `feature_div` slots (most empty in this state).

## 2. Search results

Query results page; 1 to 16 of "over 100,000" results shown; 20 result cards in the DOM.

| Item | Status | Evidence |
|---|---|---|
| Search input behaviour | PARTIAL | Header form with department select ("All Departments" selected) and a text input holding the query; autosuggest panel not captured (closed) |
| Result count | OBSERVED | Info bar: "1-16 of over 100,000 results for "<query>"" (an `h1`, plus an `h2`) |
| Product card structure | OBSERVED | Card = image (about 218 px tall), title (`h2` link, long), rating row (stars + abbreviated count like "(46K)"), "N+ bought in past month", price block, delivery text, action button, optional badge, optional colour swatches, optional "Sponsored" label |
| Product image | OBSERVED | Single image per card |
| Title / rating / review count | OBSERVED | Title clamp is multi-line; rating gives "4.5 out of 5 stars" text; count abbreviated (K) |
| Price | PARTIAL | Only 2 of the 6 sampled cards show a price (price + struck-through list price); the rest show **no price** and a **"See options"** button (consistent with the unshippable state) |
| Discount | PARTIAL | List price strike-through only; no percentage badge observed in the sampled cards |
| Delivery information | PARTIAL | One card shows "Delivery <weekday, date>" and "Ships to <country>"; others none |
| Badges | OBSERVED (one) | A text badge ("Overall Pick") on one card; 4 badge nodes in the page |
| Sponsored | OBSERVED | 16 "Sponsored" label nodes; at least 3 of the first 6 results are sponsored |
| Add to cart on card | OBSERVED | "Add to cart" on cards that are shippable; "See options" otherwise |
| Filters (sidebar) | OBSERVED | "No selected filters"; Popular Shopping Ideas; Customer Reviews ("4 Stars & Up"); Price (min-max slider, "$0 - $44+", and 5 ranges); Deals & Discounts (All Discounts, Buy More Save More, Coupons, Today's Deals); Color; Brands (about 40 checkbox labels with "See more"); Condition; Seller; category facet; Product Material (long checkbox list); Top Brands; Grade |
| Sorting | OBSERVED | "Sort by:" select with 6 options: Featured, Price: Low to High, Price: High to Low, Avg. Customer Review, Newest Arrivals, Best Sellers |
| Pagination | **PARTIAL** | No numbered pagination in the DOM; two "More results" controls (a load-more pattern) |
| Sidebar / drawer behaviour | NOT OBSERVED | Desktop sidebar only; no mobile filter drawer |
| Empty / error states | **NOT OBSERVED** | None |
| Other | OBSERVED | In-grid carousel widgets (2), "Compare" affordance on cards, a "Results" heading, 33 `h2`s (each card title is an `h2`) |

## 3. Cart

| Item | Status | Evidence |
|---|---|---|
| Cart header | OBSERVED | `h1` area includes "All Carts" selector and a "Shopping Cart" heading, "Your Items" |
| Item structure | OBSERVED | Row: image (180x180), title (long, links in a new tab), price with per-unit price ("$X ($Y / fluid ounce)"), optional coupon ("Clip Coupon, Save $2.99"), "Subscribe & Save - 5% off", best-seller badge, "In Stock", gift checkbox ("This is a gift"), selected size text, quantity control ("Qty:" with an "Update" action), "Share", "Move to cart" |
| Image / title / price | OBSERVED | As above |
| Quantity | OBSERVED | Control with live status text ("Quantity is 1", "Updating quantity") and Update action; a stepper class exists in CSS |
| Remove | PARTIAL | Delete action class present (`sc-action-delete-active`); visible label not recovered |
| Save for later / undo | PARTIAL | Action classes (`sc-action-save-for-later`, `move-to-cart`) and message templates are in the DOM: "<item> was removed from Shopping Cart", "has been moved to Saved for Later", "has been moved to Shopping Cart", "has been moved to Wishlist". No saved-items list rendered in this state; no explicit "Undo" button observed |
| Subtotal | OBSERVED | Right-hand buy box: "Subtotal (N items): $X", "This order contains a gift" checkbox, **Proceed to checkout** button, "Check out Amazon Cart" |
| Checkout CTA | OBSERVED | "Proceed to checkout" |
| Recommendations | OBSERVED | "Your recently viewed items" carousel (cards with prices) and "International Top Sellers for you" carousel |
| Delivery messaging | PARTIAL | A heading with Prime trial text ("Fast, FREE delivery on eligible items with a 30-day trial...") only; no per-item delivery estimate; no free-shipping progress bar |
| Shipping / tax in cart | NOT OBSERVED | Not shown; subtotal only |
| Empty cart | **NOT OBSERVED** | |

## 4. Checkout ("kyc" step, not the review)

| Item | Status | Evidence |
|---|---|---|
| Checkout shell | OBSERVED | Reduced header: logo, "Secure checkout" `h1`, cart link, account menu; **no search bar**; footer with legal text |
| Step structure | OBSERVED | Stacked sections with `h2`s: "Select a delivery address", "Add ID for customs clearance", "Payment method", "Review items and shipping" |
| Address section | PARTIAL | Shows the saved address ("Delivering to <name>" plus a `Change` link). Add/edit form not observed |
| Customs-ID panel | OBSERVED | Locale-specific panel: explanatory copy, a document-type select (4 options), "Skip for now" and "Continue". **Specific to the shipping destination in this capture; not a core flow for us** |
| Delivery section | **NOT OBSERVED** | "Review items and shipping" is a `Loading delivery information...` placeholder |
| Payment section | **NOT OBSERVED** | `Loading your payment information...` placeholder |
| Order summary | PARTIAL | Right panel: "Items (4): --", "Shipping & handling: --", "Estimated tax to be collected: --", "Import Charges: --", "Order total: $X", with a **Continue** button. Row labels observed; most values placeholders |
| Item summary | NOT OBSERVED | |
| CTA | PARTIAL | The primary button reads **Continue** at this step. "Place your order" appears only in legal copy ("When you click the Place your order button..."), so the final CTA is NOT OBSERVED as a control |
| Editing / navigation | PARTIAL | `Change` link on the address, "Skip for now", a "Back to cart" link, "Why has sales tax been applied?" link, "Do you need help?" |
| Validation / error states | NOT OBSERVED | Skeleton "Loading ..." states are the only loading evidence |
| Legal block | OBSERVED | Order acknowledgement text, tax notice, 30-day return summary, links |

## 5. Sign-in (step 1, not step 2)

| Item | Status | Evidence |
|---|---|---|
| Form structure | OBSERVED | Single identifier form: `h1` "Sign in or create account", input (aria label "Enter mobile number or email"), country calling-code select (about 230 entries), submit "Continue" |
| Password field | PARTIAL | A password input exists in the DOM but is hidden (used for passkey/autofill); the password step is NOT OBSERVED |
| Visibility (show password) control | **NOT OBSERVED** | |
| Submit CTA | OBSERVED | "Continue" (yellow rounded button via the AUI submit sprite SVGs) |
| Error state | PARTIAL | Five hidden inline alert templates (red-bordered box with icon): "Enter your mobile number or email", "Invalid mobile number", "Invalid email address", "Something's not right. Try again.", and a longer "There was a problem" passkey message. **No wrong-password error** |
| Error copy structure | OBSERVED | One short sentence per case, inline above/under the field; passkey message has a bold title line plus a sentence |
| Help links | OBSERVED | "Need help?", "Create a free business account", footer: Conditions of Use, Privacy Notice, Help |
| Account navigation | OBSERVED (absent) | No global header or footer: a minimal shell |
| Validation behaviour | PARTIAL | Client-side templates for empty / invalid mobile / invalid email; a clear-text button on the input |

---

## 6. Product decisions raised by this evidence

Format: Observed evidence, Problem/opportunity, Decision, Reason, Tradeoff, Validation. These are **proposals**; they extend D1 to D19 in `docs/product-decisions.md` and are not yet recorded there.

**S1. Header structure.** *Evidence*: dense header: deliver-to, department select + search, language, account & lists, returns & orders, cart; a 60 px dark bar and a scrolling sub-nav of about 30 links; the checkout uses a reduced header (logo, "Secure checkout", cart, no search) and sign-in uses none. *Problem*: the full header is noisy during the purchase and impossible below 1000 px. *Decision*: one responsive header with logo, search (with department), account, cart, plus a distinct reduced header for checkout and auth; the long sub-nav becomes a short, scrolling category row. *Reason*: preserves recognisable parts while removing distraction at the highest-risk steps (this reduced-header pattern is already Amazon's own). *Tradeoff*: fewer entry links in the shell. *Validation*: tier-1 E2E unchanged; keyboard and 360 px pass.

**S2. Search structure.** *Evidence*: department select + input; results page with count, sort select, sidebar facets, load-more (not numbered pages), sponsored cards mixed into the first rows. *Problem*: sponsored interleaving and very long facet lists reduce clarity. *Decision*: keep the department + input header; results show count, sort, a short facet set (price, rating, category, availability), and **numbered pagination** (URL state, testable) instead of load-more; **no sponsored placements**. *Reason*: shareable, testable URLs; honest ranking. *Tradeoff*: no infinite scroll. *Validation*: `search` seam tests (param round trip); E2E search to product.

**S3. Product card hierarchy.** *Evidence*: image, multi-line title, stars + abbreviated count, "N+ bought" social proof, price + struck list price, delivery line, action button; many cards in this state have no price and "See options". *Problem*: cards without price break scanning. *Decision*: card order: image, title (2 lines), rating, price (with list price), delivery cue; an explicit "Out of stock" state instead of "See options"; no social-proof counts (we have no real purchase data). *Reason*: price is the main scanning cue; avoid invented claims (D10). *Tradeoff*: less urgency. *Validation*: critique of a results screenshot; unit test of price formatting.

**S4. PDP purchase panel.** *Evidence*: three columns (gallery, content, 244 px buy box); in the unshippable state the buy box becomes a message and a location link. *Problem*: a dead-end message with no next step. *Decision*: keep the three-column desktop layout; buy box states: in stock, low stock, out of stock, **not available to your location** (with a clear action to change location and, if relevant, notify me). *Reason*: the evidence proves this state exists and Amazon handles it poorly (no price, no action). *Tradeoff*: location logic is out of tracer scope. *Validation*: PDP state tests via `catalog.getAvailability`; manual state review.

**S5. Cart layout.** *Evidence*: item rows with image, title, price, unit price, quantity + Update, Share, Move to cart; the subtotal and Proceed to checkout sit in a right-hand panel; undo messages exist for removal/save. *Problem*: the Update button adds a step; actions are many and low priority. *Decision*: keep the two-column layout and the right-hand subtotal; quantity updates immediately (already so in the tracer); remove, undo and (P1) save for later; drop Share and gift/coupon/Subscribe & Save. *Reason*: matches the evidence and removes clutter. *Tradeoff*: fewer merchandising hooks. *Validation*: `cart` seam tests (T16 to T19); cart E2E tier 2.

**S6. Checkout layout.** *Evidence*: stacked sections (address, payment, review items and shipping) with a right-hand order summary and a **Continue** button; a reduced header; the review step is not captured. *Problem*: not enough evidence for the final review/place-order. *Decision*: keep our single page with the same three sections and a right-hand summary; **do not copy** the customs-ID panel; mark the review step `UNKNOWN` until captured. *Reason*: sections and summary placement are evidenced; the rest is not. *Tradeoff*: possible later rework. *Validation*: request the real review capture (still missing).

**S7. Authentication experience.** *Evidence*: identifier-first with a country-code select, one combined sign-in/create form, passkey autofill, inline per-case error alerts, no header/footer. *Problem*: a country-code list for an email-first demo adds noise; the password step and its error state are missing. *Decision*: identifier-first single form ("Sign in or create account"), email only (no phone), inline error alerts for empty/invalid, password step designed by us, minimal shell. *Reason*: preserves the recognisable flow while dropping mobile-number handling. *Tradeoff*: no passkeys. *Validation*: `auth` seam tests; E2E sign-in.

## 7. Differentiation opportunities (not ranked)

1. **Sponsored-free results.** *Observed*: about 16 sponsored labels, several in the first rows. *Opportunity*: clean, trustworthy ranking. *Direction*: no ad slots; a visible "How results are ordered" note. *Validation*: critique of results hierarchy; reviewer comprehension.
2. **Dead-end unavailable states.** *Observed*: unshippable PDP shows no price and no next action; cards show "See options" with no price. *Opportunity*: explain and offer a way forward. *Direction*: explicit availability states with reasons and actions. *Validation*: state matrix tests and manual review.
3. **Numbered, URL-driven pagination and filters.** *Observed*: load-more, no page numbers, 40-item brand lists. *Opportunity*: predictable, shareable results. *Direction*: pagination in the URL, applied-filter chips, short facets with "more". *Validation*: back-button test; `search` seam.
4. **Cart without upsell clutter.** *Observed*: Prime trial banner, coupons, Subscribe & Save, gift flags, two carousels in the cart. *Opportunity*: faster path to checkout. *Direction*: line items, subtotal, one recommendation row after the CTA. *Validation*: click-count comparison; tier-1 E2E.
5. **Price transparency before checkout.** *Observed*: the cart shows subtotal only; checkout summary rows shipping/tax/import show `--` until later. *Opportunity*: no surprises. *Direction*: show an estimated shipping and tax line in the cart (from `checkout.quoteCart`). *Validation*: quote tests; user comprehension.
6. **One-page auth that preserves the cart.** *Observed*: sign-in is a separate shell with a country list. *Opportunity*: reassure and return the user to where they were. *Direction*: `returnTo` back to the cart/checkout with the cart intact. *Validation*: E2E guest-to-signed-in.
7. **Accessible product cards.** *Observed*: card titles are `h2`s (33 `h2`s on the page); star ratings read "4.5 out of 5 stars". *Opportunity*: cleaner structure. *Direction*: one link per card, rating as a single labelled element. *Validation*: axe and keyboard pass.
8. **Reduced-motion, instant quantity.** *Observed*: "Updating quantity" status with an Update button. *Opportunity*: fewer steps. *Direction*: auto-update with polite live-region text (already in the tracer). *Validation*: assistive-tech check.
9. **Plain-language checkout copy.** *Observed*: legal blocks and locale-specific panels. *Opportunity*: calmer confirmation. *Direction*: short summary of what happens when you click Place order (demo payment stated plainly). *Validation*: copy review in critique.
