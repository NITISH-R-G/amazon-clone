# Testing strategy

Principle: "it renders" is not validation. Behaviour is established **test-first at agreed seams** (see `docs/agents/workflow.md`), then verified in a real browser, then protected by a small set of E2E journeys. Nothing here is implemented in Phase 0.

Tags: **[R]** required, **[Q]** quality, **[O]** optional.

## Browser / E2E policy

Browser/E2E tests are valuable but expensive feedback loops (slow, flaky, hard to localise). Therefore:

- **Establish business behaviour at the unit/integration seam first.** Cart maths, re-pricing, order state, search parsing and auth rules are tested through module interfaces (`docs/modules.md`), not through the browser.
- **Use E2E for critical user journeys only** (below), not for every state or edge case.
- **Do not write every browser test before implementation.** No big batch up front. A journey test is written when its underlying behaviour already works.
- **Verify the UI manually during development** (built-in browser, checklist below), slice by slice.
- **Add E2E after the behaviour works**, ordered by user risk and assessment/demo importance (tiers below).
- Failures found only by a browser get a regression test at the lowest seam that can reproduce them.

## Layers

| Layer | Tooling | What it covers | When written |
|---|---|---|---|
| Unit [R] | Vitest | Pure logic inside a module, only through its public interface (money, cart totals, order status, search param parsing, validation schemas) | RED→GREEN per behaviour |
| Integration [R] | Vitest + test DB, real modules | Module interfaces end to end: cart actions, `placeOrder`, auth, order retrieval authorisation, search repository | RED→GREEN per behaviour |
| Component [Q] | Vitest + React Testing Library | Interactive client pieces with real behaviour: search combobox, quantity stepper, variant picker | Only when behaviour is non-trivial |
| E2E [R, tiered] | Playwright | Critical journeys only | After the slice works |
| Accessibility [R] | axe via Playwright and manual keyboard pass | Key pages and states | With the journeys they belong to |
| Visual regression [O] | Playwright screenshots | Shell, PDP, cart | Only if time remains |

Mocks only at external ports: payment provider, clock, randomness/id generation, third-party APIs. No mocking of our own modules.

## What each seam must prove (behaviours, written one at a time; not a test batch)

| Seam | Behaviours that carry risk |
|---|---|
| `cart` | add merges same variant; quantity clamps to stock and max; remove then restore; subtotal in cents; guest cart merges into user cart |
| `checkout.placeOrder` | ignores client-sent prices; rejects empty cart and out-of-stock; creates order and items atomically; clears cart; double submit creates one order; declined payment leaves cart and stock unchanged |
| `search` | param parse/serialise round-trip; invalid params fall back safely; filters combine; sort order; pagination bounds; empty results |
| `orders` | user sees only their own; detail uses purchase-time snapshot after price change; status derived from clock; cancel allowed only before shipped |
| `auth` | register rejects duplicate email; wrong password gives a generic error; protected routes redirect with `returnTo` |
| `payments` (demo) | valid card approves; designated test number declines; no full card number returned |

## E2E journeys, by tier

E2E is added in tier order after the behaviour exists. Each runs on desktop (1280) and mobile (375); tablet only for tier 1 shell checks.

| Tier | Journey | When |
|---|---|---|
| **1: demo-critical** | **Purchase path**: search → results → product → add to cart → cart → checkout (guest hits sign-in, returns with cart intact) → place order → confirmation | When P0-A is working end to end |
| 1 | **Order retrieval**: after a purchase, Orders list and order detail match the confirmation | With the orders slice |
| 1 | **Failure path**: declined payment keeps the cart and shows a recoverable message | With checkout |
| 2: credibility | Authentication: register, sign out, sign in, wrong password, protected-route redirect | With P0-B auth |
| 2 | Empty/loading/error states: empty cart, no results, no orders, forced 500 on search | With the states slice |
| 2 | Accessibility sweep (axe) on home, results, PDP, cart, checkout, orders, sign-in | Before calling P0-B done |
| 3: depth | Filters/sort with back button; variant selection; cart undo and save-for-later; address book; cancel order | P1, if time |

There is no requirement to implement a fixed number of journeys. Tier 1 is the assessment-critical set.

## Manual browser checklist (run per slice before it is "done")

Use the built-in browser; note results in the commit or ticket.

**Desktop (1280, 1536)**
- [ ] Layout matches the intended direction; no overflow; sticky header correct
- [ ] Hover, focus-visible and active states on every interactive element
- [ ] Keyboard: logical Tab order, skip links, menus operable with Enter/Space/Esc/arrows, no traps
- [ ] Landmarks, labels and live-region announcements for cart changes

**Tablet (768, 1024)**
- [ ] Header and sub-nav reflow without horizontal page scroll; filters reachable
- [ ] Targets ≥ 44 px; nothing hover-only

**Mobile (360, 390)**
- [ ] Single column; header collapses; menu sheet works
- [ ] Add-to-cart / place-order reachable; correct `inputmode` / `autocomplete`; inputs ≥ 16 px
- [ ] Usable at 200% text zoom

**States**
- [ ] Loading (skeleton, no layout shift), empty (cart, results, orders), error (network, validation, 404, 500) with recovery
- [ ] Resize 360 → 1920 smoothly; reduced-motion honoured; AA contrast
- [ ] Lighthouse mobile on home/results/PDP meets budget (LCP < 2.5 s, CLS < 0.1) before release [Q]

## Regression policy [R]

- Every bug fix starts with a failing test at the lowest seam that reproduces it.
- Local gate per slice: typecheck, lint, the slice's test file(s); full suite once at the end of the slice.
- Standing regression gate before commit of any purchase-path change: integration tests for `cart`/`checkout`/`orders` plus the tier-1 purchase journey once it exists.
- Pre-commit hooks via the installed `setup-pre-commit` skill: adopt in Phase 1 [Q].

## Test data

Deterministic seed (fixed IDs) covering: one out-of-stock, one low-stock, one with variants, one over the free-shipping threshold, one with a long title, one without an image; a test user with an address and a delivered order. Test database reset per integration/E2E run. Catalogue content is not decided yet (see `docs/roadmap.md`).

## Definition of done (per slice)

Acceptance criteria written · behaviours test-first at agreed seams · browser checklist items run · accessibility check on affected pages · regression gate green · decision log updated if behaviour deviates from Amazon.
