/**
 * @fileoverview
 * Nightly job that turns per-user daily cumulative returns into a
 * cross-sectional distribution of *window-local* returns, and upserts
 * the p25/p50/p75/mean for every (date, window) into
 * `public.platform_return_aggregates`.
 *
 * Design notes:
 *   - The UI reads only this precomputed table. We never compute percentiles
 *     on the request path.
 *   - We use median (p50) for the "Platform typical" line because retail
 *     distributions are heavy-tailed — a single 10x memecoin run can drag
 *     the arithmetic mean up a lot while leaving the typical experience
 *     unchanged. We keep the mean in the table anyway for dev comparison.
 *   - We cap individual user window returns at ±200% before aggregation so
 *     a single data error (e.g. missed stock split) can't warp percentiles.
 *   - When the source table `portfolio_daily_returns` isn't provisioned
 *     yet, we log and return {upserted: 0} instead of throwing — the chart
 *     handles empty aggregates by showing the "not yet available" note.
 *   - We do NOT exclude the viewing user from aggregates. Self-inclusion
 *     on a 10k+ user platform is fine; doing it per-viewer would require
 *     a separate percentile compute per request, which the precomputation
 *     design explicitly avoids.
 */

import { getServerSupabase } from '@/lib/supabase/server';

/** @typedef {'1W' | '1M' | '3M' | 'YTD'} WindowKey */

const WINDOWS = /** @type {ReadonlyArray<{key: WindowKey, days: number | null}>} */ ([
  { key: '1W', days: 7 },
  { key: '1M', days: 30 },
  { key: '3M', days: 90 },
  { key: 'YTD', days: null },
]);

const OUTLIER_CAP_PCT = 200;

/**
 * Truncate a Date to the start of its UTC day.
 * @param {Date} d
 * @returns {Date}
 */
function startOfUtcDay(d) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/**
 * @param {Date} d
 * @returns {Date}
 */
function startOfUtcYear(d) {
  return new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
}

/**
 * Number of whole UTC days between two dates (b - a).
 * @param {Date} a
 * @param {Date} b
 * @returns {number}
 */
function daysBetween(a, b) {
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

/**
 * @param {Date} d
 * @param {number} n
 * @returns {Date}
 */
function addDays(d, n) {
  const r = new Date(d.getTime());
  r.setUTCDate(r.getUTCDate() + n);
  return r;
}

/** @param {Date} d */
function isoDate(d) {
  return d.toISOString().slice(0, 10);
}

/**
 * Linearly-interpolated percentile on an ASCENDING-sorted array of numbers.
 * Matches numpy.percentile default (`linear` interpolation).
 * @param {number[]} sortedAsc
 * @param {number} q  // 0..1
 */
export function percentile(sortedAsc, q) {
  if (sortedAsc.length === 0) return 0;
  const pos = (sortedAsc.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  if (lo === hi) return sortedAsc[lo];
  const frac = pos - lo;
  return sortedAsc[lo] * (1 - frac) + sortedAsc[hi] * frac;
}

/**
 * @template T
 * @param {T[]} arr
 * @param {number} size
 * @returns {T[][]}
 */
function chunked(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/**
 * Convert a user's daily "cumulative-from-inception" return at two points in
 * time into the return experienced strictly between those two points.
 *
 * If the cumulative returns are c_start and c_end (both in percent), the
 * window-local return is
 *     r_local = (1 + c_end/100) / (1 + c_start/100) - 1
 * expressed back as a percent.
 *
 * @param {number} startPct
 * @param {number} endPct
 * @returns {number}
 */
function windowLocalReturn(startPct, endPct) {
  return ((1 + endPct / 100) / (1 + startPct / 100) - 1) * 100;
}

/**
 * Main entry point. Recomputes aggregates for every window defined in
 * WINDOWS and upserts into `platform_return_aggregates`.
 *
 * @param {Date} [asOf]
 * @returns {Promise<{ upserted: number, skipped?: string }>}
 */
export async function recomputeAggregates(asOf = new Date()) {
  const supabase = getServerSupabase();
  const today = startOfUtcDay(asOf);
  const yearStart = startOfUtcYear(today);

  // 1. Pull per-user daily cumulative returns covering (at most) YTD.
  //    Schema assumed:
  //      portfolio_daily_returns(user_id uuid, date date, cum_return_pct numeric)
  //    If the table doesn't exist the call fails with PGRST205 / 42P01 — we
  //    treat that as a "no source yet" no-op so the nightly job stays green
  //    until that pipeline is provisioned.
  const { data: rows, error } = await supabase
    .from('portfolio_daily_returns')
    .select('user_id, date, cum_return_pct')
    .gte('date', isoDate(yearStart))
    .lte('date', isoDate(today));

  if (error) {
    const code = /** @type {any} */ (error).code;
    if (code === 'PGRST205' || code === '42P01') {
      return {
        upserted: 0,
        skipped: 'portfolio_daily_returns not provisioned — no source data to aggregate',
      };
    }
    throw error;
  }

  /** @type {Map<string, Array<{date: string, cum: number}>>} */
  const byUser = new Map();
  for (const r of rows ?? []) {
    const cum = Number(r.cum_return_pct);
    if (!Number.isFinite(cum)) continue;
    const list = byUser.get(r.user_id) ?? [];
    list.push({ date: r.date, cum });
    byUser.set(r.user_id, list);
  }
  for (const list of byUser.values()) {
    list.sort((a, b) => a.date.localeCompare(b.date));
  }

  // 2. For each window, for each date in the window, build the
  //    cross-sectional distribution of (window-start → date) returns.
  /** @type {any[]} */
  const rowsToUpsert = [];

  for (const w of WINDOWS) {
    const windowDays = w.days ?? daysBetween(yearStart, today);
    const windowStart =
      w.days == null ? yearStart : addDays(today, -windowDays);
    const windowStartIso = isoDate(windowStart);

    for (let d = 0; d <= windowDays; d++) {
      const target = addDays(windowStart, d);
      const targetIso = isoDate(target);

      /** @type {number[]} */
      const returns = [];
      for (const userSeries of byUser.values()) {
        // Anchor to the first sample on/after the window start. If the user
        // has no samples before the target date inside this window, skip.
        const startRow =
          userSeries.find((r) => r.date >= windowStartIso) ?? null;
        const targetRow = userSeries.find((r) => r.date === targetIso) ?? null;
        if (!startRow || !targetRow) continue;

        const local = windowLocalReturn(startRow.cum, targetRow.cum);
        if (!Number.isFinite(local)) continue;
        if (Math.abs(local) > OUTLIER_CAP_PCT) continue;
        returns.push(local);
      }

      if (returns.length === 0) continue;

      returns.sort((a, b) => a - b);
      const mean = returns.reduce((s, x) => s + x, 0) / returns.length;

      rowsToUpsert.push({
        date: targetIso,
        window_days: windowDays,
        window_key: w.key,
        sample_size: returns.length,
        p25: percentile(returns, 0.25),
        p50: percentile(returns, 0.5),
        p75: percentile(returns, 0.75),
        mean,
      });
    }
  }

  // 3. Upsert in chunks. Conflict target matches the unique index.
  for (const chunk of chunked(rowsToUpsert, 500)) {
    const { error: upErr } = await supabase
      .from('platform_return_aggregates')
      .upsert(chunk, { onConflict: 'date,window_key' });
    if (upErr) throw upErr;
  }

  return { upserted: rowsToUpsert.length };
}
