/**
 * Ten years of federal contracts per listed company, read once a week from
 * the warehouse (`ezana-data.usaspending.contract_awards`) for the Capitol
 * Watch company card. SERVER ONLY.
 *
 * Recipients match companies on the same name key as contractor_name_key()
 * and src/lib/contractors/name-key.js: upper case, & as AND, punctuation to
 * spaces, the shared stop words (INC, CORP, LLC, ...) and bare numbers
 * removed, spaces collapsed. The key list (contractor_tickers.name_key ->
 * ticker) is passed in as two parallel arrays, so one query covers every
 * ticker. Both queries filter on fiscal_year, the partition column, and run
 * under a byte ceiling (BQ_COMPANY_HISTORY_MAX_BYTES, default 30 GB): the job
 * fails rather than overspends. `dryRun` reports the bytes without billing.
 */
import { getBigQuery } from './bigquery-client';
import { SQL_STOP_WORDS } from './contractors/name-key';
import { currentFiscalYear, HISTORY_YEARS } from './contracts/fiscal-year';

export { currentFiscalYear, HISTORY_YEARS };

const TABLE = process.env.BQ_CONTRACTS_TABLE || '`ezana-data.usaspending.contract_awards`';
const MAX_BYTES = process.env.BQ_COMPANY_HISTORY_MAX_BYTES || String(30 * 1024 ** 3);
export const TOP_AWARDS = 15;

/** The BigQuery SQL for the name key of `col` (mirrors nameKey()). */
export function nameKeySql(col) {
  const stop = SQL_STOP_WORDS.join('|');
  return `TRIM(REGEXP_REPLACE(REGEXP_REPLACE(REGEXP_REPLACE(REGEXP_REPLACE(
    REPLACE(UPPER(IFNULL(${col}, '')), '&', ' AND '),
    r'[^A-Z0-9 ]', ' '), r'\\b(${stop})\\b', ' '), r'\\b\\d+\\b', ' '), r'\\s+', ' '))`;
}

const KEYS_CTE = `keys AS (
    SELECT k, t
    FROM UNNEST(@keys) AS k WITH OFFSET i
    JOIN UNNEST(@tickers) AS t WITH OFFSET j ON i = j
  ),
  matched AS (
    SELECT keys.t AS ticker, a.*
    FROM ${TABLE} a
    JOIN keys ON ${nameKeySql('a.recipient_name')} = keys.k
    WHERE a.fiscal_year >= @fy0
  )`;

export const HISTORY_SQL = `WITH ${KEYS_CTE}
  SELECT ticker, fiscal_year, IFNULL(awarding_agency, 'Unknown agency') AS awarding_agency,
         COUNT(*) AS award_count, SUM(award_amount) AS total_amount
  FROM matched
  GROUP BY ticker, fiscal_year, awarding_agency`;

export const TOP_AWARDS_SQL = `WITH ${KEYS_CTE}
  SELECT ticker, generated_award_id, ANY_VALUE(recipient_name) AS recipient_name,
         ANY_VALUE(awarding_agency) AS awarding_agency, SUM(award_amount) AS award_amount,
         MIN(action_date) AS action_date, MIN(fiscal_year) AS fiscal_year
  FROM matched
  WHERE generated_award_id IS NOT NULL
  GROUP BY ticker, generated_award_id
  QUALIFY ROW_NUMBER() OVER (PARTITION BY ticker ORDER BY SUM(award_amount) DESC) <= ${TOP_AWARDS}`;

async function run(query, params, { dryRun }) {
  const bq = getBigQuery();
  if (!bq) return { rows: [], bytes: null, error: 'data source not configured' };
  try {
    const [job] = await bq.createQueryJob({
      query,
      params,
      types: { keys: ['STRING'], tickers: ['STRING'], fy0: 'INT64' },
      useLegacySql: false,
      dryRun,
      maximumBytesBilled: MAX_BYTES,
    });
    const stats = job.metadata?.statistics;
    if (dryRun) {
      return { rows: [], bytes: Number(stats?.totalBytesProcessed ?? 0), error: null };
    }
    const [rows] = await job.getQueryResults();
    return {
      rows: Array.isArray(rows) ? rows : [],
      bytes: Number(stats?.query?.totalBytesBilled ?? stats?.totalBytesProcessed ?? 0),
      error: null,
    };
  } catch (e) {
    return { rows: [], bytes: null, error: String(e?.message || e) };
  }
}

/**
 * Both reads for [{ key, ticker }]. { history, top, bytes: { history, top },
 * error }. With dryRun, rows are empty and bytes are what a real run scans.
 */
export async function readCompanyContracts(pairs, { dryRun = false, years = HISTORY_YEARS } = {}) {
  const params = {
    keys: pairs.map((p) => p.key),
    tickers: pairs.map((p) => p.ticker),
    fy0: currentFiscalYear() - years + 1,
  };
  const [history, top] = await Promise.all([
    run(HISTORY_SQL, params, { dryRun }),
    run(TOP_AWARDS_SQL, params, { dryRun }),
  ]);
  return {
    history: history.rows,
    top: top.rows,
    bytes: { history: history.bytes, top: top.bytes },
    error: history.error || top.error || null,
    fy0: params.fy0,
  };
}
