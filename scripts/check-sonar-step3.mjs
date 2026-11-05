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
      contains: () => q,
      overlaps: () => q,
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

/* ── Part B: company disclosures quoted from 10-Q and 10-K ──────────── */

const { htmlToText, findSections, validateExtraction } = await import('@/lib/disclosures/sections');
const { extractSection, parseItems } = await import('@/lib/disclosures/extract');
const { disclosureTickers, latestPeriodic } = await import('@/lib/disclosures/filings');
const { disclosures } = await import('@/lib/sonar/engine/sources-memo');

/* A synthetic 10-Q excerpt in the shape of real filings (test data only). */
const FILING_HTML = `<html><head><style>p{}</style></head><body>
<p>Item 2. Management&#8217;s Discussion and Analysis of Financial Condition and Results of Operations.</p>
<div><span>Concentration of Revenue</span></div>
<p>Sales to one direct customer, Customer A, represented 16% of total revenue for the second quarter of fiscal year 2027, attributable to the Compute &amp; Networking segment.</p>
<p>Two indirect customers which primarily purchase our products through system integrators and distributors are estimated to each represent 10% or more of total revenue.</p>
<p>The U.S. government has imposed export controls and licensing requirements on the sale of our data center products to China. Our outlook assumes no data center compute revenue from China.</p>
<p>As of July 26, 2026, we had outstanding inventory purchases and long-term supply and capacity obligations totaling $50.3&nbsp;billion.</p>
<p>Signatures.</p>
</body></html>`;

test('a filing becomes text and its disclosure passages are found', () => {
  const text = htmlToText(FILING_HTML);
  assert.match(text, /Management’s Discussion/);
  assert.match(text, /Compute & Networking/);
  assert.match(text, /\$50\.3 billion/);
  assert.doesNotMatch(text, /p\{\}/, 'styles are dropped');
  const kinds = findSections(text).map((s) => s.kind);
  assert.ok(kinds.includes('customer_concentration'));
  assert.ok(kinds.includes('export_risk'));
  assert.ok(kinds.includes('purchase_obligations'));
});

test('only a verbatim quote with its figures in it is kept', async () => {
  const sections = findSections(htmlToText(FILING_HTML));
  const cc = sections.find((s) => s.kind === 'customer_concentration');
  const ok = {
    quote:
      'Sales to one direct customer, Customer A, represented 16% of total revenue for the second quarter of fiscal year 2027, attributable to the Compute & Networking segment.',
    party: 'Customer A',
    figures: [{ label: 'Customer A share of revenue', text: '16%' }],
  };
  assert.deepEqual(validateExtraction(cc.text, ok), { ok: true, reason: null });
  assert.equal(
    validateExtraction(cc.text, { ...ok, quote: 'Customer A was 16% of revenue in the quarter.' })
      .reason,
    'quote_not_in_filing',
    'a paraphrase is not a quote',
  );
  assert.match(
    validateExtraction(cc.text, { ...ok, figures: [{ text: '18%' }] }).reason,
    /^figure_not_in_quote/,
  );

  const fake = async () => ({
    answer: `Here you go: ${JSON.stringify({
      items: [ok, { quote: 'Customer A bought most of our chips.', figures: [] }],
    })}`,
  });
  const out = await extractSection(cc, { synthesize: fake, model: 'm' });
  assert.equal(out.kept.length, 1);
  assert.equal(out.kept[0].party, 'Customer A');
  assert.equal(out.dropped[0].reason, 'quote_not_in_filing');
  assert.deepEqual(parseItems('not json'), []);
});

test('the ingest covers the registry and its customers, newest filings first', () => {
  const t = disclosureTickers({ SONAR_DISCLOSURE_TICKERS: 'aapl, tsla' });
  for (const x of ['NVDA', 'AMD', 'MSFT', 'GOOGL', 'AAPL', 'TSLA']) assert.ok(t.includes(x), x);
  const sub = {
    filings: {
      recent: {
        accessionNumber: ['a1', 'a2', 'a3', 'a4'],
        form: ['8-K', '10-Q', '10-K', '10-Q'],
        filingDate: ['2026-10-01', '2026-08-27', '2026-02-25', '2025-05-28'],
        reportDate: ['2026-10-01', '2026-07-26', '2026-01-25', '2025-04-27'],
        primaryDocument: ['x.htm', 'q2.htm', 'k.htm', 'q1.htm'],
      },
    },
  };
  assert.deepEqual(
    latestPeriodic(sub, { since: '2025-09-01' }).map((f) => f.accessionNo),
    ['a2', 'a3'],
  );
});

