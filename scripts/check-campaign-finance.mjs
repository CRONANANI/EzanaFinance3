/**
 * Campaign Finance Intelligence: the pure aggregation behind the page, plus
 * the page's copy rules (no data-source names, no em dashes in UI code).
 *
 * Usage: node --test scripts/check-campaign-finance.mjs  (or npm run test:campaign-finance)
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import {
  buildMemberDetail,
  buildOverview,
  chamberCode,
  median,
  normalizeSizes,
  partyCode,
  purposeLabel,
} from '../src/lib/campaign-finance/aggregate.js';

const DIR = {
  A000001: { fullName: 'Ann Able', party: 'D', chamber: 'House', state: 'CA', district: 11 },
  B000002: { fullName: 'Bob Baker', party: 'R', chamber: 'Senate', state: 'TX', district: null },
  C000003: { fullName: 'Cy Cole', party: 'R', chamber: 'House', state: 'TX', district: 0 },
  D000004: { fullName: 'Di Dunn', party: 'I', chamber: 'Senate', state: 'VT', district: null },
};
const directory = (id) => DIR[id] || null;

const sizes = (a, b, c, d, e) => [
  { size: 0, total: a, count: 0 },
  { size: 200, total: b, count: 10 },
  { size: 500, total: c, count: 5 },
  { size: 1000, total: d, count: 3 },
  { size: 2000, total: e, count: 1 },
];

const TOTALS = [
  {
    bioguide_id: 'A000001',
    party: 'D',
    office: 'H',
    state: 'CA',
    receipts: 1000,
    disbursements: 600,
    cash_on_hand_end_period: 500,
    individual_itemized_contributions: 500,
    other_political_committee_contributions: 300,
    debts_owed_by_committee: 0,
    coverage_end_date: '2026-09-30',
    size_buckets: sizes(100, 100, 100, 100, 100),
    synced_at: '2026-10-18T19:00:00Z',
  },
  {
    bioguide_id: 'B000002',
    party: 'R',
    office: 'S',
    state: 'TX',
    receipts: 3000,
    disbursements: 2000,
    cash_on_hand_end_period: 1500,
    individual_itemized_contributions: 2000,
    other_political_committee_contributions: 500,
    debts_owed_by_committee: 250,
    coverage_end_date: '2026-09-30',
    size_buckets: [],
    synced_at: '2026-10-18T19:30:00Z',
  },
  {
    bioguide_id: 'C000003',
    party: null,
    office: 'H',
    state: 'TX',
    receipts: null,
    disbursements: null,
    cash_on_hand_end_period: null,
    individual_itemized_contributions: null,
    other_political_committee_contributions: null,
    debts_owed_by_committee: null,
    coverage_end_date: null,
    size_buckets: null,
  },
];
const OUTSIDE = [
  {
    bioguide_id: 'A000001',
    support_total: 400,
    oppose_total: 100,
    by_committee: [
      { committeeId: 'C1', committeeName: 'Group One', supportOpposeIndicator: 'S', total: 300 },
      { committeeId: 'C2', committeeName: 'Group Two', supportOpposeIndicator: 'O', total: 100 },
    ],
    spending_by_purpose: [
      { purpose: 'ADVERTISING', total: 200 },
      { purpose: 'LOAN-REPAYMENTS', total: 50 },
    ],
  },
  {
    bioguide_id: 'B000002',
    support_total: 0,
    oppose_total: 0,
    by_committee: [
      { committeeId: 'C1', committeeName: 'Group One', supportOpposeIndicator: 'O', total: 50 },
    ],
    spending_by_purpose: [{ purpose: 'ADVERTISING', total: 300 }],
  },
];

const ov = buildOverview({ cycle: 2026, totals: TOTALS, outside: OUTSIDE, directory });

test('helpers', () => {
  assert.equal(median([3, 1, 2]), 2);
  assert.equal(median([4, 1, 2, 3]), 2.5);
  assert.equal(median([]), null);
  assert.equal(partyCode('Democrat'), 'D');
  assert.equal(partyCode('REP'), 'R');
  assert.equal(partyCode(''), null);
  assert.equal(chamberCode('S'), 'S');
  assert.equal(chamberCode(null, 'House'), 'H');
  assert.equal(purposeLabel('LOAN-REPAYMENTS'), 'Loan repayments');
});

test('sizes: fixed order; under-$200 has no count; empty is null', () => {
  const s = normalizeSizes(sizes(1, 2, 3, 4, 5).reverse());
  assert.deepEqual(s.dollars, [1, 2, 3, 4, 5]);
  assert.equal(s.counts[0], null);
  assert.equal(normalizeSizes([]), null);
  assert.equal(normalizeSizes([{ size: 0, total: 0, count: 0 }]), null);
});

test('totals skip missing figures instead of counting zero', () => {
  assert.equal(ov.totals.raised, 4000);
  assert.equal(ov.totals.debt, 250);
  assert.equal(ov.totals.debtMembers, 1);
  assert.equal(ov.coverage.members, 3);
  /* C000003 has no receipts: the measure covers 2 members, not 3. */
  const all = ov.members.find((m) => m.id === 'C000003');
  assert.equal(all.raised, null);
  assert.equal(ov.byChamber.H.raised.n, 1);
  assert.equal(ov.byChamber.H.n, 2);
});

