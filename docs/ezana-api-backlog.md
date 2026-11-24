# Ezana API backlog

Routes taken out of the API registry on 26 Oct 2026, when every documented
endpoint became live. Nothing renders this file: the `/ezana-api` docs page
and `/v1/openapi.json` show only what the API serves. A route comes back by
being built against data Ezana holds and added to a catalog module in
`src/lib/ezana-api/catalog/`.

## Removed from the registry

| Route(s)                                                                                                                                                            | Why it was removed                                                                                                                         |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `/v1/fec/contributions`                                                                                                                                             | Ezana holds aggregated donor data per candidate, not itemized contributions. `/v1/fec/candidates/{id}/donors` covers what we have.         |
| `/v1/fec/committees/{id}`                                                                                                                                           | No committee-level FEC data. `/v1/fec/candidates/{id}/outside-spending` covers the committees we have.                                     |
| `/v1/fec/signals/sector-giving`                                                                                                                                     | Mapping employers to sectors isn't reliable from our data.                                                                                 |
| News engineering group: `/v1/news/search`, `/v1/news/{id}/entities`, `/v1/news/{id}/related-markets`, `/v1/news/signals/odds-moves`, `/v1/news/sentiment/by-entity` | Not one of the 7 dimensions. The cached articles are third-party, and redistributing them through the API needs licence review.            |
| `/v1/markets/quotes`                                                                                                                                                | Redistributing FMP market data through our API isn't permitted under the data licence.                                                     |
| `/v1/markets/signals`, `/v1/signals/correlations`, `/v1/signals/backtests/{id}`                                                                                     | Superseded by `/v1/cross/composite/{ticker}`. Backtests need point-in-time history we don't store yet.                                     |
| `/v1/cross/policy-to-price`                                                                                                                                         | Needs the legislation dataset (Regulatory Winds, not live).                                                                                |
| `/v1/cross/consensus-vs-fundamentals`                                                                                                                               | No mapping from markets to fundamentals.                                                                                                   |
| `/v1/cross/demand-to-guidance`                                                                                                                                      | Needs Consumer Whispers (not live).                                                                                                        |
| `/v1/cross/macro-regime-overlay`                                                                                                                                    | Needs GPR history and a regime model. Revisit once the geopolitical-risk ingest is running.                                                |
| Relationships group: `/v1/relationships/lead-lag`, `/divergence`, `/confirmation`, `/network/{entity}`, `/regime-shift`, `/backtest`                                | Confirmation lives inside `/v1/cross/composite/{ticker}`. The rest need statistical modelling and point-in-time history we don't have yet. |
| `/v1/predictions/markets/{id}/related-securities`                                                                                                                   | No reviewed mapping from markets to tickers yet; guessing one would mislead.                                                               |
| `/v1/predictions/alerts`                                                                                                                                            | Webhooks need delivery infrastructure (signing, retries, per-key subscriptions) that doesn't exist yet.                                    |

## Replaced by a live route

| Old route                              | Live replacement               |
| -------------------------------------- | ------------------------------ |
| `/v1/lobbying/signals/policy-exposure` | `/v1/lobbying/spend-vs-awards` |
| `/v1/contracts/agencies/{id}/spending` | `/v1/contracts/agencies`       |

## Alpha Intelligence: designed, gated by data (24 Nov 2026)

Not routes yet. Each is in `src/lib/ezana-api/alpha/signals.js` and listed by `GET /v1/alpha/signals` with the
gate that blocks it, measured live. Details: `docs/ezana-api/alpha-intelligence/`.

| Proposed route                                                      | Blocked by (observed 24 Nov 2026)                                                     |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `/v1/alpha/institutional-divergence`                                | 13F Q3 holdings 9.4% parsed (148 of 1,575); 29 comparable filers                      |
| `/v1/alpha/ownership-confirmation`                                  | Same 13F gate; Form 4 covers 54 days (needs a full quarter)                           |
| `/v1/alpha/insider-behavior-anomaly`                                | Form 4 covers 54 days (needs 730)                                                     |
| `/v1/alpha/lobbying-procurement-leadlag`                            | Lobbying starts 2024 (needs 5 complete years)                                         |
| `/v1/alpha/innovation-capital-divergence`                           | Patent table empty; 13F gate                                                          |
| `/v1/alpha/capital-crowding`                                        | 13F gate; outcome testing needs licensed prices (internal only)                       |
| `/v1/alpha/sector-rotation-pressure`                                | 13F gate                                                                              |
| `/v1/alpha/macro-regime-shift`                                      | No release dates or vintages for macro values                                         |
| `/v1/alpha/geopolitical-exposure`                                   | No verified company to geography or counterparty mapping                              |
| `/v1/alpha/event-probability-divergence`                            | Served by `/v1/predictions/consensus`; calibration needs 1 year of snapshots          |
| `/v1/alpha/alerts`, `/alert-subscriptions`, `/signals/{id}/history` | No snapshot store, delivery or POST/DELETE support yet (see 06_ALERT_ARCHITECTURE.md) |
