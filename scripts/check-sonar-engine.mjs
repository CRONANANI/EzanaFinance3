/**
 * Sonar research engine v3: unit and end-to-end tests (no network, no keys).
 *   npm run test:sonar-engine
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

const { understandDeterministic } = await import('@/lib/sonar/understand');
const { buildResearchSpec, scoreDomains, timeHorizonOf } =
  await import('@/lib/sonar/engine/research-spec');
const { planResearch, issueBucketsFor, issueTextFor } = await import('@/lib/sonar/engine/planner');
const { toEvidence, scoreEvidence, packEvidence, withMarkers, numbersOf } =
  await import('@/lib/sonar/engine/evidence');
const { analyze } = await import('@/lib/sonar/engine/analysis');
const { discoverRelationships, paths } = await import('@/lib/sonar/engine/relationships');
const {
  validateResearch,
  validateClaim,
  deterministicResearch,
  renderBrief,
  parseResearchJson,
  numberSupported,
} = await import('@/lib/sonar/engine/findings');
const { sourceUtility, proposeConfig, gate } = await import('@/lib/sonar/engine/recalibrate');
const { DEFAULT_CONFIG } = await import('@/lib/sonar/engine/domains');
const { scoreRun, summarize } = await import('@/lib/sonar/engine/eval/score');
const { BENCHMARKS } = await import('@/lib/sonar/engine/eval/benchmarks');
const { aliasGrams, commodityOf } = await import('@/lib/sonar/engine/resolution');
const { refundToken, verifyRefund } = await import('@/lib/sonar/guest-cookie');
const { cleanFeedback } = await import('@/lib/sonar/engine/telemetry');
const { isValidConfig } = await import('@/lib/sonar/engine/config-store');
const { clampDepth } = await import('@/lib/sonar/engine/access');

const NOW = new Date('2026-11-04T15:00:00Z');
const spec = (q, resolution = {}, depth = 'standard') =>
  buildResearchSpec(understandDeterministic(q), { query: q, resolution, depth, now: NOW });
const ids = (s) => s.domains.map((d) => d.id);

/* ── understanding into research intent ─────────────────────────────── */

test('domains: the five mandatory questions activate the right research', () => {
  assert.ok(ids(spec('Who is lobbying hardest on AI regulation?')).includes('lobbying'));
  const tw = spec(
    'Which publicly traded companies are most exposed to escalating tensions between China and Taiwan?',
  );
  assert.equal(tw.domains[0].id, 'geopolitics');
  assert.equal(tw.objective.primary, 'rank');
  const semis = spec(
    'Which members of Congress have made the most significant investments in semiconductor companies?',
  );
  assert.ok(ids(semis).includes('congress_trading') && ids(semis).includes('industry'));
  const cu = spec(
    'What factors are most likely to influence copper prices over the next 12 months?',
  );
  assert.ok(ids(cu).includes('commodity'));
  assert.deepEqual([cu.timeHorizon.kind, cu.timeHorizon.months], ['forward', 12]);
  assert.ok(cu.reportComponents.includes('scenarios'));
  const nv = spec('How financially exposed is Nvidia to changes in AI infrastructure spending?');
  assert.ok(ids(nv).includes('company_financials'));
});

test('a multi-domain question activates every domain it names', () => {
  const s = spec(
    'How exposed are semiconductor manufacturers to escalating tensions between China and Taiwan, and which institutional investors hold the largest positions in these companies?',
  );
  for (const d of ['geopolitics', 'industry', 'institutional']) assert.ok(ids(s).includes(d), d);
  assert.ok(s.relationships.includes('institution_holds_company'));
});

test('time horizons', () => {
  assert.equal(timeHorizonOf('copper over the next 2 years', NOW).months, 24);
  assert.equal(timeHorizonOf('what has she been buying lately', NOW).kind, 'trailing');
  assert.equal(timeHorizonOf('nvidia', NOW).kind, 'unspecified');
});

test('commodities and alias grams', () => {
  assert.equal(commodityOf('What will move copper prices?')?.id, 'copper');
  assert.equal(commodityOf('natural gas storage')?.id, 'natgas');
  const g = aliasGrams('How exposed is Lockheed Martin to the budget?');
  assert.ok(g.includes('lockheedmartin'));
  assert.ok(!g.includes('the') && !g.includes('how'));
});

