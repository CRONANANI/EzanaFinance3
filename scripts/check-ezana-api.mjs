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
});

test('registry: every live endpoint has a handler and every handler is registered', () => {
  const live = reg.LIVE_ENDPOINTS.map((e) => e.id);
  assert.equal(live.length, 18);
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
  const roadmap = reg.ENDPOINTS.find((e) => e.status !== 'live');
  assert.ok(roadmap, 'there are roadmap endpoints');
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
