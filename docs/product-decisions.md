# Product decisions

Framework for the decisions a one-day rebuild must make, and where it can show product judgment without changing things just to be different.

Rules:
- A decision keeps Amazon's behaviour unless there is a concrete reason (user value, accessibility, risk, time). "Observed" cites `docs/recon/`; where Amazon's behaviour is not in the supplied source it says **UNKNOWN / REQUIRES VALIDATION** and the "chosen direction" is a hypothesis.
- Status: **Proposed** (this document) → **Confirmed** (user agrees, or validated against Site Peel material) → **Shipped** (verified in browser).
- Chosen directions below are recommendations for Phase 1. None are implemented.

Legend for scope: R = required for assessment, Q = useful for quality, O = optional.

---

## D1. When to require authentication (R)

- **Problem**: forcing sign-in before checkout loses shoppers; allowing guests complicates order retrieval.
- **Observed Amazon**: sign-in is identifier-first (email/mobile → password), account creation is folded into the same entry ("Sign in or create account"); Amazon gates checkout behind sign-in (cart works for guests: header shows cart count while logged out). Sign-in step 2 and registration are not captured.
- **Options**: (a) require sign-in at "Proceed to checkout" like Amazon; (b) guest checkout with optional account creation after; (c) allow everything guest and link orders by email.
- **Chosen**: (a) for fidelity, but **deferred to the latest necessary moment**: browsing, search, cart are fully guest; guest cart is preserved and merged on sign-in; the sign-in screen at checkout returns the user to the exact checkout step.
- **Rationale**: matches Amazon expectations; orders need an owner for order retrieval; late auth maximises browse-to-cart conversion.
- **Tradeoffs**: guest checkout (b) would convert better but requires email-based order lookup and anti-abuse; skipped for time. 
- **Validation**: E2E: guest adds item → checkout → signs in → lands on address step with cart intact. Confirm Amazon's gate with a checkout capture.

## D2. Search UX (R)

- **Problem**: search is the main entry for intent shoppers; the Amazon header search is dense (60+ departments, suggestion panel).
- **Observed**: department select + input + submit; rotating placeholder; two-pane autosuggest (`sac-autocomplete`).
- **Options**: (a) replicate department select + suggestions; (b) single input, department as a results facet; (c) full-text only, no suggestions.
- **Chosen**: keep Amazon's header pattern (department select + input) because it is part of recognisable structure; implement **suggestions as one list** (recent searches + matching product/category titles); state lives in the URL (`/s?k=…&i=<dept>&…`).
- **Rationale**: familiar; URL state makes results shareable and testable; single-list suggestions are simpler and more accessible than two panes.
- **Tradeoffs**: no personalised suggestions; no spelling correction (O).
- **Validation**: unit (query normalisation, ranking), E2E (type → select suggestion → results), a11y (combobox pattern, `aria-activedescendant`).

## D3. Product discovery on the home page (Q)

- **Problem**: Amazon's home is a 16-card promo deck with no prices; weak for decision-making.
- **Observed**: promo cards (single and quad), no product prices on the logged-out deck, recently-viewed rail.
- **Options**: (a) copy the deck; (b) deck + price-bearing product rails ("Top deals", "Recommended"); (c) minimal search-first home.
- **Chosen**: (b): a hero, 6 to 8 category/promo cards, then **product rails with price, rating and delivery cue** and a "Continue where you left off" rail.
- **Rationale**: keeps the Amazon feel; shows product value earlier; reuses `ProductCard`.
- **Tradeoffs**: more data needed on the home route (catalogue must be seeded).
- **Validation**: Impeccable critique of hierarchy; click-path E2E home → card → PDP.

## D4. Product page hierarchy (R)

- **Problem**: the PDP is the decision point and must expose price, delivery, availability and the buy action without scrolling.
- **Observed**: **UNKNOWN** (no PDP captured). Amazon's well-known layout is gallery | title/price/details | buy box.
- **Options**: (a) replicate three columns; (b) two columns with sticky buy box; (c) single column mobile-first.
- **Chosen (hypothesis)**: (a) on desktop, (c) on mobile with a **sticky add-to-cart bar**; buy box shows price, stock, delivery date, quantity, Add to cart, Buy now in that order.
- **Rationale**: familiar; sticky bar keeps the primary action reachable.
- **Tradeoffs**: must be validated against a real PDP capture before building.
- **Validation**: Site Peel PDP HTML; E2E select variant → quantity → add to cart.

## D5. Cart interaction (R)

- **Problem**: how quickly and clearly the shopper learns their add succeeded, and how editable the cart is.
- **Observed (CSS only)**: stepper, delete, save for later, subtotal buy-box, out-of-stock alternatives.
- **Options**: (a) full cart page only; (b) add-to-cart confirmation page; (c) toast + header count + slide-over mini-cart, full cart page for editing.
- **Chosen**: (c). Toast "Added to cart" with **View cart** action, header count updates optimistically, full cart page supports quantity, remove (with **undo**), save for later (P1).
- **Rationale**: stay-in-flow add, faster than an interstitial; undo prevents accidental loss.
- **Tradeoffs**: optimistic updates require reconciliation on failure.
- **Validation**: unit (cart totals), integration (cart actions), E2E (add, change qty, remove, undo), a11y (live region announcements).

## D6. Checkout simplification (R)

