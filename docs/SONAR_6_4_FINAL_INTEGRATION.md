# Sonar 6.4 final integration and data reliability (Nov 28 2026)

No Anthropic API calls were made for this work. Everything is verified with deterministic fixtures, mocked providers, source scans and read-only database queries. No migration was applied, nothing was backfilled, and no flag was turned on.

## 1. FMP sample-data audit

The Nov 27 fallback served synthetic data to every visitor whenever FMP refused a request (the invoice-related 403). It now runs only where it is allowed:

| Context | FMP refuses (401/402/403) |
|---|---|
| `FMP_SAMPLE_MODE` unset or `off` (the default) | the route returns its `unavailable` state: 503 or an empty, labelled payload, `x-ezana-data-state: unavailable`, no-store |
| `FMP_SAMPLE_MODE=demo`, preview or development deployment | sample data, labelled |
| `FMP_SAMPLE_MODE=demo`, production, verified staff (`app_metadata.role = 'admin'` or the `ADMIN_EMAILS` allowlist) | sample data, labelled |
| `FMP_SAMPLE_MODE=demo`, production, everyone else | unavailable state |

`user_metadata` (which the user can edit) is never read. A client cannot ask for sample data: the server decides and reports the result in a header.

What the audit checked, with a test for each: 12 wrapped routes (research company, comps, stock stats, sector performance, company metrics, stock candles, movers, index history, index week, crypto, commodities, sample status). None of them writes to the database. Nothing under Sonar, trading, crons, Alpaca or quotes imports the wrapper. Sample rows carry `_sample: true` and the name suffix "(sample data)". Sample responses are never cached (`no-store`).

## 2. Provider-data state contract

`src/lib/market-sample/state.js` defines three states: `live`, `sample` and `unavailable`. The header is `x-ezana-data-state`. A wrapped route that reads another Ezana route takes on that route's state, so index history built from index week stays labelled. The client observer (`client-state.js`) reads only that header and sets `body[data-market-data]`.

When the state is sample, the user sees:
- a sticky disclosure banner;
- "SAMPLE DATA" on every chart;
- a tooltip label "Sample data, not market data";
- CSV exports with a first-line disclaimer and a `-SAMPLE` filename suffix.

## 3. Demonstration policy

- **Turn it on:** set `FMP_SAMPLE_MODE=demo`. It is meant for preview deployments, or for staff demos in production.
- **Turn it off:** unset the variable. Rendering of live data is unchanged in every mode.

**This reverses the Nov 27 instruction** to show mock data to everyone while FMP is unpaid. Normal users now see "unavailable" until FMP is paid, unless demo mode is set.

## 4. Registrant mapping (predecessor and successor CIKs)

**The cause:** SEC's ticker list puts XOM on ExxonMobil Holdings Corp (CIK 2115436, Form 8-K12B effective 2026-07-01). The FY2025 10-K sits under Exxon Mobil Corp (CIK 34088). The frames ingest therefore dropped Exxon's annual facts. In total, 173 tickers have recent quarterly revenue but no CY2025 annual revenue. Scanning their filings found 8-K12B or 8-K12G3 filings for:
- XOM, DMRC, XPRO, REAX, SKYD, XTND, CLYD and UMEW, which are recent;
- STX, DBRHP, EAI and BLMH, which are old and already settled.

**What changed:**
- `SQL_01_sec_registrant_successions_table.md` creates the table. It records the current ticker, successor and predecessor CIK, effective date, relationship type, source accession and form, verified status, `applies_from`/`applies_to`, provenance and notes. RLS allows reads; only the service role writes.
- `SQL_02_sec_registrant_successions_seed.md` adds:
  - three verified rows: XOM 34088 to 2115436, DMRC 1438231 to 2119322, XPRO 1575828 to 2126198;
  - two unverified rows, REAX and SKYD. Both are mergers of two businesses, and REAX's predecessor files IFRS 40-F reports.
- `src/lib/sec/registrant-map.js` uses only verified rows that have a source filing. It applies a row only to periods that end before the effective date (no look-ahead), and respects any period bounds on the row.
- Matching ticker symbols never join two entities. A stored fact keeps the CIK that filed it, and the successor's own fact for a frame wins.
- The ingest reads the table only when `SEC_PREDECESSOR_MAPPING=1`. Until then the change does nothing.

The tests cover Exxon, the day before and on the effective date, unverified Paramount, a missing source filing, period bounds and validation.

## 5. Revenue concept coverage

**Before** (production, read-only, today): CY2025 annual revenue covers 4,120 tickers. 2,077 use `us-gaap:Revenues` and 2,043 use `RevenueFromContractWithCustomerExcludingAssessedTax`. The v2 concepts (`IncludingAssessedTax`, `RegulatedAndUnregulatedOperatingRevenue`) have not landed yet.

**Estimated after:** about 226 more companies once the 06:40 UTC ingest runs, 13 of them in Energy (132 to 145 of 212). The v2 concepts come after the v1 concepts, so they only fill gaps and never replace a value already filed.

**New comparability rule** (`revenueGrowth` in calc.js), with the reason kept:
- Growth needs two consecutive fiscal years, 330 to 400 days apart.
- The prior year must be positive. Missing is never zero.
- Both years must use the same XBRL concept, so gross revenue is never divided by net revenue.
- Of the 4,026 tickers with both years, 68 switched concepts between CY2024 and CY2025. Their median absolute "growth" was 60%, and 35 moved by more than 50%: tagging artefacts. They now show no growth, with a reason.
- Rows stored before `taxonomy_concept` existed are compared as before.

**Still unsupported:** IFRS filers (20-F and 40-F, about 20 in Energy), company-extension and dimension-only revenue (APA), and bank revenue concepts, which measure something different.

