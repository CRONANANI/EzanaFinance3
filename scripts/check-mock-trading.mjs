/**
 * Mock Trading redesign (Nov 2026): the pure helpers in
 * src/lib/trading/mock-ticket.js, plus page wiring and token rules.
 *   node --no-warnings --test scripts/check-mock-trading.mjs
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  disabledRanges,
  fmtCompactUSD,
  fmtDateTime,
  fmtQty,
  fmtSignedPct,
  fmtSignedUSD,
  fmtUSD,
  parseAmount,
  positionRow,
  rangeCaption,
  relativeTime,
  sortPositions,
  summarizePortfolio,
  ticketState,
} from '../src/lib/trading/mock-ticket.js';

test('formats: money, signed deltas, compact headline, shares', () => {
  assert.equal(fmtUSD(12438.2), '$12,438.20');
  assert.equal(fmtUSD(-5), '-$5.00');
  assert.equal(fmtSignedUSD(240.18), '+$240.18');
  assert.equal(fmtSignedUSD(-120.4), '-$120.40');
  assert.equal(fmtSignedPct(1.974), '+1.97%');
  assert.equal(fmtSignedPct(-0.92), '-0.92%');
  assert.equal(fmtCompactUSD(1971487.21), '$1.971M');
  assert.equal(fmtQty(0.89871234), '0.8987');
  assert.equal(fmtQty(720), '720');
  assert.equal(fmtQty(1000.5), '1,000.5');
  assert.match(fmtDateTime(new Date(2025, 0, 20, 10, 24)), /^Jan 20, 2025 at 10:24\sAM$/);
});

test('amount parsing accepts commas and a dollar sign', () => {
  assert.equal(parseAmount('1,000.50'), 1000.5);
  assert.equal(parseAmount('$500'), 500);
  assert.equal(parseAmount(''), 0);
  assert.equal(parseAmount('-3'), 0);
  assert.equal(parseAmount('abc'), 0);
});

test('summary: total P&L = unrealised + realised and matches the rows', () => {
  const rows = [
    positionRow({ symbol: 'NVDA', qty: 10, avgCost: 100, currentPrice: 120 }),
    positionRow({ symbol: 'TSLA', qty: 5, avgCost: 200, currentPrice: 180 }),
  ];
  const s = summarizePortfolio({ cash: 50_000, startingCash: 52_000, positions: rows });
  assert.equal(s.marketValue, 10 * 120 + 5 * 180);
  assert.equal(s.costBasis, 10 * 100 + 5 * 200);
  assert.equal(s.unrealised, rows[0].pnl + rows[1].pnl, 'unrealised equals the sum of the rows');
  assert.equal(s.totalValue, 50_000 + 2_100);
  assert.equal(s.totalPnl, 100);
  assert.equal(s.realised + s.unrealised, s.totalPnl);
  assert.equal(s.count, 2, 'the count comes from the data');
  assert.ok(Math.abs(s.totalPnlPct - (100 / 52_000) * 100) < 1e-9);
});

test('positions sort by any column, both directions', () => {
  const rows = [
    positionRow({
      symbol: 'MSFT',
      qty: 1,
      avgCost: 400,
      currentPrice: 420,
      openedAt: '2024-04-29',
    }),
    positionRow({ symbol: 'GLW', qty: 100, avgCost: 31, currentPrice: 30, openedAt: '2024-01-03' }),
    positionRow({
      symbol: 'NVDA',
      qty: 2,
      avgCost: 800,
      currentPrice: 1100,
      openedAt: '2024-04-29',
    }),
  ];
  assert.deepEqual(
    sortPositions(rows, 'value', 'desc').map((r) => r.symbol),
    ['GLW', 'NVDA', 'MSFT'],
  );
  assert.deepEqual(
    sortPositions(rows, 'pnl', 'asc').map((r) => r.symbol),
    ['GLW', 'MSFT', 'NVDA'],
  );
  assert.deepEqual(
    sortPositions(rows, 'symbol', 'asc').map((r) => r.symbol),
    ['GLW', 'MSFT', 'NVDA'],
  );
  assert.equal(sortPositions(rows, 'opened', 'asc')[0].symbol, 'GLW');
  assert.deepEqual(
    sortPositions(rows, null).map((r) => r.symbol),
    ['MSFT', 'GLW', 'NVDA'],
  );
});

test('ticket: summary values, Max, and every blocking reason', () => {
  const base = { cash: 1_000, price: 100, symbol: 'NVDA', position: { qty: 3 } };
  const buy = ticketState({ ...base, side: 'buy', amount: 250 });
  assert.equal(buy.shares, 2.5);
  assert.equal(buy.cashAfter, 750);
  assert.equal(buy.max, 1_000);
  assert.equal(buy.canSubmit, true);

  const sell = ticketState({ ...base, side: 'sell', amount: 250 });
  assert.equal(sell.cashAfter, 1_250, 'a sell adds to cash');
  assert.equal(sell.max, 300, 'Max on a sell is the position value');

  assert.match(
    ticketState({ ...base, side: 'buy', amount: 1_500 }).reason,
    /Over your available cash/,
  );
  assert.match(
    ticketState({ ...base, side: 'sell', amount: 301 }).reason,
    /Over your NVDA position/,
  );
  assert.match(
    ticketState({ ...base, side: 'sell', amount: 10, position: null }).reason,
    /don't hold any NVDA/,
  );
  assert.match(ticketState({ ...base, side: 'buy', amount: 10, symbol: null }).reason, /Search/);
  assert.match(
    ticketState({ ...base, side: 'buy', amount: 10, price: null }).reason,
    /No live price/,
  );
  const empty = ticketState({ ...base, side: 'buy', amount: 0 });
  assert.equal(empty.canSubmit, false);
  assert.equal(empty.showReason, false, 'an empty amount is a prompt, not an error');
});

test('chart ranges longer than the account history are disabled', () => {
  const now = Date.UTC(2026, 10, 9);
  const day = 86400000;
  assert.deepEqual(disabledRanges(new Date(now - 120 * day).toISOString(), now), [
    '1Y',
    '3Y',
    '5Y',
    '10Y',
  ]);
  assert.deepEqual(disabledRanges(new Date(now - 400 * day).toISOString(), now), ['5Y', '10Y']);
  assert.deepEqual(disabledRanges(new Date(now - 20 * day).toISOString(), now), [
    '6M',
    '1Y',
    '3Y',
    '5Y',
    '10Y',
  ]);
  assert.deepEqual(disabledRanges(null, now), []);
  assert.equal(rangeCaption('ALL'), 'Since inception');
  assert.equal(rangeCaption('6M'), 'Last 6M');
  assert.equal(relativeTime(now - 2000, now), '2s ago');
  assert.equal(relativeTime(now - 5 * 60000, now), '5m ago');
});

test('page wiring and token discipline', () => {
  const page = fs.readFileSync('src/app/(dashboard)/trading/mock/page.js', 'utf8');
  const css = fs.readFileSync('src/app/(dashboard)/trading/mock/mock-trading.css', 'utf8');
  const sections = fs.readFileSync('src/components/trading/mock/MockSections.jsx', 'utf8');
  const ticket = fs.readFileSync('src/components/trading/mock/OrderTicket.jsx', 'utf8');
  for (const [name, src] of [
    ['page', page],
    ['css', css],
    ['sections', sections],
    ['ticket', ticket],
  ]) {
    assert.ok(!src.includes(String.fromCharCode(8212)), `${name}: em dash`);
    assert.doesNotMatch(src, /#[0-9a-fA-F]{3,8}\b(?![\w-])/, `${name}: hex colour`);
    assert.doesNotMatch(src, /lucide-react|window\.confirm|Math\.random/, `${name}: stack rules`);
  }
  assert.doesNotMatch(
    page + ticket,
    /real-time via FMP|✓/,
    'no infrastructure names or glyph icons in copy',
  );
  assert.match(
    ticket,
    /Paper trading only\. No real money involved\. Prices update throughout the trading day\./,
  );
  assert.match(page, /summarizePortfolio\(/, 'KPIs come from one summary');
  assert.match(page, /<ClosePositionModal/, 'Close is confirmed in a modal');
  assert.match(page, /<ResetPortfolioModal/, 'Reset is confirmed in a modal');
  assert.match(sections, /aria-sort=/, 'sortable headers announce their state');
  assert.match(ticket, /role="combobox"/, 'keyboard-navigable typeahead');
  assert.match(css, /\.mock-paper \{[^}]*--gold/, 'the Paper account pill is the gold element');
});
