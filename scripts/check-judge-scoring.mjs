/**
 * Unit tests for judge token hashing + scoring math (pure parts).
 * Run: node scripts/check-judge-scoring.mjs  (npm run test:judging)
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { mintJudgeToken, hashToken } from '../src/lib/competitions/judge-token.js';
import { weightedTotal, teamAggregate, clampScore } from '../src/lib/competitions/scoring.js';

test('mintJudgeToken: raw is url-safe, hash matches, tokens are unique', () => {
  const a = mintJudgeToken();
  const b = mintJudgeToken();
  assert.match(a.raw, /^[A-Za-z0-9_-]+$/); // base64url
  assert.ok(a.raw.length >= 40);
  assert.equal(a.hash, hashToken(a.raw)); // hash is deterministic over the raw
  assert.notEqual(a.raw, b.raw);
  assert.notEqual(a.hash, b.hash);
  assert.equal(a.hash.length, 64); // sha-256 hex
});

test('weightedTotal: normalizes by max and weight to 0..100', () => {
  const criteria = [
    { id: 'a', weight: 1, max_score: 10 },
    { id: 'b', weight: 1, max_score: 10 },
  ];
  // full marks on both → 100
  assert.equal(weightedTotal(criteria, { a: 10, b: 10 }).total, 100);
  // half on both → 50
  assert.equal(weightedTotal(criteria, { a: 5, b: 5 }).total, 50);
  // nothing scored → null
  assert.equal(weightedTotal(criteria, {}).total, null);
});

test('weightedTotal: heavier weight dominates', () => {
  const criteria = [
    { id: 'a', weight: 3, max_score: 10 }, // heavy
    { id: 'b', weight: 1, max_score: 10 },
  ];
  // full on the heavy one, zero on the light one → 75
  assert.equal(weightedTotal(criteria, { a: 10, b: 0 }).total, 75);
});

test('weightedTotal: different max scores compare fairly', () => {
  const criteria = [
    { id: 'a', weight: 1, max_score: 5 },
    { id: 'b', weight: 1, max_score: 100 },
  ];
  // 5/5 and 50/100 → (1.0 + 0.5)/2 = 75
  assert.equal(weightedTotal(criteria, { a: 5, b: 50 }).total, 75);
});

test('teamAggregate: mean across judges, ignores nulls', () => {
  assert.deepEqual(teamAggregate([80, 90, null, 100]), { mean: 90, count: 3 });
  assert.deepEqual(teamAggregate([]), { mean: null, count: 0 });
});

test('clampScore: clamps to [0,max], rejects non-numbers', () => {
  assert.equal(clampScore(12, 10), 10);
  assert.equal(clampScore(-3, 10), 0);
  assert.equal(clampScore(7, 10), 7);
  assert.equal(clampScore('nope', 10), null);
});
