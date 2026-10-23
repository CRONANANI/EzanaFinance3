# Sonar × EzanaQL coverage audit (Step 0)

Date: Oct 23, 2026. Repo state: main after the Sonar v2 template engine
(router, templates, sweeps, exemplars, composer, /api/sonar/v2).

## EzanaQL

- **Grammar/parser**: `src/lib/ezanaql/parser.js`. Query shape:
  `FROM dataset [[SEMI] JOIN dataset ON key] [WHERE cond] [SELECT proj]
[GROUP BY fields] [HAVING] [ORDER BY] [LIMIT] [AS fmt]`. The AST is a plain
  object: `{ from, join: {dataset, on, semi}, where, select, groupBy, having,
orderBy, limit, as }`.
- **Validator**: `src/lib/ezanaql/validator.js` — the security boundary; only
  catalog datasets/fields pass. **Executor**: `src/lib/ezanaql/executor.js` —
  fetches rows through parameterized Supabase reads (RLS injected), then runs
  aggregation/HAVING/ORDER/LIMIT in-engine. JOIN and SEMI JOIN join on one
  shared key per pair. **Entry point**: `runEzanaQL({query, admin, userId,
dimension, format})` in `src/lib/ezanaql/index.js` → `{ok, format, result}`
  where result carries `columns` and `rows`.
- **Catalog** (`src/lib/ezanaql/catalog.js`, v1.5.0): THE machine-readable
  schema. Every dataset declares label, source binding, access/RLS, limits,
  `fields` (name → {type, …}) and `joins`. `available: false` marks declared
  but unwired datasets, which the executor refuses honestly. Sonar's catalog
  derives from this module (no duplication).

## Datasets EzanaQL can reach

Live (17): gov.contracts, capitol.congress_trades, capitol.holdings,
capitol.lobbying, capitol.committee_seats, capitol.campaign_finance,
prediction.markets, titans.holdings_13f, titans.activist_stakes,
titans.whale_moves, lighthouse.oecd, eyes.chokepoints, eyes.ports,
eyes.patents, house.filings, and the dimension helpers around them.

Declared but not wired (`available: false`, 11): market.quotes, market.ohlcv,
market.fundamentals, market.earnings, commodities.prices,
institutions.holdings, titans.insider_trades, titans.fundamentals,
titans.exec_comp, titans.etf_holdings, portfolio.positions, house.trades,
senate.trades, portfolio.transactions. The expected "SEC filings/insider",
"Echo archive", "market data (FMP)" and "council notes" datasets are NOT in
EzanaQL: Echo and council notes are reachable only through Sonar's semantic
retrieval, market data only through FMP server reads. Sonar's pipeline keeps
its own news/echo sweeps for those.

## Entity-key matrix (live datasets)

| Dataset                       | company           | politician              | fund      | agency          | committee    | country         | market    | patent assignee |
| ----------------------------- | ----------------- | ----------------------- | --------- | --------------- | ------------ | --------------- | --------- | --------------- |
| gov.contracts                 | ticker, recipient |                         |           | awarding_agency |              |                 |           |                 |
| capitol.congress_trades       | ticker            | bioguide_id, politician |           |                 |              |                 |           |                 |
| capitol.holdings              | ticker            | bioguide_id             |           |                 |              |                 |           |                 |
| capitol.lobbying              | client (name)     |                         |           |                 |              |                 |           |                 |
| capitol.committee_seats       |                   | bioguide_id             |           |                 | committee_id |                 |           |                 |
| capitol.campaign_finance      |                   | bioguide_id             |           |                 |              |                 |           |                 |
| prediction.markets            |                   |                         |           |                 |              |                 | market_id |                 |
| titans.holdings_13f           | cusip, issuer     |                         | filer_cik |                 |              |                 |           |                 |
| titans.activist_stakes        | company, ticker   |                         | filer_cik |                 |              |                 |           |                 |
| titans.whale_moves            | ticker            |                         | filer_cik |                 |              |                 |           |                 |
| lighthouse.oecd               |                   |                         |           |                 |              | country_code    |           |                 |
| eyes.chokepoints / eyes.ports |                   |                         |           |                 |              | country (ports) |           |                 |
| eyes.patents                  | ticker            |                         |           |                 |              |                 |           | assignee        |
| house.filings                 |                   | member name             |           |                 |              |                 |           |                 |

Dates: every dataset has at least one `date` field (action_date,
transaction_date, filed_on, posted_on, year, report_date, patent_date,
filing_date), so time clusters are universal.

## Current Sonar (after the v2 engine)

- Sweep: `src/lib/sonar/sweeps.js` (market, contracts, 13F, activist,
  congress, lobbying, prediction markets, echo, news; per-sweep 2.5s timeout).
- Templates/router/composer/exemplars: `src/lib/sonar/{templates,router,
composer,exemplars}.js`; strict-JSON validation with [S#] citation checks.
- Renderer: `src/components/sonar/SonarBriefing.jsx` (3 columns, match cards,
  ranked bar/donut/timeline, follow-up chips + floating panel);
  `/api/sonar/v2` returns the block shape; `/sonar` is the surface.
- The landing demo (`SonarSection.jsx` + `landing-pipeline.js`) stays on v1.

## Mapping decisions for the compositional layer

- Sonar's catalog (`src/lib/sonar/catalog.js`) derives DatasetDefs from
  `CATALOG` at module load: entity keys from a hand-kept field-name map,
  dims from field types (date→time, money/int/float→numeric, string→category),
  metrics from money/int fields.
- The 21 curated templates stay as overrides; any EzanaQL result that matches
  no template flows through the generic cluster pipeline.
- Couldn't map: `portfolio.*` (user-private, unavailable), the `market.*`
  family (no query path yet; market KPIs come from the FMP sweep instead),
  array/JSONB fields the grammar cannot filter (see CATALOG_GAPS). Proposed
  fix for market.*: bind FMP-backed tables when an ingest lands, then the
  adapters pick them up from the catalog without new Sonar work.
