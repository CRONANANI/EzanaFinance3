#!/usr/bin/env node
/* Prediction market resolutions (src/lib/prediction-markets/resolutions.js).
   Closed markets are deleted from prediction_market_index about 30 days
   after their end date; before that, each one's resolution is stored in
   prediction_market_resolutions. Covers the platform outcome readers, the
   last-price fallback, the quiet skip before the table exists, and that only
   archived rows are deleted once it does.
   Usage: node --no-warnings --test scripts/check-prediction-resolutions.mjs */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  archiveAndPrune,
  buildResolution,
  fetchPlatformResolutions,
  resolutionFromPlatform,
} from '../src/lib/prediction-markets/resolutions.js';

const NOW = new Date('2026-11-06T12:00:00.000Z');
const CUTOFF = '2026-10-07T12:00:00.000Z';

const idx = (market_id, platform, probability, end_date = '2026-09-01T00:00:00.000Z') => ({
  market_id,
  platform,
  question: `Will ${market_id} happen?`,
  event_key: null,
  event_title: null,
  outcome_label: null,
  category: 'politics',
  probability,
  end_date,
  status: 'closed',
});

/** Fake supabase-js: select/eq/lt/in/order/range/limit, upsert, delete. */
function fakeDb(seed, { missing = false, writeError = null } = {}) {
  const tables = new Map(Object.entries(seed).map(([k, v]) => [k, v.map((r) => ({ ...r }))]));
  const log = [];
  const rows = (t) => tables.get(t) || (tables.set(t, []), tables.get(t));
  const from = (t) => {
    const q = { t, op: 'select', filters: [], range: null, limit: null, payload: null };
    log.push(q);
    const api = {
      select: () => api,
      eq: (c, v) => (q.filters.push((r) => r[c] === v), api),
      lt: (c, v) => (q.filters.push((r) => r[c] != null && r[c] < v), api),
      in: (c, vs) => (q.filters.push((r) => vs.includes(r[c])), api),
      order: () => api,
      range: (a, b) => ((q.range = [a, b]), api),
      limit: (n) => ((q.limit = n), api),
      upsert: (p) => ((q.op = 'upsert'), (q.payload = p), api),
      delete: () => ((q.op = 'delete'), api),
      then: (res, rej) => Promise.resolve(run()).then(res, rej),
    };
    function run() {
      if (t === 'prediction_market_resolutions' && missing) {
        return { data: null, error: { code: 'PGRST205', message: 'table not found' } };
      }
      const match = (r) => q.filters.every((f) => f(r));
      if (q.op === 'upsert') {
        if (writeError) return { data: null, error: writeError };
        for (const p of q.payload) {
          const list = rows(t);
          const i = list.findIndex((r) => r.market_id === p.market_id);
          if (i >= 0) list[i] = p;
          else list.push(p);
        }
        return { data: null, error: null };
      }
      if (q.op === 'delete') {
        const gone = rows(t).filter(match);
        tables.set(
          t,
          rows(t).filter((r) => !match(r)),
        );
        return { data: null, count: gone.length, error: null };
      }
      let out = rows(t).filter(match);
      if (q.range) out = out.slice(q.range[0], q.range[1] + 1);
      if (q.limit != null) out = out.slice(0, q.limit);
      return { data: out.map((r) => ({ ...r })), error: null };
    }
    return api;
  };
  return { from, log, rows };
}

const jsonFetch = (handler) => async (url) => {
  const body = handler(String(url));
  return { ok: body != null, status: body != null ? 200 : 500, json: async () => body };
};

test('Polymarket and Kalshi outcomes are read from the platform answer', () => {
  assert.deepEqual(
    resolutionFromPlatform('polymarket', {
      closed: true,
      outcomePrices: '["1", "0"]',
      closedTime: '2026-09-02T10:00:00Z',
    }),
    { outcome: 'yes', resolvedPrice: 1, resolvedAt: '2026-09-02T10:00:00.000Z' },
  );
  assert.equal(
    resolutionFromPlatform('polymarket', { closed: true, outcomePrices: ['0', '1'] }).outcome,
    'no',
  );
  assert.equal(
    resolutionFromPlatform('polymarket', { closed: true, outcomePrices: '["0.5","0.5"]' }).outcome,
    'split',
  );
  /* Open, or closed but not yet settled at 0/1: not a resolution. */
  assert.equal(
    resolutionFromPlatform('polymarket', { closed: false, outcomePrices: '["1","0"]' }),
    null,
  );
  assert.equal(
    resolutionFromPlatform('polymarket', { closed: true, outcomePrices: '["0.97","0.03"]' }),
    null,
  );
  assert.deepEqual(
    resolutionFromPlatform('kalshi', { result: 'no', settlement_ts: '2026-09-03T00:00:00Z' }),
    { outcome: 'no', resolvedPrice: 0, resolvedAt: '2026-09-03T00:00:00.000Z' },
  );
  assert.equal(resolutionFromPlatform('kalshi', { result: 'yes' }).resolvedPrice, 1);
  assert.equal(resolutionFromPlatform('kalshi', { result: '' }), null);
  assert.equal(resolutionFromPlatform('manifold', { result: 'yes' }), null);
});

