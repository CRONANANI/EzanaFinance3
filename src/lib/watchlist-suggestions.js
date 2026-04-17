/**
 * Theme-based ticker suggestion engine for the New Watchlist modal.
 *
 * Strategy:
 *   1. Parse the watchlist name into intent keywords (lowercased substring match).
 *   2. Pull candidate tickers from a curated keyword → tickers map.
 *      ALL tickers in the map are restricted to NYSE or NASDAQ listings.
 *   3. Enrich the top N results with live price / day-change % via the
 *      app's existing `/api/market/batch-quotes` endpoint.
 *
 * NOTE: This is a client-side fallback map — the app does not currently
 * expose a "theme query" market-data endpoint, so we maintain the mapping
 * here. Extend THEME_MAP / KEYWORDS as new themes are requested.
 */

/** @typedef {'NYSE'|'NASDAQ'} Exchange */
/** @typedef {{symbol: string, name: string, exchange: Exchange, sector?: string, price?: number, changePct?: number}} Suggestion */

/** Curated theme → tickers map. NYSE / NASDAQ only. */
const THEME_MAP = {
  ai: [
    { symbol: 'NVDA', name: 'NVIDIA Corporation', exchange: 'NASDAQ', sector: 'Semiconductors' },
    { symbol: 'MSFT', name: 'Microsoft Corporation', exchange: 'NASDAQ', sector: 'Software' },
    { symbol: 'GOOGL', name: 'Alphabet Inc.', exchange: 'NASDAQ', sector: 'Internet' },
    { symbol: 'META', name: 'Meta Platforms Inc.', exchange: 'NASDAQ', sector: 'Internet' },
    { symbol: 'PLTR', name: 'Palantir Technologies', exchange: 'NASDAQ', sector: 'Software' },
    { symbol: 'AMD', name: 'Advanced Micro Devices', exchange: 'NASDAQ', sector: 'Semiconductors' },
    { symbol: 'SMCI', name: 'Super Micro Computer', exchange: 'NASDAQ', sector: 'Hardware' },
    { symbol: 'AVGO', name: 'Broadcom Inc.', exchange: 'NASDAQ', sector: 'Semiconductors' },
  ],
  dividend: [
    { symbol: 'JNJ', name: 'Johnson & Johnson', exchange: 'NYSE', sector: 'Healthcare' },
    { symbol: 'PG', name: 'Procter & Gamble', exchange: 'NYSE', sector: 'Consumer Staples' },
    { symbol: 'KO', name: 'Coca-Cola Company', exchange: 'NYSE', sector: 'Consumer Staples' },
    { symbol: 'PEP', name: 'PepsiCo Inc.', exchange: 'NASDAQ', sector: 'Consumer Staples' },
    { symbol: 'MCD', name: "McDonald's Corporation", exchange: 'NYSE', sector: 'Consumer Discretionary' },
    { symbol: 'XOM', name: 'Exxon Mobil Corporation', exchange: 'NYSE', sector: 'Energy' },
    { symbol: 'O', name: 'Realty Income Corp.', exchange: 'NYSE', sector: 'REIT' },
    { symbol: 'T', name: 'AT&T Inc.', exchange: 'NYSE', sector: 'Telecom' },
  ],
  energy: [
    { symbol: 'XOM', name: 'Exxon Mobil Corporation', exchange: 'NYSE', sector: 'Energy' },
    { symbol: 'CVX', name: 'Chevron Corporation', exchange: 'NYSE', sector: 'Energy' },
    { symbol: 'COP', name: 'ConocoPhillips', exchange: 'NYSE', sector: 'Energy' },
    { symbol: 'SLB', name: 'Schlumberger', exchange: 'NYSE', sector: 'Energy' },
    { symbol: 'OXY', name: 'Occidental Petroleum', exchange: 'NYSE', sector: 'Energy' },
    { symbol: 'EOG', name: 'EOG Resources', exchange: 'NYSE', sector: 'Energy' },
  ],
  green: [
    { symbol: 'TSLA', name: 'Tesla Inc.', exchange: 'NASDAQ', sector: 'Auto' },
    { symbol: 'ENPH', name: 'Enphase Energy', exchange: 'NASDAQ', sector: 'Solar' },
    { symbol: 'FSLR', name: 'First Solar Inc.', exchange: 'NASDAQ', sector: 'Solar' },
    { symbol: 'NEE', name: 'NextEra Energy', exchange: 'NYSE', sector: 'Utilities' },
    { symbol: 'PLUG', name: 'Plug Power Inc.', exchange: 'NASDAQ', sector: 'Clean Energy' },
    { symbol: 'SEDG', name: 'SolarEdge Technologies', exchange: 'NASDAQ', sector: 'Solar' },
    { symbol: 'RIVN', name: 'Rivian Automotive', exchange: 'NASDAQ', sector: 'Auto' },
  ],
  tech: [
    { symbol: 'AAPL', name: 'Apple Inc.', exchange: 'NASDAQ', sector: 'Technology' },
    { symbol: 'MSFT', name: 'Microsoft Corporation', exchange: 'NASDAQ', sector: 'Software' },
    { symbol: 'GOOGL', name: 'Alphabet Inc.', exchange: 'NASDAQ', sector: 'Internet' },
    { symbol: 'AMZN', name: 'Amazon.com Inc.', exchange: 'NASDAQ', sector: 'Internet' },
    { symbol: 'META', name: 'Meta Platforms Inc.', exchange: 'NASDAQ', sector: 'Internet' },
    { symbol: 'NVDA', name: 'NVIDIA Corporation', exchange: 'NASDAQ', sector: 'Semiconductors' },
    { symbol: 'CRM', name: 'Salesforce Inc.', exchange: 'NYSE', sector: 'Software' },
    { symbol: 'ORCL', name: 'Oracle Corporation', exchange: 'NYSE', sector: 'Software' },
  ],
  finance: [
    { symbol: 'JPM', name: 'JPMorgan Chase & Co.', exchange: 'NYSE', sector: 'Banks' },
    { symbol: 'BAC', name: 'Bank of America', exchange: 'NYSE', sector: 'Banks' },
    { symbol: 'GS', name: 'Goldman Sachs', exchange: 'NYSE', sector: 'Banks' },
    { symbol: 'V', name: 'Visa Inc.', exchange: 'NYSE', sector: 'Payments' },
    { symbol: 'MA', name: 'Mastercard Inc.', exchange: 'NYSE', sector: 'Payments' },
    { symbol: 'WFC', name: 'Wells Fargo & Co.', exchange: 'NYSE', sector: 'Banks' },
    { symbol: 'MS', name: 'Morgan Stanley', exchange: 'NYSE', sector: 'Banks' },
  ],
  healthcare: [
    { symbol: 'UNH', name: 'UnitedHealth Group', exchange: 'NYSE', sector: 'Healthcare' },
    { symbol: 'JNJ', name: 'Johnson & Johnson', exchange: 'NYSE', sector: 'Healthcare' },
    { symbol: 'LLY', name: 'Eli Lilly and Company', exchange: 'NYSE', sector: 'Pharma' },
    { symbol: 'PFE', name: 'Pfizer Inc.', exchange: 'NYSE', sector: 'Pharma' },
    { symbol: 'ABBV', name: 'AbbVie Inc.', exchange: 'NYSE', sector: 'Pharma' },
    { symbol: 'MRK', name: 'Merck & Co.', exchange: 'NYSE', sector: 'Pharma' },
    { symbol: 'TMO', name: 'Thermo Fisher Scientific', exchange: 'NYSE', sector: 'Life Sciences' },
  ],
  crypto: [
    { symbol: 'COIN', name: 'Coinbase Global', exchange: 'NASDAQ', sector: 'Fintech' },
    { symbol: 'MSTR', name: 'MicroStrategy Inc.', exchange: 'NASDAQ', sector: 'Software' },
    { symbol: 'MARA', name: 'Marathon Digital', exchange: 'NASDAQ', sector: 'Crypto Mining' },
    { symbol: 'RIOT', name: 'Riot Platforms', exchange: 'NASDAQ', sector: 'Crypto Mining' },
    { symbol: 'HUT', name: 'Hut 8 Corp.', exchange: 'NASDAQ', sector: 'Crypto Mining' },
  ],
  semiconductor: [
    { symbol: 'NVDA', name: 'NVIDIA Corporation', exchange: 'NASDAQ', sector: 'Semiconductors' },
    { symbol: 'AMD', name: 'Advanced Micro Devices', exchange: 'NASDAQ', sector: 'Semiconductors' },
    { symbol: 'TSM', name: 'Taiwan Semiconductor', exchange: 'NYSE', sector: 'Semiconductors' },
    { symbol: 'AVGO', name: 'Broadcom Inc.', exchange: 'NASDAQ', sector: 'Semiconductors' },
    { symbol: 'INTC', name: 'Intel Corporation', exchange: 'NASDAQ', sector: 'Semiconductors' },
    { symbol: 'QCOM', name: 'Qualcomm Inc.', exchange: 'NASDAQ', sector: 'Semiconductors' },
    { symbol: 'MU', name: 'Micron Technology', exchange: 'NASDAQ', sector: 'Semiconductors' },
  ],
  consumer: [
    { symbol: 'AMZN', name: 'Amazon.com Inc.', exchange: 'NASDAQ', sector: 'Internet' },
    { symbol: 'WMT', name: 'Walmart Inc.', exchange: 'NYSE', sector: 'Retail' },
    { symbol: 'HD', name: 'Home Depot Inc.', exchange: 'NYSE', sector: 'Retail' },
    { symbol: 'NKE', name: 'Nike Inc.', exchange: 'NYSE', sector: 'Apparel' },
    { symbol: 'SBUX', name: 'Starbucks Corporation', exchange: 'NASDAQ', sector: 'Restaurants' },
  ],
  defense: [
    { symbol: 'LMT', name: 'Lockheed Martin', exchange: 'NYSE', sector: 'Defense' },
    { symbol: 'RTX', name: 'RTX Corporation', exchange: 'NYSE', sector: 'Defense' },
    { symbol: 'NOC', name: 'Northrop Grumman', exchange: 'NYSE', sector: 'Defense' },
    { symbol: 'GD', name: 'General Dynamics', exchange: 'NYSE', sector: 'Defense' },
    { symbol: 'BA', name: 'Boeing Company', exchange: 'NYSE', sector: 'Aerospace' },
  ],
  reit: [
    { symbol: 'O', name: 'Realty Income Corp.', exchange: 'NYSE', sector: 'REIT' },
    { symbol: 'PLD', name: 'Prologis Inc.', exchange: 'NYSE', sector: 'REIT' },
    { symbol: 'AMT', name: 'American Tower Corp.', exchange: 'NYSE', sector: 'REIT' },
    { symbol: 'SPG', name: 'Simon Property Group', exchange: 'NYSE', sector: 'REIT' },
    { symbol: 'EQIX', name: 'Equinix Inc.', exchange: 'NASDAQ', sector: 'REIT' },
  ],
  travel: [
    { symbol: 'DAL', name: 'Delta Air Lines', exchange: 'NYSE', sector: 'Airlines' },
    { symbol: 'UAL', name: 'United Airlines Holdings', exchange: 'NASDAQ', sector: 'Airlines' },
    { symbol: 'AAL', name: 'American Airlines Group', exchange: 'NASDAQ', sector: 'Airlines' },
    { symbol: 'BKNG', name: 'Booking Holdings', exchange: 'NASDAQ', sector: 'Travel' },
    { symbol: 'ABNB', name: 'Airbnb Inc.', exchange: 'NASDAQ', sector: 'Travel' },
    { symbol: 'MAR', name: 'Marriott International', exchange: 'NASDAQ', sector: 'Hotels' },
  ],
};

