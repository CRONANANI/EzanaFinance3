/**
 * Lightweight entity extraction to drive the STRUCTURED retrievers (congressional
 * trades, government contracts). Keyword/regex + a small known-list — deliberately
 * not an NER model. Extracts tickers, candidate proper names, sectors, years, and
 * salient keywords from a natural-language research question.
 */

// Common all-caps tokens that are NOT tickers.
const TICKER_STOP = new Set([
  'THE', 'AND', 'FOR', 'ARE', 'USA', 'US', 'USD', 'CEO', 'CFO', 'ETF', 'IPO', 'GDP',
  'API', 'SEC', 'FED', 'DOD', 'DOJ', 'FBI', 'AI', 'ML', 'EV', 'ESG', 'Q1', 'Q2', 'Q3',
  'Q4', 'YOY', 'EPS', 'NYSE', 'WHO', 'HOW', 'WHY', 'WHAT', 'WHEN', 'WHO', 'OUR', 'ANY',
]);

// Sector keywords → normalized sector label (multi-word first).
const SECTOR_MAP = [
  [/critical minerals?|rare earths?|lithium|cobalt|nickel/i, 'critical minerals'],
  [/semiconductors?|chips?|foundr|fabs?\b/i, 'semiconductors'],
  [/defen[cs]e|defense contractor|aerospace|weapons?|military/i, 'defense'],
  [/health ?care|pharma(ceutical)?|biotech|drugs?/i, 'healthcare'],
  [/energy|oil|gas|solar|nuclear|renewables?/i, 'energy'],
  [/financ(e|ial)|banks?|banking|insurance/i, 'financials'],
  [/technolog|software|cloud|data ?center/i, 'technology'],
  [/supply chains?/i, 'supply chain'],
];

/** @param {string} query @returns {{tickers:string[],names:string[],sectors:string[],years:number[],keywords:string[]}} */
export function extractEntities(query) {
  const text = String(query || '');

  // Tickers: explicit $CASH tags, plus bare 2–5 uppercase tokens minus stopwords.
  const tickers = new Set();
  for (const m of text.matchAll(/\$([A-Za-z]{1,5})\b/g)) tickers.add(m[1].toUpperCase());
  for (const m of text.matchAll(/\b([A-Z]{2,5})\b/g)) {
    const t = m[1];
    if (!TICKER_STOP.has(t)) tickers.add(t);
  }

  // Candidate proper names: consecutive Capitalized words (e.g. "Nancy Pelosi",
  // "Lockheed Martin"). Two+ words to avoid matching sentence-initial words.
  const names = new Set();
  for (const m of text.matchAll(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\b/g)) {
    names.add(m[1]);
  }

  // Sectors from the keyword map.
  const sectors = new Set();
  for (const [re, label] of SECTOR_MAP) if (re.test(text)) sectors.add(label);

  // Years (2000–2099).
  const years = new Set();
  for (const m of text.matchAll(/\b(20\d{2})\b/g)) years.add(Number(m[1]));

  // Salient keywords for ILIKE fallback (lowercase words ≥ 4 chars, minus stops).
  const KW_STOP = new Set([
    'what', 'whats', 'about', 'have', 'does', 'with', 'from', 'they', 'this', 'that',
    'there', 'their', 'would', 'could', 'should', 'which', 'where', 'when', 'coverage',
    'research', 'data', 'show', 'tell', 'find', 'give', 'into', 'over', 'more', 'much',
  ]);
  const keywords = [
    ...new Set(
      (text.toLowerCase().match(/\b[a-z]{4,}\b/g) || []).filter((w) => !KW_STOP.has(w)),
    ),
  ].slice(0, 8);

  return {
    tickers: [...tickers].slice(0, 8),
    names: [...names].slice(0, 6),
    sectors: [...sectors],
    years: [...years],
    keywords,
  };
}
