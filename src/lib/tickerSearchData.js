/** @type {{ ticker: string; name: string; sector: string }[]} */
export const TICKER_SEARCH_DATA = [
  { ticker: 'AAPL', name: 'Apple Inc', sector: 'Technology' },
  { ticker: 'MSFT', name: 'Microsoft Corporation', sector: 'Technology' },
  { ticker: 'GOOGL', name: 'Alphabet Inc Class A', sector: 'Technology' },
  { ticker: 'GOOG', name: 'Alphabet Inc Class C', sector: 'Technology' },
  { ticker: 'AMZN', name: 'Amazon.com Inc', sector: 'Consumer' },
  { ticker: 'NVDA', name: 'NVIDIA Corporation', sector: 'Technology' },
  { ticker: 'META', name: 'Meta Platforms Inc', sector: 'Technology' },
  { ticker: 'TSLA', name: 'Tesla Inc', sector: 'Automotive' },
  { ticker: 'BRK.B', name: 'Berkshire Hathaway B', sector: 'Financials' },
  { ticker: 'BRK.A', name: 'Berkshire Hathaway A', sector: 'Financials' },
  { ticker: 'JPM', name: 'JPMorgan Chase & Co', sector: 'Banking' },
  { ticker: 'V', name: 'Visa Inc', sector: 'Payments' },
  { ticker: 'UNH', name: 'UnitedHealth Group', sector: 'Healthcare' },
  { ticker: 'LLY', name: 'Eli Lilly and Company', sector: 'Pharma' },
  { ticker: 'JNJ', name: 'Johnson & Johnson', sector: 'Healthcare' },
  { ticker: 'XOM', name: 'Exxon Mobil Corporation', sector: 'Energy' },
  { ticker: 'WMT', name: 'Walmart Inc', sector: 'Retail' },
  { ticker: 'MA', name: 'Mastercard Incorporated', sector: 'Payments' },
  { ticker: 'PG', name: 'Procter & Gamble Co', sector: 'Consumer' },
  { ticker: 'HD', name: 'Home Depot Inc', sector: 'Retail' },
  { ticker: 'AVGO', name: 'Broadcom Inc', sector: 'Technology' },
  { ticker: 'CVX', name: 'Chevron Corporation', sector: 'Energy' },
  { ticker: 'MRK', name: 'Merck & Co Inc', sector: 'Pharma' },
  { ticker: 'COST', name: 'Costco Wholesale Corp', sector: 'Retail' },
  { ticker: 'ABBV', name: 'AbbVie Inc', sector: 'Pharma' },
  { ticker: 'AMD', name: 'Advanced Micro Devices', sector: 'Technology' },
  { ticker: 'ORCL', name: 'Oracle Corporation', sector: 'Technology' },
  { ticker: 'CSCO', name: 'Cisco Systems Inc', sector: 'Technology' },
  { ticker: 'CRM', name: 'Salesforce Inc', sector: 'Technology' },
  { ticker: 'ACN', name: 'Accenture PLC', sector: 'Technology' },
  { ticker: 'NFLX', name: 'Netflix Inc', sector: 'Media' },
  { ticker: 'TMO', name: 'Thermo Fisher Scientific', sector: 'Life Sciences' },
  { ticker: 'ADBE', name: 'Adobe Inc', sector: 'Technology' },
  { ticker: 'TXN', name: 'Texas Instruments', sector: 'Semis' },
  { ticker: 'QCOM', name: 'Qualcomm Inc', sector: 'Semis' },
  { ticker: 'INTC', name: 'Intel Corporation', sector: 'Semis' },
  { ticker: 'GS', name: 'Goldman Sachs Group', sector: 'Banking' },
  { ticker: 'MS', name: 'Morgan Stanley', sector: 'Banking' },
  { ticker: 'BAC', name: 'Bank of America Corp', sector: 'Banking' },
  { ticker: 'WFC', name: 'Wells Fargo & Company', sector: 'Banking' },
  { ticker: 'BLK', name: 'BlackRock Inc', sector: 'Asset Mgmt' },
  { ticker: 'SPGI', name: 'S&P Global Inc', sector: 'Financials' },
  { ticker: 'GE', name: 'GE Aerospace', sector: 'Industrial' },
  { ticker: 'CAT', name: 'Caterpillar Inc', sector: 'Industrial' },
  { ticker: 'DE', name: 'Deere & Company', sector: 'Industrial' },
  { ticker: 'BA', name: 'Boeing Company', sector: 'Aerospace' },
  { ticker: 'LMT', name: 'Lockheed Martin Corp', sector: 'Defense' },
  { ticker: 'RTX', name: 'RTX Corporation', sector: 'Defense' },
  { ticker: 'CRWD', name: 'CrowdStrike Holdings', sector: 'Cybersecurity' },
  { ticker: 'SNOW', name: 'Snowflake Inc', sector: 'Cloud' },
  { ticker: 'PLTR', name: 'Palantir Technologies', sector: 'AI/Data' },
  { ticker: 'NET', name: 'Cloudflare Inc', sector: 'Cloud' },
  { ticker: 'DDOG', name: 'Datadog Inc', sector: 'Observability' },
  { ticker: 'ISRG', name: 'Intuitive Surgical Inc', sector: 'MedTech' },
  { ticker: 'DXCM', name: 'Dexcom Inc', sector: 'MedTech' },
  { ticker: 'COIN', name: 'Coinbase Global Inc', sector: 'Crypto' },
  { ticker: 'HOOD', name: 'Robinhood Markets Inc', sector: 'FinTech' },
  { ticker: 'SQ', name: 'Block Inc', sector: 'FinTech' },
  { ticker: 'PYPL', name: 'PayPal Holdings Inc', sector: 'Payments' },
  { ticker: 'SOFI', name: 'SoFi Technologies Inc', sector: 'FinTech' },
  { ticker: 'AFRM', name: 'Affirm Holdings Inc', sector: 'FinTech' },
  { ticker: 'UBER', name: 'Uber Technologies Inc', sector: 'Transport' },
  { ticker: 'LYFT', name: 'Lyft Inc', sector: 'Transport' },
  { ticker: 'ABNB', name: 'Airbnb Inc', sector: 'Travel' },
  { ticker: 'BKNG', name: 'Booking Holdings Inc', sector: 'Travel' },
  { ticker: 'SPOT', name: 'Spotify Technology', sector: 'Media' },
  { ticker: 'RBLX', name: 'Roblox Corporation', sector: 'Gaming' },
  { ticker: 'U', name: 'Unity Software Inc', sector: 'Gaming' },
];

/**
 * @param {string} query
 */
export function searchTickers(query) {
  if (!query || query.trim().length === 0) return [];
  const q = query.trim().toLowerCase();
  return TICKER_SEARCH_DATA.filter(
    (s) =>
      s.ticker.toLowerCase().includes(q) ||
      s.name.toLowerCase().includes(q) ||
      s.sector.toLowerCase().includes(q),
  ).slice(0, 8);
}

/**
 * @param {string} ticker
 */
export function getTickerMeta(ticker) {
  const u = (ticker || '').toUpperCase();
  return TICKER_SEARCH_DATA.find((t) => t.ticker.toUpperCase() === u) || null;
}
