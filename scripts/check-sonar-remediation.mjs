/**
 * Sonar model-benchmark remediation (Nov 28 2026):
 *   - role budgets and bounded output contracts (targets well under caps)
 *   - outcome classes: ok, truncated, invalid_output, timeout, skipped_deadline, provider_error
 *   - specialist calls use their role hop budget and keep completed results when one fails
 *   - explicit model fallback state and strict mode
 *   - staff-only canary routing
 *   - retrieval repairs: fundamentals, valuation, government revenue, investment-firm ownership
 *   - cross-dataset checks: join, period, support; retrieval and calculation checks
 *   - Profile D suite plan
 * Run: npm run test:sonar-remediation. No network.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const C = await import('../src/lib/sonar/engine/output-contracts.js');
const R = await import('../src/lib/sonar/model-routing.js');
const B = await import('../src/lib/sonar/engine/eval/model-bench.js');
const O = await import('../src/lib/sonar/analysts/orchestrator.js');
const P = await import('../src/lib/sonar/llm-providers.js');
const { scoreDomains } = await import('../src/lib/sonar/engine/domain-score.js');
const { withSubjectPrior } = await import('../src/lib/sonar/engine/research-spec.js');
const read = (f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');

test('every role target sits at or under 60% of its token cap (1.6 tokens a word)', () => {
  for (const [role, c] of Object.entries(C.OUTPUT_CONTRACTS))
    assert.ok(
      c.targetWords * 1.6 <= 0.6 * c.capTokens,
      `${role}: ${c.targetWords} words vs ${c.capTokens} tokens`,
    );
});

test('role budgets: deep specialists get 55 s inside a 70 s window; reviewers bounded', () => {
  assert.equal(C.ROLE_BUDGETS.deep.specialistHopMs, 55_000);
  assert.ok(C.ROLE_BUDGETS.deep.specialistHopMs < C.ROLE_BUDGETS.deep.specialistsWindowMs);
  assert.ok(C.ROLE_BUDGETS.standard.specialistHopMs <= C.ROLE_BUDGETS.standard.specialistsWindowMs);
  for (const k of ['redTeamHopMs', 'resolveHopMs', 'auditHopMs'])
    assert.ok(C.ROLE_BUDGETS.deep[k] <= 45_000);
  const eng = read('src/lib/sonar/engine/engine.js');
  assert.match(eng, /ROLE_BUDGETS\.deep\.redTeamHopMs/);
  assert.match(eng, /ROLE_BUDGETS\.deep\.auditHopMs/);
  assert.match(eng, /ROLE_BUDGETS\[teamMode\]\?\.specialistsWindowMs/);
  assert.doesNotMatch(eng, /outputScale !== 1 \? \{ maxHopMs: 45_000 \}/);
});

test('outcome classes are kept apart', () => {
  assert.equal(
    C.classifyOutcome({ out: { answer: '{}', stopReason: 'end_turn' }, parsedOk: true }),
    'ok',
  );
  assert.equal(
    C.classifyOutcome({ out: { answer: '{"a":', stopReason: 'max_tokens' }, parsedOk: false }),
    'truncated',
  );
  assert.equal(
    C.classifyOutcome({ out: { answer: 'prose', stopReason: 'end_turn' }, parsedOk: false }),
    'invalid_output',
  );
  assert.equal(
    C.classifyOutcome({
      out: {
        answer: null,
        providerErrors: [{ type: 'ProviderUnavailableError', message: 'anthropic: timed out' }],
      },
    }),
    'timeout',
  );
  assert.equal(
    C.classifyOutcome({
      out: { answer: null, providerErrors: [{ type: 'TimeoutError', message: 'deadline' }] },
    }),
    'skipped_deadline',
  );
  assert.equal(
    C.classifyOutcome({
      out: {
        answer: null,
        providerErrors: [{ type: 'deadline', message: 'skipped, chain deadline reached' }],
      },
    }),
    'skipped_deadline',
  );
  assert.equal(
    C.classifyOutcome({
      out: {
        answer: null,
        providerErrors: [{ type: 'ProviderUnavailableError', message: 'anthropic 529' }],
      },
    }),
    'provider_error',
  );
  const sum = C.outcomeSummary([
    { outcome: 'ok' },
    { outcome: 'truncated', fellBackFrom: { model: 'x' } },
    { outcome: 'timeout' },
  ]);
  assert.deepEqual([sum.ok, sum.truncated, sum.timeout, sum.fallbacks], [1, 1, 1, 1]);
});

test('contracts reach the prompts', () => {
  const sys = O.specialistSystem({
    analyst: { title: 'T', skill: 'none', rules: [] },
    mode: 'deep',
    spec: { domains: [] },
  });
  assert.match(sys, /under about 550 words/);
  assert.match(
    O.specialistSystem({
      analyst: { title: 'T', skill: 'none', rules: [] },
      mode: 'standard',
      spec: { domains: [] },
    }),
    /under about 240 words/,
  );
  assert.match(O.redTeamSystem(), /at most five points/);
  assert.match(O.resolutionSystem(), /note at most 30 words/);
  assert.match(C.writerContract('quick'), /350 words/);
  assert.match(C.writerContract('standard'), /850 words/);
  assert.match(C.memoContract('risk'), /1,900 words/);
  assert.match(read('src/lib/sonar/engine/investment-memo.js'), /memoContract\(spec\.memoKind\)/);
  assert.match(read('src/lib/sonar/engine/findings.js'), /writerContract\(spec\.depth\)/);
  assert.match(read('src/lib/sonar/analysts/audit.js'), /AUDIT_CONTRACT/);
});

test('specialists: role hop budget, completed results kept when one fails, outcomes recorded', async () => {
  const marked = [
    { marker: 'S1', id: 'e1', category: 'corporate_filings', title: 'X', text: 'Revenue 10' },
  ];
  const hops = [];
  let n = 0;
  const synth = async (args) => {
    hops.push(args.maxHopMs);
    n += 1;
    if (n === 1)
      return {
        answer: null,
        providerErrors: [{ type: 'ProviderUnavailableError', message: 'anthropic: timed out' }],
      };
    return {
      answer: JSON.stringify({
        analyst: 'a',
        conclusion: 'c',
        confidence: 'low',
        findings: [{ claim: 'Revenue was 10 [S1].', label: 'fact', refs: ['S1'], period: '2026' }],
        counterevidence: [],
        dataGaps: [],
        handoffs: [],
      }),
      stopReason: 'end_turn',
      usage: { model: 'claude-sonnet-5-5', outputTokens: 120 },
    };
  };
  const ids = Object.keys((await import('../src/lib/sonar/analysts/registry.js')).ANALYSTS)
    .filter((k) => !['research-director', 'methodology-auditor', 'red-team'].includes(k))
    .slice(0, 2);
  const out = await O.runSpecialists({
    routing: {
      assignments: ids.map((id, i) => ({
        analyst: id,
        role: i ? 'supporting' : 'lead',
        task: 't',
        capabilities: [],
      })),
      supporting: [],
    },
    spec: { question: 'q', domains: [] },
    marked,
    metrics: [],
    mode: 'deep',
    deadlineAt: Date.now() + 60_000,
    synth,
    models: { fast: 'claude-haiku-4-5-20251001', strong: 'claude-sonnet-5-5' },
    today: '2026-11-28',
  });
  assert.ok(
    hops.every((h) => h === 55_000),
    `hops ${hops}`,
  );
  const calls = out.specialists.map((x) => x.call?.outcome);
  assert.ok(calls.includes('timeout'));
  assert.equal(out.specialists.length, 2, 'the failed specialist does not take the other down');
});

test('explicit fallback: strict mode and the reply carries fellBackFrom', () => {
  assert.equal(P.modelStrict({ SONAR_MODEL_STRICT: '1' }), true);
  assert.equal(P.modelStrict({}), false);
  const src = read('src/lib/sonar/llm-providers.js');
  assert.match(src, /model !== safeFallback && !modelStrict\(\)/);
  assert.match(src, /requestedModel: model,\s*fellBackFrom,/);
});

test('staff-only canary', () => {
  const env = { SONAR_MODEL_CANARY_PROFILE: 'D', SONAR_MODEL_CANARY_STAFF: '1' };
  assert.equal(R.profileForUser({ userId: 'u1', isStaff: true, env }), 'D');
  assert.equal(R.profileForUser({ userId: 'u1', isStaff: false, env }), 'current');
  assert.equal(R.profileForUser({ userId: null, isStaff: true, env }), 'current');
  assert.equal(
    R.profileForUser({ userId: 'u1', isStaff: true, env: { SONAR_MODEL_CANARY_STAFF: '1' } }),
    'current',
    'no canary profile, no canary',
  );
  assert.equal(
    R.routingForRun({
      userId: 'u1',
      isStaff: true,
      env: { ...env, SONAR_MODEL_PROFILE: 'current' },
    }).profile,
    'D',
  );
  const route = read('src/app/api/sonar/research/route.js');
  assert.match(route, /isStaff: Boolean\(access\.user && isAdminUser\(access\.user\)\)/);
  assert.match(route, /modelRouting,/);
  assert.match(route, /modelUsage = compactUsage/);
  assert.match(read('src/lib/sonar/engine/telemetry.js'), /models: \{\s*profile: m\.modelProfile/);
});

test('retrieval repairs: fundamentals, valuation, government revenue, investment firms', () => {
  const ids = (q) => scoreDomains(q, { intent: 'open_question', entities: [] }).map((d) => d.id);
  assert.ok(ids('Give me a fundamental analysis of Apple.').includes('company_financials'));
  assert.ok(ids('Run a DCF on Microsoft.').includes('company_financials'));
  assert.ok(ids('Run a DCF on Microsoft.').includes('analyst_views'));
  const gov = scoreDomains('How dependent is Palantir on government revenue?', {
    intent: 'open_question',
    entities: [],
  });
  assert.equal(gov.find((d) => d.id === 'contracts')?.score >= 0.95, true);
  assert.ok(
    ids('what stocks does Pelosi own that are most owned by investment firms').includes(
      'institutional',
    ),
  );
  const prior = withSubjectPrior([{ id: 'news', score: 0.5 }], { kind: 'company', id: 'AAPL' });
  assert.equal(prior[0].id, 'company');
  assert.deepEqual(withSubjectPrior([{ id: 'news', score: 0.5 }], { kind: 'politician' }), [
    { id: 'news', score: 0.5 },
  ]);
  const plan = read('src/lib/sonar/engine/planner.js');
  assert.match(plan, /MEMO_REPLACES\[source\]/);
  const eng = read('src/lib/sonar/engine/engine.js');
  assert.match(eng, /evidenceOverride\.valuation/);
});

test('cross-dataset: a valid insight needs a join, aligned periods and support', () => {
  const evidence = [
    {
      id: 'a',
      marker: 'S1',
      source: 'congress_trades',
      title: 'Rep. Hern sold LMT',
      text: 'LMT sale 2026-09',
      period: '2026',
    },
    {
      id: 'b',
      marker: 'S2',
      source: 'contracts',
      title: 'LMT obligations FY2026',
      text: 'LMT obligated $480,000,000',
      period: '2026',
    },
    {
      id: 'c',
      marker: 'S3',
      source: 'contracts',
      title: 'RTX obligations FY2019',
      text: 'RTX obligated',
      period: '2019',
    },
  ];
  const run = {
    evidence,
    keyFindings: [
      {
        title: 'LMT selling while LMT awards grew',
        explanation: 'Members sold LMT while LMT obligations reached $480 million.',
        evidence: ['S1', 'S2'],
      },
      {
        title: 'Sales and awards',
        explanation: 'Members sold LMT while RTX contracts were awarded.',
        evidence: ['S1', 'S3'],
      },
      {
        title: 'LMT sold while LMT was paid',
        explanation: 'Members sold LMT while LMT received $999 million.',
        evidence: ['S1', 'S2'],
      },
      {
        title: 'Side by side',
        explanation: 'Trades happened. Contracts were awarded.',
        evidence: ['S1', 'S2'],
      },
    ],
  };
  const r = B.relationshipScore(run);
  assert.equal(r.crossFindings, 3, 'the side-by-side paragraph has no relating language');
  assert.equal(r.validCrossInsights, 1);
  assert.equal(r.failures.join, 1);
  assert.equal(r.failures.period, 1);
  assert.equal(r.failures.unsupported, 1);
});

test('retrieval and calculation checks read the frozen snapshot and the run', () => {
  const c = {
    requiredDatasets: [['company_financials'], ['contracts_profile', 'composition'], ['estimates']],
    requiredCalcs: ['metrics', 'valuation'],
  };
  const snap = {
    calls: [
      { source: 'company_financials', output: { items: [1, 2] } },
      { source: 'estimates', output: { items: [] } },
    ],
    composition: { ok: true },
    plan: { excluded: [] },
  };
  const rc = B.retrievalCheck(c, snap);
  assert.deepEqual(
    rc.groups.map((g) => g.status),
    ['retrieved', 'retrieved', 'empty_at_source'],
  );
  assert.equal(rc.complete, false);
  const miss = B.retrievalCheck(
    { requiredDatasets: [['institutional_13f']] },
    {
      calls: [],
      plan: { excluded: [{ source: 'institutional_13f', reason: 'unmet_needs:tickers' }] },
    },
  );
  assert.equal(miss.groups[0].status, 'not_planned:unmet_needs:tickers');
  assert.deepEqual(B.calcCheck(c, { quantitativeMetrics: [{ id: 'x' }] }).missing, ['valuation']);
});

test('Profile D suite: 18 cases, current vs D, cheaper alternatives, deep writer ablation', () => {
  const plan = B.suitePlan({ deepTrials: 2, variant: 'profile-d' });
  const runs = plan.filter((s) => s.kind === 'run');
  const cases = [...new Set(runs.map((s) => s.caseId))];
  assert.equal(cases.length, 18);
  const deep = B.casesForVariant('profile-d')
    .filter((c) => c.depth === 'deep')
    .map((c) => c.id);
  assert.deepEqual(
    deep.sort(),
    [
      'causal_export_controls_revenue',
      'deep_research',
      'deep_valuation',
      'model_dcf_sensitivity',
      'screen_congress_contracts_13f',
    ].sort(),
  );
  const std = B.caseById('company_fundamentals');
  assert.deepEqual(
    B.cellsForVariant(std, 'profile-d', {}).map((x) => x.id),
    ['current', 'D', 'D-h45spec', 'D-h55spec'],
  );
  const dc = B.cellsForVariant(B.caseById('deep_research'), 'profile-d', {});
  assert.deepEqual(
    dc.map((x) => x.id),
    ['current', 'D', 'D-sonnet-writer'],
  );
  assert.equal(dc[2].routing.deep_director, R.MODELS.sonnet55);
  assert.equal(dc[1].routing.deep_director, R.MODELS.opus55);
  const incomplete = B.casesForVariant('profile-d')
    .filter((c) => c.evidenceClass === 'incomplete_evidence')
    .map((c) => c.id);
  assert.deepEqual(
    incomplete.sort(),
    [
      'government_contract_exposure',
      'partial_private_company',
      'partial_stale_filings',
      'valuation',
    ].sort(),
  );
  for (const c of B.casesForVariant('profile-d'))
    assert.ok(c.requiredDatasets?.length, `${c.id} names its datasets`);
  assert.equal(new Set(plan.map((s) => s.key)).size, plan.length);
});

test('request shapes per model: thinking and effort fields, tokenizer scaling, reserves', () => {
  const s55 = R.requestShape('claude-sonnet-5-5', { maxTokens: 1000, think: 'off', effort: 'low' });
  assert.deepEqual(s55.fields, {
    thinking: { type: 'between_tools' },
    output_config: { effort: 'low' },
  });
  assert.equal(s55.maxTokens, 1300);
  const h55 = R.requestShape('claude-haiku-5-5', { maxTokens: 700, think: 'off', effort: 'low' });
  assert.deepEqual(h55.fields.thinking, { type: 'disabled' });
  const o55 = R.requestShape('claude-opus-5-5', { maxTokens: 900, think: 'off', effort: 'low' });
  assert.equal(o55.fields.thinking, undefined, 'Opus 5.5 cannot turn thinking off');
  assert.equal(o55.maxTokens, Math.round(900 * 1.3) + 1500, 'so it gets a small reserve');
  const deep = R.requestShape('claude-opus-5-5', {
    maxTokens: 6000,
    think: 'adaptive',
    effort: 'medium',
    reserveTokens: 6000,
  });
  assert.deepEqual(deep.fields, {
    thinking: { type: 'adaptive' },
    output_config: { effort: 'medium' },
  });
  assert.equal(deep.maxTokens, 7800 + 6000);
  const h45 = R.requestShape('claude-haiku-4-5-20251001', {
    maxTokens: 700,
    think: 'off',
    effort: 'low',
  });
  assert.deepEqual(h45.fields, {}, '4.x models get no thinking or effort fields');
  assert.equal(h45.maxTokens, 700);
  assert.deepEqual(
    R.requestShape('claude-sonnet-5', { maxTokens: 10, think: 'off' }).fields.thinking,
    { type: 'disabled' },
  );
  assert.equal(
    C.classifyOutcome({
      out: {
        answer: null,
        providerErrors: [{ message: 'anthropic: cut at max_tokens before any text' }],
      },
    }),
    'truncated',
  );
  assert.equal(C.ROLE_THINKING.specialist.think, 'off');
  assert.equal(C.writerRole('deep'), 'deep_writer');
  const src = read('src/lib/sonar/llm-providers.js');
  assert.match(src, /bodyFor\(safeFallback\)/);
  assert.match(read('src/lib/sonar/analysts/orchestrator.js'), /\.\.\.ROLE_THINKING\.specialist/);
  assert.match(
    read('src/lib/sonar/engine/engine.js'),
    /\.\.\.ROLE_THINKING\[writerRole\(depth\)\]/,
  );
});

test('provider sends the shaped request (fetch stub)', async () => {
  const realFetch = globalThis.fetch;
  const realKey = process.env.ANTHROPIC_API_KEY;
  process.env.ANTHROPIC_API_KEY = 'test';
  let sent = null;
  globalThis.fetch = async (_url, init) => {
    sent = JSON.parse(init.body);
    return new Response(
      JSON.stringify({
        model: 'claude-sonnet-5-5',
        content: [
          { type: 'thinking', thinking: '' },
          { type: 'text', text: '{"ok":1}' },
        ],
        usage: { input_tokens: 5, output_tokens: 5 },
        stop_reason: 'end_turn',
      }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    );
  };
  try {
    const out = await P.synthesizeWithFallback({
      system: 's',
      user: 'u',
      maxTokens: 700,
      model: 'claude-sonnet-5-5',
      think: 'off',
      effort: 'low',
    });
    assert.equal(out.answer, '{"ok":1}', 'thinking blocks are skipped, text is read');
    assert.deepEqual(sent.thinking, { type: 'between_tools' });
    assert.deepEqual(sent.output_config, { effort: 'low' });
    assert.equal(sent.max_tokens, 910);
    await P.synthesizeWithFallback({
      system: 's',
      user: 'u',
      maxTokens: 700,
      model: 'claude-haiku-4-5-20251001',
    });
    assert.equal(sent.thinking, undefined);
    assert.equal(sent.max_tokens, 700, 'callers that set nothing keep the old request');
  } finally {
    globalThis.fetch = realFetch;
    if (realKey === undefined) delete process.env.ANTHROPIC_API_KEY;
    else process.env.ANTHROPIC_API_KEY = realKey;
  }
});

test('valuation results reach the writer as computed metrics', async () => {
  const { valuationMetrics } = await import('../src/lib/sonar/valuation/metrics.js');
  const v = {
    version: 'valuation-model-v1',
    asOf: '2026-11-28',
    dcf: {
      ok: true,
      inputs: {
        capexPct: 0.3923,
        margin: 0.471,
        startGrowth: 0.142,
        beta: 1.045,
        riskFree: 0.0494,
        terminalGrowth: 0.025,
        price: null,
        growthSource: 'market',
      },
      result: { wacc: 0.0987438, perShare: 80.0208, terminalShare: 0.71 },
    },
    scenarios: [
      { id: 'bear', label: 'Bear', perShare: 53.31, assumptions: { waccPct: 10.87 } },
      { id: 'bull', label: 'Bull', perShare: 108.19, assumptions: { waccPct: 9.37 } },
      { id: 'broken', error: 'x' },
    ],
    sensitivity: {
      waccGrowth: {
        cells: [
          [81.39, 70.1],
          [95.2, 60.0],
        ],
      },
    },
  };
  const m = Object.fromEntries(valuationMetrics(v).map((x) => [x.id, x]));
  assert.equal(m.dcf_value_per_share.value, 80.02);
  assert.equal(m.dcf_wacc.value, 0.0987);
  assert.equal(m.dcf_wacc.unit, 'ratio');
  assert.equal(m.dcf_bear_per_share.value, 53.31);
  assert.equal(m.dcf_sensitivity_low.value, 60);
  assert.equal(m.dcf_vs_price, undefined, 'no price, no gap');
  assert.equal(m.dcf_broken_per_share, undefined);
  assert.equal(m.dcf_value_per_share.classification, 'calculated_result');
  assert.deepEqual(valuationMetrics(null), []);
  assert.deepEqual(valuationMetrics({ dcf: { ok: false } }), []);
  assert.match(
    read('src/lib/sonar/engine/engine.js'),
    /for \(const m of valuationMetrics\(valuation\)\)/,
  );
  assert.equal(
    B.calcCheck({ requiredCalcs: ['valuation'] }, { valuation: { dcf: { ok: true, result: {} } } })
      .ok,
    true,
  );
  assert.equal(
    B.calcCheck({ requiredCalcs: ['valuation'] }, { valuation: { dcf: { ok: false } } }).ok,
    false,
  );
});
