# Privacy notes: `recon/`

Status: **documented, not yet remediated.** `recon/` was not modified (instruction). No sensitive value is reproduced here; only categories, counts and locations are recorded.

## What was found

Eight of the nine saved pages were captured while logged in to a real Amazon customer account. The captures embed live identifiers and anti-forgery material that were never meant to leave the browser session.

| Category | Where | Notes |
|---|---|---|
| Customer name | Header greeting ("Hello, <name>") in every logged-in page's HTML; also the Help page heading ("Welcome to Amazon Customer Service, <name>") | 7 logged-in pages plus the Help heading; Today's Deals shows it twice |
| Amazon customer ID | Inline script/config JSON in the logged-in pages (key present 1 to 2 times per page); the same literal also appears in 12 files across `recon/` (HTML and JS) | Persistent account identifier |
| CSRF / anti-forgery tokens | Hidden inputs and inline config on all pages: 8 to 20 hits per logged-in page (Online Return Center the most), 1 on home and sign-in | Session-bound; replaying is unlikely to work but they are credentials-adjacent |
| Encoded actor ID | The Profile Hub `saved from url` comment and in-page URLs (6 occurrences) | Opaque, persistent user token |
| Authentication state | Sign-in page: anti-CSRF token, WebAuthn (passkey) challenge fields and challenge ID, an `arb` flow ID in the form action and saved URL, a long opaque `metadata1` blob (device/fingerprint data), OpenID return parameters | Short-lived flow secrets; fingerprint blob is device data |
| Session / request identifiers | Strings in the `NNN-NNNNNNN-NNNNNNN` format in every page (2 to 4 per page, including logged-out home), and embedded in **file names** in the home page resource folder | Amazon session/request IDs; treat as sensitive |
| Delivery location | "Deliver to <country>" in the header (country level only; no street or postal code found) | Low sensitivity |
| Personal preference/profile content | Profile Hub, Your Account, Your Amazon.com: tile text is generic; preference values are mostly empty (`--`); recommendation grids reflect this user's browsing/purchase profile | Behavioural profile data |
| Order data | Online Return Center and Account pages contain no order rows; order-number-shaped strings found are session/request IDs, not confirmed orders | Not confirmed as orders |
| Email / phone / street addresses | Scripted search found **none** in the page HTML | Not exhaustive for JS/CSS bundles |
| Extension-injected DOM | Clipboard, text-expander and input-tool extension nodes in the saved DOM | Could expose the user's extension set; noise, remove on recapture |

## Affected files

- **Highest sensitivity**: `Profile Hub.html` (actor ID), `Sign in.html` (flow tokens and fingerprint blob), `Online Return Center.html` (most tokens).
- **Logged-in pages with customer ID, name and tokens**: `Your Account.html`, `Your Amazon.com.html`, `Amazon.com Gift Cards.html`, `Today's Deals.html`, `Help & Contact Us - Amazon Customer Service.html`, plus `Profile Hub.html` and `Online Return Center.html` above.
- **Logged-out but still carrying session identifiers**: `Amazon.com. Spend less. Smile more..html` and its `_files` folder (session IDs inside file names).
- **Resource folders**: JS/CSS bundles under each `*_files/` copy page configuration; at least 12 files contain the customer ID. Cart and Home & Kitchen folders have no HTML but share the same bundles.

## Why none of this may enter the application or the repo

- It identifies a real person and carries session-scoped credentials. Committing, deploying or pasting it into docs/fixtures/tests would publish them.
- The values are Amazon-side identifiers; our app has no use for them and must not reproduce Amazon's tracking, personalisation or anti-forgery machinery.
- Fixtures, seed data and tests must be synthetic. Reference the **structure** of the captures only.

## What needs recapturing

1. All logged-in pages from a **throwaway or logged-out** account (or a fresh browser profile) with extensions disabled.
2. Prefer logged-out captures wherever the page allows (home, search, PDP, cart; the Account/Orders/Checkout pages require a login, so use a throwaway account with no real data).
3. Capture without extensions (they inject DOM) and ideally in a clean profile.
4. After capture, treat the old `recon/` as compromised for sharing purposes: do not share it or upload it; delete or keep it local only once recaptures cover it.
5. Consider ending the captured account's active sessions (sign out of all devices) and changing its password, since tokens and identifiers sit on disk.

## Protection status (verified 2026-10-02)

| Check | Result |
|---|---|
| `.gitignore` covers `recon/` | **Yes**: `/recon/` (root-anchored so `docs/recon/` stays tracked) |
| Files under `recon/` tracked by git | **0** (`git ls-files recon`) |
| `recon/` ever in git history | **No** (`git log --all -- recon` empty) |
| Currently staged | **No** |
| Sensitive values in `docs/`, `CLAUDE.md`, `PRODUCT.md` | **None found** (scripted search for the customer ID and name) |
| Capture logs | `.agent-logs/` records prompts and final responses only; a scripted scan found no identifier values in them. (During Phase 0 inspection, tool output in the working session did display the customer ID and name transiently; that output is not persisted by the capture system.) |

## Rules (apply to every future task)

- Do not open `recon/` HTML in a browser with network access (saved pages load remote scripts and may phone home with the embedded tokens); read them as text or serve them offline.
- Do not copy strings out of the logged-in captures into code, tests, docs, commits, issues or PRs.
- If a value from `recon/` must be discussed, describe its type, not its content.
