/**
 * Home dashboard redesign (Nov 2026): the derived snapshot and formatters
 * in src/lib/dashboard/derive.js, and the wiring rules from the handoff
 * (one snapshot for every card, tokens only, no em dashes or emoji, no
 * horizontal scroll on recent transactions).
 *   node --no-warnings --test scripts/check-dashboard-redesign.mjs
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  buildDashboardData,
  diversificationBadge,
  diversificationScore,
  fmtCompactMoney,
  fmtMoney,
  fmtQty,
  fmtSignedMoney,
  fmtSignedPct,
  greetingFor,
  largestRemainder,
  niceTicks,
  pickTickIndices,
  rangeChange,
  riskBadge,
  riskScore,
  seriesRows,
} from '../src/lib/dashboard/derive.js';

const read = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

const H = (ticker, value, sector, pnl = 0, extra = {}) => ({
  ticker,
  company: `${ticker} Inc.`,
  value,
  quantity: 10,
  price: value / 10,
  dayChangeAbs: 1,
  dayChangePct: 0.5,
  unrealizedPnl: pnl,
  unrealizedPnlPct: value ? (pnl / (value - pnl)) * 100 : 0,
  sector,
  ...extra,
});

test('money and deltas: 2 decimals, always signed', () => {
  assert.equal(fmtMoney(4919865.208), '$4,919,865.21');
  assert.equal(fmtMoney(-12), '-$12.00');
  assert.equal(fmtSignedMoney(338438.71), '+$338,438.71');
  assert.equal(fmtSignedMoney(-0.5), '-$0.50');
  assert.equal(fmtSignedMoney(0), '$0.00');
  assert.equal(fmtSignedPct(7.284), '+7.28%');
  assert.equal(fmtSignedPct(-4.74), '-4.74%');
  assert.equal(fmtSignedPct(null), 'N/A');
  assert.equal(fmtCompactMoney(4919865), '$4.92M');
  assert.equal(fmtCompactMoney(4200000), '$4.20M');
  assert.equal(fmtQty(5206.2), '5,206.2');
});

test('largest remainder always sums to 100', () => {
  assert.deepEqual(largestRemainder([75.6, 14.6, 9.8]), [75, 15, 10]);
  assert.deepEqual(largestRemainder([1, 1, 1]), [34, 33, 33]);
  for (let k = 0; k < 50; k += 1) {
    const v = Array.from({ length: 1 + (k % 7) }, (_, i) => ((i + 1) * 7919 * (k + 3)) % 1000);
    assert.equal(
      largestRemainder(v).reduce((a, b) => a + b, 0),
      100,
    );
  }
});

test('axis helpers: nice bounds, about 5 y ticks, 6 x ticks', () => {
  const t = niceTicks(4250000, 4920000, 5);
  assert.equal(t[0], 4200000);
  assert.equal(t.at(-1), 5000000);
  assert.ok(t.length >= 4 && t.length <= 7);
  assert.deepEqual(pickTickIndices(30, 6), [0, 6, 12, 17, 23, 29]);
  assert.deepEqual(pickTickIndices(3, 6), [0, 1, 2]);
});

test('greeting by local hour', () => {
  assert.equal(greetingFor(new Date(2026, 10, 9, 8)), 'morning');
  assert.equal(greetingFor(new Date(2026, 10, 9, 13)), 'afternoon');
  assert.equal(greetingFor(new Date(2026, 10, 9, 19)), 'evening');
});

test('scores and badges', () => {
  assert.equal(riskScore([], 1000), 0);
  assert.equal(riskScore([H('A', 1000, 'Tech')], 0), 10);
  assert.equal(diversificationScore([H('A', 1000, 'Tech')]), 0);
  const spread = ['Tech', 'Health', 'Energy', 'Finance', 'Utilities'].flatMap((sec, i) => [
    H(`A${i}`, 100, sec),
    H(`B${i}`, 100, sec),
  ]);
  assert.equal(diversificationScore(spread), 100);
  assert.deepEqual(riskBadge(3.9).label, 'Low');
  assert.deepEqual(riskBadge(6.2), { label: 'Moderate', tone: 'warn' });
  assert.deepEqual(riskBadge(7).label, 'High');
  assert.deepEqual(diversificationBadge(83), { label: 'Well diversified', tone: 'up' });
  assert.equal(diversificationBadge(60).label, 'Moderate');
  assert.equal(diversificationBadge(40).label, 'Concentrated');
});

test('snapshot integrity (handoff section 4)', () => {
  const holdings = [
    H('ORCL', 1291493.13, 'Technology', 291493),
    H('GLW', 435384.82, 'Technology', 78179),
    H('TSLA', 552737.91, 'Consumer Cyclical', 52738, { price: 415.88, dayChangePct: 1.2 }),
    H('LLY', 247588.1, 'Healthcare', -12000),
  ];
  const d = buildDashboardData({
    holdings,
    cash: 383152.76,
    startingValue: 2500000,
    watchlist: [{ ticker: 'TSLA', company: 'Tesla', price: 378.05, dayChangePct: 5.54 }],
    transactions: [
      { id: 1, ticker: 'MU', side: 'sell', total: 10, ts: '2026-05-01T00:00:00Z' },
      { id: 2, ticker: 'ORCL', side: 'buy', total: 20, ts: '2026-06-01T00:00:00Z' },
    ],
  });
  const sum = holdings.reduce((s, h) => s + h.value, 0) + 383152.76;
  assert.ok(Math.abs(d.totals.currentValue - sum) < 0.005, 'value = holdings + cash');
  assert.equal(d.watchlist[0].price, 415.88, 'one price per ticker');
  assert.equal(d.watchlist[0].dayChangePct, 1.2);
  assert.equal(
    d.sectors.reduce((s, x) => s + x.pct, 0),
    100,
    'sectors sum to 100',
  );
  assert.ok(d.sectors.some((x) => x.isCash));
  assert.equal(d.holdings[0].ticker, 'ORCL', 'sorted by value');
  assert.equal(d.bestPerformer.ticker, 'ORCL');
  // Weights come from holdings; footer P&L belongs to its own ticker.
  for (const w of d.profits.topWeights) {
    const h = d.holdings.find((x) => x.ticker === w.ticker);
    assert.equal(w.pnl, h.unrealizedPnl);
    assert.ok(Math.abs(w.weightPct - (h.value / d.totals.currentValue) * 100) < 1e-9);
  }
  // Bars plus realized reconcile with total P&L; losses are listed.
  const unreal = holdings.reduce((s, h) => s + h.unrealizedPnl, 0);
  assert.ok(Math.abs(unreal + d.profits.realized - d.totals.totalPnl) < 0.005);
  assert.ok(d.profits.rows.some((r) => r.pnl < 0));
  assert.equal(d.transactions[0].ticker, 'ORCL', 'newest first');
  assert.equal(d.transactions[1].amount, -10, 'sells are negative');
});

test('series rows pin the last point to the live value', () => {
  const pts = [
    { at: '2026-10-11T00:00:00Z', value: 100 },
    { at: '2026-11-09T00:00:00Z', value: 110 },
  ];
  const rows = seriesRows(pts, 120);
  assert.equal(rows.at(-1).value, 120);
  assert.deepEqual(rangeChange(rows), { abs: 20, pct: 20 });
});

test('wiring: one snapshot, tokens only, copy rules', () => {
  const page = read('src/components/dashboard/home/DashboardPage.jsx');
  assert.match(page, /buildDashboardData\(/);
  assert.match(page, /className="ez-canvas"/);
  for (const hook of [
    'useMockPortfolio',
    'usePlaidPortfolioSummary',
    'useWatchlists',
    'usePortfolioValueSeries',
  ])
    assert.match(page, new RegExp(hook), `${hook} still feeds the page`);
  const css = read('src/app/(dashboard)/home-dashboard/dashboard.module.css').replace(
    /\/\*[\s\S]*?\*\//g,
    '',
  );
  assert.doesNotMatch(css, /#[0-9a-f]{3,8}\b|rgba?\(/i, 'no raw colours');
  assert.match(css, /prefers-reduced-motion: reduce/);
  const tx = css.match(/\.txTable[^{]*\{[^}]*\}/g)?.join('') || '';
  assert.doesNotMatch(tx, /min-width/, 'transactions table never forces a scroll');
  for (const f of ['DashboardPage', 'sections', 'primitives', 'SnapshotChart']) {
    const src = read(`src/components/dashboard/home/${f}.jsx`);
    assert.ok(!src.includes('—'), `${f}: no em dash`);
    assert.doesNotMatch(src, /[\u{1F300}-\u{1FAFF}ⓘ▾↗→‹›]/u, `${f}: no emoji or glyph icons`);
    assert.doesNotMatch(src, /lucide-react/);
    assert.doesNotMatch(src, /#[0-9a-fA-F]{6}\b/, `${f}: no hex`);
  }
});
