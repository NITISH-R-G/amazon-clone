# Scale-up plan: from a polished prototype to a credible small commerce system

Status: audit and plan only. No application code was changed to write this. Evidence is from the repository, the running production build, and two throwaway measurements run outside the repo (numbers below). Nothing here is deployed.

Working thesis (unchanged): a high-trust, low-noise commerce experience for fast discovery and confident checkout. The D20 visual direction is not touched by this plan.

## 1. Current-state inventory

| Area | State (verified) |
|---|---|
| Git | 41 commits on `main`, no remote. Working tree clean except the session log. |
| Routes | `/`, `/s`, `/dp/[slug]`, `/cart`, `/checkout`, `/checkout/confirmation/[id]`, `/sign-in`, `/register`, `/orders`, `/orders/[id]`, 404, error. No `/account`. |
| Modules | `catalog`, `search`, `cart`, `checkout`, `orders`, `payments`, `auth` implemented; `account` is an empty stub. Boundaries enforced by ESLint; composition root `src/server/app.ts`. |
| Schema | 6 migrations. Tables: categories, products, variants, carts, cart_items, orders, order_items, users, sessions. Money in cents; ratings in tenths. |
| Catalogue | 30 products, 6 categories, 5 products with variants, 60 flat monochrome SVGs (2 per product, generated from 26 shapes x 3 tones). Seed is a 15 KB JSON, inserted row by row at start-up when the table is empty. |
| Product model | title, brand, description, 2 images, category, rating (tenths) + count (seeded demo values), bullets, option name, variants (label, price, list price, stock), created date, featured rank. No specs/technical details, no review rows, no delivery data. |
| Search | Pure TypeScript over **all products loaded into memory on every query**: filler-word removal, substring + 1-2 edit typo tolerance, "half the words" fallback, filters (category, price, rating, stock, sale), 5 sorts, pagination, category facets, suggestions. Home runs three of these per request. |
| Orders | Immutable purchase snapshot, `status` is the single value `placed`, `placedAt` stored. List, detail, confirmation exist. Guest orders are claimed on sign-in. |
| Auth | Email + password (scrypt), hashed-token sessions, 30-day expiry. |
| Database | PGlite everywhere: dev (`data/pglite`), tests (in-memory per test), E2E (`memory://`). `Database` and `DbOrTx` are driver-agnostic Drizzle `PgDatabase` types, and the migrations are plain SQL, so a second driver fits behind the same boundary (`docs/architecture.md` section 12). The swap has never been exercised against a real server. |
| Tests | 47 unit/integration (9 files), 10 E2E (5 journeys x desktop/Pixel 7). All green. Typecheck, lint, production build green. |
| Deployment | **None.** `Dockerfile` + `docs/deployment.md` describe one container with a volume keeping PGlite. No host, no remote, no credentials in the environment (inventory in `docs/deployment.md`). |
| Visual system | D20 implemented across home, search, product, cart, checkout, confirmation, auth, orders. Impeccable detector clean; browser audit at 7 widths clean. |

## 2. Exact current weaknesses

**A. What makes it feel like a prototype**

1. Thirty products: a search for almost anything returns 0-5 results, pagination never appears, filters barely narrow anything, and the three home rails draw from the same 30 items.
2. The same 26 illustrations repeat; there are no brand or product-type clusters to browse.
3. Product pages stop at a description and three bullets: no technical details, no delivery estimate, no review content behind the rating.
4. An order is "Placed" forever.
5. There is no public URL.

**B. What prevents it from feeling like a credible commerce system**

1. **Not deployable as a real system.** No managed database, no HTTPS URL, state would be lost on serverless hosting. PGlite is a single-process, single-connection engine.
2. **Search does not scale by construction.** Every query loads every product and every variant into the Node process. Measured below: it is linear in catalogue size and already multiplied by 3 on the home page.
3. **Seed does not scale:** row-by-row inserts at every cold start of an empty database.
4. **Ratings are decorative:** numbers on the product row with nothing behind them.
5. **No lifecycle:** nothing in the post-purchase experience changes over time.

**Measured baseline (production build, in-memory PGlite, 30 products, 3 runs):** home 65-90 ms warm, results 50 ms, PDP 33 ms; the first request after start took 2.5 s (PGlite initialisation plus seed). `.next` is 254 MB (mostly Turbopack output, not a concern).

**Measured scale cost (throwaway PGlite script, synthetic rows with 25-word descriptions, median of 5):**

