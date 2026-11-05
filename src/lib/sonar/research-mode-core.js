/**
 * Sonar research modes (Nov 2026), the classifier core: how much research a
 * question warrants. Import from research-mode.js, which adds the planner
 * coverage check; this module exists so the research spec can read the
 * classification without an import cycle.
 *
 *
 * The keyword check this replaces (deepResearchSignal's old scoring) read the
 * WORDS of a question. It caught 18 of 50 labelled research assignments and
 * scored "How dependent is Palantir on government spending?" at zero. This
 * classifier reads what the question asks Sonar to DO:
 *
 *   quick     a lookup, a single fact, one record set. The quick ping.
 *   standard  focused analysis: a trend, a ranking or comparison within one
 *             or two datasets, a single exposure question. The research
 *             engine at standard depth, run automatically.
 *   deep      an assignment that needs coordinated evidence across several
 *             datasets, a horizon, relationships or a defensible conclusion.
 *             Offered; the visitor chooses.
 *
 * Five dimensions score the question (operation 0-3, evidence breadth 0-3,
 * entity scope 0-2, time shape 0-2, rigor 0-2). Mandatory triggers override
 * the score. A score within BAND of a threshold, with no trigger, is
 * borderline: the lighter mode runs and "Go deeper" is offered.
 *
 * Rules describe operations, structure and evidence families, never a
 * company, a name or a phrase from an evaluation question
 * (scripts/check-sonar-research-mode.mjs keeps a holdout to enforce it).
 *
 * Pure: no model, no network, no database. Unit-tested in
 * scripts/check-sonar-research-mode.mjs.
 */
import { understandDeterministic } from '@/lib/sonar/understand';
import { mentionedCompanies } from '@/lib/sonar/company-mentions';
import { DOMAINS } from '@/lib/sonar/engine/domains';
import { scoreDomains } from '@/lib/sonar/engine/domain-score';
import { DEPTHS } from '@/lib/sonar/engine/planner';

export const MODE_VERSION = 'mode-v1';

/** Score thresholds for each mode, and the borderline band around them. */
export const THRESHOLDS = { standard: 0, deep: 4.25 };
export const BAND = 1;

/* ── The research angles (kept for the memo planner) ──────────────────── */

/** The research angles a question can ask for, in report order. */
export const DEEP_ANGLES = [
  {
    id: 'financials',
    label: 'Financial performance',
    re: /\b(financial(?:s| performance)?|revenue|earnings|margins?|profitab\w*|cash flow|growth)\b/i,
  },
  {
    id: 'ownership',
    label: 'Institutional ownership',
    re: /\b(institutional|13f|ownership|holders?|hedge funds?|positioning)\b/i,
  },
  {
    id: 'contracts',
    label: 'Government contracts',
    re: /\b(government contracts?|federal contracts?|contracts?|procurement|awards?)\b/i,
  },
  {
    id: 'industry',
    label: 'Industry exposure',
    re: /\b(industry exposure|industry|sector exposure|end markets?|value chain|supply chain|suppliers?)\b/i,
  },
  {
    id: 'competition',
    label: 'Competitive landscape',
    re: /\b(competit\w*|rivals?|market share|peers?|custom silicon|substitut\w*)\b/i,
  },
  {
    id: 'geopolitics',
    label: 'Geopolitical and regulatory exposure',
    re: /\b(export controls?|sanctions?|china|geopolitic\w*|regulat\w*|tariffs?|antitrust)\b/i,
  },
  {
    id: 'customers',
    label: 'Customer concentration',
    re: /\b(customer concentration|customers?|hyperscalers?|clients?|buyers)\b/i,
  },
  {
    id: 'lobbying',
    label: 'Lobbying and policy',
    re: /\b(lobby\w*|policy exposure|political)\b/i,
  },
  {
    id: 'valuation',
    label: 'Valuation and expectations',
    re: /\b(valuation|multiples?|p\/e|price targets?|expectations|priced in)\b/i,
  },
];

/* ── 1a. Analytical operations ───────────────────────────────────────── */

/* Each operation: weight and the question structures that ask for it.
   Verbs and structure, never names. */
