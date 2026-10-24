/**
 * Sonar v2 query router (sonar-templates-spec.md §2). Classifies a ping into
 * one of the 21 templates plus the open-question fallback and resolves its
 * entities. Rule shortcuts run first (ticker shapes, "top N", " vs ",
 * industry plus country, known keyword families); only a query no rule
 * claims pays for the cheap structured LLM call. A follow-up inherits its
 * parent ping's entities, so "top 10 companies" after "steel in Canada"
 * resolves to ranking{industry: steel, country: CA}.
 *
 * Pure where possible: routeByRules() is synchronous and unit-tested in
 * scripts/check-sonar-v2.mjs; routeQuery() adds the LLM fallback.
 */
import { resolveCountry } from '@/lib/sonar/landing-country';
import { synthesizeWithFallback } from '@/lib/sonar/llm-providers';
import { understandDeterministic } from '@/lib/sonar/understand';
import { TICKER_BLOCKLIST } from '@/lib/sonar/understand/blocklist';
import { INDUSTRY_SEED } from '@/lib/sonar/industries';

export const TEMPLATE_IDS = [
  'company',
  'politician',
  'investor_fund',
  'executive_person',
  'country',
  'industry_country',
  'industry',
  'ranking',
  'comparison',
  'policy',
  'agency_program',
  'commodity',
  'theme',
  'event_catalyst',
  'prediction_question',
  'supply_chain',
  'activism',
  'lobbying_topic',
  'region',
  'etf_index',
  'macro_indicator',
  'industry_layout',
  'country_rank',
  'open_question',
];

/* ── entity vocabularies (small, hand-kept, unambiguous) ─────────────── */

const INDUSTRY_WORDS = [
  'steel',
  'semiconductor',
  'semiconductors',
  'defense',
  'defence',
  'auto',
  'autos',
  'automotive',
  'banking',
  'banks',
  'pharma',
  'pharmaceutical',
  'pharmaceuticals',
  'energy',
  'oil',
  'gas',
  'mining',
  'aerospace',
  'airlines',
  'retail',
  'insurance',
  'telecom',
  'software',
  'biotech',
  'shipping',
  'railroads',
  'utilities',
  'agriculture',
  'lumber',
  'aluminum',
  'cement',
  'chemicals',
];
const COMMODITIES = [
  'copper',
  'gold',
  'silver',
  'uranium',
  'lithium',
  'oil price',
  'crude',
  'natural gas price',
  'wheat',
  'corn',
  'soybeans',
  'nickel',
  'cobalt',
  'platinum',
  'palladium',
  'coffee',
  'cocoa',
  'sugar',
];
const MACRO_WORDS = [
  'inflation',
  'cpi',
  'unemployment',
  'gdp',
  'interest rate',
  'interest rates',
  'rate cut',
  'rate hike',
  'jobs report',
  'payrolls',
  'trade deficit',
  'housing starts',
];
const AGENCY_WORDS = [
  'department of',
  'pentagon',
  'nasa',
  'dod',
  'doe ',
  'epa',
  'faa',
  'fda contracts',
  'veterans affairs',
  'homeland security',
  'air force',
  'navy',
  'army',
];
const FUND_WORDS = [
  'berkshire',
  'blackrock',
  'vanguard',
  'bridgewater',
  'citadel',
  'renaissance',
  'pershing square',
  'ackman',
  'icahn',
  'elliott',
  'third point',
  'starboard',
  'millennium',
  'two sigma',
  'soros',
];
const KNOWN_ETFS = new Set([
  'SPY',
  'QQQ',
  'XLE',
  'XLF',
  'XLK',
  'XLV',
  'XLI',
  'XLY',
  'XLP',
  'XLU',
  'XLB',
  'XLRE',
  'IWM',
  'DIA',
  'GLD',
  'SLV',
  'USO',
  'ARKK',
  'SMH',
  'ITA',
  'TLT',
  'HYG',
  'EEM',
  'EFA',
  'VTI',
  'VOO',
]);
const POLITICIAN_HINTS =
  /\b(senator|congressman|congresswoman|representative|rep\.|sen\.|speaker|pelosi|tuberville|schumer|mcconnell|aoc|ocasio-cortez|crenshaw|gottheimer|mccaul|green[e]?\b.*taylor|whitehouse)\b/i;
const EXEC_HINTS =
  /\b(ceo|cfo|founder|jensen huang|jamie dimon|elon musk|tim cook|satya nadella|sam altman|mark zuckerberg|lisa su|warren buffett)\b/i;
const REGIONS =
  /\b(alberta|ontario|quebec|british columbia|texas|california|virginia|florida|ohio|new york state|arizona|nevada|georgia|alabama|huntsville|silicon valley)\b/i;

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** resolveCountry matches whole strings; pings bury the country in a phrase
 *  ("steel industry in Canada"), so scan the tail phrase and the words too. */
