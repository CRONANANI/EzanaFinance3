/**
 * Alpha Intelligence signal registry: every signal Ezana has designed, with
 * its version, hypothesis, data dependencies, maturity and the data-readiness
 * gates it must pass. Pure and client-safe (the /ezana-api docs page and
 * GET /v1/alpha/signals both read it).
 *
 * A signal is published as a route only when it is implemented on real data
 * and its gates pass. Every other signal is listed with the gate that blocks
 * it and the figure observed, measured live from the database (see
 * handlers/alpha.js readCoverage), so the catalog cannot drift from the data.
 *
 * Maturity (never promoted by marketing):
 *   descriptive   a validated calculation about the data as it stands
 *   statistical   a relationship tested with stated uncertainty
 *   predictive    skill shown out of sample against a baseline
 */

export const MATURITY = ['descriptive', 'statistical', 'predictive'];

/** Readiness classes a signal can be in, in the order they are reported. */
export const READINESS = {
  live: 'Implemented on real data and served by a /v1/alpha route.',
  ready_descriptive: 'Data passes the gates for a descriptive calculation; not yet implemented.',
  blocked_history: 'Not enough history to compute or validate it honestly.',
  blocked_ingestion: 'The source is indexed but not yet parsed or loaded in full.',
  blocked_mapping: 'No verified mapping between the entities it would join.',
  blocked_point_in_time:
    'The source does not record when each value became public, so history would leak.',
  blocked_licensing: 'The inputs it needs cannot be redistributed under their licence.',
  covered_by_existing: 'An existing endpoint already answers it; extend that one instead.',
};

/* Gate helpers: each returns { gate, required, observed, pass, blocks }. */
const gate = (name, required, observed, pass, blocks) => ({
  gate: name,
  required,
  observed: observed ?? null,
  pass: Boolean(pass),
  blocks,
});

const thirteenFCoverage = (c) => {
  const i = c?.institutional || {};
  const share =
    i.parsed_filers != null && i.indexed_filings ? i.parsed_filers / i.indexed_filings : null;
  return [
    gate(
      '13F holdings parsed for the latest complete quarter',
      'at least 80% of indexed 13F-HR filings',
      share == null
        ? null
        : `${Math.round(share * 1000) / 10}% (${i.parsed_filers} of ${i.indexed_filings}) for ${i.period}`,
      share != null && share >= 0.8,
      'blocked_ingestion',
    ),
    gate(
      'Filers with holdings in both the latest and prior quarter',
      'at least 500',
      i.comparable_filers,
      (i.comparable_filers ?? 0) >= 500,
      'blocked_ingestion',
    ),
  ];
};

const insiderHistory = (c, days) =>
  gate(
    'Form 4 history',
    `at least ${days} days of filings`,
    c?.insider?.span_days == null
      ? null
      : `${c.insider.span_days} days (${c.insider.first_filed} to ${c.insider.last_filed})`,
    (c?.insider?.span_days ?? 0) >= days,
    'blocked_history',
  );

