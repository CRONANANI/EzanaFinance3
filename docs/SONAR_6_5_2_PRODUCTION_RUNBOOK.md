# Sonar 6.5.2 production runbook

Nothing in this runbook has been executed. Each step needs explicit approval. Supabase project
`jhdzpadfzrhiekcfgtai`. Every SQL file is referenced by its full repository path, because
several directories reuse the same numbers.

## Prerequisites

Confirm these before any step:
- `main` is deployed with Sonar 6.5.2.
- `SONAR_PRICE_CONTRACT` is unset or `0`.
- `SONAR_PRICE_SYNC` is not enabled.
- `SONAR_CONTRACT_TRANSACTIONS_INGEST` is unset.
- `SEC_PREDECESSOR_MAPPING` is unset.

At any stop condition below, halt and send the query output to review. Do not "fix and
continue".

---

## Track 1: read-only audit (no approval needed beyond running SELECTs)

| # | File | Pass condition | Stop condition |
| --- | --- | --- | --- |
| 1.1 | `docs/sql/sonar-6-5-2/SQL_01_readonly_contract_audit.md` queries 1 and 2 | Every supported agency appears with its exact USAspending toptier name. | A supported agency appears under a variant spelling: record the variant, review it, and add it to `SOURCE_ALIASES` in `src/lib/contractors/agencies.js` in a reviewed change. |
| 1.2 | Same file, query 3 | `equals_obligated` is close to `joined`, and `equals_ceiling` is close to 0. | The stored amount mostly equals the ceiling: the cohort measures' numerator assumption is wrong. Stop using them. |
| 1.3 | Same file, queries 4 to 6 | Outputs recorded for the volume estimate. | None. |
| 1.4 | `docs/sql/sonar-6-5-1/SQL_01_readonly_checks.md` | Same checks as in 6.5.1. | As in 6.5.1. |

---

## Track 2: SEC predecessor backfill (XOM, DMRC, XPRO)

SQL 01 and SQL 02 are reported applied (Nov 28 2026):
- `docs/sql/sonar-6-4-final/SQL_01_sec_registrant_successions_table.md`
- `docs/sql/sonar-6-4-final/SQL_02_sec_registrant_successions_seed.md`

REAX and SKYD stay unverified.

**2.1 Hardening and DMRC date.**
- Run: `docs/sql/sonar-6-4-integration/SQL_03_sec_registrant_successions_hardening.md`.
- Pass: its closing check shows 3 verified rows, DMRC effective 2026-05-15, and `verified_by` set on each.
- Stop: a constraint fails to add (existing data violates it).
- Rollback point: none needed. The file only corrects a date and adds grants and constraints. To undo, drop the four named constraints.

**2.2 Lobbying rule.**
- Run: `docs/sql/sonar-6-4-integration/SQL_08_lobbying_name_identity_successions.md`.
- Pass: `npm run test:6-4-compat` (test 8) still passes against the deployed code.
- Stop: the function fails to compile.
- Rollback: re-apply the previous `lobbying_publish_name_identity` definition from the migration history.

**2.3 Preflight.**
- Run: `docs/sql/sonar-6-4-integration/SQL_04_predecessor_backfill_preflight.md`.
- Pass, all five:
  - (a) 0 rows under CIKs 34088, 1438231 and 1575828;
  - (b) XOM, DMRC and XPRO have quarterly rows only;
  - (c) SUPN is the only ticker with two CIKs;
  - (d) 0 duplicate frames;
  - (e) no CY2025 revenue for the three tickers.
- Stop: any mismatch.

**2.4 Revenue-only backfill.**
- Call: `GET /api/cron/ingest-fundamentals?backfill=1&predecessors=1&metrics=revenue` (CRON_SECRET bearer).
- Expected:
  - `predecessor_mapping.rows` per ticker covers only periods ending before each effective date that the successor did not report.
  - Rows are stored under the predecessor CIK. The upsert key `(cik, concept, frame)` means they cannot overwrite successor rows.
- Rollback point: `docs/sql/sonar-6-4-integration/SQL_07_predecessor_backfill_rollback.md`.

**2.5 Verify.**
- Run: `docs/sql/sonar-6-4-integration/SQL_05_predecessor_backfill_verify.md`.
- Pass: every check returns its expected result.
- Stop: any unexpected count.
- Overlapping frames (check 3) are not an error for Sonar: `filedFiguresPaged` keeps the successor's fact per SEC frame and the filing CIK on each figure.

