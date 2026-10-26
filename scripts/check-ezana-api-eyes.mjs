/**
 * Ezana API, eyes dimension: params, pure insight maths and registry entries.
 * Run: node --no-warnings --test scripts/check-ezana-api-eyes.mjs (part of npm run test:api).
 * Self-contained node:test file, no network.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { register } from 'node:module';

register('./mobile-node-loader.mjs', import.meta.url);

const reg = await import('../src/lib/ezana-api/registry.js');
const q = await import('../src/lib/ezana-api/query.js');
const eyes = await import('../src/lib/ezana-api/insights/eyes.js');
const cat = await import('../src/lib/ezana-api/catalog/eyes.js');
const pw = await import('../src/lib/eyes/portwatch.js');

const ep = (path) => reg.matchEndpoint(path)?.endpoint;
const sp = (s) => new URLSearchParams(s);
const bad = (path, s, re) =>
  assert.throws(
    () => q.parseParams(ep(path), sp(s)),
    (e) => e.status === 400 && e.code === 'invalid_param' && re.test(e.message),
  );

test('eyes: every route in this dimension is live and typed', () => {
  for (const e of reg.ENDPOINTS.filter((x) => x.dimension === 'eyes')) {
    assert.equal(e.status, 'live', e.path);
    assert.ok(['data', 'insight'].includes(e.kind), e.path);
  }
});

test('eyes: the catalogue is complete, scoped eyes, never delayed', () => {
  const ids = reg.ENDPOINTS.filter((x) => x.dimension === 'eyes').map((e) => e.id);
  for (const id of [
    'patents.grants',
    'patents.momentum',
    'patents.company_monthly',
    'supply_chain.ports',
    'supply_chain.port_daily',
    'supply_chain.chokepoints',
    'supply_chain.freight',
    'supply_chain.freight_history',
    'real_estate.indicators',
    'real_estate.history',
    'night_lights.regions',
    'night_lights.region',
  ])
    assert.ok(ids.includes(id), id);
  for (const g of cat.GROUPS) {
    assert.equal(g.dimension, 'eyes', g.key);
    assert.match(g.icon, /^bi-[a-z0-9-]+$/, g.key);
    assert.ok(g.source && !/supabase|postgres|eyes_/i.test(g.source), g.key);
    for (const r of g.routes) {
      assert.equal(r.scope, 'eyes', r.id);
      assert.ok(!r.delayed, `${r.id} is not delayed`);
      assert.ok(r.path.startsWith(g.base), r.id);
      for (const text of [r.summary, r.method || '', g.framing]) {
        assert.ok(!/—/.test(text), `${r.id}: no em dash`);
        assert.ok(!/supabase|postgres|eyes_[a-z]/i.test(text), `${r.id}: no table names`);
      }
      if (r.list) assert.ok(!(r.params || []).includes('cursor'), `${r.id}: list has no cursor`);
    }
  }
});

test('eyes: paths route to the right endpoint', () => {
  const m = reg.matchEndpoint('/v1/supply-chain/ports/port1201/daily');
  assert.equal(m.endpoint.id, 'supply_chain.port_daily');
  assert.equal(m.params.portid, 'port1201');
  assert.equal(reg.matchEndpoint('/v1/supply-chain/ports').endpoint.id, 'supply_chain.ports');
  assert.equal(
    reg.matchEndpoint('/v1/patents/companies/AAPL/monthly').endpoint.id,
    'patents.company_monthly',
  );
  assert.equal(
    reg.matchEndpoint('/v1/real-estate/indicators/TLOFCONS/history').endpoint.id,
    'real_estate.history',
  );
  assert.equal(
    reg.matchEndpoint('/v1/supply-chain/freight/GSCPI/history').endpoint.id,
    'supply_chain.freight_history',
  );
  const r = reg.matchEndpoint('/v1/night-lights/regions/shanghai-port');
  assert.equal(r.endpoint.id, 'night_lights.region');
  assert.equal(r.params.id, 'shanghai-port');
  assert.equal(reg.matchEndpoint('/v1/night-lights/regions').endpoint.id, 'night_lights.regions');
});

test('eyes: params validate (cpc, series, sort, min_grants, region_kind)', () => {
  assert.equal(q.parseParams(ep('/v1/patents/grants'), sp('cpc=G&ticker=aapl')).cpc, 'G');
  bad('/v1/patents/grants', 'cpc=Z', /cpc/);
  bad('/v1/patents/grants', 'cpc=g', /cpc/);
  bad('/v1/patents/momentum', 'sort=volume', /"sort" must be one of change, grants/);
  bad('/v1/patents/momentum', 'min_grants=0', /between/);
  bad('/v1/supply-chain/ports', 'sort=change', /move, rise, fall, calls/);
  assert.equal(q.parseParams(ep('/v1/supply-chain/ports'), sp('sort=fall')).sort, 'fall');
  bad('/v1/real-estate/indicators', 'series=NOPE', /series/);
  assert.equal(
    q.parseParams(ep('/v1/real-estate/indicators'), sp('series=TLOFCONS')).series,
    'TLOFCONS',
  );
  bad('/v1/night-lights/regions', 'region_kind=city', /region_kind/);
  bad('/v1/supply-chain/chokepoints', 'limit=5', /Unknown parameter/);
  assert.deepEqual(reg.PARAMS.series.enum.length, 11);
  assert.ok(reg.PARAMS.series.enum.includes('GSCPI'));
});

test('eyes: the default of every per-route enum is stated in its summary', () => {
  for (const e of reg.ENDPOINTS.filter((x) => x.dimension === 'eyes')) {
    for (const [name, values] of Object.entries(e.paramEnums || {}))
      assert.match(e.summary, new RegExp(`${name}=${values[0]}`), `${e.id} states ${name} default`);
  }
});

test('pctChange and normFrequency', () => {
  assert.equal(eyes.pctChange(110, 100), 10);
  assert.equal(eyes.pctChange(79.7, 105.4), -24.38);
  assert.equal(eyes.pctChange(-1, -2), 50, 'percent on the magnitude of a negative base');
  assert.equal(eyes.pctChange(1, 0), null);
  assert.equal(eyes.pctChange(null, 2), null);
  assert.equal(eyes.normFrequency('M'), 'monthly');
  assert.equal(eyes.normFrequency('Monthly'), 'monthly');
  assert.equal(eyes.normFrequency('W'), 'weekly');
  assert.equal(eyes.normFrequency('Weekly, Ending Wednesday'), 'weekly');
  assert.equal(eyes.normFrequency('Q'), 'quarterly');
  assert.equal(eyes.normFrequency(null), null);
});

test('seriesChange: monthly MoM and YoY', () => {
  const pts = [];
  for (let m = 1; m <= 12; m += 1)
    pts.push({ date: `2025-${String(m).padStart(2, '0')}-01`, value: 100 + m });
  pts.push({ date: '2026-08-01', value: 120 }, { date: '2026-09-01', value: 121.2 });
  const c = eyes.seriesChange(pts.reverse());
  assert.equal(c.latest_date, '2026-09-01');
  assert.equal(c.prior_date, '2026-08-01');
  assert.equal(c.change_prior, 1.2);
  assert.equal(c.change_prior_pct, 1);
  assert.equal(c.year_ago_date, '2025-09-01');
  assert.equal(c.year_ago_value, 109);
  assert.equal(c.change_yoy_pct, 11.19);
});

test('seriesChange: weekly finds the nearest week a year back; gaps stay null', () => {
  const c = eyes.seriesChange([
    { date: '2026-10-14', value: 3158.1805 },
    { date: '2026-10-07', value: 3154.5303 },
    { date: '2025-10-15', value: 3000 },
    { date: '2025-10-08', value: 2990 },
  ]);
  assert.equal(c.year_ago_date, '2025-10-15');
  assert.equal(c.change_yoy_pct, 5.27);
  const q1 = eyes.seriesChange([
    { date: '2026-04-01', value: 1.5 },
    { date: '2026-01-01', value: 1.4 },
  ]);
  assert.equal(q1.year_ago_date, null, 'no observation a year back: no YoY');
  assert.equal(q1.change_yoy_pct, null);
  assert.equal(q1.change_prior, 0.1);
  const empty = eyes.seriesChange([{ date: '2026-01-01', value: null }]);
  assert.equal(empty.latest_value, null);
  assert.equal(empty.change_prior_pct, null);
});

test('rankPorts: move, rise, fall and calls, nulls last', () => {
  const rows = [
    { portid: 'port1201', change_pct: -5.5, recent_calls_per_day: 118.5 },
    { portid: 'port1188', change_pct: -24.4, recent_calls_per_day: 79.7 },
    { portid: 'port1114', change_pct: 3.1, recent_calls_per_day: 84.3 },
    { portid: 'port9', change_pct: null, recent_calls_per_day: null },
  ];
  const ids = (sort) => eyes.rankPorts(rows, sort, 10).map((r) => r.portid);
  assert.deepEqual(ids('move'), ['port1188', 'port1201', 'port1114', 'port9']);
  assert.deepEqual(ids('rise'), ['port1114', 'port1201', 'port1188', 'port9']);
  assert.deepEqual(ids('fall'), ['port1188', 'port1201', 'port1114', 'port9']);
  assert.deepEqual(ids('calls'), ['port1201', 'port1114', 'port1188', 'port9']);
  assert.equal(eyes.rankPorts(rows, 'move', 2).length, 2);
  assert.throws(() => eyes.rankPorts(rows, 'nope'));
});

test('rankMomentum: growth first, no-prior-year last; grants alternative', () => {
  const rows = [
    { ticker: 'AAPL', grants_12m: 2000, change_pct: 5 },
    { ticker: 'NEW', grants_12m: 40, change_pct: null },
    { ticker: 'IBM', grants_12m: 3000, change_pct: -10 },
    { ticker: 'NVDA', grants_12m: 800, change_pct: 40 },
  ];
  assert.deepEqual(
    eyes.rankMomentum(rows, 'change', 10).map((r) => r.ticker),
    ['NVDA', 'AAPL', 'IBM', 'NEW'],
  );
  assert.deepEqual(
    eyes.rankMomentum(rows, 'grants', 2).map((r) => r.ticker),
    ['IBM', 'AAPL'],
  );
});

test('withYoy: same month a year earlier, oldest first', () => {
  const out = eyes.withYoy([
    { month: '2026-03-01', value: 12 },
    { month: '2025-03-01', value: 10 },
    { month: '2026-02-01', value: 9 },
  ]);
  assert.deepEqual(
    out.map((p) => [p.month, p.yoy_change_pct]),
    [
      ['2025-03-01', null],
      ['2026-02-01', null],
      ['2026-03-01', 20],
    ],
  );
  assert.deepEqual(eyes.withYoy([]), []);
});

test('matchesCountry: ISO3 or name, case-insensitive', () => {
  const r = { country: 'The Netherlands', iso3: 'NLD' };
  assert.ok(eyes.matchesCountry(r, 'nld'));
  assert.ok(eyes.matchesCountry(r, 'the netherlands'));
  assert.ok(!eyes.matchesCountry(r, 'Neth'));
  assert.ok(eyes.matchesCountry(r, null));
});

/* ── Phase 0: the PortWatch chokepoint ingest helpers ─────────────────── */

