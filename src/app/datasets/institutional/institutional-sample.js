/**
 * Representative SAMPLE data for the public Institutional (13F) dataset page.
 * Static, illustrative 13F-HR holdings (shape: fund, ticker, issuer, value,
 * shares, quarter). NOT live data — labeled as a sample on the page, which links
 * into the app for the full feed. Real manager names are used only as sample
 * labels, not as claims about current positions.
 */

export const INSTITUTIONAL_SAMPLE = [
  { id: 'i1', fund: 'Berkshire Hathaway', ticker: 'AAPL', issuer: 'Apple Inc', value: '$84.2B', shares: '400,000,000', quarter: 'Q1 2026' },
  { id: 'i2', fund: 'Bridgewater Associates', ticker: 'SPY', issuer: 'SPDR S&P 500 ETF', value: '$2.1B', shares: '3,900,000', quarter: 'Q1 2026' },
  { id: 'i3', fund: 'Renaissance Technologies', ticker: 'NVDA', issuer: 'NVIDIA Corp', value: '$1.6B', shares: '11,200,000', quarter: 'Q1 2026' },
  { id: 'i4', fund: 'Vanguard Group', ticker: 'MSFT', issuer: 'Microsoft Corp', value: '$78.9B', shares: '188,000,000', quarter: 'Q1 2026' },
  { id: 'i5', fund: 'BlackRock', ticker: 'AMZN', issuer: 'Amazon.com Inc', value: '$41.3B', shares: '210,000,000', quarter: 'Q1 2026' },
  { id: 'i6', fund: 'Tiger Global Management', ticker: 'META', issuer: 'Meta Platforms Inc', value: '$3.4B', shares: '5,600,000', quarter: 'Q1 2026' },
  { id: 'i7', fund: 'Coatue Management', ticker: 'AVGO', issuer: 'Broadcom Inc', value: '$1.9B', shares: '1,100,000', quarter: 'Q1 2026' },
  { id: 'i8', fund: 'Baillie Gifford', ticker: 'TSLA', issuer: 'Tesla Inc', value: '$2.7B', shares: '9,800,000', quarter: 'Q1 2026' },
];

export const TOP_INSTITUTIONAL_MOVES = [
  { name: 'Tiger Global', meta: 'META · new position', value: '$3.4B', tone: 'pos' },
  { name: 'Coatue', meta: 'AVGO · new position', value: '$1.9B', tone: 'pos' },
  { name: 'Renaissance', meta: 'NVDA · added', value: '$1.6B', tone: 'pos' },
];
