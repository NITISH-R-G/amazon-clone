# Design evidence (recon-v2)

Only what the five new captures support, measured from their CSS (129 files, 6.7 MB) and DOM. Frequencies are declaration counts across all bundles: **prevalence, not intent**. This extends `design-tokens.md` (which came from `recon/`); where both agree it is marked CONFIRMED, where `recon-v2` adds something it is marked NEW. No exact value is claimed where it could not be established; computed styles were not captured (static CSS only, no rendered screenshots).

## Typography

| Item | Evidence | Status |
|---|---|---|
| Families | `Amazon Ember` (about 340 declarations, usually `"Amazon Ember", Arial, sans-serif`); `Arial, sans-serif` fallback. No font files captured | CONFIRMED |
| Base sizes (AUI classes) | `a-size-large` 24 px / 32 px line height; `a-size-medium` 18 / 24; `a-size-base` 14 / 20; `a-size-small` 12 / 16 | CONFIRMED + NEW (large and medium exact) |
| Product title | `h1#title` with `a-size-large`: 24 px / 32 px; long strings wrap with `word-break` | NEW |
| Weights | Not reliably extractable per element; titles and prices render bold or medium; body regular. Ember weights 200/400/500/700 per `@font-face` | PARTIAL |
| Rating stars | Glyph 80 x 18 px (`a-icon-star`), mini/small variants | NEW |
| Letter-spacing / measure | Not extractable | UNKNOWN |

## Colour

| Role | Value | Evidence |
|---|---|---|
| Primary text | `#0f1111` (about 1,160) | CONFIRMED |
| Secondary text | `#565959` (`a-color-secondary`) | CONFIRMED |
| Borders / dividers | `#d5d9d9` (636), `#e3e6e6`, card border `#f5f5f5` (1 px on result cards) | CONFIRMED + NEW |
| Subtle fill | `#f0f2f2`, `#f7fafa` | CONFIRMED |
| Link | `#007185` (teal), hover `#c7511f` (orange-brown), older blue `#2162a1` | CONFIRMED |
| Input border / outline | `#888c8c` | CONFIRMED |
| Primary button | `#ffd814` fill and border; **hover `#ffce12`** | CONFIRMED + NEW (hover) |
| One-click / Buy Now | `#ffa41c`; **hover `#ff8400`** | CONFIRMED + NEW (hover) |
| Error and price red | `#c10015` for `a-color-price` and alert borders/text (the older `#b12704` is a fallback) | NEW |
| Header bar | `#131921` default (seasonal variants exist) | CONFIRMED |

## Spacing

AUI spacing classes: 4 / 8 / 12 / 16 / 24 px (`mini`, `small`, `base`, `medium`, `large`). Column layout on the PDP uses fixed widths: buy box 244 px wide with a 20 px margin; centre column reserves 300 px on the right. Result cards use a 4-column-per-row grid system (`sg-col-*`, 24-column units). Cart images 180 px, result images 218 px high, thumbnails 40x60 (gallery) and 64 to 80 px (swatches). Major vertical rhythm between sections: 12 to 24 px.

## Radii, borders, shadows

| Item | Evidence | Status |
|---|---|---|
| Radii | `8px` (423), `4px` (345), `2px`, `3px`, `50%` (181) | CONFIRMED |
| Result card | `border-radius: 4px`; `1px solid #f5f5f5` | NEW |
| Focus ring | `2px solid #888c8c`, `outline-offset: 2px`, `border-radius: 5px` on links; same on buttons | CONFIRMED |
| Alerts | 2 px border in the alert colour plus a **12 px left border** (error `#c10015`) | NEW (we will not copy the thick left border) |
| Shadows | Mostly `none`; elevation is border-based | CONFIRMED |

## Controls

| Control | Evidence |
|---|---|
| Primary button | Yellow, pill-ish rounded, dark text; secondary and one-click variants as above |
| Input | Text inputs with a grey border and a clear (x) button on the sign-in identifier field; select styled as a facade with a caret SVG |
| Quantity | Dropdown/stepper with "Qty:" label and an explicit Update action; live status text |
| Checkbox / radio | Native-styled with Amazon icon classes; filters are long checkbox lists |
| Error text | Inline alert box with icon, one short sentence |

## Responsive evidence

Media-query prevalence (px): `min 1700` (60), `min 1280` (51), `min 1100` (48), `max 1000` (41), `min 1250`, `max 1279`, `min 360` (12), `max 359` (12), `min 1332`, `min 1025`. The PDP carries `min-width: 1000px` on the header shell. **No mobile DOM and no viewport meta tag** were captured, so the mobile layout is NOT OBSERVED. The only responsive facts are: below 1000 px Amazon serves a different shell; at 360 px there is a breakpoint; widths above 1280 get layout changes.

## Hierarchy summary (qualitative)

Dark header, white content on a light grey page; one dominant action per surface in yellow; price and rating are small and quiet compared with titles; red is reserved for price/deal/error; links are teal and underline on hover; sections are separated by thin rules, not shadows.

## What we adopt (implementation tokens, unchanged except two additions)

Keep the existing tokens in `design-tokens.md` section 2 and add: `--primary-hover: #ffce12`, `--buy-hover: #ff8400`, error and price red `#c10015` as an alternative to `#b12704` (contrast on white is about 6.4:1; either passes AA). Do **not** adopt: 12 px left-border alerts, the sprite-based icons, the Ember typeface, social-proof counters, the dense 4-up result grid as-is.
