# Sonar 6.4 final hardening (Nov 28 2026)

Continues docs/SONAR_6_4_HARDENING.md (3f061237). Commits 2476a73c..06528f8f on main. The
semantic layer, execution graph, Composer and rendering were not rebuilt.

## 0. Temporary: sample data while FMP refuses the key

FMP answers 403 until the invoice is paid (Tuesday). `src/lib/market-sample/` answers an FMP
401/402/403 with deterministic sample data in FMP's own response shape, only inside the
equities and asset routes wrapped with `withFmpSample`: company research, comps, stock stats,
company metrics, stock candles, sector performance, movers, index history and week, crypto,
commodities. Names read "(sample data)", responses carry `x-ezana-sample: 1` and `no-store`,
and a banner on Company Research, Market Analysis, Home, Watchlist and Financial Analytics says
the figures are sample values. Never wrapped: Sonar, crons, trading and quote routes (they have
Alpha Vantage and Finnhub fallbacks), the public landing quote, anything that writes to the
database. Search, peers, earnings, dividends, grades, calendars and DCF have no sample and stay
unavailable. After a refusal FMP is not called again for 10 minutes; live data returns by itself
once FMP answers 200. `FMP_SAMPLE_MODE=off` disables it. Remove the wrapper after payment if you
prefer (one import per route).

Effect on Sonar during the outage: live quotes fail, so valuation screens price only companies
with stored closes and report the rest as unchecked (bounded). Nothing is substituted.

## 1. Production ingestion status (17:05 UTC)

