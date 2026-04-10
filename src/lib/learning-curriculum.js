/**
 * Full Learning Center curriculum — 120 courses across 5 tracks.
 * IDs: {track}-{level}-{n} e.g. stocks-basic-1, stocks-advanced-3 (short selling)
 */

export const LEVEL_KEYS = ['basic', 'intermediate', 'advanced', 'expert'];
export const LEVEL_ORDER = { basic: 1, intermediate: 2, advanced: 3, expert: 4 };

export const TRACKS = [
  { id: 'stocks', label: 'Stock Market & Investing', shortLabel: 'Stocks & Investing', icon: '📈', totalCourses: 30 },
  { id: 'crypto', label: 'Cryptocurrency & Digital Assets', shortLabel: 'Crypto & Digital', icon: '₿', totalCourses: 30 },
  { id: 'betting', label: 'Betting Markets & Prediction Markets', shortLabel: 'Betting Markets', icon: '🎯', totalCourses: 22 },
  { id: 'commodities', label: 'Commodities', shortLabel: 'Commodities', icon: '🛢️', totalCourses: 22 },
  { id: 'risk', label: 'Risk Management & Trading Psychology', shortLabel: 'Risk & Psychology', icon: '🧠', totalCourses: 16 },
];

const TOTAL_GRAND = 120;

function parseBlock(track, level, lines) {
  const levelOrder = LEVEL_ORDER[level];
  return lines
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((line, idx) => {
      const parts = line.split('|');
      const title = parts[0]?.trim() || '';
      const description = parts[1]?.trim() || '';
      const duration_minutes = Math.max(5, parseInt(parts[2]?.trim() || '15', 10) || 15);
      const course_order = idx + 1;
      return {
        id: `${track}-${level}-${course_order}`,
        track,
        level,
        level_order: levelOrder,
        course_order,
        title,
        description,
        duration_minutes,
        has_quiz: true,
      };
    });
}

