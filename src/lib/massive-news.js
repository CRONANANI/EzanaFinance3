/**
 * Massive News API client — Polygon-compatible.
 *
 * Endpoint: /v2/reference/news
 * Returns articles with sentiment insights, publisher info, and ticker associations.
 *
 * Free tier: 5 calls/minute. We poll once per minute, rotating through 10 region-keyed
 * queries, so each region refreshes every 10 minutes.
 */

/**
 * Region → ticker proxies. Massive's news endpoint filters by ticker.
 * To get news with regional flavor, we query a representative ETF/ADR per region.
 * Articles often mention multiple tickers; the same article fetched under different
 * regions is deduped by article.id and tagged with its first-fetched region.
 */
export const REGIONS = [
  {
    id: 'US',
    label: 'United States',
    tickers: ['SPY', 'QQQ', 'AAPL', 'MSFT', 'NVDA'],
  },
  {
    id: 'EU',
    label: 'Europe',
    tickers: ['VGK', 'EZU', 'DAX', 'EWG', 'EWQ'],
  },
  {
    id: 'UK',
    label: 'United Kingdom',
    tickers: ['EWU', 'BP', 'HSBC', 'SHEL'],
  },
  {
    id: 'ME',
    label: 'Middle East',
    tickers: ['EIS', 'GULF', 'ARMK', 'ESCR'],
  },
  {
    id: 'CN',
    label: 'China',
    tickers: ['FXI', 'MCHI', 'BABA', 'JD', 'BIDU'],
  },
  {
    id: 'RUUA',
    label: 'Russia & Ukraine',
    tickers: ['RSX', 'ERUS'], // Russia ETFs (delisted post-invasion but news still tagged); supplement with energy/grain proxies
  },
  {
    id: 'IN',
    label: 'India',
    tickers: ['INDA', 'EPI', 'INFY', 'WIT', 'TTM'],
  },
  {
    id: 'JPKR',
    label: 'Japan & Korea',
    tickers: ['EWJ', 'EWY', 'TM', 'SONY', 'SMSN'],
  },
  {
    id: 'LATAM',
    label: 'Latin America',
    tickers: ['ILF', 'EWZ', 'EWW', 'VALE', 'PBR'],
  },
  {
    id: 'OCE',
    label: 'Oceania',
    tickers: ['EWA', 'BHP', 'RIO'],
  },
];

const MASSIVE_BASE = process.env.MASSIVE_API_BASE || 'https://api.polygon.io';

/**
 * Fetch the latest news for a given list of tickers.
 * Aggregates a few tickers into one call (each call costs 1 of 5/min budget).
 *
 * @param {string[]} tickers
 * @param {number} limit  Max articles per call (default 50)
 * @returns {Promise<object[]>}
 */
export async function fetchMassiveNews(tickers, limit = 50) {
  const apiKey = process.env.MASSIVE_API_KEY;
  if (!apiKey) throw new Error('MASSIVE_API_KEY not set');

  /* Polygon's /v2/reference/news takes a single `ticker` param. To cover
     multiple tickers in one call, we use `ticker.gte` and `ticker.lte` for a
     range query — but that returns alphabetic ranges, which isn't what we want.
     Instead, we make ONE call without a ticker filter, get the most recent
     general financial news (which mentions our target tickers if they're
     trending), and post-filter in JS to those tagged with our region's tickers. */
  const url = new URL(`${MASSIVE_BASE}/v2/reference/news`);
  url.searchParams.set('order', 'desc');
  url.searchParams.set('limit', String(Math.min(1000, limit)));
  url.searchParams.set('sort', 'published_utc');
  url.searchParams.set('apiKey', apiKey);

  const res = await fetch(url.toString(), { cache: 'no-store' });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Massive API ${res.status}: ${body.slice(0, 200)}`);
  }

  const data = await res.json();
  const allArticles = Array.isArray(data?.results) ? data.results : [];

  /* Filter to articles whose tickers field intersects with our target set.
     Most articles tag 1-5 tickers; a small overlap is enough. */
  const tickerSet = new Set(tickers.map((t) => t.toUpperCase()));
  const filtered = allArticles.filter((a) => {
    if (!Array.isArray(a.tickers) || a.tickers.length === 0) return false;
    return a.tickers.some((t) => tickerSet.has(String(t).toUpperCase()));
  });

  return filtered;
}

/**
 * Topic classification from keywords + tickers.
 * Falls back to 'Economy' which is the most generic for financial news.
 */
const TOPIC_KEYWORDS = {
  Conflict: ['war', 'attack', 'strike', 'missile', 'troops', 'invasion', 'sanction', 'military'],
  Energy: ['oil', 'gas', 'pipeline', 'opec', 'crude', 'lng', 'energy', 'refinery'],
  Health: ['covid', 'pandemic', 'vaccine', 'who', 'outbreak', 'pharma', 'fda'],
  Tech: ['ai', 'chip', 'semiconductor', 'nvidia', 'cloud', 'cyber', 'data center'],
  Geopolitics: ['election', 'putin', 'xi', 'biden', 'trump', 'tariff', 'trade war', 'g20', 'nato'],
};

export function classifyTopic(article) {
  const haystack = [
    article.title || '',
    article.description || '',
    ...(article.keywords || []),
  ]
    .join(' ')
    .toLowerCase();

  for (const [topic, terms] of Object.entries(TOPIC_KEYWORDS)) {
    if (terms.some((t) => haystack.includes(t))) return topic;
  }
  return 'Economy';
}

/**
 * Severity classification based on publisher prominence + topic.
 * Major wires (Reuters, Bloomberg, AP, FT) → at least Medium.
 * Conflict + critical-tone keywords → up to Critical.
 */
const MAJOR_PUBLISHERS = new Set([
  'reuters', 'bloomberg', 'ap', 'associated press', 'financial times', 'wsj',
  'wall street journal', 'cnbc', 'nyt', 'new york times', 'washington post', 'bbc',
]);

const CRITICAL_KEYWORDS = ['urgent', 'breaking', 'crisis', 'crash', 'plunge', 'attack'];

export function classifySeverity(article, topic) {
  const haystack = `${article.title || ''} ${article.description || ''}`.toLowerCase();
  const publisher = (article.publisher?.name || '').toLowerCase();
  const isMajor = [...MAJOR_PUBLISHERS].some((p) => publisher.includes(p));

  if (CRITICAL_KEYWORDS.some((k) => haystack.includes(k))) return 'Critical';
  if (topic === 'Conflict' && isMajor) return 'High';
  if (topic === 'Conflict') return 'Medium';
  if (isMajor) return 'Medium';
  return 'Low';
}

/**
 * Convert a raw Massive article into our normalized cache row.
 *
 * @param {Record<string, unknown>} a
 * @param {{ id: string, label: string }} region
 */
export function normalizeArticle(a, region) {
  const topic = classifyTopic(a);
  const severity = classifySeverity(a, topic);
  const pub = a.publisher && typeof a.publisher === 'object' ? a.publisher : {};

  return {
    id: String(a.id),
    title: a.title || 'Untitled',
    description: a.description || null,
    article_url: a.article_url,
    image_url: a.image_url || null,
    author: a.author || null,
    publisher_name: pub.name || null,
    publisher_homepage: pub.homepage_url || null,
    publisher_favicon: pub.favicon_url || null,
    tickers: a.tickers || [],
    keywords: a.keywords || [],
    insights: a.insights ?? [],
    published_utc: a.published_utc || new Date().toISOString(),
    region: region.id,
    region_label: region.label,
    topic,
    severity,
  };
}