function scanCountry(query) {
  const direct = resolveCountry(query);
  if (direct) return direct;
  const after = /\b(?:in|of)\s+(.+)$/i.exec(query);
  if (after) {
    const c = resolveCountry(after[1]);
    if (c) return c;
  }
  for (const w of String(query).split(/[\s,]+/)) {
    const c = resolveCountry(w);
    if (c) return c;
  }
  return null;
}
const wordHit = (q, words) => words.find((w) => new RegExp(`\\b${esc(w)}\\b`, 'i').test(q)) || null;

/** Bare ticker shapes: "NVDA", "BRK.B", "$TSLA". */
function bareTicker(raw) {
  const dollar = /^\s*\$/.test(raw);
  const s = raw.trim().replace(/^\$/, '');
  if (!/^[A-Za-z]{1,5}([.-][A-Za-z]{1,2})?$/.test(s) || s !== s.toUpperCase()) return null;
  /* "US", "IT", "AI" are words before they are tickers: only a $ makes them
     a ticker in the rules (the understanding layer weighs the rest). */
  if (!dollar && TICKER_BLOCKLIST.has(s.toUpperCase()) && s.toUpperCase() !== 'USA') return null;
  return s.toUpperCase();
}

/* ── the rules ───────────────────────────────────────────────────────── */

/**
 * Synchronous rule router. Returns { template, entities, confidence } or
 * null when no rule claims the query (the LLM fallback decides then).
 * `parent` is the parent ping's resolved entities, inherited into any gap.
 */
export function routeByRules(rawQuery, parent = null) {
  const query = String(rawQuery || '').trim();
  if (!query) return null;
  const q = query.toLowerCase();
  const inherit = (entities) => ({ ...(parent?.entities || parent || {}), ...entities });
  const hit = (template, entities, confidence = 0.9) => ({
    template,
    entities: inherit(entities),
    confidence,
  });

  /* Comparison: "X vs Y", "compare X and Y". */
  const vs = query.split(/\s+(?:vs\.?|versus)\s+/i);
  if (vs.length === 2) {
    return hit('comparison', { compare: [vs[0].trim(), vs[1].trim()] });
  }
  const cmp = /^compare\s+(.+?)\s+(?:and|to|with)\s+(.+)$/i.exec(query);
  if (cmp) return hit('comparison', { compare: [cmp[1].trim(), cmp[2].trim()] });

  /* Ranking: "top 10 …", "biggest/largest …". Inner entities still resolve. */
  const top = /^(?:top|biggest|largest)\s*(\d+)?\s+(.*)$/i.exec(query);
  if (top) {
    const inner = routeByRules(top[2], parent);
    return hit('ranking', {
      n: top[1] ? Number(top[1]) : 10,
      subject: top[2].trim(),
      ...(inner?.entities || {}),
    });
  }

  /* Prediction-market phrasing. */
  if (/^(will|who wins|what are the odds|odds of)\b/i.test(query)) {
    return hit('prediction_question', { question: query });
  }

  /* Supply chain. */
  if (/\b(who supplies|suppliers?|supply chain|customers? of)\b/i.test(q)) {
    return hit('supply_chain', { subject: query });
  }

  /* Activism / stake building. */
  if (/\b(activists?|13d|building a stake|stake in)\b/i.test(q)) {
    return hit('activism', { subject: query });
  }

  /* Lobbying topic. */
  if (/\blobb(y|ies|ying|yists?)\b/i.test(q)) {
    return hit('lobbying_topic', { topic: query.replace(/\blobb\w*\b/gi, '').trim() || query });
  }

  /* Policy / legislation. */
  if (/\b(act|bill|tariffs?|section \d+|sanctions?|executive order|legislation)\b/i.test(q)) {
    const country = scanCountry(query);
    return hit('policy', { policy: query, country: country?.iso3 || null });
  }

  /* Agency / program. */
  if (wordHit(q, AGENCY_WORDS)) {
    return hit('agency_program', { agency: query });
  }

  /* ETF / index. */
  const tick = bareTicker(query);
  if ((tick && KNOWN_ETFS.has(tick)) || /\b(etf|index fund|tsx 60|s&p 500)\b/i.test(q)) {
    return hit('etf_index', { etf: tick || query });
  }

  /* Bare ticker or $TICKER → company. */
  if (tick) return hit('company', { ticker: tick }, 0.95);

  /* Macro indicator (optionally with a country). */
  const macro = wordHit(q, MACRO_WORDS);
  if (macro) {
    const country = scanCountry(query);
    return hit('macro_indicator', {
      indicator: macro,
      country: country?.iso3 || 'USA',
      countryName: country?.name || 'United States',
    });
  }

  /* Commodity. */
  const commodity = wordHit(q, COMMODITIES);
  if (commodity && q.split(/\s+/).length <= 4) {
    return hit('commodity', { commodity });
  }

  /* Politician and executive people. */
  if (POLITICIAN_HINTS.test(query)) return hit('politician', { person: query });
  if (EXEC_HINTS.test(query)) return hit('executive_person', { person: query });

  /* Fund / investor. */
  if (wordHit(q, FUND_WORDS) || /\b(hedge fund|13f of)\b/i.test(q)) {
    return hit('investor_fund', { fund: query });
  }

  /* Event / catalyst. */
  if (/\b(earnings|fed meeting|fomc|election|opec meeting|cpi print)\b/i.test(q)) {
    return hit('event_catalyst', { event: query });
  }

  /* Region / state / province (a region word plus any topic). */
  const region = REGIONS.exec(query);
  if (region) {
    return hit('region', { region: region[0], topic: query });
  }

  /* Industry, optionally × country (the hero). */
  const industry = wordHit(q, INDUSTRY_WORDS);
  const country = scanCountry(query);
  if (industry && country) {
    return hit('industry_country', {
      industry,
      country: country.iso3,
      countryName: country.name,
    });
  }
  if (industry) return hit('industry', { industry });
  if (country && q.split(/\s+/).length <= 4) {
    return hit('country', { country: country.iso3, countryName: country.name });
  }

  /* Theme phrasing ("AI data centers", "nuclear renaissance"). */
  if (
    /\b(ai |artificial intelligence|data centers?|renaissance|boom|revolution|transition)\b/i.test(
      q,
    )
  ) {
    return hit('theme', { theme: query }, 0.6);
  }

  return null;
}

