/**
 * Unit tests for the House-disclosure pure parsers (index, brackets, PTR text).
 * No test runner is configured; run directly:  node scripts/check-house-disclosures.mjs
 * (also `npm run test:house`). Node's ESM detection imports the plain .js sources.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseHouseIndexTxt,
  isElectronicDocId,
  toISO,
  ptrPdfUrl,
} from '../src/lib/house-disclosures/parse-index.js';
import { matchBracket, AMOUNT_BRACKETS } from '../src/lib/house-disclosures/brackets.js';
import { parsePtrText, looksScanned } from '../src/lib/house-disclosures/parse-ptr-pdf.js';
import { dedupeByDocId } from '../src/lib/house-disclosures/dedupe.js';
import { isUnknownColumn, writeWithOptionalColumn } from '../src/lib/db/optional-column.js';

const TAB = '\t';

/* The two layouts the Clerk actually ships. The extra columns in the older one
   sit in the MIDDLE, which is what made a positional parser shift rather than
   simply miss them. */
const HEADER_9 = [
  'Prefix',
  'Last',
  'First',
  'Suffix',
  'FilingType',
  'StateDst',
  'Year',
  'FilingDate',
  'DocID',
];
const HEADER_11 = [
  'Prefix',
  'Last',
  'First',
  'Suffix',
  'FilingType',
  'StateDst',
  'Year',
  'Filing Year',
  'FilingDate',
  'DocID',
  'DisclosureType',
];

function withHeader(header, rows) {
  return [header, ...rows].map((r) => r.join(TAB)).join('\r\n');
}
function idx(rows) {
  return withHeader(HEADER_9, rows);
}

test('index: parses columns, labels, state/district, PTR + electronic flags', () => {
  const txt = idx([
    ['Hon.', 'Pelosi', 'Nancy', '', 'P', 'CA11', '2026', '4/15/2026', '20012345'],
    ['Mr.', 'Smith', 'John', 'Jr', 'A', 'TX02', '2026', '1/2/2026', '8068'],
  ]);
  const rows = parseHouseIndexTxt(txt);
  assert.equal(rows.length, 2);

  const [ptr, annual] = rows;
  assert.equal(ptr.doc_id, '20012345');
  assert.equal(ptr.last_name, 'Pelosi');
  assert.equal(ptr.filing_type, 'P');
  assert.equal(ptr.filing_type_label, 'Periodic Transaction Report');
  assert.equal(ptr.state, 'CA');
  assert.equal(ptr.district, '11');
  assert.equal(ptr.filing_year, 2026);
  assert.equal(ptr.filing_date, '2026-04-15');
  assert.equal(ptr.is_ptr, true);
  assert.equal(ptr.is_electronic, true);
  assert.equal(
    ptr.pdf_url,
    'https://disclosures-clerk.house.gov/public_disc/ptr-pdfs/2026/20012345.pdf',
  );

  assert.equal(annual.is_ptr, false);
  assert.equal(annual.is_electronic, false); // short DocID → scanned
  assert.equal(annual.filing_type_label, 'Annual Report');
  assert.equal(annual.suffix, 'Jr');
  assert.equal(annual.pdf_url, null); // non-PTR filings use a different Clerk path
});

test('index: skips malformed/short lines, requires DocID + last', () => {
  const txt = idx([
    ['too', 'few', 'cols'],
    ['', '', '', '', 'P', 'CA11', '2026', '4/15/2026', '100000000'], // no last name
    ['', 'Nodoc', 'Ann', '', 'A', 'NY01', '2026', '1/2/2026', ''], // no doc id
  ]);
  assert.equal(parseHouseIndexTxt(txt).length, 0);
});

