/**
 * Cost-safe BigQuery rollup queries over the USAspending contract corpus
 * (`ezana-data.usaspending.contract_awards`, partitioned by fiscal_year,
 * clustered by awarding_agency, recipient_name, action_date).
 *
 * Cost discipline on EVERY query:
 *  - named columns only (never SELECT *),
 *  - filter on the partition column (fiscal_year) wherever possible,
 *  - maximumBytesBilled set on the job (hard ceiling; the job fails rather than
 *    over-scanning),
 *  - parameterized (no string interpolation of user values).
 *
 * These feed the Supabase rollup sync (/api/cron/sync-bq-rollups); the page
 * never queries BigQuery directly. Year-agnostic — any loaded fiscal year works.
 */
import { getBigQuery } from './bigquery-client';

const TABLE = process.env.BQ_CONTRACTS_TABLE || '`ezana-data.usaspending.contract_awards`';
// Hard per-query ceiling (bytes). Default 5 GB; override via env for a full sync.
const MAX_BYTES_BILLED = process.env.BQ_MAX_BYTES_BILLED || String(5 * 1024 * 1024 * 1024);

async function runQuery(query, params = {}) {
  const bq = getBigQuery();
  if (!bq) return { rows: [], bytesBilled: null, error: 'BigQuery not configured' };
  try {
    const [job] = await bq.createQueryJob({
      query,
      params,
      useLegacySql: false,
      maximumBytesBilled: MAX_BYTES_BILLED,
    });
    const [rows] = await job.getQueryResults();
    const billed = job.metadata?.statistics?.query?.totalBytesBilled;
    return { rows: Array.isArray(rows) ? rows : [], bytesBilled: billed != null ? Number(billed) : null, error: null };
  } catch (err) {
    return { rows: [], bytesBilled: null, error: err?.message || 'bigquery error' };
  }
}

/** Per-fiscal-year award count + total obligated. Drives gov_contract_coverage. */
export async function getFiscalYearCoverage() {
  const query = `
    SELECT fiscal_year,
           COUNT(*)          AS awards,
           SUM(award_amount) AS total
    FROM ${TABLE}
    GROUP BY fiscal_year
    ORDER BY fiscal_year`;
  return runQuery(query);
}

/** Awarding-agency totals + counts for one fiscal year. Drives the legend. */
export async function getAgencyTotals({ fiscalYear }) {
  const query = `
    SELECT awarding_agency,
           COUNT(*)          AS awards,
           SUM(award_amount) AS total
    FROM ${TABLE}
    WHERE fiscal_year = @fy
    GROUP BY awarding_agency
    ORDER BY total DESC`;
  return runQuery(query, { fy: Number(fiscalYear) });
}

/** Top recipients (× agency) by total obligated for one fiscal year. */
export async function getTopRecipients({ fiscalYear, agency = null, limit = 1000 }) {
  const params = { fy: Number(fiscalYear), lim: Number(limit) || 1000 };
  let filter = 'WHERE fiscal_year = @fy';
  if (agency) {
    filter += ' AND awarding_agency = @agency';
    params.agency = String(agency);
  }
  const query = `
    SELECT recipient_name,
           awarding_agency,
           COUNT(*)          AS awards,
           SUM(award_amount) AS total
    FROM ${TABLE}
    ${filter}
    GROUP BY recipient_name, awarding_agency
    ORDER BY total DESC
    LIMIT @lim`;
  return runQuery(query, params);
}

/**
 * Most recent awards across the corpus, for the page ticker.
 *
 * Filters on fiscal_year (the partition column) before ordering by action_date,
 * so this scans one or two partitions rather than all 19. Without the partition
 * predicate, ORDER BY action_date would scan the entire table.
 */
export async function getRecentAwards({ limit = 200, fiscalYears = [] } = {}) {
  const fys = (fiscalYears || []).map(Number).filter(Boolean);
  if (!fys.length) return { rows: [], bytesBilled: null, error: 'no fiscal years supplied' };

  const query = `
    SELECT generated_award_id, award_id_piid, recipient_name, recipient_parent_name,
           awarding_agency, awarding_sub_agency, funding_agency,
           award_amount, action_date, fiscal_year,
           naics_code, naics_description, psc_code, psc_description,
           pop_state, pop_city, description
    FROM ${TABLE}
    WHERE fiscal_year IN UNNEST(@fys)
      AND award_amount > 0
      AND recipient_name IS NOT NULL
    ORDER BY action_date DESC, award_amount DESC
    LIMIT @lim`;
  return runQuery(query, { fys, lim: Number(limit) || 200 });
}
