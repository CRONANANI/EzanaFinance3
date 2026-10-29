/**
 * Ezana Sonar — Sourced-matches ranking.
 *
 * Source weights that depend on the query: when a foreign sanctioned
 * jurisdiction is present with conflict/sanctions/macro framing, US Sanctions
 * leads, followed by policy/geopolitics, prediction markets, congressional
 * trading, then government contracts (which for a country ping is only
 * relevant when structurally matched, so it is down-weighted). A sanctions
 * finding is guaranteed into the top N when the query warrants it, and source
 * diversity is kept at the top so one dataset cannot flood it.
 *
 * Slugs accept both the taxonomy/source form ('us-sanctions') and the Sonar
 * corpus/dataset id ('sanctions'), so callers on either surface rank alike.
 */
const BASE_WEIGHTS = {
  'us-sanctions': 1.0,
  sanctions: 1.0,
  'policy-geopolitics': 0.9,
  'prediction-markets': 0.85,
  markets: 0.85,
  'congressional-trading': 0.8,
  congress: 0.8,
  'government-contracts': 0.75,
  'gov-contracts': 0.75,
  contracts: 0.75,
  lobbying: 0.75,
  'sec-filings': 0.7,
  institutional: 0.65,
  '13f': 0.65,
  echo: 0.6,
  news: 0.6,
};

const SANCTIONS_SLUGS = new Set(['us-sanctions', 'sanctions']);
const CONTRACTS_SLUGS = new Set(['government-contracts', 'gov-contracts', 'contracts']);

function sourceWeight(slug, q) {
  let w = BASE_WEIGHTS[slug] ?? 0.6;
  if (SANCTIONS_SLUGS.has(slug)) {
    if (q.hasSanctionedJurisdiction) w += 0.6;
    if (q.themes?.includes('sanctions')) w += 0.3;
    if (q.themes?.includes('conflict')) w += 0.2;
  }
  if (CONTRACTS_SLUGS.has(slug) && q.intent === 'country') w -= 0.2;
  if ((slug === 'prediction-markets' || slug === 'markets') && q.themes?.includes('conflict')) {
    w += 0.2;
  }
  return w;
}

function recencyScore(date) {
  if (!date) return 0.3;
  const days = (Date.now() - new Date(date).getTime()) / 86_400_000;
  return Math.max(0, 1 - days / 730);
}

/**
 * @param {Array<{ sourceSlug?: string, dataset?: string, relevance?: number, date?: string|null }>} findings
 * @param {ReturnType<import('./resolveQuery').resolveQuery>} q
 */
export function rankSourcedMatches(findings, q, { pinTopN = 3, maxPerSourceInTop = 3 } = {}) {
  const slugOf = (f) => f.sourceSlug || f.dataset || '';
  const scored = (findings || [])
    .map((f) => ({
      ...f,
      score: Number(
        (
          sourceWeight(slugOf(f), q) *
          (0.7 * (f.relevance ?? 0.5) + 0.3 * recencyScore(f.date))
        ).toFixed(4),
      ),
    }))
    .sort((a, b) => b.score - a.score);

  // Guarantee a sanctions finding in the top N when the query warrants it.
  if (q.hasSanctionedJurisdiction || q.themes?.includes('sanctions')) {
    const idx = scored.findIndex((f) => SANCTIONS_SLUGS.has(slugOf(f)));
    if (idx >= pinTopN) {
      const [s] = scored.splice(idx, 1);
      scored.unshift(s);
    }
  }

  // Source diversity at the top.
  const top = [];
  const rest = [];
  const counts = {};
  for (const f of scored) {
    const slug = slugOf(f);
    counts[slug] = (counts[slug] ?? 0) + 1;
    (counts[slug] <= maxPerSourceInTop ? top : rest).push(f);
  }
  return [...top, ...rest];
}
