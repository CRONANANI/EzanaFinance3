/** Static profiles for Legendary Investors (not auth users). */

export const LEGENDARY_INVESTORS = {
  'warren-buffett': {
    id: 'warren-buffett',
    name: 'Warren Buffett',
    title: 'Chairman & CEO, Berkshire Hathaway',
    netWorth: '$120B',
    style: 'Value Investing',
    description:
      'Known as the "Oracle of Omaha." Built Berkshire Hathaway into one of the most valuable companies in the world through disciplined value investing.',
    strategy:
      'Buys undervalued companies with strong moats, excellent management, and holds them for the long term. Focuses on businesses he understands with predictable earnings.',
    famousTrades: [
      { company: 'Coca-Cola', year: 1988, result: 'Bought $1B, now worth $25B+' },
      { company: 'Apple', year: 2016, result: 'Built a $175B+ position' },
      { company: 'Bank of America', year: 2011, result: '$5B preferred stock deal during crisis' },
    ],
    topHoldings: ['AAPL', 'BAC', 'KO', 'CVX', 'AXP'],
    keyQuotes: [
      'Be fearful when others are greedy and greedy when others are fearful.',
      'Our favorite holding period is forever.',
      'Price is what you pay. Value is what you get.',
    ],
    annualReturn: '20.1%',
    careerYears: '60+',
  },
  'ray-dalio': {
    id: 'ray-dalio',
    name: 'Ray Dalio',
    title: 'Founder, Bridgewater Associates',
    netWorth: '$14B',
    style: 'Global Macro',
    description:
      'Bridgewater pioneered risk parity and systematic macro. Known for "All Weather" portfolios and radical transparency.',
    strategy:
      'Diversifies across asset classes and economic environments; balances risk rather than dollar allocations. Heavy use of research and backtesting.',
    famousTrades: [
      { company: 'Bridgewater Pure Alpha', year: 1996, result: 'Scaled to largest hedge fund globally' },
      { company: 'Treasuries / FX', year: 2008, result: 'Navigated crisis with systematic risk controls' },
    ],
    topHoldings: ['SPY', 'GLD', 'TLT', 'EEM', 'IGE'],
    keyQuotes: [
      'Pain + Reflection = Progress.',
      'Diversifying well is the most important thing you need to do.',
    ],
    annualReturn: '12%',
    careerYears: '45+',
  },
  'cathy-wood': {
    id: 'cathy-wood',
    name: 'Cathy Wood',
    title: 'Founder & CEO, ARK Invest',
    netWorth: '$250M',
    style: 'Growth / Innovation',
    description:
      'Focused on disruptive innovation: genomics, AI, energy storage, robotics, and blockchain.',
    strategy:
      'Concentrated thematic ETFs with high conviction research; long-term horizon on innovation cycles.',
    famousTrades: [
      { company: 'Tesla', year: 2010, result: 'Early bull case on EV adoption' },
      { company: 'Coinbase', year: 2021, result: 'IPO positioning in crypto rails' },
    ],
    topHoldings: ['TSLA', 'COIN', 'ROKU', 'SQ', 'TDOC'],
    keyQuotes: [
      'We are looking for companies that are leading the innovation economy.',
    ],
    annualReturn: 'Variable (thematic)',
    careerYears: '40+',
  },
  'paul-tudor-jones': {
    id: 'paul-tudor-jones',
    name: 'Paul Tudor Jones',
    title: 'Founder, Tudor Investment Corporation',
    netWorth: '$8.1B',
    style: 'Global Macro',
    description:
      'Legendary macro trader; known for predicting the 1987 crash and trend-following discipline.',
    strategy:
      'Macro themes, risk management first, uses futures and options; adapts to volatility regimes.',
    famousTrades: [
      { company: 'S&P 500 futures', year: 1987, result: 'Hedged crash with short positioning' },
    ],
    topHoldings: ['SPY', 'GLD', 'TLT', 'EEM'],
    keyQuotes: [
      'The secret to being successful is to take a defensive posture.',
    ],
    annualReturn: '~15% (long-term)',
    careerYears: '45+',
  },
  'steve-cohen': {
    id: 'steve-cohen',
    name: 'Steve Cohen',
    title: 'Founder, Point72 & former SAC Capital',
    netWorth: '$21.3B',
    style: 'Quant / Discretionary',
    description:
      'Combines discretionary stock picking with quantitative research; known for intense culture of edge.',
    strategy:
      'Multi-strategy: equities, macro, and quant; heavy investment in data and talent.',
    famousTrades: [
      { company: 'Point72', year: 2014, result: 'Relaunched as family office / hedge fund' },
    ],
    topHoldings: ['MSFT', 'GOOGL', 'AMZN', 'NVDA'],
    keyQuotes: [
      'The key is to have a process and stick to it.',
    ],
    annualReturn: 'Industry-leading (private)',
    careerYears: '40+',
  },
};

export const LEGENDARY_INVESTOR_LIST = Object.values(LEGENDARY_INVESTORS);
