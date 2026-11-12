/**
 * Quant Lab: event studies (Nov 2026).
 *
 * Every expected number is worked out by hand in the comment above it, not
 * copied from the code under test.
 *
 *   node --no-warnings --test scripts/check-quant-events.mjs
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  dedupeEvents,
  eventPath,
  eventStudy,
  firstSessionAfter,
} from '../src/lib/quants/event-study.js';
import { sectorExposure } from '../src/lib/quants/risk.js';

const near = (a, b, tol = 1e-6) =>
  assert.ok(Math.abs(a - b) <= tol, `${a} is not within ${tol} of ${b}`);

/* Weekday calendar from Monday 2024-01-01. */
function sessions(n) {
  const out = [];
  const d = new Date('2024-01-01T00:00:00Z');
  while (out.length < n) {
    const wd = d.getUTCDay();
    if (wd !== 0 && wd !== 6) out.push(d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return out;
}
const DATES = sessions(40);
/* Bars from explicit opens and closes. */
const bars = (opens, closes) =>
  DATES.slice(0, closes.length).map((date, i) => ({ date, open: opens[i], close: closes[i] }));
const flat = (n, v = 100) => bars(Array(n).fill(v), Array(n).fill(v));
const mapOf = (list) => new Map(list.map((b) => [b.date, b]));

test('the entry session is the first one strictly after the public date', () => {
  const b = flat(10);
  /* Public on Wednesday 01-03 (a session): entry is Thursday 01-04, index 3. */
  assert.equal(firstSessionAfter(b, '2024-01-03'), 3);
  /* Public on Saturday 01-06: entry is Monday 01-08, index 5. */
  assert.equal(firstSessionAfter(b, '2024-01-06'), 5);
  /* Public on the last session: nothing after it yet. */
  assert.equal(firstSessionAfter(b, DATES[9]), -1);
  assert.equal(firstSessionAfter(b, '2023-12-01'), 0);
});

test('several filings for one ticker on one day are one event', () => {
  const out = dedupeEvents([
    { ticker: 'aaa', date: '2024-01-03' },
    { ticker: 'AAA', date: '2024-01-03T18:00:00Z' },
    { ticker: 'AAA', date: '2024-01-04' },
    { ticker: 'BBB', date: '2024-01-03' },
    { ticker: '', date: '2024-01-03' },
    { ticker: 'CCC', date: 'soon' },
  ]);
  assert.deepEqual(out, [
    { ticker: 'AAA', date: '2024-01-03' },
    { ticker: 'BBB', date: '2024-01-03' },
    { ticker: 'AAA', date: '2024-01-04' },
  ]);
});

test('one event: returns run from the entry open, against the benchmark', () => {
  /* Public on 01-03. Entry session is index 3 (01-04).
     Stock: opens 100 that day and closes 102, then 105, then 110.
     Benchmark: opens 50, closes 50.5, 51, 52.
     h=1: stock +2%, market +1%, abnormal +1%.
     h=2: stock +5%, market +2%, abnormal +3%.
     h=3: stock +10%, market +4%, abnormal +6%.
     Before entry: closes 98 (index 2) and 96 (index 1).
     offset -1: stock -2%, market (49.5/50 - 1) = -1%, abnormal -1%. */
  const stock = bars([90, 95, 97, 100, 103, 106], [94, 96, 98, 102, 105, 110]);
  const market = bars([49, 49, 49.4, 50, 50.6, 51.5], [49, 49.2, 49.5, 50.5, 51, 52]);
  const r = eventPath({ ticker: 'AAA', date: '2024-01-03' }, stock, mapOf(market), 3);
  assert.equal(r.entryDate, '2024-01-04');
  near(r.path.get(1).abnormal, 0.01);
  near(r.path.get(2).abnormal, 0.03);
  near(r.path.get(3).abnormal, 0.06);
  near(r.path.get(3).stock, 0.1);
  near(r.path.get(3).market, 0.04);
  near(r.path.get(-1).abnormal, -0.01);
  assert.equal(r.path.has(0), false, 'offset 0 is the entry itself');
  assert.equal(r.path.has(4), false, 'no bar, no value');
});

test('an event is never priced with information from its own day', () => {
  /* The public day (01-03, index 2) closes at a wild 500. It must not appear
     in any forward return: the entry is the next open. */
  const stock = bars([100, 100, 100, 100, 100], [100, 100, 500, 101, 102]);
  const r = eventPath({ ticker: 'AAA', date: '2024-01-03' }, stock, mapOf(flat(5)), 2);
  near(r.path.get(1).stock, 0.01);
  near(r.path.get(2).stock, 0.02);
  /* It does show as the close before entry: 500 / 100 - 1 = +400%. */
  near(r.path.get(-1).stock, 4);
});

test('events that cannot be priced are counted, not guessed', () => {
  const benchmark = flat(10);
  const study = eventStudy({
    events: [
      { ticker: 'AAA', date: '2024-01-03' },
      { ticker: 'GONE', date: '2024-01-03' },
      { ticker: 'AAA', date: DATES[9] },
    ],
    bars: { AAA: flat(10) },
    benchmark,
    horizons: [1, 5],
  });
  assert.equal(study.submitted, 3);
  assert.equal(study.measured, 1);
  assert.deepEqual(study.dropped, { no_prices: 1, too_recent: 1, no_benchmark: 0, no_open: 0 });
  assert.ok(study.notes.some((n) => n.includes('delisted')));
  assert.ok(study.notes.some((n) => n.includes('too recent')));
});

test('aggregate: mean, median, share positive, standard error and t-statistic', () => {
  /* Two events, flat benchmark. After one session: A is +10%, B is -4%.
     Mean 3%, median 3%, half positive.
     Sample sd = sqrt(((0.07)^2 + (0.07)^2) / 1) = 0.0989949;
     standard error = 0.0989949 / sqrt(2) = 0.07; t = 0.03 / 0.07 = 0.4286. */
  const a = bars([100, 100, 100, 100, 100], [100, 100, 100, 110, 110]);
  const b = bars([100, 100, 100, 100, 100], [100, 100, 100, 96, 96]);
  const study = eventStudy({
    events: [
      { ticker: 'AAA', date: '2024-01-03' },
      { ticker: 'BBB', date: '2024-01-03' },
    ],
    bars: { AAA: a, BBB: b },
    benchmark: flat(5),
    horizons: [1, 2],
  });
  const h1 = study.horizons[0];
  assert.equal(h1.events, 2);
  near(h1.meanAbnormal, 0.03);
  near(h1.medianAbnormal, 0.03);
  near(h1.positiveShare, 0.5);
  near(h1.standardError, 0.07);
  near(h1.tStat, 0.429, 1e-3);
  near(h1.meanMarket, 0);
  assert.equal(study.tickers, 2);
  assert.equal(study.entryDates, 1);
  /* The path: offset 0 is the entry, by definition zero. */
  const zero = study.curve.find((p) => p.offset === 0);
  assert.equal(zero.meanAbnormal, 0);
  near(study.curve.find((p) => p.offset === 1).meanAbnormal, 0.03);
  assert.ok(study.notes.some((n) => n.includes('Only 2 events')));
});

test('longer horizons use only the events that have that much history', () => {
  /* Event 1 on 01-03 has 6 sessions after it in a 9-bar series; event 2 on
     01-10 (index 7) has only 1. */
  const a = flat(9);
  const study = eventStudy({
    events: [
      { ticker: 'AAA', date: '2024-01-03' },
      { ticker: 'AAA', date: '2024-01-10' },
    ],
    bars: { AAA: a },
    benchmark: flat(9),
    horizons: [1, 5],
  });
  assert.equal(study.horizons[0].events, 2);
  assert.equal(study.horizons[1].events, 1);
  assert.ok(study.notes.some((n) => n.includes('Only 1 of 2 events')));
});

test('clustered events are flagged', () => {
  const events = [];
  for (let i = 0; i < 6; i += 1) events.push({ ticker: 'AAA', date: DATES[2 + i] });
  const study = eventStudy({ events, bars: { AAA: flat(40) }, benchmark: flat(40), horizons: [1] });
  assert.equal(study.measured, 6);
  assert.equal(study.tickers, 1);
  assert.ok(study.notes.some((n) => n.includes('not independent')));
});

test('sector exposure: weights are grouped, unknowns are named, sorted largest first', () => {
  const rows = sectorExposure(
    [
      { ticker: 'AAPL', weight: 0.3 },
      { ticker: 'MSFT', weight: 0.2 },
      { ticker: 'JPM', weight: 0.25 },
      { ticker: 'ZZZ', weight: 0.05 },
    ],
    { AAPL: 'Technology', MSFT: 'Technology', JPM: 'Financial Services' },
  );
  /* Technology 0.5, Financial Services 0.25, unclassified 0.05. Cash (the
     other 0.2) is not a sector and is not listed. */
  assert.deepEqual(rows, [
    { sector: 'Technology', weight: 0.5, holdings: 2 },
    { sector: 'Financial Services', weight: 0.25, holdings: 1 },
    { sector: 'Unclassified', weight: 0.05, holdings: 1 },
  ]);
  assert.deepEqual(sectorExposure([], {}), []);
});
