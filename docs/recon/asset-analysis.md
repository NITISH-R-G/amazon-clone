# Asset analysis (recon-v2)

Nothing is copied into the application. Categories: **A** structural/reference only; **B** potentially reusable after licence/ownership validation; **C** must recreate with our own assets; **D** ignore. Default rule: Amazon marks, product photography and marketing art are **A** (study, do not ship). Dimensions come from image headers; four PNGs have unreadable headers and their reported size is meaningless.

No fonts, no screenshots and no JSON were supplied. 165 images (152 unique); 29 are byte-identical to files already in `recon/`.

| Asset family | Files (examples) | Type / dimensions | Apparent purpose | Safe to reuse? | Category |
|---|---|---|---|---|---|
| Nav sprite (logo, icons, search glyph) | `nav-sprite-global-1x-reorg-privacy._CB779528203_.png` (in all 5 folders) | PNG 350x450 | Header logo, flyout arrows, badges via `background-position` | No. Amazon trademark | **C** (placeholder wordmark, lucide icons) |
| UI SVGs | `down-arrow.svg`, `submit-button-default-rio-v2.1.2.svg`, `submit-button-clicked-rio-v2.1.2.svg`, `rio_right_arrow_white.svg`, `insight_tick.svg` | SVG, about 1 KB each | Select caret, button chrome, tick | Generic shapes but Amazon-authored | **C** (lucide) |
| Alexa symbol | `alexa-a-symbol.svg` | SVG | Assistant branding | No | **D** (out of scope) |
| Other small SVGs (hashed names) | 8 files | SVG | Icons inside A+/widgets | Unknown provenance | **D** |
| Loading spinner | `loading-4x-gray._CB485916920_.gif`, a 52x52 variant | GIF 64x64 / 52x52 | Loading state | Amazon asset | **C** (skeleton / CSS spinner) |
| Pixels / beacons | `pixel.gif`, `g.pixel`, `iu3.html`, others | 1x1 / HTML | Tracking and ads | Never | **D** |
| PDP gallery images | `41Ca2SWj5bL._AC_SR40,60_.jpg` (thumbs), `..._AC_SL1500_.jpg` (938x1500), `..._AC_SY741_.jpg` (463x741) | JPG | Product photography (Amazon-owned device) | No (third-party/brand images) | **A** (layout reference: thumb strip 40x60, large image, zoom) |
| PDP A+ / marketing images | `...CB569423122...` jpg/png, banners up to 5856x900, 2500x1000, 1613x1515 | JPG/PNG, 0.1 to 0.5 MB each | Brand storytelling sections | No | **A** (study section rhythm only) |
| PDP related-item thumbnails | `..._AC_UL165_.jpg` x6 | JPG 165x165 | "Customers also bought" carousel | No | **A** (card size reference) |
| PDP variant swatches | `..._SY66_`, `SY70`, `SY78`, `SY80` jpg | JPG about 65 to 95 x 66 to 80 | Colour/size swatch images | No | **A** (swatch size reference about 64 to 80 px) |
| Search result images | 20 x `..._AC_UY218_.jpg` | JPG about 113 to 328 x 218 | Result card image (height 218) | No | **A** (card image height reference) |
| Search carousel / thumbs | `..._AC_UL320_` x5, `FM-SY150` x11, `FM-SX156` x2 | JPG | Carousel items and small tiles | No | **A** |
| Cart item images | `..._AC_AA180_.jpg` x4 | JPG 180x180 | Cart line image (180 px) | No | **A** (line image size reference) |
| Cart recommendation images | `..._AC_UL165_` x6, `UL200` x1, `AA100` x1 | JPG 100 to 200 | Carousels | No | **A** |
| Checkout imagery | none (one nav sprite, two loading GIFs) | | | n/a | **A** (no imagery to study) |
| Sign-in imagery | none | | | n/a | n/a |
| Badges / thumbs icons | `thumbs_up-*.png`, `thumbs_down-*.png` (40x40) | PNG | Feedback widget | Amazon asset | **D** |
| Unreadable-header PNGs | 4 files (`SS180`, `SY100`, `SS200`) | PNG, bogus size | Unknown icons | Unverified | **D** |

## Responsive image evidence

Amazon encodes the rendition in the filename modifier (`_AC_SR40,60_` thumb, `_AC_UY218_` result card, `_AC_AA180_` cart line, `_AC_SL1500_` zoom master, `_AC_SY741_` PDP display, `_AC_UL165_` carousel). Each image was captured in **one** rendition, so no `srcset` or art-direction evidence exists. This confirms the sizes our components need, not any asset to reuse.

## Mapping to our own assets

| Our need | Our asset | Notes |
|---|---|---|
| Wordmark | Placeholder SVG (ours) | Trademark decision still open |
| Icons | `lucide-react` | Already installed |
| Loading | shadcn-style skeletons / CSS | No spinner GIF |
| Product images | Own or openly licensed (catalogue decision) | Sizes below |
| Gallery | Thumb strip about 64 px square, main image square (we use 800 px masters) | Evidence supports a vertical thumb strip on desktop |
| Result card image | About 218 px high | `next/image` with explicit dimensions |
| Cart line image | 96 to 180 px | Tracer uses 96 px; evidence suggests 180 px on desktop |
| Carousel card image | About 165 px | |

## Safe-to-deploy statement

Nothing from `recon-v2/` is safe to deploy: all imagery is Amazon's or third parties'; the sprite is a trademark; the pages embed one account's identifiers. Only **structure and dimensions** are used.