test('party falls back to the directory; district only for House', () => {
  const c = ov.members.find((m) => m.id === 'C000003');
  assert.equal(c.party, 'R');
  assert.equal(c.district, 0);
  const b = ov.members.find((m) => m.id === 'B000002');
  assert.equal(b.district, null);
  assert.equal(b.name, 'Bob Baker');
});

test('composition remainder is receipts minus itemized and PAC', () => {
  const by = Object.fromEntries(ov.composition.map((c) => [c.key, c.amount]));
  assert.equal(by.itemized, 2500);
  assert.equal(by.pac, 800);
  assert.equal(by.other, 700);
});

test('size roll-ups cover only members with detail', () => {
  assert.equal(ov.sizes.all.n, 1);
  assert.deepEqual(ov.sizes.all.dollars, [100, 100, 100, 100, 100]);
  assert.equal(ov.sizes.S.n, 0);
  assert.equal(ov.coverage.sizes, 1);
});

test('purposes and outside network', () => {
  assert.equal(ov.purposes[0].code, 'ADVERTISING');
  assert.equal(ov.purposes[0].total, 500);
  assert.equal(ov.coverage.purposes, 2);
  assert.equal(ov.outside.members, 1);
  assert.equal(ov.outside.support, 400);
  assert.equal(ov.groups[0].id, 'C1');
  assert.equal(ov.groups[0].total, 350);
  assert.equal(ov.groups[0].members, 2);
  assert.equal(ov.links.length, 3);
  const opp = ov.links.find((l) => l[2] === 'O' && l[3] === 50);
  assert.ok(opp);
});

test('latest period, sync time and ranks', () => {
  assert.equal(ov.latestPeriodEnd, '2026-09-30');
  assert.equal(ov.synced, '2026-10-18T19:30:00Z');
  assert.equal(ov.members.find((m) => m.id === 'B000002').rankRaised, 1);
  assert.equal(ov.members.find((m) => m.id === 'C000003').rankRaised, null);
});

test('empty input is not ready and has no composition', () => {
  const e = buildOverview({ cycle: 2024, totals: [], outside: [], directory });
  assert.equal(e.ready, false);
  assert.equal(e.composition, null);
  assert.equal(e.totals.raised, null);
});

test('member detail sorts states, purposes and groups', () => {
  const d = buildMemberDetail({
    totals: {
      bioguide_id: 'A000001',
      size_buckets: sizes(1, 1, 1, 1, 1),
      top_states: [
        { state: 'NY', stateFull: 'New York', total: 5 },
        { state: 'CA', stateFull: 'California', total: 9 },
      ],
    },
    outside: OUTSIDE[0],
  });
  assert.equal(d.states[0].state, 'CA');
  assert.equal(d.purposes[0].label, 'Advertising');
  assert.equal(d.groups[0].name, 'Group One');
  assert.equal(d.groups[1].side, 'O');
  assert.equal(buildMemberDetail({ totals: null }), null);
});

/* ── copy rules ─────────────────────────────────────────────────────── */

const UI_DIRS = [
  'src/app/datasets/campaignfinancerecords',
  'src/app/datasets/campaignfinancerecords/cf',
];
const BANNED =
  /\b(FEC|Federal Election|Schedule [A-F]|LD-203|Voteview|NOMINATE|MEDSL|Census|ACS|TIGER|FCC|IRS|8871|8872|Google|Meta|Facebook|Supabase|BigQuery|OpenFEC)\b/;

function uiFiles() {
  const out = [];
  for (const d of UI_DIRS) {
    for (const f of readdirSync(d)) if (/\.(jsx|js)$/.test(f)) out.push(join(d, f));
  }
  return out;
}

const stripComments = (s) =>
  s
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1')
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '');

test('no data-source names in page code', () => {
  for (const f of uiFiles()) {
    const code = stripComments(readFileSync(f, 'utf8'));
    const hit = code.match(BANNED);
    assert.equal(hit, null, `${f} mentions "${hit && hit[0]}"`);
  }
});

test('no em dashes in page code', () => {
  for (const f of uiFiles()) {
    const code = stripComments(readFileSync(f, 'utf8'));
    assert.ok(!code.includes('—'), `${f} contains an em dash`);
  }
});
