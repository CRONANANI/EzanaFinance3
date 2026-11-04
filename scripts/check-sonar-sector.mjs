/**
 * Sonar sector screens (Nov 4): "Which defense stocks are members of Congress
 * trading?" is a sector screen (Congress trading, best performers, contract
 * recipients), never the ticker ARE.
 *   npm run test:sonar-sector
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

const { understandDeterministic } = await import('@/lib/sonar/understand');
const {
  summarizeCongress,
  summarizeContracts,
  rankPerformance,
  panelOrder,
  sectorEvidence,
  buildSectorScreen,
  federalFy,
} = await import('@/lib/sonar/sector-screen');

test('a lower-case "are" after "stocks" is not the ticker ARE', () => {
  const u = understandDeterministic('Which defense stocks are members of Congress trading?');
  assert.equal(u.intent, 'sector_screen');
  assert.equal(u.display, 'Defense stocks members of Congress are trading');
  assert.ok(!u.entities.some((e) => e.kind === 'ticker'), 'no ticker entity');
  assert.ok(
    !understandDeterministic('stocks are up today').entities.some((e) => e.kind === 'ticker'),
  );
  assert.equal(understandDeterministic('$are price').entities[0]?.id, 'ARE', '$ still cues it');
  assert.equal(understandDeterministic('aapl').intent, 'ticker_lookup');
});

test('contracts and performance pings are sector screens too; a bare industry is not', () => {
  assert.equal(
    understandDeterministic('which defense companies get the most pentagon contracts').intent,
    'sector_screen',
  );
  assert.equal(understandDeterministic('best performing defense stocks').intent, 'sector_screen');
  assert.equal(understandDeterministic('defense industry').intent, 'industry_layout');
  assert.equal(understandDeterministic('what has nancy pelosi been buying').intent, 'politician');
});

test('panels follow the order the ping asks in', () => {
  assert.deepEqual(panelOrder('Which defense stocks are members of Congress trading?'), [
    'congress',
    'performance',
    'contracts',
  ]);
  assert.deepEqual(panelOrder('top contract winners and best performers in defense'), [
    'contracts',
    'performance',
    'congress',
  ]);
});

const now = new Date('2026-11-04T12:00:00Z');
const trades = [
  {
    bioguide_id: 'A1',
    ticker: 'LMT',
    type: 'purchase',
    transaction_date: '2026-09-23',
    amount_min: 1001,
    amount_max: 15000,
  },
  {
    bioguide_id: 'A1',
    ticker: 'GD',
    type: 'sale_partial',
    transaction_date: '2026-06-10',
    amount_min: 15001,
    amount_max: 50000,
  },
  {
    bioguide_id: 'B2',
    ticker: 'LMT',
    type: 'sale',
    transaction_date: '2026-03-02',
    amount_min: 1001,
    amount_max: 15000,
  },
  {
    bioguide_id: 'B2',
    ticker: 'LMT',
    type: 'purchase',
    transaction_date: '2026-09-01',
    amount_min: 50001,
    amount_max: 100000,
  },
];
const members = new Map([
  ['A1', { full_name: 'Ro Khanna', party: 'D', state: 'CA' }],
  ['B2', { full_name: 'Dan Crenshaw', party: 'R', state: 'TX' }],
]);

test('congressional trades summarise by stock, member and month', () => {
  const c = summarizeCongress(trades, members, {
    names: new Map([['LMT', 'Lockheed Martin']]),
    now,
  });
  assert.equal(c.total, 4);
  assert.equal(c.buys, 2);
  assert.equal(c.sells, 2);
  assert.equal(c.memberCount, 2);
  assert.equal(c.byTicker[0].ticker, 'LMT');
  assert.equal(c.byTicker[0].trades, 3);
  assert.equal(c.byTicker[0].members, 2);
  assert.equal(c.byTicker[0].name, 'Lockheed Martin');
  assert.equal(c.monthly.length, 12);
  assert.equal(c.monthly.at(-1).month, '2026-11');
  assert.equal(c.monthly.find((m) => m.month === '2026-09').buys, 2);
  assert.equal(c.latest[0].member, 'Ro Khanna');
  assert.equal(c.latest[0].range, '$1K–$15K');
});

test('contracts rank by the last complete fiscal year when the latest is partial', () => {
  assert.equal(federalFy(now), 2027);
  const k = summarizeContracts(
    [
      { ticker: 'LMT', fiscal_year: 2025, total_amount: 60e9, award_count: 900 },
      { ticker: 'LMT', fiscal_year: 2026, total_amount: 30e9, award_count: 400 },
      { ticker: 'GD', fiscal_year: 2025, total_amount: 25e9, award_count: 500 },
      { ticker: 'GD', fiscal_year: 2026, total_amount: 31e9, award_count: 300 },
    ],
    { now },
  );
  assert.equal(k.latestFy, 2026);
  assert.equal(k.latestComplete, false);
  assert.equal(k.rankBy, 'prior');
  assert.deepEqual(
    k.rows.map((r) => r.ticker),
    ['LMT', 'GD'],
  );
});

test('performance ranks by year to date, best first', () => {
  const r = rankPerformance([
    { ticker: 'A', ytd: 5, y1: 10 },
    { ticker: 'B', ytd: 40, y1: 2 },
    { ticker: 'C', ytd: null, y1: 20 },
    { ticker: 'D', ytd: null, y1: null },
  ]);
  assert.deepEqual(
    r.map((x) => x.ticker),
    ['B', 'C', 'A'],
  );
  assert.equal(r[1].basis, '1y');
});

/* A stand-in for the Supabase client. */
function fakeAdmin(tables) {
  return {
    from(table) {
      let rows = [...(tables[table] || [])];
      const q = {
        select: () => q,
        eq: (c, v) => ((rows = rows.filter((r) => r[c] === v)), q),
        in: (c, vs) => ((rows = rows.filter((r) => vs.includes(r[c]))), q),
        gte: (c, v) => ((rows = rows.filter((r) => r[c] >= v)), q),
        order: () => q,
        limit: () => q,
        then: (res, rej) => Promise.resolve({ data: rows, error: null }).then(res, rej),
      };
      return q;
    },
  };
}

