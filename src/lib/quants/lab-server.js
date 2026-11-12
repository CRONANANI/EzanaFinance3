// src/lib/quants/lab-server.js
// SERVER ONLY. Shared plumbing for the Quant Lab API routes: spec hashing,
// loading the bars a run needs, and the limits a single run must stay inside.
import { createHash } from 'node:crypto';
import { getDailyOhlcv } from '@/lib/prices/daily-bars';
import { canonicalJson, specLookback } from '@/lib/quants/strategy-spec';

export const NO_STORE = { headers: { 'Cache-Control': 'private, no-store' } };
export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Saved strategies per user, and backtests per user per day. */
export const MAX_STRATEGIES = 100;
export const MAX_RUNS_PER_DAY = 200;
/** A run left 'running' longer than this died with its request; it no longer blocks a new one. */
export const STALE_RUN_MS = 3 * 60 * 1000;

export const specHash = (spec) => createHash('sha256').update(canonicalJson(spec)).digest('hex');

/** Calendar date `days` before an ISO date. */
const daysBefore = (iso, days) =>
  new Date(Date.parse(iso) - days * 86400000).toISOString().slice(0, 10);

/**
 * Bars for every ticker in the spec plus the benchmark, with enough history
 * before the start date for the slowest indicator to be ready on day one
 * (trading days to calendar days at 7/5, plus a holiday margin).
 */
export async function loadRunBars(spec, config) {
  const warmupDays = Math.ceil(specLookback(spec) * 1.6) + 20;
  const from = daysBefore(config.startDate, warmupDays);
  const tickers = [...new Set([...spec.universe, spec.benchmark])];
  const loaded = await Promise.all(
    tickers.map(async (t) => [t, await getDailyOhlcv(t, from, config.endDate)]),
  );
  const bars = {};
  const sources = {};
  const adjustments = {};
  let benchmarkBars = [];
  for (const [t, res] of loaded) {
    if (t === spec.benchmark) benchmarkBars = res.bars;
    if (spec.universe.includes(t)) {
      bars[t] = res.bars;
      sources[t] = res.source;
      adjustments[t] = res.adjustment;
    }
  }
  return { bars, benchmarkBars, sources, adjustments, loadedFrom: from };
}

/** The columns a list view needs; never the full results payload. */
export const RUN_SUMMARY_COLUMNS =
  'id, strategy_id, version_id, status, config, engine_version, metrics, error, created_at, completed_at';
