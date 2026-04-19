/**
 * Polymarket matcher — server-side.
 *
 * Given an ISR event, finds the best-fitting *active, open* market on Polymarket's
 * public Gamma API and returns enough metadata to render the inline blue badge.
 * Fails softly: any network/parse error just returns null so the UI simply
 * doesn't render a badge (absent > speculative).
 */

const GAMMA_BASE = 'https://gamma-api.polymarket.com';

// Words too generic to help narrow Polymarket market search. We strip these
// before building the search query so the signal-to-noise ratio stays high.
const STOP_WORDS = new Set([
  'the','a','an','and','or','of','to','in','on','for','with','at','by','from','as',
  'is','are','was','were','be','been','being','it','its','this','that','these','those',
  'report','reports','reported','reporting','say','says','said','update','updates',
  'news','live','breaking','latest','amid','over','new','post','posts','see',
]);

function extractSearchTerms(event) {
  const pool = new Set();
  for (const kw of event?.impactedKeywords || []) {
    if (typeof kw === 'string' && kw.trim()) pool.add(kw.trim().toLowerCase());
  }
  const headline = typeof event?.headline === 'string' ? event.headline : '';
  const tokens = headline
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 3 && !STOP_WORDS.has(w));
  tokens.slice(0, 6).forEach((t) => pool.add(t));
  if (event?.country) pool.add(String(event.country).toLowerCase());
  return Array.from(pool).slice(0, 5);
}

function normalizeProbability(market) {
  const candidates = [
    market?.outcomePrices,
    market?.outcomes,
    market?.lastTradePrice,
  ];
  for (const candidate of candidates) {
    if (typeof candidate === 'number' && candidate > 0 && candidate < 1) return candidate;
    if (Array.isArray(candidate) && candidate.length > 0) {
      const first = Number(candidate[0]);
      if (Number.isFinite(first) && first > 0 && first < 1) return first;
    }
    if (typeof candidate === 'string') {
      try {
        const parsed = JSON.parse(candidate);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const first = Number(parsed[0]);
          if (Number.isFinite(first) && first > 0 && first < 1) return first;
        }
      } catch {
        // not JSON — ignore
      }
    }
  }
  return 0.5;
}

function buildMarketUrl(market) {
  const slug = market?.slug || market?.marketSlug || market?.id || market?.conditionId;
  if (!slug) return 'https://polymarket.com/';
  return `https://polymarket.com/event/${slug}`;
}

/**
 * @typedef {Object} PolymarketMatch
 * @property {string} marketId
 * @property {string} marketTitle
 * @property {string} url
 * @property {number} yesProbability  0..1
 * @property {number} volume
 */

/**
 * @param {{ headline?: string, impactedKeywords?: string[], country?: string }} event
 * @returns {Promise<PolymarketMatch|null>}
 */
export async function findMatchingMarket(event) {
  try {
    const terms = extractSearchTerms(event);
    if (terms.length === 0) return null;

    const params = new URLSearchParams({
      closed: 'false',
      active: 'true',
      limit: '5',
      order: 'volume',
      ascending: 'false',
      q: terms.slice(0, 3).join(' '),
    });

    const res = await fetch(`${GAMMA_BASE}/markets?${params.toString()}`, {
      // Cache briefly on the server. Polymarket refresh cycles are fast enough
      // that 60s keeps the UI lively without hammering their API per event.
      next: { revalidate: 60 },
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return null;

    const payload = await res.json();
    const list = Array.isArray(payload) ? payload : payload?.data;
    if (!Array.isArray(list) || list.length === 0) return null;

    // Pick the highest-volume match that also contains at least one search term
    // in the market title — avoids returning unrelated high-volume markets.
    const termLower = terms.map((t) => t.toLowerCase());
    const scored = list
      .map((m) => {
        const title = String(m?.question || m?.title || '').toLowerCase();
        const hits = termLower.reduce((acc, t) => acc + (title.includes(t) ? 1 : 0), 0);
        return { m, hits, vol: Number(m?.volume ?? m?.volumeNum ?? 0) };
      })
      .filter((x) => x.hits > 0)
      .sort((a, b) => b.hits - a.hits || b.vol - a.vol);

    const best = scored[0]?.m;
    if (!best) return null;

    return {
      marketId: String(best.id ?? best.conditionId ?? ''),
      marketTitle: String(best.question ?? best.title ?? 'Market'),
      url: buildMarketUrl(best),
      yesProbability: normalizeProbability(best),
      volume: Number(best.volume ?? best.volumeNum ?? 0),
    };
  } catch (err) {
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.warn('[polymarket-matcher]', err);
    }
    return null;
  }
}
