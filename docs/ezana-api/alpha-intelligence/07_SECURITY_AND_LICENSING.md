# 07 · Security and licensing review

## Entitlements

- New scope **`alpha`**, added to `ALL_SCOPES` in `src/lib/ezana-api/tiers.js`. It is included in Quant Firm and
  Institution (which take every scope) and not in Developer or Trader. No price changed.
- Scopes are stored on each key at issue time, so keys issued before this release do not have `alpha`; an admin
  can re-issue or widen them. The access-request form now offers "Alpha Intelligence signals".
- Fixed in passing: the access-request route only accepted the original nine dataset keys, so requests for
  `exec-comp`, `etf`, `eyes`, `macro`, `sanctions` and `cross` (all offered on the form) were silently
  dropped. It now derives the list from `ALL_SCOPES`.
- Recommended entitlement structure for later (not implemented, needs approval): basic descriptive signals;
  historical statistical analytics; advanced multi-source models; institutional signal feeds; bulk history;
  alerts and webhooks as separate add-ons.

## Delay and point in time

- `alpha.procurement_acceleration` is delayed per key: the key's cutoff is the as-of date for deciding which
  fiscal years are complete, so a delayed key cannot see a year it could not have seen on its cutoff date.
- The signal registry routes are not delayed; they expose definitions and coverage counts only.

## Licensing by source

| Source                            | Redistribution through the API            | Used by Alpha                                                                  |
| --------------------------------- | ----------------------------------------- | ------------------------------------------------------------------------------ |
| USAspending (federal obligations) | Public domain (US government work)        | procurement_acceleration                                                       |
| SEC EDGAR (13F, Form 4)           | Public filings                            | gated signals                                                                  |
| Senate LDA (lobbying)             | Public records                            | gated signal                                                                   |
| Ezana ticker sectors              | Ezana's own mapping                       | procurement_acceleration (sector only)                                         |
| FMP prices (`price_data_cache`)   | **Not redistributable**                   | Internal research only; no Alpha route returns prices or price-derived figures |
| OECD, World Bank, BIS             | Attribution licences; vintages not stored | gated                                                                          |
| Polymarket, Kalshi                | Per existing predictions routes           | existing routes only                                                           |

## Data handling

- Read-only queries through the existing admin client and `handler-kit` error rules: a missing relation is a 503
  with no SQL echoed; other errors name only the table.
- No new database objects, migrations or write paths in this release.
- Responses carry no personal data. Ticker, sector and public obligation totals only.
- The Google API Gateway in front of `api.ezana.world` forwards the caller's key in `X-Forwarded-Authorization`;
  the key is verified in the app as before.
