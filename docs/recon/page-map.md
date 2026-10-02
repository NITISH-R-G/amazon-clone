# Page map

Every page in `recon/pages/`. "Captured by" is the `saved from url` comment Chrome wrote into the file; query strings and identifiers are removed here (several carry session or actor IDs).

Account state: **LO** = logged out, **LI** = logged in as a real named customer (name and ID intentionally not recorded). All pages are **desktop captures**; the delivery locale in the header is India ("Deliver to India") on the logged-out home page.

## Supplied pages

| # | Saved file | Amazon route (sanitised) | State | `<title>` | Size | What it gives us |
|---|---|---|---|---|---|---|
| 1 | `Amazon.com. Spend less. Smile more..html` | `/` | LO | Amazon.com. Spend less. Smile more. | 2.2 MB | Global shell, header, sub-nav, home card deck (16 cards), footer. **Primary shell reference** |
| 2 | `Sign in.html` | `/ap/signin` (OpenID params) | LO | Sign in | 0.7 MB | Auth entry: unified identifier-first form. No shell nav, minimal footer |
| 3 | `Today's Deals.html` | `/gp/goldbox` | LI | Today's Deals | 1.2 MB | Deals page frame, filter-bubble row, "Discounts grid" nav. **Grid itself not captured** |
| 4 | `Amazon.com Gift Cards.html` | `/gift-cards/b/` | LI | Amazon.com Gift Cards | 1.4 MB | Only page with **priced product cards**, carousels, tile grids, FAQ accordion |
| 5 | `Your Amazon.com.html` | `/gp/yourstore` | LI | Your Amazon.com | 1.1 MB | Personalised recommendation grids (47 product images, star ratings) |
| 6 | `Your Account.html` | `/gp/css/homepage.html` | LI | Your Account | 0.9 MB | Account hub: 52 tiles, card grid |
| 7 | `Profile Hub.html` | `/slc/hub` | LI | Profile Hub | 1.0 MB | Profile/preferences form UI |
| 8 | `Online Return Center.html` | `/gp/css/returns/homepage.html` | LI | Online Return Center | 0.9 MB | Returns hub: policy banner, gift returns, manage returns, FAQ |
| 9 | `Help & Contact Us - Amazon Customer Service.html` | `/hz/contact-us/foresight/hubgateway` | LI | Help & Contact Us - Amazon Customer Service | 1.1 MB | Help hub: topic grid, help search, recommended topics |

## Resource folders with no main HTML

| Folder | Likely page | Evidence available | Evidence missing |
|---|---|---|---|
| `Amazon.com Shopping Cart_files` | `/gp/cart/view.html` | CSS selectors (`.sc-list-item`, `.sc-list-body`, `.sc-action-links`, `.sc-item-grid`, `.sc-saved-collapsed-cart`, `.sc-collapsed-cart-buy-box`, `.sc-input-stepper-*`, `.sc-oos-alternatives-popover`, `.sc-localmarket-*`); 8 thumbnails at 100×100 (recommendation/related items); loading spinner GIF | DOM, copy, layout, subtotal panel, quantity control markup |
| `Amazon.com _ home and kitchen_files` | Category/search-results page for Home & Kitchen | CSS (`.s-result-list`, `.s-image`, `.s-pagination-button`, `.s-color-swatch-container`, `.s-tile`, `.s-coupon-tile`, `.sf-filter-floatbox`, energy-efficiency badges, `.s-tiles-carousel`, `s-suggestion`, `puis-*`); 35 product JPGs (`_AC_UL320_`); thumbs up/down feedback icons | DOM, filter sidebar structure, sort control, card markup |

## Not supplied (no evidence)

Product detail page; search results page; checkout (address, delivery, payment, review); order confirmation; Your Orders list; order detail/tracking; addresses page; Login & security; payments page; "Buy now" flow; wishlists; any mobile layout. All are **UNKNOWN / REQUIRES VALIDATION**.

Evidence that these exist at all: footer/account links (`Your Orders`, `Returns & Replacements`, `Your Addresses`, `Your Payments`) and the PDP URL pattern `/dp/<ASIN>` visible in gift-card product links.

## Per-page structure notes

