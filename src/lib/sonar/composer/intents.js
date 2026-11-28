/**
 * Research Composer: automatic composition (Nov 22 2026).
 *
 * Reads a Sonar question for analytical operations the registry can run and returns them
 * as attachments with origin 'auto', their parameters taken from the question. It works
 * by intent, not by dataset: a question that only needs ordinary retrieval ("Who is Nancy
 * Pelosi?", "Is Turkey's lira under pressure?") produces no attachments.
 *
 * Deterministic and client-safe: the composer runs it as the reader types. The subject it
 * finds is only text here; /api/sonar/composer resolves it (a 13F filer, a member of
 * Congress or a company) and supplies the data-dependent limits.
 *
 * Parameter precedence (spec 7): explicit values in the question win over the defaults.
 */

import { makeAnalysis } from './registry.js';
import { extractParams, extractSubject, extractRelation } from './subject.js';
import { canonicalIntent, composerMetric } from '../semantic/canonical-intent.js';
import { SCREEN_MEASURES, universeFor } from './screen.js';
import { planSeed } from './stages.js';
import { extractRequirements, screenFilters } from '../execution/requirements.js';
import { macroCountries } from './macro.js';

/* Composition measure → comparison metric (filed ratios only). */
const COMPARE_METRIC = {
  pe_ratio: 'pe',
  ps_ratio: 'ps',
  earnings_yield: 'earnings_yield',
  market_cap: 'market_cap',
  revenue_growth: 'revenue_growth',
  earnings_growth: 'earnings_growth',
  margin: 'operating_margin',
  free_cash_flow: 'fcf_margin',
  debt: 'debt_to_equity',
};

const WINDOW_DAYS = { day: 1, week: 7, month: 365 / 12, quarter: 91, year: 365 };

/* Sonar 6.4: macro questions (inflation trend, real policy rate, policy changes). */
const MACRO_MEASURES = [
  ['real_rate', /\breal\s+(?:policy\s+|interest\s+)?rates?\b/i],
  [
    'policy_changes',
    /\b(?:cut|cuts|cutting|hike|hikes|hiking|rais(?:e|ed|ing)|lower(?:ed|ing)?|chang(?:e|ed|es))\b.{0,25}\brates?\b|\brate\s+(?:cuts?|hikes?|decisions?|changes?)\b/i,
  ],
  ['inflation', /\binflation\b|\bcpi\b|\bconsumer prices?\b/i],
  [
    'policy_rate',
    /\b(?:policy|benchmark|interest|bank)\s+rates?\b|\bcentral bank\b|\bfed funds\b/i,
  ],
];

/**
 * The macro-indicators analysis a question asks for, or null. Needs a country Ezana can
 * name and a measure the executor computes; an unknown place attaches nothing.
 */
export function macroAttachment(question, intent = null) {
  const q = String(question || '');
  if (intent?.family) return null;
  const measures = MACRO_MEASURES.filter(([, re]) => re.test(q)).map(([id]) => id);
  if (!measures.length) return null;
  const countries = macroCountries(q);
  if (!countries.length) return null;
  if (measures.includes('real_rate') || measures.includes('policy_changes'))
    measures.push('policy_rate');
  if (measures.includes('real_rate')) measures.push('inflation');
  return makeAnalysis('macro-indicators', {
    origin: 'auto',
    subject: null,
    params: { countries: [...new Set(countries)].slice(0, 8), measures: [...new Set(measures)] },
  });
}

/**
 * Sonar 6.2: the public-data analyses a canonical intent asks for (a screen, a company
 * comparison, a government-dependence read). Only an intent the executor can compute is
 * attached; an unsupported measure or universe stays unsupported, never substituted.
 */
