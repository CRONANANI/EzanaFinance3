#!/usr/bin/env node
/* Committee Assignments page model (src/lib/congress/committees-page-model.js).
   Pure-function contract from docs/design/committees-handoff/06-DATA.md.
   Usage: node --no-warnings --test scripts/check-committees-page.mjs */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  HOLDINGS_FOOTNOTE,
  HOLDINGS_LABEL,
  TRADE_FOOTNOTE,
  atlasSizeClass,
  hearingsAvailable,
  heatScale,
  mappingNote,
  mostSeated,
  oversightLinks,
  rangeDotSize,
  seatHistogram,
  seatSplit,
  timelineLayout,
  tradeSide,
  tradeSummary,
} from '../src/lib/congress/committees-page-model.js';

test('seatSplit: weights and percents, zero minority, null-safe', () => {
  assert.deepEqual(seatSplit(32, 27), {
    majority: 32,
    minority: 27,
    total: 59,
    majorityPct: 54,
    minorityPct: 46,
  });
  // zero minority seats stays an honest zero, not NaN
  assert.deepEqual(seatSplit(9, 0), {
    majority: 9,
    minority: 0,
    total: 9,
    majorityPct: 100,
    minorityPct: 0,
  });
  assert.deepEqual(seatSplit(null, undefined), {
    majority: 0,
    minority: 0,
    total: 0,
    majorityPct: 0,
    minorityPct: 0,
  });
  assert.equal(seatSplit('32', '27').total, 59);
});

test('atlasSizeClass: lg at 55+, md at 35+, else sm', () => {
  assert.equal(atlasSizeClass(62), 'lg');
  assert.equal(atlasSizeClass(55), 'lg');
  assert.equal(atlasSizeClass(54), 'md');
  assert.equal(atlasSizeClass(35), 'md');
  assert.equal(atlasSizeClass(34), 'sm');
  assert.equal(atlasSizeClass(0), 'sm');
  assert.equal(atlasSizeClass(null), 'sm');
});

test('seatHistogram: buckets 1..9 and 10+, summing to the member count', () => {
  const members = [
    { seatCount: 1 },
    { seatCount: 1 },
    { seatCount: 4 },
    { seatCount: 9 },
    { seatCount: 10 },
    { seatCount: 13 }, // a member with 10+ seats lands in the last bucket
    { seatCount: 0 }, // a listed member holds at least one seat
  ];
  const buckets = seatHistogram(members);
  assert.equal(buckets.length, 10);
  assert.deepEqual(
    buckets.map((b) => b.label),
    ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10+'],
  );
  assert.equal(buckets[0].count, 3);
  assert.equal(buckets[3].count, 1);
  assert.equal(buckets[8].count, 1);
  assert.equal(buckets[9].count, 2);
  assert.equal(
    buckets.reduce((s, b) => s + b.count, 0),
    members.length,
  );
  assert.equal(
    seatHistogram([]).reduce((s, b) => s + b.count, 0),
    0,
  );
});

test('mostSeated: seat count desc, ties by name, top n', () => {
  const members = [
    { name: 'B', seatCount: 6 },
    { name: 'A', seatCount: 6 },
    { name: 'C', seatCount: 11 },
    { name: 'D', seatCount: 2 },
  ];
  assert.deepEqual(
    mostSeated(members, 3).map((m) => m.name),
    ['C', 'A', 'B'],
  );
  assert.equal(mostSeated(members).length, 4);
  assert.deepEqual(mostSeated(null), []);
});

test('oversightLinks: committees, per-sector counts, one link per pair', () => {
  const committees = [
    {
      thomasId: 'HSIF',
      shortName: 'Energy and Commerce',
      chamber: 'house',
      sectors: [
        { key: 'energy', label: 'Energy (Oil & Gas)' },
        { key: 'tech', label: 'Technology' },
      ],
    },
    {
      thomasId: 'SSEG',
      shortName: 'Energy and Natural Resources',
      chamber: 'senate',
      sectors: [{ key: 'energy', label: 'Energy (Oil & Gas)' }],
    },
    { thomasId: 'HSHA', shortName: 'House Administration', chamber: 'house', sectors: [] },
  ];
  const g = oversightLinks(committees);
  // unmapped committees stay off the map
  assert.deepEqual(
    g.committees.map((c) => c.thomasId),
    ['HSIF', 'SSEG'],
  );
  assert.deepEqual(g.sectors[0], { key: 'energy', label: 'Energy (Oil & Gas)', committees: 2 });
  assert.equal(g.links.length, 3);
  assert.deepEqual(g.links[0], { committee: 'HSIF', sector: 'energy' });
  assert.deepEqual(oversightLinks(undefined), { committees: [], sectors: [], links: [] });
});

