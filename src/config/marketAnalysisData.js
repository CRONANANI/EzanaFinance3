/**
 * Market Analysis Page - Mock Data Configuration
 * All data structured to be easily replaced with real API data
 */

export const MARKET_LAYERS = {
  MARKETS: 'markets',
  CENTRAL_BANKS: 'central-banks',
  INDICES: 'indices',
  COMMODITIES: 'commodities',
  CURRENCIES: 'currencies',
};

// ============================================================================
// LAYER 1: MARKETS
// ============================================================================

export const MARKETS_DATA = {
  'Major Indices': {
    tab: 'Major Indices',
    type: 'indices',
    items: [
      { name: 'S&P 500', symbol: 'SPX', value: '5,420.25', change: '+0.34%', changeVal: 0.34, status: 'OPEN', summary: 'Extended rally to 5th consecutive week. Tech and healthcare leading gains.' },
      { name: 'NASDAQ Composite', symbol: 'CCMP', value: '18,950.50', change: '+0.52%', changeVal: 0.52, status: 'OPEN', summary: 'AI and semiconductor stocks driving momentum. New 52-week high.' },
      { name: 'Dow Jones', symbol: 'DJIA', value: '39,150.00', change: '-0.12%', changeVal: -0.12, status: 'OPEN', summary: 'Industrials and energy weigh on index. Financials mixed.' },
      { name: 'Russell 2000', symbol: 'RUT', value: '2,045.75', change: '+0.18%', changeVal: 0.18, status: 'OPEN', summary: 'Small caps outperforming. Regional bank recovery.' },
      { name: 'FTSE 100', symbol: 'FTSE', value: '8,234.56', change: '+0.31%', changeVal: 0.31, status: 'OPEN', summary: 'Mining stocks boost index. BOE rate decision pending.' },
      { name: 'DAX 40', symbol: 'DAX', value: '19,456.78', change: '+0.58%', changeVal: 0.58, status: 'CLOSED', summary: 'Automotive sector recovery lifts index. ECB dovish signals.' },
      { name: 'Nikkei 225', symbol: 'N225', value: '39,234.56', change: '+1.24%', changeVal: 1.24, status: 'CLOSED', summary: 'Yen weakness supports exporters. BOJ maintains ultra-loose policy.' },
      { name: 'CAC 40', symbol: 'FCHI', value: '8,456.34', change: '+0.28%', changeVal: 0.28, status: 'CLOSED', summary: 'European recovery continues. Luxury sector strength.' },
    ],
  },
  Sectors: {
    tab: 'Sectors',
    type: 'sectors',
    displayType: 'sectors-performance',
    items: [
      { name: 'Technology', change: '+1.4%', changeVal: 1.4, bar: 70 },
      { name: 'Healthcare', change: '+0.8%', changeVal: 0.8, bar: 60 },
      { name: 'Financials', change: '-0.3%', changeVal: -0.3, bar: 48 },
      { name: 'Energy', change: '+2.1%', changeVal: 2.1, bar: 80 },
      { name: 'Consumer Discretionary', change: '-0.5%', changeVal: -0.5, bar: 45 },
      { name: 'Industrials', change: '+0.2%', changeVal: 0.2, bar: 55 },
      { name: 'Materials', change: '+0.6%', changeVal: 0.6, bar: 58 },
      { name: 'Real Estate', change: '-1.2%', changeVal: -1.2, bar: 40 },
      { name: 'Utilities', change: '+0.1%', changeVal: 0.1, bar: 52 },
      { name: 'Communication Services', change: '+1.1%', changeVal: 1.1, bar: 65 },
      { name: 'Consumer Staples', change: '+0.3%', changeVal: 0.3, bar: 54 },
    ],
  },
  Futures: {
    tab: 'Futures',
    type: 'futures',
    displayType: 'futures-table',
    groups: [
      {
        title: 'Index Futures',
        items: [
          { name: 'S&P 500 (ES)', value: '5,420.25', change: '+0.34%', changeVal: 0.34 },
          { name: 'NASDAQ (NQ)', value: '18,950.50', change: '+0.52%', changeVal: 0.52 },
          { name: 'DOW (YM)', value: '39,150.00', change: '-0.12%', changeVal: -0.12 },
          { name: 'Russell 2000', value: '2,045.75', change: '+0.18%', changeVal: 0.18 },
        ],
      },
      {
        title: 'Commodity Futures',
        items: [
          { name: 'Crude Oil (CL)', value: '$114.54', change: '+3.60%', changeVal: 3.60 },
          { name: 'Gold (GC)', value: '$2,404.00', change: '+0.02%', changeVal: 0.02 },
          { name: 'Silver (SI)', value: '$33.84', change: '+2.11%', changeVal: 2.11 },
          { name: 'Natural Gas (NG)', value: '$3.82', change: '-1.20%', changeVal: -1.20 },
        ],
      },
      {
        title: 'Currency Futures',
        items: [
          { name: 'EUR/USD', value: '1.0696', change: '-0.20%', changeVal: -0.20 },
          { name: 'GBP/USD', value: '1.2634', change: '+0.14%', changeVal: 0.14 },
          { name: 'USD/JPY', value: '156.82', change: '+0.31%', changeVal: 0.31 },
        ],
      },
    ],
  },
  'Pre-Market': {
    tab: 'Pre-Market',
    type: 'pre-market',
    displayType: 'pre-market-table',
    preMarketSession: '8:00 AM — 9:30 AM ET',
    groups: [
      {
        title: 'Index Futures Pre-Market',
        items: [
          { name: 'S&P 500', value: '5,418.50', change: '+0.28%', changeVal: 0.28, note: 'vs previous close' },
          { name: 'NASDAQ', value: '18,930.25', change: '+0.41%', changeVal: 0.41, note: 'vs previous close' },
          { name: 'DOW', value: '39,180.00', change: '+0.08%', changeVal: 0.08, note: 'vs previous close' },
        ],
      },
      {
        title: 'Top Pre-Market Movers',
        items: [
          { name: 'NVDA', value: '$958.20', change: '+2.1%', changeVal: 2.1, note: 'Earnings beat' },
          { name: 'AAPL', value: '$199.50', change: '+0.6%', changeVal: 0.6, note: 'Upgrade' },
          { name: 'TSLA', value: '$178.30', change: '-1.8%', changeVal: -1.8, note: 'Delivery miss' },
        ],
      },
    ],
  },
};

