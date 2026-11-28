/**
 * Sonar post-benchmark hardening (Nov 28 2026). Zero API cost: every test is deterministic,
 * runs on fixtures and an in-memory Supabase, and fails if any code reaches for an LLM host.
 *   1. Profile D-efficient routing, flag resolution, rollback (mocked model call)
 *   2. Cross-dataset chaining: typed stages, congress -> contracts -> 13F screen
 *   3. DCF arithmetic against hand-worked fixtures
 *   4. Output contracts: parsing, truncation, partial preservation, saved reports
 *   6. Benchmark budget controls with mocked usage
 * Run: npm run test:sonar-hardening
 */
import { llmRequests, mockFetch, clearMock } from './lib/no-llm-guard.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { fakeSupabase } from './lib/fake-supabase.mjs';

const R = await import('../src/lib/sonar/model-routing.js');
const S = await import('../src/lib/sonar/composer/stages.js');
const { canonicalIntent } = await import('../src/lib/sonar/semantic/canonical-intent.js');
const { analyticsAttachment } = await import('../src/lib/sonar/composer/intents.js');
const A = await import('../src/lib/sonar/composer/analytics-server.js');

const NOW = new Date('2026-11-28T15:00:00Z');

/* ── 1. Profile D-efficient ─────────────────────────────────────────── */

test('D-efficient: the proposed table, role by role', () => {
  const r = R.resolveModelRouting({ profile: 'D-efficient' });
  assert.equal(r.profile, 'D-efficient');
  assert.equal(r.quick, R.MODELS.haiku45);
  assert.equal(r.standard, R.MODELS.sonnet55);
  assert.equal(r.standard_specialist, R.MODELS.haiku55);
  assert.equal(r.deep_director, R.MODELS.opus55);
  assert.equal(r.deep_resolve, R.MODELS.opus55, 'final synthesis is Opus');
  assert.equal(r.deep_specialist, R.MODELS.sonnet55);
  assert.equal(r.deep_red_team, R.MODELS.sonnet55);
  assert.equal(r.deep_auditor, R.MODELS.sonnet55);
  /* Only the standard specialists differ from D. */
  const d = R.resolveModelRouting({ profile: 'D' });
  const diff = Object.keys(d).filter((k) => k !== 'profile' && d[k] !== r[k]);
  assert.deepEqual(diff, ['standard_specialist']);
});

test('D-efficient is disabled by default: no flag, every user gets current', () => {
  for (const env of [{}, { SONAR_MODEL_PROFILE: '' }, { SONAR_MODEL_PROFILE: 'nonsense' }])
    for (const isStaff of [false, true])
      assert.equal(R.profileForUser({ userId: 'u1', isStaff, env }), 'current');
  /* A canary profile alone, with no staff flag, list or percentage, serves nobody. */
  assert.equal(
    R.profileForUser({
      userId: 'u1',
      isStaff: true,
      env: { SONAR_MODEL_CANARY_PROFILE: 'D-efficient' },
    }),
    'current',
  );
});

test('D-efficient flag resolution: staff canary, user list, rollback', () => {
  const env = { SONAR_MODEL_CANARY_PROFILE: 'D-efficient', SONAR_MODEL_CANARY_STAFF: '1' };
  assert.equal(R.profileForUser({ userId: 'staff', isStaff: true, env }), 'D-efficient');
  assert.equal(R.profileForUser({ userId: 'reader', isStaff: false, env }), 'current');
  assert.equal(R.profileForUser({ userId: null, isStaff: true, env }), 'current', 'anonymous');
  const listed = { SONAR_MODEL_CANARY_PROFILE: 'D-efficient', SONAR_MODEL_CANARY_USERS: 'a, b' };
  assert.equal(R.profileForUser({ userId: 'b', env: listed }), 'D-efficient');
  /* Rollback: clearing the canary returns everyone to current, staff included. */
  assert.equal(R.profileForUser({ userId: 'staff', isStaff: true, env: {} }), 'current');
  assert.equal(R.routingForRun({ userId: 'staff', isStaff: true, env: {} }).profile, 'current');
  /* A role pin still applies on top of the profile. */
  const pinned = R.resolveModelRouting({
    profile: 'D-efficient',
    env: { SONAR_MODEL_ROLE_STANDARD_SPECIALIST: R.MODELS.sonnet55 },
  });
  assert.equal(pinned.standard_specialist, R.MODELS.sonnet55);
});

