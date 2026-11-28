# Sonar 6.5.2: financial data integrity, contract accounting and production validation

Nov 28, 2026.

**Scope of what was and was not done.**
- No Anthropic API calls, model benchmarks or evaluations.
- No routing, Profile D, D-Efficient, S55W or entitlement changes.
- No migrations applied and no backfills run.
- No flags enabled: `SONAR_PRICE_CONTRACT`, `SONAR_PRICE_SYNC` and the new `SONAR_CONTRACT_TRANSACTIONS_INGEST` all stay off.
- No crons scheduled.
- No database queries were run: read-only access was not authorized for this task, so the audit SQL is prepared for you to run.

**Branch.** Pushed to `main` at the founder's instruction. The repository's `CLAUDE.md` makes `main` the standing branch, so no feature branch was used.

**Verification.** `npm run test:sonar-6-5-2` runs 26 deterministic tests over fixtures committed before the code (`59ca5b2`).

## 1. Initial repository commit

HEAD at the start was `29cad62` (Sonar 6.5.1), with nothing local or remote pending. `CLAUDE.md` was read: main-only pushes, the canonical remote, and the SQL-in-files rule.

## 2. Contract-data source audit

The lineage was traced from the external source to Sonar's conclusions, by inspecting the ingest code, migrations and readers.

| Stage | Where | What happens |
| --- | --- | --- |
| Source | USAspending `POST /api/v2/search/spending_by_award/` | Award search with `award_type_codes A to D`, a `time_period` filter and no `date_type`. The default is action-date activity, so an old award modified in the window is returned. |
| Fields requested | `ingest-usaspending/route.js`, `backfill-usaspending/route.js` | "Award ID", "Recipient Name", `recipient_id`, "Award Amount", "Awarding Agency", "Awarding Sub Agency", "Funding Agency", "Start Date", "Award Type" |
| Parser | the same routes | `action_date` is set from **"Start Date"**. `award_amount` is "Award Amount". `fiscal_year` is the federal FY of the start date. The primary key is `generated_internal_id` (the generated unique award id). |
| Storage | `usaspending_contract_awards` (`20260629000000_usaspending_host.sql`) | One row per award (upsert). `CHECK (award_amount > 0)`, so no negative row can exist. No transaction id, no action date, no parent UEI. |
| Resolution | view `contract_awards_resolved` | Adds the resolved ticker and recipient parent name (from `contractor_recipients`). |
| History | `company_contract_history` (BigQuery `usaspending.contract_awards`, award-level) | A per-ticker, FY and agency sum of award amounts by the award's fiscal year: also an award-start cohort. |
| Award facts | `company_contract_award_facts` (USAspending award API) | `total_obligation` (obligated to date), `base_exercised_options`, `base_and_all_options` (ceiling), `pop_start`, `pop_end`, `date_signed`, `last_modified_date`, `modification_count` (capped at 100). |
| Transactions | `lib/usaspending.js` `fetchTransactions` | Calls `/api/v2/transactions/` for the award page only. It keeps the count and the latest action date. **No transaction table exists** in the migrations. |
| Sonar measures | `analytics-server.js` `runScreen` | 6.5.1 summed award rows by start date (cohort) and labelled some results as fiscal-year obligations (section 4). |

## 3. Actual semantics of each field

| Concept | Where it exists | Notes |
| --- | --- | --- |
| Award start date | `usaspending_contract_awards.action_date`, `company_contract_award_facts.pop_start` | The column named `action_date` is the Start Date. |
| Transaction action date | none stored | `/api/v2/transactions/` `action_date` |
| Current award amount | `award_amount` ("Award Amount") | For contracts: obligated to date. |
| Cumulative obligated amount | `award_amount`, `company_contract_award_facts.total_obligation` | Same quantity, two sources (SQL 01 query 3 compares them). |
| Incremental obligation | none stored | `/api/v2/transactions/` `federal_action_obligation` |
| Deobligation | none stored (CHECK > 0 on awards) | A negative `federal_action_obligation` |
| Contract ceiling | `company_contract_award_facts.base_and_all_options` | Never read by any Sonar contract measure (tested). |
| Performance end | `company_contract_award_facts.pop_end`, `pop_potential_end` | Not an obligation period. |
| Awarding / funding agency | `awarding_agency`, `funding_agency` (toptier names) | No code columns. |
| Recipient UEI / parent UEI | `recipient_id`; `contractor_recipients.parent_uei` | Parent UEI is source evidence, not verification. |

