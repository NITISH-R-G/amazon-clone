# Component reuse map

REFERENCE, OBSERVED PATTERN, OUR COMPONENT, SHADCN PRIMITIVE, then **REUSE** (use what we already have), **ADAPT** (extend an existing component or take a convention), **REBUILD** (implement independently from the pattern). No code is copied from any reference (see `open-source-reference-analysis.md` for licences). Nothing here is implemented. "Tracer" means it exists in `src/` today.

Abbreviations: AMZ = Amazon (Site Peel/LIVE), FK = Flipkart (Site Peel/LIVE), YNS = Your Next Store (REPO), SS = shadcnspace template (REPO).

| Reference | Observed pattern | Our component | shadcn primitive(s) | Verdict |
|---|---|---|---|---|
| AMZ, FK, YNS | Header: logo, search, account, cart with count, location chip | `SiteHeader` (+ `CartLink`, `AccountMenu`, `LocationChip`) | `button`, `dropdown-menu` | **ADAPT** (tracer has logo + cart) |
| AMZ, YNS | Search field with optional department scope; query in URL | `SearchBar` | `input`, `select`, `button` | **REBUILD** |
| AMZ (LIVE), YNS | Suggestions list: thumbnail rows + query rows, keyboard navigation, debounce, cache | `SearchSuggestions` | `popover` + `command` | **REBUILD** (pattern from YNS controller; P1) |
| FK (LIVE), AMZ (LIVE) | Mobile: search on its own row; icon category strip; optional bottom bar | `MobileHeader`, `CategoryStrip` | `sheet`, `scroll-area` or CSS scroll | **REBUILD** |
| AMZ | Sub-nav link row + "All" drawer | `CategoryNav` | `sheet`, `accordion` | **ADAPT** (shorter list) |
| AMZ, FK, YNS, SS | Product card: image, title, rating, price (+ list price), one action, optional badge | `ProductCard` | `card`, `badge`, `button`, `aspect-ratio` | **ADAPT** (tracer index has an inline card) |
| AMZ, FK | Struck list price and "% off" label | `PriceBlock` | none | **REUSE** (tracer; add a "% off" variant) |
| AMZ, SS | Star glyph + numeric rating + count | `RatingStars` | none (lucide `Star`) | **REBUILD** |
| AMZ, SS, YNS | PDP gallery: thumbnail strip, large image, zoom; YNS media gallery | `ProductGallery` | `aspect-ratio`, `carousel` (only if swipe needed) | **ADAPT** (tracer: add zoom and arrow-key navigation) |
| AMZ (twister), SS (sizes) | Variant rows with swatches/sizes; out-of-stock options disabled | `VariantPicker` | `radio-group` | **REBUILD** |
| AMZ | Availability message incl. "cannot ship to your location" | `AvailabilityMessage` | `alert` | **REBUILD** |
| AMZ, FK, YNS | Quantity control | `QuantityStepper` | `button`, `input` | **REUSE** (tracer) |
| AMZ, YNS, SS | Product rail / "customers also bought" carousel | `ProductRail` | CSS scroll-snap, `carousel` optional | **REBUILD** |
| AMZ, YNS | Results header: count + sort select | `ResultsHeader`, `SortControl` | `select` | **REBUILD** |
| AMZ, YNS | Filter sidebar: rating, price (slider/ranges), checkbox facets; mobile sheet | `FilterSidebar` | `checkbox`, `radio-group`, `slider`, `sheet`, `separator` | **REBUILD** (URL-driven, YNS convention) |
| AMZ (load-more), YNS (numbered) | Pagination | `ResultsPagination` | `pagination` | **REBUILD** (numbered) |
| AMZ, FK | Cart line: image, title, price, unit price, qty, remove, save for later, delivery date | `CartLine` | `button`, `card` | **ADAPT** (tracer inline; add unit price, save for later) |
| AMZ, FK | Cart summary: subtotal vs itemised Price Details with savings | `CartSummary` | `card`, `separator`, `button` | **ADAPT** (add estimate lines) |
| YNS, SS | Cart as a sheet (mini-cart) with an empty state | `MiniCart` | `sheet` | **REBUILD** (optional; P1) |
| AMZ (LIVE), SS, YNS | Empty cart with next-action buttons | `EmptyState` | `button`, `card` | **ADAPT** (tracer has one in the cart page) |
| FK | Step indicator ("Step 3 of 3") | `CheckoutSteps` | none | **REBUILD** |
| FK, AMZ | Persistent order summary with itemised price details and Place Order | `OrderSummary` | `card`, `separator`, `button` | **ADAPT** (tracer summary) |
| AMZ, FK, SS | Address form / saved address summary with Change | `AddressForm`, `AddressSelector` | `input`, `label`, `radio-group`, `form`/`field` | **ADAPT** (tracer fields) |
| FK | Payment options list (UPI, card, EMI, COD with fee note) | `PaymentSelector` | `radio-group`, `card` | **REBUILD** (our demo: card only) |
| AMZ (SP), SS (login block) | Identifier-first form with inline alerts | `SignInForm`, `InlineAlert` | `input`, `button`, `alert`, `field` | **REBUILD** |
| FK (LIVE) | Auth as a modal over the page; Continue disabled until valid | `AuthDialog` (optional) | `dialog` | **REBUILD** (decision pending: page vs modal) |
| AMZ, FK | Account hub tiles vs dropdown menu | `AccountNavigation`, `AccountTiles` | `dropdown-menu`, `card` | **REBUILD** |
| none observed (design proposal) | Order list and timeline | `OrderCard`, `OrderTimeline` | `card`, `badge` | **REBUILD** |
| AMZ, FK | Inline error alerts; availability notices | `InlineAlert` | `alert` | **REBUILD** |
| FK (LIVE), YNS | Skeletons matching layout | `*Skeleton` per route | `skeleton` | **ADAPT** (tracer uses pulse blocks; move to shadcn `skeleton`) |
| YNS | Route error fallback with retry | `RouteError` | `button`, `alert` | **ADAPT** (tracer has `error.tsx`) |
| AMZ (live toast absent), SS, YNS | Toasts for add/undo | `Toaster` | `sonner` | **REBUILD** (P1; tracer uses redirect banner) |

## Borrow safely

**A. Behavioural conventions (safe to reproduce as our own implementation)**: query, sort and filters in the URL; numbered pagination; debounced suggestions with keyboard control; quantity change with live status; remove with undo; itemised totals with savings; step counter in checkout; inline field errors; disabled Continue until valid; guest cart kept after sign-in; skeletons that match the layout.

**B. Structural ideas (inspiration, implement independently)**: header and mobile header composition; category strip; PDP three-column desktop layout and single-column mobile; cart two-column with summary; checkout with persistent summary; filter sheet on mobile; account menu.

**C. Visual patterns (reference only; our identity must differ)**: Amazon's yellow/orange and dark navy bars; Flipkart's blue/yellow and tile labels; both sites' dense promo grids; YNS's very rounded image wells; shadcnspace's marketing-style blocks.

**D. Code and components (only if the licence permits and the fit is good)**: nothing recommended today. YNS patterns (suggestions controller, cart math) are MIT-covered ideas we will rewrite against our own modules; **`commerce-kit` is AGPL and must not be used**; shadcnspace blocks are UNKNOWN / REQUIRES VALIDATION beyond the repo MIT.

**E. Assets**: do not reuse any image, logo or illustration from Amazon, Flipkart, YNS or shadcnspace (trademarks, third-party photos, unverified provenance).
