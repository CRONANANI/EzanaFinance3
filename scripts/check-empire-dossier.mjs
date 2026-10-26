#!/usr/bin/env node
/* Sonar's Empire Rankings leg (empireDossier): top 3 by best rank (ties by
   score, then display order), dist only on the top 3 and descending, deep
   link shape. Fixture model, no network.
   Usage: node --no-warnings --import ./scripts/register-sonar-loader.mjs --test scripts/check-empire-dossier.mjs */
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildEmpireModel } from '../src/app/datasets/oecd-macro/oecd-empire-model.js';
import { empireDossier, EMPIRE_PAGE } from '../src/lib/sonar/empire-dossier.js';

const DIMS = [
  { id: 'gdp', name: 'Economic Output', category: 'Economic', display_order: 1, has_data: true },
  { id: 'growth', name: 'Growth', category: 'Economic', display_order: 2, has_data: true },
  {
    id: 'debt',
    name: 'Debt',
    category: 'Fundamentals',
    display_order: 3,
    has_data: true,
    higher_is_better: false,
  },
  { id: 'edu', name: 'Education', category: 'Social', display_order: 4, has_data: true },
  { id: 'trade', name: 'Trade', category: 'Economic', display_order: 5, has_data: true },
  {
    id: 'conflict',
    name: 'Internal Conflict',
    category: 'Social',
    display_order: 6,
    has_data: false,
  },
];
const S = {
  /*          gdp  growth debt edu trade */
  DNK: [40, 30, 20, 95, 70],
  USA: [99, 50, 80, 80, 90],
  CHN: [90, 90, 60, 60, 99],
  DEU: [70, 20, 50, 95, 80],
};
const empire = {
  year: 2024,
  dimensions: DIMS,
  countries: [
    { code: 'DNK', name: 'Denmark' },
    { code: 'USA', name: 'United States' },
    { code: 'CHN', name: 'China' },
    { code: 'DEU', name: 'Germany' },
  ],
  scores: Object.entries(S).flatMap(([iso3, vals]) =>
    vals.map((score, i) => ({ iso3, dimensionId: DIMS[i].id, score })),
  ),
};
const model = buildEmpireModel(empire);

test('top 3 = best rank; ties broken by score, then display order', () => {
  const d = empireDossier(model, { iso3: 'DNK' });
  /* DNK: debt inverted 20 -> 80, the best of four (rank 1); edu 95 ties
     DEU's 95 (rank 1, score 95); then trade 70 (rank 4) vs growth 30 (rank 3)
     vs gdp 40 (rank 4). */
  assert.deepEqual(
    d.top.map((t) => [t.id, t.rank]),
    [
      ['edu', 1],
      ['debt', 1],
      ['growth', 3],
    ],
  );
});

test('dist is on the top 3 only, descending, one decimal, all ranked countries', () => {
  const d = empireDossier(model, { iso3: 'DNK' });
  for (const t of d.top) {
    assert.equal(t.dist.length, 4);
    assert.deepEqual(
      t.dist,
      [...t.dist].sort((a, b) => b - a),
    );
    assert.ok(t.dist.every((v) => Math.round(v * 10) === v * 10));
  }
  assert.ok(
    d.dims.every((x) => !('dist' in x)),
    'no dist on the full dims list',
  );
  assert.deepEqual(d.top.find((t) => t.id === 'debt').dist, [80, 50, 40, 20]);
});

test('href shapes: page link and per-dimension deep link', () => {
  const d = empireDossier(model, { iso3: 'DNK' });
  assert.equal(d.href, `${EMPIRE_PAGE}?country=DNK`);
  assert.equal(d.top[0].href, `${EMPIRE_PAGE}?dim=edu&country=DNK#dim-edu`);
  assert.equal(d.source, 'Ezana Global Empire Rankings');
  assert.equal(d.coverage.total, 5, 'pending dimensions are not counted');
});

test('no live score -> null (the dry row stays)', () => {
  assert.equal(empireDossier(model, { iso3: 'FRA' }), null);
  assert.equal(empireDossier(null, { iso3: 'DNK' }), null);
  assert.equal(buildEmpireModel({ scores: [] }), null);
});
