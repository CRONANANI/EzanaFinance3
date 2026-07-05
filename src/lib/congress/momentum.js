/**
 * Legislative Momentum Score — per sector, over a trailing window (30/90d).
 *
 * A weighted sum of mapped-bill activity where the weight is the bill's stage
 * advancement (introduced=1 → committee=2 → reported=4 → floor=6 →
 * passed_chamber=8 → enacted/law=10), scaled up when a CBO cost estimate is
 * present (bigger fiscal footprint = more market-relevant) and by
 * bipartisanship (broad cross-party support is more likely to advance).
 *
 * Analytical/informational only — "sectors with rising legislative activity",
 * never "buy X". Every score is decomposable to the underlying bills (receipts).
 */
import { sectorsForBill, SECTORS } from './policy-sector-map';

export const STAGE_WEIGHT = {
  introduced: 1,
  committee: 2,
  reported: 4,
  floor: 6,
  passed_chamber: 8,
  passed_both: 9,
  law: 10,
};

function withinWindow(dateStr, windowDays, nowMs) {
  if (!dateStr) return true; // undated activity still counts (conservative)
  const t = Date.parse(dateStr);
  if (Number.isNaN(t)) return true;
  return nowMs - t <= windowDays * 86400000;
}

/** bipartisanship multiplier in [1, 1.5] from cosponsor party mix */
function bipartisanMult(bill) {
  const d = Number(bill.cosponsor_dem ?? bill.cosponsorDem) || 0;
  const r = Number(bill.cosponsor_rep ?? bill.cosponsorRep) || 0;
  if (d + r <= 0) return 1;
  const minShare = Math.min(d, r) / (d + r); // 0..0.5
  return 1 + minShare; // even split → 1.5x
}

/** CBO magnitude multiplier in [1, 2] (log-scaled fiscal footprint) */
function cboMult(bill) {
  const cbo = Math.abs(Number(bill.cbo_estimate ?? bill.cboEstimate) || 0);
  if (cbo <= 0) return 1;
  return Math.min(2, 1 + Math.log10(1 + cbo / 1e9) / 3); // ~$1B → +0.1, ~$1T → ~+1
}

/**
 * @param {Array} bills  ingested congress_bills rows (need stage, policy_area,
 *   latest_action_date; subjects optional as bill.subjects[])
 * @param {{windowDays?:number, nowMs?:number}} opts
 * @returns {Array<{ sector, label, etf, tickers, score, billCount, bills:[] }>} ranked desc
 */
export function computeSectorMomentum(bills = [], { windowDays = 90, nowMs = Date.now() } = {}) {
  const acc = new Map();
  for (const b of bills) {
    if (!withinWindow(b.latest_action_date || b.latestActionDate, windowDays, nowMs)) continue;
    const stageW = STAGE_WEIGHT[b.stage] || 1;
    const contrib = stageW * bipartisanMult(b) * cboMult(b);
    for (const key of sectorsForBill(b)) {
      if (!acc.has(key)) acc.set(key, { score: 0, billCount: 0, bills: [] });
      const e = acc.get(key);
      e.score += contrib;
      e.billCount += 1;
      if (e.bills.length < 8) e.bills.push({ ...b, _contribution: Number(contrib.toFixed(2)) });
    }
  }
  return [...acc.entries()]
    .map(([sector, e]) => ({
      sector,
      label: SECTORS[sector]?.label || sector,
      etf: SECTORS[sector]?.etf || null,
      tickers: SECTORS[sector]?.tickers || [],
      score: Number(e.score.toFixed(1)),
      billCount: e.billCount,
      bills: e.bills.sort((a, z) => (z._contribution || 0) - (a._contribution || 0)),
    }))
    .sort((a, b) => b.score - a.score);
}