export function analyticsAttachment(intent) {
  if (!intent || intent.unsupported) return null;
  const comp = intent.composition;
  /* Nov 28 2026: a screen with no sector or companies whose first condition can list
     companies itself (congressional purchases, insider purchases, new federal awards) is
     seeded from that dataset, and every later stage runs on the verified survivors. "In the
     same period" contracts are then read as awards signed inside the screen window. */
  if (intent.family === 'multi_stage_screen' && !comp?.universe && comp?.filters?.length) {
    const t = comp.time;
    const windowDays =
      t?.kind === 'window' && WINDOW_DAYS[t.unit] ? Math.round(t.n * WINDOW_DAYS[t.unit]) : null;
    const asked = comp.filters
      .filter((f) => SCREEN_MEASURES[f.metric])
      .map((f) => ({
        metric:
          windowDays && f.metric === 'gov_contract_value' ? 'gov_contract_value_window' : f.metric,
        op: f.op,
        ...(f.value != null ? { value: f.value } : {}),
        unit: f.unit || null,
      }));
    const { seed } = planSeed(asked, SCREEN_MEASURES);
    if (!seed) return null;
    const explicitRank = (comp.measures || []).find((m) => SCREEN_MEASURES[m]) || null;
    /* "Rank them" with no measure: by the last stated condition with a magnitude (the
       chain's final signal), stated in the report as the basis. */
    const rank =
      explicitRank ||
      [...asked].reverse().find((f) => f.op !== 'exists' || f.metric !== seed.metric)?.metric ||
      seed.metric;
    return makeAnalysis('financial-screen', {
      origin: 'auto',
      subject: null,
      params: {
        universe_from: seed.source,
        filters: asked,
        rank_by: rank,
        direction: comp.direction === 'ascending' ? 'ascending' : 'descending',
        ...(windowDays ? { window_days: windowDays } : {}),
      },
    });
  }
  if (intent.family === 'multi_stage_screen' && comp?.universe?.type === 'sector') {
    const sector = comp.universe.id;
    if (universeFor(sector).kind === 'unsupported') return null;
    const filters = (comp.filters || [])
      .filter((f) => SCREEN_MEASURES[f.metric])
      .map((f) => ({ metric: f.metric, op: f.op, value: f.value, unit: f.unit || null }));
    const rank = (comp.measures || []).find((m) => SCREEN_MEASURES[m]) || null;
    const t = comp.time;
    const windowDays =
      t?.kind === 'window' && WINDOW_DAYS[t.unit] ? Math.round(t.n * WINDOW_DAYS[t.unit]) : null;
    return makeAnalysis('financial-screen', {
      origin: 'auto',
      subject: null,
      params: {
        sector,
        ...(comp.universe.country ? { country: comp.universe.country } : {}),
        filters,
        rank_by: rank,
        direction: comp.direction === 'ascending' ? 'ascending' : 'descending',
        ...(windowDays ? { window_days: windowDays } : {}),
      },
    });
  }
  if (intent.family === 'company_comparison') {
    const names = [
      intent.primary_entity?.text,
      ...(intent.secondary_entities || []).map((e) => e.text),
    ].filter(Boolean);
    if (names.length < 2) return null;
    const metrics = [
      ...new Set((comp?.measures || []).map((m) => COMPARE_METRIC[m]).filter(Boolean)),
    ];
    return makeAnalysis('company-comparison', {
      origin: 'auto',
      subject: null,
      params: { company_names: names, ...(metrics.length ? { metrics } : {}) },
    });
  }
  if (intent.family === 'government_contract_dependency' && intent.primary_entity?.text) {
    return makeAnalysis('government-dependence', {
      origin: 'auto',
      subject: { text: intent.primary_entity.text },
      params: {},
    });
  }
  return null;
}

export { extractParams, extractSubject, extractRelation };

/* Who an institutional ownership question counts. */
const FIRMS = String.raw`investment\s+(?:firms?|managers?|companies|funds?)|institutions?|institutional\s+(?:investors?|managers?|holders?)|(?:hedge|mutual|pension|index)\s+funds?|funds|fund\s+managers?|money\s+managers?|asset\s+managers?|wall\s+street(?:\s+firms)?|big\s+money|13f\s+(?:filers?|managers?)`;

