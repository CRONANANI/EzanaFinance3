/**
 * Council ELO rating model. Pure and tunable — all the product opinion lives in
 * WEIGHTS. Two components blend into the rating:
 *
 *  - COMPETITION (externally verified by judges): classic ELO run as pairwise
 *    outcomes between councils across every competition, in date order. Beating a
 *    strong field moves you more than beating a weak one (expected-vs-actual), so
 *    it can't be farmed by entering weak events.
 *  - FUND (self-reported ratios): a blend that weights Sharpe (risk-adjusted) more
 *    than raw ROI — rewarding good management, not the biggest swing — normalized
 *    across councils. Never touches dollars: only ratios/percentages.
 *
 * Competition is weighted above fund because the former is externally verified and
 * the latter is self-reported (a known integrity risk, mitigated here + flagged).
 */

export const WEIGHTS = {
  blend: { competition: 0.6, fund: 0.4 },
  elo: { K: 32, base: 1000 },
  fund: {
    // Sharpe > ROI on purpose: reward risk-adjusted returns, not recklessness.
    sharpe: 3,
    roi: 1,
    alpha: 1.5,
    drawdown: 1, // subtracted (a penalty)
    ratingBase: 1000,
    ratingSpread: 200, // z-score → rating points
  },
};

export const TIERS = [
  { tier: 'dynasty', min: 1400 },
  { tier: 'elite', min: 1250 },
  { tier: 'established', min: 1120 },
  { tier: 'competitive', min: 1020 },
  { tier: 'emerging', min: 0 },
];

export function tierForRating(rating) {
  return (TIERS.find((t) => rating >= t.min) || TIERS[TIERS.length - 1]).tier;
}

/** Classic ELO expected score of A vs B. */
export function expectedScore(ra, rb) {
  return 1 / (1 + 10 ** ((rb - ra) / 400));
}

/**
 * Competition ratings from pairwise outcomes across competitions (date order).
 * @param competitions [{ results: [{ org_id, rank }] }] — already sorted oldest→newest
 * Returns Map(org_id → rating). Orgs never seen stay at base via the caller.
 */
export function computeCompetitionRatings(competitions, opts = {}) {
  const K = opts.K ?? WEIGHTS.elo.K;
  const base = opts.base ?? WEIGHTS.elo.base;
  const ratings = new Map();
  const get = (id) => (ratings.has(id) ? ratings.get(id) : base);

  for (const comp of competitions || []) {
    // One org per competition (best-ranked team represents the council).
    const byOrg = new Map();
    for (const r of comp.results || []) {
      if (r.org_id == null || r.rank == null) continue;
      if (!byOrg.has(r.org_id) || r.rank < byOrg.get(r.org_id)) byOrg.set(r.org_id, r.rank);
    }
    const entrants = [...byOrg.entries()].map(([org_id, rank]) => ({ org_id, rank }));
    if (entrants.length < 2) continue;

    // Accumulate deltas over all pairs, then apply (so within one event every pair
    // is scored against the pre-event ratings).
    const delta = new Map();
    for (let i = 0; i < entrants.length; i++) {
      for (let j = i + 1; j < entrants.length; j++) {
        const a = entrants[i];
        const b = entrants[j];
        if (a.rank === b.rank) continue;
        const aWon = a.rank < b.rank ? 1 : 0;
        const ea = expectedScore(get(a.org_id), get(b.org_id));
        const da = K * (aWon - ea);
        delta.set(a.org_id, (delta.get(a.org_id) || 0) + da);
        delta.set(b.org_id, (delta.get(b.org_id) || 0) - da);
      }
    }
    for (const [org_id, d] of delta) ratings.set(org_id, get(org_id) + d);
  }

  const out = new Map();
  for (const [id, r] of ratings) out.set(id, Math.round(r));
  return out;
}

/** Blended raw fund score for one metrics row (higher is better). Sharpe dominates. */
export function fundRawScore(m, w = WEIGHTS.fund) {
  const sharpe = Number(m?.sharpe) || 0;
  const roi = Number(m?.roi_pct) || 0;
  const alpha = Number(m?.benchmark_alpha_pct) || 0;
  const dd = Math.abs(Number(m?.max_drawdown_pct) || 0);
  return w.sharpe * sharpe + w.roi * (roi / 10) + w.alpha * (alpha / 10) - w.drawdown * (dd / 10);
}

/**
 * Fund ratings normalized (z-score) across councils → rating points. Relative
 * ranking, so a council competes on ratios, not absolute numbers.
 * @param metrics [{ org_id, ...ratios }]
 * Returns Map(org_id → rating).
 */
export function computeFundRatings(metrics, w = WEIGHTS.fund) {
  const rows = (metrics || []).filter((m) => m && m.org_id);
  if (!rows.length) return new Map();
  const raw = rows.map((m) => ({ org_id: m.org_id, s: fundRawScore(m, w) }));
  const mean = raw.reduce((a, b) => a + b.s, 0) / raw.length;
  const variance = raw.reduce((a, b) => a + (b.s - mean) ** 2, 0) / raw.length;
  const sd = Math.sqrt(variance) || 1;
  const out = new Map();
  for (const r of raw) {
    const z = (r.s - mean) / sd;
    out.set(r.org_id, Math.round(w.ratingBase + z * w.ratingSpread));
  }
  return out;
}

/** Blend the two sub-ratings into the overall rating. */
export function blendRating(competitionRating, fundRating, blend = WEIGHTS.blend) {
  const c = competitionRating ?? WEIGHTS.elo.base;
  const f = fundRating ?? WEIGHTS.fund.ratingBase;
  return Math.round(blend.competition * c + blend.fund * f);
}
