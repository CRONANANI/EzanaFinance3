/**
 * Frozen fixtures for the Sonar execution evals (shared by check-sonar-execution and the
 * held-out objective eval). Every expected number in the tests is worked out from these.
 */
export const NOW = new Date('2026-11-28T12:00:00Z');

/* Annual filed figures: revenue (2 years), operating income, net income, OCF, capex,
   plus instant equity and long-term debt. */
export function filed(
  ticker,
  {
    rev,
    revPrev,
    opInc,
    ni,
    niPrev,
    ocf,
    capex,
    equity,
    debt,
    end = '2025-12-31',
    prevEnd = '2024-12-31',
  },
) {
  const a = (concept, value, period_end) => ({
    ticker,
    concept,
    value,
    period_end,
    period_type: 'annual',
    entity_name: `${ticker} Corp`,
  });
  const rows = [
    a('revenue', rev, end),
    a('revenue', revPrev, prevEnd),
    a('operating_income', opInc, end),
    a('net_income', ni, end),
    a('net_income', niPrev, prevEnd),
    a('operating_cash_flow', ocf, end),
    a('capex', capex, end),
  ];
  if (equity != null)
    rows.push({
      ticker,
      concept: 'equity',
      value: equity,
      period_end: end,
      period_type: 'instant',
      entity_name: `${ticker} Corp`,
    });
  if (debt != null)
    rows.push({
      ticker,
      concept: 'long_term_debt',
      value: debt,
      period_end: end,
      period_type: 'instant',
      entity_name: `${ticker} Corp`,
    });
  return rows;
}

export const FIXTURES = {
  ticker_sectors: [
    { ticker: 'AAA', sector: 'Energy' },
    { ticker: 'BBB', sector: 'Energy' },
    { ticker: 'CCC', sector: 'Energy' },
    { ticker: 'DDD', sector: 'Energy' }, // no filings
    { ticker: 'TTT', sector: 'Information Technology' },
  ],
  sec_fundamentals: [
    // AAA: growth 25%, op margin 20%
    ...filed('AAA', {
      rev: 1250,
      revPrev: 1000,
      opInc: 250,
      ni: 150,
      niPrev: 100,
      ocf: 300,
      capex: -100,
      equity: 1000,
      debt: 500,
    }),
    // BBB: growth 10%, op margin 16%
    ...filed('BBB', {
      rev: 1100,
      revPrev: 1000,
      opInc: 176,
      ni: 90,
      niPrev: 100,
      ocf: 200,
      capex: 50,
      equity: 800,
      debt: 200,
    }),
    // CCC: growth 30%, op margin 5% (fails a 15% margin filter)
    ...filed('CCC', {
      rev: 1300,
      revPrev: 1000,
      opInc: 65,
      ni: -10,
      niPrev: 20,
      ocf: 50,
      capex: 80,
      equity: 500,
      debt: 900,
    }),
    ...filed('TTT', {
      rev: 2000,
      revPrev: 1600,
      opInc: 600,
      ni: 400,
      niPrev: 300,
      ocf: 700,
      capex: 200,
      equity: 3000,
      debt: 0,
      end: '2025-06-30',
      prevEnd: '2024-06-30',
    }),
  ],
  sec_insider_transactions: [
    {
      issuer_ticker: 'AAA',
      value_usd: 100000,
      transaction_code: 'P',
      transaction_date: '2026-10-01',
      accession_no: 'a1',
    },
    {
      issuer_ticker: 'BBB',
      value_usd: 400000,
      transaction_code: 'P',
      transaction_date: '2026-11-01',
      accession_no: 'a2',
    },
    {
      issuer_ticker: 'BBB',
      value_usd: 900000,
      transaction_code: 'S',
      transaction_date: '2026-11-02',
      accession_no: 'a3',
    }, // a sale: excluded
    {
      issuer_ticker: 'AAA',
      value_usd: 5000000,
      transaction_code: 'P',
      transaction_date: '2025-01-01',
      accession_no: 'a4',
    }, // outside 90 days
  ],
  company_contract_history: [
    {
      ticker: 'AAA',
      fiscal_year: 2026,
      awarding_agency: 'Department of Defense',
      award_count: 3,
      total_amount: 300,
    },
    {
      ticker: 'AAA',
      fiscal_year: 2026,
      awarding_agency: 'Department of Energy',
      award_count: 1,
      total_amount: 100,
    },
    {
      ticker: 'AAA',
      fiscal_year: 2025,
      awarding_agency: 'Department of Defense',
      award_count: 2,
      total_amount: 200,
    },
    /* FY2027 is in progress on NOW (Nov 2026): never compared with a full year. */
    {
      ticker: 'AAA',
      fiscal_year: 2027,
      awarding_agency: 'Department of Defense',
      award_count: 1,
      total_amount: 999,
    },
  ],
  congress_trades: [],
};

