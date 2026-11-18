/**
 * Strategy Desk metrics (Nov 18 2026). Pure functions over a list of settled
 * bets, each { at, price, won, odds? }. `price` is the cost of a contract that
 * pays 1 (a prediction-market price, or a sportsbook implied probability with
 * the vig left in, which is what the bettor actually pays).
 *
 * The rule the whole desk rests on: a win rate means nothing on its own. A
 * strategy that wins 90% of the time at an average price of 93 cents loses
 * money. What counts is the win rate against the break-even rate the prices
 * imply, measured on enough bets that the gap is not luck.
 */

/** American odds to the price paid per 1 of payout (implied probability, vig in). */
export function americanToPrice(odds) {
  const o = Number(odds);
  if (!Number.isFinite(o) || o === 0) return null;
  return o > 0 ? 100 / (o + 100) : Math.abs(o) / (Math.abs(o) + 100);
}

/** Two-way vig removal: the fair probabilities behind a pair of prices. */
export function removeVig(a, b) {
  const t = a + b;
  return t > 0 ? { a: a / t, b: b / t, overround: t - 1 } : null;
}

/** Wilson score interval for a proportion, 95% by default. */
export function wilson(wins, n, z = 1.96) {
  if (!n) return { low: null, high: null };
  const p = wins / n;
  const z2 = z * z;
  const den = 1 + z2 / n;
  const mid = (p + z2 / (2 * n)) / den;
  const half = (z * Math.sqrt((p * (1 - p)) / n + z2 / (4 * n * n))) / den;
  return { low: mid - half, high: mid + half };
}

/**
 * Summary of a run of bets, flat 1-unit stakes, in time order.
 * roi is profit per unit staked; breakEven is the average price paid (the
 * win rate the prices require to break even before fees).
 */
export function summarise(bets, { feeRate = 0 } = {}) {
  const rows = (bets || [])
    .filter((b) => Number.isFinite(Number(b.price)) && Number(b.price) > 0 && Number(b.price) < 1)
    .sort((x, y) => (x.at < y.at ? -1 : 1));
  const n = rows.length;
  if (!n) {
    return { n: 0, wins: 0, hitRate: null, breakEven: null, roi: null, ci: wilson(0, 0), curve: [], maxDrawdown: null };
  }
  let wins = 0;
  let priceSum = 0;
  let equity = 0;
  let peak = 0;
  let maxDd = 0;
  const curve = [];
  for (const b of rows) {
    const price = Number(b.price);
    priceSum += price;
    /* A winning contract returns 1 for a cost of `price`; fees come off wins. */
    const pnl = b.won ? (1 - price) / price - feeRate * ((1 - price) / price) : -1;
    if (b.won) wins += 1;
    equity += pnl;
    peak = Math.max(peak, equity);
    maxDd = Math.min(maxDd, equity - peak);
    curve.push({ at: b.at, equity });
  }
  return {
    n,
    wins,
    hitRate: wins / n,
    breakEven: priceSum / n,
    roi: equity / n,
    units: equity,
    ci: wilson(wins, n),
    curve,
    maxDrawdown: maxDd,
  };
}

/**
 * The verification standard. A strategy is sold as Verified only when every
 * check passes; otherwise it shows what it still needs.
 */
export const VERIFY_MIN_BETS = 300;

export function verify(summary, { rulesFrozenAt = null, firstBetAt = null } = {}) {
  const s = summary || {};
  const checks = [
    {
      key: 'sample',
      label: `At least ${VERIFY_MIN_BETS} settled bets`,
      pass: (s.n || 0) >= VERIFY_MIN_BETS,
      detail: `${s.n || 0} of ${VERIFY_MIN_BETS}`,
    },
    {
      key: 'edge',
      label: 'Win rate beats the prices paid, beyond chance',
      pass: s.ci?.low != null && s.breakEven != null && s.ci.low > s.breakEven,
      detail:
        s.ci?.low != null && s.breakEven != null
          ? `95% low bound ${(s.ci.low * 100).toFixed(1)}% vs break-even ${(s.breakEven * 100).toFixed(1)}%`
          : 'Not enough data',
    },
    {
      key: 'profit',
      label: 'Profitable after fees',
      pass: (s.roi ?? -1) > 0,
      detail: s.roi != null ? `${s.roi >= 0 ? '+' : ''}${(s.roi * 100).toFixed(1)}% per bet` : 'Not enough data',
    },
    {
      key: 'forward',
      label: 'Rules fixed before the bets were counted',
      pass: Boolean(rulesFrozenAt && firstBetAt && firstBetAt >= rulesFrozenAt),
      detail: rulesFrozenAt
        ? `Only bets from ${String(rulesFrozenAt).slice(0, 10)} on count`
        : 'Rules not yet fixed',
    },
  ];
  return { verified: checks.every((c) => c.pass), checks };
}
