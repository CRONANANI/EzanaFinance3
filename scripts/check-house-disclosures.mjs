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

const TAB = '\t';
function idx(rows) {
  const header = ['Prefix', 'Last', 'First', 'Suffix', 'FilingType', 'StateDst', 'Year', 'FilingDate', 'DocID'];
  return [header, ...rows].map((r) => r.join(TAB)).join('\r\n');
}

test('index: parses columns, labels, state/district, PTR + electronic flags', () => {
  const txt = idx([
    ['Hon.', 'Pelosi', 'Nancy', '', 'P', 'CA11', '2026', '4/15/2026', '100012345'],
    ['Mr.', 'Smith', 'John', 'Jr', 'A', 'TX02', '2026', '1/2/2026', '8068'],
  ]);
  const rows = parseHouseIndexTxt(txt);
  assert.equal(rows.length, 2);

  const [ptr, annual] = rows;
  assert.equal(ptr.doc_id, '100012345');
  assert.equal(ptr.last_name, 'Pelosi');
  assert.equal(ptr.filing_type, 'P');
  assert.equal(ptr.filing_type_label, 'Periodic Transaction Report');
  assert.equal(ptr.state, 'CA');
  assert.equal(ptr.district, '11');
  assert.equal(ptr.filing_year, 2026);
  assert.equal(ptr.filing_date, '2026-04-15');
  assert.equal(ptr.is_ptr, true);
  assert.equal(ptr.is_electronic, true);
  assert.equal(ptr.pdf_url, 'https://disclosures-clerk.house.gov/public_disc/ptr-pdfs/2026/100012345.pdf');

  assert.equal(annual.is_ptr, false);
  assert.equal(annual.is_electronic, false); // short DocID → scanned
  assert.equal(annual.filing_type_label, 'Annual Report');
  assert.equal(annual.suffix, 'Jr');
  assert.equal(annual.pdf_url, null); // non-PTR filings use a different Clerk path
});

test('index: skips malformed/short lines, requires DocID + last + type', () => {
  const txt = ['Prefix\tLast\tFirst', 'too\tfew\tcols', '\t\t\t\tP\tCA11\t2026\t4/15/2026\t100000000'].join('\r\n');
  const rows = parseHouseIndexTxt(txt);
  assert.equal(rows.length, 0); // last row has empty last_name → skipped
});

test('isElectronicDocId: 9-digit 100/300 true; others false', () => {
  assert.equal(isElectronicDocId('100000001'), true);
  assert.equal(isElectronicDocId('300999999'), true);
  assert.equal(isElectronicDocId('200000001'), false); // not 100/300
  assert.equal(isElectronicDocId('10001234'), false); // 8 digits
  assert.equal(isElectronicDocId('8068'), false);
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
