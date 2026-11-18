/**
 * Sonar adaptive research: presentation families (Nov 18, 2026). Registry `families-v1`.
 *
 * The 30 research scenarios (profiles.js) say what is researched and with which data. A
 * presentation family says how the answer reads: which analytic zone comes first, which
 * section types it composes, which data it needs before a block may render, and which
 * follow-ups it offers. It is a separate, small registry so the two can change apart:
 * one scenario can present in more than one family (C04 answers a rates question as macro
 * intelligence, and a definitional question as an explainer), and every rendered answer has
 * exactly one primary family.
 *
 * Selection is by analytical intent and the evidence that actually came back, not by ticker
 * or keyword alone: the planner proposes a family from the scenario and the plan's intent
 * flags (plan.fx, plan.geo, plan.explainer); after execution the composed sections confirm
 * or demote it (a geo plan whose sections did not come back presents as news and evidence).
 *
 * The model never chooses markup. It produces typed sections; this registry and the
 * renderer map them to a curated composition.
 *
 * Pure.
 */

export const FAMILIES_VERSION = 'families-v1';

/**
 * Each family:
 *   id, label           the kicker over the answer ("Currency intelligence")
 *   firstZone           the section types that open the analytic area, in priority order;
 *                       the first one present is the family's first zone
 *   priority            section types in reading order after the first zone
 *   scenarios           { primary: [...], supporting: [...] } scenario ids from profiles.js
 *   requiredData        what a first zone needs before it renders (documented, and checked
 *                       by the schema rules for each section type)
 *   followups           the follow-up module: which kinds of next question it offers
 *   subtypes            [{ id, test(plan, text) }] the analytical subtype, first match wins
 */
