# Ecommerce reference inventory (Phase 2B)

Research inventory only. Nothing was cloned into the project, no dependency was installed, and `src/` was not touched. Evidence labels: **SITE PEEL** (saved captures), **LIVE BROWSER OBSERVATION** (observed in the built-in browser, behaviour and structure only, no forms submitted, no assets downloaded), **REPO** (public GitHub repository read through the API, summarised not copied).

Our domain foundation (`docs/modules.md`, tests T1 to T22) remains the source of truth for behaviour. Everything below informs UI and product decisions only.

## 1. Amazon (SITE PEEL)

Already documented in `site-peel-inventory.md` and `site-peel-analysis.md`. Summary of what exists: `recon/` (9 pages: home, sign-in step 1, deals frame, gift cards, account hub, profile hub, returns hub, help hub, recommendations) and `recon-v2/` (PDP in an unshippable state, search results, cart with 4 items, an early checkout step, sign-in step 1). No Amazon mobile captures; no Amazon order list, order detail, registration or password step.

## 2. Flipkart (SITE PEEL, in `recon-v2/`)

Five Flipkart items exist (the file names are page titles; the saved routes are given below with query strings removed):

| File | Saved route | What it actually is | Usable? |
|---|---|---|---|
| `Online Shopping India Mobile, Cameras, ... Flipkart.com.html` (+ 95-file folder) | `/login/ivr` | **Logged-out home** with the **login modal in its OTP / voice-verification step** ("Verification call initiated on <masked number>", resend countdown). 99 images, 445 links, category strip, hero and product rails, long SEO text | Yes: home structure, header menus, login-by-phone/OTP flow |
| `SABR Modern Arabic Numeral Watch ... .html` (no folder) | `/viewcart` | **Cart with 1 item** (title is the item's product title, not a PDP). Delivery-pincode check, item row, Save for later / Remove / Buy this now, "Items you may have missed" rail, Recently viewed rail, Price Details, trust line, Place Order | Yes: cart + price breakdown |
| `Viewcheckout Store Online ... Flipkart.com.html` (+ 38 files) | `/viewcheckout` | **Checkout "order summary" step** (second of three): delivery address summary with Change, item summary with installation add-on and delivery date, cancellation notice, email-required notice, GST-invoice option, terms notice, Price Details, **Continue** | Yes: order summary step |
| `Flipkart Payments Page.html` (+ 19 files) | `/payments` | **Checkout "Step 3 of 3: Payments"**: payment options list, gift-card prompt, COD fee note, itemised price details, Place Order | Yes: payment step |
| `Flipkart.com_ Your Order History_files/` | (no HTML) | **Assets only** (3 product thumbnails, nav/footer icons, CSS chunk names `NavMenu`, `SelfServe`). Orders list structure is **NOT OBSERVED** | Assets only |

Not captured for Flipkart: product detail page, search results, category listing, account page, order detail, registration, mobile DOM, empty cart.

### Flipkart privacy check (FOUND / NOT FOUND; no values reproduced)

| Type | Home | Cart | Checkout step | Payments | Order history |
|---|---|---|---|---|---|
| Customer name / greeting | NOT FOUND | **FOUND** (account menu greeting) | **FOUND** (name beside the address) | NOT FOUND | n/a |
| Street address | NOT FOUND | NOT FOUND | **FOUND (full postal address)** | NOT FOUND | n/a |
| Postal code / city | NOT FOUND | partial (pincode field) | **FOUND** | NOT FOUND | n/a |
| Phone number | **Partially masked by the site** (verification message) | NOT FOUND | NOT FOUND | NOT FOUND | n/a |
| Email | NOT FOUND | NOT FOUND | NOT FOUND | NOT FOUND | n/a |
| Tokens / identifiers | FOUND (inline config, ids) | FOUND | FOUND | FOUND | FOUND (script bundles) |
| Payment card data | NOT FOUND | NOT FOUND | NOT FOUND | NOT FOUND (options list only) | NOT FOUND |
| Order numbers | NOT FOUND | NOT FOUND | NOT FOUND | NOT FOUND | no HTML |

The checkout-step capture contains a complete real address and name (the same person as the Amazon captures). It is ignored by git like the rest of `recon-v2/`. Disclosure: while inspecting this file, tool output transiently showed that name and address in the working session; nothing was written to the repo, docs or logs. Treat this capture like the Amazon checkout capture: local-only, recapture from throwaway data if it must be shared.

## 3. Open-source references (REPO)

| | Your Next Store (YNS) | shadcnspace ecommerce template |
|---|---|---|
| URL | github.com/yournextstore/yournextstore | github.com/shadcnspace/ecommerce-shadcn-nextjs-template |
| Size / activity | about 5.5k stars; pushed 2026-10-01; 689 files (427 are bundled Next.js docs) | 5 stars; pushed 2026-05-21; 130 files |
| Stack | Next.js 16, React 19, Tailwind 4, shadcn-style `ui/`, Biome, Bun, `commerce-kit` SDK + Stripe, `better-auth` route, Tiptap | Next.js 16.1, React 19, Tailwind 4, shadcn + `@base-ui/react`, Embla, Motion, next-themes, Sonner |
| Data | **Hosted YNS commerce API** (needs `YNS_API_KEY`) via the `commerce-kit` SDK | **Static in-repo data** (`lib/data.ts`), client-side contexts |
| Routes | `/`, `/products`, `/category/[...slugs]`, `/collection/[slug]`, `/product/[slug]`, `/search` (+ loading), `/order/success/[id]`, about, blog, contact, faq, legal, plus error/not-found per segment | `/`, `/shop`, `/shop/[slug]`, `/wishlist`, `/checkout`, `/login`, `/register`, about, contact, faq |
| Cart | Cart sidebar (sheet), cart context with optimistic reducer, pure `cart-math` with tests, discount-code field | Cart sidebar + cart context (client), wishlist context |
| Checkout | **Delegated to a proxied platform checkout** (inline email-code sign-in); no in-repo checkout UI | In-repo `checkout-form` (client demo) |
| Auth / account | **None in app** (platform-hosted `/account`) | Login and register pages (UI blocks, no backend) |
| Orders | `/order/success/[id]` only | None |
| Search | Header search with debounced suggestions (cache, keyboard navigation, mobile search input), `/search` page with loading state | None (listing page only) |
| Filters / sort | `product-filters` (URL-driven: category, brand, price slider, variant values; mobile `Sheet`), listing pagination | Category filtering in `shop` |
| Loading / empty / error | `product-grid-skeleton`, `loading.tsx`, per-segment `error.tsx`, `not-found.tsx`, global error | Minimal |
| Notable engineering | AGENTS.md workflow, prerendered-shell checks, contrast tests, money/pricing unit tests, JSON-LD, cookie consent, `llms.txt` | Block-based sections from the shadcnspace marketplace |

Detail and fit analysis: `open-source-reference-analysis.md` and `component-reuse-map.md`.

## 4. Licences (summary; full notes in `open-source-reference-analysis.md`)

| Item | Licence | Status |
|---|---|---|
| YNS repository code | MIT (copyright Your Next Store, Inc.) | Permits reuse with the copyright notice kept |
| **`commerce-kit` (YNS core dependency)** | **AGPL-3.0-only** (npm metadata) | **Different, copyleft licence. Must not be adopted.** Also a client of a hosted paid-service API |
| YNS assets (`public/logo.svg`, `screenshot.png`, `themes/*.png`) | Not separately stated; logo is a brand mark | **UNKNOWN / REQUIRES VALIDATION**; do not reuse |
| shadcnspace template code | MIT (copyright ShadcnSpace) | Permits reuse with notice |
| shadcnspace `public/assets` (42 images, incl. third-party brand logos such as sports/fashion brands, avatars, product photos) | Not separately licensed; brand logos are trademarks | **UNKNOWN / REQUIRES VALIDATION**; do not reuse |
| shadcnspace "blocks" (`components/shadcn-space/blocks/*`) | Under the repo MIT; the shadcnspace marketplace may have its own terms | **UNKNOWN / REQUIRES VALIDATION** beyond the repo licence |

## 5. LIVE BROWSER OBSERVATIONS

Behaviour and structure only; logged-out, default profile, location resolved to India by the site; no forms submitted; no files saved.

| # | Site | Observation |
|---|---|---|
| L1 | Flipkart | The **login modal opens automatically over the home page** and again after interacting with the page. Layout: left blue panel with a value proposition ("Get access to your Orders, Wishlist and Recommendations"), right panel "Log in for the best experience / Enter your phone number to continue", country-code prefix + phone input, **"Use Email-ID"** alternative, terms line, **Continue is disabled until the input is valid**, close (x). A spinner shows while the form loads |
| L2 | Flipkart | Home loads with **skeleton placeholders** (grey button blocks, a bottom-bar of 4 grey circles on mobile) before content |
| L3 | Flipkart (mobile 375) | Stacked header: app switcher segment (Flipkart | Travel), location row ("Location not set / Select delivery location"), full-width search, **horizontally scrolling category tab strip with icons**, hero carousel with dots, 3-up tiles with a coloured label bar ("Min. 70% off") and an "AD" tag, a **bottom navigation bar** (skeleton visible while loading) |
| L4 | Amazon | **Empty cart**: white card with an illustration, "Your Amazon Cart is empty", a text link "Shop today's deals", a primary "Sign in to your account" button and an outlined "Sign up now" button; a separate "Proceed to checkout" panel is still rendered; policy note under it |
| L5 | Amazon | **Search suggestions**: a dropdown under the field with about 9 rows: some rows have a small product thumbnail (product-type suggestions), others a magnifier icon (query suggestions), one row carries a qualifier ("from Top Brands"). A **location notice popover** ("We're showing you items that ship to India...") with Dismiss and Change Address overlaps the list |
| L6 | Amazon (mobile 375) | Header: app-install banner, hamburger, logo, "Sign in" + account icon, cart with count; **search on its own full-width row**; horizontally scrolling quick-link row (Deals, Lists, Video...); a "Deliver to" row with chevron and a dismissible location notice; big rounded promo cards |

Not obtained (deliberately): Amazon password step and wrong-password error (would require submitting an identifier to a live service), PDP purchasable state (the browser's location resolved to a region that triggers the same unshippable state), Flipkart search suggestions (blocked by the login modal), Flipkart empty cart. See the missing-capture reassessment in `page-inventory.md` section 4.
