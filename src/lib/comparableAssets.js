/** @typedef {{ ticker: string; name: string; price: number; change: number; changePct: number; marketCap: string; volume: string }} ComparableRow */

/** @type {Record<string, ComparableRow[]>} */
export const COMPARABLE_ASSETS = {
  AAPL: [
    { ticker: 'MSFT', name: 'Microsoft', price: 415.2, change: 2.1, changePct: 0.51, marketCap: '3.08T', volume: '18.2M' },
    { ticker: 'GOOGL', name: 'Alphabet', price: 175.4, change: -0.8, changePct: -0.45, marketCap: '2.19T', volume: '22.1M' },
    { ticker: 'META', name: 'Meta Platforms', price: 523.1, change: 5.3, changePct: 1.02, marketCap: '1.33T', volume: '14.5M' },
    { ticker: 'AMZN', name: 'Amazon', price: 198.7, change: 1.2, changePct: 0.61, marketCap: '2.08T', volume: '31.4M' },
    { ticker: 'NVDA', name: 'NVIDIA', price: 875.4, change: 12.5, changePct: 1.45, marketCap: '2.16T', volume: '42.3M' },
  ],
  MSFT: [
    { ticker: 'AAPL', name: 'Apple', price: 189.3, change: 1.4, changePct: 0.74, marketCap: '2.93T', volume: '52.1M' },
    { ticker: 'GOOGL', name: 'Alphabet', price: 175.4, change: -0.8, changePct: -0.45, marketCap: '2.19T', volume: '22.1M' },
    { ticker: 'ORCL', name: 'Oracle', price: 138.2, change: 0.9, changePct: 0.66, marketCap: '381B', volume: '8.4M' },
    { ticker: 'CRM', name: 'Salesforce', price: 276.8, change: -1.2, changePct: -0.43, marketCap: '268B', volume: '5.2M' },
    { ticker: 'SAP', name: 'SAP SE', price: 198.1, change: 0.4, changePct: 0.2, marketCap: '230B', volume: '1.1M' },
  ],
  GOOGL: [
    { ticker: 'META', name: 'Meta Platforms', price: 523.1, change: 5.3, changePct: 1.02, marketCap: '1.33T', volume: '14.5M' },
    { ticker: 'MSFT', name: 'Microsoft', price: 415.2, change: 2.1, changePct: 0.51, marketCap: '3.08T', volume: '18.2M' },
    { ticker: 'SNAP', name: 'Snap Inc', price: 16.4, change: -0.3, changePct: -1.8, marketCap: '26B', volume: '18.8M' },
    { ticker: 'TTD', name: 'Trade Desk', price: 98.2, change: 1.1, changePct: 1.13, marketCap: '49B', volume: '3.2M' },
    { ticker: 'PINS', name: 'Pinterest', price: 38.7, change: 0.5, changePct: 1.31, marketCap: '25B', volume: '7.6M' },
  ],
  NVDA: [
    { ticker: 'AMD', name: 'AMD', price: 172.4, change: 3.2, changePct: 1.89, marketCap: '279B', volume: '38.2M' },
    { ticker: 'INTC', name: 'Intel', price: 30.1, change: -0.4, changePct: -1.31, marketCap: '128B', volume: '42.1M' },
    { ticker: 'QCOM', name: 'Qualcomm', price: 168.5, change: 1.8, changePct: 1.08, marketCap: '188B', volume: '6.8M' },
    { ticker: 'AVGO', name: 'Broadcom', price: 1423.0, change: 18.4, changePct: 1.31, marketCap: '666B', volume: '2.1M' },
    { ticker: 'MU', name: 'Micron', price: 128.3, change: 2.1, changePct: 1.66, marketCap: '142B', volume: '14.5M' },
  ],
  SPY: [
    { ticker: 'QQQ', name: 'Nasdaq 100 ETF', price: 448.2, change: 2.1, changePct: 0.47, marketCap: '246B', volume: '32.1M' },
    { ticker: 'IWM', name: 'Russell 2000 ETF', price: 208.4, change: -0.8, changePct: -0.38, marketCap: '72B', volume: '28.6M' },
    { ticker: 'VTI', name: 'Total Mkt ETF', price: 248.6, change: 0.9, changePct: 0.36, marketCap: '420B', volume: '4.2M' },
    { ticker: 'DIA', name: 'Dow ETF', price: 412.1, change: 0.6, changePct: 0.15, marketCap: '38B', volume: '4.1M' },
    { ticker: 'VOO', name: 'S&P 500 ETF', price: 512.3, change: 1.1, changePct: 0.22, marketCap: '410B', volume: '5.8M' },
  ],
  DEFAULT: [
    { ticker: 'SPY', name: 'S&P 500 ETF', price: 524.8, change: 1.2, changePct: 0.23, marketCap: '490B', volume: '68.4M' },
    { ticker: 'QQQ', name: 'Nasdaq 100 ETF', price: 448.2, change: 2.1, changePct: 0.47, marketCap: '246B', volume: '32.1M' },
    { ticker: 'IWM', name: 'Russell 2000 ETF', price: 208.4, change: -0.8, changePct: -0.38, marketCap: '72B', volume: '28.6M' },
    { ticker: 'VTI', name: 'Total Mkt ETF', price: 248.6, change: 0.9, changePct: 0.36, marketCap: '420B', volume: '4.2M' },
    { ticker: 'GLD', name: 'Gold ETF', price: 218.3, change: 1.4, changePct: 0.64, marketCap: '58B', volume: '8.8M' },
  ],
};

/**
 * @param {string} ticker
 * @returns {ComparableRow[]}
 */
export function getComparableAssets(ticker) {
  const key = (ticker || '').toUpperCase().replace(/\./g, '-');
  const rows = COMPARABLE_ASSETS[key] || COMPARABLE_ASSETS.DEFAULT;
  return rows.slice(0, 5);
}
