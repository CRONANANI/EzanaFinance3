# Adaptive research: data coverage and live verification

Checked against the production database on Nov 17, 2026, read-only (schema,
function definitions, grants and SELECT queries). Nothing was written and no
migration was applied. Provider keys (market data, model, news) are not
available in the build workspace, so anything that needs them is marked "not
run" here and in `IMPLEMENTATION_MATRIX.md`.

## 13F: `sonar_top_13f` and the positioning functions

| Object                                                              | State                                                                                                                             |
| ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `sonar_top_13f(p_ticker text, p_limit int default 3) returns jsonb` | Exists. `STABLE`, not security definer. EXECUTE granted to `anon`, `authenticated`, `service_role`. `p_limit` is clamped to 1..10 |
| `sonar_13f_positioning(p_ticker text) returns jsonb`                | Exists. `SECURITY DEFINER`, EXECUTE to `service_role` only                                                                        |
| `sonar_13f_style_trend(p_ticker text) returns jsonb`                | Exists. `SECURITY DEFINER`, EXECUTE to `service_role` only                                                                        |
| `titans_13f_filing_set(p_period date)`                              | Exists. Picks one filing set per manager: the latest full filing, plus later amendments of type NEW HOLDINGS                      |
| `titans_13f_positions`, `titans_13f_filers`                         | Materialised by `titans_13f_materialise`; RLS on                                                                                  |

`sonar_top_13f` returns `{ period, priorPeriod, holders, totalValue, top: [{ filer_name, value_usd, shares, change_type }] }`.
The first adaptive version mapped `filer_name`, `value_usd` and `change_type`
correctly but asked for 15 rows (the function returns at most 10) and did not
know the change vocabulary (`new`, `added`, `trimmed`, `held`), so `held`
would have shown as "Not stated". Its definition was missing from the
repository; `supabase/migrations/20261009120000_sonar_top_13f.sql` now holds
the text the database returned. Running it changes nothing.

The adaptive pipeline no longer uses `sonar_top_13f`. It sums every indexed
filing for a manager and quarter, with no amendment handling. The pipeline
uses `sonar_13f_positioning` and `sonar_13f_style_trend`, which read the
amendment-aware materialised tables, compare only managers that filed in both
quarters, exclude options, and drop rows whose implied price is far from the
quarter's median.

Test on NVDA: both functions report BlackRock first at 1,941,918,386 shares
and $388.56B for the quarter ended Jun 30, 2026, matching each other and the
`titans_13f_positions` rows.

**Coverage, which limits what the pipeline can say:**

| Quarter | Managers indexed                                     |
| ------- | ---------------------------------------------------- |
| Q1 2026 | 77                                                   |
| Q2 2026 | 1,499                                                |
| Q3 2026 | 148 (filings were due Nov 16 and are still arriving) |

One quarter is indexed widely. For NVDA, 58 managers have both Q1 and Q2
indexed, so quarter-over-quarter changes cover those 58 and the answer says
so. Manager-level history and a chart across quarters need more quarters
backfilled; the chart switches to a time axis on its own once two or more
quarters pass the function's 50% coverage test. `sonar_top_13f` returns
`change_type: null` today for the same reason.

## Other sources, as found

| Source                       | Table or function                                         | Rows / coverage                                                                                           | Used by            |
| ---------------------------- | --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | ------------------ |
| Congressional trades         | `congress_trades`                                         | 56,240 rows, Jun 2014 to Nov 5, 2026; House 53,547, Senate 2,693; every NVDA row has an https source link | B07                |
| Committee seats              | `congress_committee_members`, `congress_committees`       | 3,895 seats, 230 committees                                                                               | B07 member view    |
| Insider filings              | `sec_insider_transactions`                                | 15,484 rows, 1,957 tickers, **from Sep 30, 2026 only**                                                    | B07                |
| Fund holdings                | `sec_etf_holdings`, `sec_etf_funds`                       | 46 funds, holdings only                                                                                   | B06                |
| Federal contracts by company | `company_contract_history`, `company_contract_top_awards` | 786 tickers by fiscal year and agency, synced Nov 15, 2026                                                | B04                |
| Company disclosures          | `company_disclosures`                                     | 237 approved rows, about 20 tickers (customers, purchase and capacity commitments, export risk)           | B05                |
| Industry Registry            | `industry_companies`, `industry_stages`                   | **Semiconductors only**: 19 companies, 11 stages                                                          | B05                |
| Industry metrics             | `industry_metrics`                                        | **Empty**                                                                                                 | not used           |
| Industry facilities          | `industry_facilities`                                     | **Empty**                                                                                                 | not used           |
| Lobbying                     | `lobbying_filings`, `lobbying_client_tickers`             | 289,020 filings; **35 verified client links covering 33 tickers**                                         | B08                |
| World Bank GDP snapshot      | `macro_indicators`                                        | 258 economies                                                                                             | C02, C09           |
| Macro series                 | `macro_series_latest`                                     | see below                                                                                                 | C01, C02, C04, C05 |
| Prediction markets           | `prediction_market_index`                                 | 21,037 contracts                                                                                          | C08, A02, A07, A08 |

