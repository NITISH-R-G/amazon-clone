# Canonical page inventory

For our product. Evidence tags: SP (Site Peel), LIVE, REPO, TRACER (exists in `src/`), NONE. "Sufficient?" answers whether the evidence is enough to start building without further captures: **YES**, **PARTLY**, **NO** (we design it ourselves and mark it as ours).
Domain dependencies refer to the locked modules in `docs/modules.md`. shadcn lists follow `docs/ui.md` (install only in the slice that needs them). All pages share: skip link, header/footer shell (or the reduced checkout/auth shell), and the loading/error/not-found conventions.

## 1. Core P0-A

| Page | Source evidence | Required components | Domain dependencies | shadcn primitives | Responsive requirements | States | Sufficient? |
|---|---|---|---|---|---|---|---|
| **Home** `/` | AMZ home deck (`recon/`), FK home (SP, LIVE), YNS hero + sections | `SiteHeader`, `CategoryStrip`, `Hero`, `PromoCard`, `ProductRail`, `ProductCard` | `catalog` (featured and category rails) | `button`, `card`, `badge`, `aspect-ratio` | Header search row, scrolling category strip, rails scroll-snap, hero stacks | loading skeleton, empty rail (hidden), error | YES (structure); catalogue not built |
| **Search (entry)** header | AMZ header + suggestions (SP, LIVE), FK header, YNS controller | `SearchBar`, `SearchSuggestions` (P1) | `search.suggest` (P1) | `input`, `select`, `button`, `popover`, `command` | Own full-width row on mobile | focus, typing, no suggestions, error | YES |
| **Search results** `/s` | AMZ results (SP), YNS listing/filters | `ResultsHeader`, `SortControl`, `FilterSidebar` (+ mobile sheet), `ProductCard`, `ResultsPagination`, `AppliedFilters` | `search.searchProducts`, `parse/toSearchParams` | `select`, `checkbox`, `radio-group`, `slider`, `sheet`, `pagination`, `badge`, `skeleton` | Sidebar becomes a bottom/side sheet under `lg`; 1 to 4 card columns | loading skeleton grid, **no results**, error, out-of-stock card | PARTLY (empty/filtered states not captured; designed by us) |
| **Product** `/dp/[slug]` | AMZ PDP (SP, partial), YNS/SS PDP blocks, TRACER | `ProductGallery`, `ProductHeading`, `RatingStars`, `PriceBlock`, `VariantPicker`, `AvailabilityMessage`, `PurchasePanel` (`AddToCartForm`), `ProductDetails`, `ProductRail` | `catalog.getProduct/getVariant/getAvailability`, `cart.addItem` | `card`, `radio-group`, `alert`, `accordion` (details), `breadcrumb` (optional), `separator` | Three columns at `lg`, single column below with a sticky add-to-cart bar | loading, not found, in stock, low stock, out of stock, not available to location, error on add | PARTLY (buy-box states and delivery not captured) |
| **Cart** `/cart` | AMZ cart (SP), AMZ empty (LIVE), FK cart (SP), TRACER | `CartLine`, `QuantityStepper`, `CartSummary`, `EmptyState`, `ProductRail` (later) | `cart.*`, `checkout.quoteCart` (estimate) | `button`, `card`, `separator` | Two columns at `lg`; summary below on mobile | loading, empty, removed + undo, clamped quantity, unavailable line, error | YES |
| **Checkout** `/checkout` | FK steps and payments (SP), AMZ early step (SP), TRACER | `CheckoutHeader`, `CheckoutSteps`, `AddressForm`, `PaymentSelector`, `OrderSummary` | `checkout.getQuote/placeOrder`, `payments`, `account` (later) | `input`, `label`, `radio-group`, `card`, `alert`, `separator` | Single column on mobile with summary after the form (total also in the button) | loading, empty cart, validation errors, declined, out of stock, success | PARTLY (Amazon review state missing; Flipkart gives the flow) |
| **Confirmation** `/checkout/confirmation/[id]` | TRACER; no Amazon/Flipkart evidence | `OrderConfirmation` (summary, address, payment, next steps) | `orders.getOrder` | `card`, `button` | Single column | loading, not found, success | NO (our design) |

## 2. P0-B

