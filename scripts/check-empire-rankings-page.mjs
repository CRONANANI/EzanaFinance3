/**
 * Global Empire Rankings page (/datasets/global-empire-lighthouse): the pure
 * shaping in empire-rankings-model.js. No network, no React; a small fixture
 * stands in for getEmpireScoresForExplorer()'s return shape and runs through
 * the real buildEmpireModel, so the page shares the explorer's scoring.
 *
 *   node --no-warnings --import ./scripts/register-sonar-loader.mjs \
 *     --test scripts/check-empire-rankings-page.mjs
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const { buildEmpireModel, empireComposite } =
  await import('../src/app/datasets/oecd-macro/oecd-empire-model.js');
const M = await import('../src/app/datasets/global-empire-lighthouse/empire-rankings-model.js');

/* Five dimensions: four live (one lower-is-better), one pending. Five
   countries; ZZZ has one live score only, so it misses the 70% rule. */
const FIXTURE = {
  year: 2024,
  dimensions: [
    {
      id: 'debt_burden',
      name: 'Debt Burden',
      category: 'Economic',
      higher_is_better: false,
      display_order: 1,
      has_data: true,
    },
    {
      id: 'education',
      name: 'Education',
      category: 'Fundamentals',
      higher_is_better: true,
      display_order: 4,
      has_data: true,
    },
    {
      id: 'trade',
      name: 'Trade',
      category: 'Economic',
      higher_is_better: true,
      display_order: 8,
      has_data: true,
    },
    {
      id: 'military_strength',
      name: 'Military Strength',
      category: 'Power Projection',
      higher_is_better: true,
      display_order: 7,
      has_data: true,
    },
    {
      id: 'rule_of_law',
      name: 'Rule of Law',
      category: 'Social',
      higher_is_better: true,
      display_order: 16,
      has_data: false,
    },
  ],
  countries: [
    { code: 'AAA', name: 'Alpha' },
    { code: 'BBB', name: 'Bravo' },
    { code: 'CCC', name: 'Charlie' },
    { code: 'DNK', name: 'Denmark' },
    { code: 'ZZZ', name: 'Zulu' },
  ],
  scores: [
    // debt_burden: lower raw is better, so DNK (10) is strongest
    ['AAA', 'debt_burden', 80],
    ['BBB', 'debt_burden', 50],
    ['CCC', 'debt_burden', 50],
    ['DNK', 'debt_burden', 10],
    ['AAA', 'education', 90],
    ['BBB', 'education', 60],
    ['CCC', 'education', 40],
    ['DNK', 'education', 85],
    ['AAA', 'trade', 95],
    ['BBB', 'trade', 30],
    ['CCC', 'trade', 70],
    ['DNK', 'trade', 55],
    ['ZZZ', 'trade', 99],
    ['AAA', 'military_strength', 99],
    ['BBB', 'military_strength', 20],
    ['CCC', 'military_strength', 35],
    ['DNK', 'military_strength', 15],
  ].map(([iso3, dimensionId, score]) => ({ iso3, dimensionId, score })),
};
const model = buildEmpireModel(FIXTURE);
const LIVE = model.liveDims.map((d) => d.id);

test('LAYER_TO_DIM covers every legacy LAYER_SECTION_MAP key', () => {
  const legacy = [
    'trade',
    'conflict',
    'interest_rates',
    'economic',
    'military',
    'energy',
    'demographic',
    'governance',
    'infrastructure',
  ];
  assert.deepEqual(Object.keys(M.LAYER_TO_DIM).sort(), [...legacy].sort());
  assert.equal(M.LAYER_TO_DIM.interest_rates, 'debt_burden');
  assert.equal(M.LAYER_TO_DIM.demographic, null, 'no demographic dimension: composite');
});

test('resolveEmpireQuery: dim, layers, fallbacks and country', () => {
  const isoSet = new Set(model.scoreMap.keys());
  assert.deepEqual(M.resolveEmpireQuery({ dim: 'trade', country: 'dnk' }, LIVE, isoSet), {
    dimId: 'trade',
    country: 'DNK',
    focus: 'dim',
  });
  // A pending (not live) dimension falls back to the composite.
  assert.deepEqual(M.resolveEmpireQuery({ dim: 'rule_of_law' }, LIVE, isoSet), {
    dimId: null,
    country: null,
    focus: 'composite',
  });
  // Legacy layers: first layer only; mapped and live → that dimension.
  assert.equal(M.resolveEmpireQuery({ layers: 'interest_rates,trade' }, LIVE).dimId, 'debt_burden');
  assert.equal(M.resolveEmpireQuery({ layers: 'military' }, LIVE).focus, 'dim');
  // Mapped to a dimension that is not live, unmapped, or unknown → composite.
  for (const layers of ['governance', 'demographic', 'nope']) {
    const r = M.resolveEmpireQuery({ layers }, LIVE);
    assert.equal(r.dimId, null, layers);
    assert.equal(r.focus, 'composite', layers);
  }
  // dim wins over layers.
  assert.equal(
    M.resolveEmpireQuery({ dim: 'education', layers: 'trade' }, LIVE).dimId,
    'education',
  );
  // Country: ISO3 only, and only one the model knows.
  assert.equal(M.resolveEmpireQuery({ country: 'DK' }, LIVE, isoSet).country, null);
  assert.equal(M.resolveEmpireQuery({ country: 'QQQ' }, LIVE, isoSet).country, null);
  assert.equal(M.resolveEmpireQuery({ country: 'QQQ' }, LIVE).country, 'QQQ');
  // Nothing asked → nothing focused.
  assert.deepEqual(M.resolveEmpireQuery({}, LIVE), { dimId: null, country: null, focus: null });
  assert.deepEqual(M.resolveEmpireQuery(null, LIVE), { dimId: null, country: null, focus: null });
});

