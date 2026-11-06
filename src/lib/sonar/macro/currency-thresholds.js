/**
 * "How Ezana thresholds work": the plain-language ladder behind the currency-pressure
 * assessment, generated from CURRENCY_THRESHOLDS so the explainer always states the cut-offs
 * the engine actually uses (assessCurrencyPressure in playbook.js).
 *
 * Pure: no I/O. Rendered by EzanaThresholdsModal.jsx on the Sonar answer and the deep report.
 * Copy rules: sentence case, no em dashes, findings only (nothing here is a forecast or advice).
 */
import { CURRENCY_THRESHOLDS, CURRENCY_LEVELS } from './playbook.js';

const pct = (v) => `${Math.abs(v)}%`;
const pp = (v) => `${v} pp`;

/**
 * One row per component, in the order the card's "How serious is it" table uses.
 * -> [{ id, label, measure, levels: { low, moderate, elevated, severe }, note }]
 */
export function currencyThresholdRows(T = CURRENCY_THRESHOLDS) {
  const d = T.depreciation1y;
  const a = T.depreciation3mAnnualised;
  const i = T.inflation;
  const r = T.realRate;
  const res = T.reserves3m;
  const imp = T.reserveImportMonths;
  const ca = T.currentAccount;
  const k = T.riskPercentile;
  return [
    {
      id: 'depreciation',
      label: 'Exchange-rate depreciation',
      measure:
        'Value the currency lost against the US dollar over the last 12 months (1 minus the old rate over the new rate, quoted as local currency per dollar).',
      levels: {
        low: `${pct(d.moderate)} or less`,
        moderate: `More than ${pct(d.moderate)}, under ${pct(d.elevated)}`,
        elevated: `${pct(d.elevated)} to under ${pct(d.severe)}`,
        severe: `${pct(d.severe)} or more`,
      },
      note: `A moderate reading moves up to elevated when the last 3 months' loss, annualised, is ${pct(a.elevated)} or more.`,
    },
    {
      id: 'inflation',
      label: 'Inflation persistence',
      measure: 'Latest annual consumer price inflation.',
      levels: {
        low: `Under ${pct(i.moderate)}`,
        moderate: `${pct(i.moderate)} to under ${pct(i.elevated)}`,
        elevated: `${pct(i.elevated)} to under ${pct(i.severe)}`,
        severe: `${pct(i.severe)} or more`,
      },
      note: 'The direction against a year earlier (rising, falling or flat) is shown with the reading but does not change the level.',
    },
    {
      id: 'policy',
      label: 'Monetary policy stance',
      measure:
        'Ex-post real policy rate: the policy rate minus latest annual inflation, in percentage points. It looks backward, not at expected inflation.',
      levels: {
        low: `${pp(r.thin)} or more, and no rate cuts over the year`,
        moderate: `${pp(r.thin)} or more, but the rate was cut over the year`,
        elevated: `${pp(r.negative)} to under ${pp(r.thin)}`,
        severe: `Below ${pp(r.negative)} (policy rate under inflation)`,
      },
      note: null,
    },
    {
      id: 'external',
      label: 'External liquidity',
      measure:
        'Change in foreign-exchange reserves over about 3 months, months of imports the reserves cover, and the current account balance. The worst of the three sets the level.',
      levels: {
        low: 'Reserves flat or rising, current account in balance or surplus',
        moderate: 'Reserves slipping (under 0%) or a current account deficit',
        elevated: `Reserves down ${pct(res.deteriorating)} or more, cover under ${imp.weak} months of imports, or a deficit of ${pct(ca.vulnerable)} of GDP or wider`,
        severe: `Reserves down ${pct(res.sharp)} or more in about 3 months`,
      },
      note: 'Any one of the three that is available is enough to assess the component.',
    },
    {
      id: 'stress',
      label: 'Political and market stress',
      measure:
        "Where the country's latest geopolitical risk or world uncertainty index reading sits within its own history, as a percentile.",
      levels: {
        low: `Below the ${k.moderate}th percentile`,
        moderate: `${k.moderate}th to under ${k.elevated}th`,
        elevated: `${k.elevated}th to under ${k.severe}th`,
        severe: `${k.severe}th percentile or higher`,
      },
      note: null,
    },
  ];
}

/** How the overall label is set, in order. */
export const OVERALL_RULE = [
  'Start from the exchange-rate depreciation level, because pressure on a currency shows up first in its price.',
  'Move up one step when two or more of the other components are elevated or severe.',
  'Move down one step when every other component is low.',
  'Give no overall label unless the depreciation component and at least two others could be assessed from Ezana data.',
];

/** The crisis row, explained. */
export const CRISIS_RULE =
  'Imminent currency crisis always reads "not established" from the data alone. Disorderly markets (a broken interbank market, capital controls, emergency rate moves) need direct evidence, and Sonar only reports one when its sources show it.';

/** What the assessment is not. */
export const THRESHOLD_CAVEATS = [
  'A qualitative reading against fixed cut-offs, the same for every country. It is not a statistical model, a calibrated probability or a credit rating.',
  'Not a forecast and not advice. It describes conditions in the latest data and says nothing about where the rate goes next.',
  'The severe depreciation cut sits close to the markers used in currency-crisis research (Frankel and Rose, 1996, used a 25% annual fall; the IMF database by Laeven and Valencia uses 30%).',
  'Missing measures drop out rather than count as low. The card lists anything Ezana does not hold under "Data not available".',
];

export { CURRENCY_LEVELS };