/** Keyword → theme. Order matters: more specific themes first. */
const KEYWORDS = [
  [['ai', 'artificial intelligence', 'machine learning', ' ml '], 'ai'],
  [['chip', 'semi', 'semiconductor', 'silicon', 'fab'], 'semiconductor'],
  [['dividend', 'income', 'yield', 'kings', 'aristocrat', 'payout'], 'dividend'],
  [['reit', 'real estate', 'property'], 'reit'],
  [['green', 'clean', 'renewable', 'solar', 'ev', 'electric vehicle', 'esg', 'sustainability'], 'green'],
  [['oil', 'gas', 'petroleum', 'energy'], 'energy'],
  [['crypto', 'bitcoin', 'blockchain', 'web3', 'miner'], 'crypto'],
  [['bank', 'finance', 'financial', 'payments', 'fintech'], 'finance'],
  [['health', 'healthcare', 'pharma', 'biotech', 'medical', 'drug'], 'healthcare'],
  [['travel', 'airline', 'hotel', 'hospitality', 'tourism'], 'travel'],
  [['defense', 'military', 'aerospace', 'weapon'], 'defense'],
  [['consumer', 'retail', 'shopping'], 'consumer'],
  [['tech', 'technology', 'big tech', 'faang', 'mag 7', 'magnificent', 'software', 'saas'], 'tech'],
];

