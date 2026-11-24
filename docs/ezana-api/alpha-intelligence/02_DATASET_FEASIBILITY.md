# 02 · Dataset feasibility report

Measured read-only against production on **24 Nov 2026** (no figure here is estimated). "PIT" = whether the
table records when each value became public, which a point-in-time backtest needs.

## Summary

| Dataset (table)                                                        | Rows                            | Entities                                    | Coverage                                                                                 | PIT timestamp                                         | History verdict                                                                                            |
| ---------------------------------------------------------------------- | ------------------------------- | ------------------------------------------- | ---------------------------------------------------------------------------------------- | ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Contract history by company x FY x agency (`company_contract_history`) | 28,768                          | 786 tickers                                 | FY2017 to FY2026                                                                         | No (one snapshot, synced 22 Nov 2026)                 | **9 complete fiscal years**: enough for descriptive own-history baselines                                  |
| Contract awards, action level (`usaspending_contract_awards`)          | 198,627                         | 277 tickers resolved                        | Mostly FY2026 to FY2027 (53,908 and 142,374 rows); 10 or fewer rows a year before FY2021 | Action date only                                      | Too short for history; 13 rows dated after today (FY2028 action dates up to 2027-12-26): data-quality flag |
| 13F holdings (`titans_13f_positions`)                                  | 427,465                         | 1,637 filers                                | Q1, Q2, Q3 2026                                                                          | Yes (`titans_13f_filers.first_filed_at`, `filed_at`)  | **Blocked by ingestion** (below)                                                                           |
| 13F filings index (`sec_filings`, 13F-HR)                              | 5,791 13F rows                  | 1,684 CIKs                                  | 2026                                                                                     | Yes (`filed_at`)                                      | Index is complete; holdings parsing is not                                                                 |
| Form 4 (`sec_insider_transactions`)                                    | 24,572 (2,248 open-market buys) | 2,507 issuers                               | Filed 30 Sep to 23 Nov 2026 (54 days)                                                    | Yes (`filed_at`)                                      | **Blocked by history**: 54 days                                                                            |
| Lobbying (`lobbying_filings`)                                          | 270,205 (est.)                  | 1,204 tickers mapped in 2026 (863 verified) | Filing years 2024 to 2026                                                                | Yes (`dt_posted`)                                     | **Blocked by history**: 2 complete years                                                                   |
| Congressional trades (`congress_trades_enriched`)                      | 56,312                          | 3,705 tickers                               | Trades 2014-06-16 to 2026-11-19                                                          | Yes (`disclosure_date` on 100%)                       | 12 years: **ready for statistical and predictive research** (internal)                                     |
| Prices (`price_data_cache`)                                            | 521,914                         | 368 tickers                                 | 2009-07-22 to 2026-11-23                                                                 | n/a                                                   | Licensed (FMP). Internal evaluation only; never redistributed                                              |
| SEC fundamentals (`sec_fundamentals`)                                  | 558,752                         | 6,488 tickers                               | Period ends 2020 to 2026                                                                 | Accession number on 100% (filing date derivable)      | Usable as controls once filing dates are joined                                                            |
| Macro (`macro_series_values`)                                          | 1,919,884                       | 48,202 series                               | 1948 to 2031 (includes projections)                                                      | **No**: only `fetched_at`; no release date or vintage | **Blocked for point-in-time** use                                                                          |
| Prediction-market snapshots                                            | 1,141,500                       | 19,307 markets                              | 2026-10-20 to 2026-11-24 (35 days)                                                       | Yes (`captured_at`)                                   | Too short for calibration                                                                                  |
| Patents (`eyes_patents`)                                               | **0**                           | -                                           | -                                                                                        | -                                                     | **Blocked by ingestion**                                                                                   |
| Ticker sectors (`ticker_sectors`)                                      | 6,518                           | 12 sectors                                  | Static (updated 2026-10-03)                                                              | No                                                    | Fine for peer grouping; no history of reclassification                                                     |

## 13F: the decisive finding

| Quarter              | Holdings parsed (filers) | 13F-HR filings indexed                   | Parsed share | Filers parsed in this and the prior quarter |
| -------------------- | ------------------------ | ---------------------------------------- | ------------ | ------------------------------------------- |
| Q1 2026 (2026-03-31) | 77                       | not measured                             | -            | -                                           |
| Q2 2026 (2026-06-30) | 1,499                    | 1,813 (incl. amendments)                 | about 83%    | 58 (with Q1)                                |
| Q3 2026 (2026-09-30) | 148                      | 1,575 (originals; 99 amendments besides) | **9.4%**     | **29** (with Q2)                            |

The Q3 filing deadline (14 Nov 2026) has passed and the filings are indexed, but holdings have been parsed for
only 148 filers. A quarter-over-quarter comparison across 29 filers would turn every unparsed filer into a
false "exit". Every 13F-based signal is therefore gated on: at least 80% of indexed 13F-HR filings parsed for
the latest complete quarter, and at least 500 filers with both quarters. `GET /v1/alpha/signals` reports both
figures live, so the gate opens on its own once parsing catches up.

## Contracts: completeness by fiscal year

| FY   | Tickers | Obligations ($bn) | Rows with net negative obligations |
| ---- | ------- | ----------------- | ---------------------------------- |
| 2017 | 575     | 198.5             | 7.2%                               |
| 2018 | 557     | 220.2             | 7.2%                               |
| 2019 | 556     | 235.6             | 7.3%                               |
| 2020 | 579     | 277.4             | 7.4%                               |
| 2021 | 566     | 263.7             | 8.3%                               |
| 2022 | 555     | 281.4             | 7.7%                               |
| 2023 | 560     | 304.4             | 8.4%                               |
| 2024 | 571     | 287.9             | 9.3%                               |
| 2025 | 559     | 322.3             | 10.5%                              |
| 2026 | 504     | 165.3             | 10.8%                              |

FY2026 ended 30 Sep 2026 but stands at about 54% of the median of the three prior years: it is still being
reported (DoD publishes with a 90-day lag) or loaded. The completeness rule in code (window closed and at
least 80% of the three-year median) excludes it automatically; FY2025 is the latest complete year.

Negative rows are de-obligations (funds withdrawn), which are real and kept; the statistics are robust to them.

## Mapping and licensing notes

- Contract recipients map to tickers by recipient and parent name resolution (`contractor_tickers`,
  `contract_awards_resolved.ticker_source`); unmapped subsidiaries are missing, and corporate actions move
  obligations between tickers.
- Lobbying client to ticker mappings carry `verified`, `match_method` and evidence (717 to 863 verified tickers a
  year); only verified mappings should feed statistical work.
- CUSIP appears in 13F positions; Ezana redistributes it only as filed.
- Prices are FMP-licensed: allowed for internal research, not for redistribution through the API (see 07).