test('D-efficient routes the request body: mocked provider, no real request', async () => {
  const P = await import('../src/lib/sonar/llm-providers.js');
  const prev = process.env.ANTHROPIC_API_KEY;
  process.env.ANTHROPIC_API_KEY = 'mock-key-not-a-secret';
  const bodies = [];
  mockFetch(async (url, init) => {
    bodies.push(JSON.parse(init.body));
    return new Response(
      JSON.stringify({
        model: JSON.parse(init.body).model,
        content: [{ type: 'text', text: '{"ok":true}' }],
        stop_reason: 'end_turn',
        usage: { input_tokens: 10, output_tokens: 5 },
      }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    );
  });
  try {
    const r = R.resolveModelRouting({ profile: 'D-efficient' });
    const out = await P.synthesizeWithFallback({
      system: 's',
      user: 'u',
      maxTokens: 700,
      model: r.standard_specialist,
      think: 'off',
      effort: 'low',
    });
    assert.equal(bodies.length, 1);
    assert.equal(bodies[0].model, 'claude-haiku-5-5');
    assert.equal(bodies[0].thinking?.type, 'disabled');
    assert.equal(out.answer, '{"ok":true}');
  } finally {
    clearMock();
    if (prev === undefined) delete process.env.ANTHROPIC_API_KEY;
    else process.env.ANTHROPIC_API_KEY = prev;
  }
  /* Every request went to the mock (recorded), none to a network. */
  assert.equal(llmRequests.length, 1);
});

/* ── 2. Typed stages and the cross-dataset chain ────────────────────── */

test('stage results: typed, validated, explicit empty and failed states', () => {
  const row = S.stageRow({ ticker: 'aaa', cik: '0000123', value: '2' });
  assert.equal(row.securityId, 'cik:123');
  assert.equal(S.stageRow({ ticker: 'BBB' }).securityId, 'ticker:BBB');
  assert.throws(() => S.stageRow({ ticker: '' }));
  const ok = S.stageResult({
    stage: 'seed:congress',
    source: 'congress',
    status: 'ok',
    rows: [row, row],
    period: { from: '2025-11-28', to: '2026-11-28' },
    lineage: [{ source: 'congress', table: 'congress_trades' }],
  });
  assert.equal(ok.rows.length, 1, 'duplicates collapse on the canonical id');
  assert.deepEqual(ok.downstream.tickers, ['AAA']);
  assert.equal(ok.downstream.since, '2025-11-28');
  assert.ok(Object.isFrozen(ok) && Object.isFrozen(ok.rows));
  assert.throws(() => S.stageResult({ stage: 'x', status: 'empty' }), /reason/);
  assert.throws(() => S.stageResult({ stage: 'x', status: 'ok', rows: [] }), /empty/);
  assert.throws(
    () => S.stageResult({ stage: 'x', status: 'ok', rows: [row] }),
    /lineage/,
    'no value without lineage',
  );
  assert.equal(S.nextUniverse(S.emptyStage('x', 's', 'nothing')).length, 0);
});

test('stage chain: each stage gets its predecessor universe; a stop skips the rest', async () => {
  const seen = [];
  const lin = [{ source: 't' }];
  const stages = [
    {
      id: 'a',
      run: async (u) => {
        seen.push(u.map((x) => x.ticker));
        return S.stageResult({
          stage: 'a',
          status: 'ok',
          rows: ['X', 'Y', 'Z'].map((t) => S.stageRow({ ticker: t, value: 1 })),
          lineage: lin,
        });
      },
    },
    {
      id: 'b',
      run: async (u) => {
        seen.push(u.map((x) => x.ticker));
        return S.stageResult({
          stage: 'b',
          status: 'ok',
          rows: [S.stageRow({ ticker: 'Y', value: 1 })],
          lineage: lin,
        });
      },
    },
    {
      id: 'c',
      run: async (u) => {
        seen.push(u.map((x) => x.ticker));
        throw new Error('read failed');
      },
    },
    { id: 'd', run: async () => assert.fail('must not run after a failure') },
  ];
  const out = await S.runStageChain(stages);
  assert.deepEqual(seen, [[], ['X', 'Y', 'Z'], ['Y']]);
  assert.deepEqual(
    out.stages.map((s) => s.status),
    ['ok', 'ok', 'failed', 'skipped'],
  );
  assert.match(out.stages[3].reason, /stage c was failed \(read failed\)/);
  assert.equal(out.final, null);
});

test('seed plan: dated sources seed; a fiscal-year contract measure never does', () => {
  const M = ((await_) => await_)(null);
  void M;
  const measures = {
    congress_holders: { source: 'congress' },
    gov_contract_value: { source: 'contracts' },
    gov_contract_value_window: { source: 'contracts_window' },
    debt: { source: 'ratios' },
  };
  assert.equal(
    S.planSeed([{ metric: 'congress_holders', op: 'exists' }], measures).seed.source,
    'congress',
  );
  assert.equal(
    S.planSeed([{ metric: 'gov_contract_value_window', op: 'exists' }], measures).seed.source,
    'contracts',
  );
  const none = S.planSeed(
    [
      { metric: 'gov_contract_value', op: 'exists' },
      { metric: 'debt', op: '<', value: 1 },
    ],
    measures,
  );
  assert.equal(none.seed, null);
  assert.match(none.reason, /names no sector/);
});

const Q =
  'Find companies where members of Congress bought shares in the last 12 months, the company won new federal contracts in the same period, and institutional ownership rose. Rank them and explain what links the three signals.';

test('the benchmark screen now composes: seeded from Congress, windowed contracts, 13F rise', () => {
  const intent = canonicalIntent(Q);
  assert.equal(intent.family, 'multi_stage_screen');
  assert.equal(intent.unsupported, null);
  const att = analyticsAttachment(intent);
  assert.ok(att, 'a screen attachment (before: none, "no composition")');
  assert.equal(att.capability, 'financial-screen');
  assert.equal(att.params.universe_from, 'congress');
  assert.equal(att.params.window_days, 365);
  assert.deepEqual(
    att.params.filters.map((f) => [f.metric, f.op]),
    [
      ['congress_holders', 'exists'],
      ['gov_contract_value_window', 'exists'],
      ['institutional_breadth_change', '>'],
    ],
  );
  assert.equal(att.params.rank_by, 'institutional_breadth_change');
});

test('sector screens are unchanged by the seed path', () => {
  const att = analyticsAttachment(canonicalIntent('Energy stocks with debt to equity below 0.6'));
  assert.equal(att.params.sector, 'energy');
  assert.equal(att.params.universe_from, undefined);
});

/* A saved fixture of the three datasets (shapes of congress_trades,
   contract_awards_resolved, sec_cusip_map, sec_13f_effective_filings, sonar_13f_ownership). */
function screenFixture({ congress, awards, own } = {}) {
  const filings = [];
  for (const period of ['2026-09-30', '2026-06-30'])
    for (let i = 0; i < 10; i += 1)
      filings.push({
        accession_no: `${period}-${i}`,
        cik: String(1000 + i),
        filer_name: `Filer ${i}`,
        book: 1e9,
        is_addon: false,
        period,
      });
  const ownership = own || {
    AAA000001: { comparable_now: 8, comparable_prior: 6 },
    EEE000001: { comparable_now: 5, comparable_prior: 7 },
    BBB000001: { comparable_now: 3, comparable_prior: 3 },
  };
  return fakeSupabase(
    {
      congress_trades: congress || [
        {
          id: 1,
          ticker: 'AAA',
          bioguide_id: 'M1',
          type: 'purchase',
          transaction_date: '2026-03-01',
        },
        {
          id: 2,
          ticker: 'AAA',
          bioguide_id: 'M2',
          type: 'purchase',
          transaction_date: '2026-08-01',
        },
        {
          id: 3,
          ticker: 'AAA',
          bioguide_id: 'M2',
          type: 'purchase',
          transaction_date: '2026-09-01',
        },
        {
          id: 4,
          ticker: 'BBB',
          bioguide_id: 'M3',
          type: 'purchase',
          transaction_date: '2026-04-01',
        },
        { id: 5, ticker: 'CCC', bioguide_id: 'M1', type: 'sale', transaction_date: '2026-05-01' },
        {
          id: 6,
          ticker: 'DDD',
          bioguide_id: 'M4',
          type: 'purchase',
          transaction_date: '2025-01-01',
        },
        {
          id: 7,
          ticker: '--',
          bioguide_id: 'M4',
          type: 'purchase',
          transaction_date: '2026-06-01',
        },
        {
          id: 8,
          ticker: 'EEE',
          bioguide_id: 'M5',
          type: 'purchase',
          transaction_date: '2026-07-01',
        },
      ],
      contract_awards_resolved: awards || [
        { generated_award_id: 'g1', ticker: 'AAA', award_amount: 5e6, action_date: '2026-05-01' },
        { generated_award_id: 'g2', ticker: 'BBB', award_amount: 9e6, action_date: '2027-01-01' },
        { generated_award_id: 'g3', ticker: 'EEE', award_amount: 1e6, action_date: '2026-02-01' },
        { generated_award_id: 'g4', ticker: 'ZZZ', award_amount: 2e6, action_date: '2026-02-01' },
      ],
      sec_cusip_map: ['AAA', 'BBB', 'EEE'].map((t) => ({
        cusip: `${t}000001`,
        ticker: t,
        security_type: 'Common Stock',
        market_sector: 'Equity',
        name: `${t} Corp`,
        status: 'mapped',
      })),
      sec_13f_effective_filings: filings,
      sec_fundamentals: [],
    },
    {
      rpc: {
        sonar_13f_ownership: ({ p_cusips }) => ({
          rows: p_cusips
            .filter((c) => ownership[c])
            .map((c) => ({
              cusip: c,
              managers: ownership[c].comparable_now,
              value_usd: 1e6,
              shares: 1000,
              ...ownership[c],
              top: [],
            })),
        }),
      },
    },
  );
}

test('runScreen: congress -> contracts in window -> 13F rise, typed stages, no fabrication', async () => {
  const att = analyticsAttachment(canonicalIntent(Q));
  const admin = screenFixture();
  const r = await A.runScreen(admin, att, { now: NOW });
  /* Seed: AAA (2 members), BBB, EEE; CCC is a sale, DDD outside the window, "--" junk. */
  const seed = r.stages[0];
  assert.equal(seed.stage, 'seed:congress');
  assert.equal(seed.status, 'ok');
  assert.deepEqual(
    seed.rows.map((x) => [x.ticker, x.value]),
    [
      ['AAA', 2],
      ['BBB', 1],
      ['EEE', 1],
    ],
  );
  assert.equal(seed.lineage[0].table, 'congress_trades');
  /* DDD is filtered at the query (window); the malformed ticker is dropped here. */
  assert.equal(seed.lineage[0].recordsDropped, 1);
  /* Contracts: only the seed survivors are read; BBB's award is future-dated (excluded),
     ZZZ is not in the universe. */
  const contracts = r.stages.find((s) => s.stage === 'filter:gov_contract_value_window');
  assert.deepEqual(
    contracts.rows.map((x) => [x.ticker, x.value]),
    [
      ['AAA', 5e6],
      ['EEE', 1e6],
    ],
  );
  assert.equal(contracts.lineage[0].table, 'contract_awards_resolved');
  /* 13F: EEE lost comparable managers; only AAA rose (+2). */
  const inst = r.stages.find((s) => s.stage === 'filter:institutional_breadth_change');
  assert.equal(inst.status, 'ok');
  assert.deepEqual(
    inst.rows.map((x) => [x.ticker, x.value]),
    [['AAA', 2]],
  );
  assert.equal(inst.lineage[0].table, 'sec_13f_holdings');
  assert.match(inst.lineage[0].filter, /2026-09-30 vs 2026-06-30/);
  /* The 13F read only asked about the contracts survivors. */
  const rpc = admin.calls.filter((c) => c.rpc === 'sonar_13f_ownership');
  assert.ok(rpc.length >= 1);
  assert.deepEqual([...rpc[0].args.p_cusips].sort(), ['AAA000001', 'EEE000001']);
  assert.deepEqual(
    r.table.map((t) => t.ticker),
    ['AAA'],
  );
  assert.deepEqual(
    r.funnel.map((f) => f.count),
    [3, 2, 1, 1],
  );
  assert.ok(r.limitations.some((l) => /2026-09-30 against 2026-06-30/.test(l)));
  assert.ok(r.limitations.some((l) => /future-dated records excluded/.test(l)));
});

test('runScreen: an empty stage stops the chain explicitly; later stages are skipped', async () => {
  const att = analyticsAttachment(canonicalIntent(Q));
  const admin = screenFixture({ awards: [] });
  const r = await A.runScreen(admin, att, { now: NOW });
  const statuses = Object.fromEntries(r.stages.map((s) => [s.stage, s.status]));
  assert.equal(statuses['seed:congress'], 'ok');
  assert.equal(statuses['filter:gov_contract_value_window'], 'empty');
  assert.equal(statuses['filter:institutional_breadth_change'], 'skipped');
  assert.equal(r.table.length, 0);
  assert.ok(!admin.calls.some((c) => c.rpc), 'no 13F read for an empty universe');
});

test('runScreen: no congressional purchases in the window is an explicit empty result', async () => {
  const att = analyticsAttachment(canonicalIntent(Q));
  const r = await A.runScreen(screenFixture({ congress: [] }), att, { now: NOW });
  assert.equal(r.stages[0].status, 'empty');
  assert.match(r.stages[0].reason, /no companies members of congress bought/);
  assert.equal(r.table.length, 0);
  assert.deepEqual(
    r.stages.slice(1).map((s) => s.status),
    ['skipped', 'skipped'],
  );
});

test('runScreen: a failed read is a failed stage with its reason, not an empty list', async () => {
  const att = analyticsAttachment(canonicalIntent(Q));
  const base = screenFixture();
  const admin = {
    ...base,
    from: (t) =>
      t === 'congress_trades'
        ? fakeSupabase({}, { fail: { congress_trades: 'relation does not exist' } }).from(t)
        : base.from(t),
  };
  const r = await A.runScreen(admin, att, { now: NOW });
  assert.equal(r.stages[0].status, 'failed');
  assert.match(r.stages[0].reason, /congress_trades could not be read/);
  assert.equal(r.table.length, 0);
});

test('seedFromRows: future dates and malformed tickers are dropped and counted', () => {
  const s = A.seedFromRows(
    'contracts',
    [
      { ticker: 'AAA', award_amount: 1, action_date: '2026-01-01' },
      { ticker: 'AAA', award_amount: 2, action_date: '2026-02-01' },
      { ticker: 'BBB', award_amount: 5, action_date: '2027-12-01' },
      { ticker: 'not a ticker', award_amount: 5, action_date: '2026-03-01' },
    ],
    { since: '2025-11-28', until: '2026-11-28' },
  );
  assert.deepEqual(
    s.rows.map((r) => [r.ticker, r.value]),
    [['AAA', 3]],
  );
  assert.equal(s.lineage[0].recordsDropped, 2);
  assert.equal(s.lineage[0].asOf, '2026-02-01', 'as-of ignores future-dated rows');
});

test('the planner gets the screen survivors as its universe (no more unmet: tickers)', async () => {
  const { planResearch } = await import('../src/lib/sonar/engine/planner.js');
  const composition = {
    results: [
      {
        capability: 'financial-screen',
        status: 'done',
        table: [{ ticker: 'AAA' }, { ticker: 'EEE' }],
        stages: [{ stage: 'seed:congress', status: 'ok' }],
      },
    ],
  };
  const u = S.universeFromComposition(composition);
  assert.deepEqual(u.tickers, ['AAA', 'EEE']);
  assert.equal(u.basis, 'screen');
  assert.deepEqual(u.lineage, ['seed:congress:ok']);
  assert.equal(
    S.universeFromComposition({
      results: [{ capability: 'financial-screen', status: 'done', table: [] }],
    }),
    null,
  );
  assert.equal(
    S.universeFromComposition({ results: [{ capability: 'financial-screen', status: 'failed' }] }),
    null,
  );
  /* The engine wiring: the composed universe replaces a missing one. */
  const src = (await import('node:fs')).readFileSync(
    new URL('../src/lib/sonar/engine/engine.js', import.meta.url),
    'utf8',
  );
  assert.match(
    src,
    /!resolved\.universe && !resolved\.company \? universeFromComposition\(composition\)/,
  );
  /* With the universe, ticker-dependent sources are no longer excluded for unmet tickers:
     the d3 snapshot excluded contracts_history, institutional_13f and congress_company. */
  const { buildResearchSpec } = await import('../src/lib/sonar/engine/research-spec.js');
  const { understandDeterministic } = await import('../src/lib/sonar/understand/index.js');
  const spec = buildResearchSpec(understandDeterministic(Q), {
    query: Q,
    resolution: {},
    depth: 'deep',
    now: NOW,
  });
  const unmet = (p) =>
    p.excluded.filter((e) => /unmet_needs:tickers/.test(e.reason)).map((e) => e.source);
  const without = planResearch(spec, {}, { depth: 'deep' });
  const withU = planResearch(spec, { universe: u }, { depth: 'deep' });
  assert.ok(unmet(without).includes('contracts_history'), 'before: contracts unmet');
  assert.ok(unmet(without).includes('institutional_13f'), 'before: 13F unmet');
  assert.deepEqual(unmet(withU), [], 'after: nothing unmet for tickers');
  const planned = withU.tasks.map((t) => t.source);
  assert.ok(planned.includes('contracts_history'), planned.join(','));
  assert.ok(planned.includes('institutional_13f'), planned.join(','));
});

/* ── 3. DCF arithmetic against hand-worked fixtures ─────────────────── */

const V = await import('../src/lib/sonar/valuation/model.js');
const VH = await import('../src/lib/sonar/valuation/history.js');
const VM = await import('../src/lib/sonar/valuation/metrics.js');
const VF = await import('../src/lib/sonar/valuation/fetch.js');

/* Hand-worked: revenue 100, growth 3% every year (start = terminal), margin 20%, tax 25%,
   D&A 5%, capex fading 8% -> 5% by year 5, no working capital, WACC 9%, debt 20, cash 10,
   10 shares.
     year t: revenue 100 x 1.03^t; capex_t = 8% - 0.75% x (t - 1)
     FCFF_t = revenue_t x (20% x 75% + 5% - capex_t) = revenue_t x (20% - capex_t)
       t1 103.0000 x 12.00% = 12.360000   PV 11.339450
       t2 106.0900 x 12.75% = 13.526475   PV 11.384963
       t3 109.2727 x 13.50% = 14.751815   PV 11.391107
       t4 112.5509 x 14.25% = 16.038501   PV 11.362078
       t5 115.9274 x 15.00% = 17.389111   PV 11.301729   sum 56.779328
     terminal: 115.9274 x 1.03 x 15% / (9% - 3%) = 298.513074; PV 194.013016
     EV 250.792344; equity 250.792344 - 20 + 10 = 240.792344; per share 24.079234
     with capex held flat at 8%: per share 19.600000 */
const HAND = {
  revenue: 100,
  margin: 0.2,
  taxRate: 0.25,
  daPct: 0.05,
  capexPct: 0.08,
  capexTerminalPct: 0.05,
  wcPct: 0,
  startGrowth: 0.03,
  terminalGrowth: 0.03,
  beta: 1,
  riskFree: 0.04,
  erp: 0.05,
  costOfDebt: 0.05,
  debt: 20,
  cash: 10,
  minority: 0,
  shares: 10,
  marketCap: 200,
};

test('DCF: matches the hand-worked fixture line by line', () => {
  const out = V.runDcf(HAND, { wacc: 0.09 });
  const close = (a, b, msg) => assert.ok(Math.abs(a - b) < 1e-5, `${msg}: ${a} vs ${b}`);
  const fcff = [12.36, 13.526475, 14.751815, 16.038501, 17.389111];
  out.years.forEach((y, k) => close(y.fcff, fcff[k], `FCFF year ${k + 1}`));
  close(out.pvForecast, 56.779328, 'PV of forecast');
  close(out.terminalValue, 298.513074, 'terminal value');
  close(out.pvTerminal, 194.013016, 'PV of terminal');
  close(out.enterpriseValue, 250.792344, 'EV');
  close(out.equityValue, 240.792344, 'equity = EV - debt + cash');
  close(out.perShare, 24.079234, 'per diluted share');
  close(out.terminalShare, 0.7736, 'terminal share');
  close(V.runDcf({ ...HAND, capexTerminalPct: null }, { wacc: 0.09 }).perShare, 19.6, 'flat capex');
  /* Forecast period consistency: five years, year-1 capex is the trailing ratio, year 5 the
     terminal ratio, the terminal value uses the terminal ratio. */
  assert.equal(out.years.length, V.FORECAST_YEARS);
  close(out.years[0].capex / out.years[0].revenue, 0.08, 'year 1 capex');
  close(out.years[4].capex / out.years[4].revenue, 0.05, 'year 5 capex');
});

test('DCF: WACC by hand, the equity-only fallback is disclosed, spread guard holds', () => {
  const ke = 0.04 + 1 * 0.05;
  const w = (200 / 220) * ke + (20 / 220) * 0.05 * 0.75;
  assert.ok(Math.abs(V.wacc(HAND) - w) < 1e-12);
  assert.ok(Math.abs(V.wacc({ ...HAND, marketCap: null }) - ke) < 1e-12);
  assert.match(V.runDcf(HAND, { wacc: 0.035 }).error, /too close to terminal growth/);
});

test('capex plan: override, history median floored at D&A, flat without history', () => {
  const hist = [0.39, 0.23, 0.18, 0.13, 0.12, 0.12].map((capexPct) => ({ capexPct }));
  const p = V.capexPlan({ capexPct: 0.39, daPct: 0.12, capexHistory: hist });
  assert.ok(Math.abs(p.terminalPct - 0.155) < 1e-12, 'median of six');
  assert.equal(p.source, 'reported');
  assert.match(p.note, /median of 6 fiscal-year trailing windows/);
  const floored = V.capexPlan({ capexPct: 0.3, daPct: 0.2, capexHistory: hist });
  assert.equal(floored.terminalPct, 0.2);
  assert.match(floored.note, /floored at D&A/);
  const over = V.capexPlan({ capexPct: 0.39, daPct: 0.12, capexHistory: hist, override: 0.25 });
  assert.equal(over.terminalPct, 0.25);
  assert.equal(over.source, 'override');
  const flat = V.capexPlan({ capexPct: 0.39, daPct: 0.12, capexHistory: hist.slice(0, 2) });
  assert.equal(flat.terminalPct, 0.39);
  assert.match(flat.note, /held flat/);
});

test('capex sensitivity: brackets the assumption, monotone, includes the old flat case', () => {
  const s = V.sensitivityCapex({
    ...HAND,
    capexHistory: [0.08, 0.06, 0.05],
    capexTerminalPct: 0.06,
  });
  assert.deepEqual(
    s.map((x) => x.label),
    ['D&A only', 'History median', 'Midpoint', 'Trailing, held flat'],
  );
  for (let k = 1; k < s.length; k += 1)
    assert.ok(s[k - 1].perShare > s[k].perShare, 'more capex, less value');
  assert.equal(s.find((x) => x.current).label, 'History median');
});

test('MSFT (saved d3 inputs): the frozen $80.02 reproduces; capex alone spans $80 to $274', () => {
  /* The deep_valuation snapshot's DCF inputs, as frozen on Nov 28 2026. */
  const msft = {
    erp: 0.05,
    beta: 1.045,
    cash: 64643000000,
    debt: 133931000000,
    daPct: 0.12160949068394694,
    price: null,
    wcPct: 0.02,
    margin: 0.4710444659325434,
    shares: 7446000000,
    revenue: 346445000000,
    taxRate: 0.19683420990393388,
    capexPct: 0.39233067297839486,
    minority: 0,
    riskFree: 0.0494,
    marketCap: 3659904100000,
    costOfDebt: 0.02406463029470399,
    startGrowth: 0.1420801073243949,
    terminalGrowth: 0.025,
  };
  const flat = V.runDcf(msft);
  assert.equal(flat.perShare.toFixed(2), '80.02', 'arithmetic of the saved artifact');
  /* Terminal capex at filed FY2021-FY2026 median (15.7% of revenue). */
  const faded = V.runDcf({ ...msft, capexTerminalPct: 0.157 });
  assert.ok(faded.perShare > 240 && faded.perShare < 260, String(faded.perShare));
  const da = V.runDcf({ ...msft, capexTerminalPct: msft.daPct });
  assert.equal(da.perShare.toFixed(2), '273.69');
});

test('price: a stored close is used with its date and source; a stale one is not', async () => {
  const admin = fakeSupabase({
    price_data_cache: [
      { ticker: 'MSFT', date: '2026-11-27', close: 491.25 },
      { ticker: 'MSFT', date: '2026-11-26', close: 488 },
      { ticker: 'OLD', date: '2026-10-01', close: 10 },
    ],
  });
  assert.deepEqual(await VF.storedClose(admin, 'msft', NOW), {
    price: 491.25,
    asOf: '2026-11-27',
    source: 'stored_close',
  });
  assert.equal(await VF.storedClose(admin, 'OLD', NOW), null, 'older than 10 days');
  assert.equal(await VF.storedClose(admin, 'NONE', NOW), null);
  /* The engine and the adaptive deps pass the lookup (deep runs had no price at all). */
  const fs = await import('node:fs');
  const eng = fs.readFileSync(
    new URL('../src/lib/sonar/engine/engine.js', import.meta.url),
    'utf8',
  );
  assert.match(eng, /priceLookup: \(t\) => storedClose\(admin, t, now\)/);
});

test('valuation metrics carry the capex path, the price used and the capex sensitivity', () => {
  const inputs = {
    ...HAND,
    capexNote: 'fades from the trailing 8% to 5% by year 5',
    price: 22,
    priceAsOf: '2026-11-27',
    priceSource: 'stored_close',
    capexHistory: [0.08, 0.06, 0.05],
  };
  const res = V.runDcf(inputs, { wacc: 0.09 });
  const ms = VM.valuationMetrics({
    version: V.MODEL_VERSION,
    asOf: '2026-11-28',
    dcf: { ok: true, inputs, result: res },
    scenarios: [],
    sensitivity: { capex: V.sensitivityCapex(inputs) },
  });
  const byId = Object.fromEntries(ms.map((m) => [m.id, m]));
  assert.equal(byId.dcf_capex_pct_assumed.value, 0.08);
  assert.equal(byId.dcf_capex_pct_terminal.value, 0.05);
  assert.match(byId.dcf_capex_pct_terminal.method, /fades from the trailing 8% to 5%/);
  assert.equal(byId.dcf_price_used.value, 22);
  assert.match(byId.dcf_price_used.method, /stored close as of 2026-11-27/);
  assert.ok(byId.dcf_capex_trailing_held_flat_per_share);
  assert.ok(Math.abs(byId.dcf_vs_price.value - (24.08 / 22 - 1)) < 1e-3);
});

test('no price is no comparison: the conclusion still states the DCF, never a made-up gap', () => {
  const c = V.valuationConclusion({
    history: { metrics: [] },
    peers: null,
    dcf: V.runDcf(HAND, { wacc: 0.09 }),
    scen: [],
    inputs: { ...HAND, price: null },
  });
  assert.ok(c.some((x) => x.kind === 'model' && /\$24\.08 per share/.test(x.text)));
  assert.ok(c.some((x) => /No current share price was available/.test(x.text)));
  assert.ok(!c.some((x) => /against a price/.test(x.text)));
});

/* ── 4. Output contracts: parsing, truncation, partial preservation, saved runs ── */

const OC = await import('../src/lib/sonar/engine/output-contracts.js');
const ORC = await import('../src/lib/sonar/analysts/orchestrator.js');
const FND = await import('../src/lib/sonar/engine/findings.js');

const EV = await import('../src/lib/sonar/engine/evidence.js');
/* Evidence in its marked form (toEvidence + withMarkers), as the specialists receive it. */
const MARKED = EV.withMarkers(
  [
    {
      title: 'MSFT 10-K FY2026',
      text: 'Revenue was $331.8 billion in fiscal 2026.',
      date: '2026-07-30',
    },
    {
      title: 'MSFT capex FY2026',
      text: 'Capital expenditure was $115.9 billion.',
      date: '2026-07-30',
    },
  ].map((raw) => ({
    evidence: EV.toEvidence(raw, {
      source: 'company_financials',
      retrievedAt: '2026-11-28T00:00:00Z',
    }),
    score: 1,
    why: [],
  })),
);
const METRICS = [{ id: 'capex_to_revenue', label: 'Capex / revenue', value: 0.349, unit: 'ratio' }];

test('specialist schema: template, length contracts and validator agree on the fields', () => {
  const tpl = JSON.parse(ORC.STANDARD_CONTRACT.split('\n')[1]);
  assert.deepEqual(Object.keys(tpl), OC.SPECIALIST_FIELDS, 'template fields = read fields');
  assert.deepEqual(Object.keys(tpl.findings[0]), OC.SPECIALIST_FINDING_FIELDS);
  for (const mode of ['standard', 'deep']) {
    const c = OC.specialistContract(mode);
    for (const f of [...OC.SPECIALIST_FIELDS, ...OC.SPECIALIST_FINDING_FIELDS])
      assert.ok(c.includes(f), `${mode} contract names ${f}`);
    assert.match(c, /No other fields/);
  }
  /* Every field the validator outputs is one the contract asks for. */
  const v = ORC.validateSpecialist(
    {
      conclusion: 'Capex reached 34.9% of revenue [M:capex_to_revenue].',
      confidence: 'moderate',
      findings: [],
    },
    { analyst: { id: 'equity-research' }, marked: MARKED, metrics: METRICS },
  );
  assert.deepEqual(Object.keys(v.output).sort(), [...OC.SPECIALIST_FIELDS].sort());
});

test('budgets: every role target fits under 60% of its cap; caps exist for every role', () => {
  for (const [role, c] of Object.entries(OC.OUTPUT_CONTRACTS)) {
    assert.ok(c.capTokens > 0 && c.targetWords > 0, role);
    assert.ok(c.targetWords * 1.6 <= 0.6 * c.capTokens, role);
  }
  assert.deepEqual(Object.keys(OC.ROLE_THINKING).sort(), [
    'deep_writer',
    'quick_writer',
    'reviewer',
    'specialist',
    'standard_writer',
  ]);
  for (const d of ['quick', 'standard', 'deep']) assert.ok(OC.ROLE_THINKING[OC.writerRole(d)]);
  const b = OC.ROLE_BUDGETS.deep;
  assert.ok(b.specialistHopMs < b.specialistsWindowMs, 'a hop fits its window');
});

test('completion statuses: the full matrix, including a repaired cut without a stop reason', () => {
  const ok = { answer: '{}', stopReason: 'end_turn' };
  assert.equal(OC.classifyOutcome({ out: ok, parsedOk: true }), 'ok');
  assert.equal(
    OC.classifyOutcome({ out: { ...ok, stopReason: 'max_tokens' }, parsedOk: true }),
    'truncated',
  );
  assert.equal(
    OC.classifyOutcome({ out: { answer: '{}' }, parsedOk: true, repaired: true }),
    'truncated',
  );
  assert.equal(OC.classifyOutcome({ out: ok, parsedOk: false }), 'invalid_output');
  assert.equal(OC.classifyOutcome({ error: new Error('anthropic: timed out') }), 'timeout');
  assert.equal(
    OC.classifyOutcome({ error: new Error('no time before the deadline') }),
    'skipped_deadline',
  );
  assert.equal(
    OC.classifyOutcome({ error: new Error('anthropic: cut at max_tokens before any text') }),
    'truncated',
  );
  assert.equal(
    OC.classifyOutcome({ error: new Error('anthropic 529 overloaded') }),
    'provider_error',
  );
  const sum = OC.outcomeSummary([
    { outcome: 'ok' },
    { outcome: 'truncated', fellBackFrom: { model: 'x' } },
  ]);
  assert.deepEqual([sum.calls, sum.ok, sum.truncated, sum.fallbacks], [2, 1, 1, 1]);
});

test('truncation: a cut specialist reply keeps only complete findings, flagged repaired', () => {
  const full = JSON.stringify({
    conclusion: 'Capex is 34.9% of revenue [M:capex_to_revenue].',
    confidence: 'moderate',
    findings: [
      {
        claim: 'Revenue was $331.8 billion in fiscal 2026.',
        label: 'fact',
        refs: ['S1'],
        period: 'FY2026',
      },
      {
        claim: 'Capital expenditure was $115.9 billion.',
        label: 'fact',
        refs: ['S2'],
        period: 'FY2026',
      },
      {
        claim: 'Capex intensity is 34.9%.',
        label: 'calculation',
        refs: ['M:capex_to_revenue'],
        period: 'FY2026',
      },
    ],
    counterevidence: [],
    dataGaps: [],
    handoffs: [],
  });
  const cut = full.slice(0, full.indexOf('Capex intensity') + 8);
  const parsed = FND.parseResearchJson(cut);
  assert.equal(parsed._truncated, true);
  assert.equal(parsed.findings.length, 2, 'the half-written third finding is dropped, not patched');
  const v = ORC.validateSpecialist(parsed, {
    analyst: { id: 'equity-research' },
    marked: MARKED,
    metrics: METRICS,
  });
  assert.equal(v.ok, true);
  assert.equal(v.output.findings.length, 2);
  assert.equal(
    OC.classifyOutcome({ out: { answer: cut }, parsedOk: v.ok, repaired: true }),
    'truncated',
  );
  /* Nothing complete: null, never a guess. */
  assert.equal(FND.parseResearchJson('{"conclusion": "Capex is'), null);
});

test('structured evidence refs: unknown markers and metrics are removed, brackets stripped', () => {
  const v = ORC.validateSpecialist(
    {
      conclusion: 'Revenue was $331.8 billion [S1].',
      confidence: 'high',
      findings: [
        {
          claim: 'Revenue was $331.8 billion in fiscal 2026.',
          label: 'fact',
          refs: ['[S1]'],
          period: 'FY2026',
        },
        { claim: 'Margins were 52.0% last year.', label: 'fact', refs: ['S9'], period: 'FY2025' },
        { claim: 'Capex intensity was 34.9%.', label: 'calculation', refs: ['M:not_a_metric'] },
      ],
      question: 'ignored',
      confidenceReason: 'ignored',
    },
    { analyst: { id: 'equity-research' }, marked: MARKED, metrics: METRICS },
  );
  assert.deepEqual(v.output.findings[0].refs, ['S1']);
  assert.ok(
    v.output.findings.every((f) => !f.refs.includes('S9')),
    'S9 is not in the evidence',
  );
  assert.ok(v.log.length >= 1, 'removals are logged');
  assert.equal(v.output.question, undefined);
});

test('red team: parsed, capped, refs filtered; a cut reply keeps complete points, flagged', () => {
  const rt = ORC.parseRedTeam(
    JSON.stringify({
      verdict: 'weakened',
      points: [
        {
          kind: 'fragility',
          target: 'capex stays at 39%',
          text: 'Holding peak capex flat is fragile.',
          refs: ['M:capex_to_revenue', 'bogus'],
        },
        { kind: 'nonsense', text: 'Base rates are missing.', refs: [] },
      ],
    }),
  );
  assert.equal(rt.verdict, 'weakened');
  assert.deepEqual(rt.points[0].refs, ['M:capex_to_revenue']);
  assert.equal(rt.points[1].kind, 'alternative');
  assert.equal(rt.repaired, false);
  const cut =
    '{"verdict":"holds","points":[{"kind":"falsifier","text":"A capex cut would show it.","refs":["S2"]},{"kind":"base_rate","text":"Most hyper';
  const r2 = ORC.parseRedTeam(cut);
  assert.equal(r2.points.length, 1);
  assert.equal(r2.repaired, true);
  assert.equal(ORC.parseRedTeam('not json'), null);
});

test('saved runs: stored d4 role outcomes re-summarize to the stored counts', () => {
  /* company_fundamentals, cell D (suite model-bench-2026-11-28-profile-d4), as stored. */
  const stored = [
    {
      role: 'specialist:equity-research',
      outcome: 'truncated',
      repaired: true,
      fellBackFrom: null,
    },
    { role: 'specialist:valuation', outcome: 'truncated', repaired: true, fellBackFrom: null },
    { role: 'writer', outcome: 'ok', fellBackFrom: null },
  ];
  const s = OC.outcomeSummary(stored);
  assert.deepEqual(
    { ok: s.ok, calls: s.calls, truncated: s.truncated, fallbacks: s.fallbacks },
    { ok: 1, calls: 3, truncated: 2, fallbacks: 0 },
  );
  /* A saved specialist entry (before Nov 28 it could carry analyst and question) still
     validates: extra fields are ignored, the read fields are unchanged. */
  const legacy = {
    analyst: 'equity-research',
    question: 'How capital intensive is Microsoft?',
    conclusion: 'Capex reached 34.9% of revenue [M:capex_to_revenue].',
    confidence: 'moderate',
    confidenceReason: 'one year of data',
    findings: [
      {
        claim: 'Capital expenditure was $115.9 billion.',
        label: 'fact',
        refs: ['S2'],
        period: 'FY2026',
      },
    ],
    counterevidence: [],
    dataGaps: [],
    handoffs: [],
  };
  const v = ORC.validateSpecialist(legacy, {
    analyst: { id: 'equity-research' },
    marked: MARKED,
    metrics: METRICS,
  });
  assert.equal(v.ok, true);
  assert.equal(v.output.findings.length, 1);
});

/* ── 5. Stored re-analysis (deterministic) ──────────────────────────── */

const SA = await import('../src/lib/sonar/engine/eval/stored-analysis.js');
const MB = await import('../src/lib/sonar/engine/eval/model-bench.js');

test('stored analysis: exact sign test and a reproducible case bootstrap', () => {
  /* Hand values: 4 up, 0 down -> p = 2 x (1/16) = 0.125; 6 up, 1 down -> 2 x 8/128. */
  assert.equal(SA.signTest([1, 2, 3, 4]).p, 0.125);
  assert.ok(Math.abs(SA.signTest([1, 1, 1, 1, 1, 1, -1, 0]).p - 0.125) < 1e-12);
  assert.deepEqual((({ up, down, ties }) => ({ up, down, ties }))(SA.signTest([1, 0, -1])), {
    up: 1,
    down: 1,
    ties: 1,
  });
  assert.equal(SA.signTest([0, 0]).p, 1);
  const a = SA.bootstrapMean([1, 2, 3, 4, 5], { iters: 2000, seed: 7 });
  const b = SA.bootstrapMean([1, 2, 3, 4, 5], { iters: 2000, seed: 7 });
  assert.deepEqual(a, b, 'seeded: identical on every run');
  assert.equal(a.mean, 3);
  assert.ok(a.lo < 3 && a.hi > 3 && a.lo >= 1 && a.hi <= 5);
});

test('stored analysis: the d4 fixture pairs every case; the headline differences hold', async () => {
  const fs = await import('node:fs');
  const data = JSON.parse(
    fs.readFileSync(new URL('../sonar-evals/d4-per-case-2026-11-28.json', import.meta.url), 'utf8'),
  );
  const names = ['objective_rate', 'untraced_numbers', 'valid_cross_insights'];
  const std = SA.parsePacked(data.standard, names);
  const deep = SA.parsePacked(data.deep, names);
  assert.equal(std.length, 39, '13 cases x 3 cells');
  assert.equal(deep.length, 8, '4 cases x 2 cells');
  const c = SA.compareCells(std, 'current', 'D', names);
  assert.equal(c.untraced_numbers.cases, 13);
  assert.ok(c.untraced_numbers.meanDiff.hi < 0, 'D writes fewer untraced numbers');
  assert.ok(c.valid_cross_insights.meanDiff.hi < 0, 'but fewer valid cross insights than current');
  const d = SA.compareCells(deep, 'current', 'D', names);
  assert.equal(d.valid_cross_insights.sign.up, 4);
  assert.equal(d.valid_cross_insights.sign.p, 0.125, 'four cases cannot reach p < 0.05');
});

test('scorer: a bracketed citation counts as supported in both counts (bug fix)', () => {
  const run = {
    evidence: [{ marker: 'S1', title: 'x', text: 'Revenue was $10.0 billion.' }],
    keyFindings: [{ title: 'Revenue', evidence: ['[S1]'] }],
    sections: [],
  };
  const s = MB.scoreRun(run, { id: 't', objectives: [] });
  assert.equal(s.citations.valid, 1);
  assert.equal(s.unsupported.findingsWithoutValidCitation, 0);
});

/* ── 6. Benchmark budget controls (mocked usage, no paid call possible) ─ */

const BB = await import('../src/lib/sonar/engine/eval/bench-budget.js');
const RUN = await import('../src/lib/sonar/engine/eval/model-bench-runner.js');
const ACTIVE = await import('../src/lib/sonar/engine/eval/model-bench-active.js');

const ENV_OK = { SONAR_BENCH_PAID_CALLS: 'authorized', SONAR_BENCH_GLOBAL_CAP_USD: '10' };
const AUTH_SUITE = {
  suite: 'test-suite',
  until: '2026-11-29T00:00:00Z',
  maxUsd: 1,
  authorization: { by: 'noah', at: '2026-11-28T15:00:00Z', maxUsd: 1 },
  maxConcurrent: 2,
};
const T = Date.parse('2026-11-28T16:00:00Z');

test('gate: blocked by default; every condition is required', () => {
  const gate = (over = {}) =>
    BB.paidStepGate({
      env: ENV_OK,
      suite: AUTH_SUITE,
      state: {},
      estimateUsd: 0.1,
      now: T,
      ...over,
    });
  assert.equal(gate().ok, true);
  assert.match(gate({ env: {} }).reason, /not authorized on this deployment/);
  assert.match(gate({ env: { ...ENV_OK, SONAR_BENCH_DISABLED: '1' } }).reason, /disabled/);
  assert.match(
    gate({ suite: { ...AUTH_SUITE, authorization: null } }).reason,
    /no explicit authorization/,
  );
  assert.match(
    gate({ suite: { ...AUTH_SUITE, authorization: { by: 'x', at: 'y', maxUsd: 0 } } }).reason,
    /no explicit authorization/,
  );
  assert.equal(gate({ now: Date.parse('2026-11-30T00:00:00Z') }).reason, 'expired');
  assert.equal(
    gate({
      suite: {
        ...AUTH_SUITE,
        authorization: { ...AUTH_SUITE.authorization, expiresAt: '2026-11-28T15:30:00Z' },
      },
    }).reason,
    'authorization expired',
  );
  assert.equal(gate({ state: { cancelled: true } }).reason, 'cancelled');
  /* Per-suite cap counts what is already reserved in flight. */
  assert.equal(gate({ state: { suiteSpentUsd: 0.8, suiteReservedUsd: 0.15 } }).reason, 'spend cap');
  assert.equal(gate({ state: { suiteSpentUsd: 0.8 } }).ok, true);
  /* Global cap: default 0 blocks; spend across suites counts. */
  assert.match(
    gate({ env: { SONAR_BENCH_PAID_CALLS: 'authorized' } }).reason,
    /global evaluation cap is 0/,
  );
  assert.equal(gate({ state: { globalSpentUsd: 9.95 } }).reason, 'global evaluation spend cap');
  assert.equal(gate({ state: { inFlight: 2 } }).reason, 'concurrency limit');
  /* The authorization's own cap binds when lower than the suite's. */
  assert.equal(
    gate({ suite: { ...AUTH_SUITE, maxUsd: 50 }, state: { suiteSpentUsd: 0.95 } }).reason,
    'spend cap',
  );
});

test('ledger: a reservation counts until its result exists or it goes stale', () => {
  const rows = [
    { engine: 'model-bench', key: 'run|a', runUsd: 0.3, created_at: '2026-11-28T15:55:00Z' },
    {
      engine: 'model-bench-attempt',
      key: 'run|a',
      reservedUsd: 0.6,
      created_at: '2026-11-28T15:54:00Z',
    },
    {
      engine: 'model-bench-attempt',
      key: 'run|b',
      reservedUsd: 0.6,
      created_at: '2026-11-28T15:58:00Z',
    },
    {
      engine: 'model-bench-attempt',
      key: 'run|c',
      reservedUsd: 0.6,
      created_at: '2026-11-28T15:00:00Z',
    },
    { engine: 'model-bench-judge', key: 'judge|a', usd: 0.04, created_at: '2026-11-28T15:56:00Z' },
  ];
  const l = BB.suiteLedger(rows, { now: T });
  assert.ok(Math.abs(l.spentUsd - 0.34) < 1e-12, 'results only, never reservations');
  assert.equal(l.reservedUsd, 0.6, 'b in flight; a settled; c stale');
  assert.equal(l.inFlight, 1);
  assert.equal(l.cancelled, false);
  assert.equal(
    BB.suiteLedger([...rows, { engine: 'model-bench-cancel', created_at: 'x' }], { now: T })
      .cancelled,
    true,
  );
  assert.equal(BB.estimateStepUsd({ kind: 'run', depth: 'deep' }), 0.6);
  assert.equal(BB.estimateStepUsd({ kind: 'judge' }), 0.04);
  assert.equal(BB.estimateStepUsd(null), 0.6, 'unknown steps reserve the most');
});

test('no defined suite can spend: none carries an authorization', () => {
  assert.ok(ACTIVE.MODEL_BENCH_SUITES.length > 0);
  for (const s of ACTIVE.MODEL_BENCH_SUITES) {
    assert.equal(s.authorization, undefined, s.suite);
    assert.equal(
      BB.paidStepGate({
        env: ENV_OK,
        suite: s,
        state: {},
        estimateUsd: 0,
        now: Date.parse('2026-11-28T12:00:00Z'),
      }).ok,
      false,
      s.suite,
    );
  }
});

test('worker: unauthorized suites read and write nothing', async () => {
  const db = { sonar_research_evaluations: [] };
  const admin = fakeSupabase(db);
  for (const env of [{}, { SONAR_BENCH_PAID_CALLS: 'yes' }, ENV_OK]) {
    const out = await RUN.workerTick(admin, { ...AUTH_SUITE, authorization: null, env });
    assert.ok(out.idle, JSON.stringify(out));
  }
  assert.equal(db.sonar_research_evaluations.length, 0);
  assert.equal(admin.calls.length, 0, 'refused before any read');
  const cron = (await import('node:fs')).readFileSync(
    new URL('../src/app/api/cron/sonar-model-bench/route.js', import.meta.url),
    'utf8',
  );
  assert.match(cron, /process\.env\.SONAR_BENCH_PAID_CALLS !== 'authorized'/);
});

test('worker: an authorized step reserves first; cancellation and caps stop the next one', async () => {
  const db = { sonar_research_evaluations: [] };
  const admin = fakeSupabase(db);
  const prevKey = process.env.ANTHROPIC_API_KEY;
  delete process.env.ANTHROPIC_API_KEY; // any model call fails before a request
  try {
    const out = await RUN.workerTick(admin, {
      ...AUTH_SUITE,
      until: '2099-01-01T00:00:00Z',
      env: ENV_OK,
    });
    assert.ok(out.ran?.length >= 1, JSON.stringify(out));
    const att = db.sonar_research_evaluations.filter((r) => r.engine === 'model-bench-attempt');
    assert.ok(att.length >= 1);
    assert.ok(att[0].metrics.reservedUsd > 0, 'reserved before the step ran');
    assert.equal(
      llmRequests.length,
      1,
      'still only the earlier mocked request: no new LLM traffic',
    );
    /* Cancel: the next tick refuses. */
    await RUN.cancelSuite(admin, AUTH_SUITE.suite, 'test');
    const after = await RUN.workerTick(admin, {
      ...AUTH_SUITE,
      until: '2099-01-01T00:00:00Z',
      env: ENV_OK,
    });
    assert.equal(after.idle, 'cancelled');
    /* Spend cap: a suite whose results already reach the cap refuses. */
    const db2 = {
      sonar_research_evaluations: [
        {
          suite_run: 'capped',
          engine: 'model-bench',
          metrics: { stepKey: 'run|x', usage: { total: { usd: 1 } } },
          created_at: new Date().toISOString(),
        },
      ],
    };
    const capped = await RUN.workerTick(fakeSupabase(db2), {
      ...AUTH_SUITE,
      suite: 'capped',
      until: '2099-01-01T00:00:00Z',
      env: ENV_OK,
    });
    assert.equal(capped.idle, 'spend cap');
    assert.equal(db2.sonar_research_evaluations.length, 1, 'no reservation written past the cap');
  } finally {
    if (prevKey !== undefined) process.env.ANTHROPIC_API_KEY = prevKey;
  }
});

test('scheduling is off: no benchmark lane in the dispatcher or vercel.json', async () => {
  const { DISPATCH_JOBS } = await import('../src/lib/cron/dispatch-registry.js');
  assert.equal(DISPATCH_JOBS.filter((j) => j.path.includes('sonar-model-bench')).length, 0);
  const v = JSON.parse(
    (await import('node:fs')).readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'),
  );
  assert.equal(v.crons.filter((c) => c.path.includes('sonar-model-bench')).length, 0);
});

test('admin route: paid steps need confirmPaid and the gate; cancel is available', async () => {
  const src = (await import('node:fs')).readFileSync(
    new URL('../src/app/api/admin/sonar/model-bench/route.js', import.meta.url),
    'utf8',
  );
  assert.match(src, /body\.confirmPaid === true/);
  assert.match(src, /paidStepGate\(/);
  assert.match(src, /SONAR_BENCH_MANUAL_CAP_USD/);
  assert.match(src, /body\.action === 'cancel'/);
});

/* ── 7. Human review preparation (no AI judge) ──────────────────────── */

test('review set: ten pairs, five standard and five deep, every rubric criterion', () => {
  const set = MB.HUMAN_REVIEW_SET;
  assert.equal(set.items.length, 10);
  const depth = (id) => MB.caseById(id)?.depth;
  assert.equal(set.items.filter((i) => depth(i.caseId) === 'standard').length, 5);
  assert.equal(set.items.filter((i) => depth(i.caseId) === 'deep').length, 5);
  assert.deepEqual(
    MB.HUMAN_CRITERIA.map(([k]) => k),
    ['overall', 'correctness', 'objectives', 'insight', 'financial', 'evidence', 'unsupported'],
  );
  assert.equal(
    MB.anonymizeAnswer(
      'Written by claude-sonnet-5-5 (Sonnet 5.5) under Profile D; Opus 5.5 reviewed.',
    ),
    'Written by [model] ([model]) under [configuration]; [model] reviewed.',
  );
});

test('review set loader: blind order, shared evidence, identity hidden, verdicts mapped back', async () => {
  const out = (cell, fp, text) => ({
    suite_run: MB.HUMAN_REVIEW_SET.suite,
    engine: 'model-bench',
    benchmark_id: 'valuation',
    config_version: cell,
    metrics: {
      trial: 1,
      score: { fingerprint: fp },
      output: { text, evidence: [{ marker: 'S1', title: 'MSFT 10-K', text: 'Revenue $331.8B.' }] },
    },
  });
  const db = {
    sonar_research_evaluations: [
      out('current', 'f1', 'Answer from claude-haiku-4-5.'),
      out('D', 'f1', 'Answer from Sonnet 5.5.'),
    ],
  };
  const admin = fakeSupabase(db);
  const set = {
    ...MB.HUMAN_REVIEW_SET,
    items: [
      { caseId: 'valuation', trial: 1, left: 'current', right: 'D' },
      { caseId: 'nope', trial: 1, left: 'current', right: 'D' },
    ],
  };
  const q = await RUN.humanReviewSet(admin, { set });
  assert.equal(q.items.length, 1);
  assert.equal(q.missing.length, 1, 'a pair not in the store is reported, not invented');
  const it = q.items[0];
  assert.equal(it.sameEvidence, true);
  assert.equal(it.evidence[0].marker, 'S1');
  assert.ok(!/claude|sonnet|haiku/i.test(it.a.text + it.b.text), 'identity hidden');
  assert.equal(q.criteria.length, 7);
  /* Saving maps A/B back through the same flip, with the new criteria. */
  await RUN.saveHumanVerdict(admin, {
    suite: set.suite,
    itemKey: it.itemKey,
    verdicts: { overall: 'a', financial: 'b', unsupported: 'tie' },
    reviewer: 'noah',
  });
  const saved = db.sonar_research_evaluations.find((r) => r.engine === 'model-bench-human');
  /* A and B pick different cells, so overall (A) and financial (B) map to different sides. */
  assert.ok(['left', 'right'].includes(saved.metrics.verdict.overall.winner));
  assert.notEqual(saved.metrics.verdict.overall.winner, saved.metrics.verdict.financial.winner);
  assert.equal(saved.metrics.verdict.unsupported.winner, 'tie');
  assert.equal(llmRequests.length, 1, 'no model call');
});