/**
 * Enrich suggestion list with live price + day-change from the batch-quotes API.
 * Fails silently — suggestions still render without price if the API is unreachable.
 */
async function enrichWithQuotes(list) {
  if (!list.length) return list;
  try {
    const symbols = list.map((s) => s.symbol).join(',');
    const res = await fetch(`/api/market/batch-quotes?symbols=${encodeURIComponent(symbols)}`);
    if (!res.ok) return list;
    const data = await res.json();
    const quotes = data?.quotes || {};
    return list.map((s) => {
      const q = quotes[s.symbol];
      if (!q) return s;
      return {
        ...s,
        price: typeof q.price === 'number' ? q.price : s.price,
        changePct: typeof q.changePercent === 'number' ? q.changePercent : s.changePct,
      };
    });
  } catch {
    return list;
  }
}

/**
 * Resolve a watchlist name into up to 8 NYSE/NASDAQ ticker suggestions.
 *
 * @param {string} query - The watchlist name typed by the user.
 * @returns {Promise<Suggestion[]>}
 */
export async function getThemeSuggestions(query) {
  const q = ` ${(query || '').toLowerCase()} `;
  if (!q.trim()) return [];

  const seen = new Set();
  const hits = [];

  for (const [keywords, theme] of KEYWORDS) {
    if (!keywords.some((k) => q.includes(k))) continue;
    for (const s of THEME_MAP[theme] || []) {
      if (seen.has(s.symbol)) continue;
      if (s.exchange !== 'NYSE' && s.exchange !== 'NASDAQ') continue;
      seen.add(s.symbol);
      hits.push(s);
      if (hits.length >= 8) break;
    }
    if (hits.length >= 8) break;
  }

  return enrichWithQuotes(hits.slice(0, 8));
}

export const __TEST_ONLY__ = { THEME_MAP, KEYWORDS };
