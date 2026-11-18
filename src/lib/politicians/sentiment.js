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

/* ── Reading the signal (Nov 18 2026 redesign) ───────────────────────────
   Plain-language lines built ONLY from the figures above, so the page can
   say whether its three measures agree:
     breadth   members net buying by dollars (one vote per member; sets the
               Bullish / Neutral / Bearish reading)
     buyShare  buys as a share of buy and sell TRADES (one vote per trade)
     netFlow   (bought - sold) / (bought + sold) by midpoint DOLLARS (larger
               filers weigh more)
   They measure different things, so they can legitimately disagree; when
   they do, the page says so instead of picking one. */

const side = (v, mid) => (Number.isFinite(v) ? (v >= mid ? 'buying' : 'selling') : null);
const pctText = (v) => `${Math.round(v)}%`;

/**
 * { summary, divergence[] } for one year row, or null without a breadth.
 * divergence lists each measure that points the other way from breadth.
 */
export function signalStory(y) {
  if (!y || !Number.isFinite(y.breadth)) return null;
  const leaning = (y.netBuyers || 0) + (y.netSellers || 0);
  const b = side(y.breadth, 50);
  const c = side(y.buyShare, 50);
  const f = side(y.netFlow, 0);
  const lean = b === 'buying' ? 'net buyers' : 'net sellers';
  const share = b === 'buying' ? y.breadth : 100 - y.breadth;
  const summary = `${pctText(share)} of the ${leaning.toLocaleString()} members who leaned one way were ${lean} by disclosed dollars, which reads ${y.reading?.label || 'Neutral'}.`;
  const divergence = [];
  if (c && c !== b) {
    divergence.push(
      c === 'buying'
        ? `Buy trades outnumber sell trades (${pctText(y.buyShare)} of buys and sells), yet most members sold more dollars than they bought. Counts give each trade one vote; the reading gives each member one.`
        : `Sell trades outnumber buy trades (${pctText(100 - y.buyShare)} of buys and sells), yet most members bought more dollars than they sold. Counts give each trade one vote; the reading gives each member one.`,
    );
  }
  if (f && f !== b) {
    divergence.push(
      `Dollar flow points the other way (net ${y.netFlow >= 0 ? '+' : '-'}${Math.abs(Math.round(y.netFlow))}%): total dollars are set by the largest filers, while the reading counts each member once.`,
    );
  }
  const aligned =
    !divergence.length && c && f
      ? `Member breadth, trade counts and dollar flow all point to net ${b}.`
      : null;
  return { summary, aligned, divergence };
}

/**
 * Sector moves between two years, same definitions both years. Only
 * sectors with at least `minMembers` leaning members in BOTH years count,
 * so a sector with three traders cannot headline. Returns the largest
 * falls in breadth (pts) and the defensive sectors by buy share.
 */
export function sectorShifts(sectors, prevSectors, minMembers = 5) {
  const leaningOf = (s) => (s.netBuyers || 0) + (s.netSellers || 0);
  const prev = new Map((prevSectors || []).map((s) => [s.sector, s]));
  const moves = [];
  for (const s of sectors || []) {
    const p = prev.get(s.sector);
    if (!p || s.sector === 'Unclassified') continue;
    if (leaningOf(s) < minMembers || leaningOf(p) < minMembers) continue;
    if (!Number.isFinite(s.breadth) || !Number.isFinite(p.breadth)) continue;
    moves.push({ sector: s.sector, change: s.breadth - p.breadth, now: s.breadth, was: p.breadth });
  }
  const falls = moves
    .filter((m) => m.change < 0)
    .sort((a, b) => a.change - b.change)
    .slice(0, 3);
  const rises = moves
    .filter((m) => m.change > 0)
    .sort((a, b) => b.change - a.change)
    .slice(0, 3);
  const defensive = (sectors || [])
    .filter((s) => SAFE_SECTORS.includes(s.sector) && Number.isFinite(s.buyShare))
    .filter((s) => (s.buys || 0) + (s.sells || 0) >= 10)
    .sort((a, b) => b.buyShare - a.buyShare);
  return { falls, rises, defensive, byChange: new Map(moves.map((m) => [m.sector, m.change])) };
}