test('index: a header without the columns we depend on throws, never guesses', () => {
  const noDocId = [
    'Prefix',
    'Last',
    'First',
    'Suffix',
    'FilingType',
    'StateDst',
    'Year',
    'FilingDate',
  ];
  assert.throws(
    () =>
      parseHouseIndexTxt(
        withHeader(noDocId, [['Hon.', 'Pelosi', 'Nancy', '', 'P', 'CA11', '2026', '4/15/2026']]),
      ),
    /missing columns: docId/,
  );
  assert.throws(
    () => parseHouseIndexTxt(['Prefix\tLast\tFirst', 'a\tb\tc'].join('\r\n')),
    /missing columns/,
  );
  // Empty input is not a broken header — it is simply nothing to parse.
  assert.deepEqual(parseHouseIndexTxt(''), []);
});

test('index: nine-column layout (2015-2026) has no covered_year or disclosure_type', () => {
  const rows = parseHouseIndexTxt(
    idx([
      ['Hon.', 'Pelosi', 'Nancy', '', 'P', 'CA11', '2026', '4/15/2026', '100012345'],
      ['Mr.', 'Smith', 'John', 'Jr', 'A', 'TX02', '2026', '1/2/2026', '8068'],
      ['Mrs.', 'Doe', 'Jane', '', 'C', 'FL07', '2026', '12/1/2026', '30022233'],
    ]),
  );
  assert.equal(rows.length, 3);
  for (const r of rows) {
    assert.equal(r.covered_year, null);
    assert.equal(r.disclosure_type, null);
  }
  assert.equal(rows[0].filing_date, '2026-04-15');
  assert.equal(rows[0].doc_id, '100012345');
  assert.equal(rows[2].filing_date, '2026-12-01');
  assert.equal(rows[2].doc_id, '30022233');
});

/* The bug this parser was changed to fix. Read positionally, these rows give
   filing_date = toISO('2013') = null and doc_id = '1/2/2013'. */
test('index: eleven-column layout (2008-2014) reads date, doc id and the extra columns', () => {
  const rows = parseHouseIndexTxt(
    withHeader(HEADER_11, [
      // Realistic legacy values: the PTR is FilingType 'O' with the marker in
      // DisclosureType, which is how 2,146 of 2013's 2,318 PTRs actually look.
      ['Hon.', 'Pelosi', 'Nancy', '', 'O', 'CA12', '2013', '2012', '1/2/2013', '8220001', 'PTR'],
      ['Mr.', 'Ryan', 'Paul', '', 'A', 'WI01', '2013', '2012', '5/15/2013', '10004321', 'FD'],
      ['Hon.', 'Lewis', 'John', '', 'C', 'GA05', '2013', '2011', '12/31/2013', '8220099', 'FD'],
    ]),
  );
  assert.equal(rows.length, 3);

  const [ptr, annual, candidate] = rows;
  assert.equal(ptr.doc_id, '8220001');
  assert.equal(ptr.filing_date, '2013-01-02');
  assert.equal(ptr.filing_year, 2013);
  assert.equal(ptr.covered_year, 2012);
  assert.equal(ptr.disclosure_type, 'PTR');
  assert.equal(ptr.state, 'CA');
  assert.equal(ptr.district, '12');
  assert.equal(ptr.is_ptr, true); // from DisclosureType, not FilingType
  assert.equal(ptr.filing_type, 'O');
  assert.equal(ptr.is_electronic, false); // 7-digit id → scanned paper
  assert.equal(
    ptr.pdf_url,
    'https://disclosures-clerk.house.gov/public_disc/ptr-pdfs/2013/8220001.pdf',
  );

  assert.equal(annual.doc_id, '10004321');
  assert.equal(annual.filing_date, '2013-05-15');
  assert.equal(annual.covered_year, 2012);
  assert.equal(annual.disclosure_type, 'FD');
  assert.equal(annual.is_electronic, true);
  assert.equal(annual.pdf_url, null); // non-PTR

  assert.equal(candidate.doc_id, '8220099');
  assert.equal(candidate.filing_date, '2013-12-31');
  assert.equal(candidate.covered_year, 2011); // differs from filing_year
  assert.equal(candidate.filing_year, 2013);
});