test('portwatch: chokepointRow reads fields by name in any case and either date form', () => {
  const row = pw.chokepointRow({
    date: Date.UTC(2026, 8, 30),
    portid: 'chokepoint1',
    portname: 'Suez Canal',
    n_total: 52,
    n_container: 11,
    n_tanker: 14.0,
    n_dry_bulk: 15,
    n_cargo: 38,
    capacity: 3123456.4,
    n_roro: 2,
  });
  assert.deepEqual(row, {
    portid: 'chokepoint1',
    portname: 'Suez Canal',
    date: '2026-09-30',
    n_total: 52,
    n_container: 11,
    n_tanker: 14,
    n_dry_bulk: 15,
    n_cargo: 38,
    capacity: 3123456,
  });
  const upperCase = pw.chokepointRow({ DATE: '2026-09-29', PORTID: 'chokepoint6', N_TOTAL: '7' });
  assert.equal(upperCase.portid, 'chokepoint6');
  assert.equal(upperCase.date, '2026-09-29');
  assert.equal(upperCase.n_total, 7);
  assert.equal(upperCase.capacity, null, 'a missing field is null, not an error');
});

test('portwatch: dateWindows covers the range once, in order', () => {
  const w = pw.dateWindows('2026-01-01', '2026-03-15', 30);
  assert.deepEqual(w, [
    ['2026-01-01', '2026-01-30'],
    ['2026-01-31', '2026-03-01'],
    ['2026-03-02', '2026-03-15'],
  ]);
  assert.deepEqual(pw.dateWindows('2026-01-01', '2026-01-01', 90), [['2026-01-01', '2026-01-01']]);
  assert.deepEqual(pw.dateWindows('2026-02-01', '2026-01-01', 90), []);
  const two = pw.dateWindows('2024-10-26', '2026-10-26', 90);
  assert.equal(two[0][0], '2024-10-26');
  assert.equal(two.at(-1)[1], '2026-10-26');
  assert.equal(two.length, 9);
});
