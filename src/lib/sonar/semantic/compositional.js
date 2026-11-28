/**
 * Sonar 6.1 (Nov 28 2026): compositional intent understanding.
 *
 * A research question is read as a small pipeline of typed parts, not matched against
 * one pattern per family:
 *
 *   universe   what is being studied: a holder's holdings, a sector, an index, named
 *              tickers, a company, a country
 *   filters    conditions that narrow the universe: a measure compared with a number
 *              ("revenue growth above 20%"), or the presence of an event ("that won
 *              government contracts", "that insiders bought")
 *   measures   what is computed on the universe, from a typed vocabulary bound to Ezana
 *              datasets (METRICS below)
 *   operation  rank (with direction), compare, relate (driver -> target), model (DCF,
 *              GARCH, backtest), screen, assess (dependency, pressure, risk)
 *   time       the window the question names
 *
 * The vocabulary is generic financial language (revenue growth, contract awards,
 * lobbying spend, rates, the lira is just a currency), so a new company, member, sector
 * or country needs no new pattern. Every measure names the dataset it needs and whether
 * Ezana holds it; a measure without data is reported unsupported, never substituted.
 *
 * Pure and deterministic; relative imports only.
 */

import { NUM, toNum } from '../composer/subject.js';

/* ── Measures ────────────────────────────────────────────────────────── */

/**
 * id: { words (regex source, tested on normalized text), dataset, unit, available,
 *       kind: 'company' | 'macro' | 'market' | 'holder' | 'event' }
 * `available` is true only for datasets present in the database (Nov 28 2026 audit).
 */