/** Build all course rows from pipe-separated curriculum blocks */
function buildAllCourses() {
  const blocks = [];

  blocks.push(
    ...parseBlock('stocks', 'basic', `
What Is the Stock Market?|How exchanges work, buyers and sellers, market hours|15
Stocks, Bonds, and ETFs Explained|What each asset is and how they differ|15
How to Read a Stock Quote|Ticker symbols, bid/ask, volume, market cap|12
Understanding Market Indices|S&P 500, NASDAQ, DOW, what they represent|15
Your First Investment|How to buy your first stock, fractional shares, order types (market vs limit)|20
The Power of Compound Interest|How reinvesting returns builds wealth over time|12
Risk vs Reward|Why all investments carry risk, diversification basics|15
Reading Financial News|How to interpret headlines without panicking|10
`),
    ...parseBlock('stocks', 'intermediate', `
Fundamental Analysis 101|P/E ratio, EPS, revenue growth, how to evaluate a company|20
Technical Analysis 101|Candlestick charts, support/resistance, trendlines|25
Understanding Financial Statements|Income statement, balance sheet, cash flow|20
Sector Analysis|11 GICS sectors, sector rotation, cyclical vs defensive|15
Dividend Investing|Yield, payout ratio, dividend aristocrats, DRIP|15
Growth vs Value Investing|Two schools of thought, when each works best|20
Portfolio Construction|Asset allocation, rebalancing, correlation|25
Tax Basics for Investors|Capital gains, tax-loss harvesting, tax-advantaged accounts|15
`),
    ...parseBlock('stocks', 'advanced', `
Options Trading Fundamentals|Calls, puts, strike price, expiration, premium|18
Options Strategies|Covered calls, protective puts, spreads, straddles|22
Short Selling|How it works, risks, margin requirements, short squeezes|20
Margin Trading|Leverage, margin calls, maintenance requirements, risks|20
Quantitative Analysis|Statistical methods, backtesting, Sharpe ratio, alpha/beta|22
Behavioral Finance|Cognitive biases, herd mentality, loss aversion, FOMO|18
Macroeconomics for Traders|Interest rates, inflation, GDP, Fed policy impact|20
Earnings Season Playbook|How to analyze earnings reports, guidance, whisper numbers|18
`),
    ...parseBlock('stocks', 'expert', `
Algorithmic Trading|Building automated strategies, execution algorithms|22
Factor Investing|Momentum, value, quality, size, volatility factors|20
Portfolio Risk Management|VaR, stress testing, tail risk hedging|22
Market Microstructure|Order flow, dark pools, HFT, market making|20
Global Markets & FX Impact|How currency movements affect equity returns|18
Building Your Investment Thesis|Developing a repeatable research framework|20
`)
  );

  blocks.push(
    ...parseBlock('crypto', 'basic', `
What Is Cryptocurrency?|Blockchain basics, decentralization, digital wallets|15
Bitcoin Explained|History, supply cap, mining, halving events|15
Ethereum & Smart Contracts|What makes ETH different, gas fees, dApps|18
How to Buy & Store Crypto|Exchanges, wallets (hot vs cold), seed phrases|18
Understanding Crypto Prices|Volatility, market cap vs fully diluted, 24h volume|12
Top 20 Cryptocurrencies|Overview of major coins and their use cases|20
Crypto vs Traditional Finance|Key differences, advantages, risks|15
Crypto Security|Scam prevention, phishing, rug pulls, how to stay safe|15
`),
    ...parseBlock('crypto', 'intermediate', `
DeFi (Decentralized Finance)|Lending, borrowing, yield farming, liquidity pools|20
NFTs & Digital Ownership|What NFTs are, marketplaces, use cases beyond art|18
Layer 1 vs Layer 2|Scalability solutions, rollups, sidechains|18
Stablecoins Deep Dive|USDC, USDT, DAI, algorithmic stables, de-pegging risks|18
On-Chain Analysis|Reading blockchain data, whale tracking, exchange flows|18
Crypto Technical Analysis|Applying TA to crypto, unique patterns, 24/7 markets|18
Tokenomics|Supply mechanics, inflation schedules, vesting, burn mechanisms|18
Regulatory Landscape|SEC, global regulations, compliance, what is changing|18
`),
    ...parseBlock('crypto', 'advanced', `
Crypto Trading Strategies|Swing trading, scalping, arbitrage in crypto|20
DeFi Yield Strategies|Advanced LP strategies, impermanent loss, protocol risk|22
Crypto Derivatives|Futures, perpetuals, funding rates, liquidation|22
MEV & Frontrunning|Miner extractable value, sandwich attacks, protection|18
Cross-Chain Bridges|How they work, security risks, major exploits|18
DAO Governance & Voting|How decentralized organizations make decisions|18
Crypto Portfolio Management|Allocation strategies, rebalancing in volatile markets|18
Tax & Accounting for Crypto|Cost basis methods, reporting, international considerations|20
`),
    ...parseBlock('crypto', 'expert', `
Smart Contract Auditing|Reading Solidity, common vulnerabilities, audit reports|22
Institutional Crypto|How hedge funds and institutions approach digital assets|20
Building a Crypto Thesis|Macro narratives, cycle theory, network effects|20
Crypto Market Making|Providing liquidity, spread management, inventory risk|22
Emerging Narratives|RWA tokenization, AI x crypto, decentralized science|18
Regulatory Arbitrage & Compliance|Operating across jurisdictions|20
`)
  );

  blocks.push(
    ...parseBlock('betting', 'basic', `
What Are Prediction Markets?|How they work, why they are accurate, Polymarket intro|15
Understanding Odds & Probabilities|Decimal, fractional, American odds, implied probability|15
How Sports Betting Works|Point spreads, moneylines, over/under, parlays|15
Introduction to Polymarket|Creating an account, placing your first bet, market mechanics|18
The Wisdom of Crowds|Why markets are better predictors than experts|12
Bankroll Management|Never bet more than you can afford, unit sizing, Kelly criterion intro|15
`),
    ...parseBlock('betting', 'intermediate', `
Finding Value Bets|Expected value, line shopping, market inefficiencies|18
Political Betting Markets|Election odds, policy markets, geopolitical events|18
Sports Analytics for Betting|Using statistics to inform bets, models vs gut|18
Market Liquidity & Slippage|How order books work in prediction markets|15
Hedging Your Bets|Using opposing positions to reduce risk|15
Tracking & Analyzing Your Bets|ROI, win rate, CLV (closing line value)|15
`),
    ...parseBlock('betting', 'advanced', `
Building Betting Models|Statistical models for predicting outcomes|22
Arbitrage in Betting Markets|Cross-platform arbitrage opportunities|18
Advanced Polymarket Strategies|Whale tracking, smart money flow, timing|20
Correlation Between Financial & Prediction Markets|How they influence each other|18
Market Making in Prediction Markets|Providing liquidity for profit|20
Psychology of Betting|Tilt, overconfidence, recency bias, discipline|18
`),
    ...parseBlock('betting', 'expert', `
Quantitative Sports Betting|Machine learning models, feature engineering|22
Building Your Own Prediction Market Tools|APIs, data pipelines, dashboards|20
Regulatory Environment|Legal landscape for betting and prediction markets|18
Professional Betting as a Business|Scaling strategies, tax implications, operations|20
`)
  );

  blocks.push(
    ...parseBlock('commodities', 'basic', `
What Are Commodities?|Physical goods markets, categories (energy, metals, agriculture)|15
Gold, Oil, and Agriculture|The big three commodity groups explained|15
How Commodity Prices Work|Supply and demand, seasonality, weather impact|15
Commodity ETFs & Funds|How to get exposure without trading futures|15
OPEC, Cartels & Market Movers|Who controls supply and why it matters|15
Commodities vs Stocks|Correlation, inflation hedging, portfolio role|15
`),
    ...parseBlock('commodities', 'intermediate', `
Introduction to Futures Contracts|What they are, contract specs, expiration|18
Understanding Commodity Charts|Contango, backwardation, seasonal patterns|18
Energy Markets Deep Dive|Crude oil, natural gas, renewable energy impact|18
Precious Metals|Gold, silver, platinum as stores of value and industrial inputs|18
Agricultural Commodities|Grain, livestock, soft commodities, weather derivatives|18
Geopolitics & Commodities|Wars, sanctions, trade routes, and price shocks|18
`),
    ...parseBlock('commodities', 'advanced', `
Commodity Futures Trading|Margin, leverage, rolling contracts, delivery|22
Commodity Spread Trading|Calendar spreads, crack spreads, crush spreads|20
Supply Chain Analysis|How to track supply disruptions before markets react|18
Central Banks & Commodities|Gold reserves, petrodollar system, de-dollarization|18
ESG & Energy Transition|How green policies reshape commodity markets|18
Building a Commodities Thesis|Supercycles, secular trends, timing entries|20
`),
    ...parseBlock('commodities', 'expert', `
Commodity Trading Advisor (CTA) Strategies|Trend following, managed futures|22
Physical vs Paper Markets|Warehouse receipts, delivery mechanics, manipulation|20
Commodity Options|Using options to hedge commodity exposure|18
Global Macro & Commodities|Integrating commodities into a macro portfolio|20
`)
  );

  blocks.push(
    ...parseBlock('risk', 'basic', `
Why Risk Management Matters|The #1 reason traders fail|12
Position Sizing|How much to risk per trade, 1% rule, 2% rule|15
Stop Losses & Take Profits|Setting boundaries on every trade|15
The Psychology of Losing|How to handle losses without revenge trading|15
`),
    ...parseBlock('risk', 'intermediate', `
Portfolio Risk Metrics|Beta, standard deviation, max drawdown, Sortino ratio|18
Correlation & Diversification|Why owning different assets reduces risk|15
Emotional Discipline|Building a trading journal, sticking to your plan|15
Common Trading Mistakes|Overtrading, averaging down, ignoring stops|15
`),
    ...parseBlock('risk', 'advanced', `
Advanced Position Management|Scaling in/out, trailing stops, partial profits|18
Risk-Adjusted Returns|Sharpe ratio, Calmar ratio, comparing strategies properly|18
Stress Testing Your Portfolio|What happens in a crash, black swan preparation|18
Trading Under Pressure|Performance psychology, decision fatigue, routines|18
`),
    ...parseBlock('risk', 'expert', `
Professional Risk Frameworks|How hedge funds manage risk, risk budgeting|20
Crisis Playbook|What to do during market crashes, pandemics, black swans|18
Systematic Risk Management|Automated rules, circuit breakers, kill switches|18
Building Your Trading Edge|Combining all skills into a repeatable system|20
`)
  );

  if (blocks.length !== TOTAL_GRAND) {
    console.warn(`[learning-curriculum] expected ${TOTAL_GRAND} courses, got ${blocks.length}`);
  }
  return blocks;
}