**Compatibility strategy for the misleading name.** The column is not renamed. Code reads it as "start date". The 6.5.1 corrections, the SQL notes and this report say so explicitly. A renamed alias belongs in a later view migration if wanted.

## 4. Root cause

**What 6.5.1 measured.** It summed award rows by the year of the start date. That measures a cohort of awards with their cumulative amounts. It kept ids and labels that read as fiscal-year obligations ("Federal obligations (latest complete federal FY)"), and used the cohort for growth.

**The baseline case** (`docs/SONAR_6_5_2_BASELINE.md`): an award started in FY2025 whose obligations grew in FY2026.
- 6.5.1 reported a **-73% decline**.
- The actions dated in each year show **+53%**.

## 5. Transaction-level accounting design

**Contract.** `src/lib/contractors/transactions.js` defines it:
- `sourceTransactionId` (USAspending `id`)
- `awardId`
- `transactionActionDate`
- `signedObligationDeltaUsd`
- `federalFiscalYear` (October 1 starts the next FY)
- `modificationNumber`
- `actionType`
- `source`
- `recordState`

**Rejections.** An action without an id, a date or a reported amount is rejected with its reason, never made zero.

**Duplicates and conflicts.**
- The same id with the same values is a duplicate and counts once.
- The same id with different values is a conflict: it is excluded and reported, so a correction is never summed with the record it replaces.
- An incremental amount is never derived from differences between cumulative totals.

**Measures.** `src/lib/sonar/execution/contracts.js`:
- `obligationFlowInPeriod`: net and gross obligations and deobligations per ticker, with agency attribution through the award row.
- `flowCoverage`: complete only when every award started by the period end has a complete sync row.
- `obligationFlowGrowth`: a known zero needs complete coverage. A missing year is unknown, never a decline. A zero or negative prior period gives no growth rate.

**Storage** (`docs/sql/sonar-6-5-2/SQL_02_contract_transactions.md`, not applied):
- `usaspending_contract_transactions`, keyed on the source id, with a check that the stored FY matches the action date;
- `usaspending_award_transaction_sync`, recording per-award completeness;
- indexes, and RLS for the server only.

**Ingestion.** `ingestAwardTransactions` and `src/app/api/cron/ingest-contract-transactions/route.js`:
- bounded: at most 50 awards per run, at most 10 pages per award, 250 ms between awards;
- idempotent upserts, with checkpointing by sync rows;
- OFF behind `SONAR_CONTRACT_TRANSACTIONS_INGEST=1` and not scheduled.

## 6. Implemented code changes

**New files.**
- `src/lib/contractors/transactions.js`
- `src/lib/sonar/execution/integrity.js`
- `src/lib/sec/entity-relationships.js`
- `src/app/api/cron/ingest-contract-transactions/route.js` (disabled)

**Extended files.**
- `execution/contracts.js`: methodologies, flow, coverage, `exposureToRevenue`, financial-issuer guard, unresolved-agency stats.
- `contractors/agencies.js`: `resolveAgency`, `agencyMatchState`, `SOURCE_ALIASES`.
- `execution/entities.js`: relationship effective dates, look-alike label.
- `composer/screen.js`: versioned measures.
- `composer/analytics-server.js`:
  - flow sources;
  - cohort labels;
  - integrity enforcement;
  - unresolved agency read as unknown;
  - `readFailureStatus` (`unavailable` vs `provider_error`);
  - `researchState`, `dataQuality`;
  - revenue concept and SIC on values.
- `execution/requirements.js` and `composer/intents.js`: growth plans the flow; ratio plans the labelled cohort; "during FY" plans the flow ratio.
- `execution/synthesis.js`: data-quality telemetry.
- `prices/price-shadow.js`: mismatch categories.

## 7. Old and new contract measure definitions

**6.5.1 ids are kept** for saved research. Their computation is unchanged. Labels are corrected and each carries `methodology: award_start_cohort_v1` and an `aliasOf`.

| 6.5.1 id | Now means | New id used by plans |
| --- | --- | --- |
| `federal_contract_obligations_to_revenue` | award-start cohort over revenue | `federal_award_cohort_exposure_to_revenue` |
| `federal_obligations_current_period` / `_prior_period` | obligated to date on awards started in the FY | `federal_award_cohort_obligations` / `_prior` |
| `federal_obligations_change` / `_growth_pct` | cohort minus cohort (not a flow change) | `federal_award_cohort_change` / `_growth_pct` |
| `federal_awarding_agency_concentration` | agency share of the cohort | `federal_award_cohort_agency_concentration` |

