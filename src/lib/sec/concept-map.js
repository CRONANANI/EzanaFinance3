/**
 * Ezana metric -> SEC XBRL concept mapping. Versioned (Sonar 6.4 final hardening, Nov 28 2026).
 *
 * For each metric, the ordered us-gaap (or dei) concepts; the first concept a company reports
 * for a period wins (lib/sec/xbrl.js pickFirstConcept), and sec_fundamentals keeps the concept
 * that won in `taxonomy_concept`, so every stored value is traceable to its filing tag.
 * `instant` metrics are balance-sheet values at period end. Nothing is derived here.
 *
 * Rules for changing this file:
 *   - a concept is added only when it measures the same thing as the metric (verified against
 *     filings), never to fill a gap with something related
 *   - new concepts go AFTER the existing ones, so companies already mapped keep their values
 *   - bump CONCEPT_MAP_VERSION and add a line to the history below
 *
 * History
 *   v1  (to Nov 28 2026) revenue: Revenues, RevenueFromContractWithCustomerExcludingAssessedTax,
 *       SalesRevenueNet. long_term_debt: LongTermDebtNoncurrent, then LongTermDebt (a mix of
 *       noncurrent and total semantics under one key).
 *   v2  (Nov 28 2026)
 *       revenue + RevenueFromContractWithCustomerIncludingAssessedTax (gross of excise and sales
 *       taxes the company collects; refiners, oilfield services, fuel distributors: Valero,
 *       Halliburton, RPC, TETRA, CrossAmerica, Ramaco, Littelfuse report total revenue only
 *       under it) and RegulatedAndUnregulatedOperatingRevenue (utilities: MGE Energy). Not
 *       added: bank revenue concepts (RevenuesNetOfInterestExpense, interest income), which
 *       are a different measure; dimensional or extension-only revenue (APA) stays missing.
 *       Debt components as separate metrics (debt_noncurrent, debt_long_term_total,
 *       debt_current_portion, debt_current, short_term_borrowings, commercial_paper,
 *       debt_and_leases_noncurrent, line_of_credit) so total debt is reconstructed without
 *       double counting (lib/sonar/composer/calc.js totalDebt). long_term_debt is kept
 *       unchanged for existing readers.
 */
export const CONCEPT_MAP_VERSION = 'concept-map-v2';