- **Problem**: checkout is the highest-risk step; Amazon shows many steps with upsells.
- **Observed**: **UNKNOWN**. Amazon's checkout is widely known as a single review page with address/delivery/payment sections.
- **Options**: (a) multi-step wizard; (b) single page with collapsible sections; (c) one-click.
- **Chosen**: (b): single page, three sections (Address → Delivery → Payment), sticky order summary, **no upsells in the flow**, inline validation, explicit "Place your order" with totals.
- **Rationale**: fewer page loads, clear progress, easy to test; removes interruptions.
- **Tradeoffs**: more state on one page; mitigate with server-validated sections.
- **Validation**: E2E happy path + declined payment + invalid address; usability check at 360 px.

## D7. Responsive behaviour (R)

- **Problem**: Amazon serves a separate desktop and mobile shell (desktop header `min-width:1000px`).
- **Observed**: breakpoints at 360/768/1000/1100/1280/1700 (CSS); no mobile DOM.
- **Options**: (a) duplicate shells; (b) one fluid component tree with Tailwind breakpoints.
- **Chosen**: (b). Mobile-first; header collapses to logo + search + cart with a drawer for "All"; sub-nav becomes a horizontal scroller.
- **Rationale**: one codebase to test; fits a day.
- **Tradeoffs**: less exact parity with Amazon mobile web.
- **Validation**: browser checklist at 360/768/1280; Playwright viewport projects.

## D8. Empty / loading / error states (Q)

- **Problem**: Amazon's captured assets show a spinner GIF and no designed empty states.
- **Observed**: spinner `loading-4x-gray.gif`; empty profile values as `--`. Everything else UNKNOWN.
- **Chosen**: every data view ships **skeleton + empty + error (retry)** variants by default (`loading.tsx`, `error.tsx`, `not-found.tsx`); empty cart, no results and empty orders each offer a next action.
- **Rationale**: demonstrates product care cheaply; shadcn `Skeleton`, `Alert`.
- **Tradeoffs**: more states to test; mitigated by a shared `StateBoundary` pattern if repetition warrants (not before).
- **Validation**: Storybook-less: Playwright with forced failures (route interception) and empty fixtures.

## D9. Account architecture (Q)

- **Problem**: Amazon's account is a 12-tile hub plus 6 grouped lists with page-by-page navigation, no persistent nav.
- **Observed**: `Your Account` tile grid; Profile Hub; Returns; Help.
- **Options**: (a) replicate the tile hub; (b) persistent left/side nav (tabs on mobile) for Orders, Addresses, Login & security, Payments.
- **Chosen**: (a) as the **account home** (recognisable) **plus** a persistent `AccountNavigation` on sub-pages.
- **Rationale**: keeps the recognisable entry, removes the "back to hub" loop.
- **Tradeoffs**: small extra layout work.
- **Validation**: E2E navigation between Orders and Addresses without returning to the hub.

## D10. Trust signals (Q)

- **Problem**: shoppers need to trust price, delivery and returns.
- **Observed**: returns policy banner (30-day), "Free, easy returns" copy; delivery location in header; star ratings with counts.
- **Chosen**: surface on PDP/cart/checkout: **total price including shipping before placing the order**, delivery date, return window, secure-payment note, ratings with counts. No fake urgency (no invented "only 2 left", countdowns, "X bought recently").
- **Rationale**: honest persuasion; avoids dark patterns; legal safety for a demo.
- **Tradeoffs**: less artificial conversion pressure than Amazon (acceptable).
- **Validation**: content review in Impeccable critique; unit tests on price/total formatting.

## D11. Accessibility (R)

- **Problem**: Amazon ships skip links and a keyboard-shortcut menu but inconsistent focus styling and empty `alt` on many images.
- **Observed**: `nav#shortcut-menu`, `role=search`, `aria-label` on controls, `aria-expanded` on toggles; empty image alt in product links.
- **Chosen**: WCAG 2.2 AA target; skip links, landmarks, labelled controls, meaningful alt, one consistent focus ring, keyboard-operable menus/carousels, live regions for cart changes, reduced motion.
- **Validation**: axe in Playwright on every key page; manual keyboard pass.

## D12. Performance (Q)

- **Problem**: the captured pages carry 64 MB of JS across 255 files; slow and heavy.
- **Chosen**: RSC by default, `next/image`, font subsetting, no third-party scripts, lazy-load rails, Lighthouse budget (LCP < 2.5 s, CLS < 0.1 on throttled mobile) on home, search, PDP.
- **Validation**: Lighthouse CI or manual Lighthouse run per release; bundle-size check.

## D13. Payment realism (R)

- **Problem**: no real money may move; the demo still needs a convincing payment step.
- **Options**: (a) mocked "Pay" with no card form; (b) card form validated locally with test numbers; (c) Stripe test mode.
- **Chosen**: (b) behind a `PaymentProvider` interface; (c) is a P2 swap-in.
- **Rationale**: demonstrates validation and failure states with no third-party dependency risk.
- **Tradeoffs**: not real; clearly labelled "Demo payment: no card is charged" and never stores full card numbers.
- **Validation**: unit (Luhn, expiry), integration (declined card path), E2E.

## D14. Logo, brand and imagery (R, needs user)

- **Problem**: Amazon's logo and photos are trademark/copyright protected.
- **Chosen (proposal)**: placeholder wordmark and an owned/licensed demo catalogue; Amazon-like structure and colours retained.
- **Needs user decision**: see `docs/recon/asset-inventory.md`.

## D15. Scope boundaries (R)

Explicitly out of scope: Prime membership flows, Alexa/Rufus assistant, ads/sponsored placement, seller/marketplace features, digital content, Fresh/local market, gift-card purchase flow (the Gift Cards page is reference for product-card patterns only), international localisation.

---

## Review log

| Date | Decision | Change |
|---|---|---|
| 2026-10-02 | all | Proposed in Phase 0; none confirmed by user yet |
