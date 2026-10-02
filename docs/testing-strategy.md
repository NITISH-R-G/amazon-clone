# Testing strategy

Principle (from `CLAUDE.md`): "it renders" is not validation. Every major feature moves through **requirement → acceptance criteria → implementation → automated test → browser/manual verification → regression check.** Where practical, tests are written first (red → green → refactor; the `tdd` skill is installed).

Nothing here is implemented in Phase 0. Tools: **Vitest** (unit + integration), **React Testing Library** [Q] (client components with real behaviour), **Playwright** (E2E, viewport projects, axe-core a11y), seeded test database. Scope tags: **[R]** required, **[Q]** quality, **[O]** optional.

## Test pyramid and what lives where

| Layer | Tooling | Targets | Speed goal |
|---|---|---|---|
| Unit [R] | Vitest | `domain/*` pure logic | < 5 s total |
| Integration [R] | Vitest + test DB | server actions, repositories, route handlers | < 30 s |
| Component [Q] | Vitest + RTL | combobox, quantity stepper, gallery, forms | < 20 s |
| E2E [R] | Playwright | core journeys on 3 viewports | < 3 min |
| Accessibility [R] | axe via Playwright | every key page/state | included in E2E |
| Visual regression [O] | Playwright screenshots | shell, PDP, cart | only if time remains |

## Unit tests: critical business logic [R]

| Module | Cases |
|---|---|
| `domain/money` | cents arithmetic, rounding, formatting (symbol/whole/fraction split for `PriceBlock`) |
| `domain/cart` | add/merge same variant, clamp to stock and max quantity, remove, subtotal, item count, zero/empty |
| `domain/pricing` | shipping rule (free over threshold), tax rule, total = items + shipping + tax, discounts never negative |
| `domain/order` | state machine: legal and illegal transitions, cancel only before shipped, time-derived status |
| `domain/search` | query normalisation, URL param parse/serialise round-trip, invalid params fall back safely, sort definitions |
| `lib/validation` | zod schemas: address, card (Luhn, expiry in the future, CVC length), sign-in/registration |
| `server/payment` | demo provider approves valid, declines designated test numbers, never returns stored card data |

## Integration tests: important application boundaries [R]

| Boundary | Cases |
|---|---|
| Cart actions | guest cart created with cookie; add/update/remove persist; stock errors surface; **guest → user merge** |
| Checkout action | re-prices from DB (client-sent price ignored), rejects empty cart, rejects out-of-stock, creates order + items atomically, clears cart, decrements stock; double-submit is idempotent |
| Auth | register (duplicate email rejected), sign in (wrong password generic error), session cookie flags, protected routes redirect with `returnTo` |
| Orders retrieval | user sees only their own orders (authorisation), order detail matches snapshot even if product price later changes |
| Search repository | ranking, filters combine, pagination bounds, empty results |
| `/api/suggest` | debounce-safe, returns max N, escapes input |

## E2E tests: core user journeys [R]

Each runs on desktop (1280), tablet (768) and mobile (375) Playwright projects unless noted.

| ID | Journey | Must assert |
|---|---|---|
| E1 | **Search**: type query in header → pick suggestion/submit → results page | URL state, result count, empty-result state for gibberish |
| E2 | **Filter/sort**: apply price + rating + sort, then back button | URL reflects filters, back restores prior list |
| E3 | **Product selection**: open PDP, choose variant, change quantity | price/availability update, gallery works by keyboard |
| E4 | **Add to cart**: from PDP and from a card | toast, header count, cart contents |
| E5 | **Cart update**: change quantity, remove, undo, save for later [Q] | subtotal recalculates, live-region announcement |
| E6 | **Guest → checkout → sign-in**: proceed to checkout as guest | redirected to sign-in, returns to checkout, cart intact (merge) |
| E7 | **Checkout happy path**: address → delivery → payment → place order | confirmation page with order number and totals matching cart |
| E8 | **Order creation + retrieval**: after E7 open Orders, open order detail | order listed, detail matches, status shown |
| E9 | **Authentication**: register, sign out, sign in, wrong password, protected route redirect | generic error copy, session persistence on reload |
| E10 | **Error states**: forced declined payment; out-of-stock at checkout; address validation errors; server 500 on search; offline-ish retry | clear message, no data loss, retry works, no double charge/order |
| E11 | **Empty states**: empty cart, no search results, no orders | next-action CTA present |
| E12 | **Account**: add/edit/delete address, set default | persists; used at checkout |
| E13 | **Accessibility sweep**: axe on home, results, PDP, cart, checkout, orders, sign-in | zero serious/critical violations |
| E14 | **Cancel order** [Q]: cancel placed order, cannot cancel shipped | status transitions and messaging |

## Browser validation checklist (manual, per feature before "done")

Run on real browsers (Claude built-in browser and Claude in Chrome); record result per item in the PR/commit notes.

**Desktop (1280 and 1536)**
- [ ] Layout matches the intended direction; no overflow; sticky header behaves
- [ ] Hover, focus-visible and active states exist on every interactive element
- [ ] Keyboard: Tab order logical, skip links work, menus open/close with Enter/Space/Esc, arrow keys inside menus/combobox, no keyboard traps
- [ ] Screen-reader names: landmarks, buttons, form labels, live regions for cart changes

**Tablet (768 and 1024)**
- [ ] Header and sub-nav reflow without horizontal page scroll; filters accessible
- [ ] Touch targets ≥ 44 px; no hover-only functionality

**Mobile (360 and 390)**
- [ ] Single-column layouts; header collapses; drawer menu works
- [ ] Sticky add-to-cart / place-order reachable; forms use correct `inputmode`/`autocomplete`
- [ ] 16px+ inputs (no zoom); 200% text zoom still usable

**States**
- [ ] Loading: skeletons appear, no layout shift
- [ ] Empty: cart, search, orders, addresses
- [ ] Error: network failure, validation, 404, 500; each recoverable
- [ ] Responsive: resize 360 → 1920 smoothly; no content hidden unintentionally
- [ ] Reduced motion honoured; colour contrast verified (AA)
- [ ] Performance: Lighthouse mobile run on home/results/PDP meets budget (LCP < 2.5 s, CLS < 0.1)

## Regression policy [R]

- Every bug fix adds a failing test first.
- CI (or a local pre-push script) runs: typecheck, lint, unit+integration, E2E smoke (E1, E4, E7, E8). Full E2E before deploy.
- Each completed feature re-runs the E2E journeys it touches plus E7/E8 (purchase path) as the standing regression gate.
- Pre-commit hooks (Husky + lint-staged) are available via the installed `setup-pre-commit` skill; adopt in Phase 1 [Q].

## Test data

Deterministic seed (`db/seed.ts`) with fixed IDs: ≥ 3 categories, ~60 products including: one out-of-stock, one low-stock, one with variants, one with long title, one without image, one over the free-shipping threshold; a test user, an address, and a pre-existing delivered order. Separate test DB reset per Playwright run.

## Definition of done (per feature)

Requirement written · acceptance criteria written · tests red then green · browser checklist items run · a11y check clean · regression gate green · decision log updated if behaviour deviates from Amazon.