export const METRICS = {
  revenue_growth: {
    /* Sonar 6.4: verb forms ("grew revenue", "saw revenue rise", "increased sales"). */
    words: String.raw`(?:revenue|sales|top[- ]line)\s+(?:growth|growing|grew|increase[sd]?|rise|rising|rose|gains?|expansion)|(?:grow(?:ing|th in)?|grew|increas(?:e|ed|ing)|rais(?:e|ed|ing)|expand(?:ed|ing)?|boost(?:ed|ing)?)\s+(?:their\s+|its\s+)?(?:revenue|sales|top[- ]line)`,
    dataset: 'sec_fundamentals',
    unit: 'pct',
    available: true,
    kind: 'company',
  },
  earnings_growth: {
    words: String.raw`(?:earnings|eps|profit|net income)\s+(?:growth|growing|grew|increase)`,
    dataset: 'sec_fundamentals',
    unit: 'pct',
    available: true,
    kind: 'company',
  },
  margin: {
    words: String.raw`(?:gross|operating|net|profit|ebitda)\s+margins?|margins?`,
    dataset: 'sec_fundamentals',
    unit: 'pct',
    available: true,
    kind: 'company',
  },
  pe_ratio: {
    words: String.raw`p\/?e(?:\s+ratio)?|price[- ]to[- ]earnings|earnings multiple`,
    dataset: 'sec_fundamentals',
    unit: 'x',
    available: true,
    kind: 'company',
  },
  /* Sonar 6.4: valuation measures from filed TTM figures and an authorized price. */
  ps_ratio: {
    words: String.raw`p\/s(?:\s+ratio)?|price[- ]to[- ]sales(?:\s+ratio)?|sales multiple|\d+(?:\.\d+)?\s*(?:x|times)\s+(?:sales|revenue)`,
    dataset: 'sec_fundamentals',
    unit: 'x',
    available: true,
    kind: 'company',
  },
  earnings_yield: {
    words: String.raw`earnings yields?`,
    dataset: 'sec_fundamentals',
    unit: 'pct',
    available: true,
    kind: 'company',
  },
  market_cap: {
    words: String.raw`market cap(?:italization|italisation)?|market value`,
    dataset: 'sec_fundamentals',
    unit: 'usd',
    available: true,
    kind: 'company',
  },
  dividend_yield: {
    words: String.raw`dividend yields?|dividend payers?|high[- ]dividend`,
    dataset: null,
    unit: 'pct',
    available: false,
    kind: 'company',
  },
  ev_ebitda: {
    words: String.raw`ev\s*\/\s*ebitda|enterprise value(?:[- ]to[- ]ebitda)?`,
    dataset: null,
    unit: 'x',
    available: false,
    kind: 'company',
  },
  price_to_book: {
    words: String.raw`price[- ]to[- ]book|p\/b(?:\s+ratio)?|book value multiple`,
    dataset: null,
    unit: 'x',
    available: false,
    kind: 'company',
  },
  beta: {
    words: String.raw`beta`,
    dataset: null,
    unit: 'x',
    available: false,
    kind: 'market',
  },
  debt: {
    words: String.raw`debt(?:[- ]to[- ](?:equity|ebitda))?|leverage|balance sheet`,
    dataset: 'sec_fundamentals',
    unit: 'x',
    available: true,
    kind: 'company',
  },
  free_cash_flow: {
    words: String.raw`free cash flow|fcf|cash generation`,
    dataset: 'sec_fundamentals',
    unit: 'usd',
    available: true,
    kind: 'company',
  },
  revenue: {
    words: String.raw`revenue|sales`,
    dataset: 'sec_fundamentals',
    unit: 'usd',
    available: true,
    kind: 'company',
  },
  gov_revenue_share: {
    words: String.raw`(?:government|federal|public[- ]sector|defen[cs]e|pentagon)\s+(?:revenue|sales|business|income)|revenue\s+(?:\w+\s+){0,3}from\s+(?:the\s+)?(?:u\.?s\.?\s+)?(?:government|federal|defen[cs]e)|(?:depend\w*|relian\w*|rel(?:y|ies))\b.{0,30}?\bon\s+(?:the\s+)?(?:u\.?s\.?\s+)?(?:government|federal|defen[cs]e|pentagon)`,
    dataset: 'usaspending_contract_awards',
    unit: 'pct',
    available: true,
    kind: 'company',
  },
  gov_contract_value: {
    words: String.raw`(?:government|federal|defen[cs]e|pentagon)?\s*contracts?|contract awards?|awards?|obligations`,
    dataset: 'usaspending_contract_awards',
    unit: 'usd',
    available: true,
    kind: 'event',
  },
  lobbying_spend: {
    words: String.raw`lobby\w*`,
    dataset: 'lobbying_filings',
    unit: 'usd',
    available: true,
    kind: 'company',
  },
  insider_buying: {
    words: String.raw`insiders?\s+(?:bought|buying|buy|buys|purchas\w*)|insider\s+(?:buying|purchases|activity)|<insiders>\s+(?:bought|buying|buy|buys|purchas\w*)`,
    dataset: 'sec_insider_transactions',
    unit: 'count',
    available: true,
    kind: 'event',
  },
  insider_selling: {
    words: String.raw`insiders?\s+(?:sold|selling|sell|sells|sales)|insider\s+(?:selling|sales)|<insiders>\s+(?:sold|selling|sell|sells)`,
    dataset: 'sec_insider_transactions',
    unit: 'count',
    available: true,
    kind: 'event',
  },
  congress_holders: {
    words: String.raw`(?:held|owned|bought|traded)\s+by\s+<congress>|<congress>\s+(?:own|hold|bought|buy|trade)\w*`,
    dataset: 'congress_trades',
    unit: 'count',
    available: true,
    kind: 'event',
  },
  /* Nov 28 2026: "institutional ownership rose / increased". A condition, not a ranking:
     the net change in comparable 13F managers is above zero. */
  institutional_breadth_change: {
    words: String.raw`<inst>\s+(?:ownership|holdings?|positions?|holders?|interest)\s+(?:rose|risen|rising|rises|increased|increases|increasing|grew|grown|growing|climbed|went up|was up|is up)|(?:rising|increasing|growing|higher)\s+<inst>\s+(?:ownership|holdings?|interest)|<inst>\s+(?:added|bought|accumulated|increased)\s+(?:shares|stakes|positions)`,
    dataset: 'sec_13f_holdings',
    unit: 'count',
    available: true,
    kind: 'holder',
    impliedFilter: { op: '>', value: 0 },
  },
  institutional_breadth: {
    words: String.raw`(?:most|widely|broadly)\s+(?:owned|held)|(?:held|owned)\s+by\s+(?:the\s+)?(?:most\s+)?<inst>|<inst>\s+(?:ownership|own|hold)\w*|(?:popular|crowded)\s+(?:with|among)\s+<inst>`,
    dataset: 'sec_13f_holdings',
    unit: 'count',
    available: true,
    kind: 'holder',
  },
  price_return: {
    words: String.raw`(?:stock|share)?\s*(?:price\s+)?(?:returns?|performance|performed|gains?|rall(?:y|ied)|moved?)`,
    dataset: 'price_data_cache',
    unit: 'pct',
    available: true,
    kind: 'market',
  },
  volatility: {
    words: String.raw`volatil\w*|garch|risk of large moves`,
    dataset: 'price_data_cache',
    unit: 'pct',
    available: true,
    kind: 'market',
  },
  interest_rate: {
    words: String.raw`(?:interest\s+)?rates?|fed funds|rate (?:hikes?|cuts?)|treasury yields?|yields?`,
    dataset: 'macro_series_values',
    unit: 'pct',
    available: true,
    kind: 'macro',
  },
  inflation: {
    words: String.raw`inflation|cpi|consumer prices`,
    dataset: 'macro_series_values',
    unit: 'pct',
    available: true,
    kind: 'macro',
  },
  gdp_growth: {
    words: String.raw`gdp|economic growth|recession`,
    dataset: 'macro_series_values',
    unit: 'pct',
    available: true,
    kind: 'macro',
  },
  oil_price: {
    words: String.raw`oil prices?|crude|brent|wti`,
    dataset: 'kairos_commodity_prices',
    unit: 'usd',
    available: true,
    kind: 'macro',
  },
  fx_rate: {
    words: String.raw`(?:lira|peso|rupee|rupiah|yen|yuan|renminbi|ruble|rouble|euro|sterling|forint|zloty|naira|currency|currencies|exchange rates?|fx)|(?:korean\s+won|brazilian\s+real|south african\s+rand|british\s+pound|us\s+dollar|u\.s\.\s+dollar)|(?:won|real|rand|dollar|pound)\s+(?:currency|exchange rate|weakness|strength|is (?:weak|strong)\w*)`,
    dataset: 'fx_monthly',
    unit: 'rate',
    available: true,
    kind: 'macro',
  },
  sanctions_exposure: {
    words: String.raw`sanction\w*|ofac|export controls?|entity list`,
    dataset: 'sanctions_entries',
    unit: 'flag',
    available: true,
    kind: 'company',
  },
  event_probability: {
    words: String.raw`prediction markets?|polymarket|kalshi|betting odds|implied probabilit\w*|odds`,
    dataset: 'prediction_market_snapshots',
    unit: 'pct',
    available: true,
    kind: 'market',
  },
  short_interest: {
    words: String.raw`short interest|shorted|short sellers?|days to cover`,
    dataset: null,
    unit: 'pct',
    available: false,
    kind: 'market',
  },
  esg_score: {
    words: String.raw`esg|sustainability scores?|carbon (?:footprint|intensity)`,
    dataset: null,
    unit: 'score',
    available: false,
    kind: 'company',
  },
};
const METRIC_RES = Object.fromEntries(
  Object.entries(METRICS).map(([id, m]) => [
    id,
    new RegExp(`(?:\\b|(?=<))(?:${m.words})(?:\\b|(?<=>))`, 'i'),
  ]),
);
/* More specific measures first, so "revenue growth" is not also read as "revenue". */
const METRIC_ORDER = [
  'gov_revenue_share',
  'revenue_growth',
  'earnings_growth',
  'free_cash_flow',
  'insider_buying',
  'insider_selling',
  'congress_holders',
  'institutional_breadth_change',
  'institutional_breadth',
  'short_interest',
  'esg_score',
  'ev_ebitda',
  'price_to_book',
  'dividend_yield',
  'earnings_yield',
  'ps_ratio',
  'market_cap',
  'beta',
  'margin',
  'pe_ratio',
  'debt',
  'lobbying_spend',
  'sanctions_exposure',
  'event_probability',
  'volatility',
  'inflation',
  'gdp_growth',
  'oil_price',
  'interest_rate',
  'fx_rate',
  'gov_contract_value',
  'revenue',
  'price_return',
];