test('index: PTR detection reads whichever signal the layout provides', () => {
  // Legacy: DisclosureType is the marker and FilingType means something else.
  const legacy = parseHouseIndexTxt(
    withHeader(HEADER_11, [
      ['Hon.', 'Ptr', 'Olivia', '', 'O', 'CA12', '2013', '2012', '1/2/2013', '8220001', 'PTR'],
      ['Hon.', 'Ptr', 'Amy', '', 'A', 'CA13', '2013', '2012', '1/3/2013', '8220002', 'ptr'],
      ['Hon.', 'Notptr', 'Ned', '', 'O', 'NY01', '2013', '2012', '1/4/2013', '8220003', 'FD'],
      // A legacy 'P' is NOT a PTR: its DisclosureType says otherwise, and the
      // modern signal must not be inferred where the legacy one exists.
      ['Hon.', 'Notptr', 'Pat', '', 'P', 'NY02', '2013', '2012', '1/5/2013', '8220004', 'FD'],
    ]),
  );
  assert.deepEqual(
    legacy.map((r) => r.is_ptr),
    [true, true, false, false],
  );
  assert.equal(legacy[0].filing_type, 'O');
  assert.equal(legacy[0].disclosure_type, 'PTR');
  assert.equal(legacy[1].disclosure_type, 'ptr'); // raw value kept, match is case-insensitive
  assert.equal(legacy[2].disclosure_type, 'FD');

  // Modern: FilingType 'P', and no DisclosureType column to consult.
  const modern = parseHouseIndexTxt(
    idx([
      ['Hon.', 'Pelosi', 'Nancy', '', 'P', 'CA11', '2026', '4/15/2026', '100012345'],
      ['Mr.', 'Smith', 'John', '', 'A', 'TX02', '2026', '1/2/2026', '100012346'],
    ]),
  );
  assert.equal(modern[0].is_ptr, true);
  assert.equal(modern[0].disclosure_type, null);
  assert.equal(modern[1].is_ptr, false);
});

test('index: implausible dates are rejected and the raw string is kept', () => {
  // The six real anomalies in the Clerk's 2013 file are of these two shapes.
  assert.equal(toISO('6/14/3013'), null);
  assert.equal(toISO('5/15/2031'), null);
  assert.equal(toISO('4/15/2026'), '2026-04-15');
  assert.equal(toISO('1/2/1990'), '1990-01-02');
  assert.equal(toISO('1/2/1989'), null); // below MIN_YEAR

  const rows = parseHouseIndexTxt(
    withHeader(HEADER_11, [
      ['Hon.', 'Typo', 'Tam', '', 'O', 'CA12', '2013', '2012', '6/14/3013', '8220010', 'PTR'],
      ['Hon.', 'Good', 'Gus', '', 'O', 'CA13', '2013', '2012', '5/15/2013', '8220011', 'PTR'],
      // A withdrawal legitimately carries no date; that is absence, not error,
      // so filing_date_raw stays null and it is not counted as a bad date.
      ['Hon.', 'Draw', 'Wes', '', 'W', 'CA14', '2013', '2012', '', '8220012', 'FD'],
    ]),
  );
  assert.equal(rows[0].filing_date, null);
  assert.equal(rows[0].filing_date_raw, '6/14/3013');
  assert.equal(rows[1].filing_date, '2013-05-15');
  assert.equal(rows[1].filing_date_raw, null);
  assert.equal(rows[2].filing_date, null);
  assert.equal(rows[2].filing_date_raw, null);
  assert.equal(rows.filter((r) => r.filing_date_raw).length, 1); // what bad_dates counts
});

test('index: header matching is exact, so "Year" never binds to "Filing Year"', () => {
  // Reversed order in the source would still resolve each to its own column.
  const header = [
    'Last',
    'First',
    'FilingType',
    'StateDst',
    'Filing Year',
    'Year',
    'FilingDate',
    'DocID',
  ];
  const [row] = parseHouseIndexTxt(
    withHeader(header, [['Doe', 'Jane', 'P', 'NY01', '2009', '2010', '3/4/2010', '8300123']]),
  );
  assert.equal(row.filing_year, 2010);
  assert.equal(row.covered_year, 2009);
  assert.equal(row.filing_date, '2010-03-04');
  assert.equal(row.doc_id, '8300123');
});

