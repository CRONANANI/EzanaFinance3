/**
 * Ezana API, titans dimension: params, pure insight maths and registry entries.
 * Run: node --no-warnings --test scripts/check-ezana-api-titans.mjs (part of npm run test:api).
 * Self-contained node:test file, no network.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { register } from 'node:module';
import { readFileSync } from 'node:fs';

register('./mobile-node-loader.mjs', import.meta.url);

const reg = await import('../src/lib/ezana-api/registry.js');
const q = await import('../src/lib/ezana-api/query.js');
const cat = await import('../src/lib/ezana-api/catalog/titans.js');
const ins = await import('../src/lib/ezana-api/insights/titans.js');

const ep = (id) => reg.ENDPOINTS.find((e) => e.id === id);
const parse = (id, qs) => q.parseParams(ep(id), new URLSearchParams(qs));

test('titans: every route in this dimension is live and typed', () => {
  for (const e of reg.ENDPOINTS.filter((x) => x.dimension === 'titans')) {
    assert.equal(e.status, 'live', e.path);
    assert.ok(['data', 'insight'].includes(e.kind), e.path);
  }
});

test('titans: the catalog routes are registered where expected', () => {
  const ids = {
    'institutional.security_holders': [
      '/v1/institutional/securities/{ticker}/holders',
      'institutional',
    ],
    'institutional.filer_portfolio': ['/v1/institutional/filers/{cik}/portfolio', 'institutional'],
    'institutional.fund_twins': ['/v1/institutional/filers/{cik}/twins', 'institutional'],
    'institutional.filing_progress': ['/v1/institutional/filing-progress', 'institutional'],
    'institutional.confluence': ['/v1/institutional/confluence', 'institutional'],
    'insider.clusters': ['/v1/insider/clusters', 'insider'],
    'insider.issuer_summary': ['/v1/insider/issuers/{ticker}/summary', 'insider'],
    'exec_comp.list': ['/v1/executive-compensation', 'exec-comp'],
    'exec_comp.pay_vs_performance': ['/v1/executive-compensation/pay-vs-performance', 'exec-comp'],
    'etf.funds': ['/v1/etfs', 'etf'],
    'etf.holdings': ['/v1/etfs/{ticker}/holdings', 'etf'],
    'etf.exposure': ['/v1/etfs/exposure/{ticker}', 'etf'],
    'etf.overlap': ['/v1/etfs/overlap', 'etf'],
  };
  for (const [id, [path, scope]] of Object.entries(ids)) {
    const e = ep(id);
    assert.ok(e, id);
    assert.equal(e.path, path);
    assert.equal(e.scope, scope);
    assert.equal(e.dimension, 'titans');
  }
  /* disclosure-based routes are delayed; proxy and N-PORT routes are not */
  for (const id of Object.keys(ids)) {
    const delayed = id.startsWith('institutional.') || id.startsWith('insider.');
    assert.equal(!!ep(id).delayed, delayed, `${id} delayed`);
  }
  assert.equal(reg.matchEndpoint('/v1/etfs/overlap').endpoint.id, 'etf.overlap');
  assert.equal(reg.matchEndpoint('/v1/etfs/exposure/AAPL').endpoint.id, 'etf.exposure');
  assert.equal(reg.matchEndpoint('/v1/etfs/VOO/holdings').endpoint.id, 'etf.holdings');
  assert.equal(reg.matchEndpoint('/v1/insider/clusters').endpoint.id, 'insider.clusters');
  assert.equal(
    reg.matchEndpoint('/v1/institutional/filers/1067983/twins').endpoint.id,
    'institutional.fund_twins',
  );
});

test('titans: copy has no em dashes and no backend names', () => {
  const text = JSON.stringify([cat.ROUTES, cat.GROUPS, cat.PARAMS], (k, v) =>
    v instanceof RegExp ? String(v) : v,
  );
  assert.ok(!text.includes('—'), 'no em dash');
  assert.ok(!/supabase|postgres|\brpc\b|sec_[a-z_]+|titans_13f/i.test(text), 'no backend names');
  for (const g of cat.GROUPS) assert.match(g.icon, /^bi-[a-z0-9-]+$/);
});

