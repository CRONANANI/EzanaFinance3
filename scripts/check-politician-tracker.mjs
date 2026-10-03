/**
 * Unit tests for the Politician Tracker model (pure functions, no React).
 * No test runner is configured; run directly:  node scripts/check-politician-tracker.mjs
 * (also `npm run test:tracker`).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildMembers,
  rankMembers,
  loadedWindow,
  filterMembers,
  topTickers,
  seatLabel,
  usdShort,
  mergeServerRankings,
  serverWindow,
  mostHeldTickers,
} from '../src/lib/politicians/tracker-model.js';
import {
  chamberStats as chamberStatsAll,
  periodMeta,
  PERIODS,
  rankMembers as rankAll,
} from '../src/lib/politicians/tracker-model.js';
import { buildFixtureTrades } from '../src/lib/politicians/tracker-fixture.js';

const t = (over) => ({
  id: over.id,
  name: over.name,
  chamber: over.chamber || 'House',
  party: over.party || 'D',
  state: over.state || 'CA',
  district: over.district ?? 12,
  bioguideId: over.bioguideId || over.name,
  ticker: over.ticker ?? 'NVDA',
  side: over.side || 'purchase',
  amountBand: { raw: '', min: over.mid, max: over.mid, mid: over.mid ?? 1000 },
  tradedAt: over.tradedAt || '2026-09-01',
  filedAt: over.tradedAt || '2026-09-01',
  sourceUrl: null,
});

const TRADES = [
  t({ id: 1, name: 'A', mid: 5000, tradedAt: '2026-09-10' }),
  t({ id: 2, name: 'A', mid: 5000, tradedAt: '2026-08-01', side: 'sale', ticker: 'AAPL' }),
  t({
    id: 3,
    name: 'B',
    mid: 20000,
    tradedAt: '2026-09-20',
    chamber: 'Senate',
    party: 'R',
    state: 'TX',
    district: null,
  }),
  t({ id: 4, name: 'C', mid: 100, tradedAt: '2026-07-01', ticker: null, party: 'I' }),
  t({ id: 5, name: 'C', mid: 100, tradedAt: '2026-07-02', ticker: 'NVDA' }),
  t({ id: 6, name: 'C', mid: 100, tradedAt: '2026-07-03', ticker: 'MSFT' }),
];
const MEMBERS = buildMembers(TRADES);

test('rankMembers: volume is the default and rank follows the sort', () => {
  const r = rankMembers(MEMBERS);
  assert.deepEqual(
    r.map((m) => [m.rank, m.name, m.pctOfFirst]),
    [
      [1, 'B', 100],
      [2, 'A', 50],
      [3, 'C', 2],
    ],
  );
  assert.equal(rankMembers(MEMBERS, 'trades')[0].name, 'C');
  assert.equal(rankMembers(MEMBERS, 'latest')[0].name, 'B');
  assert.equal(rankMembers(MEMBERS, 'nonsense')[0].name, 'B', 'unknown key falls back to volume');
});

test('rankMembers: pctOfFirst is null when the first has no volume', () => {
  const zero = buildMembers([t({ id: 1, name: 'Z', mid: 0 })]);
  assert.equal(rankMembers(zero)[0].pctOfFirst, null);
});

test('rankMembers: does not mutate its input', () => {
  const before = MEMBERS.map((m) => m.name).join();
  rankMembers(MEMBERS, 'trades');
  assert.equal(MEMBERS.map((m) => m.name).join(), before);
});

test('loadedWindow: min and max tradedAt with a count; null when empty', () => {
  assert.deepEqual(loadedWindow(TRADES), { from: '2026-07-01', to: '2026-09-20', count: 6 });
  assert.equal(loadedWindow([]), null);
  assert.equal(loadedWindow([t({ id: 9, name: 'X', tradedAt: 'garbage' })]), null);
});

test('filterMembers: chamber, party, side and query compose', () => {
  assert.deepEqual(
    filterMembers(MEMBERS, { chamber: 'Senate' }).map((m) => m.name),
    ['B'],
  );
  assert.deepEqual(
    filterMembers(MEMBERS, { party: 'I' }).map((m) => m.name),
    ['C'],
  );
  assert.deepEqual(
    filterMembers(MEMBERS, { side: 'sale' }).map((m) => m.name),
    ['A'],
  );
  assert.deepEqual(
    filterMembers(MEMBERS, { query: 'tx' }).map((m) => m.name),
    ['B'],
  );
  assert.deepEqual(filterMembers(MEMBERS, { chamber: 'House', party: 'R' }), []);
  assert.equal(filterMembers(MEMBERS).length, 3);
});

test('topTickers: counts, excludes null tickers, stable order on ties', () => {
  assert.deepEqual(topTickers(TRADES, 5), [
    { ticker: 'NVDA', count: 4 },
    { ticker: 'AAPL', count: 1 },
    { ticker: 'MSFT', count: 1 },
  ]);
  assert.equal(topTickers(TRADES, 1).length, 1);
});

test('seatLabel: CA-12 for House, state for Senate, null when unknown', () => {
  assert.equal(seatLabel({ chamber: 'House', state: 'CA', district: 12 }), 'CA-12');
  assert.equal(seatLabel({ chamber: 'House', state: 'IL', district: 7 }), 'IL-07');
  assert.equal(seatLabel({ chamber: 'Senate', state: 'TX', district: null }), 'TX');
  assert.equal(seatLabel({ chamber: 'House', state: null }), null);
});

test('usdShort: middle dot for nothing, short units otherwise', () => {
  assert.equal(usdShort(0), '·');
  assert.equal(usdShort(null), '·');
  assert.equal(usdShort(4_800_000), '$4.8M');
  assert.equal(usdShort(610_000), '$610K');
});

test('fixture: placeholder names only, sixteen members, matches the spec table', () => {
  const trades = buildFixtureTrades();
  assert.ok(trades.every((x) => x.name === '[Member name]'));
  const members = rankMembers(buildMembers(trades));
  assert.equal(members.length, 16);
  assert.equal(members[0].count, 42);
  assert.equal(members[0].buys, 26);
  assert.equal(members[0].sells, 16);
  assert.equal(usdShort(members[0].volume), '$4.8M');
  assert.equal(members[0].lastTraded, '2026-09-24');
  assert.equal(members[15].state, 'MT');
});

test('member slugs are unique, so every card opens its own panel', () => {
  const members = buildMembers(buildFixtureTrades());
  const slugs = members.map((m) => m.slug);
  assert.equal(new Set(slugs).size, slugs.length);
  /* Distinct real names keep their plain slug. */
  const plain = buildMembers(TRADES).map((m) => m.slug);
  assert.ok(plain.includes('a'));
});