Rankable macro series (each country's latest observation, counted Nov 17):

| Measure                   | Source   | Countries | Latest period |
| ------------------------- | -------- | --------- | ------------- |
| Crude oil production      | EIA      | 215       | Jul 2026      |
| Natural gas production    | JODI     | 90        | Sep 2026      |
| Oil demand                | JODI     | 64        | Aug 2026      |
| Natural gas demand        | JODI     | 80        | Sep 2026      |
| Natural gas imports       | JODI     | 86        | Sep 2026      |
| Inflation                 | IMF WEO  | 195       | 2026          |
| Unemployment              | ILO      | 207       | 2025          |
| Government debt, % of GDP | IMF WEO  | 191       | 2026          |
| Fiscal balance, % of GDP  | IMF WEO  | 195       | 2026          |
| Current account, % of GDP | IMF WEO  | 194       | 2026          |
| Policy rate               | BIS      | 40        | Oct 2026      |
| Goods exports             | IMF IMTS | 207       | Jul 2026      |

Not activated because no comparable ranking series is stored: foreign
exchange reserves, energy consumption other than oil and gas, external debt,
industrial production.

## Figures checked against source rows

| Pipeline | Check                                                                                                                       | Result                                                  |
| -------- | --------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| B06      | NVDA top holder, shares and value, function against `titans_13f_positions`                                                  | Match                                                   |
| B04      | LMT fiscal 2025 obligations: $75.37B across 7 agencies; Department of Defense $73.81B                                       | Readable; the executor's totals are the same sums       |
| B07      | Nancy Pelosi resolves to one member (P000197): 39 trades in two years (26 purchases, 12 sales, 1 exchange); NVDA named most | Readable                                                |
| B07      | NVDA, past twelve months: 57 trades by 20 members (22 purchases, 35 sales)                                                  | Readable                                                |
| B07      | Chamber view: 6,920 trades in twelve months, more than one API page                                                         | The reader pages 1,000 rows at a time and reports a cap |
| C02      | Crude oil production: United States 13,948, Russia 9,512, Saudi Arabia 7,980 thousand barrels a day, Jul 2026               | Readable                                                |

These checks ran as SQL against the same tables and functions the readers
call. They confirm the data and the shapes. They are not a run of the
deployed route: that needs the production environment (see the matrix).

## 13F backfill: what it would take (read-only assessment, Nov 17, 2026)

Nothing was written. Figures are from read-only queries on production.

| Quarter | State                                                    |
| ------- | -------------------------------------------------------- |
| Q2 2026 | Widely indexed: 1,499 managers                           |
| Q1 2026 | 99 filings indexed, 77 of them with no raw holdings rows |
| Q3 2026 | 148 filings so far (the filing window is still open)     |
| Earlier | Not indexed                                              |

- One full quarter is about 1,550 filings and 527,000 raw rows, roughly
  260 MB. The database is 3.6 GB, so four more quarters is about 1 GB.
- Q1 2026 must not be re-materialised from what is stored: most of its filings
  have no holdings rows, so the result would look like mass selling.
- `sec_13f_holdings` has 3,746 groups of identical rows. A filing can
  legitimately list the same security on several lines (different managers or
  discretion), so these are reported, not deleted.
- `scripts/backfill-13f-datasets.mjs` now writes a per-quarter dry-run report
  (`validation/13f-backfill-dry-run-<date>.md`): filings and rows it would
  write, amendments and which filing they replace, duplicates, unresolved
  identities, and a row-count check per filing. `--materialise` is a separate
  step and runs only for quarters that are fully written and matched.
- The dry run needs the SEC quarterly archives, which the build workspace
  cannot reach. **It has not been run.** No backfill happens until you have
  read the dry-run report and approved it.

## Lobbying client coverage (read-only assessment, Nov 17, 2026)

`lobbying_client_tickers` is what links a lobbying client to a company. The
answer reads only rows marked verified.

| Group                                                                                                                                 | Clients      | Tickers  | 2024+ spend                                               |
| ------------------------------------------------------------------------------------------------------------------------------------- | ------------ | -------- | --------------------------------------------------------- |
| Verified today                                                                                                                        | 35           | 33       |                                                           |
| Legal-name identity: the client name is the SEC registrant's name once case and punctuation are removed, and it belongs to one ticker | 1,214        | 950      | $2.79B of $17.68B                                         |
| Name variant: equal only after dropping a corporate suffix or "and subsidiaries". Possible, awaiting review                           | 825          | 341 more |                                                           |
| Ambiguous: the name maps to more than one ticker                                                                                      | 4            |          |                                                           |
| Unmatched                                                                                                                             | about 26,500 |          | Trade groups, private companies, governments, non-profits |

- Lockheed Martin: `LOCKHEED MARTIN CORPORATION` matches LMT (CIK 936468) in
  the legal-name tier.
- Of the 50 largest federal contractors with a ticker, 3 are covered today and
  36 would be with the legal-name tier. Still unresolved: USFD, FMS, ASGN,
  AUTLY, GSK, BAESY, CAE, NOC, VVX, KBR, SCTBY, ACN, RYCEY, IBM. Most file
  under a subsidiary or a US arm, which is the "verified subsidiary" case and
  needs a person to confirm each one.
- `supabase/migrations/20261123090000_lobbying_client_identity.sql` (not
  applied) adds the SEC identity, relationship (direct or subsidiary), status
  (verified, possible, rejected), evidence, and who verified it and when. A row
  cannot be published without evidence, a relationship and a date: the
  database refuses it. The matching function proposes; it verifies nothing.
- A name variant is never published automatically. The legal-name tier is not
  a fuzzy match, but publishing it is still a decision for you: the statement
  that would do it is in the project doc `SQL_03`, for review.

## Council overlays: what is read

| Overlay | Reads                                     | How                                                                                  |
| ------- | ----------------------------------------- | ------------------------------------------------------------------------------------ |
| D01     | Fund mandate, IPS rules, position book    | Service client, scoped to the member's own organization id                           |
| D03     | Position book; earnings calendar (public) | Same                                                                                 |
| D02     | `org_pitches`                             | The caller's own token, so row-level security decides; also filtered by organization |
| D04     | `org_sonar_reports`                       | Same                                                                                 |

Not verified against production rows: the overlays were tested on fixtures
only. The build workspace has no member session.
