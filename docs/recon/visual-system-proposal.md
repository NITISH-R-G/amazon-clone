# Visual system proposal

Status: **proposal, not implemented.** The tracer's provisional look borrows Amazon's colour roles (yellow primary, navy header). This proposal replaces that with an original identity while keeping the commerce interaction conventions shoppers rely on. The Impeccable detector already flags Inter as an overused face (D18). Impeccable `shape`/`critique` runs on the first implemented system, not before; `DESIGN.md` is recorded afterwards with `impeccable document`.

## What the evidence says we must NOT reproduce

Amazon: dark navy header bars, yellow/orange action buttons, the Ember typeface, dense text-link navigation, the 4-up result grid. Flipkart: blue brand colour and yellow brand tiles, percentage-off label bars, dense promo rails. YNS and shadcnspace: very rounded image wells and marketing-style sections. We keep **roles and affordances**, not looks: one dominant action per surface, price and rating placement, quiet borders instead of shadows, visible focus.

## Direction: "calm market"

A bright, warm-neutral surface with one confident green for action and quiet ink for everything else. It should feel like a well-run independent store: clear, trustworthy, a little editorial, never shouting. Red is reserved for errors; savings are shown in the action green (positive), not red.

## Colour (roles first; hex are starting values to be tuned in Impeccable and checked for AA)

| Role | Direction | Starting value | Contrast note |
|---|---|---|---|
| Page surface ("paper") | warm off-white | `#f7f5f0` | |
| Card surface | white | `#ffffff` | hairline border `#e6e2d8` |
| Image well | slightly deeper warm | `#f1eee7` | |
| Ink (text) | warm near-black | `#171715` | about 16:1 on white |
| Muted text | warm grey | `#5c5b55` | about 6.7:1 on white, about 5.9:1 on paper |
| **Primary action** | deep pine green | `#0f5c4a` (hover darker `#0b4a3b`) | about 7.9:1 against white text |
| Secondary action | ink outline | border `#171715` | |
| Buy-now | solid ink | `#171715` on white text | |
| Savings / in stock | primary green | `#0f5c4a` | positive, not red |
| Deal badge | tint + ink | background `#e3efe9`, text `#0b4a3b` | |
| Error / destructive | crimson | `#b3261e` | about 6.4:1 on white |
| Link | primary green, underlined on hover | `#0f5c4a` | |
| Focus ring | 2 px primary with 2 px offset | `#0f5c4a` | visible on paper and white |
| Header | light, hairline bottom border | white on `#e6e2d8` | |

Dark mode: not planned (P3). Tokens stay role-based so it can be added.

## Typography

- **Family**: one humanist-geometric sans for the whole UI. Recommendation to validate in Impeccable: **Figtree** (via `next/font`, not on the detector's overused list), weights 400, 500, 600, 700. Replace Inter once confirmed (user decision on font substitution is still open).
- **Numerals**: `font-variant-numeric: tabular-nums` for prices, quantities and totals so columns align.
- **Scale** (px / line-height): 12/16 caption, 14/20 secondary, **16/24 body and inputs (minimum for inputs)**, 18/26 card titles and section lead, 20/28 price in cards, 24/32 PDP title, 32/40 page and hero titles, 40/48 hero display. Weight steps: 400 body, 500 UI labels, 600 titles, 700 price emphasis.
- **Price typography**: whole amount large, currency symbol and cents smaller and raised (as in the tracer `PriceBlock`), full amount exposed to screen readers once.
- **Measure**: body 65 to 75 characters; product titles clamp to 2 lines in cards.

## Spacing

4 px base, steps 4, 8, 12, 16, 24, 32, 48, 64. Card padding 12 to 16; grid gaps 16 (cards) and 24 (page columns); section spacing 32 to 48 desktop and 24 to 32 mobile; **tight inside groups, generous between groups**; touch targets at least 44 px; page gutter 16 mobile, 24 tablet, 32 desktop; content max width about 1200 to 1280 px.

## Radii and borders

Controls 8 px; cards and image wells 12 px; chips and badges fully rounded; sheets 16 px on their free corners; avatars 50%. Borders are hairline (1 px) in the warm border colour; focus uses a ring, not a thicker border.

## Surface hierarchy

1. Paper (page) 2. Card (white, hairline border, no shadow at rest) 3. Image well inside cards 4. Raised overlays (popover, dropdown, sheet, dialog): white with a soft shadow (`0 8px 24px rgb(23 23 21 / 0.12)`) and a hairline. Elevation is mostly **border-based**; shadows only for things that float. No nested cards.

## Button language

Primary: solid pine, white text, 10 px radius, medium weight. Secondary: ink outline on white. Quiet: text button in the link colour. Buy now: solid ink. Destructive: text in crimson with confirmation. All: visible focus ring, disabled state keeps readable contrast plus an explanatory message (never a silent grey button), loading state replaces the label with a short progress label and prevents double submit. Icon buttons have a visible label or tooltip and an accessible name.

## Card treatment

Product card: image well (square or 4:5), then title (2 lines), rating (stars + count), price (+ list price), one cue line (stock, delivery) and an action. Deal and low-stock cues are text or small tint badges, never red banners. Hover/focus lifts the card with a border-colour change and a short shadow; the whole card is **one link** (accessible name = title + price). No sponsored or "bought in past month" claims.

## Navigation treatment

Header is light with a hairline: wordmark, a large search field that is the visual centre, account menu, cart with a count badge. Below it a short category strip with icons (scrolls horizontally on small screens). Checkout and sign-in use a reduced header (wordmark, step label, secure note). On mobile: search on its own row, category strip, optional bottom bar for Home / Search / Cart / Account (decision pending). Active states use weight and an underline, not colour alone.

## Motion

Few, short, purposeful. Ease-out exponential, 150 to 220 ms. Opportunities: cart count "bump" when an item is added; add-to-cart confirmation slides in and out; filter sheet and mobile menu slide; image cross-fade in the gallery; skeleton shimmer (static under `prefers-reduced-motion`). No auto-advancing carousels, no parallax, no scroll-jacking. All motion respects `prefers-reduced-motion`.

## Implementation notes (not started)

- Express as CSS variables mapped to shadcn tokens (`--primary`, `--background`, `--card`, `--border`, `--ring`, `--radius`, plus `--paper`, `--well`, `--ink`) in `globals.css`; do not hard-code hex in components.
- Replace the tracer's yellow primary and navy header in the visual-system slice; domain code is untouched.
- Validate contrast with the existing contrast approach (hand-checked ratios above; add an automated check in the slice).
- After the first implemented system: Impeccable `critique`, then `audit`, then `polish`, as planned in `docs/agents/workflow.md`.

## Open decisions for the user

1. Approve the "calm market" direction (green, warm paper) or request another.
2. Confirm Figtree (or another non-Inter face).
3. Logo/wordmark approach (placeholder "Cartly" stays until decided).
4. Mobile bottom bar: yes or no.
