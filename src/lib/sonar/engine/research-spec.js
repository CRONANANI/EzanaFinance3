/**
 * Sonar research engine: the research specification (engine v3, Section 3).
 *
 * understandQuery() says what was typed (intent, entities, display). The
 * research spec says what has to be investigated: the objective, every
 * active domain with a score, the subject and secondary entities, geography,
 * time horizon, requested metrics, comparison and ranking requirements, the
 * relationships worth checking, the evidence the answer needs, the analyses
 * to run and the report components to produce.
 *
 * Deterministic. The optional LLM step (spec-llm.js) may ADD secondary
 * objectives or domains below 0.9 confidence; it never removes or overrides a
 * deterministic domain, entity or resolution.
 */
import { DOMAINS } from './domains';

/* Base domains per understood intent (the deterministic router's verdict). */
const INTENT_DOMAINS = {
  company: { company: 1, company_financials: 0.5, analyst_views: 0.4 },
  ticker_lookup: { company: 1, market_performance: 0.6, analyst_views: 0.5 },
  fund: { company: 0.7, institutional: 1 },
  politician: { politician: 1, congress_trading: 0.9 },
  country: { country: 1, macro: 0.6 },
  country_rank: { country: 1, macro: 0.8 },
  industry_layout: { industry: 1 },
  industry_country: { industry: 1, country: 0.5 },
  sector_screen: { sector: 1 },
  ranking: { market_performance: 0.5 },
  comparison: { company: 0.6, market_performance: 0.6 },
  policy: { geopolitics: 0.6, lobbying: 0.4 },
  theme: { news: 0.5 },
  commodity: { commodity: 1 },
  event: { news: 0.8 },
  open_question: { news: 0.5, editorial: 0.3 },
};

const RANK_RE =
  /\b(who|which|what)\b.*\b(most|hardest|largest|biggest|top|highest|lowest|least|best|worst|leading)\b|\b(top|rank\w*|leaderboard|most|largest|biggest)\b/i;
const COMPARE_RE = /\b(vs\.?|versus|compared? (?:to|with)|relative to|while)\b/i;
const FORWARD_RE =
  /\b(next|over the coming|coming|upcoming|future|outlook|forecast|will|likely|expected)\b/i;
const MONTHS_RE =
  /\b(?:next|past|last|over the (?:next|past|last))\s+(\d{1,2})\s+(months?|years?|quarters?)\b/i;

/* Metrics a question asks for, by phrase. */
const METRICS = [
  ['lobbying_spend', /\b(lobby\w*)\b/i],
  ['trade_count', /\b(trad\w*|transactions?|bought|sold|buying|selling|investments?)\b/i],
  ['contract_obligations', /\b(contracts?|awards?|obligations?)\b/i],
  ['revenue_by_region', /\b(exposed|exposure|revenue|sales|dependence)\b/i],
  ['price_change', /\b(price|prices|performance|returns?|moved?|rall\w*)\b/i],
  ['holdings_value', /\b(institutional|holders?|holdings|ownership|positions?|accumulat\w*)\b/i],
  ['analyst_targets', /\b(price targets?|analysts?|ratings?)\b/i],
];

/* Relationships worth investigating when two domains meet. */
const RELATIONSHIPS = [
  [['lobbying', 'company'], 'company_lobbies_on_issue'],
  [['lobbying', 'industry'], 'company_lobbies_on_issue'],
  [['contracts', 'company'], 'company_receives_contracts'],
  [['contracts', 'sector'], 'company_receives_contracts'],
  [['congress_trading', 'company'], 'member_trades_company'],
  [['congress_trading', 'sector'], 'member_trades_company'],
  [['congress_trading', 'politician'], 'member_trades_company'],
  [['politician', 'congress_trading'], 'member_sits_on_committee'],
  [['institutional', 'company'], 'institution_holds_company'],
  [['institutional', 'sector'], 'institution_holds_company'],
  [['institutional', 'industry'], 'institution_holds_company'],
  [['geopolitics', 'company_financials'], 'company_revenue_in_region'],
  [['geopolitics', 'industry'], 'company_revenue_in_region'],
  [['geopolitics', 'country'], 'country_subject_to_program'],
];

/* Report components per question shape. */
function reportComponents(spec) {
  const out = ['executive_conclusion', 'key_findings', 'evidence', 'limitations'];
  if (spec.ranking.required) out.push('leaderboard');
  if (spec.comparison.required) out.push('comparison');
  if (spec.timeHorizon.kind === 'forward') out.push('scenarios');
  if (spec.relationships.length) out.push('relationships');
  if (spec.metrics.length) out.push('key_metrics');
  return out;
}

/** The time horizon a question names. */
export function timeHorizonOf(text, now = new Date()) {
  const t = String(text || '');
  const m = t.match(MONTHS_RE);
  const unit = m ? m[2].toLowerCase() : null;
  const n = m ? Number(m[1]) : null;
  const months = n
    ? unit.startsWith('year')
      ? n * 12
      : unit.startsWith('quarter')
        ? n * 3
        : n
    : null;
  if (FORWARD_RE.test(t)) {
    return { kind: 'forward', months: months || 12, asOf: now.toISOString().slice(0, 10) };
  }
  if (months) return { kind: 'trailing', months, asOf: now.toISOString().slice(0, 10) };
  if (/\b(lately|recently|recent|this year|ytd|year to date)\b/i.test(t)) {
    return { kind: 'trailing', months: 12, asOf: now.toISOString().slice(0, 10) };
  }
  return { kind: 'unspecified', months: null, asOf: now.toISOString().slice(0, 10) };
}

