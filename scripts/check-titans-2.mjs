/**
 * Unit tests for Titans Shadow steps 2 to 4 (pure, no network).
 *   node scripts/check-titans-2.mjs   (also `npm run test:titans-2`)
 *
 * Fixtures (see scripts/fixtures/README.md):
 *   form4/   three real Form 4 filings (sales plus an option exercise; awards;
 *            derivative only) and one labelled SYNTHETIC filing for an
 *            open-market purchase with two reporting owners.
 *   pvp/     the pay versus performance facts of a real DEF 14A (Cabot, FY2023).
 *   nport/   a real NPORT-P (Dupree Kentucky Tax-Free Short-to-Medium Series).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseForm4Xml, form4ToRows, rawForm4Url } from '../src/lib/sec/form4.js';
import {
  pickFirstConcept,
  framePeriods,
  periodTypeOf,
  pvpFromInlineXbrl,
  pvpFromCompanyFacts,
  ixDei,
  METRICS,
} from '../src/lib/sec/xbrl.js';
import {
  parseNportXml,
  nportSeriesIdFromHead,
  parseBrowseAtom,
  buildMfIndex,
} from '../src/lib/sec/nport.js';
import { clusterBuys, overlap, growthPct } from '../src/lib/titans/pure.js';

const fx = (p) => readFileSync(new URL(`./fixtures/${p}`, import.meta.url), 'utf8');

test('Form 4: sales and an option exercise (Snowflake)', () => {
  const p = parseForm4Xml(fx('form4/snow-sale-exercise.xml'));
  assert.equal(p.formType, '4');
  assert.deepEqual(p.issuer, { cik: '1640147', name: 'Snowflake Inc.', ticker: 'SNOW' });
  assert.equal(p.reporters[0].name, 'Scarpelli Michael');
  assert.equal(p.reporters[0].title, 'Chief Financial Officer');
  assert.equal(p.reporters[0].isOfficer, true);
  const rows = form4ToRows(p, { accessionNo: 'acc', filedAt: '2022-12-15T00:00:00Z' });
  assert.equal(rows.length, 7);
  const s = rows.find((r) => r.transaction_code === 'S');
  assert.equal(s.table_kind, 'non_derivative');
  assert.equal(s.shares, 73170);
  assert.equal(s.price, 150.841);
  assert.equal(s.value_usd, 11037035.97);
  assert.equal(s.acquired_disposed, 'D');
  assert.equal(s.direct_indirect, 'D');
  assert.equal(s.filed_at, '2022-12-15');
  const d = rows.find((r) => r.table_kind === 'derivative');
  assert.equal(d.transaction_code, 'M');
  assert.equal(d.price, 0); // reported as 0 by the filer, kept as 0
  assert.equal(d.line_no, 0);
});

test('Form 4: awards and a derivative-only filing', () => {
  const a = form4ToRows(parseForm4Xml(fx('form4/374water-award.xml')), { accessionNo: 'x' });
  assert.equal(a.length, 2);
  assert.ok(a.every((r) => r.transaction_code === 'A'));
  assert.equal(a[0].issuer_ticker, 'SCWO');
  const v = form4ToRows(parseForm4Xml(fx('form4/vertex-derivative-only.xml')), {
    accessionNo: 'y',
  });
  assert.equal(v.length, 1);
  assert.equal(v[0].table_kind, 'derivative');
  assert.equal(v[0].issuer_ticker, 'VRTX');
});

test('Form 4: open-market purchase, two owners, footnote-only price (synthetic)', () => {
  const p = parseForm4Xml(fx('form4/synthetic-purchase-two-owners.xml'));
  assert.equal(p.issuer.ticker, 'EXMP'); // upper-cased
  const rows = form4ToRows(p, { accessionNo: 'z' });
  assert.equal(rows[0].reporter_name, 'Doe Jane and Doe Family Trust');
  assert.equal(rows[0].reporter_cik, '456');
  assert.equal(rows[0].reporter_title, 'Chief Executive Officer');
  assert.equal(rows[0].is_director, true);
  assert.equal(rows[0].transaction_code, 'P');
  assert.equal(rows[0].shares, 10000); // "10,000"
  assert.equal(rows[0].value_usd, 255000);
  assert.equal(rows[0].direct_indirect, 'I');
  assert.equal(rows[1].price, null); // footnote only: never 0
  assert.equal(rows[1].value_usd, null);
});

test('Form 4: raw XML url, ticker NONE, not a Form 4', () => {
  assert.equal(
    rawForm4Url('https://www.sec.gov/Archives/edgar/data/1/0001/xslF345X05/wk-form4.xml'),
    'https://www.sec.gov/Archives/edgar/data/1/0001/wk-form4.xml',
  );
  const none = fx('form4/synthetic-purchase-two-owners.xml').replace('>exmp<', '>NONE<');
  assert.equal(parseForm4Xml(none).issuer.ticker, null);
  assert.equal(parseForm4Xml('<html/>'), null);
});

test('XBRL: first concept wins per company and period', () => {
  const picked = pickFirstConcept([
    {
      concept: 'us-gaap:Revenues',
      data: { data: [{ cik: 1, entityName: 'A', val: 100, end: '2025-12-31', accn: 'a1' }] },
    },
    {
      concept: 'us-gaap:RevenueFromContractWithCustomerExcludingAssessedTax',
      data: {
        data: [
          { cik: 1, val: 90 },
          { cik: 2, entityName: 'B', val: 50, end: '2025-12-31', accn: 'b1' },
        ],
      },
    },
  ]);
  assert.equal(picked.get('1').val, 100);
  assert.equal(picked.get('1').concept, 'us-gaap:Revenues');
  assert.equal(picked.get('2').val, 50);
  assert.equal(METRICS.find((m) => m.key === 'revenue').concepts.length, 3);
});

test('XBRL: frame periods and period types', () => {
  const { durations, instants } = framePeriods(new Date('2026-10-06T00:00:00Z'));
  assert.deepEqual(durations, [
    'CY2023',
    'CY2024',
    'CY2025',
    'CY2025Q4',
    'CY2026Q1',
    'CY2026Q2',
    'CY2026Q3',
  ]);
  assert.ok(instants.includes('CY2025Q4I') && instants.includes('CY2026Q2I'));
  assert.equal(periodTypeOf('CY2025'), 'annual');
  assert.equal(periodTypeOf('CY2026Q2'), 'quarter');
  assert.equal(periodTypeOf('CY2026Q2I'), 'instant');
});

test('Pay versus performance from proxy inline XBRL (Cabot, real)', () => {
  const html = fx('pvp/cabot-def14a-trimmed.html');
  assert.deepEqual(ixDei(html), { entityName: 'Cabot Corporation', cik: '0000016040' });
  const rows = pvpFromInlineXbrl(html, { accessionNo: 'acc' });
  assert.equal(rows.length, 3);
  const fy23 = rows[0];
  assert.equal(fy23.fiscal_year, 2023);
  assert.equal(fy23.peo_key, '');
  assert.equal(fy23.peo_name, 'Sean D. Keohane');
  assert.equal(fy23.peo_total_comp, 7791510);
  assert.equal(fy23.peo_comp_actually_paid, 8106840);
  assert.equal(fy23.company_tsr, 206);
  assert.equal(fy23.peer_group_tsr, 135);
  assert.equal(fy23.net_income, 445000000); // scale="6"
  assert.equal(fy23.company_selected_measure_name, 'Adjusted EBIT');
  assert.equal(fy23.company_selected_measure_value, 553000000);
});

test('Pay versus performance from companyfacts (ecd present / absent)', () => {
  assert.deepEqual(pvpFromCompanyFacts({ facts: { 'us-gaap': {} } }), []);
  const rows = pvpFromCompanyFacts({
    facts: {
      ecd: {
        PeoTotalCompAmt: {
          units: {
            USD: [
              { end: '2024-12-31', val: 10, filed: '2025-03-01', accn: 'old' },
              { end: '2024-12-31', val: 12, filed: '2026-03-01', accn: 'new' },
            ],
          },
        },
        TotalShareholderRtnAmt: {
          units: { USD: [{ end: '2024-12-31', val: 150, filed: '2026-03-01' }] },
        },
      },
    },
  });
  assert.equal(rows.length, 1);
  assert.equal(rows[0].peo_total_comp, 12); // latest filing wins
  assert.equal(rows[0].company_tsr, 150);
  assert.equal(rows[0].peer_group_tsr, null);
});

test('N-PORT: real filing parses holdings', () => {
  const xml = fx('nport/dupree-kentucky.xml');
  const r = parseNportXml(xml);
  assert.equal(r.submissionType, 'NPORT-P');
  assert.equal(r.seriesId, 'S000012000');
  assert.equal(r.reportDate, '2022-12-31');
  assert.equal(r.netAssets, 41349926.01);
  assert.equal(r.holdings.length, 55);
  assert.deepEqual(
    { ...r.holdings[0] },
    {
      lineNo: 0,
      name: 'KENTUCKY ST PPTY & BLDGS COMMN',
      title: 'KY KYSFAC 5 08/01/2028',
      cusip: '49151FGH7',
      isin: 'US49151FGH73',
      lei: null,
      balance: 755000,
      units: 'PA',
      valueUsd: 794207.15,
      pctValue: 1.9206978745,
      assetCategory: 'DBT',
      issuerCategory: 'MUN',
      country: 'US',
    },
  );
  assert.equal(nportSeriesIdFromHead(xml), 'S000012000');
});

test('N-PORT: browse feed and fund ticker index', () => {
  const atom = `<?xml version="1.0"?><feed xmlns="http://www.w3.org/2005/Atom"><entry><category term="NPORT-P"/><content type="text/xml"><accession-number>0001752724-26-000001</accession-number><filing-date>2026-08-27</filing-date><filing-href>https://www.sec.gov/Archives/edgar/data/1100663/000175272426000001/0001752724-26-000001-index.htm</filing-href><filing-type>NPORT-P</filing-type></content></entry></feed>`;
  assert.deepEqual(parseBrowseAtom(atom), [
    { accessionNo: '0001752724-26-000001', filedAt: '2026-08-27', form: 'NPORT-P', cik: '1100663' },
  ]);
  const mf = buildMfIndex({
    fields: ['cik', 'seriesId', 'classId', 'symbol'],
    data: [[1100663, 'S000004310', 'C000012040', 'IVV']],
  });
  assert.deepEqual(mf.get('IVV'), {
    cik: '1100663',
    seriesId: 'S000004310',
    classId: 'C000012040',
  });
});

test('Cluster buys need three insiders within 14 days', () => {
  const r = (date, insider, code = 'P', value = 100) => ({
    date,
    insider,
    code,
    ticker: 'X',
    company: 'X Co',
    value,
  });
  const hit = clusterBuys([
    r('2026-09-01', 'A'),
    r('2026-09-05', 'B'),
    r('2026-09-14', 'C'),
    r('2026-09-30', 'D'),
  ]);
  assert.equal(hit.length, 1);
  assert.equal(hit[0].insiders.length, 3);
  assert.equal(
    clusterBuys([r('2026-09-01', 'A'), r('2026-09-20', 'B'), r('2026-10-10', 'C')]).length,
    0,
  );
  assert.equal(
    clusterBuys([r('2026-09-01', 'A'), r('2026-09-02', 'B'), r('2026-09-03', 'C', 'S')]).length,
    0,
  );
});

test('ETF overlap is the sum of the smaller weights', () => {
  const o = overlap(
    [
      { cusip: 'A', name: 'a', pct: 5 },
      { cusip: 'B', name: 'b', pct: 3 },
      { cusip: 'C', name: 'c', pct: 1 },
    ],
    [
      { cusip: 'A', pct: 2 },
      { cusip: 'B', pct: 4 },
    ],
  );
  assert.equal(o.shared.length, 2);
  assert.equal(o.overlapPct, 5);
});

test('Growth only from two reported values', () => {
  assert.equal(growthPct(110, 100), 10);
  assert.equal(growthPct(110, null), null);
  assert.equal(growthPct(null, 100), null);
  assert.equal(growthPct(5, 0), null);
});
