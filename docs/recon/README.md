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

## Findings that change the plan

1. **The money pages are missing.** PDP, search results, cart (HTML), checkout, orders and order detail have no captured DOM. Phase 1 cannot be reconstructed faithfully from `recon/` alone. See "Site Peel handoff" in the Phase 0 report and `amazon-flow-map.md`.
2. **Privacy: `recon/` holds a live customer's identifiers.** The logged-in pages embed a customer ID, CSRF/anti-forgery tokens, session-scoped values, and the Profile Hub URL carries an encoded actor ID. `recon/` is therefore git-ignored and must never be committed or pasted into docs. The customer name and ID are deliberately not repeated in `docs/`. Consider re-capturing from a throwaway account and rotating the session of the captured one.
3. **Browser-extension contamination.** The saved DOM includes nodes injected by extensions (Chrome Text Blaze, a clipboard extension `cte-*`, a Google Input Tools flag, a "WXT" shadow-root marker, and a "tagfast-profile-marker"). They are noise, not Amazon markup.
4. **No fonts were captured.** `@font-face` rules reference remote `m.media-amazon.com` WOFF files for **Amazon Ember**, which is proprietary. We need a substitute. See `design-tokens.md`.
5. **Amazon's logo exists only as a CSS sprite** (`nav-sprite-global-1x…png`, 350×450). It is a trademark asset; shipping it is a legal/brand decision (see `asset-inventory.md`).
6. **The deals grid and several home cards are client-rendered** and were not fully captured (Today's Deals has only 22 images and a filter-bubble row).
7. **Everything is a desktop capture.** There is no mobile DOM. Responsive behaviour is inferable only from CSS media queries.

## Conventions

- "Observed" = visible in captured DOM/CSS. "Inferred" = deduced from CSS selectors only. "UNKNOWN / REQUIRES VALIDATION" = no evidence.
- Page names use the saved file names in `recon/pages/`.
