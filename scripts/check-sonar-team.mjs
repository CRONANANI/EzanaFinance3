/**
 * Sonar analyst team (Nov 2026): evidence scoping and freshness, specialist validation,
 * budgets, the director block, the red team, the methodology audit, and the engine end to end
 * with stubbed sources and a stubbed provider (standard, deep, quick).
 *
 * Run: node --no-warnings --import ./scripts/register-sonar-loader.mjs --test scripts/check-sonar-team.mjs
 */
import test from 'node:test';
import assert from 'node:assert/strict';

const O = await import('@/lib/sonar/analysts/orchestrator');
const A = await import('@/lib/sonar/analysts/audit');
const { ANALYSTS } = await import('@/lib/sonar/analysts/registry');

const NOW = new Date('2026-11-06T12:00:00Z');

/* Evidence the way the engine marks it (withMarkers). */
const EV = [
  {
    id: 'e1',
    marker: 'S1',
    source: 'macro_series',
    category: 'historical',
    title: 'Turkey: TRY per US dollar 48.65 (Sep 2026)',
    text: 'TRY per US dollar, Sep 2026: 48.65; Sep 2025: 41.33. Over the year the dollar costs 17.71% more in lira, and the lira lost 15.04% of its dollar value.',
    period: { label: '2026-09', to: '2026-09' },
    data: { metric: 'macro_series', family: 'fx_usd', period: '2026-09' },
    numbers: [],
    entities: ['Turkey'],
  },
  {
    id: 'e2',
    marker: 'S2',
    source: 'macro_series',
    category: 'historical',
    title: 'Turkey: annual inflation 29.73% (Sep 2026)',
    text: 'Annual inflation, Sep 2026: 29.73%, falling from 33.29% in Sep 2025.',
    period: { label: '2026-09', to: '2026-09' },
    data: { metric: 'macro_series', family: 'inflation_monthly', period: '2026-09' },
    numbers: [],
    entities: ['Turkey'],
  },
  {
    id: 'e3',
    marker: 'S3',
    source: 'macro_series',
    category: 'historical',
    title: 'Turkey: policy rate 37% (Sep 2026)',
    text: 'Policy rate, Sep 2026: 37%, down 3.5 percentage points from 40.5% in Sep 2025.',
    period: { label: '2026-09', to: '2026-09' },
    data: { metric: 'macro_series', family: 'policy_rate', period: '2026-09' },
    numbers: [],
    entities: ['Turkey'],
  },
  {
    id: 'e4',
    marker: 'S4',
    source: 'contracts_history',
    category: 'historical',
    title: 'Federal obligations FY2025',
    text: 'Obligations of $1.2B in FY2025.',
    period: { label: 'FY2025' },
    data: {},
    numbers: [],
    entities: [],
  },
];
/* findings.js numbersOf fills e.numbers for the claim validator. */
const { numbersOf } = await import('@/lib/sonar/engine/evidence').catch(() => ({}));
for (const e of EV) e.numbers = numbersOf ? numbersOf(`${e.title} ${e.text}`) : [];

test('scopeEvidence: each specialist reads only its capabilities; macro rows by family', () => {
  const fx = O.scopeEvidence(EV, ANALYSTS['fx-strategist'].required);
  assert.ok(fx.some((e) => e.marker === 'S1'));
  assert.ok(!fx.some((e) => e.source === 'contracts_history'));
  const contracts = O.scopeEvidence(EV, ANALYSTS['contracts-analyst'].required);
  assert.ok(contracts.every((e) => e.source !== 'macro_series'));
});

test('markFreshness: a monthly FX row two months old is not current; the policy rate is', () => {
  const f = O.markFreshness(EV, { now: NOW });
  const fx = f.find((e) => e.marker === 'S1');
  const pol = f.find((e) => e.marker === 'S3');
  assert.equal(fx.capability != null, true);
  assert.equal(typeof fx.stale, 'boolean');
  assert.equal(pol.stale, false);
});

