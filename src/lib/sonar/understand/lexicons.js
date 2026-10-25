/**
 * Lexicons for query understanding: the industry/sector taxonomy (ids match
 * public.industries), themes, policies, the intent vocabulary, a small set of
 * known tickers for the deterministic pass (the live ticker map can be
 * injected by the caller), politician surnames, and the spell lexicon with
 * its frequency prior and bigram context.
 */
import { COUNTRIES, US_STATES } from '@/lib/sonar/understand/geo-codes';

/** id, display noun, label, synonyms (lower-case, plurals included). */
export const INDUSTRIES = [
  {
    id: 'semiconductors',
    noun: 'Semiconductor',
    label: 'Semiconductors',
    synonyms: [
      'semiconductor',
      'semiconductors',
      'semis',
      'semi',
      'chip',
      'chips',
      'chipmaker',
      'chipmakers',
      'microchips',
      'foundry',
      'foundries',
    ],
  },
  {
    id: 'aerospace_defense',
    noun: 'Aerospace and defense',
    label: 'Aerospace & Defense',
    synonyms: [
      'aerospace',
      'defense',
      'defence',
      'defense contractors',
      'aerospace and defense',
      'aerospace & defense',
    ],
  },
  { id: 'steel', noun: 'Steel', label: 'Steel', synonyms: ['steel', 'steelmakers', 'steelmaker'] },
  {
    id: 'banks',
    noun: 'Banking',
    label: 'Banks',
    synonyms: ['bank', 'banks', 'banking', 'lenders'],
  },
  {
    id: 'pharmaceuticals',
    noun: 'Pharmaceutical',
    label: 'Pharmaceuticals',
    synonyms: ['pharma', 'pharmaceutical', 'pharmaceuticals', 'drugmakers', 'drugmaker'],
  },
  {
    id: 'energy',
    noun: 'Energy',
    label: 'Energy',
    synonyms: ['energy', 'oil', 'gas', 'oil and gas'],
  },
  {
    id: 'autos',
    noun: 'Auto',
    label: 'Autos',
    synonyms: ['auto', 'autos', 'automotive', 'automakers', 'carmakers'],
  },
  { id: 'software', noun: 'Software', label: 'Software', synonyms: ['software', 'saas'] },
  { id: 'biotech', noun: 'Biotech', label: 'Biotech', synonyms: ['biotech', 'biotechnology'] },
  { id: 'mining', noun: 'Mining', label: 'Mining', synonyms: ['mining', 'miners'] },
  { id: 'shipping', noun: 'Shipping', label: 'Shipping', synonyms: ['shipping', 'shipbuilding'] },
];

export const SECTORS = [
  {
    id: 'information_technology',
    label: 'Information Technology',
    phrases: [/\bIT sector\b/, /\binformation technology\b/i, /\btech sector\b/i],
  },
  { id: 'financials', label: 'Financials', phrases: [/\bfinancials? sector\b/i] },
  { id: 'health_care', label: 'Health Care', phrases: [/\bhealth ?care sector\b/i] },
];

export const THEMES = [
  {
    id: 'ai',
    label: 'Artificial intelligence',
    match: /^(ai|a\.i\.)$/i,
    phrase: /\bartificial intelligence\b/i,
  },
  { id: 'nuclear', label: 'Nuclear power', match: /^nuclear$/i },
  { id: 'ev', label: 'Electric vehicles', match: /^evs?$/i, phrase: /\belectric vehicles?\b/i },
  { id: 'data_centers', label: 'Data centers', phrase: /\bdata cent(er|re)s?\b/i },
];

export const POLICIES = [
  { id: 'chips_act', label: 'CHIPS Act', phrase: /\bchips (and science )?act\b/i },
  { id: 'ira', label: 'Inflation Reduction Act', phrase: /\binflation reduction act\b/i },
  { id: 'section_232', label: 'Section 232 tariffs', phrase: /\bsection 232\b/i },
  { id: 'export_controls', label: 'Export controls', phrase: /\bexport controls?\b/i },
];

/** Notable members of Congress by surname (the live directory can extend it). */
export const POLITICIANS = [
  ['pelosi', 'P000197', 'Nancy Pelosi'],
  ['tuberville', 'T000278', 'Tommy Tuberville'],
  ['crenshaw', 'C001120', 'Dan Crenshaw'],
  ['gottheimer', 'G000583', 'Josh Gottheimer'],
  ['mccaul', 'M001157', 'Michael McCaul'],
  ['schumer', 'S000148', 'Chuck Schumer'],
  ['mcconnell', 'M000355', 'Mitch McConnell'],
  ['khanna', 'K000389', 'Ro Khanna'],
  ['greene', 'G000596', 'Marjorie Taylor Greene'],
];