export const ALL_COURSES = buildAllCourses();

export function getCourseById(id) {
  return ALL_COURSES.find((c) => c.id === id) ?? null;
}

export function getCoursesByTrack(trackId) {
  return ALL_COURSES.filter((c) => c.track === trackId);
}

export function getLevelLabel(level) {
  const map = {
    basic: 'Bronze',
    intermediate: 'Silver',
    advanced: 'Gold',
    expert: 'Platinum',
  };
  return map[level] || level;
}

export function countCoursesInLevel(track, level) {
  return ALL_COURSES.filter((c) => c.track === track && c.level === level).length;
}

export function getTotalCourses() {
  return TOTAL_GRAND;
}

/** Stocks fundamentals & portfolio — basic + intermediate */
export function getCoursesForWatchlistPreview(limit = 4) {
  return ALL_COURSES.filter(
    (c) => c.track === 'stocks' && (c.level === 'basic' || c.level === 'intermediate')
  ).slice(0, limit);
}

/** Risk track + advanced quant / algorithmic topics from stocks */
export function getCoursesForQuantsPreview(limit = 4) {
  const risk = getCoursesByTrack('risk').slice(0, 2);
  const quantish = ALL_COURSES.filter(
    (c) =>
      c.track === 'stocks' &&
      (c.level === 'advanced' || c.level === 'expert') &&
      /quantitative|algorithmic|factor/i.test(c.title)
  );
  return [...risk, ...quantish].slice(0, limit);
}

/** One course per track, rotating rounds — community “level up” strip */
export function getMixedCoursesFromAllTracks(limit = 8) {
  const trackOrder = ['stocks', 'crypto', 'betting', 'commodities', 'risk'];
  const out = [];
  let round = 0;
  while (out.length < limit) {
    for (const t of trackOrder) {
      const list = getCoursesByTrack(t);
      if (list[round]) out.push(list[round]);
      if (out.length >= limit) break;
    }
    round++;
  }
  return out;
}
