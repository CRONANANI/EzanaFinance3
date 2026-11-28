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
    words: String.raw`(?:revenue|sales|top[- ]line)\s+(?:growth|growing|grew|increase)|grow(?:ing|th in)?\s+(?:revenue|sales)`,
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
  'institutional_breadth',
  'short_interest',
  'esg_score',
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
  semiconductors: String.raw`semiconductors?|semis|chip(?:maker)?s?|chip stocks`,
  software: String.raw`software|saas`,
  banks: String.raw`banks?|banking|lenders`,
  energy: String.raw`energy|oil (?:and gas )?(?:companies|stocks|producers)`,
  defense: String.raw`defen[cs]e (?:contractors|companies|stocks|names)|defen[cs]e|aerospace`,
  healthcare: String.raw`health ?care|pharma(?:ceutical)?s?|biotechs?`,
  utilities: String.raw`utilit(?:y|ies)`,
  real_estate: String.raw`reits?|real estate`,
  retail: String.raw`retail(?:ers)?|consumer discretionary`,
  technology: String.raw`tech(?:nology)? (?:stocks|companies|names|sector)|big tech|megacaps?`,
  airlines: String.raw`airlines?|air carriers`,
};
const SECTOR_RES = Object.fromEntries(
  Object.entries(SECTORS).map(([id, w]) => [id, new RegExp(`\\b(?:${w})\\b`, 'i')]),
);
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
  const parts = body.split(/\b(?:that|which|with|whose|where|and|having)\b|,/);
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
    const cmp = CMP.find(([, re]) => re.test(c));
    const num = cmp ? readNumber(c.slice(c.search(cmp[1]))) : null;
    /* A ranking word before the measure ("received the most contract dollars") makes it
       what is ranked, not a condition. */
    const at = c.search(METRIC_RES[metric]);
    const RANK_WORD = /\b(?:most|least|highest|lowest|top|fewest|largest|biggest|rank\w*|by)\b/;
    const after = c.slice(at).replace(METRIC_RES[metric], '').trim();
    const rankedFirst =
      RANK_WORD.test(c.slice(0, Math.max(0, at))) ||
      /^(?:the\s+)?(?:most|least|highest|lowest|fewest)\b/.test(after);
    if (cmp && num) {
      filters.push({
        metric,
        op: cmp[0],
        value: num.value,
        unit: num.unit || METRICS[metric].unit,
      });
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
    if (id === 'revenue' && measures.some((m) => /revenue|gov_/.test(m))) continue;
    if (
      id === 'gov_contract_value' &&
      measures.includes('gov_revenue_share') &&
      !/\bcontracts?\b/.test(t)
    )
      continue;
    if (id === 'price_return' && measures.length) continue;
    if (id === 'interest_rate' && measures.includes('fx_rate')) continue;
    measures.push(id);
  }
  const filters = readFilters(t);
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
  if (
    filters.length &&
    (operation === 'rank' || !operation) &&
    /\b(?:find|screen|filter|list|show|which|what)\b/.test(t)
  )
    operation = 'screen';

  const sector = Object.keys(SECTORS).find((id) => SECTOR_RES[id].test(t)) || null;
  const index = (INDEXES.find(([, re]) => re.test(t)) || [null])[0];
  const tickers = [...t.matchAll(/\$([a-z]{1,5})\b/g)].map((m) => m[1].toUpperCase());
  const universe = sector
    ? { type: 'sector', id: sector }
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
    family,
  };
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
