/**
 * Ezana API v1 logic. Run directly:
 *   node --no-warnings scripts/check-ezana-api.mjs   (wired as `npm run test:api`)
 *
 * Covers: key format, hashing and the timing-safe compare; the tier table the
 * docs promise; registry and handler coverage both ways; endpoint matching;
 * parameter validation; cursors and keyset filters; the delay cutoff.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { register } from 'node:module';

register('./mobile-node-loader.mjs', import.meta.url);
process.env.API_KEY_PEPPER = 'test-pepper-0123456789abcdef';

const keys = await import('../src/lib/ezana-api/keys.js');
const { TIERS, TIER_ORDER, ALL_SCOPES } = await import('../src/lib/ezana-api/tiers.js');
const reg = await import('../src/lib/ezana-api/registry.js');
const q = await import('../src/lib/ezana-api/query.js');
const { HANDLERS } = await import('../src/lib/ezana-api/handlers.js');
const pm = await import('../src/lib/ezana-api/predictions.js');
const { buildOpenApi } = await import('../src/lib/ezana-api/openapi.js');

test('keys: format, prefix, hash and compare', () => {
  const k = keys.generateKey('live');
  assert.match(k.raw, keys.KEY_PATTERN);
  assert.match(k.prefix, /^ezk_live_[A-Za-z0-9]{8}$/);
  assert.equal(keys.prefixOf(k.raw), k.prefix);
  assert.equal(k.hash, keys.hashKey(k.raw));
  assert.equal(k.hash.length, 64);
  assert.ok(!k.hash.includes(k.raw.slice(-10)), 'hash is not the key');
  assert.equal(keys.keyMatches(k.raw, k.hash), true);
  assert.equal(keys.keyMatches(`${k.raw.slice(0, -1)}x`, k.hash), false);
  assert.equal(keys.keyMatches(k.raw, 'short'), false);
  assert.notEqual(keys.generateKey().raw, k.raw);
  assert.equal(keys.prefixOf('sk_live_nope'), null);
});

test('keys: hashing refuses without a pepper', () => {
  const saved = process.env.API_KEY_PEPPER;
  delete process.env.API_KEY_PEPPER;
  try {
    assert.equal(keys.pepperConfigured(), false);
    assert.throws(() => keys.generateKey());
  } finally {
    process.env.API_KEY_PEPPER = saved;
  }
});

test('keys: bearer only from the Authorization header', () => {
  const k = keys.generateKey().raw;
  const h = (v) => ({ headers: new Headers(v ? { authorization: v } : {}) });
  assert.equal(keys.parseBearer(h(`Bearer ${k}`)), k);
  assert.equal(keys.parseBearer(h(null)), null);
  assert.equal(keys.parseBearer(h(`Basic ${k}`)), null);
});

test('tiers match the docs', () => {
  assert.deepEqual(TIER_ORDER, ['developer', 'trader', 'quant_firm', 'institution']);
  assert.equal(TIERS.developer.ratePerMin, 60);
  assert.equal(TIERS.developer.delayDays, 30);
  assert.equal(TIERS.trader.ratePerMin, 600);
  assert.equal(TIERS.trader.delayDays, 0);
  assert.equal(TIERS.quant_firm.ratePerMin, 1500);
  assert.deepEqual([...TIERS.quant_firm.scopes].sort(), [...ALL_SCOPES].sort());
  assert.ok(!TIERS.developer.scopes.includes('committees'));
  for (const s of ['exec-comp', 'etf', 'eyes', 'macro', 'sanctions', 'cross'])
    assert.ok(ALL_SCOPES.includes(s), `scope ${s}`);
  assert.ok(!TIERS.developer.scopes.includes('cross'));
});

test('registry: every live endpoint has a handler and every handler is registered', () => {
  const live = reg.LIVE_ENDPOINTS.map((e) => e.id);
  assert.ok(live.length >= 26, `${live.length} live endpoints`);
  assert.equal(new Set(live).size, live.length, 'ids are unique');
  for (const id of live) assert.equal(typeof HANDLERS[id], 'function', `handler for ${id}`);
  for (const id of Object.keys(HANDLERS)) assert.ok(live.includes(id), `${id} is in the registry`);
  for (const e of reg.LIVE_ENDPOINTS) {
    assert.ok(ALL_SCOPES.includes(e.scope), `${e.id} scope`);
    for (const p of e.params || []) assert.ok(reg.PARAMS[p], `${e.id} param ${p}`);
  }
});

test('matchEndpoint: literals beat placeholders, unknown is null', () => {
  const m = reg.matchEndpoint('/v1/congress/members/A000360/trades');
  assert.equal(m.endpoint.id, 'congress.member_trades');
  assert.equal(m.params.id, 'A000360');
  assert.equal(reg.matchEndpoint('/v1/congress/trades').endpoint.id, 'congress.trades');
  assert.equal(reg.matchEndpoint('/v1/nope'), null);
  assert.equal(reg.ENDPOINTS.length, reg.LIVE_ENDPOINTS.length, 'every endpoint is live');
});

test('parseParams: defaults, typing and errors', () => {
  const ep = reg.matchEndpoint('/v1/congress/trades').endpoint;
  const sp = (s) => new URLSearchParams(s);
  const ok = q.parseParams(ep, sp('ticker=nvda&ticker=AAPL&ticker=nvda&from=2026-01-01'));
  assert.deepEqual(ok.ticker, ['NVDA', 'AAPL']);
  assert.equal(ok.limit, q.DEFAULT_LIMIT);
  const bad = (s, re) =>
    assert.throws(
      () => q.parseParams(ep, sp(s)),
      (e) => e.status === 400 && e.code === 'invalid_param' && re.test(e.message),
    );
  bad('bogus=1', /Unknown parameter/);
  bad('limit=0', /between/);
  bad('limit=201', /between/);
  bad('from=2026-02-30', /date/);
  bad('from=2026-03-01&to=2026-02-01', /after/);
  bad('cursor=%%%', /cursor/);
});

test('cursor round trip and keyset filter', () => {
  const c = q.encodeCursor(['2026-01-02', 'a"b']);
  assert.deepEqual(q.decodeCursor(c), ['2026-01-02', 'a"b']);
  assert.throws(() => q.decodeCursor('not-a-cursor'));
  assert.equal(
    q.keysetOr(['d', 'id'], ['2026-01-02', 'x']),
    'd.lt."2026-01-02",and(d.eq."2026-01-02",id.lt."x")',
  );
  assert.equal(q.keysetOr(['id'], ['A1'], 'asc'), 'id.gt."A1"');
  assert.match(q.keysetOr(['id'], ['a"b']), /a\\"b/);
});

test('pageOf and delayCutoff', () => {
  const rows = [{ id: 3 }, { id: 2 }, { id: 1 }];
  const p = q.pageOf(rows, 2, (r) => [r.id]);
  assert.equal(p.rows.length, 2);
  assert.equal(p.page.has_more, true);
  assert.deepEqual(q.decodeCursor(p.page.next), [2]);
  assert.equal(q.pageOf(rows, 5, (r) => [r.id]).page.next, null);
  assert.equal(q.delayCutoff(0), null);
  assert.equal(q.delayCutoff(30, new Date('2026-03-31T12:00:00Z')), '2026-03-01');
});

/* ── prediction markets ─────────────────────────────────────────────── */

