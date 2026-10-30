import crypto from 'crypto';
import { getSonarEntitlements, SONAR_DATASETS } from '@/lib/sonar/entitlements';
import {
  corporaForDatasets,
  depthBudget,
  classifyQuery,
  CORPUS_TO_DATASET,
} from '@/lib/sonar/retrieval';
import { orchestrate } from '@/lib/research-copilot/orchestrate';
import { synthesizeWithFallback } from '@/lib/sonar/llm-providers';
import { getFmpKey } from '@/lib/fmp/upcoming-events';
import { understandQuery } from '@/lib/sonar/understand';
import { TICKER_BLOCKLIST } from '@/lib/sonar/understand/blocklist';
import { gateMarkets, gateNews, subjectTerms } from '@/lib/sonar/relevance';
import { passesCountryIntentGuard } from '@/lib/sonar/guards';
import { extractIntents, ipoSubject, resolveQuery } from '@/lib/sonar/resolveQuery';
import ipoEvents from '@/lib/sonar/sources/ipo-events';
import { enforceGrounding, GROUNDING_RULES } from '@/lib/sonar/groundingGuard';
import { rankSourcedMatches } from '@/lib/sonar/rankSourcedMatches';
import {
  getIndustryRegistry,
  getIndustryRegistryCached,
  industryBasket,
} from '@/lib/sonar/industries';
import {
  basket13f,
  basketCongress,
  buildIndustryDossier,
  industryEvidence,
} from '@/lib/sonar/landing-industry';
import { getMacroRankings } from '@/lib/sonar/macro/store';
import { countryRankView, SCOPE_NOTE, WB_ATTRIBUTION } from '@/lib/sonar/macro/rank';
import {
  RANK_SECTIONS,
  deterministicBrief,
  rankFacts,
  rankFollowups,
  rankLede,
  unsupportedNumbers,
} from '@/lib/sonar/macro/brief';
import { REGIONS as NEWS_REGIONS } from '@/lib/services/massive-news';
import { industryProfile, industryNewsTitle, fetchIndustryNews } from '@/lib/sonar/industry-news';
import { resolvePolitician, buildPoliticianDossier } from '@/lib/sonar/landing-politician';
import {
  resolveCountry,
  mentionedCountry,
  buildCountryDossier,
  countryEvidence,
  countryEntityTerms,
  COUNTRY_ADDENDUM,
} from '@/lib/sonar/landing-country';
import {
  detectIntent,
  sanctionsContext,
  splitExposed,
  columnSpecs,
  buildNewsColumns,
} from '@/lib/sonar/landing-research';
import { BoundedMap } from '@/lib/bounded-map';
import { withTimeout } from '@/lib/with-timeout';
import { usd } from '@/lib/research-copilot/retrievers/shared';

/**
 * The landing-page Sonar pipeline, shared by the two routes that run it:
 * POST /api/sonar/landing-query (a guest ping, with quota, cookie and ledger)
 * and GET /api/landing/demo-ping (the cached Lockheed Martin demo, with none
 * of those). Everything a ping produces lives here so the two cannot drift;
 * the routes own only their own concerns.
 *
 * A run produces:
 *   answer       the synthesized briefing, or null if synthesis failed
 *   grounded     true when the answer is built from retrieved sources
 *   sources      the dataset manifest, marked used/searched
 *   relevance    per-taxonomy-dimension 0..1, what the orbital map orbits on
 *   dossier      resolved company detail, or null when nothing resolved
 */

const FMP_STABLE = 'https://financialmodelingprep.com/stable';
/* The legacy v3 API, same key. Every dossier leg falls back to it, so a
   /stable/ path this plan does not serve degrades one field instead of the
   whole card. */
const FMP_V3 = 'https://financialmodelingprep.com/api/v3';
const HAIKU_MODEL = 'claude-haiku-4-5-20251001';
/* The research brief runs on a stronger model than the old 480-token Haiku
   summary: it reads more snippets, searches the web more and writes a longer,
   denser brief. SONAR_LANDING_MODEL overrides it; a model the key cannot use
   400s and anthropicSynthesize retries once on Haiku. */
const BRIEF_MODEL = process.env.SONAR_LANDING_MODEL || 'claude-sonnet-4-5';
const BRIEF_TOKENS = 1100;
const BRIEF_WEB_USES = 5;

export const DISCLAIMER =
  'Sonar synthesizes sourced research from Ezana datasets. Findings only, never financial advice.';

/* Oct 26: briefs were telling visitors to "watch the October 2026
   presidential election" after it had happened, and attributing facts to
   Reuters and Bloomberg on runs where no web search ran. Every brief now
   gets today's date in the ping and these two rule blocks. */
const DATE_RULES = `
Dates: today's date is the first line of the ping. Anything dated before today has already happened. Never describe a past election, vote, meeting, data release or deadline as upcoming, and never tell the reader to watch an event that has passed. If a past event's outcome is not in the sources or a web result, say it has taken place and that its result is not in the sources yet; never guess the result. A projection for a year that is already over is history, not a forecast.`;

const NO_WEB_RULES = `
Web search is not available for this brief. Never attribute a fact to an outlet, agency or report you did not read here (no "per Reuters", no "according to Bloomberg"). Anything you add beyond the sources is general background: say so, give the year it dates from, and never let it contradict the sources.`;

/** Today in Toronto (the brief's reader), long form: "Monday, October 26, 2026". */
function todayLine() {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Toronto',
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date());
}

/* The same switch anthropicSynthesize reads: without it no search runs. */
const webSearchOn = () => process.env.SONAR_WEB_SEARCH === 'true';

const GROUNDED_SYSTEM_PROMPT = `You are Ezana Sonar, a research analyst answering a ping. You have two kinds of evidence: numbered dataset snippets from Ezana's proprietary datasets (congressional trades, government contracts, SEC and 13F filings, lobbying, the OFAC sanctions list, prediction markets, Echo editorial), and live web search.
Rules:
- Ezana's datasets come first. Build the brief around every snippet that is genuinely about the subject and cite its marker inline, e.g. [S1]. Never cite a snippet about a different entity.
- Then go beyond the datasets: search the web for current facts, recent events, figures and context the snippets do not cover, and weave them in. Name the outlet or source for web facts in passing ("per Reuters").
- Answer the question the visitor actually asked. Lead with the direct answer, then the evidence, then what it means.
- Findings only. No financial or investment advice, price targets, or buy/sell/hold language. No fabricated figures: a number comes from a snippet or a web result, or it does not appear.
- Four short paragraphs separated by blank lines: (1) direct answer, (2) what Ezana's datasets show, cited, (3) what the web adds: recent events and figures, (4) cross-signals and what to watch. Each paragraph 50 to 90 words. No headers, no lists, no em dashes.`;

/* The no-snippet path: the datasets returned nothing about the subject, so
   the brief is web research. It says so in one clause, never invents a
   dataset citation, and still has to be substantive. */
const GENERAL_SYSTEM_PROMPT = `You are Ezana Sonar, a research analyst answering a ping. Ezana's proprietary datasets returned no match for this subject, so your evidence is live web search.
Rules:
- Search the web thoroughly and answer the question the visitor actually asked, leading with what is true and current. Give real substance: names, dates, figures, outlets.
- Note in ONE clause, not a sentence of its own, that Ezana's datasets do not cover this subject yet.
- Never invent dataset citations. Do not use [S1] style markers: there are no snippets to cite. If web search did not run, say plainly that this is general background rather than sourced research.
- No fabricated figures, dates or names. A number either comes from a web result or does not appear.
- Findings only. No financial or investment advice, price targets, or buy/sell/hold language.
- Four short paragraphs separated by blank lines: (1) direct answer, (2) the strongest specifics, (3) recent developments, (4) what to watch, or a better ping for sourced results. Each paragraph 50 to 90 words. No headers, no lists, no em dashes.`;

/* Appended for an IPO ping (Oct 30). */
const IPO_ADDENDUM = `
This ping is about an IPO. Snippets marked (ipo) are IPO filing records: offer price, shares offered, proceeds, valuation, exchange, ticker and first trade date. Lead with them and cite them. A value written with "about" is derived from the record's own numbers; say "about". If there is no (ipo) snippet, do not say whether the company has gone public unless a web result says so.`;

/* Recent-event pings (IPO, M&A, earnings, elections, appointments, deaths,
   launches) can postdate any model's training, so they search a little more. */
const RECENT_WEB_USES = BRIEF_WEB_USES + 2;

/* Appended for a sanctions ping. The JSON is stripped from the brief and
   drawn as the exposure table; splitExposed drops malformed rows. */
const SANCTIONS_ADDENDUM = `
This ping is about sanctions. The [S#] snippets marked (sanctions) are Ezana's copy of the US Treasury OFAC SDN list; use them for which jurisdictions and programs carry the most listings. Use web search for which companies are exposed (revenue, operations or supply chains in sanctioned jurisdictions, or named in enforcement).
After the four paragraphs, append on its own line a JSON array inside <exposed></exposed> tags, up to 8 companies a web result names as exposed, most exposed first: [{"company":"Name","ticker":"TICK or null","exposure":"high|medium|low","why":"one clause, under 20 words"}]. Only companies a search result supports. If none, write <exposed>[]</exposed>.`;

/* Dataset to taxonomy dimension. SONAR_DATASETS entries carry {id,label,source}
   and no dimension, so the mapping is stated here against DATASET_TAXONOMY's
   own blurbs: Capitol Watch covers "congressional trading, committee power,
   campaign money, lobbying, and the federal contracts that political influence
   moves"; Titans Shadow covers "institutional and corporate-insider filings";
   The Hive covers "prediction-market odds".
   Echo is deliberately absent. It is Ezana's editorial layer ACROSS the seven
   dimensions rather than one of them, and assigning it to a dimension would
   invent a signal the retrieval never produced. */
const DATASET_DIMENSION = {
  congress: 'capitol',
  'gov-contracts': 'capitol',
  lobbying: 'capitol',
  '13f': 'titans',
  'sec-filings': 'titans',
  'prediction-markets': 'hive',
};