test('toISO: M/D/YYYY → YYYY-MM-DD; junk → null', () => {
  assert.equal(toISO('4/15/2026'), '2026-04-15');
  assert.equal(toISO('12/1/2025'), '2025-12-01');
  assert.equal(toISO('not a date'), null);
});

test('brackets: matches by low bound and by span; open-ended top', () => {
  const b = matchBracket('$1,001 - $15,000');
  assert.deepEqual(b, { low: 1001, high: 15000, midpoint: 8000.5, label: '$1,001 - $15,000' });

  const over = matchBracket('Over $50,000,000');
  assert.equal(over.high, null);
  assert.equal(over.midpoint, 50000001); // no high → floor
  assert.equal(over.label, 'Over $50,000,000');

  assert.equal(matchBracket('no dollars here'), null);
  assert.equal(AMOUNT_BRACKETS.length, 10);
});

test('PTR: parses a listed security row with ticker', () => {
  const { trades } = parsePtrText('Apple Inc. (AAPL) P 04/15/2026 05/01/2026 $1,001 - $15,000');
  assert.equal(trades.length, 1);
  const t = trades[0];
  assert.equal(t.ticker, 'AAPL');
  assert.equal(t.asset_name, 'Apple Inc.');
  assert.equal(t.tx_type, 'P');
  assert.equal(t.tx_date, '2026-04-15');
  assert.equal(t.notification_date, '2026-05-01');
  assert.equal(t.amount_bracket_label, '$1,001 - $15,000');
  assert.equal(t.amount_midpoint, 8000.5);
});

test('PTR: non-security asset parses with ticker=null (no guessing)', () => {
  const { trades } = parsePtrText('SP US Treasury Note S 03/02/2026 04/01/2026 $15,001 - $50,000');
  assert.equal(trades.length, 1);
  assert.equal(trades[0].ticker, null);
  assert.equal(trades[0].asset_name, 'US Treasury Note');
  assert.equal(trades[0].tx_type, 'S');
});

test('PTR: ignores non-transaction lines (no bracket or no date)', () => {
  const text = [
    'PERIODIC TRANSACTION REPORT',
    'Asset Transaction Date Amount',
    'Apple Inc. (AAPL) P 04/15/2026 05/01/2026 $1,001 - $15,000',
    'Filer: Hon. Nancy Pelosi',
  ].join('\n');
  const { trades } = parsePtrText(text);
  assert.equal(trades.length, 1);
});

test('looksScanned: short/empty text flagged, real text is not', () => {
  assert.equal(looksScanned(''), true);
  assert.equal(looksScanned('   '), true);
  assert.equal(looksScanned('x'.repeat(400)), false);
});

/* ---------------------------------------------------------------------------
   doc_id de-duplication.

   The Clerk's 2015+ index files repeat some DocIDs inside a single year.
   Postgres rejects an ON CONFLICT DO UPDATE batch that names the same conflict
   key twice AND rejects the whole batch, which is how an ingest that parsed
   45,774 rows wrote 2008-2014 and 2026 and lost every year in between.
   --------------------------------------------------------------------------- */

test('dedupe: same DocID twice keeps the later filing_date', () => {
  const { rows, duplicates, duplicateIds } = dedupeByDocId([
    { doc_id: '20001234', filing_date: '2021-05-01', last: 'EARLIER' },
    { doc_id: '20009999', filing_date: '2021-06-01', last: 'OTHER' },
    { doc_id: '20001234', filing_date: '2021-08-14', last: 'LATER' },
  ]);
  assert.equal(rows.length, 2);
  assert.equal(duplicates, 1);
  assert.deepEqual(duplicateIds, ['20001234']);
  const kept = rows.find((r) => r.doc_id === '20001234');
  assert.equal(kept.last, 'LATER');
  assert.equal(kept.filing_date, '2021-08-14');
  /* First-seen ordering survives: the winner takes the loser's slot rather
     than moving to the end. */
  assert.equal(rows[0].doc_id, '20001234');
});

