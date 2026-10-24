#!/usr/bin/env node
/* Schedule 13D/13G campaign model (src/lib/titans/activist-model.js)
   and purposeSentences (src/lib/sec/schedule13-meta.js). Contract: the
   handoff's 06-DATA-CONTRACT.md section 4.
   Usage: node --no-warnings --test scripts/check-activist.mjs */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  annotateCampaign,
  businessDays,
  campaignStatus,
  coFilingGraph,
  controlShare,
  filterFilings,
  groupCampaigns,
  intentShifts,
  ladderSteps,
  medianPath,
  rebase,
  speedBins,
  statedPlan,
  switches,
  targetKey,
  windowRange,
} from '../src/lib/titans/activist-model.js';
import { purposeSentences, tagPurpose } from '../src/lib/sec/schedule13-meta.js';
import { parseSchedule13Xml } from '../src/lib/sec-13f-parse.js';

const fixture = (name) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8');

const F = (over = {}) => ({
  accessionNo: over.accessionNo || `acc-${Math.floor(over.seq || 0)}`,
  filer: 'Ninefold Harbor LP',
  filerCik: '0001877412',
  filerConfirmed: true,
  cusip: '21874K104',
  subject: 'Corewave Systems Inc',
  ticker: 'CWV',
  form: '13D',
  filedAt: '2026-01-10',
  percentOfClass: 6.1,
  detailParsed: true,
  tags: [],
  ...over,
});

test('targetKey: cusip normalisation and name fallback', () => {
  assert.equal(targetKey({ cusip: ' 21874k104 ' }), '21874K104');
  assert.equal(
    targetKey({ cusip: null, subject: 'Corewave Systems, Inc.' }),
    'name:corewavesystemsinc',
  );
  assert.equal(targetKey({}), null);
});

test('groupCampaigns: unconfirmed never grouped; two targets = two campaigns', () => {
  const rows = [
    F({ seq: 1 }),
    F({ seq: 2, filedAt: '2026-02-01' }),
    F({ seq: 3, cusip: '98765R100', subject: 'Other Co', ticker: 'OTH' }),
    F({ seq: 4, filerConfirmed: false, filerCik: null, filer: null }),
  ];
  const { campaigns, unconfirmed } = groupCampaigns(rows);
  assert.equal(campaigns.length, 2);
  assert.equal(unconfirmed.length, 1);
  const main = campaigns.find((c) => c.targetKey === '21874K104');
  assert.equal(main.filings.length, 2);
  assert.equal(main.filings[0].filedAt, '2026-01-10');
  // percentages are never added across campaigns or persons
  assert.ok(main.filings.every((f) => f.percentOfClass === 6.1));
});

test('annotateCampaign: switch, exit below 5, raise only vs previous', () => {
  const rows = annotateCampaign([
    F({ seq: 1, form: '13G', percentOfClass: 5.4, filedAt: '2025-11-01' }),
    F({ seq: 2, form: '13D', percentOfClass: 7.2, filedAt: '2026-01-05' }),
    F({ seq: 3, form: '13D', percentOfClass: 4.1, filedAt: '2026-03-01' }),
  ]);
  assert.deepEqual(
    rows.map((r) => r.switch),
    [false, true, false],
  );
  assert.deepEqual(
    rows.map((r) => r.raise),
    [false, true, false],
  );
  assert.deepEqual(
    rows.map((r) => r.exit),
    [false, false, true],
  );
});

test('campaignStatus: each status', () => {
  const win = ['2026-01-01', '2026-03-31'];
  assert.equal(campaignStatus({ filings: [F({ percentOfClass: 4.9 })] }), 'exited');
  assert.equal(campaignStatus({ filings: [F({ filedAt: '2026-02-01' })] }, win), 'new');
  assert.equal(campaignStatus({ filings: [F({ filedAt: '2025-02-01' })] }, win), 'holding');
  assert.equal(
    campaignStatus({
      filings: [
        F({ percentOfClass: 5.2, filedAt: '2025-11-01' }),
        F({ percentOfClass: 8.4, filedAt: '2026-01-02' }),
      ],
    }),
    'building',
  );
  assert.equal(
    campaignStatus({
      filings: [
        F({ percentOfClass: 9.2, filedAt: '2025-11-01' }),
        F({ percentOfClass: 7.1, filedAt: '2026-01-02' }),
      ],
    }),
    'unwinding',
  );
  assert.equal(
    campaignStatus({
      filings: [
        F({ percentOfClass: 6.0, filedAt: '2025-11-01' }),
        F({ percentOfClass: 6.0, filedAt: '2026-01-02' }),
      ],
    }),
    'holding',
  );
});

