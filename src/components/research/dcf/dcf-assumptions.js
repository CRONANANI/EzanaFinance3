/**
 * Config for the 13 editable DCF assumptions on the interactive panel.
 * `unit`: 'pct' = decimal stored (0.10), 'num' = raw, 'years' = integer years.
 */

export const DCF_ASSUMPTIONS = [
  {
    id: 'revenueGrowthPct',
    label: 'Revenue Growth',
    unit: 'pct',
    min: 0,
    max: 0.2,
    step: 0.005,
    default: 0.1,
    section: 'Revenue Growth Assumptions',
    info: {
      title: 'Revenue Growth Rate',
      variable: 'revenueGrowthPct',
      meaning: 'Expected annual revenue growth during the forecast period.',
      typicalRange: '0% – 20%',
      example: '10% growth for next 10 years',
      formula: null,
    },
  },
  {
    id: 'ebitPct',
    label: 'EBIT Margin',
    unit: 'pct',
    min: 0.05,
    max: 0.4,
    step: 0.005,
    default: 0.28,
    section: 'Profitability Assumptions',
    info: {
      title: 'EBIT Margin',
      variable: 'ebitPct',
      meaning: 'Operating profit margin.',
      typicalRange: '5% – 40%',
      example: null,
      formula: 'EBIT = Revenue × EBIT Margin',
    },
  },
  {
    id: 'taxRate',
    label: 'Tax Rate',
    unit: 'pct',
    min: 0.1,
    max: 0.35,
    step: 0.005,
    default: 0.15,
    section: 'Profitability Assumptions',
    info: {
      title: 'Tax Rate',
      variable: 'taxRate',
      meaning: 'Corporate tax applied to operating income.',
      typicalRange: '10% – 35%',
      example: null,
      formula: null,
    },
  },
  {
    id: 'capitalExpenditurePct',
    label: 'CapEx %',
    unit: 'pct',
    min: 0.02,
    max: 0.15,
    step: 0.005,
    default: 0.03,
    section: 'Reinvestment Assumptions',
    info: {
      title: 'Capital Expenditure %',
      variable: 'capitalExpenditurePct',
      meaning: 'Percentage of revenue reinvested into long-term assets.',
      typicalRange: '2% – 15%',
      example: null,
      formula: null,
    },
  },
  {
    id: 'depreciationAndAmortizationPct',
    label: 'D&A %',
    unit: 'pct',
    min: 0.01,
    max: 0.08,
    step: 0.0025,
    default: 0.035,
    section: 'Reinvestment Assumptions',
    info: {
      title: 'Depreciation & Amortization %',
      variable: 'depreciationAndAmortizationPct',
      meaning: 'Non-cash expense added back to cash flow.',
      typicalRange: '1% – 8%',
      example: null,
      formula: null,
    },
  },
  {
    id: 'workingCapitalPct',
    label: 'Working Capital %',
    unit: 'pct',
    min: -0.05,
    max: 0.1,
    step: 0.005,
    default: 0.02,
    section: 'Reinvestment Assumptions',
    info: {
      title: 'Working Capital %',
      variable: 'workingCapitalPct',
      meaning:
        'Net short-term capital tied up in operations. Combines receivables and inventories minus payables.',
      typicalRange: '-5% – 10%',
      example: null,
      formula: 'Working Capital = Receivables + Inventory − Payables',
    },
  },
  {
    id: 'longTermGrowthRate',
    label: 'Terminal Growth',
    unit: 'pct',
    min: 0.01,
    max: 0.04,
    step: 0.0025,
    default: 0.03,
    section: 'Terminal Value Assumptions',
    info: {
      title: 'Terminal Growth Rate',
      variable: 'longTermGrowthRate',
      meaning:
        'Perpetual growth rate after the forecast period. Should never exceed long-term GDP growth.',
      typicalRange: '1% – 4%',
      example: null,
      formula: 'Terminal Value = FCF_final × (1 + g) / (WACC − g)',
    },
  },
  {
    id: 'costOfEquity',
    label: 'Cost of Equity',
    unit: 'pct',
    min: 0.06,
    max: 0.15,
    step: 0.0025,
    default: 0.0951,
    section: 'Discount Rate Assumptions',
    info: {
      title: 'Cost of Equity',
      variable: 'costOfEquity',
      meaning:
        'Required return demanded by equity investors. Often derived from CAPM but can be overridden.',
      typicalRange: '6% – 15%',
      example: null,
      formula: 'Re = riskFreeRate + beta × marketRiskPremium',
    },
  },
  {
    id: 'costOfDebt',
    label: 'Cost of Debt',
    unit: 'pct',
    min: 0.02,
    max: 0.08,
    step: 0.0025,
    default: 0.0364,
    section: 'Discount Rate Assumptions',
    info: {
      title: 'Cost of Debt',
      variable: 'costOfDebt',
      meaning: 'Effective interest rate the company pays on its debt, before tax.',
      typicalRange: '2% – 8%',
      example: null,
      formula: null,
    },
  },
  {
    id: 'beta',
    label: 'Beta',
    unit: 'num',
    min: 0.5,
    max: 2.0,
    step: 0.05,
    default: 1.24,
    section: 'Discount Rate Assumptions',
    info: {
      title: 'Beta',
      variable: 'beta',
      meaning:
        'Measure of how volatile the stock is relative to the broader market. Beta of 1.0 means it moves with the market; above 1.0 is more volatile, below is less.',
      typicalRange: '0.5 – 2.0',
      example: null,
      formula: null,
    },
  },
  {
    id: 'riskFreeRate',
    label: 'Risk Free Rate',
    unit: 'pct',
    min: 0.02,
    max: 0.05,
    step: 0.0025,
    default: 0.036,
    section: 'Discount Rate Assumptions',
    info: {
      title: 'Risk-Free Rate',
      variable: 'riskFreeRate',
      meaning:
        'Yield on a theoretically risk-free investment, typically based on long-term government bonds.',
      typicalRange: '2% – 5%',
      example: null,
      formula: null,
    },
  },
  {
    id: 'marketRiskPremium',
    label: 'Market Risk Premium',
    unit: 'pct',
    min: 0.04,
    max: 0.06,
    step: 0.0025,
    default: 0.047,
    section: 'Discount Rate Assumptions',
    info: {
      title: 'Market Risk Premium',
      variable: 'marketRiskPremium',
      meaning:
        'Excess return investors demand from the broader stock market over the risk-free rate.',
      typicalRange: '4% – 6%',
      example: null,
      formula: null,
    },
  },
  {
    id: 'forecastYears',
    label: 'Forecast Period',
    unit: 'years',
    min: 5,
    max: 10,
    step: 1,
    default: 10,
    section: 'Forecast Period',
    info: {
      title: 'Projection Length',
      variable: 'forecastYears',
      meaning:
        'How many years out the model projects explicit cash flows before applying the terminal value formula.',
      typicalRange: '5, 7, or 10 years',
      example: null,
      formula: null,
    },
  },
];

export function formatAssumption(value, unit) {
  if (value == null || !Number.isFinite(value)) return '—';
  if (unit === 'pct') return `${(value * 100).toFixed(1)}%`;
  if (unit === 'years') return `${Math.round(value)}y`;
  if (unit === 'num') return value.toFixed(2);
  return String(value);
}

export const DEFAULT_ASSUMPTIONS = DCF_ASSUMPTIONS.reduce((acc, a) => {
  acc[a.id] = a.default;
  return acc;
}, {});
