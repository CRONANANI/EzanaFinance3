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

const WORD_NUM = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  twelve: 12,
  fifteen: 15,
  twenty: 20,
  'twenty five': 25,
};
const NUM = `(\\d{1,3}|${Object.keys(WORD_NUM).join('|')})`;
const toNum = (s) => {
  if (s == null) return null;
  const t = String(s).toLowerCase().trim();
  if (WORD_NUM[t] != null) return WORD_NUM[t];
  const v = Number(t);
  return Number.isFinite(v) ? v : null;
};

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
];

/** Explicit numbers in the question. */
export function extractParams(question) {
  const q = String(question || '');
  const out = {};
  const top = q.match(new RegExp(`\\b(?:top|largest|biggest)\\s+${NUM}\\b`, 'i'));
  if (top) out.top_n = toNum(top[1]);
  const years = q.match(
    new RegExp(
      `\\b(?:over|for|across|during)?\\s*(?:the\\s+)?(?:last|past|previous)?\\s*${NUM}[- ]years?\\b`,
      'i',
    ),
  );
  if (years) out.years = toNum(years[1]);
  const hold = q.match(
    new RegExp(
      `\\bhold(?:ing)?(?: (?:for|each|them|positions|it|every position)){0,2}\\s+${NUM}\\s+days?\\b`,
      'i',
    ),
  );
  if (hold) out.hold_days = toNum(hold[1]);
  const wacc = q.match(/\b(?:wacc|discount rate)\s+(?:of\s+)?(\d{1,2}(?:\.\d+)?)\s?%/i);
  if (wacc) out.wacc_pct = Number(wacc[1]);
  return out;
}

