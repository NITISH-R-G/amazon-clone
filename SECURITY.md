# Security policy

## Scope

This is a demonstration project built for a software engineering assessment. It is not a production system, takes no real payments and holds no real customer data. Payments run in Stripe **test mode** or a simulated demo provider. Seeded accounts, products, sellers and reviews are invented.

## Reporting a vulnerability

Please use GitHub's private vulnerability reporting for this repository (Security tab → "Report a vulnerability"). If that is not available, open a GitHub issue that describes the problem in general terms **without** exploit details, and ask for a private channel.

Do not include credentials, tokens, connection strings or personal data in issues or pull requests.

## What matters here

Areas worth reporting: server-side price or discount manipulation, payment confirmation without a verified provider event, webhook signature handling, session and cookie handling, access to another customer's orders, stock reservation bypass.

## Expectations

- Secrets (`DATABASE_URL`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`) belong only in the host's environment, never in the repository.
- Dependencies are pinned by `pnpm-lock.yaml`; update them deliberately and run the test suite.
- Treat any deployed instance as a test environment: do not enter real card numbers or personal data.