// ============================================================================
// LAYER 2: CENTRAL BANKS
// ============================================================================

export const CENTRAL_BANKS = [
  { city: 'Washington DC', country: 'USA', bank: 'Federal Reserve', lat: 38.89, lng: -77.03, lastDecision: '2026-03-19', nextDecision: '2026-05-07' },
  { city: 'Frankfurt', country: 'Germany', bank: 'European Central Bank', lat: 50.11, lng: 8.68, lastDecision: '2026-03-12', nextDecision: '2026-04-10' },
  { city: 'London', country: 'UK', bank: 'Bank of England', lat: 51.51, lng: -0.13, lastDecision: '2026-02-06', nextDecision: '2026-05-15' },
  { city: 'Tokyo', country: 'Japan', bank: 'Bank of Japan', lat: 35.68, lng: 139.69, lastDecision: '2026-03-21', nextDecision: '2026-04-28' },
  { city: 'Beijing', country: 'China', bank: "People's Bank of China", lat: 39.91, lng: 116.39, lastDecision: '2026-02-20', nextDecision: '2026-04-15' },
  { city: 'Ottawa', country: 'Canada', bank: 'Bank of Canada', lat: 45.42, lng: -75.70, lastDecision: '2026-01-29', nextDecision: '2026-04-16' },
  { city: 'Canberra', country: 'Australia', bank: 'Reserve Bank of Australia', lat: -35.28, lng: 149.13, lastDecision: '2026-02-04', nextDecision: '2026-04-02' },
  { city: 'Bern', country: 'Switzerland', bank: 'Swiss National Bank', lat: 46.95, lng: 7.45, lastDecision: '2026-03-19', nextDecision: '2026-06-18' },
  { city: 'Mumbai', country: 'India', bank: 'Reserve Bank of India', lat: 19.08, lng: 72.88, lastDecision: '2026-02-07', nextDecision: '2026-04-09' },
  { city: 'Brasilia', country: 'Brazil', bank: 'Central Bank of Brazil', lat: -15.79, lng: -47.88, lastDecision: '2026-03-10', nextDecision: '2026-04-21' },
  { city: 'Pretoria', country: 'South Africa', bank: 'South African Reserve Bank', lat: -25.75, lng: 28.19, lastDecision: '2026-03-26', nextDecision: '2026-05-28' },
  { city: 'Seoul', country: 'South Korea', bank: 'Bank of Korea', lat: 37.57, lng: 126.98, lastDecision: '2026-01-15', nextDecision: '2026-04-16' },
  { city: 'Mexico City', country: 'Mexico', bank: 'Bank of Mexico', lat: 19.43, lng: -99.13, lastDecision: '2026-03-26', nextDecision: '2026-05-28' },
  { city: 'Stockholm', country: 'Sweden', bank: 'Sveriges Riksbank', lat: 59.33, lng: 18.07, lastDecision: '2026-02-12', nextDecision: '2026-04-23' },
  { city: 'Wellington', country: 'New Zealand', bank: 'Reserve Bank of New Zealand', lat: -41.29, lng: 174.78, lastDecision: '2026-02-05', nextDecision: '2026-04-08' },
];