test('mergeServerRankings keeps SQL aggregates, loaded trades and slugs', () => {
  const local = buildMembers([
    t({ id: 'a', name: 'Jane Roe', bioguideId: 'R000001', mid: 1000 }),
    t({ id: 'b', name: 'Jane Roe', bioguideId: 'R000001', mid: 3000, ticker: 'AAPL' }),
  ]);
  const merged = mergeServerRankings(local, [
    {
      bioguideId: 'R000001',
      name: 'Jane Roe',
      chamber: 'House',
      count: 40,
      buys: 30,
      sells: 10,
      volume: 900000,
      lastTraded: '2026-09-20',
      topTickers: ['NVDA'],
      photoUrl: 'https://x.supabase.co/storage/v1/object/public/congress-photos/R000001.jpg',
    },
    {
      bioguideId: 'R000002',
      name: 'Jane Roe',
      chamber: 'Senate',
      party: 'R',
      state: 'TX',
      count: 5,
      buys: 5,
      sells: 0,
      volume: 50000,
      lastTraded: '2026-08-01',
      topTickers: ['MSFT', 'AAPL'],
    },
  ]);
  assert.equal(merged.length, 2);
  assert.equal(merged[0].slug, local[0].slug);
  assert.equal(merged[0].count, 40);
  assert.equal(merged[0].trades.length, 2);
  assert.match(merged[0].photoUrl, /congress-photos/);
  assert.notEqual(merged[1].slug, merged[0].slug);
  assert.deepEqual(merged[1].trades, []);
  assert.deepEqual([...merged[1].tickerSet], ['MSFT', 'AAPL']);
  const ranked = rankMembers(merged, 'volume');
  assert.equal(ranked[0].bioguideId, 'R000001');
  const w = serverWindow(merged, 365, new Date('2026-09-30T00:00:00Z'));
  assert.deepEqual(w, { from: '2025-09-30', to: '2026-09-20', count: 45 });
});