const pmLive = () => reg.LIVE_ENDPOINTS.filter((e) => e.id.startsWith('predictions.'));

test('predictions: every live route has a handler, known params and valid sort values', () => {
  const ids = pmLive().map((e) => e.id);
  for (const id of [
    'predictions.markets',
    'predictions.market',
    'predictions.market_history',
    'predictions.events',
    'predictions.event',
    'predictions.movers',
    'predictions.trending',
    'predictions.consensus',
    'predictions.forecasts',
    'predictions.categories',
  ]) {
    assert.ok(ids.includes(id), `${id} is live`);
  }
  for (const e of pmLive()) {
    assert.equal(typeof HANDLERS[e.id], 'function', `handler for ${e.id}`);
    assert.equal(e.scope, 'predictions');
    assert.ok(!e.delayed, `${e.id} is not delayed`);
    for (const p of e.params || []) assert.ok(reg.PARAMS[p], `${e.id} param ${p}`);
    if (e.sortValues) assert.ok(e.params.includes('sort'), `${e.id} lists sort`);
  }
  const g = reg.GROUPS.find((x) => x.key === 'predictions');
  assert.equal(g.source, 'Polymarket, Kalshi and Manifold');
  assert.ok(g.guide.length >= 8);
  assert.deepEqual(reg.PARAMS.status.enum, ['active', 'closed', 'stale']);
});

