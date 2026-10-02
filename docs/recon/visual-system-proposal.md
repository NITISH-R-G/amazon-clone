# Visual system: approved direction

Status: **APPROVED DIRECTION (user override, 2026-10-02). Not implemented.** This replaces the earlier "calm market" proposal, which is rejected and not preserved (no warm paper surfaces, no green or orange brand, no earthy palette, no generic friendly-ecommerce styling, no heavy rounding, no heavy shadows, no decorative gradients). Decision record: D20 in `docs/product-decisions.md`. Implementation rules: `docs/ui.md`.

## Direction in one paragraph

Premium, product-first commerce with **Apple-level restraint**: predominantly monochrome (white, near-white, black, near-black, neutral greys), typography and whitespace carrying hierarchy, flat surfaces with hairline borders, restrained geometry, and motion that explains state changes. shadcn/ui is the implementation foundation; the identity is ours. It is an inspiration direction, **not an Apple clone**: no Apple assets, logos, SF Pro, or exact layouts. Amazon and Flipkart remain behavioural/product evidence only.

## Principles (design rules we will check against)

1. Content dominates chrome: product imagery and information first, UI furniture second.
2. Controls communicate hierarchy visually: one primary action per surface, clearly secondary alternatives, quiet tertiary actions.
3. Whitespace groups; boxes are the exception. Use spacing and `Separator` before borders, borders before shadows.
4. Motion explains state changes (added, removed, loading, opened). It never decorates.
5. Destructive actions are clear but visually restrained (text-weight red, always confirmed or undoable).
6. Important actions are immediately discoverable (primary action visible without scrolling on PDP, cart and checkout).
7. Typography carries hierarchy (size, weight, tracking) instead of colour or boxes.
8. Borders are extremely subtle.
9. No visual noise: no gradients, no glass, no emoji, no sparkles, no uniform icon-in-circle cards.
10. Responsive behaviour is designed per breakpoint, not merely compressed.

## Colour tokens (shadcn semantic variables)

Monochrome base. **No brand hue.** Semantic colours appear only where meaning requires them and never as decoration. Values are starting points to tune and contrast-check at implementation (ratios computed on white).

| Token | Role | Value | Notes |
|---|---|---|---|
| `--background` | Page | `#ffffff` | |
| `--foreground` | Text | `#0a0a0a` | near-black, about 19:1 |
| `--card` / `--popover` | Raised surfaces | `#ffffff` | |
| `--muted` | Quiet fills, image wells | `#f5f5f5` | near-white neutral (not warm) |
| `--muted-foreground` | Secondary text | `#6b6b6b` | about 5.3:1 on white |
| `--border` / `--input` | Hairlines | `#e8e8e8` (inputs `#d4d4d4`) | extremely subtle; input border slightly stronger for affordance |
| `--primary` | Primary action | `#0a0a0a` | black fill |
| `--primary-foreground` | | `#ffffff` | |
| `--secondary` | Secondary action surface | `#ffffff` with `--border` outline | white/neutral, black text |
| `--secondary-foreground` | | `#0a0a0a` | |
| `--accent` | Hover/selected fill | `#f5f5f5` | |
| `--ring` | Focus ring | `#0a0a0a` (2 px, 2 px offset, white gap) | visible on white and on black buttons |
| `--destructive` | Errors, delete | `#c8281e` | about 5.5:1; text-weight, not filled banners |
| `--success` (semantic) | Success, savings, in stock | `#1a7f37` | about 5.1:1; used sparingly |
| `--info` (semantic) | Informational/link semantics | `#0a5bd8` | about 6.0:1; only when meaning needs it |
| Hover (primary) | | `#262626` | |
| Overlay scrim | Sheets and dialogs | `rgb(0 0 0 / 0.4)` | |

Deliberately **not** used: any orange, green, blue, purple or brown brand colour; the earlier yellow primary and navy header of the tracer are replaced in the visual-system slice. Dark mode is out of scope for now (tokens are role-based so it can be added).

## Typography