| Products | DB size | Load-all + join (current approach, per query) | Postgres full-text query | Postgres trigram typo query | Row-by-row seed |
|---|---|---|---|---|---|
| 500 | 8 MB | 14 ms | 0.8 ms | 5 ms | 0.4 s |
| 3,000 | 11 MB | 63 ms | 1.4 ms | 2.6 ms | 1.7 s |
| 12,000 | 23 MB | 269 ms (x3 on home) | 3.9 ms | 8.5 ms | 5.5 s |

Conclusion: the current in-memory approach is fine at 30, tolerable at 500, and a real bottleneck at 3,000 (the home page alone would spend 0.2 s on it). Indexed Postgres search stays in single-digit milliseconds even at 12,000. Both `pg_trgm` and full-text search exist in PGlite (contrib `pg_trgm`, `unaccent`, `fuzzystrmatch`) and in Neon/Supabase, so **tests and production can run the same SQL**.

## 3. What can realistically be improved in the remaining time

Everything in P0 below is achievable if about 10-11 focused hours remain, plus the lead time for the account actions in section 8. If less than 10 hours remain, the cut order is in section 9. The binding constraints are not the database or the page speed, which are comfortable, but (1) account setup that only the user can do, (2) the quality of synthetic catalogue data, and (3) test-first discipline on a search rewrite.

## 4. Answers to the eight questions

**A. What currently makes this feel like a prototype?** Section 2A.

**B. What currently prevents it from feeling like a credible commerce system?** Section 2B.

**C. Minimum catalogue scale that materially changes the perception.** About **1,000-2,000 products across 12 categories**, enough that every category has 80+ products (7+ pages of 12), a brand filter has real brands with counts, a typed query like "wireless" returns many ranked results, and the three home rails are visibly different sets. **Target 2,400 (12 categories x 200); hard cap 3,000.** Reasons: at 3,000 the database is 11 MB and indexed search is 1-3 ms, so the database is not the limit; the limit is believable synthetic data. Beyond about 3,000 the extra products are meaningless duplicates and the row-by-row seed alone costs seconds. Pages are dynamic, so build time does not grow with the catalogue.

**D. Minimum production database change.**

1. Add the `pg` (node-postgres) driver and a second construction path in `src/server/runtime.ts`: `DATABASE_URL` present -> `drizzle-orm/node-postgres` with a small pool (max 3, pooled connection string); absent -> PGlite as today. Everything else keeps `Database`/`DbOrTx`.
2. Run migrations with the node-postgres migrator against the same `drizzle/*.sql`, in a one-off step at **build/deploy time**, not per request. Seeding is the same idempotent script. PGlite keeps migrating at start-up for dev/test.
3. Checkout's `pg_advisory_xact_lock` and transactions already work through a pooler in transaction mode (the lock is transaction-scoped). No `neon-http` driver (it has no interactive transactions).
4. Bulk-insert the seed (batches), not row by row.
5. Prove the swap against the real database with a smoke script, then keep PGlite for all automated tests.

No ORM change, no module change, no schema change beyond what the features need.

**E. The 3-5 highest-signal upgrades we can realistically finish** (in this order): (1) real deployment on managed Postgres; (2) a ~2,400-product catalogue with Postgres-native search and a brand filter; (3) a deterministic order lifecycle with cancellation while still cancellable; (4) richer product pages (specs, delivery estimate, related products); (5) verified reviews if P0 is stable.

**F. What we deliberately do NOT build.** Seller marketplace, seller dashboard, customer service, wishlists, payment-method management, Stripe production payments, recommendations (beyond "same category, top rated"), AI anything, dark mode, animations, a homepage redesign, copying another submission's design or features, a background job runner, a search engine service (Elasticsearch, Algolia, Typesense), CDN/image pipeline, 12,000-row catalogues.

## 5. Ranked work, risk, impact, dependencies