/* ── LLM fallback ────────────────────────────────────────────────────── */

const ROUTER_SYSTEM = `You classify a research query into exactly one template id from this list: ${TEMPLATE_IDS.join(
  ', ',
)}. Respond with ONLY a JSON object: {"template":"<id>","entities":{...}} where entities uses keys like ticker, company, industry, country (ISO-2), person, fund, policy, commodity, theme, event, question, agency, region, etf, indicator, n, compare (array of two strings). No prose.`;

const LAYOUT_INDUSTRIES = new Set(INDUSTRY_SEED.industries.map((i) => i.id));

/**
 * Understanding first (query-understanding spec, Part A): the corrected text
 * feeds the rules, and an industry layout of a registry industry routes to
 * the industry_layout template whatever the rules would have said ("USA"
 * after "in the" is the United States, never the ticker).
 */
export function routeUnderstood(query, parent = null) {
  const u = understandDeterministic(query);
  const ind = u.entities.find((e) => e.kind === 'industry');
  if (
    ['industry_layout', 'industry_country'].includes(u.intent) &&
    ind &&
    LAYOUT_INDUSTRIES.has(ind.id)
  ) {
    const geo = u.entities.find((e) => e.kind === 'country');
    const country = geo ? resolveCountry(geo.label) : null;
    return {
      template: 'industry_layout',
      entities: {
        ...(parent?.entities || {}),
        industry: String(ind.noun || ind.label).toLowerCase(),
        industryId: ind.id,
        country: country?.iso3 || null,
        countryName: country?.name || geo?.label || null,
      },
      confidence: 0.92,
      understood: u,
    };
  }
  if (u.intent === 'country_rank') {
    const geo = u.entities.find((e) => e.kind === 'country');
    const country = geo ? resolveCountry(geo.label) : null;
    if (country) {
      return {
        template: 'country_rank',
        entities: {
          ...(parent?.entities || {}),
          country: country.iso3,
          countryName: country.name,
          metric: u.metric,
          metricExplicit: u.metricExplicit,
        },
        confidence: 0.92,
        understood: u,
      };
    }
  }
  const ruled = routeByRules(u.corrected || query, parent);
  return ruled ? { ...ruled, understood: u } : { understood: u };
}

export async function routeQuery(query, { parent = null } = {}) {
  const pre = routeUnderstood(query, parent);
  if (pre.template) return { ...pre, routedBy: 'rules' };
  try {
    const out = await synthesizeWithFallback({
      system: ROUTER_SYSTEM,
      user: String(pre.understood?.corrected || query).slice(0, 300),
      maxTokens: 300,
      model: 'claude-haiku-4-5-20251001',
      fallbackModel: 'claude-haiku-4-5-20251001',
      webSearch: false,
    });
    const m = /\{[\s\S]*\}/.exec(out?.answer || '');
    if (m) {
      const parsed = JSON.parse(m[0]);
      if (TEMPLATE_IDS.includes(parsed.template)) {
        return {
          template: parsed.template,
          entities: { ...(parent?.entities || parent || {}), ...(parsed.entities || {}) },
          confidence: 0.5,
          routedBy: 'llm',
        };
      }
    }
  } catch {
    /* fall through to the open question */
  }
  return {
    template: 'open_question',
    entities: { ...(parent?.entities || parent || {}), question: query },
    confidence: 0.3,
    routedBy: 'fallback',
  };
}