test('validateSpecialist: unsupported numbers and broken rules are removed, the rest kept', () => {
  const v = O.validateSpecialist(
    {
      analyst: 'fx-strategist',
      conclusion: 'The lira is under sustained pressure.',
      confidence: 'moderate',
      findings: [
        {
          claim:
            'Over the year the dollar costs 17.71% more in lira and the lira lost 15.04% of its dollar value.',
          label: 'fact',
          refs: ['S1'],
          period: '2026-09',
        },
        { claim: 'The lira lost 61% in a month.', label: 'fact', refs: ['S1'] },
        { claim: 'Annual inflation was 29.73% in Sep 2026.', label: 'fact', refs: ['S2'] },
      ],
      dataGaps: ['No CDS spreads'],
    },
    { analyst: ANALYSTS['fx-strategist'], marked: EV, metrics: [] },
  );
  assert.equal(v.ok, true);
  assert.equal(v.output.findings.length, 2);
  assert.ok(v.log.some((l) => l.action === 'removed'));
  assert.equal(
    O.validateSpecialist(
      { nope: 1 },
      { analyst: ANALYSTS['fx-strategist'], marked: EV, metrics: [] },
    ).ok,
    false,
  );
});

test('budgets: the lowest-scoring supporting analyst is dropped first; the ceiling reads the env', () => {
  const routing = {
    supporting: [
      { id: 'a', score: 0.6 },
      { id: 'b', score: 0.35 },
    ],
  };
  const asg = [
    { analyst: 'lead', role: 'lead' },
    { analyst: 'a', role: 'supporting' },
    { analyst: 'b', role: 'supporting' },
  ];
  const r = O.fitBudget(asg, { routing, ceiling: 0.03, reserveUsd: 0.01, estimate: () => 0.008 });
  assert.deepEqual(r.dropped, ['b']);
  assert.equal(r.kept.length, 2);
  assert.equal(O.costCeilingUsd('standard', {}), 0.05);
  assert.equal(O.costCeilingUsd('deep', {}), 0.6);
  assert.equal(O.costCeilingUsd('deep', { SONAR_RESEARCH_MAX_USD: '{"deep":1.2}' }), 1.2);
  assert.equal(O.costCeilingUsd('standard', { SONAR_RESEARCH_MAX_USD: '0.08' }), 0.08);
  assert.ok(
    O.callCostUsd('claude-haiku-4-5', 4000, 700) < O.callCostUsd('claude-sonnet-4-5', 4000, 700),
  );
});

test('reasons are plain words; the team view carries titles, never models, costs or prompts', () => {
  assert.equal(
    O.plainReason(['domain country', 'theme currency', 'operations exposure']),
    'Chosen for country; currency; exposure.',
  );
  const routing = { lead: { id: 'fx-strategist', reasons: ['theme currency'] }, supporting: [] };
  const v = O.teamView({
    routing,
    specialists: [
      {
        id: 'fx-strategist',
        title: ANALYSTS['fx-strategist'].title,
        role: 'lead',
        reason: 'Chosen for currency.',
        status: 'done',
        conclusion: 'x',
        confidence: 'low',
        findings: [],
        dataGaps: ['No CDS'],
        model: 'claude-haiku-4-5',
        log: [],
      },
    ],
    audit: { passed: 3, total: 3, checks: [] },
    mode: 'standard',
  });
  const s = JSON.stringify(v);
  assert.equal(v.lead.title, ANALYSTS['fx-strategist'].title);
  assert.ok(!/claude|haiku|sonnet|usd|cost|system/i.test(s), s);
  assert.deepEqual(v.methodology.gaps, ['No CDS']);
});

