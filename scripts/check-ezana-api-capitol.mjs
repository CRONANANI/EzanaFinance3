/**
 * Ezana API, capitol dimension: params, pure insight maths and registry entries.
 * Run: node --no-warnings --test scripts/check-ezana-api-capitol.mjs (part of npm run test:api).
 * Self-contained node:test file, no network.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { register } from 'node:module';
import { readFileSync } from 'node:fs';

register('./mobile-node-loader.mjs', import.meta.url);

const reg = await import('../src/lib/ezana-api/registry.js');
const q = await import('../src/lib/ezana-api/query.js');
const cat = await import('../src/lib/ezana-api/catalog/capitol.js');
const m = await import('../src/lib/ezana-api/insights/capitol.js');
const { HANDLERS, LIVE_ONLY_RPCS } = await import('../src/lib/ezana-api/handlers/capitol.js');

const CAPITOL = reg.ENDPOINTS.filter((x) => x.dimension === 'capitol');
const byId = (id) => reg.ENDPOINTS.find((e) => e.id === id);
const sp = (s) => new URLSearchParams(s);

test('capitol: every route in this dimension is live and typed', () => {
  for (const e of CAPITOL) {
    assert.equal(e.status, 'live', e.path);
    assert.ok(['data', 'insight'].includes(e.kind), e.path);
  }
});

test('capitol: every catalog route has a handler, fields, a summary and a method when insight', () => {
  const routes = Object.values(cat.ROUTES).flat();
  assert.ok(routes.length >= 29, `${routes.length} routes`);
  for (const r of routes) {
    assert.equal(typeof HANDLERS[r.id], 'function', r.id);
    assert.ok(r.fields && Object.keys(r.fields).length, `${r.id} fields`);
    assert.ok(r.summary && !/—/.test(r.summary), `${r.id} summary`);
    if (r.kind === 'insight') assert.ok(r.method && !/—/.test(r.method), `${r.id} method`);
    for (const p of r.params) assert.ok(reg.PARAMS[p], `${r.id} param ${p}`);
    /* The first value of each per-route enum is the default; the summary states it. */
    for (const [name, values] of Object.entries(r.paramEnums || {}))
      assert.ok(r.summary.includes(values[0]), `${r.id} states ${name} default`);
  }
  assert.deepEqual(
    Object.keys(HANDLERS).sort(),
    routes.map((r) => r.id).sort(),
    'no handler without a route',
  );
});

test('capitol: copy is neutral on trades near awards and names no tables', () => {
  for (const r of Object.values(cat.ROUTES).flat()) {
    const text = `${r.summary} ${r.method || ''}`;
    assert.doesNotMatch(text, /ahead of/i, r.id);
    assert.doesNotMatch(text, /supabase|postgres|_(trades|filings|totals|history|rollup)\b/i, r.id);
  }
});

test('capitol: disclosure-based insights are delayed', () => {
  for (const id of [
    'congress.rankings',
    'congress.most_traded',
    'congress.most_held',
    'congress.portfolio',
    'congress.activity_monthly',
    'congress.states',
    'congress.insider_flow',
    'congress.committee_holdings',
    'congress.ticker_committee_exposure',
    'contracts.trades_near_awards',
    'contracts.pre_award_traders',
    'contracts.award_momentum',
    'lobbying.contributions',
  ])
    assert.equal(byId(id).delayed, true, id);
  assert.ok(!byId('fec.leaderboard').delayed, 'FEC is not delayed');
});

