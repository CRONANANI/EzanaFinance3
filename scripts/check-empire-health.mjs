#!/usr/bin/env node
/* The Empire backbone health: readyz's empire leg (empireStatus) and the
   drift check's seed-presence rules (seedProblems). No network.
   Usage: node --no-warnings --import ./scripts/register-sonar-loader.mjs --test scripts/check-empire-health.mjs */
import test from 'node:test';
import assert from 'node:assert/strict';
import { empireStatus } from '../src/lib/health/empire-status.js';
import { seedProblems, CATALOG_SQL } from './check-schema-drift.mjs';

const NOW = new Date('2026-10-26T00:00:00Z');
const full = { dims: 18, metricMap: 31, countries: 61, populated: true, latestYear: 2024 };

test('empireStatus: ok, stale, unseeded', () => {
  assert.equal(empireStatus(full, NOW), 'ok');
  assert.equal(empireStatus({ ...full, latestYear: 2021 }, NOW), 'stale');
  /* the live state on 25 Oct: nothing seeded, view never populated */
  assert.equal(
    empireStatus({ dims: 0, metricMap: 0, countries: 11, populated: false, latestYear: NaN }, NOW),
    'unseeded',
  );
  /* the live state on 26 Oct: seeded, sync not yet run */
  assert.equal(empireStatus({ ...full, populated: false, latestYear: NaN }, NOW), 'unseeded');
  assert.equal(empireStatus({ ...full, dims: null }, NOW), 'unseeded');
});

test('seedProblems names the gap and the fix', () => {
  assert.deepEqual(
    seedProblems({
      empire_dimensions: 18,
      dimension_metric_map: 31,
      empire_countries: 61,
      'country_dimension_scores_mat:populated': true,
    }),
    [],
  );
  const p = seedProblems({
    empire_dimensions: 0,
    dimension_metric_map: 0,
    empire_countries: 11,
    'country_dimension_scores_mat:populated': false,
  });
  assert.deepEqual(
    p.map((x) => x.object),
    [
      'empire_dimensions',
      'dimension_metric_map',
      'empire_countries',
      'country_dimension_scores_mat',
    ],
  );
  assert.match(p[0].fix, /20260419120100_empire_scores_seeds\.sql/);
  assert.match(p[3].fix, /sync-empire-data/);
});

test('the catalog query carries the guarded seed counts', () => {
  assert.match(CATALOG_SQL, /'seeds', json_build_object\(/);
  assert.match(CATALOG_SQL, /to_regclass\('public\.empire_dimensions'\) is null then null/);
  assert.match(CATALOG_SQL, /matviewname = 'country_dimension_scores_mat'/);
});