| # | Item | Priority | Risk | Judging/product impact | Depends on |
|---|---|---|---|---|---|
| 1 | **Deploy skeleton:** GitHub remote, managed Postgres, `pg` driver, migrate-on-deploy, public HTTPS URL running today's 30-product app | P0 | Medium: first contact with real Postgres and a real host; needs user account actions | Very high: no URL means no submission | User actions (section 8) |
| 2 | **Catalogue to ~2,400**: deterministic generator (product types x brands x attributes), bulk seed, shared images by shape/tone (26 shapes x 6 tones), brand + categories, features and specs per product | P0 | Medium: data quality and consistency are the real work | Very high: changes the perception of the whole product | 1 (to validate on Postgres), none for generator |
| 3 | **Search on Postgres:** a catalogue query capability with full-text ranking (title > brand > category > description weights), prefix for typeahead, trigram typo fallback, filters, brand facet, sort, pagination, SQL facet counts; `search` keeps parsing, policy and suggestions | P0 | Medium-high: rewrite of working behaviour; tests T26-T33, T45-T47 must be re-expressed first | Very high: "works because the catalogue is large" | 2 (data), `pg_trgm` in both engines |
| 4 | **Order lifecycle:** pure status from `placedAt` + clock (Placed, Shipped, Out for delivery, Delivered), estimated delivery date, UI on confirmation/list/detail, cancel while Placed (restores stock) | P0 | Low-medium: one nullable column, one pure function, one transactional cancel | High: visible, demoable, easy to verify | None (can run in parallel with 2-3) |
| 5 | **Product depth:** technical details table, delivery estimate near purchase, related products (same category, highest rated), stock messaging already exists | P0 | Low | High: purchase confidence on every product page | 2 |
| 6 | **Verified reviews:** table, one per user/product, purchase check, aggregates, list on PDP | P1 | Medium: crosses `orders`/`catalog` (see design note) | High, but only credible once 1-5 are done | 3, 4, 5 stable |
| 7 | Account depth: profile, saved address used at checkout | P1 | Low-medium | Medium | 1 |
| 8 | Discovery rails on real data: deals page, recently viewed (cookie) | P1 | Low | Medium | 2 |
| 9 | Everything in section 4F | P2 | n/a | Low or negative | n/a |

**Design notes that matter**

- **Search and module ownership.** Searching in SQL means reading catalogue tables, which only `catalog` may do (`docs/modules.md` rule 2). Decision: `catalog` gains one query capability, `findProducts(criteria) -> { rows, total, facets }`, containing the SQL; `search` stays the public search module (URL parsing, query policy such as filler words and the relaxed fallback, suggestions) and calls it. `catalog.listProducts()` is deleted from the hot path. This changes the `catalog` interface (additive) and `search`'s dependency; both are recorded when it lands.
- **Relevance, explained in one sentence:** matching words in the title rank above brand, then category, then description; ties by rating count. No learned ranking.
- **Order lifecycle clock (demo timeline, documented as simulated):** Shipped +5 min, Out for delivery +30 min, Delivered +2 h after `placedAt`, with the thresholds in one constants file. Cancellation is allowed only while Placed (the first 5 minutes). Real retail runs in days; the compressed timeline exists so a reviewer can watch it progress. Status is computed on read: no worker, no cron.
- **Reviews and ratings.** Keep the seeded rating as a baseline and fold real reviews in as (baseline sum + review sum) / (baseline count + review count), so the displayed aggregate updates without inventing history. `reviews.submit` is authorised by the app layer: it checks `orders` for a purchase of any variant of the product (a new read method on `orders`), then writes the review. `catalog` exposes a rating setter the app layer calls in the same transaction. This is why reviews are P1.
- **Images at scale.** 2,400 products cannot have 4,800 files. Products reference a shared illustration by `shape` and `tone` (26 x 6 = 156 static SVGs, about 0.5 MB). The repetition is the main realism limit; it is accepted and noted rather than hidden. Imagery stays our own; nothing is copied.
- **Catalogue generator provenance.** Fully synthetic and labelled as such: invented brands, product types written by us, attribute vocabularies per type, a seeded PRNG so the data is identical on every run, prices and stock with plausible distributions, a minority on sale, a few out of stock, ratings with plausible counts. No Amazon data, identifiers or images. This overrides the earlier "40-60 hand-authored products" default in `docs/catalogue-decision.md` on the user's explicit instruction; recorded as D23 when work starts.

## 6. Dependencies

```
user account actions -> (1) deploy skeleton ----------------------------+
                                                                         v
(2) catalogue generator -> (3) Postgres search -> (5) product depth -> QA + deploy gate
(4) order lifecycle (parallel, independent) ------------------------------^
(6) reviews needs 3+4+5; (7), (8) need 2
```

## 7. Execution order (vertical slices; each ends with tests, typecheck, lint, browser check, commit, redeploy)