/* ── Universes ───────────────────────────────────────────────────────── */

export const SECTORS = {
  /* Sonar 6.4: industries first (the first match wins), so "oil refiners" is not read as
     the whole energy sector. Industries without a verified classification (solar,
     cybersecurity) are named here only so they are never read as a broader sector. */
  refiners: String.raw`(?:oil |petroleum )?refiners?|refining (?:companies|stocks)`,
  oilfield_services: String.raw`oil ?field services?|drillers|drilling (?:companies|contractors|stocks)`,
  oil_producers: String.raw`oil (?:and gas )?(?:producers|exploration)|e&p (?:companies|stocks)|exploration and production`,
  pharma: String.raw`pharma(?:ceutical)?s?(?: companies| stocks)?|drug ?makers`,
  biotech: String.raw`biotech(?:nology)?s?(?: companies| stocks)?`,
  insurers: String.raw`insurers|insurance (?:companies|stocks)`,
  reits: String.raw`reits?`,
  solar: String.raw`solar(?: energy)?(?: companies| stocks)?`,
  cybersecurity: String.raw`cyber ?security(?: companies| stocks)?`,
  ai: String.raw`(?:ai|artificial intelligence) (?:companies|stocks)`,
  semiconductors: String.raw`semiconductors?|semis|chip(?:maker)?s?|chip stocks`,
  software: String.raw`software|saas`,
  banks: String.raw`banks?|banking|lenders`,
  energy: String.raw`energy|oil (?:and gas )?(?:companies|stocks|producers)`,
  defense: String.raw`defen[cs]e (?:contractors|companies|stocks|names)|defen[cs]e|aerospace`,
  healthcare: String.raw`health ?care`,
  utilities: String.raw`utilit(?:y|ies)`,
  real_estate: String.raw`real estate`,
  retail: String.raw`retail(?:ers)?|consumer discretionary`,
  technology: String.raw`tech(?:nology)? (?:stocks|companies|names|sector)|big tech|megacaps?`,
  airlines: String.raw`airlines?|air carriers`,
};
const SECTOR_RES = Object.fromEntries(
  Object.entries(SECTORS).map(([id, w]) => [id, new RegExp(`\\b(?:${w})\\b`, 'i')]),
);
/**
 * Sonar 6.4 hardening: the text with company measures removed ("revenue growth", "operating
 * margin", "P/E"), so a reader of macro themes does not take a company's revenue growth for
 * GDP growth. Typed by METRICS kind, not by individual words.
 */
