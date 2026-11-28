/**
 * Sonar 6.4 to 6.5 compatibility contracts (Nov 28 2026). Deterministic: every paid provider
 * is mocked through scripts/lib/no-llm-guard.mjs, which also fails the run if any imported
 * module tries to reach Anthropic or another LLM host. No database, no network.
 *
 * The twelve contracts 6.5's dependency-aware execution must consume correctly:
 *   1 historical issuer identifiers      7 valid and invalid price inputs
 *   2 predecessor/successor dates        8 provider-unavailable results
 *   3 SEC source CIK preservation        9 sample-data rejection
 *   4 duplicate financial records       10 institutional ownership identity
 *   5 revenue concept mismatches        11 government contract relationships
 *   6 missing revenue values            12 organizational data isolation
 */
import { mockFetch, llmRequests } from './lib/no-llm-guard.mjs';
import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

/* FMP mock: answers with a status the tests set. */
let fmpStatus = 200;
mockFetch(async (url) => {
  if (/financialmodelingprep\.com/.test(url))
    return new Response(JSON.stringify([{ symbol: 'AAPL', price: 201.5, name: 'Apple Inc.' }]), {
      status: fmpStatus,
    });
  throw new Error(`unexpected request in compat test: ${url}`);
});

const { indexSuccessions, tickerForFact, preferSuccessorFacts, predecessorCiks } =
  await import('../src/lib/sec/registrant-map.js');
const { revenueGrowth, companyRatios } = await import('../src/lib/sonar/composer/calc.js');
const { assessRevenueComparability, REVENUE_EQUIVALENCES } =
  await import('../src/lib/sec/revenue-equivalence.js');
const { valuationPrices, priceContractEnabled } =
  await import('../src/lib/prices/sonar-valuation-prices.js');
const { withFmpSample, resetFmpRefusal } = await import('../src/lib/market-sample/index.js');
const { dataStateOf } = await import('../src/lib/market-sample/state.js');
const { serveQuiver, clearQuiverCache, noteQuiverRefusal } =
  await import('../src/lib/quiver/proxy.js');
const { normalizeUniverse, TICKER_ALIASES } =
  await import('../src/lib/sonar/composer/ownership.js');
const { getSonarEntitlements } = await import('../src/lib/sonar/entitlements.js');

after(() => {
  assert.equal(llmRequests.length, 0, 'a module under test tried to call an LLM provider');
});

const read = (p) => readFileSync(p, 'utf8');
const walk = (dir, out = []) => {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(js|jsx|mjs)$/.test(n)) out.push(p);
  }
  return out;
};

/* Production rows of public.sec_registrant_successions (read Nov 28 2026), with DMRC's
   effective date corrected to the completion date in its 8-K12B (May 15, not the May 18
   filing date; SQL_03 applies the correction). */
const ROWS = [
  {
    ticker: 'XOM',
    successor_cik: '2115436',
    predecessor_cik: '34088',
    effective_date: '2026-07-01',
    relationship: 'holding_company_reorganization',
    source_accession: '0001193125-26-291990',
    verified: true,
  },
  {
    ticker: 'DMRC',
    successor_cik: '2119322',
    predecessor_cik: '1438231',
    effective_date: '2026-05-15',
    relationship: 'holding_company_reorganization',
    source_accession: '0001437749-26-017527',
    verified: true,
  },
  {
    ticker: 'XPRO',
    successor_cik: '2126198',
    predecessor_cik: '1575828',
    effective_date: '2026-07-13',
    relationship: 'redomiciliation',
    source_accession: '0001104659-26-083106',
    verified: true,
  },
  {
    ticker: 'REAX',
    successor_cik: '2136387',
    predecessor_cik: '1862461',
    effective_date: '2026-08-24',
    relationship: 'merger_successor',
    source_accession: '0001104659-26-100334',
    verified: false,
  },
  {
    ticker: 'SKYD',
    successor_cik: '2041610',
    predecessor_cik: '813828',
    effective_date: '2025-08-07',
    relationship: 'merger_successor',
    source_accession: '0001193125-25-175046',
    verified: false,
  },
];
const succ = indexSuccessions(ROWS);
const current = new Map([
  ['2115436', 'XOM'],
  ['2119322', 'DMRC'],
  ['2126198', 'XPRO'],
  ['2136387', 'REAX'],
  ['2041610', 'SKYD'],
  ['1826011', 'PARA'],
]);