test('dimHref is the deep link the Sonar cards use', () => {
  assert.equal(
    M.dimHref('trade', 'DNK'),
    '/datasets/global-empire-lighthouse?dim=trade&country=DNK#dim-trade',
  );
  assert.equal(M.dimHref('trade'), '/datasets/global-empire-lighthouse?dim=trade#dim-trade');
});

test('composite table: ranked rows first, in composite order, then unranked by name', () => {
  const rows = M.compositeTableRows(model);
  const composite = empireComposite(model, model.liveDims);
  const ranked = rows.filter((r) => r.rank != null);
  const rest = rows.filter((r) => r.rank == null);
  assert.deepEqual(
    ranked.map((r) => r.iso),
    composite.map((c) => c.iso),
  );
  assert.deepEqual(
    ranked.map((r) => r.rank),
    ranked.map((_, i) => i + 1),
  );
  // Never interleaved: every unranked row comes after every ranked row.
  const lastRanked = rows.findLastIndex((r) => r.rank != null);
  const firstRest = rows.findIndex((r) => r.rank == null);
  assert.ok(firstRest === -1 || firstRest > lastRanked);
  assert.deepEqual(
    rest.map((r) => r.iso),
    ['ZZZ'],
  );
  assert.equal(rest[0].composite, null);
  assert.equal(rest[0].present, 1);
  assert.equal(rest[0].live, 4);
  for (const r of ranked) {
    assert.equal(typeof r.composite, 'number');
    assert.equal(r.year, 2024);
    assert.ok(r.strongest && r.weakest);
  }
  assert.deepEqual(M.compositeTableRows(null), []);
});

test('dimension table: oriented scores, strongest first, ties share a rank', () => {
  const debt = model.liveDims.find((d) => d.id === 'debt_burden');
  const rows = M.dimensionTableRows(model, debt);
  assert.equal(rows[0].iso, 'DNK', 'lowest debt ranks first');
  assert.equal(rows[0].score, 90);
  assert.equal(rows[0].rank, 1);
  // BBB and CCC tie at 50 → both rank 2; next is 4.
  const tied = rows.filter((r) => r.score === 50);
  assert.equal(tied.length, 2);
  assert.ok(tied.every((r) => r.rank === 2));
  assert.equal(rows.at(-1).rank, 4);
  assert.ok(rows.every((r) => r.of === 4));
  const scores = rows.map((r) => r.score);
  assert.deepEqual(
    scores,
    [...scores].sort((a, b) => b - a),
  );
});

test('groupDimsByCategory follows the category order, then display order', () => {
  const groups = M.groupDimsByCategory(model.liveDims);
  assert.deepEqual(
    groups.map((g) => g.category),
    ['Economic', 'Fundamentals', 'Power Projection'],
  );
  assert.deepEqual(
    groups[0].dims.map((d) => d.id),
    ['debt_burden', 'trade'],
  );
});

test('countryProfile: rank, top and bottom by rank, no overlap', () => {
  const p = M.countryProfile(model, 'DNK');
  assert.equal(p.name, 'Denmark');
  assert.equal(p.present, 4);
  assert.equal(p.live, 4);
  assert.equal(p.top[0].id, 'debt_burden');
  assert.ok(p.top.length <= 3 && p.bottom.length <= 3);
  const topIds = new Set(p.top.map((d) => d.id));
  assert.ok(p.bottom.every((d) => !topIds.has(d.id)));
  for (let i = 1; i < p.top.length; i += 1) assert.ok(p.top[i - 1].rank <= p.top[i].rank);
  assert.equal(p.leaderIso, empireComposite(model, model.liveDims)[0].iso);
  const z = M.countryProfile(model, 'ZZZ');
  assert.equal(z.rank, null, 'below the coverage rule');
  assert.equal(M.countryProfile(model, 'QQQ'), null);
});

test('pairRows: one row per live dimension either country has', () => {
  const rows = M.pairRows(model, 'DNK', 'ZZZ');
  assert.equal(rows.length, 4);
  const trade = rows.find((r) => r.id === 'trade');
  assert.equal(trade.a, 55);
  assert.equal(trade.b, 99);
  assert.equal(rows.find((r) => r.id === 'education').b, null);
});

test('no mock data and no legacy CSS on the page', () => {
  const dir = new URL('../src/app/datasets/global-empire-lighthouse/', import.meta.url);
  for (const f of ['page.js', 'EmpireRankingsClient.jsx', 'empire-rankings-model.js']) {
    const src = readFileSync(new URL(f, dir), 'utf8');
    assert.ok(!/EMPIRE_DATA|MOCK DATA|app-legacy/.test(src), f);
  }
});

test('/empire-ranking redirects here, and the hub route skips the lighthouse slug', () => {
  const cfg = readFileSync(new URL('../next.config.js', import.meta.url), 'utf8');
  assert.match(
    cfg,
    /source: '\/empire-ranking',\s*destination: '\/datasets\/global-empire-lighthouse',\s*permanent: true/,
  );
  const hub = readFileSync(new URL('../src/app/datasets/[hub]/page.js', import.meta.url), 'utf8');
  assert.match(hub, /filter\(\(\[id\]\) => id !== 'lighthouse'\)/);
});
