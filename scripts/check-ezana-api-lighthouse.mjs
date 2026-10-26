/**
 * Ezana API, lighthouse dimension: params, pure insight maths and registry entries.
 * Run: node --no-warnings --test scripts/check-ezana-api-lighthouse.mjs (part of npm run test:api).
 * Self-contained node:test file, no network.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { register } from 'node:module';

register('./mobile-node-loader.mjs', import.meta.url);

const reg = await import('../src/lib/ezana-api/registry.js');
const q = await import('../src/lib/ezana-api/query.js');
const cat = await import('../src/lib/ezana-api/catalog/lighthouse.js');
const L = await import('../src/lib/ezana-api/insights/lighthouse.js');
const { buildEmpireModel } = await import('../src/app/datasets/oecd-macro/oecd-empire-model.js');
const { HANDLERS, LIVE_ONLY_RPCS } = await import('../src/lib/ezana-api/handlers/lighthouse.js');
const { OECD_CURATED_SLUGS } = await import('../src/lib/oecd-curated.js');

const mine = () => reg.ENDPOINTS.filter((x) => x.dimension === 'lighthouse');

test('lighthouse: every route in this dimension is live and typed', () => {
  for (const e of mine()) {
    assert.equal(e.status, 'live', e.path);
    assert.ok(['data', 'insight'].includes(e.kind), e.path);
  }
});

test('lighthouse: routes, scopes, handlers and copy', () => {
  const ids = mine().map((e) => e.id);
  assert.equal(ids.length, 17);
  for (const e of mine()) {
    assert.equal(typeof HANDLERS[e.id], 'function', `handler for ${e.id}`);
    assert.ok(!e.delayed, `${e.id} is not delayed`);
    assert.equal(e.scope, e.id.startsWith('sanctions.') ? 'sanctions' : 'macro', e.id);
    const copy = `${e.summary} ${e.method || ''}`;
    assert.ok(!/—/.test(copy), `${e.id} has no em dash`);
    assert.ok(!/supabase|postgres|rpc\b|table|materiali[sz]ed/i.test(copy), `${e.id} copy`);
    if (e.paramEnums?.sort) assert.match(e.summary, /highest first by default/);
  }
  for (const id of Object.keys(HANDLERS)) assert.ok(ids.includes(id), `${id} registered`);
  const rankings = reg.matchEndpoint('/v1/empire/rankings').endpoint;
  assert.match(rankings.method, /70%/);
  assert.match(rankings.method, /not an official index/);
  assert.match(
    reg.matchEndpoint('/v1/sanctions/entities').endpoint.summary,
    /not a compliance screening tool/,
  );
  assert.deepEqual(LIVE_ONLY_RPCS, ['lighthouse_latest']);
  for (const g of reg.GROUPS.filter((x) => x.dimension === 'lighthouse'))
    assert.match(g.icon, /^bi-/);
});

test('lighthouse: literal paths win over placeholders', () => {
  assert.equal(reg.matchEndpoint('/v1/macro/oecd/series').endpoint.id, 'macro.oecd_series');
  const m = reg.matchEndpoint('/v1/macro/oecd/eo-unr');
  assert.equal(m.endpoint.id, 'macro.oecd_observations');
  assert.equal(m.params.slug, 'eo-unr');
  assert.equal(
    reg.matchEndpoint('/v1/macro/oecd/eo-unr/ranking').endpoint.id,
    'macro.oecd_ranking',
  );
  assert.equal(reg.matchEndpoint('/v1/sanctions/entities/36').endpoint.id, 'sanctions.entity');
  assert.equal(
    reg.matchEndpoint('/v1/sanctions/countries/trend').endpoint.id,
    'sanctions.country_trend',
  );
  assert.equal(reg.matchEndpoint('/v1/empire/countries/USA').params.country, 'USA');
  assert.ok(OECD_CURATED_SLUGS.includes('eo-unr'));
});

test('lighthouse: params validate', () => {
  const ep = (p) => reg.matchEndpoint(p).endpoint;
  const sp = (s) => new URLSearchParams(s);
  const bad = (p, s, re) =>
    assert.throws(
      () => q.parseParams(ep(p), sp(s)),
      (e) => e.status === 400 && re.test(e.message),
    );
  assert.equal(
    q.parseParams(
      ep('/v1/macro/world-bank/rankings'),
      sp('indicator=GC.DOD.TOTL.GD.ZS&sort=lowest'),
    ).sort,
    'lowest',
  );
  bad('/v1/macro/world-bank/rankings', 'indicator=SP.POP.TOTL', /indicator/);
  bad('/v1/macro/world-bank/rankings', 'sort=volume', /"sort" must be one of highest, lowest/);
  bad('/v1/sanctions/entities', 'entity_type=ship', /entity_type/);
  bad('/v1/sanctions/actions', 'action_kind=nope', /action_kind/);
  bad('/v1/geopolitical-risk/index', 'gpr_index=GPRX', /gpr_index/);
  assert.deepEqual(q.parseParams(ep('/v1/macro/oecd/eo-unr'), sp('iso3=usa&iso3=JPN')).iso3, [
    'usa',
    'JPN',
  ]);
  bad('/v1/macro/oecd/eo-unr', 'iso3=U$A', /format/);
  assert.deepEqual(cat.PARAMS.entity_type.enum, ['individual', 'entity', 'vessel', 'aircraft']);
  assert.equal(cat.PARAMS.indicator.enum.length, 8);
});

/* ── Empire maths on a fixture through the real model ─────────────── */

