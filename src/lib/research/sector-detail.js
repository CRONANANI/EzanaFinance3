/**
 * Sector modal data (Company Research, Sector Performance). Server only.
 *
 * Oct 30 root cause: the screener returned the sector's stocks (141 for
 * Utilities) but the bulk quote endpoint answers 402 on this data plan, so
 * every row was dropped and Top Performers rendered empty. News filtered two
 * general feeds by sector keywords in headlines, which for most sectors
 * matched nothing ("No recent news matching Utilities").
 *
 * Now:
 *   - Universe: the screener (US, actively trading, no ETFs or funds, over
 *     $2B), largest first.
 *   - 1D: the bulk quote when the plan serves it, else one quote per symbol
 *     (the endpoint the rest of the app already uses) for the largest
 *     PER_SYMBOL_CAP names, 8 in flight.
 *   - Other periods: the price-change endpoint (comma list if the plan takes
 *     it, else per symbol, 8 in flight), else daily closes as before.
 *   - Top 10 by return, nulls skipped.
 *   - News: the news provider's industry filter for the sector; if that
 *     returns fewer than NEWS_TARGET, a second call by the sector's largest
 *     tickers, merged and deduped. No headline keyword filter.
 *   - Each panel settles on its own: one failing upstream never blanks the
 *     other.
 */
import { fetchWithTimeout } from '@/lib/http/fetch-json';
import { fetchMarketNews } from '@/lib/marketaux/client';
import { mapSector, PERIOD_FIELD } from '@/lib/research/sectorMap';

const FMP_BASE = 'https://financialmodelingprep.com/stable';
export const TOP_N = 10;
export const PER_SYMBOL_CAP = 40;
export const NEWS_TARGET = 8;
const POOL = 8;

function fmpKey() {
  return process.env.FMP_API_KEY || '';
}

/* Endpoints the plan refused (402/403), remembered per warm instance for an
   hour so every click does not pay for the same refusal. */
const refused = new Map();
const REFUSAL_TTL_MS = 60 * 60 * 1000;
function isRefused(path) {
  const at = refused.get(path);
  return Boolean(at && Date.now() - at < REFUSAL_TTL_MS);
}
/** Test hook. */
export function resetRefusals() {
  refused.clear();
}

/** GET a /stable path. Returns { status, data }; never throws. */
async function fmp(path, params, { revalidate = 60, ms = 8000 } = {}) {
  const key = fmpKey();
  if (!key) return { status: 'nokey', data: null };
  const qs = new URLSearchParams({ ...params, apikey: key });
  try {
    const res = await fetchWithTimeout(`${FMP_BASE}${path}?${qs}`, { next: { revalidate } }, ms);
    if (res.status === 402 || res.status === 403) refused.set(path, Date.now());
    if (!res.ok) return { status: res.status, data: null };
    return { status: res.status, data: await res.json() };
  } catch (e) {
    return { status: e?.name === 'TimeoutError' ? 'timeout' : 'neterr', data: null };
  }
}

/** Run `fn` over `items`, at most `limit` in flight; a throw yields null. */
export async function mapLimit(items, limit, fn) {
  const out = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const idx = next++;
      out[idx] = await Promise.resolve()
        .then(() => fn(items[idx]))
        .catch(() => null);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}

