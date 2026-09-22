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
const HAIKU_MODEL = 'claude-haiku-4-5-20251001';

export const DISCLAIMER =
  'Sonar synthesizes sourced research from Ezana datasets. Findings only, never financial advice.';

const GROUNDED_SYSTEM_PROMPT = `You are Ezana Sonar, a research surface answering a ping on the public landing page. You have two kinds of evidence: numbered dataset snippets from Ezana's proprietary datasets (congressional trades, government contracts, SEC filings, prediction markets, Echo editorial), and live web search.
Rules:
- Answer the question the visitor actually asked, about the entity they asked about. Lead with what is true and current, using web search for facts the snippets do not cover.
- Wherever a dataset snippet covers the subject, weave it in and cite its marker inline, e.g. [S1]. Dataset corroboration is the product being demonstrated; use every snippet that is genuinely about the subject, and none that is not.
- If the datasets have little or nothing on the subject, say so in ONE clause at most, inside a sentence that still delivers substance from the web. Never make dataset absence the headline or the topic of a paragraph.
- Never present another company's data as context filler. If a snippet is about a different entity, ignore it.
- Findings only. No financial or investment advice, price targets, or buy/sell/hold language. No fabricated figures: numbers come from a snippet or from a web result.
- EXACTLY three short paragraphs separated by blank lines: (1) direct answer to the ping, (2) the strongest specifics, dataset-cited where possible, (3) cross-signals or what to watch. No headers, no lists, no em dashes.`;

/* The ungrounded variant. A ping that retrieves nothing used to dead-end on an
   apology; this answers from general knowledge instead and says so, which is
   the only honest way to do it. No citation markers, because there are no
   sources to cite and inventing [S1] would be a lie the UI cannot detect. */
/* The no-snippet path. It used to apologise, because it had nothing but its
   own training data to work from. With search available it can answer
   properly, so it now leads with substance and keeps the honest framing to a
   single clause. The no-fabrication rules are unchanged: with the tool off it
   still has to say the answer is general background. */
const GENERAL_SYSTEM_PROMPT = `You are Ezana Sonar, a research surface answering a ping on the public landing page. Ezana's proprietary datasets returned no match for this subject, so your evidence is live web search and general knowledge.
Rules:
- Answer the question the visitor actually asked, leading with what is true and current from web search. Give real substance.
- Note in ONE clause, not a sentence of its own, that Ezana's datasets do not cover this subject yet. Never make that the headline or the topic of a paragraph.
- Never invent dataset citations. Do not use [S1] style markers at all: there are no snippets to cite. If web search did not run, say plainly that this is general background rather than sourced research.
- No fabricated figures, dates or names. A number either comes from a web result or does not appear.
- Findings only. No financial or investment advice, price targets, or buy/sell/hold language.
- EXACTLY three short paragraphs separated by blank lines: (1) direct answer to the ping, (2) the strongest specifics, (3) what to watch, or a better ping for sourced results. No headers, no lists, no em dashes.`;

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
const resolveCache = new Map();

function looksLikeTicker(query) {
  return /\$[A-Za-z]{1,5}\b/.test(query) || /\b[A-Z]{2,5}\b/.test(query);
}

async function fetchJson(url, ms = 4000) {
  const res = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(ms) });
  if (!res.ok) return null;
  return res.json();
}

