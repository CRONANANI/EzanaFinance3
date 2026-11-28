# Sonar 6.5.1: research coverage, entity intelligence and production integration

Nov 28, 2026. HEAD at the start: `c9fd32d` (it contains `1309a28`, `2a62a65`, `c9fd32d` and
`5a38ed83`). No Anthropic API calls were made, and no model routing, Profile D, D-Efficient or
S55W change was made. No migrations were applied, no backfill was run, and
`SONAR_PRICE_CONTRACT` and `SONAR_PRICE_SYNC` stay off. Pushed to `main` at the founder's
instruction; the repository's standing rule is main-only, so there is no feature branch.

Verification is deterministic (`npm run test:sonar-6-5-1`, 23 tests, scenarios A to P). The
fixtures and hand-worked expected outputs were committed first (`00d0a57`).

## 1. Baseline findings

See `docs/SONAR_6_5_1_BASELINE.md` for each query: intent, attachment, filters, universe,
ranking and unsupported requirements.
- **Three queries produced no plan:** A, A3 and A4 (contracts relative to revenue), and D (obligation growth).
- **A2 ranked by revenue,** not by contract exposure.
- **B2 read "Department of Energy" as the energy sector.**
- **B and C left DoD "unsupported."**
- **E read "increasing obligations" as "any award."**
- **C ranked by the 13F level** instead of the change the question asked about.

## 2. Root cause

**Missing measures.** Sonar had no obligations-to-revenue, comparable-period or agency
executor.

**Requirement extraction gaps.** Extraction recognized these conditions but had nothing to
attach them to. Agency names collided with sector words.

**Execution and identity gaps.**
- Congressional trades and sector rows were keyed by ticker string only.
- The 13F cap kept companies in alphabetical order.

**A correction to 6.5.** `contract_awards_resolved.action_date` holds the award's
USAspending **Start Date**: the ingest maps "Start Date" into that column. Rows after today
are awards that have not started, not invalid dates. The 6.5 note and its SQL file are
corrected.

## 3. New financial screening measures

These measures are defined in `composer/screen.js` and computed by `execution/contracts.js`.

| Measure | Definition |
| --- | --- |
| `federal_contract_obligations_to_revenue` | Obligations divided by the latest filed annual revenue. **Obligations:** awards that started in the latest complete federal fiscal year, using USAspending "Award Amount" (obligated to date, never the ceiling). **Revenue:** must end within 365 days before that year ends. Methodology: `obligations_to_latest_filed_revenue_proxy`. |
| `federal_obligations_current_period` / `_prior_period` | Net obligations per federal fiscal year. |
| `federal_obligations_change` / `_growth_pct` | Current year minus prior year. Growth is computed only when prior net obligations are positive. |
| `federal_awarding_agency_concentration` | The largest agency's share of positive obligations. |

**The ratio is unavailable (with a reason) when:**
- obligations or revenue are missing;
- revenue is zero or negative;
- the currencies differ;
- the revenue year falls outside the alignment window.

**Each company's result carries:**
- obligations, revenue and the ratio;
- the contract period and the revenue period;
- the attribution;
- coverage;
- the methodology;
- sources;
- missing inputs;
- qualifications.

**The proxy never answers the accounting question.** "Share of revenue from the government"
stays an unsupported requirement (`gov_revenue_share`).

## 4. Agency resolution

`src/lib/contractors/agencies.js` lists 11 toptier agencies, each with its CGAC code.

**What the data holds.** The awards table stores USAspending toptier agency names in
`awarding_agency` and `funding_agency`. There is no code column.

**How matching works.**
- Matching is exact on that canonical name; there is no fuzzy matching.
- Codes take over automatically once SQL 03 adds code columns.
- The basis is awarding by default, labelled as such. "Funded by" switches to the funding basis.

**Where the filter applies.** It applies to the seed and to every contract read (window,
fiscal year, ratio, growth). The result carries `agencyFilter {agency, basis, cgac}`. The
requirement counts as satisfied only when the screen actually applied that agency.

**Limits.** One agency per screen; a second named agency stays visible as unsupported.

## 5. Contract growth methodology

**Periods.** The comparison is complete federal fiscal year against complete federal fiscal
year (FY2026 against FY2025 on Nov 28, 2026). A trailing-12-month pair exists in the code but
is not wired.