test('capitol: new params validate', () => {
  const flow = byId('congress.insider_flow');
  assert.deepEqual(q.parseParams(flow, sp('min_members=3&direction=selling&days=90')), {
    min_members: 3,
    direction: 'selling',
    days: 90,
    limit: 50,
  });
  assert.throws(() => q.parseParams(flow, sp('min_members=0')), /between 1 and 20/);
  assert.throws(() => q.parseParams(flow, sp('direction=up')), /buying, selling/);
  const states = byId('congress.states');
  assert.equal(q.parseParams(states, sp('state=TX')).state, 'TX');
  assert.throws(() => q.parseParams(states, sp('state=tx')), /expected format/);
  const lb = byId('fec.leaderboard');
  assert.throws(() => q.parseParams(lb, sp('sort=volume')), /receipts/);
  assert.equal(q.parseParams(lb, sp('cycle=2026&sort=burn_rate')).cycle, 2026);
  const pre = byId('contracts.pre_award_traders');
  assert.throws(() => q.parseParams(pre, sp('award_actor=lobbyist')), /politician/);
});

test('capitol: paths route to the right endpoint', () => {
  const at = (p) => reg.matchEndpoint(p)?.endpoint.id;
  assert.equal(at('/v1/congress/committees/heatmap'), 'congress.committee_heatmap');
  assert.equal(at('/v1/congress/committees/HSAS/holdings'), 'congress.committee_holdings');
  assert.equal(at('/v1/congress/committees/HSAS/activity'), 'congress.committee_activity');
  assert.equal(at('/v1/congress/tickers/most-traded'), 'congress.most_traded');
  assert.equal(
    at('/v1/congress/tickers/NVDA/committee-exposure'),
    'congress.ticker_committee_exposure',
  );
  assert.equal(at('/v1/congress/members/P000197/portfolio'), 'congress.member_portfolio');
  assert.equal(at('/v1/congress/members/P000197/trades'), 'congress.member_trades');
  assert.equal(at('/v1/fec/candidates'), 'fec.candidates');
  assert.equal(at('/v1/fec/candidates/P000197/funding'), 'fec.candidate_funding');
  assert.equal(at('/v1/contracts/tickers/LMT'), 'contracts.ticker');
  assert.equal(at('/v1/contracts/signals/award-momentum'), 'contracts.award_momentum');
  assert.equal(at('/v1/lobbying/spend-vs-awards'), 'lobbying.spend_vs_awards');
});

test('capitol: the insider-flow function is created by a migration with the delay cutoff', () => {
  const sql = readFileSync(
    new URL('../supabase/migrations/20261026190000_api_congress_insider_flow.sql', import.meta.url),
    'utf8',
  );
  assert.match(sql, /create or replace function public\.api_congress_insider_flow\(/);
  assert.match(sql, /p_cutoff date default null/);
  assert.match(sql, /disclosure_date <= p_cutoff/);
  assert.match(sql, /\bstable\b/);
  assert.match(
    sql,
    /grant execute on function public\.api_congress_insider_flow\([^)]*\)\s+to service_role/,
  );
  assert.match(
    sql,
    /revoke all on function public\.api_congress_insider_flow\([^)]*\)\s+from public, anon, authenticated/,
  );
  assert.deepEqual(LIVE_ONLY_RPCS, ['politician_similar']);
});

/* ── pure maths ─────────────────────────────────────────────────────── */

test('flowScore: half breadth, half dollars, bounded to +-100', () => {
  assert.equal(m.flowScore({ buyers: 7, sellers: 0, buyUsd: 172004, sellUsd: 0 }), 100);
  assert.equal(m.flowScore({ buyers: 0, sellers: 3, buyUsd: 0, sellUsd: 50000 }), -100);
  /* 2 buyers vs 2 sellers is neutral breadth; $30k vs $10k is +0.5 of dollars -> +25. */
  assert.equal(m.flowScore({ buyers: 2, sellers: 2, buyUsd: 30000, sellUsd: 10000 }), 25);
  assert.equal(m.flowScore({}), 0);
});

