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

/* Dataset families a run may be narrowed to. `match` tests an engine dataset
   or source key; Claude Code maps these to the engine's real keys when wiring
   (see PROMPT 4) and the unit test pins the mapping. */
export const SOURCE_OPTIONS = [
  { key: 'all', label: 'All available', match: null },
  {
    key: 'market',
    label: 'Market data',
    match: /price|quote|market|equity|fx|commodit|rates|yield/i,
  },
  {
    key: 'filings',
    label: 'Filings and fundamentals',
    match: /filing|sec|edgar|fundamental|13f|insider|earnings/i,
  },
  {
    key: 'government',
    label: 'Government and political data',
    match: /congress|lobby|contract|award|campaign|sanction|regulat|politic|usaspending/i,
  },
  {
    key: 'macro',
    label: 'Macro and economic data',
    match: /macro|oecd|world.?bank|imf|inflation|gdp|econom|fred|central.?bank/i,
  },
];

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
