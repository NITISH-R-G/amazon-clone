# Component inventory

Real component boundaries drawn from the supplied DOM. Not every component listed is built in every phase; build order follows `docs/roadmap.md`. "Evidence" cites where the structure was observed. shadcn/ui is the default; where no good primitive exists the gap is called out (per `CLAUDE.md`: ask before inventing when it materially affects design).

## 1. Global primitives (shadcn/ui)

| Primitive | shadcn component | Used for (observed on Amazon) | Notes |
|---|---|---|---|
| Button | `button` | Add to cart, Continue, Search submit, Save, "Start a return" | Amazon has a **yellow primary** and **orange one-click** variant, plus pill-shaped secondary. Variants map to `button` variants (see design-tokens) |
| Input / Textarea | `input`, `textarea` | Search box, sign-in identifier, order-number lookup | Sign-in uses a single identifier field + country-code select |
| Select | `select` | Search department dropdown (60+ departments), quantity, country code | The header department select is a **native `<select>` styled as a facade**; use shadcn `select` or a native select (decision in product-decisions) |
| Label / Form | `label`, `form` (react-hook-form + zod) | All forms | Required for checkout/address validation |
| Checkbox / Radio | `checkbox`, `radio-group` | Climate-pledge prefs, filters, address/payment pickers | |
| Dialog | `dialog` | Location chooser ("Deliver to"), confirm actions | Amazon uses popovers; modal for location |
| Sheet (drawer) | `sheet` | **Hamburger "All" menu**, mobile filters, mini-cart (optional) | Covers the left slide-in menu |
| Dropdown / Popover | `dropdown-menu`, `popover`, `hover-card` | Account & Lists flyout, language flyout | Amazon opens flyouts on hover; we should open on click/focus too |
| Tabs | `tabs` | Account sections, order filters | |
| Accordion | `accordion` | Gift-card and returns FAQ | Observed as expanders |
| Tooltip | `tooltip` | "How do I find this?" help text | |
| Toast | `sonner` | "Added to cart", "Your preferences have been saved" | Observed: inline "Your preferences have been saved" |
| Badge | `badge` | Deal badges, "Prime", discount %, "Best seller" | Deal badge is red (`#cc0c39`) |
| Skeleton | `skeleton` | Card/grid loading | Amazon shows a spinner GIF; skeletons are an improvement |
| Card | `card` | Account tiles, promo cards, product cards | `a-cardui` is the Amazon analogue |
| Carousel | `carousel` (embla) | Product rails, gift-card rails | Amazon: `a-carousel` |
| Pagination | `pagination` | Search results (`.s-pagination-button` in CSS) | Inferred only |
| Breadcrumb | `breadcrumb` | Category/PDP | UNKNOWN / REQUIRES VALIDATION (no PDP DOM) |
| Separator, ScrollArea, Avatar, Alert, Table, Sonner, Command | as named | General | `command` for search suggestions (see below) |
| Rating (stars) | **No shadcn primitive** | Star ratings (`a-star-small-4-5`, alt "4.7 out of 5 stars") | Small custom component; confirm with user (low design risk) |
| Quantity stepper | **No shadcn primitive** | `.sc-input-stepper-*` in cart CSS | Compose from `button` + `input` |

## 2. Global shell (Amazon-specific)