### 1. Home (LO)
`div#a-page` > skip links + keyboard-shortcut `nav#shortcut-menu` > `header#navbar-main` > `div#navbar` (see `component-inventory.md`) > `div#gwm-Deck[role=main]` (cards) > `div#rhf` ("Your recently viewed items") > `div#navFooter`. Deck card types observed: single-image promo, 4-tile "quad" cards (4 images, 5 links, heading), a "$1 deals" video/image card, and a personalised-recommendations card. Headings (verbatim promo copy is Amazon's; paraphrase in our product): holiday/seasonal themes, brand spotlights, category entry points ("Shop by sport", "Pet wellness"), gift-card brands. **No product prices on the home deck.** Top-of-page banner copy shows a deals event teaser.

### 2. Sign in (LO)
One form, `form#ap_login_form` (`name=signIn`), identifier-first ("claim collect"): single text input `email` (accepts email or mobile; country-code selector "US +1"), **Continue** button, "Need help?" link, "Create a free business account" link, footer (Conditions of Use, Privacy Notice, Help). Password input exists but is hidden (`auth-credential-autofill-hint`), revealed on the next step (**second step not captured**). Hidden fields carry OpenID return-to, CSRF token and WebAuthn passkey challenge. Heading: "Sign in or create account". Registration step: **UNKNOWN**.

### 3. Today's Deals (LI)
Banner headings "Get ready for Prime Big Deal Days", "More for you"; nav `aria-label="Discounts grid sub-sections"`; **filter bubbles** with `data-csa-c-element-id` values: lightning deals, halloween, new arrivals, `cml`, amazon-brands (painter `discount-asin-grid`). Grid cards are not in the DOM snapshot. Footer sections "Digital Content & Devices", "Shop by Department", "Programs & Features", "Help & Settings" belong to the hamburger menu.

### 4. Gift Cards (LI)
Hero banner (1500×362 and 2560×110 images), carousels ("So many ways to celebrate", "Customers love these gift cards"), occasion tiles (806×596), brand tiles (261×261), category tiles, delivery-type tiles (800×596), FAQ, "Shop with Points". **Product card** (`div.a-cardui.dcl-product`): wrapping `<a>` to `/…/dp/<ASIN>`, image container, one-line truncated title, price block. Prices render as `a-price` with `a-offscreen` full text plus visual `symbol / whole / fraction` spans.

### 5. Your Amazon.com (LI)
Grid of recommendation cards (`p13n-asin-index-N`): image 127–254 px, up-to-4-row truncated title, star icon (`a-star-small-4-5`, alt "4.7 out of 5 stars"), rating count (`83,305`). Titles in the sample are books ("Top picks for you").

### 6. Your Account (LI)
`h1 Your Account`; 18 section headings (Your Orders; Login & security; Prime; Your Addresses; Your business account; Gift cards; Your Payments; Your Amazon Family; Digital Services and Device Support; Your Lists; Customer Service; Your Messages; then groups: Ordering and shopping preferences, Digital content and devices, Memberships and subscriptions, Communication and content, Shopping programs and rentals, Other programs, Manage your data). Tiles are `a.ya-card__whole-card-link`: icon + title + one-line description (e.g. "Track, return, cancel an order, download invoice or buy again").

### 7. Profile Hub (LI)
Preference sections: Clothing & Shoes (preferred department, height & weight, age group, fit attributes, shoes, style size, price), Diet (type, restrictions, lifestyle), Interests, Sustainability (Climate Pledge Friendly checkboxes with a Save and "Your preferences have been saved" toast), Fan Shop, Pets, About You, Your Recommendations. Empty values render as `--`.

### 8. Online Return Center (LI)
Policy banner (return window text), "Start a return in your orders" CTA, NPS widget (0 to 10 scale, "How likely are you to recommend Amazon…"), **Gift Returns** (order-number search with "How do I find this?" help text), **Manage Returns**, **Get product support**, FAQ accordion, "Did you know…".

### 9. Help & Contact Us (LI)
Greeting heading, "What would you like help with today?" with 8 topic options, "Where's my order?", "Your Returns", "Issues with your payment?", "Your Memberships and Subscriptions" cards, "Search our help library", "All help topics" (Where's my stuff, Shipping and Delivery, Returns and Refunds, Managing Your Account, Security & Privacy, Payment/Pricing/Promotions, Devices & Digital Solutions…).

## Global shell (all LI pages and the home page)

Same header, sub-nav and footer on pages 1 and 3–9; page 2 (sign-in) uses a stripped shell. See `component-inventory.md`.