test('1 historical issuer identifiers: only verified successions resolve; no ticker look-alikes', () => {
  assert.equal(tickerForFact('34088', '2025-12-31', current, succ).ticker, 'XOM');
  assert.equal(tickerForFact('1575828', '2025-12-31', current, succ).ticker, 'XPRO');
  assert.equal(tickerForFact('1438231', '2025-12-31', current, succ).ticker, 'DMRC');
  /* REAX and SKYD stay unmapped: ticker continuity is not evidence. */
  assert.equal(tickerForFact('1862461', '2025-12-31', current, succ), null);
  assert.equal(tickerForFact('813828', '2024-12-31', current, succ), null);
  /* PARA is now Parabolic Technologies (CIK 1826011): the symbol never reaches Paramount. */
  assert.equal(tickerForFact('1826011', '2025-12-31', current, succ).ticker, 'PARA');
  assert.deepEqual([...predecessorCiks(succ)].sort(), ['1438231', '1575828', '34088']);
});

test('2 effective dates: no look-ahead on either side of the succession', () => {
  for (const [cik, eff] of [
    ['34088', '2026-07-01'],
    ['1438231', '2026-05-15'],
    ['1575828', '2026-07-13'],
  ]) {
    const dayBefore = new Date(Date.parse(eff) - 86400000).toISOString().slice(0, 10);
    assert.ok(tickerForFact(cik, dayBefore, current, succ), `${cik} day before`);
    assert.equal(tickerForFact(cik, eff, current, succ), null, `${cik} on the date`);
  }
});

test('3 SEC source CIK preservation: mapped rows keep the CIK that filed them', () => {
  const hit = tickerForFact('0000034088', '2025-12-31', current, succ);
  assert.equal(hit.via, 'predecessor');
  assert.equal(hit.successorCik, '2115436');
  const src = read('src/app/api/cron/ingest-fundamentals/route.js');
  assert.match(src, /cik: p\.cik,/);
  assert.match(src, /accession_no: p\.accn/);
  assert.match(src, /taxonomy_concept: p\.concept/);
  /* Predecessor rows can never overwrite successor rows: the key includes the CIK. */
  assert.match(src, /onConflict: 'cik,concept,frame'/);
});

test('4 duplicate financial records: the successor’s fact wins, one row per frame', () => {
  const rows = [
    { ticker: 'XOM', cik: '34088', concept: 'revenue', frame: 'CY2025Q2', value: 81 },
    { ticker: 'XOM', cik: '2115436', concept: 'revenue', frame: 'CY2025Q2', value: 82 },
    { ticker: 'XOM', cik: '34088', concept: 'revenue', frame: 'CY2025', value: 340 },
  ];
  const { rows: kept, dropped } = preferSuccessorFacts(rows, succ);
  assert.equal(kept.length, 2);
  assert.equal(kept.find((r) => r.frame === 'CY2025Q2').cik, '2115436');
  assert.equal(kept.find((r) => r.frame === 'CY2025').cik, '34088');
  assert.equal(dropped.length, 1);
  /* Order does not matter. */
  assert.equal(
    preferSuccessorFacts([...rows].reverse(), succ).rows.find((r) => r.frame === 'CY2025Q2').cik,
    '2115436',
  );
});

