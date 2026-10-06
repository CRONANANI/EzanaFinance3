/**
 * The ETF universe for /datasets/etf-holdings: 50 of the largest US-listed ETFs
 * by assets (equity, bond and international). Curated by hand; each ticker is
 * resolved to its SEC series through company_tickers_mf.json. Tickers that do
 * not resolve (commodity and spot-crypto grantor trusts do not file Form
 * N-PORT, nor do unit investment trusts) are stored as 'no_nport' and never
 * shown as having holdings.
 */
export const ETF_UNIVERSE = [
  // US equity: broad market
  'SPY',
  'IVV',
  'VOO',
  'VTI',
  'QQQ',
  'SPLG',
  'ITOT',
  'SCHX',
  'RSP',
  'IWM',
  'IJH',
  'IJR',
  'VO',
  'VB',
  'IWB',
  // US equity: style, sector, dividend
  'VUG',
  'VTV',
  'IWF',
  'IWD',
  'SCHG',
  'SCHD',
  'VIG',
  'VYM',
  'VGT',
  'XLK',
  'XLF',
  'XLV',
  'XLE',
  'QUAL',
  'JEPI',
  // International equity
  'VEA',
  'IEFA',
  'VXUS',
  'IEMG',
  'VWO',
  'EFA',
  'VT',
  // Fixed income
  'BND',
  'AGG',
  'BNDX',
  'TLT',
  'VCIT',
  'MUB',
  'VTEB',
  'BIL',
  'SGOV',
  'IEF',
  // Real estate
  'VNQ',
  // Commodity and spot-crypto trusts (no N-PORT; listed so the page can say so)
  'GLD',
  'IBIT',
];
