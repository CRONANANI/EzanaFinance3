/**
 * Unit tests for the Senate eFD ingest (pure helpers, no network).
 *   node scripts/check-senate-efd.mjs   (also `npm run test:senate`)
 *
 * The fixtures mirror eFD's markup: the DataTables search row and the
 * electronic PTR transactions table.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { efdDate, parseListRow, parsePtrHtml, usDate } from '../src/lib/politicians/senate-efd.js';
import {
  buildMemberIndex,
  candidateFromSenate,
  legislatorsToMembers,
  matchMember,
} from '../src/lib/politicians/congress-ingest.js';

const PTR_ROW = [
  'Thomas H',
  'Tuberville',
  'Tuberville, Tommy (Senator)',
  '<a href="/search/view/ptr/1a2b3c4d-0000-4000-8000-0123456789ab/" target="_blank">Periodic Transaction Report for 09/12/2026</a>',
  '09/15/2026',
];
const PAPER_ROW = [
  'Jane',
  'Doe',
  'Doe, Jane (Senator)',
  '<a href="/search/view/paper/abcdef12-0000-4000-8000-0123456789ab/">Periodic Transaction Report (Amendment 1)</a>',
  '01/03/2026',
];

const PTR_HTML = `
<section class="card"><div class="table-responsive">
<table class="table table-striped">
  <thead><tr class="header">
    <th scope="col">#</th><th scope="col">Transaction Date</th><th scope="col">Owner</th>
    <th scope="col">Ticker</th><th scope="col">Asset Name</th><th scope="col">Asset Type</th>
    <th scope="col">Type</th><th scope="col">Amount</th><th scope="col">Comment</th>
  </tr></thead>
  <tbody>
    <tr><td>1</td><td>09/02/2026</td><td>Spouse</td>
      <td><a href="https://finance.yahoo.com/quote/MSFT" target="_blank">MSFT</a></td>
      <td>Microsoft Corporation <div class="text-muted"><em>Rate/Coupon:</em> --</div></td>
      <td>Stock</td><td>Purchase</td><td>$15,001 - $50,000</td><td>--</td></tr>
    <tr><td>2</td><td>08/28/2026</td><td>Self</td><td>--</td>
      <td>US Treasury Bill &amp; Note</td><td>Other Securities</td>
      <td>Sale (Partial)</td><td>Over $50,000,000</td><td>--</td></tr>
  </tbody>
</table></div></section>`;

test('dates convert both ways', () => {
  assert.equal(usDate('09/02/2026'), '2026-09-02');
  assert.equal(usDate('9/2/2026'), '2026-09-02');
  assert.equal(usDate('--'), null);
  assert.equal(efdDate('2026-09-02'), '09/02/2026 00:00:00');
});

test('a search row yields the filing id, kind and dates', () => {
  const f = parseListRow(PTR_ROW);
  assert.equal(f.docId, '1a2b3c4d-0000-4000-8000-0123456789ab');
  assert.equal(f.kind, 'ptr');
  assert.equal(
    f.url,
    'https://efdsearch.senate.gov/search/view/ptr/1a2b3c4d-0000-4000-8000-0123456789ab/',
  );
  assert.equal(f.last, 'Tuberville');
  assert.equal(f.filingDate, '2026-09-15');
  assert.equal(f.amendment, false);
});

test('paper filings are recognised, amendments flagged', () => {
  const f = parseListRow(PAPER_ROW);
  assert.equal(f.kind, 'paper');
  assert.equal(f.amendment, true);
  assert.equal(parseListRow(['a', 'b']), null);
  assert.equal(parseListRow(['a', 'b', 'c', 'no link', '01/01/2026']), null);
});

test('PTR table parses tickers, types and bands', () => {
  const rows = parsePtrHtml(PTR_HTML);
  assert.equal(rows.length, 2);
  const [a, b] = rows;
  assert.equal(a.tx_date, '2026-09-02');
  assert.equal(a.ticker, 'MSFT');
  assert.match(a.asset_name, /^Microsoft Corporation/);
  assert.equal(a.tx_type, 'Purchase');
  assert.equal(a.amount_low, 15001);
  assert.equal(a.amount_high, 50000);
  assert.equal(a.owner, 'Spouse');
  assert.equal(b.ticker, null, '"--" is not a ticker');
  assert.equal(b.asset_name, 'US Treasury Bill & Note');
  assert.equal(b.tx_type, 'Sale (Partial)');
  assert.equal(b.amount_low, 50000000);
  assert.equal(b.amount_high, null, 'open-ended top band');
});

test('no table → no rows', () => {
  assert.deepEqual(parsePtrHtml('<html><body>nothing</body></html>'), []);
});

test('a parsed Senate row becomes a congress_trades candidate that matches a senator', () => {
  const vendored = JSON.parse(
    readFileSync(new URL('../src/lib/politicians/legislators-current.json', import.meta.url)),
  );
  const members = legislatorsToMembers(vendored);
  const senator = members.find((m) => m.chamber === 'senate');
  const [tx] = parsePtrHtml(PTR_HTML);
  const c = candidateFromSenate({
    first_name: senator.first_name,
    last_name: senator.last_name,
    state: senator.state,
    ticker: tx.ticker,
    asset_name: tx.asset_name,
    tx_type: tx.tx_type,
    tx_date: tx.tx_date,
    notification_date: '2026-09-15',
    amount_low: tx.amount_low,
    amount_high: tx.amount_high,
    senate_disclosure_filings: {
      report_url: 'https://efdsearch.senate.gov/x/',
      filing_date: '2026-09-15',
    },
  });
  assert.equal(c.row.type, 'purchase');
  assert.equal(c.row.source, 'senate_efd');
  const hit = matchMember(buildMemberIndex(members), c.who);
  assert.equal(hit?.member.bioguide_id, senator.bioguide_id);
});
