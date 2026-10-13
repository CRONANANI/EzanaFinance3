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
    datasetSlug: 'world-bank',
    dataset: 'World Bank Economic Indicators',
    href: '/datasets/world-bank',
    title: 'Fastest-growing economies',
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
