/**
 * The dataset component cards, as search knows them: pure metadata (no
 * components, no loaders), so it can be imported anywhere. Each entry names
 * the card, the dataset page it comes from, and the keywords a query is
 * scored against. The loaders live beside the hub cards in
 * src/components/datasets/hub/dataset-cards/cards.jsx (CARD_LOADERS), keyed
 * by the same ids; /api/datasets/cards ranks here, then loads there.
 */
export const CARD_REGISTRY = [
  {
    id: 'most-held',
    metric:
      /\b(most|widely)[- ]held\b.*\b(congress|politicians?|members?|senators?)\b|\b(congress|politicians?|members of congress|senators?)\b.*\b(hold|holds|held|own|owns)\b/i,
    entity: 'ticker',
    datasetSlug: 'politician-tracker',
    dataset: 'Politician Tracker',
    href: '/datasets/politician-tracker',
    title: 'Most held companies',
    keywords: [
      'politician',
      'politicians',
      'congress',
      'congressional',
      'senator',
      'senators',
      'representative',
      'house',
      'senate',
      'member',
      'members',
      'trade',
      'trades',
      'trading',
      'stock',
      'stocks',
      'holding',
      'holdings',
      'held',
      'capitol',
      'disclosure',
      'disclosures',
    ],
  },
  {
    id: 'house-senate',
    metric: /\bhouse\b.*\bsenate\b|\bsenate\b.*\bhouse\b|\bby chamber\b/i,
    entity: null,
    datasetSlug: 'politician-tracker',
    dataset: 'Politician Tracker',
    href: '/datasets/politician-tracker',
    title: 'House vs Senate, trailing 12 months',
    keywords: [
      'congress',
      'congressional',
      'house',
      'senate',
      'chamber',
      'politician',
      'politicians',
      'trades',
      'trading',
      'volume',
      'capitol',
    ],
  },
  {
    id: 'widely-held',
    metric:
      /\b(most|widely)[- ]held\b.*\b(funds?|institutions?|managers?)\b|\b13f\b|\binstitutional (holdings|owners|ownership)\b/i,
    entity: 'ticker',
    datasetSlug: 'institutional',
    dataset: 'Institutional',
    href: '/datasets/institutional',
    title: 'Most widely held by funds',
    keywords: [
      '13f',
      'fund',
      'funds',
      'hedge',
      'institutional',
      'institutions',
      'holdings',
      'held',
      'investor',
      'investors',
      'titans',
      'whale',
      'whales',
      'portfolio',
    ],
  },
  {
    id: 'insider-buys',
    metric: /\binsider (buys|buying|purchases|trades|trading)\b|\bform 4\b/i,
    entity: 'ticker',
    datasetSlug: 'insider',
    dataset: 'Insider Trading',
    href: '/datasets/insider',
    title: 'Largest insider buys, last 30 days',
    keywords: [
      'insider',
      'insiders',
      'form 4',
      'buy',
      'buys',
      'buying',
      'purchase',
      'purchases',
      'officer',
      'director',
      'executive',
      'executives',
      'ceo',
      'titans',
    ],
  },
  {
    id: 'fastest-growth',
    metric: /\b(fastest|highest)[- ]?grow|\bgdp growth\b|\bgrowth rates?\b|\bgrowing econom/i,
    entity: 'country',
    datasetSlug: 'world-bank',
    dataset: 'World Bank Economic Indicators',
    href: '/datasets/world-bank',
    title: 'Fastest growing economies',
    keywords: [
      'gdp',
      'growth',
      'economy',
      'economies',
      'economic',
      'world bank',
      'macro',
      'country',
      'countries',
      'lighthouse',
      'global',
      'emerging',
    ],
  },
  {
    id: 'biggest-markets',
    metric: /\bprediction markets?\b|\bpolymarket\b|\bkalshi\b|\bbetting markets?\b/i,
    entity: null,
    datasetSlug: 'prediction-markets',
    dataset: 'Prediction Markets',
    href: '/datasets/prediction-markets',
    title: 'Biggest open prediction markets',
    keywords: [
      'prediction',
      'predictions',
      'market',
      'markets',
      'odds',
      'polymarket',
      'kalshi',
      'bet',
      'bets',
      'betting',
      'probability',
      'hive',
      'election',
      'fed',
      'rates',
    ],
  },
  {
    id: 'crowd-forecasts',
    metric: /\bcrowd forecasts?\b|\bmetaculus\b|\bmanifold\b|\bforecasting\b/i,
    entity: null,
    datasetSlug: 'crowd-forecasts',
    dataset: 'Crowdsourced Intelligence',
    href: '/datasets/crowd-forecasts',
    title: 'Most followed crowd forecasts',
    keywords: [
      'forecast',
      'forecasts',
      'forecasters',
      'crowd',
      'crowdsourced',
      'manifold',
      'probability',
      'hive',
      'prediction',
    ],
  },
  {
    id: 'sanctions',
    metric: /\bsanction(s|ed)?\b|\bofac\b|\bsdn list\b/i,
    entity: null,
    datasetSlug: 'sanctions',
    dataset: 'Sanctions',
    href: '/datasets/sanctions',
    title: 'Newest sanctions designations',
    keywords: [
      'sanction',
      'sanctions',
      'sanctioned',
      'ofac',
      'designation',
      'designations',
      'sdn',
      'treasury',
      'russia',
      'iran',
      'geopolitical',
      'lighthouse',
    ],
  },
];