/* ── Sonar 6.4 fixtures: valuation, industry, macro ───────────────────────────────── */

const q = (ticker, concept, period_end, value) => ({
  ticker,
  concept,
  value,
  period_end,
  period_type: 'quarter',
  entity_name: `${ticker} Corp`,
});
const inst = (ticker, concept, period_end, value) => ({
  ticker,
  concept,
  value,
  period_end,
  period_type: 'instant',
  entity_name: `${ticker} Corp`,
});

/* TTM = latest annual + quarters after it - the same quarters a year earlier.
   AAA: NI 150 + (40+45+50) - (30+35+40) = 180; revenue 1250 + 1020 - 900 = 1370.
   BBB: NI 90 + 65 - 70 = 85; revenue 1100 + 870 - 820 = 1150.
   CCC: NI -10 + (-15) - (-9) = -16; revenue 1300 + 990 - 975 = 1315.
   TTT: no quarters after its June 2025 annual: stale (more than 15 months old). */
export const QUARTERS = [
  ...[
    ['2025-03-31', 30, 290],
    ['2025-06-30', 35, 300],
    ['2025-09-30', 40, 310],
    ['2026-03-31', 40, 330],
    ['2026-06-30', 45, 340],
    ['2026-09-30', 50, 350],
  ].flatMap(([d, ni, rev]) => [q('AAA', 'net_income', d, ni), q('AAA', 'revenue', d, rev)]),
  ...[
    ['2025-03-31', 25, 270],
    ['2025-06-30', 25, 270],
    ['2025-09-30', 20, 280],
    ['2026-03-31', 20, 280],
    ['2026-06-30', 20, 290],
    ['2026-09-30', 25, 300],
  ].flatMap(([d, ni, rev]) => [q('BBB', 'net_income', d, ni), q('BBB', 'revenue', d, rev)]),
  ...[
    ['2025-03-31', -2, 320],
    ['2025-06-30', -3, 325],
    ['2025-09-30', -4, 330],
    ['2026-03-31', -5, 330],
    ['2026-06-30', -5, 330],
    ['2026-09-30', -5, 330],
  ].flatMap(([d, ni, rev]) => [q('CCC', 'net_income', d, ni), q('CCC', 'revenue', d, rev)]),
  inst('AAA', 'shares_outstanding', '2026-10-20', 10),
  inst('BBB', 'shares_outstanding', '2026-10-15', 5),
  inst('CCC', 'shares_outstanding', '2026-10-10', 20),
  inst('TTT', 'shares_outstanding', '2025-08-01', 50),
];

/* Market prices (an authorized quote provider stands in for FMP). P/E: AAA 2000/180 =
   11.111; BBB 750/85 = 8.8235; CCC negative earnings (not meaningful). P/S: AAA 1.4599,
   BBB 0.6522, CCC 0.1521. Earnings yield: AAA 9.0%, BBB 11.333%, CCC -8.0%. */
export const PRICES = {
  AAA: { price: 200, asOf: '2026-11-27' },
  BBB: { price: 150, asOf: '2026-11-27' },
  CCC: { price: 10, asOf: '2026-11-27' },
};

/* Verified industry classification (SEC SIC codes). */
export const INDUSTRY = [
  { ticker: 'AAA', cik: '1', sic: '1311', sic_description: 'Crude Petroleum & Natural Gas' },
  { ticker: 'BBB', cik: '2', sic: '2911', sic_description: 'Petroleum Refining' },
  { ticker: 'CCC', cik: '3', sic: '1381', sic_description: 'Drilling Oil & Gas Wells' },
  { ticker: 'TTT', cik: '5', sic: '3674', sic_description: 'Semiconductors & Related Devices' },
  { ticker: 'SFT', cik: '6', sic: '7372', sic_description: 'Services-Prepackaged Software' },
  { ticker: 'BNK', cik: '7', sic: '6022', sic_description: 'State Commercial Banks' },
  {
    ticker: 'DEF',
    cik: '8',
    sic: '3812',
    sic_description: 'Search, Detection, Navigation, Guidance',
  },
].map((r) => ({ ...r, source: 'sec_submissions', verified_at: '2026-11-20T00:00:00Z' }));

