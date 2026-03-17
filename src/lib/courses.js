/**
 * Course Data Library — Ezana Finance Learning Center
 *
 * Each course has modules, each module has lessons.
 * Lessons can be: 'video', 'article', or 'quiz'.
 * This maps to the learning center course catalog.
 */

export const COURSES = {
  'investing-fundamentals': {
    id: 'investing-fundamentals',
    category: 'Investing Basics',
    title: 'Master the Fundamentals of Investing',
    subtitle: 'Build a rock-solid foundation in stocks, bonds, ETFs, and portfolio construction',
    instructor: { name: 'Sarah Chen', role: 'CFA, Former Goldman Sachs VP', avatar: null },
    releaseDate: '15 January 2025',
    lastUpdated: '10 March 2026',
    stats: { modules: 6, materials: 24, duration: '18 Hours', quizzes: 6 },
    description: 'This comprehensive course takes you from zero to confident investor. You will learn how financial markets work, how to evaluate stocks using fundamental analysis, how to build a diversified portfolio, and how to manage risk like a professional. Designed for beginners and intermediate investors who want a structured path to financial literacy.',
    period: { start: '15 January 2025', end: '15 July 2025' },
    modules: [
      {
        id: 'mod-1',
        title: 'Introduction to Financial Markets',
        lessons: [
          { id: 'les-1-1', title: 'How Stock Markets Work', duration: '22:15', type: 'video', videoUrl: null, content: 'Learn the mechanics of stock exchanges, market makers, bid-ask spreads, and how trades are executed in modern electronic markets.' },
          { id: 'les-1-2', title: 'Asset Classes Explained', duration: '18:30', type: 'video', videoUrl: null, content: 'Understand the difference between stocks, bonds, ETFs, mutual funds, options, and alternative investments.' },
          { id: 'les-1-3', title: 'Reading Financial Statements', duration: '35:00', type: 'article', content: 'A deep dive into income statements, balance sheets, and cash flow statements. Learn to read 10-K filings and extract the numbers that matter.' },
          { id: 'les-1-4', title: 'Module 1 Quiz', duration: '10:00', type: 'quiz', questions: [
            { q: 'What is the primary role of a market maker?', options: ['To regulate stock prices', 'To provide liquidity by quoting buy and sell prices', 'To manage mutual funds', 'To issue new stocks'], answer: 1 },
            { q: 'Which financial statement shows a company\'s profitability over a period?', options: ['Balance Sheet', 'Cash Flow Statement', 'Income Statement', 'Statement of Equity'], answer: 2 },
            { q: 'An ETF is best described as:', options: ['A single stock', 'A basket of securities that trades like a stock', 'A government bond', 'A savings account'], answer: 1 },
          ]},
        ],
      },
      {
        id: 'mod-2',
        title: 'Fundamental Analysis',
        lessons: [
          { id: 'les-2-1', title: 'P/E Ratio and Valuation Metrics', duration: '28:00', type: 'video', videoUrl: null, content: 'Master the Price-to-Earnings ratio, PEG ratio, Price-to-Book, EV/EBITDA, and how to compare valuations across sectors.' },
          { id: 'les-2-2', title: 'Revenue Growth & Profit Margins', duration: '24:00', type: 'video', videoUrl: null, content: 'Analyze top-line growth, gross margins, operating margins, and net margins to assess business quality.' },
          { id: 'les-2-3', title: 'Competitive Moats', duration: '20:00', type: 'video', videoUrl: null, content: 'Warren Buffett\'s concept of economic moats: brand, network effects, cost advantages, switching costs, and intangible assets.' },
          { id: 'les-2-4', title: 'Module 2 Quiz', duration: '10:00', type: 'quiz', questions: [
            { q: 'A P/E ratio of 30 means:', options: ['The stock costs $30', 'Investors pay $30 for every $1 of earnings', 'The company earns 30% profit', 'The stock dropped 30%'], answer: 1 },
            { q: 'Which is NOT a type of economic moat?', options: ['Brand loyalty', 'Network effects', 'High employee count', 'Switching costs'], answer: 2 },
          ]},
        ],
      },
      {
        id: 'mod-3',
        title: 'Technical Analysis Basics',
        lessons: [
          { id: 'les-3-1', title: 'Support, Resistance & Trends', duration: '26:00', type: 'video', videoUrl: null, content: 'Identify key price levels where stocks tend to bounce or break through, and how to draw trend lines.' },
          { id: 'les-3-2', title: 'Moving Averages & RSI', duration: '30:00', type: 'video', videoUrl: null, content: 'Use the 50-day and 200-day moving averages, golden/death crosses, and the Relative Strength Index.' },
          { id: 'les-3-3', title: 'Chart Patterns', duration: '22:00', type: 'article', content: 'Recognize head and shoulders, double tops/bottoms, flags, pennants, cup and handle, and wedge patterns.' },
          { id: 'les-3-4', title: 'Module 3 Quiz', duration: '10:00', type: 'quiz', questions: [
            { q: 'A golden cross occurs when:', options: ['Stock price hits $0', 'The 50-day MA crosses above the 200-day MA', 'Volume doubles', 'RSI hits 100'], answer: 1 },
          ]},
        ],
      },
      {
        id: 'mod-4',
        title: 'Portfolio Construction',
        lessons: [
          { id: 'les-4-1', title: 'Diversification Strategies', duration: '25:00', type: 'video', videoUrl: null, content: 'Why diversification matters, correlation between assets, and how to build a portfolio that weathers any market.' },
          { id: 'les-4-2', title: 'Asset Allocation Models', duration: '28:00', type: 'video', videoUrl: null, content: 'Explore the 60/40 portfolio, All-Weather portfolio, and modern portfolio theory in practice.' },
          { id: 'les-4-3', title: 'Rebalancing & Tax Efficiency', duration: '20:00', type: 'article', content: 'When and how to rebalance, tax-loss harvesting, and the impact of fees on long-term returns.' },
          { id: 'les-4-4', title: 'Module 4 Quiz', duration: '10:00', type: 'quiz', questions: [
            { q: 'The primary goal of diversification is to:', options: ['Maximize returns', 'Reduce risk without sacrificing too much return', 'Avoid paying taxes', 'Beat the S&P 500'], answer: 1 },
          ]},
        ],
      },
      {
        id: 'mod-5',
        title: 'Risk Management',
        lessons: [
          { id: 'les-5-1', title: 'Position Sizing & Stop Losses', duration: '22:00', type: 'video', videoUrl: null, content: 'Calculate the right position size, set stop losses, and manage downside risk on every trade.' },
          { id: 'les-5-2', title: 'Understanding Volatility', duration: '18:00', type: 'video', videoUrl: null, content: 'VIX, beta, standard deviation, and how to use volatility to your advantage instead of fearing it.' },
          { id: 'les-5-3', title: 'Module 5 Quiz', duration: '10:00', type: 'quiz', questions: [
            { q: 'A stock with a beta of 1.5 is expected to:', options: ['Move 50% less than the market', 'Move 50% more than the market', 'Not move at all', 'Only go up'], answer: 1 },
          ]},
        ],
      },
      {
        id: 'mod-6',
        title: 'Congressional Trading & Insider Signals',
        lessons: [
          { id: 'les-6-1', title: 'How to Track Congressional Trades', duration: '20:00', type: 'video', videoUrl: null, content: 'Use STOCK Act disclosures, filing timelines, and Ezana Finance tools to follow the money in Washington.' },
          { id: 'les-6-2', title: 'Interpreting Insider Buying & Selling', duration: '24:00', type: 'video', videoUrl: null, content: 'What insider transactions signal, the difference between routine sales and conviction buys, and how to filter noise.' },
          { id: 'les-6-3', title: 'Building an Insider-Following Strategy', duration: '30:00', type: 'article', content: 'Step-by-step guide to building a watchlist based on congressional and insider trades, with backtested results.' },
          { id: 'les-6-4', title: 'Final Exam', duration: '15:00', type: 'quiz', questions: [
            { q: 'Under the STOCK Act, members of Congress must disclose trades within:', options: ['24 hours', '45 days', '1 year', 'Never'], answer: 1 },
            { q: 'Insider buying is generally considered:', options: ['Illegal', 'A bullish signal', 'Irrelevant', 'A bearish signal'], answer: 1 },
          ]},
        ],
      },
    ],
  },

  'options-trading': {
    id: 'options-trading',
    category: 'Advanced Trading',
    title: 'Options Trading: From Basics to Advanced Strategies',
    subtitle: 'Master calls, puts, spreads, and income strategies used by professional traders',
    instructor: { name: 'Marcus Williams', role: 'Former Citadel Options Desk', avatar: null },
    releaseDate: '01 March 2025',
    lastUpdated: '05 March 2026',
    stats: { modules: 5, materials: 20, duration: '22 Hours', quizzes: 5 },
    description: 'Learn options from the ground up. This course covers everything from basic calls and puts to complex multi-leg strategies like iron condors, butterfly spreads, and the wheel strategy. Includes real trade examples and a simulated options trading lab.',
    period: { start: '01 March 2025', end: '01 September 2025' },
    modules: [
      {
        id: 'opt-1',
        title: 'Options Fundamentals',
        lessons: [
          { id: 'opt-1-1', title: 'What Are Options?', duration: '20:00', type: 'video', videoUrl: null, content: 'Understand calls, puts, strike prices, expiration dates, premiums, and the basic mechanics of options contracts.' },
          { id: 'opt-1-2', title: 'Intrinsic vs Extrinsic Value', duration: '18:00', type: 'video', videoUrl: null, content: 'Break down what makes up an option\'s price and why time decay matters.' },
          { id: 'opt-1-3', title: 'The Greeks Explained', duration: '32:00', type: 'video', videoUrl: null, content: 'Delta, Gamma, Theta, Vega, and Rho — what each Greek measures and how they affect your P&L.' },
          { id: 'opt-1-4', title: 'Module 1 Quiz', duration: '10:00', type: 'quiz', questions: [
            { q: 'A call option gives the holder the right to:', options: ['Sell a stock at a set price', 'Buy a stock at a set price', 'Short sell a stock', 'Lend money'], answer: 1 },
          ]},
        ],
      },
      {
        id: 'opt-2',
        title: 'Basic Strategies',
        lessons: [
          { id: 'opt-2-1', title: 'Covered Calls', duration: '25:00', type: 'video', videoUrl: null, content: 'Generate income from stocks you own by selling calls against your position.' },
          { id: 'opt-2-2', title: 'Protective Puts', duration: '20:00', type: 'video', videoUrl: null, content: 'Insure your portfolio against downside using put options.' },
          { id: 'opt-2-3', title: 'Cash-Secured Puts', duration: '22:00', type: 'video', videoUrl: null, content: 'Get paid to wait for stocks to drop to your buy price using this income strategy.' },
          { id: 'opt-2-4', title: 'Module 2 Quiz', duration: '10:00', type: 'quiz', questions: [
            { q: 'A covered call strategy involves:', options: ['Buying calls on a stock you own', 'Selling calls on a stock you own', 'Buying puts on a stock you own', 'Selling the stock short'], answer: 1 },
          ]},
        ],
      },
      {
        id: 'opt-3',
        title: 'Spread Strategies',
        lessons: [
          { id: 'opt-3-1', title: 'Vertical Spreads', duration: '28:00', type: 'video', videoUrl: null, content: 'Bull call spreads, bear put spreads — define your risk and reward with two-leg strategies.' },
          { id: 'opt-3-2', title: 'Iron Condors', duration: '30:00', type: 'video', videoUrl: null, content: 'Profit from low-volatility environments with this 4-leg neutral strategy.' },
          { id: 'opt-3-3', title: 'Butterfly Spreads', duration: '25:00', type: 'video', videoUrl: null, content: 'Advanced 3-strike strategy for precise price targeting with limited risk.' },
          { id: 'opt-3-4', title: 'Module 3 Quiz', duration: '10:00', type: 'quiz', questions: [
            { q: 'An iron condor profits most when:', options: ['The stock moves significantly', 'The stock stays in a range', 'Volatility increases', 'The market crashes'], answer: 1 },
          ]},
        ],
      },
      {
        id: 'opt-4',
        title: 'Advanced Concepts',
        lessons: [
          { id: 'opt-4-1', title: 'Implied Volatility & IV Crush', duration: '26:00', type: 'video', videoUrl: null, content: 'How implied volatility is priced, why it spikes before earnings, and how to exploit IV crush.' },
          { id: 'opt-4-2', title: 'The Wheel Strategy', duration: '30:00', type: 'video', videoUrl: null, content: 'Combine cash-secured puts and covered calls into a repeatable income machine.' },
          { id: 'opt-4-3', title: 'Module 4 Quiz', duration: '10:00', type: 'quiz', questions: [
            { q: 'IV crush typically occurs:', options: ['Before earnings', 'After earnings', 'During market hours only', 'On Fridays'], answer: 1 },
          ]},
        ],
      },
      {
        id: 'opt-5',
        title: 'Risk Management for Options',
        lessons: [
          { id: 'opt-5-1', title: 'Position Sizing for Options', duration: '20:00', type: 'video', videoUrl: null, content: 'Never risk more than you can afford. Learn the 1-2% rule applied to options trading.' },
          { id: 'opt-5-2', title: 'Rolling & Adjusting Positions', duration: '24:00', type: 'video', videoUrl: null, content: 'When and how to roll options forward, up, or down to salvage losing trades.' },
          { id: 'opt-5-3', title: 'Final Exam', duration: '15:00', type: 'quiz', questions: [
            { q: 'Rolling an option means:', options: ['Closing current position and opening a new one at a different strike/expiry', 'Exercising the option', 'Letting it expire worthless', 'Selling the underlying stock'], answer: 0 },
          ]},
        ],
      },
    ],
  },

  'crypto-essentials': {
    id: 'crypto-essentials',
    category: 'Cryptocurrency',
    title: 'Cryptocurrency Essentials: Bitcoin, Ethereum & DeFi',
    subtitle: 'Understand blockchain technology, crypto assets, and decentralized finance',
    instructor: { name: 'Alex Rivera', role: 'Blockchain Developer & Educator', avatar: null },
    releaseDate: '20 February 2025',
    lastUpdated: '01 March 2026',
    stats: { modules: 4, materials: 16, duration: '14 Hours', quizzes: 4 },
    description: 'From blockchain basics to DeFi yield farming, this course gives you a thorough understanding of the crypto ecosystem. Learn how Bitcoin and Ethereum work, evaluate altcoins, understand smart contracts, and explore decentralized finance protocols.',
    period: { start: '20 February 2025', end: '20 August 2025' },
    modules: [
      {
        id: 'cry-1', title: 'Blockchain Fundamentals',
        lessons: [
          { id: 'cry-1-1', title: 'How Blockchain Works', duration: '25:00', type: 'video', videoUrl: null, content: 'Distributed ledgers, consensus mechanisms, proof of work vs proof of stake.' },
          { id: 'cry-1-2', title: 'Bitcoin Deep Dive', duration: '30:00', type: 'video', videoUrl: null, content: 'Bitcoin\'s history, mining, halving cycles, and why it\'s called digital gold.' },
          { id: 'cry-1-3', title: 'Wallets & Security', duration: '20:00', type: 'article', content: 'Hot wallets vs cold wallets, seed phrases, and best practices for securing your crypto.' },
          { id: 'cry-1-4', title: 'Module 1 Quiz', duration: '10:00', type: 'quiz', questions: [
            { q: 'Bitcoin uses which consensus mechanism?', options: ['Proof of Stake', 'Proof of Work', 'Delegated Proof of Stake', 'Proof of Authority'], answer: 1 },
          ]},
        ],
      },
      {
        id: 'cry-2', title: 'Ethereum & Smart Contracts',
        lessons: [
          { id: 'cry-2-1', title: 'Ethereum Explained', duration: '22:00', type: 'video', videoUrl: null, content: 'The world computer: how Ethereum enables programmable money and decentralized apps.' },
          { id: 'cry-2-2', title: 'Smart Contracts 101', duration: '28:00', type: 'video', videoUrl: null, content: 'What smart contracts are, how they execute, and real-world use cases.' },
          { id: 'cry-2-3', title: 'Gas Fees & L2 Solutions', duration: '18:00', type: 'article', content: 'Understanding gas, why fees spike, and how Layer 2 solutions like Arbitrum and Optimism help.' },
          { id: 'cry-2-4', title: 'Module 2 Quiz', duration: '10:00', type: 'quiz', questions: [
            { q: 'A smart contract is:', options: ['A legal document', 'Self-executing code on the blockchain', 'A type of wallet', 'An exchange'], answer: 1 },
          ]},
        ],
      },
      {
        id: 'cry-3', title: 'DeFi & Yield Strategies',
        lessons: [
          { id: 'cry-3-1', title: 'What is DeFi?', duration: '20:00', type: 'video', videoUrl: null, content: 'Decentralized exchanges, lending protocols, and how DeFi removes the middleman.' },
          { id: 'cry-3-2', title: 'Yield Farming & Staking', duration: '26:00', type: 'video', videoUrl: null, content: 'Earn passive income on your crypto through staking, liquidity provision, and yield optimization.' },
          { id: 'cry-3-3', title: 'DeFi Risks', duration: '22:00', type: 'article', content: 'Smart contract risk, impermanent loss, rug pulls, and how to evaluate DeFi protocol safety.' },
          { id: 'cry-3-4', title: 'Module 3 Quiz', duration: '10:00', type: 'quiz', questions: [
            { q: 'Impermanent loss occurs in:', options: ['Staking', 'Liquidity pools', 'HODLing', 'Mining'], answer: 1 },
          ]},
        ],
      },
      {
        id: 'cry-4', title: 'Crypto Portfolio & Risk',
        lessons: [
          { id: 'cry-4-1', title: 'Building a Crypto Portfolio', duration: '24:00', type: 'video', videoUrl: null, content: 'Allocation strategies: BTC dominance, altcoin exposure, stablecoin reserves.' },
          { id: 'cry-4-2', title: 'Evaluating Altcoins', duration: '22:00', type: 'video', videoUrl: null, content: 'Tokenomics, team, TVL, and red flags to watch for when evaluating new projects.' },
          { id: 'cry-4-3', title: 'Tax & Regulation', duration: '18:00', type: 'article', content: 'Crypto tax rules, reporting requirements, and the evolving regulatory landscape.' },
          { id: 'cry-4-4', title: 'Final Exam', duration: '15:00', type: 'quiz', questions: [
            { q: 'TVL stands for:', options: ['Total Value Locked', 'Token Validation Layer', 'Transaction Volume Limit', 'Tradeable Value Ledger'], answer: 0 },
          ]},
        ],
      },
    ],
  },
};

export function getCourse(courseId) {
  return COURSES[courseId] || null;
}

export function getAllCourseIds() {
  return Object.keys(COURSES);
}

export function getAllCourseSummaries() {
  return Object.values(COURSES).map((c) => ({
    id: c.id,
    category: c.category,
    title: c.title,
    subtitle: c.subtitle,
    instructor: c.instructor,
    stats: c.stats,
  }));
}