test('titans: params validate', () => {
  assert.equal(parse('institutional.security_holders', 'period=2026-06-30').period, '2026-06-30');
  assert.throws(() => parse('institutional.security_holders', 'period=2026-06-29'), /format/);
  assert.throws(() => parse('institutional.security_holders', 'period=CY2026Q2'), /format/);
  const c = parse('insider.clusters', 'days=60&span_days=10&min_insiders=3');
  assert.deepEqual([c.days, c.span_days, c.min_insiders, c.limit], [60, 10, 3, 50]);
  assert.throws(() => parse('insider.clusters', 'min_insiders=1'), /between/);
  const p = parse('exec_comp.pay_vs_performance', 'sort=cap_growth&direction=down');
  assert.equal(p.sort, 'cap_growth');
  assert.throws(() => parse('exec_comp.pay_vs_performance', 'sort=volume'), /one of/);
  assert.throws(() => parse('exec_comp.pay_vs_performance', 'direction=both'), /one of/);
  assert.equal(parse('etf.overlap', 'a=voo&b=QQQ').a, 'voo');
  assert.throws(() => parse('etf.funds', 'cursor=x'), /Unknown parameter/);
});

test('titans: path guards', () => {
  assert.ok(ins.TICKER_RE.test('BRK.B'));
  assert.ok(!ins.TICKER_RE.test('1ABC'));
  assert.ok(ins.CIK_RE.test('1067983'));
  assert.ok(!ins.CIK_RE.test('12345678901'));
  assert.equal(ins.padCik('1067983'), '0001067983');
});

test('titans: 13F change classes', () => {
  assert.equal(ins.holdingChange(100, 0), 'new');
  assert.equal(ins.holdingChange(0, 100), 'exited');
  assert.equal(ins.holdingChange(200, 100), 'doubled');
  assert.equal(ins.holdingChange(150, 100), 'added');
  assert.equal(ins.holdingChange(50, 100), 'trimmed');
  assert.equal(ins.holdingChange(100, 100), 'flat');
  assert.equal(ins.holdingChange(100, null, false), null, 'no prior filing: not comparable');
});

test('titans: insider summary by window and role', () => {
  const rows = [
    { transaction_date: '2026-10-01', code: 'P', value: 1000, is_officer: true, is_director: true },
    { transaction_date: '2026-09-01', code: 'S', value: 400, is_director: true },
    { transaction_date: '2026-03-01', code: 'S', value: 5000, is_ten_pct_owner: true },
    { transaction_date: '2026-03-01', code: 'A', value: 9999, is_officer: true },
    { transaction_date: '2025-01-01', code: 'P', value: 7, is_officer: true },
  ];
  const s = ins.insiderSummary(rows, '2026-10-26');
  assert.equal(s.days_90.buys, 1);
  assert.equal(s.days_90.sells, 1);
  assert.equal(s.days_90.net_value, 600);
  assert.equal(s.days_90.by_role.officer.net_value, 1000);
  assert.equal(s.days_90.by_role.director.net_value, 600, 'both roles count the officer-director');
  assert.equal(s.days_90.by_role.ten_pct_owner.sells, 0);
  assert.equal(s.days_365.sell_value, 5400);
  assert.equal(s.days_365.net_value, -4400);
  assert.equal(s.days_365.by_role.ten_pct_owner.net_value, -5000);
  assert.equal(s.days_365.buys, 1, 'older than 365 days and non-P/S codes are left out');
});