| Component | Observed structure | Evidence | shadcn building blocks |
|---|---|---|---|
| **SkipLinks / KeyboardShortcutsMenu** | `nav#shortcut-menu` "Skip to", "Keyboard shortcuts" | all pages | plain a11y component |
| **AmazonHeader** | `header#navbar-main > #navbar > #nav-belt` (60 px bar, `#131921`): logo, location, search, tools, cart | home | custom layout |
| **Logo** | `#nav-logo` link with `.nav-logo-base` sprite + `.us` locale tag | home | custom (trademark decision) |
| **DeliveryLocation** | `#nav-global-location-slot` "Deliver to / India" opening a popover/modal with address list + ZIP entry | home | `dialog` or `popover` |
| **SearchBar** | `form#nav-search-bar-form[role=search]`: department select (`#searchDropdownBox`), input `#twotabsearchtextbox`, submit | home | `input`, `select`, `button` |
| **SearchSuggestions** | `#nav-iss-attach` / `#sac-autocomplete-results-container[role=grid]` with `two-pane-results-container` (left/right panes) | home/deals | `command` or `popover` + listbox |
| **LanguageSwitcher** | `#icp-nav-flyout` flag + "EN" with flyout button | home | `dropdown-menu` |
| **AccountMenu** | `#nav-link-accountList` "Hello, sign in / Account & Lists" with flyout: Sign in, Start here; lists (Create a List, Find a List or Registry); account (Account, Orders, Recommendations, Browsing History, Shopping preferences, Start a Selling Account, Amazon Credit Cards, Watchlist, Video Purchases, Kindle Unlimited, Content & Devices, Subscribe & Save, Memberships, Prime Membership, Music Library, Business account, Customer Service) | home | `dropdown-menu` / `navigation-menu` |
| **OrdersLink** | `#nav-orders` "Returns & Orders" | all | link |
| **CartLink** | `#nav-cart` `aria-label="0 items in cart"` with count badge | all | link + `badge` |
| **CategoryNav (sub-nav)** | `#nav-main`: "All" hamburger + ~31 department links (Early Prime Deals, Prime, Coupons, Pharmacy, Amazon Home, Automotive, Music, Registry, Audible, Video Games, New Releases, Baby, Fashion, Sports & Outdoors, Smart Home, Toys & Games, Works with Alexa, Custom Products, Subscribe & Save, Gift Shop, Best Sellers, Amazon Haul, Kindle Books, Books, Luxury, Handmade, TV & Video, Gift Cards, Beauty & Personal Care …) horizontally scrolling | home | `navigation-menu` / scroll container |
| **HamburgerMenu** | "All" opens left drawer: Digital Content & Devices, Shop by Department, Programs & Features, Help & Settings sections | deals | `sheet` + `accordion` |
| **RecentlyViewedRail (RHF)** | `#rhf` "Your recently viewed items and featured recommendations" | home | `carousel` |
| **BackToTop** | `button#navBackToTop` | home | `button` |
| **AmazonFooter** | `#navFooter`: back-to-top bar; 4 link columns (Get to Know Us, Make Money with Us, Amazon Payment Products, Let Us Help You); language/country selectors; Amazon brand-family strip (31 sister-brand entries); legal row (Conditions of Use, Privacy Notice, Consumer Health Data Privacy Disclosure, Your Ads Privacy Choices); copyright | home | custom |
| **CookieConsent** | `#sp-cc` / `#sp-cc-wrapper` | home | UNKNOWN / REQUIRES VALIDATION (not styled in capture) |
| **AssistantPanel (Rufus/Alexa+)** | Dockable, resizable chat panel `#rufus-*` with overflow menu, drag handle | deals | **Out of scope**; do not reproduce |

## 3. Discovery components

