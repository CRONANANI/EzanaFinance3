/**
 * Ezana API catalog: Alpha Intelligence. Pure, client-safe (read by the docs
 * page). See registry.js for the route shape and alpha/signals.js for the
 * signal registry these routes publish.
 *
 * Only signals implemented on real data and past their readiness gates get a
 * route. Every other designed signal is listed by GET /v1/alpha/signals with
 * the gate that blocks it, measured live.
 */

const SECTORS = [
  'Communication Services',
  'Consumer Discretionary',
  'Consumer Staples',
  'Energy',
  'Financials',
  'Funds & ETFs',
  'Health Care',
  'Industrials',
  'Information Technology',
  'Materials',
  'Real Estate',
  'Utilities',
];

export const PARAMS = {
  fiscal_year: {
    type: 'int',
    min: 2017,
    max: 2100,
    desc: 'Federal fiscal year (October to September). Default: the latest complete one.',
  },
  sector: { type: 'string', enum: SECTORS, desc: "Filter to one of Ezana's sectors." },
  min_baseline_usd: {
    type: 'number',
    desc: "Minimum median of the company's prior-year obligations, in USD (default 1,000,000).",
  },
  min_history: {
    type: 'int',
    min: 3,
    max: 8,
    desc: 'Minimum prior complete fiscal years in the baseline, 3 to 8 (default 5).',
  },
};

export const ROUTES = {};

const SIGNAL_FIELDS = {
  id: 'string',
  version: 'string',
  name: 'string',
  maturity: 'string',
  status: 'string',
  route: 'string',
  hypothesis: 'string',
  measures: 'string',
  does_not_measure: 'string',
  dependencies: 'array',
  model_family: 'string',
  target: 'string',
  gates: 'array',
  limitations: 'array',
};

export const GROUPS = [
  {
    key: 'alpha',
    title: 'Alpha Intelligence',
    base: '/v1/alpha',
    icon: 'bi-activity',
    dimension: 'alpha',
    framing:
      'Statistical signals across capital, corporate, government and economic data. Every signal states its maturity (descriptive, statistical or predictive), its method, its sample and its limits, and is published only once the data behind it passes its readiness gates.',
    source: 'Ezana calculations over the sources each signal names',
    routes: [
      {
        id: 'alpha.signals',
        path: '/v1/alpha/signals',
        scope: 'alpha',
        status: 'live',
        kind: 'insight',
        delayed: false,
        list: true,
        params: [],
        fields: SIGNAL_FIELDS,
        method:
          "Every designed signal with its version, hypothesis, maturity and readiness gates; each gate's observed figure is measured from the database at request time (13F parse coverage, Form 4 history, complete contract years, lobbying years, patent rows, prediction-market history).",
        summary:
          'The Alpha signal registry: what each signal measures and does not, its data dependencies, and whether it is live or which data gate blocks it, with the figure observed.',
      },
      {
        id: 'alpha.signal',
        path: '/v1/alpha/signals/{signal_id}',
        scope: 'alpha',
        status: 'live',
        kind: 'insight',
        delayed: false,
        params: [],
        fields: SIGNAL_FIELDS,
        method: 'One entry of the signal registry, with its gates measured at request time.',
        summary:
          'One Alpha signal: definition, maturity, dependencies, limitations and readiness gates.',
      },
      {
        id: 'alpha.procurement_acceleration',
        path: '/v1/alpha/procurement-acceleration',
        scope: 'alpha',
        status: 'live',
        kind: 'insight',
        delayed: true,
        list: true,
        params: [
          'fiscal_year',
          'direction',
          'sort',
          'ticker',
          'sector',
          'min_baseline_usd',
          'min_history',
          'limit',
        ],
        paramEnums: { direction: ['up', 'down'] },
        sortValues: ['robust_z', 'growth', 'excess_growth', 'amount_change'],
        fields: {
          signal_id: 'string',
          signal_version: 'string',
          entity: 'object',
          signal_type: 'string',
          status: 'string',
          as_of: 'date',
          available_at: 'date',
          method: 'string',
          value: 'number',
          unit: 'string',
          baseline_value: 'number',
          percentile: 'number',
          sample_size: 'integer',
          metrics: 'object',
          coverage: 'object',
          statistical_validation: 'object',
          limitations: 'array',
        },
        method:
          "For one complete federal fiscal year, each listed company's net contract obligations against its own prior complete years (up to 8): robust z = (year - median) / (1.4826 x MAD); own-history percentile; arc growth against the prior year and against the sector median (5+ peers); agency concentration (HHI) and the agencies that drove the change. A year counts as complete 90 days after 30 September and once its dataset total reaches 80% of the median of the three prior years. Descriptive: not tested against returns or revenue.",
        summary:
          'Companies whose federal contract obligations in a complete fiscal year are unusual against their own history (direction up or down), with growth against sector peers and the agencies behind the change. value is a robust z, not a probability. Default fiscal_year is the latest complete one, direction up, sort robust_z, limit 50.',
      },
    ],
  },
];