export const METRICS = [
  {
    key: 'revenue',
    unit: 'USD',
    instant: false,
    concepts: [
      'us-gaap:Revenues',
      'us-gaap:RevenueFromContractWithCustomerExcludingAssessedTax',
      'us-gaap:SalesRevenueNet',
      /* v2 */
      'us-gaap:RevenueFromContractWithCustomerIncludingAssessedTax',
      'us-gaap:RegulatedAndUnregulatedOperatingRevenue',
    ],
  },
  { key: 'gross_profit', unit: 'USD', instant: false, concepts: ['us-gaap:GrossProfit'] },
  {
    key: 'operating_income',
    unit: 'USD',
    instant: false,
    concepts: ['us-gaap:OperatingIncomeLoss'],
  },
  { key: 'net_income', unit: 'USD', instant: false, concepts: ['us-gaap:NetIncomeLoss'] },
  {
    key: 'eps_diluted',
    unit: 'USD/shares',
    instant: false,
    concepts: ['us-gaap:EarningsPerShareDiluted'],
  },
  {
    key: 'operating_cash_flow',
    unit: 'USD',
    instant: false,
    concepts: ['us-gaap:NetCashProvidedByUsedInOperatingActivities'],
  },
  /* Companies tag capital spending differently (NVIDIA and Amazon use productive assets). */
  {
    key: 'capex',
    unit: 'USD',
    instant: false,
    concepts: [
      'us-gaap:PaymentsToAcquirePropertyPlantAndEquipment',
      'us-gaap:PaymentsToAcquireProductiveAssets',
      'us-gaap:PaymentsForProceedsFromProductiveAssets',
    ],
  },
  {
    key: 'rd_expense',
    unit: 'USD',
    instant: false,
    concepts: ['us-gaap:ResearchAndDevelopmentExpense'],
  },
  {
    key: 'sbc',
    unit: 'USD',
    instant: false,
    concepts: ['us-gaap:ShareBasedCompensation', 'us-gaap:AllocatedShareBasedCompensationExpense'],
  },
  {
    key: 'depreciation',
    unit: 'USD',
    instant: false,
    concepts: [
      'us-gaap:DepreciationDepletionAndAmortization',
      'us-gaap:DepreciationAmortizationAndAccretionNet',
      'us-gaap:DepreciationAndAmortization',
    ],
  },
  {
    key: 'rpo',
    unit: 'USD',
    instant: true,
    concepts: ['us-gaap:RevenueRemainingPerformanceObligation'],
  },
  { key: 'inventory', unit: 'USD', instant: true, concepts: ['us-gaap:InventoryNet'] },
  {
    key: 'receivables',
    unit: 'USD',
    instant: true,
    concepts: ['us-gaap:AccountsReceivableNetCurrent'],
  },
  {
    key: 'purchase_obligations',
    unit: 'USD',
    instant: true,
    concepts: [
      'us-gaap:PurchaseObligation',
      'us-gaap:UnrecordedUnconditionalPurchaseObligationBalanceSheetAmount',
    ],
  },
  { key: 'assets', unit: 'USD', instant: true, concepts: ['us-gaap:Assets'] },
  { key: 'liabilities', unit: 'USD', instant: true, concepts: ['us-gaap:Liabilities'] },
  { key: 'equity', unit: 'USD', instant: true, concepts: ['us-gaap:StockholdersEquity'] },
  {
    key: 'cash',
    unit: 'USD',
    instant: true,
    concepts: ['us-gaap:CashAndCashEquivalentsAtCarryingValue'],
  },
  /* v1 key, unchanged (mixed noncurrent/total semantics): kept for existing readers only. */
  {
    key: 'long_term_debt',
    unit: 'USD',
    instant: true,
    concepts: ['us-gaap:LongTermDebtNoncurrent', 'us-gaap:LongTermDebt'],
  },
  /* v2 debt components: one concept each, so their meaning never mixes. */
  {
    key: 'debt_noncurrent',
    unit: 'USD',
    instant: true,
    concepts: ['us-gaap:LongTermDebtNoncurrent'],
  },
  { key: 'debt_long_term_total', unit: 'USD', instant: true, concepts: ['us-gaap:LongTermDebt'] },
  {
    key: 'debt_current_portion',
    unit: 'USD',
    instant: true,
    concepts: ['us-gaap:LongTermDebtCurrent'],
  },
  { key: 'debt_current', unit: 'USD', instant: true, concepts: ['us-gaap:DebtCurrent'] },
  {
    key: 'short_term_borrowings',
    unit: 'USD',
    instant: true,
    concepts: ['us-gaap:ShortTermBorrowings'],
  },
  { key: 'commercial_paper', unit: 'USD', instant: true, concepts: ['us-gaap:CommercialPaper'] },
  {
    key: 'debt_and_leases_noncurrent',
    unit: 'USD',
    instant: true,
    concepts: ['us-gaap:LongTermDebtAndCapitalLeaseObligations'],
  },
  {
    key: 'line_of_credit',
    unit: 'USD',
    instant: true,
    concepts: ['us-gaap:LineOfCredit', 'us-gaap:LongTermLineOfCredit'],
  },
  {
    key: 'shares_outstanding',
    unit: 'shares',
    instant: true,
    concepts: ['dei:EntityCommonStockSharesOutstanding'],
  },
];

/** The instant metrics total debt is reconstructed from (calc.js totalDebt). */
export const DEBT_COMPONENTS = [
  'debt_noncurrent',
  'debt_long_term_total',
  'debt_current_portion',
  'debt_current',
  'short_term_borrowings',
  'commercial_paper',
  'debt_and_leases_noncurrent',
  'line_of_credit',
];
