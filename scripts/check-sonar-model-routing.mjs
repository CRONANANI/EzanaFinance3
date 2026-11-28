/**
 * Sonar model routing and the model-quality benchmark scorers.
 *   - the default "current" profile reproduces the legacy env-driven model choices
 *   - profiles A/B/C route roles as specified; overrides and env role pins apply
 *   - canary bucketing is stable and bounded; the kill switch wins
 *   - cross-domain detection and selective Opus in profile C
 *   - pricing and per-call cost (Haiku 5.5 long-prompt tier)
 *   - usage capture through the provider (served vs requested, timeouts, labels)
 *   - benchmark cases, cells and deterministic scorers
 * Run: npm run test:sonar-model-routing. Self-contained, no network.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

const R = await import('../src/lib/sonar/model-routing.js');
const B = await import('../src/lib/sonar/engine/eval/model-bench.js');
const P = await import('../src/lib/sonar/llm-providers.js');

const { MODELS } = R;

test('current profile with no env reproduces the legacy defaults', () => {
  const r = R.resolveModelRouting({ profile: 'current', env: {} });
  assert.equal(r.profile, 'current');
  assert.equal(r.quick, MODELS.haiku45);
  assert.equal(r.standard, MODELS.haiku45);
  assert.equal(r.standard_specialist, MODELS.haiku45);
  assert.equal(r.deep_director, MODELS.sonnet45);
  assert.equal(r.deep_specialist, MODELS.sonnet45);
  assert.equal(r.deep_red_team, MODELS.sonnet45);
  assert.equal(r.legacy_standard, MODELS.haiku45);
  assert.equal(r.legacy_deep, MODELS.sonnet5);
  assert.equal(r.cross_domain_director, null);
});

test('current profile honours the legacy env variables', () => {
  const r = R.resolveModelRouting({
    profile: 'current',
    env: {
      SONAR_FAST_MODEL: 'f',
      SONAR_DEEP_MODEL: 'd',
      SONAR_ANALYST_STRONG_MODEL: 's',
      SONAR_ANALYST_FAST_MODEL: 'af',
    },
  });
  assert.equal(r.quick, 'f');
  assert.equal(r.deep_director, 'd');
  assert.equal(r.deep_specialist, 's');
  assert.equal(r.standard_specialist, 'af');
});

test('profiles A, B and C route as specified', () => {
  const A = R.resolveModelRouting({ profile: 'A' });
  assert.deepEqual(
    [A.quick, A.standard, A.deep_director],
    [MODELS.haiku55, MODELS.haiku55, MODELS.sonnet55],
  );
  const Bp = R.resolveModelRouting({ profile: 'B' });
  assert.deepEqual(
    [Bp.quick, Bp.standard, Bp.deep_director],
    [MODELS.haiku55, MODELS.sonnet55, MODELS.opus55],
  );
  const C = R.resolveModelRouting({ profile: 'C' });
  assert.deepEqual(
    [C.quick, C.standard, C.deep_director],
    [MODELS.haiku55, MODELS.sonnet55, MODELS.sonnet55],
  );
  assert.equal(C.cross_domain_director, MODELS.opus55);
  assert.equal(C.deep_red_team, MODELS.opus55);
  assert.equal(C.deep_auditor, MODELS.opus55);
});

test('an unknown profile falls back to current; overrides and env role pins apply', () => {
  assert.equal(R.resolveModelRouting({ profile: 'Z', env: {} }).profile, 'current');
  const r = R.resolveModelRouting({
    profile: 'B',
    env: { SONAR_MODEL_ROLE_DEEP_DIRECTOR: 'x' },
    overrides: { quick: 'y', nope: 'z' },
  });
  assert.equal(r.deep_director, 'x');
  assert.equal(r.quick, 'y');
  assert.equal(r.nope, undefined);
});

test('production default stays current unless a profile is set', () => {
  assert.equal(R.routingForRun({ userId: 'u1', env: {} }).profile, 'current');
  assert.equal(R.routingForRun({ userId: 'u1', env: { SONAR_MODEL_PROFILE: 'C' } }).profile, 'C');
});

test('canary bucketing is stable, bounded and listable', () => {
  const env = { SONAR_MODEL_CANARY_PROFILE: 'C', SONAR_MODEL_CANARY_PERCENT: '10' };
  let inCanary = 0;
  for (let i = 0; i < 2000; i += 1)
    if (R.profileForUser({ userId: `user-${i}`, env }) === 'C') inCanary += 1;
  assert.ok(inCanary > 120 && inCanary < 280, `10% canary got ${inCanary}/2000`);
  assert.equal(
    R.profileForUser({ userId: 'user-7', env }),
    R.profileForUser({ userId: 'user-7', env }),
  );
  assert.equal(R.profileForUser({ userId: null, env }), 'current');
  assert.equal(
    R.profileForUser({
      userId: 'vip',
      env: { SONAR_MODEL_CANARY_PROFILE: 'B', SONAR_MODEL_CANARY_USERS: 'a,vip' },
    }),
    'B',
  );
  assert.equal(
    R.profileForUser({ userId: 'user-7', env: { ...env, SONAR_MODEL_CANARY_PERCENT: '0' } }),
    'current',
  );
});

test('cross-domain detection and selective Opus', () => {
  const C = R.resolveModelRouting({ profile: 'C' });
  assert.equal(R.deepDirectorFor(C, { crossDomain: false }), MODELS.sonnet55);
  assert.equal(R.deepDirectorFor(C, { crossDomain: true }), MODELS.opus55);
  const A = R.resolveModelRouting({ profile: 'A' });
  assert.equal(R.deepDirectorFor(A, { crossDomain: true }), MODELS.sonnet55);
  assert.equal(R.isCrossDomain(null, []), false);
});

test('pricing and per-call cost', () => {
  assert.equal(R.priceOf(MODELS.opus55).output, 20);
  assert.equal(R.priceOf(MODELS.sonnet55).input, 2);
  assert.equal(R.priceOf(MODELS.haiku45).input, 1);
  const small = R.callCostUsd({ model: MODELS.haiku55, inputTokens: 10_000, outputTokens: 1_000 });
  assert.ok(Math.abs(small - (10_000 * 0.1 + 1_000 * 0.5) / 1e6) < 1e-9);
  const long = R.callCostUsd({ model: MODELS.haiku55, inputTokens: 150_000, outputTokens: 1_000 });
  assert.ok(Math.abs(long - (150_000 * 0.5 + 1_000 * 2.5) / 1e6) < 1e-9);
  const web = R.callCostUsd({
    model: MODELS.sonnet55,
    inputTokens: 0,
    outputTokens: 0,
    webSearches: 3,
  });
  assert.ok(Math.abs(web - 0.03) < 1e-9);
  assert.equal(R.callCostUsd({ model: 'mystery' }), null);
});

test('usage capture: labels, served model, timeouts, and nothing outside a collector', async () => {
  const realFetch = globalThis.fetch;
  const realKey = process.env.ANTHROPIC_API_KEY;
  process.env.ANTHROPIC_API_KEY = 'test';
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        content: [{ type: 'text', text: 'hello' }],
        usage: { input_tokens: 100, output_tokens: 20 },
        stop_reason: 'end_turn',
      }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    );
  try {
    const { calls } = await P.collectUsage(() =>
      P.withUsageLabel('synthesize', () =>
        P.synthesizeWithFallback({ system: 's', user: 'u', maxTokens: 50, model: MODELS.sonnet55 }),
      ),
    );
    assert.equal(calls.length, 1);
    assert.equal(calls[0].label, 'synthesize');
    assert.equal(calls[0].requested, MODELS.sonnet55);
    assert.equal(calls[0].served, 'claude-haiku-4-5-20251001');
    assert.equal(calls[0].inputTokens, 100);
    const u = B.summarizeUsage(calls);
    assert.equal(
      u.modelMismatches.length,
      1,
      'a served model different from the requested one is flagged',
    );
    assert.equal(u.synthesis.calls, 1);
    await P.synthesizeWithFallback({ system: 's', user: 'u', maxTokens: 50 });
  } finally {
    globalThis.fetch = realFetch;
    if (realKey === undefined) delete process.env.ANTHROPIC_API_KEY;
    else process.env.ANTHROPIC_API_KEY = realKey;
  }
});

test('benchmark cases cover every requested category with a frozen-evidence design', () => {
  const cats = B.MODEL_BENCH_CASES.map((c) => c.category);
  for (const want of [
    'Congressional institutional ownership',
    'Multi-dataset screening',
    'Company fundamental analysis',
    'Government contract exposure',
    'Macroeconomic research',
    'Valuation',
    'Deep Research',
  ])
    assert.ok(cats.includes(want), want);
  for (const c of B.MODEL_BENCH_CASES) {
    assert.ok(c.objectives.length >= 3, c.id);
    for (const o of c.objectives) for (const p of o.any) new RegExp(p, 'i');
    const cells = B.cellsFor(c, {});
    assert.ok(cells.some((x) => x.id === 'current'));
    if (c.depth === 'deep')
      assert.deepEqual(
        cells.map((x) => x.id),
        ['current', 'A', 'B', 'C'],
      );
    else
      for (const id of ['model:haiku45', 'model:haiku55', 'model:sonnet55', 'model:opus55', 'BC'])
        assert.ok(
          cells.some((x) => x.id === id),
          `${c.id} ${id}`,
        );
  }
  const opus = B.cellsFor(B.MODEL_BENCH_CASES[0], {}).find((x) => x.id === 'model:opus55');
  assert.equal(opus.routing.standard, MODELS.opus55);
  assert.equal(opus.routing.standard_specialist, MODELS.opus55);
});

const CASE = B.MODEL_BENCH_CASES.find((c) => c.id === 'government_contract_exposure');
const RUN = {
  headline: 'Palantir leans on government work',
  executiveConclusion:
    'Government customers were 55% of revenue in fiscal 2025; commercial revenue grew faster. Army contract awards total $480 million.',
  keyFindings: [
    { title: 'Government share', explanation: 'US government 55% of revenue.', evidence: ['1'] },
    { title: 'Invented claim', explanation: 'Margins will reach 90%.', evidence: ['99'] },
  ],
  limitations: ['Award values are obligations as of the latest quarter.'],
  evidence: [
    {
      id: 'e1',
      marker: '1',
      title: 'PLTR revenue mix',
      text: 'Government revenue 55% of total in FY2025',
    },
    { id: 'e2', marker: '2', title: 'Army award', text: 'Obligated $480,000,000 to Palantir' },
  ],
  quantitativeMetrics: [{ id: 'gov_share', value: 0.55 }],
  methodology: { deterministic: false },
  researchMetadata: {
    durationMs: 42_000,
    partial: false,
    trace: [{ leg: 'synthesize', ok: true }],
  },
};

test('scorer: objectives, caveats, citations, numeric fidelity, unsupported claims', () => {
  const s = B.scoreRun(RUN, CASE);
  assert.equal(s.completed, true);
  assert.equal(s.objectives.met, 4);
  assert.equal(s.caveats.met, 2);
  assert.equal(s.citations.findings, 2);
  assert.equal(s.citations.valid, 1);
  assert.equal(s.citations.invalid, 1);
  assert.equal(s.unsupported.findingsWithoutValidCitation, 1);
  assert.ok(s.numbers.untraced.includes('90'), 'the invented 90% is untraced');
  assert.ok(!s.numbers.untraced.includes('55'), 'a number from evidence is traced');
  assert.ok(!s.numbers.untraced.includes('$480'), '$480 million traces to 480,000,000');
  assert.equal(s.durationMs, 42_000);
});

test('scorer: failed and timed-out runs', () => {
  const s = B.scoreRun(
    { failed: 'threw', researchMetadata: { partial: true, aborted: true } },
    CASE,
  );
  assert.equal(s.completed, false);
  assert.equal(s.timedOut, true);
  assert.equal(s.objectives.met, 0);
});

test('fingerprint is the same when only the prose differs', () => {
  const other = { ...RUN, executiveConclusion: 'Different words entirely.' };
  assert.equal(B.fingerprint(RUN), B.fingerprint(other));
  assert.notEqual(B.fingerprint(RUN), B.fingerprint({ ...RUN, evidence: [] }));
});

test('aggregate and judge parsing', () => {
  const score = B.scoreRun(RUN, CASE);
  const usage = B.summarizeUsage([
    {
      ok: true,
      label: 'understand',
      requested: MODELS.haiku45,
      served: MODELS.haiku45,
      inputTokens: 1000,
      outputTokens: 100,
      ms: 500,
    },
    {
      ok: true,
      label: 'synthesize',
      requested: MODELS.sonnet55,
      served: MODELS.sonnet55,
      inputTokens: 20_000,
      outputTokens: 2_000,
      ms: 20_000,
    },
    { ok: false, label: 'red-team', requested: MODELS.opus55, status: 'timeout', ms: 30_000 },
  ]);
  assert.equal(usage.timeouts, 1);
  assert.equal(usage.deterministic.calls, 1);
  assert.equal(usage.synthesis.calls, 2);
  assert.ok(Math.abs(usage.synthesis.usd - (20_000 * 2 + 2_000 * 10) / 1e6) < 1e-6);
  const agg = B.aggregate([
    { cellId: 'x', cellLabel: 'X', score, usage, judge: { overall: 4, insight: 4, financial: 3 } },
    { cellId: 'x', cellLabel: 'X', score: { ...score, completed: false }, usage },
  ]);
  assert.equal(agg[0].runs, 2);
  assert.equal(agg[0].completionRate, 0.5);
  assert.equal(agg[0].judgeOverall, 4);
  assert.deepEqual(
    B.parseJudge(
      '{"correctness":4,"objective":5,"financial":3,"insight":4,"calibration":4,"unsupported":[],"note":"ok"}',
    ).overall,
    4,
  );
  assert.equal(B.parseJudge('not json'), null);
  const { user } = B.judgePrompt(CASE, RUN);
  assert.ok(!/sonnet|opus|haiku/i.test(user), 'the judge never sees model names');
});
