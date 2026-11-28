/**
 * Sonar model benchmark worker: lane sharding, phase gating, attempt limits.
 * Run: npm run test:sonar-model-routing. No network, no database.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

const W = await import('../src/lib/sonar/engine/eval/model-bench-runner.js');
const B = await import('../src/lib/sonar/engine/eval/model-bench.js');

const plan = B.suitePlan({ deepTrials: 3 });
const state = (done = [], attempts = []) => ({
  done: new Set(done),
  attempts: new Map(attempts),
  spentUsd: 0,
});

test('phase 1 first; lanes never share a step', () => {
  const lanes = 6;
  const seen = new Set();
  for (let lane = 0; lane < lanes; lane += 1) {
    const { open, steps } = W.eligibleSteps(plan, state(), { lane, lanes });
    assert.equal(open, 1);
    for (const s of steps) {
      assert.ok(!seen.has(s.key));
      seen.add(s.key);
    }
  }
  assert.equal(seen.size, plan.filter((s) => s.phase === 1).length);
});

test('phase 2 opens when phase 1 is done or exhausted', () => {
  const p1 = plan.filter((s) => s.phase === 1).map((s) => s.key);
  const now = Date.now();
  const st = state(p1.slice(1), [[p1[0], { n: 2, last: now - 8 * 60_000 }]]);
  const { open } = W.eligibleSteps(plan, st, { lane: 0, lanes: 1, now });
  assert.equal(open, 2);
  const recent = state(p1.slice(1), [[p1[0], { n: 1, last: now - 60_000 }]]);
  const r = W.eligibleSteps(plan, recent, { lane: 0, lanes: 1, now });
  assert.equal(r.open, 1, 'an in-flight phase 1 step holds phase 2 back');
  assert.equal(r.steps.length, 0, 'and is not retried within 7 minutes');
});

test('complete suite reports nothing open', () => {
  const r = W.eligibleSteps(plan, state(plan.map((s) => s.key)), { lane: 0, lanes: 6 });
  assert.equal(r.open, null);
});