/* Operation detectors: each matches the analytical intent, not a dataset name. */
const OPS = [
  {
    capability: 'fundamental-analysis',
    re: /\b(fundamental(s| analysis)?|financial (performance|health|statements|strength)|balance sheets?|(analy[sz]e|review) (the |their |its )?financials)\b/i,
  },
  {
    capability: 'dcf-valuation',
    re: /\b(dcfs?|discounted[- ]cash[- ]flows?|intrinsic values?)\b/i,
  },
  {
    capability: 'backtesting',
    re: /\b(back-?test(s|ing|ed)?|how would (that|this|a|the) [\w\s'-]{0,40}(strategy|portfolio) have (performed|done)|simulate (the )?(historical )?returns|strategy that follows|following (her|his|their|[\w.'-]+'s) (disclosed )?(purchases|buys|trades))\b/i,
  },
  {
    /* Nov 27 2026: "what stocks does Nancy Pelosi own that are most owned by investment
       firms", "which of BlackRock's holdings are most widely held by hedge funds". */
    capability: 'institutional-ownership',
    re: new RegExp(
      [
        String.raw`\b(?:most|widely|heavily|broadly|commonly)\s+(?:owned|held)\s+(?:by|among)\s+(?:the\s+)?(?:${FIRMS})`,
        String.raw`\b(?:owned|held)\s+by\s+(?:the\s+)?(?:most|many|more)\s+(?:${FIRMS})`,
        String.raw`\b(?:popular|crowded)\s+(?:with|among)\s+(?:${FIRMS})`,
        String.raw`\b(?:${FIRMS})\s+(?:own|hold)\s+(?:the\s+)?most\b`,
        String.raw`\binstitutional\s+(?:ownership|holders?|participation|breadth)\b`,
        String.raw`\b(?:number|count)\s+of\s+(?:13f\s+)?(?:${FIRMS})\s+(?:that\s+)?(?:own|hold|holding|owning)`,
        String.raw`\b13f\s+(?:managers|filers|ownership)\s+(?:own|hold|of|for|in)\b`,
        String.raw`\b(?:added|gained|lost)\s+(?:the\s+)?(?:most|fewest)\s+(?:13f\s+)?(?:${FIRMS}|holders|managers)`,
      ].join('|'),
      'i',
    ),
  },
];

/** The ranking an institutional ownership question asks for. */
export function ownershipMetric(question) {
  const q = String(question || '');
  if (
    /\b(?:added|gained|increase[sd]?|rising|new)\s+(?:the\s+)?(?:most\s+)?(?:13f\s+)?(?:managers|institutions|holders|investment firms|funds)\b|\bchange in (?:institutional|13f|managers)/i.test(
      q,
    )
  )
    return 'change';
  if (
    /\b(?:by|in)\s+(?:dollar|reported|aggregate|total|market)?\s*value\b|\bdollars?\s+(?:held|invested)\b/i.test(
      q,
    )
  )
    return 'value';
  return 'managers';
}

/**
 * Sonar 6.5: the question's own requirements (execution/requirements.js) complete the screen
 * the canonical intent produced, or produce one when the intent produced none. A condition
 * the intent dropped ("traded by members of Congress", "growing institutional
 * participation", "declining operating margins") becomes a filter; a condition no executor
 * computes stays in params.requirements, so the fulfillment check reports it instead of it
 * vanishing. An explicit screen condition is never turned into a ranking.
 */
export function requirementsScreen(question, analytic, intent = null) {
  const reqs = extractRequirements(question);
  const computable = screenFilters(reqs.conditions);
  const screenable = analytic?.capability === 'financial-screen';
  if (analytic && !screenable) return analytic;
  if (
    !screenable &&
    computable.length < 2 &&
    !(computable.length === 1 && reqs.conditions.length >= 2)
  )
    return analytic;
  if (!reqs.conditions.length) return analytic;
  const base = screenable ? analytic : null;
  const filters = [...(base?.params.filters || [])];
  for (const f of computable)
    if (
      !filters.some(
        (x) =>
          x.metric === f.metric ||
          (x.metric.startsWith('gov_contract_value') && f.metric.startsWith('gov_contract_value')),
      )
    )
      filters.push(f);
  const params = { ...(base?.params || {}), filters, requirements: reqs.requirements };
  /* "Department of Defense contracts" names an awarding agency, not a defense-sector
     universe. When the question names no sector, the screen is seeded from its own
     conditions instead (the agency requirement stays visible as unsupported). */
  if (base && params.sector === 'defense' && reqs.universe.kind === 'unspecified') {
    const { seed } = planSeed(filters, SCREEN_MEASURES);
    if (seed) {
      delete params.sector;
      params.universe_from = seed.source;
      if (!params.window_days) params.window_days = 365;
    }
  }
  if (!base) {
    if (reqs.universe.kind === 'sector' && universeFor(reqs.universe.id).kind !== 'unsupported')
      params.sector = reqs.universe.id;
    else if (reqs.universe.kind !== 'org_holdings') {
      const { seed } = planSeed(filters, SCREEN_MEASURES);
      /* No sector and no condition that can list companies: the screen is still planned, so
         the reader is asked for a universe instead of the conditions disappearing. */
      if (seed) params.universe_from = seed.source;
    } else return analytic;
    const dated = filters.some((f) =>
      ['congress', 'insider', 'contracts_window'].includes(SCREEN_MEASURES[f.metric]?.source),
    );
    if (dated && !params.window_days) params.window_days = 365;
    params.rank_by =
      reqs.ranking?.measure && SCREEN_MEASURES[reqs.ranking.measure]
        ? reqs.ranking.measure
        : [...filters].reverse().find((f) => f.op !== 'exists')?.metric ||
          filters[0]?.metric ||
          null;
    params.direction = 'descending';
  }
  /* The seeding condition is evaluated first (it lists the companies the others read). */
  if (params.universe_from) {
    const i = filters.findIndex((f) => SCREEN_MEASURES[f.metric]?.source === params.universe_from);
    if (i > 0) filters.unshift(...filters.splice(i, 1));
  }
  /* "Traded by Congress" asked as a condition is a filter, not a ranking. */
  if (
    params.rank_by === 'congress_holders' &&
    filters.some((f) => f.metric === 'congress_holders') &&
    !reqs.ranking
  )
    params.rank_by =
      [...filters].reverse().find((f) => f.metric !== 'congress_holders' && f.op !== 'exists')
        ?.metric || params.rank_by;
  return makeAnalysis('financial-screen', { origin: 'auto', subject: null, params });
}

/**
 * Attachments the question asks for, deduplicated by capability (one Fundamental Analysis
 * however many ways the question says it). Each carries origin 'auto', the subject text,
 * and the question's explicit parameters over the defaults.
 */
export function inferComposition(
  question,
  { semanticMeasure = null, measureOverride = null } = {},
) {
  const q = String(question || '');
  if (q.trim().length < 6) return { subject: null, attachments: [] };
  const relation = extractRelation(q);
  /* Sonar 6.0 (Nov 28 2026): institutional ownership is decided by the canonical intent's
     slots (holder, institution class, measure), not by phrase: "stocks owned by Nancy
     Pelosi that are also owned the most by investment firms" and "...most owned by
     investment firms" attach the same analysis with the same metric. A measure the
     analysis cannot compute (ownership percentage, lowest first, recent trades only) is
     never attached as a different ranking. */
  const intent = canonicalIntent(q, { semanticMeasure, measureOverride });
  let caps = OPS.filter((o) => o.re.test(q)).map((o) => o.capability);
  if (intent.family === 'institutional_ownership') {
    if (intent.unsupported) caps = caps.filter((c) => c !== 'institutional-ownership');
    else if (!caps.includes('institutional-ownership')) caps.push('institutional-ownership');
  } else if (intent.family === 'congressional_overlap') {
    caps = caps.filter((c) => c !== 'institutional-ownership');
  }
  const analytic =
    requirementsScreen(q, analyticsAttachment(intent), intent) || macroAttachment(q, intent);
  if (analytic) {
    return {
      subject: analytic.subject?.text || null,
      attachments: [analytic],
      relation: null,
      intent,
    };
  }
  if (!caps.length) return { subject: relation?.left || null, attachments: [], relation, intent };
  /* A two-holder question's subject is its first holder; its "top N" scopes a holdings
     set, not the analysis (Sonar 5.0). */
  const subjectText =
    relation?.left ||
    (intent.family === 'institutional_ownership' ? intent.primary_entity?.text : null) ||
    extractSubject(q);
  const params = extractParams(q);
  if (relation?.topN != null) delete params.top_n;
  const subject = subjectText ? { text: subjectText } : null;
  const attachments = [...new Set(caps)].map((capability) => {
    const own = {};
    for (const [k, v] of Object.entries(params)) {
      if (v == null) continue;
      if (capability === 'backtesting' && k === 'top_n') continue;
      if (capability === 'institutional-ownership' && k !== 'top_n') continue;
      if (capability !== 'backtesting' && k === 'hold_days') continue;
      if (capability === 'fundamental-analysis' && (k === 'years' || k === 'wacc_pct')) continue;
      if (capability === 'dcf-valuation' && k === 'years' && caps.includes('backtesting')) continue;
      /* A count belongs to the DCF only when the DCF is the question's one analysis. */
      if (capability === 'dcf-valuation' && k === 'top_n' && caps.length > 1) continue;
      own[k] = v;
    }
    /* "Run a DCF on the top 10 holdings" asks for 10 companies, but a DCF run values at
       most 5: keep the reader's number and let validation say so, never cut it silently. */
    if (capability === 'institutional-ownership')
      own.metric = composerMetric(intent) || ownershipMetric(q);
    const a = makeAnalysis(capability, { origin: 'auto', subject, params: own });
    /* It analyses the set the question describes (the overlap), not the first holder. */
    return relation ? { ...a, wantsSet: true } : a;
  });
  return { subject: subjectText, attachments, relation, intent };
}

/** A question changed enough that inferred attachments must be recomputed. */
export function compositionKey(question) {
  const { subject, attachments, relation } = inferComposition(question);
  return `${(subject || '').toLowerCase()}|${attachments.map((a) => a.capability).join(',')}|${relation ? `${relation.op}:${relation.right}:${relation.topN ?? ''}` : ''}`;
}