## 6. Total debt and D/E regression results

The debt tests now number 11, all passing. They cover:
- Amplify (AMPY) qualified, Halliburton (HAL) complete, Exxon (XOM) with leases flagged and commercial paper not counted twice, Valero (VLO) qualified;
- commercial paper versus short-term borrowings, and finance leases flagged;
- every single zero component, which never gives a definitive 0.00x;
- negative or missing equity, banks marked not meaningful, REITs kept;
- stale components not mixed;
- restated filings: the latest filing replaces the earlier one on (cik, concept, frame).

Ratios now also carry `total_debt_status` and `balance_sheet_date` alongside the existing method and status.

## 7. Price service proposal

`src/lib/prices/price-contract.js` (`price-contract-v1`) is pure and not wired into anything yet. Each price point records security, price, currency, price date, kind, adjustment, provider, via, freshness and age in days, redistribution, state, reason and cache version. It has normalizers for FMP quotes, Alpaca bars, `price_data_cache` rows, Alpha Vantage and Finnhub, plus an explicit unavailable point and `usableForValuation`. That check rejects sample, unavailable and stale points.

The audit also found that the screen-price sync stores FMP quotes with `adj_close` copied from `close`. The contract labels those rows `adjustment: unknown`.

`SONAR_PRICE_SYNC` stays disabled, and the Alpaca batch refresh is not activated.

**Proposed next step:** migrate callers one at a time: Sonar valuation, then `daily-bars`, then the screens.

## 8. Quiver verification

These are now tested:
- A 403 is remembered per route for an hour. Every caller gets 503 `provider_unavailable` after a single upstream attempt.
- Congress trades on the same key keep working.
- No Quiver route or the proxy writes to the database.
- No Quiver-touching file writes a 13F table.
- The lobbying harvest inserts unverified rows with `ignoreDuplicates`.
- Sonar never calls Quiver for 13F data; it reads `sec_13f_effective_filings` and `sec_13f_holdings`.
- The quota still applies only to cache misses.

## 9. Sonnet 5.5 writer canary (configured, disabled)

The `S55W` profile is the `current` profile with only the standard writer changed, to `claude-sonnet-5-5`. Nobody gets it unless a flag names it.

**Evidence** (existing suite `model-bench-2026-11-28-contract`, no new runs):
- claim survival 0.946 versus 0.830 for the Haiku writer with the same contract;
- judge pairs 45 to 7;
- writer cost $0.050 versus $0.030 a run;
- writer time 25.9 s versus 14.8 s.

Caveat: the contract activated in only 2 of 13 cases, so the quality gap is mostly the model itself.

**Enable for staff only:**
```
SONAR_MODEL_CANARY_PROFILE=S55W
SONAR_MODEL_CANARY_STAFF=1
```
(Optionally add named users with `SONAR_MODEL_CANARY_USERS`; leave `SONAR_MODEL_CANARY_PERCENT` at 0.)

**Monitor:**
- `sonar_research_runs.plan.models`: requested versus served models and usage;
- cost per standard run, against the expected +$0.02;
- p50 and p95 latency;
- `validation` claim support rate and claims removed, compared week over week with `current`.

**Roll back when** cost per run exceeds $0.06, claim support falls below the current baseline, or p95 latency exceeds 45 s. To roll back, unset `SONAR_MODEL_CANARY_PROFILE`; the next run uses `current`.

## 10. Tests and changed files

All Sonar, semantic and composer suites pass. Analyst evaluations: 153 of 253 pass, unchanged.

Suite results:
- market-sample 10
- debt-equity 11
- typed-relevance 6
- quiver-proxy 3
- registrant-map 7
- revenue-growth 7
- price-contract 6
- provider-isolation 4
- sonar-model-routing 25
- cron-dispatch 4

**Changed files:**
- `src/lib/market-sample/{state,index,client-state}.js`
- `src/app/api/market-data/sample-status/route.js`
- `src/components/market-sample/*`
- `ThreeStatementWorkspace.jsx`
- `src/lib/sec/registrant-map.js`
- `src/app/api/cron/ingest-fundamentals/route.js`
- `src/lib/sonar/composer/{calc,analytics-server,execute}.js`
- `src/lib/prices/price-contract.js`
- `src/lib/sonar/engine/typed-relevance.js`: a central-bank question that names a company keeps that company's sources as inputs
- `src/lib/sonar/model-routing.js`
- `scripts/check-*.mjs`
- `package.json`

## 11. Remaining limitations

- With FMP refusing and demo mode off, FMP-backed pages show unavailable states until the invoice is paid.
- The registrant table does nothing until SQL 01 and 02 run and `SEC_PREDECESSOR_MAPPING=1` is set for an approved backfill.
  - Predecessor rows store under the predecessor's CIK, so a ticker can then have two CIKs over time.
  - The lobbying identity check in `20261124090000` assumes one CIK per ticker and will need to allow verified successions.
- Successors with no identified predecessor are not seeded: XTND, CLYD, UMEW.
- Revenue v2 coverage is an estimate until the next ingest.
- The price contract is a proposal with no callers yet.
- `sonar_research_runs` monitoring for the canary is manual; there is no dashboard.

## 12. Approvals needed

1. Run SQL 01 and SQL 02.
2. Approve the predecessor backfill. To do it: set `SEC_PREDECESSOR_MAPPING=1` and run `ingest-fundamentals` once, then unset it or leave it on.
3. Decide whether to verify the REAX and SKYD rows.
4. Decide whether to set `FMP_SAMPLE_MODE=demo` for preview deployments or staff until FMP is paid.
5. Decide whether to enable the S55W staff canary.
6. Approve migrating Sonar valuation to the price contract.