export const CENTRAL_BANKS_DATA = {
  'Rate Decisions': {
    tab: 'Rate Decisions',
    type: 'rate-decisions',
    displayType: 'rate-decisions-table',
    upcoming: [
      { date: 'Apr 2, 2026', bank: 'Reserve Bank of Australia', current: '4.35%', expected: 'Hold', status: 'upcoming' },
      { date: 'Apr 10, 2026', bank: 'European Central Bank', current: '3.75%', expected: '-25bp', status: 'upcoming' },
      { date: 'Apr 16, 2026', bank: 'Bank of Canada', current: '4.50%', expected: '-25bp', status: 'upcoming' },
      { date: 'May 7, 2026', bank: 'Federal Reserve', current: '5.25%', expected: 'Hold', status: 'upcoming' },
      { date: 'May 15, 2026', bank: 'Bank of England', current: '4.50%', expected: '-25bp', status: 'upcoming' },
    ],
    recent: [
      { date: 'Mar 19, 2026', bank: 'Federal Reserve', decision: 'Held at 5.25%', outcome: '(as expected)' },
      { date: 'Mar 12, 2026', bank: 'ECB', decision: 'Cut to 3.75%', outcome: '(as expected)' },
      { date: 'Mar 5, 2026', bank: 'Bank of Canada', decision: 'Held at 4.50%', outcome: '(surprise)' },
    ],
  },
  Speeches: {
    tab: 'Speeches',
    type: 'speeches',
    displayType: 'speeches-table',
    upcoming: [
      { date: 'Mar 28', official: 'Fed Chair Powell', title: 'Economic Outlook', location: 'New York' },
      { date: 'Apr 3', official: 'ECB President Lagarde', title: 'Press Conference', location: 'Frankfurt' },
      { date: 'Apr 8', official: 'BOJ Governor Ueda', title: 'Policy Statement', location: 'Tokyo' },
      { date: 'Apr 15', official: 'Fed Vice Chair Jefferson', title: 'Financial Markets', location: 'Boston' },
    ],
    recent: [
      { date: 'Mar 24', official: 'Fed Vice Chair', title: 'Financial Stability', location: 'Washington DC' },
      { date: 'Mar 20', official: 'BOE Governor Bailey', title: 'Inflation Update', location: 'London' },
      { date: 'Mar 18', official: 'RBA Governor Bullock', title: 'Labour Market', location: 'Sydney' },
    ],
  },
};