| Page | Source evidence | Required components | Domain dependencies | shadcn primitives | Responsive requirements | States | Sufficient? |
|---|---|---|---|---|---|---|---|
| **Sign in** `/signin` | AMZ identifier step (SP), FK modal (SP, LIVE) | `AuthShell`, `SignInForm`, `InlineAlert`, `PasswordStep` | `auth.checkIdentifier/signIn`, `cart.mergeGuestCart` (orchestrated in `app/`) | `input`, `label`, `button`, `alert`, `field` | Centered single column; stays above the keyboard on mobile | empty/invalid identifier, wrong password (generic), locked-out, loading, success + `returnTo` | PARTLY (password step and error not captured; designed by us) |
| **Registration** `/register` (or inside `/signin`) | AMZ combined entry, SS register block | `RegisterForm` | `auth.register` | `input`, `label`, `button`, `alert`, `field` | Same as sign in | duplicate email, weak password, success | NO (not captured) |
| **Account** `/account` | AMZ account hub (`recon/`), FK account menu (SP) | `AccountTiles`, `AccountNavigation` | `auth.requireUser`, `account.getProfile` | `card`, `dropdown-menu` | Tiles 1 to 3 columns; nav becomes a select/tabs on mobile | loading, empty profile values | YES (structure) |
| **Orders** `/orders` | FK order-history assets only; no HTML | `OrderCard`, `OrderFilters` | `orders.listOrders` | `card`, `badge`, `tabs` | Cards stack | loading, **no orders**, error | NO (our design) |
| **Order detail** `/orders/[id]` | none | `OrderTimeline`, `OrderItems`, `OrderTotals` | `orders.getOrder`, `statusAt`, `cancelOrder` (P1) | `card`, `badge`, `separator`, `dialog` (cancel) | Single column | loading, not found (not owner), cancellable / not | NO (our design) |
| **Address book** `/account/addresses` | AMZ tile text, FK saved-address summary (SP) | `AddressList`, `AddressForm` | `account.*` | `card`, `input`, `radio-group`, `dialog`, `alert` | Single column | empty, validation, default change | PARTLY |
| **Error states** | AMZ inline alerts (SP), FK pincode notice (SP), YNS route errors (REPO), TRACER | `InlineAlert`, `RouteError`, `NotFound`, `OfflineNotice` | none | `alert`, `button` | n/a | 404, 500, offline/retry, expired session | YES |

## 3. P1

| Page / feature | Source evidence | Notes |
|---|---|---|
| Suggestions | AMZ and YNS (LIVE, REPO) | Accessible combobox with debounce and keyboard control |
| Deals `/deals` | AMZ deals frame (SP), FK discount-label tiles (LIVE) | Filter bubbles + discount grid; needs list prices in the catalogue |
| Richer filtering | AMZ facets (SP), YNS (REPO) | Applied chips, facet counts, mobile sheet polish |
| Mobile refinements | AMZ/FK mobile headers (LIVE) | Sticky add-to-cart, optional bottom bar, gallery swipe |
| Mini-cart sheet | YNS, SS (REPO) | Optional |
| Save for later, order status simulation, cancel order | AMZ/FK cart actions (SP) | Domain additions in `cart`/`orders` |
| Accessibility, performance, Impeccable cycle | n/a | After the first real visual system |

## 4. Missing-capture reassessment (Amazon)

Decision per capture after comparing all evidence. We do not re-request automatically.

| Capture | Decision | Reasoning |
|---|---|---|
| PDP purchasable / in-stock state | **USEFUL** (not required) | Buy-box structure (price block position, quantity, Add to cart, Buy Now, seller, delivery estimate) is a very common pattern also seen in YNS and SS; our own states (in stock, low, out, unavailable) are design decisions. A capture from a shippable location would sharpen delivery-line wording and hierarchy but is not blocking |
| Checkout review / place-order state | **USEFUL** (low) | Flipkart's captures give a complete flow (summary step and "Step 3 of 3" payments with itemised price details and Place Order) and Amazon's early step gives the shell and section naming. The remaining Amazon-specific detail does not change our architecture |
| Sign-in password step + wrong-password state | **NO LONGER NECESSARY** | The pattern is conventional; our credentials (email + password) and generic-error policy are our own decision (`docs/modules.md`). Obtaining it live would mean submitting an identifier to a real service, which we declined. Flipkart shows a different (OTP) model, so the comparison is already informative |
| Flipkart search results and PDP | **USEFUL** (new) | We have no Flipkart results or PDP; one capture each would complete the Amazon/Flipkart comparison. Optional |
| Empty search results, mobile captures, open states (account flyout, hamburger, location modal) | **USEFUL** (unchanged) | LIVE observations covered suggestions and mobile headers only; empty search and filter states remain our own design |
| Order list/detail, registration | **NO LONGER NECESSARY** as Amazon captures | Designed by us; Flipkart order-history assets confirm only that thumbnails + status are standard |

Net: **nothing is blocking implementation of the visual system, Home, Search, Results, PDP, Cart and Checkout refinement.** Optional captures can be added later without changing the plan.
