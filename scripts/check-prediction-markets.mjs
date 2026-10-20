#!/usr/bin/env node
/* Prediction Markets page model (src/lib/prediction-markets/page-model.js).
   Covers the edges 06-DATA.md section 4 names: gaps exactly at 1, 2 and 4
   points net; implied 0 and 1; Kalshi rows with null liquidity; markets with
   no spread; squarify areas; ET day boundaries around midnight.
   Usage: node --no-warnings --test scripts/check-prediction-markets.mjs */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  daysUntil,
  horizonEnd,
  horizonEvents,
  horizonMarkets,
  keywords,
  monthTicks,
  relatedEvents,
  relatedMarkets,
} from '../src/lib/prediction-markets/horizon-model.js';
import {
  availableWindows,
  coversWindow,
  windowMetrics,
} from '../src/lib/prediction-markets/window-metrics.js';
import {
  PAGE_CATEGORIES,
  categoryCounts,
  categoryTiles,
  closingByDay,
  convictionLayout,
  convictionPoint,
  crossVenueGap,
  dayKey,
  decidedness,
  decidedOpacity,
  downsample,
  edgeRows,
  efficiency,
  efficiencyBar,
  evPct,
  identicon,
  outcomeLabel,
  filterRows,
  isHot,
  largestMoves,
  mostUncertain,
  netGap,
  normalizeCategory,
  orderingVolume,
  pulseStats,
  rankMovers,
  seriesChange,
  sparkPath,
  squarify,
  tableRows,
  tickerMovers,
  tileOpacity,
  windowChange,
  windowVolume,
} from '../src/lib/prediction-markets/page-model.js';

const row = (o) => ({
  id: o.id,
  venue: o.venue || 'polymarket',
  question: o.question || `Market ${o.id}`,
  p: o.p ?? 0.5,
  change24h: o.change24h ?? null,
  change7d: o.change7d ?? null,
  change30d: o.change30d ?? null,
  vol: o.vol ?? 1_000_000,
  vol24h: o.vol24h ?? 50_000,
  vol7d: o.vol7d ?? null,
  vol30d: o.vol30d ?? null,
  volNorm: o.volNorm ?? null,
  liq: o.liq ?? null,
  spread: o.spread === undefined ? 0.01 : o.spread,
  closes: o.closes ?? null,
  category: o.category ?? null,
});

/* ── categories ── */

test('normalizeCategory: Polymarket tags take the first page category in order', () => {
  // The Iran invasion market carries Politics (2) and Geopolitics (100265).
  assert.equal(
    normalizeCategory({ venue: 'polymarket', tags: ['104007', '2', '100265'] }),
    'politics',
  );
  assert.equal(normalizeCategory({ venue: 'polymarket', tags: ['596', '103123'] }), 'culture');
  assert.equal(normalizeCategory({ venue: 'polymarket', tags: ['120'] }), 'economy');
  assert.equal(normalizeCategory({ venue: 'polymarket', tags: ['999'] }), null);
  assert.equal(normalizeCategory({ venue: 'polymarket', tags: [] }), null);
  assert.equal(normalizeCategory({ platform: 'polymarket', tag_ids: ['1'] }), 'sports');
});

test('normalizeCategory: Kalshi categories map case-insensitively', () => {
  assert.equal(normalizeCategory({ venue: 'kalshi', category: 'Elections' }), 'elections');
  assert.equal(normalizeCategory({ venue: 'kalshi', category: 'financials' }), 'economy');
  assert.equal(normalizeCategory({ venue: 'kalshi', category: 'Entertainment' }), 'culture');
  assert.equal(normalizeCategory({ venue: 'kalshi', category: 'Companies' }), 'tech');
  assert.equal(normalizeCategory({ venue: 'kalshi', category: 'Weather' }), null);
  assert.equal(PAGE_CATEGORIES.length, 8);
});

