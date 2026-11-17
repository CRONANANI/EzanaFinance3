# Adaptive research: implementation matrix

Last updated Nov 17, 2026 (phase 4: validation tooling, save and controls, the
remaining scenarios, council overlays). Keep this file in step with `EXECUTORS`
in `src/lib/sonar/adaptive/orchestrator.js`, `OVERLAYS` in `overlays.js` and
`executable` in `profiles.js`. What the data holds is in `DATA_COVERAGE.md`.

## The four levels of evidence

A pipeline is only as proven as the highest level it has reached. They are not
interchangeable, and passing fixtures does not make a pipeline production-ready.

| Level                      | Meaning                                                                                                                                | Where it stands                           |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| Fixture-tested             | The executor runs end to end on fixture data in `npm run test:sonar-adaptive`; its output passes the schema                            | All 30 scenarios and 4 overlays           |
| Database-verified          | The tables or functions its reader calls were queried read-only in production and shapes and figures checked                           | Marked "DB" below                         |
| Live-provider-tested       | `npm run validate:sonar -- --run` executed the question against the deployed route with real providers and its checks passed           | None yet: the run needs your test account |
| Fully production-validated | Live-provider-tested, plus source links opened, charge and kill switch confirmed, and a person has read the answer against its sources | None yet                                  |

**No pipeline is production-validated.** The "Live" column stays "Not run"
until the validation runner has been executed against production; see
"Production validation" below.

Column key: **Cite/calc** says how citations and figures are checked today.
"Schema" means the report validator drops any claim without a source and any
chart or table that fails its rules. "Arithmetic tested" means the figures are
recomputed in tests from fixture rows.

## Events and the news cycle

| ID  | Scenario                      | Implementation | Data coverage                                                               | Live    | Cite/calc                        | Known limitations                                                                                         | Remaining dependencies      |
| --- | ----------------------------- | -------------- | --------------------------------------------------------------------------- | ------- | -------------------------------- | --------------------------------------------------------------------------------------------------------- | --------------------------- |
| A01 | Event verification            | Built, limited | News cache and one validated research call; prediction contracts as context | Not run | Schema; status vocabulary tested | A claim is confirmed, contradicted or not established by the sources found; no primary-document retrieval | Model and news providers    |
| A02 | Executive succession          | Built          | News, filings mentions, contracts index                                     | Not run | Schema; candidates need a source | Last indexed contract price only, no price history                                                        | Model and news providers    |
| A03 | Leadership impact             | Built          | News and daily closes                                                       | Not run | Schema; arithmetic tested        | Impact links are labelled interpretation unless sourced                                                   | Model, news, prices         |
| A04 | Earnings preview and surprise | Built, limited | Calendar, consensus, eight reports                                          | Not run | Arithmetic tested                | Dates labelled not confirmed; no guidance or call commentary; EPS basis is the provider's, not GAAP       | Earnings provider           |
| A05 | Why is it moving              | Built          | Daily closes, news                                                          | Not run | Arithmetic tested                | Listed securities, daily closes only; attribution is labelled, never asserted as cause                    | Prices, news, model         |
| A06 | M&A                           | Built, limited | News and one validated research call                                        | Not run | Schema                           | Sourced brief. No deal-terms table, no filings parser for merger documents                                | Model and news providers    |
| A07 | Regulatory and legal          | Built, limited | News, matching contracts                                                    | Not run | Schema                           | No structured docket data                                                                                 | Model and news providers    |
| A08 | Geopolitical shock            | Built, limited | News, matching contracts                                                    | Not run | Schema                           | Same shape as A07                                                                                         | Model and news providers    |
| A09 | Live event watch (catalysts)  | Built, limited | Earnings calendar; dated events found in sourced coverage                   | Not run | Schema; dates carry a source     | Not a live feed: dated events on record when asked. No push or refresh                                    | Earnings and news providers |
| A10 | Narrative and sentiment       | Built, limited | News and daily closes                                                       | Not run | Schema                           | No sentiment score is computed                                                                            | Model and news providers    |

## Companies and markets

