// Sonar institutional ownership (Nov 27 2026). Covers the question that failed in production
// ("Can you tell me what stocks Nancy Pelosi owns that are most owned by investment firms?")
// and its edge cases:
//   A  intent: the question attaches Institutional Ownership Analysis, others do not
//   B  quarter selection: the latest ADEQUATELY covered quarter, not the calendar one
//   C  universe: aliases, ambiguity, unmatched, non-equity, floor positions, duplicates
//   D  aggregation: one count per CIK, comparable-filer changes, zero holders
//   E  ranking: deterministic tie-breaks for every metric
//   F  benchmark: the live Q3 2026 figures for Pelosi's holdings (read Nov 27 2026)
//   G  missing-data states stay distinct
//   H  server reads: database function and paged fallback agree; bounded call count
//   I  fulfillment: direct answer, completion check, typed payload
//   J  registry: subjects, validation, deep qualification
//
// Run: npm run test:sonar-ownership
import { test } from 'node:test';
import assert from 'node:assert/strict';

const own = await import('../src/lib/sonar/composer/ownership.js');
const intents = await import('../src/lib/sonar/composer/intents.js');
const reg = await import('../src/lib/sonar/composer/registry.js');
const ful = await import('../src/lib/sonar/composer/fulfillment.js');
const srv = await import('../src/lib/sonar/composer/ownership-server.js');

const Q = 'Can you tell me what stocks Nancy Pelosi owns that are most owned by investment firms?';
const TODAY = new Date('2026-11-27T12:00:00Z');

/* ── A intent ─────────────────────────────────────────────────────────── */

test('A: the benchmark question attaches institutional ownership for Nancy Pelosi', () => {
  const r = intents.inferComposition(Q);
  assert.equal(r.subject, 'Nancy Pelosi');
  assert.deepEqual(
    r.attachments.map((a) => a.capability),
    ['institutional-ownership'],
  );
  assert.equal(r.attachments[0].params.metric, 'managers');
  assert.equal(r.attachments[0].origin, 'auto');
});

test('A: phrasing variants and metrics', () => {
  const cases = [
    ["Which of BlackRock's holdings are most widely held by hedge funds?", 'managers', 'BlackRock'],
    ['Rank Pelosi stocks by institutional ownership by value', 'value', 'Pelosi'],
    ['Which Pelosi holdings added the most 13F managers last quarter?', 'change', 'Pelosi'],
    [
      'What stocks does Nancy Pelosi own that are held by the most institutions?',
      'managers',
      'Nancy Pelosi',
    ],
  ];
  for (const [q, metric, subject] of cases) {
    const r = intents.inferComposition(q);
    assert.equal(r.attachments[0]?.capability, 'institutional-ownership', q);
    assert.equal(r.attachments[0].params.metric, metric, q);
    assert.equal(r.subject, subject, q);
  }
});

test('A: unrelated questions attach nothing', () => {
  for (const q of [
    'Who is Nancy Pelosi?',
    'What did Nancy Pelosi trade last month?',
    'Who owns Nvidia?',
    'Is the lira under pressure?',
    'what shares do both Nancy Pelosi and BlackRock hold',
  ]) {
    const caps = intents.inferComposition(q).attachments.map((a) => a.capability);
    assert.ok(!caps.includes('institutional-ownership'), q);
  }
});

/* ── B quarter selection ──────────────────────────────────────────────── */

test('B: a thinly loaded calendar quarter is skipped for the covered one', () => {
  const pick = own.selectCoveredPeriod(
    [
      { period: '2026-09-30', filers: 148 },
      { period: '2026-06-30', filers: 1499 },
      { period: '2026-03-31', filers: 77 },
    ],
    TODAY,
  );
  assert.equal(pick.period, '2026-06-30');
  assert.equal(pick.prior, '2026-03-31');
  assert.equal(pick.skipped[0].period, '2026-09-30');
  assert.match(pick.skipped[0].reason, /not yet adequately loaded/);
});

