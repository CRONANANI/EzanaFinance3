/**
 * Council sandbox on Mock Portfolio (/trading/mock).
 *   npm run test:council-mock-portfolio
 *
 * The model's honesty rules (the IPS check describes and never blocks, the
 * proposal rules run through the council's own engine, unknown inputs read
 * "Not tested", the cash floor is never "blocked", one rebased window for
 * sandbox, fund and the S&P 500, sector weights against the stored cap), the
 * sample council, the routes' access rules and the page's gating (the paper
 * account unchanged for everyone, the council layer only for council members
 * once membership is known, nothing on it writes).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  alignSector,
  applyOrder,
  challengeRows,
  chartGeometry,
  fundReturn,
  parseCompactDollars,
  pitchRows,
  rebaseCompare,
  sandboxBook,
  sandboxIpsCheck,
  sectorResolver,
  sectorWeights,
} from '../src/lib/org-mock-portfolio-model.js';
import { buildMockPortfolioSample } from '../src/lib/org-mock-portfolio-sample.js';
import { buildCompanyResearchSample } from '../src/lib/org-company-research-sample.js';

const read = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const NOW = Date.UTC(2026, 10, 16, 15);
const viewer = { userId: 'u-1', memberId: 'm-1', role: 'executive', displayName: 'Viewer' };
const fund = buildCompanyResearchSample({ ...viewer, now: NOW });
const sample = buildMockPortfolioSample({ ...viewer, now: NOW });

const rules = [
  { id: 'r1', rule_type: 'max_position_pct', rule_value: { pct: 25, severity: 'warning' } },
  { id: 'r2', rule_type: 'max_sector_pct', rule_value: { pct: 35, severity: 'block' } },
  { id: 'r3', rule_type: 'max_single_trade_pct', rule_value: { pct: 8, severity: 'warning' } },
  { id: 'r4', rule_type: 'cash_floor_pct', rule_value: { pct: 5, severity: 'block' } },
  { id: 'r5', rule_type: 'min_market_cap', rule_value: { value: 5e9, severity: 'warning' } },
  { id: 'r6', rule_type: 'prohibited_ticker', rule_value: { ticker: 'MO', severity: 'block' } },
  {
    id: 'r7',
    rule_type: 'prohibited_sector',
    rule_value: { sector: 'Tobacco', severity: 'block' },
    is_active: false,
  },
];
const book = sandboxBook({
  positions: [
    { symbol: 'AAA', value: 30000, sector: 'Technology' },
    { symbol: 'BBB', value: 20000, sector: 'Financials' },
  ],
  cash: 50000,
});
const byType = (res, t) => res.rows.find((r) => r.type === t);

test('the sandbox book: market value, cash and total; orders only project', () => {
  assert.equal(book.total, 100000);
  const after = applyOrder(book, { side: 'buy', symbol: 'AAA', amount: 10000 });
  assert.equal(after.cash, 40000);
  assert.equal(after.positions.find((p) => p.ticker === 'AAA').value, 40000);
  assert.equal(book.cash, 50000, 'the book itself is never changed');
  const sold = applyOrder(book, { side: 'sell', symbol: 'BBB', amount: 99999 });
  assert.equal(sold.positions.length, 1, 'a sell is capped at the position and drops it');
  assert.equal(sold.cash, 70000);
});

test('IPS check: inactive rules are skipped; no order reads holdings only', () => {
  const res = sandboxIpsCheck({ rules, book });
  assert.equal(res.rows.length, 6);
  assert.equal(byType(res, 'max_position_pct').state, 'warn', 'a soft rule over its limit');
  assert.match(byType(res, 'max_position_pct').detail, /AAA 30\.0%, limit 25%/);
  assert.equal(byType(res, 'max_single_trade_pct').state, 'untested');
  assert.equal(byType(res, 'min_market_cap').state, 'untested');
});

test('IPS check on an order: hard breaches read as blocked in the real fund', () => {
  const res = sandboxIpsCheck({
    rules,
    book,
    order: { side: 'buy', symbol: 'MO', amount: 10000, sector: 'Consumer Staples' },
    marketCap: 9e10,
  });
  assert.equal(byType(res, 'prohibited_ticker').state, 'block');
  assert.match(byType(res, 'prohibited_ticker').detail, /prohibited-securities list/);
  assert.equal(byType(res, 'max_single_trade_pct').state, 'warn', '10% of value over 8%');
  assert.equal(byType(res, 'min_market_cap').state, 'pass');
  const sector = sandboxIpsCheck({
    rules,
    book,
    order: { side: 'buy', symbol: 'CCC', amount: 6000, sector: 'Technology' },
    marketCap: null,
  });
  assert.equal(byType(sector, 'max_sector_pct').state, 'block', '36% of the sandbox over 35%');
  assert.equal(byType(sector, 'min_market_cap').state, 'untested', 'unknown cap is never a pass');
  const noSector = sandboxIpsCheck({
    rules,
    book,
    order: { side: 'buy', symbol: 'CCC', amount: 100 },
  });
  assert.equal(byType(noSector, 'max_sector_pct').state, 'untested');
});

test('the cash floor is a warning at most: the real fund never checks it', () => {
  const res = sandboxIpsCheck({
    rules,
    book,
    order: { side: 'buy', symbol: 'AAA', amount: 48000, sector: 'Technology' },
    marketCap: 1e12,
  });
  assert.equal(byType(res, 'cash_floor_pct').state, 'warn');
  assert.match(byType(res, 'cash_floor_pct').detail, /does not check this rule/);
});

test('the check has no write path and never feeds the order', () => {
  const model = read('src/lib/org-mock-portfolio-model.js');
  assert.match(model, /evaluateProposal\(/, 'proposal rules run through the council engine');
  assert.doesNotMatch(model, /fetch\(|org_ips_violations|log: true/);
  const ui = read('src/components/trading/mock/council/CouncilSandbox.jsx');
  assert.doesNotMatch(ui, /method: 'POST'|method: 'PATCH'|method: 'DELETE'|\/api\/mock-trades/);
  const check = ui.slice(ui.indexOf('export function CouncilOrderCheck'));
  assert.doesNotMatch(
    check.slice(0, check.indexOf('/* ── The council cards')),
    /onPlace|onReview|setAmount|disabled=/,
    'the order check has no callbacks into the ticket',
  );
});

test('sectors: the fund name wins, market data maps onto it', () => {
  assert.equal(alignSector('Financial Services', ['Financials', 'Technology']), 'Financials');
  assert.equal(alignSector('Financial Services', ['Banks']), 'Financial Services');
  const of = sectorResolver({
    fundPositions: [{ ticker_symbol: 'JPM', sector: 'Financials' }],
    marketSectors: { JPM: 'Financial Services', GS: 'Financial Services' },
  });
  assert.equal(of('JPM'), 'Financials');
  assert.equal(of('GS'), 'Financials');
  assert.equal(of('ZZZ'), null);
});

test('sector weights: share of total value against the lowest stored cap', () => {
  const w = sectorWeights({
    book,
    fundPositions: [
      { sector: 'Technology', current_value: 60 },
      { sector: 'Financials', current_value: 40 },
    ],
    rules: [...rules, { id: 'r8', rule_type: 'max_sector_pct', rule_value: { pct: 30 } }],
  });
  assert.equal(w.cap, 30);
  const tech = w.rows.find((r) => r.sector === 'Technology');
  assert.equal(tech.sandbox, 30);
  assert.equal(tech.fund, 60);
  assert.equal(tech.fundOver, true);
  assert.equal(tech.sandboxOver, false);
  assert.equal(w.sandboxCash, 50);
});

test('one window: sandbox, fund and the S&P 500 rebased to the sandbox range', () => {
  const pts = (vals, d0 = 1) =>
    vals.map((v, i) => ({ at: `2026-10-${String(d0 + i).padStart(2, '0')}T16:00:00Z`, value: v }));
  const cmp = rebaseCompare({
    points: pts([100, 110]),
    benchmark: pts([200, 210]).map((p) => ({ t: p.at, v: p.value })),
    snapshots: [
      { date: '2026-09-01', value: 1 },
      { date: '2026-10-01', value: 50 },
      { date: '2026-10-02', value: 60 },
    ],
  });
  assert.equal(cmp.start, '2026-10-01');
  assert.ok(Math.abs(cmp.last.sandbox - 10) < 1e-9);
  assert.ok(Math.abs(cmp.last.spy - 5) < 1e-9);
  assert.ok(Math.abs(cmp.last.fund - 20) < 1e-9, 'the fund is clipped to the window');
  assert.equal(cmp.fundNote, null);
  const none = rebaseCompare({ points: pts([100, 110]), snapshots: [] });
  assert.equal(none.fundNote, 'none', 'no fund history is said, never drawn');
  assert.equal(none.fund.length, 0);
  assert.ok(chartGeometry(cmp).paths.sandbox.startsWith('M'));
});

test('pitches, fund return, challenge standing, compact dollars', () => {
  const rows = pitchRows(
    [
      { id: 'a', ticker: 'aaa', stage: 'deep_dive', analyst_member_id: 'm-1', created_at: '2' },
      { id: 'b', ticker: 'BBB', stage: 'in_portfolio' },
      { id: 'c', ticker: 'CCC', stage: 'idea', archived_at: 'x' },
    ],
    [{ id: 'm-1', display_name: 'Viewer' }],
    'm-1',
  );
  assert.deepEqual(
    rows.map((r) => [r.ticker, r.mine]),
    [['AAA', true]],
  );
  assert.equal(Math.round(fundReturn(fund.positions).pct * 100) / 100, 46.73);
  assert.equal(parseCompactDollars('$3.21T'), 3.21e12);
  assert.equal(parseCompactDollars('--'), null);
  assert.deepEqual(challengeRows(null), []);
});

test('the sample council: same council, invented names, flagged, 3 of 12', () => {
  assert.equal(sample.is_demo, true);
  assert.ok(sample.pitches.every((p) => p.is_demo));
  assert.ok(sample.sandbox.positions.every((p) => p.is_demo));
  assert.equal(sample.sandbox.startingCash, 100000);
  const top = challengeRows(sample.challenges)[0];
  assert.equal(`${top.rank} of ${top.field}`, '3 of 12');
  const held = new Set(fund.positions.map((p) => p.ticker));
  assert.ok(
    sample.sandbox.positions.every((p) => held.has(p.symbol)),
    'the sample sandbox holds fund names',
  );
  const last = sample.sandbox.points[sample.sandbox.points.length - 1].value;
  assert.equal(last, sample.sandbox.total, 'the series ends at the sandbox total');
  assert.deepEqual([...new Set(sample.policyPositions.map((p) => p.sector))].sort(), [
    'Financials',
    'Healthcare',
    'Industrials',
    'Technology',
  ]);
});

test('routes: members only, RLS client, sample for demo viewers only', () => {
  const live = read('src/app/api/org/mock-portfolio/route.js');
  const smp = read('src/app/api/org/mock-portfolio/sample/route.js');
  for (const r of [live, smp]) {
    assert.match(r, /getUserClient\(\)/);
    assert.match(r, /Not an org member/);
    assert.match(r, /requireAuth: true/);
    assert.doesNotMatch(r, /getAdminClient|service_role|\.insert\(|\.update\(|\.delete\(/);
  }
  assert.match(smp, /isCommunityDemoViewer\(user\)/);
  assert.match(smp, /sample: null/);
  assert.doesNotMatch(live, /mock_portfolios|mock_trades/, 'the paper account is not read here');
});

test('page gating: council layer only for members once loaded; paper routes unchanged', () => {
  const page = read('src/app/(dashboard)/trading/mock/page.js');
  assert.match(page, /const councilReady = Boolean\(isOrgUser && !orgLoading\)/);
  for (const c of ['<CouncilHeader', '<CouncilCards', '<CouncilOrderCheck'])
    assert.match(page, new RegExp(`councilReady \\? \\(\\s*${c}`), `${c} is gated`);
  assert.match(page, /useCouncilSandbox\(councilReady/);
  assert.match(page, /fetch\('\/api\/mock-trades'\)/, 'the trade log route is unchanged');
  assert.match(page, /submitTrade\(\{/);
  assert.match(page, /\/api\/mock-trades\/\$\{encodeURIComponent\(noteRow\.id\)\}/);
  const hook = read('src/components/trading/mock/council/useCouncilSandbox.js');
  assert.doesNotMatch(hook, /org-mock-portfolio-model|method:/, 'the hook is small and read-only');
  assert.match(hook, /if \(enabled\) load\(\)/);
  const ticket = read('src/components/trading/mock/OrderTicket.jsx');
  assert.match(ticket, /extra = null/);
  const review = read('src/components/trading/mock/ReviewOrderModal.jsx');
  assert.match(review, /extra = null/);
});

test('token discipline and copy', () => {
  const files = [
    'src/components/trading/mock/council/CouncilSandbox.jsx',
    'src/components/trading/mock/council/council-sandbox.css',
    'src/lib/org-mock-portfolio-model.js',
    'src/lib/org-mock-portfolio-sample.js',
  ].map(read);
  for (const src of files) {
    assert.ok(!src.includes(String.fromCharCode(8212)), 'no em dash');
    assert.doesNotMatch(src, /#[0-9a-fA-F]{3,8}\b(?![\w-])/, 'no hex colour');
    assert.doesNotMatch(src, /rgba?\(|Math\.random/);
    assert.doesNotMatch(src, /\b(should|recommend|good trade|bad trade)\b/i);
  }
  const css = files[1];
  assert.doesNotMatch(css, /box-shadow|border-radius/, 'flat sections');
  assert.match(css, /\.cmk-kpi__value \{[^}]*font-size: 18px/, 'KPI values are 18px mono');
  assert.match(css, /\.cmk-table th \{[^}]*font-size: 11px/, 'table headers 11px caps');
  const ui = files[0];
  assert.match(ui, /Would be blocked in the real fund|IPS_STATES/);
  assert.doesNotMatch(ui, /Supabase|FMP|Finnhub/, 'no vendor names in copy');
});