test('5 revenue concept mismatches: refused in production; the proposed registry needs evidence', () => {
  const REV = 'us-gaap:Revenues';
  const K = 'us-gaap:RevenueFromContractWithCustomerExcludingAssessedTax';
  const G = 'us-gaap:RevenueFromContractWithCustomerIncludingAssessedTax';
  const g = revenueGrowth([
    { end: '2025-12-31', value: 120, concept: K },
    { end: '2024-12-31', value: 100, concept: REV },
  ]);
  assert.equal(g.value, null);
  const prev = { concept: REV, end: '2024-12-31' };
  const cur = { concept: K, end: '2025-12-31' };
  assert.equal(assessRevenueComparability(prev, cur).comparable, false);
  assert.equal(
    assessRevenueComparability(prev, cur, {
      overlap: [{ period_end: '2024-12-31', values: { [REV]: 100, [K]: 100.2 } }],
    }).comparable,
    true,
  );
  assert.equal(
    assessRevenueComparability(prev, cur, {
      overlap: [{ period_end: '2024-12-31', values: { [REV]: 100, [K]: 90 } }],
    }).comparable,
    false,
  );
  /* Gross versus net of excise taxes: never, even with overlap. */
  assert.equal(
    assessRevenueComparability({ concept: G, end: '2024-12-31' }, cur, {
      overlap: [{ period_end: '2024-12-31', values: { [G]: 100, [K]: 100 } }],
    }).comparable,
    false,
  );
  for (const e of REVENUE_EQUIVALENCES)
    for (const k of [
      'concepts',
      'definition',
      'context',
      'evidence',
      'effective',
      'status',
      'methodology',
      'version',
    ])
      assert.ok(e[k] != null, `${e.id} lacks ${k}`);
});

test('6 missing revenue values stay missing', () => {
  assert.equal(revenueGrowth([]).value, null);
  assert.equal(revenueGrowth([{ end: '2025-12-31', value: null }]).reason, 'revenue not filed');
  const r = companyRatios({ annual: {}, instant: {} });
  assert.equal(r.revenue, null);
  assert.equal(r.revenue_growth, null);
  assert.equal(r.gross_margin, null);
});

test('7 price inputs: valid closes pass; zero, stale, future, foreign-currency and sample fail', () => {
  const asOf = '2026-11-27';
  const { prices, rejected } = valuationPrices({
    asOf,
    cacheRows: [
      { ticker: 'AAPL', date: '2026-11-26', close: 231, adj_close: 230, volume: 1e6 },
      { ticker: 'AAPL', date: '2026-11-20', close: 225, adj_close: 224, volume: 1e6 },
      { ticker: 'ZERO', date: '2026-11-26', close: 0, volume: 5 },
      { ticker: 'OLD', date: '2026-11-01', close: 10, volume: 5 },
      { ticker: 'FUT', date: '2026-11-30', close: 10, volume: 5 },
      { ticker: 'QTE', date: '2026-11-26', close: 50, adj_close: 50, volume: null },
    ],
    quotes: {
      ZERO: { price: 0, timestamp: Date.parse('2026-11-27T20:00:00Z') / 1000 },
      EUR: {
        symbol: 'EUR',
        price: 10,
        currency: 'EUR',
        timestamp: Date.parse('2026-11-27T20:00:00Z') / 1000,
      },
      SMP: {
        symbol: 'SMP',
        price: 10,
        _sample: true,
        timestamp: Date.parse('2026-11-27T20:00:00Z') / 1000,
      },
    },
  });
  assert.deepEqual(prices.AAPL, {
    price: 231,
    asOf: '2026-11-26',
    source: 'cache',
    provider: 'cache',
    kind: 'close',
    adjustment: 'unadjusted',
    currency: 'USD',
    ageDays: 1,
    contract: 'price-contract-v1',
  });
  /* A quote stored as a close is not called adjusted. */
  assert.equal(prices.QTE.adjustment, 'unknown');
  assert.equal(prices.QTE.provider, 'cache:fmp');
  for (const t of ['ZERO', 'OLD', 'EUR', 'SMP']) {
    assert.equal(prices[t], undefined, t);
    assert.ok(rejected[t], t);
  }
  /* A close dated after asOf is ignored entirely. */
  assert.equal(prices.FUT, undefined);
  assert.equal(priceContractEnabled({}), false);
});