test('dedupe: a null filing_date loses to a dated row, in either order', () => {
  const datedSecond = dedupeByDocId([
    { doc_id: 'A', filing_date: null, last: 'UNDATED' },
    { doc_id: 'A', filing_date: '2019-02-02', last: 'DATED' },
  ]);
  assert.equal(datedSecond.rows.length, 1);
  assert.equal(datedSecond.rows[0].last, 'DATED');

  /* The important direction: a later-in-file undated row must NOT displace an
     earlier dated one, or the file-order tie-break would silently win. */
  const datedFirst = dedupeByDocId([
    { doc_id: 'A', filing_date: '2019-02-02', last: 'DATED' },
    { doc_id: 'A', filing_date: null, last: 'UNDATED' },
  ]);
  assert.equal(datedFirst.rows.length, 1);
  assert.equal(datedFirst.rows[0].last, 'DATED');
});

test('dedupe: equal dates fall back to later file order', () => {
  const { rows } = dedupeByDocId([
    { doc_id: 'A', filing_date: '2020-01-01', last: 'FIRST' },
    { doc_id: 'A', filing_date: '2020-01-01', last: 'SECOND' },
  ]);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].last, 'SECOND');
});

test('dedupe: two undated rows collapse to the later one', () => {
  const { rows, duplicates } = dedupeByDocId([
    { doc_id: 'A', filing_date: null, last: 'FIRST' },
    { doc_id: 'A', filing_date: null, last: 'SECOND' },
  ]);
  assert.equal(rows.length, 1);
  assert.equal(duplicates, 1);
  assert.equal(rows[0].last, 'SECOND');
});

test('dedupe: three copies count as two duplicates, listed once', () => {
  const { rows, duplicates, duplicateIds } = dedupeByDocId([
    { doc_id: 'A', filing_date: '2020-01-01' },
    { doc_id: 'A', filing_date: '2020-03-01' },
    { doc_id: 'A', filing_date: '2020-02-01' },
  ]);
  assert.equal(rows.length, 1);
  assert.equal(duplicates, 2);
  assert.deepEqual(duplicateIds, ['A']);
  assert.equal(rows[0].filing_date, '2020-03-01');
});

test('dedupe: rows without a doc_id are passed through, never collapsed', () => {
  const { rows, duplicates } = dedupeByDocId([
    { doc_id: null, last: 'ONE' },
    { doc_id: '', last: 'TWO' },
    { doc_id: 'A', last: 'THREE' },
  ]);
  assert.equal(rows.length, 3);
  assert.equal(duplicates, 0);
});

test('dedupe: a clean year is returned unchanged', () => {
  const input = [
    { doc_id: 'A', filing_date: '2020-01-01' },
    { doc_id: 'B', filing_date: '2020-01-02' },
    { doc_id: 'C', filing_date: null },
  ];
  const { rows, duplicates, duplicateIds } = dedupeByDocId(input);
  assert.deepEqual(rows, input);
  assert.equal(duplicates, 0);
  assert.deepEqual(duplicateIds, []);
});

test('dedupe: every doc_id in the output is unique (the Postgres precondition)', () => {
  const { rows } = dedupeByDocId([
    { doc_id: 'A', filing_date: '2020-01-01' },
    { doc_id: 'B', filing_date: '2020-01-01' },
    { doc_id: 'A', filing_date: '2020-02-01' },
    { doc_id: 'C', filing_date: '2020-01-01' },
    { doc_id: 'B', filing_date: '2020-05-01' },
  ]);
  const ids = rows.map((r) => r.doc_id).filter(Boolean);
  assert.equal(new Set(ids).size, ids.length);
  assert.equal(rows.length, 3);
});

/* ---------------------------------------------------------------------------
   isElectronicDocId.

   The old rule wanted a 9-digit id beginning 100/300. No such id exists in the
   Clerk's data at any year, so it matched nothing and parse-house-ptrs had
   no work to do. Counts below are from the 48,895 rows in
   house_disclosure_filings.
   --------------------------------------------------------------------------- */

