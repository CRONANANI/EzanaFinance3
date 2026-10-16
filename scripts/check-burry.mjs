/**
 * Burry Watcher: the pure transforms behind the card (filing choice, position
 * aggregation, major-outlet filter). Fixtures only, no network.
 *
 * Usage: node --no-warnings --test scripts/check-burry.mjs
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  SCION_CIK,
  pickLatest13F,
  amendmentTypeFromCover,
  aggregatePositions,
  positionKind,
  outletFor,
  mapNewsArticles,
  mapEchoRows,
} from '../src/lib/whales/burry-model.js';

/** Build an EDGAR submissions JSON (column arrays) from row objects. */
function submissions(rows) {
  const cols = ['form', 'accessionNumber', 'reportDate', 'filingDate', 'primaryDocument'];
  const recent = Object.fromEntries(cols.map((c) => [c, rows.map((r) => r[c] ?? '')]));
  return { cik: SCION_CIK, name: 'Scion Asset Management, LLC', filings: { recent } };
}

const BASE_ROWS = [
  { form: 'ADV-W', accessionNumber: '0001-25-000010', reportDate: '', filingDate: '2025-11-10' },
  {
    form: '13F-HR',
    accessionNumber: '0001-25-000009',
    reportDate: '2025-09-30',
    filingDate: '2025-11-03',
    primaryDocument: 'primary_doc.xml',
  },
  {
    form: '13F-HR',
    accessionNumber: '0001-25-000005',
    reportDate: '2025-06-30',
    filingDate: '2025-08-14',
  },
  { form: '4', accessionNumber: '0001-25-000004', reportDate: '', filingDate: '2025-08-01' },
];

test('pickLatest13F: newest period wins, non-13F forms ignored', () => {
  const pick = pickLatest13F(submissions(BASE_ROWS));
  assert.equal(pick.chosen.accessionNumber, '0001-25-000009');
  assert.equal(pick.chosen.reportDate, '2025-09-30');
  assert.equal(pick.chosen.isAmendment, false);
  assert.equal(pick.samePeriod.length, 1);
});

test('pickLatest13F: a later amendment for the same period replaces the original', () => {
  const rows = [
    {
      form: '13F-HR/A',
      accessionNumber: '0001-25-000011',
      reportDate: '2025-09-30',
      filingDate: '2025-11-20',
      primaryDocument: 'primary_doc.xml',
    },
    ...BASE_ROWS,
  ];
  const pick = pickLatest13F(submissions(rows));
  assert.equal(pick.chosen.form, '13F-HR/A');
  assert.equal(pick.chosen.isAmendment, true);
  assert.deepEqual(
    pick.samePeriod.map((f) => f.accessionNumber),
    ['0001-25-000011', '0001-25-000009'],
  );
});

test('pickLatest13F: an amendment of an older period does not beat a newer original', () => {
  const rows = [
    {
      form: '13F-HR/A',
      accessionNumber: '0001-25-000012',
      reportDate: '2025-06-30',
      filingDate: '2025-12-01',
    },
    ...BASE_ROWS,
  ];
  const pick = pickLatest13F(submissions(rows));
  assert.equal(pick.chosen.accessionNumber, '0001-25-000009');
});

test('pickLatest13F: no 13F at all, or a malformed payload, returns null', () => {
  assert.equal(pickLatest13F(submissions([BASE_ROWS[0], BASE_ROWS[3]])), null);
  assert.equal(pickLatest13F(null), null);
  assert.equal(pickLatest13F({ filings: {} }), null);
});

test('amendmentTypeFromCover reads the cover, namespace tolerant', () => {
  assert.equal(
    amendmentTypeFromCover('<ns1:amendmentType> New Holdings </ns1:amendmentType>'),
    'NEW HOLDINGS',
  );
  assert.equal(amendmentTypeFromCover('<amendmentType>RESTATEMENT</amendmentType>'), 'RESTATEMENT');
  assert.equal(amendmentTypeFromCover('<coverPage></coverPage>'), null);
});

/* Shaped like parseInfoTable() output. Placeholder issuers, invented numbers:
   this exercises the arithmetic, it is not Scion's book. */
const ROWS = [
  {
    name_of_issuer: 'ALPHA CORP',
    cusip: 'AAA000001',
    title_of_class: 'COM',
    value: 600000,
    shares: 1000,
    share_type: 'SH',
    put_call: 'Put',
  },
  {
    name_of_issuer: 'ALPHA CORP',
    cusip: 'AAA000001',
    title_of_class: 'COM',
    value: 400000,
    shares: 500,
    share_type: 'SH',
    put_call: 'Put',
  },
  {
    name_of_issuer: 'Alpha  Corp',
    cusip: 'AAA000001',
    title_of_class: 'COM',
    value: 100000,
    shares: 200,
    share_type: 'SH',
    put_call: null,
  },
  {
    name_of_issuer: 'BETA INC',
    cusip: 'BBB000002',
    title_of_class: 'COM',
    value: 700000,
    shares: 3000,
    share_type: 'SH',
    put_call: 'Call',
  },
  {
    name_of_issuer: 'GAMMA LTD',
    cusip: 'CCC000003',
    title_of_class: 'NOTE',
    value: 200000,
    shares: 200000,
    share_type: 'PRN',
    put_call: null,
  },
];