/**
 * Score every domain for a ping: intent prior, entity evidence, cue hits.
 * @returns {Array<{ id: string, score: number, why: string[] }>} best first, score > 0
 */
export function scoreDomains(text, understood = {}) {
  const t = String(text || '');
  const scores = new Map();
  const add = (id, s, why) => {
    const cur = scores.get(id) || { id, score: 0, why: [] };
    cur.score = Math.min(1, Math.max(cur.score, s) + (cur.score && s ? 0.1 : 0));
    cur.why.push(why);
    scores.set(id, cur);
  };
  for (const [id, s] of Object.entries(INTENT_DOMAINS[understood.intent] || {})) {
    add(id, s, `intent:${understood.intent}`);
  }
  const kinds = new Set((understood.entities || []).map((e) => e.kind));
  if (kinds.has('ticker')) add('company', 0.9, 'entity:ticker');
  if (kinds.has('person_politician')) add('politician', 1, 'entity:politician');
  if (kinds.has('industry') || kinds.has('sector')) add('industry', 0.7, 'entity:industry');
  if (kinds.has('country')) add('country', 0.5, 'entity:country');
  if (kinds.has('policy')) add('geopolitics', 0.6, 'entity:policy');
  for (const [id, d] of Object.entries(DOMAINS)) {
    if (d.cues.some((re) => re.test(t))) add(id, 0.75, `cue:${id}`);
  }
  /* A country named with a tension word, about companies or markets, is a
     geopolitical exposure question first, not a country profile. */
  const nCountries = (understood.entities || []).filter((e) => e.kind === 'country').length;
  if (nCountries && DOMAINS.geopolitics.cues[0].test(t)) {
    add('geopolitics', nCountries >= 2 ? 1 : 0.9, 'countries+tension');
    if (
      /\b(compan(?:y|ies)|stocks?|shares|firms|manufacturers?|exposed|exposure|vulnerable|investors?)\b/i.test(
        t,
      )
    ) {
      const c = scores.get('country');
      if (c) c.score = Math.min(c.score, 0.6);
    }
  }
  return [...scores.values()].filter((d) => d.score > 0).sort((a, b) => b.score - a.score);
}

/**
 * The research specification for a ping.
 * @param {object} understood  understandQuery() output
 * @param {{ query?: string, resolution?: object, depth?: 'quick'|'standard'|'deep', now?: Date }} opts
 */
export function buildResearchSpec(
  understood,
  { query = '', resolution = {}, depth = 'standard', now = new Date() } = {},
) {
  const text = String(query || understood?.raw || understood?.corrected || '');
  const domains = scoreDomains(text, understood);
  const entities = (understood?.entities || []).map((e) => ({
    kind: e.kind,
    id: e.id,
    label: e.label,
    confidence: e.confidence,
  }));
  const subject = resolution.subject || null;
  const geography = entities
    .filter((e) => e.kind === 'country' || e.kind === 'state_province')
    .map((e) => ({ id: e.id, label: e.label }));
  const rankMatch = RANK_RE.test(text);
  const n = Number((text.match(/\b(?:top|best|worst)\s+(\d{1,2})\b/i) || [])[1]) || 10;
  const metrics = METRICS.filter(([, re]) => re.test(text)).map(([id]) => id);
  const active = new Set(domains.filter((d) => d.score >= 0.5).map((d) => d.id));
  const relationships = [
    ...new Set(
      RELATIONSHIPS.filter(([pair]) => pair.every((p) => active.has(p))).map(([, r]) => r),
    ),
  ];
  const spec = {
    version: 'spec-v1',
    question: understood?.display || text,
    rawQuery: text,
    objective: {
      primary: rankMatch
        ? 'rank'
        : COMPARE_RE.test(text)
          ? 'compare'
          : timeHorizonOf(text, now).kind === 'forward'
            ? 'assess_outlook'
            : /\b(exposed|exposure|vulnerable|risk)\b/i.test(text)
              ? 'assess_exposure'
              : 'explain',
      secondary: COMPARE_RE.test(text) && rankMatch ? ['compare'] : [],
    },
    domains,
    primaryDomain: domains[0]?.id || 'news',
    subject,
    entities,
    geography,
    timeHorizon: timeHorizonOf(text, now),
    metrics,
    comparison: {
      required: COMPARE_RE.test(text),
      subjects: entities
        .filter((e) => e.kind === 'ticker' || e.kind === 'country')
        .map((e) => e.label),
    },
    ranking: {
      required: rankMatch,
      n: Math.min(25, n),
      metric: metrics[0] || null,
    },
    relationships,
    evidenceRequirements: metrics.map((m) => `${m}:primary_source`),
    analyses: [
      ...(rankMatch ? ['rank'] : []),
      ...(COMPARE_RE.test(text) ? ['compare'] : []),
      ...(metrics.includes('price_change') ? ['performance'] : []),
      ...(relationships.length ? ['relationships'] : []),
      ...(timeHorizonOf(text, now).kind === 'forward' ? ['scenarios'] : []),
    ],
    depth,
  };
  spec.reportComponents = reportComponents(spec);
  return spec;
}
