/**
 * TEST FIXTURE ONLY (Sonar 6.5.1, Nov 28 2026). Synthetic research records for the 6.5.1
 * suite. Tickers prefixed X are invented. PARA, PSKY, SKYD and the dates of the Paramount
 * and Skydance combination are real identity facts already on record in 6.4
 * (docs/SONAR_6_4_INTEGRATION_COMPATIBILITY.md); every amount here is synthetic.
 * Expected outputs were worked out by hand and committed before the 6.5.1 code.
 *
 * Period semantics, as the real tables hold them:
 *   contract_awards_resolved.action_date   the award's USAspending "Start Date" (the ingest
 *                                          maps Start Date into this column), not a
 *                                          transaction date; award_amount is USAspending's
 *                                          "Award Amount" (obligated to date), one row per
 *                                          award (upsert on generated_award_id)
 *   awarding_agency / funding_agency       USAspending toptier agency names
 *   sec_fundamentals                       annual rows per company fiscal year end
 *   congress_trades.transaction_date       not null in the schema; no date-range columns
 */

export const NOW = new Date('2026-11-28T15:00:00Z');
/* Latest complete federal fiscal year: FY2026 = 2025-10-01 .. 2026-09-30. */
export const FFY = {
  current: { fy: 2026, from: '2025-10-01', to: '2026-09-30' },
  prior: { fy: 2025, from: '2024-10-01', to: '2025-09-30' },
};
export const WINDOW = { from: '2025-11-28', to: '2026-11-28' };

const DOD = 'Department of Defense';
const DOE = 'Department of Energy';
const DHS = 'Department of Homeland Security';
const NASA = 'National Aeronautics and Space Administration';

const aw = (id, ticker, agency, amount, start, funding = agency, extra = {}) => ({
  generated_award_id: id,
  ticker,
  recipient_name: extra.recipient || `${ticker || 'UNRESOLVED'} RECIPIENT`,
  recipient_id: extra.recipient_id || null,
  award_amount: amount,
  awarding_agency: agency,
  awarding_sub_agency: null,
  funding_agency: funding,
  action_date: start,
  fiscal_year:
    start >= '2025-10-01' && start <= '2026-09-30'
      ? 2026
      : start >= '2024-10-01' && start <= '2025-09-30'
        ? 2025
        : start > '2026-09-30'
          ? 2027
          : 2024,
  award_type: 'Definitive Contract',
  is_public: ticker ? true : null,
});

export const AWARDS = [
  aw('X-LMT-1', 'XLMT', DOD, 600e6, '2026-03-01'),
  aw('X-LMT-2', 'XLMT', NASA, 100e6, '2026-05-01'),
  aw('X-LMT-0', 'XLMT', DOD, 500e6, '2025-02-01'),
  aw('X-RTX-1', 'XRTX', DOD, 400e6, '2026-01-10'),
  /* a separate award with a net deobligation: preserved as negative */
  aw('X-RTX-2', 'XRTX', DOD, -50e6, '2026-07-01'),
  aw('X-RTX-0', 'XRTX', DOD, 600e6, '2025-03-15'),
  /* awarded by Energy, funded by Defense: in only on a funding-agency basis */
  aw('X-NOC-1', 'XNOC', DOE, 250e6, '2025-12-01', DOD),
  /* starts in 2027: not yet started, excluded from every completed period and window */
  aw('X-NOC-F', 'XNOC', DOD, 90e6, '2027-02-01'),
  aw('X-PLT-1', 'XPLTR', DOD, 420e6, '2026-04-15'),
  aw('X-GRP-1', 'XGRP', DOD, 50e6, '2026-02-20'),
  aw('X-GRP-0', 'XGRP', DOD, 70e6, '2025-01-20'),
  /* a subsidiary's award: no ticker on the row; joins XGRP only at group scope with a
     verified relationship */
  aw('X-SUB-1', null, DOD, 80e6, '2026-06-01', DOD, {
    recipient: 'XGRP FEDERAL LLC',
    recipient_id: 'R-XSUB',
  }),
  aw('X-MIS-1', 'XMIS', DOD, 30e6, '2026-02-01'),
  aw('X-NRV-1', 'XNRV', DHS, 20e6, '2026-03-03'),
  aw('X-ZER-1', 'XZERO', DOE, 10e6, '2026-06-06'),
];

export const RELATIONSHIPS = [
  {
    child: { uei: 'R-XSUB' },
    parentCik: '9100005',
    type: 'subsidiary',
    verified: true,
    source: 'EX-21 2026-02-10',
  },
];