test('lagByMember and rankMembers', () => {
  const lag = m.lagByMember([
    { bioguide_id: 'A000001', transaction_date: '2026-01-01', disclosure_date: '2026-01-11' },
    { bioguide_id: 'A000001', transaction_date: '2026-01-01', disclosure_date: '2026-01-31' },
    { bioguide_id: 'B000002', transaction_date: '2026-02-01', disclosure_date: '2026-02-05' },
    { bioguide_id: 'B000002', transaction_date: '2026-02-01', disclosure_date: null },
  ]);
  assert.equal(lag.get('A000001'), 20);
  assert.equal(lag.get('B000002'), 4);
  const rows = [
    { name: 'A', est_volume: 10, trades: 5, buys: 1, sells: 4, avg_disclosure_lag_days: 20 },
    { name: 'B', est_volume: 30, trades: 2, buys: 2, sells: 0, avg_disclosure_lag_days: 4 },
    { name: 'C', est_volume: 20, trades: 9, buys: 5, sells: 4, avg_disclosure_lag_days: null },
  ];
  assert.deepEqual(
    m.rankMembers(rows, 'volume').map((r) => r.name),
    ['B', 'C', 'A'],
  );
  assert.deepEqual(
    m.rankMembers(rows, 'trades').map((r) => [r.rank, r.name]),
    [
      [1, 'C'],
      [2, 'A'],
      [3, 'B'],
    ],
  );
  assert.deepEqual(
    m.rankMembers(rows, 'lag').map((r) => r.name),
    ['A', 'B', 'C'],
    'slowest first, unknown lag last',
  );
});

test('sectorTilts and sectorMix', () => {
  const rows = [
    { ticker: 'NVDA', sector: 'Tech', a: 3, b: 1, aHigh: 300, bHigh: 50 },
    { ticker: 'XOM', sector: 'Energy', a: 1, b: 3, aHigh: 10, bHigh: 90 },
  ];
  const t = m.sectorTilts(rows);
  assert.deepEqual(
    t.map((x) => [x.sector, x.a_share_pct, x.b_share_pct, x.tilt_pts]),
    [
      ['Energy', 25, 75, -50],
      ['Tech', 75, 25, 50],
    ],
  );
  const mix = m.sectorMix(rows, 'b');
  assert.deepEqual(
    mix.map((x) => [x.sector, x.positions, x.share_pct, x.est_high]),
    [
      ['Energy', 3, 75, 90],
      ['Tech', 1, 25, 50],
    ],
  );
  assert.equal(
    m.sectorMix(rows).reduce((s, x) => s + x.positions, 0),
    8,
  );
});

test('stateRollup', () => {
  const out = m.stateRollup([
    {
      state: 'TX',
      bioguide_id: 'A1',
      member_name: 'A',
      trades: 2,
      buys: 1,
      sells: 1,
      volume: 100,
      last_trade: '2026-01-02',
    },
    {
      state: 'TX',
      bioguide_id: 'B2',
      member_name: 'B',
      trades: 1,
      buys: 1,
      sells: 0,
      volume: 300,
      last_trade: '2026-03-02',
    },
    {
      state: 'CA',
      bioguide_id: 'C3',
      member_name: 'C',
      trades: 9,
      buys: 9,
      sells: 0,
      volume: 50,
      last_trade: null,
    },
  ]);
  assert.equal(out[0].state, 'TX');
  assert.equal(out[0].members, 2);
  assert.equal(out[0].est_volume, 400);
  assert.equal(out[0].last_trade, '2026-03-02');
  assert.deepEqual(
    out[0].top_members.map((x) => x.name),
    ['B', 'A'],
  );
});

test('topCommitteeTickers: held first, then traded, capped', () => {
  const held = new Map([
    ['AAPL', new Set(['a', 'b'])],
    ['MSFT', new Set(['a'])],
  ]);
  const traded = new Map([
    ['MSFT', new Set(['a', 'b', 'c'])],
    ['TSLA', new Set(['c'])],
  ]);
  assert.deepEqual(m.topCommitteeTickers(held, traded, 2), ['AAPL', 'MSFT']);
  assert.deepEqual(m.topCommitteeTickers(held, traded), ['AAPL', 'MSFT', 'TSLA']);
});

