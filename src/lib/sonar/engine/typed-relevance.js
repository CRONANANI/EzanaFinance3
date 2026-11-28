/**
 * Typed evidence relevance (Sonar 6.4 final hardening, Nov 28 2026). Pure.
 *
 * The keyword gate (insight/relevance.js) asks whether a record is about the question's
 * subject. This gate asks whether the record can be evidence for the question's typed
 * objective: the requested entity type, measure and source family. Two production failures
 * motivated it: a comparison of AMD, Intel and Qualcomm on revenue growth read a world GDP
 * growth ranking (the macro series family on a company question), and "Has the Bank of
 * Canada cut rates?" read a bank company's filings, 13F holders and peers (company sources
 * on a central-bank question).
 *
 * Each record gets a role:
 *   input     a direct calculation input for the objective
 *   context   corroborating context from a compatible secondary family (kept, never the
 *             basis of a finding on its own)
 *   rejected  incompatible with the objective; removed from synthesis, reason recorded
 *
 * Research Composer results are never gated here: they are what the reader asked for.
 */

/* Sources that describe one company (its filings, holders, peers, price, analysts). */
const COMPANY_SOURCES = new Set([
  'company_financials',
  'sec_filings',
  'institutional_13f',
  'market_snapshot',
  'analysts',
  'revenue_geo',
  'product_segments',
  'peer_financials',
  'price_performance',
  'holder_positioning',
  'customer_capex',
  'estimates',
  'disclosures',
  'capex_monetization',
  'competitive_products',
  'contracts_profile',
  'lobbying_profile',
  'lobbying_company',
  'congress_company',
  'contracts_history',
]);

/* Country and world macro series. */
const MACRO_SOURCES = new Set(['macro_series', 'macro_country']);

/* Canonical families whose objective is a company measure (filed figures, prices, awards). */
const COMPANY_FAMILIES = new Set([
  'company_comparison',
  'multi_stage_screen',
  'fundamental_analysis',
  'government_contract_dependency',
  'dcf_valuation',
  'valuation_vs_earnings',
]);

/** What the question's objective is, from the canonical intent and the understanding. */
export function objectiveOf({ family = null, understood = null, resolution = null } = {}) {
  const ents = understood?.entities || [];
  const centralBank = ents.find((e) => e.kind === 'central_bank' || e.type === 'central_bank');
  const namedCountries = ents.filter((e) => e.kind === 'country' && e.via !== 'central_bank');
  return {
    kind: centralBank ? 'central_bank' : COMPANY_FAMILIES.has(family) ? 'company_measure' : 'other',
    family,
    centralBank: centralBank ? { id: centralBank.id, country: centralBank.country } : null,
    namesCountry: namedCountries.length > 0,
    company: resolution?.company?.ticker || null,
  };
}

/** The role of one evidence record under the objective. */
export function typedRole(e, objective) {
  const src = String(e?.source || '');
  if (src === 'research_composer') return { role: 'input', reason: null };
  if (objective.kind === 'central_bank' && COMPANY_SOURCES.has(src))
    return {
      role: 'rejected',
      reason: `company source (${src}) on a central-bank policy question`,
    };
  if (objective.kind === 'company_measure' && MACRO_SOURCES.has(src)) {
    /* A country named in the question makes country macro data legitimate context. */
    if (objective.namesCountry)
      return { role: 'context', reason: 'macro context for a named country' };
    return {
      role: 'rejected',
      reason: `country or world macro series (${src}) on a company-measure question`,
    };
  }
  if (objective.kind === 'company_measure' && COMPANY_SOURCES.has(src))
    return { role: 'input', reason: null };
  if (objective.kind === 'central_bank' && MACRO_SOURCES.has(src))
    return { role: 'input', reason: null };
  return { role: 'context', reason: null };
}

/**
 * Split records into kept (input or context, tagged) and rejected (with reasons).
 * @returns {{ kept: object[], rejected: {id, source, reason}[] }}
 */
export function typedGate(items = [], objective) {
  const kept = [];
  const rejected = [];
  for (const e of items || []) {
    const r = typedRole(e, objective);
    if (r.role === 'rejected') rejected.push({ id: e.id, source: e.source, reason: r.reason });
    else kept.push({ ...e, evidenceRole: r.role });
  }
  return { kept, rejected };
}
