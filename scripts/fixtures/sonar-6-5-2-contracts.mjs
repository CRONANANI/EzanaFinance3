/**
 * TEST FIXTURE ONLY (Sonar 6.5.2, Nov 28 2026). Synthetic federal-contract records for the
 * 6.5.2 financial-correctness suite. Tickers prefixed X are invented; every amount is
 * synthetic. Expected outputs were worked out by hand and committed before the 6.5.2 code.
 *
 * Shapes follow the real sources (inspected in 6.5.2):
 *   AWARDS        public.contract_awards_resolved: one row per award; `action_date` holds the
 *                 USAspending search field "Start Date"; `award_amount` holds "Award Amount"
 *                 (for contracts: obligated to date, cumulative). The base table's CHECK
 *                 keeps award_amount > 0.
 *   AWARD_FACTS   public.company_contract_award_facts: total_obligation (obligated to date),
 *                 base_and_all_options (ceiling), pop_start / pop_end.
 *   TRANSACTIONS  USAspending POST /api/v2/transactions/ results for an award: `id` (the
 *                 source transaction key), `action_date`, `federal_action_obligation` (the
 *                 signed obligation change of that action), `modification_number`,
 *                 `action_type_description`. Not stored in Ezana today.
 */

export const NOW = new Date('2026-11-28T15:00:00Z');
export const FY = {
  2026: { fy: 2026, from: '2025-10-01', to: '2026-09-30', label: 'federal FY2026' },
  2025: { fy: 2025, from: '2024-10-01', to: '2025-09-30', label: 'federal FY2025' },
};

const DOD = 'Department of Defense';
const DOE = 'Department of Energy';

const award = (id, ticker, start, amount, agency = DOD, funding = agency, extra = {}) => ({
  generated_award_id: id,
  ticker,
  recipient_name: extra.recipient || `${ticker} INC`,
  recipient_id: extra.recipient_id || null,
  award_amount: amount,
  awarding_agency: agency,
  funding_agency: funding,
  action_date: start,
  fiscal_year: null,
  award_type: 'Definitive Contract',
});

export const AWARDS = [
  /* Started in FY2025; obligations kept growing in FY2026. Cumulative 300e6. */
  award('AW-1', 'XALP', '2025-03-01', 300e6),
  award('AW-2', 'XALP', '2026-02-01', 80e6),
  /* Started in FY2026; no transaction records ingested for it. */
  award('AW-3', 'XBET', '2026-01-15', 60e6),
  /* Awarded by Energy, funded by Defense; performance runs to 2031. */
  award('AW-4', 'XGAM', '2025-11-01', 40e6, DOE, DOD),
  /* Starts in 2027: not part of any completed historical period. */
  award('AW-5', 'XGAM', '2027-03-01', 25e6),
  /* An agency spelling that matches no canonical toptier name. */
  award('AW-6', 'XDEL', '2026-03-01', 15e6, 'Department of Defence Logistics'),
  /* A subsidiary's award (no ticker on the row) and a look-alike name. */
  award('AW-7', null, '2026-06-01', 70e6, DOD, DOD, { recipient: 'XALP FEDERAL SERVICES LLC', recipient_id: 'UEI-XSUB' }),
  award('AW-8', null, '2026-05-01', 33e6, DOD, DOD, { recipient: 'XALP HOLDINGS GROUP PLC', recipient_id: 'UEI-XLOOK' }),
];

export const AWARD_FACTS = {
  'AW-1': { total_obligation: 300e6, base_exercised_options: 420e6, base_and_all_options: 900e6, pop_start: '2025-03-01', pop_end: '2029-02-28' },
  'AW-4': { total_obligation: 40e6, base_exercised_options: 40e6, base_and_all_options: 120e6, pop_start: '2025-11-01', pop_end: '2031-12-31' },
};

const tx = (id, awardId, date, delta, mod, type = 'Funding only action') => ({
  id,
  award_id: awardId,
  action_date: date,
  federal_action_obligation: delta,
  modification_number: mod,
  action_type_description: type,
});

