/**
 * Representative SAMPLE data for the public Consumer & Alternative Signals
 * dataset page. Static, illustrative signal rows (source, signal, ticker,
 * sentiment, score, date). NOT live data.
 *
 * Source honesty: providers that ARE confirmed in the codebase are named
 * (Quiver Quantitative for on-air mentions; analyst consensus via FMP /
 * Finnhub). Providers that are not yet verified are marked "[CONFIRM source]"
 * rather than overstated — matching the attribution on the dimension overview.
 */

export const ALT_SIGNALS_SAMPLE = [
  {
    id: 'a1',
    source: 'Quiver Quantitative',
    signal: 'On-air mention (CNBC)',
    ticker: 'NVDA',
    sentiment: 'Bullish',
    score: '0.82',
    date: '2026-06-12',
  },
  {
    id: 'a2',
    source: 'Analyst consensus',
    signal: 'Rating upgrade',
    ticker: 'AVGO',
    sentiment: 'Bullish',
    score: '0.74',
    date: '2026-06-11',
  },
  {
    id: 'a3',
    source: 'Quiver Quantitative',
    signal: 'On-air mention (CNBC)',
    ticker: 'TSLA',
    sentiment: 'Bearish',
    score: '0.31',
    date: '2026-06-10',
  },
  {
    id: 'a4',
    source: '[CONFIRM source]',
    signal: 'App download trend',
    ticker: 'UBER',
    sentiment: 'Bullish',
    score: '0.68',
    date: '2026-06-09',
  },
  {
    id: 'a5',
    source: 'Analyst consensus',
    signal: 'Price-target raise',
    ticker: 'META',
    sentiment: 'Bullish',
    score: '0.71',
    date: '2026-06-06',
  },
  {
    id: 'a6',
    source: '[CONFIRM source]',
    signal: 'Search-interest spike',
    ticker: 'PLTR',
    sentiment: 'Bullish',
    score: '0.77',
    date: '2026-06-05',
  },
  {
    id: 'a7',
    source: 'Quiver Quantitative',
    signal: 'On-air mention (CNBC)',
    ticker: 'AMD',
    sentiment: 'Neutral',
    score: '0.52',
    date: '2026-06-03',
  },
  {
    id: 'a8',
    source: 'Analyst consensus',
    signal: 'Rating downgrade',
    ticker: 'UNH',
    sentiment: 'Bearish',
    score: '0.27',
    date: '2026-06-02',
  },
  {
    id: 'a9',
    source: '[CONFIRM source]',
    signal: 'App rating decline',
    ticker: 'SNAP',
    sentiment: 'Bearish',
    score: '0.34',
    date: '2026-05-29',
  },
  {
    id: 'a10',
    source: 'Quiver Quantitative',
    signal: 'On-air mention (CNBC)',
    ticker: 'AAPL',
    sentiment: 'Neutral',
    score: '0.55',
    date: '2026-05-28',
  },
  {
    id: 'a11',
    source: '[CONFIRM source]',
    signal: 'Search-interest spike',
    ticker: 'COIN',
    sentiment: 'Bullish',
    score: '0.66',
    date: '2026-05-26',
  },
  {
    id: 'a12',
    source: 'Analyst consensus',
    signal: 'Price-target raise',
    ticker: 'LLY',
    sentiment: 'Bullish',
    score: '0.69',
    date: '2026-05-22',
  },
];

/** Sample most-mentioned tickers on air (trailing week). */
export const TOP_MENTIONS = [
  { name: 'NVDA', meta: 'NVIDIA · 42 mentions', value: 'Bullish' },
  { name: 'TSLA', meta: 'Tesla · 31 mentions', value: 'Bearish' },
  { name: 'AAPL', meta: 'Apple · 28 mentions', value: 'Neutral' },
  { name: 'AMD', meta: 'Adv. Micro Devices · 24 mentions', value: 'Neutral' },
  { name: 'META', meta: 'Meta Platforms · 19 mentions', value: 'Bullish' },
];
