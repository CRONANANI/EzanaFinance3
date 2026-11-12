// src/lib/quants/factors.js
// Quant Lab factor research. Pure and deterministic: no fetch, no clock, no
// randomness. Unit-tested by scripts/check-quant-factors.mjs.
//
// A factor is a number computed for every stock on the same day, used to
// rank them. The question a factor study answers: do the stocks the factor
// ranks highest go on to beat the ones it ranks lowest?
//
// The procedure, once a month:
//   1. At each month end t, score every stock using prices up to t only.
//   2. Sort the stocks by score into equal groups (quintiles by default).
//   3. Measure each group's equal-weighted return over the NEXT month.
// Everything reported is built from step 3, so no score ever sees the return
// it is judged on.
//
// Reported:
//   group returns     average next-month return of each group
//   spread            top group minus bottom group, month by month
//   IC                information coefficient: the rank correlation between
//                     score and next-month return across stocks, each month
//   decay             the IC against returns 1, 3, 6 and 12 months ahead
//   turnover          share of the top group replaced each month
//
// All factors here are price-based and use month-end closes only.

import { mean, stdev } from './metrics.js';
import { spearman } from './validation.js';

export const FACTOR_VERSION = 'ql-factors-1.0.0';
/** Stocks a month needs before it is sorted into groups. */
export const MIN_STOCKS_PER_GROUP = 5;
export const DECAY_HORIZONS = [1, 3, 6, 12];
/* A one-month move outside these bounds in a large company is a data fault
   (an unadjusted split), not a return. */
const MAX_MONTHLY_GAIN = 3;
const MAX_MONTHLY_LOSS = -0.9;

const isNum = (x) => typeof x === 'number' && Number.isFinite(x);
const round = (x, d = 6) => (isNum(x) ? Number(x.toFixed(d)) : null);

/**
 * Factor definitions. `score(closes, t)` reads month-end closes at indices
 * <= t only and returns a number where HIGHER means expected to do better,
 * or null when there is not enough history.
 */
export const FACTORS = {
  momentum_12_1: {
    label: 'Momentum, 12 months skipping the last',
    summary:
      'Return from 12 months ago to 1 month ago. Stocks that have been rising tend to keep rising; the latest month is skipped because it tends to reverse.',
    lookback: 12,
    score: (c, t) => ratio(c[t - 1], c[t - 12]),
  },
  momentum_6_1: {
    label: 'Momentum, 6 months skipping the last',
    summary: 'Return from 6 months ago to 1 month ago. A faster version of momentum.',
    lookback: 6,
    score: (c, t) => ratio(c[t - 1], c[t - 6]),
  },
  reversal_1: {
    label: 'Short-term reversal, 1 month',
    summary:
      'The return of the last month, reversed: the stocks that fell most are ranked highest, on the idea that sharp one-month moves partly undo themselves.',
    lookback: 1,
    score: (c, t) => {
      const r = ratio(c[t], c[t - 1]);
      return r === null ? null : -r;
    },
  },
  low_volatility_12: {
    label: 'Low volatility, 12 months',
    summary:
      'Steadiness of the last 12 monthly returns: the calmest stocks are ranked highest. Calm stocks have historically earned more per unit of risk than turbulent ones.',
    lookback: 12,
    score: (c, t) => {
      const rets = [];
      for (let k = t - 11; k <= t; k += 1) {
        const r = ratio(c[k], c[k - 1]);
        if (r === null) return null;
        rets.push(r);
      }
      const sd = stdev(rets);
      return sd === null ? null : -sd;
    },
  },
};

function ratio(a, b) {
  return isNum(a) && isNum(b) && b > 0 ? a / b - 1 : null;
}