const finite = (v) => {
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

/** The sector's investable universe, largest first. */
export async function sectorUniverse(fmpSector, log = () => {}) {
  const { status, data } = await fmp(
    '/company-screener',
    {
      sector: fmpSector,
      country: 'US',
      isActivelyTrading: 'true',
      isEtf: 'false',
      isFund: 'false',
      marketCapMoreThan: '2000000000',
      limit: '100',
    },
    { revalidate: 3600 },
  );
  const rows = Array.isArray(data) ? data : [];
  log(`screener ${status} rows=${rows.length}`);
  if (!rows.length) throw new Error(`screener ${status}`);
  /* One listing per company: the screener also returns a company's notes
     and preferreds under its name (SO, SOMN, SOJE are all The Southern
     Company). The shortest symbol is the common stock. */
  const byCompany = new Map();
  for (const r of rows) {
    if (!r?.symbol) continue;
    const row = {
      symbol: String(r.symbol),
      name: r.companyName || r.name || String(r.symbol),
      price: finite(r.price),
      marketCap: finite(r.marketCap),
    };
    const key = row.name.toLowerCase();
    const prev = byCompany.get(key);
    if (!prev || row.symbol.length < prev.symbol.length) byCompany.set(key, row);
  }
  return [...byCompany.values()].sort((a, b) => (b.marketCap ?? 0) - (a.marketCap ?? 0));
}

/* /stable names it changePercentage; v3 called it changesPercentage. */
const quotePct = (q) => finite(q?.changePercentage ?? q?.changesPercentage);

async function oneDayQuotes(universe, revalidate, log) {
  const symbols = universe.map((u) => u.symbol);
  if (!isRefused('/batch-quote')) {
    const rows = [];
    let lastStatus = null;
    for (let i = 0; i < symbols.length; i += 50) {
      // eslint-disable-next-line no-await-in-loop
      const { status, data } = await fmp(
        '/batch-quote',
        { symbols: symbols.slice(i, i + 50).join(',') },
        { revalidate },
      );
      lastStatus = status;
      if (Array.isArray(data)) rows.push(...data);
      if (isRefused('/batch-quote')) break;
    }
    log(`batch-quote ${lastStatus} rows=${rows.length}`);
    if (rows.length) return rows;
  }
  const capped = symbols.slice(0, PER_SYMBOL_CAP);
  const rows = await mapLimit(capped, POOL, async (symbol) => {
    const { data } = await fmp('/quote', { symbol }, { revalidate, ms: 6000 });
    return Array.isArray(data) ? data[0] : data;
  });
  const ok = rows.filter(Boolean);
  log(`quote per-symbol rows=${ok.length}/${capped.length}`);
  /* Nothing priced at all is an upstream failure, not an empty sector. */
  if (!ok.length) throw new Error('quotes unavailable');
  return ok;
}

async function priceChanges(universe, revalidate, log) {
  const symbols = universe.slice(0, PER_SYMBOL_CAP).map((u) => u.symbol);
  if (isRefused('/stock-price-change')) return [];
  /* A comma list costs one call when the plan accepts it. */
  const listed = await fmp('/stock-price-change', { symbol: symbols.join(',') }, { revalidate });
  const listRows = Array.isArray(listed.data) ? listed.data : [];
  log(`stock-price-change list ${listed.status} rows=${listRows.length}`);
  if (listRows.length > 1) return listRows;
  if (isRefused('/stock-price-change')) return [];
  const rows = await mapLimit(symbols, POOL, async (symbol) => {
    const { data } = await fmp('/stock-price-change', { symbol }, { revalidate, ms: 6000 });
    return Array.isArray(data) ? data[0] : data;
  });
  const ok = rows.filter(Boolean);
  log(`stock-price-change per-symbol rows=${ok.length}/${symbols.length}`);
  return ok;
}

/* Trading days back for the daily-close fallback. */
function tradingDaysFor(period) {
  switch (period) {
    case '1W':
    case '5D':
      return 5;
    case '1M':
      return 21;
    case '3M':
      return 63;
    case '6M':
      return 126;
    case '1Y':
      return 252;
    case 'YTD': {
      const now = new Date();
      const jan1 = new Date(now.getFullYear(), 0, 1);
      return Math.max(5, Math.floor((((now - jan1) / 86_400_000) * 252) / 365));
    }
    default:
      return 0;
  }
}

async function closesChange(universe, period, revalidate, log) {
  const days = tradingDaysFor(period);
  if (!days || isRefused('/historical-price-eod/light')) return [];
  const rows = await mapLimit(universe.slice(0, 30), 6, async (u) => {
    const { data } = await fmp(
      '/historical-price-eod/light',
      { symbol: u.symbol },
      { revalidate, ms: 6000 },
    );
    const series = (Array.isArray(data) ? data : data?.historical || [])
      .filter((r) => r?.date)
      .sort((a, b) => String(b.date).localeCompare(String(a.date)));
    if (series.length < days + 1) return null;
    const last = finite(series[0].adjClose ?? series[0].close ?? series[0].price);
    const then = finite(series[days].adjClose ?? series[days].close ?? series[days].price);
    if (!last || !then) return null;
    return { symbol: u.symbol, price: last, returnPct: ((last - then) / then) * 100 };
  });
  const ok = rows.filter(Boolean);
  log(`daily closes rows=${ok.length}`);
  return ok;
}

/**
 * Top performers for the period, plus the period actually used (a thin
 * multi-day answer falls back to 1D and says so).
 */
export async function topPerformers(universe, period, { revalidate = 60, log = () => {} } = {}) {
  const meta = new Map(universe.map((u) => [u.symbol, u]));
  const rank = (rows) =>
    rows
      .filter((r) => r && Number.isFinite(r.returnPct))
      .sort((a, b) => b.returnPct - a.returnPct)
      .slice(0, TOP_N);

  const fromQuotes = (quotes) =>
    quotes.map((q) => {
      const u = meta.get(q.symbol) || {};
      return {
        symbol: q.symbol,
        name: q.name || u.name || q.symbol,
        price: finite(q.price) ?? u.price ?? null,
        returnPct: quotePct(q),
        marketCap: finite(q.marketCap) ?? u.marketCap ?? null,
      };
    });

  if (period !== '1D') {
    const field = PERIOD_FIELD[period] || '1D';
    let rows = (await priceChanges(universe, revalidate, log)).map((c) => {
      const u = meta.get(c.symbol) || {};
      return {
        symbol: c.symbol,
        name: u.name || c.symbol,
        price: u.price ?? null,
        returnPct: finite(c[field]),
        marketCap: u.marketCap ?? null,
      };
    });
    if (rank(rows).length < 5) {
      rows = (await closesChange(universe, period, revalidate, log)).map((c) => {
        const u = meta.get(c.symbol) || {};
        return { ...c, name: u.name || c.symbol, marketCap: u.marketCap ?? null };
      });
    }
    const ranked = rank(rows);
    if (ranked.length >= 5) return { rows: ranked, period, all: rows };
    log(`${period} thin (${ranked.length}), falling back to 1D`);
  }
  const rows = fromQuotes(await oneDayQuotes(universe, revalidate, log));
  return { rows: rank(rows), period: '1D', all: rows };
}

function isoDaysAgo(days) {
  return new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 16);
}