/* ── planning ───────────────────────────────────────────────────────── */

test('AI lobbying runs lobbying leaders and never the macro datasets', () => {
  const s = spec('Who is lobbying hardest on AI regulation?');
  const p = planResearch(s, {}, { depth: 'standard' });
  const ran = p.tasks.map((t) => t.source);
  assert.ok(ran.includes('lobbying_leaders'));
  for (const no of ['macro_country', 'commodity_series', 'congress_sector'])
    assert.ok(!ran.includes(no), no);
  const t = p.tasks.find((x) => x.source === 'lobbying_leaders');
  assert.deepEqual(t.params.issueBuckets, ['tech']);
  assert.match(t.params.text, /artificial intelligence/);
  assert.ok(p.visualizations.some((v) => v.id === 'lobbying_leaders'));
});

test('sources whose needs are unmet are excluded with a reason, entitlements gate datasets', () => {
  const s = spec(
    'Which members of Congress have made the most significant investments in semiconductor companies?',
  );
  const none = planResearch(s, {}, {});
  assert.ok(
    none.excluded.some((x) => x.source === 'congress_sector' && x.reason.startsWith('unmet_needs')),
  );
  const res = {
    universe: { label: 'Semiconductor companies', tickers: ['NVDA', 'AMD'], names: {} },
    industry: {
      id: 'semiconductors',
      label: 'Semiconductors',
      registry: { stages: [], companies: [] },
    },
  };
  const ok = planResearch(s, res, {});
  assert.ok(ok.tasks.some((t) => t.source === 'congress_sector'));
  const gated = planResearch(s, res, { entitledDatasets: ['echo'] });
  assert.ok(
    gated.excluded.some((x) => x.source === 'congress_sector' && x.reason === 'not_entitled'),
  );
});

test('depth caps the number of tasks', () => {
  const s = spec(
    'How exposed are semiconductor manufacturers to escalating tensions between China and Taiwan, and which institutional investors hold them?',
  );
  const res = {
    universe: { tickers: ['NVDA', 'TSM', 'AMD'], names: {} },
    countries: [{ iso2: 'TW', iso3: 'TWN', name: 'Taiwan' }],
  };
  assert.ok(planResearch(s, res, { depth: 'quick' }).tasks.length <= 5);
  assert.ok(
    planResearch(s, res, { depth: 'deep' }).tasks.length >=
      planResearch(s, res, { depth: 'quick' }).tasks.length,
  );
  assert.equal(issueBucketsFor(spec('defense lobbying'), {}).join(), 'defense');
  assert.equal(
    issueTextFor(spec('who lobbies on crypto')),
    'cryptocurrency OR "digital asset" OR "digital assets" OR stablecoin OR blockchain',
  );
});

/* ── evidence ───────────────────────────────────────────────────────── */

test('numbers parse with units', () => {
  const n = numbersOf('$1.5M to $6M, 43% and 1,200 trades, $2.3B');
  assert.deepEqual(
    n.map((x) => x.value),
    [1.5e6, 6e6, 43, 1200, 2.3e9],
  );
  assert.ok(n[2].pct);
});

test('scoring prefers relevant, specific, on-subject evidence; packing drops redundancy and never forces a corpus', () => {
  const s = spec('Who is lobbying hardest on AI regulation?');
  const lob = toEvidence(
    {
      title: 'Lobbying leaders on AI',
      text: 'OpenAI reported $550K in lobbying on artificial intelligence, 2026.',
      data: { metric: 'lobbying_spend' },
      entities: ['OpenAI'],
    },
    { source: 'lobbying_leaders' },
  );
  const dup = toEvidence(
    {
      title: 'Lobbying leaders on AI',
      text: 'OpenAI reported $550K in lobbying on artificial intelligence in 2026 filings.',
      entities: ['OpenAI'],
    },
    { source: 'lobbying_leaders' },
  );
  const oecd = toEvidence(
    { title: 'Brazil GDP outlook', text: 'OECD projects Brazil GDP growth of 2.1% in 2027.' },
    { source: 'macro_country' },
  );
  const scored = [lob, dup, oecd].map((e) => ({
    evidence: e,
    ...scoreEvidence(e, s, { subjectTerms: [], now: NOW }),
  }));
  assert.ok(scored[0].score > scored[2].score);
  const { selected, decisions } = packEvidence(scored, { maxItems: 5, minScore: 0.35 });
  assert.equal(selected[0].evidence.id, lob.id);
  assert.ok(decisions.some((d) => d.id === dup.id && d.reason === 'redundant'));
  assert.ok(
    !selected.some((x) => x.evidence.source === 'macro_country'),
    'irrelevant corpus left out',
  );
  assert.equal(withMarkers(selected)[0].marker, 'S1');
});

