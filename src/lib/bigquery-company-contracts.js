/**
 * Ten fiscal years of federal contracts for every listed company we can name,
 * read once from the USAspending corpus in BigQuery
 * (`ezana-data.usaspending.contract_awards`, partitioned by fiscal_year,
 * clustered by awarding_agency, recipient_name, action_date). SERVER ONLY,
 * cron only: the page never queries BigQuery.
 *
 * Recipients are matched to tickers on the same name key Postgres builds with
 * contractor_name_key() and src/lib/contractors/name-key.js builds in JS:
 * upper case, "&" to AND, punctuation to spaces, corporate suffixes and
 * share-class words dropped, bare numbers dropped, whitespace collapsed. The
 * stop words come from that module (SQL_STOP_WORDS), so the BigQuery
 * expression is built from the same list and cannot drift from it.
 *
 * Cost discipline (as bigquery-contracts.js): named columns only, partition
 * filter on fiscal_year, parameterized, and a hard maximumBytesBilled. Two
 * queries per run (yearly totals; largest awards). Each scans ten partitions
 * of a few narrow columns; run with ?dry=1 first to see the bytes.
 */
import { getBigQuery } from './bigquery-client';
import { SQL_STOP_WORDS } from './contractors/name-key';

const TABLE = process.env.BQ_CONTRACTS_TABLE || '`ezana-data.usaspending.contract_awards`';
const MAX_BYTES = process.env.BQ_COMPANY_HISTORY_MAX_BYTES || String(30 * 1024 * 1024 * 1024); // 30 GB ceiling

/** The BigQuery (RE2) expression for contractor_name_key(recipient_name). */
export function bqNameKeyExpr(col = 'recipient_name') {
  const stop = SQL_STOP_WORDS.join('|');
  return `TRIM(REGEXP_REPLACE(REGEXP_REPLACE(REGEXP_REPLACE(REGEXP_REPLACE(
      UPPER(REPLACE(IFNULL(${col}, ''), '&', ' AND ')),
      r'[^A-Z0-9 ]', ' '),
      r'\\b(${stop})\\b', ' '),
      r'\\b[0-9]+\\b', ' '),
      r'\\s+', ' '))`;
}

async function run(query, params, { dryRun = false } = {}) {
  const bq = getBigQuery();
  if (!bq) return { rows: [], bytes: null, error: 'data source not configured' };
  try {
    const [job] = await bq.createQueryJob({
      query,
      params,
      useLegacySql: false,
      dryRun,
      maximumBytesBilled: MAX_BYTES,
    });
    const stats = job.metadata?.statistics;
    if (dryRun) {
      return { rows: [], bytes: Number(stats?.totalBytesProcessed || 0), error: null };
    }
    const [rows] = await job.getQueryResults();
    return {
      rows: Array.isArray(rows) ? rows : [],
      bytes: Number(
        stats?.query?.totalBytesBilled || job.metadata?.statistics?.totalBytesProcessed || 0,
      ),
      error: null,
    };
  } catch (err) {
    return { rows: [], bytes: null, error: err?.message || 'query failed' };
  }
}

/**
 * Yearly totals per name key and agency, FY range inclusive.
 * @returns rows { name_key, fiscal_year, awarding_agency, awards, total }
 */
export function companyYearTotals({ keys, fyFrom, fyTo, dryRun = false }) {
  const query = `
    WITH k AS (
      SELECT ${bqNameKeyExpr()} AS name_key, fiscal_year, awarding_agency, award_amount
      FROM ${TABLE}
      WHERE fiscal_year BETWEEN @fyFrom AND @fyTo
        AND award_amount IS NOT NULL
    )
    SELECT name_key, fiscal_year, IFNULL(awarding_agency, 'Other') AS awarding_agency,
           COUNT(*) AS awards, SUM(CAST(award_amount AS FLOAT64)) AS total
    FROM k
    WHERE name_key IN UNNEST(@keys)
    GROUP BY name_key, fiscal_year, awarding_agency`;
  return run(query, { keys, fyFrom: Number(fyFrom), fyTo: Number(fyTo) }, { dryRun });
}

/**
 * The largest awards per name key in the FY range.
 * @returns rows { name_key, generated_award_id, recipient_name, awarding_agency,
 *   award_amount, action_date, fiscal_year }
 */
export function companyTopAwards({ keys, fyFrom, fyTo, perKey = 15, dryRun = false }) {
  const query = `
    WITH k AS (
      SELECT ${bqNameKeyExpr()} AS name_key, generated_award_id, recipient_name,
             awarding_agency, award_amount, action_date, fiscal_year
      FROM ${TABLE}
      WHERE fiscal_year BETWEEN @fyFrom AND @fyTo
        AND award_amount > 0
    )
    SELECT name_key, generated_award_id, recipient_name, awarding_agency,
           CAST(award_amount AS FLOAT64) AS award_amount, action_date, fiscal_year
    FROM k
    WHERE name_key IN UNNEST(@keys)
    QUALIFY ROW_NUMBER() OVER (PARTITION BY name_key ORDER BY award_amount DESC) <= @perKey`;
  return run(
    query,
    { keys, fyFrom: Number(fyFrom), fyTo: Number(fyTo), perKey: Number(perKey) },
    { dryRun },
  );
}