/** 'YYYY-MM' of the month after `month`. */
const nextMonth = (month) => {
  const y = Number(month.slice(0, 4));
  const m = Number(month.slice(5, 7));
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`;
};

/**
 * Build a month-by-ticker panel of closes.
 * @param {Object<string, [string, number][]>} series  per ticker, [date, close]
 *        pairs with one row per month (its last close), oldest first
 * @param {string} asOfMonth  'YYYY-MM' of the current, unfinished month; it
 *        and anything later is left out, because its last close is not a
 *        month end yet
 * @returns {{ months: string[], closes: Object<string, (number|null)[]>, faults: string[] }}
 */
export function buildPanel(series, asOfMonth) {
  let first = null;
  let last = null;
  const byTicker = {};
  for (const [ticker, rows] of Object.entries(series || {})) {
    const map = new Map();
    for (const row of rows || []) {
      const month = String(row?.[0] || '').slice(0, 7);
      const close = Number(row?.[1]);
      if (!/^\d{4}-\d{2}$/.test(month) || !(close > 0) || month >= asOfMonth) continue;
      map.set(month, close);
      if (!first || month < first) first = month;
      if (!last || month > last) last = month;
    }
    if (map.size) byTicker[ticker] = map;
  }
  const months = [];
  if (first) for (let m = first; m <= last; m = nextMonth(m)) months.push(m);
  const closes = {};
  const faults = [];
  for (const [ticker, map] of Object.entries(byTicker)) {
    const row = months.map((m) => (map.has(m) ? map.get(m) : null));
    /* A fault breaks the price scale: nothing before it is comparable with
       what follows, so the earlier history is dropped for that ticker. */
    for (let i = row.length - 1; i >= 1; i -= 1) {
      const r = ratio(row[i], row[i - 1]);
      if (r !== null && (r > MAX_MONTHLY_GAIN || r < MAX_MONTHLY_LOSS)) {
        for (let k = 0; k < i; k += 1) row[k] = null;
        faults.push(ticker);
        break;
      }
    }
    closes[ticker] = row;
  }
  return { months, closes, faults: faults.sort() };
}

/**
 * Split items already sorted by score (lowest first) into `groups` buckets of
 * near-equal size. Returns an array of arrays, bottom group first.
 */
export function bucket(sorted, groups) {
  const out = Array.from({ length: groups }, () => []);
  sorted.forEach((item, i) => {
    out[Math.min(Math.floor((i * groups) / sorted.length), groups - 1)].push(item);
  });
  return out;
}

/* Deviation below this is rounding noise, not variation. */
const NO_VARIATION = 1e-12;

const tStat = (xs) => {
  const sd = stdev(xs);
  return sd > NO_VARIATION ? mean(xs) / (sd / Math.sqrt(xs.length)) : null;
};

/**
 * Run one factor study.
 * @param {object} input
 * @param {{ months: string[], closes: object, faults: string[] }} input.panel
 * @param {string} input.factor   key of FACTORS
 * @param {number} [input.groups] 3 to 10, default 5
 * @param {number} [input.months] use only the last N forward months
 */
export function factorStudy({ panel, factor, groups = 5, months: lastN = null }) {
  const def = FACTORS[factor];
  if (!def) throw new Error('Unknown factor');
  const g = Math.min(Math.max(Math.round(groups), 3), 10);
  const { months, closes } = panel;
  const tickers = Object.keys(closes).sort();
  const minStocks = g * MIN_STOCKS_PER_GROUP;

  /* Formation months: t from the first month with enough history to the
     second-to-last month (the last has no next-month return yet). */
  let start = def.lookback;
  const end = months.length - 2;
  if (lastN && end - lastN + 1 > start) start = end - lastN + 1;

  const rows = [];
  const growth = { top: 1, bottom: 1, universe: 1, spread: 1 };
  const curve = [];
  const ics = [];
  const spreads = [];
  const groupSeries = Array.from({ length: g }, () => []);
  const decay = Object.fromEntries(DECAY_HORIZONS.map((h) => [h, []]));
  const turnovers = [];
  let previousTop = null;
  let skipped = 0;
  const counts = [];

  for (let t = start; t <= end; t += 1) {
    const scored = [];
    for (const ticker of tickers) {
      const c = closes[ticker];
      const score = def.score(c, t);
      const fwd = ratio(c[t + 1], c[t]);
      if (score !== null && isNum(score) && fwd !== null) scored.push({ ticker, score, fwd });
    }
    if (scored.length < minStocks) {
      skipped += 1;
      continue;
    }
    scored.sort((a, b) => a.score - b.score || (a.ticker < b.ticker ? -1 : 1));
    const buckets = bucket(scored, g);
    const groupReturns = buckets.map((b) => mean(b.map((x) => x.fwd)));
    const universe = mean(scored.map((x) => x.fwd));
    const spread = groupReturns[g - 1] - groupReturns[0];
    const ic = spearman(
      scored.map((x) => x.score),
      scored.map((x) => x.fwd),
    );
    groupReturns.forEach((r, i) => groupSeries[i].push(r));
    spreads.push(spread);
    if (isNum(ic)) ics.push(ic);
    counts.push(scored.length);

    const top = new Set(buckets[g - 1].map((x) => x.ticker));
    if (previousTop) {
      let stayed = 0;
      for (const x of top) if (previousTop.has(x)) stayed += 1;
      turnovers.push(1 - stayed / top.size);
    }
    previousTop = top;

    /* Decay: the same scores against returns further ahead. */
    for (const h of DECAY_HORIZONS) {
      if (t + h >= months.length) continue;
      const pairs = scored
        .map((x) => [x.score, ratio(closes[x.ticker][t + h], closes[x.ticker][t])])
        .filter(([, r]) => r !== null);
      if (pairs.length >= minStocks) {
        const v = spearman(
          pairs.map((p) => p[0]),
          pairs.map((p) => p[1]),
        );
        if (isNum(v)) decay[h].push(v);
      }
    }

    if (!curve.length) curve.push({ month: months[t], top: 1, bottom: 1, universe: 1, spread: 1 });
    growth.top *= 1 + groupReturns[g - 1];
    growth.bottom *= 1 + groupReturns[0];
    growth.universe *= 1 + universe;
    growth.spread *= 1 + spread;
    curve.push({
      month: months[t + 1],
      top: round(growth.top),
      bottom: round(growth.bottom),
      universe: round(growth.universe),
      spread: round(growth.spread),
    });
    rows.push({
      month: months[t],
      stocks: scored.length,
      spread: round(spread),
      ic: round(ic, 4),
    });
  }

  const n = spreads.length;
  if (!n) {
    return { factorVersion: FACTOR_VERSION, factor, empty: true, months: 0, skipped };
  }
  const groupStats = groupSeries.map((series, i) => ({
    group: i + 1,
    meanMonthly: round(mean(series)),
    annualised: round((1 + mean(series)) ** 12 - 1),
    volatility: stdev(series) !== null ? round(stdev(series) * Math.sqrt(12)) : null,
  }));
  const spreadSd = stdev(spreads);
  /* 1 when every step up in group raises the average return, -1 when it lowers it. */
  const monotonicity = spearman(
    groupStats.map((s) => s.group),
    groupStats.map((s) => s.meanMonthly),
  );
  const notes = [];
  if (n < 36) {
    notes.push(
      `Only ${n} months measured. A factor needs several years before its average means much.`,
    );
  }
  const sT = tStat(spreads);
  if (isNum(sT) && Math.abs(sT) < 2) {
    notes.push(
      'The gap between the top and bottom group is not statistically distinguishable from zero in this sample.',
    );
  }
  if (isNum(monotonicity) && monotonicity < 0.5 && mean(spreads) > 0) {
    notes.push(
      'Returns do not rise steadily from the bottom group to the top. A factor that only works at the extremes is less trustworthy.',
    );
  }
  const turnover = turnovers.length ? mean(turnovers) : null;
  if (isNum(turnover) && turnover > 0.5) {
    notes.push(
      `About ${(turnover * 100).toFixed(0)}% of the top group changes every month. Trading costs, which are not included here, would take a large share of the result.`,
    );
  }
  if (skipped) {
    notes.push(
      `${skipped} months were skipped because fewer than ${minStocks} stocks had enough history.`,
    );
  }
  if (panel.faults.length) {
    notes.push(
      `Price history before a suspected data fault was dropped for: ${panel.faults.join(', ')}.`,
    );
  }
  notes.push(
    'The universe is a fixed list of large companies chosen today. Companies that failed or were acquired along the way are missing, which flatters every factor (survivorship bias).',
  );
  notes.push('Groups are equal-weighted and rebalanced monthly. Returns are before trading costs.');

  return {
    factorVersion: FACTOR_VERSION,
    factor,
    label: def.label,
    empty: false,
    groups: g,
    months: n,
    from: rows[0].month,
    to: months[months.length - 1],
    stocks: { average: round(mean(counts), 1), min: Math.min(...counts), max: Math.max(...counts) },
    groupStats,
    spread: {
      meanMonthly: round(mean(spreads)),
      annualised: round(mean(spreads) * 12),
      tStat: round(sT, 3),
      sharpe: spreadSd > NO_VARIATION ? round((mean(spreads) / spreadSd) * Math.sqrt(12), 3) : null,
      hitRate: round(spreads.filter((s) => s > 0).length / n, 4),
      worstMonth: round(Math.min(...spreads)),
    },
    ic: {
      mean: ics.length ? round(mean(ics), 4) : null,
      tStat: ics.length > 1 ? round(tStat(ics), 3) : null,
      hitRate: ics.length ? round(ics.filter((v) => v > 0).length / ics.length, 4) : null,
    },
    decay: DECAY_HORIZONS.map((h) => ({
      months: h,
      meanIc: decay[h].length ? round(mean(decay[h]), 4) : null,
      observations: decay[h].length,
    })),
    monotonicity: round(monotonicity, 4),
    turnover: round(turnover, 4),
    curve,
    monthly: rows,
    skipped,
    notes,
  };
}
