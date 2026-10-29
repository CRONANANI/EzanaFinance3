/**
 * Sonar: two-country resolution, US Sanctions ranking and the country-intent
 * name guard (datasets-page-cleanup-and-sonar-sanctions-ranking spec, Step C).
 *
 * Repro ping: "how will the us involvement in iran affect the economic
 * outlook of the us". It must resolve BOTH the US and Iran, imply sanctions,
 * rank a US Sanctions finding into the top 3, reject a government-contracts
 * row whose only link is "United States" in a recipient name, and label the
 * news header "United States and Iran".
 *
 * Run: npm run test:sonar-sanctions-ranking
 */
import test from 'node:test';
import assert from 'node:assert/strict';

const { resolveQuery, subjectLabel } = await import('../src/lib/sonar/resolveQuery.js');
const { rankSourcedMatches } = await import('../src/lib/sonar/rankSourcedMatches.js');
const { passesCountryIntentGuard } = await import('../src/lib/sonar/guards.js');
const { understandDeterministic } = await import('../src/lib/sonar/understand/index.js');

const PING = 'how will the us involvement in iran affect the economic outlook of the us';

test('resolves both countries, implied sanctions, and country intent', () => {
  const q = resolveQuery(PING);
  assert.ok(q.countries.includes('US'), 'US');
  assert.ok(q.countries.includes('IR'), 'Iran');
  for (const t of ['sanctions', 'conflict', 'macro']) {
    assert.ok(q.themes.includes(t), `theme ${t}`);
  }
  assert.equal(q.intent, 'country');
  assert.equal(q.hasSanctionedJurisdiction, true);
  assert.equal(q.countries[0], 'IR', 'sanctioned jurisdiction leads source selection');
});

test('"affect us" / "for us" / "help us" are not the country', () => {
  for (const s of ['will this affect us', 'is this good for us', 'can you help us']) {
    assert.ok(!resolveQuery(s).countries.includes('US'), s);
  }
  assert.ok(!resolveQuery('small business lending trends').countries.includes('US'));
});

test('"US" and "the us" shapes still resolve to the country', () => {
  for (const s of ['US inflation outlook', 'what is the us doing', 'us economy next year']) {
    assert.ok(resolveQuery(s).countries.includes('US'), s);
  }
});

test('news header label names both subjects', () => {
  const q = resolveQuery(PING);
  assert.equal(subjectLabel(q.subjects), 'United States and Iran');
  assert.equal(subjectLabel(['Iran']), 'Iran');
  assert.equal(subjectLabel([]), '');
});

test('landing understand layer: header names both countries', () => {
  const u = understandDeterministic(PING);
  assert.equal(u.intent, 'country');
  assert.equal(u.display, 'United States and Iran');
  const ids = u.entities.filter((e) => e.kind === 'country').map((e) => e.id);
  assert.ok(ids.includes('US') && ids.includes('IR'), `countries = ${ids.join(',')}`);
});

test('landing understand layer: pronoun "us" is not the country', () => {
  for (const s of ['will this affect us', 'can you help us', 'is this good for us']) {
    const u = understandDeterministic(s);
    assert.ok(!u.entities.some((e) => e.kind === 'country'), s);
  }
  for (const s of ['us economy next year', 'what is happening in the us', 'US inflation outlook']) {
    const u = understandDeterministic(s);
    assert.ok(
      u.entities.some((e) => e.kind === 'country' && e.id === 'US'),
      s,
    );
  }
});

test('ranking puts a US Sanctions finding in the top 3', () => {
  const q = resolveQuery(PING);
  const findings = [
    { sourceSlug: 'government-contracts', relevance: 0.9, date: '2026-10-01' },
    { sourceSlug: 'government-contracts', relevance: 0.9, date: '2026-10-01' },
    { sourceSlug: 'news', relevance: 0.95, date: '2026-10-28' },
    { sourceSlug: 'prediction-markets', relevance: 0.8, date: '2026-10-20' },
    { sourceSlug: 'us-sanctions', relevance: 0.6, date: '2025-03-01' },
  ];
  const top3 = rankSourcedMatches(findings, q)
    .slice(0, 3)
    .map((f) => f.sourceSlug);
  assert.ok(top3.includes('us-sanctions'), `top3 = ${top3.join(', ')}`);
});

test('ranking also works on the Sonar dataset ids (sanctions / gov-contracts)', () => {
  const q = resolveQuery(PING);
  const findings = [
    { dataset: 'gov-contracts', relevance: 0.95, date: '2026-10-25' },
    { dataset: 'echo', relevance: 0.95, date: '2026-10-25' },
    { dataset: 'congress', relevance: 0.95, date: '2026-10-25' },
    { dataset: 'prediction-markets', relevance: 0.95, date: '2026-10-25' },
    { dataset: 'lobbying', relevance: 0.95, date: '2026-10-25' },
    { dataset: 'sanctions', relevance: 0.1, date: '2019-01-01' },
  ];
  const ranked = rankSourcedMatches(findings, q);
  const top3 = ranked.slice(0, 3).map((f) => f.dataset);
  assert.ok(top3.includes('sanctions'), `top3 = ${top3.join(', ')}`);
  // Country intent down-weights name-matched contracts below sanctions.
  const iS = ranked.findIndex((f) => f.dataset === 'sanctions');
  const iC = ranked.findIndex((f) => f.dataset === 'gov-contracts');
  assert.ok(iS < iC, 'sanctions above gov-contracts');
});

test('no pin when the ping has no sanctions signal', () => {
  const q = resolveQuery('apple earnings next quarter');
  const findings = [
    { sourceSlug: 'news', relevance: 0.9, date: '2026-10-28' },
    { sourceSlug: 'news', relevance: 0.9, date: '2026-10-28' },
    { sourceSlug: 'news', relevance: 0.9, date: '2026-10-28' },
    { sourceSlug: 'us-sanctions', relevance: 0.1, date: '2020-01-01' },
  ];
  assert.equal(rankSourcedMatches(findings, q, { maxPerSourceInTop: 9 })[0].sourceSlug, 'news');
});

test('country-intent guard rejects name-only country matches', () => {
  const q = resolveQuery(PING);
  assert.equal(
    passesCountryIntentGuard(q, {
      nameField: 'UNITED STATES VETERANS INITIATIVE',
      hasStructuredCountryMatch: false,
    }),
    false,
  );
  assert.equal(
    passesCountryIntentGuard(q, {
      nameField: 'UNITED STATES VETERANS INITIATIVE',
      hasStructuredCountryMatch: true,
    }),
    true,
    'a real country column match is kept',
  );
  assert.equal(
    passesCountryIntentGuard(q, { nameField: 'LOCKHEED MARTIN CORP' }),
    true,
    'names without a country word pass',
  );
  assert.equal(
    passesCountryIntentGuard(
      resolveQuery('lockheed martin contracts', { organizations: ['Lockheed Martin'] }),
      {
        nameField: 'UNITED STATES STEEL',
      },
    ),
    true,
    'entity pings are not filtered by the guard',
  );
});
