// src/lib/quants/event-study.js
// Quant Lab event studies. Pure and deterministic: no fetch, no clock, no
// randomness. Unit-tested by scripts/check-quant-events.mjs.
//
// Question answered: after a kind of event became PUBLIC, what did the stock do
// next, compared with the market? The study is built so that every return it
// reports could have been earned by someone reading the news:
//
//   - An event is dated by the day the information was published (a filing or
//     disclosure date), never by the day the underlying trade happened.
//   - The entry is the OPEN of the first session after that date, because a
//     filing can land after the close.
//   - A return over h sessions runs from that open to the close of the h-th
//     session held (h = 1 is the close of the entry session).
//   - The abnormal return is the stock's return minus the benchmark's over the
//     same sessions (market-adjusted; no beta is estimated).
//
// What it cannot tell you is stated in the notes it returns: events cluster
// in time and in a few tickers, so they are not independent draws, and
// companies that were later delisted may be missing from the price history.

import { mean, quantile, stdev } from './metrics.js';

export const EVENT_STUDY_VERSION = 'ql-events-1.0.0';
export const DEFAULT_HORIZONS = [1, 5, 10, 20, 40, 60];
export const PRE_SESSIONS = 5;

const isNum = (x) => typeof x === 'number' && Number.isFinite(x);
const round = (x, d = 6) => (isNum(x) ? Number(x.toFixed(d)) : null);

/** Index of the first bar dated strictly after `date`, or -1. Bars are oldest first. */
export function firstSessionAfter(bars, date) {
  let lo = 0;
  let hi = bars.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (bars[mid].date <= date) lo = mid + 1;
    else hi = mid;
  }
  return lo < bars.length ? lo : -1;
}