export function withoutCompanyMeasures(text) {
  let out = String(text || '');
  for (const [id, m] of Object.entries(METRICS)) {
    if (m.kind !== 'company') continue;
    out = out.replace(new RegExp(METRIC_RES[id].source, 'gi'), ' ');
  }
  return out.replace(/\s+/g, ' ').trim();
}

/** True when the text names a sector (used to keep sector words out of holder names). */
export function isSectorText(text) {
  return Object.values(SECTOR_RES).some((re) => re.test(String(text || '')));
}

const INDEXES = [
  ['sp500', /\bs\s?&\s?p\s?(?:500)?\b|\bs&p\b|\bspx\b/i],
  ['nasdaq100', /\bnasdaq(?:[- ]100)?\b|\bqqq\b/i],
  ['dow30', /\bdow(?: jones)?\b/i],
  ['russell2000', /\brussell\s?2000\b|\bsmall[- ]caps?\b/i],
];

/* ── Operations ──────────────────────────────────────────────────────── */

const OPS = [
  [
    'model',
    /\b(?:dcfs?|discounted[- ]cash[- ]flows?|intrinsic value|garch|monte carlo|back-?test\w*|regression|fair value estimate|simulate)\b/i,
  ],
  [
    'relate',
    /\b(?:relationship between|correlat\w*|sensitiv\w*\b.{0,30}?\bto\b|move (?:with|alongside|against)|track (?:with)?|how (?:do|does|did|would|will|could)\b.{1,60}\b(?:affect|impact|influence|hit|move|drive)|impact of\b.{1,60}\bon\b|effect of\b.{1,60}\bon\b|exposed to (?:rising|falling|higher|lower))/i,
  ],
  [
    'compare',
    /\b(?:compare|comparison|versus|vs\.?|against|better than|worse than|relative to|or\b.{1,40}\bwhich is)\b/i,
  ],
  [
    'screen',
    /\b(?:screen|find|filter|list|show)\b.{0,40}\b(?:stocks|companies|names|equities|securities)\b.{0,10}\b(?:that|with|which|where|whose)\b/i,
  ],
  [
    'rank',
    /\b(?:rank\w*|top\s+\d+|top|most|highest|lowest|least|largest|biggest|smallest|fewest|best|worst|leading)\b/i,
  ],
  [
    'assess',
    /\b(?:depend\w*|relian\w*|exposure|exposed|pressure|risks?|threats?|headwinds?|vulnerab\w*|strategy|how much|outlook|health)\b/i,
  ],
];