function normalizeArticle(a) {
  const publishedAt = a.published_at || null;
  const ms = publishedAt ? new Date(publishedAt).getTime() : NaN;
  return {
    id: a.uuid || a.url,
    title: a.title || '',
    summary: a.description || a.snippet || '',
    source: a.source || '',
    url: a.url || null,
    publishedAt,
    time: Number.isFinite(ms) ? Math.floor(ms / 1000) : null,
    image: a.image_url || null,
    tickers: (Array.isArray(a.entities) ? a.entities : [])
      .map((e) => e?.symbol)
      .filter(Boolean)
      .slice(0, 4),
  };
}

/** Last 7 days of company news per symbol, in the news-provider shape;
    null when every call failed. */
async function companyHeadlines(symbols, log) {
  const token = process.env.FINNHUB_API_KEY || '';
  const to = new Date().toISOString().slice(0, 10);
  const from = new Date(Date.now() - 7 * 86_400_000).toISOString().slice(0, 10);
  let ok = 0;
  const lists = await mapLimit(symbols, 3, async (symbol) => {
    const qs = new URLSearchParams({ symbol, from, to, token });
    const res = await fetchWithTimeout(
      `https://finnhub.io/api/v1/company-news?${qs}`,
      { next: { revalidate: 600 } },
      6000,
    );
    if (!res.ok) return [];
    ok += 1;
    const rows = await res.json();
    return (Array.isArray(rows) ? rows : []).slice(0, 6).map((n) => ({
      uuid: n.id != null ? `c${n.id}` : n.url,
      title: n.headline,
      description: n.summary,
      source: n.source,
      url: n.url,
      published_at: n.datetime ? new Date(Number(n.datetime) * 1000).toISOString() : null,
      image_url: n.image || null,
      entities: [{ symbol: n.related || symbol }],
    }));
  });
  const flat = lists.flat().filter(Boolean);
  log(`company headlines ${symbols.join(',')} ok=${ok} n=${flat.length}`);
  return ok ? flat : null;
}

