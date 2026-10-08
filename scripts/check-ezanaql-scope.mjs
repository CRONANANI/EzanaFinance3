/**
 * EzanaQL dimension scope. Run directly:
 *   node scripts/check-ezanaql-scope.mjs   (wired as `npm run test:ezanaql-scope`)
 *
 * EzanaQL runs on the dimension hubs only, and a hub's bar reaches only its own
 * dimension's datasets. These pin that: in-dimension FROM and JOIN validate,
 * out-of-dimension ones are refused with the user-facing message, every name
 * in DIMENSION_DATASETS is a catalog dataset, and every few-shot validates
 * under the dimension it teaches.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { register } from 'node:module';

register('./ezanaql-node-loader.mjs', import.meta.url);

const { parse } = await import('../src/lib/ezanaql/parser.js');
const { validate } = await import('../src/lib/ezanaql/validator.js');
const {
  CATALOG,
  CATALOG_VERSION,
  DIMENSION_DATASETS,
  DIMENSION_LABELS,
  dimensionHasQueryableData,
  dimensionOfDataset,
  catalogSchemaForPrompt,
} = await import('../src/lib/ezanaql/catalog.js');
const { FEW_SHOTS_BY_DIMENSION } = await import('../src/app/api/ezanaql/generate/few-shots.js');

const DIMENSIONS = ['capitol', 'titans', 'eyes', 'whispers', 'hive', 'lighthouse', 'regulatory'];
const check = (q, dimension) => validate(parse(q), { dimension });

test('catalog version is 1.5.0', () => {
  assert.equal(CATALOG_VERSION, '1.5.0');
});

test('DIMENSION_DATASETS covers the seven dimensions and names only catalog datasets', () => {
  assert.deepEqual(Object.keys(DIMENSION_DATASETS).sort(), [...DIMENSIONS].sort());
  for (const [dim, names] of Object.entries(DIMENSION_DATASETS)) {
    assert.ok(DIMENSION_LABELS[dim], `${dim} has a label`);
    for (const n of names) assert.ok(CATALOG[n], `${dim}: ${n} is not in CATALOG`);
  }
});

test('a dataset belongs to at most one dimension', () => {
  const seen = new Map();
  for (const [dim, names] of Object.entries(DIMENSION_DATASETS)) {
    for (const n of names) {
      assert.ok(!seen.has(n), `${n} is in both ${seen.get(n)} and ${dim}`);
      seen.set(n, dim);
    }
  }
});

test('joins are declared only within a dimension, symmetric, on a shared key', () => {
  for (const d of Object.values(CATALOG)) {
    for (const j of d.joinableWith || []) {
      assert.ok(CATALOG[j], `${d.name} joins unknown ${j}`);
      assert.equal(
        dimensionOfDataset(j),
        dimensionOfDataset(d.name),
        `${d.name} -> ${j} crosses dimensions`,
      );
      assert.ok(CATALOG[j].joinableWith.includes(d.name), `${j} does not list ${d.name}`);
      const shared = (d.joinKeys || []).filter((k) => (CATALOG[j].joinKeys || []).includes(k));
      assert.ok(shared.length, `${d.name} and ${j} share no join key`);
    }
  }
});

test('in-dimension FROM and JOIN validate', () => {
  check('FROM gov.contracts SELECT recipient LIMIT 5;', 'capitol');
  check(
    'FROM capitol.congress_trades SEMI JOIN capitol.committee_seats ON bioguide_id SELECT politician LIMIT 5;',
    'capitol',
  );
  check(
    'FROM capitol.campaign_finance JOIN capitol.congress_trades ON bioguide_id SELECT politician, COUNT(congress_trades.ticker) AS trades GROUP BY politician LIMIT 5;',
    'capitol',
  );
  check(
    'FROM titans.whale_moves SEMI JOIN titans.holdings_13f ON ticker SELECT ticker LIMIT 5;',
    'titans',
  );
  check('FROM prediction.markets SELECT question LIMIT 5;', 'hive');
  check('FROM lighthouse.oecd SELECT country, value LIMIT 5;', 'lighthouse');
  check('FROM eyes.chokepoints SELECT chokepoint, transits LIMIT 5;', 'eyes');
  check('FROM eyes.patents SELECT ticker, patent_date LIMIT 5;', 'eyes');
});

test('out-of-dimension FROM is refused with the hub message', () => {
  assert.throws(
    () => check('FROM titans.holdings_13f SELECT ticker LIMIT 5;', 'capitol'),
    /That dataset is not part of Capitol Watch\. Open its hub to query it\./,
  );
  assert.throws(
    () => check('FROM gov.contracts SELECT recipient LIMIT 5;', 'titans'),
    /not part of Titans Shadow/,
  );
  assert.throws(
    () => check('FROM prediction.markets SELECT question LIMIT 5;', 'eyes'),
    /not part of Eyes Above/,
  );
  assert.throws(
    () => check('FROM eyes.ports SELECT port LIMIT 5;', 'capitol'),
    /not part of Capitol Watch/,
  );
});

test('out-of-dimension JOIN is refused', () => {
  assert.throws(
    () =>
      check(
        'FROM capitol.congress_trades SEMI JOIN titans.holdings_13f ON ticker SELECT ticker LIMIT 5;',
        'capitol',
      ),
    /not part of Capitol Watch/,
  );
});

test('an unknown dimension is refused', () => {
  assert.throws(() => check('FROM gov.contracts SELECT recipient;', 'nope'), /dimension/i);
});

test('dimensions without queryable data are closed', () => {
  for (const dim of ['whispers', 'regulatory']) {
    assert.equal(dimensionHasQueryableData(dim), false, `${dim} should be closed`);
  }
  for (const dim of ['capitol', 'titans', 'eyes', 'hive', 'lighthouse']) {
    assert.equal(dimensionHasQueryableData(dim), true, `${dim} should be open`);
  }
});

test('the prompt schema for a dimension lists only that dimension', () => {
  const text = catalogSchemaForPrompt('titans');
  assert.match(text, /titans\.holdings_13f/);
  assert.ok(!text.includes('gov.contracts'), 'titans prompt leaks gov.contracts');
  assert.ok(!text.includes('prediction.markets'), 'titans prompt leaks prediction.markets');
  const capitol = catalogSchemaForPrompt('capitol');
  assert.ok(!capitol.includes('titans.'), 'capitol prompt leaks titans datasets');
});

test('every few-shot validates under the dimension it teaches', () => {
  for (const [dim, list] of Object.entries(FEW_SHOTS_BY_DIMENSION)) {
    list.forEach(({ query }, i) => {
      assert.doesNotThrow(() => check(query, dim), `${dim} few-shot #${i + 1}`);
    });
  }
});

test("every hub row's Query this template validates in its hub's dimension", async () => {
  const { HUB_QUERIES, HUB_QUERY_DIMENSION } = await import('../src/lib/datasets/hub-queries.js');
  const sample = 'X"Y\\Z'; // quotes and backslashes are dropped, never break the string
  for (const [name, build] of Object.entries(HUB_QUERIES)) {
    const query = build(sample, sample);
    assert.doesNotThrow(
      () => check(query, HUB_QUERY_DIMENSION[name]),
      `${name} must validate in ${HUB_QUERY_DIMENSION[name]}`,
    );
  }
});

test('each hub seed validates in its own dimension', async () => {
  const { HUB_SEEDS } = await import('../src/lib/ezanaql/seeds.js');
  for (const [dim, query] of Object.entries(HUB_SEEDS)) {
    assert.doesNotThrow(() => check(query, dim), `${dim} seed`);
  }
});