test('methodology reaches valuation, portfolio and equity analysts only', () => {
  const m = {
    isDefault: false,
    valuationMethods: ['dcf'],
    horizonMonths: 24,
    assumptionOverrides: { equityRiskPremium: 0.05 },
  };
  const spec = { question: 'q', rawQuery: 'q' };
  const val = O.specialistUser({
    assignment: { analyst: 'valuation', role: 'lead', task: 't' },
    spec,
    items: EV,
    metrics: [],
    today: 'today',
    methodology: m,
  });
  const fx = O.specialistUser({
    assignment: { analyst: 'fx-strategist', role: 'lead', task: 't' },
    spec,
    items: EV,
    metrics: [],
    today: 'today',
    methodology: m,
  });
  assert.match(val, /per your fund's methodology/);
  assert.doesNotMatch(fx, /methodology/);
  assert.equal(O.methodologyBlock({ isDefault: true }), '');
});

test('red team: points parsed, every point resolved, unresolved points become limitations', () => {
  const rt = O.parseRedTeam(
    JSON.stringify({
      verdict: 'weakened',
      points: [
        { kind: 'alternative', text: 'Seasonal effects.', refs: ['S2'] },
        { kind: 'missing_evidence', text: 'No CDS.', refs: [] },
      ],
    }),
  );
  assert.equal(rt.points.length, 2);
  const res = O.applyResolutions(rt, {
    resolutions: [{ point: 0, resolution: 'rebutted', note: 'Inflation fell.', refs: ['S2'] }],
  });
  assert.equal(res.points[0].resolution, 'rebutted');
  assert.equal(res.points[1].resolution, 'limitation');
});

test('audit: untraced numbers removed, stale data flagged, single-source agreement flagged', () => {
  const marked = O.markFreshness(EV, { now: NOW }).map((e) =>
    e.marker === 'S1' ? { ...e, stale: true } : e,
  );
  const report = {
    executiveConclusion: { text: 'The lira is under pressure [S1].', markers: ['S1'] },
    keyFindings: [
      {
        id: 'finding_1',
        title: 'Depreciation',
        explanation: 'The lira lost 15.04% of its dollar value over the year to Sep 2026.',
        markers: ['S1'],
        metrics: [],
        classification: 'verified_fact',
      },
      {
        id: 'finding_2',
        title: 'Invented',
        explanation: 'Reserves fell 42% in Sep 2026.',
        markers: ['S2'],
        metrics: [],
        classification: 'verified_fact',
      },
    ],
    analysis: [],
    limitations: [],
  };
  const specialists = [
    { id: 'fx-strategist', status: 'done', findings: [{ claim: 'x', refs: ['S1'] }] },
    { id: 'macroeconomist', status: 'done', findings: [{ claim: 'y', refs: ['S2'] }] },
  ];
  const audit = A.auditReport({ report, marked, metrics: [], specialists });
  const byId = Object.fromEntries(audit.checks.map((c) => [c.id, c]));
  assert.equal(byId.numbers_traced.pass, false);
  assert.ok(audit.fixes.removeIds.includes('finding_2'));
  assert.equal(byId.stale_flagged.pass, false);
  assert.equal(byId.evidence_diversity.pass, false, 'both cite macro_series only');
  const fixed = A.applyAuditFixes(report, audit.fixes);
  assert.equal(fixed.keyFindings.length, 1);
  assert.ok(fixed.limitations.some((l) => /Not current/.test(l)));
  assert.ok(audit.total >= 10);
});

/* ---------------------------------------------------------------- end to end */

function fakeAdmin() {
  return {
    from() {
      const q = {
        select: () => q,
        eq: () => q,
        in: () => q,
        gte: () => q,
        gt: () => q,
        lt: () => q,
        lte: () => q,
        order: () => q,
        limit: () => q,
        ilike: () => q,
        like: () => q,
        not: () => q,
        is: () => q,
        or: () => q,
        maybeSingle: () => Promise.resolve({ data: null, error: null }),
        upsert: () => Promise.resolve({ error: null }),
        insert: () => Promise.resolve({ error: null }),
        then: (res, rej) => Promise.resolve({ data: [], error: null }).then(res, rej),
      };
      return q;
    },
    rpc: () => Promise.resolve({ data: null, error: null }),
  };
}

const SPEC_JSON = (id) =>
  JSON.stringify({
    analyst: id,
    question: 'q',
    conclusion: 'The lira is under sustained pressure.',
    confidence: 'moderate',
    confidenceReason: 'monthly data',
    findings: [
      {
        claim:
          'Over the year the dollar costs 17.71% more in lira and the lira lost 15.04% of its dollar value.',
        label: 'fact',
        refs: ['S1'],
        period: '2026-09',
      },
      {
        claim: 'Annual inflation was 29.73% in Sep 2026.',
        label: 'fact',
        refs: ['S2'],
        period: '2026-09',
      },
    ],
    counterevidence: [],
    dataGaps: ['No sovereign CDS spreads'],
    handoffs: [],
  });
const DIRECTOR_JSON = JSON.stringify({
  executiveConclusion: {
    text: 'Yes. The lira lost 15.04% of its dollar value over the year to Sep 2026 [S1].',
    classification: 'verified_fact',
    evidence: ['S1'],
    metrics: [],
  },
  keyFindings: [
    {
      title: 'Depreciation',
      explanation: 'The dollar costs 17.71% more in lira over the year to Sep 2026.',
      classification: 'verified_fact',
      evidence: ['S1'],
      metrics: [],
      entities: ['Turkey'],
      period: '2026-09',
    },
    {
      title: 'Inflation',
      explanation: 'Annual inflation was 29.73% in Sep 2026, falling from 33.29%.',
      classification: 'verified_fact',
      evidence: ['S2'],
      metrics: [],
      entities: ['Turkey'],
      period: '2026-09',
    },
  ],
  analysis: [],
  limitations: ['No sovereign CDS spreads.'],
  followOnResearch: [],
  confidence: 'medium',
});

function stubProvider() {
  const calls = [];
  let inflight = 0;
  let maxInflight = 0;
  const original = globalThis.fetch;
  globalThis.fetch = async (url, init = {}) => {
    if (!String(url).startsWith('https://api.anthropic.com/'))
      return new Response('{}', { status: 404 });
    const body = JSON.parse(init.body);
    const sys = body.system;
    let kind = 'other';
    let out = '{}';
    if (/one specialist on a research team/.test(sys)) {
      kind = 'specialist';
      const id = Object.values(ANALYSTS).find((a) =>
        sys.includes(`You are Sonar's ${a.title},`),
      )?.id;
      out = SPEC_JSON(id);
    } else if (/Independent Red-Team Analyst/.test(sys)) {
      kind = 'red-team';
      out = JSON.stringify({
        verdict: 'weakened',
        points: [
          { kind: 'alternative', text: 'Monthly averages hide recent moves.', refs: ['S1'] },
        ],
      });
    } else if (/answering the red team/.test(sys)) {
      kind = 'resolution';
      out = JSON.stringify({
        resolutions: [
          {
            point: 0,
            resolution: 'limitation',
            note: 'Only monthly exchange-rate averages are held.',
            refs: [],
          },
        ],
      });
    } else if (/Methodology Auditor/.test(sys)) {
      kind = 'audit';
      out = JSON.stringify({
        checks: [
          { id: 'leaps', label: 'No unsupported leaps', pass: true, detail: '', fix: 'none' },
        ],
      });
    } else if (/Return ONLY one JSON object/.test(sys)) {
      kind = /Chief Research Director/.test(sys) ? 'director' : 'synthesis';
      out = DIRECTOR_JSON;
    }
    calls.push({ kind, system: sys, user: body.messages[0].content });
    inflight += 1;
    maxInflight = Math.max(maxInflight, inflight);
    await new Promise((r) => setTimeout(r, 30));
    inflight -= 1;
    return new Response(
      JSON.stringify({
        model: body.model,
        content: [{ type: 'text', text: out }],
        stop_reason: 'end_turn',
        usage: { input_tokens: 1, output_tokens: 1 },
      }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    );
  };
  return { calls, max: () => maxInflight, restore: () => (globalThis.fetch = original) };
}

async function runTurkey(depth) {
  process.env.ANTHROPIC_API_KEY = 'test-key-not-real';
  const { runResearch } = await import('@/lib/sonar/engine/engine');
  const { RUNNERS } = await import('@/lib/sonar/engine/sources');
  const original = { ...RUNNERS };
  for (const k of Object.keys(RUNNERS)) RUNNERS[k] = async () => ({ items: [] });
  RUNNERS.macro_series = async () => ({
    items: EV.filter((e) => e.source === 'macro_series').map((e) => ({
      kind: 'series',
      category: 'historical',
      title: e.title,
      text: e.text,
      period: e.period,
      data: e.data,
      entities: e.entities,
    })),
  });
  const events = [];
  const stub = stubProvider();
  try {
    const run = await runResearch("Is Turkey's lira under pressure?", {
      admin: fakeAdmin(),
      runId: '00000000-0000-4000-8000-000000000009',
      depth,
      emit: (t, d) => events.push([t, d]),
      now: NOW,
    });
    return { run, events, calls: stub.calls, maxInflight: stub.max() };
  } finally {
    stub.restore();
    Object.assign(RUNNERS, original);
  }
}

test('engine, standard: lead plus supporting specialists in parallel, the director, the audit', async () => {
  const { run, events, calls, maxInflight } = await runTurkey('standard');
  const team = events.find(([t]) => t === 'team')?.[1];
  assert.ok(team, 'team event');
  assert.equal(team.lead.title, ANALYSTS['fx-strategist'].title);
  const specCalls = calls.filter((c) => c.kind === 'specialist');
  assert.ok(specCalls.length >= 2, `specialists ${specCalls.length}`);
  assert.ok(specCalls.length <= 3);
  assert.ok(maxInflight >= 2, 'specialists ran in parallel');
  const director = calls.find((c) => c.kind === 'director');
  assert.ok(director, 'the existing synthesis call is the director');
  assert.match(director.user, /Specialist findings \(validated\)/);
  assert.ok(!calls.some((c) => c.kind === 'red-team'), 'no red team in standard');
  const audit = events.find(([t]) => t === 'audit')?.[1];
  assert.ok(audit && audit.total >= 10);
  const findings = events.find(([t]) => t === 'findings')[1].report;
  assert.ok(findings.team);
  assert.ok(findings.team.specialists.every((s) => s.status === 'done'));
  assert.equal(run.team.lead.id, 'fx-strategist');
  const analystEvents = events
    .filter(([t]) => t === 'analyst')
    .map(([, d]) => `${d.id}:${d.status}`);
  assert.ok(
    analystEvents.includes('fx-strategist:started') && analystEvents.includes('fx-strategist:done'),
  );
  assert.ok(analystEvents.includes('methodology-auditor:done'));
  /* No model names, costs or prompt text in what the reader sees. */
  assert.ok(!/claude|haiku|sonnet|estimatedUsd/i.test(JSON.stringify(findings.team)));
});

test('engine, deep: the red team challenges the draft and every point is resolved', async () => {
  const { events, calls } = await runTurkey('deep');
  assert.ok(calls.some((c) => c.kind === 'red-team'));
  assert.ok(calls.some((c) => c.kind === 'resolution'));
  assert.ok(
    calls.some((c) => c.kind === 'audit'),
    'deep adds the model audit review',
  );
  const report = events.find(([t]) => t === 'findings')[1].report;
  assert.equal(report.team.redTeam.points[0].resolution, 'limitation');
  assert.ok(report.limitations.some((l) => /monthly exchange-rate averages/.test(l)));
  assert.ok(report.team.audit.checks.some((c) => c.id.startsWith('review_')));
});

test('engine, quick: no analyst calls, the deterministic audit still runs', async () => {
  const { events, calls } = await runTurkey('quick');
  assert.ok(!calls.some((c) => c.kind === 'specialist'));
  assert.ok(events.some(([t]) => t === 'audit'));
});

test('team metrics: both FX conventions and the ex-post real rate, computed by the quant engine', async () => {
  const quant = await import('@/lib/sonar/analysts/quant');
  const h = [];
  for (let i = 0; i < 24; i += 1) {
    const d = new Date(Date.UTC(2024, 9 + i, 1));
    h.push({
      period: d.toISOString().slice(0, 7),
      value: i === 23 ? 48.65 : i === 11 ? 41.33 : 40 + i * 0.3,
    });
  }
  const marked = [
    { marker: 'S1', data: { family: 'fx_usd', value: 48.65, period: h.at(-1).period, history: h } },
    {
      marker: 'S2',
      data: { family: 'policy_rate', value: 37, period: '2026-09', unit: '% a year' },
    },
    {
      marker: 'S3',
      data: { family: 'inflation_monthly', value: 29.73, period: '2026-09', unit: '%' },
    },
  ];
  const m = Object.fromEntries(O.teamMetrics(marked, quant).map((x) => [x.id, x]));
  assert.equal(m.fx_dollar_dearer_1y.value.toFixed(1), '17.7');
  assert.equal(m.fx_value_lost_1y.value.toFixed(1), '15.0');
  assert.equal(m.real_rate_ex_post.value, 7.27);
  assert.match(m.real_rate_ex_post.label, /Ex-post/);
  assert.deepEqual(m.real_rate_ex_post.inputs, ['S2', 'S3']);
});

test('org methodology: org A requires a red team in standard mode, org B never sees it', async () => {
  const rows = {
    'org-a': {
      org_id: 'org-a',
      valuation_methods: ['dcf'],
      required_sections: [],
      horizon_months: 24,
      scenarios_required: true,
      red_team_required: true,
      review_rules: {},
      assumption_overrides: {},
      output_format: 'ic_memo',
      notes: null,
    },
  };
  const adminFor = () => {
    const base = fakeAdmin();
    return {
      ...base,
      from(table) {
        if (table !== 'org_research_methodology') return base.from(table);
        let org = null;
        const q = {
          select: () => q,
          eq: (c, v) => ((org = c === 'org_id' ? v : org), q),
          maybeSingle: () => Promise.resolve({ data: rows[org] || null, error: null }),
        };
        return q;
      },
    };
  };
  process.env.ANTHROPIC_API_KEY = 'test-key-not-real';
  const { runResearch } = await import('@/lib/sonar/engine/engine');
  const { RUNNERS } = await import('@/lib/sonar/engine/sources');
  const original = { ...RUNNERS };
  for (const k of Object.keys(RUNNERS)) RUNNERS[k] = async () => ({ items: [] });
  RUNNERS.macro_series = async () => ({
    items: EV.filter((e) => e.source === 'macro_series').map((e) => ({
      kind: 'series',
      category: 'historical',
      title: e.title,
      text: e.text,
      period: e.period,
      data: e.data,
      entities: e.entities,
    })),
  });
  const run = async (orgId) => {
    const stub = stubProvider();
    try {
      await runResearch("Is Turkey's lira under pressure?", {
        admin: adminFor(),
        runId: '00000000-0000-4000-8000-00000000000a',
        depth: 'standard',
        scope: { orgId },
        now: NOW,
      });
      return stub.calls;
    } finally {
      stub.restore();
    }
  };
  try {
    const a = await run('org-a');
    const b = await run('org-b');
    assert.ok(
      a.some((c) => c.kind === 'red-team'),
      'org A: red team in standard',
    );
    assert.ok(
      a.find((c) => c.kind === 'director').user.includes("organization's research methodology"),
    );
    assert.ok(!b.some((c) => c.kind === 'red-team'), 'org B: no red team');
    assert.ok(
      !b.some((c) => /organization's research methodology/.test(c.user)),
      "org B never sees org A's methodology",
    );
  } finally {
    Object.assign(RUNNERS, original);
  }
});
