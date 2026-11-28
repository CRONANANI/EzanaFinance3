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