// ============================================================================
// LAYER 3: INDICES
// ============================================================================

export const TRACKED_INDICES = [
  // Americas
  { country: 'USA', index: 'S&P 500', continent: 'americas', lat: 40.71, lng: -74.01, change: 0.34, changeVal: 0.34, mini: [0, 0.15, 0.34, 0.28, 0.18, 0.34] },
  { country: 'Canada', index: 'TSX', continent: 'americas', lat: 43.65, lng: -79.38, change: -0.12, changeVal: -0.12, mini: [-0.05, -0.08, -0.12, -0.10, -0.06, -0.12] },
  { country: 'Brazil', index: 'Bovespa', continent: 'americas', lat: -23.55, lng: -46.63, change: 1.20, changeVal: 1.20, mini: [0.4, 0.7, 1.0, 1.15, 1.18, 1.20] },
  { country: 'Mexico', index: 'IPC', continent: 'americas', lat: 19.43, lng: -99.13, change: -0.45, changeVal: -0.45, mini: [-0.1, -0.2, -0.3, -0.38, -0.42, -0.45] },
  { country: 'Argentina', index: 'Merval', continent: 'americas', lat: -34.60, lng: -58.38, change: 2.10, changeVal: 2.10, mini: [0.5, 1.0, 1.5, 1.8, 1.95, 2.10] },
  // Europe
  { country: 'UK', index: 'FTSE 100', continent: 'europe', lat: 51.51, lng: -0.13, change: -0.17, changeVal: -0.17, mini: [-0.05, -0.08, -0.15, -0.18, -0.17, -0.17] },
  { country: 'Germany', index: 'DAX', continent: 'europe', lat: 50.11, lng: 8.68, change: 0.52, changeVal: 0.52, mini: [0.1, 0.25, 0.4, 0.48, 0.52, 0.52] },
  { country: 'France', index: 'CAC 40', continent: 'europe', lat: 48.86, lng: 2.35, change: 0.28, changeVal: 0.28, mini: [0.05, 0.12, 0.2, 0.25, 0.27, 0.28] },
  { country: 'Switzerland', index: 'SMI', continent: 'europe', lat: 47.38, lng: 8.54, change: -0.08, changeVal: -0.08, mini: [0.02, -0.01, -0.05, -0.08, -0.08, -0.08] },
  { country: 'Netherlands', index: 'AEX', continent: 'europe', lat: 52.37, lng: 4.90, change: 0.41, changeVal: 0.41, mini: [0.1, 0.2, 0.3, 0.38, 0.40, 0.41] },
  { country: 'Spain', index: 'IBEX 35', continent: 'europe', lat: 40.42, lng: -3.70, change: 0.15, changeVal: 0.15, mini: [0.03, 0.08, 0.12, 0.14, 0.15, 0.15] },
  { country: 'Italy', index: 'FTSE MIB', continent: 'europe', lat: 41.90, lng: 12.50, change: -0.22, changeVal: -0.22, mini: [-0.05, -0.10, -0.17, -0.20, -0.22, -0.22] },
  { country: 'Sweden', index: 'OMX', continent: 'europe', lat: 59.33, lng: 18.07, change: 0.33, changeVal: 0.33, mini: [0.08, 0.15, 0.25, 0.30, 0.32, 0.33] },
  { country: 'Russia', index: 'MOEX', continent: 'europe', lat: 55.76, lng: 37.62, change: -1.50, changeVal: -1.50, mini: [-0.3, -0.6, -1.0, -1.3, -1.45, -1.50] },
  // Middle East
  { country: 'Saudi Arabia', index: 'Tadawul', continent: 'middle_east', lat: 24.71, lng: 46.68, change: 0.82, changeVal: 0.82, mini: [0.2, 0.4, 0.6, 0.75, 0.80, 0.82] },
  { country: 'UAE', index: 'ADX', continent: 'middle_east', lat: 24.45, lng: 54.65, change: 0.25, changeVal: 0.25, mini: [0.05, 0.10, 0.16, 0.22, 0.24, 0.25] },
  { country: 'Israel', index: 'TA-35', continent: 'middle_east', lat: 32.07, lng: 34.78, change: -0.60, changeVal: -0.60, mini: [-0.1, -0.25, -0.4, -0.52, -0.58, -0.60] },
  { country: 'Turkey', index: 'BIST 100', continent: 'middle_east', lat: 41.01, lng: 28.98, change: 1.10, changeVal: 1.10, mini: [0.2, 0.5, 0.8, 1.0, 1.08, 1.10] },
  { country: 'Qatar', index: 'QE Index', continent: 'middle_east', lat: 25.29, lng: 51.53, change: 0.12, changeVal: 0.12, mini: [0.02, 0.05, 0.08, 0.10, 0.12, 0.12] },
  // Africa
  { country: 'South Africa', index: 'JSE Top 40', continent: 'africa', lat: -26.20, lng: 28.04, change: -0.35, changeVal: -0.35, mini: [-0.08, -0.15, -0.25, -0.32, -0.34, -0.35] },
  { country: 'Nigeria', index: 'NGX ASI', continent: 'africa', lat: 6.45, lng: 3.40, change: 0.90, changeVal: 0.90, mini: [0.15, 0.35, 0.6, 0.80, 0.88, 0.90] },
  { country: 'Egypt', index: 'EGX 30', continent: 'africa', lat: 30.04, lng: 31.24, change: 0.55, changeVal: 0.55, mini: [0.10, 0.25, 0.38, 0.50, 0.54, 0.55] },
  { country: 'Kenya', index: 'NSE 20', continent: 'africa', lat: -1.29, lng: 36.82, change: -0.18, changeVal: -0.18, mini: [-0.02, -0.06, -0.11, -0.16, -0.17, -0.18] },
  // Asia
  { country: 'Japan', index: 'Nikkei 225', continent: 'asia', lat: 35.68, lng: 139.69, change: 0.95, changeVal: 0.95, mini: [0.15, 0.4, 0.65, 0.85, 0.92, 0.95] },
  { country: 'China', index: 'Shanghai Composite', continent: 'asia', lat: 31.23, lng: 121.47, change: -0.42, changeVal: -0.42, mini: [-0.08, -0.18, -0.30, -0.38, -0.41, -0.42] },
  { country: 'Hong Kong', index: 'Hang Seng', continent: 'asia', lat: 22.32, lng: 114.17, change: -0.68, changeVal: -0.68, mini: [-0.10, -0.28, -0.45, -0.60, -0.65, -0.68] },
  { country: 'South Korea', index: 'KOSPI', continent: 'asia', lat: 37.57, lng: 126.98, change: 0.30, changeVal: 0.30, mini: [0.05, 0.12, 0.20, 0.27, 0.29, 0.30] },
  { country: 'India', index: 'Nifty 50', continent: 'asia', lat: 19.08, lng: 72.88, change: 1.15, changeVal: 1.15, mini: [0.2, 0.5, 0.8, 1.0, 1.12, 1.15] },
  { country: 'Taiwan', index: 'TAIEX', continent: 'asia', lat: 25.03, lng: 121.57, change: 0.78, changeVal: 0.78, mini: [0.12, 0.35, 0.55, 0.72, 0.77, 0.78] },
  { country: 'Singapore', index: 'STI', continent: 'asia', lat: 1.35, lng: 103.82, change: -0.05, changeVal: -0.05, mini: [-0.01, -0.02, -0.04, -0.05, -0.05, -0.05] },
  { country: 'Indonesia', index: 'JCI', continent: 'asia', lat: -6.21, lng: 106.85, change: 0.22, changeVal: 0.22, mini: [0.04, 0.10, 0.16, 0.20, 0.22, 0.22] },
  // Oceania
  { country: 'Australia', index: 'ASX 200', continent: 'oceania', lat: -33.87, lng: 151.21, change: 0.45, changeVal: 0.45, mini: [0.08, 0.20, 0.32, 0.42, 0.44, 0.45] },
  { country: 'New Zealand', index: 'NZX 50', continent: 'oceania', lat: -36.85, lng: 174.76, change: -0.15, changeVal: -0.15, mini: [-0.02, -0.06, -0.10, -0.14, -0.15, -0.15] },
];

