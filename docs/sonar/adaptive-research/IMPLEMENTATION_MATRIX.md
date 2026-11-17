# Adaptive research: implementation matrix

Last updated Nov 17, 2026 (production release: validation in production, streaming,
lobbying publication, 13F backfill). Keep this file in step with `EXECUTORS`
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

| ID  | Scenario                      | Implementation | Data coverage                                                               | Live                                                                              | Cite/calc                        | Known limitations                                                                                         | Remaining dependencies      |
| --- | ----------------------------- | -------------- | --------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | -------------------------------- | --------------------------------------------------------------------------------------------------------- | --------------------------- |
| A01 | Event verification            | Built, limited | News cache and one validated research call; prediction contracts as context | Fail (run 2): lead without a verified status; research uncited without web search | Schema; status vocabulary tested | A claim is confirmed, contradicted or not established by the sources found; no primary-document retrieval | Model and news providers    |
| A02 | Executive succession          | Built          | News, filings mentions, contracts index                                     | Pass                                                                              | Schema; candidates need a source | Last indexed contract price only, no price history                                                        | Model and news providers    |
| A03 | Leadership impact             | Built          | News and daily closes                                                       | Pass                                                                              | Schema; arithmetic tested        | Impact links are labelled interpretation unless sourced                                                   | Model, news, prices         |
| A04 | Earnings preview and surprise | Built, limited | Calendar, consensus, eight reports                                          | Pass                                                                              | Arithmetic tested                | Dates labelled not confirmed; no guidance or call commentary; EPS basis is the provider's, not GAAP       | Earnings provider           |
| A05 | Why is it moving              | Built          | Daily closes, news                                                          | Pass, research degraded                                                           | Arithmetic tested                | Listed securities, daily closes only; attribution is labelled, never asserted as cause                    | Prices, news, model         |
| A06 | M&A                           | Built, limited | News and one validated research call                                        | Pass (run 3), research could not source without web search                        | Schema                           | Sourced brief. No deal-terms table, no filings parser for merger documents                                | Model and news providers    |
| A07 | Regulatory and legal          | Built, limited | News, matching contracts                                                    | Fail (run 3): no report, falls back to standard research                          | Schema                           | No structured docket data                                                                                 | Model and news providers    |
| A08 | Geopolitical shock            | Built, limited | News, matching contracts                                                    | Pass, unavailable state                                                           | Schema                           | Same shape as A07                                                                                         | Model and news providers    |
| A09 | Live event watch (catalysts)  | Built, limited | Earnings calendar; dated events found in sourced coverage                   | Pass                                                                              | Schema; dates carry a source     | Not a live feed: dated events on record when asked. No push or refresh                                    | Earnings and news providers |
| A10 | Narrative and sentiment       | Built, limited | News and daily closes                                                       | Pass (run 3), research could not source without web search                        | Schema                           | No sentiment score is computed                                                                            | Model and news providers    |

## Companies and markets