test('B: a fully loaded latest quarter is chosen (live coverage, Nov 27 2026)', () => {
  const pick = own.selectCoveredPeriod(
    [
      { period: '2026-09-30', filers: 1590 },
      { period: '2026-06-30', filers: 1658 },
      { period: '2026-03-31', filers: 1594 },
      { period: '2025-12-31', filers: 87 },
    ],
    TODAY,
  );
  assert.equal(pick.period, '2026-09-30');
  assert.equal(pick.prior, '2026-06-30');
  assert.ok(pick.ratio > 0.95 && pick.ratio < 1);
});

test('B: a quarter whose 45-day deadline has not passed is never chosen', () => {
  const pick = own.selectCoveredPeriod(
    [
      { period: '2026-09-30', filers: 1700 },
      { period: '2026-06-30', filers: 1650 },
    ],
    new Date('2026-11-01T00:00:00Z'),
  );
  assert.equal(pick.period, '2026-06-30');
  assert.match(pick.skipped[0].reason, /deadline/);
  assert.equal(own.previousQuarter('2026-03-31'), '2025-12-31');
  assert.deepEqual(own.quarterEnds(TODAY, 3), ['2026-09-30', '2026-06-30', '2026-03-31']);
});

test('B: no data is a null pick, not a guess', () => {
  assert.equal(own.selectCoveredPeriod([], TODAY), null);
});

/* ── C universe ───────────────────────────────────────────────────────── */

const MASTER = {
  MSFT: [
    {
      cusip: '594918104',
      securityType: 'Common Stock',
      marketSector: 'Equity',
      name: 'MICROSOFT CORP',
    },
  ],
  XYZ: [
    { cusip: '852234103', securityType: 'Common Stock', marketSector: 'Equity', name: 'BLOCK INC' },
  ],
  AB: [
    {
      cusip: '01881G106',
      securityType: 'MLP',
      marketSector: 'Equity',
      name: 'ALLIANCEBERNSTEIN HOLDING LP',
    },
  ],
  SPY: [{ cusip: '78462F103', securityType: 'ETP', marketSector: 'Equity', name: 'SPDR S&P 500' }],
  DUAL: [
    { cusip: '111111111', securityType: 'Common Stock', marketSector: 'Equity' },
    { cusip: '222222222', securityType: 'Common Stock', marketSector: 'Equity' },
  ],
  AAPL: [
    { cusip: '037833100', securityType: 'Common Stock', marketSector: 'Equity', name: 'APPLE INC' },
  ],
};

test('C: universe normalisation keeps every exclusion labelled', () => {
  const { eligible, excluded } = own.normalizeUniverse(
    [
      { ticker: 'MSFT', issuer: 'Microsoft', est: 2_500_003, share: 0.0479 },
      { ticker: 'SQ', issuer: 'Square', est: 40_501, share: 0.0008 },
      { ticker: 'AB', issuer: 'AllianceBernstein units', est: 8_250_004, share: 0.158 },
      { ticker: 'SPY', issuer: 'SPDR', est: 15_001 },
      { ticker: 'DUAL', issuer: 'Two classes' },
      { ticker: 'ZZZZ', issuer: 'Unknown' },
      { ticker: 'AAPL', issuer: 'Apple', est: 1001, share: 0 },
      { ticker: 'MSFT', issuer: 'Microsoft again' },
      { ticker: null, issuer: 'Treasury note' },
    ],
    MASTER,
  );
  assert.deepEqual(
    eligible.map((e) => e.ticker),
    ['MSFT', 'XYZ', 'AB', 'AAPL'],
  );
  assert.equal(eligible[1].disclosedTicker, 'SQ');
  assert.equal(eligible[2].partnership, true);
  assert.equal(eligible[3].floor, true);
  assert.equal(eligible[0].floor, false);
  const reasons = Object.fromEntries(excluded.map((x) => [x.ticker, x.reason]));
  assert.match(reasons.SPY, /not common equity/);
  assert.match(reasons.DUAL, /^ambiguous/);
  assert.match(reasons.ZZZZ, /^unmatched/);
  assert.ok(excluded.some((x) => x.ticker === null && /no ticker/.test(x.reason)));
});

/* ── D aggregation ────────────────────────────────────────────────────── */