export const FAMILIES = [
  {
    id: 'sovereign_macro',
    n: 1,
    label: 'Country and macro intelligence',
    kicker: { fx: 'Currency intelligence', default: 'Country intelligence' },
    firstZone: ['fx_overview', 'series_chart', 'macro_timeseries'],
    priority: ['fx_findings', 'fx_charts', 'fx_flow', 'fx_anchor', 'fx_indicators', 'series_chart', 'macro_timeseries', 'ranking', 'fx_drivers', 'fx_risk_scope', 'fx_monitor', 'fx_outlook', 'fx_evidence'],
    scenarios: { primary: ['C01', 'C04', 'C05'], supporting: ['C09'] },
    requiredData: ['dated official country series (at least two observations per chart)', 'quote convention for FX'],
    followups: ['policy', 'reserves', 'peers'],
    subtypes: [
      { id: 'currency_pressure', test: (p) => Boolean(p?.fx) && !['reserves', 'inflation'].includes(p.fx.focus) },
      { id: 'external_liquidity', test: (p) => p?.fx?.focus === 'reserves' },
      { id: 'policy_rates', test: (p) => p?.fx?.focus === 'inflation' || p?.primaryScenario === 'C04' },
      { id: 'country_overview', test: () => true },
    ],
  },
  {
    id: 'company_equity',
    n: 2,
    label: 'Company research',
    firstZone: ['fundamentals', 'metric_table', 'valuation', 'ranking', 'series_chart', 'data_table'],
    priority: ['key_findings', 'valuation', 'ranking', 'data_table', 'sector_exposure', 'policy_tracker', 'risk', 'watchpoints'],
    scenarios: { primary: ['B02', 'B03', 'B04', 'B05', 'B06', 'B07', 'B08'], supporting: ['B01', 'A04'] },
    requiredData: ['company identity resolved to one issuer', 'statements or obligations with fiscal period', 'never divide obligations by revenue'],
    followups: ['peers', 'ownership', 'government'],
    subtypes: [
      { id: 'government_dependence', test: (p) => ['B04', 'B08'].includes(p?.primaryScenario) },
      { id: 'ownership', test: (p) => ['B06', 'B07'].includes(p?.primaryScenario) },
      { id: 'valuation', test: (p) => p?.primaryScenario === 'B03' },
      { id: 'fundamentals', test: () => true },
    ],
  },
  {
    id: 'geopolitical_event',
    n: 3,
    label: 'Event-driven intelligence',
    firstZone: ['kpi_strip', 'verified_event_status', 'event_timeline', 'market_comparison'],
    priority: ['market_comparison', 'hormuz_flows', 'economic_transmission', 'us_impact', 'gold_markets', 'scenario_table', 'policy_tracker', 'news_timeline'],
    scenarios: { primary: ['A08', 'A01', 'A07', 'C06'], supporting: ['C03', 'C10'] },
    requiredData: ['event existence verified before effects are reported', 'dated market series for any chart'],
    followups: ['duration', 'markets', 'exposure'],
    subtypes: [
      { id: 'energy_shock', test: (p) => Boolean(p?.geo) },
      { id: 'sanctions_trade', test: (p) => p?.primaryScenario === 'C06' },
      { id: 'event_verification', test: () => true },
    ],
  },
  {
    id: 'comparative_rankings',
    n: 4,
    label: 'Comparative intelligence',
    firstZone: ['ranking', 'metric_table'],
    priority: ['series_chart', 'macro_timeseries', 'heatmap', 'data_table'],
    scenarios: { primary: ['C02', 'C09'], supporting: ['B09'] },
    requiredData: ['one unit and one period basis per ranking, or the period mix labelled', 'no padded rows'],
    followups: ['period', 'per_capita', 'peers'],
    subtypes: [
      { id: 'country_ranking', test: (p) => p?.primaryScenario === 'C02' },
      { id: 'peer_comparison', test: () => true },
    ],
  },
  {
    id: 'portfolio_quant',
    n: 5,
    label: 'Portfolio intelligence',
    firstZone: ['portfolio_attribution', 'price_comparison', 'metric_table'],
    priority: ['key_findings', 'policy_tracker', 'series_chart', 'catalyst_calendar'],
    scenarios: { primary: ['B10', 'D03', 'D01'], supporting: ['B09', 'D02', 'D04'] },
    requiredData: ['organization records resolved from signed-in membership on the server', 'cost basis and market value kept apart'],
    followups: ['concentration', 'ips', 'overlap'],
    subtypes: [
      { id: 'fund_risk', test: (p) => p?.primaryScenario === 'D03' },
      { id: 'fund_fit', test: (p) => p?.primaryScenario === 'D01' },
      { id: 'strategy_analytics', test: () => true },
    ],
  },
  {
    id: 'prediction_scenarios',
    n: 6,
    label: 'Event probability intelligence',
    firstZone: ['forecast_market', 'candidate_table', 'verified_event_status'],
    priority: ['candidate_table', 'key_findings', 'news_timeline', 'watchpoints'],
    scenarios: { primary: ['C08', 'A02'], supporting: ['A06', 'A09'] },
    requiredData: ['a strictly matched contract, or no market chart', 'candidates only with verified sources'],
    followups: ['verification', 'contract_terms', 'history'],
    subtypes: [
      { id: 'succession', test: (p) => p?.primaryScenario === 'A02' },
      { id: 'contract_pricing', test: () => true },
    ],
  },
  {
    id: 'news_evidence',
    n: 7,
    label: 'News and evidence intelligence',
    firstZone: ['price_comparison', 'verified_event_status', 'news_timeline'],
    priority: ['key_findings', 'news_timeline', 'catalyst_calendar', 'watchpoints'],
    scenarios: { primary: ['A05', 'A10', 'C10'], supporting: ['A01', 'A09'] },
    requiredData: ['dated closes for the move', 'canonical source links with publication times'],
    followups: ['filings', 'peers', 'catalysts'],
    subtypes: [
      { id: 'market_move', test: (p) => p?.primaryScenario === 'A05' },
      { id: 'narrative', test: () => true },
    ],
  },
  {
    id: 'financial_explainer',
    n: 8,
    label: 'Financial explainer',
    firstZone: ['ex_definitions', 'ex_equations'],
    priority: ['ex_equations', 'ex_measures', 'ex_diagram', 'ex_method'],
    scenarios: { primary: [], supporting: ['C04', 'C01'] },
    requiredData: ['a reviewed glossary entry; no numerical example without real observations'],
    followups: ['worked_example', 'country_data', 'related_concept'],
    subtypes: [{ id: 'concept', test: () => true }],
  },
];

export const FAMILY_BY_ID = Object.fromEntries(FAMILIES.map((f) => [f.id, f]));
const FAMILY_IDS = new Set(FAMILIES.map((f) => f.id));

/* Scenarios not listed as a family's primary present in the family that lists them as
   supporting; anything left falls back by its letter. */
const LETTER_DEFAULT = { A: 'news_evidence', B: 'company_equity', C: 'sovereign_macro', D: 'portfolio_quant' };

/** The family a plan proposes, before execution. */
export function proposeFamily(plan) {
  if (plan?.explainer) return 'financial_explainer';
  if (plan?.fx) return 'sovereign_macro';
  if (plan?.geo) return 'geopolitical_event';
  const id = plan?.primaryScenario;
  if (!id) return null;
  const primary = FAMILIES.find((f) => f.scenarios.primary.includes(id));
  if (primary) return primary.id;
  const supporting = FAMILIES.find((f) => f.scenarios.supporting.includes(id));
  if (supporting) return supporting.id;
  return LETTER_DEFAULT[id[0]] || null;
}