/* Subject patterns, most specific first. The capture is the subject's name. */
const SUBJECT_PATTERNS = [
  /\b(?:stocks|holdings|positions|companies|shares)\s+(?:that\s+)?(.{2,60}?)\s+(?:owns|holds|has|is holding)\b/i,
  /\b(?:follows?|following|copy(?:ing)?|mirror(?:ing)?)\s+(.{2,60}?)'s?\s+(?:publicly\s+)?(?:disclosed\s+)?(?:purchases|buys|trades|holdings|portfolio)/i,
  /\b(?:of|from|in)\s+(.{2,60}?)'s?\s+(?:top|largest|biggest|disclosed|13f|current|latest)?\s*(?:\d+\s+)?(?:holdings|stocks|positions|portfolio|purchases)/i,
  /\b([A-Z][\w.&-]*(?:\s+[A-Z][\w.&-]*){0,4})'s\s+(?:top|largest|biggest|disclosed|13f|current|latest)?\s*(?:\d+\s+)?(?:holdings|stocks|positions|portfolio|purchases|fundamentals|financials|valuation)/,
  /\b(?:fundamentals?|financials|valuation|dcf|intrinsic value)\s+(?:analysis\s+)?(?:of|for|on)\s+([A-Z$][\w.&-]*(?:\s+[A-Z][\w.&-]*){0,4})/,
  /\b(?:analy[sz]e|value)\s+([A-Z$][\w.&-]*(?:\s+[A-Z][\w.&-]*){0,4})(?:'s)?\b/,
  /\b(?:of|for|on)\s+([A-Z$][\w.&-]*(?:\s+[A-Z][\w.&-]*){0,4})\b/,
];
/* Verbs a capitalised capture can start with ("Analyze BlackRock's ..."). */
const LEAD_VERB =
  /^(?:please\s+)?(?:analy[sz]e|backtest|back-test|value|run|give me|compare|evaluate|assess|review|show me|test)\s+/i;

const STOP_SUBJECT = /^(the|a|an|their|his|her|its|my|our|top|largest|biggest|this|that)$/i;

/** The question's subject as text, or null. */
export function extractSubject(question) {
  const q = String(question || '').trim();
  for (const re of SUBJECT_PATTERNS) {
    const m = q.match(re);
    if (!m) continue;
    let s = m[1]
      .replace(LEAD_VERB, '')
      .replace(/^both\s+/i, '')
      .replace(/^(?:the\s+)?(?:top|largest|biggest)\s+\S+\s+/i, '')
      .replace(/\s+(?:and|then|over|for|with)\b.*$/i, '')
      .replace(/['’]s$/i, '')
      .replace(/[,.;:!?]+$/, '')
      .trim();
    if (!s || STOP_SUBJECT.test(s) || s.length < 2) continue;
    return s;
  }
  return null;
}

/* ── Sonar 5.0: two-entity holdings relationships (Nov 24 2026) ───────────
   "Fundamental analysis of the shares both Nancy Pelosi and BlackRock hold", "stocks
   Pelosi owns that BlackRock also owns", "compare Pelosi's portfolio with BlackRock's top
   ten": the question names two holders and asks for their overlap (or a comparison).
   Read deterministically: two named entities plus overlap or comparison language. The
   names are only text here; resolution decides whether each one holds securities. */

const OVERLAP_RE =
  /\b(both|in common|common (?:stocks?|equities|holdings|positions|shares|names|companies)|overlap(?:s|ping)?|shared (?:stocks?|equities|holdings|positions|names)|also (?:has|have|holds?|owns?)|that .{1,40}? also\b|appear(?:s|ing)? in (?:both|each))\b/i;
const COMPARE_RE = /\b(compare|comparison|versus|vs\.?|against)\b/i;
const NAME_RE = /\b([A-Z][\w.&'’-]*(?:\s+(?:of\s+)?[A-Z][\w.&'’-]*){0,3})\b/g;
/* Capitalised words that are not names (question openers, products, finance terms). */
const NOT_NAME =
  /^(Can|Could|Would|Will|Should|Do|Does|Did|Is|Are|Was|What|Which|Who|Whose|How|Why|When|Where|Find|Show|Give|List|Compare|Run|Analy[sz]e|Please|Fundamental|Fundamentals|Stocks?|Shares?|Holdings?|Equities|Companies|I|The|A|An|And|Then|Top|DCF|EzanaQL|Sonar|Ezana|SEC|ETF|FY|Q[1-4]|US|U\.S\.)$/;

function namesIn(q) {
  const out = [];
  for (const m of q.matchAll(NAME_RE)) {
    let n = m[1].replace(/['’]s?$/, '').trim();
    const words = n.split(/\s+/);
    while (words.length && NOT_NAME.test(words[0])) words.shift();
    n = words.join(' ');
    if (!n || NOT_NAME.test(n) || n.length < 3) continue;
    if (!out.some((x) => x.name.toLowerCase() === n.toLowerCase()))
      out.push({ name: n, index: m.index + m[1].indexOf(n) });
  }
  return out;
}

/* Words that end a holder's name in a paired phrase (verbs, scope, possessive). */
const NAME_END =
  /\s+(?:also|both|each|has|have|had|hold|holds|held|own|owns|owned|is|are|in|on|at|by|with|for|from|top|largest|biggest|portfolio|portfolios|positions?|holdings?|stocks?|shares?|equities|book)\b.*$/i;
const NAME_LEAD =
  /^(?:the\s+)?(?:shares?|stocks?|equities|holdings?|positions?|companies|names)?\s*(?:that|which|both|do|does|did|of|between)?\s*/i;
const PAIRS = [
  /\bboth\s+(.{2,60}?)\s+(?:(?:has|have|holds?|owns?)\s+)?and\s+(.{2,60}?)(?=\s+(?:also\s+)?(?:has|have|hold|holds|own|owns|in|both)\b|[?.,]|$)/i,
  /\b(?:that|which|do|does|did|of|between)\s+(.{2,60}?)\s+and\s+(.{2,60}?)(?=\s+(?:both|each|all|also|have|has|hold|holds|own|owns|share|in common)\b|['’]s?\b|[?.,]|$)/i,
  /\bby\s+both\s+(.{2,60}?)\s+and\s+(.{2,60}?)(?=\s+in\b|[?.,]|$)/i,
];
const cleanName = (raw) => {
  let n = String(raw || '')
    .replace(NAME_LEAD, '')
    .replace(NAME_END, '')
    .replace(/['’]s?$/, '')
    .replace(/[^\w.&' -]+/g, ' ')
    .trim();
  n = n.replace(/\s+/g, ' ');
  if (!n || n.length < 3 || n.split(' ').length > 5 || NOT_NAME.test(n)) return null;
  /* Title case for display; resolution matches either way. */
  return n.replace(/\b([a-z])/g, (c) => c.toUpperCase());
};
function pairedNames(q) {
  for (const re of PAIRS) {
    const m = q.match(re);
    if (!m) continue;
    const a = cleanName(m[1]);
    const b = cleanName(m[2]);
    if (a && b && a.toLowerCase() !== b.toLowerCase())
      return [
        { name: a, index: m.index + m[0].indexOf(m[1]) },
        { name: b, index: m.index + m[0].indexOf(m[2]) },
      ];
  }
  return [];
}

/**
 * The question's two-holder relationship, or null:
 *   { op: 'intersect' | 'compare', left, right, topN, topNFor }
 * left is the question's first holder (the research subject), right the second. topN is
 * a "top N" scope and topNFor the holder it qualifies (the nearest name before it, or
 * "its" referring back to the latest name), so "BlackRock's top 10" never becomes the
 * analysis's own count.
 */
export function extractRelation(question) {
  const q = String(question || '');
  const overlap = OVERLAP_RE.test(q);
  const compare = !overlap && COMPARE_RE.test(q);
  if (!overlap && !compare) return null;
  let names = namesIn(q);
  /* Typed in lower case ("nancy pelosi and blackrock"), the names are read from the
     phrase that pairs them instead of from capitals. */
  if (names.length < 2) names = pairedNames(q);
  if (names.length < 2) return null;
  const [left, right] = names;
  let topN = null;
  let topNFor = null;
  const top = q.match(new RegExp(`\\b(?:top|largest|biggest)\\s+${NUM}\\b`, 'i'));
  if (top) {
    topN = toNum(top[1]);
    const before = names.filter((n) => n.index < top.index);
    topNFor = (before[before.length - 1] || right).name;
  }
  return {
    op: overlap ? 'intersect' : 'compare',
    left: left.name,
    right: right.name,
    topN,
    topNFor,
  };
}

/**
 * Attachments the question asks for, deduplicated by capability (one Fundamental Analysis
 * however many ways the question says it). Each carries origin 'auto', the subject text,
 * and the question's explicit parameters over the defaults.
 */
export function inferComposition(question) {
  const q = String(question || '');
  if (q.trim().length < 6) return { subject: null, attachments: [] };
  const caps = OPS.filter((o) => o.re.test(q)).map((o) => o.capability);
  const relation = extractRelation(q);
  if (!caps.length) return { subject: relation?.left || null, attachments: [], relation };
  /* A two-holder question's subject is its first holder; its "top N" scopes a holdings
     set, not the analysis (Sonar 5.0). */
  const subjectText = relation?.left || extractSubject(q);
  const params = extractParams(q);
  if (relation?.topN != null) delete params.top_n;
  const subject = subjectText ? { text: subjectText } : null;
  const attachments = [...new Set(caps)].map((capability) => {
    const own = {};
    for (const [k, v] of Object.entries(params)) {
      if (v == null) continue;
      if (capability === 'backtesting' && k === 'top_n') continue;
      if (capability !== 'backtesting' && k === 'hold_days') continue;
      if (capability === 'fundamental-analysis' && (k === 'years' || k === 'wacc_pct')) continue;
      if (capability === 'dcf-valuation' && k === 'years' && caps.includes('backtesting')) continue;
      /* A count belongs to the DCF only when the DCF is the question's one analysis. */
      if (capability === 'dcf-valuation' && k === 'top_n' && caps.length > 1) continue;
      own[k] = v;
    }
    /* "Run a DCF on the top 10 holdings" asks for 10 companies, but a DCF run values at
       most 5: keep the reader's number and let validation say so, never cut it silently. */
    const a = makeAnalysis(capability, { origin: 'auto', subject, params: own });
    /* It analyses the set the question describes (the overlap), not the first holder. */
    return relation ? { ...a, wantsSet: true } : a;
  });
  return { subject: subjectText, attachments, relation };
}

/** A question changed enough that inferred attachments must be recomputed. */
export function compositionKey(question) {
  const { subject, attachments, relation } = inferComposition(question);
  return `${(subject || '').toLowerCase()}|${attachments.map((a) => a.capability).join(',')}|${relation ? `${relation.op}:${relation.right}:${relation.topN ?? ''}` : ''}`;
}