const FIX = {
  filersNow: new Set(['A', 'B', 'C', 'D']),
  filersPrior: new Set(['A', 'B', 'C', 'E']),
  names: {
    A: { name: 'Alpha Capital', book: 1000 },
    B: { name: 'Beta Partners', book: 500 },
    C: { name: 'Gamma Funds', book: 100 },
    D: { name: 'Delta New Filer', book: 50 },
  },
  now: [
    { cusip: 'X1', cik: 'A', value_usd: 100, shares: 10 },
    { cusip: 'X1', cik: 'A', value_usd: 50, shares: 5 }, // second row, same filer
    { cusip: 'X1', cik: 'B', value_usd: 40, shares: 4 },
    { cusip: 'X1', cik: 'D', value_usd: 10, shares: 1 }, // D did not file last quarter
    { cusip: 'X2', cik: 'C', value_usd: 30, shares: 3 },
  ],
  prior: [
    { cusip: 'X1', cik: 'A', shares: 12 },
    { cusip: 'X1', cik: 'C', shares: 2 }, // C exited X1
    { cusip: 'X2', cik: 'E', shares: 9 }, // E did not file this quarter: not comparable
  ],
  cusips: ['X1', 'X2', 'X3'],
};

test('D: one count per CIK; changes only on comparable filers', () => {
  const rows = own.aggregateHoldings(FIX);
  const x1 = rows.find((r) => r.cusip === 'X1');
  assert.equal(x1.managers, 3);
  assert.equal(x1.value, 200);
  assert.equal(x1.shares, 20);
  assert.equal(x1.comparableNow, 2); // A and B (D is new to filing, not a new holder)
  assert.equal(x1.comparablePrior, 2); // A and C
  assert.equal(x1.newManagers, 1); // B
  assert.equal(x1.exitedManagers, 1); // C
  assert.equal(x1.top[0].name, 'Alpha Capital');
  assert.equal(x1.top[0].value, 150);
  assert.equal(x1.top[0].weight, 0.15);
  const x2 = rows.find((r) => r.cusip === 'X2');
  assert.equal(x2.comparablePrior, 0, 'E did not file this quarter, so it is not an exit');
  assert.equal(x2.exitedManagers, 0);
  assert.equal(x2.newManagers, 1);
  const x3 = rows.find((r) => r.cusip === 'X3');
  assert.equal(x3.managers, 0);
  assert.equal(x3.value, 0);
});

test('D: without a prior quarter the comparison fields are null, not zero', () => {
  const rows = own.aggregateHoldings({ ...FIX, prior: [], filersPrior: new Set() });
  assert.equal(rows[0].newManagers, null);
  assert.equal(rows[0].comparablePrior, null);
});

/* ── E ranking ────────────────────────────────────────────────────────── */

test('E: ties break on value, then CUSIP; unheld rows are unranked', () => {
  const rows = [
    { cusip: 'B', managers: 10, value: 5, comparableNow: 10, comparablePrior: 8 },
    { cusip: 'A', managers: 10, value: 5, comparableNow: 10, comparablePrior: 12 },
    { cusip: 'C', managers: 10, value: 9, comparableNow: 10, comparablePrior: null },
    { cusip: 'D', managers: 0, value: 0, comparableNow: 0, comparablePrior: 0 },
  ];
  assert.deepEqual(
    own.rankOwnership(rows, 'managers').map((r) => [r.cusip, r.rank]),
    [
      ['C', 1],
      ['A', 2],
      ['B', 3],
      ['D', null],
    ],
  );
  assert.deepEqual(
    own.rankOwnership(rows, 'change').map((r) => r.cusip),
    ['B', 'A', 'C', 'D'],
    'change ranks +2 over -2, and a missing prior sorts last',
  );
  assert.equal(own.rankOwnership(rows, 'nonsense')[0].cusip, 'C', 'unknown metric means managers');
  /* Stable under input order. */
  const again = own.rankOwnership([...rows].reverse(), 'managers').map((r) => r.cusip);
  assert.deepEqual(again, ['C', 'A', 'B', 'D']);
});

/* ── F benchmark (live, Q3 2026 against Q2 2026; 1,602 filings, 1,568 comparable filers) ── */