test('fec: burn rate, outside tilt and the leaderboard floors', () => {
  assert.equal(m.burnRate(50, 100), 0.5);
  assert.equal(m.burnRate(50, 0), null);
  assert.equal(m.outsideTilt(300, 100), 0.5);
  assert.equal(m.outsideTilt(0, 0), null);
  const rows = [
    {
      candidate_id: 'H1',
      receipts: 5_000,
      cash_on_hand: 1,
      burn_rate: 3,
      outside_support: 0,
      outside_oppose: 0,
      outside_tilt: null,
    },
    {
      candidate_id: 'H2',
      receipts: 1_000_000,
      cash_on_hand: 500_000,
      burn_rate: 0.6,
      outside_support: 9_000,
      outside_oppose: 0,
      outside_tilt: 1,
    },
    {
      candidate_id: 'H3',
      receipts: 200_000,
      cash_on_hand: 900_000,
      burn_rate: 0.9,
      outside_support: 20_000,
      outside_oppose: 60_000,
      outside_tilt: -0.5,
    },
  ];
  assert.deepEqual(
    m.fecLeaderboard(rows, 'receipts').map((r) => r.candidate_id),
    ['H2', 'H3', 'H1'],
  );
  assert.deepEqual(
    m.fecLeaderboard(rows, 'cash_on_hand').map((r) => r.candidate_id),
    ['H3', 'H2', 'H1'],
  );
  /* H1 raised under the $10,000 floor, so its 3x burn rate is not ranked. */
  assert.deepEqual(
    m.fecLeaderboard(rows, 'burn_rate').map((r) => [r.rank, r.candidate_id]),
    [
      [1, 'H3'],
      [2, 'H2'],
    ],
  );
  /* H2's $9,000 of outside money is under the floor. */
  assert.deepEqual(
    m.fecLeaderboard(rows, 'outside_tilt').map((r) => r.candidate_id),
    ['H3'],
  );
});

test('lobbying: issue mix change, issue counts, spend by period, client book', () => {
  const cur = [
    { issue: 'Defense', filings: 30, total_filings: 100 },
    { issue: 'Health', filings: 10, total_filings: 100 },
  ];
  const prior = [{ issue: 'Defense', filings: 20, total_filings: 80 }];
  assert.deepEqual(m.issueMixChange(cur, prior), [
    {
      issue: 'Defense',
      filings: 30,
      share_pct: 30,
      prior_filings: 20,
      prior_share_pct: 25,
      change_pts: 5,
    },
    {
      issue: 'Health',
      filings: 10,
      share_pct: 10,
      prior_filings: null,
      prior_share_pct: null,
      change_pts: null,
    },
  ]);
  const filings = [
    {
      filing_year: 2026,
      quarter: 'q1',
      amount: 100,
      client_id: 1,
      client_name: 'X',
      issues: [{ code: 'DEF', display: 'Defense' }, { code: 'DEF' }],
      lobbyists: [{ id: 1 }, { id: 2 }],
    },
    {
      filing_year: 2026,
      quarter: 'q2',
      amount: 50,
      client_id: 2,
      client_name: 'Y',
      issues: [{ code: 'TAX', display: 'Tax' }],
      lobbyists: [{ id: 2 }],
    },
    {
      filing_year: 2025,
      quarter: 'q4',
      amount: 10,
      client_id: 1,
      client_name: 'X',
      issues: [{ code: 'DEF', display: 'Defense' }],
      lobbyists: [],
    },
  ];
  assert.deepEqual(m.issueCounts(filings), [
    { code: 'DEF', name: 'Defense', filings: 2 },
    { code: 'TAX', name: 'Tax', filings: 1 },
  ]);
  const by = m.spendByPeriod(filings);
  assert.equal(by[0].year, 2026);
  assert.equal(by[0].amount, 150);
  assert.deepEqual(by[0].quarters, [
    { quarter: 'Q1', amount: 100 },
    { quarter: 'Q2', amount: 50 },
  ]);
  const book = m.clientBook(filings);
  assert.deepEqual(
    book.map((c) => [c.client_id, c.amount, c.first_year, c.last_year]),
    [
      [1, 110, 2025, 2026],
      [2, 50, 2026, 2026],
    ],
  );
  assert.equal(m.distinctLobbyists(filings), 2);
  assert.equal(m.awardsPerLobbyingDollar(1_000_000, 20_000), 50);
  assert.equal(m.awardsPerLobbyingDollar(1_000_000, 0), null);
});