test('predictions: parseParams rejects bad ids, interval, category and sort', () => {
  const ep = (path) => reg.matchEndpoint(path).endpoint;
  const sp = (s) => new URLSearchParams(s);
  const bad = (path, s, re) =>
    assert.throws(
      () => q.parseParams(ep(path), sp(s)),
      (e) => e.status === 400 && e.code === 'invalid_param' && re.test(e.message),
    );
  const ids = (n) => Array.from({ length: n }, (_, i) => `m${i}`).join(',');
  bad('/v1/predictions/consensus', `ids=${ids(1)}`, /format/);
  bad('/v1/predictions/consensus', `ids=${ids(11)}`, /format/);
  assert.equal(q.parseParams(ep('/v1/predictions/consensus'), sp(`ids=${ids(10)}`)).ids, ids(10));
  bad('/v1/predictions/markets/123/history', 'interval=1h', /interval/);
  bad('/v1/predictions/markets', 'category=weather', /category/);
  bad(
    '/v1/predictions/events',
    'sort=change_24h',
    /"sort" must be one of volume, volume_24h, ending/,
  );
  assert.equal(q.parseParams(ep('/v1/predictions/markets'), sp('sort=trending')).sort, 'trending');
  bad('/v1/predictions/forecasts', 'status=open', /Unknown parameter/);
});

test('predictions: event keys with a colon route; traversal does not validate', () => {
  const m = reg.matchEndpoint('/v1/predictions/events/kalshi%3ACONTROLH-2026');
  assert.equal(m.endpoint.id, 'predictions.event');
  assert.equal(m.params.key, 'kalshi:CONTROLH-2026');
  assert.ok(pm.EVENT_KEY_RE.test('polymarket:606422'));
  assert.ok(!pm.EVENT_KEY_RE.test('polymarket:../x'));
  assert.ok(!pm.EVENT_KEY_RE.test('manifold:abc'));
  assert.equal(
    reg.matchEndpoint('/v1/predictions/markets/2589812/history').endpoint.id,
    'predictions.market_history',
  );
});

test('predictions: marketOut on live-shaped rows', () => {
  const kalshi = pm.marketOut({
    market_id: 'kalshi:CONTROLH-2026-D',
    platform: 'kalshi',
    question: 'Which party will win the U.S. House?: Democratic Party',
    outcome_label: 'Democratic Party',
    event_key: 'kalshi:CONTROLH-2026',
    event_title: 'Which party will win the U.S. House?',
    category: 'Elections',
    tag_ids: null,
    probability: '0.903',
    best_bid: '0.902',
    best_ask: '0.903',
    price_change_24h: '-0.002',
    change_7d: '0.001',
    volume: '22464071.77',
    volume_norm: '331982',
    volume_unit: 'contracts',
    status: 'active',
    indexed_at: '2026-10-26T14:45:50.615Z',
    link: 'https://kalshi.com/markets/controlh',
  });
  assert.equal(kalshi.platform, 'kalshi');
  assert.equal(kalshi.platform_name, 'Kalshi');
  assert.equal(kalshi.category, 'elections');
  assert.equal(kalshi.venue_category, 'Elections');
  assert.equal(kalshi.change_24h, -0.002);
  assert.equal(kalshi.avg_daily_volume, 331982);
  assert.deepEqual(kalshi.event, {
    key: 'kalshi:CONTROLH-2026',
    title: 'Which party will win the U.S. House?',
  });

  const poly = pm.marketOut({
    market_id: '2589812',
    platform: 'polymarket',
    question: 'Fed decision in October: no change?',
    outcome_label: 'No change',
    event_key: 'polymarket:606422',
    event_title: 'Fed Decision in October?',
    category: null,
    tag_ids: ['101757', '100328', '159'],
    probability: '0.9425',
    price_change_24h: '0.0075',
    volume_unit: 'usd',
    status: 'active',
  });
  assert.equal(poly.platform, 'polymarket');
  assert.equal(poly.platform_name, 'Polymarket');
  assert.equal(poly.category, 'economy');
  assert.equal(poly.venue_category, null);
  assert.equal(poly.change_24h, 0.0075);
  assert.equal(poly.best_bid, null);
});

test('predictions: history keeps the last snapshot per bucket, oldest first', () => {
  const snap = (t, p) => ({ captured_at: t, probability: p });
  const rows = [
    snap('2026-10-25T22:30:00Z', 0.935),
    snap('2026-10-25T02:30:00Z', 0.93),
    snap('2026-10-26T14:30:00Z', 0.9425),
    snap('2026-10-25T00:30:00Z', 0.92),
    snap('2026-10-26T02:30:00Z', 0.94),
  ];
  const daily = pm.bucketHistory(rows, '1d');
  assert.deepEqual(
    daily.map((p) => [p.at.slice(0, 16), p.probability]),
    [
      ['2026-10-25T22:30', 0.935],
      ['2026-10-26T14:30', 0.9425],
    ],
  );
  const four = pm.bucketHistory(rows, '4h');
  assert.equal(four.length, 4, '00:30 and 02:30 on the 25th share a 4h bucket');
  assert.equal(four[0].probability, 0.93);
  assert.equal(pm.bucketHistory(rows, 'raw').length, 5);
  assert.deepEqual(pm.bucketHistory([], '1d'), []);
});

