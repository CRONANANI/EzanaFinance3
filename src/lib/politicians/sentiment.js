/**
 * Politician sentiment (Nov 18 2026): do members of Congress, by what they
 * disclose buying and selling, read the market as bull or bear?
 *
 * Inputs come from two read-only SQL functions over congress_trades
 * (docs/sql/SQL_congress_sentiment_functions.md): one row per transaction
 * year, and one row per sector for a chosen year. Counting rules live there:
 * buys are purchases, sells are full and partial sales, exchanges are left
 * out, dollars are disclosed-range midpoints.
 *
 * The headline reading is breadth: of the members who traded in a year and
 * leaned one way, the share who were net buyers by dollars. It counts each
 * member once, so a single large filer cannot set the reading. Two figures
 * sit beside it: the share of trades that were buys, and dollar-weighted net
 * flow ((buys - sells) / (buys + sells)).
 *
 *   breadth >= 55%  Bullish
 *   breadth <= 45%  Bearish
 *   otherwise       Neutral
 */

export const BULL_AT = 55;
export const BEAR_AT = 45;

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

export function readingFor(breadth) {
  if (!Number.isFinite(breadth)) return { key: 'none', label: 'Not enough data' };
  if (breadth >= BULL_AT) return { key: 'bull', label: 'Bullish' };
  if (breadth <= BEAR_AT) return { key: 'bear', label: 'Bearish' };
  return { key: 'neutral', label: 'Neutral' };
}

/** One sentiment row from a by-year or by-sector SQL row. */
export function shapeRow(r) {
  const buys = num(r.buys);
  const sells = num(r.sells);
  const buyUsd = num(r.buy_usd);
  const sellUsd = num(r.sell_usd);
  const netBuyers = num(r.net_buyers);
  const netSellers = num(r.net_sellers);
  const leaning = netBuyers + netSellers;
  const breadth = leaning > 0 ? (netBuyers / leaning) * 100 : null;
  return {
    trades: num(r.trades),
    buys,
    sells,
    buyUsd,
    sellUsd,
    members: num(r.members),
    netBuyers,
    netSellers,
    buyShare: buys + sells > 0 ? (buys / (buys + sells)) * 100 : null,
    netFlow: buyUsd + sellUsd > 0 ? ((buyUsd - sellUsd) / (buyUsd + sellUsd)) * 100 : null,
    breadth,
    reading: readingFor(breadth ?? NaN),
  };
}

/* ── Economic outlook (Nov 18 2026) ──────────────────────────────────────
   Breadth says whether members lean to buying. Where they put the money
   says what they expect: rotating into safety (bonds and Treasuries, and the
   defensive sectors Consumer Staples, Utilities and Health Care) reads as
   bracing for a slowdown; rotating into cyclicals (Consumer Discretionary,
   Financials, Industrials, Information Technology, Materials, Communication
   Services, Energy, Real Estate) reads as expecting growth. Consumer
   Discretionary is cyclical: buying it is a bet that consumers keep
   spending, the opposite of a recession call.

   Defensive rotation D, in percentage points: the safe share of buys minus
   the safe share of sells, by trade count (each disclosure one vote, so a
   single large filer cannot set it). Positive means money moving to safety.

   Outlook score, -100 to +100:
     0.6 x market lean  ((breadth - 50) x 2)
   - 0.4 x rotation     (D x 4, capped at +/-100)
   +8 or more reads Expansion, -8 or less reads Slowdown risk, else Mixed.
*/
export const OUTLOOK_WEIGHTS = { lean: 0.6, rotation: 0.4 };
export const OUTLOOK_BAND = 8;
export const SAFE_SECTORS = ['Consumer Staples', 'Utilities', 'Health Care'];
export const CYCLICAL_SECTORS = [
  'Consumer Discretionary',
  'Financials',
  'Industrials',
  'Information Technology',
  'Materials',
  'Communication Services',
  'Energy',
  'Real Estate',
];

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

export function rotationFor(r) {
  const bondB = num(r.bond_buys);
  const bondS = num(r.bond_sells);
  const defB = num(r.def_buys);
  const defS = num(r.def_sells);
  const cycB = num(r.cyc_buys);
  const cycS = num(r.cyc_sells);
  const buys = bondB + defB + cycB;
  const sells = bondS + defS + cycS;
  const safeBuyShare = buys > 0 ? ((bondB + defB) / buys) * 100 : null;
  const safeSellShare = sells > 0 ? ((bondS + defS) / sells) * 100 : null;
  const tilt =
    Number.isFinite(safeBuyShare) && Number.isFinite(safeSellShare)
      ? safeBuyShare - safeSellShare
      : null;
  return {
    bonds: { buys: bondB, sells: bondS, buyUsd: num(r.bond_buy_usd), sellUsd: num(r.bond_sell_usd) },
    defensive: { buys: defB, sells: defS },
    cyclical: { buys: cycB, sells: cycS },
    safeBuyShare,
    safeSellShare,
    tilt,
  };
}

export function outlookFor(breadth, tilt) {
  if (!Number.isFinite(breadth) || !Number.isFinite(tilt)) {
    return { score: null, key: 'none', label: 'Not enough data' };
  }
  const lean = clamp((breadth - 50) * 2, -100, 100);
  const rotation = clamp(tilt * 4, -100, 100);
  const score = OUTLOOK_WEIGHTS.lean * lean - OUTLOOK_WEIGHTS.rotation * rotation;
  if (score >= OUTLOOK_BAND) return { score, lean, rotation, key: 'expansion', label: 'Expansion' };
  if (score <= -OUTLOOK_BAND)
    return { score, lean, rotation, key: 'slowdown', label: 'Slowdown risk' };
  return { score, lean, rotation, key: 'mixed', label: 'Mixed' };
}