test('aggregatePositions groups by (issuer, type), sorts by value, computes %', () => {
  const { positions, totalValueUsd } = aggregatePositions(ROWS, { periodOfReport: '2025-09-30' });
  assert.equal(totalValueUsd, 2000000);
  assert.deepEqual(
    positions.map((p) => [p.issuer, p.kind, p.valueUsd]),
    [
      ['ALPHA CORP', 'put', 1000000],
      ['BETA INC', 'call', 700000],
      ['GAMMA LTD', 'principal', 200000],
      ['Alpha Corp', 'shares', 100000],
    ],
  );
  assert.equal(positions[0].shares, 1500);
  assert.equal(positions[0].pctOfReported, 50);
  assert.equal(positions[1].pctOfReported, 35);
  const sum = positions.reduce((s, p) => s + p.pctOfReported, 0);
  assert.ok(Math.abs(sum - 100) < 1e-9);
});

test('aggregatePositions scales pre-2023 thousands to whole dollars', () => {
  const { totalValueUsd, positions } = aggregatePositions(ROWS.slice(3, 4), {
    periodOfReport: '2021-12-31',
  });
  assert.equal(totalValueUsd, 700000 * 1000);
  assert.equal(positions[0].pctOfReported, 100);
});

test('aggregatePositions: empty input gives no positions and null-safe %', () => {
  assert.deepEqual(aggregatePositions([], {}), { positions: [], totalValueUsd: 0 });
  const { positions } = aggregatePositions([{ name_of_issuer: 'ZERO CO', value: 0 }], {});
  assert.equal(positions[0].pctOfReported, null);
});

test('positionKind', () => {
  assert.equal(positionKind({ put_call: 'PUT' }), 'put');
  assert.equal(positionKind({ put_call: 'call' }), 'call');
  assert.equal(positionKind({ share_type: 'PRN' }), 'principal');
  assert.equal(positionKind({ share_type: 'SH' }), 'shares');
});

test('outletFor: listed domains and their subdomains pass', () => {
  assert.equal(outletFor('https://www.reuters.com/markets/x'), 'Reuters');
  assert.equal(outletFor('https://edition.reuters.com/a'), 'Reuters');
  assert.equal(outletFor('https://reuters.com/a'), 'Reuters');
  assert.equal(outletFor('https://finance.yahoo.com/news/a'), 'Yahoo Finance');
  assert.equal(outletFor('https://uk.finance.yahoo.com/news/a'), 'Yahoo Finance');
  assert.equal(outletFor('https://www.bbc.co.uk/news/a'), 'BBC');
  assert.equal(outletFor('https://WWW.CNBC.COM/2026/01/01/a.html'), 'CNBC');
  assert.equal(outletFor(null, 'wsj.com'), 'The Wall Street Journal');
});

test('outletFor: lookalikes and off-list hosts fail', () => {
  assert.equal(outletFor('https://reuters.com.evil.io/a'), null);
  assert.equal(outletFor('https://notreuters.com/a'), null);
  assert.equal(outletFor('https://evilreuters.com/a'), null);
  assert.equal(outletFor('https://yahoo.com/news/a'), null);
  assert.equal(outletFor('https://news.yahoo.com/a'), null);
  assert.equal(outletFor('https://ft.com.example.org/a'), null);
  assert.equal(outletFor('https://somefinanceblog.net/burry'), null);
  // URL host is authoritative over a mislabelled source.
  assert.equal(outletFor('https://spam.example/a', 'reuters.com'), null);
  assert.equal(outletFor('', ''), null);
});

test('mapNewsArticles keeps major outlets, de-dupes, sorts newest first', () => {
  const items = mapNewsArticles([
    {
      uuid: 'a',
      title: 'Burry story one',
      url: 'https://www.reuters.com/1',
      published_at: '2026-09-01T10:00:00Z',
    },
    {
      uuid: 'b',
      title: 'Burry story two',
      url: 'https://www.cnbc.com/2',
      published_at: '2026-10-01T10:00:00Z',
    },
    {
      uuid: 'c',
      title: 'Burry story one',
      url: 'https://www.ft.com/dup',
      published_at: '2026-09-02T10:00:00Z',
    },
    { uuid: 'd', title: 'Blog take', url: 'https://reuters.com.evil.io/x' },
    { uuid: 'e', title: 'No scheme', url: 'javascript:alert(1)', source: 'reuters.com' },
    { uuid: 'f', title: '', url: 'https://www.wsj.com/empty' },
  ]);
  assert.deepEqual(
    items.map((i) => [i.id, i.outlet]),
    [
      ['b', 'CNBC'],
      ['a', 'Reuters'],
    ],
  );
});

test('mapEchoRows links to the public Echo route', () => {
  const items = mapEchoRows([
    {
      article_slug: 'the-big-short-redux',
      article_title: 'T',
      article_excerpt: null,
      published_at: '2026-01-01',
    },
    { article_slug: '', article_title: 'dropped' },
  ]);
  assert.equal(items.length, 1);
  assert.equal(items[0].href, '/ezana-echo/the-big-short-redux');
});
