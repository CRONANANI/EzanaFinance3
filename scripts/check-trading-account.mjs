#!/usr/bin/env node
/**
 * Brokerage account page (/trading): view helpers and page guards.
 *   node --no-warnings --test scripts/check-trading-account.mjs
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  accountPhase,
  statusLabel,
  fmtMoney,
  fmtSignedMoney,
  fmtSignedPct,
  fmtQty,
  maskAccountNumber,
  mapPosition,
  positionTotals,
  mapLinkedHolding,
  linkedTotals,
  sortRows,
} from '../src/lib/trading/account-view.js';

const read = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

test('only ACTIVE and APPROVED unlock the active view', () => {
  assert.equal(accountPhase(null), 'none');
  assert.equal(accountPhase({ account_status: 'ACTIVE' }), 'active');
  assert.equal(accountPhase({ account_status: 'APPROVED' }), 'active');
  assert.equal(accountPhase({ account_status: 'SUBMITTED' }), 'review');
  assert.equal(accountPhase({ account_status: 'creating' }), 'review');
  assert.equal(accountPhase({ account_status: 'REJECTED' }), 'refused');
  assert.equal(accountPhase({ account_status: 'ACCOUNT_CLOSED' }), 'closed');
  assert.equal(accountPhase({ account_status: 'SOMETHING_NEW' }), 'review');
  assert.equal(accountPhase({ account_status: null }), 'review');
});

test('status words read in sentence case', () => {
  assert.equal(statusLabel('APPROVAL_PENDING'), 'Approval pending');
  assert.equal(statusLabel('SOMETHING_NEW'), 'Something new');
  assert.equal(statusLabel(''), 'N/A');
});

test('money, signs and missing values', () => {
  assert.equal(fmtMoney('147562.48'), '$147,562.48');
  assert.equal(fmtMoney(-5), '-$5.00');
  assert.equal(fmtMoney(undefined), 'N/A');
  assert.equal(fmtMoney('abc'), 'N/A');
  assert.equal(fmtSignedMoney(244.5), '+$244.50');
  assert.equal(fmtSignedMoney(-38.25), '-$38.25');
  assert.equal(fmtSignedMoney(0), '$0.00');
  assert.equal(fmtSignedPct(2.774), '+2.77%');
  assert.equal(fmtSignedPct(-0.86), '-0.86%');
  assert.equal(fmtSignedPct(null), 'N/A');
  assert.equal(fmtQty('1.5'), '1.5');
  assert.equal(fmtQty(50), '50');
  assert.equal(maskAccountNumber('123456789'), '****6789');
  assert.equal(maskAccountNumber(null), 'N/A');
});

test('broker position rows map to percentages and totals', () => {
  const rows = [
    {
      symbol: 'aapl',
      qty: '50',
      avg_entry_price: '176.32',
      current_price: '181.21',
      market_value: '9060.50',
      cost_basis: '8816.00',
      unrealized_pl: '244.50',
      unrealized_plpc: '0.0277',
      change_today: '0.0084',
    },
    {
      symbol: 'JPM',
      qty: '25',
      market_value: '4410.00',
      cost_basis: '4448.25',
      unrealized_pl: '-38.25',
      unrealized_plpc: '-0.0086',
    },
  ].map(mapPosition);
  assert.equal(rows[0].symbol, 'AAPL');
  assert.ok(Math.abs(rows[0].unrealizedPct - 2.77) < 1e-9);
  assert.equal(rows[1].todayPct, null);
  const t = positionTotals(rows);
  assert.equal(t.marketValue, 13470.5);
  assert.equal(t.costBasis, 13264.25);
  assert.ok(Math.abs(t.unrealized - 206.25) < 1e-9);
  assert.ok(Math.abs(t.unrealizedPct - (206.25 / 13264.25) * 100) < 1e-9);
});

test('a total is N/A when any row lacks the figure', () => {
  const rows = [mapPosition({ symbol: 'A', market_value: '10' }), mapPosition({ symbol: 'B' })];
  assert.equal(positionTotals(rows).marketValue, null);
  assert.equal(positionTotals([]).marketValue, null);
});

test('linked holdings: a zero cost basis is missing, never a 0% gain', () => {
  const a = mapLinkedHolding({
    ticker: 'vti',
    name: 'Total market fund',
    totalQuantity: 10,
    totalValue: 2500,
    totalCostBasis: 2000,
    lastPrice: 250,
    freshness: 'end_of_day',
  });
  assert.equal(a.gain, 500);
  assert.equal(a.gainPct, 25);
  assert.equal(a.avgCost, 200);
  assert.equal(a.pricing, 'End of day');
  const b = mapLinkedHolding({ ticker: 'X', totalQuantity: 1, totalValue: 100, totalCostBasis: 0 });
  assert.equal(b.costBasis, null);
  assert.equal(b.gain, null);
  assert.equal(b.gainPct, null);
  assert.equal(b.pricing, 'Intraday');
  assert.equal(linkedTotals([a]).gain, 500);
  const t = linkedTotals([a, b]);
  assert.equal(t.marketValue, 2600);
  assert.equal(t.costBasis, null);
  assert.equal(t.gain, null);
});

test('sorting keeps missing values last in both directions', () => {
  const rows = [{ v: 2 }, { v: null }, { v: 5 }];
  assert.deepEqual(
    sortRows(rows, 'v', 'asc').map((r) => r.v),
    [2, 5, null],
  );
  assert.deepEqual(
    sortRows(rows, 'v', 'desc').map((r) => r.v),
    [5, 2, null],
  );
});

test('the page is read-only: no order, transfer, close or removal request', () => {
  const src =
    read('src/components/trading/account/BrokerageAccountPage.jsx') +
    read('src/app/(dashboard)/trading/page.js');
  assert.doesNotMatch(src, /api\/alpaca\//);
  assert.doesNotMatch(src, /api\/trading\/orders/);
  assert.doesNotMatch(src, /api\/trading\/create-account/);
  assert.doesNotMatch(src, /snaptrade\/connections/);
  assert.doesNotMatch(src, /method:\s*['"](POST|DELETE|PUT|PATCH)['"]/);
  const calls = [...src.matchAll(/fetch\(\s*['"`]([^'"`]+)['"`]/g)].map((m) => m[1]).sort();
  assert.deepEqual(calls, ['/api/portfolio/holdings', '/api/trading/portfolio']);
});

test('no sample content layer and the real legal line with its links', () => {
  const src = read('src/components/trading/account/BrokerageAccountPage.jsx');
  assert.doesNotMatch(src, /demo-page|isCommunityDemoViewer|\/sample['"`]/);
  assert.doesNotMatch(src, /Sample content['"<]/);
  assert.match(src, /Brokerage services provided by Alpaca Securities LLC, member/);
  assert.match(src, /https:\/\/www\.finra\.org/);
  assert.match(src, /https:\/\/www\.sipc\.org/);
  assert.match(src, /Investments involve risk and are not FDIC insured\./);
});

test('the page is on the canvas and the old dashboard address lands here', () => {
  const page = read('src/app/(dashboard)/trading/page.js');
  const imports = [...page.matchAll(/^import ['"][^'"]+\.css['"];/gm)].map((m) => m[0]);
  assert.ok(imports.at(-1).includes('home-canvas.css'));
  assert.match(
    read('src/components/trading/account/BrokerageAccountPage.jsx'),
    /className="[^"]*\bez-canvas\b/,
  );
  assert.match(read('src/app/(dashboard)/trading/dashboard/page.js'), /redirect\('\/trading'\)/);
});
