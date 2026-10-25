#!/usr/bin/env node
/* QA RET-21: "Export current portfolio as CSV" is built from the mock trade
   log (GET /api/mock-trades). Pure helper tests, no network.
   Usage: node --no-warnings --import ./scripts/register-sonar-loader.mjs --test scripts/check-mock-portfolio-csv.mjs */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  mockHoldingsFromTrades,
  buildMockPortfolioCsv,
} from '../src/lib/trading/mock-portfolio-csv.js';
import { clampMockTradesLimit } from '../src/lib/trading/mock-trades.js';

const T = (ticker, trade_type, quantity, price, day) => ({
  ticker,
  trade_type,
  quantity,
  price,
  created_at: `2026-10-${String(day).padStart(2, '0')}T15:00:00Z`,
});

test('average-cost holdings from buys and sells; closed positions dropped', () => {
  // API returns newest first; the helper must replay oldest first.
  const trades = [
    T('MSFT', 'sell', 2, 400, 5),
    T('AAPL', 'sell', 5, 200, 4),
    T('AAPL', 'buy', 10, 120, 3),
    T('AAPL', 'buy', 10, 100, 2),
    T('MSFT', 'buy', 2, 300, 1),
  ];
  const h = mockHoldingsFromTrades(trades);
  assert.equal(h.length, 1);
  assert.equal(h[0].ticker, 'AAPL');
  assert.equal(h[0].shares, 15);
  assert.equal(h[0].averageCost, 110);
  assert.equal(h[0].costBasis, 1650);
  assert.equal(h[0].lastTradeAt, '2026-10-04T15:00:00Z');
});

test('CSV has a header, one row per holding, and escapes cells', () => {
  const csv = buildMockPortfolioCsv([T('=HACK', 'buy', 1, 10, 1), T('BRK.B', 'buy', 2, 5, 2)]);
  const lines = csv.trim().split('\r\n');
  assert.equal(lines[0], 'Ticker,Shares,Average Cost,Cost Basis,Last Trade');
  assert.equal(lines.length, 3);
  assert.ok(
    lines.some((l) => l.startsWith("'=HACK,")),
    'formula-looking cells are neutralised',
  );
  assert.ok(lines.some((l) => l.startsWith('BRK.B,2,5.0000,10.00,')));
});

test('empty log -> header only', () => {
  assert.equal(buildMockPortfolioCsv([]), 'Ticker,Shares,Average Cost,Cost Basis,Last Trade\r\n');
});

test('GET /api/mock-trades limit is clamped', () => {
  assert.equal(clampMockTradesLimit(null), 200);
  assert.equal(clampMockTradesLimit('abc'), 200);
  assert.equal(clampMockTradesLimit('0'), 200);
  assert.equal(clampMockTradesLimit('50'), 50);
  assert.equal(clampMockTradesLimit('999999'), 5000);
});