**How awards are counted.**
- There is one row per award (upsert key `generated_award_id`), so transactions are never double-counted.
- Modifications are netted into the award amount.
- A net deobligation is kept as a negative amount.
- Net obligations, gross positive obligations and the count of new awards are reported separately.
- The ceiling (`base_and_all_options`) is never used.

**Missing years.** A company with no resolved award in one of the two years is **unknown**,
never "growth from zero" or "fell to zero."

**The stated proxy.** Obligations are attributed to the year in which the award started,
together with everything obligated on it to date. Per-transaction obligation dates are not
ingested.

## 6. Historical congressional ticker integration

`tradeSecurity` in `src/lib/sec/security-identity.js` extends the existing date-aware
resolver; there is no new alias registry.

**How a trade resolves.**
- It resolves by the transaction date, never by the filing date.
- A reused symbol resolves only to a holder whose period is verified for that date. Otherwise the trade is unresolved.
- A date range that spans a reassignment stays uncertain.
- A missing ticker or a missing date (on a reused symbol) makes the trade unresolved.
- Disclosure references are kept.
- A verified succession (changed CIK, same security) is noted as `registrantChange`. It never moves the trade to another security.

**PARA.**
- On or before 2025-08-06 it resolves to Paramount Global (CIK 813828), which is not today's security.
- From 2025-08-07 on, it is unresolved until Parabolic Technologies' listing date is verified.

**Where it applies.** It is wired into the Congress seed and the Congress filter. Excluded
trades are counted in lineage and named in a limitation.

**Missing schema columns.** `congress_trades` has no date-range columns, and
`transaction_date` is not null.

**Limited verified history.** No other reused symbol was added: this session could not verify
new source records, so the history holds only the cases already verified in 6.4.

## 7. SKYD/PSKY compatibility

**Sector table.** `dedupeByEntity` keeps one entry per CIK in `ticker_sectors` universes. The
kept symbol is SKYD (marked current), and a limitation names the merge. Unrelated issuers that
share a symbol are never merged.

**Fundamentals and ownership.** These carry over from 6.5: PSKY lookups read SKYD rows only
when the filing CIK is 2041610.

**SQL 02 (prepared).** Adds `cik`, `effective_from`, `effective_to` and `is_current` to
`ticker_sectors`, with RLS unchanged, verification queries and a rollback.

## 8. Coverage and universe limits

**Stage A (the screen).** The result gains `universeReport`:
- eligible;
- evaluated;
- unchecked, with the tickers;
- passing, failing and unknown;
- coverage status;
- exhaustive.

Companies beyond the 1,200 universe cap now count as unchecked. When the 13F cap applies,
companies are taken largest by filed revenue first, not alphabetically. The note says the
result is not exhaustive.

**Stage B (follow-on research).** `universeFromComposition` returns `research`:
- the selection method (`top_ranked_passing`, or `first_page_unranked`, labelled "not a representative sample");
- the follow-on count;
- the total qualified;
- the screen coverage;
- the number unchecked in the screen.

**Caps.** Neither cap was raised, and no new fan-out was added.

**Other fixes.**
- A ranking with no condition is evaluated per company, so a company without the value is unknown, never dropped.
- The ranking read is isolated: a failure becomes a provider-error step, never a thrown screen.

## 9. Price-contract readiness

**Added, all off by default.**
- `src/lib/prices/price-shadow.js` compares the legacy stored-close selection with the adapter's selection on the same cached rows. Verdicts: `same`, `price_differs`, `legacy_only`, `contract_only`, `neither`. Flags: `adjusted_close_differs`, `quote_row`, `sample`.
- The screen-price path (`pricesFor`) goes through the adapter only with `SONAR_PRICE_CONTRACT=1`.
- With the flag off, both `pricesFor` and `storedClose` behave exactly as before.

**Tests confirm:**
- zero prices are rejected;
- prices older than 10 days are rejected;
- adjusted versus unadjusted mismatches are detected;
- the flag-off output is unchanged.

**Sample data.** `price_data_cache` has no sample marker. Sample rejection happens where data
is marked, at the provider responses (6.4).

**SQL 09 review.** The columns are additive and correct. `close_adjustment` must be filled per
writer, because Alpaca rows store the adjusted close in `close`. Approve SQL 09 only together
with writer changes that fill it, or every row stays "unknown."