/** Tickers the deterministic pass knows without the live map. */
export const KNOWN_TICKERS = {
  USA: 'Liberty All-Star Equity Fund',
  LYFT: 'Lyft',
  LYV: 'Live Nation Entertainment',
  NVDA: 'NVIDIA',
  AMD: 'Advanced Micro Devices',
  INTC: 'Intel',
  TSM: 'Taiwan Semiconductor Manufacturing',
  QCOM: 'Qualcomm',
  AVGO: 'Broadcom',
  MU: 'Micron Technology',
  AMAT: 'Applied Materials',
  LRCX: 'Lam Research',
  KLAC: 'KLA',
  TXN: 'Texas Instruments',
  LMT: 'Lockheed Martin',
  RTX: 'RTX',
  NOC: 'Northrop Grumman',
  GD: 'General Dynamics',
  BA: 'Boeing',
  AAPL: 'Apple',
  MSFT: 'Microsoft',
  GOOGL: 'Alphabet',
  AMZN: 'Amazon',
  META: 'Meta Platforms',
  TSLA: 'Tesla',
  IT: 'Gartner',
  ALL: 'Allstate',
  ARE: 'Alexandria Real Estate Equities',
  NOW: 'ServiceNow',
  SPY: 'SPDR S&P 500 ETF Trust',
  QQQ: 'Invesco QQQ Trust',
  SOXX: 'iShares Semiconductor ETF',
  XLE: 'Energy Select Sector SPDR Fund',
};

/** Words that make an industry ping a LAYOUT ping. */
/* A country plus one of these is a country_rank ping. */
export const RANK_CUE =
  /\b(rank|ranks|ranked|ranking|rankings|where does .+ (rank|stand|place)|how big is .+ econom|largest econom|biggest econom|top econom|position in the (world|global) econom|world econom|global econom|global empire|empire (index|ranking|rankings)|lighthouse)\b/i;

/** The macro metric a rank ping names, and whether it named one. */
export function rankMetricOf(text) {
  const t = String(text || '').toLowerCase();
  if (/\b(global empire|empire (index|ranking|rankings|score)|lighthouse)\b/.test(t))
    return { metric: 'lighthouse_composite', metricExplicit: true };
  if (/\b(per capita|per-capita|per head|per person)\b/.test(t))
    return /\b(ppp|purchasing power)\b/.test(t)
      ? { metric: 'gdp_per_capita_ppp', metricExplicit: true }
      : { metric: 'gdp_per_capita_usd', metricExplicit: true };
  if (/\b(ppp|purchasing power)\b/.test(t)) return { metric: 'gdp_ppp', metricExplicit: true };
  if (/\b(growth|growing|fastest)\b/.test(t))
    return { metric: 'gdp_growth_real', metricExplicit: true };
  if (/\b(gdp|nominal|bigger|smaller|largest|biggest|size)\b/.test(t))
    return { metric: 'gdp_nominal_usd', metricExplicit: /\b(gdp|nominal)\b/.test(t) };
  return { metric: 'gdp_nominal_usd', metricExplicit: false };
}

export const METRIC_LABEL = {
  gdp_nominal_usd: 'nominal GDP',
  gdp_ppp: 'GDP at PPP',
  gdp_per_capita_usd: 'GDP per capita',
  gdp_per_capita_ppp: 'GDP per capita at PPP',
  gdp_growth_real: 'real GDP growth',
  lighthouse_composite: 'the Global Empire ranking',
};

export const LAYOUT_WORDS =
  /\b(layout|overview|landscape|map|mapping|breakdown|ecosystem|structure|value chain|supply chain|how does|how do|explain|anatomy|primer)\b/i;

