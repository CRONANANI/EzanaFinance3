/**
 * Sonar adaptive research: news intelligence (Nov 2026).
 *
 * Works on articles the existing news layer already returns (newsEvidence()
 * over news_articles_cache, and the links a web search actually returned). It
 * does not fetch anything. It gives every scenario the same four operations:
 *
 *   canonicalUrl    one address per article (tracking parameters and fragments off)
 *   sourceClass     the evidentiary role of a publisher: official, reported or other
 *   clusterArticles the same story from several outlets becomes one item with corroboration
 *   rankArticles    a deterministic relevance score: entity and event match, source role,
 *                   recency against the question's date; popularity is not an input
 *
 * A wire story syndicated to five sites is one report, not five confirmations:
 * a cluster counts distinct publishers, and says so.
 *
 * Pure. No I/O.
 */

const TRACKING = /^(utm_|fbclid$|gclid$|mc_|ref$|cmpid$|ncid$|src$|guccounter$|guce_)/i;

export function canonicalUrl(url) {
  try {
    const u = new URL(String(url));
    if (!/^https?:$/.test(u.protocol)) return null;
    u.hash = '';
    for (const k of [...u.searchParams.keys()]) if (TRACKING.test(k)) u.searchParams.delete(k);
    u.hostname = u.hostname.toLowerCase().replace(/^www\./, '');
    return u.toString().replace(/\/$/, '');
  } catch {
    return null;
  }
}

export const hostOf = (url) => {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return '';
  }
};

const REGULATOR =
  /(^|\.)(sec\.gov|federalreserve\.gov|treasury\.gov|justice\.gov|ftc\.gov|congress\.gov|europa\.eu|gov\.uk|canada\.ca)$/;
const ISSUER_HINT = /^(investors?|ir|news(room)?|press|nvidianews|corporate)\./;
const ESTABLISHED =
  /(^|\.)(reuters\.com|apnews\.com|bloomberg\.com|wsj\.com|ft\.com|nytimes\.com|cnbc\.com|axios\.com|fortune\.com|economist\.com|barrons\.com|marketwatch\.com|theinformation\.com|washingtonpost\.com|bbc\.com|bbc\.co\.uk|cnn\.com|nbcnews\.com|abcnews\.com|forbes\.com|businessinsider\.com|theverge\.com|techcrunch\.com|aljazeera\.com|politico\.com|semafor\.com)$/;

/**
 * The evidentiary role of a source:
 *   official  a regulator or the issuer's own investor or news site: establishes what was filed
 *             or announced (an issuer statement is still the issuer's claim)
 *   reported  an established news organisation: may carry credible reporting
 *   other     everything else: never the sole basis for a fact
 */
export function sourceClass(url) {
  const host = hostOf(url);
  if (!host) return 'other';
  if (REGULATOR.test(host)) return 'official';
  if (ISSUER_HINT.test(host)) return 'official';
  if (ESTABLISHED.test(host)) return 'reported';
  return 'other';
}

const STOP = new Set(
  'a an the of in on for to and or with at by from as is are was were be its it this that after amid over says say said new'.split(
    ' ',
  ),
);
const titleTokens = (t) =>
  new Set(
    String(t || '')
      .toLowerCase()
      .replace(/[^a-z0-9 ]+/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOP.has(w)),
  );
const overlap = (a, b) => {
  if (!a.size || !b.size) return 0;
  let n = 0;
  for (const t of a) if (b.has(t)) n += 1;
  return n / Math.min(a.size, b.size);
};

/**
 * Normalise, drop duplicates of the same address, and group near-identical headlines
 * published within three days of each other.
 * @param {{ title, url, publisher?, publishedAt? }[]} articles
 * @returns {{ lead, publishers: string[], corroboration: number, items }[]}
 */
export function clusterArticles(articles) {
  const seen = new Set();
  const clean = [];
  for (const a of articles || []) {
    const url = canonicalUrl(a?.url);
    const title = String(a?.title || '').trim();
    if (!url || !title || seen.has(url)) continue;
    seen.add(url);
    clean.push({
      title,
      url,
      publisher: String(a.publisher || hostOf(url)),
      publishedAt: a.publishedAt ? String(a.publishedAt) : null,
      sourceClass: sourceClass(url),
      tokens: titleTokens(title),
    });
  }
  const rank = { official: 0, reported: 1, other: 2 };
  clean.sort(
    (a, b) =>
      rank[a.sourceClass] - rank[b.sourceClass] ||
      String(a.publishedAt || '').localeCompare(String(b.publishedAt || '')),
  );
  const clusters = [];
  for (const a of clean) {
    const home = clusters.find((c) => {
      const days =
        a.publishedAt && c.lead.publishedAt
          ? Math.abs(new Date(a.publishedAt) - new Date(c.lead.publishedAt)) / 86400000
          : 0;
      return days <= 3 && overlap(a.tokens, c.lead.tokens) >= 0.7;
    });
    if (home) home.items.push(a);
    else clusters.push({ lead: a, items: [a] });
  }
  return clusters.map((c) => {
    const publishers = [...new Set(c.items.map((i) => i.publisher))];
    const strip = ({ tokens, ...rest }) => rest;
    return {
      lead: strip(c.lead),
      publishers,
      corroboration: publishers.length,
      items: c.items.map(strip),
    };
  });
}

/**
 * Deterministic relevance, 0 to 1: does the headline name the entity and the event, how
 * authoritative is the source, how recent is it against `now`.
 */
function relevanceScore(article, { entityTerms = [], eventTerms = [], now = new Date() } = {}) {
  const title = String(article.title || '').toLowerCase();
  const hit = (terms) => terms.some((t) => t && title.includes(String(t).toLowerCase()));
  const entity = hit(entityTerms) ? 1 : 0;
  const event = hit(eventTerms) ? 1 : 0;
  const authority = { official: 1, reported: 0.7, other: 0.3 }[
    article.sourceClass || sourceClass(article.url)
  ];
  const ageDays = article.publishedAt
    ? Math.max(0, (now - new Date(article.publishedAt)) / 86400000)
    : 30;
  const recency = Math.max(0, 1 - ageDays / 30);
  return Number((0.4 * entity + 0.25 * event + 0.2 * authority + 0.15 * recency).toFixed(3));
}

/** Clusters ranked by the relevance of their lead article; clusters that name neither the entity nor the event are dropped. */
export function rankClusters(clusters, ctx = {}) {
  return (clusters || [])
    .map((c) => ({ ...c, relevance: relevanceScore(c.lead, ctx) }))
    .filter((c) => c.relevance >= 0.4)
    .sort(
      (a, b) =>
        b.relevance - a.relevance ||
        String(b.lead.publishedAt || '').localeCompare(String(a.lead.publishedAt || '')),
    );
}
