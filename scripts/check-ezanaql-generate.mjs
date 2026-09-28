/**
 * Regression tests for the EzanaQL seed + few-shot queries. Run directly:
 *   node scripts/check-ezanaql-generate.mjs   (wired as `npm run test:ezanaql`)
 *
 * The EzanaQL validator only accepts CATALOG field names (e.g. award_value,
 * which columnMap binds to the raw award_amount column). These tests pin the
 * builder's pre-seeded queries and the generator's few-shot examples to the
 * catalog, so raw-column drift (the "Unknown field award_amount" bug) fails
 * CI instead of shipping. Self-contained node:test file per
 * docs/decisions/004-node-test-check-scripts.md.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { register } from 'node:module';

// src/lib/ezanaql uses extensionless relative imports (webpack-style); the
// hook retries them with `.js` so Node can load the UNTOUCHED module. It must
// be registered before the ezanaql modules load, hence the dynamic imports.
register('./ezanaql-node-loader.mjs', import.meta.url);

const { parse } = await import('../src/lib/ezanaql/parser.js');
const { validate } = await import('../src/lib/ezanaql/validator.js');
const { SEED_QUERY, seedFromFilters } =
  await import('../src/app/datasets/government/contracts/ezanaql-seed.js');
const { SEEDS_BY_DATASET, seedForDataset } = await import('../src/lib/ezanaql/seeds.js');
const { FEW_SHOT_QUERIES, FEW_SHOT } = await import('../src/app/api/ezanaql/generate/few-shots.js');
const { CATALOG, CATALOG_VERSION, catalogSchemaForPrompt } =
  await import('../src/lib/ezanaql/catalog.js');

function assertValidates(query, label) {
  let ast;
  assert.doesNotThrow(() => {
    ast = parse(query);
  }, `${label} must parse`);
  assert.doesNotThrow(() => validate(ast), `${label} must validate against the catalog`);
}

// ── the builder's fallback seed ────────────────────────────────────────────

test('SEED_QUERY parses and validates against the catalog', () => {
  assertValidates(SEED_QUERY, 'SEED_QUERY');
});

test('seeds reference catalog fields, never raw DB columns', () => {
  assert.ok(!SEED_QUERY.includes('award_amount'), 'SEED_QUERY leaks raw column award_amount');
  assert.ok(SEED_QUERY.includes('award_value'));
});

// ── filter-derived seeds ───────────────────────────────────────────────────

test('seedFromFilters validates with no active filters', () => {
  assertValidates(seedFromFilters({ agencies: [], fiscalYear: 'all' }), 'no-filter seed');
});

test('seedFromFilters validates with one agency + fiscal year', () => {
  assertValidates(
    seedFromFilters({ agencies: ['Department of Defense'], fiscalYear: 2024 }),
    'single-agency seed',
  );
});

test('seedFromFilters validates with multiple agencies (IN clause)', () => {
  assertValidates(
    seedFromFilters({ agencies: ['NASA', 'Department of Energy'], fiscalYear: 'all' }),
    'multi-agency seed',
  );
});

test('seedFromFilters never emits raw DB columns', () => {
  const q = seedFromFilters({ agencies: ['NASA'], fiscalYear: 2023 });
  assert.ok(!q.includes('award_amount'), 'seedFromFilters leaks raw column award_amount');
});

// ── generator few-shots (what the model learns from) ──────────────────────

test('every few-shot example query validates against the catalog', () => {
  FEW_SHOT_QUERIES.forEach((q, i) => assertValidates(q, `few-shot #${i + 1}`));
});

test('few-shot prompt block embeds exactly the validated queries', () => {
  for (const q of FEW_SHOT_QUERIES) {
    assert.ok(FEW_SHOT.includes(q), 'FEW_SHOT prompt drifted from FEW_SHOT_QUERIES');
  }
});

/* A dataset marked available is a promise that the executor can run it AND
   that it has something to return. These pin the shape of that promise, so a
   half-finished binding fails here rather than at the first query a user
   writes. */
/* Every dataset carrying a `table` is checked, available or not: a binding
   held back only because its table is empty still has to be correct, or it
   will be wrong on the day someone flips it. */
test('every bound dataset is bound correctly', () => {
  for (const d of Object.values(CATALOG)) {
    if (!d.table) continue;
    assert.ok(d.columnMap, `${d.name} is bound to a table but has no columnMap`);
    for (const f of d.defaultProjection) {
      assert.ok(d.fields[f], `${d.name} projects ${f}, which is not a declared field`);
    }
    for (const [field, col] of Object.entries(d.columnMap)) {
      assert.ok(d.fields[field], `${d.name} maps ${field}, which is not a declared field`);
      /* A null column means derived, and a derived field must say how. */
      if (col === null) {
        assert.ok(
          d.derived && d.derived[field],
          `${d.name}.${field} has no column and no derivation`,
        );
      }
    }
    for (const [field, spec] of Object.entries(d.derived || {})) {
      assert.ok(d.fields[field], `${d.name} derives ${field}, which is not a declared field`);
      assert.ok(spec.kind, `${d.name}.${field} has no derivation kind`);
      assert.equal(
        d.columnMap[field] ?? null,
        null,
        `${d.name}.${field} is derived but also mapped to a column`,
      );
    }
  }
});

/* A bracket midpoint is an estimate. It may be sorted on; it may never sit in
   a default projection, where it would read as the amount. */
test('estimate fields are never in a default projection', () => {
  for (const d of Object.values(CATALOG)) {
    for (const [field, meta] of Object.entries(d.fields || {})) {
      if (!meta.estimate) continue;
      assert.ok(
        !d.defaultProjection.includes(field),
        `${d.name} projects the estimate ${field} by default`,
      );
    }
  }
});

test('the prompt schema lists live datasets and names the rest as not queryable', () => {
  const text = catalogSchemaForPrompt();
  const live = Object.values(CATALOG).filter((d) => d.available);
  const dark = Object.values(CATALOG).filter((d) => !d.available);
  assert.ok(live.length >= 4, 'expected at least the four live datasets');
  for (const d of live) assert.match(text, new RegExp(d.name.replace('.', '\\.')));
  assert.match(text, /Not yet queryable:/);
  for (const d of dark) {
    assert.ok(text.includes(d.name), `${d.name} should be named as not queryable`);
  }
  assert.equal(CATALOG_VERSION, '1.1.0');
});

/* Every page's query bar opens on one of these. A seed that does not validate
   hands someone a bar whose Run can only refuse, which is worse than no bar. */
test('every dataset seed validates against the catalog', () => {
  for (const [dataset, query] of Object.entries(SEEDS_BY_DATASET)) {
    assert.doesNotThrow(() => validate(parse(query)), `seed for ${dataset} must validate`);
  }
});

/* A seed is only offered for a dataset that can actually answer it. */
test('no seed targets an unavailable dataset', () => {
  for (const dataset of Object.keys(SEEDS_BY_DATASET)) {
    assert.equal(CATALOG[dataset]?.available, true, `${dataset} has a seed but is not live`);
  }
  // The fallback is the contracts seed, which must itself be live.
  assert.doesNotThrow(() => validate(parse(seedForDataset('does.not.exist'))));
});