const ALL_DIMENSIONS = [
  'capitol',
  'titans',
  'eyes',
  'whispers',
  'hive',
  'lighthouse',
  'regulatory',
];

/* Floors, so the map never collapses to the hub: a dimension whose datasets
   were searched and came back empty still sits further out than one that was
   never entitled to be searched at all. */
const FLOOR_SEARCHED = 0.15;
const FLOOR_UNSEARCHED = 0.1;
const FLOOR_UNGROUNDED = 0.12;

/* Name resolutions are stable for a company's lifetime, so a day is a
   conservative stamp. Module level, which on a serverless runtime means per
   warm instance: a cache miss costs one cheap search call, never a wrong
   answer. */
const RESOLVE_TTL_MS = 24 * 60 * 60 * 1000;
/* Oct 30: a miss used to be cached for the same day as a hit, so a company
   that listed after its first failed lookup (a new IPO) stayed unresolvable
   for 24 hours on that instance. A miss now expires in 10 minutes. */
const RESOLVE_MISS_TTL_MS = 10 * 60 * 1000;
const resolveCache = new BoundedMap(1000);

/* Last resort for an IPO ping whose company name the search endpoints do not
   know yet (the listing is newer than their name index). Only used after the
   name search misses, and the ticker is then checked against the profile
   endpoint, so an alias can never resolve to a symbol that does not trade. */
const IPO_NAME_ALIASES = {
  spacex: 'SPCX',
  'space x': 'SPCX',
  'space exploration technologies': 'SPCX',
  'space exploration technologies corp': 'SPCX',
};

/** Resolve the company an IPO ping is about. */
export async function resolveIpoCompany(subject) {
  const s = String(subject || '').trim();
  if (!s) return null;
  const hit = await resolveCompany(s);
  if (hit) return hit;
  const alias = IPO_NAME_ALIASES[s.toLowerCase().replace(/[.,]+$/, '')];
  if (!alias) return null;
  console.log('[sonar-pipeline] ipo alias fallback', { subject: s, alias });
  return resolveCompany(`$${alias}`);
}

/* A bare all-caps token is a ticker only when it is not geography or a
   common acronym: "…industry in the USA" used to take the ticker branch and
   resolve to Liberty All-Star Equity Fund (USA). A $-cued token always is. */
const bareTickers = (query) =>
  (String(query).match(/\b[A-Z]{2,5}\b/g) || []).filter((t) => !TICKER_BLOCKLIST.has(t));

function looksLikeTicker(query) {
  return /\$[A-Za-z]{1,5}\b/.test(query) || bareTickers(query).length > 0;
}

async function fetchJson(url, ms = 4000) {
  const res = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(ms) });
  if (!res.ok) return null;
  return res.json();
}

/**
 * Same fetch, but it reports the status. A leg that comes back empty tells you
 * nothing on its own: 200-with-no-rows (wrong symbol) and 403 (plan does not
 * cover this path) look identical downstream, and that ambiguity is what made
 * the empty dossier hard to pin down. Every leg now records its code.
 */
async function fetchWithStatus(url, ms = 4000) {
  try {
    const res = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(ms) });
    const status = res.status;
    if (!res.ok) return { status, data: null };
    return { status, data: await res.json() };
  } catch (e) {
    return { status: e?.name === 'TimeoutError' ? 'timeout' : 'neterr', data: null };
  }
}

/** First non-empty response across a chain of URLs, with the status of each. */
async function firstOf(urls, pick, ms = 4000) {
  const codes = [];
  for (const { id, url } of urls) {
    if (!url) continue;
    const { status, data } = await fetchWithStatus(url, ms);
    const value = data == null ? null : pick(data);
    codes.push(`${id}:${status}${value ? '' : ':empty'}`);
    if (value) return { value, codes };
  }
  return { value: null, codes };
}

function tickerToken(query) {
  const dollar = String(query).match(/\$([A-Za-z]{1,5})\b/);
  if (dollar) return dollar[1].toUpperCase();
  return bareTickers(query)[0] || null;
}

/**
 * Resolution has to work from either end, because both arrive: a visitor
 * types "lockheed martin" and every ticker-keyed retriever needs a ticker, or
 * they type "LMT" and the dossier needs a company name.
 *
 * Each direction tries more than one upstream, and that is deliberate rather
 * than defensive padding. No search or profile endpoint is used anywhere else
 * in this repo, so none of them is proven against this FMP plan, and the
 * sandbox this was written in cannot reach FMP at all to find out. Trying the
 * documented paths in order and falling back to Finnhub, which the city-news
 * route already calls server-side with the same pattern, means resolution
 * works on whichever one the plan actually answers instead of on a guess. The
 * log line names the winner, so production tells us which it is.
 */
/**
 * Pick the US primary listing out of a search result set.
 *
 * This is the whole reason the dossier was empty. FMP's name search returned
 * LMT.BA, the Buenos Aires cross-listing, as its first match for "Lockheed
 * Martin", and every dossier leg then queried a symbol the quote, ratios and
 * price-history endpoints have nothing useful for: fund=false spark=0 news=0.
 * The /stable/ paths were never the problem; the ticker was.
 *
 * A suffixed symbol (LMT.BA, LMT.MX) is a foreign listing by FMP's
 * convention, so an unsuffixed match wins. Exchange is the tiebreak where the
 * payload carries one.
 */
const US_EXCHANGES = new Set(['NASDAQ', 'NYSE', 'AMEX', 'NYSEARCA', 'BATS', 'OTC']);

function pickUsListing(rows) {
  const list = Array.isArray(rows)
    ? rows.filter((r) => r?.symbol && (r.name || r.companyName))
    : [];
  if (!list.length) return null;
  const score = (r) => {
    const sym = String(r.symbol).toUpperCase();
    const ex = String(r.exchangeShortName || r.exchange || '').toUpperCase();
    let n = 0;
    if (!sym.includes('.')) n += 2;
    if (US_EXCHANGES.has(ex)) n += 1;
    return n;
  };
  const best = list.reduce((a, b) => (score(b) > score(a) ? b : a), list[0]);
  return {
    ticker: String(best.symbol).toUpperCase(),
    name: String(best.name || best.companyName),
  };
}

/* limit=10, not 1: picking the right listing needs more than one candidate. */
const NAME_LOOKUPS = [
  {
    id: 'fmp/search-name',
    url: (q, k) => `${FMP_STABLE}/search-name?query=${encodeURIComponent(q)}&limit=10&apikey=${k}`,
    pick: (d) => d,
    map: (d) => pickUsListing(d),
  },
  {
    id: 'fmp/search-symbol',
    url: (q, k) =>
      `${FMP_STABLE}/search-symbol?query=${encodeURIComponent(q)}&limit=10&apikey=${k}`,
    pick: (d) => d,
    map: (d) => pickUsListing(d),
  },
  {
    id: 'fmp-v3/search',
    url: (q, k) => `${FMP_V3}/search?query=${encodeURIComponent(q)}&limit=10&apikey=${k}`,
    pick: (d) => d,
    map: (d) => pickUsListing(d),
  },
];

const TICKER_LOOKUPS = [
  {
    id: 'fmp/profile',
    url: (t, k) => `${FMP_STABLE}/profile?symbol=${encodeURIComponent(t)}&apikey=${k}`,
    pick: (d) => (Array.isArray(d) ? d[0] : d),
    map: (r, t) => (r?.companyName ? { ticker: t, name: String(r.companyName) } : null),
  },
  {
    id: 'fmp-v3/profile',
    url: (t, k) => `${FMP_V3}/profile/${encodeURIComponent(t)}?apikey=${k}`,
    pick: (d) => (Array.isArray(d) ? d[0] : d),
    map: (r, t) => (r?.companyName ? { ticker: t, name: String(r.companyName) } : null),
  },
];

async function tryFmp(lookups, arg) {
  const key = getFmpKey();
  if (!key) return null;
  const k = encodeURIComponent(key);
  for (const lookup of lookups) {
    try {
      const data = await fetchJson(lookup.url(arg, k));
      const hit = lookup.map(lookup.pick(data), arg);
      if (hit) {
        console.log('[sonar-pipeline] resolved via', lookup.id, hit);
        return hit;
      }
    } catch {
      /* try the next one */
    }
  }
  return null;
}

/** Finnhub, the one search upstream this repo already uses in production. */
async function tryFinnhub(query, ticker) {
  const key = process.env.FINNHUB_API_KEY;
  if (!key) return null;
  const k = encodeURIComponent(key);
  try {
    if (ticker) {
      const d = await fetchJson(
        `https://finnhub.io/api/v1/stock/profile2?symbol=${encodeURIComponent(ticker)}&token=${k}`,
      );
      if (d?.name) {
        console.log('[sonar-pipeline] resolved via finnhub/profile2', { ticker, name: d.name });
        return { ticker, name: String(d.name) };
      }
      return null;
    }
    const d = await fetchJson(
      `https://finnhub.io/api/v1/search?q=${encodeURIComponent(query)}&exchange=US&token=${k}`,
    );
    const row = Array.isArray(d?.result) ? d.result[0] : null;
    if (row?.symbol && row?.description) {
      const hit = { ticker: String(row.symbol).toUpperCase(), name: String(row.description) };
      console.log('[sonar-pipeline] resolved via finnhub/search', hit);
      return hit;
    }
  } catch {
    /* fail-soft */
  }
  return null;
}

/**
 * Resolve a query to { ticker, name }, from either direction. Memoized for a
 * day; any failure returns null and the raw query proceeds unchanged.
 */
export async function resolveCompany(query) {
  const q = String(query || '').trim();
  if (!q) return null;
  const key = q.toLowerCase();
  const hit = resolveCache.get(key);
  if (hit && Date.now() - hit.at < (hit.value ? RESOLVE_TTL_MS : RESOLVE_MISS_TTL_MS)) {
    return hit.value;
  }

  const ticker = looksLikeTicker(q) ? tickerToken(q) : null;
  let value = null;
  try {
    value = ticker
      ? (await tryFmp(TICKER_LOOKUPS, ticker)) || (await tryFinnhub(q, ticker))
      : (await tryFmp(NAME_LOOKUPS, q)) || (await tryFinnhub(q, null));
  } catch {
    /* fail-soft: an unreachable or rate-limited upstream must not cost a ping */
  }
  if (!value) console.log('[sonar-pipeline] no resolution', { query: q, ticker });
  resolveCache.set(key, { at: Date.now(), value });
  return value;
}

