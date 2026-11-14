/**
 * Mock Trading redesign (Nov 2026): the pure helpers in
 * src/lib/trading/mock-ticket.js, plus page wiring and token rules.
 *   node --no-warnings --test scripts/check-mock-trading.mjs
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  DEFAULT_RANGE,
  RANGES,
  SORT_KEYS,
  disabledRanges,
  etDay,
  filterPositions,
  fmtClockET,
  fmtCompactUSD,
  fmtDateTime,
  fmtQty,
  fmtSignedPct,
  fmtSignedUSD,
  fmtStampET,
  fmtUSD,
  impactLabel,
  journalRows,
  normalizeMovers,
  parseAmount,
  portfolioRows,
  positionRow,
  rangeCaption,
  relativeTime,
  sortPositions,
  summarizePortfolio,
  ticketState,
  weightBarFill,
} from '../src/lib/trading/mock-ticket.js';
import { rangeReturn } from '../src/lib/trading/mock-risk.js';
import { buildMockJournalCsv } from '../src/lib/trading/mock-portfolio-csv.js';
/* The thesis and risk helpers have their own suite; importing it here runs it
   under the same npm script. */
import './check-mock-thesis.mjs';
import './check-mock-theses-server.mjs';

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

test('chart ranges: six presets, 3M default, longer than the history disabled', () => {
  assert.deepEqual(RANGES, ['1W', '1M', '3M', '6M', '1Y', 'ALL']);
  assert.equal(DEFAULT_RANGE, '3M');
  const now = Date.UTC(2026, 10, 9);
  const day = 86400000;
  const ago = (n) => new Date(now - n * day).toISOString();
  assert.deepEqual(disabledRanges(ago(120), now), ['1Y'], '4 months keeps 6M, drops 1Y');
  assert.deepEqual(disabledRanges(ago(20), now), ['3M', '6M', '1Y'], '20 days keeps 1M');
  assert.deepEqual(disabledRanges(ago(3), now), ['1M', '3M', '6M', '1Y'], 'a new account keeps 1W');
  assert.deepEqual(disabledRanges(ago(400), now), [], 'over a year disables nothing');
  assert.deepEqual(disabledRanges(null, now), []);
  assert.equal(rangeCaption('ALL'), 'Since inception');
  assert.equal(rangeCaption('3M'), 'Last 3 months');
  assert.equal(rangeCaption('1W'), 'Last week');
  assert.equal(relativeTime(now - 2000, now), '2s ago');
  assert.equal(relativeTime(now - 5 * 60000, now), '5m ago');
  const pts = [100, 104, 99, 110].map((value, i) => ({
    at: new Date(now + i * day).toISOString(),
    value,
  }));
  assert.ok(Math.abs(rangeReturn(pts) - 10) < 1e-9, 'range return comes from mock-risk');
});

test('day P&L: qty x day change, opened-today rule, N/A without quotes', () => {
  const now = Date.parse('2026-11-13T18:00:00Z'); /* 1 PM in New York */
  const held = positionRow(
    { symbol: 'NVDA', qty: 10, avgCost: 100, currentPrice: 120, openedAt: '2026-10-01T15:00:00Z' },
    { change: 2, now },
  );
  assert.equal(held.dayPnl, 20);
  assert.ok(Math.abs(held.dayPct - (2 / 118) * 100) < 1e-9, 'day % is against the previous close');

  /* Bought today at 119: the day counts from the fill (1/share), not the close (2/share). */
  const today = positionRow(
    { symbol: 'AMD', qty: 10, avgCost: 119, currentPrice: 120, openedAt: '2026-11-13T15:00:00Z' },
    { change: 2, now },
  );
  assert.equal(today.dayPnl, 10);
  /* Bought today below the previous close and still up on the fill: capped at the day move. */
  const cheap = positionRow(
    { symbol: 'AMD', qty: 10, avgCost: 110, currentPrice: 120, openedAt: '2026-11-13T15:00:00Z' },
    { change: 2, now },
  );
  assert.equal(cheap.dayPnl, 20);
  assert.equal(etDay('2026-11-14T03:00:00Z'), '2026-11-13', 'the day is the New York day');

  const noQuote = positionRow({ symbol: 'XYZ', qty: 1, avgCost: 5, currentPrice: 5 });
  assert.equal(noQuote.dayPnl, null);
  assert.equal(noQuote.dayPct, null);

  const s = summarizePortfolio({ cash: 1000, startingCash: 3000, positions: [held, noQuote] });
  assert.equal(s.dayPnl, 20, 'rows without a quote are left out');
  assert.ok(Math.abs(s.dayPnlPct - (20 / (s.totalValue - 20)) * 100) < 1e-9);
  const none = summarizePortfolio({ cash: 1000, startingCash: 1000, positions: [noQuote] });
  assert.equal(none.dayPnl, null);
  assert.equal(none.dayPnlPct, null);
  assert.equal(fmtSignedUSD(none.dayPnl), 'N/A');
});

