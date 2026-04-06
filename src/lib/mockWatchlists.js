/** @typedef {{ ticker: string; name: string; price: number; change: number; changePct: number; marketCap: string; volume: string; sector: string }} WatchlistStock */

/**
 * @typedef {{ id: string; label: string; stocks: WatchlistStock[] }} MockWatchlist
 */

/** @type {MockWatchlist[]} */
export const MOCK_WATCHLISTS = [
  {
    id: 'all-stocks',
    label: 'All Stocks',
    stocks: [
      { ticker: 'AAPL', name: 'Apple Inc', price: 189.3, change: 1.4, changePct: 0.74, marketCap: '2.93T', volume: '52.1M', sector: 'Technology' },
      { ticker: 'MSFT', name: 'Microsoft Corp', price: 415.2, change: 2.1, changePct: 0.51, marketCap: '3.08T', volume: '18.2M', sector: 'Technology' },
      { ticker: 'GOOGL', name: 'Alphabet Inc', price: 175.4, change: -0.8, changePct: -0.45, marketCap: '2.19T', volume: '22.1M', sector: 'Technology' },
      { ticker: 'AMZN', name: 'Amazon.com Inc', price: 198.7, change: 1.2, changePct: 0.61, marketCap: '2.08T', volume: '31.4M', sector: 'Consumer' },
      { ticker: 'NVDA', name: 'NVIDIA Corp', price: 875.4, change: 12.5, changePct: 1.45, marketCap: '2.16T', volume: '42.3M', sector: 'Technology' },
      { ticker: 'TSLA', name: 'Tesla Inc', price: 242.8, change: -3.2, changePct: -1.3, marketCap: '775B', volume: '88.4M', sector: 'Automotive' },
      { ticker: 'META', name: 'Meta Platforms', price: 523.1, change: 5.3, changePct: 1.02, marketCap: '1.33T', volume: '14.5M', sector: 'Technology' },
      { ticker: 'BRK.B', name: 'Berkshire Hathaway', price: 408.5, change: 0.8, changePct: 0.2, marketCap: '892B', volume: '3.2M', sector: 'Financials' },
      { ticker: 'JPM', name: 'JPMorgan Chase', price: 212.4, change: 1.1, changePct: 0.52, marketCap: '609B', volume: '9.4M', sector: 'Financials' },
      { ticker: 'V', name: 'Visa Inc', price: 276.3, change: 0.9, changePct: 0.33, marketCap: '564B', volume: '6.2M', sector: 'Financials' },
    ],
  },
  {
    id: 'politicians',
    label: 'Politicians',
    stocks: [
      { ticker: 'NVDA', name: 'NVIDIA Corp', price: 875.4, change: 12.5, changePct: 1.45, marketCap: '2.16T', volume: '42.3M', sector: 'Technology' },
      { ticker: 'MSFT', name: 'Microsoft Corp', price: 415.2, change: 2.1, changePct: 0.51, marketCap: '3.08T', volume: '18.2M', sector: 'Technology' },
      { ticker: 'AAPL', name: 'Apple Inc', price: 189.3, change: 1.4, changePct: 0.74, marketCap: '2.93T', volume: '52.1M', sector: 'Technology' },
      { ticker: 'LMT', name: 'Lockheed Martin', price: 468.2, change: 3.8, changePct: 0.82, marketCap: '116B', volume: '1.1M', sector: 'Defense' },
      { ticker: 'RTX', name: 'RTX Corp', price: 116.4, change: 1.2, changePct: 1.04, marketCap: '153B', volume: '4.8M', sector: 'Defense' },
      { ticker: 'GD', name: 'General Dynamics', price: 298.1, change: 2.4, changePct: 0.81, marketCap: '81B', volume: '1.4M', sector: 'Defense' },
      { ticker: 'NOC', name: 'Northrop Grumman', price: 482.6, change: 4.1, changePct: 0.86, marketCap: '74B', volume: '0.9M', sector: 'Defense' },
      { ticker: 'AMZN', name: 'Amazon.com Inc', price: 198.7, change: 1.2, changePct: 0.61, marketCap: '2.08T', volume: '31.4M', sector: 'Consumer' },
      { ticker: 'GOOGL', name: 'Alphabet Inc', price: 175.4, change: -0.8, changePct: -0.45, marketCap: '2.19T', volume: '22.1M', sector: 'Technology' },
      { ticker: 'META', name: 'Meta Platforms', price: 523.1, change: 5.3, changePct: 1.02, marketCap: '1.33T', volume: '14.5M', sector: 'Technology' },
    ],
  },
  {
    id: 'financial-institutions',
    label: 'Financial Institutions',
    stocks: [
      { ticker: 'JPM', name: 'JPMorgan Chase', price: 212.4, change: 1.1, changePct: 0.52, marketCap: '609B', volume: '9.4M', sector: 'Banking' },
      { ticker: 'GS', name: 'Goldman Sachs', price: 498.3, change: 4.2, changePct: 0.85, marketCap: '166B', volume: '2.1M', sector: 'Banking' },
      { ticker: 'MS', name: 'Morgan Stanley', price: 104.8, change: 0.6, changePct: 0.58, marketCap: '173B', volume: '8.8M', sector: 'Banking' },
      { ticker: 'BAC', name: 'Bank of America', price: 42.1, change: 0.3, changePct: 0.72, marketCap: '329B', volume: '42.6M', sector: 'Banking' },
      { ticker: 'WFC', name: 'Wells Fargo', price: 62.8, change: 0.4, changePct: 0.64, marketCap: '210B', volume: '18.4M', sector: 'Banking' },
      { ticker: 'BLK', name: 'BlackRock Inc', price: 878.4, change: 6.1, changePct: 0.7, marketCap: '132B', volume: '0.8M', sector: 'Asset Mgmt' },
      { ticker: 'V', name: 'Visa Inc', price: 276.3, change: 0.9, changePct: 0.33, marketCap: '564B', volume: '6.2M', sector: 'Payments' },
      { ticker: 'MA', name: 'Mastercard', price: 488.2, change: 2.4, changePct: 0.49, marketCap: '452B', volume: '3.1M', sector: 'Payments' },
      { ticker: 'SCHW', name: 'Charles Schwab', price: 78.4, change: 0.5, changePct: 0.64, marketCap: '141B', volume: '11.2M', sector: 'Brokerage' },
      { ticker: 'C', name: 'Citigroup', price: 68.2, change: -0.3, changePct: -0.44, marketCap: '130B', volume: '16.8M', sector: 'Banking' },
    ],
  },
  {
    id: 'healthtech',
    label: 'HealthTech',
    stocks: [
      { ticker: 'UNH', name: 'UnitedHealth Group', price: 524.8, change: 3.2, changePct: 0.61, marketCap: '482B', volume: '3.4M', sector: 'Health Ins.' },
      { ticker: 'ISRG', name: 'Intuitive Surgical', price: 428.6, change: 5.4, changePct: 1.28, marketCap: '152B', volume: '1.2M', sector: 'MedTech' },
      { ticker: 'DXCM', name: 'Dexcom Inc', price: 82.4, change: 1.1, changePct: 1.35, marketCap: '31B', volume: '4.8M', sector: 'MedTech' },
      { ticker: 'TDOC', name: 'Teladoc Health', price: 12.8, change: -0.2, changePct: -1.54, marketCap: '2.1B', volume: '6.2M', sector: 'Telehealth' },
      { ticker: 'VEEV', name: 'Veeva Systems', price: 218.4, change: 2.8, changePct: 1.3, marketCap: '35B', volume: '1.4M', sector: 'Health SaaS' },
      { ticker: 'HIMS', name: 'Hims & Hers Health', price: 28.6, change: 1.2, changePct: 4.38, marketCap: '6.8B', volume: '18.4M', sector: 'Telehealth' },
      { ticker: 'GEHC', name: 'GE HealthCare', price: 88.2, change: 0.8, changePct: 0.92, marketCap: '38B', volume: '2.8M', sector: 'MedTech' },
      { ticker: 'DOCS', name: 'Doximity Inc', price: 42.8, change: 0.6, changePct: 1.42, marketCap: '8.2B', volume: '2.4M', sector: 'Health SaaS' },
      { ticker: 'PHMD', name: 'PhotoMedex', price: 24.1, change: -0.4, changePct: -1.63, marketCap: '4.8B', volume: '3.2M', sector: 'MedTech' },
      { ticker: 'AMED', name: 'Amedisys Inc', price: 88.4, change: 0.2, changePct: 0.23, marketCap: '3.4B', volume: '0.8M', sector: 'Home Health' },
    ],
  },
  {
    id: 'hypergrowth',
    label: 'HyperGrowth',
    stocks: [
      { ticker: 'NVDA', name: 'NVIDIA Corp', price: 875.4, change: 12.5, changePct: 1.45, marketCap: '2.16T', volume: '42.3M', sector: 'AI/Semis' },
      { ticker: 'CRWD', name: 'CrowdStrike', price: 368.2, change: 8.4, changePct: 2.34, marketCap: '92B', volume: '4.2M', sector: 'Cybersecurity' },
      { ticker: 'SNOW', name: 'Snowflake Inc', price: 178.4, change: 4.2, changePct: 2.41, marketCap: '60B', volume: '6.8M', sector: 'Cloud Data' },
      { ticker: 'NET', name: 'Cloudflare Inc', price: 98.6, change: 2.1, changePct: 2.18, marketCap: '33B', volume: '8.4M', sector: 'Cloud Infra' },
      { ticker: 'DDOG', name: 'Datadog Inc', price: 138.2, change: 3.8, changePct: 2.83, marketCap: '44B', volume: '4.8M', sector: 'Observability' },
      { ticker: 'PLTR', name: 'Palantir Tech', price: 28.4, change: 1.2, changePct: 4.41, marketCap: '62B', volume: '62.4M', sector: 'AI/Data' },
      { ticker: 'SOFI', name: 'SoFi Technologies', price: 8.2, change: 0.4, changePct: 5.13, marketCap: '9.2B', volume: '48.6M', sector: 'FinTech' },
      { ticker: 'AFRM', name: 'Affirm Holdings', price: 42.8, change: 2.2, changePct: 5.42, marketCap: '13.4B', volume: '18.8M', sector: 'FinTech' },
      { ticker: 'UPST', name: 'Upstart Holdings', price: 32.6, change: 1.8, changePct: 5.84, marketCap: '2.8B', volume: '12.4M', sector: 'AI Lending' },
      { ticker: 'IONQ', name: 'IonQ Inc', price: 18.4, change: 1.2, changePct: 6.98, marketCap: '3.8B', volume: '14.2M', sector: 'Quantum' },
    ],
  },
];