/** Counts per corpus, normalized, floored, keyed by taxonomy dimension. */
function relevanceFrom(items, corporaSearched) {
  const byDimension = {};
  for (const item of items) {
    const dataset = CORPUS_TO_DATASET[item.corpus];
    /* The OFAC aggregates are attached by intent, not retrieved, so they
       have no SONAR_DATASETS entry; they light Global Lighthouse. */
    /* The OECD and Empire figures for a country ping are attached the same
       way and are Global Lighthouse datasets (DATASET_TAXONOMY). */
    const dim =
      item.corpus === 'sanctions' ||
      item.corpus === 'oecd' ||
      item.corpus === 'empire' ||
      item.corpus === 'macro'
        ? 'lighthouse'
        : DATASET_DIMENSION[dataset];
    if (!dim) continue;
    byDimension[dim] = (byDimension[dim] || 0) + 1;
  }
  const searchedDims = new Set(
    corporaSearched.map((c) => DATASET_DIMENSION[CORPUS_TO_DATASET[c]]).filter(Boolean),
  );
  const max = Math.max(0, ...Object.values(byDimension));
  const out = {};
  for (const dim of ALL_DIMENSIONS) {
    const n = byDimension[dim] || 0;
    if (max > 0 && n > 0) out[dim] = Math.min(1, n / max);
    else out[dim] = searchedDims.has(dim) ? FLOOR_SEARCHED : FLOOR_UNSEARCHED;
  }
  return out;
}

function flatRelevance(v) {
  return Object.fromEntries(ALL_DIMENSIONS.map((d) => [d, v]));
}

/** First finite number among the candidates, so field-name drift is survivable. */
function num(...vals) {
  for (const v of vals) if (typeof v === 'number' && Number.isFinite(v)) return v;
  return null;
}

/** The fourth stat, named from whatever the ratios payload actually carries. */
function fourthStat(ratios) {
  if (!ratios) return null;
  const candidates = [
    ['Dividend yield TTM', ratios.dividendYieldTTM, 'percent'],
    ['Price / sales TTM', ratios.priceToSalesRatioTTM, 'ratio'],
    ['Return on equity TTM', ratios.returnOnEquityTTM, 'percent'],
    ['Current ratio TTM', ratios.currentRatioTTM, 'ratio'],
  ];
  for (const [label, value, kind] of candidates) {
    if (typeof value === 'number' && Number.isFinite(value)) return { label, value, kind };
  }
  return null;
}

/**
 * Company detail for the dossier stage. Every leg is independent, capped at 4s
 * and allowed to come back null: a dossier with a chart and no news is worth
 * more than no dossier because one upstream was slow.
 */
/* ── dossier.matches ───────────────────────────────────────────────────────
   What each dataset actually found for this ping, so a Sourced matches row can
   preview the finding rather than only name the dataset.

   Every leg is fail-soft and returns null on any error or empty result, which
   the band reads as "searched, nothing found" and renders as a dry row. No
   figure here is estimated or interpolated: a number that is not in the rows
   does not appear.
   ========================================================================= */

const FY_NOW = (() => {
  /* The US federal fiscal year starts on 1 October, so Oct to Dec belongs to
     the next one. The CURRENT fiscal year is always partial, which is the
     whole reason the year-over-year figure below refuses to use it. */
  const d = new Date();
  return d.getUTCMonth() >= 9 ? d.getUTCFullYear() + 1 : d.getUTCFullYear();
})();

const AGENCY_SHORT = (name) =>
  String(name || '')
    .replace(/^Department of (the )?/i, '')
    .replace(/\s*\(.*\)\s*$/, '')
    .trim() || 'Other';

export async function matchEcho(admin, { name, ticker }) {
  if (!admin || !name) return null;
  try {
    const safe = name.replace(/[,()%*]/g, ' ');
    const { data } = await admin
      .from('echo_articles')
      .select('article_slug, article_title, article_excerpt, article_body, published_at')
      .eq('article_status', 'published')
      /* No date window. The dossier's news leg is about what is current; this
         is the archive, and a two-year-old Echo piece on a defense prime is
         exactly the kind of coverage the claim is about. */
      .or(
        `article_title.ilike.%${safe}%,article_body.ilike.%${safe}%` +
          (ticker ? `,article_title.ilike.%${ticker}%` : ''),
      )
      .order('published_at', { ascending: false })
      .limit(2);
    if (!data?.length) return null;
    return data.map((a) => ({
      title: String(a.article_title || ''),
      slug: String(a.article_slug || ''),
      /* article_excerpt where it exists, else the first sentences of the
         plaintext body, which curated-seed.js already stores with the [[kw:]]
         markup stripped. Three sentences either way. */
      excerpt: firstSentences(a.article_excerpt || a.article_body || '', 3),
      publishedAt: a.published_at || null,
    }));
  } catch (e) {
    console.error('[sonar-pipeline] echo matches failed:', e?.message);
    return null;
  }
}

function firstSentences(raw, n) {
  const text = String(raw || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\[\[kw:[^\]]*\]\]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!text) return '';
  const parts = text.match(/[^.!?]+[.!?]+/g);
  if (!parts) return text.slice(0, 220);
  return parts.slice(0, n).join(' ').trim();
}

async function matchContracts(admin, { name }) {
  if (!admin || !name) return null;
  try {
    /* Prefix match, not equality. USAspending spells one recipient several
       ways ("LOCKHEED MARTIN CORPORATION", "LOCKHEED MARTIN CORP"), and
       matching exactly splits one company into several. */
    const prefix = name
      .replace(/[%_,()]/g, ' ')
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .join(' ');
    if (!prefix) return null;
    const { data } = await admin
      .from('gov_contract_recipient_rollup')
      .select('fiscal_year, recipient_name, awarding_agency, total_amount, award_count')
      .ilike('recipient_name', `${prefix}%`)
      .limit(5000);
    if (!data?.length) return null;

    let total = 0;
    let awards = 0;
    const byFy = new Map();
    const byAgency = new Map();
    for (const r of data) {
      const v = Number(r.total_amount) || 0;
      const c = Number(r.award_count) || 0;
      total += v;
      awards += c;
      const fy = Number(r.fiscal_year);
      if (Number.isFinite(fy)) byFy.set(fy, (byFy.get(fy) || 0) + v);
      const a = AGENCY_SHORT(r.awarding_agency);
      byAgency.set(a, (byAgency.get(a) || 0) + v);
    }
    if (!total || !byFy.size) return null;

    const series = [...byFy.entries()]
      .map(([fy, value]) => ({ fy, value }))
      .sort((a, b) => a.fy - b.fy);

    /* Complete fiscal years only. Comparing a partial current year against a
       whole one is how a quick view ends up reporting a 60% collapse that
       never happened. */
    const complete = series.filter((d) => d.fy < FY_NOW);
    const yoy =
      complete.length >= 2
        ? (() => {
            const to = complete[complete.length - 1];
            const from = complete[complete.length - 2];
            if (!from.value) return null;
            return {
              value: (to.value - from.value) / from.value,
              from: from.fy,
              to: to.fy,
            };
          })()
        : null;

    const ranked = [...byAgency.entries()].sort((a, b) => b[1] - a[1]);
    const top = ranked.slice(0, 3);
    const otherValue = ranked.slice(3).reduce((sum, [, v]) => sum + v, 0);
    const agencies = top.map(([nm, v]) => ({ name: nm, value: v, share: v / total }));
    if (otherValue > 0) {
      agencies.push({ name: 'Other', value: otherValue, share: otherValue / total });
    }

    return {
      recipient: data[0].recipient_name || name,
      total,
      awards,
      avg: awards ? total / awards : null,
      yoy,
      coverage: { fromFy: series[0].fy, toFy: series[series.length - 1].fy },
      series,
      agencies,
    };
  } catch (e) {
    console.error('[sonar-pipeline] contract matches failed:', e?.message);
    return null;
  }
}

/* public.congress_trades is the live STOCK Act table (House Clerk and Senate
   eFD, one row per disclosed transaction). This used to read
   public.congressional_trades, a retired table with zero rows, which is why
   every ping's CONGRESS row rendered dry. Member names come from
   congress_members in a second keyed read. */
const TRADE_TYPE_LABEL = {
  purchase: 'Purchase',
  sale: 'Sale',
  sale_partial: 'Partial sale',
  exchange: 'Exchange',
};

async function matchCongress(admin, { ticker }) {
  if (!admin || !ticker) return null;
  try {
    const { data, error } = await admin
      .from('congress_trades')
      .select('bioguide_id, type, transaction_date')
      .eq('ticker', ticker.toUpperCase())
      .order('transaction_date', { ascending: false })
      .limit(3);
    if (error || !data?.length) return null;
    const ids = [...new Set(data.map((r) => r.bioguide_id).filter(Boolean))];
    const { data: members } = ids.length
      ? await admin.from('congress_members').select('bioguide_id, full_name').in('bioguide_id', ids)
      : { data: [] };
    const nameOf = new Map((members || []).map((m) => [m.bioguide_id, m.full_name]));
    return data.map((r) => ({
      member: String(nameOf.get(r.bioguide_id) || 'Member of Congress'),
      type: TRADE_TYPE_LABEL[r.type] || String(r.type || ''),
      date: r.transaction_date || null,
    }));
  } catch (e) {
    console.error('[sonar-pipeline] congress matches failed:', e?.message);
    return null;
  }
}

/* "STATE STREET CORP (STT, STT-PG)" reads as a shouted ledger line on a
   landing page. Drop the trailing ticker list and soften all-caps names;
   mixed-case names ("BlackRock, Inc.") are left exactly as filed. */