test('electronic: 8-digit ids beginning 2 (PTRs) and 1 (annual reports)', () => {
  assert.equal(isElectronicDocId('20026590'), true); // 5,651 PTRs, 2015-2026
  assert.equal(isElectronicDocId('10078673'), true); // 14,680 reports, 2015-2026
});

test('electronic: legacy 7-digit ids beginning 2 (2012-2013 PTRs)', () => {
  /* Every PTR in 2012 and 2013 is one of these — 3,131 filings, and no 8- or
     9-prefixed id appears in either year. Same counter as the 8-digit series
     before it rolled over, so excluding them would drop two whole years. */
  assert.equal(isElectronicDocId('2012345'), true);
  assert.equal(isElectronicDocId('2999999'), true);
});

test('scanned: 7-digit ids beginning 8 or 9 are paper', () => {
  assert.equal(isElectronicDocId('9115765'), false);
  assert.equal(isElectronicDocId('8214528'), false);
});

test('electronic: short, empty, null and 9-digit ids are not electronic', () => {
  assert.equal(isElectronicDocId('8068'), false);
  assert.equal(isElectronicDocId(''), false);
  assert.equal(isElectronicDocId(null), false);
  assert.equal(isElectronicDocId(undefined), false);
  /* The shape the old rule looked for. It never existed; asserting it stays
     false keeps anyone from "restoring" it. */
  assert.equal(isElectronicDocId('100123456'), false);
  assert.equal(isElectronicDocId('300123456'), false);
});

test('electronic: non-numeric and padded ids are rejected outright', () => {
  assert.equal(isElectronicDocId('2002659a'), false);
  assert.equal(isElectronicDocId(' 20026590'), false);
  assert.equal(isElectronicDocId('20026590\n'), false);
  /* 8-digit ids beginning 3, 4 and 5 exist (5,397 rows) and are not the
     electronic series. */
  assert.equal(isElectronicDocId('30012345'), false);
  assert.equal(isElectronicDocId('40012345'), false);
});

/* ---------------------------------------------------------------------------
   writeWithOptionalColumn: writing a column a pending migration has not
   created yet must degrade, not fail the whole write.
   --------------------------------------------------------------------------- */

test('optional column: a clean write passes the payload through untouched', async () => {
  const seen = [];
  const r = await writeWithOptionalColumn({ a: 1, dup: 2 }, 'dup', async (row) => {
    seen.push(row);
    return { error: null };
  });
  assert.equal(r.error, null);
  assert.equal(r.degraded, false);
  assert.equal(seen.length, 1);
  assert.deepEqual(seen[0], { a: 1, dup: 2 });
});

test('optional column: undefined_column retries without that key only', async () => {
  const seen = [];
  const r = await writeWithOptionalColumn({ a: 1, dup: 2 }, 'dup', async (row) => {
    seen.push(row);
    return seen.length === 1
      ? { error: { code: '42703', message: 'column "dup" does not exist' } }
      : { error: null };
  });
  assert.equal(r.error, null);
  assert.equal(r.degraded, true);
  assert.deepEqual(seen[1], { a: 1 });
});

test('optional column: an unrelated error is returned, never retried', async () => {
  let calls = 0;
  const r = await writeWithOptionalColumn({ a: 1, dup: 2 }, 'dup', async () => {
    calls += 1;
    return { error: { code: '23505', message: 'duplicate key value' } };
  });
  assert.equal(calls, 1);
  assert.equal(r.degraded, false);
  assert.equal(r.error.code, '23505');
});

test('optional column: a missing OTHER column is not papered over', async () => {
  /* The code says undefined_column but names a different column, so dropping
     `dup` would not fix it and would hide the real problem. */
  let calls = 0;
  const r = await writeWithOptionalColumn({ a: 1, dup: 2 }, 'dup', async () => {
    calls += 1;
    return { error: { code: '42703', message: 'column "something_else" does not exist' } };
  });
  assert.equal(calls, 1);
  assert.equal(r.degraded, false);
});

