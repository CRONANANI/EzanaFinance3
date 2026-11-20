/* Unit tests for src/lib/research/analyst-accuracy.js (Nov 20, 2026). */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ratingDirection,
  scoreCall,
  closeSeries,
  rankAnalysts,
  shrunkScore,
  normTarget,
} from '../src/lib/research/analyst-accuracy.js';

const DAY = 864e5;
const iso = (t) => new Date(t).toISOString().slice(0, 10);
/* Daily closes from start, priced by fn(dayIndex). */
function series(start, days, fn) {
  const t0 = Date.parse(`${start}T00:00:00Z`);
  return Array.from({ length: days }, (_, i) => ({ date: iso(t0 + i * DAY), close: fn(i) }));
}

test('rating labels map to a direction', () => {
  assert.equal(ratingDirection('Overweight'), 'bull');
  assert.equal(ratingDirection('Strong Buy'), 'bull');
  assert.equal(ratingDirection('Underperform'), 'bear');
  assert.equal(ratingDirection('Sell'), 'bear');
  assert.equal(ratingDirection('Neutral'), null);
  assert.equal(ratingDirection('Equal-Weight'), null);
  assert.equal(ratingDirection('Market Perform'), null);
});

test('a bullish call is right when the stock beats SPY over 12 months', () => {
  const stock = closeSeries(series('2023-01-01', 800, (i) => 100 + i * 0.1));
  const flat = closeSeries(series('2023-01-01', 800, () => 400));
  const today = '2025-06-01';
  const bull = scoreCall({ date: '2023-02-01', direction: 'bull' }, stock, flat, today);
  assert.equal(bull.right, true);
  assert.ok(bull.callExcess > 0);
  const bear = scoreCall({ date: '2023-02-01', direction: 'bear' }, stock, flat, today);
  assert.equal(bear.right, false);
  assert.ok(bear.callExcess < 0);
});

test('calls under 12 months old are not scored', () => {
  const s = closeSeries(series('2023-01-01', 800, () => 100));
  assert.equal(scoreCall({ date: '2025-01-01', direction: 'bull' }, s, s, '2025-06-01'), null);
});

test('target hit checks every close in the window', () => {
  /* Spikes to 150 on day 100, ends back at 100. */
  const stock = closeSeries(series('2023-01-01', 800, (i) => (i === 100 ? 150 : 100)));
  const spy = closeSeries(series('2023-01-01', 800, () => 400));
  const r = scoreCall({ date: '2023-01-02', direction: 'bull', target: 140, posted: 100 }, stock, spy, '2025-01-01');
  assert.equal(r.targetHit, true);
  const miss = scoreCall({ date: '2023-01-02', direction: 'bull', target: 160, posted: 100 }, stock, spy, '2025-01-01');
  assert.equal(miss.targetHit, false);
});

test('shrinkage keeps two lucky calls below a long strong record', () => {
  assert.ok(shrunkScore(2, 2) < shrunkScore(16, 20));
  assert.equal(shrunkScore(0, 0), 0.5);
});

test('ranking: needs 3 scored calls, dedupes repeats, best first', () => {
  const stockRows = series('2019-01-01', 2400, (i) => 50 + i * 0.05); // steady climb
  const spyRows = series('2019-01-01', 2400, () => 300); // flat market
  const today = '2025-06-01';
  const targets = [];
  /* Good bull: 4 bullish targets a quarter apart (all right). */
  for (const d of ['2020-01-15', '2020-05-15', '2020-09-15', '2021-01-15'])
    targets.push({ publishedDate: d, analystName: 'Ana Good', analystCompany: 'Firm A', priceTarget: 500, priceWhenPosted: 60 });
  /* Bad bear: 4 bearish targets (all wrong in a rising stock). */
  for (const d of ['2020-02-15', '2020-06-15', '2020-10-15', '2021-02-15'])
    targets.push({ publishedDate: d, analystName: 'Bo Bear', analystCompany: 'Firm B', priceTarget: 10, priceWhenPosted: 60 });
  /* Repeater: 5 bullish targets within 30 days counts as 1 call: unranked. */
  for (const d of ['2020-03-01', '2020-03-05', '2020-03-10', '2020-03-15', '2020-03-20'])
    targets.push({ publishedDate: d, analystName: 'Rae Peat', analystCompany: 'Firm C', priceTarget: 200, priceWhenPosted: 60 });
  const grades = [
    { date: '2020-01-10', gradingCompany: 'Big Bank', newGrade: 'Buy' },
    { date: '2020-06-10', gradingCompany: 'Big Bank', newGrade: 'Overweight' },
    { date: '2021-01-10', gradingCompany: 'Big Bank', newGrade: 'Buy' },
    { date: '2020-01-10', gradingCompany: 'Neutral Co', newGrade: 'Hold' },
    { date: '2020-06-10', gradingCompany: 'Neutral Co', newGrade: 'Neutral' },
    { date: '2021-01-10', gradingCompany: 'Neutral Co', newGrade: 'Hold' },
  ];
  const out = rankAnalysts({ targets, grades, stockRows, spyRows, today });
  assert.deepEqual(out.analysts.map((a) => a.name), ['Ana Good', 'Bo Bear']);
  assert.equal(out.analysts[0].hitRate, 1);
  assert.equal(out.analysts[1].hitRate, 0);
  assert.equal(out.analysts[0].calls, 4);
  assert.equal(out.coverage.analystsSeen, 3);
  /* Holds carry no direction: Neutral Co is seen but unranked. */
  assert.deepEqual(out.firms.map((f) => f.name), ['Big Bank']);
  assert.equal(out.firms[0].latest.rating, 'Buy');
});

test('bad rows are skipped, not invented', () => {
  assert.equal(normTarget({ publishedDate: '2024-01-01', analystName: '', priceTarget: 10 }), null);
  assert.equal(normTarget({ publishedDate: 'nope', analystName: 'X', priceTarget: 10 }), null);
  const out = rankAnalysts({ targets: [null, {}, 5], grades: [null], stockRows: [], spyRows: [] });
  assert.deepEqual(out.analysts, []);
  assert.deepEqual(out.firms, []);
});
