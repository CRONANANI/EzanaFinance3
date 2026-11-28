/**
 * Revenue concept comparability (Sonar 6.4 final integration). Pure fixtures.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { revenueGrowth, companyRatios } from '../src/lib/sonar/composer/calc.js';
import { METRICS } from '../src/lib/sec/xbrl.js';

const R = (end, value, concept = 'us-gaap:Revenues') => ({ end, value, concept });

test('same concept, consecutive years: growth', () => {
  const g = revenueGrowth([R('2025-12-31', 110), R('2024-12-31', 100)]);
  assert.ok(Math.abs(g.value - 0.1) < 1e-9);
  assert.equal(g.reason, null);
});

test('gross of excise taxes is never compared with net of them', () => {
  const g = revenueGrowth([
    R('2025-12-31', 120, 'us-gaap:RevenueFromContractWithCustomerIncludingAssessedTax'),
    R('2024-12-31', 100, 'us-gaap:RevenueFromContractWithCustomerExcludingAssessedTax'),
  ]);
  assert.equal(g.value, null);
  assert.match(g.reason, /not comparable/);
});

test('missing is never zero; a skipped or mixed-length year is not annual growth', () => {
  assert.equal(revenueGrowth([R('2025-12-31', 110)]).reason, 'prior-year revenue not filed');
  assert.equal(revenueGrowth([R('2025-12-31', null), R('2024-12-31', 100)]).value, null);
  assert.equal(revenueGrowth([R('2025-12-31', 110), R('2024-12-31', 0)]).value, null);
  assert.match(
    revenueGrowth([R('2025-12-31', 110), R('2023-12-31', 100)]).reason,
    /not consecutive/,
  );
  assert.match(
    revenueGrowth([R('2025-12-31', 110), R('2025-09-30', 100)]).reason,
    /not consecutive/,
  );
  /* A 52/53-week fiscal year is still consecutive. */
  assert.ok(revenueGrowth([R('2025-01-03', 110), R('2023-12-29', 100)]).value > 0);
});

test('rows stored before taxonomy_concept existed compare as before', () => {
  const g = revenueGrowth([
    { end: '2025-12-31', value: 110 },
    { end: '2024-12-31', value: 100 },
  ]);
  assert.ok(Math.abs(g.value - 0.1) < 1e-9);
});

test('companyRatios reports the reason and the concept', () => {
  const r = companyRatios({
    annual: {
      revenue: [
        R('2025-12-31', 120, 'us-gaap:Revenues'),
        R('2024-12-31', 100, 'us-gaap:RevenueFromContractWithCustomerExcludingAssessedTax'),
      ],
    },
    instant: {},
  });
  assert.equal(r.revenue_growth, null);
  assert.match(r.revenue_growth_reason, /not comparable/);
  assert.equal(r.revenue_concept, 'us-gaap:Revenues');
  assert.equal(r.revenue, 120);
});

test('the concept map keeps its order: new concepts only fill gaps, never replace a filed one', () => {
  const rev = METRICS.find((m) => m.key === 'revenue');
  const c = rev.concepts;
  const i = (name) => c.findIndex((x) => x.includes(name));
  assert.ok(i('Revenues') >= 0);
  assert.ok(i('RevenueFromContractWithCustomerExcludingAssessedTax') >= 0);
  assert.ok(i('IncludingAssessedTax') > i('ExcludingAssessedTax'));
  /* IFRS and company extensions stay unsupported: us-gaap only. */
  assert.ok(c.every((x) => x.startsWith('us-gaap:')));
});

test('loaders read taxonomy_concept so the check can run', () => {
  for (const p of [
    'src/lib/sonar/composer/analytics-server.js',
    'src/lib/sonar/composer/execute.js',
  ])
    assert.match(readFileSync(p, 'utf8'), /value, taxonomy_concept'/);
});