/* ── analysis and relationships ─────────────────────────────────────── */

const congressEv = toEvidence(
  {
    title: 'Congressional trading in semis',
    text: 'Members disclosed 4 trades.',
    data: {
      metric: 'trade_count',
      summary: {
        total: 4,
        buys: 3,
        sells: 1,
        memberCount: 2,
        monthly: [{ month: '2026-10', buys: 3, sells: 1 }],
        byTicker: [{ ticker: 'NVDA', name: 'NVIDIA', trades: 3, members: 2, buys: 2, sells: 1 }],
        byMember: [
          {
            bioguideId: 'P000197',
            name: 'Nancy Pelosi',
            tickers: ['NVDA'],
            trades: 3,
            buys: 2,
            sells: 1,
          },
        ],
        latest: [],
      },
    },
    period: { from: '2025-11-04', to: '2026-11-04', label: 'last 12 months' },
  },
  { source: 'congress_sector' },
);
const contractsEv = toEvidence(
  {
    title: 'Contracts',
    text: 'NVDA FY2025 $1.0B',
    data: {
      metric: 'contract_obligations',
      contracts: {
        latestFy: 2026,
        priorFy: 2025,
        latestComplete: false,
        rankBy: 'prior',
        rows: [{ ticker: 'NVDA', name: 'NVIDIA', prior: 1e9, latest: 4e8 }],
      },
    },
  },
  { source: 'contracts_history' },
);

test('analysis computes reproducible metrics and charts only with data', () => {
  const { metrics, visualizations } = analyze([congressEv, contractsEv], {});
  const m = metrics.find((x) => x.id === 'congress_buy_share');
  assert.equal(m.value, 0.75);
  assert.deepEqual(m.inputs, [congressEv.id]);
  assert.ok(visualizations.find((v) => v.id === 'congress_monthly').source.includes('STOCK Act'));
  assert.ok(visualizations.every((v) => v.source && v.method && v.unit));
  assert.equal(analyze([], {}).visualizations.length, 0);
});

test('relationships: observed from records, inferred overlap labelled, paths walk the graph', () => {
  const rels = discoverRelationships([congressEv, contractsEv], {});
  const trade = rels.find((r) => r.type === 'disclosed_trades_in');
  assert.equal(trade.status, 'observed');
  assert.deepEqual(trade.evidenceIds, [congressEv.id]);
  const overlap = rels.find((r) => r.type === 'appears_in');
  assert.equal(overlap.status, 'inferred');
  assert.match(overlap.note, /Not evidence of causation/);
  const p = paths(rels, 'politician:p000197', { maxHops: 3 });
  assert.ok(p.some((path) => path.length >= 2));
});

/* ── claim validation ───────────────────────────────────────────────── */

const marked = withMarkers([
  {
    evidence: toEvidence(
      {
        title: 'NVDA trades',
        text: 'Nancy Pelosi disclosed a purchase of NVDA ($1M to $5M) on 2026-07-24.',
        date: '2026-07-24',
        entities: ['Nancy Pelosi', 'NVDA'],
      },
      { source: 'congress_sector' },
    ),
    score: 0.8,
  },
  {
    evidence: toEvidence(
      {
        title: 'Lobbying',
        text: 'OpenAI reported $550K across 2 filings, 2026.',
        entities: ['OpenAI'],
      },
      { source: 'lobbying_leaders' },
    ),
    score: 0.7,
  },
]);
const metrics = [
  {
    id: 'congress_buy_share',
    label: 'Purchases share',
    value: 0.75,
    unit: 'ratio',
    method: 'x',
    inputs: [],
    period: null,
  },
];
const ctx = {
  byMarker: new Map(marked.map((e) => [e.marker, e])),
  metricsById: new Map(metrics.map((m) => [m.id, m])),
};

