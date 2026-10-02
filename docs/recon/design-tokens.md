# Design tokens

Three layers, kept separate (per the brief):

1. **Source-derived**: measured from the supplied CSS (109 files, 12 MB concatenated, 47 unique). Frequencies are declaration counts across all bundles, so they show *prevalence*, not "design intent". Hex values are as found.
2. **Implementation tokens**: what we will define in code (CSS variables mapped into the Tailwind theme / shadcn tokens).
3. **Deliberate improvements**: where we knowingly depart from Amazon, with reason.

Limitations: no captured mobile DOM; no computed-style dump of rendered pages (static CSS analysis only); Impeccable's analysis engine could not be run in this environment (launcher produced no output), so this extraction is manual. Re-run `/impeccable document` once code exists. Anything not measured is **UNKNOWN / REQUIRES VALIDATION**.

## 1. Source-derived tokens

### Typography

| Item | Observed |
|---|---|
| Families | `"Amazon Ember", Arial, sans-serif` (≈370 declarations, primary). `"Amazon Ember Modern Display"` (74) and `"Amazon Ember Modern Text"` (66) on newer widgets. `Arial, sans-serif` fallback (41). `inherit` dominates (723) |
| `@font-face` | 25 rules, Amazon Ember weights **200, 400, 500, 700** (+ italics), WOFF2/WOFF **hosted remotely, not captured** |
| Base | `body{font-size:14px;line-height:20px}` (AUI) |
| Size scale (prevalence) | 14px (1422), 12px (1334), 16px (965), 13px (627), 18px (495), 10px (495), 20px (424), 24px (374), 28px (344), 36px (324), 11px (256), 15px (248), 17px (101) |
| Line heights | 20px (719), 16px (359), 24px (322), 19px (196), 18px (181), `1` (127) |
| AUI size classes | `a-size-base` 14/20; `a-size-base-plus` 16/24; `a-size-small` ≈12/16 (inferred); `a-size-mini` 11/14 |
| Footer | `#navFooter td` 13px / 120% |
| Nav | `#navbar` 12px / `1em`, `min-width:1000px` |

### Colour (by prevalence)

| Role (inferred) | Hex | Count |
|---|---|---|
| Surface white | `#ffffff`/`#fff` | 5,448+222 |
| Primary text | `#0f1111` | 2,526 |
| Secondary text | `#565959` | 1,111 |
| Muted text | `#6f7373`, `#888c8c` | 420, 1,147 |
| Border default | `#d5d9d9` | 1,379 |
| Border light / divider | `#e3e6e6`, `#ddd` | 573, 697 |
| Subtle fill | `#f0f2f2`, `#f7fafa` | 1,039, 506 |
| Link | `#007185` (teal) | 434; hover `#c7511f` (476); `#2162a1`/`#0066c0` older blue links (1,212/84) |
| Header bar | `#131921` (112) |
| Sub-nav bar / footer band | `#232f3e` (245), footer back-to-top `#37475a` (30) |
| Search button / accent | `#febd69` (50), hover `#f3a847` (10) |
| Brand orange | `#ff9900`/`#f90` (310); `#ffa41c` one-click (135) |
| **Primary CTA (yellow)** | `#ffd814` bg, `#fcd200` border (202 / 17); gradient legacy `#f7dfa5→#f0c14b` |
| Price red | `#b12704` (42), `--… #c10015` var fallback; deal badge `#cc0c39` (124) |
| Star / rating | `#ffa41c` and `#de7921` (1) |
| Success green | `#067d62` (23), `#007600` (6) |
| Info blues | `#1c89e3`, `#0a7cd1`, `#0098f8` (decorative widgets) |

Notes: the `#131921` vs `#0f141a` vs green-gradient `#003d32→#04734b` `#nav-belt` rules show **seasonal/variant themes**; the default is `#131921`.

### Spacing (AUI)

| Class | Value |
|---|---|
| `a-spacing-mini` | 4px |
| `a-spacing-small` | 8px |
| `a-spacing-base` | 12px |
| `a-spacing-medium` | 16px |
| `a-spacing-large` | 24px |

So the source scale is **4 / 8 / 12 / 16 / 24** (4px base grid). Nav header height: 60px (55px compact variant).

### Radii

`8px` (791), `4px` (558), `2px` (383), `3px` (216 + 360 compound), `5px` (214), `50%` (283 for circles/avatars). Search submit: `0 4px 4px 0`. Buttons are **pill-shaped** (AUI `.a-button` is fully rounded in newer widgets: UNKNOWN / REQUIRES VALIDATION from static CSS alone).

### Borders, shadows, focus

- Default border: 1px `#d5d9d9`; input border `#888c8c`.
- Card shadow: `0 2px 5px 0 rgba(213,217,217,.5)` (91), `0 2px 4px 0 rgba(0,0,0,.1/.13)`; modal/overlay `0 2px 6px 0 #000` (180). `box-shadow:none` is the most common value (1,518).
- Focus: `.a-button:focus-visible` → `outline: 2px solid #888c8c; outline-offset: 2px`; elsewhere an **orange ring** `0 0 0 2px #F90, 0 0 0 3px rgba(255,153,0,.5)` (150).

