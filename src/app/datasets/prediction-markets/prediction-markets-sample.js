/**
 * Representative SAMPLE data for the public Prediction Markets dataset page.
 * Static, illustrative Polymarket-shaped rows (event, outcome, probability,
 * volume, close date). NOT live odds — the page labels it as a sample and
 * links into the app for live, real-time markets.
 */

export const PREDICTION_MARKETS_SAMPLE = [
  {
    id: 'pm1',
    event: 'Fed cuts rates at next FOMC meeting',
    outcome: 'Yes',
    probability: '62%',
    volume: '$8.4M',
    close: '2026-07-29',
  },
  {
    id: 'pm2',
    event: 'S&P 500 closes above 6,200 this quarter',
    outcome: 'Yes',
    probability: '47%',
    volume: '$5.1M',
    close: '2026-09-30',
  },
  {
    id: 'pm3',
    event: 'US CPI above 3.0% for June',
    outcome: 'No',
    probability: '58%',
    volume: '$3.9M',
    close: '2026-07-11',
  },
  {
    id: 'pm4',
    event: 'Bitcoin above $120k by end of Q3',
    outcome: 'Yes',
    probability: '41%',
    volume: '$12.7M',
    close: '2026-09-30',
  },
  {
    id: 'pm5',
    event: 'NVIDIA reports record quarterly revenue',
    outcome: 'Yes',
    probability: '78%',
    volume: '$2.6M',
    close: '2026-08-20',
  },
  {
    id: 'pm6',
    event: 'US unemployment above 4.2% in July',
    outcome: 'No',
    probability: '64%',
    volume: '$1.8M',
    close: '2026-08-01',
  },
  {
    id: 'pm7',
    event: 'Government shutdown before October',
    outcome: 'No',
    probability: '71%',
    volume: '$4.4M',
    close: '2026-09-30',
  },
  {
    id: 'pm8',
    event: 'Apple ships a foldable device in 2026',
    outcome: 'No',
    probability: '83%',
    volume: '$0.9M',
    close: '2026-12-31',
  },
  {
    id: 'pm9',
    event: 'Oil (WTI) above $80 by end of Q3',
    outcome: 'Yes',
    probability: '38%',
    volume: '$2.2M',
    close: '2026-09-30',
  },
  {
    id: 'pm10',
    event: 'Tesla deliveries beat consensus in Q2',
    outcome: 'Yes',
    probability: '53%',
    volume: '$3.1M',
    close: '2026-07-02',
  },
];

/** Sample highest-volume markets (open). */
export const TOP_MARKETS = [
  { name: 'Bitcoin above $120k by end of Q3', meta: 'Crypto · closes 2026-09-30', value: '$12.7M' },
  {
    name: 'Fed cuts rates at next FOMC meeting',
    meta: 'Macro · closes 2026-07-29',
    value: '$8.4M',
  },
  {
    name: 'S&P 500 closes above 6,200 this quarter',
    meta: 'Markets · closes 2026-09-30',
    value: '$5.1M',
  },
  {
    name: 'Government shutdown before October',
    meta: 'Politics · closes 2026-09-30',
    value: '$4.4M',
  },
  { name: 'US CPI above 3.0% for June', meta: 'Macro · closes 2026-07-11', value: '$3.9M' },
];