test('predictions: the history window clamps to retention', () => {
  const now = new Date('2026-10-26T12:00:00Z');
  const w = pm.historyWindow({}, now);
  assert.equal(w.fromIso, '2026-09-21T12:00:00.000Z');
  assert.equal(w.toIso, now.toISOString());
  const d = pm.historyWindow({ from: '2026-09-21', to: '2026-10-01' }, now);
  assert.equal(d.fromIso, '2026-09-21T12:00:00.000Z', 'clamped up to the retention edge');
  assert.equal(d.toIso, '2026-10-01T23:59:59.999Z');
  assert.throws(
    () => pm.historyWindow({ from: '2026-09-20' }, now),
    (e) => e.status === 400 && e.code === 'out_of_range',
  );
});

test('predictions: consensus maths', () => {
  const m = (id, platform, p, vol, unit) => ({
    id,
    platform,
    probability: p,
    avg_daily_volume: vol,
    volume_unit: unit,
  });
  const same = pm.consensusOf([
    m('a', 'polymarket', 0.6, 300, 'usd'),
    m('b', 'polymarket', 0.8, 100, 'usd'),
  ]);
  assert.equal(same.weighting, 'volume');
  assert.equal(same.consensus.volume_weighted, 0.65);
  assert.equal(same.consensus.simple_mean, 0.7);
  assert.equal(same.consensus.dispersion, 0.2);
  assert.deepEqual(same.weights, [
    { id: 'a', weight: 0.75 },
    { id: 'b', weight: 0.25 },
  ]);

  const mixed = pm.consensusOf([
    m('562802', 'polymarket', 0.915, 402134, 'usd'),
    m('kalshi:CONTROLH-2026-D', 'kalshi', 0.903, 331982, 'contracts'),
  ]);
  assert.equal(mixed.weighting, 'venue_equal');
  assert.deepEqual(
    mixed.weights.map((w) => w.weight),
    [0.5, 0.5],
  );
  assert.equal(mixed.consensus.volume_weighted, 0.909);
  assert.equal(mixed.consensus.min, 0.903);
  assert.equal(mixed.consensus.max, 0.915);
  assert.equal(mixed.consensus.dispersion, 0.012);

  const three = pm.consensusOf([
    m('p1', 'polymarket', 0.5, 100, 'usd'),
    m('p2', 'polymarket', 0.7, 300, 'usd'),
    m('k1', 'kalshi', 0.6, 999, 'contracts'),
  ]);
  const w = Object.fromEntries(three.weights.map((x) => [x.id, x.weight]));
  assert.equal(w.k1, 0.5);
  assert.equal(w.p1, 0.125);
  assert.equal(w.p2, 0.375);

  assert.throws(
    () => pm.consensusOf([m('a', 'polymarket', 0.5, 1, 'usd')]),
    (e) => e.status === 400,
  );
});

test('predictions: the category filter builds the exact PostgREST strings', () => {
  const econ = pm.categoryFilter('economy');
  assert.equal(
    econ.or,
    'and(platform.eq.kalshi,category.in.("Economics","Financials")),and(platform.eq.polymarket,tag_ids.ov.{"100328","120"})',
  );
  const tech = pm.categoryFilter('tech');
  assert.match(tech.or, /category\.in\.\("Companies","Science and Technology"\)/);
  assert.equal(pm.categoryFilter('weather'), null);

  const calls = [];
  const fake = {
    in: (...a) => (calls.push(['in', ...a]), fake),
    overlaps: (...a) => (calls.push(['ov', ...a]), fake),
    or: (...a) => (calls.push(['or', ...a]), fake),
  };
  pm.applyCategory(fake, 'economy', 'kalshi');
  pm.applyCategory(fake, 'economy', 'polymarket');
  pm.applyCategory(fake, 'economy');
  assert.deepEqual(calls, [
    ['in', 'category', ['Economics', 'Financials']],
    ['ov', 'tag_ids', ['100328', '120']],
    ['or', econ.or],
  ]);
});

