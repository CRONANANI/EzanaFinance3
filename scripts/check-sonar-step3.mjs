/**
 * Deep research step 3: the data the investment risk assessment needs
 * (Nov 2026). Part A: capex and balance-sheet lines, the CIK ticker fix,
 * customer capital spending, consensus estimates.
 *   npm run test:sonar-step3
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

const { buildCikTickerIndex } = await import('@/lib/sec-edgar');
const { METRICS } = await import('@/lib/sec/xbrl');
const { customersOf, peersOf } = await import('@/lib/sonar/industries');
const { reportedPeriods, customerCapex, estimatesFromPayload } =
  await import('@/lib/sonar/engine/sources-memo');
const { understandQuery } = await import('@/lib/sonar/understand');
const { buildResearchSpec } = await import('@/lib/sonar/engine/research-spec');
const { planResearch } = await import('@/lib/sonar/engine/planner');
const { toEvidence } = await import('@/lib/sonar/engine/evidence');
const { analyze } = await import('@/lib/sonar/engine/analysis');

export const NVDA_Q =
  "What are the biggest risks to NVIDIA's growth over the next three years? Analyze its financial performance, institutional ownership, government contracts, industry exposure, and competitive landscape.";

export const NVDA_RES = {
  subject: { kind: 'company', id: 'NVDA', label: 'NVIDIA Corporation' },
  company: { ticker: 'NVDA', name: 'NVIDIA Corporation' },
  universe: {
    label: 'NVIDIA Corporation',
    tickers: ['NVDA'],
    names: { NVDA: 'NVIDIA Corporation' },
  },
  peers: peersOf('NVDA'),
  customers: customersOf('NVDA'),
  countries: [],
};

/* A fake admin client: from(table) returns a chainable query resolving to the
   rows given for that table; rpc(name) returns the given payload. */
export function fakeAdmin({ tables = {}, rpc = {} } = {}) {
  const chain = (rows) => {
    const q = {
      select: () => q,
      in: () => q,
      eq: () => q,
      neq: () => q,
      gte: () => q,
      lte: () => q,
      ilike: () => q,
      or: () => q,
      order: () => q,
      limit: () => Promise.resolve({ data: rows, error: null }),
      maybeSingle: () => Promise.resolve({ data: rows[0] || null, error: null }),
      then: (r) => Promise.resolve({ data: rows, error: null }).then(r),
    };
    return q;
  };
  return {
    from: (t) => chain(tables[t] || []),
    rpc: async (name) => rpc[name] || { data: null, error: { message: 'missing' } },
  };
}

const row = (ticker, concept, period_type, frame, period_end, value, entity_name = ticker) => ({
  ticker,
  entity_name,
  concept,
  period_type,
  frame,
  period_end,
  value,
});

test('one CIK, several tickers: the primary listed ticker wins', () => {
  const idx = buildCikTickerIndex({
    0: { cik_str: 1652044, ticker: 'GOOGL', title: 'Alphabet Inc.' },
    1: { cik_str: 1652044, ticker: 'GOOG', title: 'Alphabet Inc.' },
    2: { cik_str: 1652044, ticker: 'GOOGM', title: 'Alphabet Inc.' },
    3: { cik_str: 1341439, ticker: 'ORCL-PD', title: 'ORACLE CORP' },
    4: { cik_str: 1341439, ticker: 'ORCL', title: 'ORACLE CORP' },
    5: { cik_str: 1045810, ticker: 'NVDA', title: 'NVIDIA CORP' },
  });
  assert.equal(idx.get('1652044'), 'GOOGL');
  assert.equal(idx.get('1341439'), 'ORCL', 'a plain ticker beats an earlier preferred');
  assert.equal(idx.get('1045810'), 'NVDA');
});

test('the fundamentals ingest asks for capex fallbacks and balance-sheet lines', () => {
  const by = Object.fromEntries(METRICS.map((m) => [m.key, m]));
  assert.ok(by.capex.concepts.includes('us-gaap:PaymentsToAcquireProductiveAssets'));
  assert.equal(by.capex.concepts[0], 'us-gaap:PaymentsToAcquirePropertyPlantAndEquipment');
  for (const k of ['inventory', 'receivables', 'purchase_obligations']) {
    assert.equal(by[k].instant, true, k);
  }
  for (const k of ['rd_expense', 'sbc']) assert.equal(by[k].instant, false, k);
});

test('balance-sheet values attach to the period ending that day', async () => {
  const admin = fakeAdmin({
    tables: {
      sec_fundamentals: [
        row('NVDA', 'revenue', 'quarter', 'CY2026Q2', '2026-07-26', 96221e6),
        row('NVDA', 'capex', 'quarter', 'CY2026Q2', '2026-07-26', 1.6e9),
        row('NVDA', 'inventory', 'instant', 'CY2026Q2I', '2026-07-26', 15.0e9),
        row('NVDA', 'receivables', 'instant', 'CY2026Q2I', '2026-07-26', 33.4e9),
      ],
    },
  });
  const p = (await reportedPeriods(admin, ['NVDA'])).NVDA.quarters[0];
  assert.equal(p.inventory, 15.0e9);
  assert.equal(p.receivables, 33.4e9);
  assert.equal(p.capex, 1.6e9);
});

