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
      '{"objective":5,"financial":3,"insight":4,"evidence":4,"correctness":4,"relationships":4,"unsupported":[],"note":"ok"}',
    ).overall,
    4,
  );
  assert.equal(B.parseJudge('not json'), null);
  const { user } = B.judgePrompt(CASE, RUN);
  assert.ok(!/sonnet|opus|haiku/i.test(user), 'the judge never sees model names');
});

test('relationships: cross-dataset findings vs single-source summaries', () => {
  const run = {
    evidence: [
      { id: 'a', marker: '1', source: 'congress_trades', text: 'Rep. X bought LMT' },
      { id: 'b', marker: '2', source: 'contracts', text: 'LMT awarded $2B' },
      { id: 'c', marker: '3', source: 'institutional', text: '13F holders rose' },
    ],
    keyFindings: [
      {
        title: 'Purchases preceded awards',
        explanation: 'Buying came ahead of the $2B award.',
        evidence: ['1', '2'],
      },
      { title: 'Holders rose', explanation: 'More funds hold LMT.', evidence: ['3'] },
      {
        title: 'Two sources, no link',
        explanation: 'Trades happened. Awards happened.',
        evidence: ['1', '2'],
      },
    ],
  };
  const r = B.relationshipScore(run);
  assert.equal(r.datasetsInEvidence, 3);
  assert.equal(r.datasetsCited, 3);
  assert.equal(r.crossFindings, 1);
  assert.equal(r.pairsLinked, 1);
  assert.deepEqual(r.pairs, ['congress_trades+contracts']);
  assert.equal(B.scoreRun({ ...RUN, ...run }, CASE).relationships.crossFindings, 1);
});

test('paired verdicts map back to cells whichever answer was shown first', () => {
  const ans = JSON.stringify(
    Object.fromEntries(
      [...B.CRITERIA.map(([k]) => k), 'overall'].map((k) => [
        k,
        { winner: k === 'insight' ? 'tie' : 'X', reason: 'r' },
      ]),
    ),
  );
  const a = B.parsePair(ans, { xIs: 'left' });
  const b = B.parsePair(ans, { xIs: 'right' });
  assert.equal(a.overall.winner, 'left');
  assert.equal(b.overall.winner, 'right');
  assert.equal(a.insight.winner, 'tie');
  assert.equal(B.parsePair('{"overall":{"winner":"maybe"}}', { xIs: 'left' }), null);
  const { user } = B.pairPrompt(CASE, RUN, RUN);
  assert.ok(!/sonnet|opus|haiku/i.test(user));
  const agg = B.aggregatePairs([
    { caseId: 'c', left: 'L', right: 'R', trial: 1, judge: 'j1', xIs: 'left', verdict: a },
    { caseId: 'c', left: 'L', right: 'R', trial: 1, judge: 'j1', xIs: 'right', verdict: b },
  ]);
  assert.equal(agg[0].criteria.overall.net, 0);
  assert.equal(agg[0].orderConsistency, 0, 'X won both times: position bias, not a result');
});

test('suite plan: phases, unique keys, every pair and judge', () => {
  const plan = B.suitePlan({ deepTrials: 3 });
  const keys = new Set(plan.map((s) => s.key));
  assert.equal(keys.size, plan.length);
  assert.ok(
    plan.every((s, i) => i === 0 || plan[i - 1].phase <= s.phase),
    'phases in order',
  );
  const runs = plan.filter((s) => s.kind === 'run');
  assert.equal(runs.filter((s) => s.caseId === 'deep_research').length, 12);
  assert.equal(runs.length, 6 * 6 + 2 * 2 + 12);
  for (const p of plan.filter((s) => s.kind === 'pair'))
    for (const cell of [p.left, p.right])
      assert.ok(
        runs.some((r) => r.caseId === p.caseId && r.cellId === cell && r.trial === p.trial),
        p.key,
      );
});

test('quality score is research quality only and zero for an incomplete run', () => {
  const s = B.scoreRun(RUN, CASE);
  const q = B.qualityScore(s, {
    objective: 5,
    financial: 5,
    insight: 5,
    evidence: 5,
    correctness: 5,
  });
  const lo = B.qualityScore(s, {
    objective: 1,
    financial: 1,
    insight: 1,
    evidence: 1,
    correctness: 1,
  });
  assert.ok(q > lo);
  assert.equal(B.qualityScore({ ...s, completed: false }, null), 0);
  const fast = B.qualityScore({ ...s, durationMs: 1 }, null);
  assert.equal(
    fast,
    B.qualityScore({ ...s, durationMs: 999_999 }, null),
    'latency never moves quality',
  );
});

test('deep follow-up suite: three deep questions, single-variable cells, raised caps', () => {
  const plan = B.suitePlan({ deepTrials: 2, variant: 'deep-uncapped' });
  const runs = plan.filter((s) => s.kind === 'run');
  assert.deepEqual(
    [...new Set(runs.map((s) => s.caseId))],
    ['deep_research', 'deep_screen', 'deep_valuation'],
  );
  assert.equal(runs.length, 3 * 4 * 2);
  const cells = B.cellsForVariant(B.caseById('deep_screen'), 'deep-uncapped');
  const by = Object.fromEntries(cells.map((c) => [c.id, c.routing]));
  assert.equal(by.S.deep_director, R.MODELS.sonnet55);
  assert.equal(by['O-dir'].deep_director, R.MODELS.opus55);
  assert.equal(by['O-dir'].deep_red_team, R.MODELS.sonnet55);
  assert.equal(by['S-dir+O-review'].deep_director, R.MODELS.sonnet55);
  assert.equal(by['S-dir+O-review'].deep_red_team, R.MODELS.opus55);
  for (const c of cells) {
    assert.equal(c.routing.cross_domain_director, null, 'no escalation: the cell names the writer');
    assert.equal(c.outputScale, B.DEEP_OUTPUT_SCALE);
  }
  assert.equal(B.caseById('deep_screen').depth, 'deep');
  assert.equal(B.caseById('multi_dataset_screen').depth, 'standard');
});

test('judge parser recovers scores from a reply cut off after them', () => {
  const cut =
    '{"objective":2,"financial":3,"insight":3,"evidence":2,"correctness":2,"relationships":4,"unsupported":["The top three contract recipients hold 68.2% of';
  const j = B.parseJudge(cut);
  assert.equal(j.relationships, 4);
  assert.equal(j.overall, 2.67);
  const missingOne = B.parseJudge(
    '{"objective":2,"financial":4,"insight":3,"evidence":3,"correctness":3,"unsupported":[]}',
  );
  assert.equal(missingOne.relationships, null);
  assert.equal(missingOne.overall, 3);
});

test('profile D: the benchmark recommendation, not served by default', () => {
  const D = R.resolveModelRouting({ profile: 'D' });
  assert.equal(D.profile, 'D');
  assert.deepEqual(
    [
      D.quick,
      D.standard,
      D.standard_specialist,
      D.deep_director,
      D.deep_specialist,
      D.deep_red_team,
      D.deep_auditor,
    ],
    [
      MODELS.haiku45,
      MODELS.sonnet55,
      MODELS.sonnet55,
      MODELS.opus55,
      MODELS.sonnet55,
      MODELS.sonnet55,
      MODELS.sonnet55,
    ],
  );
  assert.equal(R.deepDirectorFor(D, { crossDomain: true }), MODELS.opus55);
  assert.equal(R.routingForRun({ userId: 'u', env: {} }).profile, 'current');
});
