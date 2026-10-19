/**
 * 7-day and 30-day window figures for prediction_market_index rows, from the
 * snapshot history in prediction_market_snapshots. Pure functions; the index
 * crons fetch the baselines (window-store.js) and store the results on the
 * row, so the page reads them as plain columns.
 *
 * A window figure exists only when the history actually reaches back to the
 * window start: a market first seen yesterday has no 7-day change, and the
 * whole table has none until snapshots have accrued for seven days. Missing
 * is null, never zero.
 */

/* The crons run every two hours, so the first snapshot at or after the window
   start can sit up to one interval late. Allow a little more than that. */
export const SNAPSHOT_SLACK_MS = 3 * 3600000;
export const WINDOW_MS = { '7d': 7 * 86400000, '30d': 30 * 86400000 };

const num = (v) => {
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
const round4 = (x) => Math.round(x * 1e4) / 1e4;

/** True when a baseline snapshot is close enough to the window start to stand for it. */
export function coversWindow(baselineAt, now, windowMs) {
  const t = baselineAt ? new Date(baselineAt).getTime() : NaN;
  if (!Number.isFinite(t)) return false;
  return t <= new Date(now).getTime() - windowMs + SNAPSHOT_SLACK_MS;
}

/**
 * Window figures for one market.
 *   current:  { probability, volume }
 *   base7, base30: { probability, volume, captured_at } or null, the first
 *     snapshot at or after the window start
 *   earliest: { volume, captured_at } or null, the market's oldest snapshot
 * Returns { change_7d, change_30d, volume_7d, volume_30d, volume_norm }.
 * volume_norm is the average daily volume over up to 30 days of history,
 * present only once the market has at least 7 days of it (the Hot test needs
 * a norm worth comparing against).
 */
export function windowMetrics({ current, base7, base30, earliest }, now = new Date()) {
  const p = num(current?.probability);
  const v = num(current?.volume);
  const out = {
    change_7d: null,
    change_30d: null,
    volume_7d: null,
    volume_30d: null,
    volume_norm: null,
  };
  const fill = (base, key, windowMs) => {
    if (!base || !coversWindow(base.captured_at, now, windowMs)) return;
    const bp = num(base.probability);
    const bv = num(base.volume);
    if (p != null && bp != null) out[`change_${key}`] = round4(p - bp);
    if (v != null && bv != null) out[`volume_${key}`] = Math.max(0, Math.round(v - bv));
  };
  fill(base7, '7d', WINDOW_MS['7d']);
  fill(base30, '30d', WINDOW_MS['30d']);

  const start =
    base30 && coversWindow(base30.captured_at, now, WINDOW_MS['30d']) ? base30 : earliest;
  if (start && v != null && num(start.volume) != null) {
    const days = (new Date(now).getTime() - new Date(start.captured_at).getTime()) / 86400000;
    if (days >= 7 - SNAPSHOT_SLACK_MS / 86400000) {
      out.volume_norm = Math.max(0, Math.round((v - num(start.volume)) / Math.min(days, 30)));
    }
  }
  return out;
}

/** Which windows the page may offer, from the oldest snapshot in the table. */
export function availableWindows(oldestSnapshotAt, now = new Date()) {
  return {
    '24h': true,
    '7d': coversWindow(oldestSnapshotAt, now, WINDOW_MS['7d']),
    '30d': coversWindow(oldestSnapshotAt, now, WINDOW_MS['30d']),
  };
}
