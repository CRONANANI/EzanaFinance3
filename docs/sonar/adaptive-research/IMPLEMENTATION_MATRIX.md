# Adaptive research: implementation matrix

Last updated Nov 17, 2026 (phase 2 completed, phase 3 added). Keep this file
in step with `EXECUTORS` in `src/lib/sonar/adaptive/orchestrator.js` and
`executable` in `profiles.js`. Data coverage and what was verified live are in
`DATA_COVERAGE.md`.

## What the columns mean

**Build**

- **Built**: routes, runs its own executor, validates its output, has a
  truthful unavailable state, renders, and has end-to-end tests.
- **Built, limited**: as above, but stored data covers only part of what the
  scenario asks. The limit is named.
- **Classified only**: the router recognises the question; the answer comes
  from the existing Sonar pipelines.

**Live** (what has been checked against production)

- **Data**: the tables or functions the reader calls were queried read-only
  in production and the shapes and figures checked (Nov 17, 2026).
- **Not run**: needs a provider key or the deployed route, neither available
  in the build workspace.

No pipeline is production-validated yet. That needs the eleven-step check at
the end of this file, run on the deployed app.

## Events and the news cycle

| ID  | Scenario                      | Build           | Live    | Notes                                                                                                                                                                                                    |
| --- | ----------------------------- | --------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A01 | Event verification            | Classified only |         |                                                                                                                                                                                                          |
| A02 | Executive succession          | Built           | Not run | Model and news needed                                                                                                                                                                                    |
| A03 | Leadership impact             | Built           | Not run | Model, news and prices needed                                                                                                                                                                            |
| A04 | Earnings preview and surprise | Built, limited  | Not run | Next date (labelled not confirmed), consensus, eight reports against estimates, two-session price move, chart. No guidance changes or call commentary; EPS basis is the provider's, labelled as not GAAP |
| A05 | Why is it moving              | Built           | Not run | Listed securities, daily closes                                                                                                                                                                          |
| A06 | M&A                           | Classified only |         |                                                                                                                                                                                                          |
| A07 | Regulatory and legal          | Built, limited  | Not run | Sourced brief from a validated research call, news cache and matching contracts. No structured docket data                                                                                               |
| A08 | Geopolitical shock            | Built, limited  | Not run | Same shape as A07                                                                                                                                                                                        |
| A09 | Live event watch              | Classified only |         |                                                                                                                                                                                                          |
| A10 | Narrative and sentiment       | Built, limited  | Not run | Sourced brief with coverage and a price comparison. No sentiment score is computed                                                                                                                       |

## Companies and markets

| ID  | Scenario                                    | Build           | Live    | Notes                                                                                                                                                                                                                                                                                             |
| --- | ------------------------------------------- | --------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| B01 | Technical analysis                          | Built           | Not run | Prices needed                                                                                                                                                                                                                                                                                     |
| B02 | Fundamentals, risks and thesis              | Built           | Not run | Statements and model needed                                                                                                                                                                                                                                                                       |
| B03 | Valuation and peers                         | Built           | Not run | Statements and prices needed                                                                                                                                                                                                                                                                      |
| B04 | Government contracts and revenue dependency | Built           | Data    | Obligations by fiscal year and agency for 786 tickers, agency concentration, chart, a stated-cut sensitivity. Segment revenue only where the company reports a government segment. Obligations are never divided by revenue. No lobbying or policy feed inside this answer (B08 is its follow-up) |
| B05 | Industry competition and supply chains      | Built, limited  | Data    | Peer table, customer and commitment disclosures quoted from filings (about 20 tickers), registry value chain (semiconductors only), sourced findings. No market-share series, no facilities or capacity data: both tables are empty                                                               |
| B06 | Institutional ownership                     | Built, limited  | Data    | Share counts, concentration, same-filer changes, fund holdings table. One quarter is indexed widely, so no manager history or cross-quarter chart yet                                                                                                                                             |
| B07 | Congressional and insider transactions      | Built, limited  | Data    | Named member, company and chamber views; committee seats as context; insider filings in a separate table. Insider data starts Sep 30, 2026. No sector view and no bill-level legislative context                                                                                                  |
| B08 | Lobbying                                    | Built, limited  | Data    | Spending by year and policy area. Only 33 tickers have a verified client link, so most companies return "no disclosures found"                                                                                                                                                                    |
| B09 | Cross-asset and sector performance          | Classified only |         |                                                                                                                                                                                                                                                                                                   |
| B10 | Quant: risk and return                      | Built, limited  | Not run | Volatility, drawdown, beta, correlation from daily closes for one security. No backtests or factor models                                                                                                                                                                                         |

## Macro and global

