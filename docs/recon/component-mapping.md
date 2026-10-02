# Component mapping and route impact (recon-v2)

Maps Site Peel evidence to our architecture. Nothing is implemented. Statuses use the evidence tags from `site-peel-analysis.md`. "Tracer" = what exists in `src/` today.

## Evidence to component to shadcn primitive

| Amazon evidence | Our domain component | shadcn primitive(s) | Tracer status |
|---|---|---|---|
| Header: logo, deliver-to, department select + search, account, returns & orders, cart (OBSERVED) | `SiteHeader` (+ `SearchBar`, `AccountMenu`, `CartLink`) | `input`, `select`, `button`, `dropdown-menu` | `SiteHeader` exists (logo + cart). **New**: `SearchBar`, `AccountMenu` |
| Reduced checkout / auth shell (OBSERVED) | `CheckoutHeader`, minimal `AuthShell` | `button` | **New** (small, layout variants of the shell) |
| Sub-nav category row (OBSERVED) | `CategoryNav` | `button`/links, `scroll` via CSS | **New**, with the Home slice |
| PDP three-column layout (OBSERVED via CSS) | `ProductPage` layout | `card`, `separator` | Exists (REVISE) |
| Gallery: thumb strip + large image + zoom (OBSERVED) | `ProductGallery` | `aspect-ratio` | Exists; add zoom and keyboard navigation |
| Title, byline, rating row (OBSERVED) | `ProductHeading` + `RatingStars` | `badge`? no; plain markup | **New**: `RatingStars` |
| Price block (price + struck list price) (PARTIAL) | `PriceBlock` | none | Exists (KEEP) |
| Variant rows (Color / Size) (OBSERVED) | `VariantPicker` | `radio-group` | **New** (justified: variants are evidenced) |
| Availability states incl. "cannot ship to your location" (OBSERVED, one state) | `AvailabilityMessage` | `alert` | **New**, small; `AddToCartForm` already handles out-of-stock |
| Buy box (qty, Add to cart, Buy now) (NOT OBSERVED in this capture) | `PurchasePanel` | `card`, `button` | `AddToCartForm` exists; **Buy Now** and delivery lines wait for evidence |
| Add to List (PARTIAL) | none | | Defer (P3) |
| About this item, details, A+ sections (OBSERVED) | `ProductDetails` (bullets + specs table) | `accordion`/`table` (late) | **New** (simple; A+ marketing content not reproduced) |
| Reviews + rating summary (OBSERVED) | `ReviewsSummary`, `ReviewList` | `progress`? skip | Defer (P2) |
| "Customers also bought" carousel (OBSERVED) | `ProductRail` + `ProductCard` | CSS scroll-snap, `card` | **New** (shared with Home) |
| Result card: image, title, rating, count, price, delivery, button, badge, swatches (OBSERVED) | `ProductCard` | `card`, `badge`, `button`, `aspect-ratio` | **New** (the tracer index has an inline version) |
| Result count + sort select (OBSERVED) | `ResultsHeader`, `SortControl` | `select` | **New** |
| Filter sidebar: rating, price range, checkbox facets (OBSERVED) | `FilterSidebar` (+ mobile sheet later) | `checkbox`, `radio-group`, `separator`, `sheet` | **New** |
| Load-more (OBSERVED) / numbered pages (our decision) | `ResultsPagination` | `pagination` | **New** |
| Cart row: image, title, price, unit price, qty, actions (OBSERVED) | `CartLine` | `button`, `card` | Exists inline in the cart page; extract if repeated |
| Quantity control (OBSERVED) | `QuantityStepper` | `button`, `input` | Exists (KEEP) |
| Remove / save for later / undo messages (PARTIAL) | cart actions | `button` | Remove + undo exist; **Save for later** is P1 |
| Subtotal + Proceed to checkout panel (OBSERVED) | `CartSummary` | `card`, `button`, `separator` | Exists inline (REVISE: add estimate line) |
| Cart recommendation carousels (OBSERVED) | `ProductRail` | | Defer |
| Checkout sections + right summary + Continue (PARTIAL) | `CheckoutForm` + `OrderSummary` | `card`, `input`, `label`, `radio-group` | Exists (REVISE) |
| Customs-ID panel (OBSERVED, locale-specific) | none | | **Do not build** |
| Sign-in: identifier + Continue + inline errors + help links (OBSERVED) | `SignInForm`, `InlineAlert` | `input`, `button`, `alert`, `label` | **New** (with Auth) |
| Country-code select (OBSERVED) | none | | **Do not build** (email-only demo) |
| Password step, show/hide control (NOT OBSERVED) | `PasswordStep` | `input`, `button` | **New**, our own design |
| Assistant chat panel (OBSERVED) | none | | Out of scope |