### Breakpoints (media queries by prevalence)

`min-width:1700px` (150), `1100px` (120), `max-width:1000px` (102), `min-width:1280px` (98), `1025px` (31), `360px`/`max 359px` (30), `1300px`, `max 420px`, `max 1068px`, `1250px`, `max 1300px`, `max 1279px`, `768px` (15), `1500px`, `max 1200px`. Practical bands: **<360 / 360–767 / 768–1000 / 1001–1279 / ≥1280 / ≥1700**. The header enforces `min-width:1000px` on desktop, meaning Amazon's desktop header does not reflow below 1000px (a separate mobile header is served).

### Surface hierarchy (observed)

page background (light grey, `#eaeded` appears but rarely: UNKNOWN) → white cards → white inputs with grey border → dark header (`#131921`) / sub-nav (`#232f3e`) / footer strip. Elevation is mostly border-based, not shadow-based.

### Interaction states

Hover on links `#c7511f` + underline; button hover darkens fill (`#f7ca00` family: UNKNOWN exact); search submit hover swaps sprite position; focus per above; disabled `opacity` on `.a-button-disabled` (value not measured). **Active/pressed values: UNKNOWN / REQUIRES VALIDATION.**

## 2. Implementation tokens (proposal for Phase 1)

Defined once as CSS variables in the Tailwind/shadcn theme. Names follow shadcn conventions so primitives inherit them.

| Token | Value | Source mapping |
|---|---|---|
| `--background` | `#ffffff` | surface white |
| `--foreground` | `#0f1111` | primary text |
| `--muted-foreground` | `#565959` | secondary text |
| `--border` | `#d5d9d9` | border default |
| `--input` | `#888c8c` | input border |
| `--muted` | `#f0f2f2` | subtle fill |
| `--primary` | `#ffd814` | CTA yellow; `--primary-foreground` `#0f1111` |
| `--accent` (one-click) | `#ffa41c` | buy-now orange |
| `--link` / `--link-hover` | `#007185` / `#c7511f` | links |
| `--destructive` / `--price` | `#b12704` | price/error (verify AA on white; `#b12704` is about 6.6:1; `#007185` about 5.7:1) |
| `--deal` | `#cc0c39` | deal badge |
| `--success` | `#067d62` | in stock, confirmations |
| `--rating` | `#ffa41c` | stars |
| `--header` / `--subheader` | `#131921` / `#232f3e` | header, sub-nav, footer |
| `--search-button` | `#febd69` | search submit |
| `--ring` | `#007185` (2px, offset 2px) | focus (improvement, see below) |
| `--radius` | `8px` (sm 4, md 8, lg 12, full 9999 for buttons) | dominant radius |
| Spacing | 4px grid: 1,2,3,4,6 → 4,8,12,16,24 px | AUI scale; Tailwind default scale is a superset |
| Type scale | 12 / 13 / 14 / 16 / 18 / 20 / 24 / 28 / 36 px; base 14/20 for dense UI, **16/24 for body copy and inputs** | measured scale with 16px floor on form inputs |
| Font stack | `var(--font-sans)` → see substitute below | |
| Breakpoints | Tailwind defaults: `sm 640`, `md 768`, `lg 1024`, `xl 1280`, `2xl 1536`, plus a custom `xs 360` | maps onto observed bands; Amazon's 1000/1100/1280/1700 are noted but we favour Tailwind defaults |

### Font substitute

Amazon Ember cannot be shipped. Recommendation (to confirm in Impeccable direction): a neutral humanist grotesque available via `next/font/google`: **Inter** (closest widely-used UI face; wide language support) or **Open Sans**. Fallback chain `system-ui, Arial, sans-serif`. Weights 400 / 500 / 700 to mirror Ember's 400/500/700. **Needs user confirmation** (Impeccable may argue for a more distinctive choice; the brief forbids needless divergence).

## 3. Deliberate improvements (candidates, to confirm during Impeccable critique)

| # | Change | Why |
|---|---|---|
| 1 | Focus ring `#007185` 2px with 2px offset on all interactive elements (instead of grey/orange mix) | One consistent, ≥3:1 visible ring; Amazon's is inconsistent |
| 2 | 16px minimum on form inputs, 44×44px min target | Prevents iOS zoom; touch accessibility (WCAG 2.5.8) |
| 3 | Fewer text sizes (collapse 10/11/12/13 to 12/14) | Amazon uses ≥14 distinct sizes; clearer hierarchy |
| 4 | Remove sprite-based icons; use a single icon set | Crisp, themeable, accessible |
| 5 | Skeletons instead of spinner GIF | Perceived performance |
| 6 | Single header that reflows (no 1000px minimum width) | Responsive without a separate mobile site |
| 7 | Dark mode: **optional (P3)** | Not present in source; do not build unless time remains |
| 8 | Reduced-motion support everywhere | Amazon's carousels auto-advance |

Every item adopted gets an entry in `docs/product-decisions.md`.