export const OPERATIONS = [
  {
    id: 'lookup',
    weight: 0,
    re: [
      /^\s*(?:what|who|when|where)(?:'s|\s+is|\s+are|\s+was|\s+were)\b/i,
      /\b(?:latest|current|currently|most recent)\b/i,
      /\b(?:price of|stock price|share price|market cap|ticker)\b/i,
      /^\s*who owns\b/i,
    ],
  },
  {
    id: 'list',
    weight: 0,
    re: [/\b(?:list|show me|give me (?:a|the) list)\b/i, /^\s*which\b/i],
  },
  {
    id: 'trend',
    weight: 1,
    re: [
      /\bhow (?:has|have|did|do|does)\b[^?.]{0,120}\b(?:chang\w*|grow\w*|grew|evolv\w*|shift\w*|trend\w*|moved?|develop\w*)\b/i,
      /\b(?:over|in|during) (?:the )?(?:past|last|previous) (?:\d+|two|three|four|five|six|seven|eight|nine|ten|twelve|eighteen|twenty|several|few|many) (?:years?|months?|quarters?)\b|\b(?:past|last|previous) decade\b/i,
      /\b(?:trends?|over time|year[- ]over[- ]year|historical(?:ly)?|since (?:19|20)\d\d)\b/i,
      /\b(?:increased|decreased|grown|growing|declin\w*|rising|falling|rose|fell|accelerat\w*)\b/i,
    ],
  },
  {
    id: 'rank_screen',
    weight: 1,
    re: [
      /\b(?:rank\w*|leaderboard|screen\w*|top \d+)\b/i,
      /\b(?:which|what|who)\b[^?.]{0,90}\b(?:most|least|largest|biggest|highest|lowest|greatest|hardest|strongest|leading|dominat\w*|fastest)\b(?!\s+recent)/i,
      /\bidentify\b[^?.]{0,60}\b(?:companies|firms|corporations|contractors|members|stocks|industries|countries|recipients|examples)\b/i,
      /^\s*which\b[^?.]{0,60}\b(?:bought|sold|added|cut|trimmed|increased|decreased|exited|initiated|raised|reduced|boosted)\b/i,
    ],
  },
  {
    id: 'compare',
    weight: 1,
    re: [
      /\b(?:compare\w*|comparison|comparative|versus|vs\.?|relative to|compared (?:with|to))\b/i,
    ],
  },
  {
    id: 'breakdown',
    weight: 1,
    re: [
      /\bbreak(?:\s|-)?(?:it |them |this )?down\b|\bbreakdown\b/i,
      /\b(?:distribution|concentrat\w*|composition|split by|by (?:country|sector|industry|agency|program|entity type|segment))\b/i,
      /\b(?:what|which) (?:share|portion|percentage|proportion|fraction) of\b/i,
      /\bhow much of [\w.'-]+(?: [\w.'-]+){0,2}'s (?:revenue|sales|business|income|spending)\b/i,
    ],
  },
  {
    id: 'reaction',
    weight: 1,
    re: [
      /\bhow (?:did|do|does|have|has)\b[^?.]{0,80}\b(?:react\w*|respond\w*)\b/i,
      /\b(?:before|ahead of|after|around|following|during)\b[^?.]{0,40}\b(?:votes?|hearings?|announcements?|passage|rulings?|decisions?|elections?|earnings|budget|spike|crash|sell-?off|invasion)\b/i,
    ],
  },
  {
    id: 'exposure',
    weight: 1.5,
    re: [/\b(?:expos\w*|sensitiv\w*)\b/i],
  },
  {
    id: 'dependence',
    weight: 2,
    re: [
      /\bhow (?:dependent|reliant)\b/i,
      /\b(?:depend(?:s|ing|ent|ence|ency|encies)?|relian\w*|rel(?:y|ies) on|reliance)\b/i,
      /\bhow much (?:does|do|did) [\w.'-]+(?: [\w.'-]+)? need\b/i,
      /\bhow important (?:is|are|were|was)\b/i,
      /\bhow much of (?:its|their|the company's) (?:business|revenue|sales|growth)\b/i,
      /\b(?:growth|business|revenue|sales) (?:is |are )?built on\b/i,
    ],
  },
  {
    id: 'sustainability',
    weight: 2,
    re: [
      /\b(?:sustainab\w*|durab\w*)\b/i,
      /\bcan [\w.'-]+(?: [\w.'-]+)? (?:continue|last|sustain|keep (?:(?:it|this|that) )?(?:up|going))\b/i,
      /\bkeep (?:this|it|that) (?:up|going)\b/i,
    ],
  },
  {
    id: 'causal_impact',
    weight: 2,
    re: [
      /\bhow (?:do|does|did|has|have|could|would|will|might|can)\b[^?.]{0,90}\b(?:affect\w*|influenc\w*|impact\w*|shap\w*|drive|drives|driven)\b/i,
      /\bwhat (?:factors|forces|drivers)\b/i,
      /\b(?:factors|forces|drivers) (?:influencing|affecting|driving|shaping|behind)\b/i,
      /\bwhat (?:could|would|will|might) (?:drive|affect|influence)\b/i,
      /\bwhat(?:'s| is| are) driving\b/i,
      /\bdoes (?:it|this|that) matter\b|\bwhat does (?:it|this|that) mean for\b/i,
      /\b(?:affect|influence|impact) (?:the |its |their )?(?:investment|business|growth|outlook|risks?)\b/i,
    ],
  },
  {
    id: 'opportunity',
    weight: 2,
    re: [
      /\b(?:best|well|better) positioned\b|\bpositioned to\b|\bpositioning (?:itself|themselves)\b/i,
      /\bbenefit\w* (?:from|most)\b/i,
      /\bgaining (?:ground|traction|share|exposure)\b/i,
      /\bcapture (?:value|share)\b/i,
      /\bwho (?:wins|benefits|gains|stands to gain)\b|\b(?:biggest )?winners\b/i,
      /\b(?:underappreciated|undervalued opportunit\w*|attractive areas?)\b/i,
    ],
  },
  {
    id: 'risk_assessment',
    weight: 2,
    re: [
      /\b(?:risks?|downsides?|threats?|headwinds?|what could go wrong|vulnerab\w*|red flags?|the catch)\b/i,
      /\b(?:should (?:i|we|investors) (?:worry|be worried|be concerned)|worr(?:y|ied) about)\b/i,
      /\bcould (?:materially )?(?:affect|hurt|derail|threaten|disrupt)\b/i,
    ],
  },
  {
    id: 'outlook_scenario',
    weight: 2,
    re: [
      /\b(?:outlook|scenarios?|bull case|bear case|prospects|trajectory|forecast)\b/i,
      /\b(?:next|coming|upcoming) (?:\d+|two|three|four|five|six|seven|eight|nine|ten|twelve|eighteen|twenty|several|few|many) (?:years?|quarters?|months?)\b|\b(?:next|coming) (?:year|decade|few years)\b|\bover the (?:next|coming)\b/i,
      /\bwhat (?:would|will|could|might) (?:a|an|the)?\b[^?.]{0,60}\bmean for\b|\bwhat if\b/i,
      /\b(?:long[- ]term|going forward|in the future)\b/i,
    ],
  },
  {
    id: 'relationship_map',
    weight: 3,
    re: [
      /\b(?:map(?:s|ping)?|build|draw)\b[^?.]{0,40}\brelationships?\b|\brelationship (?:map|analysis|network)\b/i,
      /\b(?:relationships?|connections?|links?) between\b/i,
      /\b(?:connect(?:s|ing)?|cross-reference)\b[^?.]{0,120}\b(?:and|with)\b/i,
      /\b(?:overlap\w*)\b|\balso the (?:ones|same)\b|\bthe same (?:companies|firms|members|names)\b/i,
      /\bhidden (?:connections|links|relationships)\b/i,
      /\b(?:which|what)\b[^?.]{0,80}\b(?:and also|that also|who also)\b/i,
      /\banaly[sz]e the relationship\b/i,
    ],
  },
  {
    id: 'thesis_diligence',
    weight: 3,
    re: [
      /\b(?:investment thesis|investment case|due diligence|dossier|deep dive)\b/i,
      /\bin[- ]depth (?:analysis|review|report|research|assessment)\b/i,
      /\b(?:comprehensive|full|complete) (?:analysis|assessment|review|report|research|evaluation|picture|profile)\b/i,
    ],
  },
  {
    id: 'discovery',
    weight: 3,
    re: [
      /\b(?:find|identify|uncover|surface|spot)\b[^?.]{0,60}\b(?:themes?|patterns?)\b/i,
      /\b(?:emerging themes?|what patterns|patterns? (?:can be identified|emerge|across|in))\b/i,
    ],
  },
  {
    id: 'reconciliation',
    weight: 3,
    re: [
      /\b(?:contradict\w*|conflicting|reconcil\w*|inconsistent (?:data|stories|evidence))\b/i,
      /\bwhat (?:cannot|can't|can not) be concluded\b/i,
    ],
  },
];

const OP_BY_ID = Object.fromEntries(OPERATIONS.map((o) => [o.id, o]));

/* "Who are the largest holders of X", "top shareholders of X": the ranking
   is the record's own order, a lookup, not a screen of a universe. */
const HOLDERS_OF_RE =
  /\b(?:largest|biggest|top|main|major|key)?\s*(?:institutional\s+)?(?:holders?|owners?|shareholders?|investors?) (?:of|in)\b/i;
/* A superlative on a single record ("the largest Navy contract this week")
   or on one company's own records ("Apple's biggest product segments") is
   a lookup in that record set, not a ranking of a universe. */
const RECORD_SUPERLATIVE_RE =
  /\bthe (?:largest|biggest|top|most recent|latest) (?:[\w-]+ ){0,2}(?:contract|award|trade|filing|deal|grant|position|holder|shareholder|order|purchase|sale)\b|\b[\w.'-]+'s (?:largest|biggest|top|main) (?:[\w-]+ ){0,2}(?:segments?|products?|customers?|holders?|shareholders?|positions?|subsidiaries|markets?)\b/i;
/* A ranking of a universe on a criterion, as opposed to "the most recent". */
const RECENCY_ONLY_RE = /\bmost recent(?:ly)?\b/i;

/** The operations a question asks for: [{ id, weight, evidence }]. */
export function detectOperations(text) {
  const t = String(text || '');
  const out = [];
  for (const op of OPERATIONS) {
    const hit = op.re.map((re) => t.match(re)).find(Boolean);
    if (hit) out.push({ id: op.id, weight: op.weight, evidence: hit[0].trim().slice(0, 60) });
  }
  const has = (id) => out.some((o) => o.id === id);
  const drop = (id) => {
    const i = out.findIndex((o) => o.id === id);
    if (i >= 0) out.splice(i, 1);
  };
  if (
    has('rank_screen') &&
    RECORD_SUPERLATIVE_RE.test(t) &&
    !/\b(?:rank\w*|top \d+|which (?:companies|firms|members|funds|investors|countries))\b/i.test(t)
  )
    drop('rank_screen');
  /* "the largest holders of X" ranks one entity's records: a lookup. */
  if (
    has('rank_screen') &&
    HOLDERS_OF_RE.test(t) &&
    !/\b(?:and|which|whose)\b.*\b(?:increas|decreas|chang|add|cut)\w*/i.test(t)
  )
    drop('rank_screen');
  /* "most recent" alone is recency, not a ranking criterion. */
  if (has('rank_screen') && RECENCY_ONLY_RE.test(t)) {
    const rest = t.replace(RECENCY_ONLY_RE, '');
    if (!OP_BY_ID.rank_screen.re.some((re) => re.test(rest))) drop('rank_screen');
  }
  /* A risk word inside "exposure to sanctions risk" is still a risk
     question; "risk" never cancels exposure. A forward horizon on a trend
     question is kept as both (trigger 5 reads them together). */
  return out;
}

/* ── 1b. Evidence families ───────────────────────────────────────────── */

/** Evidence families, with the words that request each explicitly. */
export const FAMILIES = {
  financials: {
    label: 'reported financials',
    re: /\b(?:financial(?:s| performance| results| data)?|fundamentals|revenue|earnings|margins?|profitab\w*|cash flow|balance sheet|net income)\b/i,
  },
  ownership: {
    label: 'institutional ownership',
    re: /\b(?:institutional (?:ownership|holders?|investors?|positioning|positions)|13f|hedge funds?|asset managers?|ownership|shareholders?|holders|positions)\b/i,
  },
  contracts: {
    label: 'government contracts',
    re: /\b(?:contracts?|contractors?|procurement|awards?|awarded|federal spending|government spending|defen[cs]e spending|public[- ]sector)\b/i,
  },
  lobbying: {
    label: 'lobbying disclosures',
    re: /\b(?:lobby\w*|trade associations?|industry associations?)\b/i,
  },
  congress: {
    label: 'congressional disclosures',
    re: /\b(?:congress\w*|members? of (?:the )?(?:house|senate|congress)|lawmakers?|politicians?|senators?|committees?|political)\b/i,
  },
  policy: {
    label: 'sanctions, export controls and regulation',
    re: /\b(?:sanction\w*|geopolitic\w*|export controls?|tariffs?|regulat\w*|ofac|embargo\w*|antitrust)\b/i,
  },
  macro: {
    label: 'country and macro indicators',
    re: /\b(?:macro\w*|econom\w*|gdp|inflation|interest rates?|country[- ]level|industrial activity|electrification|commodit\w*|copper|oil|crude|lithium|power generation|electricity demand)\b/i,
  },
  industry: {
    label: 'industry and supply-chain data',
    re: /\b(?:industry|industries|supply[- ]chains?|value chains?|competit\w*|landscape|peers?|market share|infrastructure|industry (?:stages|positioning|development))\b/i,
  },
  market: {
    label: 'market and analyst data',
    re: /\b(?:valuation|analysts?|price targets?|consensus|stock (?:price|performance)|share price|market data|market evidence|returns?)\b/i,
  },
  news: {
    label: 'recent news',
    re: /\b(?:news|recent developments|headlines|announcements|recent (?:contract )?activity)\b/i,
  },
};

/* Research-spec domain -> evidence family. */
const DOMAIN_FAMILY = {
  company_financials: 'financials',
  institutional: 'ownership',
  contracts: 'contracts',
  lobbying: 'lobbying',
  congress_trading: 'congress',
  politician: 'congress',
  geopolitics: 'policy',
  country: 'macro',
  macro: 'macro',
  commodity: 'macro',
  industry: 'industry',
  sector: 'industry',
  competition: 'industry',
  market_performance: 'market',
  analyst_views: 'market',
};

/* The planner sources that serve each family (the coverage check). */
export const FAMILY_SOURCES = {
  financials: ['company_financials', 'revenue_geo', 'product_segments', 'sec_filings'],
  ownership: ['holder_positioning', 'institutional_13f'],
  contracts: ['contracts_history'],
  lobbying: ['lobbying_leaders', 'lobbying_company', 'lobbying_associations'],
  congress: ['congress_sector', 'congress_company', 'politician_dossier'],
  policy: ['sanctions', 'export_controls'],
  macro: ['macro_country', 'commodity_series'],
  industry: ['industry_registry', 'peer_financials', 'competitive_products'],
  market: ['market_snapshot', 'analysts', 'price_performance', 'estimates'],
  news: ['news'],
};

/* ── 1b. Rigor requirements ─────────────────────────────────────────── */

const RIGOR = [
  ['methodology', /\bmethodolog\w*\b/i],
  ['limitations', /\blimitations?\b|\bcaveats?\b/i],
  [
    'distinguish',
    /\b(?:distinguish\w*|separat(?:e|ing)|differentiat\w*|direct (?:matches|relationships) from)\b/i,
  ],
  [
    'no_inference',
    /\b(?:do not|don't|without|never) (?:infer\w*|impl\w*|assum\w*|treat\w*|mak\w* unsupported)\b|\bavoid (?:treating|assuming|implying|inferring)\b|\bdo not establish\b|\bnot (?:establish|prove) causation\b/i,
  ],
  [
    'show_evidence',
    /\b(?:show|explain|identify)\b[^?.]{0,30}\b(?:underlying|historical|supporting)? ?(?:evidence|records)\b|\bevidence behind\b|\bwhy each\b/i,
  ],
  ['counterarguments', /\bcounter[- ]?arguments?\b/i],
  [
    'unknowns',
    /\bwhat (?:cannot|can't|can not) be concluded\b|\bwhat additional information\b|\b(?:missing|gaps? in)\b[^?.]{0,40}\b(?:data|coverage)\b/i,
  ],
  [
    'reporting',
    /\b(?:account(?:ing)? for)\b[^?.]{0,30}\b(?:limitations?|lags?|gaps?)\b|\bwhere (?:supported by|the (?:available )?(?:records|data) support)\b|\bif (?:the )?(?:historical )?[\w\s]{0,30}support\b/i,
  ],
  [
    'do_not_measure',
    /\bwhat (?:the|these) (?:counts?|figures|numbers) (?:do and do not|do not) measure\b/i,
  ],
];

/* ── 1b. Scope and time ─────────────────────────────────────────────── */

/* The preposition that makes the following words the question's topic. */
/* Only after an activity ("lobbying on", "lobbying hardest on", "bills
   about"): in "compare A and B on revenue" the words after "on" are criteria. */
const TOPIC_PREP_RE =
  /\b(?:lobby\w*|spending|spend|policy|bills?|legislation|votes?|hearings?|debate|news|articles?|filings?|rules?)(?:\s+[\w-]+)?\s+(?:on|around|about|regarding|over|concerning)\s+(?:[\w.'-]+\s+){0,3}$/i;

const UNIVERSE_RE =
  /\b(?:which|what|identify|rank|list|top|compare|screen)\b[^?.]{0,60}\b(?:companies|firms|corporations|stocks|contractors|members|lawmakers|politicians|industries|sectors|countries|institutions|investors|hedge funds|organizations|recipients|associations|participants|managers|banks|insurers|utilities|exporters|suppliers)\b|\bmembers of congress\b|\b(?:publicly traded|listed) companies\b/i;
/* A span ("past three years", "last 12 months"), not a single period
   ("last year", "last quarter", which are points in time). */
const TRAILING_RE =
  /\b(?:past|last|previous) (?:\d+|two|three|four|five|six|seven|eight|nine|ten|twelve|eighteen|twenty|several|few|many) (?:years?|months?|quarters?)\b|\b(?:past|last|previous) decade\b|\bover time\b|\bsince (?:19|20)\d\d\b|\bhistorical\w*\b|\b(?:changed?|grown|grew|evolved)\b/i;
const FORWARD_RE =
  /\b(?:next|coming|upcoming) (?:\d+|two|three|four|five|six|seven|eight|nine|ten|twelve|eighteen|twenty|several|few|many) (?:years?|quarters?|months?)\b|\b(?:next|coming) (?:year|decade|few years)\b|\bover the (?:next|coming)\b|\b(?:outlook|forecast|scenarios?|long[- ]term|going forward|future|prospects|trajectory|bull case|bear case)\b/i;
const MULTI_YEAR_FWD_RE =
  /\b(?:next|coming) (?:two|three|four|five|ten|\d+|several|few) years?\b|\bmulti[- ]year\b|\blong[- ]term\b/i;
const SCENARIO_RE = /\b(?:scenarios?|bull case|bear case|base case)\b/i;

/* ── Multi-part assignments ──────────────────────────────────────────── */

/* A question followed by research instructions ("Identify the recipients,
   values and agencies. Explain the methodology.") is an assignment. */
const INSTRUCTION_RE =
  /^(?:identify|explain|analy[sz]e|examine|evaluate|compare|break(?:\s|-)?down|build|rank|show|connect|assess|investigate|distinguish|separate|clearly|map|find|state|account|do not|don't|avoid|consider|include|list|describe|summari[sz]e|highlight|determine|estimate|quantify|outline|review)\b/i;

/** Sentences, splitting where a terminator meets a capitalised word. */
function sentencesOf(text) {
  return String(text || '')
    .split(/(?<=[.?!])\s+(?=[A-Z"(])/)
    .map((x) => x.trim())
    .filter(Boolean);
}

/** Items in an enumerated list ("A, B, C, and D" -> 4). */
function enumeratedItems(sentence) {
  const commas = (sentence.match(/,/g) || []).length;
  if (!commas) return 0;
  /* "A, B and C" (no serial comma) has one more item than commas + 1. */
  const finalAnd = /\band\b/i.test(sentence) && !/,\s*(?:and|or)\b/i.test(sentence);
  return commas + 1 + (finalAnd ? 1 : 0);
}

/* ── Mandatory quick ─────────────────────────────────────────────────── */

const PRICE_TICKER_RE =
  /\b(?:stock price|share price|price of|market cap(?:italization)?|ticker(?:s| symbols?)?|trading at)\b/i;
const WHO_OWNS_RE = /^\s*who owns\b/i;
/* Operations that are framing when the object is a price, ticker or
   ownership lookup ("deep dive on the ticker", "breakdown of the tickers"). */
const FRAMING_OPS = new Set(['thesis_diligence', 'breakdown']);
const QUESTION_WORD_RE =
  /\b(?:what|who|which|how|why|when|where|is|are|does|do|did|can|could|should|will|compare|rank|list|show|give|analy[sz]e|explain)\b/i;

/* ── Estimates ───────────────────────────────────────────────────────── */

export const MODE_LABELS = {
  standard: 'about 15 to 30 seconds',
  deep: 'about 1 to 3 minutes',
};

/** "about 1 to 2 minutes", "about 2 to 3 minutes". */
export function estimateLabel(minSec, maxSec) {
  const lo = Math.max(1, Math.round(minSec / 60));
  const hi = Math.max(lo + 1, Math.ceil(maxSec / 60));
  return `about ${lo} to ${hi} minutes`;
}

/**
 * How long a run takes, from its planned work: understanding and planning
 * (about 2 s), the evidence phase (tasks run in parallel, so the per-task
 * budget, plus a little per task for scoring), then the writing phase (the
 * depth profile's synthesis budget; an investment memo writes longer).
 */
export function estimateFromPlan(mode, { tasks = 0, memo = false } = {}) {
  if (mode === 'standard') {
    const D = DEPTHS.standard;
    const evidence = D.taskMs / 1000 + 0.3 * tasks;
    const minSec = Math.round(2 + evidence + 9);
    const maxSec = Math.max(minSec + 5, Math.round(2 + evidence * 2 + 18));
    return {
      minSec: Math.min(minSec, 25),
      maxSec: Math.min(maxSec, 30),
      label: MODE_LABELS.standard,
    };
  }
  if (mode === 'deep') {
    const evidence = Math.min(DEPTHS.deep.taskMs / 1000, 6 + 0.8 * tasks);
    const writeMin = memo ? 45 : 35;
    const writeMax = memo ? 150 : 110;
    const minSec = Math.round(Math.min(150, 3 + evidence + writeMin));
    const maxSec = Math.round(Math.min(240, 3 + DEPTHS.deep.taskMs / 1000 + writeMax + tasks));
    return { minSec, maxSec, label: MODE_LABELS.deep };
  }
  return { minSec: 3, maxSec: 6, label: 'a few seconds' };
}

/* ── Helpers ─────────────────────────────────────────────────────────── */

const DOMAIN_READING = {
  contracts: 'contract history',
  company_financials: 'reported financials',
  institutional: 'institutional ownership',
  lobbying: 'lobbying disclosures',
  congress_trading: 'congressional trading disclosures',
  politician: "the member's disclosures",
  geopolitics: 'sanctions and export-control records',
  country: 'country indicators',
  macro: 'macro indicators',
  industry: 'industry data',
  sector: 'sector data',
  competition: 'the competitive landscape',
  market_performance: 'market performance',
  analyst_views: 'analyst expectations',
  commodity: 'commodity prices',
  news: 'recent news',
  prediction: 'prediction markets',
  ipo: 'IPO filings',
  editorial: 'Ezana research',
};

const list = (parts) =>
  parts.length < 2
    ? parts.join('')
    : `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;

function subjectLabel({ companies, understood, universe }) {
  if (companies.length === 1) return companies[0].name;
  const ind = (understood?.entities || []).find(
    (e) => e.kind === 'industry' || e.kind === 'sector',
  );
  if (ind) return `the ${ind.label.toLowerCase()} industry`;
  if (companies.length > 1) return `${companies.length} companies`;
  if (universe) return 'the companies in question';
  return 'the subject';
}

const OP_PHRASE = {
  thesis_diligence: () => 'asks for a full research dossier',
  relationship_map: () => 'asks for a map of documented relationships across datasets',
  discovery: () => 'asks Sonar to find patterns across datasets',
  reconciliation: () => 'asks Sonar to reconcile evidence that points different ways',
  dependence: (s) => `asks how dependent ${s} is on one source of business`,
  sustainability: (s) => `asks whether ${s}'s growth can last`,
  opportunity: () => 'asks who is best positioned to benefit, and why',
  risk_assessment: (s) => `asks for the material risks to ${s}`,
  outlook_scenario: (s) => `asks for an outlook on ${s} over a horizon`,
  causal_impact: () => 'asks how one factor affects another',
  exposure: (s) => `asks how exposed ${s} is`,
  compare: (s) => `compares ${s} on several dimensions`,
  rank_screen: () => 'asks for a ranking',
  breakdown: () => 'asks for a breakdown',
  trend: () => 'asks how something has changed over time',
};

/* ── The lightweight resolution (coverage check, no database) ──────── */

/** A resolution built from deterministic entities only. */
export function liteResolution(understood, companies) {
  const ents = understood?.entities || [];
  const tickerEnt = ents.find((e) => e.kind === 'ticker');
  const company = companies[0]
    ? { ticker: companies[0].ticker, name: companies[0].name }
    : tickerEnt
      ? { ticker: tickerEnt.id, name: tickerEnt.label }
      : null;
  const pol = ents.find((e) => e.kind === 'person_politician');
  const ind = ents.find((e) => e.kind === 'industry' || e.kind === 'sector');
  const countries = ents
    .filter((e) => e.kind === 'country')
    .map((e) => ({ iso2: e.id, iso3: e.id, name: e.label }));
  const tickers = [
    ...new Set([...companies.map((c) => c.ticker), ...(tickerEnt ? [tickerEnt.id] : [])]),
  ];
  const commodity = DOMAINS.commodity.cues.some((re) => re.test(understood?.corrected || ''))
    ? { id: 'commodity', label: 'Commodity' }
    : null;
  const universe = ind
    ? { label: `${ind.label} companies`, tickers: tickers.length ? tickers : ['_'], names: {} }
    : tickers.length
      ? { label: company?.name || 'Companies', tickers, names: {} }
      : null;
  return {
    subject: company
      ? { kind: 'company', id: company.ticker, label: company.name }
      : pol
        ? { kind: 'politician', id: pol.id, label: pol.label }
        : ind
          ? { kind: 'industry', id: ind.id, label: ind.label }
          : countries[0]
            ? { kind: 'country', id: countries[0].iso2, label: countries[0].name }
            : null,
    company,
    politician: pol ? { id: pol.id, name: pol.label } : null,
    countries,
    industry: ind ? { id: ind.id, label: ind.label, registry: { lite: true } } : null,
    commodity,
    universe,
    peers: [],
    customers: [],
    notes: ['lite'],
  };
}

/* ── The classifier ──────────────────────────────────────────────────── */

/**
 * The classifier without the planner coverage check. research-mode.js adds
 * the check (it needs the research spec, which itself reads this core, so
 * the two stay in separate modules with no import cycle).
 * @param {string} query
 * @param {{ understood?: object, now?: Date, coverage?: Function|null }} [opts]
 *   coverage: the coverage check (research-mode.js planCoverage), or null.
 */
export function classifyCore(query, { understood = null, now = new Date(), coverage = null } = {}) {
  const text = String(query || '')
    .replace(/\s+/g, ' ')
    .trim();
  const u = understood || understandDeterministic(text);
  const t = u?.corrected && u.corrected.length >= text.length - 4 ? u.corrected : text;
  const words = text.split(/\s+/).filter(Boolean).length;

  /* Entities */
  const companies = mentionedCompanies(text);
  for (const e of u?.entities || []) {
    if (e.kind === 'ticker' && !companies.some((c) => c.ticker === e.id))
      companies.push({ ticker: e.id, name: e.label, surface: e.surface });
  }
  const politicians = (u?.entities || []).filter((e) => e.kind === 'person_politician');
  const countries = (u?.entities || []).filter((e) => e.kind === 'country');
  const industryEnt = (u?.entities || []).find((e) =>
    ['industry', 'sector', 'theme'].includes(e.kind),
  );
  const universe = UNIVERSE_RE.test(t);
  const named = companies.length + politicians.length + countries.length;

  /* Operations */
  const ops = detectOperations(t);
  const opIds = ops.map((o) => o.id);
  const has = (id) => opIds.includes(id);
  const weighted = ops.filter((o) => o.weight >= 1).sort((a, b) => b.weight - a.weight);
  const maxW = weighted[0]?.weight || 0;
  const opPoints = Math.min(3, maxW + 0.5 * Math.max(0, weighted.length - 1));

  /* Evidence families: explicit words, plus spec domains scoring 0.6+. */
  const explicit = Object.entries(FAMILIES)
    .filter(([, f]) => f.re.test(t))
    .map(([id]) => id);
  const domains = scoreDomains(t, u);
  /* The country domain's cues ("growth", "outlook") are a prior for a
     country profile; they add the macro family only when a country is named. */
  const countryNamed = (u?.entities || []).some((e) => e.kind === 'country');
  const fromDomains = domains
    .filter((d) => d.score >= 0.6 && DOMAIN_FAMILY[d.id])
    .filter((d) => d.id !== 'country' || countryNamed)
    .map((d) => DOMAIN_FAMILY[d.id]);
  const families = [...new Set([...explicit, ...fromDomains])];
  const breadthPoints = families.length >= 4 ? 3 : Math.max(0, families.length - 1);

  /* A family named only as the topic of the question ("lobbying on AI
     regulation", "lobbying around export controls") is what is being
     measured about, not a second criterion. */
  const topicOnly = explicit.filter((id) => {
    const re = new RegExp(FAMILIES[id].re.source, 'gi');
    const hits = [...t.matchAll(re)];
    return (
      hits.length > 0 &&
      hits.every((m) => TOPIC_PREP_RE.test(t.slice(Math.max(0, m.index - 40), m.index)))
    );
  });
  const criteria = explicit.length - topicOnly.length;

  /* Entity scope */
  let scopePoints = 0;
  if (
    (universe && (has('rank_screen') || has('compare')) && criteria >= 2) ||
    (companies.length >= 3 && (has('compare') || criteria >= 2))
  )
    scopePoints = 2;
  else if (named >= 2 || universe || (industryEnt && !companies.length)) scopePoints = 1;

  /* Time shape */
  const trailing = has('trend') || TRAILING_RE.test(t);
  const forward = FORWARD_RE.test(t);
  const timePoints =
    trailing && forward
      ? 2
      : forward && MULTI_YEAR_FWD_RE.test(t) && SCENARIO_RE.test(t)
        ? 2
        : trailing || forward
          ? 1
          : 0;

  /* Rigor */
  const rigorHits = RIGOR.filter(([, re]) => re.test(t)).map(([id]) => id);
  const rigorPoints = Math.min(2, rigorHits.length);

  const score = opPoints + breadthPoints + scopePoints + timePoints + rigorPoints;
  const dimensions = {
    operation: { points: opPoints, evidence: weighted.map((o) => o.id) },
    breadth: { points: breadthPoints, evidence: families },
    scope: {
      points: scopePoints,
      evidence: [
        ...companies.map((c) => c.ticker),
        ...politicians.map((p) => p.label),
        ...countries.map((c) => c.id),
        ...(universe ? ['universe'] : []),
        ...(industryEnt ? [industryEnt.label] : []),
      ],
    },
    time: {
      points: timePoints,
      evidence: [...(trailing ? ['trend'] : []), ...(forward ? ['forward'] : [])],
    },
    rigor: { points: rigorPoints, evidence: rigorHits },
  };

  /* 1c. Mandatory triggers */
  const triggers = [];
  const hasSubject = Boolean(named || universe || industryEnt || DOMAINS.industry.cues[0].test(t));
  if (['thesis_diligence', 'relationship_map', 'discovery', 'reconciliation'].some(has))
    triggers.push('deep:assignment_operation');
  if (['dependence', 'sustainability', 'opportunity', 'risk_assessment'].some(has) && hasSubject)
    triggers.push('deep:judgement_on_subject');
  if (companies.length >= 3 && (criteria >= 2 || weighted.length >= 2))
    triggers.push('deep:multi_company_comparison');
  if (has('rank_screen') && criteria >= 2) triggers.push('deep:multi_criteria_ranking');
  if (trailing && forward) triggers.push('deep:trend_and_forward');
  if (criteria >= 3) triggers.push('deep:three_families_requested');
  /* A question plus instructions that add analysis, rigor or three or more
     deliverables (structure, not wording: the instructions are the work). */
  const instructions = sentencesOf(text)
    .slice(1)
    .filter((x) => INSTRUCTION_RE.test(x));
  if (
    instructions.length &&
    (weighted.length >= 2 ||
      rigorHits.length >= 1 ||
      criteria >= 2 ||
      instructions.some((x) => enumeratedItems(x) >= 3))
  )
    triggers.push('deep:multi_part_assignment');

  /* Framing words ("deep dive", "full report") around a price, ticker or
     who-owns lookup do not make it an assignment. */
  const lookupOnly = PRICE_TICKER_RE.test(t) || WHO_OWNS_RE.test(t) || HOLDERS_OF_RE.test(t);
  if (
    lookupOnly &&
    weighted.every((o) => FRAMING_OPS.has(o.id)) &&
    criteria <= 1 &&
    triggers.every((x) => x === 'deep:assignment_operation')
  ) {
    triggers.length = 0;
  }

  const quickTriggers = [];
  if (
    !triggers.length &&
    weighted.every((o) => (lookupOnly ? FRAMING_OPS.has(o.id) : o.id === 'thesis_diligence')) &&
    rigorHits.length === 0
  ) {
    if (WHO_OWNS_RE.test(t) || HOLDERS_OF_RE.test(t)) quickTriggers.push('quick:who_owns');
    if (PRICE_TICKER_RE.test(t)) quickTriggers.push('quick:price_or_ticker');
    if (has('lookup') && criteria <= 1 && companies.length <= 1)
      quickTriggers.push('quick:single_metric_lookup');
    if (words <= 4 && !QUESTION_WORD_RE.test(t)) quickTriggers.push('quick:bare_entity');
  }

  /* Mode from triggers, then score with the borderline band. */
  let mode;
  let confidence = 'clear';
  let goDeeperTo = null;
  if (triggers.length) {
    mode = 'deep';
  } else if (quickTriggers.length) {
    mode = 'quick';
    triggers.push(...quickTriggers);
  } else if (maxW < 1 && rigorHits.length === 0 && !forward) {
    /* Only lookups and lists: the quick ping, however many records it
       spans. A list across a universe or several record types offers Go
       deeper to a standard analysis. */
    mode = 'quick';
    if (score >= THRESHOLDS.standard + 2 * BAND) {
      confidence = 'borderline';
      goDeeperTo = 'standard';
    }
  } else if (score >= THRESHOLDS.deep + BAND) {
    mode = 'deep';
  } else if (score > THRESHOLDS.deep - BAND) {
    mode = 'standard';
    confidence = 'borderline';
    goDeeperTo = 'deep';
  } else if (score >= THRESHOLDS.standard + BAND) {
    mode = 'standard';
  } else if (score > Math.max(0, THRESHOLDS.standard - BAND)) {
    mode = 'quick';
    confidence = 'borderline';
    goDeeperTo = 'standard';
  } else {
    mode = 'quick';
  }

  const angles = DEEP_ANGLES.filter((a) => a.re.test(t)).map(({ id, label }) => ({ id, label }));
  const domainList = domains
    .filter((d) => d.score >= 0.6 && d.id !== 'company')
    .slice(0, 6)
    .map((d) => ({ id: d.id, label: DOMAINS[d.id]?.label || d.id }));

  /* 1e. The coverage check (injected): plan the run with a lite
     resolution; a standard plan that drops a requested family offers deep. */
  let plannedWork = { tasks: 0, families: families.length, droppedAtStandard: [] };
  let format = 'report';
  let estimate = estimateFromPlan(mode);
  if (typeof coverage === 'function') {
    const r = coverage({
      u,
      t,
      now,
      companies,
      mode,
      confidence,
      angles,
      opIds,
      explicit,
      families,
    });
    plannedWork = r.plannedWork;
    if (r.escalate) {
      mode = 'deep';
      confidence = 'clear';
      goDeeperTo = null;
      triggers.push('deep:standard_plan_incomplete');
    }
    format = r.format;
    estimate = r.estimate;
  } else if (mode === 'deep') {
    estimate = estimateFromPlan('deep', { tasks: 12, memo: false });
  }

  /* Plain-English reasons: the first is the "why" sentence. */
  const subject = subjectLabel({ companies, understood: u, universe });
  const lead = weighted.find((o) => OP_PHRASE[o.id]);
  const reading = domains
    .filter((d) => d.score >= 0.6 && DOMAIN_READING[d.id])
    .map((d) => DOMAIN_READING[d.id]);
  const readingList = [...new Set(reading)].slice(0, 4);
  const reasons = [];
  if (lead) {
    const phrase = OP_PHRASE[lead.id](subject);
    reasons.push(
      readingList.length >= 2
        ? `This question ${phrase}, which means reading ${list(readingList)} together.`
        : `This question ${phrase}.`,
    );
  }
  if (families.length >= 3) reasons.push(`It needs ${families.length} kinds of evidence.`);
  if (rigorHits.length) reasons.push('It sets standards for how the evidence is weighed.');
  if (triggers.includes('deep:standard_plan_incomplete'))
    reasons.push(
      `A standard run would leave out ${list(plannedWork.droppedAtStandard)}, which the question asks for.`,
    );
  if (trailing && forward) reasons.push('It looks back at a trend and ahead over a horizon.');

  return {
    version: MODE_VERSION,
    mode,
    confidence,
    goDeeperTo,
    requestedFamilies: explicit,
    score: Number(score.toFixed(2)),
    dimensions,
    triggers,
    operations: opIds,
    domains: domainList,
    angles,
    plannedWork,
    format,
    estimate,
    reasons,
  };
}

/* ── Responses (shared by the routes, pure) ──────────────────────────── */

/** The deep research offer a route returns ({ deepSuggested, deep }). */
export function deepOffer(c, { isGuest = false } = {}) {
  return {
    reasons: c.reasons,
    domains: c.domains,
    angles: c.angles,
    operations: c.operations,
    estimate: c.estimate,
    format: c.format,
    guestNeedsAccount: Boolean(isGuest),
    /* What the client sends back with its mode events. */
    meta: modeMeta(c),
  };
}

/** The classification fields a client echoes in its mode events. */
export function modeMeta(c) {
  return {
    version: c.version,
    mode: c.mode,
    confidence: c.confidence,
    score: c.score,
    triggers: c.triggers || [],
  };
}

/** The Go deeper hint for a lighter answer, or null when there is none. */
export function goDeeperFor(c, { isGuest = false } = {}) {
  if (!c?.goDeeperTo) return null;
  const line =
    c.goDeeperTo === 'deep'
      ? `Sonar can also read ${
          list((c.domains || []).slice(0, 3).map((d) => d.label.toLowerCase())) || 'more datasets'
        } and write a full assessment.`
      : 'Sonar can also run a focused analysis of the records behind this answer.';
  return {
    to: c.goDeeperTo,
    meta: modeMeta(c),
    reasons: [line, ...(c.reasons || []).slice(0, 1)],
    ...(c.goDeeperTo === 'deep'
      ? {
          deep: deepOffer(
            {
              ...c,
              estimate: estimateFromPlan('deep', {
                tasks: Math.max(10, c.plannedWork?.tasks || 0),
                memo: c.format === 'investment_memo',
              }),
            },
            { isGuest },
          ),
        }
      : {}),
  };
}

/**
 * What /api/sonar/landing-query does with a classification (pure, so the
 * routing is testable):
 *   { kind: 'deep', deep }          offer deep research, no spend
 *   { kind: 'standard', goDeeper }  the host runs standard research, no spend
 *   { kind: 'quick', goDeeper }     run the quick ping (goDeeper may be null)
 */
export function routeForClassification(
  c,
  { deepEnabled = true, standardEnabled = true, hostRunsStandard = false, isGuest = false } = {},
) {
  if (!c) return { kind: 'quick', goDeeper: null };
  if (c.mode === 'deep' && c.confidence === 'clear' && deepEnabled) {
    return { kind: 'deep', deep: deepOffer(c, { isGuest }) };
  }
  if (c.mode === 'standard' && standardEnabled && hostRunsStandard) {
    return { kind: 'standard', goDeeper: goDeeperFor(c, { isGuest }) };
  }
  const canGoDeeper =
    c.mode === 'quick' && c.goDeeperTo && (c.goDeeperTo !== 'standard' || hostRunsStandard);
  return { kind: 'quick', goDeeper: canGoDeeper ? goDeeperFor(c, { isGuest }) : null };
}

/**
 * Whether a real phase-1 plan (database resolution) left out a family the
 * question asked for: all of its sources missing from the tasks and at
 * least one cut by the depth cap.
 * @returns {{ incomplete: boolean, missing: string[] }}
 */
export function coverageFromPlan(plan, requestedFamilies = []) {
  const kept = new Set((plan?.tasks || []).map((x) => x.source));
  const capped = new Set(
    (plan?.excluded || []).filter((x) => x.reason === 'depth_cap').map((x) => x.source),
  );
  const missing = requestedFamilies
    .filter((f) => FAMILY_SOURCES[f])
    .filter(
      (f) =>
        !FAMILY_SOURCES[f].some((x) => kept.has(x)) && FAMILY_SOURCES[f].some((x) => capped.has(x)),
    )
    .map((f) => FAMILIES[f].label);
  return { incomplete: missing.length > 0, missing };
}