export const TRANSACTIONS = [
  tx('CONT_TX_AW1_0', 'AW-1', '2025-03-01', 100e6, '0', 'New'),
  tx('CONT_TX_AW1_P01', 'AW-1', '2025-09-30', 50e6, 'P00001'), // last day of FY2025
  tx('CONT_TX_AW1_P02', 'AW-1', '2025-10-01', 120e6, 'P00002'), // first day of FY2026
  tx('CONT_TX_AW1_P02', 'AW-1', '2025-10-01', 120e6, 'P00002'), // the same action delivered twice
  tx('CONT_TX_AW1_P03', 'AW-1', '2026-06-01', 40e6, 'P00003'),
  tx('CONT_TX_AW1_P04', 'AW-1', '2026-08-15', -10e6, 'P00004', 'Funding only action'), // deobligation
  tx('CONT_TX_AW2_0', 'AW-2', '2026-02-01', 80e6, '0', 'New'),
  tx('CONT_TX_AW4_0', 'AW-4', '2025-11-01', 40e6, '0', 'New'),
  tx('CONT_TX_AW6_0', 'AW-6', '2026-03-01', 15e6, '0', 'New'),
  tx('CONT_TX_AW7_0', 'AW-7', '2026-06-01', 70e6, '0', 'New'),
];

/* Verified relationship (effective from 2024) and one that starts after the award. */
export const RELATIONSHIPS = [
  { parent: { cik: '9300001', name: 'Xalp Corp' }, child: { identifierType: 'uei', identifier: 'UEI-XSUB', name: 'XALP FEDERAL SERVICES LLC' }, type: 'subsidiary', effectiveFrom: '2024-01-01', effectiveTo: null, source: { kind: 'sec_ex21', reference: '0009300001-25-000004' }, status: 'verified', evidence: 'filed_exhibit' },
];
export const LATE_RELATIONSHIP = { ...RELATIONSHIPS[0], effectiveFrom: '2026-07-01' };

export const COMPANIES = {
  XALP: { ticker: 'XALP', cik: '9300001', name: 'Xalp Corp', revenue: 2.3e9, revenueFyEnd: '2025-12-31', currency: 'USD' },
  XBET: { ticker: 'XBET', cik: '9300002', name: 'Xbet Inc', revenue: -5e6, revenueFyEnd: '2025-12-31', currency: 'USD' },
  XGAM: { ticker: 'XGAM', cik: '9300003', name: 'Xgam Inc', revenue: null, revenueFyEnd: null, currency: 'USD' },
  XDEL: { ticker: 'XDEL', cik: '9300004', name: 'Xdel Inc', revenue: 0.5e9, revenueFyEnd: '2025-12-31', currency: 'USD' },
};

/* Filed revenue rows with conflicting concepts between years (M). */
export const REVENUE_CONFLICT = [
  { end: '2025-12-31', value: 1.2e9, concept: 'RevenueFromContractWithCustomerExcludingAssessedTax' },
  { end: '2024-12-31', value: 1.0e9, concept: 'SalesRevenueNet' },
];

/* Price rows (O): a dividend-sized adjustment and a split-sized one. */
export const PRICES = [
  { ticker: 'XALP', date: '2026-11-27', close: 100, adj_close: 99.2, volume: 1e6 },
  { ticker: 'XBET', date: '2026-11-27', close: 50, adj_close: 25, volume: 1e6 },
  { ticker: 'XGAM', date: '2026-11-27', close: 40, adj_close: 40, volume: 1e6 },
  { ticker: 'XDEL', date: '2026-12-01', close: 10, adj_close: 10, volume: 1e6 }, // after as-of
];

export const EXPECTED = {
  /* Transaction-period (flow) obligations, net, by federal fiscal year of the action date. */
  flow: { 2026: { XALP: 230e6, XGAM: 40e6, XDEL: 15e6 }, 2025: { XALP: 150e6 } },
  flowGrossPositive2026: { XALP: 240e6 },
  /* Award-start cohort (cumulative obligated to date on awards started in the year). */
  cohort: { 2026: { XALP: 80e6, XBET: 60e6, XGAM: 40e6, XDEL: 15e6 }, 2025: { XALP: 300e6 } },
  flowGrowth: { XALP: { change: 80e6, pct: 53.333333 } },
  /* Ratios over XALP revenue 2.3e9 (FY ending 2025-12-31). */
  ratio: { flow: 0.1, cohort: 0.034783 },
  boundary: { 'CONT_TX_AW1_P01': 2025, 'CONT_TX_AW1_P02': 2026 },
  futureStartExcluded: ['AW-5'],
  unresolvedAgency: ['XDEL'],
};