| ID  | Scenario                                    | Implementation | Data coverage                                                                                                   | Live                    | Cite/calc                                            | Known limitations                                                                                                   | Remaining dependencies                      |
| --- | ------------------------------------------- | -------------- | --------------------------------------------------------------------------------------------------------------- | ----------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| B01 | Technical analysis                          | Built          | Daily closes                                                                                                    | Pass                    | Arithmetic tested                                    | Daily bars only                                                                                                     | Price provider                              |
| B02 | Fundamentals, risks and thesis              | Built          | Statements; risk text from filings                                                                              | Pass, research degraded | Schema; arithmetic tested                            | Risks are the company's own reported risks plus sourced findings                                                    | Statements provider, model                  |
| B03 | Valuation and peers                         | Built          | Statements and prices                                                                                           | Pass                    | Arithmetic tested                                    | Peer set from the provider                                                                                          | Statements and price providers              |
| B04 | Government contracts and revenue dependency | Built          | DB: obligations by fiscal year and agency for 786 tickers                                                       | Pass                    | Arithmetic tested; figures spot-checked against rows | Segment revenue only where reported. Obligations are never divided by revenue                                       | None beyond providers                       |
| B05 | Industry competition and supply chains      | Built, limited | DB: peer table; filing disclosures for about 20 tickers; registry for semiconductors only                       | Pass                    | Schema                                               | No market-share series, no facilities or capacity data (both tables are empty)                                      | Industry tables need data                   |
| B06 | Institutional ownership                     | Built, limited | DB: Q2 2026 (1,499 managers). Q1 and Q3 backfilling in production; a quarter is used only when complete         | Pass                    | Arithmetic tested                                    | One full quarter, so no manager history or cross-quarter chart. Changes are share counts, never inferred from value | 13F backfill running (see DATA_COVERAGE.md) |
| B07 | Congressional and insider transactions      | Built, limited | DB: chamber trades (6,920 rows, paged); insider filings from Sep 30, 2026                                       | Pass (2 questions)      | Arithmetic tested                                    | No sector view, no bill-level context. Timing is never described as causal or improper                              | Longer insider history                      |
| B08 | Lobbying                                    | Built, limited | DB: 1,229 published client links, 957 tickers (33 before). 1,194 are exact legal-name matches, labelled as such | Pass                    | Arithmetic tested                                    | Name variants and subsidiaries (e.g. Northrop Grumman, KBR, Accenture) stay unpublished until reviewed              | Review of 939 possible matches              |
| B09 | Cross-asset and sector performance          | Built, limited | Daily closes for sector funds or the securities named                                                           | Pass                    | Arithmetic tested                                    | Matched windows from daily closes. No intraday, no factor attribution                                               | Price provider                              |
| B10 | Quant: risk and return                      | Built, limited | Daily closes                                                                                                    | Pass                    | Arithmetic tested                                    | One security; no backtests or factor models                                                                         | Price provider                              |

## Macro and global

| ID  | Scenario                     | Implementation | Data coverage                                                    | Live                                                       | Cite/calc                 | Known limitations                                                                                            | Remaining dependencies          |
| --- | ---------------------------- | -------------- | ---------------------------------------------------------------- | ---------------------------------------------------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------- |
| C01 | Country macro                | Built          | DB: stored series with periods, sources and projection flags     | Pass                                                       | Figures from stored rows  | Only families that are stored                                                                                | None                            |
| C02 | Country rankings             | Built          | DB: GDP measures and twelve families                             | Pass                                                       | Arithmetic tested         | Reserves and energy consumption are not stored in rankable form; period mix is stated                        | None                            |
| C03 | Commodities                  | Built          | Daily closes, sourced drivers                                    | Pass, unavailable state (no Brent price feed)              | Arithmetic tested; schema | No inventories or supply tables                                                                              | Price and news providers, model |
| C04 | Rates, inflation, credit     | Built          | DB: same reader as C01                                           | Pass                                                       | Figures from stored rows  | No forward curve; a "will they cut" question gets the data and contracts, not a forecast                     | None                            |
| C05 | FX and sovereign risk        | Built          | DB: same reader as C01                                           | Pass (run 3)                                               | Figures from stored rows  | No live FX quote in this answer                                                                              | None                            |
| C06 | Sanctions and trade exposure | Built, limited | DB: sanctions listings by name or country, by list and programme | Pass                                                       | Schema; counts from rows  | A name match on a list is shown as a match to review, never as a finding about a company. No trade-flow data | Trade data not stored           |
| C07 | Crypto                       | Built, limited | Daily closes for the asset                                       | Pass                                                       | Arithmetic tested         | Price, range and risk statistics only. No on-chain, flows or exchange data                                   | Price provider                  |
| C08 | Prediction markets           | Built          | DB: contracts index                                              | Pass                                                       | Schema                    | Last indexed price; no spread or resolution rules                                                            | None                            |
| C09 | Country comparison           | Built, limited | DB: GDP, GDP per capita, growth                                  | Pass                                                       | Arithmetic tested         | Two to six economies; other measures not yet in the comparison                                               | None                            |
| C10 | Supply chain shock           | Built, limited | News and one validated research call                             | Pass (run 3), research could not source without web search | Schema                    | Relationships only with a source                                                                             | Model and news providers        |