**New transaction-period measures** (`transaction_period_flow_v1`):
- `federal_obligation_flow`
- `federal_obligation_flow_prior`
- `federal_obligation_flow_change`
- `federal_obligation_flow_growth_pct`
- `federal_obligation_flow_to_revenue`

**Planning.**
- "Increasing / declining obligations" now plans the **flow** measure, which reports **unavailable** until the transaction table exists. The cohort is never substituted.
- A ratio question without a period uses the labelled cohort proxy. "Incurred / during the fiscal year / annual obligations" uses the flow ratio.

**Every ratio result carries:**
- the metric;
- the methodology version;
- the measure kind;
- the numerator {value, definition, period} and denominator {value, definition, period, concept};
- currency;
- the company;
- recipients;
- attribution;
- coverage;
- sources;
- missing inputs;
- qualifications, including "not the share of revenue earned from the government".

## 8. Financial-data lineage

Cohort and flow lineage entries name their table, methodology and period. The flow lineage also carries coverage (companies with complete transaction records). Filed revenue keeps the filing CIK and accession (6.5). Revenue concept and SIC are passed to the ratio.

**Financial issuers.** SIC 6000 to 6799 makes the ratio unavailable, because bank and insurer "revenue" is a different basis.

## 9. Agency identity verification

**Resolver.** `resolveAgency` returns one of four states: matched (exact, case and whitespace folded), alias (`SOURCE_ALIASES`), unmatched, or missing.

**Three-valued filter.** `agencyMatchState` returns match, no_match or unresolved. An unresolved row is neither counted nor treated as "not DoD". A company with no matching award but some unresolved ones is **unknown**.

**Codes.** They take precedence once present.

**Aliases.** `SOURCE_ALIASES` is empty on purpose. Variants must be observed and reviewed through SQL 01 queries 1 and 2, which were not run because database access was not authorized.

**SQL 03 review.** 6.5.1 SQL 03 was reviewed. 6.5.2 SQL 03 supersedes it, adding:
- a reference table of toptier agencies;
- a trigger, so newly ingested rows get codes;
- an index;
- the exact view step;
- a rollback.

"Department of Energy" never becomes a sector (tested).

## 10. Parent/subsidiary attribution readiness

**Model.** `entity-relationships.js` covers:
- typed identifiers (cik, uei, lei, duns);
- relationship kind;
- effective period;
- source reference;
- status (verified, unverified, rejected);
- evidence class.

**Verification rule.** A USAspending parent-UEI field is evidence that cannot verify on its own.

**Attribution.** `attributeAward` checks the effective period on the award date. Look-alike names never join (tested with `XALP HOLDINGS GROUP PLC`).

**Table.** `docs/sql/sonar-6-5-2/SQL_04_corporate_relationships.md` is prepared with no rows. Group scope stays unavailable in screens until reviewed rows exist.

## 11. SEC succession migration readiness

**Checks against the code and schema.**
- `sec_fundamentals` has `frame`, `cik` and `accession_no`, with primary key `(cik, concept, frame)`, which matches the loader and SQL 06.
- `sec_registrant_successions` is read by the service role only, which is compatible with 6.4 SQL 03 revoking anonymous select.
- The rules are confirmed by tests:
  - successor preference per SEC frame;
  - predecessor CIK and accession preserved;
  - no invented rows before a backfill;
  - lobbying compatibility (`test:6-4-compat`).

**Mapping status.** XOM, DMRC and XPRO are verified. REAX and SKYD stay unverified.

**Runbook.** The sequence, with full paths and stop conditions, is in `docs/SONAR_6_5_2_PRODUCTION_RUNBOOK.md` Track 2. It uses 6.5.1 SQL 04 in place of the raw 6.4 SQL 06.

## 12. Price-contract shadow comparison

`comparePriceSelection` now classifies each mismatch:

| Category | Meaning |
| --- | --- |
| `adjustment_dividend_like` | Adjusted close below the close by under 5% |
| `adjustment_corporate_action_like` | Adjusted close at least 5% from the close (split-sized) |
| `quote_row` | A quote stored as a close (no volume) |
| `stale` | Older than 10 days |
| `future_dated` | A row after the as-of date |
| `zero_or_missing` | No usable price |