test('claims: supported numbers, dates and entities are kept', () => {
  const v = validateClaim(
    {
      text: 'Nancy Pelosi disclosed an NVDA purchase of $1M to $5M in 2026.',
      classification: 'verified_fact',
      evidence: ['S1'],
      entities: ['Nancy Pelosi'],
    },
    ctx,
  );
  assert.equal(v.action, 'kept');
  const m = validateClaim(
    {
      text: 'Purchases were 75% of trades.',
      classification: 'calculated_result',
      metrics: ['congress_buy_share'],
    },
    ctx,
  );
  assert.equal(m.action, 'kept');
});

test('claims: invented numbers, wrong years, wrong entities, unsupported negatives and conduct language are removed', () => {
  assert.equal(
    validateClaim(
      { text: 'Pelosi bought $9M of NVDA.', classification: 'verified_fact', evidence: ['S1'] },
      ctx,
    ).action,
    'removed',
  );
  assert.equal(
    validateClaim(
      { text: 'Pelosi bought NVDA in 2023.', classification: 'verified_fact', evidence: ['S1'] },
      ctx,
    ).action,
    'removed',
  );
  assert.equal(
    validateClaim(
      {
        text: 'Microsoft lobbied.',
        classification: 'verified_fact',
        evidence: ['S2'],
        entities: ['Microsoft'],
      },
      ctx,
    ).action,
    'removed',
  );
  assert.equal(
    validateClaim(
      {
        text: 'OpenAI has never lobbied on chips.',
        classification: 'verified_fact',
        evidence: ['S2'],
      },
      ctx,
    ).action,
    'removed',
  );
  assert.equal(
    validateClaim(
      {
        text: 'The NVDA purchase suggests insider knowledge.',
        classification: 'analytical_interpretation',
        evidence: ['S1'],
      },
      ctx,
    ).action,
    'removed',
  );
  assert.equal(
    validateClaim(
      { text: 'A finding with no source.', classification: 'verified_fact', evidence: ['S9'] },
      ctx,
    ).action,
    'removed',
  );
});

test('claims: causal language is downgraded to interpretation, never kept as fact', () => {
  const v = validateClaim(
    { text: 'OpenAI lobbying led to the bill.', classification: 'verified_fact', evidence: ['S2'] },
    ctx,
  );
  assert.equal(v.action, 'downgraded');
  assert.equal(v.classification, 'analytical_interpretation');
});

test('number support respects the claim precision', () => {
  assert.ok(numberSupported({ value: 1.5e6, text: '$1.5M', pct: false }, [{ value: 1500001 }]));
  assert.ok(!numberSupported({ value: 2e6, text: '$2M', pct: false }, [{ value: 1500001 }]));
  assert.ok(
    numberSupported({ value: 43, text: '43%', pct: true }, [{ value: 0.431, ratio: true }]),
  );
});

test('a full report validates, renders, and falls back deterministically', () => {
  const parsed = parseResearchJson(
    '```json\n' +
      JSON.stringify({
        executiveConclusion: {
          text: 'Nancy Pelosi disclosed an NVDA purchase of $1M to $5M.',
          classification: 'verified_fact',
          evidence: ['S1'],
        },
        keyFindings: [
          {
            title: 'OpenAI lobbying',
            explanation: 'OpenAI reported $550K across 2 filings.',
            classification: 'verified_fact',
            evidence: ['S2'],
            entities: ['OpenAI'],
          },
          {
            title: 'Invented',
            explanation: 'OpenAI spent $90M.',
            classification: 'verified_fact',
            evidence: ['S2'],
          },
        ],
        limitations: ['Filings do not split spend by issue.'],
        confidence: 'medium',
      }) +
      '\n```',
  );
  const r = validateResearch(parsed, { marked, metrics });
  assert.equal(r.keyFindings.length, 1);
  assert.equal(r.validation.stats.removed, 1);
  assert.match(renderBrief(r), /\[S1\]/);
  const d = deterministicResearch({ spec: { question: 'q' }, marked, metrics });
  assert.equal(d.executiveConclusion.markers[0], 'S1');
  assert.equal(
    d.keyFindings.find((k) => k.classification === 'calculated_result').metrics[0],
    'congress_buy_share',
  );
});