const LIVE = [
  ['MSFT', 'Microsoft', '594918104', 0.0479, 2500003, 1254, 1169.5e9, 1239, 1218, 45, 24],
  ['AAPL', 'Apple Inc.', '037833100', 0, 1001, 1243, 1417.59e9, 1229, 1224, 21, 16],
  ['AMZN', 'Amazon.com, Inc.', '023135106', 0, 1001, 1217, 728.04e9, 1202, 1193, 36, 27],
  ['NVDA', 'NVIDIA Corporation', '67066G104', 0.0895, 4675002, 1194, 1661.44e9, 1180, 1165, 42, 27],
  ['GOOGL', 'Alphabet Inc.', '02079K305', 0.0575, 3000001, 1128, 629.89e9, 1113, 1108, 35, 30],
  ['AVGO', 'Broadcom Inc.', '11135F101', 0.1149, 6000001, 915, 520.79e9, 901, 910, 35, 44],
  ['INTC', 'Intel Corporation', '458140100', 0.079, 4125001, 647, 176.28e9, 635, 658, 37, 60],
  ['CRWD', 'CrowdStrike Holdings', '22788C105', 0.0144, 750000, 517, 86.78e9, 507, 428, 100, 21],
  ['AB', 'AllianceBernstein Holding', '01881G106', 0.158, 8250004, 52, 0.07e9, 49, 49, 4, 4],
];
const liveResult = (metric = 'managers') => ({
  metric,
  subject: { name: 'Nancy Pelosi', kind: 'politician' },
  period: '2026-09-30',
  prior: '2026-06-30',
  coverage: { filers: 1590, comparable: 1568, ratio: 1590 / 1658, best: 1658 },
  universe: {
    total: 20,
    eligible: LIVE.length,
    excluded: 0,
    source: "Nancy Pelosi's estimated open positions",
  },
  excluded: [],
  rows: own.rankOwnership(
    LIVE.map(([ticker, issuer, cusip, weight, est, managers, value, cn, cp, nw, ex]) => ({
      ticker,
      issuer,
      cusip,
      weight,
      est,
      floor: est <= own.FLOOR_ESTIMATE,
      managers,
      value,
      comparableNow: cn,
      comparablePrior: cp,
      newManagers: nw,
      exitedManagers: ex,
    })),
    metric,
  ),
  limitations: own.OWNERSHIP_LIMITATIONS,
});

