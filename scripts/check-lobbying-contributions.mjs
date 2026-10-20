#!/usr/bin/env node
/* LD-203 contributions and the lobbying feed (src/lib/lobbying/contributions.js,
   src/lib/lobbying/feed.js). Fixtures follow the live lda.gov shape checked
   on 2026-10-20.
   Usage: node --no-warnings --test scripts/check-lobbying-contributions.mjs */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ilikeTerm,
  lobbyistName,
  normalizeContribution,
  periodOpened,
  periodStillReceiving,
  planTargets,
  resumePoint,
} from '../src/lib/lobbying/contributions.js';
import { cleanTicker, clientKey, pickTickerPairs, toFeedRow } from '../src/lib/lobbying/feed.js';

const REPORT = {
  filing_uuid: 'a1',
  filing_type: 'MM',
  filing_year: 2025,
  filing_period: 'mid_year',
  filing_document_url: 'https://lda.gov/filings/public/contribution/a1/print/',
  filer_type: 'lobbyist',
  dt_posted: '2025-07-20T12:00:00-04:00',
  registrant: { id: 401104869, name: "O'KEEFFE SHAHMORADI STRATEGIES, LLC" },
  lobbyist: { id: 68402, first_name: 'HEIDEH', middle_name: null, last_name: 'SHAHMORADI' },
  no_contributions: false,
  pacs: [],
  contribution_items: [
    {
      contribution_type: 'feca',
      contributor_name: 'SELF',
      payee_name: 'GRAHAM MAJORITY FUND',
      honoree_name: 'Lindsay Graham',
      amount: '5000.00',
      date: '2025-02-24',
    },
    {
      contribution_type: 'feca',
      contributor_name: 'SELF',
      payee_name: '  Friends of X ',
      honoree_name: '',
      amount: 'n/a',
      date: 'Feb 2025',
    },
  ],
};

test('normalizeContribution: report and items from the live shape', () => {
  const out = normalizeContribution(REPORT, '2026-10-20T00:00:00Z');
  assert.equal(out.report.filing_uuid, 'a1');
  assert.equal(out.report.lobbyist_name, 'HEIDEH SHAHMORADI');
  assert.equal(out.report.registrant_id, 401104869);
  assert.equal(out.report.item_count, 2);
  assert.equal(out.report.total_amount, 5000);
  assert.equal(out.report.no_contributions, false);
  assert.deepEqual(out.items[0], {
    filing_uuid: 'a1',
    item_index: 0,
    contribution_type: 'feca',
    contributor_name: 'SELF',
    payee_name: 'GRAHAM MAJORITY FUND',
    honoree_name: 'Lindsay Graham',
    amount: 5000,
    contribution_date: '2025-02-24',
  });
  // Bad amount and date become null; blank honoree is null; text is trimmed.
  assert.equal(out.items[1].amount, null);
  assert.equal(out.items[1].contribution_date, null);
  assert.equal(out.items[1].honoree_name, null);
  assert.equal(out.items[1].payee_name, 'Friends of X');
});

test('normalizeContribution: no-contribution organisation report', () => {
  const out = normalizeContribution({
    ...REPORT,
    filer_type: 'organization',
    lobbyist: null,
    no_contributions: true,
    pacs: ['ACME PAC', { name: 'Other PAC' }, ''],
    contribution_items: [],
  });
  assert.equal(out.report.lobbyist_name, null);
  assert.equal(out.report.lobbyist_id, null);
  assert.deepEqual(out.report.pacs, ['ACME PAC', 'Other PAC']);
  assert.equal(out.items.length, 0);
  assert.equal(out.report.total_amount, 0);
});

test('normalizeContribution: rejects rows without identity', () => {
  assert.equal(normalizeContribution({ ...REPORT, filing_uuid: null }), null);
  assert.equal(normalizeContribution({ ...REPORT, filing_period: 'q1' }), null);
  assert.equal(normalizeContribution(null), null);
});

test('lobbyistName joins parts and skips blanks', () => {
  assert.equal(
    lobbyistName({
      first_name: 'CONNOR',
      middle_name: 'RUSSELL',
      last_name: 'PFEIFFER',
      suffix_display: 'JR.',
    }),
    'CONNOR RUSSELL PFEIFFER JR.',
  );
  assert.equal(lobbyistName({}), null);
});