test('filterRows and categoryCounts follow category, venue and search', () => {
  const rows = [
    row({ id: 'a', category: 'politics', question: 'Will the Senate flip?' }),
    row({ id: 'b', category: 'sports', venue: 'kalshi', question: 'Green Bay wins' }),
    row({ id: 'c', category: null, question: 'Unmapped market' }),
  ];
  assert.deepEqual(
    filterRows(rows, { category: 'politics' }).map((r) => r.id),
    ['a'],
  );
  assert.deepEqual(
    filterRows(rows, { venue: 'kalshi' }).map((r) => r.id),
    ['b'],
  );
  assert.deepEqual(
    filterRows(rows, { q: 'SENATE' }).map((r) => r.id),
    ['a'],
  );
  assert.equal(filterRows(rows, { category: 'all', venue: 'all' }).length, 3);
  const c = categoryCounts(rows);
  assert.equal(c.all, 3);
  assert.equal(c.politics, 1);
  assert.equal(categoryCounts(rows, 'kalshi').all, 1);
  assert.equal(categoryCounts(rows, 'kalshi').politics, 0);
});

/* ── gaps and edge ── */

test('netGap at exactly 1, 2 and 4 points net of half the spread', () => {
  assert.equal(netGap(0.3, 0.315, 0.005), 0.01);
  assert.equal(netGap(0.3, 0.325, 0.005), 0.02);
  assert.equal(netGap(0.3, 0.345, 0.005), 0.04);
  assert.equal(netGap(0.5, 0.4, 0), 0.1);
  assert.equal(netGap(null, 0.4), null);
});

test('evPct delegates to computeEdge, including implied 0 and 1 and the floor', () => {
  assert.equal(evPct(0.55, 0.3), 35.7);
  assert.equal(evPct(0.3, 0), 30);
  // implied 1: the formula divides by zero, so computeEdge withholds EV%.
  assert.equal(evPct(0.9, 1), null);
  // under 1 point: withheld.
  assert.equal(evPct(0.305, 0.3), null);
  // a 2-point spread eats 1 point of a 1.5-point gap.
  assert.equal(evPct(0.315, 0.3, 0.02), null);
  assert.equal(evPct(0.5, null), null);
});

test('crossVenueGap: net of half of each venue spread, tiered, withheld under 1 point', () => {
  const high = crossVenueGap({ p: 0.4, spread: 0.01 }, { p: 0.45, spread: 0.01 });
  assert.equal(high.confidence, 'high');
  assert.equal(high.netGap, 0.04);
  const med = crossVenueGap({ p: 0.4, spread: 0.02 }, { p: 0.43, spread: 0 });
  assert.equal(med.confidence, 'medium');
  assert.equal(med.netGap, 0.02);
  const low = crossVenueGap({ p: 0.4, spread: 0 }, { p: 0.39, spread: 0 });
  assert.equal(low.confidence, 'low');
  const none = crossVenueGap({ p: 0.4, spread: 0.02 }, { p: 0.415, spread: 0.01 });
  assert.equal(none.confidence, 'none');
  assert.equal(none.netGap, null);
  // markets with no spread count it as zero rather than failing.
  assert.equal(crossVenueGap({ p: 0.4 }, { p: 0.44 }).confidence, 'high');
});

test('edgeRows drops sub-floor pairs, sorts, filters High only and search', () => {
  const pairs = [
    {
      billId: 'a',
      billTitle: 'NO FAKES Act',
      market: { question: 'NO FAKES law?' },
      implied: 0.08,
      model: 0.03,
      spread: 0.01,
      edge: -0.05,
      confidence: 'high',
    },
    {
      billId: 'b',
      billTitle: 'PETS Act',
      market: { question: 'PETS law?' },
      implied: 0.05,
      model: 0.075,
      spread: 0.01,
      edge: 0.025,
      confidence: 'medium',
    },
    {
      billId: 'c',
      billTitle: 'X Act',
      market: { question: 'X?' },
      implied: 0.03,
      model: 0.03,
      spread: 0.01,
      edge: null,
      confidence: 'none',
    },
  ];
  const rows = edgeRows(pairs);
  assert.deepEqual(
    rows.map((r) => r.billId),
    ['a', 'b'],
  );
  assert.equal(rows[0].netGap, 0.045);
  assert.deepEqual(
    edgeRows(pairs, { highOnly: true }).map((r) => r.billId),
    ['a'],
  );
  assert.deepEqual(
    edgeRows(pairs, { q: 'pets' }).map((r) => r.billId),
    ['b'],
  );
});

/* ── traders ── */

test('efficiency and its bar', () => {
  assert.equal(efficiency(202394.5, 416521), 202394.5 / 416521);
  assert.equal(efficiency(100, 0), null);
  assert.equal(efficiency(100, null), null);
  assert.equal(efficiencyBar(0.25), 0.5);
  assert.equal(efficiencyBar(0.9), 1);
  assert.equal(efficiencyBar(-0.1), 0);
  assert.equal(efficiencyBar(null), 0);
});