0. **Now, in parallel with coding:** the user completes the three account actions in section 8.
1. **Slice 1: database boundary + public URL.** Test the pg path against the real database (smoke script), migrate-on-deploy, deploy today's app, run the existing E2E journey against the public URL. Supersedes the container-with-volume recipe in `docs/deployment.md` (kept as the fallback).
2. **Slice 2: catalogue.** Generator and its consistency tests (unique slugs/ids, price >= 0, list price > price, stock bounds, every product has category/brand/specs, deterministic), bulk seed, shared images, then load it on the real database and measure.
3. **Slice 3: search on Postgres.** Re-express the existing search tests against the seam, add new ones (relevance order, brand filter, typo, prefix, common word, nonsense, malformed), implement `catalog.findProducts` and rewire `search`, update home rails and suggestions. Measure latency on the real database.
4. **Slice 4: order lifecycle.** Pure transition function tests, cancel with stock restore (transactional test), UI in confirmation/list/detail.
5. **Slice 5: product depth.** Specs table, delivery estimate (from the same lifecycle constants), related products.
6. **Slice 6: QA and the deployment gate.** Fresh-browser run of the 15-point gate on the public URL, E2E against the public URL, responsive and keyboard re-check of changed screens, Impeccable critique/audit on the new UI, performance evidence (search and product latency, DB size, import time, build time, cold start).
7. **P1 only after Slice 6 is green and time remains:** reviews, then account depth, then rails.

## 8. Minimum actions required from the user (nothing else needs credentials)

Nothing in the environment can provision a database or a host (`docs/deployment.md`, environment table). The smallest set that avoids any secret passing through the chat or the repository:

1. **Approve creating a GitHub repository and pushing `main`.** I use the authenticated `gh` CLI. `recon/` and `recon-v2/` are git-ignored and absent from history; I re-verify before the first push. Private is fine for Vercel.
2. **Create a free Neon project** (sign in with GitHub). Copy the **pooled** connection string. Do not paste it into the chat.
3. **Create a Vercel project from that GitHub repository** (sign in with GitHub) and set one environment variable, `DATABASE_URL`, to the Neon string. Deploy.

Migrations and seeding run inside the Vercel build using that variable, so I never hold the credential. If the user prefers Railway or Render, the same `DATABASE_URL` + `Dockerfile` path applies. **Fallback if Neon or Vercel is unavailable:** the existing single-container + volume recipe, which keeps PGlite and is already verified to survive hard kills, but does not satisfy "multiple instances".

## 9. Hard stop

- **Feature freeze** as soon as slices 1-5 are merged and deployed. Reviews and anything else in P1 start only if Slice 6's gate would still have at least **35 % of the remaining time** after they finish. Otherwise they are not started.
- **Time boxes (focused hours):** slice 1: 2, slice 2: 3-4, slice 3: 3, slice 4: 1.5, slice 5: 1.5, slice 6: 2. Total about 13-14 including search. If a slice exceeds its box by 50 %, stop and cut scope inside it (for example: drop the trigram typo fallback, keep full-text; drop cancel, keep the status).
- **Cut order if time is short:** reviews, account depth, rails, related products, cancel, brand facet, in that order. Slices 1, 2, 3 (minimum: SQL search with full-text and filters) and 4 (status only) are the floor.
- **Switch to QA + deployment only (no new features)** at the earlier of: slices 1-5 deployed, or **65 % of the remaining time elapsed**. At that point only bug fixes, the 15-point gate, and evidence are allowed.
- A red critical E2E journey stops all feature work until it is green.

## 10. Deployment gate (from the brief) mapped to checks

1 public HTTPS URL; 2 fresh browser opens it; 3 register/sign-in; 4 search; 5 open product; 6 add to cart; 7 checkout; 8 the order exists in the managed database (confirm after a redeploy); 9 Orders page; 10 order status progresses; 11 data persists across redeploy because the state lives in managed Postgres, not on the host; 12 no `localhost` in the shipped configuration; 13 no secrets in git (`DATABASE_URL` only in the host's environment, `.env.example` committed with names only); 14 `.agent-logs/` untouched; 15 clean working tree.

## 11. Risks to watch

- First run on a real Postgres may expose a type or driver difference (timestamps, jsonb, advisory lock through the pooler). Mitigated by doing slice 1 before anything else.
- Serverless cold starts open a new connection; keep the pool small and the start path free of migration or seed work.
- Synthetic data that reads as obviously fake would undercut the whole slice; spend the time on product types and attribute vocabularies, not on volume.
- The relaxed-match and typo behaviour users already see must not regress when search moves to SQL; the existing tests T27-T33, T45-T47 are the contract.
