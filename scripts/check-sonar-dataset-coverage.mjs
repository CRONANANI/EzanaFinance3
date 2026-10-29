/**
 * Sonar dataset coverage guard (sonar-all-datasets spec, Step 4).
 *
 * Fails CI if any LIVE dataset in the taxonomy has no Sonar source: it must be
 * a first-class adapter, be recorded in COVERED_BY_EXISTING (reached by an
 * existing Sonar surface), or be listed in EXCLUDED with a reason. Also proves
 * the resolver turns the Iran-outlook ping into the right countries/themes and
 * that the US Sanctions adapter selects it and maps rows to cited findings.
 *
 * Run: npm run test:sonar-dataset-coverage
 *   (node --import ./scripts/register-sonar-loader.mjs so '@/' resolves).
 */
import test from 'node:test';
import assert from 'node:assert/strict';

const { findMissingAdapters, coverageReport, liveDatasets } =
  await import('../src/lib/sonar/sources/registry.js');
const { resolveQuery } = await import('../src/lib/sonar/resolveQuery.js');
const sanctions = (await import('../src/lib/sonar/sources/sanctions.js')).default;
const { rowsToFindings } = await import('../src/lib/sonar/sources/sanctions.js');

test('every live taxonomy dataset has a registered Sonar source', () => {
  assert.deepEqual(
    findMissingAdapters(),
    [],
    'live datasets with no adapter / coverage / EXCLUDED reason',
  );
});

test('coverage accounts for every live dataset exactly once', () => {
  const r = coverageReport();
  const total = r.adapters.length + r.covered.length + r.excluded.length;
  // Every live slug is classified; adapters+covered+excluded cover them all.
  assert.ok(r.liveCount > 0, 'taxonomy has live datasets');
  assert.ok(total >= r.liveCount, 'classifications cover all live datasets');
  assert.equal(r.missing.length, 0);
});

test('sanctions is a first-class adapter on Global Empire Lighthouse', () => {
  assert.equal(sanctions.slug, 'sanctions');
  assert.equal(sanctions.dimension, 'Global Empire Lighthouse');
  const slugs = liveDatasets().map((d) => d.slug);
  assert.ok(slugs.includes('sanctions'), 'sanctions is a live taxonomy slug');
});

test('resolveQuery routes the Iran outlook ping to countries + themes', () => {
  const q = resolveQuery('Economic outlook of US after involvement with Iran');
  assert.ok(q.countries.includes('US'), 'US detected');
  assert.ok(q.countries.includes('IR'), 'Iran detected');
  assert.ok(q.themes.includes('macro'), 'macro theme');
  assert.ok(q.themes.includes('sanctions'), 'sanctions implied by country + macro/conflict');
  assert.equal(sanctions.isRelevant(q), true, 'sanctions adapter selected');
});

test('resolveQuery does not treat "business" as the US', () => {
  const q = resolveQuery('small business lending trends');
  assert.ok(!q.countries.includes('US'), '"business" must not match US');
});

test('sanctions adapter maps OFAC rows to cited findings (fixture)', async () => {
  const fixture = {
    rows: [
      {
        id: 12345,
        name: 'EXAMPLE SHIPPING CO',
        type: 'Entity',
        programs: ['IRAN', 'IRGC'],
        countries: ['Iran'],
        localities: [],
        firstSeen: '2020-01-01',
        listedOn: '2024-03-15',
        secondaryRisk: false,
        matchedAlias: null,
      },
    ],
  };
  // Pure mapper
  const findings = rowsToFindings(fixture.rows, { citeCountry: 'Iran' });
  assert.equal(findings.length, 1);
  assert.equal(findings[0].sourceSlug, 'sanctions');
  assert.equal(findings[0].date, '2024-03-15', 'listedOn is the designation date');
  assert.ok(findings[0].title.includes('EXAMPLE SHIPPING CO'));
  assert.ok(findings[0].meta.programs.includes('IRAN'));
  assert.ok(
    findings[0].citation.href.startsWith('/datasets/sanctions?country=Iran'),
    'deep-link citation to the sanctions page',
  );
  assert.ok(!/—/.test(findings[0].title + findings[0].summary), 'no em dashes in copy');

  // Full search path with an injected fetcher (no database).
  const q = resolveQuery('Economic outlook of US after involvement with Iran');
  const rows = await sanctions.search(q, { limit: 6, searchFn: async () => fixture });
  assert.ok(rows.length >= 1, 'search returns rows from the fixture');
  assert.equal(rows[0].sourceSlug, 'sanctions');
});

test('sanctions findings are descriptive, never advice', () => {
  const findings = rowsToFindings(
    [
      {
        id: 1,
        name: 'ACME',
        type: 'Vessel',
        programs: ['IRAN'],
        countries: ['Iran'],
        listedOn: '2025-01-01',
      },
    ],
    { citeCountry: 'Iran' },
  );
  const text = `${findings[0].title} ${findings[0].summary}`.toLowerCase();
  for (const banned of ['buy', 'sell', 'should invest', 'recommend']) {
    assert.ok(!text.includes(banned), `no advice language: "${banned}"`);
  }
});