| Component | Observed | Evidence |
|---|---|---|
| **HeroBanner** | Wide banner (e.g. 1500×362, 2560×110, 3000×300) with link | gift cards, deals |
| **PromoCard** (`a-cardui`) | Heading + single image + link; variants: single, **quad** (4 images, 5 links), video card ("$1 deals") | home |
| **CategoryTile** | Image 261×261 or 806×596 + label | gift cards |
| **ProductCard** | Image, title (1 to 4 line clamp), price, rating (stars + count). Two variants: priced catalogue card (`dcl-product`) and recommendation card (`p13n-grid-content`) | gift cards, your Amazon.com |
| **PriceBlock** | `a-price`: offscreen full text, visual symbol / whole / fraction (superscript cents). Also strike-through list price (CSS `a-text-price`) and coupon tile (`s-coupon-tile`) | gift cards; search CSS |
| **RatingSummary** | `a-icon-star-small a-star-small-4-5`, `.a-icon-alt` "4.7 out of 5 stars", count "83,305" | your Amazon.com |
| **ProductRail** | Carousel of ProductCards with prev/next, heading, "Shop all" | gift cards |
| **DealFilterBubbles** | Row of pill filters ("Lightning Deals", "Halloween", "New Arrivals", "Amazon brands") | deals |
| **FilterSidebar** | `.sf-filter-floatbox`, `.s-widget`, colour swatches (`s-color-swatch-container`), `s-bct` (breadcrumb/category tree) | home & kitchen CSS (inferred) |
| **SortControl** | Not in CSS evidence; UNKNOWN / REQUIRES VALIDATION | |
| **Pagination** | `.s-pagination-button`, `.s-next` | home & kitchen CSS (inferred) |
| **EnergyBadge** | `s-energy-efficiency-badge-*` (EU regulatory) | home & kitchen CSS: **skip** |

## 4. Product detail components (all UNKNOWN / REQUIRES VALIDATION)

No PDP DOM supplied. Planned components, to be validated against Site Peel material before building: `ProductGallery`, `ProductTitleBlock`, `PriceBlock`, `VariantSelector`, `QuantitySelect`, `ProductPurchasePanel` (buy box), `DeliveryEstimate`, `AvailabilityBadge`, `AddToCartButton`, `BuyNowButton`, `AboutThisItem`, `ProductDetailsTable`, `ReviewsSummary`, `ReviewList`, `RelatedRail`.

## 5. Cart & checkout components

Partial evidence (CSS only) for cart: `CartList` (`.sc-list`, `.sc-list-body`, `.sc-list-item`, `.sc-item-grid`), `CartItem` with `.sc-action-links` (delete, save for later, "see more like this" implied by name), `.sc-input-stepper-increment` (quantity), `.sc-collapsed-cart-buy-box` (subtotal + Proceed to checkout), `SavedForLater` (`.sc-saved-collapsed-cart`), `OutOfStockAlternatives` (`.sc-oos-alternatives-popover`), and Amazon "local market" (Fresh) cart variants (`.sc-localmarket-*`, skip).
Checkout (`AddressSelector`, `DeliveryOptions`, `PaymentSelector`, `OrderReview`, `OrderSummary`, `PlaceOrderButton`, `OrderConfirmation`): **no evidence**.

## 6. Account components

| Component | Observed |
|---|---|
| **AccountTileGrid / AccountTile** | `a.ya-card__whole-card-link`: icon + title + description, 12 primary tiles plus grouped link lists |
| **ProfilePreferenceRow** | Label + value (`--` when empty) with edit affordance |
| **PreferenceCheckboxGroup + SaveToast** | Climate Pledge options, "Your preferences have been saved" |
| **ReturnsHub**: policy banner, **OrderNumberLookup** (gift returns), **ManageReturns** card, **NpsWidget** (0 to 10 radio scale) |
| **HelpTopicPicker** (8 options), **HelpCard** ×4, **HelpSearch**, **HelpTopicGrid** |
| **SignInForm**: identifier input + country select + Continue; password step not captured |
| **AccountNavigation** (our own; see `product-decisions.md`) | Not observed as a persistent nav: Amazon uses a tile hub with page-by-page navigation |

## 7. Post-purchase components (planned, no evidence)

`OrderList`, `OrderCard`, `OrderTimeline`, `OrderDetail`, `CancelOrderDialog`, `TrackingStatus`. All **UNKNOWN / REQUIRES VALIDATION** against Amazon; we design these ourselves unless Site Peel supplies pages.

## Decision rule

Build a component only when a Phase 1 page needs it. Prefer composition of the primitives in section 1 over bespoke markup. Any "no shadcn primitive" row above that affects visual design (rating, stepper) is flagged for a quick user confirmation before building.