test('without a platform answer, only an extreme last price counts as an outcome', () => {
  const yes = buildResolution(idx('a', 'polymarket', 0.99), null, NOW);
  assert.equal(yes.outcome, 'yes');
  assert.equal(yes.outcome_source, 'last_price');
  assert.equal(yes.resolved_price, null);
  assert.equal(yes.last_price, 0.99);
  assert.equal(yes.resolved_at, '2026-09-01T00:00:00.000Z');
  assert.equal(buildResolution(idx('b', 'kalshi', 0.01), null, NOW).outcome, 'no');
  const mid = buildResolution(idx('c', 'kalshi', 0.6), null, NOW);
  assert.equal(mid.outcome, 'unknown');
  assert.equal(mid.outcome_source, 'none');
  const plat = buildResolution(
    idx('d', 'polymarket', 0.6),
    { outcome: 'no', resolvedPrice: 0, resolvedAt: '2026-09-05T00:00:00.000Z' },
    NOW,
  );
  assert.equal(plat.outcome, 'no');
  assert.equal(plat.outcome_source, 'platform');
  assert.equal(plat.resolved_price, 0);
  assert.equal(plat.last_price, 0.6);
  for (const k of [
    'market_id',
    'platform',
    'question',
    'outcome',
    'resolved_price',
    'resolved_at',
  ]) {
    assert.ok(k in plat, k);
  }
});

test('platform lookups are batched and a failed request falls back quietly', async () => {
  const urls = [];
  const out = await fetchPlatformResolutions(
    'kalshi',
    ['kalshi:A', 'kalshi:B'],
    jsonFetch((u) => {
      urls.push(u);
      return {
        markets: [
          { ticker: 'A', result: 'yes' },
          { ticker: 'Z', result: 'no' },
        ],
      };
    }),
  );
  assert.equal(urls.length, 1);
  assert.match(urls[0], /tickers=A%2CB/);
  assert.deepEqual([...out.keys()], ['kalshi:A']);
  const failed = await fetchPlatformResolutions(
    'polymarket',
    ['1'],
    jsonFetch(() => null),
  );
  assert.equal(failed.size, 0);
  const poly = [];
  await fetchPlatformResolutions(
    'polymarket',
    ['11', '12'],
    jsonFetch((u) => (poly.push(u), [])),
  );
  assert.match(poly[0], /id=11&id=12/);
});

test('archiveAndPrune stores resolutions, then deletes only archived rows of that platform', async () => {
  const db = fakeDb({
    prediction_market_index: [
      idx('100', 'polymarket', 0.4),
      idx('101', 'polymarket', 0.995),
      idx('102', 'polymarket', 0.5, '2026-11-01T00:00:00.000Z'), // ended recently: kept
      idx('kalshi:K1', 'kalshi', 0.2), // other platform: kept
    ],
    prediction_market_resolutions: [],
  });
  const res = await archiveAndPrune(db, 'polymarket', CUTOFF, {
    now: NOW,
    fetchImpl: jsonFetch(() => [
      { id: '100', closed: true, outcomePrices: '["0","1"]', closedTime: '2026-09-01T05:00:00Z' },
    ]),
  });
  assert.deepEqual(res.errors, []);
  assert.equal(res.archived, 2);
  assert.equal(res.pruned, 2);
  const stored = Object.fromEntries(
    db.rows('prediction_market_resolutions').map((r) => [r.market_id, r]),
  );
  assert.equal(stored['100'].outcome, 'no');
  assert.equal(stored['100'].outcome_source, 'platform');
  assert.equal(stored['100'].resolved_price, 0);
  assert.equal(stored['101'].outcome, 'yes');
  assert.equal(stored['101'].outcome_source, 'last_price');
  assert.deepEqual(
    db
      .rows('prediction_market_index')
      .map((r) => r.market_id)
      .sort(),
    ['102', 'kalshi:K1'],
  );
});

test('before the table exists the archive is skipped quietly and the prune runs as before', async () => {
  const warn = console.warn;
  console.warn = () => {};
  try {
    const db = fakeDb(
      {
        prediction_market_index: [idx('kalshi:K1', 'kalshi', 0.2), idx('kalshi:K2', 'kalshi', 0.9)],
      },
      { missing: true },
    );
    const res = await archiveAndPrune(db, 'kalshi', CUTOFF, { now: NOW, fetchImpl: null });
    assert.equal(res.skipped, 'table_missing');
    assert.equal(res.archived, 0);
    assert.equal(res.pruned, 2);
    assert.deepEqual(res.errors, []);
    assert.equal(db.rows('prediction_market_index').length, 0);
  } finally {
    console.warn = warn;
  }
});

test('a failed resolutions write keeps the index rows for the next run', async () => {
  const db = fakeDb(
    {
      prediction_market_index: [idx('200', 'polymarket', 0.99)],
      prediction_market_resolutions: [],
    },
    { writeError: { code: '23514', message: 'check violation' } },
  );
  const res = await archiveAndPrune(db, 'polymarket', CUTOFF, { now: NOW, fetchImpl: null });
  assert.equal(res.pruned, 0);
  assert.equal(res.archived, 0);
  assert.match(res.errors[0], /resolutions write/);
  assert.equal(db.rows('prediction_market_index').length, 1);
});

test('both index crons archive before pruning; the migration is public read, service write', () => {
  for (const [file, platform] of [
    ['src/app/api/cron/index-prediction-markets/route.js', 'polymarket'],
    ['src/app/api/cron/index-kalshi/route.js', 'kalshi'],
  ]) {
    const src = fs.readFileSync(file, 'utf8');
    assert.match(src, new RegExp(`archiveAndPrune\\(admin, '${platform}', cutoff\\)`));
    assert.doesNotMatch(src, /\.delete\(\{ count: 'exact' \}\)\s*\.eq\('platform'/);
  }
  const sql = fs.readFileSync(
    'supabase/migrations/20261109130000_prediction_market_resolutions.sql',
    'utf8',
  );
  assert.match(sql, /create table if not exists public\.prediction_market_resolutions/);
  assert.match(sql, /enable row level security/);
  assert.match(sql, /for select\s+to anon, authenticated\s+using \(true\)/);
  assert.match(sql, /revoke insert, update, delete, truncate/);
});