test('portfolio rows: weights against the total, the table and the KPIs agree', () => {
  const { rows, summary } = portfolioRows({
    cash: 30000,
    startingCash: 100000,
    positions: [
      { symbol: 'nvda', qty: 100, avgCost: 120, currentPrice: 140 },
      { symbol: 'AAPL', qty: 280, avgCost: 210, currentPrice: 200 },
    ],
    changes: { NVDA: 1.5 },
  });
  assert.equal(summary.totalValue, 30000 + 14000 + 56000);
  assert.ok(Math.abs(rows[0].weight - 14) < 1e-9);
  assert.ok(Math.abs(rows[1].weight - 56) < 1e-9);
  assert.equal(summary.dayPnl, 150);
  assert.equal(rows[1].dayPnl, null);
  assert.ok(Math.abs(summary.cashPct - 30) < 1e-9);
  assert.equal(rows[0].name, 'nvda', 'name falls back to the ticker');

  assert.ok(SORT_KEYS.includes('dayPct') && SORT_KEYS.includes('weight'));
  assert.deepEqual(
    sortPositions(rows, 'weight', 'desc').map((r) => r.symbol),
    ['AAPL', 'nvda'],
  );
  assert.deepEqual(
    sortPositions(rows, 'dayPct', 'desc').map((r) => r.symbol),
    ['nvda', 'AAPL'],
    'a row without a day move sorts last',
  );
  assert.deepEqual(
    filterPositions(rows, 'winners').map((r) => r.symbol),
    ['nvda'],
  );
  assert.deepEqual(
    filterPositions(rows, 'losers').map((r) => r.symbol),
    ['AAPL'],
  );
  assert.equal(filterPositions(rows, 'all').length, 2);

  assert.ok(Math.abs(weightBarFill(56, rows) - 1) < 1e-9, 'full at the largest weight with no cap');
  assert.ok(Math.abs(weightBarFill(14, rows) - 0.25) < 1e-9);
  assert.equal(weightBarFill(14, rows, 15), 14 / 15, 'full at the cap when one is set');
  assert.equal(weightBarFill(56, rows, 15), 1, 'never past full');
  assert.equal(weightBarFill(null, rows), 0);
});

test('movers: gainers and losers, dollar change derived when missing', () => {
  const m = normalizeMovers({
    gainers: [
      { ticker: 'abc', name: 'Abc Corp', price: 110, change: '+10.00%' },
      { ticker: 'DEF', name: 'Def', price: 50, change: '+5.00%', dollarChange: '+2.38' },
      { ticker: '', price: 1, change: '+1%' },
    ],
    losers: [{ ticker: 'GHI', name: 'Ghi', price: 90, change: '-10.00%' }],
  });
  assert.deepEqual(
    m.gainers.map((g) => g.ticker),
    ['ABC', 'DEF'],
  );
  assert.ok(Math.abs(m.gainers[0].change - 10) < 1e-9);
  assert.equal(m.gainers[1].change, 2.38);
  assert.ok(Math.abs(m.losers[0].change - -10) < 1e-9);
  assert.equal(m.losers[0].pct, -10);
  assert.deepEqual(normalizeMovers(null), { gainers: [], losers: [] });
});

test('journal: details, position impact from the replay, New York time', () => {
  const rows = journalRows([
    {
      id: 'b',
      ticker: 'NVDA',
      trade_type: 'sell',
      quantity: 10,
      price: 150,
      total_amount: 1500,
      created_at: '2026-10-02T15:00:00Z',
    },
    {
      id: 'a',
      ticker: 'NVDA',
      trade_type: 'buy',
      quantity: 7.0112,
      price: 142.63,
      created_at: '2026-10-01T14:24:00Z',
    },
  ]);
  assert.equal(rows[1].details, 'Bought 7.0112 shares @ $142.63');
  assert.equal(rows[1].impactText, 'Opened position');
  assert.equal(rows[0].impactText, 'Closed position', 'a sell past the holding closes it');
  assert.ok(Math.abs(rows[1].total - 7.0112 * 142.63) < 1e-9);
  assert.equal(impactLabel({ kind: 'added', shares: 7.0112 }), '+7.0112 shares');
  assert.equal(impactLabel({ kind: 'reduced', shares: 10 }), '-10 shares');
  assert.match(fmtStampET('2026-10-01T14:24:00Z'), /^Oct 1, 10:24\sAM$/);
  assert.match(fmtClockET('2026-11-13T15:24:16Z'), /^10:24:16\sAM ET$/);
});