test('titans: ETF overlap is the sum of min weights over shared holdings', () => {
  const a = [
    { cusip: '037833100', ticker: 'AAPL', name: 'Apple', weight: 7 },
    { cusip: '594918104', ticker: 'MSFT', name: 'Microsoft', weight: 6 },
    { cusip: '000000000', name: 'Cash', weight: 1 },
    { isin: 'US67066G1040', ticker: 'NVDA', name: 'NVIDIA', weight: 2 },
    { isin: 'US67066G1040', ticker: 'NVDA', name: 'NVIDIA', weight: 1 },
  ];
  const b = [
    { cusip: '037833100', name: 'Apple Inc', weight: 10 },
    { cusip: '67066G104', name: 'NVIDIA Corp', weight: 9 },
    { cusip: '000000000', name: 'Cash', weight: 3 },
    { ticker: 'XOM', name: 'Exxon', weight: 4 },
  ];
  const o = ins.etfOverlap(a, b);
  /* AAPL min(7,10)=7, NVDA min(3,9)=3 (ISIN folded to CUSIP, two lots summed);
     MSFT and XOM are not shared; all-zero CUSIP is not an id, so the cash
     lines fall back to the name and match */
  assert.equal(o.shared_holdings, 3);
  assert.equal(o.overlap_pct, 11);
  assert.deepEqual(
    o.top_shared.map((s) => [s.ticker, s.overlap]),
    [
      ['AAPL', 7],
      ['NVDA', 3],
      [null, 1],
    ],
  );
  assert.equal(ins.etfOverlap(a, a).overlap_pct, 17, 'a fund overlaps itself fully');
  assert.equal(ins.etfOverlap(a, []).overlap_pct, 0);
  assert.equal(ins.holdingKey({ isin: 'GB0002875804' }), 'I:GB0002875804');
  assert.equal(ins.holdingKey({ ticker: 'abc' }), 'T:ABC');
});

const pvpRow = (cik, ticker, fy, cap, tsr, extra = {}) => ({
  cik,
  ticker,
  entity_name: `${ticker} Corp`,
  fiscal_year: fy,
  peo_key: '',
  peo_total_comp: cap,
  peo_comp_actually_paid: cap,
  company_tsr: tsr,
  peer_group_tsr: 100 + (fy - 2021) * 10,
  accession_no: `acc-${cik}`,
  filed_at: '2026-04-01',
  ...extra,
});

test('titans: exec comp groups company-years and splits CEO changes', () => {
  const rows = [
    pvpRow('1', 'AAA', 2024, 10, 120),
    pvpRow('1', 'AAA', 2025, null, 130, {
      peo_key: 'x:A',
      peo_name: 'A',
      peo_total_comp: 5,
      peo_comp_actually_paid: 6,
    }),
    pvpRow('1', 'AAA', 2025, null, 130, {
      peo_key: 'x:B',
      peo_name: 'B',
      peo_total_comp: 7,
      peo_comp_actually_paid: 8,
    }),
    pvpRow('1', 'AAA', 2025, null, 130, {
      peo_key: 'x:NEO',
      peo_total_comp: null,
      peo_comp_actually_paid: null,
      non_peo_neo_avg_total_comp: 3,
    }),
  ];
  const ys = ins.execCompYears(rows);
  assert.equal(ys.length, 2);
  const y25 = ys.find((y) => y.fiscal_year === 2025);
  assert.equal(y25.ceos.length, 2);
  assert.equal(y25.ceo_comp_actually_paid, null);
  assert.equal(y25.other_neo_avg_total_comp, 3);
  assert.equal(ys.find((y) => y.fiscal_year === 2024).ceo_comp_actually_paid, 10);
});