**Side-by-side plan (no paid calls).**
1. Run SQL 01 query 7 to size the mismatch classes.
2. On a read replica or a service-role script, load a week of `price_data_cache` rows and run `comparePriceSelection` per day.
3. Accept enabling the flag only if `price_differs` comes only from rows flagged `adjusted_close_differs`, with a methodology decision recorded for those.
4. Enable `SONAR_PRICE_CONTRACT=1` in preview first.

## 10. SEC succession deployment checklist

**Code status.**
- `filedFiguresPaged` applies `preferSuccessorFacts` per SEC **frame** (changed in 6.5.1 from period end: a 52/53-week predecessor year and the successor's calendar year share a frame).
- It keeps the filing `cik` and `accession_no` on every figure.
- It drops null rows before the rule.
- With no predecessor rows (today), nothing changes and nothing is invented.
- Lobbying identity checks pass (`test:6-4-compat`).

**Staged procedure (6.4 report section 5). Not executed:**
1. SQL 03: hardening plus DMRC date.
2. SQL 08: lobbying rule.
3. SQL 04: preflight, with expected outputs (a) to (e).
4. Revenue-only backfill: `?backfill=1&predecessors=1&metrics=revenue`.
5. SQL 05: verify.
6. Duplicate review. Use **6.5.1 SQL 04** instead of raw SQL 06: it backs up and reviews the exact rows before deleting only those, and has a rollback. SQL 06 is hygiene; the loaders already prefer successors.
7. All-metrics backfill.
8. Final SQL 05 verification. Steady state: leave the mapping off, or set `SEC_PREDECESSOR_MAPPING=1`.

**Plan versus current schema.** The plan matches the current codebase. The upsert key
`(cik, concept, frame)` preserves predecessor CIKs, and the loader reads
`sec_registrant_successions` (SQL 01/02, reported applied) with `verified = true`.

## 11. Research-intent improvements

All changes are in `execution/requirements.js` and `composer/intents.js`.

**New patterns.**
- Contracts relative to revenue, in many phrasings, including named companies.
- "The most obligations" from an agency.
- Increasing or declining obligations.
- Agency names (11).
- "Share of revenue from the government" (unsupported).
- Institutional ownership: **percentage** and **share holdings** are unsupported and the manager count is not substituted. "More managers" is exact. "Increasing institutional ownership" stays a labelled proxy.

**Named companies.** RTX and Palantir join the canonical company list. Named companies become
the universe of a contract question.

**Ranking.** When the requirements change the filters, the ranking uses the measured
condition, never the level of a measure whose change was asked about.

**6.5 assertions updated.** Two 6.5 test assertions that pinned "DoD unsupported" and "growth
unsupported" were updated, because those are now executed. The unsupported case in that test
now uses a second agency.

## 12. Research execution telemetry

`execution/synthesis.js` `telemetry` gains aggregate counts:
- plan generated;
- executed requirements;
- unknown conditions;
- unchecked universe;
- bounded;
- entity-resolution failures (historical trades excluded);
- cross-dataset joins;
- objective complete.

There are no tickers, no research text and no organization ids in telemetry.

`failureCategory` maps a failure to one of six categories: provider entitlement, dataset
unavailable, timeout, dependency failure, invalid output, unexpected. The research route logs
the category and sends it with the error event; provider text never reaches the user.

## 13. Deterministic test results

| Suite | Result |
| --- | --- |
| `test:sonar-6-5-1` (new, A to P) | 23 pass |
| `test:sonar-6-5` | 33 pass (2 assertions updated, see section 11) |
| `test:6-4-compat`, `test:registrant-map`, `test:revenue-growth`, `test:debt-equity`, `test:price-contract`, `test:provider-isolation`, `test:market-sample`, `test:sonar-model-routing` | pass |
| All `test:sonar*`, `test:org*` and `test:research*` | pass, except the failures below |

**Failures, none caused by this work:**
- `test:research-company` (test 10): failing before this work.
- `test:org-sonar` (test 19): asserts an `orgDeep` source line that commit `1b08fe3` (another session) changed.
- `test:rls` and `test:middleware`: this environment's Postgres lacks pgvector.

A model-request guard is loaded first in every suite, and no request was attempted.

**Fixture correction.** One frozen ticker, `XNOREV`, was renamed to `XNRV`: six letters is not
a valid ticker, so the seed dropped it. No expected value changed.

## 14. Before and after

| Query | Before | After |
| --- | --- | --- |
| A: rank by obligations / revenue | no plan | plan; 5 ranked, 3 unavailable with reasons (period, missing revenue, zero revenue) |
| A2: defense, exposure vs revenue | ranked by revenue | ranked by the obligations ratio over the defense universe |
| A3: Palantir | no plan | PLTR, obligations ratio |
| A4: LMT, RTX, NOC | no plan | the three named companies |
| B: new DoD awards, 12 months | agency unsupported | DoD (awarding) applied to the seed; Energy- and Homeland-awarded companies excluded |
| B2: most obligations from Energy | energy sector | DOE agency, ranked by FY obligations |
| C: Congress + DoD + 13F | DoD unsupported, ranked by level | all three conditions plus DoD executed: pass XLMT, fail XNOC and XRTX, unknown XPLTR |
| D: increasing obligations | no plan | FY2026 vs FY2025: pass 1, fail 2, unknown 5 |
| E: rising obligations, falling margin | "any award" | intersection: pass XLMT, fail XGRP and XRTX, unknown XNOC |
| PARA trade, March 2025 | counted for today's PARA | Paramount Global, excluded from today's PARA |
| PSKY and SKYD in a sector | listed twice | listed once (SKYD), merge noted |

## 15. Files changed

**New.**
- `src/lib/contractors/agencies.js`
- `src/lib/sonar/execution/contracts.js`
- `src/lib/prices/price-shadow.js`
- `scripts/check-sonar-6-5-1.mjs`
- `scripts/fixtures/sonar-6-5-1-research.mjs`
- `docs/SONAR_6_5_1.md`
- `docs/SONAR_6_5_1_BASELINE.md`
- `docs/sql/sonar-6-5-1/SQL_01` to `SQL_04`

**Extended.**
- `src/lib/sec/security-identity.js` (`tradeSecurity`, `dedupeByEntity`)
- `src/lib/sonar/composer/analytics-server.js`
- `screen.js`
- `intents.js`
- `stages.js`
- `execution/requirements.js`
- `conditions.js` (`has_value`)
- `synthesis.js`
- `src/lib/sonar/canonical-entities.js` (RTX, PLTR)
- `src/app/api/sonar/research/route.js` (failure category)
- `scripts/check-sonar-6-5.mjs` (2 superseded assertions)
- `docs/sql/SONAR_6_5_future_dated_awards.md` (Start Date correction)
- `package.json`

## 16. Remaining unsupported capabilities

- Share of reported revenue from the government (segment notes are not parsed).
- Per-transaction obligation dates: obligations are attributed by award start.
- Group-scope obligations in screens. The pure function exists, but no relationship table is stored.
- More than one agency per screen; funding sub-agencies.
- Trailing-12-month obligations (implemented, not wired).
- Institutional share holdings and ownership percentage.
- Interest-rate sensitivity.
- Reused tickers beyond PARA. Parabolic's listing date is unverified, so its PARA trades stay unresolved.
- Agency codes (SQL 03).

## 17. Production activation requirements

- **Agency filter, contract measures, identity handling:** active on deploy; no flag; no migration. Run SQL 01 queries 1 and 2 first to confirm the agency names match exactly.
- **SQL 02 and SQL 03:** need approval.
- **Price contract:** run the side-by-side plan (section 9), then `SONAR_PRICE_CONTRACT=1` in preview, then production. SQL 09 needs approval together with the writer changes.
- **SEC backfill:** the section 10 procedure, step by step, each with approval.

## 18. Rollback

- **Code:** revert the 6.5.1 commit. All new result fields are additive, so saved reports render on 6.5.
- **Flag:** leave or unset `SONAR_PRICE_CONTRACT`.
- **SQL:** each file carries its own rollback.

## 19. Recommendations for Sonar 6.6

1. **Ingest transaction-level obligations** (USAspending transactions with action dates), so obligations land in the period they were obligated.
2. **Store verified parent and subsidiary relationships** (EX-21 / UEI parent), so group-scope exposure can be screened.
3. **Apply SQL 02 and SQL 03,** and switch sector and agency joins to CIK and codes.
4. **Verify Parabolic's listing date** and add more reused-ticker cases from SEC records.
5. **Share-level 13F accumulation** across comparable filers.
6. **Parse government revenue from segment notes,** so the accounting question gets an answer.