const dim = (id, order, hib = true) => ({
  id,
  name: id.toUpperCase(),
  category: 'Economic',
  higher_is_better: hib,
  display_order: order,
  has_data: true,
});
const FIXTURE = {
  year: 2025,
  dimensions: [
    dim('d1', 1),
    dim('d2', 2, false),
    dim('d3', 3),
    dim('d4', 4),
    { ...dim('pending', 9), has_data: false },
  ],
  countries: [
    { code: 'AAA', name: 'Aland' },
    { code: 'BBB', name: 'Boria' },
    { code: 'CCC', name: 'Cerua' },
    { code: 'ZZZ', name: 'Zed' },
  ],
  scores: [
    ['AAA', 'd1', 90],
    ['AAA', 'd2', 20],
    ['AAA', 'd3', 50],
    ['AAA', 'd4', 40],
    ['BBB', 'd1', 60],
    ['BBB', 'd2', 50],
    ['BBB', 'd3', 50],
    ['BBB', 'd4', 80],
    ['CCC', 'd1', 30],
    ['CCC', 'd2', 90],
    ['CCC', 'd3', 10],
    ['ZZZ', 'd1', 99],
  ].map(([iso3, dimensionId, score]) => ({ iso3, dimensionId, score })),
};
const model = buildEmpireModel(FIXTURE);

test('empire: rankings follow the 70% rule and orient lower-is-better', () => {
  const r = L.empireRankings(model);
  assert.deepEqual(
    r.map((x) => x.iso3),
    ['AAA', 'BBB', 'CCC'],
  );
  assert.equal(r[0].composite, 65); // (90 + 80 + 50 + 40) / 4, d2 inverted
  assert.equal(r[2].coverage, 0.75);
  assert.ok(!r.some((x) => x.iso3 === 'ZZZ'), 'one of four dimensions misses the rule');
  const dims = L.empireDimensionList(model);
  assert.equal(dims.length, 5);
  assert.equal(dims.find((d) => d.id === 'pending').live, false);
  assert.deepEqual(L.empireRankings(null), []);
});

test('empire: strongest and weakest never overlap', () => {
  const d = (id, rank, score, order) => ({ id, rank, score, order });
  const { strongest, weakest } = L.strongestWeakest([
    d('a', 3, 40, 0),
    d('b', 1, 90, 1),
    d('c', 1, 95, 2),
    d('e', 5, 10, 3),
    d('f', 2, 60, 4),
    { id: 'g', rank: null, score: 1, order: 5 },
  ]);
  assert.deepEqual(
    strongest.map((x) => x.id),
    ['c', 'b', 'f'],
  );
  assert.deepEqual(
    weakest.map((x) => x.id),
    ['e', 'a'],
  );
  assert.deepEqual(L.strongestWeakest([]), { strongest: [], weakest: [] });
  assert.deepEqual(L.strongestWeakest(null), { strongest: [], weakest: [] });
});

test('empire: country report', () => {
  const c = L.empireCountry(model, 'CCC');
  assert.equal(c.composite_rank, 3);
  assert.equal(c.ranked_countries, 3);
  assert.equal(c.dimensions_scored, 3);
  assert.equal(c.dimensions_live, 4);
  assert.equal(c.strongest[0].id, 'd2'); // best rank (3 of 3), first by display order
  assert.equal(L.empireCountry(model, 'ZZZ').composite_rank, null);
  assert.equal(L.empireCountry(model, 'QQQ'), null);
});

test('empire: dimension table and compare leaders', () => {
  const t = L.empireDimension(model, 'd3');
  assert.deepEqual(
    t.rows.map((r) => [r.iso3, r.rank]),
    [
      ['AAA', 1],
      ['BBB', 1],
      ['CCC', 3],
    ],
  );
  assert.equal(L.empireDimension(model, 'pending'), null);

  const cmp = L.empireCompare(model, 'AAA', 'BBB');
  const lead = Object.fromEntries(cmp.dimensions.map((d) => [d.id, d.leader]));
  assert.deepEqual(lead, { d1: 'AAA', d2: 'AAA', d3: 'tie', d4: 'BBB' });
  assert.deepEqual(cmp.leads, { a: 2, b: 1, ties: 1, unscored: 0 });
  assert.equal(cmp.dimensions[0].a, 90);
  assert.equal(cmp.a.composite_rank, 1);
  assert.equal(cmp.dimensions[0].gap, 30);
  assert.equal(L.empireCompare(model, 'AAA', 'QQQ'), null);

  const only = L.compareLeaders([{ id: 'x', name: 'X', a: 10, b: null }], 'A', 'B');
  assert.equal(only.dimensions[0].leader, null);
  assert.equal(only.leads.unscored, 1);
  assert.deepEqual(L.compareLeaders([], 'A', 'B').dimensions, []);
});