test('the screen builds from the datasets and becomes evidence', async () => {
  const admin = fakeAdmin({
    congress_trades: trades,
    congress_members: [
      { bioguide_id: 'A1', full_name: 'Ro Khanna', party: 'D', state: 'CA' },
      { bioguide_id: 'B2', full_name: 'Dan Crenshaw', party: 'R', state: 'TX' },
    ],
    company_contract_history: [
      {
        ticker: 'LMT',
        fiscal_year: 2025,
        total_amount: 60e9,
        award_count: 9,
        awarding_agency: 'Department of Defense',
      },
      {
        ticker: 'LMT',
        fiscal_year: 2025,
        total_amount: 9e9,
        award_count: 9,
        awarding_agency: 'National Aeronautics and Space Administration',
      },
      {
        ticker: 'GD',
        fiscal_year: 2025,
        total_amount: 25e9,
        award_count: 5,
        awarding_agency: 'Department of Defense',
      },
    ],
  });
  const s = await buildSectorScreen({
    industryId: 'aerospace_defense',
    query: 'Which defense stocks are members of Congress trading?',
    admin,
    now,
    ms: 1500,
  });
  assert.equal(s.kind, 'sector');
  assert.equal(s.industry.label, 'Defense');
  assert.equal(s.congress.total, 4);
  assert.equal(s.contracts.rows[0].ticker, 'LMT');
  assert.equal(s.contracts.rows[0].latest, 60e9, 'DoD only, NASA excluded');
  assert.equal(s.matches.congress[0].type, 'purchase LMT');
  assert.equal(s.matches.sectorMembers[0].name, 'Ro Khanna');
  const ev = sectorEvidence(s);
  assert.equal(ev[0].corpus, 'congress', 'congress leads for a congress ping');
  const text = ev.map((e) => e.snippet).join(' ');
  assert.match(text, /4 trades in defense stocks/);
  assert.match(text, /Department of Defense contract obligations/);
  assert.doesNotMatch(text, /[—–]/);
});