| ID  | Scenario                                    | Implementation | Data coverage                                                                                      | Live    | Cite/calc                                            | Known limitations                                                                                                   | Remaining dependencies                                         |
| --- | ------------------------------------------- | -------------- | -------------------------------------------------------------------------------------------------- | ------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| B01 | Technical analysis                          | Built          | Daily closes                                                                                       | Not run | Arithmetic tested                                    | Daily bars only                                                                                                     | Price provider                                                 |
| B02 | Fundamentals, risks and thesis              | Built          | Statements; risk text from filings                                                                 | Not run | Schema; arithmetic tested                            | Risks are the company's own reported risks plus sourced findings                                                    | Statements provider, model                                     |
| B03 | Valuation and peers                         | Built          | Statements and prices                                                                              | Not run | Arithmetic tested                                    | Peer set from the provider                                                                                          | Statements and price providers                                 |
| B04 | Government contracts and revenue dependency | Built          | DB: obligations by fiscal year and agency for 786 tickers                                          | Not run | Arithmetic tested; figures spot-checked against rows | Segment revenue only where reported. Obligations are never divided by revenue                                       | None beyond providers                                          |
| B05 | Industry competition and supply chains      | Built, limited | DB: peer table; filing disclosures for about 20 tickers; registry for semiconductors only          | Not run | Schema                                               | No market-share series, no facilities or capacity data (both tables are empty)                                      | Industry tables need data                                      |
| B06 | Institutional ownership                     | Built, limited | DB: Q2 2026 widely indexed (1,499 managers); Q1 77 of 99 filings with no holdings rows; Q3 partial | Not run | Arithmetic tested                                    | One full quarter, so no manager history or cross-quarter chart. Changes are share counts, never inferred from value | **13F backfill** (dry run awaiting your review)                |
| B07 | Congressional and insider transactions      | Built, limited | DB: chamber trades (6,920 rows, paged); insider filings from Sep 30, 2026                          | Not run | Arithmetic tested                                    | No sector view, no bill-level context. Timing is never described as causal or improper                              | Longer insider history                                         |
| B08 | Lobbying                                    | Built, limited | DB: 35 verified client links (33 tickers) of 28,593 clients                                        | Not run | Arithmetic tested                                    | Most companies return "no disclosures found" until identities are verified                                          | **Lobbying identity migration and review** (awaiting approval) |
| B09 | Cross-asset and sector performance          | Built, limited | Daily closes for sector funds or the securities named                                              | Not run | Arithmetic tested                                    | Matched windows from daily closes. No intraday, no factor attribution                                               | Price provider                                                 |
| B10 | Quant: risk and return                      | Built, limited | Daily closes                                                                                       | Not run | Arithmetic tested                                    | One security; no backtests or factor models                                                                         | Price provider                                                 |

## Macro and global

| ID  | Scenario                     | Implementation | Data coverage                                                    | Live    | Cite/calc                 | Known limitations                                                                                            | Remaining dependencies          |
| --- | ---------------------------- | -------------- | ---------------------------------------------------------------- | ------- | ------------------------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------- |
| C01 | Country macro                | Built          | DB: stored series with periods, sources and projection flags     | Not run | Figures from stored rows  | Only families that are stored                                                                                | None                            |
| C02 | Country rankings             | Built          | DB: GDP measures and twelve families                             | Not run | Arithmetic tested         | Reserves and energy consumption are not stored in rankable form; period mix is stated                        | None                            |
| C03 | Commodities                  | Built          | Daily closes, sourced drivers                                    | Not run | Arithmetic tested; schema | No inventories or supply tables                                                                              | Price and news providers, model |
| C04 | Rates, inflation, credit     | Built          | DB: same reader as C01                                           | Not run | Figures from stored rows  | No forward curve; a "will they cut" question gets the data and contracts, not a forecast                     | None                            |
| C05 | FX and sovereign risk        | Built          | DB: same reader as C01                                           | Not run | Figures from stored rows  | No live FX quote in this answer                                                                              | None                            |
| C06 | Sanctions and trade exposure | Built, limited | DB: sanctions listings by name or country, by list and programme | Not run | Schema; counts from rows  | A name match on a list is shown as a match to review, never as a finding about a company. No trade-flow data | Trade data not stored           |
| C07 | Crypto                       | Built, limited | Daily closes for the asset                                       | Not run | Arithmetic tested         | Price, range and risk statistics only. No on-chain, flows or exchange data                                   | Price provider                  |
| C08 | Prediction markets           | Built          | DB: contracts index                                              | Not run | Schema                    | Last indexed price; no spread or resolution rules                                                            | None                            |
| C09 | Country comparison           | Built, limited | DB: GDP, GDP per capita, growth                                  | Not run | Arithmetic tested         | Two to six economies; other measures not yet in the comparison                                               | None                            |
| C10 | Supply chain shock           | Built, limited | News and one validated research call                             | Not run | Schema                    | Relationships only with a source                                                                             | Model and news providers        |