/* ── decidedness and hot ── */

test('decidedness: 0 at 50%, 1 at the extremes', () => {
  assert.equal(decidedness(0.5), 0);
  assert.equal(decidedness(0), 1);
  assert.equal(decidedness(1), 1);
  assert.equal(decidedness(0.75), 0.5);
  assert.equal(decidedOpacity(0.5), 0.06);
  assert.equal(decidedOpacity(1), 0.56);
});

test('isHot: 3x the 30-day norm, else a quarter of lifetime volume in 24h', () => {
  assert.equal(isHot({ vol24h: 300, vol: 10_000 }, 100), true);
  assert.equal(isHot({ vol24h: 299, vol: 10_000 }, 100), false);
  assert.equal(isHot({ vol24h: 2_500, vol: 10_000 }, null), true);
  assert.equal(isHot({ vol24h: 2_400, vol: 10_000 }, null), false);
  assert.equal(isHot({ vol24h: 0, vol: 10 }), false);
});

/* ── movers ── */

test('rankMovers by moves: absolute change, ties by volume, under 1 point excluded', () => {
  const rows = [
    row({ id: 'up', change24h: 0.08, vol24h: 10_000 }),
    row({ id: 'down', change24h: -0.12, vol24h: 10_000 }),
    row({ id: 'tieA', change24h: 0.05, vol24h: 20_000 }),
    row({ id: 'tieB', change24h: -0.05, vol24h: 90_000 }),
    row({ id: 'flat', change24h: 0.005, vol24h: 90_000 }),
    row({ id: 'thin', change24h: 0.3, vol24h: 10 }), // under the venue volume floor
    row({ id: 'certain', p: 0.99, change24h: 0.2 }), // outside 3..97%
  ];
  assert.deepEqual(
    rankMovers(rows).map((r) => r.id),
    ['down', 'up', 'tieB', 'tieA'],
  );
  assert.deepEqual(
    rankMovers(rows, 'moves', 2).map((r) => r.id),
    ['down', 'up'],
  );
});

test('rankMovers by traded and window selection', () => {
  const rows = [
    row({ id: 'a', vol24h: 10_000, vol7d: 900_000, change7d: 0.02 }),
    row({ id: 'b', vol24h: 80_000, vol7d: 100_000, change7d: -0.2 }),
    row({ id: 'k', venue: 'kalshi', vol24h: 50_000, vol7d: 400_000 }),
  ];
  assert.deepEqual(
    rankMovers(rows, 'traded').map((r) => r.id),
    ['b', 'k', 'a'],
  );
  assert.deepEqual(
    rankMovers(rows, 'traded', 8, '7d').map((r) => r.id),
    ['a', 'k', 'b'],
  );
  assert.deepEqual(
    rankMovers(rows, 'moves', 8, '7d').map((r) => r.id),
    ['b', 'a'],
  );
  assert.equal(windowChange(rows[1], '7d'), -0.2);
  assert.equal(windowVolume(rows[0], '30d'), null);
  assert.equal(orderingVolume(rows[0], '30d'), 0);
});

test('tickerMovers: 12 largest absolute 24h movers', () => {
  const rows = Array.from({ length: 20 }, (_, i) => row({ id: `m${i}`, change24h: (i + 1) / 100 }));
  const t = tickerMovers(rows);
  assert.equal(t.length, 12);
  assert.equal(t[0].id, 'm19');
});

/* ── chart ── */

test('largestMoves returns the n largest single-period moves in time order', () => {
  const pts = [
    0.315, 0.305, 0.305, 0.305, 0.315, 0.305, 0.275, 0.305, 0.295, 0.265, 0.275, 0.295, 0.285,
  ].map((p, i) => ({ t: i, p }));
  const m = largestMoves(pts, 2);
  assert.deepEqual(
    m.map((x) => x.index),
    [6, 7],
  );
  assert.equal(m[0].delta, -0.03);
  assert.equal(m[1].delta, 0.03);
  assert.deepEqual(largestMoves([{ p: 0.5 }], 2), []);
});