/**
 * Latest sector news: the industry filter first; under NEWS_TARGET, the
 * sector's largest tickers, merged and deduped by uuid/url. Throws only when
 * every call failed, so the route can tell "failed" from "genuinely none".
 */
export async function sectorNews(
  newsIndustry,
  fallbackSymbols,
  { revalidate = 600, log = () => {} } = {},
) {
  const base = { countries: 'us', limit: 10, publishedAfter: isoDaysAgo(14), revalidate };
  const first = await fetchMarketNews({ ...base, industries: newsIndustry });
  log(
    `news industries=${newsIndustry} ${first.status ?? ''} ${first.error || ''} n=${first.articles.length}`,
  );
  let articles = first.articles;
  let failures = first.error ? 1 : 0;
  let calls = 1;

  const syms = (fallbackSymbols || []).filter(Boolean).slice(0, 5);
  if (articles.length < NEWS_TARGET && syms.length) {
    const more = await fetchMarketNews({ ...base, symbols: syms });
    calls += 1;
    if (more.error) failures += 1;
    log(
      `news symbols=${syms.join(',')} ${more.status ?? ''} ${more.error || ''} n=${more.articles.length}`,
    );
    const seen = new Set(articles.map((a) => a.uuid || a.url));
    articles = [...articles, ...more.articles.filter((a) => !seen.has(a.uuid || a.url))];
  }
  /* Company headlines for the sector's largest names from the second
     news source when the first is unconfigured or thin. Per company, so no
     keyword filter is needed. */
  if (articles.length < NEWS_TARGET && syms.length && process.env.FINNHUB_API_KEY) {
    const extra = await companyHeadlines(syms.slice(0, 3), log);
    calls += 1;
    if (extra === null) failures += 1;
    const seen = new Set(articles.map((a) => a.uuid || a.url));
    articles = [...articles, ...(extra || []).filter((a) => !seen.has(a.uuid || a.url))];
  }
  if (!articles.length && failures === calls) {
    throw new Error(`news unavailable (${first.error || 'error'})`);
  }
  return articles
    .filter((a) => a?.url && a?.title)
    .sort((a, b) => new Date(b.published_at || 0) - new Date(a.published_at || 0))
    .slice(0, 10)
    .map(normalizeArticle);
}

/**
 * Everything the modal needs. Never throws for an upstream failure: each
 * panel carries its own error flag.
 * @param {string} label  any UI sector label
 * @param {string} period 1D, 1W, 1M, 3M, 6M, YTD, 1Y
 */
export async function getSectorDetail(label, period = '1D', { log = () => {} } = {}) {
  const mapped = mapSector(label);
  if (!mapped) return null;
  const p = PERIOD_FIELD[String(period || '1D').toUpperCase()]
    ? String(period).toUpperCase()
    : '1D';
  const revalidate = p === '1D' ? 60 : 900;

  const universeP = sectorUniverse(mapped.fmp, log);
  const [perfRes, newsRes] = await Promise.allSettled([
    universeP.then((u) => topPerformers(u, p, { revalidate, log })),
    /* News does not wait on the performers: its fallback tickers are the
       sector's largest names, and if the screener failed it still runs on
       the industry filter alone. */
    universeP
      .catch(() => [])
      .then((u) =>
        sectorNews(
          mapped.news,
          u.slice(0, 5).map((x) => x.symbol),
          { revalidate: 600, log },
        ),
      ),
  ]);

  const perf = perfRes.status === 'fulfilled' ? perfRes.value : null;
  const rows = perf?.rows || [];
  const returns = (perf?.all || []).map((r) => r.returnPct).filter(Number.isFinite);
  return {
    sector: mapped.label,
    canonicalSector: mapped.fmp,
    period: p,
    performanceRange: perf?.period || p,
    /* Equal-weight mean across the names priced, not the index average the
       heatmap shows; null when nothing was priced. */
    avgReturn: returns.length ? returns.reduce((s, v) => s + v, 0) / returns.length : null,
    topPerformers: rows.map((r) => ({ ...r, changePct: r.returnPct })),
    news: newsRes.status === 'fulfilled' ? newsRes.value : [],
    errors: {
      performers: perfRes.status === 'rejected',
      news: newsRes.status === 'rejected',
    },
    revalidate,
  };
}