test('journal CSV: thesis and note columns, oldest first, formula prefixes neutralised', () => {
  const csv = buildMockJournalCsv([
    {
      created_at: '2026-10-02T15:00:00Z',
      trade_type: 'sell',
      ticker: 'nvda',
      quantity: 2,
      price: 150,
      total_amount: 300,
      thesis_name: '=HYPERLINK("x")',
      thesis_note: '+cmd, "quoted"\nline two',
    },
    {
      created_at: '2026-10-01T15:00:00Z',
      trade_type: 'buy',
      ticker: 'NVDA',
      quantity: 7.0112,
      price: 142.63,
      thesis_note: null,
    },
  ]);
  const lines = csv.split('\r\n');
  assert.equal(lines[0], 'Time,Type,Ticker,Shares,Price,Amount,thesis,thesis_note');
  assert.match(lines[1], /^2026-10-01T15:00:00\.000Z,Buy,NVDA,7\.0112,142\.6300,1000\.01,,$/);
  assert.match(lines[2], /,Sell,NVDA,2,150\.0000,300\.00,/);
  assert.ok(lines[2].includes(`"'=HYPERLINK(""x"")"`), 'a formula thesis name is neutralised');
  assert.ok(csv.includes(`"'+cmd, ""quoted""\nline two"`), 'a formula note is neutralised');
});

