/**
 * Sonar adaptive research: technical indicators from daily bars (Nov 2026).
 *
 * Every figure a price-structure answer shows is computed here from observed
 * bars: nothing is estimated, smoothed beyond the indicator's own definition,
 * or filled in. Each function returns null where the lookback is not yet
 * satisfied, so a chart never draws an indicator it cannot honestly compute.
 *
 * Definitions are the standard ones and are stated with each result
 * (`method`), because "RSI" without a period and a smoothing rule is not a
 * number anyone can check:
 *   RSI(14)       Wilder's smoothing of average gains and losses
 *   SMA(n)        arithmetic mean of the last n closes
 *   EMA(n)        seeded with SMA(n), multiplier 2 / (n + 1)
 *   MACD          EMA(12) minus EMA(26); signal is EMA(9) of that line
 *   ATR(14)       Wilder's smoothing of true range
 *   Realized vol  standard deviation of daily log returns, annualised by sqrt(252)
 *
 * Pure. No I/O. Bars are { date, open, high, low, close, volume }, oldest first.
 */

const num = (v) => (Number.isFinite(Number(v)) && v !== null && v !== '' ? Number(v) : null);

/** Bars with a usable close, oldest first, one per date. */
export function cleanBars(rows) {
  const byDate = new Map();
  for (const r of rows || []) {
    const date = String(r?.date || '').slice(0, 10);
    const close = num(r?.close);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || close == null || close <= 0) continue;
    byDate.set(date, {
      date,
      open: num(r.open),
      high: num(r.high),
      low: num(r.low),
      close,
      volume: num(r.volume),
    });
  }
  return [...byDate.values()].sort((a, b) => (a.date < b.date ? -1 : 1));
}

export function sma(values, n) {
  const out = new Array(values.length).fill(null);
  let sum = 0;
  for (let i = 0; i < values.length; i += 1) {
    sum += values[i];
    if (i >= n) sum -= values[i - n];
    if (i >= n - 1) out[i] = sum / n;
  }
  return out;
}

export function ema(values, n) {
  const out = new Array(values.length).fill(null);
  if (values.length < n) return out;
  const k = 2 / (n + 1);
  let prev = values.slice(0, n).reduce((a, b) => a + b, 0) / n;
  out[n - 1] = prev;
  for (let i = n; i < values.length; i += 1) {
    prev = values[i] * k + prev * (1 - k);
    out[i] = prev;
  }
  return out;
}

/** Wilder's RSI. The first value appears at index n (it needs n changes). */
export function rsi(closes, n = 14) {
  const out = new Array(closes.length).fill(null);
  if (closes.length <= n) return out;
  let gain = 0;
  let loss = 0;
  for (let i = 1; i <= n; i += 1) {
    const d = closes[i] - closes[i - 1];
    if (d >= 0) gain += d;
    else loss -= d;
  }
  gain /= n;
  loss /= n;
  const value = () => (loss === 0 ? (gain === 0 ? 50 : 100) : 100 - 100 / (1 + gain / loss));
  out[n] = value();
  for (let i = n + 1; i < closes.length; i += 1) {
    const d = closes[i] - closes[i - 1];
    gain = (gain * (n - 1) + Math.max(d, 0)) / n;
    loss = (loss * (n - 1) + Math.max(-d, 0)) / n;
    out[i] = value();
  }
  return out;
}

export function macd(closes, fast = 12, slow = 26, signalN = 9) {
  const f = ema(closes, fast);
  const s = ema(closes, slow);
  const line = closes.map((_, i) => (f[i] != null && s[i] != null ? f[i] - s[i] : null));
  const start = line.findIndex((v) => v != null);
  const signal = new Array(closes.length).fill(null);
  if (start >= 0) {
    const sig = ema(line.slice(start), signalN);
    sig.forEach((v, i) => {
      signal[start + i] = v;
    });
  }
  const histogram = line.map((v, i) => (v != null && signal[i] != null ? v - signal[i] : null));
  return { line, signal, histogram };
}

/** Wilder's ATR. Needs high and low on every bar in the lookback; null otherwise. */
function atr(bars, n = 14) {
  const out = new Array(bars.length).fill(null);
  const tr = bars.map((b, i) => {
    if (b.high == null || b.low == null) return null;
    if (i === 0) return b.high - b.low;
    const pc = bars[i - 1].close;
    return Math.max(b.high - b.low, Math.abs(b.high - pc), Math.abs(b.low - pc));
  });
  if (bars.length <= n || tr.slice(1, n + 1).some((v) => v == null)) return out;
  let prev = tr.slice(1, n + 1).reduce((a, b) => a + b, 0) / n;
  out[n] = prev;
  for (let i = n + 1; i < bars.length; i += 1) {
    if (tr[i] == null) return out;
    prev = (prev * (n - 1) + tr[i]) / n;
    out[i] = prev;
  }
  return out;
}

/** Annualised standard deviation of the last n daily log returns, in percent. */
function realizedVolatility(closes, n = 30) {
  if (closes.length <= n) return null;
  const rets = [];
  for (let i = closes.length - n; i < closes.length; i += 1) {
    rets.push(Math.log(closes[i] / closes[i - 1]));
  }
  const mean = rets.reduce((a, b) => a + b, 0) / n;
  const variance = rets.reduce((a, b) => a + (b - mean) ** 2, 0) / (n - 1);
  return Math.sqrt(variance) * Math.sqrt(252) * 100;
}