## Reuse from the tracer

KEEP as is: `PriceBlock`, `QuantityStepper`, `ProductGallery` (extend), `AddToCartForm`, `CartQuantityForm`, `SiteFooter`, loading/error/not-found pages, shadcn `button`, `input`, `label`, `card`, `separator`.
REVISE: `SiteHeader`, PDP page, cart page, checkout page and form.
All domain modules (`catalog`, `cart`, `checkout`, `orders`, `payments`) are unchanged; the evidence does not require new module interfaces. It does add **display needs** that the existing interfaces already satisfy except for: availability reasons (a catalog read model addition), result facets (the `search` module, not yet built), and ratings (a field on the catalogue read model).

## New domain components justified by evidence

`SearchBar`, `ProductCard`, `ProductRail`, `RatingStars`, `VariantPicker`, `AvailabilityMessage`, `ResultsHeader` + `SortControl`, `FilterSidebar`, `ResultsPagination`, `CheckoutHeader`/`AuthShell`, `SignInForm` + `InlineAlert`, `PasswordStep`, `ProductDetails`. Not justified yet: reviews, Add to List, Buy Now, gift options, coupons, Subscribe & Save, Share.

## Additional shadcn components these would need (install only in the slice that uses them)

`select`, `checkbox`, `radio-group`, `sheet`, `dropdown-menu`, `pagination`, `alert`, `badge`, `aspect-ratio`, `breadcrumb` (only if a breadcrumb is evidenced; none was), `accordion` (details) as per `docs/ui.md`.

## Route impact (evidence only)

| Route | Verdict | Why |
|---|---|---|
| `/` | **REBUILD** | It is a temporary product index. Home evidence is in `recon/` (logged-out home deck), not `recon-v2`; the Home slice replaces it |
| `/dp/[slug]` | **REVISE** | Keep the gallery, price, quantity and add-to-cart. Evidence adds: title/byline/rating row, variant rows, availability states (including not-available-to-location), supporting content sections, related-items rail, and the three-column proportions (buy box about 244 px). Buy box states for price and CTA were not observed, so we revise only what is evidenced |
| `/cart` | **REVISE** | Two-column layout with a right-hand subtotal and Proceed to checkout is evidenced and already matched. Revise: line image size (about 180 px), unit price line, "Save for later" (P1), an estimate line before checkout (our decision); drop gift, coupon and Subscribe & Save |
| `/checkout` | **REVISE** (pending evidence) | Evidence shows stacked sections (address, payment, review items and shipping) with a right-hand summary and a Continue button under a reduced header. Our single page is close. The actual review and place-order states were not captured, so no larger rebuild is justified. Needs the real review capture |
| `/checkout/confirmation/[id]` | **KEEP** | No evidence either way |

### New routes required

| Route | For | Evidence |
|---|---|---|
| `/s` (query key `k`; plus `i` for department, filter and sort params of our own) | Search results | URL path `/s` with `k` observed; sort/filter parameter names are Amazon-internal and not copied |
| `/signin` | Identifier step and password step (and registration through the same "Sign in or create account" entry) | `/ap/signin` observed; step 2 and registration forms not observed |
| `/register` | Only if registration cannot be folded into `/signin` | NOT OBSERVED |
| Header search (no route) | Search entry | Header form observed |
