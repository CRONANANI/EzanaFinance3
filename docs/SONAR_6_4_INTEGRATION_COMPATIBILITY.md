# Sonar 6.4 integration compatibility (Nov 28 2026)

No Anthropic API calls were made. No migration, backfill or flag was applied or turned on. Verification used deterministic tests with mocked providers, source inspection, SEC filings read in a browser, and read-only production queries. Anything described as "reviewed" was read but not executed.

**Labels used throughout:**
- **Resolved:** fixed here, with tests.
- **Safe:** safe to proceed as is.
- **Approval:** requires production approval.
- **External:** blocked by an external provider.
- **6.5:** requires coordination with the 6.5 session.
- **Deferred.**

## 1. Repository state

- **Starting point:** `main` at `174a6d0f` (Sonar Companion), which already contains `919960aa` (6.4 final integration).
- **Integration branch:** `sonar-6-4-integration-compat`, fast-forwarded onto `main` at the user's request (see section 15).
- **Files the 6.5 session touched in the last eight hours** (from git history; not edited here):
  - `src/lib/sonar/composer/*`: analytics-server, execute, fulfillment, screen, registry, intents, required-outputs, evidence-contract, macro, calc
  - `src/lib/sonar/engine/*`: engine, findings, telemetry, output-contracts, confidence, eval
  - `src/lib/sonar/semantic/*`
  - `src/lib/sonar/understand/index.js`
  - `src/lib/sonar/analysts/orchestrator.js`
  - `src/app/api/sonar/research/route.js`
- **Rule for this pass:** this pass edits nothing under `src/lib/sonar/` except tests. Every fix lives in an isolated module (`src/lib/sec`, `src/lib/prices`, `src/lib/quiver`, `src/lib/research/model-runs.js`), in an ingest route that 6.5 does not touch, or in SQL for approval.

## 2. Historical SEC identifier audit

Every consumer that resolves a ticker, CIK or company identity:

