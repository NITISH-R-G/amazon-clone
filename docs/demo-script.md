# Five-minute walkthrough

One story: find something on offer, buy it with a Stripe test payment, see the order, get personalised suggestions.

Setup: the deployed site (or `pnpm dev` with Stripe test keys in `.env.local`). Demo account: `demo@cartly.test` / `cartly-demo-1`.

1. **Home** (0:00). Deals, top rated and sponsored rails each come from real data; sponsored is labelled and does not change organic ranking.
2. **Search** (0:45). Search `headphnes` (typo tolerated), narrow by brand and price, sort by rating. Applied filters are visible and in the URL.
3. **Product** (1:30). Pick a multi-dimension variant (colour, storage, RAM); invalid combinations are disabled and the picture follows the colour. Show the buy box (seller, fulfilment, price, availability, delivery window) and open "Other sellers".
4. **Cart** (2:15). Add from another seller; the cart keeps seller, shipping and delivery per line. Apply `SAVE10` (and show `SPRING20` is refused as expired).
5. **Checkout and Stripe** (2:45). Address, then the Stripe Payment Element. Pay with `4242 4242 4242 4242`. The order is placed only after Stripe's signed webhook (or the server's own retrieval) confirms; show a decline with `4000 0000 0000 0002` first if time allows.
6. **Order** (3:45). Confirmation, status timeline, promised delivery window, payment brand/last4, cancellation (refund goes through Stripe).
7. **Reviews** (4:15). Sign in as the demo account, open a delivered product: "Write a review" appears only because of a delivered order; the posted review is "Verified purchase" and updates the rating.
8. **Personalised home** (4:40). Back on Home: "Pick up where you left off" and "Recommended for you".

Engineering depth to mention: two-phase checkout with stock reservations (two shoppers, one unit: `tests/e2e/inventory-race.spec.ts`), payment and order state kept separate, idempotent webhooks, deterministic buy box / delivery / recommendations with unit tests.
