# Source inventory

Scope: everything under `recon/` (read-only). Counts are exact, from a scripted walk with MD5 content hashing.

## Totals

| Metric | Value |
|---|---|
| Total files | **786** |
| Total size | 92,255,139 bytes (88 MiB) |
| Top-level directories | 1 (`recon/pages/`) |
| Saved pages (main HTML) | 9 |
| Resource folders | 11 (`<page>_files/`) |
| Unique file contents | 491 (295 files are byte-identical duplicates) |
| Duplicate groups | 42 (337 files involved; ~42.2 MB redundant) |
| Zero-byte files | 29 |

## By type

| Type | Files | Bytes | Unique | Notes |
|---|---|---|---|---|
| HTML | 31 | 10.8 MB | n/a | 9 main pages + 22 inside `_files/` (ad/pixel iframes `iu3.html`, `pr.html`, one `saved_resource.html` srcdoc, one ad creative) |
| CSS | 109 | 12.1 MB | 47 | Mostly Amazon AUI/nav/widget bundles, often multi-file concatenations with names like `…_RC_….css` |
| JavaScript | 255 | 64.3 MB | 125 | **All saved with a `.download` extension.** AUI, jQuery, nav, ad, A/B (weblab), Rufus/Alexa+ runtime. Not reusable |
| JPG/JPEG | 207 | 2.8 MB | n/a | Product, tile and promo imagery |
| PNG | 79 | 2.1 MB | 65 | Sprites, tiles, promo art |
| SVG | 27 | 29 KB | **3** | Only `down-arrow`, `submit-button-default`, `submit-button-clicked`, repeated per page |
| GIF | 14 | 36 KB | 3 | 1×1 tracking pixels and a 64×64 loading spinner |
| `.pixel` | 9 | 0 B | 1 | `g.pixel`: empty tracking beacons |
| Extensionless | 53 | 26.6 KB | n/a | 1×1 GIF beacons (`v2`, `a9`, `amazon`, …), a `cm` pixel page, 0-byte stubs |
| Template-placeholder names | 2 | 86 B | n/a | Files literally named `…com&id=${uuid}` and `…${dd_uuid}`: unresolved template variables (incomplete capture) |
| Fonts (woff/ttf/otf) | **0** | n/a | n/a | Not captured |
| JSON / data files | **0** | n/a | n/a | Data is inline in HTML only |
| Video / audio | 0 | n/a | n/a | |

## By page

| Saved page | Resource files | Notes |
|---|---|---|
| Amazon.com. Spend less. Smile more. (home) | 150 | Logged out. 64 JPG, 8 PNG, 36 extensionless beacons |
| Amazon.com Gift Cards | 103 | 44 JPG, 26 PNG tiles |
| Amazon.com Shopping Cart | 102 | **No main HTML.** 55 JS, 26 CSS, 8 thumbnails |
| Amazon.com _ home and kitchen | 92 | **No main HTML.** 35 product JPG, 14 CSS (search-results/listing CSS) |
| Your Amazon.com | 85 | 47 product JPG (recommendation grids) |
| Today's Deals | 54 | Grid is client-rendered; mostly un-captured |
| Your Account | 45 | 13 PNG (account tile icons) |
| Help & Contact Us | 45 | |
| Online Return Center | 44 | |
| Profile Hub | 36 | |
| Sign in | 21 | Logged out; 5 CSS, 16 JS only; no images |

## Classification

### Useful source (use as reference)

- The 9 main HTML files: DOM structure, copy, ARIA, class names, data attributes (see `page-map.md`).
- CSS bundles for tokens: colours, font stacks, radii, shadows, breakpoints (see `design-tokens.md`). Extracted statistics came from all 109 files concatenated.
- Images with product/promo value for visual reference (not necessarily for shipping): see `asset-inventory.md`.
- Cart/listing **CSS** (selectors `.sc-*`, `.s-*`, `.sf-*`): partial structural evidence for the two pages with no HTML.

### Amazon framework / runtime artifacts (do not reuse)

- AUI (Amazon UI) JS/CSS: `a-*` classes, `window.aui`, jQuery bundle, `P.register` module system.
- Navigation runtime (`nav-*`, `navbar` JS), Rufus/Alexa+ assistant panel (`rufus-*`), ad slots (`DAsis`, `iu3`, `pr`, `hvelp-*`, `sct-slot-*`, `hidden-slot-*`), weblab/A-B treatment payloads in `data-clientdata`, CSA (`data-csa-c-*`) instrumentation, UE/`ue_sid` page-timing, CSM, cookie consent (`sp-cc`).
- Tracking pixels: `g.pixel`, `pixel.gif`, `v2`, `a9`, `cm`, etc.

### Suspicious / incomplete / contaminated

- **Extension-injected DOM**: `cte-floating-host`, `cte-clip-*` (clipboard extension), `text-blaze-app-reference`, `GOOGLE_INPUT_CHEXT_FLAG`, `tagfast-profile-marker` with "WXT Shadow Root Reset", and `div` elements whose text is `Test: <selector>` (extension probes).
- **Sensitive**: customer ID, anti-CSRF tokens, WebAuthn challenge values, encoded actor ID in the Profile Hub URL, plus a logged-in user's name. Never copy.
- **Incomplete**: no main HTML for Shopping Cart and Home & Kitchen; two `${uuid}` template files; 29 zero-byte files; Today's Deals grid not rendered; the Sign-in page has no images.
- **Corrupt metadata**: two 4–5 KB PNGs in Home & Kitchen report absurd dimensions (65536×4292542596) when read; likely not valid standard PNG headers. Treat as unusable until verified.

### Can be ignored

All JavaScript (`*.download`), all ad/tracking HTML and beacons, zero-byte files, `${uuid}` files, extension DOM, `saved_resource*`.

## Duplicates

Heavy cross-page duplication is a capture artifact (each page saved its own copy of shared resources): 39 content groups appear in more than one page folder (308 files), including 152 shared JS files, 71 shared CSS files, and the three SVGs repeated 9×. Dedupe by hash before any asset import. The largest single duplicate class is Amazon's runtime JS (up to 11 copies of 1–2 MB each).

## Page-specific vs shared

- **Shared across pages**: navigation sprite PNG (10 pages), the 3 SVGs, loading GIF, `Shopping-Deals_360x360.png` (6 pages), shared CSS/JS bundles.
- **Page-specific**: Gift Cards tiles/occasion art, home promo cards (`_SR210,210_`, `_SR427,684_`), Deals jpgs, Your Amazon.com recommendation thumbnails, Home & Kitchen product images, cart thumbnails, account tile icons.
