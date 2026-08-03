/**
 * Benchmark returns for org funds. The benchmark is whatever the org
 * configured (org_fund_config.benchmark_symbol, default SPY) — a Canadian
 * SMIF benchmarked to the S&P/TSX must not be measured against, or labelled
 * as, the S&P 500.
 *
 * HONEST CONTRACT: returns { pct: null, source: null } when the index price
 * history is unavailable. Callers fall back to the legacy pitch-hindsight
 * proxy and MUST carry the returned `source` so the UI can label it.
 */
import { fetchBatchedHistoricalPrices } from '@/lib/fmp-historical-batched';

const finite = (v) => (Number.isFinite(Number(v)) ? Number(v) : null);

/** Org's configured benchmark symbol (default SPY). */
export async function getBenchmarkSymbol(supabase, orgId) {
  const { data } = await supabase
    .from('org_fund_config')
    .select('benchmark_symbol')
    .eq('org_id', orgId)
    .maybeSingle();
  return (data?.benchmark_symbol || 'SPY').toUpperCase();
}

/**
 * Price return of `symbol` from `fromDate` to `toDate` (YYYY-MM-DD), in %.
 * Uses the first and last available closes inside the window.
 * @returns {Promise<{pct: number|null, source: 'index'|null}>}
 */
export async function benchmarkReturnPct(symbol, fromDate, toDate) {
  if (!symbol || !fromDate || !toDate) return { pct: null, source: null };
  try {
    const hist = await fetchBatchedHistoricalPrices([symbol], fromDate, toDate);
    const series = hist?.[symbol.toUpperCase()];
    if (!series) return { pct: null, source: null };
    const dates = Object.keys(series).sort();
    if (dates.length < 2) return { pct: null, source: null };
    const first = finite(series[dates[0]]);
    const last = finite(series[dates[dates.length - 1]]);
    if (first == null || last == null || first <= 0) return { pct: null, source: null };
    return { pct: ((last - first) / first) * 100, source: 'index' };
  } catch {
    return { pct: null, source: null };
  }
}