test('customer capital spending reads each customer from its own filings', async () => {
  assert.deepEqual(
    customersOf('NVDA').map((c) => c.ticker),
    ['MSFT', 'AMZN', 'GOOGL', 'META', 'ORCL'],
  );
  assert.deepEqual(customersOf('LMT'), []);
  const admin = fakeAdmin({
    tables: {
      sec_fundamentals: [
        row('MSFT', 'revenue', 'quarter', 'CY2026Q3', '2026-09-30', 80e9),
        row('MSFT', 'capex', 'quarter', 'CY2026Q3', '2026-09-30', 25e9),
        row('MSFT', 'operating_cash_flow', 'quarter', 'CY2026Q3', '2026-09-30', 40e9),
        row('MSFT', 'revenue', 'annual', 'CY2025', '2026-06-30', 300e9),
        row('MSFT', 'capex', 'annual', 'CY2025', '2026-06-30', 90e9),
        row('MSFT', 'revenue', 'annual', 'CY2024', '2025-06-30', 260e9),
        row('MSFT', 'capex', 'annual', 'CY2024', '2025-06-30', 60e9),
        row('META', 'revenue', 'annual', 'CY2025', '2025-12-31', 200e9),
        row('META', 'capex', 'annual', 'CY2025', '2025-12-31', 70e9),
      ],
    },
  });
  const out = await customerCapex(
    { ticker: 'NVDA', name: 'NVIDIA', customers: customersOf('NVDA') },
    { admin },
  );
  const text = out.items[0].text;
  assert.match(
    text,
    /Microsoft \(MSFT\) quarter ended 2026-09-30 capital expenditure \$25\.00B \(62\.5% of operating cash flow\)/,
  );
  assert.match(text, /fiscal year ended 2026-06-30 \$90\.00B, up 50\.0% from \$60\.00B/);
  assert.match(text, /Meta Platforms \(META\) fiscal year ended 2025-12-31 \$70\.00B/);
  assert.match(text, /not only purchases from NVIDIA/);
  const ev = toEvidence(out.items[0], { source: 'customer_capex' });
  const ids = analyze([ev], {}).metrics.map((m) => m.id);
  assert.ok(ids.includes('customer_capex_fy_total'));
  assert.ok(ids.includes('customers_capex_rising'));
});

test('consensus estimates are attributed, dated and never Ezana’s', () => {
  const out = estimatesFromPayload(
    {
      est: [
        { date: '2025-01-26', revenueAvg: 1 },
        {
          date: '2027-01-31',
          revenueAvg: 3.4e11,
          revenueLow: 3.1e11,
          revenueHigh: 3.7e11,
          epsAvg: 7.1,
          numAnalystsRevenue: 40,
        },
        { date: '2028-01-31', revenueAvg: 4.2e11, epsAvg: 8.9, numAnalystsRevenue: 35 },
      ],
      ratios: [{ priceToEarningsRatioTTM: 44.2, priceToSalesRatioTTM: 22.1 }],
      metrics: [{ evToEBITDATTM: 35.6 }],
    },
    { ticker: 'NVDA', name: 'NVIDIA', now: new Date('2026-11-05') },
  );
  const [est, val] = out.items;
  assert.match(est.text, /a third-party forecast, not Ezana's/);
  assert.match(
    est.text,
    /fiscal year ending 2027-01-31 revenue \$340\.00B \(range \$310\.00B to \$370\.00B\), EPS \$7\.10 from 40 analysts/,
  );
  assert.doesNotMatch(est.text, /2025-01-26/, 'past years are not estimates');
  assert.match(
    val.text,
    /price to trailing earnings 44\.2x, enterprise value to trailing EBITDA 35\.6x/,
  );
  assert.equal(out.layout.expectations.forward.length, 2);
  assert.deepEqual(estimatesFromPayload({}, { ticker: 'X' }).items, []);
});

test('the NVIDIA memo plan reads customer capex and estimates', async () => {
  const u = await understandQuery(NVDA_Q, {});
  const spec = buildResearchSpec(u, { query: NVDA_Q, resolution: NVDA_RES, depth: 'deep' });
  const plan = planResearch(spec, NVDA_RES, { depth: 'deep' });
  const sources = plan.tasks.map((t) => t.source);
  assert.ok(sources.includes('customer_capex'));
  assert.ok(sources.includes('estimates'));
  assert.equal(
    plan.tasks.find((t) => t.source === 'customer_capex').params.customers[0].ticker,
    'MSFT',
  );
});