test('heatScale: 0.04 for zero, 0.1 floor, 0.85 at max', () => {
  assert.equal(heatScale(0, 12), 0.04);
  assert.equal(heatScale(5, 0), 0.04);
  assert.equal(heatScale(12, 12), 0.85);
  const mid = heatScale(6, 12);
  assert.ok(mid > 0.1 && mid < 0.85);
  assert.ok(heatScale(1, 1000) >= 0.1);
});

test('tradeSummary: buys, sells, distinct members, unmapped counted quietly', () => {
  const rows = [
    { type: 'purchase', bioguideId: 'A000001', sector: { key: 'defense' } },
    { type: 'sale_partial', bioguideId: 'A000001', sector: { key: 'defense' } },
    { type: 'purchase', bioguideId: 'B000002', sector: { key: 'tech' } },
    { type: 'exchange', bioguideId: 'C000003', sector: { key: 'tech' } },
    { type: 'purchase', bioguideId: 'D000004', sector: null }, // unmapped ticker
  ];
  assert.deepEqual(tradeSummary(rows), { trades: 4, buys: 2, sells: 1, members: 3, unmapped: 1 });
  assert.deepEqual(tradeSummary([]), { trades: 0, buys: 0, sells: 0, members: 0, unmapped: 0 });
  assert.equal(tradeSide('purchase'), 'buy');
  assert.equal(tradeSide('sale'), 'sell');
  assert.equal(tradeSide('exchange'), 'other');
});

test('rangeDotSize: bracket minimum to 5..14px, unknown gets the minimum', () => {
  assert.equal(rangeDotSize(1001), 5);
  assert.equal(rangeDotSize(15001), 6);
  assert.equal(rangeDotSize(50001), 7);
  assert.equal(rangeDotSize(1000001), 11);
  assert.equal(rangeDotSize(50000001), 14);
  assert.equal(rangeDotSize(75000000), 14);
  assert.equal(rangeDotSize(null), 5);
  assert.equal(rangeDotSize(0), 5);
  assert.equal(rangeDotSize('not a number'), 5);
});

test('timelineLayout: 0..1 over the window, out-of-window dates clamp', () => {
  const from = '2024-10-21';
  const to = '2026-10-21';
  const laid = timelineLayout(
    [
      { transaction_date: '2024-10-21', ticker: 'LMT' },
      { transaction_date: '2025-10-21', ticker: 'MSFT' },
      { transaction_date: '2026-10-21', ticker: 'XOM' },
      { transaction_date: '2019-01-01', ticker: 'OLD' }, // filer typo, outside the window
      { transaction_date: null, ticker: 'NONE' },
    ],
    from,
    to,
  );
  assert.equal(laid[0].x, 0);
  assert.ok(Math.abs(laid[1].x - 0.5) < 0.01);
  assert.equal(laid[2].x, 1);
  assert.equal(laid[3].x, 0);
  assert.equal(laid[4].x, 0);
  // a degenerate window never divides by zero
  assert.equal(timelineLayout([{ transaction_date: to }], to, to)[0].x, 0);
});

test('hearingsAvailable: false for the rows as they exist today', () => {
  // congress_meetings today: 118 rows, no date, no committee
  const today = Array.from({ length: 118 }, () => ({
    title: 'Hearing',
    date: null,
    committee: null,
  }));
  assert.equal(hearingsAvailable(today), false);
  assert.equal(hearingsAvailable([]), false);
  assert.equal(hearingsAvailable(null), false);
  assert.equal(hearingsAvailable([{ date: '2026-11-02', committee: null }]), false);
  assert.equal(hearingsAvailable([{ date: '2026-11-02', committee: 'HSIF' }]), true);
});

test('shared honesty strings render one sentence each', async () => {
  assert.equal(
    mappingNote(),
    "Sector links are Ezana's reading of each committee's published jurisdiction.",
  );
  // must match the editorial map's own note so every surface shows one string
  const mod = await import('../src/lib/congress/committee-sectors.js').catch(() => null);
  if (mod) assert.equal(mappingNote(), mod.COMMITTEE_SECTOR_NOTE);
  assert.equal(
    TRADE_FOOTNOTE,
    'A trade in an overseen sector is a disclosure pattern, not evidence of wrongdoing.',
  );
  assert.equal(HOLDINGS_LABEL, 'Holdings inferred from disclosures');
  assert.ok(HOLDINGS_FOOTNOTE.includes('bought and not fully sold'));
  for (const s of [mappingNote(), TRADE_FOOTNOTE, HOLDINGS_LABEL, HOLDINGS_FOOTNOTE]) {
    assert.ok(!s.includes('—'), 'no em dashes in UI copy');
  }
});