test('contracts: fiscal years', () => {
  assert.equal(m.fiscalYearOf('2026-09-30'), 2026);
  assert.equal(m.fiscalYearOf('2026-10-01'), 2027);
  /* Data synced 25 Jul 2026: FY2026 (to 30 Sep 2026) is not complete yet. */
  assert.equal(m.latestCompleteFiscalYear('2026-07-25'), 2025);
  assert.equal(m.latestCompleteFiscalYear('2026-09-30'), 2026);
  assert.equal(m.latestCompleteFiscalYear('2026-10-26'), 2026);
});

test('contracts: award momentum with the prior-year floor', () => {
  const rows = [
    {
      ticker: 'big',
      fiscal_year: 2025,
      awarding_agency: 'DoD',
      total_amount: 30_000_000,
      award_count: 5,
    },
    {
      ticker: 'BIG',
      fiscal_year: 2025,
      awarding_agency: 'NASA',
      total_amount: 10_000_000,
      award_count: 2,
    },
    {
      ticker: 'BIG',
      fiscal_year: 2024,
      awarding_agency: 'DoD',
      total_amount: 20_000_000,
      award_count: 4,
    },
    /* Prior year under the $1M floor: a +900% change that must not rank. */
    {
      ticker: 'TINY',
      fiscal_year: 2025,
      awarding_agency: 'DoD',
      total_amount: 5_000_000,
      award_count: 1,
    },
    {
      ticker: 'TINY',
      fiscal_year: 2024,
      awarding_agency: 'DoD',
      total_amount: 500_000,
      award_count: 1,
    },
    {
      ticker: 'DOWN',
      fiscal_year: 2025,
      awarding_agency: 'DHS',
      total_amount: 1_000_000,
      award_count: 1,
    },
    {
      ticker: 'DOWN',
      fiscal_year: 2024,
      awarding_agency: 'DHS',
      total_amount: 4_000_000,
      award_count: 3,
    },
    {
      ticker: 'OLD',
      fiscal_year: 2023,
      awarding_agency: 'DHS',
      total_amount: 9_000_000,
      award_count: 3,
    },
  ];
  const out = m.awardMomentum(rows, 2025);
  assert.deepEqual(out.map((r) => r.ticker).sort(), ['BIG', 'DOWN']);
  const big = out.find((r) => r.ticker === 'BIG');
  assert.deepEqual(big, {
    ticker: 'BIG',
    fiscal_year: 2025,
    latest_usd: 40_000_000,
    prior_usd: 20_000_000,
    change_usd: 20_000_000,
    change_pct: 100,
    awards: 7,
    top_agency: 'DoD',
    top_agency_usd: 30_000_000,
  });
  assert.equal(out.find((r) => r.ticker === 'DOWN').change_pct, -75);
  /* The floor is a parameter: with no floor TINY ranks at +900%. */
  assert.equal(
    m.awardMomentum(rows, 2025, { minPrior: 0 }).find((r) => r.ticker === 'TINY').change_pct,
    900,
  );
  assert.equal(m.MOMENTUM_MIN_PRIOR_USD, 1_000_000);
  assert.deepEqual(
    m.sortMomentum(out, 'change_pct', 'up').map((r) => r.ticker),
    ['BIG', 'DOWN'],
  );
  assert.deepEqual(
    m.sortMomentum(out, 'change_pct', 'down').map((r) => r.ticker),
    ['DOWN', 'BIG'],
  );
  assert.deepEqual(
    m.sortMomentum(out, 'change_usd', 'up').map((r) => r.ticker),
    ['BIG', 'DOWN'],
  );
});