function filerLabel(raw) {
  const s = String(raw || '')
    .replace(/\s*\([^)]*\)\s*$/, '')
    .trim();
  if (s !== s.toUpperCase()) return s;
  return s
    .toLowerCase()
    .replace(/\b([a-z])/g, (c) => c.toUpperCase())
    .replace(/\b(Llc|Lp|Llp|Na|Fsb|Plc|Ag|Sa)\b/g, (w) => w.toUpperCase());
}

const quarterLabel = (iso) => {
  const d = String(iso || '');
  const m = Number(d.slice(5, 7));
  return m ? `Q${Math.ceil(m / 3)} ${d.slice(0, 4)}` : null;
};

async function matchSec(admin, { ticker }) {
  if (!admin || !ticker) return null;
  try {
    const { data } = await admin
      .from('sec_filings')
      .select('form_type, filer_name, filed_at')
      .eq('ticker', ticker.toUpperCase())
      .order('filed_at', { ascending: false })
      .limit(3);
    if (!data?.length) return null;
    return data.map((r) => ({
      form: String(r.form_type || ''),
      filer: String(r.filer_name || ''),
      filedAt: r.filed_at || null,
    }));
  } catch (e) {
    console.error('[sonar-pipeline] sec matches failed:', e?.message);
    return null;
  }
}

/* The largest 13F holders in the latest COMPLETE quarter, via the
   sonar_top_13f RPC (supabase/migrations/20261009120000_sonar_top_13f.sql).
   This used to read public.whale_moves, a few hundred scored moves with
   nothing for most tickers. A missing RPC (migration not yet applied) leaves
   the row dry exactly as before rather than failing the dossier. */
async function match13f(admin, { ticker }) {
  if (!admin || !ticker) return null;
  try {
    const { data, error } = await admin.rpc('sonar_top_13f', {
      p_ticker: ticker.toUpperCase(),
      p_limit: 3,
    });
    if (error) {
      console.error('[sonar-pipeline] 13f rpc failed:', error.message);
      return null;
    }
    const top = Array.isArray(data?.top) ? data.top : [];
    if (!top.length) return null;
    const quarter = quarterLabel(data.period);
    return top.map((r) => ({
      filer: filerLabel(r.filer_name),
      changeType: r.change_type || null,
      valueUsd: r.value_usd == null ? null : Number(r.value_usd),
      quarter,
    }));
  } catch (e) {
    console.error('[sonar-pipeline] 13f matches failed:', e?.message);
    return null;
  }
}

async function matchLobbying(admin, { ticker, name }) {
  if (!admin) return null;
  try {
    /* The verified ticker map first; a name prefix only as the fallback. */
    let clients = [];
    if (ticker) {
      const { data } = await admin
        .from('lobbying_client_tickers')
        .select('client_name')
        .eq('ticker', ticker.toUpperCase());
      clients = (data || []).map((r) => r.client_name).filter(Boolean);
    }
    const prefix = String(name || '')
      .replace(/[%_,()]/g, ' ')
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .join(' ')
      .toUpperCase();
    if (!clients.length && !prefix) return null;

    let q = admin
      .from('lobbying_filings')
      .select('filing_year, amount, registrant_name, client_name, dt_posted');
    q = clients.length ? q.in('client_name', clients) : q.ilike('client_name', `${prefix}%`);
    const { data } = await q.order('dt_posted', { ascending: false }).limit(1000);
    if (!data?.length) return null;

    const years = data.map((r) => Number(r.filing_year)).filter(Number.isFinite);
    const byRegistrant = new Map();
    for (const r of data) {
      const k = r.registrant_name || 'Unknown';
      byRegistrant.set(k, (byRegistrant.get(k) || 0) + 1);
    }

    /* In-house spend only: filings where the registrant IS the client, for
       the latest COMPLETE calendar year. Adding outside firms' reported
       income on top would double count, and a partial year would understate. */
    let inHouse = null;
    if (prefix) {
      const nowYear = new Date().getUTCFullYear();
      const own = data.filter((r) =>
        String(r.registrant_name || '')
          .toUpperCase()
          .startsWith(prefix),
      );
      const ownYears = [...new Set(own.map((r) => Number(r.filing_year)))]
        .filter((y) => Number.isFinite(y) && y < nowYear)
        .sort((a, b) => b - a);
      if (ownYears.length) {
        const spend = own
          .filter((r) => Number(r.filing_year) === ownYears[0])
          .reduce((s, r) => s + (Number(r.amount) || 0), 0);
        if (spend > 0) inHouse = { year: ownYears[0], spend };
      }
    }

    return {
      client: String(data[0].client_name || name || ''),
      filings: data.length,
      fromYear: years.length ? Math.min(...years) : null,
      toYear: years.length ? Math.max(...years) : null,
      registrantCount: byRegistrant.size,
      registrants: [...byRegistrant.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([n]) => n),
      inHouse,
    };
  } catch (e) {
    console.error('[sonar-pipeline] lobbying matches failed:', e?.message);
    return null;
  }
}

/* Search terms only, never data. A market found through these is labelled
   "related" on the card, because it is about the company's exposure rather
   than the company. Extend per ticker as coverage grows. */
const RELATED_MARKET_TERMS = {
  LMT: ['F-35', 'defense budget', 'Pentagon'],
};

async function matchMarkets(admin, { ticker, name, understood = null }) {
  if (!admin || !name) return null;
  const run = async (terms) => {
    const ors = terms
      .map(
        (t) =>
          `question.ilike.%${String(t)
            .replace(/[,()%*]/g, ' ')
            .trim()}%`,
      )
      .join(',');
    const { data } = await admin
      .from('prediction_market_index')
      .select('question, description, category, probability, platform, volume')
      .or(ors)
      .order('volume', { ascending: false, nullsFirst: false })
      .limit(12);
    /* Relevance gate: no sports or entertainment, and the subject must
       appear in the market itself. Never padded with weak matches. */
    const gate = understood
      ? understood
      : {
          entities: [
            ticker ? { kind: 'ticker', id: ticker, label: name } : null,
            { kind: 'company', id: name, label: name },
          ].filter(Boolean),
        };
    return gateMarkets(data || [], gate).slice(0, 2);
  };
  try {
    /* The full name only. The old first-word fallback ("Liberty" from
       "Liberty All-Star Equity Fund") matched sports spreads. */
    let rows = await run(understood?.marketTerms?.length ? understood.marketTerms : [name]);
    let related = false;
    const extra = ticker ? RELATED_MARKET_TERMS[ticker.toUpperCase()] : null;
    if (!rows.length && extra) {
      rows = await run(extra);
      related = true;
    }
    if (!rows.length) return null;
    return rows.map((r) => ({
      question: String(r.question || ''),
      probability: r.probability == null ? null : Number(r.probability),
      platform: r.platform || null,
      related,
    }));
  } catch (e) {
    console.error('[sonar-pipeline] market matches failed:', e?.message);
    return null;
  }
}

export async function buildMatches({ ticker, name }, admin, understood = null) {
  const [echo, contracts, congress, sec, thirteenF, lobbying, markets] = await Promise.all([
    matchEcho(admin, { name, ticker }),
    matchContracts(admin, { name }),
    matchCongress(admin, { ticker }),
    matchSec(admin, { ticker }),
    match13f(admin, { ticker }),
    matchLobbying(admin, { ticker, name }),
    matchMarkets(admin, { ticker, name, understood }),
  ]);
  return { echo, contracts, congress, sec, thirteenF, lobbying, markets };
}