test('8 provider-unavailable results are explicit, not empty or zero', async () => {
  const route = withFmpSample(
    async () => {
      const r = await fetch('https://financialmodelingprep.com/stable/quote?symbol=AAPL&apikey=x');
      return new Response(JSON.stringify(r.ok ? await r.json() : []), { status: r.ok ? 200 : 503 });
    },
    { allow: async () => false },
  );
  fmpStatus = 403;
  resetFmpRefusal();
  const res = await route();
  assert.equal(dataStateOf(res), 'unavailable');
  assert.equal(res.status, 503);
  clearQuiverCache();
  let calls = 0;
  const out = await serveQuiver({
    route: 'sec13f',
    caller: 'u:1',
    dailyLimit: 5,
    limiter: async () => ({ allowed: true }),
    params: { ticker: 'XOM' },
    fetchAll: async () => {
      calls += 1;
      noteQuiverRefusal('sec13f', 403);
      return { rows: [], pages: 1, failed: true };
    },
  });
  assert.equal(out.unavailable, true);
  assert.equal(calls, 1);
  clearQuiverCache();
  fmpStatus = 200;
  resetFmpRefusal();
});

test('9 sample data: refused outside authorized routes and never used for trading or valuation', async () => {
  /* Outside any wrapped route (Sonar, crons, trading), an FMP refusal stays a refusal. */
  fmpStatus = 403;
  resetFmpRefusal();
  const raw = await fetch('https://financialmodelingprep.com/stable/quote?symbol=AAPL&apikey=x');
  assert.equal(raw.status, 403);
  fmpStatus = 200;
  resetFmpRefusal();
  /* The trading page treats sample responses as unknown; model runs are tagged. */
  assert.match(read('src/app/(dashboard)/trading/mock/page.js'), /r\.ok && !isSampleResponse\(r\)/);
  assert.match(
    read('src/components/trading/mock/MockSections.jsx'),
    /r\.ok && !isSampleResponse\(r\)/,
  );
  assert.match(read('src/lib/research/model-runs.js'), /sample: true/);
  /* No server module outside the wrapped routes imports the sample generators. */
  const importers = walk('src').filter((f) =>
    /from '@\/lib\/market-sample(\/index|\/generators)?'/.test(read(f)),
  );
  const offenders = importers.filter(
    (f) =>
      !/^src\/(app\/api\/(research|comps|fmp|market-data|market)\/|lib\/market-sample\/)/.test(f),
  );
  assert.ok(importers.length >= 12);
  assert.deepEqual(offenders, []);
});

test('10 institutional ownership identity: 13F research reads SEC tables; alias table flagged', () => {
  const sonar = walk('src/lib/sonar');
  assert.ok(sonar.some((f) => /from\('sec_13f_(effective_filings|holdings)'\)/.test(read(f))));
  assert.ok(sonar.every((f) => !/quiverquant|api\/quiver\/sec13f/.test(read(f))));
  /* Known 6.5 coordination item: PARA is aliased to PSKY, but the PARA symbol now belongs to
     Parabolic Technologies (CIK 1826011). This test pins the current behaviour so a fix in
     ownership.js (period- or CUSIP-scoped aliases) is a deliberate, visible change. */
  assert.equal(TICKER_ALIASES.PARA, 'PSKY');
  const { eligible, excluded } = normalizeUniverse([{ ticker: 'ZZZQ', issuer: 'Unknown' }], {});
  assert.equal(eligible.length, 0);
  assert.equal(excluded.length, 1);
});

test('11 government contract relationships keep the recipient and its parent separate', () => {
  const s = read('src/lib/usaspending-store.js');
  assert.match(s, /recipient_parent_name/);
  assert.match(s, /parent: r\.recipient_parent_name/);
  /* No contract code resolves a recipient to a ticker through the SEC CIK map. */
  for (const f of [
    'src/lib/usaspending-store.js',
    'src/lib/usaspending.js',
    'src/lib/bigquery-contracts.js',
  ])
    assert.ok(!/buildCikTickerIndex|sec_registrant_successions/.test(read(f)), f);
});

test('12 organizational data isolation: org seats and personal plans never grant each other', () => {
  const org = getSonarEntitlements({ planTier: 0, version: 'org', orgRole: 'analyst' });
  const pro = getSonarEntitlements({ planTier: 4 });
  assert.ok(org.datasets.includes('org-internal'));
  assert.ok(!pro.datasets.includes('org-internal'));
  assert.ok(!org.datasets.includes('13f'));
  assert.equal(pro.userLookup, false);
});
