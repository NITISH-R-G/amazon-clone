# UI policy and shadcn/ui requirements

Read before any UI work. Design context for Impeccable is `PRODUCT.md`; tokens are in `docs/recon/design-tokens.md` §2; component boundaries are in `docs/recon/component-inventory.md`.

## Policy

- **shadcn/ui is the primary primitive layer.** Use an existing shadcn primitive wherever one fits; do not recreate it.
- Do not add another UI library when shadcn/ui is sufficient. Icons: `lucide-react` (shadcn default).
- If a needed primitive is missing from shadcn **and** the component materially affects the design, name it and **ask the user before inventing a replacement**. Small compositions of existing primitives (below) do not need to be asked about.
- Install components **on demand**, one slice at a time, with the shadcn CLI. Do not install the whole registry.
- Consistent spacing (4 px grid), type scale, interaction states (default, hover, focus-visible, active, disabled, loading, error), accessibility and responsive behaviour come from tokens and primitives, not per-component overrides. One focus ring everywhere.
- Presentational components take plain typed props; no data fetching inside primitives.

## Required shadcn components (validated against the planned UI)

Status of the repo today: no `components.json`, nothing installed. **Already available: none.** "Install" below means `shadcn add <name>` during the slice that first needs it.

### Install: P0-A (demo-critical path)

| Component | First needed by | Why |
|---|---|---|
| `button` | everything | CTA yellow primary, buy-now orange, secondary, ghost, icon variants |
| `input` + `label` | search, forms, quantity | Search box, address/payment fields |
| `select` | header department picker, quantity, sort | Native `<select>` is acceptable inside the header search; shadcn `select` elsewhere |
| `badge` | cards, header cart count, deals | Deal %, stock, cart count |
| `card` | product card, home promo, order card | `a-cardui` analogue |
| `separator` | PDP, cart, checkout summary | |
| `skeleton` | every data route | Replaces Amazon's spinner GIF (decision D8) |
| `sonner` | add-to-cart, errors | Toast with "View cart" and undo |
| `dropdown-menu` | account menu in header | Click/focus-operable, not hover-only |
| `sheet` | mobile menu, mobile filters (side=bottom) | Covers the "drawer" need; the separate `drawer` (vaul) is **not** installed |
| `checkbox`, `radio-group` | search filters, delivery options, payment method | |
| `form` (or current shadcn form/field primitive; confirm at install) | checkout, auth | zod + react-hook-form validation at the boundary |
| `breadcrumb` | results, PDP | Category context; confirm design against PDP capture first |
| `pagination` | search results | Sort/filter live in the URL |
| `aspect-ratio` | product images | Stable layout, no CLS |

### Install later: P0-B / P1 / P2 (do not install in P0-A)

| Component | Needed by | Tier |
|---|---|---|
| `alert` | inline error/empty banners, checkout errors | P0-B |
| `dialog` | location chooser, cancel-order confirm | P0-B |
| `tabs` | order filters, account sections | P1 |
| `popover` + `command` | search suggestions combobox | P1 |
| `tooltip` | help hints ("How do I find this?") | P1 |
| `accordion` | Help/returns FAQ | P2 |
| `textarea` | reviews | P2 |
| `carousel` (embla) | **only if** CSS scroll-snap rails prove insufficient | P1 |

### Not needed (do not install without a reason)

`navigation-menu` (sub-nav is a scrolling link list), `hover-card`, `avatar`, `table` (orders use cards), `scroll-area`, `toggle-group` (variant picker composes `radio-group`), `drawer`, `calendar`, `chart`, `resizable`, `sidebar` (account nav is a small link list).

## Custom composition from primitives (no ask needed)

| Component | Built from | Notes |
|---|---|---|
| `ProductCard` | `card`, `aspect-ratio`, `badge` | Whole-card link; 1 to 4 line clamp |
| `ProductRail` | CSS scroll-snap container + `button` | Add `carousel` only if needed |
| `RatingStars` | lucide `Star` + `sr-only` text | Not a shadcn primitive; low design risk |
| `QuantityStepper` | `button` + `input` (or `select` for 1..10) | Not a shadcn primitive |
| `VariantPicker` | `radio-group` styled as swatches/pills | Availability states per option |
| `SearchBar` | `input`, `select`, `button` | Header form, `role=search` |
| `CartCountBadge` | `badge` | Live-region announcements |
| `AccountMenu` | `dropdown-menu` | |
| `OrderTimeline` | plain list + lucide icons | |
| `AddressSelector`, `PaymentSelector` | `radio-group`, `card`, `form` | |
| `PageStates` (loading/empty/error) | `skeleton`, `alert`, `button` | Only extract a shared helper once repetition appears |

## Truly custom (no shadcn equivalent; confirm before building if design-critical)

| Component | Reason | Needs user ask? |
|---|---|---|
| `PriceBlock` | Amazon price typography: superscript currency symbol and cents, strike-through list price, screen-reader full price | No: typography task, covered by the tokens |
| `ProductGallery` | Thumbnail rail + zoom/large image, keyboard and swipe | **Yes**, once the PDP capture exists (materially affects the design) |
| `AmazonHeader` / `CategoryNav` / `Footer` layout | Brand-specific shell | No: composed from primitives, verified against `docs/recon/page-map.md` |
| Logo / wordmark | Trademark decision pending | **Yes** (see `docs/recon/asset-inventory.md`) |

## Before Phase 1

1. `pnpm dlx shadcn@latest init` (Phase 1 scaffold step, not now) with tokens from `design-tokens.md` §2.
2. Install only the P0-A table above, and only as slices need them.
3. Re-validate this list against the PDP, search and checkout source once Site Peel material arrives; amend this file, do not fork it.