Each row also gets a verdict: same, differs, legacy only, contract only, or neither.

**Writer semantics (from the 6.4 audit, unchanged):**
- FMP end-of-day rows: `close` is unadjusted.
- Alpaca rows: `close` is adjusted.
- Quant rows: `close` is copied into `adj_close`.
- Screen rows: quotes stored as closes.

**Gaps.** Currency is not stored in the cache (assumed USD). Corporate actions are only detectable through the adjusted gap.

**Status.** Both flags stay off. The preview plan is in runbook Track 6.

## 13. Numerical correctness invariants

`src/lib/sonar/execution/integrity.js` `checkMeasure` checks four groups of rules.

**Temporal.**
- The period is defined.
- No future period.
- A cumulative amount is not labelled as a flow.

**Entity.**
- The company or security is identified.

**Numerical.**
- Values are finite.
- A missing input never comes with a value.
- A ratio keeps its numerator and denominator.
- The denominator is positive.
- The ratio equals numerator divided by denominator.
- No currency mismatch.

**Source.**
- Lineage is present.
- A methodology version is present.
- No synthetic data.

**Enforcement.** `enforce` withholds a failing value (null, with a reason). It is applied to every cohort and flow ratio in `runScreen` and counted in `dataQuality.integrityViolations`.

**Research states.** `researchState` gives the writer and renderer six states:
- complete;
- complete with missing data;
- partial coverage;
- unsupported measure;
- provider unavailable;
- failed calculation.

Exception text never reaches users (6.5.1 failure categories).

## 14. Deterministic scenario results

All 26 tests pass (A to T, plus transaction normalization, integrity, planner, telemetry and safety).

| Scenario | Result |
| --- | --- |
| A | XALP FY2026 flow 230M, FY2025 150M, +80M (+53.3%) |
| B | Cohort 80M against flow 230M, with distinct ids and methodologies |
| C | Deobligation of -10M kept (gross 240M, net 230M) |
| D | Duplicate counted once; a conflicting duplicate excluded |
| E | Ceiling of 900M never used |
| F | XBET flow unavailable (no records); a complete record with no actions is a confirmed 0 |
| G | Flow ratio 0.10 and cohort ratio 0.0348, both with full numerator and denominator |
| H | XDEL agency unresolved; the DoD condition is unknown |
| I | Awarding Energy against funding Defense, decided by the basis |
| J | Group scope 150M only while the relationship is in effect; 80M otherwise |
| K | A look-alike is never joined |
| L | Successor wins per frame; predecessor CIK kept |
| M | Conflicting revenue concepts give no growth figure |
| N | Negative or missing revenue, or a financial issuer, makes the ratio unavailable |
| O | Dividend-like and corporate-action-like adjustments separated |
| P | Missing table reads as "unavailable" (state `provider_unavailable`), never 0; after the migration, flows are reported with coverage (2 of 3 complete) |
| Q | Award with a 2031 performance end is counted in its year |
| R | 2027 start excluded and counted |
| S | Sep 30 falls in FY2025, Oct 1 in FY2026 |
| T | Incomplete coverage is not exhaustive |

## 15. Full regression results

**Passing.**
- `test:sonar-6-5-2` (26).
- `test:sonar-6-5-1` (23).
- `test:sonar-6-5` (33).
- `test:6-4-compat`, `test:registrant-map`, `test:revenue-growth`, `test:debt-equity`, `test:price-contract`, `test:provider-isolation`, `test:quiver-proxy`, `test:market-sample`, `test:sonar-model-routing`, `test:typed-relevance`.
- Every other `test:sonar*`, `test:org*` and `test:research*`, except the two below.

**Assertions updated on purpose**, because 6.5.2 changes these definitions:
- `check-sonar-6-5-1.mjs`: plans use the cohort ids. Growth plans the flow (unavailable without the table). The 6.5.1 cohort pipeline is still checked under the cohort ids with its original expected values.
- `check-sonar-6-5.mjs`: growth is the flow measure.

**Pre-existing failures (not caused by this release):**
- `test:research-company` test 10.
- `test:org-sonar` test 19, which asserts a research-route line changed by `1b08fe3` in another session.

`test:rls` and `test:middleware` need pgvector, which this environment lacks; that is environmental and they were not rerun.

## 16. Performance and estimated data requirements