/* Annual filed figures. Revenue concept is the same both years (comparable growth). */
const fy = (ticker, cik, end, revenue, opInc, endPrior, revPrior, opPrior) => [
  {
    ticker,
    cik,
    accession_no: `${cik}-26-1`,
    concept: 'revenue',
    taxonomy_concept: 'Revenues',
    period_type: 'annual',
    period_end: end,
    value: revenue,
  },
  {
    ticker,
    cik,
    accession_no: `${cik}-26-1`,
    concept: 'operating_income',
    taxonomy_concept: 'OperatingIncomeLoss',
    period_type: 'annual',
    period_end: end,
    value: opInc,
  },
  {
    ticker,
    cik,
    accession_no: `${cik}-25-1`,
    concept: 'revenue',
    taxonomy_concept: 'Revenues',
    period_type: 'annual',
    period_end: endPrior,
    value: revPrior,
  },
  {
    ticker,
    cik,
    accession_no: `${cik}-25-1`,
    concept: 'operating_income',
    taxonomy_concept: 'OperatingIncomeLoss',
    period_type: 'annual',
    period_end: endPrior,
    value: opPrior,
  },
];

export const ENTITIES = {
  XLMT: { cik: '9100001', name: 'Xlmt Aeronautics' },
  XRTX: { cik: '9100002', name: 'Xrtx Systems' },
  XNOC: { cik: '9100003', name: 'Xnoc Dynamics' },
  XPLTR: { cik: '9100004', name: 'Xpltr Software' },
  XGRP: { cik: '9100005', name: 'Xgrp Holdings' },
  XMIS: { cik: '9100006', name: 'Xmis Late Filer' },
  XNRV: { cik: '9100007', name: 'Xnorev Services' },
  XZERO: { cik: '9100008', name: 'Xzero Shell' },
};

export const FUNDAMENTALS = [
  /* margin 0.12 vs 0.13 (declining) */
  ...fy('XLMT', '9100001', '2025-12-31', 10e9, 1.2e9, '2024-12-31', 9.5e9, 1.235e9),
  /* margin 0.10 vs 0.09 (rising) */
  ...fy('XRTX', '9100002', '2025-12-31', 20e9, 2.0e9, '2024-12-31', 19e9, 1.71e9),
  /* margin 0.08 vs 0.10 (declining) */
  ...fy('XNOC', '9100003', '2025-12-31', 5e9, 0.4e9, '2024-12-31', 4.8e9, 0.48e9),
  /* margin 0.15 vs 0.10 (rising) */
  ...fy('XPLTR', '9100004', '2025-12-31', 2.8e9, 0.42e9, '2024-12-31', 2.2e9, 0.22e9),
  ...fy('XGRP', '9100005', '2025-12-31', 1e9, 0.05e9, '2024-12-31', 0.95e9, 0.06e9),
  /* latest filed year ended 2024-06-30: too far from the contract period (unavailable) */
  ...fy('XMIS', '9100006', '2024-06-30', 0.6e9, 0.03e9, '2023-06-30', 0.55e9, 0.03e9),
  /* XNRV files no revenue */
  {
    ticker: 'XNRV',
    cik: '9100007',
    accession_no: '9100007-26-1',
    concept: 'operating_income',
    taxonomy_concept: 'OperatingIncomeLoss',
    period_type: 'annual',
    period_end: '2025-12-31',
    value: 1e6,
  },
  /* XZERO files revenue of zero */
  ...fy('XZERO', '9100008', '2025-12-31', 0, -1e6, '2024-12-31', 0, -1e6),
];

/* Congressional purchases inside the screen window, and the PARA history cases. */
export const CONGRESS = [
  { id: 1, ticker: 'XLMT', bioguide_id: 'M1', type: 'purchase', transaction_date: '2026-02-11' },
  { id: 2, ticker: 'XRTX', bioguide_id: 'M2', type: 'purchase', transaction_date: '2026-04-02' },
  { id: 3, ticker: 'XNOC', bioguide_id: 'M3', type: 'purchase', transaction_date: '2026-05-05' },
  { id: 4, ticker: 'XPLTR', bioguide_id: 'M4', type: 'purchase', transaction_date: '2026-06-06' },
];

