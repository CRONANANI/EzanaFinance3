/**
 * Country rankings for Sonar's country_rank briefing. Fixture figures are
 * synthetic (round numbers), never real World Bank values.
 * Run: npm run test:macro-rank (in npm test).
 */
import test from 'node:test';
import assert from 'node:assert/strict';

const R = await import('../src/lib/sonar/macro/rank.js');
const NOM = 'NY.GDP.MKTP.CD';

/* 20 sovereigns + an aggregate + a territory; 2023 complete, 2024 has only
   India and three others (low coverage), so the common year is 2023. */
const names = { USA: 'United States', CHN: 'China', DEU: 'Germany', JPN: 'Japan', IND: 'India' };
const iso = [
  'USA',
  'CHN',
  'DEU',
  'JPN',
  'IND',
  ...Array.from({ length: 15 }, (_, i) => `C${String(i).padStart(2, '0')}`),
];
const rows = [];
iso.forEach((c, i) => {
  for (const y of [2021, 2022, 2023]) {
    if (c === 'C14' && y === 2021) continue; // a gap: no value
    rows.push({
      iso3: c,
      name: names[c] || c,
      indicator: NOM,
      year: y,
      value: (100 - i * 4) * 1e10 + y,
    });
  }
});
rows.push({
  iso3: 'WLD',
  name: 'World',
  indicator: NOM,
  year: 2023,
  value: 1e15,
  is_aggregate: true,
});
rows.push({
  iso3: 'MNP',
  name: 'Northern Mariana Islands',
  indicator: NOM,
  year: 2023,
  value: 9e14,
});
for (const c of ['IND', 'USA', 'CHN', 'DEU'])
  rows.push({ iso3: c, name: names[c], indicator: NOM, year: 2024, value: 5e12 });
/* A forecast row never mixes into an observed ranking. */
rows.push({
  iso3: 'IND',
  name: 'India',
  indicator: NOM,
  year: 2023,
  value: 9.9e15,
  measure_type: 'forecast',
});

test('one common year: the newest year with >= 85% coverage', () => {
  assert.equal(R.latestCommonYear(rows, NOM), 2023);
});

test('every row of a ranking carries the same year', () => {
  const ranked = R.rankCountries(rows, NOM, 2023);
  assert.ok(ranked.length > 0);
  assert.ok(ranked.every((r) => r.year === 2023));
});

test('aggregates never rank; territories only when asked, then labelled', () => {
  const ranked = R.rankCountries(rows, NOM, 2023);
  assert.ok(!ranked.some((r) => r.iso3 === 'WLD'));
  assert.ok(!ranked.some((r) => r.iso3 === 'MNP'));
  const withT = R.rankCountries(rows, NOM, 2023, { includeTerritories: true });
  assert.ok(!withT.some((r) => r.iso3 === 'WLD'));
  assert.equal(withT.find((r) => r.iso3 === 'MNP').territory, true);
});

test('forecast rows never enter an observed ranking', () => {
  const india = R.rankCountries(rows, NOM, 2023).find((r) => r.iso3 === 'IND');
  assert.notEqual(india.value, 9.9e15);
});

test('ties share a rank', () => {
  const t = [
    { iso3: 'A', indicator: NOM, year: 2023, value: 3 },
    { iso3: 'B', indicator: NOM, year: 2023, value: 2 },
    { iso3: 'C', indicator: NOM, year: 2023, value: 2 },
    { iso3: 'D', indicator: NOM, year: 2023, value: 1 },
  ];
  assert.deepEqual(
    R.rankCountries(t, NOM, 2023).map((r) => r.rank),
    [1, 2, 2, 4],
  );
});

test('rankHistory is null for a year with no value', () => {
  const h = R.rankHistory(rows, NOM, 'C14', [2021, 2022, 2023]);
  assert.equal(h[0].rank, null);
  assert.ok(h[1].rank > 0);
});

test('India fixture: rank, neighbours and history', () => {
  const ranked = R.rankCountries(rows, NOM, 2023);
  const india = ranked.find((r) => r.iso3 === 'IND');
  assert.equal(india.rank, 5);
  assert.equal(india.of, 20);
  assert.deepEqual(
    R.neighbours(ranked, 'IND', 2).map((r) => r.iso3),
    ['DEU', 'JPN', 'IND', 'C00', 'C01'],
  );
  const payload = R.buildRankingsPayload(rows, { historyFrom: 2021 });
  const v = R.countryRankView(payload, 'IND');
  assert.equal(v.metrics.gdp_nominal_usd.rank, 5);
  assert.equal(v.metrics.gdp_nominal_usd.year, 2023);
  assert.deepEqual(
    v.metrics.gdp_nominal_usd.history.map((x) => x.rank),
    [5, 5, 5],
  );
  assert.equal(v.metrics.gdp_nominal_usd.gap.above.iso3, 'JPN');
});

