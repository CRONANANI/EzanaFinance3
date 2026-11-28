/**
 * Sonar Semantic Intelligence 6.0 (Nov 28 2026): the Canonical Research Intent.
 *
 * One typed, versioned description of what a question asks Sonar to investigate: the
 * subject and its role, the universe being ranked, the universe it is compared against,
 * the measure, direction, time scope, the operations that have to run, the outputs the
 * answer owes, and every default that was filled in. The Research Composer, the research
 * spec and the route all read this one object, so two wordings of the same question get
 * the same investigation, and two questions that differ in a material way never merge.
 *
 * Why it exists: "Tell me what stocks owned by Nancy Pelosi are also owned the most by
 * investment firms" matched none of the composer's phrase detectors ("owned the most by"
 * was not one of them), so it got no Institutional Ownership Analysis and fell through to
 * a generic disclosure report, while "...most owned by investment firms" ran the ranking.
 * The fix is not one more phrase: the question is read into slots (who holds, compared
 * against whom, measured how, which way, over what period), and the operation follows
 * from the slots.
 *
 * Stages (spec Part 3):
 *   1 normalize      politeness, typos, quote marks, holder-class synonyms -> tokens
 *   2 subject        the holder's name as text (resolution happens server side;
 *                    withResolution() adds the verified id, never a guessed one)
 *   3 slots          comparison universe, measure, direction, subject universe, time,
 *                    top N, families outside ownership
 *   4 candidates     optional embedding retrieval (semantic-equivalence.js) only fills a
 *                    measure the text leaves open, and only when the slots validate it
 *   5 validate       capability support: an unsupported measure (ownership percentage,
 *                    lowest-first, a transactions universe) is recorded as unsupported,
 *                    never silently swapped for a supported one
 *   6 canonical      the typed intent, its canonical paraphrase, plan signature, task
 *                    graph, report family and fulfillment contract
 *
 * Deterministic, client-safe, relative imports only (runs in node tests unchanged).
 */

import { extractParams, extractRelation, extractSubject, toNum, NUM } from '../composer/subject.js';
import {
  composeIntent,
  compositionDatasets,
  compositionOperations,
  isSectorText,
} from './compositional.js';
import { GICS_FOR, SCREEN_MEASURES, SCREEN_UNSUPPORTED } from '../composer/screen.js';

export const CANONICAL_INTENT_VERSION = 1;
/** Methodology of the institutional ownership calculation (bump when ownership.js changes). */
export const OWNERSHIP_METHOD_VERSION = 'own-13f-v1';

/* ── Stage 1: normalization ─────────────────────────────────────────── */

const TYPOS = [
  [/\binst(?:itu|ui|i)t?(?:i|u)?onal\b/g, 'institutional'],
  [/\binstitional\b/g, 'institutional'],
  [/\binsitutional\b/g, 'institutional'],
  [/\binstutional\b/g, 'institutional'],
  [/\binvestmetn\b/g, 'investment'],
  [/\bstoks\b/g, 'stocks'],
  [/\bowend\b/g, 'owned'],
  [/\bholdigns\b/g, 'holdings'],
  [/\bmangers\b/g, 'managers'],
  [/\bportfolo\b/g, 'portfolio'],
];