## Council overlays

These run through `overlays.js`, not the public executor table. Organization
data is read only when the question is about the reader's own fund, the
request is signed in, and the user is an active member; the organization is
their own membership, resolved on the server. No model or web call is made.

| ID  | Overlay                   | Implementation | Data coverage                                              | Live                                             | Cite/calc                        | Known limitations                                                                                                                                                                     | Remaining dependencies                            |
| --- | ------------------------- | -------------- | ---------------------------------------------------------- | ------------------------------------------------ | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| D01 | Fund fit (IPS)            | Built          | The fund's mandate, IPS rules and position book            | Isolation verified with database role tests      | Existing `mandateChecks`, tested | Reports each rule and whether the IPS marks it blocking. **Sonar does not place, stop or approve trades, and the answer says so.** Unreadable facts are "not checked", never "passed" | A member account for live validation              |
| D02 | Pitch due diligence       | Built, limited | Pitches the member may read (row-level security)           | Isolation verified with database role tests      | Read from the pitch's fields     | A checklist of what the file does not record, not a judgement of the idea. An invisible pitch is neither counted nor described                                                        | Same                                              |
| D03 | Fund risk and catalysts   | Built, limited | Position book, sectors, earnings calendar for the top five | Isolation verified with database role tests      | Arithmetic tested                | Weights use stored prices or cost, not live valuations. Overlap is same ticker or same sector. No factor or correlation risk yet                                                      | Same                                              |
| D04 | Research Library, handoff | Built, limited | Council reports the member may read (row-level security)   | Isolation verified; no council reports exist yet | Lists rows as stored             | Read-only. Sonar does not attach research to a pitch, move it or change who can see it, and says so                                                                                   | A write path would need its own permission design |

**Totals: all 30 scenarios and all 4 overlays have an executor. Run against production
providers: 25 scenarios in run 2 (31 of 32 items passed), the other five in run 3 (see
below). 0 fully production-validated: model-backed research cannot cite until web search
is switched on (`SONAR_ADAPTIVE_WEB_SEARCH=on`), and no person has yet read the answers
against their sources.**

## Geo-economic impact (A08, Nov 17, 2026)

A question about how a geopolitical event reaches an economy (war, conflict, blockade,
sanctions, ceasefire, with an economic channel) is routed to A08 with a focus: overall, oil,
shipping, gold, cost, rates, inflation, scenarios or countries. Follow-ups inherit the event
only when they ask about one of its channels; "tell me the effective exchange rate" switches
intent. `geo-economic.js` runs one web-searched research call (needs
`SONAR_ADAPTIVE_WEB_SEARCH=on`) whose reply is validated: every number needs a returned link,
a unit, a basis and a date; scenarios carry no numbers or probabilities; the timeline holds
dated, sourced past events. Sections (KPI strip, oil comparison, Hormuz flows, transmission,
economy and gold side by side, scenarios, timeline) are ordered by the focus. Oil is a daily
line only from Ezana's aligned daily feed; otherwise observed prices are labelled bars, never
joined. News passes a causal relevance gate. With too few sourced figures the answer says it
could not verify the effects instead of falling back to the country dashboard.

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

Validation runs inside production, without a test account: an operator queues a run
(`insert into sonar_validation_runs (requested_by) values ('…')`, service role only), and
`/api/cron/sonar-validate` (Vercel cron, `CRON_SECRET`) puts each question through the same
planner, executors, readers, model and budgets as the landing route. No user account, no
ping reservation, no customer charge. Results are in `sonar_validation_results`; the run
records the deployed commit, the flags and which provider keys are present (never values).

| Run | Commit    | Items | Passed | Routed as expected | p50 / p90 / max         | Model calls | Web searches |
| --- | --------- | ----- | ------ | ------------------ | ----------------------- | ----------- | ------------ |
| 1   | `b40bd1b` | 31    | 29     | 31                 | 356 ms / 6.8 s / 12.7 s | 9           | 0            |
| 2   | `526b67a` | 32    | 31     | 32                 | 303 ms / 6.6 s / 15.8 s | 10          | 0            |