| ID  | Scenario                     | Build           | Live    | Notes                                                                                                                                                                                                                           |
| --- | ---------------------------- | --------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| C01 | Country macro                | Built           | Data    | A country's stored series with periods, sources, projection flags and a history chart                                                                                                                                           |
| C02 | Country rankings             | Built           | Data    | GDP measures plus twelve families (oil and gas, inflation, unemployment, debt, fiscal balance, current account, policy rate, goods exports). Period mix stated. Reserves and energy consumption are not stored in rankable form |
| C03 | Commodities                  | Built           | Not run | Price in its one-year range with chart, sourced drivers. No inventories or supply tables                                                                                                                                        |
| C04 | Rates, inflation, credit     | Built           | Data    | Same reader as C01 on rate and inflation families; "the Fed" and other central banks resolve to their country                                                                                                                   |
| C05 | FX and sovereign risk        | Built           | Data    | Same reader on currency and external families                                                                                                                                                                                   |
| C06 | Sanctions and trade exposure | Classified only |         |                                                                                                                                                                                                                                 |
| C07 | Crypto                       | Classified only |         |                                                                                                                                                                                                                                 |
| C08 | Prediction markets           | Built           | Data    | Contracts that name the entity; none is said plainly                                                                                                                                                                            |
| C09 | Country comparison           | Built, limited  | Data    | Two to six named economies on GDP, GDP per capita and growth. Other measures are not in the comparison yet                                                                                                                      |
| C10 | Supply chain shock           | Built, limited  | Not run | Sourced brief; relationships only with a source                                                                                                                                                                                 |

## Council overlays

| ID  | Overlay                             | Build           | Notes                                                 |
| --- | ----------------------------------- | --------------- | ----------------------------------------------------- |
| D01 | Fund fit (IPS)                      | Classified only | Phase 4. No organization data is read by any executor |
| D02 | Pitch due diligence                 | Classified only | Phase 4                                               |
| D03 | Fund risk and catalysts (holdings)  | Classified only | Phase 4                                               |
| D04 | Research handoff (Research Library) | Classified only | Phase 4                                               |

**Totals: 24 of 30 scenarios have an executor (13 built, 11 built with a
named limit); 6 classified only; 4 overlays classified only.**

## Charts

Every chart is drawn from typed values in the report (`series_chart`), which
the schema removes unless each series holds at least two real numbers.

| Pipeline           | Chart                                                                                    |
| ------------------ | ---------------------------------------------------------------------------------------- |
| B06                | Shares reported by the largest holders; switches to quarters once two are indexed widely |
| B07                | Disclosed purchases and sales by month                                                   |
| C02, C09           | Bars of the ranked or compared economies; C02's table is sortable                        |
| A04                | Earnings per share, estimate against reported                                            |
| B04                | Obligations by fiscal year                                                               |
| C01, C04, C05      | The first series' five-year history                                                      |
| C03                | One year of daily closes                                                                 |
| A02, A03, A05, B10 | Price comparison against the benchmark (existing chart)                                  |
| B01                | Price, moving averages and RSI (existing chart)                                          |

## Cross-cutting

| Item                                       | State                                                                    |
| ------------------------------------------ | ------------------------------------------------------------------------ |
| Exemplary brief expiry                     | Done                                                                     |
| Follow-ups across pipelines                | Done for built pipelines; each follow-up is re-planned and re-researched |
| Saving adaptive answers                    | Not built                                                                |
| Streaming                                  | Not built                                                                |
| Research Controls applied to adaptive runs | Not built                                                                |
| Kill switch                                | `SONAR_ADAPTIVE=off` returns every ping to the previous pipelines        |

## Open item needing a decision

`npm run test:rls` fails in the build workspace: its local Postgres has no
pgvector, and `20261122090000_sonar_exemplary_briefs.sql` (Nov 16) creates a
vector column. The security test was not changed. Either the harness needs
pgvector, or that migration needs to be kept out of the harness the way
`live_only` files are; that is a change to a security test and is left for
review.

## Production validation, still to do

On the deployed app, signed in, for each built pipeline:

1. Ping the question in the table below.
2. Read the `[sonar/landing] adaptive` log line: scenario, ms, `degraded`.
3. `degraded` is empty.
4. Every figure in a table matches its chart.
5. Every source link opens.
6. No candidate, catalyst, risk, relationship or figure appears without a citation or an interpretation label.
7. The unavailable state appears when a source is switched off.
8. A stale input (an old quarter, an old close) is dated on the page.
9. A follow-up routes to the neighbouring pipeline and carries the subject.
10. The ping is charged once.
11. `SONAR_ADAPTIVE=off` restores the previous answer.

| Pipeline | Question                                                            |
| -------- | ------------------------------------------------------------------- |
| B01      | Is NVIDIA technically oversold?                                     |
| A02      | Who will replace Jensen Huang?                                      |
| A03      | How will the CEO change affect NVIDIA and the chip industry?        |
| A05      | Why is NVDA stock down this week?                                   |
| B03      | Is NVIDIA expensive compared with its peers?                        |
| B02      | What are NVDA’s biggest risks?                                      |
| B05      | Which semiconductor companies benefit if NVIDIA loses market share? |
| B06      | Which institutions hold NVDA?                                       |
| B07      | What has Nancy Pelosi been buying?                                  |
| B07      | Are insiders selling NVDA?                                          |
| A04      | When does NVDA report earnings next?                                |
| B04      | How dependent is Lockheed Martin on government contracts?           |
| B08      | How much does Microsoft spend on lobbying?                          |
| B10      | What is NVDA’s volatility and max drawdown?                         |
| C02      | Which countries produce the most crude oil?                         |
| C01      | How is Turkey’s lira doing?                                         |
| C04      | Will the Fed cut rates next month?                                  |
| C09      | Compare the economies of India and Brazil                           |
| C03      | Where could Brent oil trade if OPEC supply rises?                   |
| C08      | Does any prediction market price NVIDIA’s next CEO?                 |
| A08      | How would new chip export restrictions affect ASML?                 |