test('F: the benchmark answer names Microsoft first with 1,254 managers in Q3 2026', () => {
  const r = liveResult();
  assert.deepEqual(
    r.rows.slice(0, 4).map((x) => x.ticker),
    ['MSFT', 'AAPL', 'AMZN', 'NVDA'],
  );
  const ans = own.ownershipAnswer(r);
  assert.match(ans.text, /^Microsoft \(MSFT\) is the most widely held of Nancy Pelosi's stocks/);
  assert.match(ans.text, /1,254 distinct managers in Q3 2026/);
  assert.match(
    ans.text,
    /Apple Inc\. \(AAPL\) and Amazon\.com, Inc\. \(AMZN\) \(1,243 and 1,217\)/,
  );
});

test('F: floor positions are called out and the largest positions are compared', () => {
  const ans = own.ownershipAnswer(liveResult());
  const res = ans.findings.find((f) => f.title === 'Residual positions rank high');
  assert.ok(res, 'residual finding');
  assert.match(res.explanation, /\$1,001 disclosure floor/);
  assert.match(
    res.explanation,
    /NVIDIA Corporation \(NVDA\) is the most widely held \(1,194 managers/,
  );
  const gain = ans.findings.find((f) => f.title === 'Largest gain in managers');
  assert.match(gain.explanation, /CrowdStrike Holdings \(CRWD\): 100 comparable filers started/);
  assert.match(gain.explanation, /net \+79/);
  const drop = ans.findings.find((f) => f.title === 'Largest decline in managers');
  assert.match(drop.explanation, /Intel Corporation \(INTC\)/);
  assert.match(drop.explanation, /net -23/);
  const narrow = ans.findings.find((f) => f.title === 'Narrowest institutional base');
  assert.match(narrow.explanation, /AllianceBernstein Holding \(AB\) is reported by 52 managers/);
});

test('F: value ranking and wording never claim buying', () => {
  const r = liveResult('value');
  assert.equal(r.rows[0].ticker, 'NVDA');
  const ans = own.ownershipAnswer(r);
  assert.match(ans.text, /aggregate reported 13F value/);
  const said = `${ans.text} ${ans.findings.map((f) => f.explanation).join(' ')}`;
  assert.doesNotMatch(said, /\b(bought|buying|accumulat|conviction is|should buy|recommend)/i);
  const EM = String.fromCharCode(0x2014);
  assert.ok(!`${said} ${own.ownershipText(r)}`.includes(EM), 'no em dashes');
});

/* ── G states ─────────────────────────────────────────────────────────── */

test('G: unmatched, zero holders, partial coverage and prior unavailable stay distinct', () => {
  const states = own
    .ownershipStates({
      period: '2026-09-30',
      prior: null,
      coverage: { filers: 1590, ratio: 0.96 },
      excluded: [
        { ticker: 'ZZZZ', reason: 'unmatched: no CUSIP on file' },
        { ticker: 'DUAL', reason: 'ambiguous: more than one CUSIP for this ticker' },
        { ticker: 'SPY', reason: 'not common equity (ETP)' },
      ],
      rows: [{ ticker: 'TINY', managers: 0 }],
    })
    .map((s) => s.key);
  assert.deepEqual(states, ['unmatched', 'zero_holders', 'partial_coverage', 'prior_unavailable']);
  assert.equal(own.ownershipStates(null)[0].key, 'failed');
  assert.equal(own.ownershipStates({ failed: 'boom', rows: [] })[0].key, 'failed');
});

/* ── H server reads ───────────────────────────────────────────────────── */

/** A minimal Supabase stand-in over in-memory tables, counting reads. */
function mockAdmin(tables, { rpc = {} } = {}) {
  const calls = { from: {}, rpc: {} };
  const admin = {
    calls,
    rpc(name, args) {
      calls.rpc[name] = (calls.rpc[name] || 0) + 1;
      if (rpc[name]) return Promise.resolve(rpc[name](args));
      return Promise.resolve({
        data: null,
        error: { code: 'PGRST202', message: `Could not find the function public.${name}` },
      });
    },
    from(name) {
      calls.from[name] = (calls.from[name] || 0) + 1;
      const filters = [];
      let order = null;
      let lim = Infinity;
      let range = null;
      const b = {
        select: () => b,
        in: (col, vals) => (filters.push((r) => vals.includes(r[col])), b),
        eq: (col, v) => (filters.push((r) => r[col] === v), b),
        is: (col, v) => (filters.push((r) => (r[col] ?? null) === v), b),
        not: (col) => (filters.push((r) => r[col] != null), b),
        order: (col, o) => ((order = [col, o?.ascending !== false]), b),
        limit: (n) => ((lim = n), b),
        range: (a, z) => ((range = [a, z]), b),
        then(res, rej) {
          let rows = (tables[name] || []).filter((r) => filters.every((f) => f(r)));
          if (order)
            rows = [...rows].sort(
              (x, y) =>
                (x[order[0]] > y[order[0]] ? 1 : x[order[0]] < y[order[0]] ? -1 : 0) *
                (order[1] ? 1 : -1),
            );
          if (range) rows = rows.slice(range[0], range[1] + 1);
          rows = rows.slice(0, lim);
          return Promise.resolve({ data: rows, error: null }).then(res, rej);
        },
      };
      return b;
    },
  };
  return admin;
}

function bigFixture(nFilers = 2500) {
  const eff = [];
  const hold = [];
  let id = 1;
  const periods = ['2026-09-30', '2026-06-30', '2026-03-31'];
  const cusips = ['C1', 'C2', 'C3', 'C4'];
  for (const p of periods) {
    for (let f = 0; f < nFilers; f++) {
      if (p === '2026-06-30' && f % 50 === 0) continue; // 2% did not file last quarter
      const acc = `${p}-${String(f).padStart(5, '0')}`;
      eff.push({
        accession_no: acc,
        cik: `K${f}`,
        filer_name: `Filer ${f}`,
        book: 1e9,
        is_addon: false,
        period: p,
      });
      cusips.forEach((c, i) => {
        if ((f + i + (p === '2026-09-30' ? 0 : 1)) % (i + 2) !== 0) return;
        hold.push({
          id: id++,
          accession_no: acc,
          cusip: c,
          value_usd: 1000 * (i + 1),
          shares: 10,
          share_type: 'SH',
          put_call: null,
        });
        if (f % 97 === 0)
          hold.push({
            id: id++,
            accession_no: acc,
            cusip: c,
            value_usd: 1,
            shares: 1,
            share_type: 'SH',
            put_call: 'Call',
          });
      });
    }
  }
  return { eff, hold, cusips };
}

test('H: the paged read is bounded and does not grow with the number of securities', async () => {
  const fx = bigFixture();
  const universe = (ids) => ({
    eligible: ids.map((c) => ({ cusip: c, ticker: c, issuer: c, weight: 0.1, floor: false })),
    excluded: [],
    total: ids.length,
    source: 'fixture',
  });
  const a1 = mockAdmin({ sec_13f_effective_filings: fx.eff, sec_13f_holdings: fx.hold });
  const r2 = await srv.rankInstitutionalOwnershipForUniverse(a1, {
    universe: universe(['C1', 'C2']),
    today: TODAY,
  });
  const a2 = mockAdmin({ sec_13f_effective_filings: fx.eff, sec_13f_holdings: fx.hold });
  const r4 = await srv.rankInstitutionalOwnershipForUniverse(a2, {
    universe: universe(fx.cusips),
    today: new Date('2026-11-27T12:00:01Z'),
  });
  assert.equal(r2.period, '2026-09-30');
  assert.equal(r2.prior, '2026-06-30');
  assert.ok(r4.rows.every((r) => r.managers > 0));
  /* Option rows are excluded: C1 counts every second filer. */
  assert.equal(r4.rows.find((r) => r.cusip === 'C1').managers, 1250);
  const reads = (a) => a.calls.from.sec_13f_holdings;
  assert.ok(reads(a2) <= reads(a1) + 6, `holdings reads ${reads(a1)} vs ${reads(a2)}`);
  assert.ok(reads(a2) < 400, 'bounded by accession chunks, not by securities');
  assert.equal(r4.coverage.comparable, 2450);
  assert.ok(r4.trend && r4.trend.periods.length === 3);
});

test('H: the database function and the paged read give the same figures', async () => {
  const fx = bigFixture(300);
  const cusips = fx.cusips;
  const universe = {
    eligible: cusips.map((c) => ({ cusip: c, ticker: c, issuer: c })),
    excluded: [],
    total: 4,
    source: 'fixture',
  };
  const paged = await srv.rankInstitutionalOwnershipForUniverse(
    mockAdmin({ sec_13f_effective_filings: fx.eff, sec_13f_holdings: fx.hold }),
    { universe, today: new Date('2026-11-27T13:00:00Z') },
  );
  /* The function's answer, built from the same rows the SQL would aggregate. */
  const toDb = (r) => ({
    cusip: r.cusip,
    managers: r.managers,
    value_usd: r.value,
    shares: r.shares,
    comparable_now: r.comparableNow,
    comparable_prior: r.comparablePrior,
    new_managers: r.newManagers,
    exited_managers: r.exitedManagers,
    shares_now_cmp: r.sharesNowCmp,
    shares_prior_cmp: r.sharesPriorCmp,
    top: r.top.map((t) => ({
      cik: t.cik,
      filer_name: t.name,
      value_usd: t.value,
      shares: t.shares,
      weight: t.weight,
      prior_shares: t.priorShares,
      comparable: t.comparable,
    })),
  });
  const viaFn = await srv.rankInstitutionalOwnershipForUniverse(
    mockAdmin(
      { sec_13f_effective_filings: fx.eff, sec_13f_holdings: [] },
      {
        rpc: {
          sonar_13f_ownership: () => ({
            data: { comparable_filers: paged.coverage.comparable, rows: paged.rows.map(toDb) },
            error: null,
          }),
        },
      },
    ),
    { universe, today: new Date('2026-11-27T13:00:01Z') },
  );
  const pick = (r) => r.rows.map((x) => [x.cusip, x.rank, x.managers, x.value, x.change]);
  assert.deepEqual(pick(viaFn), pick(paged));
});

/* ── I fulfillment ────────────────────────────────────────────────────── */

const composition = () => {
  const o = liveResult();
  return {
    subject: { name: 'Nancy Pelosi', kind: 'politician' },
    plan: [
      { id: 'analysis:institutional-ownership', label: 'Run institutional-ownership', deps: [] },
    ],
    failedTasks: [],
    results: [
      {
        key: 'institutional-ownership',
        capability: 'institutional-ownership',
        status: 'done',
        title: 'Institutional Ownership Analysis',
        coverage: { selected: 9, withData: 9, complete: 9 },
        ownership: { ...o, states: own.ownershipStates(o) },
        limitations: o.limitations,
        text: own.ownershipText(o),
      },
    ],
  };
};

test('I: the computed answer leads, the writer is told to answer directly', () => {
  const c = composition();
  const f = ful.fulfillmentContract(c);
  assert.equal(f.state, 'complete');
  assert.match(f.objectives[0].detail, /9 of 9 holdings reported by 13F managers, Q3 2026/);
  const block = ful.fulfillmentBlock(f, c);
  assert.match(block, /name the holdings most widely held by 13F reporting managers/);
  assert.match(block, /not conviction/);
  const d = ful.deterministicAnswer(c, f, {});
  assert.match(d.executiveConclusion.text, /^Microsoft \(MSFT\)/);
  assert.ok(d.keyFindings.length >= 3);
  const ev = ful.compositionEvidence(c);
  assert.ok(ev[0].title.startsWith('Institutional ownership ranking, 13F Q3 2026'));
  assert.ok(ev.some((e) => e.data?.ticker === 'MSFT'));
});

test('I: a profile answer that skips the ranking fails the completion check', () => {
  const c = composition();
  assert.equal(
    ful.answerCovers(
      {
        executiveConclusion: {
          text: 'Nancy Pelosi is a Democratic member of the House who trades often.',
        },
      },
      c,
    ),
    false,
  );
  assert.equal(
    ful.answerCovers(
      {
        executiveConclusion: { text: 'MSFT is held by the most 13F managers (1,254) in Q3 2026.' },
      },
      c,
    ),
    true,
  );
});

test('I: the client payload is typed and complete', () => {
  const c = composition();
  const p = ful.clientComposition(c, ful.fulfillmentContract(c));
  const a = p.analyses[0];
  assert.equal(a.capability, 'institutional-ownership');
  assert.equal(a.ownership.period, '2026-09-30');
  assert.equal(a.ownership.rows[0].ticker, 'MSFT');
  assert.equal(typeof a.ownership.answer.text, 'string');
  assert.ok(Array.isArray(a.ownership.limitations) && a.ownership.limitations.length >= 4);
});

/* ── J registry ───────────────────────────────────────────────────────── */

test('J: subjects, validation and deep qualification', () => {
  const ok = reg.makeAnalysis('institutional-ownership', {
    subject: { text: 'Nancy Pelosi', kind: 'politician', id: 'P000197', name: 'Nancy Pelosi' },
  });
  assert.equal(ok.status, 'supported');
  assert.match(reg.relationText(ok), /distinct 13F reporting managers/);
  const co = reg.makeAnalysis('institutional-ownership', {
    subject: { text: 'NVDA', kind: 'company', id: 'NVDA', name: 'NVIDIA' },
  });
  assert.equal(co.status, 'unsupported');
  const bad = reg.makeAnalysis('institutional-ownership', {
    subject: { text: 'Nancy Pelosi', kind: 'politician', id: 'P000197' },
    params: { top_n: 80 },
  });
  assert.equal(bad.status, 'validation_error');
  assert.equal(
    reg.deepQualification([
      ok,
      reg.makeAnalysis('fundamental-analysis', { subject: ok.subject }),
      reg.makeAnalysis('backtesting', { subject: ok.subject }),
    ]).qualifies,
    true,
  );
});