| | |
|---|---|
| eligible companies (ticker_sectors) | 6,518 |
| rows in company_industry | 2,282 (two hourly runs) |
| classified with a SIC code | 2,140 |
| registrants with no SIC (funds, trusts) | 142 |
| stale (older than 90 days) | 0 |
| last synchronization | 2026-11-28 17:03 UTC |
| runs | 16:00 1,157 written; 17:00 1,125 of 1,200 queued (75 tickers have no CIK in SEC's list) |

At 1,200 a run the backfill completes in about four more hourly runs (around 21:00 UTC). Until
then industry screens are reported as bounded with the unclassified count.

## 2. Scheduler safety audit

- Checkpointing: the industry sync queues missing tickers first, then rows older than 90 days;
  each run upserts on `ticker`, so a repeated or interrupted run writes the same rows
  (idempotent). Registrants with no SIC are stored with `sic` null and are not re-requested.
- Locks vs runtime: every dispatched job keeps `cronRoute`'s lock with a TTL longer than its
  function limit (industry sync: TTL 330 s, maxDuration 300 s, work budget 260 s; price sync
  TTL 300, budget 240; dispatcher TTL 55, maxDuration 60), so a lock cannot expire while the job
  still runs, and a second dispatch while it runs answers `skipped: locked`.
- Acknowledgment window: the dispatcher waits 6 s, then reports a still-running job as
  `started`; Vercel does not cancel a function when its caller disconnects (request cancellation
  is opt-in and off). The job's own run row records its outcome.
- Retries only for fast failures (network, 5xx, 429), at most once with backoff; 4xx are not
  retried. Concurrency: 8 dispatches per tick, 1 per upstream group (`sec-edgar`, `fmp`).
- Run-log status: two jobs returned a `skipped` field that marked whole runs as skipped in
  ingest_runs; renamed (`lockSkipped`, `gaps`). The 16:00 industry run shows `skipped` for that
  reason; the 17:00 run shows `ok`.
- Benchmarks: another session removed the six model-bench lanes from the dispatcher (API credits
  exhausted). Nothing dispatches them now.
- Vercel crons: 95 definitions (limit 100).

SQL_02 (country columns) review: three `add column if not exists` (nullable text, no default,
so no table rewrite) and one index on a ~6,500-row table; additive, idempotent, safe to apply.
After you run it: the next hourly sync refreshes the rows read before the columns existed
first, so country screens become available within about six hours; until then "Canadian banks"
is refused with a notice, never substituted.

## 3. Debt to equity

Before: `long_term_debt` = LongTermDebtNoncurrent, else LongTermDebt (noncurrent and total
semantics mixed under one key), divided by equity. AMPY read 0.00x because its 10-K tags
LongTermDebtNoncurrent 0 and no current-debt concept.

Now (calc.js `totalDebt`, `debtToEquity`): total debt = noncurrent + current, from one-concept
components dated the same balance-sheet date as equity:
noncurrent = LongTermDebtNoncurrent, else LongTermDebt minus LongTermDebtCurrent, else
LongTermDebtAndCapitalLeaseObligations (flagged: includes finance leases); current = DebtCurrent,
else LongTermDebtCurrent plus ShortTermBorrowings (else CommercialPaper, never both); LongTermDebt
alone counts as long-term debt including its current portion. Status complete / partial /
unavailable; the ratio only when complete. Negative equity and banks and insurers (SIC 6000-6799,
REITs excepted) are not meaningful; missing equity is unavailable. Restatements: the newest
filing for a frame replaces the older value (upsert on cik, concept, frame). The DCF deducts
total debt when complete, else filed long-term debt (named in its limitations), and refuses
when no debt figure is filed.

Regression tests (FY2025 10-K values from SEC companyfacts): AMPY qualified (not 0.00x); HAL
7,158 / 10,461 = 0.684; XOM (34,241 + 9,296) / 259,386 = 0.168 with commercial paper not
double counted; VLO qualified (LongTermDebt beside DebtCurrent with no current portion to
separate them). `npm run test:debt-equity`.

The new components are filled by the existing daily ingest-fundamentals run (no new job);
until they arrive, debt to equity reports as unavailable rather than using the mixed v1 key.

## 4. Fundamentals coverage

80 of 212 Energy companies had no filed annual revenue:

| cause | count | examples |
|---|---|---|
| delisted, merged, warrants or units, royalty trusts (no SEC facts) | 33 | PXD, MMP, SHLX, ETP, METCB, NUAIW |
| foreign private issuers (20-F/40-F, IFRS; only dei facts) | about 20 | BP, SHEL, TTE, EQNR, CNQ, SU, PBR |
| revenue under a concept the map lacked | 13 | VLO, HAL, RES, TTI, CAPL, METC, LFUS, MGEE, HCC, DWSN, DMLP, EPSN, UFG |
| successor registrant: annual facts filed under the old CIK, ticker now maps to a new CIK | at least 5 | XOM (34088 -> 2115436), XPRO, EROC, EROK, NRT |
| revenue only with XBRL dimensions or a company extension | several | APA |
| stale | 1 | VIST (2023) |

Concept map v2 (`src/lib/sec/concept-map.js`, versioned, appended so existing values do not
change) adds RevenueFromContractWithCustomerIncludingAssessedTax and
RegulatedAndUnregulatedOperatingRevenue. Bank revenue concepts were not added (different
measure); APA stays missing (no total in standard non-dimensional XBRL). Estimated gain once
the daily ingest refreshes revenue (CY2025 frames checked against Ezana's tickers): 226
companies across the universe, 13 in Energy (132 -> 145 of 212).

Ingestion defect found: 173 tickers have quarterly facts but no annual facts. For XOM the
cause is a successor registrant (SEC's ticker list now maps XOM to CIK 2115436; the FY2025 10-K
facts are under CIK 34088). Fix (not built): a reviewed predecessor-CIK table seeded from
successor filings (Form 8-K12B), used by the frames ingest. Not done by string exception.

## 5. Price coverage proposal (SONAR_PRICE_SYNC stays off)

Existing infrastructure: `price_data_cache` (shared table, ~372 tickers, written by the Quant
Lab and award-price jobs from FMP then Alpaca daily bars), `lib/prices/daily-bars.js` (FMP ->
Alpaca IEX -> cache), trading quotes (FMP; Alpha Vantage fallback), batch quotes (Alpha Vantage
then Finnhub), Sonar valuation (stored closes first, then capped FMP quotes).

Proposal, no new ingestion system: one price service over `price_data_cache`:
1. write-through: every authorized close Ezana already fetches (quotes for pages, Sonar valuation,
   charts) is stored with its source and date, so demand fills the cache
2. batched end-of-day refresh for the screenable universe through Alpaca's multi-symbol daily
   bars (already used in daily-bars.js): about 65 requests a day for 6,500 symbols, versus about
   6,000 FMP quote calls; priority order watchlists, then research universes, then the rest
3. freshness metadata (date, source, adjusted or raw) on every price; screens keep reporting
   unpriced companies as unchecked
4. per-provider ceilings in the dispatcher (requests per run and per day)
Before activation: confirm Alpaca's market-data terms allow displaying IEX closes to Ezana
users (the award charts already do), and the FMP plan's batch endpoint after the invoice.
Expected coverage: every US listing with an IEX print; cost: Alpaca's free IEX tier if the
terms allow display (to confirm), otherwise the FMP batch tier.

## 6. Evidence relevance

`src/lib/sonar/engine/typed-relevance.js`: before synthesis each record gets a role (input,
context, rejected) from the typed objective. Company-measure questions reject country and world
macro series unless a country is named (then context); central-bank questions reject company
sources (filings, 13F, peers, price, analysts). Rejected records are removed from synthesis,
calculated metrics, visualizations and relationships; reasons are kept in telemetry. Composer
results are never gated. `npm run test:typed-relevance`.

## 7. Writer benchmark (identical frozen evidence, 13 standard cases, 4 conditions)

| | Haiku 4.5 | Haiku 4.5 + contract | Sonnet 5.5 | Sonnet 5.5 + contract |
|---|---|---|---|---|
| claims written | 7.77 | 8.08 | 8.23 | 7.77 |
| claims kept | 6.77 | 6.69 | 7.77 | 7.38 |
| claim survival | 0.888 | 0.830 | 0.938 | 0.946 |
| objectives met | 0.955 | 0.974 | 0.929 | 0.955 |
| number fidelity | 0.990 | 0.970 | 0.996 | 0.992 |
| sentences with untraced numbers | 0.54 | 1.15 | 0.31 | 0.23 |
| citation validity | 0.955 | 1.000 | 1.000 | 1.000 |
| writer time | 25.9 s | 27.0 s | 14.8 s | 14.9 s |
| cost per run (all calls) | $0.030 | $0.030 | $0.050 | $0.050 |

Paired judgments (2 judges, both orders): contract vs none, Haiku 23-29, Sonnet 27-25 (no
difference); Sonnet + contract vs Haiku + contract 45-7.

The contract applies only to runs with Composer results, which were 2 of the 13 cases
(government dependence); on those, Haiku's survival went 0.615 -> 0.786 and 0.929 -> 0.857
(mixed). So this benchmark cannot show a contract effect; it does show the Sonnet 5.5 writer
gains beyond it: higher claim survival, fewer untraced numbers, judges prefer it 45-7, writer
1.75x faster, about $0.02 more per standard run. Routing unchanged. A contract test needs a
suite of composed cases (screens, comparisons, macro), which requires funded API credits.

## 8. Quiver 13F

The 13F endpoint answers 403 while congress trading answers 200 with the same key and header,
so the key is valid; the refusal is endpoint-specific: an entitlement of Ezana's Quiver plan, or
the endpoint path (Quiver now documents 13F under `/beta/live/sec13fchanges`, the "Hedge Fund
Activity" dataset). Confirm in the Quiver dashboard which datasets the plan includes. Changes: a
401/403 is remembered per route for an hour (no retry on every view), the route answers 503
`provider_unavailable`, and Inside the Capitol shows "temporarily unavailable from the data
provider" instead of "No recent 13F filings". Validation, rate limits, cache and logging kept.

13F capabilities by source: Sonar's institutional ownership rankings, holder breadth, quarter
changes and the screen's 13F filter read Ezana's own SEC tables (public Form 13F-HR filings).
Only the Inside the Capitol 13F card used the Quiver feed.

## 9. Objective evaluation (held-out, cases written before each change)

| | |
|---|---|
| baseline b8aa1071 | 47/63 |
| after 6.4 hardening | 56/63 |
| after final hardening | 59/63 |

Retired as development examples this round and replaced first: C02, C04, H10, H11 (phrasings
named in the brief). Still failing: H8 (refused with a notice: correct, not the expected set),
C06 ("side by side" with no comparison verb), and two older cases. Analyst routing evals
153/253, unchanged.

## 10. Changed files and tests

New: lib/market-sample/{index,generators}.js, components/market-sample/*, api/market-data/
sample-status, lib/sec/concept-map.js, lib/sonar/engine/typed-relevance.js,
scripts/check-{market-sample,debt-equity,typed-relevance}.mjs. Changed: twelve equities and asset
routes (wrapper only), dashboard layout (banner), lib/sec/xbrl.js, composer calc, analytics-server,
execute, engine (typed gate), quiver proxy and routes, Inside the Capitol page, canonical intent and
compositional grammar, dispatch and industry sync outcome fields, fixtures and held-out cases.

## 11. Known remaining issues

- FMP outage until payment: sample data on equities and asset pages; Sonar valuation bounded.
- Successor-registrant CIKs (173 tickers missing annual facts, XOM included).
- Foreign private issuers (IFRS) not ingested; dimensional or extension-only revenue (APA).
- Debt components fill over the next daily ingest runs; until then debt to equity is unavailable.
- Anthropic API credits reported exhausted by another session: model calls (writer, benchmarks)
  fail until funded; Sonar falls back to its deterministic answer.

## 12. Approvals needed before further production changes

1. Run SQL_02 (safe; see section 2).
2. After the FMP invoice: keep or remove the sample-data wrapper (it switches off by itself when
   FMP answers 200); confirm whether the FMP plan includes batch quotes.
3. Price service: approve the Alpaca-batch design after a licensing check of IEX display terms;
   `SONAR_PRICE_SYNC` stays off.
4. Quiver: confirm the plan's datasets (13F) and Commercial-tier redistribution rights.
5. Writer routing: whether to move standard research to the Sonnet 5.5 writer (+ about $0.02
   per run) once API credits are funded.
6. A predecessor-CIK table for successor registrants (data change to the fundamentals ingest).