export const SIGNALS = [
  {
    id: 'procurement_acceleration',
    version: '1.0.0',
    name: 'Procurement acceleration',
    maturity: 'descriptive',
    route: '/v1/alpha/procurement-acceleration',
    route_id: 'alpha.procurement_acceleration',
    hypothesis:
      "A listed company's federal contract obligations in a fiscal year that sit far outside its own history mark a change in its government business worth investigating.",
    measures:
      "How unusual a company's net federal obligations in one complete fiscal year are against its own prior years (robust z, own-history percentile), its year-over-year arc growth against its sector, and how concentrated the year was across agencies.",
    does_not_measure:
      'Revenue, margin, backlog or the stock price. Obligations are funding commitments, not recognised revenue, and a contract can be de-obligated later.',
    dependencies: [
      'USAspending (company x fiscal year x agency obligations)',
      'Ezana ticker sectors',
    ],
    model_family: 'Robust univariate baseline (median, MAD) and cross-sectional percentiles',
    target: null,
    gates: (c) => [
      gate(
        'Complete fiscal years of company contract history',
        'at least 6 (5 baseline years and 1 evaluated year)',
        c?.contracts?.complete_fiscal_years?.length ?? null,
        (c?.contracts?.complete_fiscal_years?.length ?? 0) >= 6,
        'blocked_history',
      ),
    ],
    limitations: [
      'Annual totals are as of the latest sync. USAspending revises obligations, and Ezana does not keep earlier vintages, so a past year can read differently today than it did at the time.',
      'A fiscal year is evaluated only once its reporting window has closed (90 days after 30 September, when DoD data is released) and its dataset total reaches 80% of the median of the three prior years.',
      'Ticker mapping comes from recipient and parent names resolved to listed companies; subsidiaries that are not mapped are missing.',
      'Corporate actions (spin-offs, mergers, acquisitions) move obligations between tickers and show up as level shifts. When prior_year_robust_z is also large, the shift happened in an earlier year and persisted.',
      'Descriptive only: no forward-return or revenue relationship has been tested.',
    ],
  },
  {
    id: 'institutional_divergence',
    version: '0.1.0',
    name: 'Institutional capital divergence',
    maturity: 'descriptive',
    route: null,
    hypothesis:
      "Quarter-over-quarter 13F holder breadth and share changes in a stock that diverge from its sector's change identify unusual institutional repositioning.",
    measures:
      'Holders added versus exited, net reported share change and ownership concentration change, each against the sector distribution for the same quarter, among filers with both quarters on file.',
    does_not_measure:
      'Real-time accumulation. 13F reports quarter-end holdings up to 45 days late.',
    dependencies: ['SEC 13F-HR holdings', 'Ezana ticker sectors'],
    model_family: 'Cross-sectional robust z within sector',
    target: null,
    gates: (c) => thirteenFCoverage(c),
    limitations: [
      'Change is only meaningful among filers parsed in both quarters; a partially parsed quarter turns missing filers into false exits.',
    ],
  },
  {
    id: 'ownership_confirmation',
    version: '0.1.0',
    name: 'Insider and institutional confirmation',
    maturity: 'descriptive',
    route: null,
    hypothesis:
      'Open-market insider buying or selling that agrees with the direction of 13F holder changes in the same quarter is a stronger ownership signal than either alone.',
    measures:
      'Net open-market Form 4 value (codes P and S only, never awards, exercises or tax withholding) against 13F holder change for the same quarter, and whether they agree.',
    does_not_measure:
      'Future performance. Alignment frequency is reported only once it can be measured.',
    dependencies: ['SEC Form 4', 'SEC 13F-HR holdings'],
    model_family: 'Contingency classification',
    target: null,
    gates: (c) => [...thirteenFCoverage(c), insiderHistory(c, 92)],
    limitations: ['Form 4 must cover the whole quarter the 13F reports.'],
  },
  {
    id: 'insider_behavior_anomaly',
    version: '0.1.0',
    name: 'Insider behaviour anomaly',
    maturity: 'descriptive',
    route: null,
    hypothesis:
      "Open-market insider activity far outside an issuer's own history (size, direction, role mix) is more informative than routine activity.",
    measures: "Robust z of an issuer's open-market insider value against its own trailing history.",
    does_not_measure: 'Compensation-related activity, which is excluded by transaction code.',
    dependencies: ['SEC Form 4'],
    model_family: 'Robust univariate baseline per issuer',
    target: null,
    gates: (c) => [insiderHistory(c, 730)],
    limitations: ['Needs at least two years of an issuer\'s own filings to define "normal".'],
  },
  {
    id: 'lobbying_procurement_leadlag',
    version: '0.1.0',
    name: 'Lobbying to procurement lead-lag',
    maturity: 'statistical',
    route: null,
    hypothesis:
      "Changes in a company's lobbying spend are associated with changes in its federal obligations one to two fiscal years later.",
    measures:
      'Lagged panel regression of contract arc growth on prior lobbying change with company and year fixed effects, clustered errors, and alternative lags.',
    does_not_measure: 'Causation. An association does not show lobbying caused an award.',
    dependencies: [
      'Senate LDA filings',
      'Verified lobbying client to ticker mappings',
      'USAspending',
    ],
    model_family: 'Fixed-effects panel regression',
    target: 'Next fiscal year contract arc growth',
    gates: (c) => [
      gate(
        'Complete calendar years of lobbying filings',
        'at least 5 (to estimate a lag with year effects)',
        c?.lobbying?.complete_years ?? null,
        (c?.lobbying?.complete_years ?? 0) >= 5,
        'blocked_history',
      ),
    ],
    limitations: ['Lobbying history in Ezana starts in 2024.'],
  },
  {
    id: 'innovation_capital_divergence',
    version: '0.1.0',
    name: 'Innovation and capital divergence',
    maturity: 'descriptive',
    route: null,
    hypothesis:
      'Patent momentum that diverges from institutional ownership change, controlling for industry and size, flags under- or over-recognised innovation.',
    measures: 'Patent grant momentum against 13F holder change within industry.',
    does_not_measure: 'Commercial value of patents; a count is not a value.',
    dependencies: ['USPTO grants mapped to issuers', 'SEC 13F-HR holdings'],
    model_family: 'Cross-sectional residual within industry',
    target: null,
    gates: (c) => [
      gate(
        'Patent grants loaded',
        'more than 0 rows',
        c?.patents?.rows ?? null,
        (c?.patents?.rows ?? 0) > 0,
        'blocked_ingestion',
      ),
      ...thirteenFCoverage(c),
    ],
    limitations: [],
  },
  {
    id: 'capital_crowding',
    version: '0.1.0',
    name: 'Capital crowding',
    maturity: 'descriptive',
    route: null,
    hypothesis:
      'Stocks whose institutional ownership is concentrated in overlapping holders carry more liquidation risk.',
    measures:
      'Holder concentration, common-holder overlap and their change, as historical percentiles.',
    does_not_measure:
      'Future volatility or drawdown, which would need price history Ezana cannot redistribute.',
    dependencies: ['SEC 13F-HR holdings'],
    model_family: 'Concentration indices and network overlap',
    target: null,
    gates: (c) => thirteenFCoverage(c),
    limitations: [
      'Testing against volatility or drawdown needs licensed prices (internal research only).',
    ],
  },
  {
    id: 'sector_rotation_pressure',
    version: '0.1.0',
    name: 'Sector rotation pressure',
    maturity: 'descriptive',
    route: null,
    hypothesis:
      'Breadth of institutional and insider repositioning by sector shows where capital is rotating.',
    measures:
      'Participation breadth, net filing-based ownership change and new versus exited positions by sector.',
    does_not_measure: 'Real-time sector flows; filings are quarterly.',
    dependencies: ['SEC 13F-HR holdings', 'SEC Form 4', 'Ezana ticker sectors'],
    model_family: 'Sector aggregates with robust z',
    target: null,
    gates: (c) => thirteenFCoverage(c),
    limitations: [],
  },
  {
    id: 'macro_regime_shift',
    version: '0.1.0',
    name: 'Macro regime shift',
    maturity: 'statistical',
    route: null,
    hypothesis:
      'Joint changes in growth, inflation and policy-rate series mark regime transitions.',
    measures: 'Change points and regime-switching states on observed (not projected) series.',
    does_not_measure: 'Forecasts; projections are excluded.',
    dependencies: ['OECD, World Bank, BIS series'],
    model_family: 'Change-point detection, Markov regime switching',
    target: null,
    gates: () => [
      gate(
        'Release dates and vintages stored for macro observations',
        'each value carries the date it was first published',
        'only the fetch time is stored',
        false,
        'blocked_point_in_time',
      ),
    ],
    limitations: [
      'Without release timing a historical regime would use revised data that was not public then.',
    ],
  },
  {
    id: 'geopolitical_exposure',
    version: '0.1.0',
    name: 'Geopolitical exposure',
    maturity: 'descriptive',
    route: null,
    hypothesis:
      'Verified company links to sanctioned parties or high-risk geographies change risk.',
    measures: 'Sanctions and export-control evidence tied to a company by a verified mapping.',
    does_not_measure: 'Exposure inferred only from operating in a country.',
    dependencies: ['Sanctions lists', 'Company geography or counterparty mappings'],
    model_family: 'Evidence aggregation',
    target: null,
    gates: () => [
      gate(
        'Verified company to country or counterparty mapping',
        'a reviewed mapping table',
        'none',
        false,
        'blocked_mapping',
      ),
    ],
    limitations: [],
  },
  {
    id: 'event_probability_divergence',
    version: '0.1.0',
    name: 'Event probability divergence',
    maturity: 'descriptive',
    route: null,
    covered_by: '/v1/predictions consensus and movers routes',
    hypothesis:
      'Disagreement between venues on the same event, and how fast it moves, carries information.',
    measures: 'Cross-venue probability gaps and change rates; calibration once outcomes accrue.',
    does_not_measure: 'Any link to a stock without a verified market-to-ticker mapping.',
    dependencies: ['Polymarket and Kalshi snapshots'],
    model_family: 'Cross-venue spread, calibration curves',
    target: 'Resolved event outcome (for calibration)',
    gates: (c) => [
      gate(
        'Prediction-market snapshot history for calibration',
        'at least 365 days',
        c?.predictions?.span_days ?? null,
        (c?.predictions?.span_days ?? 0) >= 365,
        'blocked_history',
      ),
    ],
    limitations: [
      'Cross-venue disagreement is already served by the predictions consensus routes.',
    ],
  },
];

/**
 * A signal's readiness against measured coverage: its gates (each with the
 * figure observed) and one status. A routed signal is live; otherwise the
 * first failing gate names the block, and a signal whose gates all pass is
 * ready for a descriptive build.
 */
export function evaluateReadiness(signal, coverage) {
  const gates = signal.gates(coverage);
  const failing = gates.filter((g) => !g.pass);
  let status;
  if (signal.route) status = 'live';
  else if (signal.covered_by) status = 'covered_by_existing';
  else if (failing.length) status = failing[0].blocks;
  else status = 'ready_descriptive';
  return { status, gates };
}

/** The public view of one signal (no functions). */
export function signalView(signal, coverage) {
  const { gates: _g, route_id: _r, ...rest } = signal;
  const readiness = evaluateReadiness(signal, coverage);
  return { ...rest, status: readiness.status, gates: readiness.gates };
}