/** The analytical subtype within a family, first matching test. */
export function subtypeOf(familyId, plan, text = '') {
  const fam = FAMILY_BY_ID[familyId];
  if (!fam) return null;
  return fam.subtypes.find((s) => s.test(plan, text))?.id || null;
}

/** Which families a plan's supporting scenarios would add. */
export function supportingFamilies(plan, primaryFamily) {
  const ids = new Set();
  for (const sc of plan?.supportingScenarios || []) {
    const fid = proposeFamily({ primaryScenario: sc });
    if (fid && fid !== primaryFamily) ids.add(fid);
  }
  return [...ids];
}

/**
 * The presentation plan, on the router's plan (before execution).
 * @returns {{ version, presentationFamily, analyticalSubtype, supportingFamilies }}
 */
export function planPresentation(plan, text = '') {
  const fam = proposeFamily(plan);
  return {
    version: FAMILIES_VERSION,
    presentationFamily: fam,
    analyticalSubtype: fam ? subtypeOf(fam, plan, text) : null,
    supportingFamilies: fam ? supportingFamilies(plan, fam) : [],
  };
}

/** Section types that carry data (and so need provenance), as opposed to framing. */
const FRAMING = new Set(['lead', 'followups', 'limitations', 'sources', 'fx_conclusion']);

/**
 * The presentation metadata a finished report carries: the family confirmed against what was
 * composed, the first zone that actually rendered, and source coverage per data block.
 * @param {object} plan  the router's plan
 * @param {Array} sections  the validated sections, in order
 */
export function composePresentation(plan, sections) {
  const types = sections.map((s) => s.type);
  let fam = proposeFamily(plan);
  /* Demote a family whose first zone never came back to the one the sections support. */
  if (fam && !FAMILY_BY_ID[fam].firstZone.some((t) => types.includes(t))) {
    const fit = FAMILIES.find((f) => f.firstZone.some((t) => types.includes(t)));
    if (fit) fam = fit.id;
  }
  const family = fam ? FAMILY_BY_ID[fam] : null;
  const firstZone = family ? family.firstZone.find((t) => types.includes(t)) || null : null;
  const dataBlocks = sections.filter((s) => !FRAMING.has(s.type));
  const sourced = dataBlocks.filter((s) => JSON.stringify(s).includes('"cites":["'));
  const gaps = [];
  for (const s of sections) {
    if (s.type === 'fx_risk_scope') gaps.push(...(s.missing || []));
    if (s.type === 'fx_monitor')
      gaps.push(...(s.items || []).filter((i) => i.availability === 'gap').map((i) => i.signal));
  }
  return {
    version: FAMILIES_VERSION,
    presentationFamily: fam,
    familyLabel: family ? labelFor(family, plan) : null,
    analyticalSubtype: fam ? subtypeOf(fam, plan) : null,
    supportingFamilies: fam ? supportingFamilies(plan, fam) : [],
    firstZone,
    composedSections: types,
    sourceCoverage: {
      dataBlocks: dataBlocks.length,
      sourcedBlocks: sourced.length,
      gaps: [...new Set(gaps)].slice(0, 16),
    },
  };
}

function labelFor(family, plan) {
  if (family.kicker) return plan?.fx ? family.kicker.fx : family.kicker.default;
  return family.label;
}

/** Keeps only well-formed presentation metadata (stored answers may have none). */
export function cleanPresentation(p) {
  if (!p || typeof p !== 'object' || !FAMILY_IDS.has(p.presentationFamily)) return null;
  const str = (v, n = 80) => (typeof v === 'string' ? v.slice(0, n) : null);
  return {
    version: str(p.version, 24),
    presentationFamily: p.presentationFamily,
    familyLabel: str(p.familyLabel),
    analyticalSubtype: str(p.analyticalSubtype, 40),
    supportingFamilies: (Array.isArray(p.supportingFamilies) ? p.supportingFamilies : []).filter((f) =>
      FAMILY_IDS.has(f),
    ),
    firstZone: str(p.firstZone, 40),
    composedSections: (Array.isArray(p.composedSections) ? p.composedSections : [])
      .filter((t) => typeof t === 'string')
      .slice(0, 40),
    sourceCoverage: p.sourceCoverage && typeof p.sourceCoverage === 'object'
      ? {
          dataBlocks: Number(p.sourceCoverage.dataBlocks) || 0,
          sourcedBlocks: Number(p.sourceCoverage.sourcedBlocks) || 0,
          gaps: (Array.isArray(p.sourceCoverage.gaps) ? p.sourceCoverage.gaps : [])
            .filter((g) => typeof g === 'string')
            .map((g) => g.slice(0, 80))
            .slice(0, 16),
        }
      : null,
  };
}