/* ── learning loop ──────────────────────────────────────────────────── */

test('recalibration nudges weights from cited rates and the gate blocks regressions', () => {
  const runs = Array.from({ length: 25 }, (_, i) => ({
    id: `r${i}`,
    primary_domain: 'lobbying',
    plan: { tasks: [{ source: 'lobbying_leaders' }, { source: 'echo' }] },
    evidence_decisions: {
      decisions: [
        { source: 'lobbying_leaders', selected: true },
        { source: 'echo', selected: true },
      ],
    },
    report: {
      evidence: [
        { id: 'a', source: 'lobbying_leaders' },
        { id: 'b', source: 'echo' },
      ],
      keyFindings: [{ evidenceIds: ['a'] }],
    },
  }));
  const u = sourceUtility(runs, [{ run_id: 'r1', kind: 'irrelevant_source', evidence_id: 'b' }]);
  const echo = u.find((x) => x.source === 'echo');
  assert.equal(echo.citedRate, 0);
  const { config, changes } = proposeConfig(DEFAULT_CONFIG, u, { version: 'v1+test' });
  assert.ok(config.weights.lobbying.echo < DEFAULT_CONFIG.weights.lobbying.echo);
  assert.ok(
    config.weights.lobbying.lobbying_leaders >= DEFAULT_CONFIG.weights.lobbying.lobbying_leaders,
  );
  assert.ok(changes.length >= 1 && isValidConfig(config));
  const base = {
    perBenchmark: [{ benchmark: 'a', composite: 0.8 }],
    summary: { composite: 0.8, means: { claimSupport: 0.9 } },
  };
  assert.equal(
    gate(base, {
      perBenchmark: [{ benchmark: 'a', composite: 0.7 }],
      summary: { composite: 0.7, means: { claimSupport: 0.9 } },
    }).approved,
    false,
  );
  assert.equal(
    gate(base, {
      perBenchmark: [{ benchmark: 'a', composite: 0.82 }],
      summary: { composite: 0.82, means: { claimSupport: 0.9 } },
    }).approved,
    true,
  );
});

test('the scorer measures against the benchmark, not length', () => {
  const bench = BENCHMARKS.find((b) => b.id === 'ai_lobbying');
  const run = {
    researchScope: { domains: [{ id: 'lobbying', score: 1 }], subject: null },
    methodology: { plan: { tasks: [{ source: 'lobbying_leaders' }] } },
    visualizations: [{ id: 'lobbying_leaders' }],
    executiveConclusion: { text: 'The largest clients by disclosed spend on AI-related filings.' },
    keyFindings: [],
    limitations: ['Filings do not split spend by issue code.'],
    researchMetadata: {
      validation: { claims: 2, kept: 2, citationCoverage: 1, claimSupportRate: 1 },
      validationLog: [],
      durationMs: 5000,
    },
  };
  const s = scoreRun(run, bench);
  assert.equal(s.metrics.planRecall, 1);
  assert.equal(s.metrics.limitation, 1);
  assert.ok(s.composite > 0.9);
  const long = {
    ...run,
    executiveConclusion: { text: 'x '.repeat(5000) },
    methodology: { plan: { tasks: [{ source: 'macro_country' }] } },
  };
  assert.ok(scoreRun(long, bench).composite < s.composite);
  assert.equal(summarize([s]).n, 1);
});

/* ── access, cookies, feedback ──────────────────────────────────────── */

test('depth never exceeds the plan; refund tokens verify; feedback is validated', () => {
  assert.equal(clampDepth('deep', 'quick'), 'quick');
  assert.equal(clampDepth('quick', 'deep'), 'quick');
  assert.equal(clampDepth('nonsense', 'standard'), 'standard');
  const run = '00000000-0000-4000-8000-000000000001';
  assert.equal(verifyRefund(run, refundToken(run, 3)), 3);
  assert.equal(verifyRefund(run, '4.forged'), null);
  assert.equal(cleanFeedback({ runId: run, kind: 'helpful' }).row.kind, 'helpful');
  assert.ok(cleanFeedback({ runId: run, kind: 'drop table' }).error);
  assert.ok(cleanFeedback({ runId: 'x', kind: 'helpful' }).error);
});