export const INDICES_DATA = {
  Global: { tab: 'Global', continent: null },
  Americas: { tab: 'Americas', continent: 'americas' },
  Europe: { tab: 'Europe', continent: 'europe' },
  'Middle East': { tab: 'Middle East', continent: 'middle_east' },
  Africa: { tab: 'Africa', continent: 'africa' },
  Asia: { tab: 'Asia', continent: 'asia' },
  Oceania: { tab: 'Oceania', continent: 'oceania' },
};

// ============================================================================
// LAYER 4: COMMODITIES
// ============================================================================

export const COMMODITIES_DATA = {
  Energy: {
    tab: 'Energy',
    type: 'energy',
    displayType: 'commodities-list',
    items: [
      { name: 'Crude Oil (WTI)', symbol: 'CL', value: '$114.54', change: '+3.60%', changeVal: 3.60 },
      { name: 'Brent Crude', symbol: 'BRENT', value: '$118.20', change: '+3.10%', changeVal: 3.10 },
      { name: 'Natural Gas', symbol: 'NG', value: '$3.82', change: '-1.20%', changeVal: -1.20 },
      { name: 'Gasoline (RBOB)', symbol: 'RB', value: '$3.45', change: '+0.80%', changeVal: 0.80 },
      { name: 'Heating Oil', symbol: 'HO', value: '$3.92', change: '+1.40%', changeVal: 1.40 },
    ],
  },
  Metals: {
    tab: 'Metals',
    type: 'metals',
    displayType: 'commodities-list',
    items: [
      { name: 'Gold', symbol: 'GC', value: '$2,404.13', change: '+0.02%', changeVal: 0.02 },
      { name: 'Silver', symbol: 'SI', value: '$33.84', change: '+2.11%', changeVal: 2.11 },
      { name: 'Copper', symbol: 'HG', value: '$4.52', change: '-0.40%', changeVal: -0.40 },
      { name: 'Platinum', symbol: 'PL', value: '$1,024.00', change: '+1.30%', changeVal: 1.30 },
      { name: 'Palladium', symbol: 'PA', value: '$985.00', change: '-0.80%', changeVal: -0.80 },
      { name: 'Iron Ore', symbol: 'ORE', value: '$108.50', change: '+0.60%', changeVal: 0.60 },
    ],
  },
  Agriculture: {
    tab: 'Agriculture',
    type: 'agriculture',
    displayType: 'commodities-list',
    items: [
      { name: 'Wheat', symbol: 'ZWC', value: '$6.82', change: '-1.20%', changeVal: -1.20 },
      { name: 'Corn', symbol: 'ZCC', value: '$4.95', change: '+0.30%', changeVal: 0.30 },
      { name: 'Soybeans', symbol: 'ZSC', value: '$12.40', change: '-0.60%', changeVal: -0.60 },
      { name: 'Coffee', symbol: 'KCC', value: '$2.18', change: '+4.20%', changeVal: 4.20 },
      { name: 'Cotton', symbol: 'CTZ', value: '$0.82', change: '+0.15%', changeVal: 0.15 },
      { name: 'Sugar', symbol: 'SBK', value: '$0.24', change: '-0.50%', changeVal: -0.50 },
      { name: 'Cocoa', symbol: 'CCK', value: '$8,450.00', change: '+2.30%', changeVal: 2.30 },
      { name: 'Lumber', symbol: 'LBZ', value: '$520.00', change: '+0.90%', changeVal: 0.90 },
    ],
  },
};

