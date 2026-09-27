/**
 * The fixture from 04-SPEC.md section 10. Illustrative, cached, never live.
 *
 * Every member is `[Member name]` with a real-shaped district code. That is
 * not a placeholder left in by accident: attaching an invented trade to a real
 * public official is the one thing this page must never do, so the sample data
 * carries no real names at all. A live page never shows a placeholder and a
 * sample page never shows a real name.
 *
 * Real figures where the brief gives them: 45,000+ filings across 19 index
 * years, about 2,300 PTRs in 2013, 400 in 2026 to date, 11 filings in 2014.
 */

const M = (n) => `[Member name ${n}]`;

/* Brackets exactly as the law states them. */
export const BRACKETS = [
  '$1,001 - $15,000',
  '$15,001 - $50,000',
  '$50,001 - $100,000',
  '$100,001 - $250,000',
  '$250,001 - $500,000',
  'Over $500,000',
];

/* Tickers per the spec, plus a T-bill and an ETF so the no-ticker case and the
   fund case are both designed rather than discovered later. */
export const FIXTURE_TRADES = [
  {
    id: 1,
    member: M(1),
    party: 'D',
    state: 'CA',
    district: '12',
    ticker: 'NVDA',
    asset: 'NVIDIA Corporation',
    type: 'P',
    traded: '2026-09-02',
    filed: '2026-09-18',
    lag: 16,
    bracket: '$15,001 - $50,000',
    doc: '100012345',
  },
  {
    id: 2,
    member: M(2),
    party: 'R',
    state: 'TX',
    district: '02',
    ticker: 'MSFT',
    asset: 'Microsoft Corporation',
    type: 'S',
    traded: '2026-09-01',
    filed: '2026-09-15',
    lag: 14,
    bracket: '$50,001 - $100,000',
    doc: '100012346',
  },
  {
    id: 3,
    member: M(3),
    party: 'D',
    state: 'NY',
    district: '07',
    ticker: 'AAPL',
    asset: 'Apple Inc.',
    type: 'P',
    traded: '2026-08-21',
    filed: '2026-09-04',
    lag: 14,
    bracket: '$1,001 - $15,000',
    doc: '100012347',
  },
  {
    id: 4,
    member: M(1),
    party: 'D',
    state: 'CA',
    district: '12',
    ticker: 'LMT',
    asset: 'Lockheed Martin Corporation',
    type: 'P',
    traded: '2026-08-14',
    filed: '2026-10-08',
    lag: 55,
    bracket: '$100,001 - $250,000',
    doc: '100012348',
  },
  {
    id: 5,
    member: M(4),
    party: 'R',
    state: 'FL',
    district: '19',
    ticker: 'XOM',
    asset: 'Exxon Mobil Corporation',
    type: 'S',
    traded: '2026-08-11',
    filed: '2026-08-29',
    lag: 18,
    bracket: '$15,001 - $50,000',
    doc: '100012349',
  },
  {
    id: 6,
    member: M(2),
    party: 'R',
    state: 'TX',
    district: '02',
    ticker: 'AMZN',
    asset: 'Amazon.com, Inc.',
    type: 'E',
    traded: '2026-08-05',
    filed: '2026-08-20',
    lag: 15,
    bracket: '$250,001 - $500,000',
    doc: '100012350',
  },
  /* No ticker: a Treasury bill is not a listed security. The cell renders a
     middle dot, never a blank and never a dash. */
  {
    id: 7,
    member: M(3),
    party: 'D',
    state: 'NY',
    district: '07',
    ticker: null,
    asset: 'U.S. Treasury Bill, 26 week',
    type: 'P',
    traded: '2026-07-30',
    filed: '2026-08-12',
    lag: 13,
    bracket: '$100,001 - $250,000',
    doc: '100012351',
  },
  {
    id: 8,
    member: M(5),
    party: 'D',
    state: 'WA',
    district: '07',
    ticker: 'VTI',
    asset: 'Vanguard Total Stock Market ETF',
    type: 'P',
    traded: '2026-07-22',
    filed: '2026-08-03',
    lag: 12,
    bracket: '$1,001 - $15,000',
    doc: '100012352',
  },
  {
    id: 9,
    member: M(4),
    party: 'R',
    state: 'FL',
    district: '19',
    ticker: 'NVDA',
    asset: 'NVIDIA Corporation',
    type: 'S',
    traded: '2026-07-15',
    filed: '2026-07-28',
    lag: 13,
    bracket: 'Over $500,000',
    doc: '100012353',
  },
  {
    id: 10,
    member: M(5),
    party: 'D',
    state: 'WA',
    district: '07',
    ticker: 'MSFT',
    asset: 'Microsoft Corporation',
    type: 'P',
    traded: '2026-07-09',
    filed: '2026-07-21',
    lag: 12,
    bracket: '$15,001 - $50,000',
    doc: '100012354',
  },
];

/* Counts, never dollars: a total built from bracket midpoints would be a
   figure the filings do not contain. */
export const FIXTURE_BY_MONTH = [
  { month: 'APR', buys: 31, sells: 18 },
  { month: 'MAY', buys: 27, sells: 24 },
  { month: 'JUN', buys: 44, sells: 21 },
  { month: 'JUL', buys: 38, sells: 29 },
  { month: 'AUG', buys: 35, sells: 33 },
  { month: 'SEP', buys: 22, sells: 14 },
];

export const FIXTURE_LEADERBOARD = [
  { ticker: 'NVDA', buys: 14, sells: 9 },
  { ticker: 'MSFT', buys: 11, sells: 6 },
  { ticker: 'AAPL', buys: 9, sells: 7 },
  { ticker: 'LMT', buys: 6, sells: 2 },
  { ticker: 'XOM', buys: 4, sells: 5 },
];

export const FIXTURE_METRICS = {
  filings: '45,000+',
  filingsCaption: '2008 to 2026, 19 index years',
  ptrs: '400',
  ptrsCaption: 'periodic transaction reports to date',
  txns: '10',
  txnsCaption: 'in current selection, buys 60% sells 30%',
  recent: 'Sep 24',
  recentCaption: 'PTRs post within days, annuals in mid June',
};

/* Two trades and two filings, per 06-SHARED-CHROME.md. */
export const FIXTURE_TICKER_ITEMS = [
  { id: 'tk1', lead: M(1), main: 'NVDA BUY', value: '$15,001 - $50,000' },
  { id: 'tk2', lead: M(2), main: 'MSFT SELL', value: '$50,001 - $100,000' },
  { id: 'tk3', lead: M(3), main: 'Periodic Transaction Report', value: 'FILED 2026-09-04' },
  { id: 'tk4', lead: M(4), main: 'Annual Report', value: 'FILED 2026-08-29' },
];