function tickerToken(query) {
  const dollar = String(query).match(/\$([A-Za-z]{1,5})\b/);
  if (dollar) return dollar[1].toUpperCase();
  const bare = String(query).match(/\b([A-Z]{2,5})\b/);
  return bare ? bare[1] : null;
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
const NAME_LOOKUPS = [
  {
    id: 'fmp/search-name',
    url: (q, k) => `${FMP_STABLE}/search-name?query=${encodeURIComponent(q)}&limit=1&apikey=${k}`,
    pick: (d) => (Array.isArray(d) ? d[0] : null),
    map: (r) =>
      r?.symbol && r?.name
        ? { ticker: String(r.symbol).toUpperCase(), name: String(r.name) }
        : null,
  },
  {
    id: 'fmp/search-symbol',
    url: (q, k) => `${FMP_STABLE}/search-symbol?query=${encodeURIComponent(q)}&limit=1&apikey=${k}`,
    pick: (d) => (Array.isArray(d) ? d[0] : null),
    map: (r) =>
      r?.symbol && r?.name
        ? { ticker: String(r.symbol).toUpperCase(), name: String(r.name) }
        : null,
  },
];

const TICKER_LOOKUPS = [
  {
    id: 'fmp/profile',
    url: (t, k) => `${FMP_STABLE}/profile?symbol=${encodeURIComponent(t)}&apikey=${k}`,
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
  if (hit && Date.now() - hit.at < RESOLVE_TTL_MS) return hit.value;

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
    const dim = DATASET_DIMENSION[dataset];
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

  const legs = await Promise.allSettled([
    apikey
      ? fetchJson(`${FMP_STABLE}/quote?symbol=${sym}&apikey=${encodeURIComponent(apikey)}`)
      : null,
    apikey
      ? fetchJson(`${FMP_STABLE}/ratios-ttm?symbol=${sym}&apikey=${encodeURIComponent(apikey)}`)
      : null,
    apikey
      ? fetchJson(
          `${FMP_STABLE}/historical-price-eod/light?symbol=${sym}&from=${ytdFrom}&to=${to}&apikey=${encodeURIComponent(apikey)}`,
        )
      : null,
    /* Same upstream and key the city-news route already uses for per-ticker
       headlines, called server-side here rather than through the browser
       proxy that FinnhubAPI targets. */
    finnhubKey
      ? fetchJson(
          `https://finnhub.io/api/v1/company-news?symbol=${sym}&from=${from}&to=${to}&token=${encodeURIComponent(finnhubKey)}`,
        )
      : null,
    admin
      ? admin
          .from('echo_articles')
          .select('article_title, article_slug, published_at')
          .eq('article_status', 'published')
          .gte('published_at', new Date(today.getTime() - 42 * 24 * 60 * 60 * 1000).toISOString())
          .or(
            `article_title.ilike.%${name.replace(/[,()%*]/g, ' ')}%,article_body.ilike.%${name.replace(/[,()%*]/g, ' ')}%`,
          )
          .order('published_at', { ascending: false })
          .limit(3)
      : null,
  ]);

  const val = (i) => (legs[i].status === 'fulfilled' ? legs[i].value : null);
  const quote = Array.isArray(val(0)) ? val(0)[0] : val(0);
  const ratios = Array.isArray(val(1)) ? val(1)[0] : val(1);
  const eod = val(2);
  const news = val(3);
  const echoRes = val(4);

  const rows = Array.isArray(eod) ? eod : Array.isArray(eod?.historical) ? eod.historical : [];
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
          peTtm:
            typeof ratios?.priceToEarningsRatioTTM === 'number'
              ? ratios.priceToEarningsRatioTTM
              : typeof quote.pe === 'number'
                ? quote.pe
                : null,
          evToEbitdaTtm:
            typeof ratios?.enterpriseValueMultipleTTM === 'number'
              ? ratios.enterpriseValueMultipleTTM
              : typeof ratios?.evToEBITDATTM === 'number'
                ? ratios.evToEBITDATTM
                : null,
          fourth: fourthStat(ratios),
        }
      : null;

  return {
    ticker,
    name,
    fundamentals,
    spark: spark.length >= 2 ? spark : null,
    sparkLabel: 'YTD',
    news: (Array.isArray(news) ? news : [])
      .filter((n) => n?.headline && n?.url)
      .slice(0, 2)
      .map((n) => ({
        title: String(n.headline),
        url: String(n.url),
        source: String(n.source || 'News'),
        publishedAt: n.datetime ? new Date(n.datetime * 1000).toISOString() : null,
      })),
    echo: (Array.isArray(echoRes?.data) ? echoRes.data : [])
      .filter((r) => r?.article_title && r?.article_slug)
      .map((r) => ({
        title: String(r.article_title),
        slug: String(r.article_slug),
        publishedAt: r.published_at || null,
      })),
  };
}

/**
 * One ping, end to end. `admin` is the service-role client; the caller owns it
 * so the demo route and the guest route share one connection policy.
 */
export async function runLandingPipeline(query, { admin, wantDossier = true } = {}) {
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

  const resolved = await leg(
    'resolve',
    () => resolveCompany(query),
    (v) => (v ? v.ticker : 'none'),
  );
  /* Retrieval sees the enriched string; the ledger and the UI keep the words
     the visitor actually typed. */
  const retrievalQuery = resolved ? `${resolved.name} (${resolved.ticker})` : query;

  const entitlements = getSonarEntitlements({ planTier: 0, version: 'regular' });
  const classification = classifyQuery(retrievalQuery);
  const allowCorpora = corporaForDatasets(entitlements.datasets);
  const budget = depthBudget('summary');

  const out = await leg(
    'retrieve',
    () =>
      orchestrate(retrievalQuery, {
        admin,
        allowCorpora,
        topK: budget.topK,
        perCorpusCap: budget.perCorpusCap,
        charBudget: budget.charBudget,
      }),
    (v) => `retrieved ${(v.items || []).length}`,
  );
  const retrieved = out.items || [];
  const corporaSearched = out.corporaSearched || [];

  /* Off-entity chunks poison the synthesis: an Apple ping came back citing
     Boeing and Lockheed awards, because semantic retrieval returns what is
     SIMILAR, not what is about the same company. When resolution tells us the
     entity, keep only the items that actually mention it.

     The haystack is title plus snippet plus the structured meta, NOT a `text`
     field: no retriever emits one, so matching on it would leave every
     haystack empty, drop every item, and send every entity ping down the
     ungrounded path. Checked against the retrievers rather than assumed. */
  const entityTerms = resolved
    ? [resolved.name, resolved.ticker].filter(Boolean).map((t) => t.toLowerCase())
    : null;
  const items = entityTerms
    ? retrieved.filter((it) => {
        const hay = [it.title, it.snippet, ...Object.values(it.meta || {})]
          .filter((v) => typeof v === 'string')
          .join(' ')
          .toLowerCase();
        return entityTerms.some((t) => hay.includes(t));
      })
    : retrieved;

  /* Recomputed from the survivors: a corpus that only contributed off-entity
     noise must not be shown as a match. */
  const corporaUsed = [...new Set(items.map((i) => i.corpus))];

  let answer = null;
  let grounded = false;
  let providerErrors = [];
  let webUsed = false;
  let webSources = [];

  if (items.length) {
    const marked = items.map((it, i) => ({ ...it, marker: `S${i + 1}` }));
    const sourcesBlock = marked
      .map(
        (it) =>
          `[${it.marker}] (${it.corpus}) ${String(it.text || it.snippet || '').slice(0, 500)}`,
      )
      .join('\n');
    const synth = await leg(
      'synthesize',
      () =>
        synthesizeWithFallback({
          system: GROUNDED_SYSTEM_PROMPT,
          user: `Ping: ${query}\n\nSources:\n${sourcesBlock}`,
          /* Answers carry web facts as well as snippets now, so they need
             the room. */
          maxTokens: 600,
          model: HAIKU_MODEL,
          fallbackModel: HAIKU_MODEL,
          /* Inert until SONAR_WEB_SEARCH=true is set: anthropicSynthesize
             gates the tool on that env var as well as this flag. */
          webSearch: { enabled: true, maxUses: 2 },
        }),
      (v) => (v.answer ? `answered${v.webUsed ? ' +web' : ''}` : v.degraded || 'no answer'),
      (v) => Boolean(v.answer),
    );
    answer = synth.answer || null;
    grounded = Boolean(answer);
    webUsed = Boolean(synth.webUsed);
    webSources = (synth.webSources || []).slice(0, 4);
    providerErrors = synth.providerErrors || [];
  }

  if (!answer) {
    const synth = await leg(
      'synthesize-general',
      () =>
        synthesizeWithFallback({
          system: GENERAL_SYSTEM_PROMPT,
          user: `Ping: ${query}${resolved ? ` (resolved to ${resolved.name}, ${resolved.ticker})` : ''}`,
          maxTokens: 600,
          model: HAIKU_MODEL,
          fallbackModel: HAIKU_MODEL,
          webSearch: { enabled: true, maxUses: 2 },
        }),
      (v) => (v.answer ? `answered${v.webUsed ? ' +web' : ''}` : v.degraded || 'no answer'),
      (v) => Boolean(v.answer),
    );
    answer = synth.answer || null;
    grounded = false;
    webUsed = Boolean(synth.webUsed);
    webSources = (synth.webSources || []).slice(0, 4);
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

  let dossier = null;
  if (wantDossier && resolved) {
    try {
      dossier = await leg(
        'dossier',
        () => buildDossier(resolved, admin),
        (v) =>
          `fund=${Boolean(v.fundamentals)} spark=${v.spark ? v.spark.length : 0} news=${v.news.length} echo=${v.echo.length}`,
      );
    } catch {
      /* The dossier is an enrichment. Losing it degrades the stage; it must
         not lose an answer that has already been paid for. */
    }
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
    classification,
    resolved,
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