export async function buildDossier({ ticker, name }, admin) {
  const apikey = getFmpKey();
  const sym = encodeURIComponent(ticker);
  const finnhubKey = process.env.FINNHUB_API_KEY || '';
  const today = new Date();
  const from = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const to = today.toISOString().slice(0, 10);

  /* Year to date, not a rolling 60 rows: the chart is labelled YTD, so the
     window has to be the actual year rather than whatever 60 trading days
     happens to cover. */
  const ytdFrom = `${today.getUTCFullYear()}-01-01`;

  const k = encodeURIComponent(apikey);
  const u = (path) => (apikey ? { id: path.split('?')[0].split('/').pop(), url: path } : {});

  /* Every leg is a chain: the /stable/ path first, then the legacy v3 path on
     the same key. A plan that does not serve one of them loses a field, not
     the card. Each chain reports the status of every attempt, so the next
     empty dossier says WHY: 403 means the plan, 200:empty means the symbol. */
  const legs = await Promise.all([
    firstOf(
      [u(`${FMP_STABLE}/quote?symbol=${sym}&apikey=${k}`), u(`${FMP_V3}/quote/${sym}?apikey=${k}`)],
      (d) => (Array.isArray(d) ? d[0] : d) || null,
    ),
    firstOf(
      [
        u(`${FMP_STABLE}/ratios-ttm?symbol=${sym}&apikey=${k}`),
        u(`${FMP_V3}/ratios-ttm/${sym}?apikey=${k}`),
        u(`${FMP_V3}/key-metrics-ttm/${sym}?apikey=${k}`),
      ],
      (d) => (Array.isArray(d) ? d[0] : d) || null,
    ),
    firstOf(
      [
        u(
          `${FMP_STABLE}/historical-price-eod/light?symbol=${sym}&from=${ytdFrom}&to=${to}&apikey=${k}`,
        ),
        u(`${FMP_V3}/historical-price-full/${sym}?from=${ytdFrom}&serietype=line&apikey=${k}`),
      ],
      (d) => {
        const r = Array.isArray(d) ? d : Array.isArray(d?.historical) ? d.historical : null;
        return r && r.length ? r : null;
      },
    ),
    /* News: Finnhub first, the upstream the city-news route already uses, then
       FMP's own stock_news on the same key so a resolved ticker is never
       structurally newsless for want of a second provider. */
    firstOf(
      [
        finnhubKey
          ? {
              id: 'finnhub/company-news',
              url: `https://finnhub.io/api/v1/company-news?symbol=${sym}&from=${from}&to=${to}&token=${encodeURIComponent(finnhubKey)}`,
            }
          : {},
        u(`${FMP_V3}/stock_news?tickers=${sym}&limit=4&apikey=${k}`),
      ],
      (d) => (Array.isArray(d) && d.length ? d : null),
    ),
    /* Profile, for the industry that titles the news card and picks the
       industry stories ("Aerospace & Defense" for LMT). Finnhub's
       finnhubIndustry is the fallback on the same chain. */
    firstOf(
      [
        u(`${FMP_STABLE}/profile?symbol=${sym}&apikey=${k}`),
        u(`${FMP_V3}/profile/${sym}?apikey=${k}`),
        finnhubKey
          ? {
              id: 'finnhub/profile2',
              url: `https://finnhub.io/api/v1/stock/profile2?symbol=${sym}&token=${encodeURIComponent(finnhubKey)}`,
            }
          : {},
      ],
      (d) => {
        const r = Array.isArray(d) ? d[0] : d;
        const industry = r?.industry || r?.finnhubIndustry || null;
        return industry ? { industry: String(industry), sector: r?.sector || null } : null;
      },
    ),
  ]);

  let echoRes = null;
  try {
    echoRes = admin
      ? await admin
          .from('echo_articles')
          .select('article_title, article_slug, published_at')
          .eq('article_status', 'published')
          .gte('published_at', new Date(today.getTime() - 42 * 24 * 60 * 60 * 1000).toISOString())
          .or(
            `article_title.ilike.%${name.replace(/[,()%*]/g, ' ')}%,article_body.ilike.%${name.replace(/[,()%*]/g, ' ')}%`,
          )
          .order('published_at', { ascending: false })
          .limit(3)
      : null;
  } catch {
    /* fail-soft: the card renders on external news alone */
  }

  const quote = legs[0].value;
  const ratios = legs[1].value;
  const eod = legs[2].value;
  const news = legs[3].value;
  const profile = legs[4].value;
  const legCodes = legs.flatMap((l) => l.codes);

  /* Industry coverage that need not name the company: a ping on Lockheed
     should still surface a Northrop munitions award or a Pentagon budget
     story. Fail-soft to an empty list. */
  const industry = industryProfile(profile?.industry);
  const industryNews = industry ? await fetchIndustryNews(admin, industry, { limit: 3 }) : [];

  const rows = Array.isArray(eod) ? eod : [];
  /* FMP returns newest first; the chart reads left to right in time. No
     slice: the whole year is the series. */
  const spark = rows
    .map((r) =>
      typeof r?.price === 'number' ? r.price : typeof r?.close === 'number' ? r.close : null,
    )
    .filter((n) => typeof n === 'number')
    .reverse();

  const fundamentals =
    quote && typeof quote.price === 'number'
      ? {
          price: quote.price,
          marketCap: typeof quote.marketCap === 'number' ? quote.marketCap : null,
          /* Field names differ between /stable/ and v3 and between
             ratios-ttm and key-metrics-ttm; whichever chain answered, the
             label stays truthful to the source field. */
          peTtm: num(
            ratios?.priceToEarningsRatioTTM,
            ratios?.peRatioTTM,
            ratios?.priceEarningsRatioTTM,
            quote?.pe,
          ),
          evToEbitdaTtm: num(
            ratios?.enterpriseValueMultipleTTM,
            ratios?.evToEBITDATTM,
            ratios?.enterpriseValueOverEBITDATTM,
          ),
          fourth: fourthStat(ratios),
        }
      : null;

  return {
    ticker,
    name,
    fundamentals,
    spark: spark.length >= 2 ? spark : null,
    sparkLabel: 'YTD',
    /* Surfaced in the trace so an empty card explains itself. */
    legCodes,
    kind: 'company',
    industry: industry ? { label: industry.label, name: industry.name } : null,
    newsTitle: industryNewsTitle(industry),
    /* Industry stories first, then the company's own, newest first within
       each, four at most. Finnhub calls it headline/datetime, FMP calls it
       title/publishedDate. */
    news: [
      ...industryNews,
      ...(Array.isArray(news) ? news : [])
        .filter((n) => (n?.headline || n?.title) && n?.url)
        .slice(0, 2)
        .map((n) => ({
          title: String(n.headline || n.title),
          url: String(n.url),
          source: String(n.source || n.site || 'News'),
          publishedAt: n.datetime
            ? new Date(n.datetime * 1000).toISOString()
            : n.publishedDate
              ? new Date(n.publishedDate).toISOString()
              : null,
          scope: 'company',
        })),
    ]
      .filter((n, i, all) => all.findIndex((x) => x.url === n.url) === i)
      .slice(0, 4),
    echo: (Array.isArray(echoRes?.data) ? echoRes.data : [])
      .filter((r) => r?.article_title && r?.article_slug)
      .map((r) => ({
        title: String(r.article_title),
        slug: String(r.article_slug),
        publishedAt: r.published_at || null,
      })),
  };
}

/* The dossier for whatever the ping resolved to: a member of Congress, a
   company, or nothing. An enrichment throughout: a failed leg yields null,
   never a lost answer. */
async function buildDossierFor({
  country,
  politician,
  resolved,
  industry,
  understood,
  admin,
  leg,
}) {
  if (industry) {
    try {
      return await leg(
        'dossier-industry',
        () => buildIndustryDossier({ registry: industry, understood, admin, deps: { match13f } }),
        (v) =>
          `stages=${v.registry.stages.length} companies=${v.registry.companies.length} 13f=${v.matches.thirteenF?.length || 0} congress=${v.matches.congress?.length || 0} markets=${v.matches.markets?.length || 0} echo=${v.echo.length}`,
      );
    } catch {
      return null;
    }
  }
  /* A country carries its own matches (OECD, Empire, Echo, markets); the
     company legs (contracts, SEC, 13F, lobbying) have nothing to say about a
     country and render dry. */
  if (country) {
    try {
      return await leg(
        'dossier-country',
        () => buildCountryDossier(country, admin, { matchEcho }),
        (v) =>
          `oecd=${v.oecd ? v.oecd.headline.length : 0} story=${v.oecd?.stories?.length || 0} empire=${v.empire ? v.empire.rank || 'unranked' : 'n'} news=${v.news.length} echo=${v.echo.length}`,
      );
    } catch {
      return null;
    }
  }
  if (politician) {
    try {
      return await leg(
        'dossier-politician',
        () => buildPoliticianDossier(politician, admin),
        (v) =>
          `series=${v.series ? v.series.length : 0} similar=${v.similar.length} trades12m=${v.stats?.trades12m ?? 0}`,
      );
    } catch {
      return null;
    }
  }
  if (!resolved) return null;
  let dossier = null;
  try {
    dossier = await leg(
      'dossier',
      () => buildDossier(resolved, admin),
      (v) =>
        `fund=${Boolean(v.fundamentals)} spark=${v.spark ? v.spark.length : 0} news=${v.news.length} echo=${v.echo.length} [${(v.legCodes || []).join(' ')}]`,
    );
  } catch {
    return null;
  }
  /* What each dataset found, for the Sourced matches previews. Its own leg so
     a slow rollup scan cannot cost the dossier; a null leg renders its
     dataset as a dry row. */
  if (dossier) {
    try {
      dossier.matches = await leg(
        'matches',
        () => buildMatches(resolved, admin, understood),
        (m) =>
          `echo=${m.echo?.length || 0} contracts=${m.contracts ? 'y' : 'n'} congress=${m.congress?.length || 0} sec=${m.sec?.length || 0} 13f=${m.thirteenF?.length || 0} lobbying=${m.lobbying ? 'y' : 'n'} markets=${m.markets?.length || 0}`,
      );
    } catch {
      dossier.matches = null;
    }
  }
  return dossier;
}

/**
 * One ping, end to end. `admin` is the service-role client; the caller owns it
 * so the demo route and the guest route share one connection policy.
 */
const INDUSTRY_INTENTS = new Set(['industry_layout', 'industry_country']);

/* The country's US-listed basket (ETFs and ADRs) from the repo's
   region -> ticker map, never a hard-coded list here. */
function countryBasket(country) {
  const iso2 = (country.iso2 || '').toUpperCase();
  const hit = NEWS_REGIONS.find(
    (r) => r.id === iso2 || String(r.label || '').toLowerCase() === country.name.toLowerCase(),
  );
  return hit ? [...new Set(hit.tickers)] : [];
}

/** Everything the country_rank briefing adds to the country dossier. */
async function buildRankBlock(country, dossier, admin) {
  const payload = await getMacroRankings();
  const view = payload ? countryRankView(payload, country.iso3) : null;
  const basket = countryBasket(country);
  const [congress, thirteenF] = await Promise.all([
    basketCongress(admin, basket).catch(() => null),
    basket13f(admin, basket, match13f).catch(() => null),
  ]);
  if (!view && !dossier.empire) return null;
  return {
    view,
    lede: view ? rankLede(view, dossier.empire) : null,
    followups: rankFollowups(view, dossier.empire),
    attribution: WB_ATTRIBUTION,
    scope: SCOPE_NOTE,
    source: payload?.source || null,
    builtAt: payload?.builtAt || null,
    basket,
    congress,
    thirteenF,
  };
}

/**
 * Dataset snippets for a company ping, from the dossier's Sourced matches, in
 * the shape the retrievers emit. Only what the match cards show.
 */