test('titans: pay versus performance', () => {
  const rows = [
    /* AAA: CAP 10 -> 20 (+100%), TSR 100 -> 120 (+20%): gap +80 */
    pvpRow('1', 'AAA', 2023, 10, 100),
    pvpRow('1', 'AAA', 2024, 15, 110),
    pvpRow('1', 'AAA', 2025, 20, 120),
    /* BBB: CAP 10 -> 11 (+10%), TSR 100 -> 200 (+100%): gap -90 */
    pvpRow('2', 'BBB', 2023, 10, 100),
    pvpRow('2', 'BBB', 2024, 10, 150),
    pvpRow('2', 'BBB', 2025, 11, 200),
    /* CCC: CAP 10 -> 14 (+40%), TSR 100 -> 110 (+10%): gap +30 */
    pvpRow('3', 'CCC', 2022, 10, 100),
    pvpRow('3', 'CCC', 2023, 12, 104),
    pvpRow('3', 'CCC', 2024, 14, 110),
    /* DDD: only 2 years: left out */
    pvpRow('4', 'DDD', 2024, 10, 100),
    pvpRow('4', 'DDD', 2025, 50, 100),
    /* EEE: first-year CAP negative: left out */
    pvpRow('5', 'EEE', 2023, -5, 100),
    pvpRow('5', 'EEE', 2024, 10, 100),
    pvpRow('5', 'EEE', 2025, 20, 100),
    /* FFF: CEO change in 2023 breaks the run; trailing run 2024-2026 is used */
    pvpRow('6', 'FFF', 2022, 1, 100),
    pvpRow('6', 'FFF', 2023, null, 100, { peo_key: 'f:A', peo_comp_actually_paid: 2 }),
    pvpRow('6', 'FFF', 2023, null, 100, { peo_key: 'f:B', peo_comp_actually_paid: 3 }),
    pvpRow('6', 'FFF', 2024, 10, 100),
    pvpRow('6', 'FFF', 2025, 10, 100),
    pvpRow('6', 'FFF', 2026, 30, 100),
  ];
  const up = ins.payVsPerformance(rows);
  assert.deepEqual(
    up.map((r) => [r.ticker, r.gap]),
    [
      ['FFF', 200],
      ['AAA', 80],
      ['CCC', 30],
    ],
  );
  const aaa = up.find((r) => r.ticker === 'AAA');
  assert.equal(aaa.cap_growth_pct, 100);
  assert.equal(aaa.tsr_change_pct, 20);
  assert.equal(aaa.peer_tsr_change_pct, 16.7);
  assert.deepEqual([aaa.from_year, aaa.to_year, aaa.years], [2023, 2025, 3]);
  const fff = up.find((r) => r.ticker === 'FFF');
  assert.deepEqual([fff.from_year, fff.to_year], [2024, 2026]);

  const down = ins.payVsPerformance(rows, { direction: 'down' });
  assert.deepEqual(
    down.map((r) => [r.ticker, r.gap]),
    [['BBB', -90]],
  );
  assert.deepEqual(
    ins.payVsPerformance(rows, { sort: 'tsr' }).map((r) => r.ticker),
    ['AAA', 'CCC', 'FFF'],
  );
  assert.deepEqual(
    ins.payVsPerformance(rows, { sort: 'cap_growth', limit: 1 }).map((r) => r.ticker),
    ['FFF'],
  );
  /* only the latest filing is read */
  const mixed = [
    ...rows.filter((r) => r.cik === '1'),
    pvpRow('1', 'AAA', 2020, 1, 50, { accession_no: 'old', filed_at: '2022-01-01' }),
  ];
  assert.equal(ins.payVsPerformance(mixed)[0].from_year, 2023);
});

test('titans: the insider clusters migration keeps the API contract', () => {
  const sql = readFileSync(
    new URL('../supabase/migrations/20261026190100_api_insider_clusters.sql', import.meta.url),
    'utf8',
  );
  assert.match(
    sql,
    /drop function if exists public\.api_insider_clusters\(integer, integer, integer, integer\)/,
  );
  assert.match(sql, /p_cutoff\s+date\s+default null/);
  assert.match(sql, /set check_function_bodies = off/);
  assert.match(
    sql,
    /grant execute on function public\.api_insider_clusters\([^)]*\)\s+to service_role/,
  );
  assert.match(sql, /where b\.officer or b\.director/);
  /* the handler passes p_cutoff only when a delay applies */
  const h = readFileSync(
    new URL('../src/lib/ezana-api/handlers/titans.js', import.meta.url),
    'utf8',
  );
  assert.match(h, /\.\.\.\(cutoff \? \{ p_cutoff: cutoff \} : \{\}\)/);
});