test('intentShifts: set comparison, ignores 13G and non-v2 rows', () => {
  const shifts = intentShifts({
    filings: [
      F({ seq: 1, tags: ['investment'], filedAt: '2025-10-01' }),
      F({ seq: 2, form: '13G', tags: ['board'], filedAt: '2025-11-01' }),
      F({ seq: 3, tags: ['board', 'investment'], filedAt: '2026-01-01' }),
      F({ seq: 4, detailParsed: false, tags: ['proxy'], filedAt: '2026-02-01' }),
      F({ seq: 5, tags: ['investment', 'board'], filedAt: '2026-03-01' }),
    ],
  });
  assert.equal(shifts.length, 1);
  assert.deepEqual(shifts[0].added, ['board']);
  assert.deepEqual(shifts[0].dropped, []);
});

test('switches: days between the last 13G and the first 13D', () => {
  const { campaigns } = groupCampaigns([
    F({ seq: 1, form: '13G', filedAt: '2026-01-02', percentOfClass: 5.1 }),
    F({ seq: 2, form: '13D', filedAt: '2026-01-30', percentOfClass: 7.9 }),
  ]);
  const rows = switches(campaigns, ['2026-01-01', '2026-03-31']);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].days, 28);
  assert.equal(switches(campaigns, ['2026-02-01', '2026-03-31']).length, 0);
});

test('ladderSteps: direction, 10% crossed upward only, y extension', () => {
  const { steps, crossed10, yMax } = ladderSteps({
    filings: [
      F({ percentOfClass: 6, filedAt: '2026-01-01' }),
      F({ percentOfClass: 10.8, filedAt: '2026-02-01' }),
      F({ percentOfClass: 9.1, filedAt: '2026-03-01' }),
      F({ percentOfClass: 15.2, filedAt: '2026-04-01' }),
    ],
  });
  assert.deepEqual(
    steps.map((s) => s.dir),
    ['flat', 'up', 'down', 'up'],
  );
  assert.equal(crossed10, true);
  assert.equal(yMax, 16);
  const down = ladderSteps({
    filings: [
      F({ percentOfClass: 12, filedAt: '2026-01-01' }),
      F({ percentOfClass: 8, filedAt: '2026-02-01' }),
    ],
  });
  assert.equal(down.crossed10, false);
});

test('statedPlan', () => {
  assert.equal(statedPlan([]), false);
  assert.equal(statedPlan(['investment']), false);
  assert.equal(statedPlan(['investment', 'board']), true);
});

test('controlShare: 0/0 and nulls are null', () => {
  assert.equal(controlShare({ sole: 75, shared: 25 }), 0.75);
  assert.equal(controlShare({ sole: 0, shared: 0 }), null);
  assert.equal(controlShare({ sole: null, shared: 10 }), null);
  assert.equal(controlShare({}), null);
});

test('businessDays: weekend span, a NYSE holiday, same day', () => {
  assert.equal(businessDays('2026-10-16', '2026-10-19'), 1); // Fri -> Mon
  assert.equal(businessDays('2026-07-02', '2026-07-06'), 1); // Jul 3 2026 is a NYSE holiday
  assert.equal(businessDays('2026-10-22', '2026-10-22'), 0);
});

test('speedBins: edges at 5/6 and 10/11; no event date counted apart', () => {
  const out = speedBins([
    { series: 'd', days: 5 },
    { series: 'd', days: 6 },
    { series: 'd', days: 10 },
    { series: 'd', days: 11 },
    { series: 'g', days: 31 },
    { series: 'g', days: null },
  ]);
  assert.equal(out.series.d['5'], 1);
  assert.equal(out.series.d['6-10'], 2);
  assert.equal(out.series.d['11-30'], 1);
  assert.equal(out.series.g['31+'], 1);
  assert.equal(out.noEventDate, 1);
});