const INTENT_VOCAB = [
  /* Rank and macro words: "ranking" is one edit from "banking" and "rank"
     one from "bank", so without these the spell pass turned "what ranking is
     india in the world economy" into the banking industry in India. */
  'rank',
  'ranks',
  'ranked',
  'ranking',
  'rankings',
  'economy',
  'economies',
  'economic',
  'world',
  'global',
  'gdp',
  'ppp',
  'capita',
  'growth',
  'growing',
  'fastest',
  'nominal',
  'position',
  'bigger',
  'smaller',
  'richest',
  'poorest',
  'index',
  'empire',
  'lighthouse',
  'layout',
  'overview',
  'breakdown',
  'landscape',
  'compare',
  'comparison',
  'versus',
  'top',
  'biggest',
  'largest',
  'industry',
  'industries',
  'sector',
  'sectors',
  'supply',
  'chain',
  'value',
  'map',
  'ecosystem',
  'structure',
  'companies',
  'company',
  'stocks',
  'stock',
  'shares',
  'trades',
  'trading',
  'holders',
  'holdings',
  'funds',
  'fund',
  'winners',
  'losers',
  'act',
  'policy',
  'tariffs',
  'tariff',
  'contracts',
  'lobbying',
  'congress',
  'investment',
  'investors',
  'market',
  'markets',
  'prices',
  'price',
  'earnings',
  'revenue',
  'growth',
  'outlook',
  'exposure',
  'exposed',
  'manufacturers',
  'manufacturing',
  'equipment',
  'packaging',
  'design',
  'fabrication',
  'materials',
  'work',
  'works',
  'explain',
  'primer',
  'leaders',
  'players',
  'competitors',
];
const COMMON = [
  'give',
  'show',
  'tell',
  'what',
  'which',
  'who',
  'whom',
  'where',
  'when',
  'why',
  'how',
  'does',
  'do',
  'did',
  'is',
  'are',
  'was',
  'were',
  'be',
  'been',
  'me',
  'us',
  'our',
  'my',
  'i',
  'you',
  'it',
  'its',
  'they',
  'them',
  'their',
  'a',
  'an',
  'the',
  'of',
  'in',
  'on',
  'at',
  'to',
  'for',
  'from',
  'by',
  'with',
  'about',
  'across',
  'within',
  'and',
  'or',
  'vs',
  'not',
  'no',
  'all',
  'any',
  'some',
  'most',
  'more',
  'less',
  'this',
  'that',
  'these',
  'those',
  'there',
  'here',
  'hold',
  'held',
  'own',
  'owns',
  'buy',
  'buying',
  'sell',
  'selling',
  'get',
  'need',
  'want',
  'like',
  'list',
  'find',
  'see',
  'look',
  'please',
  'can',
  'could',
  'would',
  'should',
  'will',
  'now',
  'today',
  'year',
  'years',
  'quarter',
  'new',
  'latest',
  'recent',
  'big',
  'small',
  'nancy',
  'tommy',
  'dan',
  'josh',
  'chuck',
  'mitch',
  'lunch',
  'have',
  'has',
  'had',
  'into',
  'over',
  'under',
  'between',
  'during',
  'after',
  'before',
  'up',
  'down',
  'out',
  'off',
  'than',
  'then',
];
export const STOPWORDS = new Set(COMMON);

const industryWords = INDUSTRIES.flatMap((i) => i.synonyms.flatMap((s) => s.split(/\s+/)));
const geoWords = [
  ...COUNTRIES.flatMap((c) => [c[2], ...c[3]]).flatMap((s) => s.toLowerCase().split(/\s+/)),
  ...US_STATES.flatMap((s) => s[1].toLowerCase().split(/\s+/)),
];
const politicianWords = POLITICIANS.map((p) => p[0]);

/** Place-name words only (countries and US states), normalised like LEXICON.
    The spell pass reads it to tell a demonym ("Indian", "Canadian") from a
    typo: the first is a word built on the place, the second a misspelling. */
export const GEO_LEXICON = new Set(
  geoWords.map((w) => w.toLowerCase().replace(/[^a-z&]/g, '')).filter((w) => w.length >= 3),
);

export const LEXICON = new Set(
  [...INTENT_VOCAB, ...industryWords, ...geoWords, ...politicianWords]
    .map((w) => w.toLowerCase().replace(/[^a-z&]/g, ''))
    .filter((w) => w.length >= 3),
);

/** A light frequency prior: intent words and industries outrank the rest. */
export const FREQ = new Map([
  ...[...LEXICON].map((w) => [w, 1]),
  ...INTENT_VOCAB.map((w) => [w, 5]),
  ...industryWords.map((w) => [w, 4]),
]);

/** Bigram context: "a layout", "layout of", "chip companies", … */
export const BIGRAMS = new Map(
  [
    ['a layout', 2],
    ['layout of', 2],
    ['an overview', 2],
    ['overview of', 2],
    ['the industry', 1],
    ['industry in', 1],
    ['chip companies', 2],
    ['companies in', 1],
    ['supply chain', 2],
    ['value chain', 2],
    ['in canada', 1],
    ['pelosi trades', 2],
  ].map(([k, v]) => [k, v]),
);

export function lookupIndustry(token) {
  const t = String(token || '').toLowerCase();
  return INDUSTRIES.find((i) => i.synonyms.includes(t)) || null;
}

export function lookupGeo(surface) {
  const raw = String(surface || '');
  const t = raw.toLowerCase();
  /* An ISO3 code counts only as written in capitals: "per" in "gdp per
     capita" is not Peru, "can" is not Canada. Aliases and names match in any
     case. */
  const codeOk = raw === raw.toUpperCase();
  for (const [iso2, iso3, label, aliases, takesThe] of COUNTRIES) {
    if (aliases.includes(t) || label.toLowerCase() === t || (codeOk && iso3.toLowerCase() === t)) {
      return {
        id: iso2,
        iso3,
        label,
        takesThe,
        major: aliases.includes(t) || label.toLowerCase() === t,
      };
    }
  }
  return null;
}

export function lookupState(surface) {
  const t = String(surface || '').toLowerCase();
  const hit = US_STATES.find(([, name]) => name.toLowerCase() === t);
  return hit ? { id: hit[0], label: hit[1] } : null;
}

export function lookupPolitician(token) {
  const t = String(token || '').toLowerCase();
  const hit = POLITICIANS.find((p) => p[0] === t);
  return hit ? { id: `bioguide:${hit[1]}`, label: hit[2] } : null;
}
