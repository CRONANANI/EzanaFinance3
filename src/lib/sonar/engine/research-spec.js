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
import { scoreDomains } from './domain-score';
import { classifyCore, isPositioningQuestion, DEEP_ANGLES } from '@/lib/sonar/research-mode-core';

export { scoreDomains };

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

/* The domains an investment risk assessment always covers, and the extra
   weight each requested angle adds (Nov 2026, deep research). */
const MEMO_BASE = {
  company: 1,
  company_financials: 0.95,
  analyst_views: 0.7,
  competition: 0.75,
  geopolitics: 0.6,
  news: 0.6,
};
const ANGLE_DOMAINS = {
  financials: { company_financials: 1 },
  ownership: { institutional: 0.9 },
  contracts: { contracts: 0.85 },
  industry: { industry: 0.6, competition: 0.8 },
  competition: { competition: 0.95 },
  geopolitics: { geopolitics: 0.9 },
  customers: { company_financials: 0.95 },
  lobbying: { lobbying: 0.8 },
  valuation: { analyst_views: 0.9, market_performance: 0.6 },
};

const MEMO_RE =
  /\b(risks?|downside|threats?|headwinds?|investment (?:case|thesis|memo)|thesis|outlook|prospects|analy[sz]e|assess\w*|evaluate|due diligence|deep dive)\b/i;

/* The memo decision reads the research-mode classifier (Nov 2026): a deep
   question about one company, or any dependence, opportunity or risk
   question about it, is an investment risk assessment. */
const MEMO_OPS = ['dependence', 'sustainability', 'opportunity', 'risk_assessment'];

/** The deep signal the memo decision needs, from a classification. */
function memoSignal(c) {
  return {
    deep: c.mode === 'deep' && c.confidence === 'clear',
    angles: c.angles || [],
    operations: c.operations || [],
  };
}

/** Whether a question about one company is an investment risk assessment. */
export function isInvestmentMemo(text, subject, signal = null) {
  if (subject?.kind !== 'company') return false;
  const s = signal || memoSignal(classifyCore(text));
  if (s.deep) return true;
  if ((s.operations || []).some((o) => MEMO_OPS.includes(o))) return true;
  return MEMO_RE.test(String(text || '')) && (s.angles || []).length >= 2;
}

function withMemoDomains(domains, angles) {
  const by = new Map(domains.map((d) => [d.id, { ...d, why: [...d.why] }]));
  const lift = (id, s, why) => {
    const cur = by.get(id) || { id, score: 0, why: [] };
    if (s > cur.score) cur.score = s;
    cur.why.push(why);
    by.set(id, cur);
  };
  for (const [id, s] of Object.entries(MEMO_BASE)) lift(id, s, 'memo:base');
  for (const a of angles) {
    for (const [id, s] of Object.entries(ANGLE_DOMAINS[a.id] || {})) lift(id, s, `angle:${a.id}`);
  }
  return [...by.values()].sort((a, b) => b.score - a.score);
}

/* A fund fit run (Sonar for organizations) reads these angles when the
   question names none: enough to answer "should our fund invest?". */
export const FUND_FIT_ANGLES = ['financials', 'valuation', 'competition', 'industry', 'customers'];

/* Report components per question shape. */
function reportComponents(spec) {
  if (spec.format === 'investment_memo' && spec.memoKind === 'fund_fit') {
    return [
      'fund_verdict',
      'mandate_checks',
      'thesis_fit',
      'catalysts',
      'headwinds',
      'financial_dashboard',
      'committee_questions',
      'scenarios',
      'evidence_gaps',
      'evidence',
      'limitations',
    ];
  }
  if (spec.format === 'investment_memo' && spec.memoKind === 'positioning') {
    return [
      'executive_conclusion',
      'executive_view',
      'financial_dashboard',
      'capex_monetization',
      'government_contracts',
      'value_chain',
      'lobbying_policy',
      'competition',
      'risk_assessments',
      'scenarios',
      'evidence_gaps',
      'evidence',
      'limitations',
    ];
  }
  if (spec.format === 'investment_memo') {
    return [
      'executive_conclusion',
      'risk_assessments',
      'financial_dashboard',
      'ownership',
      'competition',
      'scenarios',
      'risk_chain',
      'evidence',
      'limitations',
    ];
  }
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
 * The research specification for a ping.
 * @param {object} understood  understandQuery() output
 * @param {{ query?: string, resolution?: object, depth?: 'quick'|'standard'|'deep', now?: Date }} opts
 */
export function buildResearchSpec(
  understood,
  {
    query = '',
    resolution = {},
    depth = 'standard',
    now = new Date(),
    classification = null,
    fund = null,
  } = {},
) {
  const text = String(query || understood?.raw || understood?.corrected || '');
  /* The classifier's coverage check passes its own result in, so the spec
     never re-classifies (and never recurses). */
  const signal = memoSignal(classification || classifyCore(text, { understood }));
  /* Sonar for organizations (Nov 2026): a fund fit run about a company is
     always a memo, assessed against the fund's mandate (`fund`, from the
     route; never from the question). */
  const fundFit = Boolean(fund) && resolution.subject?.kind === 'company';
  if (fundFit && !signal.angles.length) {
    signal.angles = DEEP_ANGLES.filter((a) => FUND_FIT_ANGLES.includes(a.id)).map((a) => ({
      id: a.id,
      label: a.label,
    }));
  }
  const memo = fundFit || isInvestmentMemo(text, resolution.subject, signal);
  const domains = memo
    ? withMemoDomains(scoreDomains(text, understood), signal.angles)
    : scoreDomains(text, understood);
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
    format: memo ? 'investment_memo' : 'report',
    /* Nov 2026: a memo answers either "what could go wrong" (risk) or "how
       does the company capture value" (positioning). */
    memoKind: fundFit
      ? 'fund_fit'
      : memo
        ? isPositioningQuestion(text)
          ? 'positioning'
          : 'risk'
        : null,
    fund: fundFit ? fund : null,
    angles: signal.angles,
    objective: {
      primary: fundFit
        ? 'assess_fund_fit'
        : memo
          ? isPositioningQuestion(text)
            ? 'assess_positioning'
            : 'risk_assessment'
          : rankMatch
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