**2.6 Duplicate review.** Only if check 3 returned rows.
- Run: `docs/sql/sonar-6-5-1/SQL_04_sql06_guarded_cleanup.md`. Do not run the raw `docs/sql/sonar-6-4-integration/SQL_06_predecessor_duplicate_cleanup.md`.
- Procedure: create and fill the backup table, review its rows, then delete only the reviewed keys.
- Stop: any row in the backup has a successor value missing or null.
- Rollback: the insert-from-backup statement in the same file.

**2.7 All-metrics backfill.**
- Repeat 2.4 without `metrics=`, then repeat 2.5 (and 2.6 if check 3 returns rows).

**2.8 Steady state.** Choose one:
- leave the mapping off; or
- set `SEC_PREDECESSOR_MAPPING=1`.

Full rollback at any point: `docs/sql/sonar-6-4-integration/SQL_07_predecessor_backfill_rollback.md`, then unset the flag.

**Schema check done for this runbook.** These match the migrations and the code:
- `sec_fundamentals`: `cik`, `concept`, `frame`, `ticker`, `period_type`, `period_end`, `value`, `unit`, `taxonomy_concept`, `accession_no`; primary key `(cik, concept, frame)` (`supabase/migrations/20261006000600_sec_fundamentals.sql`).
- The loader reads `frame`, `cik` and `accession_no`.
- `sec_registrant_successions` is read through the service-role client only, which is consistent with SQL 03 revoking select from `anon`.

---

## Track 3: transaction-level contract obligations

**3.1 Create the tables.**
- Run: `docs/sql/sonar-6-5-2/SQL_02_contract_transactions.md`.
- Pass: its "before ingestion" checks return 0 rows and RLS on.
- Effect in Sonar: flow measures move from "unavailable" to "unknown, transaction records incomplete". Nothing shows a value yet.

**3.2 Volume check.**
- Use the Track 1 query 6 output to fill the estimate in `docs/SONAR_6_5_2.md` section 16.
- Stop: the lower-bound action count would exceed the storage budget you set.

**3.3 Bounded trial in preview.**
- Set `SONAR_CONTRACT_TRANSACTIONS_INGEST=1` in **preview only**.
- Call `GET /api/cron/ingest-contract-transactions?limit=10` once.
- Then run the "after ingestion" queries in the same file.
- Pass: 0 orphan actions, and per-award `difference` near 0 against `company_contract_award_facts.total_obligation`.
- Stop: a large difference, or any conflict counts.

**3.4 Production.** Only after 3.3 passes and you approve the volume:
- Set the flag in production.
- Run the route manually at `?limit=25` while watching the run log.
- Schedule it in `vercel.json` only with separate approval.
- Rollback:
  - unset the flag (ingestion stops immediately; the measures return to unknown for awards not yet synced);
  - to remove the data, drop both tables (rollback section of SQL 02).

---

## Track 4: agency codes

**4.1 Add codes.**
- Run: `docs/sql/sonar-6-5-2/SQL_03_contract_agency_codes.md`. It supersedes `docs/sql/sonar-6-5-1/SQL_03_contract_agency_codes.md`.
- Pass: its verification shows a code for every supported agency name.
- Stop: `named_without_code` includes a supported agency under a variant spelling (see Track 1.1).

**4.2 Recreate the view.**
- Recreate `contract_awards_resolved` from its live definition, plus the two code columns, as described in that file.
- Pass: `select awarding_toptier_code from contract_awards_resolved limit 1` works.
- Effect: Sonar matches on codes automatically.
- Rollback: the rollback section of SQL 03, and recreate the view without the columns.

---

## Track 5: corporate relationships

**5.1 Create the table.**
- Run: `docs/sql/sonar-6-5-2/SQL_04_corporate_relationships.md`.
- No rows are seeded.
- Effect: none until reviewed rows are inserted and a loader is wired (Sonar 6.6). Group-scope obligations stay unavailable in screens.

---

## Track 6: price contract (stays off)

**6.1 Size the mismatch classes.**
- Run `docs/sql/sonar-6-5-1/SQL_01_readonly_checks.md` query 7.
- Run `comparePriceSelection` (`src/lib/prices/price-shadow.js`) over a week of stored rows in a service-role script.
- Categories: `adjustment_dividend_like`, `adjustment_corporate_action_like`, `quote_row`, `stale`, `future_dated`, `zero_or_missing`.

**6.2 Decide the basis and enable in preview.**
- Decide the per-share basis for valuation when `adjustment_corporate_action_like` appears. It must match the share count's date.
- Only then set `SONAR_PRICE_CONTRACT=1` in preview.

**6.3 Provenance columns.**
- `docs/sql/sonar-6-4-integration/SQL_09_price_data_cache_provenance_columns.md` needs approval together with the writer changes that fill `close_adjustment`.

**Stop:** any `price_differs` verdict not explained by an adjustment flag.
