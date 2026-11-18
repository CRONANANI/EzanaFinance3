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
