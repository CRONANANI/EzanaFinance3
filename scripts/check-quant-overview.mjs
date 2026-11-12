/**
 * Quant Lab Overview: the pure helpers behind the page (Nov 2026).
 *
 *   node --no-warnings --test scripts/check-quant-overview.mjs
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  activityFeed,
  bestSharpe,
  cumulative,
  latestCompleted,
  pickEven,
  relativeTime,
  sliceCurve,
  strategyStatus,
  strategyType,
  ticks,
} from '../src/components/quants/overview/overview-math.js';

const near = (a, b, tol = 1e-9) =>
  assert.ok(Math.abs(a - b) <= tol, `${a} is not within ${tol} of ${b}`);
const curve = (n) =>
  Array.from({ length: n }, (_, i) => ({ date: `d${i}`, equity: 100 + i, benchmark: 50 + i }));

test('a period keeps its sessions plus one starting point; Run keeps everything', () => {
  const c = curve(400);
  /* 3M is 63 sessions of returns, so 64 points. */
  assert.equal(sliceCurve(c, 'm3').length, 64);
  assert.equal(sliceCurve(c, 'm6').length, 127);
  assert.equal(sliceCurve(c, 'y1').length, 253);
  assert.equal(sliceCurve(c, 'run').length, 400);
  assert.equal(sliceCurve(c, 'm3')[63].date, 'd399');
  /* A run shorter than the period is shown whole. */
  assert.equal(sliceCurve(curve(40), 'y1').length, 40);
});

test('cumulative returns are rebased to zero at the first point of the slice', () => {
  const r = cumulative([
    { date: 'a', equity: 200, benchmark: null },
    { date: 'b', equity: 220, benchmark: 50 },
    { date: 'c', equity: 190, benchmark: 55 },
  ]);
  assert.deepEqual(r.dates, ['a', 'b', 'c']);
  near(r.strategy[0], 0);
  near(r.strategy[1], 0.1);
  near(r.strategy[2], -0.05);
  /* The benchmark starts where it first has a value. */
  assert.equal(r.benchmark[0], null);
  near(r.benchmark[1], 0);
  near(r.benchmark[2], 0.1);
});

test('ticks and evenly spaced labels', () => {
  assert.deepEqual(ticks(0, 1, 5), [1, 0.75, 0.5, 0.25, 0]);
  assert.deepEqual(pickEven([1, 2, 3], 5), [1, 2, 3]);
  assert.deepEqual(pickEven([0, 1, 2, 3, 4, 5, 6, 7, 8], 5), [0, 2, 4, 6, 8]);
});

test('strategy type comes from the groups of its entry conditions', () => {
  const cond = (id) => ({ op: 'cond', id, params: {} });
  assert.equal(strategyType({ entry: cond('sma_cross_up') }), 'Trend');
  assert.equal(
    strategyType({ entry: { op: 'and', args: [cond('rsi_below'), cond('macd_cross_up')] } }),
    'Momentum',
  );
  assert.equal(
    strategyType({ entry: { op: 'and', args: [cond('rsi_below'), cond('price_above_sma')] } }),
    'Mixed',
  );
  assert.equal(strategyType({ entry: { op: 'not', arg: cond('volume_spike') } }), 'Volume');
  assert.equal(strategyType({}), 'Rules');
});

test('status reflects what is on record, never the return', () => {
  assert.equal(strategyStatus({ status: 'active' }, false), 'Draft');
  assert.equal(strategyStatus({ status: 'active' }, true), 'Research');
  assert.equal(strategyStatus({ status: 'archived' }, true), 'Archived');
});

test('relative time', () => {
  const now = Date.parse('2026-11-12T12:00:00Z');
  assert.equal(relativeTime('2026-11-12T11:59:50Z', now), 'just now');
  assert.equal(relativeTime('2026-11-12T11:55:00Z', now), '5m ago');
  assert.equal(relativeTime('2026-11-12T09:00:00Z', now), '3h ago');
  assert.equal(relativeTime('2026-11-10T12:00:00Z', now), '2d ago');
  assert.equal(relativeTime('2026-10-01T12:00:00Z', now), '2026-10-01');
  assert.equal(relativeTime('nonsense', now), '');
});

test('activity feed merges runs and validations, newest first', () => {
  const feed = activityFeed(
    [
      {
        id: 'r1',
        strategy_id: 's1',
        status: 'completed',
        created_at: '2026-11-12T10:00:00Z',
        metrics: { totalReturn: 0.12 },
      },
      {
        id: 'r2',
        strategy_id: 's2',
        status: 'failed',
        created_at: '2026-11-12T08:00:00Z',
        error: 'Daily limit reached.',
      },
    ],
    [
      {
        id: 'v1',
        strategy_id: 's1',
        status: 'completed',
        created_at: '2026-11-12T09:00:00Z',
        summary: { outOfSampleSharpe: 0.8 },
      },
    ],
    { s1: 'Trend following' },
    2,
  );
  assert.deepEqual(
    feed.map((f) => f.id),
    ['run-r1', 'val-v1'],
  );
  assert.equal(feed[0].name, 'Trend following');
  assert.equal(feed[0].result, 0.12);
  assert.equal(feed[1].resultKind, 'sharpe');
  const all = activityFeed(
    [{ id: 'r2', strategy_id: 's2', status: 'failed', created_at: '2026-11-12T08:00:00Z' }],
    [],
    {},
  );
  assert.equal(all[0].name, 'Deleted strategy');
  assert.equal(all[0].result, null);
});

test('latest completed run per strategy, and the best Sharpe among them', () => {
  const runs = [
    { id: 'a2', strategy_id: 'a', status: 'failed' },
    { id: 'a1', strategy_id: 'a', status: 'completed', metrics: { sharpe: 0.4 } },
    { id: 'b2', strategy_id: 'b', status: 'completed', metrics: { sharpe: 1.2 } },
    { id: 'b1', strategy_id: 'b', status: 'completed', metrics: { sharpe: 2.5 } },
    { id: 'c1', strategy_id: 'c', status: 'completed', metrics: { sharpe: null } },
  ];
  const latest = latestCompleted(runs);
  assert.equal(latest.a.id, 'a1', 'a failed run is skipped');
  assert.equal(latest.b.id, 'b2', 'the newest completed run, not the best one');
  const best = bestSharpe([{ id: 'a' }, { id: 'b' }, { id: 'c' }], latest);
  assert.equal(best.strategy.id, 'b');
  assert.equal(best.sharpe, 1.2);
  assert.equal(bestSharpe([{ id: 'c' }], latest), null);
});
