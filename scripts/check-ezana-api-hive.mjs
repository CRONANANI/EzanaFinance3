/**
 * Ezana API, hive dimension: params, pure insight maths and registry entries.
 * Run: node --no-warnings --test scripts/check-ezana-api-hive.mjs (part of npm run test:api).
 * Self-contained node:test file, no network.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { register } from 'node:module';

register('./mobile-node-loader.mjs', import.meta.url);

const reg = await import('../src/lib/ezana-api/registry.js');

test('hive: every route in this dimension is live and typed', () => {
  for (const e of reg.ENDPOINTS.filter((x) => x.dimension === 'hive')) {
    assert.equal(e.status, 'live', e.path);
    assert.ok(['data', 'insight'].includes(e.kind), e.path);
  }
});

const h = await import('../src/lib/ezana-api/insights/hive.js');

test('hive: title normalizer strips punctuation, stop-words and one-letter tokens', () => {
  assert.equal(h.normalizeTitle('Which party will win the U.S. House?'), 'party house');
  assert.equal(h.normalizeTitle('Texas Governor Election Winner'), 'texas governor');
  assert.equal(h.normalizeTitle('Café: 2027 Champion!'), 'cafe 2027 champion');
});

test('hive: trigram similarity behaves like pg_trgm', () => {
  const g = (s) => h.trigrams(h.normalizeTitle(s));
  assert.equal(h.trigramSimilarity(g('Blue wave in 2026?'), g('Blue wave in 2026?')), 1);
  assert.equal(h.trigramSimilarity(g('abc'), g('xyz')), 0);
  assert.deepEqual([...h.trigrams('cat')].sort(), ['  c', ' ca', 'at ', 'cat']);
});

test('hive: matching pairs the same race and rejects different years and districts', () => {
  const P = [
    { key: 'polymarket:1', title: 'Which party will win the House in 2026?' },
    { key: 'polymarket:2', title: 'CA-15 House Election Winner' },
    { key: 'polymarket:3', title: 'Pro Football: 2027 Champion' },
  ];
  const K = [
    { key: 'kalshi:A', title: 'Which party will win the U.S. House?' },
    { key: 'kalshi:B', title: 'TX-15 House winner?' },
    { key: 'kalshi:C', title: '2028 Pro Football Champion' },
  ];
  const m = h.matchEvents(P, K, 0.75);
  assert.deepEqual(
    m.map((x) => [x.poly.key, x.kalshi.key]),
    [['polymarket:1', 'kalshi:A']],
  );
  assert.equal(m[0].similarity, 1);
  assert.equal(h.matchEvents(P, K, 0.1).length, 1, 'the floor and the guards still apply');
});

test('hive: compareOutcomes prefers a shared outcome, else the leaders', () => {
  const same = h.compareOutcomes(
    [
      { id: 'p-d', outcome: 'Democratic Party', probability: 0.915 },
      { id: 'p-r', outcome: 'Republican Party', probability: 0.08 },
    ],
    [
      { id: 'k-r', outcome: 'Republican Party', probability: 0.098 },
      { id: 'k-d', outcome: 'Democratic Party', probability: 0.903 },
    ],
  );
  assert.equal(same.matched_on, 'outcome');
  assert.equal(same.poly.id, 'p-d');
  assert.equal(same.kalshi.id, 'k-d');
  const lead = h.compareOutcomes(
    [{ id: 'p1', outcome: 'Yes', probability: 0.4 }],
    [
      { id: 'k1', outcome: 'Above 4%', probability: 0.2 },
      { id: 'k2', outcome: 'Above 3%', probability: 0.7 },
    ],
  );
  assert.equal(lead.matched_on, 'leader');
  assert.equal(lead.kalshi.id, 'k2');
  assert.equal(lead.same_leader, false);
  assert.equal(h.compareOutcomes([], []), null);
  const party = h.compareOutcomes(
    [
      { id: 'p1', outcome: 'Maura Healey (D)', probability: 0.96 },
      { id: 'p2', outcome: 'Michael Minogue (R)', probability: 0.045 },
    ],
    [{ id: 'k1', outcome: 'Maura Healey', probability: 0.974 }],
  );
  assert.equal(party.matched_on, 'outcome', 'party suffixes do not block a match');
  assert.equal(party.poly.id, 'p1');
  assert.ok(h.sameOutcome('Healey', 'Maura Healey'));
  assert.ok(!h.sameOutcome('Above 4%', 'Above 3%'));
  assert.ok(!h.sameOutcome('Republican Party', 'Democratic Party'));
});

test('hive: cross-venue route is registered with its enums', () => {
  const e = reg.ENDPOINTS.find((x) => x.id === 'predictions.cross_venue');
  assert.equal(e.dimension, 'hive');
  assert.deepEqual(e.paramEnums.sort, ['gap', 'similarity']);
  assert.ok(e.list);
});
