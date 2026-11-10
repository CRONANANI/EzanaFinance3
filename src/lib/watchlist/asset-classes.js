/**
 * Watchlist asset classes and the fixed universes for the classes that are
 * not screened (Nov 2026, Market Monitor redesign + Smart Watchlists).
 *
 * Pure data and helpers, safe on client and server. The `type` of each class
 * is the value stored in user_watchlist_items.type and in
 * smart_watchlist_rules.asset_class.
 *
 * Stocks are screened from the whole US market by the smart watchlist engine;
 * politicians come from congress_members. Bond ETFs, commodities and crypto
 * use the universes below (the same symbols the page tracked before).
 */

export const ASSET_CLASSES = [
  { id: 'stocks', type: 'stock', label: 'Stocks', singular: 'stock', icon: 'bi-graph-up' },
  { id: 'bonds', type: 'bond_etf', label: 'Bond ETFs', singular: 'bond ETF', icon: 'bi-bank' },
  {
    id: 'commodities',
    type: 'commodity',
    label: 'Commodities',
    singular: 'commodity',
    icon: 'bi-droplet-half',
  },
  {
    id: 'politicians',
    type: 'politician',
    label: 'Politicians',
    singular: 'politician',
    icon: 'bi-person-badge',
  },
  {
    id: 'crypto',
    type: 'crypto',
    label: 'Crypto',
    singular: 'crypto asset',
    icon: 'bi-currency-bitcoin',
  },
];

export const CLASS_BY_ID = Object.fromEntries(ASSET_CLASSES.map((c) => [c.id, c]));
export const CLASS_BY_TYPE = Object.fromEntries(ASSET_CLASSES.map((c) => [c.type, c]));
export const ITEM_TYPES = ASSET_CLASSES.map((c) => c.type);

/** Class id for a stored item type ('bond' and unknown types fall back sensibly). */
export function classIdOfType(type) {
  if (type === 'bond') return 'bonds';
  return CLASS_BY_TYPE[type]?.id || 'stocks';
}

export const BOND_ETFS = [
  { ticker: 'TLT', name: '20+ Year Treasury' },
  { ticker: 'IEF', name: '7-10 Year Treasury' },
  { ticker: 'SHY', name: '1-3 Year Treasury' },
  { ticker: 'GOVT', name: 'US Treasury Bond' },
  { ticker: 'SGOV', name: '0-3 Month Treasury' },
  { ticker: 'AGG', name: 'Aggregate Bond' },
  { ticker: 'BND', name: 'Total Bond Market' },
  { ticker: 'LQD', name: 'Investment Grade Corp' },
  { ticker: 'VCIT', name: 'Intermediate Corp' },
  { ticker: 'HYG', name: 'High Yield Corp' },
  { ticker: 'JNK', name: 'High Yield Bond' },
  { ticker: 'TIP', name: 'TIPS' },
  { ticker: 'MUB', name: 'National Muni' },
  { ticker: 'EMB', name: 'Emerging Markets' },
  { ticker: 'BNDX', name: 'Total International Bond' },
];

export const COMMODITIES = [
  { ticker: 'GC=F', name: 'Gold' },
  { ticker: 'SI=F', name: 'Silver' },
  { ticker: 'PL=F', name: 'Platinum' },
  { ticker: 'PA=F', name: 'Palladium' },
  { ticker: 'HG=F', name: 'Copper' },
  { ticker: 'CL=F', name: 'Oil (WTI)' },
  { ticker: 'NG=F', name: 'Natural gas' },
  { ticker: 'ZW=F', name: 'Wheat' },
  { ticker: 'ZC=F', name: 'Corn' },
];

export const CRYPTO = [
  { ticker: 'BTCUSD', name: 'Bitcoin', display: 'BTC' },
  { ticker: 'ETHUSD', name: 'Ethereum', display: 'ETH' },
  { ticker: 'SOLUSD', name: 'Solana', display: 'SOL' },
  { ticker: 'BNBUSD', name: 'BNB', display: 'BNB' },
  { ticker: 'XRPUSD', name: 'XRP', display: 'XRP' },
  { ticker: 'ADAUSD', name: 'Cardano', display: 'ADA' },
  { ticker: 'DOGEUSD', name: 'Dogecoin', display: 'DOGE' },
  { ticker: 'AVAXUSD', name: 'Avalanche', display: 'AVAX' },
  { ticker: 'DOTUSD', name: 'Polkadot', display: 'DOT' },
  { ticker: 'LINKUSD', name: 'Chainlink', display: 'LINK' },
  { ticker: 'LTCUSD', name: 'Litecoin', display: 'LTC' },
];

export const FIXED_UNIVERSE = { bond_etf: BOND_ETFS, commodity: COMMODITIES, crypto: CRYPTO };

const DISPLAY = Object.fromEntries(CRYPTO.map((c) => [c.ticker, c.display]));
const NAMES = Object.fromEntries(
  [...BOND_ETFS, ...COMMODITIES, ...CRYPTO].map((u) => [u.ticker, u.name]),
);

/** The symbol people read: BTCUSD -> BTC, GC=F -> GC=F, BRK.B stays. */
export const displayTicker = (ticker) => DISPLAY[ticker] || ticker;

/** A known short name for a fixed-universe symbol, else null. */
export const universeName = (ticker) => NAMES[ticker] || null;

/** Does this item have a market price (everything but politicians)? */
export const isPriced = (type) => type !== 'politician';
