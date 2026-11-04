/**
 * Lobbying topics narrower than an LDA issue area (Nov 2026). Each topic has
 * the phrases the topic ingest searches for in the LDA API's specific-issue
 * text (filing_specific_lobbying_issues) and the matching Postgres text query
 * the Sonar leaders RPC runs over lobbying_filings.specific_tsv.
 *
 * A topic's ranking is trusted only once its ingest has walked every query
 * for every year asked (lobbying_topic_ingest.complete). Until then Sonar
 * ranks the broader issue area and says so.
 */
export const LOBBYING_TOPICS = {
  ai: {
    label: 'artificial intelligence',
    match:
      /\b(ai|a\.i\.|artificial intelligence|machine learning|generative|llms?|large language models?)\b/i,
    queries: [
      'artificial intelligence',
      'machine learning',
      'generative AI',
      'large language model',
    ],
    tsquery:
      '"artificial intelligence" OR "machine learning" OR "generative AI" OR "large language model" OR AI',
    bucket: 'tech',
  },
  semiconductors: {
    label: 'semiconductors',
    match: /\b(semiconductors?|chips?|chips act|foundr(?:y|ies))\b/i,
    queries: ['semiconductor', 'CHIPS Act'],
    tsquery: 'semiconductor OR semiconductors OR "CHIPS Act"',
    bucket: 'tech',
  },
  crypto: {
    label: 'crypto and digital assets',
    match: /\b(crypto\w*|digital assets?|stablecoins?|blockchain|bitcoin)\b/i,
    queries: ['digital asset', 'cryptocurrency', 'stablecoin', 'blockchain'],
    tsquery: 'cryptocurrency OR "digital asset" OR "digital assets" OR stablecoin OR blockchain',
    bucket: 'tech',
  },
  social_media: {
    label: 'social media and online safety',
    match: /\b(social media|online safety|kids online|tiktok|section 230)\b/i,
    queries: ['social media', 'online safety', 'Section 230'],
    tsquery: '"social media" OR "online safety" OR "Section 230" OR TikTok',
    bucket: 'tech',
  },
};

/** The topic a question names, or null. */
export function topicForText(text) {
  const t = String(text || '');
  for (const [key, topic] of Object.entries(LOBBYING_TOPICS)) {
    if (topic.match.test(t)) return { key, ...topic };
  }
  return null;
}

/**
 * Whether a topic's ingest is complete for every year in [from, to].
 * @param {Array<{ topic, year, query, complete }>} rows lobbying_topic_ingest rows
 */
export function topicCovered(rows, key, { from, to }) {
  const topic = LOBBYING_TOPICS[key];
  if (!topic) return false;
  for (let y = from; y <= to; y += 1) {
    for (const q of topic.queries) {
      if (!rows.some((r) => r.topic === key && Number(r.year) === y && r.query === q && r.complete))
        return false;
    }
  }
  return true;
}
