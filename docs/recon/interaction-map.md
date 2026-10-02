# Interaction map

Interactive states and behaviours **observable in the supplied DOM/CSS**. A static save cannot show runtime behaviour (animation timing, hover delays, XHR responses), so "Behaviour" is inferred from markup and is labelled as such. Anything needing live observation is **UNKNOWN / REQUIRES VALIDATION** and listed in the Site Peel request (screen recordings or interaction captures).

## Global header

| Element | State / interaction | Evidence | Notes |
|---|---|---|---|
| Skip links | `nav#shortcut-menu` "Skip to" list + "Keyboard shortcuts" list; help text "To move between items, use your keyboard's up or down arrows" | home | Amazon ships a keyboard-shortcut menu: accessibility baseline we should meet |
| Delivery location | Click opens modal/popover (`a-popover-trigger`, `data-action` on `#nav-global-location-data-modal-action`); hidden inputs `unifiedLocation1ClickAddress`, `ubbShipTo`, `glowDestinationType`; shows "Deliver to / <country>" | home | Modal content not captured: UNKNOWN |
| Search department select | Native `<select>` with 60+ options behind a styled facade (`nav-search-facade`) showing "All"; label "Select the department you want to search in" | home | Facade updates its text on change (inferred) |
| Search input | `role=searchbox`, `aria-label="Search Amazon"`, rotating placeholder class `hokuto-rotate-fade` (animated placeholder) | home | Autosuggest container `#sac-autocomplete-results-container[role=grid]` with left/right panes; `aria-haspopup="grid"` |
| Search submit | Sprite button 57×40, hover/focus swaps sprite position | home | |
| Language flyout | Flag + "EN", expandable via separate `button.nav-flyout-button[aria-label="Expand to Change Language or Country"]` | home | Link and flyout button are separate controls (good a11y pattern) |
| Account & Lists | Link goes to sign in; adjacent chevron button expands flyout; flyout shows Sign in CTA ("Start here."), two columns: Your Lists, Your Account | home | `aria-label="Expand Account and Lists"` |
| Returns & Orders | Plain link | all | |
| Cart | Link with `aria-label="N items in cart"`; count shown as a badge | all | Update-on-add behaviour: UNKNOWN |
| Sub-nav "All" | Opens hamburger drawer (not captured open) | all | Sections inferred from Deals footer: Digital Content & Devices, Shop by Department, Programs & Features, Help & Settings |
| Sub-nav links | Horizontal list, 31 items, overflow behaviour unknown | home | Seasonal/promotional items rotate |
| Back to top | `button#navBackToTop` | home | |

## Content interactions

| Element | State / interaction | Evidence | Notes |
|---|---|---|---|
| Promo card | Whole-card link, quad cards have 4 tile links + 1 "see more" link | home | |
| Product card | Whole-card `<a>`, image, 1-line clamp (`--max-rows:1`) or 4-line clamp (`data-rows="4"`) | gift cards, your Amazon.com | Hover state: UNKNOWN |
| Carousel | `a-carousel` with prev/next ("Previous Page" text visible), no autoplay markers found | gift cards | Keyboard behaviour: UNKNOWN |
| Accordion (FAQ) | `data-action="a-expander-toggle"`, `aria-expanded` | returns, gift cards | 3 toggles on returns |
| Modal | `data-action="a-modal"` (cookie/location/help) | several | |
| Popover | `data-action="a-popover"` ("How do I find this?" help) | returns | |
| Button group | `a-button-group` (NPS 0 to 10 scale on returns) | returns | Radio-like selection |
| Deal filter bubbles | `data-csa-c-element-type="option"`; selecting filters the discount grid | deals | Result updating: UNKNOWN (grid not captured) |
| Preference form | Checkbox group + **Save** → inline "Your preferences have been saved" | profile hub | Confirmation is a persistent text block, not a toast |
| Sign-in | Identifier-first: Continue reveals the password step (not captured). Hidden WebAuthn/passkey autofill fields indicate passkey login support | sign in | Error states (invalid identifier, wrong password, CAPTCHA): UNKNOWN |
| Returns lookup | Order-number input + Search; helper text "17-digit code found on the packing slip" | returns | Validation rules: UNKNOWN |
| Assistant panel | Dockable resizable chat (`#rufus-*`), overflow menu, drag-to-resize tooltip "Drag to reposition this window" | deals | **Out of scope** |
| Cookie consent | `#sp-cc` banner | home | Not visible in capture |

## Cart and listing (inferred from CSS only)

| Behaviour | Selector evidence |
|---|---|
| Quantity stepper increment/decrement | `.sc-input-stepper-increment` |
| Item actions: delete, save for later, move to cart | `.sc-action-links`, `.sc-action-switch-item`, `.sc-action-move-to-cart`, `.sc-saved-collapsed-cart` |
| Out-of-stock alternatives popover | `.sc-oos-alternatives-popover` |
| Buy-box collapse for subtotal/checkout | `.sc-collapsed-cart-buy-box`, `.sc-collapsed-cart-content` |
| Result list, pagination, suggestions | `.s-result-list`, `.s-pagination-button`, `.s-next`, `.s-suggestion` |
| Colour swatch selection on cards | `.s-color-swatch-container` |
| Filter sidebar float | `.sf-filter-floatbox` |
| Coupon tiles | `.s-coupon-tile`, `.s-coupon-tile-container` |

## Focus and keyboard

AUI focus style: `outline: 2px solid #888c8c; outline-offset: 2px` on `:focus-visible` for buttons; elsewhere an orange ring. Amazon's keyboard-shortcut menu is a differentiator in accessibility we should at least match with skip links, logical tab order and arrow-key navigation inside menus.

## Responsive behaviour (what can be said)

- Desktop header has `min-width:1000px`; below that Amazon serves a different (mobile) shell, which was **not captured**. Mobile header composition, drawer, sticky search, bottom elements: **UNKNOWN / REQUIRES VALIDATION**.
- Cart/listing CSS contains `max-width:359px` / `min-width:360px` rules and `min-width:768px`, indicating the three tiers phone (<360 and 360 to 767), tablet (768 to 1000), desktop (≥1001).

## States not observable

Loading skeletons (only a spinner GIF exists), error banners, empty cart, empty search results, out-of-stock PDP, failed payment: all **UNKNOWN / REQUIRES VALIDATION**. We design these ourselves (see `docs/product-decisions.md`), and request Amazon equivalents via Site Peel only where they materially help.
