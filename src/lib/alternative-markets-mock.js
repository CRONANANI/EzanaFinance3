/**
 * Alternative Markets — combines crypto + commodities mock data.
 */
import {
  CRYPTO_STATS,
  CRYPTO_ROWS,
  ONCHAIN,
  CRYPTO_NEWS,
} from '@/lib/crypto-research-mock';
import {
  COMMODITY_STATS,
  COMMODITY_ROWS,
  SUPPLY_DEMAND,
  COMM_NEWS,
} from '@/lib/commodities-research-mock';

export { CRYPTO_STATS, COMMODITY_STATS, ONCHAIN, SUPPLY_DEMAND, CRYPTO_NEWS, COMM_NEWS };

/** Pad to 20 rows for crypto price table */
const EXTRA_CRYPTO = [
  { tier: 'top', name: 'BNB', price: '$612.00', chg: '+0.45%', pos: true, mcap: '$89B' },
  { tier: 'top', name: 'Dogecoin (DOGE)', price: '$0.142', chg: '+2.10%', pos: true, mcap: '$21B' },
  { tier: 'top', name: 'Tron (TRX)', price: '$0.168', chg: '-0.30%', pos: false, mcap: '$14B' },
  { tier: 'top', name: 'Shiba Inu (SHIB)', price: '$0.000024', chg: '+1.20%', pos: true, mcap: '$14B' },
  { tier: 'top', name: 'Litecoin (LTC)', price: '$78.20', chg: '-0.80%', pos: false, mcap: '$5.8B' },
  { tier: 'top', name: 'Near (NEAR)', price: '$5.42', chg: '+3.80%', pos: true, mcap: '$5.1B' },
  { tier: 'top', name: 'Aptos (APT)', price: '$9.88', chg: '+1.50%', pos: true, mcap: '$4.2B' },
];

export const CRYPTO_ROWS_TOP20 = [...CRYPTO_ROWS, ...EXTRA_CRYPTO].slice(0, 20);

export const CRYPTO_TABLE_TABS = [
  { id: 'all', label: 'All' },
  { id: 'top', label: 'Top 20' },
  { id: 'defi', label: 'DeFi' },
  { id: 'l1', label: 'Layer 1' },
  { id: 'meme', label: 'Memecoins' },
];

export const COMMODITY_TABLE_TABS = [
  { id: 'all', label: 'All' },
  { id: 'energy', label: 'Energy' },
  { id: 'metals', label: 'Metals' },
  { id: 'ag', label: 'Agriculture' },
];

const COMM_TICKERS = ['WTI', 'NATGAS', 'BRENT', 'RBOB', 'GOLD', 'SILVER', 'COPPER', 'PLAT', 'WHEAT', 'CORN', 'SOY', 'COFFEE'];

/** Commodity rows with ticker for table */
export const COMMODITY_TABLE_ROWS = COMMODITY_ROWS.map((r, i) => ({
  ...r,
  ticker: COMM_TICKERS[i] || 'COMM',
  volLabel: i % 3 === 0 ? '2.4M vol' : i % 3 === 1 ? '890K vol' : '1.1M vol',
  sparkSeed: r.name.split('').reduce((a, c) => a + c.charCodeAt(0), 0),
}));

/** 5 biggest winners + 5 losers across crypto & commodities (combined, static mock) */
export const COMBINED_WINNERS = [
  { rank: 1, sym: 'AVAX', chg: '+8.4%', price: '$36.80', pos: true },
  { rank: 2, sym: 'COFFEE', chg: '+4.2%', price: '$2.18', pos: true },
  { rank: 3, sym: 'SOL', chg: '+3.2%', price: '$148.50', pos: true },
  { rank: 4, sym: 'OIL', chg: '+3.6%', price: '$114.54', pos: true },
  { rank: 5, sym: 'LINK', chg: '+1.8%', price: '$14.90', pos: true },
];

export const COMBINED_LOSERS = [
  { rank: 1, sym: 'BTC', chg: '-1.9%', price: '$39,280', pos: false },
  { rank: 2, sym: 'WHEAT', chg: '-1.2%', price: '$6.82', pos: false },
  { rank: 3, sym: 'ADA', chg: '-0.6%', price: '$0.45', pos: false },
  { rank: 4, sym: 'COPPER', chg: '-0.4%', price: '$4.52', pos: false },
  { rank: 5, sym: 'CORN', chg: '-0.2%', price: '$4.95', pos: false },
];

/** Crypto-only winners and losers */
export const CRYPTO_WINNERS = [
  { rank: 1, sym: 'AVAX', chg: '+8.4%', price: '$36.80', pos: true },
  { rank: 2, sym: 'SOL', chg: '+3.2%', price: '$148.50', pos: true },
  { rank: 3, sym: 'LINK', chg: '+1.8%', price: '$14.90', pos: true },
  { rank: 4, sym: 'ETH', chg: '+1.2%', price: '$2,456.80', pos: true },
  { rank: 5, sym: 'BNB', chg: '+0.9%', price: '$648.20', pos: true },
];

export const CRYPTO_LOSERS = [
  { rank: 1, sym: 'BTC', chg: '-1.9%', price: '$39,280', pos: false },
  { rank: 2, sym: 'ADA', chg: '-0.6%', price: '$0.45', pos: false },
  { rank: 3, sym: 'DOT', chg: '-0.8%', price: '$8.42', pos: false },
  { rank: 4, sym: 'XRP', chg: '-0.6%', price: '$2.18', pos: false },
  { rank: 5, sym: 'MATIC', chg: '-0.3%', price: '$0.98', pos: false },
];

/** Commodity-only winners and losers */
export const COMMODITY_WINNERS = [
  { rank: 1, sym: 'COFFEE', chg: '+4.2%', price: '$2.18', pos: true },
  { rank: 2, sym: 'OIL', chg: '+3.6%', price: '$114.54', pos: true },
  { rank: 3, sym: 'GOLD', chg: '+2.4%', price: '$2,648.50', pos: true },
  { rank: 4, sym: 'SILVER', chg: '+1.8%', price: '$31.20', pos: true },
  { rank: 5, sym: 'NAT_GAS', chg: '+1.2%', price: '$2.85', pos: true },
];

export const COMMODITY_LOSERS = [
  { rank: 1, sym: 'WHEAT', chg: '-1.2%', price: '$6.82', pos: false },
  { rank: 2, sym: 'COPPER', chg: '-0.4%', price: '$4.52', pos: false },
  { rank: 3, sym: 'CORN', chg: '-0.2%', price: '$4.95', pos: false },
  { rank: 4, sym: 'SOYBEANS', chg: '-0.4%', price: '$12.45', pos: false },
  { rank: 5, sym: 'COAL', chg: '-0.3%', price: '$85.60', pos: false },
];

export const COMMUNITY_SENTIMENT_TOPICS = [
  {
    id: '1',
    title: 'Bitcoin Price Direction',
    bullishPct: 78,
    bearishPct: 22,
    discussing: 342,
  },
  {
    id: '2',
    title: 'Oil & OPEC Decision',
    bullishPct: 65,
    bearishPct: 35,
    discussing: 218,
  },
  {
    id: '3',
    title: 'Gold as Inflation Hedge',
    bullishPct: 89,
    bearishPct: 11,
    discussing: 156,
  },
];