Model cost per run is about $0.05 (Claude Haiku 4.5). Web search is off in production, so
every model-backed research step answered without searching; its findings cannot cite
and the answers show that research could not be verified. Set
`SONAR_ADAPTIVE_WEB_SEARCH=on` to allow web search for adaptive research only (about $0.04
in searches per research-backed answer at 4 searches), then queue another run.

Tenant isolation (Nov 17, production rows, read-only role tests): a member of each of the
two organizations sees only their own organization's pitches (29 and 6), positions and
members, and none of the other's; a signed-in user with no membership and an anonymous
visitor see nothing. What the runs do not cover: the council overlays end to end (they need
a member session), the kill switches (environment
variables), and a person reading answers against their sources.

## Currency pressure (C01, view model `fx-pressure-v2`), Nov 17 2026

A strategy inside the country-macro scenario, not a parallel engine.

| Stage | Where | What it does |
| --- | --- | --- |
| Intent | `adaptive/fx-pressure.js` `fxIntent` | One-country currency questions ("is turkeys lira under pressure?", "how resilient are Türkiye's reserves?", "what could stabilize the lira?"). Returns `{ iso3, focus }`; focus is overall, reserves, inflation, crisis or stabilize. Same-day moves ("why did the lira fall today") and comparisons ("compare TRY and ZAR") return null and keep their own route. A follow-up inherits the country from `thread.fx`. |
| Route | `adaptive/router.js` | Puts C01 first and sets `plan.fx` (geo-economic intent wins when both match). `country-ref.js` now reads "turkeys" and single-country currency words (lira, rand, naira), which is why the reference question used to fall back to the legacy desk summary. |
| Evidence | `macro/intel.js` `buildCountryIntel` via `deps.countryIntel` | Best stored series per currency family, histories, and the deterministic picture and assessment (`macro/currency.js`, `macro/playbook.js` thresholds). |
| Evidence (v2) | `deps.countryDossier` -> `buildCountryDossier` | OECD headline ranks, the Key chart stories, Key indicators, Global Empire Rankings, Echo and country news, the same dossier the country board used. Read in parallel with the intel, each leg bounded. |
| View model (v2) | `buildFxPressure(intel, dossier)` | Executive brief: `lead` (verdict, narrative, why-it-matters bullets labelled supported / interpretation / cannot conclude, driver chips), `fx_overview` (country header, four dated KPIs with sparklines, pressure breakdown), `fx_findings` (the four computed findings from `macro/fx-findings.js` with evidence, meaning, why, caution). Detailed analysis: `fx_evidence` (coverage grouped as Ezana datasets, macro sources, open web and news; matched dataset rows; no prediction markets), `fx_charts` (TRY per USD with Level and 12M change views and 3M to 5Y ranges; inflation vs policy with the ex-post real rate view; BIS REER with its median and percentile; gross reserves), `fx_flow` (transmission nodes in layers: supported, conceptual, downstream), `fx_anchor` (long-run Key chart with norm, peak, trough), `fx_indicators` (Key indicators table), then `fx_drivers`, `fx_risk_scope`, `fx_monitor`, `fx_outlook`, `fx_conclusion`. Data preservation: depreciation over 1M/3M/12M/5Y, volatility, ex-post real rate, REER history statistics, reserves with import cover, macro indicators, OECD and Empire comparisons and the transmission map all stay; v1's duplicate trend, insight and mini-chart blocks were folded into these. |
| Gate | `adaptive/schema.js` | Rules per type; charts need two or more dated real observations; figures without a source are removed; an outlook row with a probability fails. |
| Renderer | `components/sonar/adaptive/SonarFxSections.jsx` | Sections drawn in the existing report shell (search, follow-ups, tabs from the rendered sections, Research Controls rail, sources). |

Deterministic math (exported): `usdInLocalChangePct = (current/prior - 1) * 100`, `localValueInUsdChangePct = (prior/current - 1) * 100`, `exPostRateMinusInflationPp = policyRate - cpiYoy` (labelled ex-post).