test('seriesChange, downsample and sparkPath', () => {
  const pts = [0.315, 0.3, 0.285].map((p, i) => ({ t: i, p }));
  assert.deepEqual(seriesChange(pts), { from: 0.315, to: 0.285, change: -0.03 });
  assert.equal(seriesChange([{ p: 0.4 }]), null);
  const long = Array.from({ length: 100 }, (_, i) => ({ t: i, p: i / 100 }));
  const d = downsample(long, 8);
  assert.equal(d.length, 8);
  assert.equal(d[0].t, 0);
  assert.equal(d[7].t, 99);
  const path = sparkPath(pts, 64, 24);
  assert.equal(path.split(' ').length, 3);
  assert.equal(sparkPath([{ p: 0.4 }], 64, 24), '');
  // a flat series draws a flat line, not a division by zero
  assert.ok(!sparkPath([{ p: 0.4 }, { p: 0.4 }], 64, 24).includes('NaN'));
});

/* ── treemap ── */

test('squarify: rect areas equal input areas within 0.5% and tile the box', () => {
  const items = [
    { key: 'sports', value: 1104 },
    { key: 'elections', value: 466 },
    { key: 'politics', value: 412 },
    { key: 'crypto', value: 286 },
    { key: 'geopolitics', value: 188 },
    { key: 'culture', value: 124 },
    { key: 'economy', value: 131 },
    { key: 'tech', value: 97 },
  ];
  const W = 520;
  const H = 440;
  const rects = squarify(items, W, H);
  assert.equal(rects.length, items.length);
  const total = items.reduce((s, i) => s + i.value, 0);
  for (const r of rects) {
    const want = (r.value / total) * W * H;
    assert.ok(Math.abs(r.w * r.h - want) / want < 0.005, `${r.key} area off`);
    assert.ok(r.x >= -1e-6 && r.y >= -1e-6 && r.x + r.w <= W + 1e-6 && r.y + r.h <= H + 1e-6);
  }
  const covered = rects.reduce((s, r) => s + r.w * r.h, 0);
  assert.ok(Math.abs(covered - W * H) < 1e-6 * W * H);
  // deterministic
  assert.deepEqual(squarify(items, W, H), rects);
  assert.deepEqual(squarify([], W, H), []);
  assert.deepEqual(squarify([{ key: 'z', value: 0 }], W, H), []);
});

test('categoryTiles: per-venue volume, count and average move in points', () => {
  const rows = [
    row({ id: 'a', category: 'politics', vol24h: 100, change24h: 0.02 }),
    row({ id: 'b', category: 'politics', vol24h: 300, change24h: -0.04 }),
    row({ id: 'k', venue: 'kalshi', category: 'politics', vol24h: 1000, change24h: 0.1 }),
    row({ id: 'n', category: null, vol24h: 999 }),
  ];
  const poly = categoryTiles(rows, 'polymarket');
  assert.equal(poly.length, 1);
  assert.equal(poly[0].value, 400);
  assert.equal(poly[0].count, 2);
  assert.equal(poly[0].avgMove, -1);
  assert.equal(categoryTiles(rows, 'both')[0].value, 1400);
  assert.equal(tileOpacity(0), 0.1);
  assert.equal(tileOpacity(-3), 0.48);
  assert.equal(tileOpacity(9), 0.48);
});

/* ── calendar ── */

test('dayKey and closingByDay respect ET day boundaries around midnight', () => {
  // 03:30 UTC on Oct 20 is 23:30 ET on Oct 19 (EDT, UTC-4).
  assert.equal(dayKey('2026-10-20T03:30:00Z'), '2026-10-19');
  assert.equal(dayKey('2026-10-20T04:30:00Z'), '2026-10-20');
  // across the November DST change: 04:30 UTC Nov 2 is 23:30 ET Nov 1 (EST).
  assert.equal(dayKey('2026-11-02T04:30:00Z'), '2026-11-01');
  const now = new Date('2026-10-19T12:00:00Z'); // 08:00 ET Oct 19
  const rows = [
    row({ id: 'tonight', closes: '2026-10-20T03:30:00Z', vol24h: 10 }),
    row({ id: 'tomorrow', closes: '2026-10-20T04:30:00Z' }),
    row({ id: 'day6', closes: '2026-10-25T20:00:00Z' }),
    row({ id: 'day7', closes: '2026-10-26T20:00:00Z' }),
    row({ id: 'past', closes: '2026-10-19T11:00:00Z' }),
    row({ id: 'none', closes: null }),
  ];
  const days = closingByDay(rows, now);
  assert.equal(days.length, 7);
  assert.equal(days[0].date, '2026-10-19');
  assert.deepEqual(days[0].ids, ['tonight']);
  assert.deepEqual(days[1].ids, ['tomorrow']);
  assert.deepEqual(days[6].ids, ['day6']);
  assert.equal(
    days.reduce((s, d) => s + d.count, 0),
    3,
  );
});