const CMP = [
  ['>', /\b(?:above|over|more than|greater than|exceed\w*|at least|>=?|higher than|north of)\b/i],
  ['<', /\b(?:below|under|less than|lower than|at most|<=?|south of|cheaper than)\b/i],
];

/** A number with its unit: "20%", "15x", "$1 billion", "1.5b". */
function readNumber(text) {
  const m = String(text).match(
    /(?:\$\s*)?(\d+(?:\.\d+)?)\s*(%|percent|x|times|b|bn|billion|m|mm|million|k|thousand)?/i,
  );
  if (!m) return null;
  const n = Number(m[1]);
  const u = (m[2] || '').toLowerCase();
  if (u === '%' || u === 'percent') return { value: n, unit: 'pct' };
  if (u === 'x' || u === 'times') return { value: n, unit: 'x' };
  if (['b', 'bn', 'billion'].includes(u)) return { value: n * 1e9, unit: 'usd' };
  if (['m', 'mm', 'million'].includes(u)) return { value: n * 1e6, unit: 'usd' };
  if (['k', 'thousand'].includes(u)) return { value: n * 1e3, unit: 'usd' };
  return { value: n, unit: null };
}

/**
 * Filters: "<measure> above|below <number>" and event filters introduced by
 * that/with/which/whose/where ("that won government contracts", "with insider buying").
 */
function readFilters(t) {
  const filters = [];
  /* A leading question word opens the question, not a relative clause. */
  const body = t.replace(/^\s*(?:which|what|that|where)\b/, '');
  /* Sonar 6.4 final hardening: multi-word conjunctions ("as well as", "in addition to",
     "together with") separate conditions like "and". */
  const parts = body
    .replace(/\b(?:as well as|in addition to|together with)\b/g, ' and ')
    .split(/\b(?:that|which|with|whose|where|and|but|while|plus|having)\b|,/);
  parts.forEach((raw, k) => {
    const c = raw.trim();
    if (!c) return;
    /* The measure the clause starts with (ties go to the more specific measure). */
    let metric = null;
    let best = Infinity;
    for (const id of METRIC_ORDER) {
      const at = c.search(METRIC_RES[id]);
      if (at >= 0 && at < best) {
        best = at;
        metric = id;
      }
    }
    if (!metric) return;
    /* "over 3 years" is a window, not a comparison. */
    const cmp = CMP.find(
      ([, re]) =>
        re.test(c) &&
        !new RegExp(
          `${re.source}\\s*\\d+(?:\\.\\d+)?\\s*(?:years?|quarters?|months?|weeks?|days?)\\b`,
          'i',
        ).test(c),
    );
    const num = cmp ? readNumber(c.slice(c.search(cmp[1]))) : null;
    /* A ranking word before the measure ("received the most contract dollars") makes it
       what is ranked, not a condition. */
    const at = c.search(METRIC_RES[metric]);
    const RANK_WORD = /\b(?:most|least|highest|lowest|top|fewest|largest|biggest|rank\w*|by)\b/;
    const after = c.slice(at).replace(METRIC_RES[metric], '').trim();
    const rankedFirst =
      RANK_WORD.test(c.slice(0, Math.max(0, at))) ||
      /^(?:the\s+)?(?:most|least|highest|lowest|fewest)\b/.test(after);
    const unitOk = !num?.unit || !METRICS[metric].unit || num.unit === METRICS[metric].unit;
    if (cmp && num && !unitOk) {
      /* A percentage against a dollar measure ("revenue jumped more than 20%") is not a
         condition Sonar can apply; it is reported as unread, never applied or dropped. */
      filters.push({ metric, op: cmp[0], value: num.value, unit: num.unit, mismatch: c });
    } else if (cmp && num) {
      filters.push({
        metric,
        op: cmp[0],
        value: num.value,
        unit: num.unit || METRICS[metric].unit,
      });
    } else if (METRICS[metric].impliedFilter && !rankedFirst) {
      /* A direction word is the condition itself ("institutional ownership rose"). */
      filters.push({ metric, ...METRICS[metric].impliedFilter, unit: METRICS[metric].unit });
    } else if (k > 0 && METRICS[metric].kind === 'event' && !rankedFirst) {
      /* The opening segment holds the universe; only a numeric condition is read there. */
      filters.push({ metric, op: 'exists' });
    }
  });
  /* One condition per measure (the first stated). */
  const seen = new Set();
  return filters.filter((f) => (seen.has(f.metric) ? false : seen.add(f.metric)));
}