test('periods open at the end of the half year and keep receiving for a year after due', () => {
  assert.equal(periodOpened(2026, 'mid_year', Date.UTC(2026, 5, 30)), false);
  assert.equal(periodOpened(2026, 'mid_year', Date.UTC(2026, 6, 1)), true);
  assert.equal(periodOpened(2026, 'year_end', Date.UTC(2026, 11, 31)), false);
  assert.equal(periodOpened(2026, 'year_end', Date.UTC(2027, 0, 1)), true);
  assert.equal(periodStillReceiving(2025, 'mid_year', Date.UTC(2026, 6, 1)), true);
  assert.equal(periodStillReceiving(2025, 'mid_year', Date.UTC(2026, 7, 1)), false);
});

test('planTargets: unfinished newest first, then finished periods still receiving', () => {
  const now = Date.UTC(2026, 9, 20);
  const states = new Map([
    ['2026-mid_year', { complete: false }],
    ['2025-year_end', { complete: true }],
    ['2025-mid_year', { complete: true }],
    ['2024-year_end', { complete: true }],
  ]);
  const order = planTargets([2024, 2025, 2026], states, now).map((t) => `${t.year}-${t.period}`);
  // 2026 year_end has not opened. 2024 mid_year has no state, so it is
  // unfinished. 2025 mid_year (due 2025-07-30) and 2024 year_end (due
  // 2025-01-30) are past their year of late filings; 2025 year_end is not.
  assert.deepEqual(order, ['2026-mid_year', '2024-mid_year', '2025-year_end']);
});

test('resumePoint re-reads the last page and carries earlier rows', () => {
  assert.deepEqual(resumePoint(null), { page: 1, rowsBefore: 0 });
  assert.deepEqual(resumePoint({ last_page: 40, last_page_rows: 7, rows_fetched: 982 }), {
    page: 40,
    rowsBefore: 975,
  });
});

test('ilikeTerm escapes wildcards and caps length', () => {
  assert.equal(ilikeTerm('  '), null);
  assert.equal(ilikeTerm('50%_off'), '%50\\%\\_off%');
  assert.equal(ilikeTerm('x'.repeat(200)).length, 82);
});

test('toFeedRow keeps the shape the pages read', () => {
  const row = toFeedRow(
    {
      uuid: 'u1',
      client_name: 'MICROSOFT CORPORATION',
      registrant_name: 'MICROSOFT CORPORATION',
      dt_posted: '2026-10-16T19:40:42+00:00',
      amount: '2580000',
      issues: [{ code: 'CPI', display: 'Computer Industry' }, { code: 'TAX' }],
      filing_year: 2026,
      filing_period: 'third_quarter',
      document_url: null,
    },
    { ticker: 'MSFT' },
  );
  assert.equal(row.Client, 'MICROSOFT CORPORATION');
  assert.equal(row.Date, '2026-10-16');
  assert.equal(row.Amount, 2580000);
  assert.equal(row.Ticker, 'MSFT');
  assert.equal(row.Issue, 'Computer Industry, TAX');
  assert.equal(toFeedRow({ uuid: 'u2', issues: null, amount: null }).Ticker, null);
});

test('pickTickerPairs: one ticker per client, ambiguous ones left out', () => {
  const out = pickTickerPairs([
    { Client: 'Apple Inc.', Ticker: 'aapl' },
    { Client: 'APPLE INC.', Ticker: 'AAPL' },
    { Client: 'ALPHABET INC.', Ticker: 'GOOGL' },
    { Client: 'ALPHABET INC.', Ticker: 'GOOG' },
    { Client: 'NO TICKER LLC', Ticker: '' },
    { Client: 'BROWN-FORMAN CORPORATION', Ticker: 'BF.B' },
    { Client: '', Ticker: 'X' },
  ]);
  assert.deepEqual(out.pairs, [
    { client_name: 'APPLE INC.', ticker: 'AAPL' },
    { client_name: 'BROWN-FORMAN CORPORATION', ticker: 'BF.B' },
  ]);
  assert.deepEqual(out.ambiguous, ['ALPHABET INC.']);
  assert.equal(out.skipped, 2);
});

test('cleanTicker and clientKey', () => {
  assert.equal(cleanTicker(' brk.b '), 'BRK.B');
  assert.equal(cleanTicker('1ABC'), null);
  assert.equal(cleanTicker('TOOLONGTICKER'), null);
  assert.equal(clientKey('  Acme   Corp '), 'ACME CORP');
});