export const PARA_TRADES = [
  {
    id: 'P1',
    ticker: 'PARA',
    type: 'purchase',
    transaction_date: '2025-03-10',
    disclosure_date: '2025-04-01',
  }, // Paramount Global
  {
    id: 'P2',
    ticker: 'PARA',
    type: 'purchase',
    transaction_date: '2025-08-06',
    disclosure_date: '2025-09-01',
  }, // last Paramount Global day
  {
    id: 'P3',
    ticker: 'PARA',
    type: 'purchase',
    transaction_date: '2025-08-07',
    disclosure_date: '2025-09-02',
  }, // transition date
  {
    id: 'P4',
    ticker: 'PARA',
    type: 'purchase',
    transaction_date: '2026-02-02',
    disclosure_date: '2026-03-01',
  }, // reassigned symbol, holder start unverified
  {
    id: 'P5',
    ticker: 'PARA',
    type: 'purchase',
    transaction_date: null,
    disclosure_date: '2025-10-01',
  }, // no transaction date
  {
    id: 'P6',
    ticker: null,
    asset_name: 'Paramount',
    type: 'purchase',
    transaction_date: '2025-05-01',
  }, // no ticker
];

/* 13F comparable-manager counts (current vs prior quarter). XPLTR has no comparable filings. */
export const HOLDERS = { XLMT: [12, 9], XRTX: [7, 9], XNOC: [4, 4] };

/* Sector table: one company listed under its former and its current symbol. */
export const TICKER_SECTORS = [
  { ticker: 'PSKY', sector: 'Communication Services' },
  { ticker: 'SKYD', sector: 'Communication Services' },
  { ticker: 'XMED', sector: 'Communication Services' },
];

/* Price rows for the price-contract checks (synthetic). */
export const PRICES = {
  ok: { ticker: 'XLMT', date: '2026-11-27', close: 410.2, adj_close: 410.2, volume: 1e6 },
  adjustedMismatch: {
    ticker: 'XRTX',
    date: '2026-11-27',
    close: 120.0,
    adj_close: 118.4,
    volume: 2e6,
  },
  stale: { ticker: 'XNOC', date: '2026-11-01', close: 300.0, adj_close: 300.0, volume: 1e5 },
  zero: { ticker: 'XGRP', date: '2026-11-27', close: 0, adj_close: 0, volume: 0 },
  quoteRow: { ticker: 'XPLTR', date: '2026-11-27', close: 25.5, adj_close: null, volume: null },
};

/* ── expected outputs (worked by hand) ─────────────────────────────────── */
export const EXPECTED = {
  /* A: FFY2026 obligations (awards started in the year, obligated to date, direct) over the
     latest filed annual revenue ending within 365 days before 2026-09-30. */
  A: {
    ratios: { XPLTR: 0.15, XLMT: 0.07, XGRP: 0.05, XNOC: 0.05, XRTX: 0.0175 },
    order: ['XPLTR', 'XLMT', 'XGRP', 'XNOC', 'XRTX'],
    unavailable: { XMIS: 'period', XNRV: 'revenue_missing', XZERO: 'revenue_zero' },
  },
  /* B: awarding agency DoD, award start in the last 12 months. XNOC's DoD award starts in
     2027 (excluded) and its 2025-12 award was awarded by Energy. */
  B: {
    awarding: ['XGRP', 'XLMT', 'XMIS', 'XPLTR', 'XRTX'],
    funding: ['XGRP', 'XLMT', 'XMIS', 'XNOC', 'XPLTR', 'XRTX'],
  },
  /* C: Congress purchases, then DoD (awarding) in the window, then a 13F rise. */
  C: { pass: ['XLMT'], fail: ['XNOC', 'XRTX'], unknown: ['XPLTR'] },
  /* D: FFY2026 vs FFY2025 change in obligations; no prior-period award observed = unknown. */
  D: {
    pass: ['XLMT'],
    fail: ['XGRP', 'XRTX'],
    unknown: ['XMIS', 'XNOC', 'XNRV', 'XPLTR', 'XZERO'],
  },
  growth: {
    XLMT: { current: 700e6, prior: 500e6, change: 200e6, pct: 40 },
    XRTX: { current: 350e6, prior: 600e6, change: -250e6, grossPositive: 400e6 },
  },
  /* E: increasing obligations and declining margin, over XLMT, XRTX, XNOC, XGRP. */
  E: { pass: ['XLMT'], fail: ['XGRP', 'XRTX'], unknown: ['XNOC'] },
  /* F/G: PARA by transaction date. */
  F: {
    P1: { status: 'resolved', cik: '813828' },
    P2: { status: 'resolved', cik: '813828' },
    P3: 'unresolved',
    P4: 'unresolved',
    P5: 'unresolved',
    P6: 'unresolved',
  },
  /* J: XGRP direct 50e6 / 1e9 = 0.05; group adds the verified subsidiary: 130e6 / 1e9. */
  J: { direct: 0.05, group: 0.13 },
};