function readTime(t) {
  const m = t.match(
    new RegExp(
      `\\b(?:last|past|previous|over the last|over the past|in the last|in the past|since)\\s+${NUM}?\\s*(days?|weeks?|months?|quarters?|years?)\\b`,
    ),
  );
  if (m) return { kind: 'window', n: toNum(m[1]) ?? 1, unit: m[2].replace(/s$/, '') };
  if (/\b(?:last|previous|prior)\s+quarter\b/.test(t))
    return { kind: 'window', n: 1, unit: 'quarter' };
  if (/\b(?:this year|ytd|year to date)\b/.test(t)) return { kind: 'ytd' };
  if (/\b(?:next|coming|upcoming)\s+(?:quarter|year|earnings)\b/.test(t))
    return { kind: 'forward' };
  return null;
}

/* ── Families from the typed parts ───────────────────────────────────── */

/* Company measures read from filed financials. */
const FUNDAMENTAL_MEASURES = new Set([
  'margin',
  'revenue_growth',
  'earnings_growth',
  'pe_ratio',
  'ps_ratio',
  'earnings_yield',
  'market_cap',
  'debt',
  'free_cash_flow',
  'revenue',
]);

/* Assess-type families named by their measure (kept stable for reports and tests). */
const ASSESS_FAMILY = {
  gov_revenue_share: 'government_contract_dependency',
  fx_rate: 'currency_pressure',
  sanctions_exposure: 'sanctions_exposure',
  lobbying_spend: 'lobbying_activity',
  event_probability: 'prediction_markets',
  volatility: 'garch_volatility',
};

/**
 * The compositional reading of a normalized question (tokens from normalizeQuestion).
 * `subject` is the subject text already extracted, if any.
 * @returns {{ operation: string|null, direction: string|null, universe: object|null,
 *   filters: object[], measures: string[], driver: string|null, time: object|null,
 *   model: string|null, unsupported: string[], family: string|null }}
 */
