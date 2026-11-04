/**
 * Sonar politician pings (Nov 4): "What has Nancy Pelosi been buying
 * lately?" resolves to the member however long the ping is, and the member's
 * disclosures become the brief's evidence and the Sourced matches rows.
 *   npm run test:sonar-politician
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

const {
  nameTokens,
  resolvePolitician,
  resolvePoliticianById,
  rangeLabel,
  groupTrades,
  politicianEvidence,
} = await import('@/lib/sonar/landing-politician');

/* A tiny stand-in for the Supabase client: every chain resolves to the rows
   registered for its table, filtered by eq/ilike/in. */
function fakeAdmin(tables) {
  return {
    from(table) {
      let rows = [...(tables[table] || [])];
      const q = {
        select: () => q,
        eq: (col, v) => ((rows = rows.filter((r) => r[col] === v)), q),
        in: (col, vs) => ((rows = rows.filter((r) => vs.includes(r[col]))), q),
        ilike: (col, pat) => {
          const needle = pat.replace(/%/g, '').toLowerCase();
          rows = rows.filter((r) =>
            String(r[col] || '')
              .toLowerCase()
              .includes(needle),
          );
          return q;
        },
        limit: () => q,
        order: () => q,
        maybeSingle: () => Promise.resolve({ data: rows[0] || null, error: null }),
        then: (res, rej) => Promise.resolve({ data: rows, error: null }).then(res, rej),
      };
      return q;
    },
  };
}
const PELOSI = {
  bioguide_id: 'P000197',
  full_name: 'Nancy Pelosi',
  first_name: 'Nancy',
  last_name: 'Pelosi',
  party: 'D',
  chamber: 'house',
  state: 'CA',
  in_office: true,
};
const admin = fakeAdmin({
  congress_members: [PELOSI],
  congress_trades: [{ bioguide_id: 'P000197' }],
});

test('question framing is not part of a name', () => {
  assert.deepEqual(nameTokens('What has Nancy Pelosi been buying lately?'), ['nancy', 'pelosi']);
  assert.deepEqual(nameTokens("Pelosi's latest stock trades"), ['pelosi']);
  assert.deepEqual(nameTokens('Show me Senator Tuberville holdings'), ['tuberville']);
});

test('a long question about a member resolves to the member', async () => {
  const m = await resolvePolitician('What has Nancy Pelosi been buying lately?', admin);
  assert.equal(m?.bioguideId, 'P000197');
  assert.equal(m?.chamberLabel, 'House');
});

test('the understanding layer id resolves without a name match', async () => {
  const m = await resolvePoliticianById('bioguide:P000197', admin);
  assert.equal(m?.name, 'Nancy Pelosi');
  assert.equal(m?.hasTrades, true);
  assert.equal(await resolvePoliticianById('bioguide:nope', admin), null);
});

test('STOCK Act bands read as ranges, never one figure', () => {
  assert.equal(rangeLabel(500001, 1000000), '$500K–$1M');
  assert.equal(rangeLabel(1001, 15000), '$1K–$15K');
  assert.equal(rangeLabel(1000001, 5000000, { sep: ' to ' }), '$1M to $5M');
  assert.equal(rangeLabel(50000001, null), '$50M+');
});

const trades = [
  {
    type: 'purchase',
    transaction_date: '2026-07-24',
    ticker: 'BE',
    asset_name: 'Bloom Energy Corporation Class A Common Stock',
    amount_min: 1000001,
    amount_max: 5000000,
    amount_mid: 3000000.5,
  },
  {
    type: 'purchase',
    transaction_date: '2026-07-28',
    ticker: 'BE',
    asset_name: 'Bloom Energy Corporation Class A Common Stock',
    amount_min: 500001,
    amount_max: 1000000,
    amount_mid: 750000.5,
  },
  {
    type: 'purchase',
    transaction_date: '2026-05-29',
    ticker: 'UBER',
    asset_name: 'Uber Technologies, Inc. Common Stock',
    amount_min: 500001,
    amount_max: 1000000,
    amount_mid: 750000.5,
  },
];

test('the past year groups by position, largest first', () => {
  const g = groupTrades(trades);
  assert.equal(g[0].ticker, 'BE');
  assert.equal(g[0].count, 2);
  assert.equal(g[0].last, '2026-07-28');
  assert.equal(g[0].range, '$1.5M–$6M');
  assert.equal(g[0].company, 'Bloom Energy Corporation');
  assert.equal(g[1].ticker, 'UBER');
});

test('the dossier becomes congress evidence the brief can cite', () => {
  const ev = politicianEvidence({
    kind: 'politician',
    name: 'Nancy Pelosi',
    party: 'D',
    state: 'CA',
    chamber: 'House',
    stats: { trades12m: 3, lastTrade: '2026-07-28', estValue: 52212536, openPositions: 29 },
    holdings: [{ ticker: 'AB', share: 0.158 }],
    buys12m: groupTrades(trades),
    sells12m: [],
    recentTrades: [
      {
        date: '2026-07-28',
        type: 'purchase',
        member: 'BE',
        company: 'Bloom Energy',
        min: 500001,
        max: 1000000,
      },
    ],
    committees: [],
    overseen: null,
    similar: [{ name: 'Ro Khanna', shared: ['NVDA'] }],
  });
  assert.ok(ev.length >= 5);
  assert.ok(ev.every((e) => e.corpus === 'congress'));
  const text = ev.map((e) => e.snippet).join(' ');
  assert.match(text, /BE \(Bloom Energy Corporation\): 2 trades, \$1\.5M to \$6M disclosed/);
  assert.match(text, /no current committee seats/);
  assert.match(text, /no market prices applied/);
  assert.doesNotMatch(text, /[—–]/, 'prose ranges, no dashes');
});
