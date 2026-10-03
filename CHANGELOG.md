# Changelog

No versions have been released. This records the milestones of the assessment build, oldest first, in the order they landed (see `git log` for exact history).

## Unreleased / Assessment Build

- **Foundation:** modular monolith (Next.js, TypeScript, Drizzle), PGlite for development and tests, tracer-bullet purchase journey, guest and account carts, order lifecycle derived from timestamps.
- **Scale-up:** PostgreSQL driver selection via `DATABASE_URL`, deploy-time migrate and seed, 2,400-product synthetic catalogue, indexed full-text and trigram search, structured facets.
- **Catalogue depth:** product types with typed attributes, multi-dimension variants with SKUs, marketplace offers, buy-box rule.
- **Payments architecture:** two-phase checkout, stock reservations, separate payment and order state machines, idempotent provider events, refunds.
- **Stripe test mode:** PaymentIntent and Payment Element, signed webhook endpoint, server-side retrieval fallback.
- **Marketplace features:** deterministic delivery promise, server-side coupons, recently viewed, deterministic recommendations, personalised home rails, sponsored placements, verified reviews with a seeded demo account.
- **Quality:** 125 unit and integration tests, Playwright journeys including a two-shopper last-unit race, hot-path indexes.
- **Repository:** documentation set (decisions D1 to D31, architecture, research, deployment, demo script).