**Evaluation (neutral modern sans, free via `next/font/google`, OFL):** Inter and Geist are rejected (the Impeccable detector flags both as overused, and Inter is the tracer's current face). Figtree is rejected by the user's instruction. Shortlist and notes:

| Candidate | Character | Fit for premium commerce | Risk / check |
|---|---|---|---|
| **Hanken Grotesk** | Clean grotesque, balanced, open apertures, quiet personality | **Recommended**: neutral and precise; holds up at large sizes with tight tracking; clear small-size labels | Confirm `tnum` (tabular figures) renders before committing |
| Public Sans | Utilitarian, very neutral, strong numerals | Good fallback: excellent readability and form-heavy UI | Slightly plain at display sizes |
| IBM Plex Sans | Engineered, slightly technical | Credible and sturdy; distinctive numerals | Can feel technical rather than premium |
| Instrument Sans | Refined grotesk with character | Premium feel | Fewer weights on Google Fonts; verify numerals |
| Host Grotesk / Mona Sans / Schibsted Grotesk | Contemporary grotesks | Possible | Check numerals and availability in `next/font` |

**Recommendation: Hanken Grotesk** (fallback Public Sans), confirmed by rendering real price and quantity specimens in the implementation slice. One family for everything; no SF Pro imitation.

- **Weights**: 400 body, 500 UI labels, 600 titles and prices, 700 rare. Restrained.
- **Numerals**: `font-variant-numeric: tabular-nums` for prices, quantities, totals and order tables; `lining-nums`.
- **Scale (px / line-height / tracking)**: 12/16 captions; **13/18 compact UI labels**; 14/20 secondary; **16/24 body and inputs (16 minimum for inputs)**; 20/28 section titles; 24/30 product title in lists; 32/38, -0.02em PDP title and page titles; 40/44, -0.025em hero/display on desktop; display never above 56 px in the product UI. Tracking never below -0.04em. Large headings use balanced wrapping.
- **Measure**: body 65 to 75 characters; product titles clamp to 2 lines in cards.
- **Price hierarchy**: current price semibold and largest; list price struck, muted; saving in `--success` text only when real.

## Shape, spacing, surfaces

- **Radius**: base `0.5rem` (8 px). Controls 8 px (range 6 to 10); larger surfaces (sheets, dialogs, image wells) 12 px; badges 6 px; avatars circular. **No pills for buttons; do not round everything.** One consistent shape language across buttons, inputs, selects, dialogs.
- **Spacing**: 4 px base; steps 4, 8, 12, 16, 24, 32, 48, 64, 96. Section spacing 48 to 96 desktop and 32 to 48 mobile; **space groups, do not box them**. Touch targets at least 44 px. Content max width about 1280 px with generous gutters (16 mobile, 24 tablet, 32 to 48 desktop).
- **Surfaces**: flat. Hierarchy = white page, `--muted` wells for imagery, hairline borders only where scanning improves. **Shadows minimal and functional**: only floating layers (popover, dropdown, sheet, dialog) get a soft shadow `0 8px 24px -8px rgb(0 0 0 / 0.14)` plus a hairline; sticky header uses a bottom hairline; a sticky purchase bar uses a top hairline.

## Component principles (shadcn first)

shadcn/ui is the only primitive layer; use its semantic theme tokens; compose domain components from primitives; no parallel primitive system. Use a primitive **only when its semantics match**:

| Need | Use | Not |
|---|---|---|
| Primary / secondary / quiet actions | `button` (default black, `outline`, `ghost`, `link`) | custom styled `div`s |
| Text entry and forms | `input`, `field` (label + description + error), `label`, `select`, `checkbox`, `radio-group` | bare inputs with ad-hoc labels |
| Overlays | `sheet` (mobile menu, filters, mini-cart), `dialog` (confirm, location), `popover` + `command` (suggestions), `dropdown-menu` (account) | modals for non-blocking tasks |
| Status and feedback | `alert` (inline, specific), `badge` (small neutral labels), `skeleton` (layout-shaped loading), `empty` (no results, empty cart, no orders; verify availability in the installed shadcn version) | banners in brand colour |
| Structure | `separator`, `aspect-ratio`, `pagination`, `breadcrumb` (only if evidenced), `carousel` (manual only, no autoplay) | wrapping every section in `card` |

Rules: **do not make every section a Card**; cards are for genuinely bounded objects (a saved address, an order summary), not for layout. Do not round every interactive element. Do not install a component because it exists (`docs/ui.md`).

## Ecommerce surfaces (what each should feel like)

- **Product card**: image-first, no dashboard-card chrome. Image on a `--muted` well (4:5 or square), then title (2 lines, 500), optional rating (small), price hierarchy, one cue line (availability or saving). A restrained add action (outline or ghost button, always available on touch, on hover or focus on desktop). Border only when scanning needs it (e.g. dense lists). The whole card is one link.
- **PDP**: premium and editorial yet transactional. Large product imagery with a thumbnail strip, clear title, rating, price, variant selection, availability, delivery information, quantity, and a **dominant black primary action** (dominance by size, contrast and placement, not colour). Details below as quiet sections separated by space and hairlines. Mobile: single column and a **sticky purchase bar** (price + primary action) once the buy box scrolls out of view.
- **Cart**: product, quantity, price, subtotal, savings, checkout CTA. Lines separated by hairlines, not boxes. Summary is a quiet column with itemised, honest totals. Recommendations (if any) sit below the cart and never compete with it.
- **Checkout**: calm and trustworthy. A reduced header, a compact step indicator, clear section separation with generous space, a persistent summary with obvious totals, one obvious primary action, no promotions.
- **Search**: a large, precise search field as the header's centre; suggestions in a `command` list; results with a count, sort and short facets; numbered pagination; shareable URL state.

## Mobile (first-class)

Designed, not shrunk: search on its own row; category strip; `sheet` for the menu and filters; stacked layouts; **sticky purchase action on PDP**; 44 px targets; summary after the form on checkout with the total in the button.

**Bottom navigation: not added by default.** Decision test (answer with evidence in the first mobile pass): does it shorten the journeys that matter (Home to Search to PDP to Cart to Checkout) without hiding the purchase action? On PDP and checkout a bottom bar competes with the sticky purchase bar and the keyboard, and cart/search are already in the header. Default: **no bottom bar**; revisit only if tap-count measurements from deep pages show a real problem.

## Motion

Purposeful, short, exponential ease-out, 120 to 200 ms for state changes, 220 to 280 ms for sheets. Examples: add-to-cart button label morphs to "Added" with a check, cart count ticks; item removal collapses with an Undo; gallery image cross-fades; sheet slides; skeletons are static or a very subtle opacity change. **No autoplay carousels, no parallax, no attention-grabbing loops.** Everything honours `prefers-reduced-motion` (instant state changes).

## Accessibility baseline

WCAG 2.2 AA: text at least 4.5:1, large text 3:1, visible 2 px focus ring on every interactive element, keyboard operation, correct landmarks and names, 44 px targets, 200% zoom, reduced motion. Colour is never the only carrier of meaning (errors have text and icon; savings have words).

## Not to look like

Amazon (orange/yellow, navy bars, dense link rows), Flipkart (blue and yellow tiles, discount label bars), a generic shadcn demo (uniform cards, default zinc theme untouched), a Tailwind marketing template (gradient heroes, glass), or an AI-generated ecommerce starter (emoji, sparkles, three-up icon cards, rounded everything).

## Implementation notes (not started)

1. Express tokens as shadcn CSS variables in `globals.css` (plus `--success`, `--info`); no hard-coded hex in components.
2. Replace the tracer's yellow primary, navy header, `--buy`, `--price`, `--deal` and `--rating` tokens in the visual-system slice; domain code is untouched.
3. Swap Inter for the confirmed face via `next/font`; add tabular figures to price components.
4. Automate a contrast check for the token pairs.
5. Impeccable: context updated now (`PRODUCT.md`); after the first real UI exists run `critique`, then `audit`, then `polish`, applying results selectively; record `DESIGN.md` with `impeccable document` once code exists.

## Open decisions

1. Confirm Hanken Grotesk (or Public Sans) after specimen rendering.
2. Wordmark/logo approach (placeholder "Cartly" stays until decided).
3. Dark mode: later or never.
4. Bottom navigation: default no, subject to the decision test above.
