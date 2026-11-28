/**
 * TEST FIXTURE ONLY (Sonar 6.5, Nov 28 2026). Frozen research records for the 6.5
 * dependency-graph suite. Tickers are invented (prefixed X) so nothing here can be mistaken
 * for production research. Expected outputs below were worked out by hand from these records
 * and committed before the 6.5 execution code.
 *
 * Every record carries its own period semantics, as the real sources do:
 *   congress      transaction_date and disclosure_date (purchases and sales)
 *   contracts     action_date (dated awards) and federal fiscal year obligations
 *   holders13f    report period (quarter end) and filing date; comparable-filer change
 *   ratios        fiscal year end per company (calendars differ)
 */

export const NOW = new Date('2026-11-28T12:00:00Z');
export const WINDOW = { from: '2025-11-28', to: '2026-11-28' };

/* The entity master: canonical ids from CIK where known. XSUB is a subsidiary of XPAR with a
   verified relationship; XLOOK is a name look-alike of XPAR with NO relationship. */
export const ENTITIES = {
  XAAA: { ticker: 'XAAA', cik: '9000001', name: 'Xaaa Systems Inc', sector: 'defense' },
  XBBB: { ticker: 'XBBB', cik: '9000002', name: 'Xbbb Defense Corp', sector: 'defense' },
  XCCC: { ticker: 'XCCC', cik: '9000003', name: 'Xccc Semiconductor', sector: 'semiconductors' },
  XDDD: { ticker: 'XDDD', cik: '9000004', name: 'Xddd Micro Devices', sector: 'semiconductors' },
  XEEE: { ticker: 'XEEE', cik: '9000005', name: 'Xeee Aerospace', sector: 'defense' },
  XFFF: { ticker: 'XFFF', cik: '9000006', name: 'Xfff Retail', sector: 'consumer' },
  XPAR: { ticker: 'XPAR', cik: '9000007', name: 'Xpar Holdings Inc', sector: 'defense' },
  XLOOK: { ticker: 'XLOOK', cik: '9000008', name: 'Xpar Holdings Group plc', sector: 'industrials' },
};

export const RELATIONSHIPS = [
  /* Verified from a filed exhibit: XSUB Federal LLC is a wholly owned subsidiary of XPAR. */
  { child: { name: 'XSUB Federal LLC', uei: 'UEI-XSUB' }, parentCik: '9000007', type: 'subsidiary', verified: true, source: 'EX-21 2025-02-14' },
];

export const CONGRESS = [
  { ticker: 'XAAA', member: 'M1', type: 'purchase', transaction_date: '2026-03-02', disclosure_date: '2026-04-10' },
  { ticker: 'XAAA', member: 'M2', type: 'purchase', transaction_date: '2026-08-12', disclosure_date: '2026-09-01' },
  { ticker: 'XBBB', member: 'M3', type: 'purchase', transaction_date: '2026-05-20', disclosure_date: '2026-06-30' },
  { ticker: 'XCCC', member: 'M1', type: 'sale', transaction_date: '2026-06-01', disclosure_date: '2026-07-01' },
  { ticker: 'XEEE', member: 'M4', type: 'purchase', transaction_date: '2026-07-07', disclosure_date: '2026-08-01' },
  /* Transaction before the window, disclosed inside it: excluded by transaction date. */
  { ticker: 'XFFF', member: 'M5', type: 'purchase', transaction_date: '2025-10-01', disclosure_date: '2025-12-15' },
  { ticker: 'XPAR', member: 'M2', type: 'purchase', transaction_date: '2026-02-02', disclosure_date: '2026-03-01' },
];

export const AWARDS = [
  { id: 'A1', recipient: 'Xaaa Systems Inc', ticker: 'XAAA', agency: 'DOD', amount: 140e6, action_date: '2026-05-01', fiscal_year: 2026 },
  { id: 'A2', recipient: 'Xbbb Defense Corp', ticker: 'XBBB', agency: 'DOD', amount: 30e6, action_date: '2027-01-15', fiscal_year: 2027 }, // future-dated
  { id: 'A3', recipient: 'Xeee Aerospace', ticker: 'XEEE', agency: 'NASA', amount: 220e6, action_date: '2026-02-11', fiscal_year: 2026 },
  { id: 'A4', recipient: 'XSUB Federal LLC', ticker: null, uei: 'UEI-XSUB', agency: 'DOD', amount: 80e6, action_date: '2026-06-01', fiscal_year: 2026 },
  { id: 'A5', recipient: 'Xpar Holdings Group plc', ticker: null, agency: 'DOD', amount: 50e6, action_date: '2026-04-01', fiscal_year: 2026 }, // name look-alike, no relationship
];

