# Recon: what the supplied source actually contains

Source of truth for the Amazon reconstruction. Every statement here comes from inspecting `recon/` (read-only, git-ignored). Anything not established is marked **UNKNOWN / REQUIRES VALIDATION**.

Inspected 2026-10-02 (Phase 0). Method: file inventory with content hashing and image-header parsing, DOM inspection with cheerio, CSS statistics. Scripts were run from a scratch directory; nothing was written into `recon/`.

## One-paragraph summary

`recon/pages/` is a Chrome "Save page as, complete" capture of **9 Amazon.com pages** (786 files, 88 MiB). Eight were captured while logged in as a real customer; only the home page and the sign-in page are logged-out views. Two further pages (**Shopping Cart** and **Home & Kitchen** category) have resource folders but **no main HTML**, so their structure is only partly inferable from CSS. **There is no product detail page, no search results page, no checkout, no order list or order detail page.** No font files were saved. Roughly 70% of the bytes are Amazon runtime JavaScript we will not use.

## Documents

| Document | Contents |
|---|---|
| [source-inventory.md](source-inventory.md) | File counts, types, duplicates, junk, what is useful vs ignorable |
| [page-map.md](page-map.md) | Each supplied page: URL, state, structure, what it tells us |
| [component-inventory.md](component-inventory.md) | Component hierarchy: shadcn primitives vs Amazon-specific components |
| [asset-inventory.md](asset-inventory.md) | Images, sprites, SVGs, fonts: reuse, optimisation, licensing safety |
| [design-tokens.md](design-tokens.md) | Source-derived tokens, implementation tokens, deliberate improvements |
| [interaction-map.md](interaction-map.md) | Interactive states observed in the DOM/CSS |
| [amazon-flow-map.md](amazon-flow-map.md) | Core journeys, evidence level per step |
| [privacy-notes.md](privacy-notes.md) | Sensitive material in `recon/`, protection status, recapture needs |
| [site-peel-request.md](site-peel-request.md) | Exact captures still needed (P0/P1) |
| [site-peel-inventory.md](site-peel-inventory.md) | What `recon-v2/` actually contains, privacy check |
| [site-peel-analysis.md](site-peel-analysis.md) | PDP, search, cart, checkout, sign-in findings; decisions; differentiation |
| [asset-analysis.md](asset-analysis.md) | `recon-v2` assets by category A to D |
| [design-evidence.md](design-evidence.md) | Tokens and styles supported by `recon-v2` |
| [component-mapping.md](component-mapping.md) | Evidence to components to shadcn; route impact |

## Findings that change the plan

1. **The money pages are missing.** PDP, search results, cart (HTML), checkout, orders and order detail have no captured DOM. Phase 1 cannot be reconstructed faithfully from `recon/` alone. See [site-peel-request.md](site-peel-request.md) and `amazon-flow-map.md`.
2. **Privacy: `recon/` holds a live customer's identifiers.** See [privacy-notes.md](privacy-notes.md). It is git-ignored and must never be committed or pasted into docs.
3. **Browser-extension contamination.** The saved DOM includes nodes injected by extensions (Chrome Text Blaze, a clipboard extension `cte-*`, a Google Input Tools flag, a "WXT" shadow-root marker, and a "tagfast-profile-marker"). They are noise, not Amazon markup.
4. **No fonts were captured.** `@font-face` rules reference remote `m.media-amazon.com` WOFF files for **Amazon Ember**, which is proprietary. We need a substitute. See `design-tokens.md`.
5. **Amazon's logo exists only as a CSS sprite** (`nav-sprite-global-1x…png`, 350×450). It is a trademark asset; shipping it is a legal/brand decision (see `asset-inventory.md`).
6. **The deals grid and several home cards are client-rendered** and were not fully captured (Today's Deals has only 22 images and a filter-bubble row).
7. **Everything is a desktop capture.** There is no mobile DOM. Responsive behaviour is inferable only from CSS media queries.

## How to use this source

- Read these docs first; then read targeted parts of `recon/` (ranges, grep), never whole files. The filesystem is the source of truth; do not copy captures into context or docs.
- Preserve the captures as evidence; extract only what a slice needs and rebuild it in our own components. Do not copy Amazon scripts, tracking, A/B machinery, tokens or proprietary behaviour.
- Keep reconstruction (what Amazon does) separate from improvement (`docs/product-decisions.md`).
- New captures arrive in `recon-v2/` per [site-peel-request.md](site-peel-request.md); the same rules apply.

## Conventions

- "Observed" = visible in captured DOM/CSS. "Inferred" = deduced from CSS selectors only. "UNKNOWN / REQUIRES VALIDATION" = no evidence.
- Page names use the saved file names in `recon/pages/`.