/** One row per ticker and public date: several filings on one day are one event. */
export function dedupeEvents(events) {
  const seen = new Set();
  const out = [];
  for (const e of events) {
    const ticker = String(e?.ticker || '').toUpperCase();
    const date = String(e?.date || '').slice(0, 10);
    if (!ticker || !/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
    const key = `${ticker}|${date}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ ticker, date });
  }
  return out.sort((a, b) =>
    a.date < b.date ? -1 : a.date > b.date ? 1 : a.ticker < b.ticker ? -1 : 1,
  );
}

/**
 * The path of one event: abnormal return at each offset, relative to the
 * entry open. Offsets -PRE..-1 are closes BEFORE the entry session (so a
 * negative value there means the price ran up into the event); offset h >= 1
 * is the close after h sessions held. Returns null when the event cannot be
 * priced, with the reason.
 */
export function eventPath(event, bars, benchmark, post, pre = PRE_SESSIONS) {
  if (!bars || bars.length < 2) return { path: null, reason: 'no_prices' };
  const e = firstSessionAfter(bars, event.date);
  if (e < 0) return { path: null, reason: 'too_recent' };
  const entryBar = bars[e];
  const benchEntry = benchmark.get(entryBar.date);
  if (!benchEntry) return { path: null, reason: 'no_benchmark' };
  const p0 = isNum(entryBar.open) && entryBar.open > 0 ? entryBar.open : null;
  const b0 = isNum(benchEntry.open) && benchEntry.open > 0 ? benchEntry.open : null;
  if (!p0 || !b0) return { path: null, reason: 'no_open' };
  const path = new Map();
  const point = (bar) => {
    const b = benchmark.get(bar.date);
    if (!b || !isNum(bar.close) || !isNum(b.close)) return null;
    const stock = bar.close / p0 - 1;
    const market = b.close / b0 - 1;
    return { stock, market, abnormal: stock - market };
  };
  for (let j = 1; j <= pre; j += 1) {
    if (e - j < 0) break;
    const v = point(bars[e - j]);
    if (v) path.set(-j, v);
  }
  for (let h = 1; h <= post; h += 1) {
    if (e + h - 1 >= bars.length) break;
    const v = point(bars[e + h - 1]);
    if (v) path.set(h, v);
  }
  return { path, entryDate: entryBar.date, reason: null };
}

/**
 * @param {object} input
 * @param {{ticker: string, date: string}[]} input.events  `date` is the PUBLIC date
 * @param {Object<string, {date, open, close}[]>} input.bars  oldest first, per ticker
 * @param {{date, open, close}[]} input.benchmark
 * @param {number[]} [input.horizons]
 */
export function eventStudy({ events, bars, benchmark, horizons = DEFAULT_HORIZONS }) {
  const post = Math.max(...horizons);
  const benchMap = new Map((benchmark || []).map((b) => [b.date, b]));
  const unique = dedupeEvents(events);
  const dropped = { no_prices: 0, too_recent: 0, no_benchmark: 0, no_open: 0 };
  const paths = [];
  const tickers = new Set();
  const dates = new Set();
  for (const ev of unique) {
    const r = eventPath(ev, bars[ev.ticker], benchMap, post);
    if (!r.path) {
      dropped[r.reason] += 1;
      continue;
    }
    paths.push(r.path);
    tickers.add(ev.ticker);
    dates.add(r.entryDate);
  }

  const table = horizons.map((h) => {
    const rows = paths.map((p) => p.get(h)).filter(Boolean);
    const ab = rows.map((r) => r.abnormal);
    const n = ab.length;
    const sd = stdev(ab);
    const se = sd !== null && n > 1 ? sd / Math.sqrt(n) : null;
    const mu = n ? mean(ab) : null;
    return {
      horizon: h,
      events: n,
      meanAbnormal: round(mu),
      medianAbnormal: n ? round(quantile(ab, 0.5)) : null,
      positiveShare: n ? round(ab.filter((x) => x > 0).length / n, 4) : null,
      standardError: round(se),
      /* Treats events as independent, which overstates significance when
         they cluster. Read it as an upper bound. */
      tStat: se ? round(mu / se, 3) : null,
      meanStock: n ? round(mean(rows.map((r) => r.stock))) : null,
      meanMarket: n ? round(mean(rows.map((r) => r.market))) : null,
    };
  });

  const curve = [];
  for (let k = -PRE_SESSIONS; k <= post; k += 1) {
    if (k === 0) {
      curve.push({ offset: 0, meanAbnormal: 0, events: paths.length });
      continue;
    }
    const ab = paths.map((p) => p.get(k)?.abnormal).filter(isNum);
    curve.push({ offset: k, meanAbnormal: ab.length ? round(mean(ab)) : null, events: ab.length });
  }

  const notes = [];
  const used = paths.length;
  if (used < 30) {
    notes.push(`Only ${used} events could be measured. Averages from so few are mostly noise.`);
  }
  if (used && tickers.size && used / tickers.size >= 3) {
    notes.push(
      `${used} events come from ${tickers.size} tickers. Repeated events in the same stock are not independent, so the t-statistics overstate the evidence.`,
    );
  }
  if (used && dates.size && used / dates.size >= 3) {
    notes.push(
      `${used} events fall on ${dates.size} entry dates. Events on the same day share the same market move, so they count for less than their number suggests.`,
    );
  }
  if (dropped.no_prices) {
    notes.push(
      `${dropped.no_prices} events were left out because no price history was found. If those companies were delisted, the average here is too optimistic.`,
    );
  }
  if (dropped.too_recent) {
    notes.push(`${dropped.too_recent} events are too recent to have a session after them yet.`);
  }
  const longest = table[table.length - 1];
  if (longest && longest.events < used) {
    notes.push(
      `Only ${longest.events} of ${used} events have a full ${longest.horizon} sessions of history, so the longer horizons rest on fewer events.`,
    );
  }
  notes.push(
    'Returns are measured against the benchmark, before trading costs, from the open after the information became public.',
  );

  return {
    eventStudyVersion: EVENT_STUDY_VERSION,
    submitted: unique.length,
    measured: used,
    tickers: tickers.size,
    entryDates: dates.size,
    dropped,
    horizons: table,
    curve,
    notes,
  };
}