/**
 * The relevance rule (sonar-country-ranking-fix, Part A). Keyword overlap
 * picks candidates; a candidate is SHOWN only when
 *   (a) the query resolved an entity of the card's kind (a country, a
 *       ticker) and the loaded card has a row for it (appended by the loader
 *       when outside its top rows), or
 *   (b) the query names the card's exact metric (`metric`) and no entity of
 *       another kind was resolved.
 * "ranking" and "economy" matching a card's keywords never qualify alone.
 */
export function cardQualifies(card, loaded, { query, entities = [] } = {}) {
  const def = CARD_BY_ID[card.id] || card;
  const keyed = entities.filter((e) => e.kind === def.entity);
  if (keyed.length) {
    const keys = new Set(
      keyed.flatMap((e) => [e.key, e.label].filter(Boolean).map((k) => String(k).toLowerCase())),
    );
    return (loaded?.rows || []).some(
      (r) =>
        keys.has(String(r.key || '').toLowerCase()) || keys.has(String(r.name || '').toLowerCase()),
    );
  }
  /* An entity was named, but of another kind (India for a ticker card). */
  if (entities.some((e) => e.kind === 'country' || e.kind === 'ticker')) return false;
  return Boolean(def.metric && def.metric.test(String(query || '')));
}

export const CARD_BY_ID = Object.fromEntries(CARD_REGISTRY.map((c) => [c.id, c]));

const STOP = new Set(['the', 'and', 'for', 'with', 'what', 'who', 'how', 'are', 'is', 'of', 'in']);

/** Lowercase word tokens of two or more characters, stop words dropped. */
export function tokenize(query) {
  return String(query || '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 2 && !STOP.has(t));
}

/**
 * Cards that match a query, best first. A query token scores 3 for an exact
 * word in the card's title, 2 for an exact keyword, 1 for a partial match
 * (three or more characters, either way round). Cards below `min` are
 * dropped; at most `limit` are returned.
 */
export function rankCardsForQuery(query, { limit = 8, min = 2 } = {}) {
  const tokens = tokenize(query);
  if (!tokens.length) return [];
  const scored = CARD_REGISTRY.map((card) => {
    const titleWords = tokenize(card.title);
    const keys = card.keywords.map((k) => k.toLowerCase());
    let score = 0;
    for (const t of tokens) {
      if (titleWords.includes(t)) score += 3;
      else if (keys.includes(t)) score += 2;
      else if (
        t.length >= 3 &&
        [...titleWords, ...keys].some((k) => k.startsWith(t) || (k.length >= 3 && t.startsWith(k)))
      ) {
        score += 1;
      }
    }
    return { card, score };
  });
  return scored
    .filter((s) => s.score >= min)
    .sort((a, b) => b.score - a.score || a.card.title.localeCompare(b.card.title))
    .slice(0, limit)
    .map((s) => ({ ...s.card, score: s.score }));
}