export function composeIntent(tokens, { subject = null, relation = null } = {}) {
  const t = String(tokens || '');
  /* Measures in order of specificity; a generic word (revenue) is dropped when a specific
     one (revenue growth, government revenue) already covers it. */
  const measures = [];
  for (const id of METRIC_ORDER) {
    if (!METRIC_RES[id].test(t)) continue;
    if (id === 'revenue' && measures.some((m) => /revenue|gov_|ps_ratio/.test(m))) continue;
    if (
      id === 'gov_contract_value' &&
      measures.includes('gov_revenue_share') &&
      !/\bcontracts?\b/.test(t)
    )
      continue;
    if (id === 'price_return' && measures.length) continue;
    if (id === 'institutional_breadth' && measures.includes('institutional_breadth_change'))
      continue;
    if (
      id === 'interest_rate' &&
      (measures.includes('fx_rate') ||
        measures.includes('earnings_yield') ||
        measures.includes('dividend_yield'))
    )
      continue;
    measures.push(id);
  }
  const read = readFilters(t);
  const pendingUnread = unreadConditions(t, read);
  const mismatched = read.filter((f) => f.mismatch);
  const filters = read.filter((f) => !f.mismatch);
  const filtered = new Set(filters.map((f) => f.metric));
  const computed = measures.filter((m) => !filtered.has(m));

  let operation = (OPS.find(([, re]) => re.test(t)) || [null])[0];
  if (relation) operation = relation.op === 'intersect' ? 'overlap' : 'compare';
  const model = /\bdcf|discounted[- ]cash|intrinsic value|fair value estimate/i.test(t)
    ? 'dcf'
    : /\bgarch|conditional volatility|volatility (?:model|forecast)/i.test(t)
      ? 'garch'
      : /\bback-?test|how would .{0,40}have (?:performed|done)|(?:copy|follow|mirror)\w* .{0,30}(?:trades|purchases|buys)/i.test(
            t,
          )
        ? 'backtest'
        : /\bmonte carlo/i.test(t)
          ? 'monte_carlo'
          : null;
  if (model) operation = 'model';
  const sector = Object.keys(SECTORS).find((id) => SECTOR_RES[id].test(t)) || null;
  const index = (INDEXES.find(([, re]) => re.test(t)) || [null])[0];
  /* A filtered universe is a screen whether or not a verb says so: "Energy stocks with
     debt to equity below 0.6" (Sonar 6.4: verbless screens). */
  if (
    (read.length || pendingUnread.length) &&
    (operation === 'rank' || !operation) &&
    (/\b(?:find|screen|filter|list|show|which|what)\b/.test(t) || sector || index)
  )
    operation = 'screen';
  /* "sorted by", "ordered by" rank like "ranked by". */
  if (
    !operation &&
    /\b(?:sort(?:ed)?|order(?:ed)?)\s+by\b|\bin\s+(?:descending\s+|ascending\s+)?order\s+of\b|\b(?:ordered|sorted|ranked)\s+(?:according\s+to|on)\b/.test(
      t,
    )
  )
    operation = 'rank';
  const tickers = [...t.matchAll(/\$([a-z]{1,5})\b/g)].map((m) => m[1].toUpperCase());
  const universeCountry = sector ? countryOfUniverse(t, SECTOR_RES[sector]) : null;
  const universe = sector
    ? { type: 'sector', id: sector, ...(universeCountry ? { country: universeCountry } : {}) }
    : index
      ? { type: 'index', id: index }
      : tickers.length > 1
        ? { type: 'tickers', ids: tickers }
        : subject
          ? { type: 'entity', text: subject }
          : null;

  /* relate: the macro or market measure is the driver; the other measure, or price return,
     is the target. */
  let driver = null;
  if (operation === 'relate') {
    driver = computed.find((m) => METRICS[m].kind === 'macro') || null;
    if (driver && !computed.some((m) => m !== driver)) computed.push('price_return');
  }

  const direction =
    operation === 'rank' || operation === 'screen'
      ? /\b(?:least|lowest|fewest|smallest|bottom|worst|cheapest)\b/.test(t)
        ? 'ascending'
        : 'descending'
      : null;

  const unsupported = [...new Set([...computed, ...filtered])].filter((m) => !METRICS[m].available);
  /* Sonar 6.4: every numeric condition in the question must become a filter. A condition
     Sonar cannot read ("revenue jumped more than 20%") is reported, never dropped, so a
     screen never silently runs on the unfiltered universe. */
  const unread = [...mismatched.map((f) => f.mismatch), ...pendingUnread];

  let family = null;
  const companyLead = computed.find((m) => FUNDAMENTAL_MEASURES.has(m));
  if (operation === 'model')
    family = model === 'dcf' ? 'dcf_valuation' : model === 'garch' ? 'garch_volatility' : model;
  else if (operation === 'relate' && driver) family = 'macro_relationship';
  else if (
    (operation === 'screen' || operation === 'rank') &&
    (filters.length || universe?.type === 'sector' || universe?.type === 'index')
  )
    family = 'multi_stage_screen';
  else if (operation === 'compare' && relation) family = 'portfolio_comparison';
  else if (computed.length) {
    const lead = computed[0];
    family =
      ASSESS_FAMILY[lead] ||
      (companyLead && !['sector', 'index'].includes(universe?.type)
        ? 'fundamental_analysis'
        : null);
  }
  /* A model is defined by the model and its subject; the measure words around it are not
     material ("what is it worth", "intrinsic value"). */
  if (operation === 'model') computed.length = 0;
  /* Filtering then ranking is one screen however it is worded. */
  if (family === 'multi_stage_screen') operation = 'screen';

  return {
    operation,
    direction,
    universe,
    filters,
    measures: computed,
    driver,
    time: readTime(t),
    model,
    unsupported,
    unread,
    family,
  };
}

