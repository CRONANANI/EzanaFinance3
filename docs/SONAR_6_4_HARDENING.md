# Sonar 6.4: production hardening and research quality (Nov 28 2026)

Builds on 6.4 (b8aa1071). The semantic layer, analyst routing and research execution were not
rebuilt. Commits 5cbb475f..cd7fec84 on main.

## 1. Industry ingestion

- `company_industry` (migration 20261130090000) exists in production with RLS on and a public
  read policy. It was empty: its sync route had been removed from vercel.json (the 101st cron
  broke the build).
- The sync now runs through the ingestion dispatcher, hourly at :00 (no other SEC job starts on
  that minute), 1,200 companies a run at the shared 6-a-second SEC throttle. First run
  (16:00 UTC): 1,157 rows written in 197 s, 234 distinct SIC codes, 58 registrants with no SIC
  (funds and trusts, stored with `sic` null so they are not requested every hour). About six
  runs complete the ~6,500 tickers in `ticker_sectors`; later runs refresh rows older than 90
  days.
- Mapping spot check (16 issuers): all correct (AMD, ADI, AMAT 3674; BAC 6021; APA 1311; AAL 4512;
  ADBE 7372; AIG 6331; ...). Known SIC limits: Abbott files under 2834 (pharma), Amazon under
  5961 (catalog retail).
- While the backfill runs, an industry screen counts the unclassified companies as unchecked:
  its coverage is `bounded` and it says so. Live check (16:20 UTC), "Semiconductor companies
  with operating margins above 25%": 22 classified SIC 3674 members, 19 with filed revenue,
  AVGO 39.9%, ADI 38.6%, AMAT 29.2%, status bounded with 5,361 listings not yet classified.
- SQL_02 (`supabase/migrations/20261130100000_company_industry_country.sql`) adds the EDGAR
  business address and incorporation codes. Not applied yet; until it is, country universes are
  refused with a notice. The sync detects the columns and refreshes older rows first once they
  exist.

## 2. Cron architecture: the ingestion dispatcher

`/api/cron/dispatch` is one Vercel cron, every minute. It runs the jobs in
`src/lib/cron/dispatch-registry.js` on their own UTC cron schedules:

- each job keeps its own route, CRON_SECRET check, cron lock (idempotency), `ingest_runs` row,
  checkpoint and failure capture (`cronRoute`)
- due selection by standard cron expressions (Vixie day-of-month/day-of-week semantics)
- retries for fast failures (network error, 5xx, 429) with backoff; a job still running when the
  6 s acknowledgement window closes is reported as `started` (Vercel does not cancel a function
  when its caller disconnects)
- concurrency: 8 dispatches in flight, plus per-upstream groups (`sec-edgar` 1, `fmp` 1)
- monitoring: the dispatcher's own run row (dispatched, completed, started, lockSkipped,
  failed with reasons)
- `enabledEnv` and `until` per job

Migrated (audited): the six `sonar-model-bench` lanes, same every-minute frequency and same lock
keys (locks are per query string). vercel.json 100 -> 95 definitions. Added: the industry sync,
and the screen price sync (off until `SONAR_PRICE_SYNC` is set). Every other cron is unchanged.

Migration plan for the rest: move a job only after reading its route (lock TTL vs schedule,
upstream it shares, whether it pages with a checkpoint). Candidates in order: the five
`sec-13f-backfill` minutes and `ingest-insider` (both SEC, so they belong in the `sec-edgar`
group, which then also serializes them with the industry sync), then the hourly feeds.

Tests: `npm run test:cron-dispatch`.

## 3. Entity resolution

`src/lib/sonar/canonical-entities.js`: typed identities, the longest canonical name wins over
its parts.

- `central_bank` (Fed, Bank of Canada, Bank of England, ECB, BoJ, ...): id, country ISO2/ISO3
- `company`: issuers whose names collide with generic words (Bank of America, Goldman Sachs,
  Morgan Stanley, JPMorgan, Royal Bank of Canada, TD, BMO, Scotiabank, CIBC, General Dynamics,
  Texas Instruments, Analog Devices, ...)

Consumers: the understanding phrase pass (company as a ticker entity typed `company`; central
bank as `central_bank` plus its country, with the country's own name), the canonical intent
(subject text, type, id, status `resolved`, signature keys such as `company:BAC`, never the
last word "america"), the research resolver (a central bank alone resolves no company), and
the Composer (`resolveCompany`, `resolveSubject`). Follow-up comparison and result signatures
use the same keys.

Country-qualified universes ("Canadian banks", "banks in Canada") carry `universe.country`;
the executor filters by EDGAR business address and never falls back to the whole industry.
Canadian banks file IFRS on Form 40-F, which is not in the filed-figure store, so the screen
reports them as checked with data unavailable.

Production fixes found during verification: the Bank of Canada run crashed (country entity was
labelled "Bank of Canada", country resolution lost its ISO3, and `packEvidence` had no guard
for a non-finite score); the Bank of America vs Goldman Sachs comparison failed (canonical
lookup was only in `resolveSubject`). Both fixed and re-verified: Bank of Canada answers "No,
one 0.25 point hike on 2026-10-29" with no company tasks; BAC and GS now resolve (operating
margin is not available for either: banks file no operating income line, and GS has no mapped
revenue concept, so both show as missing, not zero).

## 4. Screen completeness

Coverage metadata on every screen (`screenCoverage`):
`status` (complete, complete_with_missing_data, bounded), `exhaustive`, `eligibleUniverse`,
`evaluatedCount`, `unchecked`, `unavailable`, `excluded[{kind, reason, count}]`, `sampling`,
`prices{candidates, cached, live, unchecked}`. A bounded screen opens its limitations with the
unchecked count and the fulfillment status is `limited`.