/* ── rankings ───────────────────────────────────────────────────────── */

test('rankWithTies and median', () => {
  const r = L.rankWithTies([
    { code: 'B', value: 2 },
    { code: 'A', value: 2 },
    { code: 'C', value: 5 },
    { code: 'D', value: 1 },
    { code: 'E', value: null },
  ]);
  assert.deepEqual(
    r.map((x) => [x.code, x.rank]),
    [
      ['C', 1],
      ['A', 2],
      ['B', 2],
      ['D', 4],
    ],
  );
  assert.equal(r[0].of, 4);
  assert.equal(
    L.rankWithTies(
      [
        { code: 'C', value: 5 },
        { code: 'D', value: 1 },
      ],
      'lowest',
    )[0].code,
    'D',
  );
  assert.equal(L.median([3, 1, 2]), 2);
  assert.equal(L.median([4, 1, 2, 3]), 2.5);
  assert.equal(L.median([]), null);
});

test('world bank ranking: common year, fallback, territories flagged', () => {
  const I = 'NY.GDP.MKTP.KD.ZG';
  const row = (iso3, year, value) => ({ iso3, name: iso3, indicator: I, year, value });
  const rows = [
    row('USA', 2024, 2),
    row('FRA', 2024, 1),
    row('DEU', 2024, 1),
    row('PRI', 2024, 4),
    row('USA', 2025, 3),
  ];
  const r = L.worldBankRanking(rows, I);
  assert.equal(r.year, 2024);
  assert.equal(r.rule, 'common_85');
  assert.deepEqual(
    r.rows.map((x) => [x.iso3, x.rank]),
    [
      ['PRI', 1],
      ['USA', 2],
      ['DEU', 3],
      ['FRA', 3],
    ],
  );
  assert.equal(r.rows[0].territory, true);
  assert.equal(L.worldBankRanking(rows, I, { year: 2025 }).rows.length, 1);
  assert.equal(L.worldBankRanking(rows, I, { order: 'lowest' }).rows[0].rank, 1);
  const sparse = [
    row('USA', 2020, 1),
    row('FRA', 2020, 2),
    row('DEU', 2021, 3),
    row('ITA', 2022, 4),
  ];
  const s = L.worldBankRanking(sparse, I);
  assert.equal(s.rule, 'best_covered');
  assert.equal(s.year, 2020);
  assert.deepEqual(L.worldBankRanking([], I), { year: null, rule: null, rows: [] });
});

test('oecd ranking: modal year, aggregates out, change on prior year', () => {
  const o = (ref_area, latest_year, latest_value, prior_year, prior_value) => ({
    ref_area,
    ref_area_name: ref_area,
    latest_year,
    latest_value,
    prior_year,
    prior_value,
    unit_label: '%',
  });
  const r = L.oecdRanking(
    [
      o('USA', 2025, 2.5, 2024, 2),
      o('JPN', 2025, 1, 2023, 0.5),
      o('OECD', 2025, 9, 2024, 8),
      o('ITA', 2023, 7, 2022, 6),
    ],
    { projectionFrom: 2024 },
  );
  assert.equal(r.year, 2025);
  assert.deepEqual(
    r.rows.map((x) => x.iso3),
    ['USA', 'JPN'],
  );
  assert.equal(r.rows[0].change, 0.5);
  assert.equal(r.rows[1].change, null);
  assert.equal(r.rows[0].projection, true);
  assert.deepEqual(L.oecdRanking([]), { year: null, rows: [] });
});

/* ── GPR movers ─────────────────────────────────────────────────────── */

test('gpr movers: last 3 months against the 5-year median', () => {
  assert.deepEqual(L.gprMovers([]), []);
  assert.deepEqual(L.gprMovers(null), []);
  const series = (iso3, base, recent, months = 63) => {
    const out = [];
    for (let i = 0; i < months; i += 1) {
      const d = new Date(Date.UTC(2021, 7 + i, 1)).toISOString().slice(0, 10);
      out.push({ iso3, name: iso3, period: d, value: i >= months - 3 ? recent : base });
    }
    return out;
  };
  const rows = [
    ...series('UKR', 1, 4),
    ...series('ISR', 1, 2),
    ...series('NEW', 1, 9, 10), // too little history
    ...series('OLD', 1, 9, 50).map((r) => ({ ...r, period: r.period.replace(/^2/, '1') })),
  ];
  const m = L.gprMovers(rows);
  assert.deepEqual(
    m.map((x) => x.iso3),
    ['UKR', 'ISR'],
  );
  assert.equal(m[0].rise, 3);
  assert.equal(m[0].rise_pct, 300);
  assert.equal(m[0].baseline_months, 60);
  assert.equal(m[0].latest_month, '2026-10');
});