test('page wiring and token discipline', () => {
  const page = fs.readFileSync('src/app/(dashboard)/trading/mock/page.js', 'utf8');
  const css = fs.readFileSync('src/app/(dashboard)/trading/mock/mock-trading.css', 'utf8');
  const sections = fs.readFileSync('src/components/trading/mock/MockSections.jsx', 'utf8');
  const ticket = fs.readFileSync('src/components/trading/mock/OrderTicket.jsx', 'utf8');
  const pre = fs.readFileSync('src/components/trading/mock/PreTradeCards.jsx', 'utf8');
  const chart = fs.readFileSync('src/components/trading/MockPortfolioChart.jsx', 'utf8');
  const panel = fs.readFileSync('src/components/trading/mock/ThesisPanel.jsx', 'utf8');
  const review = fs.readFileSync('src/components/trading/mock/ReviewOrderModal.jsx', 'utf8');
  const hook = fs.readFileSync('src/hooks/useMockTheses.js', 'utf8');
  for (const [name, src] of [
    ['page', page],
    ['css', css],
    ['sections', sections],
    ['ticket', ticket],
    ['pre-trade cards', pre],
    ['chart', chart],
    ['thesis panel', panel],
    ['review modal', review],
    ['theses hook', hook],
  ]) {
    assert.ok(!src.includes(String.fromCharCode(8212)), `${name}: em dash`);
    assert.doesNotMatch(src, /#[0-9a-fA-F]{3,8}\b(?![\w-])/, `${name}: hex colour`);
    assert.doesNotMatch(src, /lucide-react|window\.confirm|Math\.random/, `${name}: stack rules`);
    assert.doesNotMatch(src, /rgba?\(/, `${name}: colour literal`);
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
  assert.match(page, /portfolioRows\(/, 'KPIs and rows come from one pass (portfolioRows)');
  assert.match(chart, /ranges=\{RANGES\}/, 'the chart ranges come from mock-ticket');
  assert.doesNotMatch(chart, /const RANGES =/, 'one source for the ranges');
  for (const label of [
    'Portfolio value',
    'Total return',
    "Today's P&L",
    'Available cash',
    'Open positions',
  ])
    assert.ok(sections.includes(label), `KPI strip: ${label}`);
  const left = page.slice(page.indexOf('mock-left-col'), page.indexOf('mock-right-col'));
  assert.ok(
    left.indexOf('<PerformanceCard') < left.indexOf('<PreTradeCards') &&
      left.indexOf('<PreTradeCards') < left.indexOf('<PositionsCard'),
    'pre-trade cards sit between the chart and the positions',
  );
  assert.match(pre, /Enter an order in the ticket to see its effect\./);
  const route = fs.readFileSync('src/app/api/portfolio/mock-value-series/route.js', 'utf8');
  assert.match(route, /benchmark'\) === '1'/, 'the series route takes benchmark=1');
  assert.match(route, /rebaseBenchmark\(/, 'the benchmark is rebased by mock-risk');
  assert.match(route, /fetchBatchedHistoricalPrices\(\[BENCHMARK_SYMBOL\]/);
  assert.match(chart, /benchmark=1/, 'the chart asks for the benchmark');
  assert.match(chart, /strokeDasharray=\{CHART\.benchmarkDash\}/, 'the benchmark is dotted');
  assert.match(chart, /stroke=\{CHART\.benchmarkStroke\}/, 'benchmark colour from CHART');
  assert.match(chart, /vs\. S&amp;P 500/, 'range return vs. the S&P 500');
  assert.match(chart, /rangeReturn\(/, 'range returns come from mock-risk');
  assert.doesNotMatch(page + chart + pre, /\bSPY\b/, 'the proxy ticker is never shown');
  assert.match(pre, /Needs about a month of history\./);
  assert.match(page, /range=3M&benchmark=1/, 'risk reads the 3M series with its benchmark');
  assert.match(page, /riskSnapshot\(/, 'risk statistics come from mock-risk');

  /* Thesis layer (step 3). */
  const right = page.slice(page.indexOf('className="mock-right-col"'));
  assert.ok(right.indexOf('<ThesisPanel') > -1, 'the thesis panel is in the right column');
  assert.ok(
    right.indexOf('<ThesisPanel') < right.indexOf('<OrderTicket'),
    'the thesis panel renders before the ticket',
  );
  assert.match(css, /\.mock-thesis \{\s*order: -2;/, 'stacked: the thesis panel comes first');
  assert.match(ticket, /data-task-target="mock-trade-submit"/, 'the checklist target stays');
  assert.match(ticket, /Review buy order/);
  assert.match(ticket, /aria-live="polite"/, 'the thesis check line is announced');
  assert.match(page, /<ReviewOrderModal/, 'orders go through the review step');
  assert.match(page, /thesis_note: note/, 'the review note rides on the trade');
  assert.match(page, /completeTask\('action_2'\)/, 'the checklist call stays');
  assert.match(page, /markChecklistView\('mock\.review_pnl'\)/);
  assert.match(page, /thesisFit\(/, 'one fit result for every surface');
  assert.match(panel, /parseThesis\(form, \{ sectors: CANONICAL_SECTORS \}\)/);
  assert.match(panel, /CANONICAL_TO_DISPLAY/, 'sector labels use the display names');
  assert.match(panel, /<Tabs/, 'thesis tabs use the ds Tabs');
  assert.match(panel, /THESIS_TEMPLATES/, 'starter templates are offered, never seeded');
  assert.match(panel, /Create and switch between investment theses for this paper account\./);
  assert.match(pre, /aria-label=\{`Thesis fit \$\{score\} percent`\}/, 'the ring is labelled');
  assert.match(pre, /role="img"/);
  assert.match(review, /maxLength=\{THESIS_LIMITS\.note\}/);
  assert.match(css, /\.mock-page \.ds-tabs \{[^}]*border-bottom: 0/, 'tabs are text only');
  assert.doesNotMatch(
    page + panel + pre + review + ticket,
    /\b(should|recommend|good trade|bad trade)\b/i,
    'descriptive wording, never advice',
  );
  for (const src of [page, panel, review, sections])
    assert.doesNotMatch(src, /variant="secondary"/, 'secondary actions are plain text');
  const routes = [
    'src/app/api/mock-theses/route.js',
    'src/app/api/mock-theses/[id]/route.js',
    'src/app/api/mock-trades/[id]/route.js',
  ].map((f) => fs.readFileSync(f, 'utf8'));
  for (const r of routes) {
    assert.match(r, /requireAuth: true/, 'thesis routes require a session');
    assert.match(r, /safeErrorResponse/, 'errors never leak details');
  }
  const tradesRoute = fs.readFileSync('src/app/api/mock-trades/route.js', 'utf8');
  assert.match(tradesRoute, /getActiveThesisId/, 'the server stamps the active thesis');
  assert.match(sections, /aria-selected=\{isSel\}/, 'the ticket row is marked selected');
  assert.match(sections, /aria-pressed=\{side === id\}/, 'Gainers and Losers are a pressed toggle');
  assert.doesNotMatch(
    css.match(/\.mock-seg__btn\.is-on \{[^}]*\}/)[0],
    /background|border/,
    'the selected toggle is text only',
  );
  assert.doesNotMatch(
    css.match(/\.mock-btn \{[^}]*\}/)[0],
    /border: 1px/,
    'secondary buttons are plain text',
  );
  assert.match(page, /<ClosePositionModal/, 'Close is confirmed in a modal');
  assert.match(page, /<ResetPortfolioModal/, 'Reset is confirmed in a modal');
  assert.match(sections, /aria-sort=/, 'sortable headers announce their state');
  assert.match(ticket, /role="combobox"/, 'keyboard-navigable typeahead');
  assert.match(css, /\.mock-paper \{[^}]*--gold/, 'the Paper account pill is the gold element');
});