/* Sonar 6.4 hardening: a country qualifier on a universe ("Canadian banks", "banks in
   Canada"). Only the words right before the industry, or "in/from <country>" right after,
   qualify it; a country elsewhere in the question does not. */
const UNIVERSE_COUNTRIES = [
  ['CA', String.raw`canadian|canada`],
  ['US', String.raw`american|u\.?s\.?|united states|america`],
  ['GB', String.raw`british|u\.?k\.?|united kingdom|britain`],
  ['JP', String.raw`japanese|japan`],
  ['DE', String.raw`german|germany`],
  ['CN', String.raw`chinese|china`],
  ['IN', String.raw`indian|india`],
  ['FR', String.raw`french|france`],
  ['AU', String.raw`australian|australia`],
  ['KR', String.raw`korean|south korea|korea`],
  ['TW', String.raw`taiwanese|taiwan`],
  ['MX', String.raw`mexican|mexico`],
  ['BR', String.raw`brazilian|brazil`],
  ['CH', String.raw`swiss|switzerland`],
  ['EU', String.raw`european|europe`],
];
export function countryOfUniverse(t, sectorRe) {
  const m = sectorRe.exec(t);
  if (!m) return null;
  const before = t.slice(0, m.index);
  const after = t.slice(m.index + m[0].length);
  for (const [iso2, words] of UNIVERSE_COUNTRIES) {
    if (new RegExp(`\\b(?:${words})\\s+(?:\\w+\\s+)?$`, 'i').test(before)) return iso2;
    if (
      new RegExp(
        `^\\s*(?:\\w+\\s+)?(?:in|from|based in|headquartered in)\\s+(?:the\\s+)?(?:${words})\\b`,
        'i',
      ).test(after)
    )
      return iso2;
  }
  return null;
}

/** Numeric conditions ("more than 20%", "under 0.6") not consumed by a numeric filter. */
export function unreadConditions(t, filters) {
  const numeric = filters.filter((f) => f.op === '>' || f.op === '<').length;
  const found = [];
  const re = new RegExp(
    `(?:${CMP.map(([, r]) => r.source.replace(/^\\b\(\?:|\)\\b$/g, '')).join('|')})\\s*\\$?\\s*\\d`,
    'gi',
  );
  for (const m of String(t).matchAll(re)) {
    /* "over 3 years" is a time window, not a condition. */
    const rest = String(t).slice(m.index + m[0].length - 1);
    if (/^\d+(?:\.\d+)?\s*(?:years?|quarters?|months?|weeks?|days?)\b/.test(rest)) continue;
    const start = Math.max(0, String(t).lastIndexOf(',', m.index) + 1);
    found.push(
      String(t)
        .slice(start, m.index + m[0].length + 12)
        .trim(),
    );
  }
  return found.length > numeric ? found.slice(numeric) : [];
}

/** Datasets the composition needs, from its measures and filters. */
export function compositionDatasets(c) {
  const ids = new Set();
  for (const m of [...(c?.measures || []), ...(c?.filters || []).map((f) => f.metric)]) {
    const d = METRICS[m]?.dataset;
    if (d) ids.add(d);
  }
  if (c?.universe?.type === 'sector' || c?.universe?.type === 'index') ids.add('security_master');
  return [...ids].sort();
}

/** The generic operation list of a composition (the required task graph's body). */
export function compositionOperations(c) {
  if (!c) return ['retrieve_evidence'];
  const ops = [`resolve_universe:${c.universe?.type || 'subject'}`];
  for (const f of c.filters)
    ops.push(`filter:${f.metric}${f.op === 'exists' ? '' : `${f.op}${f.value}`}`);
  if (c.driver) ops.push(`retrieve_series:${c.driver}`);
  for (const m of c.measures.filter((x) => x !== c.driver)) ops.push(`compute:${m}`);
  if (c.operation === 'relate') ops.push('estimate_relationship');
  else if (c.operation === 'model') ops.push(`run_model:${c.model}`);
  else if (c.operation === 'rank' || c.operation === 'screen') ops.push(`rank:${c.direction}`);
  else if (c.operation === 'compare') ops.push('compare');
  else if (c.operation) ops.push(c.operation);
  return ops;
}
