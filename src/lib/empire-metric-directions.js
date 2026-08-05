/**
 * Human labels, units, and direction metadata for the World Bank metrics that
 * feed the empire power dimensions. Used by the public matrix (dimension mode) so
 * raw metric columns read as English with units and heat in the right direction.
 *
 * Direction resolution (see `metricDirection`): an explicit override here wins;
 * otherwise the dimension_metric_map's `invert` flag decides (higherIsBetter =
 * !invert); otherwise the metric inherits its dimension's `higher_is_better`.
 * Overrides exist only where inheritance/inversion would be wrong on its own.
 */

/* metric_id → human label. */
export const METRIC_LABELS = {
  gdp_current_usd: 'GDP (current US$)',
  gdp_ppp_current: 'GDP (PPP)',
  gdp_per_capita_ppp: 'GDP per capita (PPP)',
  gdp_growth_annual: 'GDP growth',
  central_gov_debt_pct_gdp: 'Central govt debt',
  external_debt_stocks_pct_gni: 'External debt',
  exports_pct_gdp: 'Exports',
  merchandise_exports_usd: 'Merchandise exports',
  school_enrollment_tertiary: 'Tertiary enrollment',
  adult_literacy_rate: 'Adult literacy',
  expenditure_on_education_pct_gdp: 'Education spend',
  rd_expenditure_pct_gdp: 'R&D spend',
  researchers_per_million: 'Researchers',
  high_tech_exports_pct: 'High-tech exports',
  access_to_electricity: 'Electricity access',
  internet_users_pct: 'Internet users',
  military_expenditure_pct_gdp: 'Military spend',
  armed_forces_personnel: 'Armed forces',
  gini_index: 'Gini index',
  labor_force_participation: 'Labour participation',
  inflation_cpi: 'Inflation (CPI)',
  energy_use_per_gdp: 'Energy per GDP',
};

/* metric_id → unit code (mirrors world-bank.js METRIC_REGISTRY units — not
 * imported because METRIC_REGISTRY is private to the sync source). */
const METRIC_UNITS = {
  gdp_current_usd: 'USD',
  gdp_ppp_current: 'USD',
  gdp_per_capita_ppp: 'USD',
  gdp_growth_annual: 'percent',
  central_gov_debt_pct_gdp: 'percent',
  external_debt_stocks_pct_gni: 'percent',
  exports_pct_gdp: 'percent',
  merchandise_exports_usd: 'USD',
  school_enrollment_tertiary: 'percent',
  adult_literacy_rate: 'percent',
  expenditure_on_education_pct_gdp: 'percent',
  rd_expenditure_pct_gdp: 'percent',
  researchers_per_million: 'per_million',
  high_tech_exports_pct: 'percent',
  access_to_electricity: 'percent',
  internet_users_pct: 'percent',
  military_expenditure_pct_gdp: 'percent',
  armed_forces_personnel: 'count',
  gini_index: 'index',
  labor_force_participation: 'percent',
  inflation_cpi: 'percent',
  energy_use_per_gdp: 'kg_oil_per_gdp',
};

/* Unit code → short display suffix. */
const UNIT_LABELS = {
  USD: 'US$',
  percent: '%',
  per_million: '/M',
  count: '',
  index: '',
  kg_oil_per_gdp: 'kg oil/GDP',
};

/**
 * Explicit higher-is-better overrides. Only metrics where the raw direction is
 * unambiguously "lower is stronger" regardless of which dimension consumes them.
 */
export const METRIC_DIRECTION_OVERRIDES = {
  central_gov_debt_pct_gdp: false, // more debt is worse
  external_debt_stocks_pct_gni: false, // more external debt is worse
  gini_index: false, // higher inequality is worse
  inflation_cpi: false, // higher inflation is worse
  energy_use_per_gdp: false, // more energy per unit of GDP = less efficient
};

/* dimension_id → short header label for the 'all' score matrix. */
export const DIMENSION_SHORT = {
  debt_burden: 'Debt',
  expected_growth: 'Growth',
  internal_conflict: 'Conflict',
  education: 'Educ.',
  innovation_technology: 'Innov.',
  cost_competition: 'Cost',
  military_strength: 'Military',
  trade: 'Trade',
  economic_output: 'Output',
  markets_financial_center: 'Markets',
  reserve_currency: 'Reserve',
  geology: 'Geology',
  resource_efficiency: 'Resource',
  infrastructure: 'Infra.',
  character_social_contracts: 'Civility',
  rule_of_law: 'Rule/Law',
  wealth_gaps: 'Wealth',
  acts_of_nature: 'Nature',
};

export function metricLabel(metricId) {
  return METRIC_LABELS[metricId] || metricId;
}

export function metricUnitLabel(metricId) {
  return UNIT_LABELS[METRIC_UNITS[metricId]] ?? '';
}

export function dimensionShort(dimId, fallbackName) {
  return DIMENSION_SHORT[dimId] || fallbackName || dimId;
}

/**
 * Resolve higher-is-better for a metric. `mapInvert` is dimension_metric_map's
 * per-metric invert flag (true → higher raw is worse); `dimHib` is the parent
 * dimension's higher_is_better (fallback).
 */
export function metricDirection(metricId, mapInvert, dimHib) {
  if (Object.prototype.hasOwnProperty.call(METRIC_DIRECTION_OVERRIDES, metricId)) {
    return METRIC_DIRECTION_OVERRIDES[metricId];
  }
  if (mapInvert != null) return !mapInvert;
  return dimHib !== false;
}