test('rebase and medianPath', () => {
  const r = rebase(
    [
      [-1, 95],
      [0, 100],
      [1, 110],
    ],
    1,
  );
  assert.deepEqual(r[1], [0, 0]);
  assert.deepEqual(r[2], [1, 10]);
  assert.deepEqual(
    medianPath([
      [
        [0, 0],
        [1, 10],
      ],
      [
        [0, 0],
        [1, 20],
      ],
      [
        [0, 0],
        [1, 40],
      ],
    ]),
    [
      [0, 0],
      [1, 20],
    ],
  );
  assert.deepEqual(medianPath([[[1, 10]], [[1, 30]]]), [[1, 20]]);
});

test('coFilingGraph: CIK identity first, then normalised name', () => {
  const g = coFilingGraph([
    {
      reportingPersons: [
        { name: 'Harbor GP LLC', cik: '0002000001', shares: 1000, types: [{ code: 'OO' }] },
        { name: 'J. Harbor', shares: 400, types: [{ code: 'IN' }] },
      ],
    },
    {
      reportingPersons: [
        { name: 'HARBOR GP, L.L.C.', cik: '0002000001', shares: 2500 },
        { name: 'J Harbor', shares: 500 },
      ],
    },
  ]);
  assert.equal(g.nodes.length, 2);
  assert.equal(g.nodes.find((n) => n.cik === '0002000001').maxShares, 2500);
  assert.equal(g.edges.length, 1);
  assert.equal(g.edges[0].weight, 2);
});

test('windowRange', () => {
  assert.deepEqual(windowRange('30d', '2026-10-22'), ['2026-09-22', '2026-10-22']);
  assert.deepEqual(windowRange('90d', '2026-10-22'), ['2026-07-24', '2026-10-22']);
  assert.deepEqual(windowRange('12m', '2026-10-22'), ['2025-10-22', '2026-10-22']);
  assert.deepEqual(windowRange('all', '2026-10-22'), [null, '2026-10-22']);
});

test('filterFilings: each filter and combinations', () => {
  const rows = [
    F({ form: '13D', tags: ['board'], personTypes: [{ code: 'IA' }], gBasis: [] }),
    F({
      form: '13G',
      tags: [],
      personTypes: [{ code: 'HC' }],
      gBasis: [{ rule: '13d-1(b)', key: 'b' }],
    }),
  ];
  assert.equal(filterFilings(rows, { form: '13d' }).length, 1);
  assert.equal(filterFilings(rows, { tag: 'board' }).length, 1);
  assert.equal(filterFilings(rows, { type: 'HC' }).length, 1);
  assert.equal(filterFilings(rows, { basis: 'b' }).length, 1);
  assert.equal(filterFilings(rows, { form: '13g', basis: 'b' }).length, 1);
  assert.equal(filterFilings(rows, { form: '13d', basis: 'b' }).length, 0);
});

test('purposeSentences: sentence tags union equals tagPurpose on the fixtures', () => {
  for (const name of ['schedule13d.xml', 'schedule13d-nested-cusip.xml']) {
    const r = parseSchedule13Xml(fixture(name));
    if (!r.transaction_purpose) continue;
    const sentencesOut = purposeSentences(r.transaction_purpose);
    assert.ok(sentencesOut.length > 0);
    const union = [...new Set(sentencesOut.flatMap((s) => s.tags))].sort();
    assert.deepEqual(union, [...tagPurpose(r.transaction_purpose)].sort());
    // reservation sentences carry no tags
    assert.ok(sentencesOut.every((s) => !s.reservation || s.tags.length === 0));
  }
  // abbreviations do not split sentences
  const one = purposeSentences(
    'The Reporting Person sent a letter to Corewave Systems Inc. about the board.',
  );
  assert.equal(one.length, 1);
  assert.ok(one[0].tags.includes('letter'));
  assert.deepEqual(purposeSentences(null), []);
});