export function companyEvidence(matches, resolved) {
  const out = [];
  const name = resolved?.name || resolved?.ticker || 'The company';
  const c = matches?.contracts;
  if (c?.total) {
    const agencies = (c.agencies || [])
      .filter((a) => a.name !== 'Other')
      .map((a) => `${a.name} ${Math.round(a.share * 100)}%`)
      .join(', ');
    const yoy = c.yoy
      ? ` Fiscal ${c.yoy.to} versus fiscal ${c.yoy.from}: ${c.yoy.value >= 0 ? 'up' : 'down'} ${Math.abs(Math.round(c.yoy.value * 100))}%.`
      : '';
    out.push({
      corpus: 'contracts',
      title: `${c.recipient} federal contract awards`,
      snippet: `${c.recipient} received ${usd(c.total)} across ${c.awards} federal contract awards from fiscal ${c.coverage?.fromFy} to fiscal ${c.coverage?.toFy} (USAspending).${agencies ? ` Top awarding agencies by value: ${agencies}.` : ''}${yoy}`,
      meta: { recipient: c.recipient },
    });
  }
  const trades = matches?.congress;
  if (trades?.length) {
    out.push({
      corpus: 'congress',
      title: `Congressional trades in ${resolved?.ticker || name}`,
      snippet: `Most recent STOCK Act disclosures in ${name} (${resolved?.ticker || ''}): ${trades
        .map((t) => `${t.member}, ${String(t.type).toLowerCase()}${t.date ? ` on ${t.date}` : ''}`)
        .join('; ')}.`,
      meta: { ticker: resolved?.ticker || null },
    });
  }
  const holders = matches?.thirteenF;
  if (holders?.length) {
    out.push({
      corpus: '13f',
      title: `13F holders of ${resolved?.ticker || name}`,
      snippet: `Largest 13F holders of ${name}${holders[0]?.quarter ? ` as of ${holders[0].quarter}` : ''}: ${holders
        .map((h) => `${h.filer}${h.valueUsd != null ? ` ${usd(h.valueUsd)}` : ''}`)
        .join('; ')} (SEC 13F filings).`,
      meta: { ticker: resolved?.ticker || null },
    });
  }
  const l = matches?.lobbying;
  if (l?.filings) {
    out.push({
      corpus: 'lobbying',
      title: `${l.client} lobbying disclosures`,
      snippet: `${l.client} appears in ${l.filings} federal lobbying disclosures${l.fromYear ? ` from ${l.fromYear} to ${l.toYear}` : ''}, filed by ${l.registrantCount} registrant firms${l.registrants?.length ? ` including ${l.registrants.join(', ')}` : ''}.${l.inHouse ? ` In-house lobbying spend in ${l.inHouse.year}: ${usd(l.inHouse.spend)}.` : ''} (Senate LDA filings)`,
      meta: { client: l.client },
    });
  }
  return out;
}

/* Per-leg ceilings for the landing ping. The route runs inside a 60s
   function; before these, every leg was unbounded and a slow database or
   upstream stacked them past the cap (prod Oct 26: resolve finished at 30s,
   retrieval was still running at 60s, Vercel killed the function, the
   client got a bare 504). A leg that misses its ceiling degrades to the
   same value it returns when it finds nothing, so the ping still answers. */
const LEG_MS = {
  industry: 5_000,
  politician: 5_000,
  resolve: 6_000,
  /* Oct 26 (v2): 9s per retriever cut the contracts scan off on every
     ping in production (the raw awards table is slow under the current
     disk IO), so every company brief went ungrounded. 15s with the trigram
     indexes from the matching migration, and the dossier matches below as
     a second evidence source when it still misses. */
  retrieveCap: 18_000,
  retriever: 15_000,
  embed: 3_000,
  rerank: 4_000,
  sanctions: 5_000,
  countryDossier: 8_000,
  companyDossier: 18_000,
  macroRank: 5_000,
};
/* Time kept back after the brief for the dossier/news awaits and the JSON
   response. */
const TAIL_MS = 3_000;
const DEFAULT_BUDGET_MS = 52_000;