const POLITE = [
  /^\s*(?:hey|hi|hello|ok|okay|so)\b[\s,]*/,
  /\b(?:can|could|would|will)\s+you\s+(?:please\s+)?(?:tell|show|give|let)\s+me\b(?:\s+know)?/g,
  /\b(?:i\s+(?:want|would like|need|wanna)\s+to\s+(?:know|see|find out))\b/g,
  /\b(?:i'?m\s+(?:curious|wondering))\b(?:\s+(?:about|if|whether))?/g,
  /\b(?:please|kindly|just|basically|actually)\b/g,
  /^\s*(?:tell|show|give)\s+me\b/,
];

/* Holder classes. Matched on the lower-cased text; the token replaces the phrase. */
const INST_RE =
  /\b(?:13f\s+(?:reporting\s+)?(?:filers?|managers?|holders?|institutions?)|(?:reporting\s+)?13f\s+managers?|reporting\s+managers?|investment\s+(?:firms?|managers?|companies|funds?|houses?)|institutional\s+(?:investors?|managers?|holders?|owners?|portfolios?)|institutional(?=\s+(?:ownership|participation|breadth|interest|demand|holdings?|support|popularity|backing|money|capital|dollars|positions?|stakes?|percent\w*|manager))|institutionally|institutions?|(?:hedge|mutual|pension|index)\s+funds?|fund\s+managers?|(?:money|asset|portfolio)\s+managers?|wall\s+street(?:\s+firms?)?|big\s+money|smart\s+money|funds)\b/g;
const CONGRESS_RE =
  /\b(?:(?:other\s+)?members?\s+of\s+congress|congress(?:men|women|people|ional\s+members)?|lawmakers?|senators?|representatives|politicians?|house\s+members)\b/g;
const INSIDER_RE = /\b(?:corporate\s+)?(?:insiders?|executives?|officers\s+and\s+directors)\b/g;

/* Domain words a typo is corrected towards (7 letters or more; one transposition,
   insertion, deletion or substitution away). Names are never corrected. */
const VOCAB = [
  'institutional',
  'institutions',
  'institution',
  'investment',
  'investments',
  'investors',
  'government',
  'governments',
  'federal',
  'semiconductor',
  'semiconductors',
  'inflation',
  'dependent',
  'dependence',
  'dependency',
  'reliant',
  'margins',
  'fundamental',
  'fundamentals',
  'prediction',
  'predictions',
  'portfolio',
  'holdings',
  'managers',
  'contracts',
  'contractors',
  'lobbying',
  'sanctions',
  'currency',
  'pressure',
  'volatility',
  'accelerating',
  'disclosed',
  'estimated',
  'ownership',
  'relationship',
  'interest',
  'utilities',
  'utility',
  'revenue',
  'earnings',
  'leverage',
  'intrinsic',
  'discounted',
  'backtest',
  'performed',
  'purchases',
  'congress',
  'companies',
  'securities',
  'equities',
  'reported',
  'quarter',
  'increase',
  'decrease',
  'financial',
  'strategy',
  'infrastructure',
  'headwinds',
  'threaten',
  'exposure',
  'weakening',
  'greatest',
  'broadest',
  'popular',
];
const VOCAB_SET = new Set(VOCAB);
function oneEditApart(a, b) {
  if (Math.abs(a.length - b.length) > 1 || a === b) return false;
  if (a.length === b.length) {
    const diff = [];
    for (let i = 0; i < a.length; i += 1) if (a[i] !== b[i]) diff.push(i);
    if (diff.length === 1) return true;
    return (
      diff.length === 2 &&
      diff[1] === diff[0] + 1 &&
      a[diff[0]] === b[diff[1]] &&
      a[diff[1]] === b[diff[0]]
    );
  }
  const [s1, l1] = a.length < b.length ? [a, b] : [b, a];
  let i = 0;
  while (i < s1.length && s1[i] === l1[i]) i += 1;
  return s1.slice(i) === l1.slice(i + 1);
}
/** Lower-case words of 7+ letters one edit from a domain word, corrected. */
function fuzzyFix(text) {
  return String(text).replace(/\b[a-z]{7,}\b/g, (w) => {
    if (VOCAB_SET.has(w)) return w;
    const hit = VOCAB.find((v) => oneEditApart(w, v));
    return hit || w;
  });
}

/** Typos fixed, case kept (for subject extraction). */
function fixTypos(q) {
  let t = String(q || '');
  for (const [re, to] of TYPOS) t = t.replace(new RegExp(re.source, 'gi'), to);
  return fuzzyFix(t);
}

/** Stage 1. Lower case, straight quotes, polite filler and typos gone, holder classes tokenized. */
export function normalizeQuestion(question) {
  let t = String(question || '')
    .toLowerCase()
    .replace(/[‘’`]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
  for (const [re, to] of TYPOS) t = t.replace(re, to);
  t = fuzzyFix(t);
  for (const re of POLITE) t = t.replace(re, ' ');
  const raw = t.replace(/\s+/g, ' ').trim();
  const tokens = raw
    .replace(INST_RE, ' <inst> ')
    .replace(CONGRESS_RE, ' <congress> ')
    .replace(INSIDER_RE, ' <insiders> ')
    .replace(/\s+/g, ' ')
    .replace(/[?!.]+$/, '')
    .trim();
  return { text: raw, tokens };
}

/* ── Stage 3: slots ─────────────────────────────────────────────────── */

const DESC_RE =
  /\b(?:most|highest|greatest|broadest|widest|largest|biggest|top|heaviest|maximum|max)\b/;
const ASC_RE =
  /\b(?:least|lowest|fewest|narrowest|smallest|bottom|minimum|min|least widely|not widely)\b/;

/* Measures, most specific first. Each is tested on the tokenized text. */
const MEASURE_TESTS = [
  [
    'percentage',
    /\b(?:percent(?:age)?|%|share of (?:the )?(?:shares|float|stock)|of (?:the )?(?:float|shares outstanding|outstanding shares)|stake as a share)\b|\bownership (?:ratio|share)\b/,
  ],
  [
    'change',
    /\b(?:gain(?:ed|ing|s)?|add(?:ed|ing|s)?|lost|los(?:e|ing)|shed(?:ding)?|increas(?:e|ed|ing)|decreas(?:e|ed|ing)|ris(?:e|ing|en)|fall(?:ing|en)?|fell|grew|grow(?:ing|th)|chang(?:e|ed|es|ing)|new (?:<inst>|holders|owners)|accumulat\w*|exit(?:ed|s|ing)?|dropp?(?:ed|ing)|fewer than (?:last|a) quarter|more than (?:last|a) quarter)\b/,
  ],
  [
    'value',
    /\b(?:money|dollars?|capital|value|valued|\$|dollar[- ]weighted|aggregate (?:reported )?value|position sizes?|size of (?:their |the )?(?:stakes?|positions?)|largest stakes)\b/,
  ],
  [
    'breadth',
    /\b(?:most|least|highest|lowest|broadest|widest|narrowest|fewest)\s+(?:widely\s+|heavily\s+|broadly\s+|commonly\s+)?(?:owned|held)\b|\b(?:owned|held)\s+(?:the\s+)?(?:most|least)\b|\b(?:widely|broadly|commonly|heavily)\s+(?:owned|held)\b|\b(?:held|owned)\s+by\s+(?:the\s+)?(?:greatest|largest|highest|biggest|most|smallest|fewest|lowest)\s+(?:number|count)?\b|\b(?:number|count)\s+of\s+(?:<inst>|holders|owners|managers)\b|\b<inst>\s+(?:manager\s+|holder\s+|owner\s+)?(?:count|breadth|participation)\b|\b(?:broadest|widest|narrowest|most|least|highest|lowest)\s+<inst>\s+ownership\b|\b<inst>\s+ownership\b|\b(?:popular|crowded)\b|\bin\s+the\s+(?:most|fewest)\s+<inst>|\b(?:most|fewest|least)\s+<inst>\b|\b(?:most|fewest)\s+(?:holders|owners|managers)\b|\b<inst>\s+(?:own|hold)s?\s+(?:the\s+)?(?:most|least)\b/,
  ],
];

const TXN_RE =
  /\b(?:purchased|bought|buys|buying|purchases|sold|sells|selling|sales|traded|trades|trading)\b/;

/* Families outside institutional ownership: cue tests on the normalized text. Each needs
   every listed pattern. Kept small; the embedding stage covers paraphrases these miss and
   the planner falls back to ordinary research when none applies. */
const OTHER_FAMILIES = [
  {
    id: 'holdings_overlap',
    test: (t, ctx) => ctx.relation?.op === 'intersect',
  },
  {
    id: 'portfolio_comparison',
    test: (t, ctx) => ctx.relation?.op === 'compare',
  },
  {
    id: 'dcf_valuation',
    all: [/\b(?:dcfs?|discounted[- ]cash[- ]flows?|intrinsic value|fair value estimate)\b/],
  },
  {
    id: 'backtest',
    all: [
      /\b(?:back-?test(?:s|ing|ed)?|how would .{0,40}(?:strategy|portfolio) have (?:performed|done)|simulate .{0,20}returns|(?:copy|follow|mirror)(?:ing)? .{0,30}(?:trades|purchases|buys))\b/,
    ],
  },
  {
    id: 'fundamental_analysis',
    all: [
      /\b(?:fundamentals?|fundamental analysis|financial (?:performance|health|statements|strength)|balance sheets?|(?:analy[sz]e|review) (?:the |their |its )?financials|margins and growth)\b/,
    ],
  },
  {
    id: 'garch_volatility',
    all: [/\b(?:garch|volatility (?:model|forecast|clustering)|conditional volatility)\b/],
  },
  {
    id: 'government_contract_dependency',
    all: [
      /\b(?:government|federal|defen[cs]e|pentagon|public[- ]sector|u\.?s\.? government)\b/,
      /\b(?:revenue|sales|contracts?|business|income)\b/,
      /\b(?:depend\w*|relian\w*|reliant|rely|relies|share|portion|percent\w*|how much|exposure|exposed|concentrat\w*)\b/,
    ],
  },
  {
    id: 'government_contract_acceleration',
    all: [
      /\b(?:contracts?|awards?|obligations?)\b/,
      /\b(?:accelerat\w*|increas\w*|growing|grew|surg\w*|ramp\w*|picking up|rising)\b/,
    ],
  },
  {
    id: 'currency_pressure',
    all: [
      /\b(?:lira|peso|rupee|yen|yuan|won|real|rand|ruble|currency|fx|exchange rate)\b/,
      /\b(?:pressure|stress|weak\w*|depreciat\w*|devalu\w*|crisis|slid\w*|falling|collapse|under strain)\b/,
    ],
  },
  {
    id: 'growth_risk',
    all: [
      /\b(?:risks?|threats?|headwinds?|could go wrong|downside|vulnerab\w*|what might derail|bear case)\b/,
    ],
  },
  {
    id: 'ai_infrastructure_strategy',
    all: [
      /\b(?:ai|artificial intelligence)\b/,
      /\b(?:infrastructure|data ?cent(?:er|re)s?|capex|compute|strategy|build-?out)\b/,
    ],
  },
  { id: 'lobbying_activity', all: [/\blobby\w*\b/] },
  {
    id: 'sanctions_exposure',
    all: [/\b(?:sanction\w*|ofac|export controls?|entity list)\b/],
  },
  {
    id: 'prediction_markets',
    all: [/\b(?:prediction markets?|polymarket|kalshi|betting odds|implied probabilit\w*)\b/],
  },
  {
    id: 'echo_articles',
    all: [/\b(?:echo|ezana echo)\b/, /\b(?:articles?|stories|story|wrote|written|piece)\b/],
  },
  {
    id: 'insider_institutional_confirmation',
    all: [/<insiders>/, /<inst>/],
  },
  {
    id: 'congressional_overlap',
    all: [
      /<congress>/,
      /\b(?:overlap\w*|in common|same stocks|shared|both own|both hold|most popular|most held|most owned|widely held)\b/,
    ],
  },
];

/* Families the compositional reading produces. */
const COMPOSED_FAMILIES = new Set([
  'company_comparison',
  'multi_stage_screen',
  'macro_relationship',
  'dcf_valuation',
  'garch_volatility',
  'backtest',
  'monte_carlo',
]);
const ASSESS_LEAD = {
  government_contract_dependency: 'gov_revenue_share',
  currency_pressure: 'fx_rate',
  sanctions_exposure: 'sanctions_exposure',
  lobbying_activity: 'lobbying_spend',
  prediction_markets: 'event_probability',
};
const ASSESS_FAMILIES = new Set([
  'fundamental_analysis',
  'government_contract_dependency',
  'currency_pressure',
  'sanctions_exposure',
  'lobbying_activity',
  'prediction_markets',
]);

/* Operations, outputs and required datasets per family. Required tasks are what the plan
   may never drop; optional retrieval may vary. */
const FAMILY = {
  institutional_ownership: {
    report: 'institutional_ownership_intelligence',
    capability: 'institutional-ownership',
    datasets: ['congress_disclosures', 'sec_13f_holdings', 'security_master'],
    outputs: [
      'direct_answer',
      'eligible_holdings_count',
      'matched_13f_securities',
      'ranked_ownership_table',
      'manager_participation_chart',
      'findings',
      'methodology_and_citations',
    ],
  },
  company_comparison: {
    report: 'company_comparison',
    capability: 'company-comparison',
    datasets: ['sec_fundamentals'],
    outputs: ['direct_answer', 'comparison_table', 'leaders', 'methodology_and_citations'],
  },
  multi_stage_screen: {
    report: 'financial_screen',
    capability: 'financial-screen',
    datasets: ['ticker_sectors', 'sec_fundamentals'],
    outputs: ['direct_answer', 'screen_funnel', 'ranked_table', 'methodology_and_citations'],
  },
  government_contract_dependency: {
    report: 'government_dependence',
    capability: 'government-dependence',
    datasets: ['usaspending_contract_awards', 'sec_fundamentals'],
    outputs: [
      'direct_answer',
      'obligations_by_year',
      'agency_breakdown',
      'methodology_and_citations',
    ],
  },
  holdings_overlap: {
    report: 'holdings_overlap',
    capability: null,
    datasets: ['holdings'],
    outputs: ['direct_answer', 'overlap_table', 'methodology_and_citations'],
  },
  portfolio_comparison: {
    report: 'holdings_overlap',
    capability: null,
    datasets: ['holdings'],
    outputs: ['direct_answer', 'comparison_table', 'methodology_and_citations'],
  },
  fundamental_analysis: {
    report: 'company_fundamentals',
    capability: 'fundamental-analysis',
    datasets: ['sec_fundamentals'],
    outputs: ['direct_answer', 'metrics_table', 'findings', 'methodology_and_citations'],
  },
  dcf_valuation: {
    report: 'valuation',
    capability: 'dcf-valuation',
    datasets: ['sec_fundamentals', 'prices'],
    outputs: ['direct_answer', 'valuation_table', 'assumptions', 'methodology_and_citations'],
  },
  backtest: {
    report: 'backtest',
    capability: 'backtesting',
    datasets: ['congress_disclosures', 'prices'],
    outputs: ['direct_answer', 'equity_curve', 'trade_ledger', 'methodology_and_citations'],
  },
};
const familyMeta = (id) =>
  FAMILY[id] || {
    report: id || 'general_research',
    capability: null,
    datasets: [],
    outputs: ['direct_answer', 'findings', 'methodology_and_citations'],
  };

/* Ownership measure -> ranking metric, composer metric, operations. */
const OWNERSHIP_MEASURE = {
  breadth: {
    metric: 'distinct_reporting_manager_count',
    composer: 'managers',
    ops: ['aggregate_distinct_managers'],
  },
  value: {
    metric: 'aggregate_reported_value',
    composer: 'value',
    ops: ['aggregate_reported_value'],
  },
  change: {
    metric: 'distinct_manager_count_change',
    composer: 'change',
    ops: ['select_prior_13f_period', 'compare_comparable_managers'],
  },
  percentage: {
    metric: 'institutional_ownership_pct',
    composer: null,
    ops: ['retrieve_shares_outstanding', 'aggregate_reported_shares'],
    unsupported:
      'Institutional ownership as a percentage of shares outstanding is not available yet.',
  },
};

function timeScope(t) {
  const m = t.match(
    new RegExp(
      `\\b(?:last|past|previous|over the last|over the past|in the last|in the past)\\s+${NUM}?\\s*(days?|weeks?|months?|quarters?|years?)\\b`,
    ),
  );
  if (m) {
    const n = toNum(m[1]) ?? 1;
    return { kind: 'window', n, unit: m[2].replace(/s$/, '') };
  }
  if (/\b(?:last|previous|prior)\s+quarter\b|\bquarter over quarter\b|\bqoq\b/.test(t))
    return { kind: 'window', n: 1, unit: 'quarter' };
  if (/\bthis year\b|\bytd\b|\byear to date\b/.test(t)) return { kind: 'ytd', n: null, unit: null };
  return null;
}

/* A name key that survives "Pelosi" vs "Nancy Pelosi" before resolution: the last word of
   a person-like name. Only ever used while unresolved, and never for result reuse. */
function nameKey(text) {
  const w = String(text || '')
    .toLowerCase()
    .replace(/['’]s$/, '')
    .replace(/[^a-z0-9$.&\s-]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const last = w.length ? w[w.length - 1] : null;
  return DEMONYM[last] || last;
}

/* Adjective forms that name the same country (key only; resolution decides identity). */
const DEMONYM = {
  turkish: 'turkey',
  chinese: 'china',
  japanese: 'japan',
  mexican: 'mexico',
  indian: 'india',
  brazilian: 'brazil',
  russian: 'russia',
  argentine: 'argentina',
  argentinian: 'argentina',
  german: 'germany',
  british: 'uk',
  korean: 'korea',
  canadian: 'canada',
  egyptian: 'egypt',
  nigerian: 'nigeria',
};

/* A subject for families outside ownership: a ticker, or a capitalised name, or a known
   lower-case token after "of/for/on/is". Text only; resolution decides what it is. */
function looseSubject(question) {
  const q = String(question || '');
  const tick = q.match(/\$([A-Z]{1,5})\b|\b([A-Z]{2,5})\b(?=['’]s|\s|\?|$)/);
  const STOP =
    /^(?:Can|Could|Would|Will|Should|Do|Does|Did|Is|Are|Was|What|Which|Who|How|Why|When|Where|Tell|Show|Give|List|Rank|Compare|Run|Analy[sz]e|Review|Fit|Forecast|Model|Estimate|Calculate|Compute|Get|Find|Build|Backtest|Please|The|A|An|I|AI|US|U\.S\.|DCF|GARCH|SEC|ETF|FX|OK|My|Me|Ezana|Echo|Sonar|Polymarket|Kalshi|Congress|Fed)$/;
  for (const m of q.matchAll(/\b([A-Z][\w.&'’-]*(?:\s+[A-Z][\w.&'’-]*){0,3})\b/g)) {
    const words = m[1].split(/['’]s\b/)[0].split(/\s+/);
    while (words.length && STOP.test(words[0])) words.shift();
    while (words.length && STOP.test(words[words.length - 1])) words.pop();
    const n = words.join(' ');
    if (n && n.length >= 2 && !STOP.test(n)) return n;
  }
  if (tick) return tick[1] || tick[2];
  const LOW_RE =
    /\b(?:of|for|on|is|are|does|do|how|about)\s+([a-z][a-z0-9.&-]{2,})(?:['’]s)?\b(?=\s+(?:revenue|growth|business|ai|lira|currency|financials|fundamentals|stock|shares|valuation|risk|exposure|lobbying|contracts?|depend\w*|really|still|so|too|under|and|on|to|from|in|for)\b)/gi;
  const LOW_STOP =
    /^(?:federal|government|the|its|their|his|her|this|that|us|ai|public|defense|defence|state|local|foreign|domestic|reliant|dependent|exposed|much|many)$/i;
  for (const m of q.matchAll(LOW_RE)) {
    if (!LOW_STOP.test(m[1])) return m[1];
  }
  return lowerSubject(q);
}

/* Lower-case words that never name a subject. */
const LOWER_NOT_SUBJECT = new Set(
  'it what that there here today tomorrow everyone someone this who where how why when which the a an their its his her my our your one company stock market model portfolio question world country year week month'.split(
    ' ',
  ),
);

/**
 * A lower-case subject (a question typed without capitals): the words before a possessive
 * ("lockheed martin's contracts"), or a single word after of/on/for/to/does/is at the end
 * or before a verb. Text only; resolution decides what it names.
 */
function lowerSubject(q) {
  const t = String(q || '')
    .toLowerCase()
    .replace(/[‘’`]/g, "'");
  const pos = t.match(
    /(?:^|\b(?:are|is|was|were|of|on|for|to|in|about|did|does|do|how|what|why|has|have)\s+)((?:[a-z][a-z.&-]+\s+)?[a-z][a-z.&-]+)'s\b/,
  );
  if (pos) {
    const words = pos[1].split(/\s+/).filter((w) => !LOWER_NOT_SUBJECT.has(w));
    if (
      words.length &&
      !/^(?:how|what|who|it|that|there|here|today|let)$/.test(words[words.length - 1])
    )
      return words.join(' ');
  }
  const verb = t.match(
    /\b(?:does|did|do|is|are)\s+([a-z][a-z.&-]+(?:\s+[a-z][a-z.&-]+)?)\s+(?:spend|have|make|earn|own|hold|lobby|rely|depend|seeing|get|use)\b/,
  );
  if (verb) {
    const words = verb[1].split(/\s+/).filter((w) => !LOWER_NOT_SUBJECT.has(w));
    if (words.length === verb[1].split(/\s+/).length) return words.join(' ');
  }
  const tail = t.match(
    /\b(?:of|on|for|to|about)\s+([a-z][a-z.&-]{1,}(?:\s+[a-z][a-z.&-]+)?)\s*[?.!]?\s*$/,
  );
  if (tail) {
    const words = tail[1].split(/\s+/).filter((w) => !LOWER_NOT_SUBJECT.has(w));
    if (
      words.length === tail[1].split(/\s+/).length &&
      !words.some((w) => VOCAB_SET.has(w) || /(?:ing|tion|ment)$/.test(w))
    )
      return words.join(' ');
  }
  return null;
}

/* Words that precede a holdings noun without naming a holder. */
const NOT_A_HOLDER = new Set(
  'the my our your their his her its these those this that which what top big largest biggest best worst most least all some other popular tech technology bank banking energy ai chip semiconductor dividend growth value small large mid cap defense defence oil retail consumer health healthcare blue chip meme penny us u.s. american foreign current recent new old public private reported disclosed estimated institutional congressional'.split(
    ' ',
  ),
);

/** Lower-case holder candidates before a holdings noun, as typed and with a final s removed. */
export function holderCandidates(question) {
  const t = fuzzyFix(String(question || '').toLowerCase())
    .toLowerCase()
    .replace(/[‘’`]/g, "'");
  const out = [];
  const re =
    /\b(?:which|what|of|in|among|from|rank|list|show|are|do|does|for)\s+((?:[a-z][a-z.-]+\s+)?[a-z][a-z.-]+?)('s|s')?\s+(?:(?:estimated|disclosed|reported|current|top|largest)\s+)?(?:holdings|stocks|positions|portfolio|investments|equities|securities|shares)\b/g;
  for (const m of t.matchAll(re)) {
    const words = m[1].split(/\s+/);
    if (
      words.some((w) => NOT_A_HOLDER.has(w) || VOCAB_SET.has(w)) ||
      isSectorText(`${m[1]} stocks`)
    )
      continue;
    const name = words.join(' ');
    if (name.length < 3) continue;
    out.push(name);
    if (!m[2] && /[a-z]{3,}s$/.test(name)) out.push(name.slice(0, -1));
  }
  return [...new Set(out)];
}

/* Measures read from a company's own filed figures. */
const COMPANY_MEASURES = new Set([
  'revenue_growth',
  'earnings_growth',
  'margin',
  'pe_ratio',
  'debt',
  'free_cash_flow',
  'revenue',
]);

/**
 * Named companies in a comparison: the list after "compare" (or before "compare", as in
 * "How do Microsoft and Alphabet compare"), split on commas, "and", "vs". Only items that
 * look like names (a capital letter or a $ticker) are kept; resolution decides what they
 * name.
 */
export function companyList(question) {
  const q = String(question || '');
  const after = q.match(
    /\b(?:compare|comparing)\s+(.+?)(?=\s+(?:on|in terms of|by|for|across|over)\b|[?.!]|$)/i,
  );
  const before = q.match(/^(?:how|where)\s+(?:do|does|did)\s+(.+?)\s+(?:compare|stack up)\b/i);
  const vs = q.match(
    /([A-Z$][\w.&'-]*(?:\s+[A-Z][\w.&'-]*){0,2})\s+(?:vs\.?|versus)\s+([A-Z$][\w.&'-]*(?:\s+[A-Z][\w.&'-]*){0,2})/,
  );
  const afterSeg = after?.[1] && !/^(?:on|in|by|for|across|over)\b/i.test(after[1]) ? after[1] : '';
  const seg = afterSeg || before?.[1] || (vs ? `${vs[1]}, ${vs[2]}` : '');
  return seg
    .split(/,|\band\b|\bvs\.?\b|\bversus\b|\bwith\b/i)
    .map((x) =>
      x
        .replace(/['\u2019]s\b/g, '')
        .replace(/^\s*(?:the|both)\s+/i, '')
        .trim(),
    )
    .filter((x) => /^(?:\$?[A-Z])/.test(x) && x.length >= 2 && x.length <= 40)
    .slice(0, 8);
}

/* ── Stage 6: the intent ────────────────────────────────────────────── */

/**
 * The canonical research intent of a question.
 * @param {string} question
 * @param {{ semanticMeasure?: { measure: string, score: number, exemplarId: string }|null }} [opts]
 *   semanticMeasure: from semantic-equivalence.js, used only to fill an ownership measure the
 *   text left open (stage 4), never to override one the text states.
 */
export function canonicalIntent(question, { semanticMeasure = null, measureOverride = null } = {}) {
  const original = String(question || '').slice(0, 600);
  const { text, tokens } = normalizeQuestion(original);
  const relation = extractRelation(original);
  const params = extractParams(original);
  const inferred = [];
  const ambiguities = [];
  const explicit = {};
  if (params.top_n != null) explicit.top_n = params.top_n;

  const hasInst = /<inst>/.test(tokens);
  const hasCongress = /<congress>/.test(tokens);
  let subjectText =
    relation?.left || extractSubject(original) || extractSubject(fixTypos(original));
  /* Sonar 6.1: names the case-sensitive reader cannot see (a lower-case surname, "which
     pelosi holdings"; a possessive without its apostrophe, "Pelosis holdings") become
     candidates, tried in order by server resolution. A candidate is never an identity:
     the route accepts a lower-case candidate only when it resolves to a member of
     Congress, and drops the ranking when none resolves. */
  let candidates = null;
  if (!subjectText) {
    const c = holderCandidates(original);
    if (c.length) {
      subjectText = c[0];
      candidates = c;
    }
  } else if (
    /^[A-Z][a-z]{2,}s$/.test(subjectText) &&
    !new RegExp(`${subjectText}['’]`).test(original)
  ) {
    candidates = [subjectText, subjectText.slice(0, -1)];
  }
  const ownershipCue =
    /\b(?:own(?:s|ed|ing|ership|ers?)?|hold(?:s|ing|ings|ers?)?|held|stakes?|positions?|portfolios?|popular|crowded|investments?|equities|securities|stocks?|shares)\b/.test(
      tokens,
    );

  let family = null;
  let measure = null;
  let measureSource = null;
  let comparisonUniverse = null;
  let subjectUniverse = null;
  let direction = null;
  let unsupported = null;
  let composition = null;
  let comparedCompanies = null;

  /* Institutional ownership of a holder's securities: a named holder, an institution class
     to compare against, ownership language. A two-holder question is an overlap instead. */
  if (subjectText && hasInst && ownershipCue && !relation) {
    family = 'institutional_ownership';
    comparisonUniverse = { type: 'institutional_13f_positions' };
    if (measureOverride && OWNERSHIP_MEASURE[measureOverride]) {
      measure = measureOverride;
      measureSource = 'follow_up';
    }
    for (const [id, re] of measure ? [] : MEASURE_TESTS) {
      if (re.test(tokens)) {
        measure = id;
        measureSource = 'text';
        break;
      }
    }
    if (!measure && semanticMeasure?.measure && OWNERSHIP_MEASURE[semanticMeasure.measure]) {
      measure = semanticMeasure.measure;
      measureSource = 'semantic';
      inferred.push({
        field: 'measure',
        value: measure,
        why: `closest research example (${semanticMeasure.exemplarId}, similarity ${semanticMeasure.score})`,
      });
    }
    if (!measure) {
      measure = 'breadth';
      measureSource = 'default';
      inferred.push({
        field: 'measure',
        value: 'breadth',
        why: 'No ranking method stated: distinct 13F reporting managers is the default.',
      });
    }
    if (
      measure === 'breadth' &&
      /\b(?:highest|lowest|most|least)\s+<inst>\s+ownership\b/.test(tokens) &&
      measureSource === 'text'
    ) {
      ambiguities.push({
        field: 'measure',
        question:
          'Read as the number of institutional managers holding each stock. Ask for the ownership percentage if you meant the share of stock institutions own.',
      });
    }
    if (measure === 'change') {
      direction =
        /\b(?:lost|los(?:e|ing)|shed|decreas\w*|fall\w*|fell|exit\w*|dropp?\w*|fewer)\b/.test(
          tokens,
        )
          ? 'decrease'
          : 'increase';
    } else {
      direction = ASC_RE.test(tokens) ? 'ascending' : 'descending';
      if (!DESC_RE.test(tokens) && !ASC_RE.test(tokens))
        inferred.push({ field: 'direction', value: 'descending', why: 'Ranked highest first.' });
    }
    if (TXN_RE.test(tokens)) {
      subjectUniverse = {
        type: 'disclosed_transactions',
        side: /\b(?:sold|sells|selling|sales)\b/.test(tokens) ? 'sell' : 'buy',
      };
    } else {
      subjectUniverse = { type: 'estimated_disclosed_equity_holdings' };
      if (!/\b(?:estimated|disclosed|reported)\b/.test(tokens))
        inferred.push({
          field: 'subject_universe',
          value: 'estimated_disclosed_equity_holdings',
          why: 'Holdings are estimated from public disclosures.',
        });
    }
    const m = OWNERSHIP_MEASURE[measure];
    if (m.unsupported) unsupported = m.unsupported;
    else if (direction === 'ascending')
      unsupported =
        'Lowest-first institutional ranking is not available yet; results rank highest first.';
    else if (subjectUniverse.type === 'disclosed_transactions')
      unsupported =
        'Ranking only recent disclosed trades is not available yet; the ranking covers estimated holdings.';
  } else if (subjectText && hasCongress && ownershipCue && !relation && !hasInst) {
    /* "Which of Pelosi's stocks are most widely held by other members of Congress?" */
    family = 'congressional_overlap';
    comparisonUniverse = { type: 'congressional_disclosed_holdings' };
    subjectUniverse = { type: 'estimated_disclosed_equity_holdings' };
    measure = 'breadth';
    measureSource = 'text';
    direction = ASC_RE.test(tokens) ? 'ascending' : 'descending';
  } else {
    /* Sonar 6.1: the compositional reading (universe, filters, measures, operation) decides
       first; the cue families remain for questions it has no measure for (open risk,
       strategy, Echo coverage). Two-holder questions stay overlaps or comparisons. */
    const ctx = { relation };
    composition = composeIntent(tokens, {
      subject: relation?.left || extractSubject(original) || looseSubject(original),
      relation,
    });
    /* Sonar 6.2: two or more named companies compared on filed measures is a company
       comparison, not a comparison of two holders' portfolios. */
    const companies = companyList(original);
    const companyCompare =
      companies.length >= 2 &&
      /\b(?:compare|comparison|versus|vs\.?|against|relative to|stack up)\b/i.test(original) &&
      composition.measures.some((m) => COMPANY_MEASURES.has(m)) &&
      !/\b(?:holdings|portfolios?|positions|owns?|own|holds?)\b/i.test(original);
    if (companyCompare) {
      composition = {
        ...composition,
        operation: 'compare',
        direction: null,
        universe: { type: 'tickers', id: null },
        filters: [],
      };
      comparedCompanies = companies;
    }
    const rel = companyCompare ? null : OTHER_FAMILIES.slice(0, 2).find((f) => f.test(tokens, ctx));
    const hit =
      (companyCompare ? { id: 'company_comparison' } : null) ||
      rel ||
      (composition.family ? { id: composition.family } : null) ||
      OTHER_FAMILIES.slice(2).find((f) =>
        f.test ? f.test(tokens, ctx) : f.all.every((re) => re.test(tokens)),
      );
    family = hit ? hit.id : null;
    if (ASSESS_FAMILIES.has(family)) {
      /* An assessment is about its family's measure; how it is worded is not material
         ("reliant on federal contracts" and "share of revenue from the government" both
         measure government revenue dependence). */
      composition = {
        ...composition,
        operation: 'assess',
        direction: null,
        measures:
          family === 'prediction_markets'
            ? composition.measures
            : [ASSESS_LEAD[family] || composition.measures[0]].filter(Boolean),
        filters: [],
      };
    } else if (!COMPOSED_FAMILIES.has(family)) {
      /* A cue family (open risk, strategy, Echo) or an overlap: the composition read no
         measure that defines it, so it is not material to the investigation. */
      composition = composition.unsupported.length ? composition : null;
    }
    if (family === 'multi_stage_screen') {
      const asked = [...composition.filters.map((f) => f.metric), ...composition.measures];
      const cannot = asked.filter((m) => !SCREEN_MEASURES[m]);
      const sector = composition.universe?.type === 'sector' ? composition.universe.id : null;
      if (cannot.length)
        unsupported = cannot
          .map(
            (m) =>
              SCREEN_UNSUPPORTED[m] || `Screening on ${m.replace(/_/g, ' ')} is not available yet.`,
          )
          .join(' ');
      else if (composition.universe?.type === 'index')
        unsupported =
          'Index membership is not in Ezana\u2019s data, so an index cannot be screened yet; name a sector instead.';
      else if (sector && !GICS_FOR[sector])
        unsupported = `The ${sector.replace(/_/g, ' ')} sector is not mapped to Ezana\u2019s sector data yet.`;
    }
    if (composition?.unsupported?.length)
      unsupported = `Not available in Ezana's data yet: ${composition.unsupported.join(', ').replace(/_/g, ' ')}.`;
  }

  const meta = familyMeta(family);
  /* A sector, an index or a ticker list is the universe; a capitalised word near it
     ("Screen", "Among", "PE") is not a subject. */
  const universeDefined =
    ['sector', 'index'].includes(composition?.universe?.type) ||
    (composition?.universe?.type === 'tickers' && !comparedCompanies);
  const subjectRaw = comparedCompanies
    ? comparedCompanies[0]
    : family === 'institutional_ownership' || family === 'congressional_overlap'
      ? subjectText
      : relation?.left || extractSubject(original) || looseSubject(original);
  const time = timeScope(tokens);

  const ownership = family === 'institutional_ownership' ? OWNERSHIP_MEASURE[measure] : null;
  const operations =
    family === 'institutional_ownership'
      ? [
          'resolve_holder',
          subjectUniverse?.type === 'disclosed_transactions'
            ? 'retrieve_disclosed_transactions'
            : 'retrieve_estimated_holdings',
          'match_securities',
          'select_13f_period',
          ...ownership.ops,
          'rank_securities',
          'validate_coverage',
        ]
      : family === 'congressional_overlap'
        ? [
            'resolve_holder',
            'retrieve_estimated_holdings',
            'aggregate_member_holders',
            'rank_securities',
          ]
        : family === 'holdings_overlap'
          ? ['resolve_holder', 'resolve_second_holder', 'retrieve_holdings', 'intersect_holdings']
          : family === 'portfolio_comparison'
            ? ['resolve_holder', 'resolve_second_holder', 'retrieve_holdings', 'compare_holdings']
            : composition && (COMPOSED_FAMILIES.has(family) || ASSESS_FAMILIES.has(family))
              ? ['resolve_subject', ...compositionOperations(composition)]
              : family
                ? ['resolve_subject', `analyze_${family}`]
                : ['retrieve_evidence'];

  const intent = {
    intent_version: CANONICAL_INTENT_VERSION,
    original_query: original,
    normalized: tokens,
    family,
    report_family: meta.report,
    capability: meta.capability,
    primary_entity:
      subjectRaw && !universeDefined
        ? {
            text: subjectRaw,
            key: nameKey(subjectRaw),
            role:
              family === 'institutional_ownership' || family === 'congressional_overlap'
                ? 'holder'
                : 'subject',
            type: null,
            id: null,
            status: candidates ? 'candidate' : 'unresolved',
            ...(candidates ? { alternates: candidates } : {}),
          }
        : null,
    secondary_entities: comparedCompanies
      ? comparedCompanies
          .slice(1)
          .map((t) => ({ text: t, key: nameKey(t), role: 'compared_company', id: null }))
      : relation
        ? [{ text: relation.right, key: nameKey(relation.right), role: 'second_holder', id: null }]
        : [],
    subject_universe: subjectUniverse,
    comparison_universe: comparisonUniverse,
    measure,
    measure_source: measureSource,
    operations,
    ranking:
      family === 'institutional_ownership'
        ? { metric: ownership.metric, direction, top_n: explicit.top_n ?? null }
        : family === 'congressional_overlap'
          ? { metric: 'member_holder_count', direction, top_n: explicit.top_n ?? null }
          : null,
    time_scope:
      family === 'institutional_ownership'
        ? {
            reporting_period: 'latest_adequately_covered_13f_quarter',
            ...(measure === 'change'
              ? { compare: time || { kind: 'window', n: 1, unit: 'quarter' } }
              : {}),
            ...(time && measure !== 'change' ? { window: time } : {}),
          }
        : time
          ? { window: time }
          : null,
    filters: {},
    explicit_parameters: explicit,
    inferred_defaults: inferred,
    ambiguities,
    unsupported,
    required_datasets: composition
      ? [...new Set([...meta.datasets, ...compositionDatasets(composition)])].sort()
      : meta.datasets,
    composition: composition
      ? {
          operation: composition.operation,
          direction: composition.direction,
          universe: composition.universe
            ? { type: composition.universe.type, id: composition.universe.id || null }
            : null,
          filters: composition.filters,
          measures: composition.measures,
          driver: composition.driver,
          model: composition.model,
          time: composition.time,
        }
      : null,
    required_outputs: meta.outputs,
    method_version: family === 'institutional_ownership' ? OWNERSHIP_METHOD_VERSION : null,
  };
  intent.canonical_paraphrase = paraphrase(intent);
  return intent;
}

/** The composer metric (registry enum) for an ownership intent, or null when unsupported. */
export function composerMetric(intent) {
  if (intent?.family !== 'institutional_ownership') return null;
  return OWNERSHIP_MEASURE[intent.measure]?.composer || null;
}

/** Add a verified resolution ({ kind, id, name }) to the intent. Never invents an id. */
export function withResolution(intent, resolved) {
  if (!intent?.primary_entity || !resolved?.id || resolved.kind === 'unresolved') return intent;
  return {
    ...intent,
    primary_entity: {
      ...intent.primary_entity,
      type:
        resolved.kind === 'politician'
          ? 'congressional_member'
          : resolved.kind === 'institution'
            ? 'institutional_manager'
            : resolved.kind,
      id: String(resolved.id),
      name: resolved.name || intent.primary_entity.text,
      status: 'resolved',
    },
  };
}

const MEASURE_WORDS = {
  breadth:
    'the number of distinct institutional managers reporting ownership in SEC Form 13F filings',
  value: 'the aggregate value institutional managers reported in SEC Form 13F filings',
  change: 'the change in distinct 13F reporting managers between comparable quarters',
  percentage: 'institutional ownership as a percentage of shares outstanding',
};

/** One sentence that states the canonical request (display and logs; never the identity). */
export function paraphrase(intent) {
  const who = intent.primary_entity?.name || intent.primary_entity?.text || 'the subject';
  if (intent.family === 'institutional_ownership') {
    const universe =
      intent.subject_universe?.type === 'disclosed_transactions'
        ? `the equities in ${who}'s recent disclosed ${intent.subject_universe.side === 'sell' ? 'sales' : 'purchases'}`
        : `the eligible equities in ${who}'s estimated disclosed holdings`;
    const dir = intent.ranking.direction === 'ascending' ? ', lowest first' : '';
    return `Rank ${universe} by ${MEASURE_WORDS[intent.measure]}${dir}.`;
  }
  if (intent.family === 'congressional_overlap')
    return `Rank the equities in ${who}'s estimated disclosed holdings by how many other members of Congress also disclose holding them.`;
  if (intent.family === 'holdings_overlap')
    return `Find the securities both ${who} and ${intent.secondary_entities[0]?.text} hold.`;
  if (intent.family) return `${intent.family.replace(/_/g, ' ')} for ${who}.`;
  return `General research: ${intent.original_query}`;
}

/* ── Plan signature, task graph, equivalence, fulfillment ───────────── */

function canonicalJson(v) {
  if (Array.isArray(v)) return `[${v.map(canonicalJson).join(',')}]`;
  if (v && typeof v === 'object')
    return `{${Object.keys(v)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${canonicalJson(v[k])}`)
      .join(',')}}`;
  return JSON.stringify(v ?? null);
}

/* FNV-1a 32-bit, twice with different seeds: a short stable id, not a security hash. */
function fnv(str, seed) {
  let h = seed >>> 0;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

/** The material fields of an intent: what makes two investigations the same. */
export function materialFields(intent) {
  const e = intent.primary_entity;
  return {
    v: intent.intent_version,
    family: intent.family,
    entity: e ? (e.id ? `${e.type}:${e.id}` : `name:${e.key}`) : null,
    second: intent.secondary_entities.map((s) => (s.id ? s.id : `name:${s.key}`)),
    subject_universe: intent.subject_universe,
    comparison_universe: intent.comparison_universe,
    measure: intent.measure,
    ranking: intent.ranking,
    time: intent.time_scope,
    params: intent.explicit_parameters,
    method: intent.method_version,
    operations: intent.operations,
    composition: intent.composition || null,
  };
}

/**
 * Stable semantic plan signature. Raw text never enters it. `resolved` is false until the
 * primary entity has a verified id; an unresolved signature is for display and telemetry
 * only, never for result reuse.
 */
export function planSignature(intent) {
  const body = canonicalJson(materialFields(intent));
  return {
    id: `cri${intent.intent_version}-${fnv(body, 2166136261)}${fnv(body, 16777619)}`,
    resolved: Boolean(intent.primary_entity?.id) || !intent.primary_entity,
  };
}

/** The required task graph: [{ id, op, after: [ids], required: true }]. */
export function requiredTasks(intent) {
  const tasks = intent.operations.map((op, i) => ({
    id: `t${i + 1}`,
    op,
    after: i ? [`t${i}`] : [],
    required: true,
  }));
  tasks.push({
    id: `t${tasks.length + 1}`,
    op: 'generate_findings',
    after: [tasks[tasks.length - 1]?.id].filter(Boolean),
    required: true,
  });
  tasks.push({
    id: `t${tasks.length + 1}`,
    op: `render_${intent.report_family}`,
    after: [`t${tasks.length}`],
    required: true,
  });
  return tasks;
}

const sameEntity = (a, b) => {
  if (!a && !b) return { same: true, pending: false };
  if (!a || !b) return { same: false, pending: false };
  if (a.id && b.id) return { same: a.type === b.type && a.id === b.id, pending: false };
  return { same: Boolean(a.key) && a.key === b.key, pending: true };
};

/**
 * Structural equivalence of two intents (spec 10). Embedding similarity is not an input:
 * two questions are equivalent only when every material dimension agrees.
 * @returns {{ equivalent: boolean, sameFamily: boolean, pendingResolution: boolean,
 *             differences: { field: string, a: any, b: any }[] }}
 */
export function compareIntents(a, b) {
  const fa = materialFields(a);
  const fb = materialFields(b);
  const differences = [];
  const ent = sameEntity(a.primary_entity, b.primary_entity);
  if (!ent.same)
    differences.push({
      field: 'primary_entity',
      a: a.primary_entity?.text,
      b: b.primary_entity?.text,
    });
  for (const k of [
    'family',
    'second',
    'subject_universe',
    'comparison_universe',
    'measure',
    'ranking',
    'time',
    'params',
    'operations',
    'composition',
  ]) {
    if (k === 'second') {
      const sa = a.secondary_entities.map((s) => s.id || s.key).join('|');
      const sb = b.secondary_entities.map((s) => s.id || s.key).join('|');
      if (sa !== sb) differences.push({ field: 'secondary_entities', a: sa, b: sb });
      continue;
    }
    if (canonicalJson(fa[k]) !== canonicalJson(fb[k]))
      differences.push({ field: k, a: fa[k], b: fb[k] });
  }
  return {
    equivalent: differences.length === 0,
    sameFamily: a.family === b.family,
    pendingResolution: ent.pending,
    differences,
  };
}

/**
 * Did a research run fulfil the intent? `composition` is the client payload the route sends
 * (clientComposition). A generic report never satisfies an ownership ranking.
 * @returns {{ required: boolean, met: boolean, checks: { id: string, label: string, ok: boolean }[] }}
 */
export function intentFulfillment(intent, composition) {
  if (intent?.family !== 'institutional_ownership' || intent.unsupported)
    return { required: false, met: true, checks: [] };
  const own = (composition?.analyses || []).find(
    (x) => x?.capability === 'institutional-ownership',
  );
  const o = own?.ownership || null;
  const rows = Array.isArray(o?.rows) ? o.rows : [];
  const checks = [
    {
      id: 'holdings',
      label: 'Retrieved the eligible holdings',
      ok: Boolean(o && (o.universe || rows.length)),
    },
    {
      id: 'ownership',
      label: 'Obtained 13F ownership data',
      ok: Boolean(o && own.status !== 'failed'),
    },
    {
      id: 'ranking',
      label: 'Computed the requested ranking',
      ok: rows.some((r) => r.rank != null),
    },
    { id: 'period', label: 'Identified the reporting period', ok: Boolean(o?.period) },
  ];
  return { required: true, met: checks.every((c) => c.ok), checks };
}

/** A compact, loggable summary (no raw private content beyond the query the reader typed). */
export function intentTelemetry(intent) {
  const sig = planSignature(intent);
  return {
    intent_version: intent.intent_version,
    signature: sig.id,
    signature_resolved: sig.resolved,
    family: intent.family,
    report_family: intent.report_family,
    measure: intent.measure,
    measure_source: intent.measure_source,
    operations: intent.operations,
    unsupported: intent.unsupported || null,
    ambiguities: intent.ambiguities.length,
  };
}

/* ── Follow-ups ─────────────────────────────────────────────────────── */

const ENTITY_SWAP =
  /^\s*(?:(?:ok(?:ay)?|and|now|then)[,\s]+)?(?:what|how)\s+about\s+(.+?)\s*\??$|^\s*(?:and|now)?\s*(?:do\s+)?(?:the\s+)?same\s+(?:for|with)\s+(.+?)\s*\??$|^\s*(?:now\s+)?(?:do|try|repeat(?:\s+(?:it|that))?\s+for|run\s+(?:it|that)\s+for)\s+(.+?)\s*\??$|^\s*and\s+(?:for\s+)?([A-Z][\w.&'-]*(?:\s+[A-Z][\w.&'-]*){0,3})\s*\??$/i;

const MEASURE_SWAP = [
  [
    'value',
    /\b(?:by|use|using|rank(?:ed)?\s+by|sort(?:ed)?\s+by|in terms of|what about)\s+(?:the\s+)?(?:(?:reported|aggregate|total|13f)\s+)?(?:dollar\s+value|value|money|dollars|capital)\b/i,
  ],
  [
    'change',
    /\b(?:by|use|using|rank(?:ed)?\s+by|sort(?:ed)?\s+by|what about)\s+(?:the\s+)?(?:quarterly\s+)?(?:change|changes|gains?|growth|new managers|increase)\b/i,
  ],
  [
    'breadth',
    /\b(?:by|use|using|rank(?:ed)?\s+by|sort(?:ed)?\s+by|what about)\s+(?:the\s+)?(?:number of (?:managers|holders|owners|institutions)|manager count|breadth|how many (?:managers|funds))\b/i,
  ],
];

/**
 * A follow-up read against the question it follows. A complete question stands on its
 * own; a short one that only swaps the entity ("what about Tuberville?") or the ranking
 * method ("rank by dollar value instead") inherits everything else from the prior intent.
 * @returns {{ intent: object, question: string, change: 'none'|'entity'|'measure' }}
 *   `question` is the effective question (for the composer and the writer).
 */
export function followUpIntent(question, priorQuestion) {
  const own = canonicalIntent(question);
  if (!priorQuestion) return { intent: own, question, change: 'none' };
  const prior = canonicalIntent(priorQuestion);
  if (!prior.family) return { intent: own, question, change: 'none' };
  const short =
    String(question || '')
      .trim()
      .split(/\s+/).length <= 9;
  if (short && prior.family === 'institutional_ownership') {
    const hit = MEASURE_SWAP.find(([, re]) => re.test(String(question)));
    if (hit && hit[0] !== prior.measure) {
      const intent = canonicalIntent(priorQuestion, { measureOverride: hit[0] });
      return {
        intent: { ...intent, follow_up: { from: planSignature(prior).id, change: 'measure' } },
        question: priorQuestion,
        change: 'measure',
      };
    }
  }
  const m = short ? String(question).match(ENTITY_SWAP) : null;
  const name = m ? (m[1] || m[2] || m[3] || m[4] || '').replace(/[?.!]+$/, '').trim() : null;
  if (name && prior.primary_entity?.text && name.length >= 2) {
    const rewritten = String(priorQuestion).split(prior.primary_entity.text).join(name);
    if (rewritten !== priorQuestion) {
      const intent = canonicalIntent(rewritten, {
        measureOverride: prior.family === 'institutional_ownership' ? prior.measure : null,
      });
      if (intent.family === prior.family)
        return {
          intent: { ...intent, follow_up: { from: planSignature(prior).id, change: 'entity' } },
          question: rewritten,
          change: 'entity',
        };
    }
  }
  return { intent: own, question, change: 'none' };
}
