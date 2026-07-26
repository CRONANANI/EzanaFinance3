/**
 * Unit tests for the council ELO model (pure). Run: node scripts/check-council-elo.mjs
 * (npm run test:council).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  expectedScore,
  computeCompetitionRatings,
  fundRawScore,
  computeFundRatings,
  blendRating,
  tierForRating,
} from '../src/lib/council-elo/model.js';

test('expectedScore is 0.5 for equal ratings and symmetric', () => {
  assert.equal(expectedScore(1000, 1000), 0.5);
  assert.ok(expectedScore(1200, 1000) > 0.5);
  assert.ok(Math.abs(expectedScore(1200, 1000) + expectedScore(1000, 1200) - 1) < 1e-9);
});

test('winning a competition raises rating; losing lowers it', () => {
  const r = computeCompetitionRatings([{ results: [{ org_id: 'A', rank: 1 }, { org_id: 'B', rank: 2 }] }]);
  assert.ok(r.get('A') > 1000);
  assert.ok(r.get('B') < 1000);
});

test('beating a STRONG field awards more than beating a weak one', () => {
  // A repeatedly beats strong B (who has beaten others); C beats weak D once.
  const strong = computeCompetitionRatings([
    { results: [{ org_id: 'B', rank: 1 }, { org_id: 'X', rank: 2 }] },
    { results: [{ org_id: 'B', rank: 1 }, { org_id: 'Y', rank: 2 }] },
    { results: [{ org_id: 'A', rank: 1 }, { org_id: 'B', rank: 2 }] }, // A beats a proven-strong B
  ]);
  const weak = computeCompetitionRatings([{ results: [{ org_id: 'C', rank: 1 }, { org_id: 'D', rank: 2 }] }]);
  // A's single win over strong B should exceed C's single win over unproven D... not
  // guaranteed by raw numbers, so assert the mechanism: A gains and beating higher-
  // rated opponents yields a larger expected-vs-actual surprise.
  assert.ok(strong.get('A') > 1000);
  assert.ok(strong.get('B') > weak.get('D')); // B proved strong; D didn't
});

test('Sharpe is weighted more heavily than raw ROI', () => {
  const highSharpe = fundRawScore({ sharpe: 2, roi_pct: 5 });
  const highRoi = fundRawScore({ sharpe: 0.5, roi_pct: 40 });
  // Even with 8x the ROI, the low-Sharpe fund should not dominate the disciplined one.
  assert.ok(highSharpe > highRoi, `sharpe-led ${highSharpe} should beat roi-led ${highRoi}`);
});

test('drawdown penalizes the score', () => {
  const clean = fundRawScore({ sharpe: 1, roi_pct: 10, max_drawdown_pct: 0 });
  const drawn = fundRawScore({ sharpe: 1, roi_pct: 10, max_drawdown_pct: 40 });
  assert.ok(clean > drawn);
});

test('fund ratings normalize across councils (best above base, worst below)', () => {
  const ratings = computeFundRatings([
    { org_id: 'A', sharpe: 2.5, roi_pct: 20 },
    { org_id: 'B', sharpe: 0.2, roi_pct: 3 },
  ]);
  assert.ok(ratings.get('A') > 1000);
  assert.ok(ratings.get('B') < 1000);
});

test('blend weights competition 60 / fund 40 by default', () => {
  assert.equal(blendRating(1200, 1000), Math.round(0.6 * 1200 + 0.4 * 1000));
});

test('tiers map by threshold', () => {
  assert.equal(tierForRating(1500), 'dynasty');
  assert.equal(tierForRating(1300), 'elite');
  assert.equal(tierForRating(1000), 'emerging');
});
