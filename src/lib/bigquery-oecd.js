/**
 * Cost-safe BigQuery reads over the OECD Economic Outlook corpus
 * (`ezana-data.oecd.observations`, clustered by measure_code, ref_area).
 * Mirrors bigquery-contracts.js: named columns only, parameterized queries, and
 * a hard maximumBytesBilled ceiling per job (the job fails rather than
 * over-scanning). The page never queries BigQuery — these feed the Supabase
 * rollup sync (/api/cron/sync-oecd-rollups).
 */
import { getBigQuery } from './bigquery-client';

const TABLE = process.env.BQ_OECD_TABLE || '`ezana-data.oecd.observations`';
// 1 GB hard ceiling — the whole EO table is ~408K rows, comfortably inside this.
const MAX_BYTES_BILLED = process.env.BQ_OECD_MAX_BYTES_BILLED || String(1 * 1024 * 1024 * 1024);

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
    return {
      rows: Array.isArray(rows) ? rows : [],
      bytesBilled: billed != null ? Number(billed) : null,
      error: null,
    };
  } catch (err) {
    return { rows: [], bytesBilled: null, error: err?.message || 'bigquery error' };
  }
}

/** Coverage catalog: one row per ezana_slug across ALL 282 EO measures. */
export async function getOecdSeriesCoverage() {
  const query = `
    SELECT ezana_slug,
           ANY_VALUE(measure_name)  AS measure_name,
           ANY_VALUE(unit_name)     AS unit_name,
           COUNT(DISTINCT ref_area) AS country_count,
           MIN(year) AS year_min,
           MAX(year) AS year_max,
           COUNT(*)  AS obs_count
    FROM ${TABLE}
    GROUP BY ezana_slug
    ORDER BY ezana_slug`;
  return runQuery(query);
}

/**
 * Observations for the given curated slugs (parameterized). Accepts a single
 * slug or an array; only the curated whitelist is ever passed by the sync.
 */
export async function getOecdSeriesObservations({ slugs }) {
  const list = (Array.isArray(slugs) ? slugs : [slugs]).map(String).filter(Boolean);
  if (!list.length) return { rows: [], bytesBilled: null, error: 'no slugs supplied' };
  const query = `
    SELECT ezana_slug, ref_area, ref_area_name, year,
           obs_value, obs_status, unit_name
    FROM ${TABLE}
    WHERE ezana_slug IN UNNEST(@slugs)
      AND year IS NOT NULL
    ORDER BY ezana_slug, ref_area, year`;
  return runQuery(query, { slugs: list });
}