| Consumer | Identifier assumption | Risk | Required change | Tests | Status |
|---|---|---|---|---|---|
| SEC fundamentals ingest (`cron/ingest-fundamentals`) | CIK to ticker through SEC's *current* list; upsert on (cik, concept, frame) | Predecessor facts were dropped (XOM FY2025) | Verified successions only, period-bounded, successor wins inside a run; now also staged per run with `?predecessors=1&metrics=` | registrant-map 7, compat 1 to 4 | Resolved (code); Approval (backfill) |
| Ratio, valuation and screen loaders (`composer/analytics-server.js`, `execute.js`) | Read `sec_fundamentals` by **ticker**; keep the first row per period end | After a backfill, a frame both registrants reported could appear twice, and the first row wins arbitrarily | Apply `preferSuccessorFacts` (registrant-map.js), or run SQL 06 after the backfill so the table never holds both | compat 4 | 6.5 (loader files) / Approval (SQL 06) |
| TTM valuation (`valuationFor`) | Quarter rows by ticker | Same duplicate risk for quarters before the succession | Same as above | compat 4 | 6.5 |
| Lobbying name identity (`lobbying_publish_name_identity`, migration 20261124090000) | Check (c): a ticker has one CIK in `sec_fundamentals` | After a backfill, XOM, DMRC and XPRO would each have two CIKs. The rule fails closed: no wrong publication, but name matches for those tickers stop | SQL 08: ignore verified predecessor CIKs in the counts, and never publish a client against a predecessor CIK. Deployed body confirmed identical to the migration by hash | SQL review | Approval (run before the backfill) |
| Lobbying candidates (`lobbying_client_candidates`) | Name match against `sec_fundamentals.entity_name`; `min(cik)` as text | Predecessor entity names (for example Exxon Mobil Corp) become candidate matches | SQL 08 blocks publication against predecessor CIKs; candidates stay listed for review | SQL review | Approval |
| Existing lobbying mapping | "EXXON MOBIL CORPORATION" was published 2026-11-17 against CIK 2115436 (the holding company) as `relationship = direct` | Since July 1 the filer named in the lobbying record is a subsidiary of the listed parent | Review: relationship should read parent or subsidiary. No data changed here | none (data) | Deferred (human review) |
| SEC filings and insider index (`ingest-sec-filings`, `index-insider-daily`) | CIK to ticker through the current list | Predecessor filings (Exxon's 10-Ks and Form 4s before July 2026) carry no ticker | Reuse `tickerForFact` behind the same flag | reviewed | Deferred |
| 13F holdings (`sec_13f_holdings`, `composer/ownership*.js`) | Holdings keyed by CUSIP; Sonar resolves filers by filer CIK; the universe uses `TICKER_ALIASES` | `PARA: 'PSKY'` is unsafe: PARA now belongs to Parabolic Technologies (CIK 1826011, in `sec_fundamentals`). A request for PARA resolves to Paramount Skydance | Make the alias period-scoped (only before 2025-08-07) or CUSIP-scoped | compat 10 pins the current behaviour | 6.5 (ownership.js) |
| Skydance identity across datasets | `sec_fundamentals` files CIK 2041610 under SKYD; `ticker_sectors` and the ownership aliases use PSKY | Fundamentals invisible to PSKY lookups | Resolve the ticker from one source (SEC list versus market ticker) | reviewed | 6.5 / Deferred |
| Quiver 13F | Commercial feed (403 today) | none: Sonar does not read it | none | provider-isolation 5, compat 8 and 10 | Safe |
| Congressional disclosures | Ticker strings as filed | Reused tickers attribute old trades to new issuers (PARA case) | Date-scoped ticker resolution; out of scope | reviewed | Deferred |
| Government contracts (`usaspending-store.js`) | Recipient name plus `recipient_parent_name`; no CIK map | none from successions | none | compat 11 | Safe |
| Historical prices (`price_data_cache`) | Ticker only | A holding-company swap keeps the ticker, so the price history is continuous (XOM has closes through 2026-11-27) | none for these three | reviewed | Safe |
| Research caches (answer cache, saved runs) | Store what was computed at run time | Answers computed before a backfill keep the gap | Note the backfill date in the release notes; nothing to invalidate automatically | reviewed | Safe |

**Safeguards confirmed by tests (compat 1 to 4, registrant-map 7):**
- effective-date correctness, with no look-ahead on either side;
- filing CIK and accession preserved;
- predecessor and successor kept as distinct legal entities;
- no ticker-only joins;
- unverified rows (REAX, SKYD) never used;
- one fact per frame under `preferSuccessorFacts`.

## 3. Migration review

SQL 01 and SQL 02 **were already applied in production** (the table exists with five rows, created 2026-11-28). The catalog was reviewed read-only:

| Item | Finding | Status |
|---|---|---|
| Order | 01 (table) before 02 (seed); both idempotent (`if not exists`, `on conflict do nothing`) | Safe |
| Constraints | primary key, distinct CIKs, relationship enum, accession format, unique (predecessor, successor) | Safe |
| Missing constraints | CIK format, verified rows needing a verifier and date, unique (ticker, predecessor), bounds order | Approval (SQL 03) |
| RLS | enabled; one SELECT policy for `authenticated`; no write policies | Safe |
| Grants | `anon` and `authenticated` hold TRUNCATE, TRIGGER and REFERENCES (Supabase defaults; RLS does not cover TRUNCATE); `anon` holds SELECT, which RLS filters to nothing | Approval (SQL 03 revokes them) |
| Indexes | primary key, unique pair, partial `predecessor_cik where verified` | Safe |
| Rollback | SQL 07 (rows) and an optional drop table | Safe |

## 4. Verified succession status

The three verified rows were checked against the 8-K12B filings themselves:

| Ticker | Predecessor, then successor | 8-K12B | What the filing says | Seeded date | Status |
|---|---|---|---|---|---|
| XOM | 34088 (Exxon Mobil Corp), then 2115436 (ExxonMobil Holdings Corp) | 0001193125-26-291990 | merger "effective on July 1, 2026"; Rule 12g-3(a) successor | 2026-07-01 | Safe |
| DMRC | 1438231 (Old Digimarc), then 2119322 (Digimarc Corp) | 0001437749-26-017527 | "On May 15, 2026, Old Digimarc notified Nasdaq of the completion of the Reorganization"; filed May 18 | **2026-05-18 (wrong)** | Approval (SQL 03 corrects it to 2026-05-15) |
| XPRO | 1575828 (Expro Group Holdings N.V.), then 2126198 (Expro Ltd) | 0001104659-26-083106 | "On July 13, 2026 ..." charter effective | 2026-07-13 | Safe |
| REAX | 1862461, then 2136387 | 0001104659-26-100334 | merger of two businesses; predecessor files IFRS 40-F reports | n/a | unverified, stays unverified |
| SKYD | 813828, then 2041610 | 0001193125-25-175046 | Paramount and Skydance combination | n/a | unverified, stays unverified |

The DMRC error changes no stored fact, because no quarter or fiscal year ends between May 15 and May 17. It is corrected for exactness.

## 5. Backfill approval checklist (do not run without approval)

- [ ] **0. Preconditions:** SQL 03 applied (DMRC date and grants); SQL 08 applied (lobbying rule).
- [ ] **1. Preflight:** run SQL 04 and keep the output. Expected:
  - (a) 0 rows under 34088, 1438231 and 1575828;
  - (b) XOM, DMRC and XPRO quarterly rows only;
  - (c) SUPN the only ticker with two CIKs;
  - (d) 0 duplicate frames;
  - (e) no CY2025 revenue for the three tickers.
- [ ] **2. Stage 1, revenue only.** Call the cron-authenticated `GET /api/cron/ingest-fundamentals?backfill=1&predecessors=1&metrics=revenue`. The response reports `predecessor_mapping.rows` per ticker. The expected periods are those ending before each effective date that the successor did not report itself:
  - XOM: CY2020 to CY2025 annual, plus quarters up to CY2026Q1;
  - DMRC: annual years, plus quarters up to CY2026Q1;
  - XPRO: annual years, plus quarters up to CY2026Q1;
  - the successors already hold CY2025Q2, CY2025Q3 and CY2026Q2 comparatives, and those win.
- [ ] **3. Verify:** run SQL 05. Every check must return its expected result. If check 3 finds duplicates, get approval and run SQL 06.
- [ ] **4. Stage 2:** repeat step 2 without `metrics=` (all concepts), then repeat step 3.
- [ ] **5. Decide the steady state:**
  - leave the mapping off (rows written stay; nothing new maps); or
  - set `SEC_PREDECESSOR_MAPPING=1` so daily runs keep mapping verified predecessors.
- [ ] **6. Rollback, at any point:** run SQL 07, then stop using `?predecessors=1` and unset the flag.

The source CIK is preserved because the upsert key is (cik, concept, frame): predecessor rows are stored under the predecessor CIK and can never overwrite a successor row.

## 6. Revenue concept comparability

- **Current coverage** (production, read-only): 4,026 tickers have both CY2024 and CY2025 annual revenue. 3,958 use the same concept and get growth. 68 switched concepts and now get "not comparable" with a reason:
  - 59 switched Revenues to ASC 606 contract revenue: median absolute change 56.6%, 26 within 25%;
  - 9 switched contract revenue to Revenues: median 72.9%, 3 within 25%;
  - none changed CIK.
- **Interpretation:** Revenues is *total* revenue; contract revenue is the ASC 606 subset. The switch mostly reflects which tag an issuer filed for a full-year frame, and the two measures usually differ. A blanket equivalence would be wrong for most of these 68.
- **Potentially equivalent, issuer by issuer only with same-period evidence:**
  - Revenues and contract revenue (excluding tax);
  - SalesRevenueNet and contract revenue (across ASC 606 adoption, 2017 to 2020);
  - RegulatedAndUnregulatedOperatingRevenue and Revenues (utilities).
- **Never equivalent:** gross of tax versus net of tax (`...IncludingAssessedTax` versus `...ExcludingAssessedTax`); bank revenue concepts versus industrial revenue; IFRS (`ifrs-full:Revenue`) versus US GAAP; extension or dimension-only revenue.
- **Required evidence:** the issuer's own filing reporting both tags for one period, within 0.5%. This needs SEC companyfacts per issuer, because `sec_fundamentals` stores only the first matching concept per frame.
- **Proposal:** `src/lib/sec/revenue-equivalence.js` (`rev-equiv-v0-proposed`). Every entry carries concepts, definition, context, evidence rule, effective periods, review status, methodology and version, and is evaluated by `assessRevenueComparability`. **It is not wired in:** `revenueGrowth` is unchanged and missing stays missing (compat 5 and 6).
- **Recommended implementation:**
  1. Store the runner-up concepts per frame (a small `sec_fundamentals_alt` table, or companyfacts per issuer).
  2. Compute same-period overlaps.
  3. Have a reviewer promote pairs per issuer.
  4. Only then let `revenueGrowth` accept a reviewed pair, behind a flag.

Classification: Safe (current behaviour); Deferred (equivalences).

## 7. Shared price-contract readiness

**Inconsistencies found:**

| Consumer or source | Date | Source recorded | Currency | Adjustment | Missing or sample handling |
|---|---|---|---|---|---|
| `price_data_cache` (shared) | trading day | **no column** | none (assumed USD) | `close` means different things per writer: FMP EOD unadjusted; **Alpaca rows store the adjusted close in `close`** (`sync-award-prices`, `adjustment=all`); quant-universe copies close into adj; screen sync stores **quotes** as closes | nulls skipped by readers |
| Sonar valuation (`valuationFor`, `storedClose`) | `asOf` = cache date | 'cache', 'live', 'stored_close' | none | not recorded | missing stays missing; window 10 days; no stale label |
| Company Research and stock candles | candle dates | FMP | none | FMP adjusted or raw by endpoint | sample state header (6.4) |
| Watchlist sparklines | candle dates | via stock-candles | none | as above | sample labels |
| Quant Lab (`sync-quant-universe`) | bar date | not stored | none | adj copied from close | n/a |
| Mock portfolio and trading quotes | live quote time | quotes route (FMP or Finnhub) | none | last trade | provider errors return an empty quote |
| Alpaca bars (`daily-bars.js`) | bar date | 'alpaca' | none | adjusted (`all`) | empty on failure |
| Alpha Vantage, Finnhub | latest trading day, unix time | per route | none | last trade | Finnhub `c=0` means none |

**Built (isolated, not wired):**
- `src/lib/prices/sonar-valuation-prices.js`: `valuationPrices({ cacheRows, quotes, asOf })` returns the `{ price, asOf, source }` shape valuation already consumes, plus provider, kind, adjustment, currency, age and contract version. It rejects zero or missing prices, sample data, closes older than 10 days (quotes older than 4), rows dated after `asOf`, and non-USD prices against USD filings.
- `fromCacheRow` was corrected so `close` is called "unadjusted" only when `adj_close` differs from it, because Alpaca rows store adjusted values in `close`.
- Flag: `SONAR_PRICE_CONTRACT=1`, read by `priceContractEnabled`; nothing reads it yet.
- `SONAR_PRICE_SYNC` and the Alpaca batch refresh were not touched.

**Migration plan:**
1. 6.5 swaps `storedClose` and `pricesFor` to `valuationPrices` behind `SONAR_PRICE_CONTRACT` (6.5).
2. Shadow-compare a week of runs: same prices, plus provenance.
3. Approve SQL 09 (provenance columns on `price_data_cache`) and have each writer fill them.
4. Move screens, then Company Research charts.
5. Retire the per-route quote shapes.

Classification: Safe (adapter); 6.5 (wiring); Approval (SQL 09).

## 8. FMP demonstration-mode isolation

**Tested** (market-sample 10, compat 8 and 9):
- off by default;
- an FMP refusal is unavailable (503) for normal users;
- demo mode serves labelled, no-store sample data only to authorized contexts;
- `user_metadata` is never trusted;
- outside a wrapped route (Sonar, crons, trading, valuation), an FMP refusal stays a refusal: the global fetch wrapper only substitutes inside `withFmpSample`;
- only the 12 wrapped routes import the sample module;
- no wrapped route writes to the database.

**Indirect flows found and fixed:**
- **The mock trading page** read `/api/fmp/stock-stats` (sector and market cap) into the thesis fit and concentration checks, and the movers card offered `/api/fmp/movers` picks as tradable. Both now treat a sample response as unknown or empty. (Resolved)
- **Model runs** (`recordModelRun`, session storage shown on the company Overview) built from sample figures are now tagged `sample: true`, with "(sample data)" added to their label and note. (Resolved)

**Reviewed only:**
- Saved research, screens and the Sonar evidence stores fetch their own data server-side and never read the wrapped routes.
- The AI analysis request sends only the ticker.
- Chart and tooltip labels apply on every page because the observer runs in the dashboard layout.
- CSV export labelling is in place.

## 9. Quiver provider failure

**Tested:**
- A persistent 403 is remembered per route for an hour. Every caller gets 503 `provider_unavailable` after one upstream attempt. Congress trades keep working.
- The routes and the proxy never write to the database.
- Sonar never calls Quiver for 13F data.

**New and resolved:** a transient first-page failure (timeout or 5xx) used to be answered `200 []`, which reads as zero holdings. It is now `unavailable` (503), not cached, and not remembered, so the next request retries within the caller's quota.

**Reviewed only:** signed-in-only access (`withApiGuard`) and the per-user daily quota are unchanged.

**Limitation:** the refusal memory is per server instance, so each warm instance makes at most one attempt per hour.

Entitlements and endpoints were not changed. Hedge Fund 13F access is not in Quiver's current plan. Classification: External.

## 10. Sonar 6.5 compatibility matrix

| Contract | Interface 6.5 must consume | 6.4 guarantee | Test | Status |
|---|---|---|---|---|
| Canonical company identity | ticker as filed; CIK as the legal entity | CIK never inferred from a ticker; aliases flagged (PARA) | compat 1, 10 | 6.5 (aliases) |
| Historical CIK relationships | `tickerForFact`, `predecessorCiks`, `preferSuccessorFacts` | verified rows only; no look-ahead | compat 1 to 4 | Safe |
| Statement provenance | `cik`, `accession_no`, `taxonomy_concept` on every row | preserved | compat 3 | Safe |
| Revenue comparability | `revenue_growth_reason`, `revenue_concept` from `companyRatios` | different concepts give null plus a reason | compat 5 | Safe |
| Price metadata | `valuationPrices` output (`provider`, `adjustment`, `currency`, `ageDays`) | not wired yet | compat 7 | 6.5 |
| Missing data | null plus a reason; never 0 | revenue, debt and prices | compat 6, 7; debt-equity 11 | Safe |
| Reporting periods | `period_end`, `frame`, `balance_sheet_date` | annual growth needs ends 330 to 400 days apart | revenue-growth 7 | Safe |
| Source coverage | unverified successions excluded; IFRS unsupported | explicit | compat 1 | Safe |
| Provider failures | `x-ezana-data-state`, `provider_unavailable`, `unavailable: true` | never empty-as-zero | compat 8; provider-isolation 5 | Safe |
| Sample data | `state === 'sample'` and `_sample: true` | rejected for valuation and trading | compat 9 | Safe |
| Organization isolation | `getSonarEntitlements` version `org` versus plan tier | neither grants the other | compat 12 | Safe |

## 11. Deterministic regression results

All runs were on branch `sonar-6-4-integration-compat`, on top of `174a6d0f`, using local fixtures only. None of this is production validation.

| Command | Result | Cases | Skipped |
|---|---|---|---|
| `npm run test:registrant-map` | pass | 7 | 0 |
| `npm run test:revenue-growth` | pass | 7 | 0 |
| `npm run test:debt-equity` | pass | 11 | 0 |
| `npm run test:price-contract` | pass | 7 | 0 |
| `npm run test:provider-isolation` | pass | 5 | 0 |
| `npm run test:market-sample` | pass | 10 | 0 |
| `npm run test:quiver-proxy` | pass | 3 | 0 |
| `npm run test:sonar-model-routing` | pass | 25 | 0 |
| `npm run test:6-4-compat` (new) | pass | 12 | 0 |
| `npm run test:typed-relevance` | pass | 6 | 0 |
| `npm run test:sonar-understand` (canonical entity resolution) | pass | 36 | 0 |
| `npm run test:cron-dispatch` | pass | 4 | 0 |
| All 66 `test:*sonar*`, `*semantic*` and `*composer*` scripts | pass | all | 0 |

**No Anthropic calls:** `check-6-4-compat.mjs` loads `scripts/lib/no-llm-guard.mjs` first. That guard replaces `fetch`, refuses every unmocked host and records LLM attempts, and the suite fails if any LLM request was attempted. Paid providers (FMP, Quiver) are mocked.

## 12. Unresolved risks

- **PARA aliasing to PSKY** in ownership (wrong company for PARA requests). (6.5)
- **SKYD and PSKY** split across datasets. (6.5 / Deferred)
- **Duplicate frames after a backfill** if loaders do not apply the successor rule and SQL 06 is skipped. (Approval / 6.5)
- **The existing Exxon lobbying mapping** is labelled `direct` against the holding company. (Deferred, human review)
- **Predecessor 10-Ks and Form 4s** still lack tickers in `sec_filings`. (Deferred)
- **`price_data_cache.close` semantics** differ by writer until SQL 09 and the writer updates land. (Approval)
- **Quiver 13F** stays unavailable until the plan includes it. (External)
- **The revenue equivalence registry** is a proposal; the 68 switched issuers show no growth until reviewed. (Deferred)

## 13. Production actions requiring approval

1. SQL 03: DMRC date correction, grants and constraints.
2. SQL 08: lobbying rule aware of successions (before the backfill).
3. The staged backfill (section 5), with SQL 04, 05 and 06, and SQL 07 on standby.
4. Whether to set `SEC_PREDECESSOR_MAPPING=1` permanently.
5. SQL 09 (price provenance columns) when the price migration starts.
6. Reviewing REAX and SKYD (they stay unverified).

## 14. Files changed

**New:**
- `src/lib/sec/revenue-equivalence.js`
- `src/lib/prices/sonar-valuation-prices.js`
- `scripts/check-6-4-compat.mjs`
- `docs/sql/sonar-6-4-integration/SQL_03` to `SQL_09`
- this document

**Changed:**
- `src/lib/sec/registrant-map.js`: `predecessorCiks`, `preferSuccessorFacts`
- `src/app/api/cron/ingest-fundamentals/route.js`: staged `?predecessors=1`; `predecessor_mapping` in the response
- `src/lib/prices/price-contract.js`: cache-row adjustment semantics
- `src/lib/quiver/proxy.js`: a transient failure reports unavailable
- `src/lib/research/model-runs.js`: sample tagging
- `src/app/(dashboard)/trading/mock/page.js` and `src/components/trading/mock/MockSections.jsx`: sample responses rejected
- `docs/sql/sonar-6-4-final/SQL_01`, `SQL_02`: reference copies updated with the grants and the DMRC date
- tests: `check-registrant-map`, `check-price-contract`, `check-provider-isolation`
- `package.json`: `test:6-4-compat`

**Unchanged:** every file under `src/lib/sonar/`.

## 15. Branch and pull request

The brief asked for a reviewable branch rather than a direct push to `main`. The user's own instruction for this task was to push to `main`, which is also the repository's standing rule (CLAUDE.md). Both were honoured:
- the work was committed on `sonar-6-4-integration-compat` and that branch was pushed for review;
- the same commit was then fast-forwarded onto `main` with a normal rebase and push: no force-push, and no reset of anyone else's work;
- no 6.5-owned file was edited.