/* ── end to end, offline ────────────────────────────────────────────── */

test('the engine runs end to end offline, emits real events and degrades to a true partial report', async () => {
  delete process.env.ANTHROPIC_API_KEY;
  const { runResearch } = await import('@/lib/sonar/engine/engine');
  const { RUNNERS } = await import('@/lib/sonar/engine/sources');
  const fakeAdmin = {
    from() {
      const q = {
        select: () => q,
        eq: () => q,
        in: () => q,
        gte: () => q,
        gt: () => q,
        order: () => q,
        limit: () => q,
        ilike: () => q,
        maybeSingle: () => Promise.resolve({ data: null, error: null }),
        upsert: () => Promise.resolve({ error: null }),
        insert: () => Promise.resolve({ error: null }),
        then: (res, rej) => Promise.resolve({ data: [], error: null }).then(res, rej),
      };
      return q;
    },
    rpc: () => Promise.resolve({ data: null, error: null }),
  };
  const original = { ...RUNNERS };
  RUNNERS.lobbying_leaders = async () => ({
    items: [
      {
        title: 'Lobbying leaders on AI, 2024 to 2026',
        text: 'Clients ranked by disclosed lobbying spend: 1. OpenAI OpCo LLC $550K across 2 filings.',
        data: {
          metric: 'lobbying_spend',
          scope: 'AI filings',
          rows: [{ client: 'OpenAI OpCo LLC', total: 550000, filings: 2 }],
        },
        period: { from: '2024-01-01', to: '2026-12-31', label: '2024 to 2026' },
        entities: ['OpenAI OpCo LLC'],
      },
    ],
  });
  for (const k of Object.keys(RUNNERS))
    if (k !== 'lobbying_leaders') RUNNERS[k] = async () => ({ items: [] });
  const events = [];
  const run = await runResearch('Who is lobbying hardest on AI regulation?', {
    admin: fakeAdmin,
    runId: '00000000-0000-4000-8000-000000000002',
    depth: 'quick',
    emit: (t, d) => events.push([t, d]),
    now: NOW,
  });
  Object.assign(RUNNERS, original);
  const types = events.map(([t]) => t);
  assert.equal(types[0], 'stage');
  assert.ok(types.indexOf('plan') < types.indexOf('evidence'));
  assert.ok(types.includes('analysis') && types.includes('findings') && types.at(-1) === 'report');
  const plan = events.find(([t]) => t === 'plan')[1];
  assert.ok(plan.phase1Ms < 3000);
  assert.ok(plan.plan.tasks.some((t) => t.source === 'lobbying_leaders'));
  assert.ok(run.methodology.deterministic, 'no model key: deterministic report');
  assert.match(run.executiveConclusion.text, /OpenAI/);
  assert.ok(run.visualizations.some((v) => v.id === 'lobbying_leaders'));
  assert.ok(run.evidence.every((e) => e.id && e.marker && e.retrievedAt));
});

/* ── client stream folding ──────────────────────────────────────────── */

test('the client folds real SSE events into state and never invents progress', async () => {
  const { parseSseBlock, reduceEvent } =
    await import('@/components/sonar/research/useResearchStream');
  assert.equal(parseSseBlock(': keep-alive'), null);
  const ev = parseSseBlock(
    'event: task\ndata: {"id":"t1","source":"news","status":"done","items":3}',
  );
  assert.deepEqual(ev[0], 'task');
  let s = { status: 'running', stages: [], tasks: {}, panels: {} };
  s = reduceEvent(s, ['stage', { stage: 'retrieving' }]);
  s = reduceEvent(s, ev);
  s = reduceEvent(s, ['done', { remaining: 2 }]);
  assert.deepEqual(s.stages, ['retrieving']);
  assert.equal(s.tasks.t1.items, 3);
  assert.equal(s.status, 'done');
  assert.equal(reduceEvent(s, ['unknown', {}]), s);
});
