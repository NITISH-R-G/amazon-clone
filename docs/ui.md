# UI policy and shadcn/ui requirements

Read before any UI work. Visual direction: `docs/recon/visual-system-proposal.md` (**approved**, decision D20). Design context for Impeccable: `PRODUCT.md`. Component boundaries: `docs/recon/component-mapping.md` and `component-reuse-map.md`. The visual system is **not implemented yet**; the current tracer UI is provisional (D19) and uses an older yellow/navy look that the visual-system slice replaces.

## Policy

- **shadcn/ui is the primary primitive layer.** Use semantic theme tokens (`background`, `foreground`, `primary`, `muted`, `border`, `ring`, `destructive`, ...). Compose domain components from primitives. Do not build a parallel primitive system.
- Use a primitive **only when its semantics match** the UI. Do not use a component because it exists. Do not make every section a `card`; do not round every interactive element.
- Do not add another UI library when shadcn/ui is sufficient. Icons: `lucide-react`.
- If a needed primitive is missing from shadcn **and** it materially affects the design, name it and ask before inventing a replacement. Compositions of existing primitives need no ask.
- Install components **on demand**, one slice at a time, with the shadcn CLI. Never install the registry. Verify a component exists in the installed shadcn version (`field`, `empty`, `command` are newer additions) before relying on it.
- Every interactive component has default, hover, focus-visible, active, disabled, loading and error states where applicable; keyboard and screen-reader operation are part of "done".
- Presentational components take plain typed props; no data fetching in primitives.

## Design language (summary; full detail in the proposal)

Apple-inspired restraint, **not an Apple clone**: no Apple assets, logos, typography or exact layouts. Predominantly monochrome; typography and whitespace carry hierarchy; flat surfaces; hairline borders before shadows; minimal functional shadows; restrained geometry; motion that explains state changes; strong accessibility.

### Tokens (starting values; tune and contrast-check at implementation)

| Group | Decision |
|---|---|
| Palette | White, near-white (`#f5f5f5`), black/near-black (`#0a0a0a`), neutral greys. **No brand hue** (no orange, green, blue, purple, brown) |
| Primary action | Black fill (`--primary: #0a0a0a`), white text; hover `#262626` |
| Secondary action | White/neutral surface, black text, subtle border (`#e8e8e8`; inputs `#d4d4d4`) |
| Text | `--foreground #0a0a0a`; `--muted-foreground #6b6b6b` (about 5.3:1) |
| Semantic only | `--destructive #c8281e` (errors), `--success #1a7f37` (success/savings, sparingly), `--info #0a5bd8` (informational links). Never used as brand or decoration |
| Focus | 2 px `#0a0a0a` ring with a 2 px white offset on every interactive element |
| Radius | Base 8 px; controls 6 to 10 px; larger surfaces (sheet, dialog, image wells) 12 px; badges 6 px. No pill buttons |
| Shadows | None at rest. Only floating layers: `0 8px 24px -8px rgb(0 0 0 / 0.14)` with a hairline |
| Typography | One neutral sans. **Recommendation: Hanken Grotesk** (fallback Public Sans), confirmed by specimens. Not Inter, Geist or Figtree. Weights 400/500/600 (700 rare); tabular numerals for prices, quantities, totals |
| Type scale | 12/16, 13/18 (compact labels), 14/20, **16/24 body and inputs (16 minimum)**, 20/28, 24/30, 32/38 (-0.02em), 40/44 (-0.025em), display at most 56 px; tracking never below -0.04em |
| Spacing | 4 px base: 4, 8, 12, 16, 24, 32, 48, 64, 96. Touch targets at least 44 px |
| Motion | 120 to 200 ms ease-out (sheets 220 to 280 ms); no autoplay, no parallax; `prefers-reduced-motion` respected |

### Component principles

1. **Content over chrome**: imagery and information lead; UI furniture recedes.
2. **One primary action per surface** (black). Secondary is outline; tertiary is quiet text. A disabled primary always explains why.
3. **Group with space and `separator`**, not boxes. Borders only where scanning improves.
4. **Product card**: image-first, no dashboard-card chrome; title (2 lines), optional rating, price hierarchy, one cue line (availability or saving), restrained add action; the whole card is one link.
5. **PDP**: large imagery, clear title, rating, price, variants, availability, delivery, quantity; a **dominant black primary action** (size, contrast, placement, not colour); sticky purchase bar on mobile.
6. **Cart**: product, quantity, price, subtotal, savings, checkout CTA; lines separated by hairlines; recommendations never overpower it.
7. **Checkout**: reduced header, compact step indicator, strong section separation, persistent summary with obvious totals, no promotions.
8. **Destructive actions** are visually restrained (text-weight red) and confirmed or undoable.
9. **States are designed**: skeletons shaped like the final layout, `empty` states with a next action, inline `alert` errors that name the problem and the recovery.
10. **Mobile is designed, not shrunk**: search on its own row, `sheet` menus and filters, stacked layouts, 44 px targets. **No bottom navigation by default**; add only if the decision test in the proposal justifies it.

