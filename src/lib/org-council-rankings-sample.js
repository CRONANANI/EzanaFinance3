/**
 * Sample content for Council Rankings (/council-rankings and the sample
 * council pages under it).
 *
 * Served ONLY to master admin and demo accounts who are council members, by
 * GET /api/org/council-rankings/sample (the table) and by the council page's
 * server check (a sample council's own page), so the page can be presented
 * before councils compete or report. Real councils never receive it, the page
 * labels it "Sample content" while it shows, it never mixes with real rows
 * (it replaces the table while it shows), and nothing done to it is sent
 * anywhere.
 *
 * The council is the same sample council every rebuilt Team Hub page shows
 * ("Sample council"). The other eleven councils are invented names.
 *
 * The bundle obeys the real rules: each fund rating is worked out from the
 * reported ratios with the real model (relative to every reporting council),
 * each overall rating is the real 60/40 blend, tiers come from the real tier
 * table, a council that never reported reads 1000 for fund and one with no
 * judged result reads 1000 for competition, and each council's history runs
 * from 1000 to its current rating. Changes carry a part, never an event.
 *
 * Pure: no React, no fetch, no server imports. Every row carries is_demo.
 */
import { blendRating, computeFundRatings, tierForRating, WEIGHTS } from './council-elo/model.js';

const DAY = 86400000;
export const SAMPLE_PREFIX = 'sample-council-';
export const SAMPLE_SELF_ID = `${SAMPLE_PREFIX}self`;
export const isSampleCouncilId = (id) =>
  typeof id === 'string' && id.startsWith(SAMPLE_PREFIX) && id.length <= 40;

/*
 * [name, competition rating, ratios or null, components of its changes]
 * Ratios: [return %, Sharpe, alpha %, max drawdown %, volatility %, period]
 */
const COUNCILS = [
  ['Northshore Investment Council', 1138, [22.6, 2.03, 7.4, 7.1, 10.2, 'FY2026 Q2']],
  ['Westbridge Capital Forum', 1092, [19.4, 1.78, 6.0, 8.8, 11.6, 'FY2026 Q2']],
  ['Sample council', 1062, [17.8, 1.71, 6.1, 8.2, 11.0, 'FY2026 Q2'], true],
  ['Cedar Point Equity Society', 1048, [15.9, 1.52, 4.2, 9.4, 12.1, 'FY2026 Q2']],
  ['Aurora Student Fund', 1051, [15.1, 1.48, 3.6, 10.2, 12.8, 'CY2025']],
  ['Ridgeview Capital Collective', 1036, [14.7, 1.46, 3.1, 9.9, 12.4, 'FY2026 Q1']],
  ['Lakeside Investment Group', 1024, [13.9, 1.39, 2.4, 11.0, 13.5, 'FY2026 Q2']],
  ['Pinecrest Markets Society', 1008, [12.6, 1.31, 1.8, 11.8, 14.0, 'FY2026 Q2']],
  ['Oakridge Capital Council', 988, [11.9, 1.24, 0.9, 12.6, 14.7, 'CY2025']],
  ['Summit Quant Society', 1000, [10.8, 1.17, 0.2, 13.1, 15.2, 'FY2026 Q2']],
  ['Harborview Investment Club', 961, [9.9, 1.11, -0.6, 14.0, 15.9, 'FY2026 Q1']],
  ['Maplewood Asset Society', 972, null],
];

/* Each history: five changes, oldest first, as shares of the total move,
   with a wiggle that sums to zero so some steps fall back. */
const SHARES = [0.3, 0.25, -0.1, 0.35, 0.2];
const WIGGLE = [6, -4, 9, -7, -4];
const PARTS = ['fund', 'competition', 'competition', 'fund', 'competition'];

function historyOf({ i, rating, competed, reported, now }) {
  const total = rating - WEIGHTS.elo.base;
  const deltas = SHARES.map((s, k) => Math.round(total * s) + WIGGLE[(k + i) % WIGGLE.length]);
  const drift = total - deltas.reduce((a, b) => a + b, 0);
  deltas[deltas.length - 1] += drift;
  for (let k = 0; k < deltas.length; k += 1) {
    if (deltas[k] !== 0) continue;
    deltas[k] = 1;
    deltas[(k + 1) % deltas.length] -= 1;
  }
  const lastAgo = 2 + (i % 4); /* days since the latest change */
  let before = WEIGHTS.elo.base;
  const out = deltas.map((delta, k) => {
    let component = PARTS[(k + i) % PARTS.length];
    if (!reported) component = 'competition';
    if (!competed) component = 'fund';
    const daysAgo = lastAgo + (deltas.length - 1 - k) * 7;
    const row = {
      delta,
      component,
      rating_before: before,
      rating_after: before + delta,
      created_at: new Date(now - daysAgo * DAY).toISOString(),
      is_demo: true,
    };
    before += delta;
    return row;
  });
  return out.reverse(); /* newest first, as the page reads them */
}

/**
 * @param {{ now?: number }} opts
 * @returns {{ myOrgId: string, rows: object[], details: Record<string, object> }}
 */
export function buildCouncilRankingsSample({ now = Date.now() } = {}) {
  const ids = COUNCILS.map((c, i) => (c[3] ? SAMPLE_SELF_ID : `${SAMPLE_PREFIX}${i + 1}`));
  const metricsRows = COUNCILS.map((c, i) =>
    c[2]
      ? {
          org_id: ids[i],
          roi_pct: c[2][0],
          sharpe: c[2][1],
          benchmark_alpha_pct: c[2][2],
          max_drawdown_pct: c[2][3],
          volatility_pct: c[2][4],
          period_label: c[2][5],
          self_reported: true,
        }
      : null,
  );
  const fundMap = computeFundRatings(metricsRows.filter(Boolean));

  const details = {};
  const rows = COUNCILS.map((c, i) => {
    const orgId = ids[i];
    const comp = c[1];
    const metrics = metricsRows[i];
    const fund = fundMap.has(orgId) ? fundMap.get(orgId) : WEIGHTS.fund.ratingBase;
    const rating = blendRating(comp, fund);
    const competed = comp !== WEIGHTS.elo.base;
    const txns = historyOf({ i, rating, competed, reported: Boolean(metrics), now });
    const peak = Math.max(rating, ...txns.map((t) => t.rating_after));
    const detail = {
      orgId,
      name: c[0],
      tier: tierForRating(rating),
      rating,
      peak,
      comp,
      fund,
      metrics: metrics ? { ...metrics } : null,
      txns,
      is_demo: true,
    };
    details[orgId] = detail;
    return {
      orgId,
      name: c[0],
      tier: detail.tier,
      rating,
      comp,
      fund,
      roi: metrics?.roi_pct ?? null,
      sharpe: metrics?.sharpe ?? null,
      period: metrics?.period_label ?? null,
      reported: Boolean(metrics),
      selfReported: Boolean(metrics?.self_reported),
      competed,
      metrics: metrics ? { ...metrics } : null,
      move: txns[0]?.delta ?? null,
      moveAt: txns[0]?.created_at ?? null,
      is_demo: true,
    };
  });

  return { myOrgId: SAMPLE_SELF_ID, rows, details };
}

/** One sample council's own page, or null for an unknown id. */
export function sampleCouncilDetail(orgId, opts) {
  if (!isSampleCouncilId(orgId)) return null;
  return buildCouncilRankingsSample(opts).details[orgId] || null;
}