/* Monthly series. USA CPI rises 0.2% a month to 2026-04 and 0.4% a month after; 2025-10
   is missing (as in the real IMF series). CAN 0.15% a month; GBR 0.3% a month. */
function months(from, to) {
  const out = [];
  let [y, m] = from.split('-').map(Number);
  const [ty, tm] = to.split('-').map(Number);
  while (y < ty || (y === ty && m <= tm)) {
    out.push(`${y}-${String(m).padStart(2, '0')}`);
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return out;
}
export const CPI = {};
{
  const ms = months('2024-09', '2026-10');
  let us = 100;
  let ca = 100;
  let gb = 100;
  CPI.USA = {};
  CPI.CAN = {};
  CPI.GBR = {};
  for (const p of ms) {
    CPI.USA[p] = us;
    CPI.CAN[p] = ca;
    CPI.GBR[p] = gb;
    us *= p < '2026-04' ? 1.002 : 1.004;
    ca *= 1.0015;
    gb *= 1.003;
  }
  delete CPI.USA['2025-10'];
  delete CPI.CAN['2026-10']; // CAN's latest CPI is September, as in the real series
}
export const POLICY = {
  USA: Object.fromEntries(months('2025-01', '2026-10').map((p) => [p, 3.75])),
  GBR: Object.fromEntries(months('2025-01', '2026-10').map((p) => [p, 4])),
  CAN: Object.fromEntries(
    months('2025-01', '2026-10').map((p) => [
      p,
      p < '2026-03' ? 2.75 : p < '2026-06' ? 2.5 : p < '2026-10' ? 2.25 : 2.5,
    ]),
  ),
};
const BIS2 = { USA: 'US', CAN: 'CA', GBR: 'GB' };
export const MACRO_ROWS = [
  ...Object.entries(CPI).flatMap(([iso, s]) =>
    Object.entries(s).map(([period, value]) => ({
      source: 'imf',
      series_key: `IMF.CPI:dataflow.${iso}.CPI._T.IX.M`,
      country_iso3: iso,
      period,
      value,
      series_name: 'Consumer price index',
      unit: null,
      frequency: 'M',
      dataset: 'IMF.STA/CPI',
    })),
  ),
  ...Object.entries(POLICY).flatMap(([iso, s]) =>
    Object.entries(s).map(([period, value]) => ({
      source: 'bis',
      series_key: `WS_CBPOL:M.${BIS2[iso]}`,
      country_iso3: iso,
      period,
      value,
      series_name: 'Central bank policy rates',
      unit: null,
      frequency: 'M',
      dataset: 'WS_CBPOL',
    })),
  ),
];

FIXTURES.ticker_sectors.push(
  { ticker: 'SFT', sector: 'Information Technology' },
  { ticker: 'BNK', sector: 'Financials' },
  { ticker: 'DEF', sector: 'Industrials' },
);
FIXTURES.sec_fundamentals.push(
  ...QUARTERS,
  /* SFT: software in the same GICS sector as TTT; growth 4.2%, margin 40%. */
  ...filed('SFT', {
    rev: 500,
    revPrev: 480,
    opInc: 200,
    ni: 150,
    niPrev: 140,
    ocf: 180,
    capex: 20,
    equity: 900,
    debt: 0,
  }),
  /* BNK: a bank; growth 8%. */
  ...filed('BNK', {
    rev: 1080,
    revPrev: 1000,
    opInc: 400,
    ni: 300,
    niPrev: 280,
    ocf: 350,
    capex: 10,
    equity: 5000,
    debt: 2000,
  }),
  /* DEF: a defense electronics maker; growth 12%. */
  ...filed('DEF', {
    rev: 2240,
    revPrev: 2000,
    opInc: 300,
    ni: 200,
    niPrev: 180,
    ocf: 260,
    capex: 60,
    equity: 1500,
    debt: 700,
  }),
);
FIXTURES.company_industry = INDUSTRY;
FIXTURES.macro_series_values = MACRO_ROWS;
FIXTURES.company_contract_history.push({
  ticker: 'DEF',
  fiscal_year: 2026,
  awarding_agency: 'Department of Defense',
  award_count: 12,
  total_amount: 900000000,
});
