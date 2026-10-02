# Open-source reference analysis

Sources read through the GitHub API (file lists, README, selected files, package metadata). Nothing was cloned or copied; no source is reproduced here. Evidence label: REPO.

## 1. Licence and reuse check

| Item | Licence | Reuse permitted? | Attribution | Notes |
|---|---|---|---|---|
| `yournextstore/yournextstore` code | MIT (Your Next Store, Inc.) | Yes | Keep copyright and licence notice in copies | Standard MIT |
| **`commerce-kit` 0.65 / 0.66 (YNS's core dependency)** | **AGPL-3.0-only** (npm metadata) | **No, not for us** | n/a | Copyleft: network use triggers source-disclosure obligations. It is also the client for a hosted, key-gated API (`YNS_API_KEY`). **Do not adopt, do not import, do not copy its types.** The repo being MIT does not make its dependencies MIT |
| YNS `public/` (`logo.svg`, `screenshot.png`, `themes/beauty-serene.png`) | Not stated separately; logo is a brand mark of the company | **UNKNOWN / REQUIRES VALIDATION** | | Do not reuse |
| YNS bundled `.next-docs/` (427 files) | Next.js documentation (separate project and licence) | n/a | | Irrelevant to us |
| YNS Tiptap, Stripe, Better Auth, Sonner, shadcn UI primitives | Each package has its own licence (mostly MIT); not individually verified | Per package, only if we adopt it | | We do not plan to adopt any of them from this repo |
| `shadcnspace/ecommerce-shadcn-nextjs-template` code | MIT (ShadcnSpace) | Yes | Keep notice | Standard MIT |
| shadcnspace `components/shadcn-space/blocks/*` | Covered by the repo MIT, but the blocks come from the ShadcnSpace marketplace, which may publish separate terms | **UNKNOWN / REQUIRES VALIDATION** beyond the repo licence | | Treat as inspiration only |
| shadcnspace `public/assets` (42 images: product photos, avatars, **third-party brand logos** for sports/fashion/media brands, hero art) | Not separately licensed; brand logos are trademarks, photos have unknown provenance | **UNKNOWN / REQUIRES VALIDATION** | | Do not reuse any image |

Rule applied: code and assets are never assumed to share a licence. Until validated, nothing from either repository is recommended for copying. Where an idea is MIT-covered and trivial we still re-implement it ourselves.

## 2. Your Next Store (YNS)

**What it is**: an AI-friendly Next.js 16 storefront whose catalogue, cart and checkout are served by a hosted commerce API through `commerce-kit` (Stripe underneath). It ships the storefront UI, not the commerce backend.

**Pages solved (UI)**: home with hero and sections; products listing; category and collection pages; product detail; search page; order-success page; static pages (about, blog, faq, contact, legal); per-segment error and not-found pages.

**Components solved**: product card (with quick add, a second image where available, price range for multi-variant, variant deep link), product grid and skeleton, listing pagination (numbered with ellipsis), product filters (category, brand, price slider, variant values, applied via the URL, mobile sheet), search input + suggestions + mobile search + a controller hook (debounce, in-memory cache, keyboard navigation, prefetch of the results route), cart sidebar (sheet) with optimistic cart context and pure cart math, discount-code field, product reviews + review form, breadcrumbs, route error fallback, cookie consent, newsletter dialog, theme toggle.

**Design system**: shadcn-style `ui/` (accordion, badge, breadcrumb, button, card, checkbox, dialog, dropdown-menu, input, label, pagination, popover, scroll-area, select, sheet, skeleton, slider, sonner, tooltip), Tailwind 4 tokens, rounded (about 16 px) image wells on a secondary-colour background, light/dark via `next-themes`.

**Patterns worth studying (compatible with our architecture)**:
- URL as the state for filters, sort and page (matches our D2 decision and the `search` seam).
- Search suggestions controller: debounce, small LRU cache, `ArrowUp/Down` handling, a "see all results" row, prefetch of the results route.
- Pure money/pricing/cart-math modules with unit tests (mirrors our `lib/money` and `quoteCart`).
- Skeletons per listing and route-level `error.tsx` with a retry that re-renders server components.
- Prerendered shell discipline: keep request-time reads out of the layout; wrap `useSearchParams` consumers in their own Suspense. Relevant when we add search and the header.
- Accessibility baseline items (contrast tests, JSON-LD, semantic headings).
- AGENTS.md style guidance (we already have our own).

**Incompatible or high-debt for us**:
- The whole data layer: `commerce-kit` (AGPL, hosted API, key-gated) and `bigint`-string money shaped by that API. We own our domain (`catalog`, `cart`, `checkout`, `orders`).
- Delegated checkout and account (no checkout UI, no auth, no orders list in the repo): exactly what we must build.
- Server-actions tied to the SDK; tax-behaviour and bundle concepts we do not need.
- Bun, Biome, Husky tooling choices (we use pnpm, ESLint, Vitest).
- Tiptap rich-text rendering and blog/newsletter features: out of scope.

## 3. shadcnspace ecommerce template

**What it is**: a front-end-only demo template. Data is a static array; cart and wishlist are client contexts; login, register and checkout are UI blocks without a backend.

**Pages solved (UI only)**: home (hero, brand slider, category blocks, testimonials), shop listing with category filtering, product detail (overview block), wishlist, checkout form, login, register, about, contact, FAQ.

**Components solved**: product card (image, category, rating, price with original price, badge, wishlist heart, add to cart), product overview (gallery, size selector with out-of-stock options, accordion info, add to cart, wishlist), cart sidebar (sheet) with an empty state, checkout form (email, name, address, card fields), login/register blocks using the shadcn `Field`/`FieldGroup` family, announcement bar, navbar with navigation menu, footer, FAQ accordion, carousel (Embla), confetti on success.

**Design system**: shadcn with `@base-ui/react`, Tailwind 4, Motion for animation, dark mode, Sonner toasts, `Field`/`InputGroup` form primitives.

**Patterns worth studying**: the shadcn `Field` composition for forms (label, description, error in one primitive); size selector with disabled out-of-stock options; cart sheet empty state; accordion for product info; wishlist context as a P3 reference.

**Incompatible or high-debt for us**: client-only state for cart/wishlist (we are server-first), hard-coded product data, no validation, no persistence, demo-only checkout, no real auth, many marketing sections (testimonials, team, logo cloud) irrelevant to a store, and third-party brand imagery.

## 4. What these references can accelerate

| Area | Can accelerate? | How |
|---|---|---|
| Search suggestions (P1) | Yes (pattern) | Reimplement the debounce/cache/keyboard model against our `search.suggest` |
| Filters + sort + pagination | Yes (pattern) | URL-driven controls composed from shadcn `checkbox`, `slider`, `select`, `sheet`, `pagination` |
| Product card, gallery, variant picker | Partly | Layout ideas only; our data shapes differ |
| Cart sheet / mini-cart | Partly | Optional (we have a cart page); empty state and optimistic update ideas |
| Forms (address, auth) | Yes (pattern) | shadcn `Field` composition if the installed shadcn version provides it |
| Checkout, account, orders | **No** | Neither repo implements them for real |
| Loading / error system | Yes (pattern) | Per-route skeletons and retry boundaries |
| Backend / domain | **No** | Our modules are the foundation |

Conclusion: the references can speed up **UI composition and interaction conventions**, not product logic. No code needs to be copied; adopting either as a base would conflict with our architecture and, in YNS's case, with its AGPL dependency.
