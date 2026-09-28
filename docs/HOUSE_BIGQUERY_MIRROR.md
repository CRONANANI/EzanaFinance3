# House disclosures → BigQuery mirror

`/api/cron/sync-house-bq` copies the House disclosure tables from Supabase into
BigQuery once a day. This is the setup it needs. Nothing here is automated:
the dataset, the tables and the service account are created by hand, once.

## Why a mirror rather than a second write path

Supabase is the system of record. The ingest upserts filings on `doc_id` and
the PTR parser flips per-row flags (`trades_parsed`, `needs_ocr`) — row-level
mutation that BigQuery handles poorly. Writing to both stores from the ingest
would let them drift with no way to tell which one was right.

So the sync replaces the BigQuery side wholesale: every row is paged out to
newline-delimited JSON in GCS, then one `WRITE_TRUNCATE` load job per table
swaps the contents atomically. BigQuery is therefore exactly Supabase as of the
last successful sync, or exactly the sync before it. It is never a half-applied
mixture, and it is never ahead of Supabase.

This mirrors how Government Contracts already works: BigQuery as the warehouse,
Supabase as the serving layer.

## One-time setup

### 1. Create the dataset and tables

```bash
bq query --use_legacy_sql=false --project_id=ezana-data < scripts/bq/house_disclosures.sql
```

Creates `ezana-data.house_disclosures` with `filings` (partitioned by
`filing_year`, clustered by `last_name`) and `trades` (partitioned monthly by
`tx_date`, clustered by `ticker`).

### 2. Create a separate loader service account

**Do not widen `ezana-bigquery-reader@ezana-data.iam.gserviceaccount.com`.**
That account is used by every read path in the app — the contracts pages, the
OECD rollups, the House index download — and it holds Storage Object Viewer and
nothing else. It should stay that way. The sync is the only job in the app that
needs to create objects and run load jobs, so it gets its own credential.

Create `ezana-bigquery-loader@ezana-data.iam.gserviceaccount.com` with exactly:

| Role                 | Scope                                                    |
| -------------------- | -------------------------------------------------------- |
| BigQuery Data Editor | the `house_disclosures` dataset only, not the project    |
| BigQuery Job User    | the `ezana-data` project                                 |
| Storage Object Admin | `gs://ezana-house-disclosures/bq-export/`, or the bucket |

Put its key JSON in Vercel as `GCP_LOADER_SERVICE_ACCOUNT_JSON` (or base64 in
`GCP_LOADER_SERVICE_ACCOUNT_B64`). `GCP_PROJECT_ID` is shared with the readers.

If the loader key is absent the route returns 500 and does nothing. It never
falls back to the reader account — that would fail partway through with a
permission error after having already written part of an export.

### 3. Apply the log-table migration

`supabase/migrations/20260928160000_house_bq_sync_log.sql` creates
`house_bq_sync_log`: one row per table per run, with the BigQuery job id so a
bad run can be opened in the console.

## Running it

Scheduled daily at 07:30 UTC, after the 06:00 index ingest and an hour of PTR
parsing. Manually:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://<host>/api/cron/sync-house-bq
curl -H "Authorization: Bearer $CRON_SECRET" https://<host>/api/cron/sync-house-bq?tables=trades
```

## How to tell whether to trust it

After each load the route runs `SELECT COUNT(*)` against the mirror **and**
against Supabase, and compares those two. This comparison — not the load job's
status — is what decides `ok`.

Both halves matter. A load job can report success having dropped rows. And an
export that pages through a table with offset ranges while the ingest or the
parser is writing to it can skip or repeat rows, so checking BigQuery against
the export's own tally would just agree with itself and call a skewed mirror
correct. Counting the source again, after the load, is the only comparison
that means "the mirror equals the source".

A small difference usually means something wrote during the export; the next
day's run settles it. It is still reported rather than tolerated — the
alternative is a mirror that is quietly a few rows wrong for a day with
nothing saying so.

`ok: false` means the mirror is stale or partial. The BigQuery side is still
whatever the previous successful run left there, which is a consistent older
snapshot rather than a corrupted one.