## shadcn components

Status today: installed `button`, `input`, `label`, `card`, `separator` (the tracer). Everything else is installed in the slice that first needs it.

### Preferred set (install per slice, only when semantics match)

| Component | Use it for | First needed by |
|---|---|---|
| `button` | all actions; black primary, outline secondary, ghost, link | everything (installed) |
| `input`, `label` | text entry (installed) | forms, search |
| `field` | label + description + error composition for forms | checkout, auth (verify availability) |
| `select` | sort, quantity (if a list), department scope | search/results |
| `checkbox`, `radio-group` | facets, delivery and payment options, variant picker | results, PDP, checkout |
| `sheet` | mobile menu, filters, optional mini-cart | shell, results |
| `dialog` | blocking confirmations (cancel order), location chooser | account, orders |
| `popover` + `command` | search suggestions | P1 |
| `dropdown-menu` | account menu | shell |
| `skeleton` | layout-shaped loading (replaces the tracer's pulse blocks) | every data route |
| `alert` | inline errors, availability notices | PDP, checkout, auth |
| `badge` | small neutral labels (savings, low stock) | cards |
| `separator` | grouping (installed) | everywhere |
| `pagination` | results | results |
| `carousel` | manual product rails only if CSS scroll-snap is insufficient; never autoplay | Home, PDP |
| `aspect-ratio` | image wells | cards, gallery |
| `empty` | empty cart, no results, no orders (verify availability) | cart, results, orders |
| `sonner` | undo and add feedback (P1) | cart |
| `slider` | price range facet | results |
| `accordion` | product details, help | PDP |
| `tabs` | order filters (if the semantics fit) | orders |
| `breadcrumb` | only if a breadcrumb is evidenced (none was) | PDP/results |

Not needed unless a need appears: `navigation-menu`, `hover-card`, `avatar`, `table`, `scroll-area`, `toggle-group`, `drawer`, `calendar`, `chart`, `resizable`, `sidebar`. `card` is kept for genuinely bounded objects (address, order summary), not layout.

### Custom composition from primitives (no ask needed)

| Component | Built from |
|---|---|
| `ProductCard` | `aspect-ratio`, `badge`, `button` (no `card` chrome by default) |
| `ProductRail` | CSS scroll-snap (+ manual `carousel` if needed) |
| `RatingStars` | lucide `Star` + hidden text |
| `QuantityStepper` | `button` + `input` (exists) |
| `VariantPicker` | `radio-group` styled as text/swatch options with disabled out-of-stock states |
| `SearchBar`, `SearchSuggestions` | `input`, `select`, `button`; `popover` + `command` |
| `AccountMenu` | `dropdown-menu` |
| `CheckoutSteps`, `OrderTimeline` | plain list + lucide icons |
| `AddressForm`, `PaymentSelector` | `field`, `input`, `radio-group` |
| `PageStates` (loading/empty/error) | `skeleton`, `empty`, `alert`, `button` |

### Truly custom (confirm before building if design-critical)

| Component | Reason | Ask? |
|---|---|---|
| `PriceBlock` | Price typography: whole amount large, raised symbol and cents, tabular numerals, struck list price, screen-reader full price (exists; restyle) | No |
| `ProductGallery` | Thumbnail strip + large image + zoom, keyboard and swipe (exists; extend) | Yes, at the PDP slice |
| Logo / wordmark | Trademark and identity decision pending | **Yes** |

## Before the visual-system slice

1. Confirm the typeface with specimens; add it via `next/font`.
2. Write the tokens above into `globals.css` as shadcn variables; remove the tracer's yellow, navy, `--buy`, `--price`, `--deal`, `--rating`.
3. Add only the primitives the slice needs.
4. After the first real UI exists: Impeccable `critique`, `audit`, `polish`, applied selectively; then `impeccable document` for `DESIGN.md`.
