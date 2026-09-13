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
const { FEW_SHOT_QUERIES, FEW_SHOT } = await import('../src/app/api/ezanaql/generate/few-shots.js');

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