Unchecked sources: the 1,200-company universe cap (alphabetical), unpriced valuation candidates
(live quotes capped at 150, largest by filed revenue first), the 13F breadth cap, and companies
not yet classified by SIC.

Prices: stored closes (`price_data_cache`, 7-day limit) are read for every candidate first;
live FMP quotes only for the rest. The batch quote endpoint answers 402 on the current FMP plan.
`/api/cron/sync-screen-prices` (dispatcher, weekdays after the US close) stores one close per
screenable company from FMP quotes; about 6,000 calls a trading day, so it is off until
`SONAR_PRICE_SYNC` is set. Live check, energy P/E screen: 212 eligible, 132 with filed
revenue, prices 10 cached + 122 live, 0 unchecked, status complete_with_missing_data.

## 5. Screen grammar

- a filtered sector or index is a screen without a verb
- revenue growth verb forms (grew, increased, rose); P/S as "Nx sales"; "sorted/ordered by"
- filters split on and, but, while, plus; operators kept
- every numeric condition must become a typed filter: an unreadable condition, or a unit that
  does not fit the measure ("revenue jumped more than 20%" is a percentage on a dollar measure),
  stops the screen with a specific notice; a screen never runs unfiltered
- time windows ("over 3 years") are not conditions

All five phrasings from the brief execute (tests in check-sonar-execution.mjs).

## 6. Claim quality

Audit of the standard writer's removed claims: (1) the evidence itself was wrong (the Bank of
Canada run read a bank company's filings, 13F and peers; the AMD/Intel/Qualcomm comparison read
a world GDP growth ranking because "revenue growth" matched the macro theme "growth"), then
(2) figures the writer computed itself, (3) superlatives over an unchecked universe, (4) facts
attributed to fiscal year ends.

Fixes: the resolver and planner fixes above; company measures are removed before macro theme
routing (typed by METRICS kind); and a typed evidence contract
(`src/lib/sonar/composer/evidence-contract.js`) in the writer prompt for every computed step:
verified figures (entity, label, value, unit, period), allowed conclusions, unsupported
conclusions, unknowns (missing, not zero; unchecked companies; missing CPI months). Telemetry
keeps the counts.

Production: Bank of Canada 2/7 claims kept before, 4/6 after, no company tasks; Fed 6/6 (the
2026-09-17 +0.25 move to 3.875% verified against the BIS daily series); energy screens 7/7.

Writer candidate: model bench suite `model-bench-2026-11-28-contract` (current Haiku 4.5
writer vs Sonnet 5.5 standard writer, each with and without the contract, on profile-d3's frozen
evidence, standard cases only, $15 cap), queued after profile-d4. Claim survival is now scored.
Global routing is unchanged.

## 7. Institutional data security (Quiver)

- `/api/quiver/sec13f`: signed-in users only (its only consumer is the signed-in Inside the
  Capitol page, so no one loses access). Verified: anonymous 401, signed in 200.
- `/api/quiver/congress-trades`: guest access kept (Sonar's guest dossier uses it), strict
  per-minute limit.
- Both: validated filters (tickers, bioguide ids, dates, owner names; anything else 400),
  5-minute shared cache with in-flight de-duplication, failures never cached, daily upstream
  quota per user (200 or 300) or IP (60), upstream counter in the logs (pages, rows, ms,
  hit/miss).
- Found: the Quiver 13F endpoint answers 403 for Ezana's key, so the 13F table on Inside the
  Capitol is empty in production today (independent of this change).
- Redistribution: Quiver's API pricing lists commercial use and redistribution only on its
  Commercial tier; the lower tiers say no commercial use rights. Displaying Quiver data to Ezana
  users needs the Commercial tier. Confirm which tier Ezana holds.
- No pricing or plan-access change was made.

## 8. Methodology

- Null audit: filed figures skip null values (Number(null) is 0; a null latest revenue had read
  as -100% growth); contract, 13F and lobbying sums give no total for a company whose amounts
  are all null.
- Macro provenance per country: observed series, derived figures with formulas, missing CPI
  months listed, `interpolated: false`; carried into the evidence contract.
- Unchanged and still in force: TTM without look-ahead, staleness limits (filings 270 days,
  shares 200, price 7), P/E null for negative earnings with earnings yield kept, fiscal
  alignment within 45 days for comparisons.

## 9. Evaluation

Held-out v3 (written before the hardening code): 13 new cases; 9 v2 and v3 cases retired as
development examples (5 named in the brief, 4 whose failures were inspected; each replaced
before further changes).

| | baseline b8aa1071 | after |
|---|---|---|
| all 63 cases, objective met | 47 | 56 |
| the 13 new cases | 2 | 10 |
| the 50 earlier cases | 45 | 46 |

Still failing: H8 (refused with a notice, correct behaviour but not the expected set), H10 ("in
order of" not read as ranking), H11 ("as well as" not split), C02, C04. Analyst routing evals
153/253, unchanged.

## 10. Remaining limitations and next release

- Run SQL_02; decide on `SONAR_PRICE_SYNC` (FMP budget) and the Quiver tier.
- Foreign private issuers (20-F, 40-F, IFRS) are not in the filed-figure store; some US filers
  (APA) lack a mapped revenue concept, so 80 of 212 energy companies have no filed revenue.
- Debt-to-equity reads `long_term_debt`; companies with only revolver or current debt read as
  0.00x (AMPY).
- The writer still dated a TTM P/E "as of 2025-12-31" and added an unsupported "as commodity
  prices peak" in one headline; the contract run will show whether the contract fixes this.
- Move the SEC crons into the dispatcher after auditing each.
- H10/H11 grammar ("in order of", "as well as") as general rules with new held-out cases.
