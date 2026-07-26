/**
 * Unit tests for the Whale Score classifier (src/lib/whale-score.js).
 *
 * No test runner is configured in this repo, so this is a self-contained
 * node:test file — run it directly:  node scripts/check-whale-score.mjs
 * (also wired as `npm run test:whale`). Node's ESM syntax detection lets it
 * import the plain .js source without a "type":"module" package flag.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  whaleScore,
  classifyChange,
  MIN_POSITION_USD,
  MIN_ACTIVIST_PCT,
} from '../src/lib/whale-score.js';

test('conviction beats raw size: 15%-of-book new position outscores a $2B name at 0.2%', () => {
  const highConviction = whaleScore({
    kind: 'institutional',
    valueUsd: 300_000_000, // $300M
    sharesNow: 1_000_000,
    sharesPrior: 0, // new
    fundTotalUsd: 2_000_000_000, // 15% of a $2B book
    fundPositionCount: 30,
  });
  const bigButTrivial = whaleScore({
    kind: 'institutional',
    valueUsd: 2_000_000_000, // $2B
    sharesNow: 5_000_000,
    sharesPrior: 4_900_000, // small add
    fundTotalUsd: 1_000_000_000_000, // 0.2% of a $1T index book
    fundPositionCount: 3000,
  });
  assert.ok(
    highConviction.score > bigButTrivial.score,
    `expected conviction (${highConviction.score}) > size (${bigButTrivial.score})`,
  );
  assert.equal(highConviction.tier, 'Fresh conviction');
});

test('below the $100M gate returns a zero score, no tier', () => {
  const r = whaleScore({
    kind: 'institutional',
    valueUsd: MIN_POSITION_USD - 1,
    sharesNow: 100,
    sharesPrior: 0,
    fundTotalUsd: 500_000_000,
    fundPositionCount: 10,
  });
  assert.equal(r.score, 0);
  assert.equal(r.tier, null);
  assert.equal(r.factors.belowGate, true);
});

test('an exit (prior size passed as valueUsd) scores meaningfully and is not gated out', () => {
  const r = whaleScore({
    kind: 'institutional',
    valueUsd: 400_000_000, // prior size of the closed name
    sharesNow: 0,
    sharesPrior: 2_000_000, // fully exited
    fundTotalUsd: 5_000_000_000,
    fundPositionCount: 40,
  });
  assert.ok(r.score > 20, `expected a meaningful exit score, got ${r.score}`);
  assert.equal(r.tier, 'Heading for the exit');
  assert.equal(r.factors.changeType, 'exited');
});

test('activist: a 13D at 12% outscores a 13G at 6%', () => {
  const d = whaleScore({ kind: 'activist', form: 'SC 13D', percentOfClass: 12 });
  const g = whaleScore({ kind: 'activist', form: 'SC 13G', percentOfClass: 6 });
  assert.ok(d.score > g.score, `expected 13D@12 (${d.score}) > 13G@6 (${g.score})`);
  assert.equal(d.tier, 'Activist stake');
  assert.equal(g.tier, 'Quiet accumulation');
});

test('activist: below the 5% threshold returns zero', () => {
  const r = whaleScore({ kind: 'activist', form: 'SC 13D', percentOfClass: MIN_ACTIVIST_PCT - 0.1 });
  assert.equal(r.score, 0);
  assert.equal(r.tier, null);
});

test('activist: escalation (stake grew since last filing) adds to the score', () => {
  const flat = whaleScore({ kind: 'activist', form: 'SC 13D', percentOfClass: 10 });
  const grew = whaleScore({
    kind: 'activist',
    form: 'SC 13D',
    percentOfClass: 10,
    priorPercentOfClass: 7,
  });
  assert.ok(grew.score > flat.score, `escalation should raise the score`);
  assert.equal(grew.factors.escalated, true);
});

test('classifyChange covers new / exited / doubled / added / trimmed / flat', () => {
  assert.equal(classifyChange(100, 0), 'new');
  assert.equal(classifyChange(0, 100), 'exited');
  assert.equal(classifyChange(200, 100), 'doubled');
  assert.equal(classifyChange(150, 100), 'added');
  assert.equal(classifyChange(80, 100), 'trimmed');
  assert.equal(classifyChange(100, 100), 'flat');
});

test('scores never exceed 100', () => {
  const r = whaleScore({
    kind: 'institutional',
    valueUsd: 50_000_000_000,
    sharesNow: 10_000_000,
    sharesPrior: 0,
    fundTotalUsd: 60_000_000_000, // ~83% of book, absurd conviction
    fundPositionCount: 1,
  });
  assert.ok(r.score <= 100, `score capped at 100, got ${r.score}`);
});