test('the disclosures reader quotes the newest filing per topic', async () => {
  const admin = fakeAdmin({
    tables: {
      company_disclosures: [
        {
          kind: 'customer_concentration',
          quote: 'Sales to one direct customer, Customer A, represented 16% of total revenue.',
          party: 'Customer A',
          figures: [{ text: '16%' }],
          form_type: '10-Q',
          filed_at: '2026-08-27',
          period_end: '2026-07-26',
          source_url: 'https://www.sec.gov/x/q2.htm',
        },
        {
          kind: 'customer_concentration',
          quote: 'An older quarter said something else entirely about customers.',
          form_type: '10-Q',
          filed_at: '2026-05-28',
          period_end: '2026-04-26',
          source_url: 'https://www.sec.gov/x/q1.htm',
        },
      ],
    },
  });
  const out = await disclosures({ ticker: 'NVDA', name: 'NVIDIA' }, { admin });
  assert.equal(out.items.length, 1);
  assert.match(
    out.items[0].text,
    /10-Q filed 2026-08-27 for the period ended 2026-07-26, on customer concentration: "Sales to one direct customer/,
  );
  assert.equal(out.items[0].url, 'https://www.sec.gov/x/q2.htm');
  assert.equal(out.layout.disclosures[0].label, 'customer concentration');
});

/* ── Part C: US export controls ─────────────────────────────────────── */

const { parseCsl, parseFederalRegister, federalRegisterUrl, tagRule } =
  await import('@/lib/export-controls/parse');
const { exportControls } = await import('@/lib/sonar/engine/sources-memo');

test('the screening list keeps only the BIS lists, with countries', () => {
  const json = {
    results: [
      {
        id: 'e1',
        source: 'Entity List (EL) - Bureau of Industry and Security',
        name: 'Example Computing Ltd.',
        alt_names: ['Example Co'],
        addresses: [{ address: '1 Road', city: 'Shenzhen', country: 'CN' }],
        federal_register_notice: '89 FR 12345',
        start_date: '2025-12-02',
        source_list_url: 'https://www.bis.gov/entity-list',
      },
      { id: 'o1', source: 'Specially Designated Nationals (SDN) - Treasury Department', name: 'X' },
      {
        id: 'm1',
        source: 'Military End User (MEU) List - Bureau of Industry and Security',
        name: 'Y',
        addresses: [{ country: 'RU' }],
      },
    ],
  };
  const out = parseCsl(json);
  assert.deepEqual(
    out.map((e) => e.list),
    ['entity_list', 'military_end_user'],
  );
  assert.deepEqual(out[0].countries, ['CN']);
  assert.equal(out[0].start_date, '2025-12-02');
  assert.equal(parseCsl(json.results).length, 2, 'a bare array works too');
  const csv =
    'source,name,addresses,start_date,alt_names\n' +
    '"Entity List (EL) - Bureau of Industry and Security","Z Tech","Road 1, Beijing, CN; Road 2, Kowloon, HK",2024-05-01,"Z; Zed"\n';
  const c = parseCsl(csv);
  assert.deepEqual(c[0].countries, ['CN', 'HK']);
  assert.deepEqual(c[0].alt_names, ['Z', 'Zed']);
});

test('BIS rules are parsed and tagged by topic', () => {
  const rules = parseFederalRegister({
    results: [
      {
        document_number: '2026-01234',
        title: 'Revisions to Advanced Computing and Semiconductor Manufacturing Items Controls',
        abstract: 'BIS revises controls on integrated circuits destined for China.',
        type: 'Rule',
        publication_date: '2026-01-15',
        effective_on: '2026-02-14',
        html_url: 'https://www.federalregister.gov/d/2026-01234',
      },
      {
        document_number: 'x',
        title: 'Additions to the Entity List',
        publication_date: '2026-03-01',
      },
    ],
  });
  assert.deepEqual(rules[0].topics, ['advanced_computing', 'china']);
  assert.deepEqual(rules[1].topics, ['entity_list']);
  assert.deepEqual(tagRule('Russia and Belarus export restrictions'), ['russia']);
  const url = federalRegisterUrl({ page: 2, since: '2026-10-01' });
  assert.match(url, /conditions%5Bagencies%5D%5B%5D=industry-and-security-bureau/);
  assert.match(url, /conditions%5Bpublication_date%5D%5Bgte%5D=2026-10-01/);
  assert.match(url, /page=2/);
});

test('the export controls reader cites rules and Entity List counts', async () => {
  const admin = fakeAdmin({
    tables: {
      export_control_rules: [
        {
          document_number: '2026-01234',
          title: 'Revisions to Advanced Computing Controls',
          type: 'Rule',
          publication_date: '2026-01-15',
          effective_on: '2026-02-14',
          html_url: 'https://www.federalregister.gov/d/2026-01234',
          topics: ['advanced_computing', 'china'],
        },
      ],
      export_control_entries: [
        { list: 'entity_list', countries: ['CN'], start_date: '2026-06-01' },
        { list: 'entity_list', countries: ['CN'], start_date: '2024-02-01' },
        { list: 'military_end_user', countries: ['CN'], start_date: '2026-03-01' },
      ],
    },
  });
  const out = await exportControls(
    { ticker: 'NVDA', name: 'NVIDIA', countries: ['CN', 'HK'] },
    { admin, now: new Date('2026-11-05') },
  );
  assert.match(
    out.items[0].text,
    /published "Revisions to Advanced Computing Controls" in the Federal Register on 2026-01-15, effective 2026-02-14/,
  );
  assert.match(
    out.items[1].text,
    /2 Entity List entries located in China or Hong Kong added since 2023-11-06, 1 of them since 2025-11-05/,
  );
  assert.equal(out.layout.exportControls.rules.length, 1);
});
