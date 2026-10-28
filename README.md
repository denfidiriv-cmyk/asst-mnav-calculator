# ASST Net Assets Calculator

Live page: https://asst-mnav-calculator.pages.dev

- `index.html` is the calculator page.
- `_worker.js` serves `/api/quote` with live ASST (Yahoo Finance, Stooq as fallback) and BTC (Coinbase, Kraken, CoinGecko) prices, and serves the static files.
- `data.json` holds Strive's company numbers. The page reads it on load.

## Updating `data.json`

Take the numbers from Strive's latest Form 8-K (CIK 0001920406), which reports holdings as of a date in the previous week:

| Field | Where in the 8-K |
|---|---|
| `asOf` | The "as of" date of the holdings table |
| `filingDate` | Date the 8-K was filed |
| `filingUrl` | URL of the 8-K document on sec.gov |
| `btcHeld` | Total bitcoin held |
| `commonShares` | Effective Common Shares Outstanding (Class A plus Class B) |
| `sataShares` | SATA (Variable Rate Series A Perpetual Preferred) shares outstanding |
| `satsShares` | SATS (15.00% Series A Perpetual SATS Preferred) shares outstanding |
| `cashUsd` | Cash and cash equivalents, in dollars |
| `updatedAt` | Date this file was edited |

Preferred claims on the page are `(sataShares + satsShares) x $100`. Pushing to `main` redeploys the site through Cloudflare Pages in about a minute.