test('closingByDay keeps the top 3 by volume and counts the rest', () => {
  const now = new Date('2026-10-19T12:00:00Z');
  const rows = [1, 5, 3, 9, 2].map((v, i) =>
    row({ id: `d${i}`, closes: '2026-10-21T18:00:00Z', vol24h: v * 1000 }),
  );
  const [, , day2] = closingByDay(rows, now);
  assert.equal(day2.count, 5);
  assert.deepEqual(
    day2.top3.map((r) => r.id),
    ['d3', 'd1', 'd2'],
  );
});

test('mostUncertain: within 7 days, closest to 50%', () => {
  const now = new Date('2026-10-19T12:00:00Z');
  const rows = [
    row({ id: 'coin', p: 0.49, closes: '2026-10-22T00:00:00Z' }),
    row({ id: 'lean', p: 0.6, closes: '2026-10-22T00:00:00Z' }),
    row({ id: 'sure', p: 0.95, closes: '2026-10-22T00:00:00Z' }),
    row({ id: 'late', p: 0.5, closes: '2026-11-22T00:00:00Z' }),
    row({ id: 'done', p: 0.5, closes: '2026-10-18T00:00:00Z' }),
  ];
  assert.deepEqual(
    mostUncertain(rows, 3, now).map((r) => r.id),
    ['coin', 'lean', 'sure'],
  );
});

test('pulseStats: counts by venue, volumes per venue with units, never summed', () => {
  const now = new Date('2026-10-19T12:00:00Z');
  const rows = [
    row({ id: 'p1', vol24h: 100_000, change24h: 0.05, closes: '2026-10-21T18:00:00Z' }),
    row({ id: 'p2', vol24h: 50_000, change24h: -0.09 }),
    row({ id: 'k1', venue: 'kalshi', vol24h: 7_000, change24h: 0.02 }),
  ];
  const s = pulseStats(rows, '24h', now);
  assert.deepEqual(s.open, { polymarket: 2, kalshi: 1, total: 3 });
  assert.equal(s.volume.polymarket.value, 150_000);
  assert.equal(s.volume.polymarket.unit, 'usd');
  assert.equal(s.volume.kalshi.value, 7_000);
  assert.equal(s.volume.kalshi.unit, 'contracts');
  assert.equal(s.volume.total, undefined);
  assert.equal(s.biggestMover.id, 'p2');
  assert.equal(s.closingTotal, 1);
  assert.equal(s.peak.date, '2026-10-21');
});

/* ── conviction ── */

test('convictionPoint: liquidity on Polymarket, volume on Kalshi, null without a spread', () => {
  assert.deepEqual(convictionPoint(row({ id: 'p', liq: 880_000, spread: 0.01, vol24h: 552_000 })), {
    x: 880_000,
    xBasis: 'liquidity',
    spreadPts: 1,
    size: 552_000,
  });
  const k = convictionPoint(
    row({ id: 'k', venue: 'kalshi', liq: null, vol: 1_240_000, spread: 0.02 }),
  );
  assert.equal(k.xBasis, 'volume');
  assert.equal(k.x, 1_240_000);
  assert.equal(convictionPoint(row({ id: 'n', spread: null })), null);
  assert.equal(convictionPoint(row({ id: 'z', venue: 'kalshi', vol: 0 })), null);
});

test('convictionLayout: log x, clamped, trust zone, radius in range', () => {
  const pts = convictionLayout([
    row({ id: 'deep', liq: 1_000_000, spread: 0.01, vol24h: 500_000 }),
    row({ id: 'thin', liq: 2_000, spread: 0.08, vol24h: 100 }),
    row({ id: 'huge', liq: 5e8, spread: 0.2, vol24h: 1 }),
  ]);
  const by = Object.fromEntries(pts.map((p) => [p.row.id, p]));
  assert.equal(by.deep.nx, 0.75);
  assert.equal(by.deep.trusted, true);
  assert.equal(by.thin.trusted, false);
  assert.equal(by.huge.nx, 1);
  assert.equal(by.huge.ny, 1);
  assert.equal(by.huge.clipped, true);
  for (const p of pts) assert.ok(p.r >= 3 && p.r <= 9);
});

