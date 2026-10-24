# Industry data ingest: plan and Step 0 findings

Builds on the industry registry (`supabase/migrations/20261024120000_industry_registry.sql`).

## Step 0: what exists

| Question                      | Finding                                                                                                                                                                                                                                                                                                                                             |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Registry tables               | Created in `20261024120000_industry_registry.sql` (this session): `industries`, `industry_stages`, `industry_stage_links`, `industry_companies`, `industry_facilities`, `industry_metrics`, `industry_risks`. Facilities, metrics and risks already carry `review_status` (default `pending`) and public read is `review_status = 'approved'` only. |
| Cron pattern                  | Vercel cron in `vercel.json`, routes under `src/app/api/cron/*` guarded by `CRON_SECRET` (Bearer or `?key=`). Other ingests log progress in `ingest_progress` (cursor rows); this work adds `ingest_runs` (one row per run).                                                                                                                        |
| Admin check                   | `isAdminUser()` (`ADMIN_EMAILS`, `src/lib/admin-helpers.js`) or `app_metadata.role = 'admin'`; client pages gate with `useIsAdmin()`; the API routes are the real gate. No SQL admin function existed, so the migration adds `public.is_industry_admin()` (JWT `app_metadata.role`, never `user_metadata`). Layout copied from `/admin/waitlist`.   |
| Gov-contracts ingest          | `src/app/api/cron/ingest-usaspending` pulls CONTRACTS (award types A-D) from `spending_by_award` with paging and a polite delay. The CHIPS importer reuses its request shape and paging contract but needs assistance award types (02-05, 07-08) and `program_numbers`, so it has its own client (`src/lib/ingest/chips/usaspending.js`).           |
| How Sonar reads industry data | `getIndustryRegistryCached(id)` (`src/lib/sonar/industries.js`) through `unstable_cache`, tagged `industry:<id>`. The importers and admin approvals call `revalidateTag('industry:<id>')`.                                                                                                                                                          |

## Language

The spec names `.ts` files; this repo is plain JavaScript (no TypeScript toolchain), so the same modules are `.js`. zod is not a dependency; validation is a small hand-written module (`src/lib/industry-admin/validate.js`) with the same rules (required source fields, plain text only).

## Files

- Migration: `supabase/migrations/20261024140000_industry_data_ingest.sql` (Noah applies it by hand, after the registry migration).
- `src/lib/ingest/chips/normalize.js`: name normalisation, amount parsing, final/proposed, split detection, conflict check.
- `src/lib/ingest/chips/usaspending.js`: client (11.037, award-type groups, paging, 300 ms delay, 429/5xx backoff max 5, declared User-Agent) and row mapper.
- `src/lib/ingest/chips/nist.js`: robots.txt check, 2 s between pages, max 15 pages, parser, loud failure when a non-empty page parses to zero entries.
- `src/lib/ingest/chips/persist.js`: upsert, alias matching (UEI then alias), facility link or pending facility + queue, amount and status conflicts, run log, cache bust.
- Routes: `/api/cron/chips-usaspending` (Mondays 07:17 UTC), `/api/cron/chips-nist` (3rd of the month 07:23 UTC).
- Admin: `/admin/industries` (Review queue, Metrics, Facilities, Awards, Risks, Runs) over `/api/admin/industries`.
- Tests: `scripts/check-chips-ingest.mjs` (`npm run test:chips-ingest`), fixtures in `tests/fixtures/nist/`.

## USAspending request (to verify live)

- Endpoint: `POST https://api.usaspending.gov/api/v2/search/spending_by_award/`
- Filters: `program_numbers: ["11.037"]`, `award_type_codes` `["02","03","04","05"]` (grants and cooperative agreements) then `["07","08"]` (direct and guaranteed loans), `time_period` 2022-08-09 to today.
- Fields: Award ID, Recipient Name, Recipient UEI, recipient_id, Award Amount, Total Outlays, Description, Start Date, End Date, Award Type, Awarding Agency, Place of Performance City Code / State Code / Country Code, CFDA Number, generated_internal_id.
- Paging: `page` / `limit` 100 until `page_metadata.hasNext` is false.

### Probe output

Not captured: this sandbox's egress proxy refuses `api.usaspending.gov` and `www.nist.gov`. Run `node scripts/probe-usaspending.mjs` from a machine with access and paste the output here. It prints any requested field the API did not return; adjust `FIELDS` in `usaspending.js` if it lists one.

## NIST robots.txt

Not checked from here (same egress block). The importer checks it on every run and logs `status='failed', error='robots'` if `/chips/` is disallowed.

## Matching rules

1. Normalise the recipient name (upper case, punctuation stripped, trailing INC / CORP / LLC / LTD / CO / CORPORATION / AMERICA / OF dropped).
2. `recipient_aliases` by UEI, then by alias. No match: queue `unmatched_recipient` with trigram suggestions from `industry_companies`. A company is never auto-created.
3. Matched: facility by (company, state, city). Not found: create it `pending`, `status='announced'`, queue `unmatched_facility`.
4. Obligated vs announced more than 5% apart: queue `amount_conflict`; both values kept and shown.
5. A NIST award whose status or amount changed: previous values go to `raw.history`, queue `status_conflict`.

## What Noah enters by hand first

1. Confirm aliases for the top unmatched recipients after the first runs (Review queue).
2. Facility status, activity and project group for the largest projects, from 10-K / 8-K filings.
3. Headline metrics from the SIA factbook / State of the Industry report (figures only, with page citation).
4. GAO / CRS amendments to award amounts, as notes on conflicts.