The exact volumes are unknown because no database query was run. The inputs come from SQL 01 query 6.

| Item | Estimate or unknown |
| --- | --- |
| Awards to cover first | `company_contract_award_facts` holds about 12,000 top awards (enrich-contract-awards documentation). All resolved awards: unknown (SQL 01 query 6). |
| Actions per award | Unknown. `modification_count` gives a lower bound, capped at 100. |
| Rows | About 12,000 awards times the average number of actions. |
| Storage | About 200 to 300 bytes per row with indexes. At 20 actions per award, that is about 240,000 rows and roughly 60 to 80 MB. The real figure must replace the assumed average. |
| Provider requests | One request per 100 actions per award: at least 12,000 for the top awards. Free public API. |
| Runtime | At 25 awards per hourly run, about 480 runs (about 20 days) for the top awards. |
| Query cost | Indexed by (award, date). The flow read is bounded by the screen's tickers and chunked by 200 award ids. |
| Sonar latency | One extra read for screens that use flow measures only. |
| Retention | Keep all actions; volume is small at the top-award scope. Revisit before covering all awards. |

## 17. Files changed

**New.**
- `docs/SONAR_6_5_2.md`
- `docs/SONAR_6_5_2_BASELINE.md`
- `docs/SONAR_6_5_2_PRODUCTION_RUNBOOK.md`
- `docs/sql/sonar-6-5-2/SQL_01` to `SQL_04`
- `scripts/check-sonar-6-5-2.mjs`
- `scripts/fixtures/sonar-6-5-2-contracts.mjs`
- `src/lib/contractors/transactions.js`
- `src/lib/sonar/execution/integrity.js`
- `src/lib/sec/entity-relationships.js`
- `src/app/api/cron/ingest-contract-transactions/route.js`

**Modified.**
- `src/lib/contractors/agencies.js`
- `src/lib/sonar/execution/contracts.js`
- `entities.js`
- `requirements.js`
- `synthesis.js`
- `src/lib/sonar/composer/analytics-server.js`
- `screen.js`
- `intents.js`
- `src/lib/prices/price-shadow.js`
- `scripts/check-sonar-6-5-1.mjs`
- `scripts/check-sonar-6-5.mjs`
- `package.json`

## 18. Production migrations requiring approval

- `docs/sql/sonar-6-5-2/SQL_02_contract_transactions.md`
- `docs/sql/sonar-6-5-2/SQL_03_contract_agency_codes.md`, plus the view step
- `docs/sql/sonar-6-5-2/SQL_04_corporate_relationships.md`
- 6.4 SQL 03, SQL 08 and the backfill sequence (runbook Track 2)
- `docs/sql/sonar-6-5-1/SQL_02_ticker_sectors_identity.md`
- 6.4 SQL 09 (with writer changes)

## 19. Feature activation requirements

**Flow measures:**
1. Apply SQL 02.
2. Run a preview ingestion trial and confirm the sums match obligated-to-date.
3. Set the flag in production (runbook Track 3).

**Codes:** SQL 03 plus the view step.

**Group scope:** SQL 04, reviewed rows, and a loader (Sonar 6.6).

**Price contract:** runbook Track 6.

## 20. Known unsupported capabilities

- Fiscal-year obligation flows until transactions are ingested. They report unavailable or unknown.
- Group-scope obligations in screens.
- Agency aliases, which await observed variants.
- Sub-agency filters.
- Share of revenue from the government (segment notes).
- Currency in `price_data_cache`.
- Explicit corporate-action records.
- Parabolic PARA trades stay unresolved (6.5.1).

## 21. Rollback

- **Code:** revert the 6.5.2 commit. Saved research using 6.5.1 ids keeps the same values; only labels change.
- **Ingestion:** unset `SONAR_CONTRACT_TRANSACTIONS_INGEST`.
- **SQL:** each file has its own rollback.

## 22. Readiness recommendations for Sonar 6.6

1. Run SQL 01, then apply SQL 02 and complete the bounded transaction ingestion for the top awards. The flow measures then replace the cohort in growth and ratio answers.
2. Load reviewed EX-21 relationships into SQL 04's table and wire a loader to `toAttributionRelations`.
3. Apply SQL 03 and the view step; populate `SOURCE_ALIASES` from observed variants.
4. Use `checkMeasure` and `enforce` for valuation and forecast outputs.
5. Decide the per-share price basis for corporate-action rows, then pilot the price contract in preview.