/* ── table ── */

test('tableRows orders by volume and filters to one ET closing day', () => {
  const rows = [
    row({ id: 'a', vol: 5, closes: '2026-10-20T03:30:00Z' }),
    row({ id: 'b', vol: 9, closes: '2026-10-21T18:00:00Z' }),
  ];
  assert.deepEqual(
    tableRows(rows).map((r) => r.id),
    ['b', 'a'],
  );
  assert.deepEqual(
    tableRows(rows, { closesOn: '2026-10-19' }).map((r) => r.id),
    ['a'],
  );
});

/* ── window metrics (crons) ── */

test('windowMetrics: change and volume only when history reaches the window start', () => {
  const now = new Date('2026-11-20T12:00:00Z');
  const at = (days, hours = 0) =>
    new Date(now.getTime() - days * 86400000 + hours * 3600000).toISOString();
  const m = windowMetrics(
    {
      current: { probability: 0.285, volume: 9_300_000 },
      base7: { probability: 0.315, volume: 8_900_000, captured_at: at(7, 1) },
      base30: { probability: 0.2, volume: 6_000_000, captured_at: at(30, 2) },
      earliest: { volume: 6_000_000, captured_at: at(30, 2) },
    },
    now,
  );
  assert.equal(m.change_7d, -0.03);
  assert.equal(m.volume_7d, 400_000);
  assert.equal(m.change_30d, 0.085);
  assert.equal(m.volume_30d, 3_300_000);
  assert.ok(Math.abs(m.volume_norm - 3_300_000 / (30 - 2 / 24)) < 1);
});

test('windowMetrics: a market first seen 3 days ago has no 7d figures and no norm', () => {
  const now = new Date('2026-11-20T12:00:00Z');
  const threeDays = new Date(now.getTime() - 3 * 86400000).toISOString();
  const m = windowMetrics(
    {
      current: { probability: 0.5, volume: 1000 },
      base7: { probability: 0.4, volume: 500, captured_at: threeDays },
      base30: { probability: 0.4, volume: 500, captured_at: threeDays },
      earliest: { volume: 500, captured_at: threeDays },
    },
    now,
  );
  assert.deepEqual(m, {
    change_7d: null,
    change_30d: null,
    volume_7d: null,
    volume_30d: null,
    volume_norm: null,
  });
});

test('windowMetrics: volume never goes negative, and 10 days of history yields a norm', () => {
  const now = new Date('2026-11-20T12:00:00Z');
  const tenDays = new Date(now.getTime() - 10 * 86400000).toISOString();
  const m = windowMetrics(
    {
      current: { probability: 0.5, volume: 100 },
      base7: {
        probability: 0.5,
        volume: 900,
        captured_at: new Date(now.getTime() - 7 * 86400000).toISOString(),
      },
      base30: null,
      earliest: { volume: 0, captured_at: tenDays },
    },
    now,
  );
  assert.equal(m.volume_7d, 0);
  assert.equal(m.volume_norm, 10);
});

test('availableWindows and coversWindow allow one cron interval of slack', () => {
  const now = new Date('2026-11-20T12:00:00Z');
  const ago = (h) => new Date(now.getTime() - h * 3600000).toISOString();
  assert.deepEqual(availableWindows(null, now), { '24h': true, '7d': false, '30d': false });
  assert.deepEqual(availableWindows(ago(7 * 24 - 2), now), {
    '24h': true,
    '7d': true,
    '30d': false,
  });
  assert.equal(coversWindow(ago(7 * 24 - 4), now, 7 * 86400000), false);
  assert.equal(availableWindows(ago(31 * 24), now)['30d'], true);
});

/* ── traders and outcomes ── */

test('identicon is deterministic, mirrored and never blank', () => {
  const a = identicon('0x60a92c8620846d81f5ea17b0564e0d4b7c545a71');
  assert.deepEqual(identicon('0x60a92c8620846d81f5ea17b0564e0d4b7c545a71'), a);
  assert.equal(a.cells.length, 9);
  for (let r = 0; r < 3; r += 1) assert.equal(a.cells[r * 3], a.cells[r * 3 + 2]);
  assert.ok(['blue', 'emerald', 'purple', 'orange'].includes(a.color));
  for (const s of ['', 'x', 'lebronthanos', 'Zach202']) assert.ok(identicon(s).cells.some(Boolean));
});