// ============================================================================
// LAYER 5: CURRENCIES
// ============================================================================

export const CURRENCIES_DATA = {
  Global: {
    tab: 'Global',
    continent: null,
    items: [
      { country: 'UK', code: 'GBP', emoji: '🇬🇧', value: '1.2634', change: '+0.14%', changeVal: 0.14 },
      { country: 'Eurozone', code: 'EUR', emoji: '🇪🇺', value: '1.0696', change: '-0.20%', changeVal: -0.20 },
      { country: 'Japan', code: 'JPY', emoji: '🇯🇵', value: '156.82', change: '-0.31%', changeVal: -0.31 },
      { country: 'Switzerland', code: 'CHF', emoji: '🇨🇭', value: '0.8845', change: '+0.08%', changeVal: 0.08 },
      { country: 'Canada', code: 'CAD', emoji: '🇨🇦', value: '1.36', change: '-0.15%', changeVal: -0.15 },
      { country: 'Australia', code: 'AUD', emoji: '🇦🇺', value: '0.6540', change: '+0.18%', changeVal: 0.18 },
      { country: 'New Zealand', code: 'NZD', emoji: '🇳🇿', value: '0.5980', change: '-0.12%', changeVal: -0.12 },
      { country: 'China', code: 'CNY', emoji: '🇨🇳', value: '7.24', change: '-0.10%', changeVal: -0.10 },
    ],
  },
  Americas: {
    tab: 'Americas',
    continent: 'americas',
    items: [
      { country: 'Canadian Dollar', code: 'CAD', emoji: '🇨🇦', value: '1.36', change: '-0.15%', changeVal: -0.15 },
      { country: 'Brazilian Real', code: 'BRL', emoji: '🇧🇷', value: '5.02', change: '+0.40%', changeVal: 0.40 },
      { country: 'Mexican Peso', code: 'MXN', emoji: '🇲🇽', value: '17.15', change: '+0.22%', changeVal: 0.22 },
      { country: 'Argentine Peso', code: 'ARS', emoji: '🇦🇷', value: '890.50', change: '-0.80%', changeVal: -0.80 },
      { country: 'Chilean Peso', code: 'CLP', emoji: '🇨🇱', value: '935.00', change: '+0.10%', changeVal: 0.10 },
      { country: 'Colombian Peso', code: 'COP', emoji: '🇨🇴', value: '3,925.00', change: '-0.30%', changeVal: -0.30 },
    ],
  },
  Europe: {
    tab: 'Europe',
    continent: 'europe',
    items: [
      { country: 'British Pound', code: 'GBP', emoji: '🇬🇧', value: '1.2634', change: '+0.14%', changeVal: 0.14 },
      { country: 'Euro', code: 'EUR', emoji: '🇪🇺', value: '1.0696', change: '-0.20%', changeVal: -0.20 },
      { country: 'Swiss Franc', code: 'CHF', emoji: '🇨🇭', value: '0.8845', change: '+0.08%', changeVal: 0.08 },
      { country: 'Swedish Krona', code: 'SEK', emoji: '🇸🇪', value: '10.52', change: '-0.25%', changeVal: -0.25 },
      { country: 'Norwegian Krone', code: 'NOK', emoji: '🇳🇴', value: '10.78', change: '+0.18%', changeVal: 0.18 },
      { country: 'Polish Zloty', code: 'PLN', emoji: '🇵🇱', value: '3.98', change: '+0.12%', changeVal: 0.12 },
      { country: 'Russian Ruble', code: 'RUB', emoji: '🇷🇺', value: '92.50', change: '-0.45%', changeVal: -0.45 },
    ],
  },
  'Middle East': {
    tab: 'Middle East',
    continent: 'middle_east',
    items: [
      { country: 'Saudi Riyal', code: 'SAR', emoji: '🇸🇦', value: '3.75', change: '─ 0.00%', changeVal: 0.00 },
      { country: 'UAE Dirham', code: 'AED', emoji: '🇦🇪', value: '3.67', change: '─ 0.00%', changeVal: 0.00 },
      { country: 'Israeli Shekel', code: 'ILS', emoji: '🇮🇱', value: '3.62', change: '+0.30%', changeVal: 0.30 },
      { country: 'Turkish Lira', code: 'TRY', emoji: '🇹🇷', value: '32.15', change: '-0.60%', changeVal: -0.60 },
      { country: 'Qatari Riyal', code: 'QAR', emoji: '🇶🇦', value: '3.64', change: '─ 0.00%', changeVal: 0.00 },
    ],
  },
  Africa: {
    tab: 'Africa',
    continent: 'africa',
    items: [
      { country: 'South African Rand', code: 'ZAR', emoji: '🇿🇦', value: '18.45', change: '-0.35%', changeVal: -0.35 },
      { country: 'Nigerian Naira', code: 'NGN', emoji: '🇳🇬', value: '1,550.00', change: '-1.20%', changeVal: -1.20 },
      { country: 'Egyptian Pound', code: 'EGP', emoji: '🇪🇬', value: '47.50', change: '-0.15%', changeVal: -0.15 },
      { country: 'Kenyan Shilling', code: 'KES', emoji: '🇰🇪', value: '129.50', change: '+0.08%', changeVal: 0.08 },
      { country: 'Ghanaian Cedi', code: 'GHS', emoji: '🇬🇭', value: '14.80', change: '-0.40%', changeVal: -0.40 },
    ],
  },
  Asia: {
    tab: 'Asia',
    continent: 'asia',
    items: [
      { country: 'Japanese Yen', code: 'JPY', emoji: '🇯🇵', value: '156.82', change: '-0.31%', changeVal: -0.31 },
      { country: 'Chinese Yuan', code: 'CNY', emoji: '🇨🇳', value: '7.24', change: '-0.10%', changeVal: -0.10 },
      { country: 'Indian Rupee', code: 'INR', emoji: '🇮🇳', value: '83.15', change: '+0.05%', changeVal: 0.05 },
      { country: 'South Korean Won', code: 'KRW', emoji: '🇰🇷', value: '1,335.00', change: '+0.20%', changeVal: 0.20 },
      { country: 'Singapore Dollar', code: 'SGD', emoji: '🇸🇬', value: '1.34', change: '+0.08%', changeVal: 0.08 },
      { country: 'Thai Baht', code: 'THB', emoji: '🇹🇭', value: '35.40', change: '-0.15%', changeVal: -0.15 },
      { country: 'Indonesian Rupiah', code: 'IDR', emoji: '🇮🇩', value: '15,680.00', change: '-0.22%', changeVal: -0.22 },
    ],
  },
  Oceania: {
    tab: 'Oceania',
    continent: 'oceania',
    items: [
      { country: 'Australian Dollar', code: 'AUD', emoji: '🇦🇺', value: '0.6540', change: '+0.18%', changeVal: 0.18 },
      { country: 'New Zealand Dollar', code: 'NZD', emoji: '🇳🇿', value: '0.5980', change: '-0.12%', changeVal: -0.12 },
    ],
  },
};

// Helper function to check if a central bank has a recent or upcoming decision
export function hasRecentOrUpcomingCBDecision(cbData) {
  const today = new Date();
  const last30Days = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
  const next60Days = new Date(today.getTime() + 60 * 24 * 60 * 60 * 1000);
  
  const lastDecision = new Date(cbData.lastDecision);
  const nextDecision = new Date(cbData.nextDecision);
  
  return (lastDecision >= last30Days && lastDecision <= today) || 
         (nextDecision >= today && nextDecision <= next60Days);
}