test('topWithEntity appends the entity and neighbours outside the top n', () => {
  const ranked = R.rankCountries(rows, NOM, 2023);
  const { top, tail } = R.topWithEntity(ranked, 'C10', 10, 2);
  assert.equal(top.length, 10);
  assert.ok(tail.some((r) => r.iso3 === 'C10'));
  assert.ok(!tail.some((r) => top.includes(r)));
});

/* ── the brief: facts, lede, number check ── */

const B = await import('../src/lib/sonar/macro/brief.js');

test('the lede names measure, year and source, numbers from data', () => {
  const payload = R.buildRankingsPayload(rows, { historyFrom: 2021 });
  const v = R.countryRankView(payload, 'IND');
  const lede = B.rankLede(v, { rank: 7, of: 40, year: 2024, composite: 61.2 });
  assert.match(lede, /^India ranks 5th of 20 economies by nominal GDP in 2023 \(World Bank\)/);
  assert.match(lede, /Global Empire Rankings it is 7th of 40/);
  assert.ok(
    B.numbersSupported(lede, B.rankFacts(v, { rank: 7, of: 40, year: 2024, composite: 61.2 })),
  );
});

test('a brief with an invented number fails the check', () => {
  const payload = R.buildRankingsPayload(rows, { historyFrom: 2021 });
  const v = R.countryRankView(payload, 'IND');
  const facts = B.rankFacts(v);
  assert.ok(B.numbersSupported('India ranked 5th of 20 economies in 2023 [S1].', facts));
  assert.deepEqual(B.unsupportedNumbers('India is the 3rd largest economy in 2023.', facts), [3]);
  assert.ok(!B.numbersSupported('India will reach $10 trillion by 2030.', facts));
});

test('numbersIn reads scales and thousands separators', () => {
  assert.deepEqual(B.numbersIn('$3.9 trillion, $2,702 and 140th'), [3.9e12, 2702, 140]);
});

test('deterministic brief exists whenever a rank does', () => {
  const payload = R.buildRankingsPayload(rows, { historyFrom: 2021 });
  assert.ok(B.deterministicBrief(R.countryRankView(payload, 'IND')).startsWith('India ranks 5th'));
  assert.equal(B.deterministicBrief(R.countryRankView(payload, 'ZZZ')), null);
});

/* ── Part A: dataset card relevance ── */

const { cardQualifies, rankCardsForQuery } = await import('../src/lib/datasets/card-registry.js');
const india = [{ kind: 'country', key: 'IND', label: 'India' }];
const growthCard = (rows) => ({ id: 'fastest-growth', rows });

test('a card without the searched country is never attached', () => {
  const q = 'what ranking is india in the world economy';
  const without = growthCard([
    { key: 'GUY', name: 'Guyana' },
    { key: 'MNP', name: 'Northern Mariana Islands' },
  ]);
  assert.equal(cardQualifies(without, without, { query: q, entities: india }), false);
  const withIndia = growthCard([
    { key: 'GUY', name: 'Guyana' },
    { key: 'IND', name: 'India', highlight: true },
  ]);
  assert.equal(cardQualifies(withIndia, withIndia, { query: q, entities: india }), true);
});

test('keyword overlap alone ("ranking", "economy") never qualifies a card', () => {
  const c = growthCard([{ key: 'GUY', name: 'Guyana' }]);
  assert.equal(cardQualifies(c, c, { query: 'world economy ranking', entities: [] }), false);
  /* a ticker card is never attached to a country ping */
  const held = { id: 'most-held', rows: [{ key: 'NVDA', name: 'NVIDIA' }] };
  assert.equal(
    cardQualifies(held, held, {
      query: 'what ranking is india in the world economy',
      entities: india,
    }),
    false,
  );
});

test('"fastest growing economies" still gets the growth card (exact metric)', () => {
  const ids = rankCardsForQuery('fastest growing economies').map((m) => m.id);
  assert.ok(ids.includes('fastest-growth'));
  const c = growthCard([{ key: 'GUY', name: 'Guyana' }]);
  assert.equal(cardQualifies(c, c, { query: 'fastest growing economies', entities: [] }), true);
});