## Council overlays

These run through `overlays.js`, not the public executor table. Organization
data is read only when the question is about the reader's own fund, the
request is signed in, and the user is an active member; the organization is
their own membership, resolved on the server. No model or web call is made.

| ID  | Overlay                   | Implementation | Data coverage                                              | Live    | Cite/calc                        | Known limitations                                                                                                                                                                     | Remaining dependencies                            |
| --- | ------------------------- | -------------- | ---------------------------------------------------------- | ------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| D01 | Fund fit (IPS)            | Built          | The fund's mandate, IPS rules and position book            | Not run | Existing `mandateChecks`, tested | Reports each rule and whether the IPS marks it blocking. **Sonar does not place, stop or approve trades, and the answer says so.** Unreadable facts are "not checked", never "passed" | A member account for live validation              |
| D02 | Pitch due diligence       | Built, limited | Pitches the member may read (row-level security)           | Not run | Read from the pitch's fields     | A checklist of what the file does not record, not a judgement of the idea. An invisible pitch is neither counted nor described                                                        | Same                                              |
| D03 | Fund risk and catalysts   | Built, limited | Position book, sectors, earnings calendar for the top five | Not run | Arithmetic tested                | Weights use stored prices or cost, not live valuations. Overlap is same ticker or same sector. No factor or correlation risk yet                                                      | Same                                              |
| D04 | Research Library, handoff | Built, limited | Council reports the member may read (row-level security)   | Not run | Lists rows as stored             | Read-only. Sonar does not attach research to a pitch, move it or change who can see it, and says so                                                                                   | A write path would need its own permission design |

**Totals: all 30 scenarios and all 4 overlays have an executor. 14 built, 20
built with a named limit. 0 live-provider-tested. 0 production-validated.**

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
| C03, C07           | One year of daily closes                                                                 |
| B09                | Returns of the sectors or securities over the window                                     |
| D03                | Weight of the largest positions                                                          |
| A02, A03, A05, B10 | Price comparison against the benchmark (existing chart)                                  |
| B01                | Price, moving averages and RSI (existing chart)                                          |

## Cross-cutting

| Item                        | State                                                                                                                                                          |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Exemplary brief expiry      | Done                                                                                                                                                           |
| Follow-ups across pipelines | Done; each follow-up is re-planned and re-researched                                                                                                           |
| Save Research               | Done. The saved snapshot carries the adaptive report and reopens read-only. Council overlay answers are refused by the save route                              |
| Session history             | Done. Adaptive answers appear under "In this session" and restore from memory                                                                                  |
| Research Controls           | Done. Sources, focus and horizon narrow the readers an executor may use; required readers cannot be switched off; the applied settings are shown on the answer |
| Streaming                   | Planned only, as asked. Plan in `README.md`. To be built once live validation is stable                                                                        |
| Kill switch                 | `SONAR_ADAPTIVE=off` returns every ping to the previous pipelines, overlays included                                                                           |
| Database test environment   | pgvector installed locally and in CI. A missing dependency fails the suite; nothing is skipped or excluded                                                     |

## Production validation

`npm run validate:sonar` prints the plan and runs nothing. With `--run` it
signs in as a dedicated test account, sends each question in
`scripts/lib/sonar-validation.mjs` (26 questions and the follow-up chains) to
the deployed route, and writes a report to `validation/` (git-ignored). It
checks scenario and plan, sources, citations, calculations, freshness, charts,
follow-up routing, latency, model cost, error handling, one charge per ping,
and, with `--kill-switch`, the previous pipeline. `--links` opens every source.

What a run costs and changes, so you can approve it first:

- **Usage charges**: one model-backed research run per question for the
  pipelines that use a model, and provider calls for prices and news. The
  report prints the measured token cost per question.
- **Production writes**: one ping reservation and one research log row per
  question, on the test account only. No other user's data is read or written.
- **Not covered**: the council overlays, until the test account is made a
  member of a test organization.

A pipeline moves to "live-provider-tested" when its row in that report passes,
and to "production-validated" when a person has also read the answer against
its sources.