const round = (v, d = 2) => (v == null || !Number.isFinite(v) ? null : Number(v.toFixed(d)));
const pctFrom = (a, b) => (a == null || b == null || b === 0 ? null : (a / b - 1) * 100);

/**
 * Everything a technical answer needs, from one set of bars.
 *
 * @param {object[]} rows daily bars, any order
 * @param {{ windowDays?: number }} [opts] how many of the latest bars to return as the chart
 *        series (indicators are still computed over every bar supplied, so a 200-day average
 *        is right at the left edge of the chart)
 * @returns {null | { asOf, bars, series, latest, capabilities, methods }}
 *          null when there are too few bars to say anything (under 30).
 */
export function technicalSnapshot(rows, { windowDays = 260 } = {}) {
  const bars = cleanBars(rows);
  if (bars.length < 30) return null;
  const closes = bars.map((b) => b.close);
  const s20 = sma(closes, 20);
  const s50 = sma(closes, 50);
  const s200 = sma(closes, 200);
  const r14 = rsi(closes, 14);
  const m = macd(closes);
  const a14 = atr(bars, 14);
  const hasOhlc = bars.every((b) => b.open != null && b.high != null && b.low != null);
  const hasVolume = bars.slice(-60).every((b) => b.volume != null);
  const i = bars.length - 1;
  const last = bars[i];
  const yearBars = bars.slice(-252);
  const hi = Math.max(...yearBars.map((b) => b.high ?? b.close));
  const lo = Math.min(...yearBars.map((b) => b.low ?? b.close));
  const hiBar = yearBars.find((b) => (b.high ?? b.close) === hi);
  const vol20 = hasVolume ? bars.slice(-20).reduce((a, b) => a + b.volume, 0) / 20 : null;
  const from = Math.max(0, bars.length - windowDays);
  const series = bars.slice(from).map((b, k) => {
    const j = from + k;
    return {
      date: b.date,
      open: b.open,
      high: b.high,
      low: b.low,
      close: b.close,
      volume: b.volume,
      sma20: round(s20[j]),
      sma50: round(s50[j]),
      sma200: round(s200[j]),
      rsi14: round(r14[j], 1),
    };
  });
  return {
    asOf: last.date,
    bars: bars.length,
    yearBars: yearBars.length,
    series,
    latest: {
      close: round(last.close),
      rsi14: round(r14[i], 1),
      sma20: round(s20[i]),
      sma50: round(s50[i]),
      sma200: round(s200[i]),
      vsSma20Pct: round(pctFrom(last.close, s20[i]), 1),
      vsSma50Pct: round(pctFrom(last.close, s50[i]), 1),
      vsSma200Pct: round(pctFrom(last.close, s200[i]), 1),
      macd: round(m.line[i]),
      macdSignal: round(m.signal[i]),
      macdHistogram: round(m.histogram[i]),
      atr14: round(a14[i]),
      atr14Pct: round(a14[i] != null ? (a14[i] / last.close) * 100 : null, 1),
      realizedVol30Pct: round(realizedVolatility(closes, 30), 1),
      high52w: round(hi),
      low52w: round(lo),
      high52wDate: hiBar?.date || null,
      offHighPct: round(pctFrom(last.close, hi), 1),
      rangePositionPct: round(hi > lo ? ((last.close - lo) / (hi - lo)) * 100 : null, 0),
      change1dPct: round(pctFrom(last.close, bars[i - 1]?.close), 1),
      change5dPct: round(pctFrom(last.close, bars[i - 5]?.close), 1),
      change21dPct: round(pctFrom(last.close, bars[i - 21]?.close), 1),
      volume: last.volume,
      volumeVs20dPct: round(vol20 ? pctFrom(last.volume, vol20) : null, 0),
    },
    capabilities: {
      ohlc: hasOhlc,
      volume: hasVolume,
      sma200: s200[i] != null,
      atr: a14[i] != null,
    },
    methods: {
      rsi14: 'Wilder’s smoothing of average gains and losses over 14 sessions',
      sma: 'arithmetic mean of the last 20, 50 or 200 closes',
      macd: 'EMA(12) minus EMA(26), with a 9-session EMA signal line',
      atr14: 'Wilder’s smoothing of true range over 14 sessions',
      realizedVol30:
        'standard deviation of the last 30 daily log returns, annualised by the square root of 252',
      range52w: 'highest high and lowest low of the last 252 sessions',
    },
  };
}

/** How the 14-session RSI reads against the two conventional thresholds. Descriptive only. */
export function rsiReading(value) {
  if (value == null) return { zone: 'unavailable', text: 'not available' };
  if (value < 30)
    return { zone: 'oversold', text: 'below 30, the conventional oversold threshold' };
  if (value > 70)
    return { zone: 'overbought', text: 'above 70, the conventional overbought threshold' };
  if (value < 40)
    return { zone: 'weak', text: 'between 30 and 40, weak but above the oversold threshold' };
  if (value > 60)
    return { zone: 'firm', text: 'between 60 and 70, firm but below the overbought threshold' };
  return { zone: 'neutral', text: 'between 40 and 60, the neutral band' };
}
