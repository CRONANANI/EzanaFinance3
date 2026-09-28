-- BigQuery DDL for the House disclosures mirror: ezana-data.house_disclosures
--
-- Run once, by hand, with the LOADER service account (see the PR notes):
--   bq query --use_legacy_sql=false --project_id=ezana-data < scripts/bq/house_disclosures.sql
--
-- Why a mirror and not a second write path. Supabase stays the system of
-- record: the ingest upserts on doc_id and the PTR parser flips per-row flags
-- (trades_parsed, needs_ocr), both of which need row-level mutation that
-- BigQuery is poor at. Dual-writing the two stores would let them drift with
-- no way to tell which was right. Instead /api/cron/sync-house-bq replaces
-- these tables wholesale from Supabase with a WRITE_TRUNCATE load, so
-- BigQuery is exactly Supabase as of the last sync, or it is the previous
-- sync — never a half-applied mixture.
--
-- Types mirror the Postgres columns. The numeric amount columns become INT64
-- rather than NUMERIC: they hold House disclosure BRACKET bounds ($1,001,
-- $15,000, ...), which are whole dollars by construction, and the midpoint is
-- the only one that can carry a .5, so it is FLOAT64.

CREATE SCHEMA IF NOT EXISTS `ezana-data.house_disclosures`
  OPTIONS (location = 'US', description = 'Mirror of the Supabase House disclosure tables. Replaced wholesale by /api/cron/sync-house-bq; do not write by hand.');

-- ── filings ───────────────────────────────────────────────────────────────
-- Partitioned by filing_year as an integer range rather than by a date: the
-- year is never null (the index file always carries it) while filing_date is
-- legitimately null on withdrawals, and a null partition key would put those
-- rows in the __NULL__ partition where a year predicate misses them.
CREATE TABLE IF NOT EXISTS `ezana-data.house_disclosures.filings`
(
  doc_id            STRING  NOT NULL,
  prefix            STRING,
  last_name         STRING  NOT NULL,
  first_name        STRING  NOT NULL,
  suffix            STRING,
  filing_type       STRING  NOT NULL,
  filing_type_label STRING,
  state_dst         STRING,
  state             STRING,
  district          STRING,
  filing_year       INT64   NOT NULL,
  filing_date       DATE,
  pdf_url           STRING,
  is_ptr            BOOL    NOT NULL,
  is_electronic     BOOL,
  trades_parsed     BOOL    NOT NULL,
  needs_ocr         BOOL    NOT NULL,
  synced_at         TIMESTAMP NOT NULL,
  covered_year      INT64,
  disclosure_type   STRING,
  filing_date_raw   STRING
)
PARTITION BY RANGE_BUCKET(filing_year, GENERATE_ARRAY(2008, 2030, 1))
CLUSTER BY last_name
OPTIONS (description = 'One row per filing in the Clerk yearly index. Mirror of public.house_disclosure_filings.');

-- ── trades ────────────────────────────────────────────────────────────────
-- tx_date IS nullable (a PTR row can omit it), so its null partition is
-- expected and the sync does not filter those rows out.
CREATE TABLE IF NOT EXISTS `ezana-data.house_disclosures.trades`
(
  id                   INT64  NOT NULL,
  doc_id               STRING NOT NULL,
  last_name            STRING,
  first_name           STRING,
  state_dst            STRING,
  ticker               STRING,
  asset_name           STRING NOT NULL,
  tx_type              STRING,
  tx_date              DATE,
  notification_date    DATE,
  amount_low           INT64,
  amount_high          INT64,
  amount_midpoint      FLOAT64,
  amount_bracket_label STRING,
  raw_row              STRING,
  synced_at            TIMESTAMP NOT NULL
)
PARTITION BY DATE_TRUNC(tx_date, MONTH)
CLUSTER BY ticker
OPTIONS (description = 'One row per parsed PTR transaction. Mirror of public.house_trades.');