test('outcomeLabel shortens Kalshi and Polymarket outcome questions', () => {
  assert.equal(outcomeLabel('2027 Pro Football Champion: Green Bay'), 'Green Bay');
  assert.equal(
    outcomeLabel('Will Flávio Bolsonaro win the 2026 Brazilian presidential election?'),
    'Flávio Bolsonaro',
  );
  assert.equal(
    outcomeLabel('Will Benjamin Netanyahu be the next Prime Minister of Israel?'),
    'Benjamin Netanyahu',
  );
  assert.equal(
    outcomeLabel('Will the Democratic Party control the House?'),
    'Will the Democratic Party control the House?',
  );
});

/* ── event horizon (src/lib/prediction-markets/horizon-model.js) ── */

const HZ_NOW = new Date('2026-10-20T12:00:00Z');
const hzDay = (n) => new Date(HZ_NOW.getTime() + n * 86400000).toISOString();

test('horizonEnd adds calendar months', () => {
  assert.equal(new Date(horizonEnd(HZ_NOW, '3m')).toISOString(), '2027-01-20T12:00:00.000Z');
  assert.equal(new Date(horizonEnd(HZ_NOW, '12m')).toISOString(), '2027-10-20T12:00:00.000Z');
});

test('horizonMarkets keeps open markets closing inside the window, by volume', () => {
  const rows = [
    { id: 'a', p: 0.4, vol: 10, closes: hzDay(30) },
    { id: 'b', p: 0.6, vol: 50, closes: hzDay(60) },
    { id: 'c', p: 0.5, vol: 99, closes: hzDay(200) },
    { id: 'd', p: 0.5, vol: 99, closes: hzDay(-1) },
    { id: 'e', p: null, vol: 99, closes: hzDay(10) },
  ];
  assert.deepEqual(
    horizonMarkets(rows, HZ_NOW, '3m').map((r) => r.id),
    ['b', 'a'],
  );
  assert.deepEqual(
    horizonMarkets(rows, HZ_NOW, '12m').map((r) => r.id),
    ['c', 'b', 'a'],
  );
});

test('horizonEvents trims to the window in date order', () => {
  const ev = [
    { id: 'x', date: hzDay(100) },
    { id: 'y', date: hzDay(5) },
    { id: 'z', date: hzDay(400) },
  ];
  assert.deepEqual(
    horizonEvents(ev, HZ_NOW, '6m').map((e) => e.id),
    ['y', 'x'],
  );
});

test('relatedEvents: before the close, by theme or shared word, words first', () => {
  const market = {
    id: 'm',
    category: 'economy',
    question: 'Will the Fed cut interest rates in December?',
    closes: hzDay(50),
  };
  const ev = [
    { id: 'e1', kind: 'congress', title: 'Banking hearing on interest rates', date: hzDay(20) },
    { id: 'e2', kind: 'macro', title: 'CPI', date: hzDay(10) },
    { id: 'e3', kind: 'macro', title: 'GDP', date: hzDay(80) },
    { id: 'e4', kind: 'congress', title: 'Farm bill markup', date: hzDay(15) },
  ];
  const out = relatedEvents(market, ev, HZ_NOW);
  assert.deepEqual(
    out.map((e) => e.id),
    ['e1', 'e2'],
  );
  assert.match(out[0].why, /interest|rates/);
});

test('relatedMarkets, keywords, monthTicks and daysUntil', () => {
  const m = { id: 'a', category: 'crypto', closes: hzDay(30) };
  const ms = [
    m,
    { id: 'b', category: 'crypto', closes: hzDay(80) },
    { id: 'c', category: 'crypto', closes: hzDay(35) },
    { id: 'd', category: 'sports', closes: hzDay(30) },
  ];
  assert.deepEqual(
    relatedMarkets(m, ms).map((x) => x.id),
    ['c', 'b'],
  );
  assert.ok(keywords('Will Bitcoin reach $150k before 2027?').has('bitcoin'));
  assert.ok(!keywords('Will the price be above?').has('will'));
  assert.equal(monthTicks(HZ_NOW.getTime(), horizonEnd(HZ_NOW, '3m')).length, 3);
  assert.equal(daysUntil(hzDay(3), HZ_NOW), 3);
  assert.equal(daysUntil(hzDay(-3), HZ_NOW), 0);
});
