// src/lib/sonar/research-controls.js
// Research Controls (Sonar workspace, Nov 2026): the three selects in the
// right rail, what each option means to the research engine, and the guard
// that keeps a request honest. Pure and shared by client and server; tested
// in scripts/check-sonar-workspace.mjs.
//
// A control only ever shapes the NEXT run. It never rewrites a finished one.
// "Data sources" can only narrow what the reader's plan already allows.

export const CONTROL_DEFAULTS = { focus: 'general', horizon: 'any', sources: 'all' };

export const FOCUS_OPTIONS = [
  { key: 'general', label: 'General research', directive: '' },
  {
    key: 'market',
    label: 'Market impact',
    directive:
      'Weight the analysis toward observed and plausible market impact: price behaviour, positioning, liquidity and the transmission channels to the instruments involved.',
  },
  {
    key: 'fundamentals',
    label: 'Fundamental analysis',
    directive:
      'Weight the analysis toward fundamentals: revenue, margins, cash flow, balance sheet strength and what the filings report.',
  },
  {
    key: 'risk',
    label: 'Risk analysis',
    directive:
      'Weight the analysis toward risk: what could go wrong, exposure and concentration, and the evidence that argues against the main reading.',
  },
  {
    key: 'competitive',
    label: 'Competitive positioning',
    directive:
      'Weight the analysis toward competitive position: peers, market share, pricing power and relative performance.',
  },
  {
    key: 'macro',
    label: 'Macro impact',
    directive:
      'Weight the analysis toward the macro picture: rates, inflation, currency, growth and policy, and how they reach the subject.',
  },
];

export const HORIZON_OPTIONS = [
  { key: 'any', label: 'Any horizon', directive: '' },
  {
    key: 'short',
    label: 'Short term',
    directive: 'Frame findings for the next days to three months.',
  },
  {
    key: 'medium',
    label: 'Medium term',
    directive: 'Frame findings for the next three to twelve months.',
  },
  { key: 'long', label: 'Long term', directive: 'Frame findings for a horizon beyond one year.' },
];

/* Dataset families a run may be narrowed to. `match` tests one of the research engine's
   source keys (RUNNERS in src/lib/sonar/engine/sources.js); Nov 13 2026 (prompt 4) the first
   pass's loose words were replaced by the engine's real keys, pinned by
   scripts/check-sonar-workspace.mjs: every key lands in at most one family and each option
   matches at least one key. Sources outside every family (Echo, news, the industry registry,
   the value chain, competitor announcements) are general context: a narrowed run drops them,
   except CONTEXT_SOURCES, which every run keeps. */
export const SOURCE_OPTIONS = [
  { key: 'all', label: 'All available', match: null },
  {
    key: 'market',
    label: 'Market data',
    match:
      /^(market_snapshot|analysts|price_performance|commodity_series|estimates|prediction_markets)$/,
  },
  {
    key: 'filings',
    label: 'Filings and fundamentals',
    match:
      /^(sec_filings|disclosures|company_financials|product_segments|peer_financials|revenue_geo|customer_capex|capex_monetization|hyperscaler_capex|institutional_13f|holder_positioning|ipo_filings)$/,
  },
  {
    key: 'government',
    label: 'Government and political data',
    match:
      /^(congress_sector|congress_company|congress_activity|politician_dossier|lobbying_leaders|lobbying_company|lobbying_associations|lobbying_profile|contracts_history|contracts_profile|sanctions|export_controls)$/,
  },
  {
    key: 'macro',
    label: 'Macro and economic data',
    match: /^(macro_country|macro_series)$/,
  },
];

/* Sources a narrowed run still keeps: they resolve the subject or carry the reader's own
   organization context, never evidence from another family. */
export const CONTEXT_SOURCES = ['industry_registry', 'fund_mandate'];

/**
 * The engine sources the reader's plan allows: a source gated by a dataset (SOURCE_DATASET)
 * needs that dataset in the entitlement; an ungated one is always allowed. `entitled` null
 * means every dataset (a deep run).
 */
export function entitledSources(universe, entitled, sourceDataset = {}) {
  const ok = Array.isArray(entitled) ? new Set(entitled) : null;
  return (universe || []).filter((k) => !ok || !sourceDataset[k] || ok.has(sourceDataset[k]));
}

/** "market data", for the notice when a plan has none of a family. */
export const sourceFamilyLabel = (controls) =>
  (SOURCE_OPTIONS.find((o) => o.key === sanitizeControls(controls).sources)?.label || '')
    .toLowerCase()
    .replace(/ and fundamentals$/, ' or fundamentals');

const has = (list, key) => list.some((o) => o.key === key);

/** Whatever arrived, as a valid controls object. Unknown values fall back to the default. */
export function sanitizeControls(input) {
  const raw = input && typeof input === 'object' ? input : {};
  return {
    focus: has(FOCUS_OPTIONS, raw.focus) ? raw.focus : CONTROL_DEFAULTS.focus,
    horizon: has(HORIZON_OPTIONS, raw.horizon) ? raw.horizon : CONTROL_DEFAULTS.horizon,
    sources: has(SOURCE_OPTIONS, raw.sources) ? raw.sources : CONTROL_DEFAULTS.sources,
  };
}

export const isDefaultControls = (c) => {
  const s = sanitizeControls(c);
  return s.focus === 'general' && s.horizon === 'any' && s.sources === 'all';
};

/**
 * The instruction the controls add to a research run, or '' for the defaults.
 * Built only from the fixed option text above: nothing a user typed reaches
 * the prompt through this function.
 */
export function controlsDirective(controls) {
  const c = sanitizeControls(controls);
  const parts = [
    FOCUS_OPTIONS.find((o) => o.key === c.focus)?.directive,
    HORIZON_OPTIONS.find((o) => o.key === c.horizon)?.directive,
  ].filter(Boolean);
  return parts.length ? `Reader's research settings. ${parts.join(' ')}` : '';
}

/**
 * Narrow the datasets a run may read. Never widens: the result is always a
 * subset of `entitled` (null means "everything", as the engine reads it).
 *
 * @param {string[]|null} entitled what the plan allows (null = all)
 * @param {string[]} universe every dataset key the engine knows
 * @returns {{ datasets: string[]|null, narrowed: boolean, empty: boolean }}
 */
export function narrowDatasets(entitled, universe, controls) {
  const c = sanitizeControls(controls);
  const option = SOURCE_OPTIONS.find((o) => o.key === c.sources);
  if (!option?.match) return { datasets: entitled, narrowed: false, empty: false };
  const base = Array.isArray(entitled) ? entitled : universe || [];
  const picked = base.filter((k) => option.match.test(String(k)));
  /* A filter that leaves nothing would silently produce an empty report: the
     caller keeps the full entitlement and tells the reader instead. */
  if (!picked.length) return { datasets: entitled, narrowed: false, empty: true };
  return { datasets: picked, narrowed: true, empty: false };
}

/** A short line for the answer's meta row, e.g. "Risk analysis · Short term". */
export function controlsLabel(controls) {
  const c = sanitizeControls(controls);
  if (isDefaultControls(c)) return '';
  return [
    c.focus !== 'general' ? FOCUS_OPTIONS.find((o) => o.key === c.focus).label : null,
    c.horizon !== 'any' ? HORIZON_OPTIONS.find((o) => o.key === c.horizon).label : null,
    c.sources !== 'all' ? SOURCE_OPTIONS.find((o) => o.key === c.sources).label : null,
  ]
    .filter(Boolean)
    .join(' · ');
}