test('predictions: OpenAPI has every new path and a per-operation sort enum', () => {
  const doc = buildOpenApi();
  for (const path of [
    '/v1/predictions/markets',
    '/v1/predictions/markets/{id}',
    '/v1/predictions/markets/{id}/history',
    '/v1/predictions/events',
    '/v1/predictions/events/{key}',
    '/v1/predictions/movers',
    '/v1/predictions/trending',
    '/v1/predictions/consensus',
    '/v1/predictions/forecasts',
    '/v1/predictions/categories',
  ]) {
    assert.ok(doc.paths[path], path);
    assert.equal(doc.paths[path].get['x-status'], 'live', path);
  }
  const sortOf = (path) =>
    doc.paths[path].get.parameters.find((p) => p.name === 'sort').schema.enum;
  assert.deepEqual(sortOf('/v1/predictions/events'), ['volume', 'volume_24h', 'ending']);
  assert.equal(sortOf('/v1/predictions/markets').length, 7);
  const tag = doc.tags.find((t) => t.name === 'The Hive');
  assert.match(tag.description, /\*\*Volume units\.\*\*/);
  const movers = doc.paths['/v1/predictions/movers'].get.responses[200];
  assert.equal(movers.content['application/json'].schema.properties.data.type, 'array');
});

/* ── Phase 1 guard: the registry documents only what it serves ───────── */

const { readFileSync, readdirSync } = await import('node:fs');
const drift = await import('./check-schema-drift.mjs');

test('guard: every route is live, has a dimension, a kind and a handler', () => {
  const dims = new Set(reg.DIMENSIONS.map((d) => d.id));
  assert.deepEqual(reg.PARAM_COLLISIONS, [], 'param names are declared once');
  for (const g of reg.GROUPS) {
    assert.ok(dims.has(g.dimension), `${g.key} has a known dimension`);
    assert.ok(g.dimensionLabel, `${g.key} has a dimension label`);
  }
  for (const e of reg.ENDPOINTS) {
    assert.equal(e.status, 'live', `${e.path} is live`);
    assert.ok(e.id, `${e.path} has an id`);
    assert.ok(['data', 'insight'].includes(e.kind), `${e.id} kind`);
    if (e.kind === 'insight') assert.ok(e.method, `${e.id} states its method`);
    assert.equal(typeof HANDLERS[e.id], 'function', `handler for ${e.id}`);
    assert.ok(e.summary, `${e.id} summary`);
    for (const p of e.params || []) assert.ok(reg.PARAMS[p], `${e.id} param ${p}`);
    const enums = q.paramEnumsOf(e);
    for (const [name, values] of Object.entries(enums)) {
      assert.ok(e.params.includes(name), `${e.id} lists ${name}`);
      const base = reg.PARAMS[name].enum;
      if (base) for (const v of values) assert.ok(base.includes(v), `${e.id} ${name}=${v}`);
    }
    /* Free-form shared params must be narrowed by every route that takes them. */
    for (const name of ['sort', 'direction', 'dim']) {
      if ((e.params || []).includes(name))
        assert.ok(enums[name]?.length, `${e.id} declares ${name} values`);
    }
  }
  assert.equal(
    new Set(reg.ENDPOINTS.map((e) => e.path)).size,
    reg.ENDPOINTS.length,
    'unique paths',
  );
});

test('guard: every function an API handler calls exists (migration or known live)', async () => {
  const dir = new URL('../src/lib/ezana-api/', import.meta.url);
  const files = [
    ...readdirSync(dir)
      .filter((f) => f.endsWith('.js'))
      .map((f) => new URL(f, dir)),
    ...readdirSync(new URL('handlers/', dir)).map((f) => new URL(`handlers/${f}`, dir)),
  ];
  const called = new Set();
  for (const f of files) {
    const text = readFileSync(f, 'utf8');
    for (const m of text.matchAll(/(?:\.rpc|rpcRows|rpcDoc)\(\s*'([a-z0-9_]+)'/g)) called.add(m[1]);
  }
  const migDir = new URL('../supabase/migrations/', import.meta.url);
  const objects = drift.collectMigrationObjects(
    readdirSync(migDir)
      .filter((f) => f.endsWith('.sql'))
      .sort()
      .map((f) => new URL(f, migDir).pathname),
  );
  const created = new Set(
    [...objects.values()]
      .filter((o) => o.kind === 'function')
      .map((o) => o.key.replace(/^public\./, '')),
  );
  const liveOnly = [];
  for (const d of ['capitol', 'titans', 'eyes', 'hive', 'lighthouse', 'cross']) {
    // eslint-disable-next-line no-await-in-loop
    const m = await import(`../src/lib/ezana-api/handlers/${d}.js`);
    liveOnly.push(...(m.LIVE_ONLY_RPCS || []));
  }
  const known = new Set([...created, ...drift.API_LIVE_ONLY_RPCS, ...liveOnly]);
  const missing = [...called].filter((n) => !known.has(n));
  assert.deepEqual(
    missing,
    [],
    'add new functions to a migration, or list live-only ones in API_LIVE_ONLY_RPCS',
  );
});