export async function runLandingPipeline(
  query,
  { admin, wantDossier = true, noCorrect = false, force = null, deadlineAt = null } = {},
) {
  const deadline = Number(deadlineAt) || Date.now() + DEFAULT_BUDGET_MS;
  const left = () => deadline - Date.now();
  /* Resolve a leg's value within `ms` (clipped to what the request has left)
     or fall back. A thrown error still throws, so the trace records it. */
  const within = async (promise, ms, fallback, label) => {
    const r = await withTimeout(promise, Math.max(0, Math.min(ms, left())), label);
    if (r.ok) return r.value;
    if (r.error) throw r.error;
    console.warn('[sonar-pipeline] leg timed out', { label, ms, leftMs: left() });
    return fallback;
  };

  /* A run that ends without an answer has to say WHERE it broke, or the only
     signal in the logs is that it broke. Each leg records its name, outcome
     and duration; nothing from an error message goes in, so the leg names are
     safe to hand back to a client as `failedAt`. */
  const trace = [];
  const leg = async (name, fn, note, okOf) => {
    const t0 = Date.now();
    try {
      const value = await fn();
      /* Not throwing is not the same as working. Synthesis returns a shape
         with a null answer when the provider rejects it, which is precisely
         the failure worth naming, so a leg can declare its own success. */
      trace.push({
        leg: name,
        ok: okOf ? Boolean(okOf(value)) : true,
        ms: Date.now() - t0,
        note: note ? note(value) : undefined,
      });
      return value;
    } catch (e) {
      trace.push({ leg: name, ok: false, ms: Date.now() - t0, note: e?.name || 'threw' });
      throw e;
    }
  };

  /* Understanding first (spec Part A): the corrected text, the display
     title, the intent and the typed entities. Everything downstream reads
     this, never the raw string, so "give me a lyout of the semiconductor
     industry in the USA" is never echoed back and "USA" after "in the" is a
     country, not the Liberty All-Star Equity Fund. */
  const understood = await leg(
    'understand',
    () => understandQuery(query, { noCorrect, force }),
    (v) => `${v.intent} ${v.entities.map((e) => `${e.kind}:${e.id}`).join(',')}`,
  );
  const q = understood.corrected || query;
  const entity = (kind) => understood.entities.find((e) => e.kind === kind) || null;
  /* Oct 30: event intents from the visitor's own words. An IPO ping resolves
     the company it names (the question framing stripped: "what was the ipo
     value of spacex" resolves "spacex", not the whole sentence) and reads
     the IPO filings source first. A recent-event ping always asks for live
     web, whatever the tier. */
  const eventIntents = extractIntents(query);
  const ipoIntent = eventIntents.includes('ipo');
  const recentEvent = eventIntents.includes('recentEvent');
  const ipoSubj = ipoIntent ? ipoSubject(q) : null;
  const industryEnt = INDUSTRY_INTENTS.has(understood.intent) ? entity('industry') : null;
  const tickerEnt = entity('ticker');
  const countryEnt = entity('country');

  /* An industry ping is about the industry: no politician or company
     resolution at all. The registry may not cover every lexicon industry; the
     brief still answers, the layout renders only when the registry has it. */
  const industry = industryEnt
    ? await leg(
        'industry',
        () =>
          within(
            admin
              ? getIndustryRegistryCached(industryEnt.id)
              : getIndustryRegistry(null, industryEnt.id),
            LEG_MS.industry,
            null,
            'industry',
          ),
        (v) => (v ? `${v.source} stages=${v.stages.length}` : 'none'),
      )
    : null;
  const industryPing = Boolean(industry);

  /* A country: the strict whole-string match, or a country-intent ping
     whose chosen country entity resolves by name. */
  let country = industryPing
    ? null
    : resolveCountry(q) ||
      (['country', 'country_rank'].includes(understood.intent) && countryEnt
        ? resolveCountry(countryEnt.label)
        : null);
  const rankPing = understood.intent === 'country_rank' && Boolean(country);
  /* A member of Congress before a company: "Nancy Pelosi" must not resolve
     to whatever FMP's fuzzy name search returns for it. */
  const politician =
    country ||
    industryPing ||
    (tickerEnt && !understood.entities.some((e) => e.kind === 'person_politician'))
      ? null
      : await leg(
          'resolve-politician',
          () => within(resolvePolitician(q, admin), LEG_MS.politician, null, 'politician'),
          (v) => (v ? v.bioguideId : 'none'),
        );
  /* A company: only from a chosen ticker entity, or a ping with no other
     reading. A blocklisted word ("USA", "IT") never reaches here as a ticker
     unless the understanding layer chose it (a cue, or the chip). */
  const companyAllowed =
    !country &&
    !politician &&
    !industryEnt &&
    (tickerEnt ||
      ipoIntent ||
      ['company', 'ticker_lookup', 'open_question', 'fund'].includes(understood.intent));
  const resolved = companyAllowed
    ? await leg(
        'resolve',
        () =>
          within(
            tickerEnt
              ? resolveCompany(`$${tickerEnt.id}`)
              : ipoSubj
                ? resolveIpoCompany(ipoSubj)
                : resolveCompany(q),
            LEG_MS.resolve,
            null,
            'resolve',
          ),
        (v) => (v ? v.ticker : 'none'),
      )
    : null;
  /* Oct 26: a country named anywhere in an otherwise unresolved ping
     ("brazilian economy outlook for the next 4 years after the 2026 federal
     election") brings that country's dossier: the OECD key chart, the Empire
     rankings and the country news, and their figures as evidence. The ping's
     own words still drive retrieval, and the country filter keeps off-topic
     snippets (contracts for unrelated US firms) out of the brief. */
  const countryMentioned =
    !country && !politician && !resolved && !industryPing && !industryEnt
      ? mentionedCountry(q)
      : null;
  if (countryMentioned) country = countryMentioned;
  const display = understood.display || q;
  /* Retrieval sees the enriched string; the ledger keeps the raw words, the
     UI shows the display title. */
  const retrievalQuery = industryPing
    ? display
    : country
      ? countryMentioned
        ? q
        : rankPing
          ? `${country.name} economy size, growth and world ranking`
          : country.name
      : politician
        ? politician.name
        : resolved
          ? `${resolved.name} (${resolved.ticker})`
          : q;
  /* What the synthesis is told the ping resolved to. */
  const resolvedNote = industryPing
    ? ` (understood as an industry layout: ${display}; describe structure, major players, where it operates, concentration, capital flows, key dependencies and what to watch, from the sources only)`
    : country
      ? countryMentioned
        ? ` (about ${country.name}, ISO ${country.iso3}; Ezana's OECD Economic Outlook and Global Empire Rankings figures for ${country.name} are among the sources; answer the question as asked)`
        : rankPing
          ? ` (understood as ${display}: where ${country.name} ranks among the world's economies. Use ONLY the ranks, values, years and sources in the sources; name the measure, year and source for every rank; never state a rank or figure the sources do not give; projections only as "IMF projects" with the year. Sections: ${RANK_SECTIONS.join(' · ')}.)`
          : ` (resolved to the country ${country.name}, ISO ${country.iso3})`
      : politician
        ? ` (resolved to ${politician.name}, ${[politician.party, politician.state].filter(Boolean).join('-')}, U.S. ${politician.chamberLabel || 'Congress'})`
        : resolved
          ? ` (resolved to ${resolved.name}, ${resolved.ticker})`
          : '';

  const entitlements = getSonarEntitlements({ planTier: 0, version: 'regular' });
  const classification = classifyQuery(retrievalQuery);
  const allowCorpora = corporaForDatasets(entitlements.datasets);
  /* Wider than the old 'summary' budget: more snippets per corpus and more
     characters for the brief to read. */
  const budget = depthBudget('standard');
  const intent = detectIntent(q);

  /* The dossier and the news columns do not depend on the brief, so they run
     beside it instead of after it. Started BEFORE retrieval (Oct 26 v2) so
     a company's dataset matches are ready by the time the brief needs them:
     a country's dossier is its evidence (OECD, Empire), and a company's
     matches (contracts, Congress, 13F, lobbying) are too. */
  const dossierP =
    wantDossier || country || industry
      ? buildDossierFor({ country, politician, resolved, industry, understood, admin, leg })
      : null;

  const out = await leg(
    'retrieve',
    () =>
      within(
        orchestrate(retrievalQuery, {
          admin,
          allowCorpora,
          /* The user's own words, so a retriever that resolves its own entities
             (sanctions reads countries/themes) sees the second country even
             when retrievalQuery collapsed to a single resolved name. */
          rawQuery: query,
          topK: budget.topK,
          perCorpusCap: budget.perCorpusCap,
          charBudget: budget.charBudget,
          /* A slow corpus drops out instead of holding the whole fan-out. */
          retrieverTimeoutMs: LEG_MS.retriever,
          embedTimeoutMs: LEG_MS.embed,
          rerankTimeoutMs: LEG_MS.rerank,
        }),
        /* Never let retrieval eat the brief's time: at least ~22s stays for
           synthesis and the tail. */
        Math.min(LEG_MS.retrieveCap, left() - 22_000),
        { items: [], corporaSearched: allowCorpora || [] },
        'retrieve',
      ),
    (v) => `retrieved ${(v.items || []).length}`,
  );
  const retrieved = out.items || [];
  const corporaSearched = [...(out.corporaSearched || [])];

  /* Off-entity chunks poison the synthesis: an Apple ping came back citing
     Boeing and Lockheed awards, because semantic retrieval returns what is
     SIMILAR, not what is about the same company. When resolution tells us the
     entity, keep only the items that actually mention it.

     The haystack is title plus snippet plus the structured meta, NOT a `text`
     field: no retriever emits one, so matching on it would leave every
     haystack empty, drop every item, and send every entity ping down the
     ungrounded path. Checked against the retrievers rather than assumed. */
  const industryTermList = industryPing
    ? subjectTerms(understood).map((t) => t.toLowerCase())
    : null;
  const entityTerms = industryTermList?.length
    ? industryTermList
    : country
      ? countryEntityTerms(country)
      : politician
        ? [politician.name, politician.lastName].filter(Boolean).map((t) => t.toLowerCase())
        : resolved
          ? [resolved.name, resolved.ticker].filter(Boolean).map((t) => t.toLowerCase())
          : ipoSubj
            ? /* An IPO ping for a company nothing resolved: only snippets
                 that name it, never unrelated ones for the brief to fill. */
              [ipoSubj.toLowerCase()]
            : null;
  /* Oct 27: whole words, not substrings ("india" must not match Indiana),
     and for a country, US domestic names that carry a demonym are removed
     first: an India ping was citing federal awards to "The Friendship House
     Association of American Indians" and American Indian health centers. */
  const termRes = (entityTerms || []).map(
    (t) =>
      new RegExp(
        `(^|[^\\p{L}\\p{N}])${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=[^\\p{L}\\p{N}]|$)`,
        'u',
      ),
  );
  const US_DOMESTIC =
    /\b(?:american indians?|native americans?|alaska natives?|indian (?:health|affairs|tribes?|tribal|education|country|reservations?|nations?)|bureau of indian|tribal)\b/g;
  /* A country ping with no company/politician resolution: contracts that
     matched only because a recipient name contains the country word (e.g.
     "UNITED STATES VETERANS INITIATIVE") are noise, not a real country link. */
  const countryIntent = Boolean(country) && !resolved && !politician && !industryPing;
  const items = entityTerms
    ? retrieved.filter((it) => {
        /* US Sanctions rows are selected by a foreign sanctioned jurisdiction,
           so they will not carry the (US) country term; keep them as relevant
           by construction. The retriever only runs when the ping warrants it. */
        if (it.corpus === 'sanctions') return true;
        let hay = [it.title, it.snippet, ...Object.values(it.meta || {})]
          .filter((v) => typeof v === 'string')
          .join(' ')
          .toLowerCase();
        if (country) hay = hay.replace(US_DOMESTIC, ' ');
        if (!termRes.some((re) => re.test(hay))) return false;
        if (countryIntent && it.corpus === 'contracts') {
          return passesCountryIntentGuard(
            { intent: 'country' },
            { nameField: it.meta?.recipient || it.title, hasStructuredCountryMatch: false },
          );
        }
        return true;
      })
    : retrieved;

  /* A sanctions ping reads the OFAC aggregates as dataset evidence too. */
  const sanctions =
    intent === 'sanctions'
      ? await within(sanctionsContext(), LEG_MS.sanctions, null, 'sanctions').catch(() => null)
      : null;
  if (sanctions) items.push(...sanctions.evidence);

  /* An IPO ping reads the IPO filings source (price, shares, proceeds,
     valuation, exchange, first trade) for the resolved symbol, at the top of
     the evidence so the brief leads with it. */
  let ipoFindings = [];
  if (ipoIntent && resolved?.ticker) {
    ipoFindings = await leg(
      'ipo',
      () =>
        within(
          ipoEvents.search(
            { intents: eventIntents, tickers: [resolved.ticker] },
            { timeoutMs: 4_000 },
          ),
          ipoEvents.timeoutMs,
          [],
          'ipo',
        ),
      (v) => `findings=${v.length}`,
    ).catch(() => []);
    items.unshift(
      ...ipoFindings.map((f) => ({
        corpus: 'ipo',
        title: f.title,
        snippet: f.summary,
        url: f.citation?.href || null,
        date: f.date || null,
        score: f.relevance,
        meta: { symbol: f.meta?.symbol || resolved.ticker, citation: f.citation?.label || null },
      })),
    );
  }

  /* A company ping cites its own dataset matches. Before this the brief saw
     only the retrievers, so when the contracts scan missed its window the
     brief said "Ezana's datasets do not cover this" directly above cards
     showing Congress trades, 13F holders and lobbying for the same company.
     The matches are what the cards render, so the brief cannot cite a figure
     the page does not show. Bounded: a slow matches leg leaves the retrieved
     items as the only evidence, as before. */
  if (resolved && !country && !politician && !industryPing && dossierP) {
    const early = await within(
      dossierP,
      Math.min(LEG_MS.companyDossier, left() - 25_000),
      null,
      'company-dossier',
    ).catch(() => null);
    if (early?.matches) items.push(...companyEvidence(early.matches, resolved));
  }

  if (ipoIntent && resolved?.ticker && !corporaSearched.includes('ipo')) {
    corporaSearched.push('ipo');
  }

  /* Recomputed from the survivors: a corpus that only contributed off-entity
     noise must not be shown as a match. */
  const corporaUsed = [...new Set(items.map((i) => i.corpus))];

  let rankFactLines = [];
  if (country) {
    const countryDossier = await within(
      dossierP,
      LEG_MS.countryDossier,
      null,
      'country-dossier',
    ).catch(() => null);
    if (countryDossier) items.push(...countryEvidence(countryDossier));
    /* A country_rank ping: the macro rankings (one snapshot row), the
       country basket's 13F and Congress matches, and the rank facts the
       brief may cite. */
    if (rankPing && countryDossier) {
      const rank = await leg(
        'macro-rank',
        () =>
          within(
            buildRankBlock(country, countryDossier, admin),
            LEG_MS.macroRank,
            null,
            'macro-rank',
          ),
        (v) => (v ? `metrics=${Object.keys(v.view?.metrics || {}).length}` : 'none'),
      ).catch(() => null);
      if (rank) {
        countryDossier.rank = rank;
        countryDossier.matches.congress = rank.congress;
        countryDossier.matches.thirteenF = rank.thirteenF;
        rankFactLines = rankFacts(rank.view, countryDossier.empire);
        items.push(
          ...rankFactLines.map((line, i) => ({
            corpus: 'macro',
            title: `World Bank rank fact ${i + 1}`,
            snippet: line,
            meta: { source: WB_ATTRIBUTION },
          })),
        );
      }
    }
  }
  /* The registry's structure is the industry brief's spine. */
  if (industry) {
    const industryDossier = await within(
      dossierP,
      LEG_MS.countryDossier,
      null,
      'industry-dossier',
    ).catch(() => null);
    if (industryDossier) items.push(...industryEvidence(industryDossier));
  }
  const columnsP = wantDossier
    ? (async () => {
        const dossierNow = await dossierP;
        const specs = await columnSpecs({
          query: display,
          country,
          politician,
          resolved,
          dossier: dossierNow,
          intent,
          admin,
          industry: industry
            ? {
                label: industry.industry.label,
                basket: industryBasket(industry),
                geo: countryEnt?.label || null,
              }
            : null,
        });
        const cols = await leg(
          'news-columns',
          () =>
            buildNewsColumns({
              subject: industryPing
                ? display
                : country
                  ? country.name
                  : politician
                    ? politician.name
                    : resolved
                      ? resolved.name
                      : display,
              specs,
            }),
          (c) => c.map((x) => `${x.id}=${x.items.length}`).join(' '),
        );
        /* Term-gated for any ping that is not one named entity: a column
           item must mention the subject in its title or lead. Never padded. */
        const gated = !country && !politician && !resolved && subjectTerms(understood).length;
        return gated ? cols.map((c) => ({ ...c, items: gateNews(c.items, understood) })) : cols;
      })().catch(() => null)
    : null;

  let answer = null;
  let grounded = false;
  let providerErrors = [];
  let webUsed = false;
  let webSources = [];

  /* The grounding guard (groundingGuard.js): a negative claim no source or web
     result supports is regenerated once through the same synthesis call when
     there is time, and removed otherwise. */
  const guardBrief = async (draft, args, synth, sourceTexts) => {
    if (!draft) return draft;
    const findings = [...sourceTexts, ...(synth?.webCitedText || [])];
    const canRetry = left() - TAIL_MS > 14_000;
    const res = await enforceGrounding(
      draft,
      findings,
      canRetry
        ? async (extra) => {
            const again = await synthesizeWithFallback({
              ...args,
              system: `${args.system}\n${extra}`,
              deadlineAt: deadline - TAIL_MS,
            });
            return again?.answer || null;
          }
        : null,
    );
    if (res.flagged.length) {
      console.warn('[sonar-pipeline] grounding guard', {
        flagged: res.flagged.length,
        regenerated: res.regenerated,
        removed: res.removed.length,
      });
    }
    return res.text;
  };
  const webUses = recentEvent ? RECENT_WEB_USES : BRIEF_WEB_USES;

  if (items.length) {
    const marked = items.map((it, i) => ({ ...it, marker: `S${i + 1}` }));
    const sourcesBlock = marked
      .map(
        (it) =>
          `[${it.marker}] (${it.corpus}) ${String(it.text || it.snippet || '').slice(0, 500)}`,
      )
      .join('\n');
    const groundedArgs = {
      system:
        GROUNDED_SYSTEM_PROMPT +
        (sanctions ? SANCTIONS_ADDENDUM : '') +
        (country ? COUNTRY_ADDENDUM : '') +
        (ipoIntent ? IPO_ADDENDUM : '') +
        DATE_RULES +
        GROUNDING_RULES +
        (webSearchOn() ? '' : NO_WEB_RULES),
      user: `Today is ${todayLine()}.\nPing: ${display}${resolvedNote}\n\nSources:\n${sourcesBlock}`,
      /* Room for four paragraphs of dataset and web findings; the brief
         panel scrolls inside the locked viewport. */
      maxTokens: sanctions ? BRIEF_TOKENS + 400 : BRIEF_TOKENS,
      model: BRIEF_MODEL,
      fallbackModel: HAIKU_MODEL,
      /* Inert until SONAR_WEB_SEARCH=true is set: anthropicSynthesize
         gates the tool on that env var as well as this flag. */
      webSearch: { enabled: true, maxUses: webUses },
      deadlineAt: deadline - TAIL_MS,
    };
    const synth = await leg(
      'synthesize',
      () => synthesizeWithFallback(groundedArgs),
      (v) => (v.answer ? `answered${v.webUsed ? ' +web' : ''}` : v.degraded || 'no answer'),
      (v) => Boolean(v.answer),
    );
    answer = await guardBrief(
      synth.answer || null,
      groundedArgs,
      synth,
      marked.map((it) => `${it.title || ''}. ${String(it.text || it.snippet || '')}`),
    );
    /* country_rank: every number must come from the rank facts and the
       other sources; a brief with an invented figure is replaced by the
       deterministic brief built from the same facts. */
    if (answer && rankPing && rankFactLines.length) {
      const allowed = [
        ...rankFactLines,
        ...marked.map((it) => String(it.text || it.snippet || '')),
      ];
      const bad = unsupportedNumbers(answer, allowed);
      if (bad.length) {
        console.error('[sonar-pipeline] rank brief had unsupported numbers', bad.slice(0, 5));
        const dossierNow = await within(
          dossierP,
          Math.max(0, left() - TAIL_MS),
          null,
          'dossier',
        ).catch(() => null);
        answer = deterministicBrief(dossierNow?.rank?.view, dossierNow?.empire) || answer;
      }
    }
    grounded = Boolean(answer);
    webUsed = Boolean(synth.webUsed);
    webSources = (synth.webSources || []).slice(0, 6);
    providerErrors = synth.providerErrors || [];
  }

  /* The general brief only starts when there is time to finish it; a
     provider hop under ~4s cannot. Running out here returns no answer, which
     the route turns into a fast 502 that does not spend the visitor's ping. */
  if (!answer && left() - TAIL_MS > 8_000) {
    const generalArgs = {
      system:
        GENERAL_SYSTEM_PROMPT + DATE_RULES + GROUNDING_RULES + (webSearchOn() ? '' : NO_WEB_RULES),
      user: `Today is ${todayLine()}.\nPing: ${display}${resolvedNote}`,
      maxTokens: BRIEF_TOKENS,
      model: BRIEF_MODEL,
      fallbackModel: HAIKU_MODEL,
      webSearch: { enabled: true, maxUses: webUses },
      deadlineAt: deadline - TAIL_MS,
    };
    const synth = await leg(
      'synthesize-general',
      () => synthesizeWithFallback(generalArgs),
      (v) => (v.answer ? `answered${v.webUsed ? ' +web' : ''}` : v.degraded || 'no answer'),
      (v) => Boolean(v.answer),
    );
    answer = await guardBrief(synth.answer || null, generalArgs, synth, []);
    grounded = false;
    webUsed = Boolean(synth.webUsed);
    webSources = (synth.webSources || []).slice(0, 6);
    providerErrors = [...providerErrors, ...(synth.providerErrors || [])];
  }

  const usedCorpora = new Set(corporaUsed);
  const sources = corporaSearched
    .map((corpus) => {
      const id = CORPUS_TO_DATASET[corpus];
      const meta = SONAR_DATASETS[id];
      return meta ? { id, label: meta.label, used: usedCorpora.has(corpus) } : null;
    })
    .filter(Boolean);

  /* The brief is the answer; the dossier and the news columns are extras.
     Whatever has not landed by the tail is left off rather than holding the
     response past the function cap. */
  const tailMs = Math.max(0, left() - 1_500);
  const dossier =
    wantDossier && dossierP
      ? await within(dossierP, tailMs, null, 'dossier-tail').catch(() => null)
      : null;
  const newsColumns = columnsP
    ? await within(columnsP, Math.max(0, left() - 1_500), null, 'news-tail').catch(() => null)
    : null;
  if (dossier) dossier.newsColumns = newsColumns;

  /* A sanctions brief carries its exposure table as a JSON block. */
  let exposed = [];
  if (answer && sanctions) {
    ({ answer, exposed } = splitExposed(answer));
  }

  /* One line, and it names the leg. A run with no answer logs at error level
     so it surfaces in the runtime error groups without a text search. */
  /* retrieved vs kept is the line that shows the entity filter working: a
     ping whose retrieval was all off-entity reads "retrieved 6, kept 0" and
     routes to the web-backed path instead of citing noise. */
  const summary = JSON.stringify(trace).replace(
    '"leg":"retrieve"',
    `"leg":"retrieve","kept":${items.length}`,
  );
  if (answer) {
    console.log('[sonar-pipeline] trace', summary);
  } else {
    console.error('[sonar-pipeline] trace', summary);
  }

  return {
    answer,
    grounded,
    sources,
    relevance: grounded ? relevanceFrom(items, corporaSearched) : flatRelevance(FLOOR_UNGROUNDED),
    webUsed,
    webSources,
    dossier,
    newsColumns,
    intent,
    sanctions: sanctions ? { ...sanctions.panel, exposed } : null,
    classification,
    resolved,
    politician,
    country,
    /* What the UI shows instead of the raw text, plus the corrections and
       ambiguity chips. */
    understood: {
      raw: understood.raw,
      corrected: understood.corrected,
      corrections: understood.corrections,
      display,
      intent: understood.intent,
      metric: understood.metric || null,
      metricExplicit: understood.metricExplicit ?? null,
      entities: understood.entities.map(({ kind, id, label, surface, confidence }) => ({
        kind,
        id,
        label,
        surface,
        confidence,
      })),
      ambiguities: understood.ambiguities,
    },
    industry: industry ? industry.industry.id : null,
    /* Oct 26: what each matched dataset actually contributed, for the
       Sourced matches rows that have no dossier preview (an open question's
       contracts or Echo hits). Same items the brief cites; trimmed. */
    /* Ranked for the ping BEFORE the cut (rankSourcedMatches): a ping about a
       sanctioned jurisdiction leads with US Sanctions, and a late-retrieved
       sanctions row is never sliced off the list. UI order only; the brief
       already read `items`. */
    evidence: rankSourcedMatches(
      items
        .filter((it) => CORPUS_TO_DATASET[it.corpus])
        .map((it) => ({
          ...it,
          dataset: CORPUS_TO_DATASET[it.corpus],
          relevance: it.score ?? it.similarity ?? 0.5,
        })),
      resolveQuery(query),
    )
      .slice(0, 12)
      .map((it) => ({
        dataset: it.dataset,
        title: String(it.title || '').slice(0, 160),
        snippet: String(it.snippet || it.text || '').slice(0, 220),
        url: typeof it.url === 'string' ? it.url : null,
        date: it.date || null,
      })),
    itemCount: items.length,
    retrievedCount: retrieved.length,
    corporaSearched,
    corporaUsed,
    providerErrors,
    /* Leg names only, never messages: safe to return to a client. */
    failedAt: trace.filter((t) => !t.ok).map((t) => t.leg),
  };
}

/** Salted hash, so the ledger can rate-account an IP without storing one. */
export function hashIp(ip, salt) {
  return crypto.createHash('sha256').update(`snr:${ip}:${salt}`).digest('hex');
}
