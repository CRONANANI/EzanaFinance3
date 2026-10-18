/**
 * Trending score for prediction_market_index rows. Pure functions, no I/O:
 * the index crons call scoreTrendingBatch on each run and store the result,
 * and the trending read layer only sorts by it.
 *
 * Score, 0..1, ranked separately per venue (Polymarket volume is dollars,
 * Kalshi volume is contracts, so the two are never compared directly):
 *   0.6 x percentile rank of 24h volume among eligible rows on that venue
 *   0.3 x size of the 24h YES price move, capped at 10 points
 *   0.1 x share of lifetime volume that traded in the last 24h (new activity)
 *
 * Eligible = probability between 3% and 97% (near-certain markets trade a lot
 * but say little), 24h volume at or above the venue floor, and a spread no
 * wider than 10 points when a spread is known. Everything else gets null.
 */
export const TRENDING_RULES = {
  minProbability: 0.03,
  maxProbability: 0.97,
  maxSpread: 0.1,
  minVolume24h: { polymarket: 5000, kalshi: 500 },
  moveCap: 0.1,
  weights: { volume: 0.6, move: 0.3, fresh: 0.1 },
};

const num = (v) => {
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

/** A price strictly inside (0, 1), else null. */
export function unitPrice(v) {
  const n = num(v);
  return n != null && n > 0 && n < 1 ? n : null;
}

/** Bid/ask spread when both sides quote and the book is not crossed, else null. */
export function spreadOf(bid, ask) {
  if (bid == null || ask == null || ask < bid) return null;
  return Number((ask - bid).toFixed(4));
}

/** Signed probability-point change, rounded, or null when either side is missing. */
export function changeOf(now, before) {
  if (now == null || before == null) return null;
  return Number((now - before).toFixed(4));
}

export function isTrendingEligible(row) {
  const r = TRENDING_RULES;
  const p = num(row?.probability);
  if (p == null || p < r.minProbability || p > r.maxProbability) return false;
  const v24 = num(row?.volume_24h);
  const floor = r.minVolume24h[row?.platform];
  if (v24 == null || floor == null || v24 < floor) return false;
  const s = num(row?.spread);
  if (s != null && s > r.maxSpread) return false;
  return true;
}

/** Sets row.trending_score on every row in place (null when not eligible). Returns rows. */
export function scoreTrendingBatch(rows) {
  const r = TRENDING_RULES;
  const byPlatform = new Map();
  for (const row of rows) {
    row.trending_score = null;
    if (!isTrendingEligible(row)) continue;
    if (!byPlatform.has(row.platform)) byPlatform.set(row.platform, []);
    byPlatform.get(row.platform).push(row);
  }
  for (const list of byPlatform.values()) {
    // Ascending by 24h volume, market_id as a stable tiebreak so reruns agree.
    list.sort(
      (a, b) =>
        num(a.volume_24h) - num(b.volume_24h) || String(a.market_id).localeCompare(b.market_id),
    );
    const last = list.length - 1;
    list.forEach((row, i) => {
      const volPct = last > 0 ? i / last : 1;
      const move = Math.min(Math.abs(num(row.price_change_24h) ?? 0) / r.moveCap, 1);
      const total = num(row.volume);
      const fresh = total && total > 0 ? Math.min(num(row.volume_24h) / total, 1) : 0;
      const score = r.weights.volume * volPct + r.weights.move * move + r.weights.fresh * fresh;
      row.trending_score = Number(score.toFixed(4));
    });
  }
  return rows;
}