test('mostHeldTickers counts members whose latest action leaves the position open', () => {
  const row = (id, name, ticker, side, tradedAt, sideRaw) => ({
    ...t({ id, name, bioguideId: name, ticker, side, tradedAt }),
    sideRaw: sideRaw || (side === 'purchase' ? 'Purchase' : 'Sale (Full)'),
  });
  const held = mostHeldTickers([
    row('1', 'A', 'NVDA', 'purchase', '2026-01-01'),
    row('2', 'B', 'NVDA', 'purchase', '2026-01-02'),
    row('3', 'B', 'NVDA', 'sale', '2026-03-01', 'Sale (Partial)'),
    row('4', 'C', 'NVDA', 'purchase', '2026-01-01'),
    row('5', 'C', 'NVDA', 'sale', '2026-02-01'),
    row('6', 'D', 'AAPL', 'sale', '2026-02-01'),
    row('7', 'A', 'MSFT', 'purchase', '2026-02-01'),
  ]);
  assert.deepEqual(held, [
    { ticker: 'NVDA', holders: 2, buys: 2, company: null },
    { ticker: 'MSFT', holders: 1, buys: 1, company: null },
  ]);
});

test('members with no trades in the period rank after every trader, unranked', () => {
  const quiet = {
    key: 'q',
    name: 'Aaron Quiet',
    chamber: 'House',
    count: 0,
    buys: 0,
    sells: 0,
    volume: 0,
    lastTraded: null,
  };
  const busy = {
    key: 'b',
    name: 'Zed Busy',
    chamber: 'House',
    count: 3,
    buys: 2,
    sells: 1,
    volume: 0,
    lastTraded: '2026-09-01',
  };
  for (const sort of ['volume', 'trades', 'latest']) {
    const r = rankAll([quiet, busy], sort);
    assert.equal(r[0].key, 'b', sort);
    assert.equal(r[0].rank, 1);
    assert.equal(r[1].rank, null, 'no rank without a trade');
  }
});

test('chamber stats count active members only', () => {
  const s = chamberStatsAll([
    { chamber: 'House', count: 4, buys: 3, sells: 1, volume: 10 },
    { chamber: 'House', count: 0, buys: 0, sells: 0, volume: 0 },
  ]);
  assert.equal(s.House.members, 1);
  assert.equal(s.House.perMember, 4);
  assert.equal(s.Senate.members, 0);
});

test('periods: 1Y is the default and unknown values fall back to it', () => {
  assert.deepEqual(
    PERIODS.map((p) => p.value),
    ['30d', '90d', '6m', '1y', '2y', 'all'],
  );
  assert.equal(periodMeta('nope').days, 365);
  assert.equal(periodMeta('30d').days, 30);
});

test('companyLabel: disclosure asset names to short company names', async () => {
  const { companyLabel } = await import('../src/lib/politicians/tracker-model.js');
  assert.equal(companyLabel('Amazon.com, Inc.'), 'Amazon.com');
  assert.equal(companyLabel('NVIDIA Corporation - Common Stock'), 'NVIDIA');
  assert.equal(companyLabel('Alphabet Inc. - Class C Capital Stock'), 'Alphabet');
  assert.equal(companyLabel('Berkshire Hathaway Inc. New'), 'Berkshire Hathaway');
  assert.equal(companyLabel('JP Morgan Chase & Co.'), 'JP Morgan Chase');
  assert.equal(companyLabel('Johnson & Johnson'), 'Johnson & Johnson');
  assert.equal(companyLabel('The Home Depot, Inc.'), 'Home Depot');
  assert.equal(companyLabel('AllianceBernstein Holding l.P. units'), 'AllianceBernstein Holding');
  assert.equal(companyLabel(null), '');
});

test('mostHeldTickers: share classes of one company are one holding', async () => {
  const { mostHeldTickers } = await import('../src/lib/politicians/tracker-model.js');
  const t = (bioguideId, ticker, tradedAt) => ({
    bioguideId,
    ticker,
    side: 'purchase',
    sideRaw: 'Purchase',
    tradedAt,
    assetName: 'Alphabet Inc. - Class A Common Stock',
  });
  const out = mostHeldTickers(
    [
      t('A000001', 'GOOG', '2025-01-02'),
      t('A000001', 'GOOGL', '2025-02-02'),
      t('B000002', 'GOOG', '2025-03-02'),
    ],
    10,
  );
  assert.equal(out.length, 1);
  assert.equal(out[0].ticker, 'GOOGL');
  assert.equal(out[0].holders, 2);
  assert.equal(out[0].company, 'Alphabet Inc. - Class A Common Stock');
});
