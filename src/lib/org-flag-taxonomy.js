/**
 * Org position-flag taxonomy — the single source of truth for the reason /
 * conviction / suggested-action / response-window vocabularies.
 *
 * The API imports this to validate a flag server-side (a Red reason on a Green
 * flag must 400) and the composer imports it to render the color-specific
 * dropdowns. Keeping one module means the client and the server can never drift
 * out of sync on what a valid flag looks like.
 */

/** Reason options are COLOR-SPECIFIC. A green reason on a red flag is invalid. */
export const FLAG_REASONS = {
  green: [
    { value: 'catalyst_hit', label: 'Catalyst hit' },
    { value: 'earnings_beat', label: 'Earnings beat' },
    { value: 'guidance_raise', label: 'Guidance raise' },
    { value: 'thesis_confirmed', label: 'Thesis confirmed by new data' },
    { value: 'valuation_attractive', label: 'Valuation more attractive (drawdown)' },
    { value: 'competitive_improved', label: 'Competitive position improved' },
    { value: 'new_positive_info', label: 'New positive information' },
  ],
  red: [
    { value: 'thesis_broken', label: 'Thesis broken' },
    { value: 'earnings_miss', label: 'Earnings miss' },
    { value: 'guidance_cut', label: 'Guidance cut' },
    { value: 'catalyst_passed', label: 'Catalyst passed without effect' },
    { value: 'valuation_stretched', label: 'Valuation stretched' },
    { value: 'competitive_threat', label: 'Competitive threat emerged' },
    { value: 'risk_identified', label: 'Risk materialized (one we identified)' },
    { value: 'risk_missed', label: 'Risk materialized (one we missed)' },
    { value: 'management_change', label: 'Management change' },
    { value: 'governance_concern', label: 'Accounting / governance concern' },
  ],
};

/** Flat set of valid reason values for the given color. */
export function reasonsForColor(color) {
  return FLAG_REASONS[color] || [];
}

/** Server-side guard: is `reason` valid for `color`? Empty reason is allowed. */
export function isReasonValidForColor(color, reason) {
  if (!reason) return true;
  return reasonsForColor(color).some((r) => r.value === reason);
}

export function reasonLabel(reason) {
  for (const color of Object.keys(FLAG_REASONS)) {
    const hit = FLAG_REASONS[color].find((r) => r.value === reason);
    if (hit) return hit.label;
  }
  return reason || '';
}

export const CONVICTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'med', label: 'Med' },
  { value: 'high', label: 'High' },
];

export const SUGGESTED_ACTIONS = [
  { value: 'monitor', label: 'Monitor' },
  { value: 'size_up', label: 'Size up' },
  { value: 'trim', label: 'Trim' },
  { value: 'exit', label: 'Exit' },
  { value: 'reunderwrite', label: 'Re-underwrite' },
];

export function actionLabel(action) {
  return SUGGESTED_ACTIONS.find((a) => a.value === action)?.label || action || '';
}

/** Response-due windows (hours). Conviction defaults the deadline. */
export const RESPONSE_WINDOWS = [
  { value: 24, label: '24 hours' },
  { value: 72, label: '3 days' },
  { value: 168, label: '1 week' },
];

/** High conviction → 24h, Med → 3 days, Low → 1 week. */
export function defaultResponseHoursForConviction(conviction) {
  if (conviction === 'high') return 24;
  if (conviction === 'med') return 72;
  return 168;
}

/**
 * Sector → benchmark ETF. This is a label, not fabricated market data — it lets
 * the flag record which benchmark its outcome will be scored against. Keyed by
 * the MOCK_TEAMS sector strings and a few common sub-sector labels.
 */
export const SECTOR_BENCHMARK = {
  Healthcare: 'XLV',
  'Consumer Goods & Services': 'XLP',
  Consumer: 'XLY',
  'Energy & Utilities': 'XLE',
  'Financial Institutions': 'XLF',
  Financials: 'XLF',
  Industrials: 'XLI',
  'Metals & Mining': 'XME',
  TMT: 'XLK',
  Technology: 'XLK',
  Semiconductors: 'SMH',
  'Enterprise Software': 'IGV',
  'Consumer Tech': 'XLK',
  'Digital Advertising': 'XLC',
};

export function benchmarkForSector(sector) {
  if (!sector) return null;
  return SECTOR_BENCHMARK[sector] || null;
}

/** Statuses a routed recipient may set via the resolution loop. */
export const RESPONSE_STATUSES = ['accepted', 'acknowledged', 'rejected', 'escalated'];

export const MIN_MESSAGE_CHARS = 40;
