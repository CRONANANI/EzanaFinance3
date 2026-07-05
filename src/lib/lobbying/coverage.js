/**
 * Lobbying ingest coverage — SERVER ONLY. Reads the resumable cursor
 * (lobbying_ingest_state) + actual per-quarter row counts (lobbying_filings) so
 * routes can tell the truth about how completely a period is loaded ("Q1 2026 ·
 * 40% ingested"). Used by /api/lobbying/ingest-status and top-spenders.
 */
import { QUARTERS } from './period';

/** Actual cached row count for one (year, quarter). */
async function quarterRowCount(admin, year, quarter) {
  const { count } = await admin
    .from('lobbying_filings')
    .select('uuid', { count: 'exact', head: true })
    .eq('filing_year', year)
    .eq('quarter', quarter);
  return count || 0;
}

/**
 * Per-quarter coverage for the given years (drives the data-health readout).
 * @returns {Promise<{quarters:Array, updatedAt:string|null}>}
 */
export async function getQuarterCoverage(admin, years) {
  const { data: states } = await admin.from('lobbying_ingest_state').select('*').in('year', years);
  const stateBy = new Map((states || []).map((s) => [`${s.year}-${s.quarter}`, s]));

  const quarters = [];
  let updatedAt = null;
  for (const year of years) {
    for (const quarter of QUARTERS) {
      const s = stateBy.get(`${year}-${quarter}`) || null;
      const rowsLoaded = await quarterRowCount(admin, year, quarter);
      const totalCount = s?.total_count ?? null;
      const coveragePct =
        totalCount && totalCount > 0
          ? Math.min(100, Math.round((rowsLoaded / totalCount) * 100))
          : s?.complete
            ? 100
            : rowsLoaded > 0
              ? null
              : 0;
      if (s?.last_run_at && (!updatedAt || s.last_run_at > updatedAt)) updatedAt = s.last_run_at;
      quarters.push({
        year,
        quarter,
        rowsLoaded,
        totalCount,
        coveragePct,
        complete: !!s?.complete,
        phase: s?.phase || 'pending',
        lastRunAt: s?.last_run_at || null,
        lastStatus: s?.last_status || 'idle',
        lastReason: s?.last_reason || null,
        lastDelta: s?.last_delta || 0,
      });
    }
  }
  return { quarters, updatedAt };
}

/**
 * Coverage for a single period (as used by top-spenders): one quarter, or the
 * whole year (year/ytd/range → aggregate across quarters).
 * @returns {Promise<{rowsLoaded:number,totalCount:number|null,pct:number|null,complete:boolean}>}
 */
export async function getPeriodCoverage(admin, year, period) {
  const include = QUARTERS.includes(period) ? [period] : QUARTERS;
  const { data: states } = await admin
    .from('lobbying_ingest_state')
    .select('*')
    .eq('year', year)
    .in('quarter', include);
  const stateBy = new Map((states || []).map((s) => [s.quarter, s]));

  let rowsLoaded = 0;
  let totalCount = 0;
  let totalKnown = true;
  let complete = include.length > 0;
  for (const quarter of include) {
    rowsLoaded += await quarterRowCount(admin, year, quarter);
    const s = stateBy.get(quarter);
    if (s?.total_count != null) totalCount += s.total_count;
    else totalKnown = false;
    if (!s?.complete) complete = false;
  }
  const pct = complete
    ? 100
    : totalKnown && totalCount > 0
      ? Math.min(100, Math.round((rowsLoaded / totalCount) * 100))
      : null;
  return { rowsLoaded, totalCount: totalKnown ? totalCount : null, pct, complete };
}