/* 13F: comparable-filer manager counts, Q3 vs Q2 2026 (report periods; filed by 45 days). */
export const HOLDERS13F = {
  period: '2026-09-30',
  prior: '2026-06-30',
  filedBy: '2026-11-14',
  rows: {
    XAAA: { now: 41, prior: 37 },
    XBBB: { now: 12, prior: 15 },
    XCCC: { now: 88, prior: 80 },
    XDDD: { now: 20, prior: 20 },
    XEEE: null, // no comparable filings: unknown, never "declined"
    XPAR: { now: 9, prior: 7 },
  },
};

/* Filed figures: revenue growth and operating margin (fractions), latest FY, prior-year
   margin where filed. Fiscal years differ (XCCC ends in January). */
export const RATIOS = {
  XAAA: { revenue_growth: 0.12, operating_margin: 0.18, operating_margin_prior: 0.21, revenue: 2.1e9, fiscalYearEnd: '2025-12-31' },
  XBBB: { revenue_growth: 0.31, operating_margin: 0.09, operating_margin_prior: 0.07, revenue: 0.8e9, fiscalYearEnd: '2025-12-31' },
  XCCC: { revenue_growth: 0.42, operating_margin: 0.33, operating_margin_prior: 0.36, revenue: 5.0e9, fiscalYearEnd: '2026-01-31' },
  XDDD: { revenue_growth: 0.05, operating_margin: 0.27, operating_margin_prior: 0.25, revenue: 1.2e9, fiscalYearEnd: '2025-12-31' },
  XEEE: { revenue_growth: 0.22, operating_margin: 0.15, operating_margin_prior: null, revenue: 3.0e9, fiscalYearEnd: '2025-09-30' },
  XFFF: { revenue_growth: -0.02, operating_margin: 0.04, operating_margin_prior: 0.05, revenue: 9.0e9, fiscalYearEnd: '2026-01-31' },
  XPAR: { revenue_growth: 0.08, operating_margin: 0.11, operating_margin_prior: 0.12, revenue: 1.6e9, fiscalYearEnd: '2025-12-31' },
};

/* A council fund for Scenario L (invented). */
export const COUNCIL = { orgId: '00000000-0000-4000-8000-00000000c001', tickers: ['XAAA', 'XBBB', 'XCCC', 'XFFF'] };

/* Expected outputs, worked by hand. */
export const EXPECTED = {
  /* Congress purchases in the window (by transaction date): XAAA(2), XBBB(1), XEEE(1), XPAR(1).
     XCCC is a sale (counts for "traded", not "bought"); XFFF traded before the window. */
  congressBuyers: ['XAAA', 'XBBB', 'XEEE', 'XPAR'],
  congressTraders: ['XAAA', 'XBBB', 'XCCC', 'XEEE', 'XPAR'],
  /* Awards in the window, direct recipients only: XAAA (A1), XEEE (A3). XBBB's is future-dated.
     XPAR gains A4 only as parent-group exposure through the verified subsidiary; A5 never joins. */
  awardsDirect: ['XAAA', 'XEEE'],
  awardsGroup: ['XAAA', 'XEEE', 'XPAR'],
  /* Scenario C (direct awards): Congress buyers ∩ direct awards ∩ 13F rise.
     XAAA pass/pass/pass; XEEE pass/pass/unknown; XBBB pass/fail; XPAR pass/fail(direct). */
  scenarioC: { pass: ['XAAA'], unknown: ['XEEE'], fail: ['XBBB', 'XPAR'] },
  /* Scenario D: semiconductors with margin > 25% and 13F rise: XCCC pass; XDDD margin pass, 13F flat (fail). */
  scenarioD: { pass: ['XCCC'], fail: ['XDDD'], unknown: [] },
  /* Scenario H: revenue growth > 20% and declining margin (prior-year margin filed):
     XBBB growth pass, margin rose (fail); XCCC pass/pass; XEEE growth pass, prior margin missing (unknown). */
  scenarioH: { pass: ['XCCC'], fail: ['XAAA', 'XBBB', 'XDDD', 'XFFF', 'XPAR'], unknown: ['XEEE'] },
  /* Scenario L: council holdings with improving revenue (growth > 0) and increased institutional
     selling (comparable managers fell): XBBB only. XFFF revenue fell. */
  scenarioL: { pass: ['XBBB'], fail: ['XAAA', 'XCCC', 'XFFF'], unknown: [] },
};
