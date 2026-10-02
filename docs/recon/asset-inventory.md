# Asset inventory and strategy

Safety rule for everything below: **nothing is copied out of `recon/` automatically.** Assets are only imported into the app after a per-asset decision recorded here. `recon/` itself is read-only and git-ignored.

"Safe to ship" = acceptable in a deployed public demo (licensing, trademark, privacy). Amazon's promotional art, product photography and brand marks belong to Amazon and its brand partners. The user asked for a reconstruction; the default below is **use as local reference and design target, ship our own or openly licensed substitutes**, unless the user explicitly decides otherwise.

## Summary by category

| Category | Count (unique) | Source path pattern | Format / size | Used where | Direct reuse | Optimise | Duplicated | Safe to ship |
|---|---|---|---|---|---|---|---|---|
| Fonts | **0 captured** | `@font-face` URLs in CSS point to remote `m.media-amazon.com/images/S/sash/*.woff2/.woff` | Amazon Ember (proprietary), weights 200/400/500/700 + italics; "Ember Modern Display/Text" | everywhere | **No** (not supplied, not licensed) | n/a | n/a | **No**; use a substitute (see `design-tokens.md`) |
| Logo / brand marks | 1 sprite | `*/nav-sprite-global-1x-reorg-privacy._CB779528203_.png` | PNG 350×450, 21 KB | header logo, flyout icons, search icon, badges (CSS `background-position`) | Reference only | n/a | 11 copies (identical) | **No** (Amazon trademark). Decision needed: (a) neutral placeholder wordmark, (b) user-approved recreation |
| Icons (UI) | 3 SVGs | `down-arrow.svg`, `submit-button-default-rio-v2.1.2.svg`, `submit-button-clicked-rio-v2.1.2.svg` | SVG, ~1 KB each | select caret, submit buttons | Yes technically, but trivial | no | 9 copies each | Yes (generic shapes), but replace with lucide icons in code |
| Icons (account/help tiles) | 13 + 9 | `Your Account_files/{order,account,security,payment,fshub_*,GiftCard_icon_01,contact_us,11_lists}…`; `Help…_files/fshub_*` | PNG 100–300 px square, 2–16 KB | account tiles, help topics | Reference only | Convert to SVG (lucide) | no | No (Amazon artwork) |
| Loading / UI sprites | 3 | `loading-4x-gray._CB485916920_.gif` (64×64), `thumbs_up/down` (40×40 PNG), `plus_24.png`, `item_search…` (24×24) | GIF/PNG | spinner, feedback | No | Replace with CSS spinner / skeleton | 4 copies (spinner) | Replace |
| Hero / promo banners | ~10 | Gift Cards: `300kb_GCLP-2560x110_US_EN.jpg`, two 1500×362 JPG; Deals: `615ydh9WAXL.jpg` 3000×300; Gift Cards named JPGs 3000×100/150 | JPG, 50–110 KB | page banners | Reference only | WebP/AVIF, responsive `srcset` | no | No (campaign art) |
| Promo tiles (home deck) | ~64 | Home: `*_SR210,210_*.jpg` ×48 (210×210), `_SR427,684_` ×3, named 432×432 category tiles (`kitchen`, `decor`, `furniture`, `beddingbath`, `building`, `action_figures`, `preschool_toys`, `games.png` 187 KB), tall promos 855×1368, 187×435, 217×411 | JPG/PNG, 5–187 KB | home promo cards | Reference only | WebP, `next/image` | no | No (brand/partner imagery) |
| Category / occasion tiles | ~45 | Gift Cards: `Occasion-Tiles_Desktop…` 806×596 (6), `Shop-delivery-by-type…` 800×596 (3), `Brand-Tile_Desktop` 261×261 (5), `Brand-Tile_Mobile` 290×290, 400×50 and 300×50 label strips | PNG, 1–234 KB | gift-card page | Reference only | WebP | no | No |
| Product imagery | ~140 | Gift Cards `_AC_SR480,440_` ×31 (480×440); Home & Kitchen `_AC_UL320_` ×35 (≤320 px); Your Amazon.com `_AC_UL254_SR254,254_` ×19 and `_AC_UL127_SR127,127_` ×28; cart `_AC_UL100_SR100,100_` ×8; Deals `_AC_SF226,226_QL85_` ×6 | JPG, 2–40 KB each | product cards, rails | Reference only | n/a | no | **No** (third-party product photos, books, brand gift cards). Use own/licensed catalogue imagery |
| Responsive variants | inferred | Amazon encodes size in the filename modifier (`_AC_UL320_`, `_SR210,210_`, `_SX/SY…`). Only **one size per image** was captured | | | | | | We generate variants ourselves with `next/image` |
| Tracking / ad / beacon files | ~100 | `g.pixel`, `pixel.gif`, `v2`, `a9`, `cm`, `iu3.html`, `pr.html`, `saved_resource*` | 0–43 B / ad HTML | analytics | **Never** | n/a | many | **No** |
| JavaScript | 125 unique | `*.js.download` | 64 MB | runtime | **Never** | n/a | up to 11× | **No** |
| CSS | 47 unique | `*.css` | 12 MB | styling | **Reference only** (extract tokens, never import) | n/a | many | No (and bloated) |

## Mapping: source asset → eventual application asset

| Source (reference) | Application asset | Notes |
|---|---|---|
| Nav sprite logo | `/public/brand/wordmark.svg`: placeholder wordmark (ours), pending decision | Do not slice the sprite |
| `down-arrow.svg`, submit SVGs | lucide `ChevronDown`, `Search` | |
| Spinner GIF | shadcn `Skeleton` / CSS spinner | |
| Account tile PNGs | lucide icons, one per tile | Consistent 24 px stroke style |
| Hero & promo banners | Generated/own illustrations or neutral gradients, `next/image` | Hero treatment is a design task for Impeccable |
| Product photos | Own demo catalogue (to be decided), 800×800 WebP master + generated sizes | See roadmap open question: product data |
| Category tiles | Own category imagery or colour/illustration tiles | |
| Fonts | `next/font` substitute | See design-tokens |

## Optimisation requirements (apply to anything we ship)

- Convert to WebP/AVIF; serve through `next/image` with explicit `width`/`height` to avoid layout shift.
- Provide `srcset` for 1×/2× and at least three widths for hero and product images.
- Lazy-load below the fold; `priority` only for the hero/LCP image.
- Alt text: Amazon often ships empty `alt` on product images in links; we write meaningful alt (accessibility improvement).

## Risks and open decisions (need the user)

1. **Logo/trademark**: ship a placeholder, or an Amazon-styled recreation the user explicitly approves?
2. **Product photography**: use the captured product JPGs for the demo (convenient, but third-party/Amazon-owned images and low resolution) or source/generate our own?
3. **Fonts**: confirm a substitute (recommendation in `design-tokens.md`) since Amazon Ember cannot be shipped.
4. **Re-capture**: the account pages contain a real customer's session artifacts; if any recon HTML is shared or deployed, sanitise first.
