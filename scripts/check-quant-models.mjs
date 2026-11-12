/**
 * Unit tests for the Model Library math and rubric (pure).
 * Run: node --no-warnings --test scripts/check-quant-models.mjs (npm run test:quant-models)
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  logReturns,
  fitGarch11,
  markovChain,
  correlationMatrix,
  jacobiEigen,
  pcaFromCorrelation,
  alignCloses,
} from '../src/lib/quants/models.js';
import {
  QUANT_MODELS,
  RUBRIC,
  TIERS,
  MIN_COMMUNITY_VOTES,
  rubricTotal,
  tierForTotal,
  tierForMeanVote,
  buildBoard,
} from '../src/lib/quants/model-library.js';

function mulberry32(seed) {
  let s = seed;
  return () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function normal(rng) {
  let u = 0;
  let v = 0;
  while (u === 0) u = rng();
  while (v === 0) v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
function simulateGarch({ n, omega, alpha, beta, seed }) {
  const rng = mulberry32(seed);
  let s2 = omega / (1 - alpha - beta);
  const out = [];
  for (let t = 0; t < n; t += 1) {
    const e = Math.sqrt(s2) * normal(rng);
    out.push(e);
    s2 = omega + alpha * e * e + beta * s2;
  }
  return out;
}

test('logReturns skips non-positive closes', () => {
  const r = logReturns([100, 110, 0, 121]);
  assert.equal(r.length, 1);
  assert.ok(Math.abs(r[0] - Math.log(1.1)) < 1e-12);
});

test('GARCH(1,1) recovers known parameters from simulated data', () => {
  const truth = { omega: 2e-6, alpha: 0.1, beta: 0.85 };
  const fit = fitGarch11(simulateGarch({ n: 6000, ...truth, seed: 11 }));
  assert.ok(fit);
  assert.ok(Math.abs(fit.alpha - truth.alpha) < 0.03, `alpha ${fit.alpha}`);
  assert.ok(Math.abs(fit.beta - truth.beta) < 0.04, `beta ${fit.beta}`);
  assert.ok(fit.persistence < 1);
  assert.equal(fit.conditionalVol.length, 6000);
});

test('GARCH forecast decays monotonically toward the long-run level', () => {
  const fit = fitGarch11(simulateGarch({ n: 1500, omega: 2e-6, alpha: 0.1, beta: 0.85, seed: 5 }));
  const gaps = fit.forecast.map((f) => Math.abs(f.vol - fit.sampleVol));
  for (let i = 1; i < gaps.length; i += 1) assert.ok(gaps[i] <= gaps[i - 1] + 1e-12);
  assert.ok(Math.abs(fit.forecast[0].vol - fit.nextVol) < 1e-12);
});

test('GARCH refuses short samples', () => {
  assert.equal(fitGarch11(new Array(50).fill(0.01)), null);
});

test('Markov rows sum to 1 and the stationary vector is a fixed point', () => {
  const r = simulateGarch({ n: 2000, omega: 2e-6, alpha: 0.1, beta: 0.85, seed: 3 });
  const mc = markovChain(r, 'volatility');
  for (const row of mc.matrix) assert.ok(Math.abs(row.reduce((a, b) => a + b, 0) - 1) < 1e-9);
  const next = [0, 0, 0];
  for (let i = 0; i < 3; i += 1)
    for (let j = 0; j < 3; j += 1) next[j] += mc.stationary[i] * mc.matrix[i][j];
  next.forEach((v, j) => assert.ok(Math.abs(v - mc.stationary[j]) < 1e-9));
});

test('Markov finds memory in clustered volatility and none in iid noise', () => {
  const clustered = simulateGarch({ n: 3000, omega: 1e-6, alpha: 0.15, beta: 0.83, seed: 9 });
  assert.equal(markovChain(clustered, 'volatility').hasMemory, true);
  const rng = mulberry32(21);
  const iid = Array.from({ length: 3000 }, () => 0.01 * normal(rng));
  assert.ok(markovChain(iid, 'volatility').pValue > 0.01);
});

test('Jacobi matches a known 2x2 eigendecomposition', () => {
  const { values } = jacobiEigen([
    [2, 1],
    [1, 2],
  ]);
  const sorted = [...values].sort((a, b) => b - a);
  assert.ok(Math.abs(sorted[0] - 3) < 1e-10);
  assert.ok(Math.abs(sorted[1] - 1) < 1e-10);
});

test('PCA explained ratios sum to 1 and a common factor dominates', () => {
  const rng = mulberry32(4);
  const market = Array.from({ length: 500 }, () => normal(rng));
  const series = Array.from({ length: 5 }, () => market.map((m) => 0.8 * m + 0.6 * normal(rng)));
  const pca = pcaFromCorrelation(correlationMatrix(series));
  assert.ok(Math.abs(pca.explained.reduce((a, b) => a + b, 0) - 1) < 1e-9);
  assert.ok(pca.components[0].explained > 0.5);
  assert.ok(pca.components[0].loadings.every((l) => l > 0));
  const norm = pca.components[0].loadings.reduce((a, l) => a + l * l, 0);
  assert.ok(Math.abs(norm - 1) < 1e-9);
});

test('alignCloses keeps only shared dates, in order', () => {
  const a = [
    { date: '2026-01-02', close: 1 },
    { date: '2026-01-05', close: 2 },
    { date: '2026-01-06', close: 3 },
  ];
  const b = [
    { date: '2026-01-05', close: 20 },
    { date: '2026-01-06', close: 30 },
    { date: '2026-01-07', close: 40 },
  ];
  const out = alignCloses([a, b]);
  assert.deepEqual(out.dates, ['2026-01-05', '2026-01-06']);
  assert.deepEqual(out.closes, [
    [2, 3],
    [20, 30],
  ]);
});

test('every model has a full rubric and unique id', () => {
  const ids = new Set();
  for (const m of QUANT_MODELS) {
    assert.ok(!ids.has(m.id));
    ids.add(m.id);
    for (const c of RUBRIC) {
      assert.ok(Number.isInteger(m.scores[c.id]) && m.scores[c.id] >= 1 && m.scores[c.id] <= 5);
    }
    assert.ok(m.summary && m.equation && m.breaks);
  }
  assert.equal(QUANT_MODELS.length, 13);
});

test('tier thresholds and vote rounding', () => {
  assert.equal(tierForTotal(20), 'S');
  assert.equal(tierForTotal(17), 'S');
  assert.equal(tierForTotal(16), 'A');
  assert.equal(tierForTotal(12), 'B');
  assert.equal(tierForTotal(8), 'C');
  assert.equal(tierForTotal(5), 'D');
  assert.equal(tierForMeanVote(4.6), 'S');
  assert.equal(tierForMeanVote(1.2), 'D');
});

test('rubric board places all 13; community board holds back thin votes', () => {
  const rubric = buildBoard('rubric');
  assert.equal(rubric.rows.length, TIERS.length);
  assert.equal(
    rubric.rows.reduce((a, r) => a + r.models.length, 0),
    13,
  );
  assert.equal(rubric.unranked.length, 0);
  for (const row of rubric.rows) {
    for (const m of row.models) assert.equal(tierForTotal(rubricTotal(m)), row.tier);
  }
  const community = buildBoard('community', {
    garch: { votes: MIN_COMMUNITY_VOTES, avg: 4.8 },
    pca: { votes: MIN_COMMUNITY_VOTES - 1, avg: 5 },
  });
  assert.equal(community.unranked.length, 12);
  assert.equal(community.rows.find((r) => r.tier === 'S').models[0].id, 'garch');
});