test('isUnknownColumn: needs both the code and the column name', () => {
  assert.equal(isUnknownColumn({ code: '42703', message: 'column "dup" ...' }, 'dup'), true);
  assert.equal(isUnknownColumn({ code: 'PGRST204', message: "'dup' column ..." }, 'dup'), true);
  assert.equal(isUnknownColumn({ code: '42703', message: 'column "x" ...' }, 'dup'), false);
  assert.equal(isUnknownColumn({ code: '23505', message: 'column "dup" ...' }, 'dup'), false);
  assert.equal(isUnknownColumn(null, 'dup'), false);
  assert.equal(isUnknownColumn({ code: '42703', message: 'column "dup"' }, ''), false);
});

/* ── wrapped asset cells (real PTR layouts, 2021 to 2026) ── */

test('parsePtrText: ticker and asset type on the wrapped line', () => {
  const { trades } = parsePtrText(
    [
      'JT Alphabet Inc. - Class C Capital Stock S 01/13/2025 01/13/2025 $1,001 - $15,000',
      '(GOOG) [ST]',
      'F S : New',
      'SP UnitedHealth Group Incorporated P 04/10/2025 05/15/2025 $1,001 - $15,000',
      'Common Stock (UNH) [ST]',
      'F S : New',
    ].join('\n'),
  );
  assert.equal(trades.length, 2);
  assert.equal(trades[0].ticker, 'GOOG');
  assert.equal(trades[0].asset_type, 'ST');
  assert.equal(trades[0].owner, 'JT');
  assert.equal(trades[0].asset_name, 'Alphabet Inc. - Class C Capital Stock');
  assert.equal(trades[1].ticker, 'UNH');
  assert.equal(trades[1].owner, 'SP');
  assert.equal(trades[1].asset_name, 'UnitedHealth Group Incorporated Common Stock');
});

test('parsePtrText: "S (partial)" is a sale, not a missing type', () => {
  const { trades } = parsePtrText(
    'US Treasury Bill 912797JR9 [GS] S (partial) 01/08/2025 02/04/2025 $15,001 -\n$50,000\nF S : New',
  );
  assert.equal(trades.length, 1);
  assert.equal(trades[0].tx_type, 'S (partial)');
  assert.equal(trades[0].tx_date, '2025-01-08');
  assert.equal(trades[0].amount_low, 15001);
});

test('parsePtrText: a bond maturity date is not the trade date, and its wrap is not a row', () => {
  const { trades } = parsePtrText(
    [
      'PA ST UNIV 5.0% 09/01/2035 DTD P 04/08/2025 04/08/2025 $50,001 -',
      'REV RE; 4.0%; Due 09/01/2041 [GS] $100,000',
      'F S : New',
    ].join('\n'),
  );
  assert.equal(trades.length, 1);
  assert.equal(trades[0].tx_date, '2025-04-08');
  assert.equal(trades[0].tx_type, 'P');
  assert.equal(trades[0].asset_type, 'GS');
});

test('parsePtrText: exact sub-$1,001 amounts are kept as filed', () => {
  const { trades } = parsePtrText('Centene Corporation (CNC) [ST] S 02/16/2021 02/16/2021 $581.86');
  assert.equal(trades.length, 1);
  assert.equal(trades[0].amount_low, 581.86);
  assert.equal(trades[0].amount_high, 581.86);
  assert.equal(trades[0].ticker, 'CNC');
});

test('parsePtrText: pre-2021 fonts that extract capitals as lowercase', () => {
  const { trades } = parsePtrText(
    '8x8 Inc (EgHT) [ST] P 03/10/2020 04/01/2020 $15,001 -\ng f e d c\n$50,000\nF IlINg S TATuS : New',
  );
  assert.equal(trades.length, 1);
  assert.equal(trades[0].ticker, 'EGHT');
  assert.equal(trades[0].asset_name, '8x8 Inc');
});
