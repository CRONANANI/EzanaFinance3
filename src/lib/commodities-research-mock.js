/** Mock data for Commodities Research — swap for API later */

export const COMMODITY_STATS = [
  { id: 'wti', icon: '🛢️', label: 'Oil (WTI)', price: '$114.54', change: '▲ +3.60% today', positive: true },
  { id: 'gold', icon: '🥇', label: 'Gold', price: '$404.13', change: '▲ +0.02% today', positive: true },
  { id: 'wheat', icon: '🌾', label: 'Wheat', price: '$6.82', change: '▼ -1.2% today', positive: false },
  { id: 'crb', icon: '📊', label: 'Commodity Index', price: 'CRB: 312.4', change: '▲ +0.8% this week', positive: true },
];

export const COMMODITY_ROWS = [
  { category: 'energy', name: 'Crude Oil (WTI)', price: '$114.54', chg: '+3.60%', pos: true, bar: 92 },
  { category: 'energy', name: 'Natural Gas', price: '$3.82', chg: '-1.20%', pos: false, bar: 42 },
  { category: 'energy', name: 'Brent Crude', price: '$118.20', chg: '+3.10%', pos: true, bar: 90 },
  { category: 'energy', name: 'Gasoline', price: '$3.45', chg: '+0.80%', pos: true, bar: 68 },
  { category: 'metals', name: 'Gold', price: '$404.13', chg: '+0.02%', pos: true, bar: 88 },
  { category: 'metals', name: 'Silver', price: '$33.84', chg: '+2.11%', pos: true, bar: 72 },
  { category: 'metals', name: 'Copper', price: '$4.52', chg: '-0.40%', pos: false, bar: 52 },
  { category: 'metals', name: 'Platinum', price: '$1,024', chg: '+1.30%', pos: true, bar: 65 },
  { category: 'ag', name: 'Wheat', price: '$6.82', chg: '-1.20%', pos: false, bar: 40 },
  { category: 'ag', name: 'Corn', price: '$4.95', chg: '+0.30%', pos: true, bar: 45 },
  { category: 'ag', name: 'Soybeans', price: '$12.40', chg: '-0.60%', pos: false, bar: 50 },
  { category: 'ag', name: 'Coffee', price: '$2.18', chg: '+4.20%', pos: true, bar: 95 },
];

export const COMMODITY_MOVERS = [
  { name: 'Coffee', chg: '+4.20%', note: 'Brazil drought', pos: true },
  { name: 'Oil (WTI)', chg: '+3.60%', note: 'OPEC cut fears', pos: true },
  { name: 'Silver', chg: '+2.11%', note: 'Safe haven demand', pos: true },
  { name: 'Wheat', chg: '-1.20%', note: 'Ukraine exports', pos: false },
  { name: 'Copper', chg: '-0.40%', note: 'China slowdown', pos: false },
];

export const SUPPLY_DEMAND = [
  'Oil: OPEC meeting Jun 2 — cut expected',
  'Gold: Central bank buying at record highs',
  'Wheat: Ukraine export corridor renewed',
];

export const COMM_NEWS = [
  { title: 'WTI crude posts best week since March on supply jitters', source: 'Reuters', time: '2h ago' },
  { title: 'Gold holds near highs as traders weigh Fed path', source: 'Bloomberg', time: '4h ago' },
  { title: 'Corn futures rise on planting delays in Midwest', source: 'AgWeb', time: '5h ago' },
  { title: 'Copper demand outlook split on China PMI', source: 'WSJ', time: '6h ago' },
  { title: 'Coffee spikes on Brazil weather watch', source: 'Financial Times', time: '8h ago' },
  { title: 'Natural gas volatility ahead of storage report', source: 'CNBC', time: '10h ago' },
];

export const COMMUNITY_POSTS = [
  { text: '"Oil to $130 by summer?"', author: '@DavidKim' },
  { text: '"Copper signals recession"', author: '@LisaPark' },
];
