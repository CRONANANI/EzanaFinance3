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
 * Attachments the question asks for, deduplicated by capability (one Fundamental Analysis
 * however many ways the question says it). Each carries origin 'auto', the subject text,
 * and the question's explicit parameters over the defaults.
 */
export function inferComposition(question, { semanticMeasure = null } = {}) {
  const q = String(question || '');
  if (q.trim().length < 6) return { subject: null, attachments: [] };
  const relation = extractRelation(q);
  /* Sonar 6.0 (Nov 28 2026): institutional ownership is decided by the canonical intent's
     slots (holder, institution class, measure), not by phrase: "stocks owned by Nancy
     Pelosi that are also owned the most by investment firms" and "...most owned by
     investment firms" attach the same analysis with the same metric. A measure the
     analysis cannot compute (ownership percentage, lowest first, recent trades only) is
     never attached as a different ranking. */
  const intent = canonicalIntent(q, { semanticMeasure });
  let caps = OPS.filter((o) => o.re.test(q)).map((o) => o.capability);
  if (intent.family === 'institutional_ownership') {
    if (intent.unsupported) caps = caps.filter((c) => c !== 'institutional-ownership');
    else if (!caps.includes('institutional-ownership')) caps.push('institutional-ownership');
  } else if (intent.family === 'congressional_overlap') {
    caps = caps.filter((c) => c !== 'institutional-ownership');
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
