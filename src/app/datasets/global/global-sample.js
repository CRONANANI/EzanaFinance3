/**
 * Representative SAMPLE data for the public Global & Macro / Wealth dataset
 * page. Static, illustrative billionaire/wealth rows (name, net worth, source
 * company, country, YTD change) plus a small macro-indicator snapshot. NOT
 * live data — the page labels it as a sample and links into the app.
 */

export const WEALTH_SAMPLE = [
  {
    id: 'w1',
    name: 'Elon Musk',
    netWorth: '$232.0B',
    ticker: 'TSLA',
    country: 'United States',
    ytd: 8.4,
  },
  {
    id: 'w2',
    name: 'Jeff Bezos',
    netWorth: '$201.0B',
    ticker: 'AMZN',
    country: 'United States',
    ytd: 5.1,
  },
  {
    id: 'w3',
    name: 'Bernard Arnault',
    netWorth: '$188.0B',
    ticker: 'MC.PA',
    country: 'France',
    ytd: -3.2,
  },
  {
    id: 'w4',
    name: 'Mark Zuckerberg',
    netWorth: '$177.0B',
    ticker: 'META',
    country: 'United States',
    ytd: 11.6,
  },
  {
    id: 'w5',
    name: 'Larry Ellison',
    netWorth: '$164.0B',
    ticker: 'ORCL',
    country: 'United States',
    ytd: 6.8,
  },
  {
    id: 'w6',
    name: 'Jensen Huang',
    netWorth: '$118.0B',
    ticker: 'NVDA',
    country: 'United States',
    ytd: 18.9,
  },
  {
    id: 'w7',
    name: 'Warren Buffett',
    netWorth: '$142.0B',
    ticker: 'BRK.B',
    country: 'United States',
    ytd: 4.2,
  },
  {
    id: 'w8',
    name: 'Larry Page',
    netWorth: '$148.0B',
    ticker: 'GOOGL',
    country: 'United States',
    ytd: 2.7,
  },
  {
    id: 'w9',
    name: 'Sergey Brin',
    netWorth: '$141.0B',
    ticker: 'GOOGL',
    country: 'United States',
    ytd: 2.5,
  },
  {
    id: 'w10',
    name: 'Mukesh Ambani',
    netWorth: '$112.0B',
    ticker: 'RELIANCE.NS',
    country: 'India',
    ytd: -1.4,
  },
];

/** Sample macro snapshot (illustrative World Bank / macro indicators). */
export const MACRO_SNAPSHOT = [
  { name: 'US Real GDP growth', meta: 'United States · annual', value: '+2.4%', tone: 'pos' },
  { name: 'US CPI (YoY)', meta: 'United States · monthly', value: '3.1%' },
  { name: 'US Unemployment', meta: 'United States · monthly', value: '4.0%' },
  { name: 'China Real GDP growth', meta: 'China · annual', value: '+4.8%', tone: 'pos' },
  { name: 'Euro Area inflation', meta: 'Euro Area · monthly', value: '2.3%' },
];
