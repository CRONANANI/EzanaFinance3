/** Mock data for landing feature flip-card backs */

export const CONGRESS_TRADES_ALL = [
  {
    id: 1,
    name: 'Nancy Pelosi',
    party: 'Democrat',
    ticker: 'NVDA',
    type: 'Purchase',
    amount: '$1M - $5M',
  },
  {
    id: 2,
    name: 'Dan Crenshaw',
    party: 'Republican',
    ticker: 'TSLA',
    type: 'Sale',
    amount: '$15K - $50K',
  },
  {
    id: 3,
    name: 'Mark Warner',
    party: 'Democrat',
    ticker: 'MSFT',
    type: 'Purchase',
    amount: '$1K - $15K',
  },
  {
    id: 4,
    name: 'Tommy Tuberville',
    party: 'Republican',
    ticker: 'AAPL',
    type: 'Purchase',
    amount: '$50K - $100K',
  },
];

export const PORTFOLIO_BACK_METRICS = [
  { label: 'Sharpe', value: '1.45' },
  { label: 'Beta', value: '1.05' },
  { label: 'Dividends', value: '$847/mo' },
  { label: 'Risk', value: '6.2/10' },
];

export const INTEL_DATA = {
  contracts: [
    {
      agency: 'Department of Defense',
      company: 'Lockheed Martin',
      amount: '$450M Contract Award',
    },
    {
      agency: 'NASA',
      company: 'SpaceX',
      amount: '$1.2B Contract Award',
    },
    {
      agency: 'Department of Energy',
      company: 'Tesla',
      amount: '$250M Contract Award',
    },
  ],
  lobbying: [],
  patents: [],
};

export const COMMUNITY_TRENDING_POST = {
  author: 'JD',
  name: 'John Doe',
  badge: 'expert',
  content:
    'Just noticed a pattern in semiconductor congressional trades. NVDA purchases up 40% this week among tech committee members...',
  stats: { likes: 124, comments: 38, bookmarks: 56 },
};

export const COMMUNITY_BACK_POSTS = [
  {
    author: 'JD',
    name: 'John Doe',
    badge: 'Expert Trader',
    content:
      'NVDA purchases up 40% this week among tech-committee members. Watching the disclosure lag closely.',
    stats: { likes: 124, comments: 38, bookmarks: 56 },
  },
  {
    author: 'AS',
    name: 'Alex Smith',
    badge: 'Verified',
    content:
      'Defense contract awards tracking recent lobbying spend almost 1:1. Full thread in the app.',
    stats: { likes: 89, comments: 22, bookmarks: 43 },
  },
];

export const ALERTS_FEED = [
  { icon: 'bi-graph-up-arrow', text: '$NVDA crossed your price target', time: '2m ago' },
  { icon: 'bi-building', text: 'New Pelosi filing in a held position', time: '14m ago' },
  { icon: 'bi-file-earmark-text', text: 'Lockheed $450M contract detected', time: '1h ago' },
  { icon: 'bi-people', text: '3 traders you follow bought $MSFT', time: '3h ago' },
];

export const ALT_SIGNALS_FEED = [
  { label: 'Satellite lot traffic', ticker: '$WMT', delta: '▲ 12%', up: true },
  { label: 'App download velocity', ticker: '$UBER', delta: '▲ 8%', up: true },
  { label: 'Card-spend trend', ticker: '$SBUX', delta: '▼ 5%', up: false },
  { label: 'Web search interest', ticker: '$CMG', delta: '▲ 6%', up: true },
];

export const HOW_STEPS = [
  {
    icon: 'bi-link-45deg',
    title: 'Connect your accounts',
    desc: 'Securely link any brokerage or exchange via SnapTrade or Plaid — read-only by default.',
  },
  {
    icon: 'bi-grid-1x2',
    title: 'See everything in one place',
    desc: 'Holdings, performance, and risk unified across every account you own.',
  },
  {
    icon: 'bi-activity',
    title: 'Get conviction-ranked signals',
    desc: 'Congressional trades, government activity, and community research — surfaced and scored.',
  },
  {
    icon: 'bi-bell',
    title: 'Act on real-time alerts',
    desc: 'Get notified the moment a trade, filing, or event touches a position you hold.',
  },
];

export const METRICS_BAND = [
  { v: '535', l: 'Congress members tracked' },
  { v: '15,000+', l: 'Congressional trades' },
  { v: '1,000+', l: 'Brokerages supported' },
  { v: '10,000+', l: 'Community members' },
];
