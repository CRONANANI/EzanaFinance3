/**
 * Authored content: stocks-advanced-1 — Options Trading Fundamentals (10 sections).
 */

export default {
  'stocks-advanced-1': {
    sections: [
      {
        title: 'What options are',
        content:
          'An option is a contract that gives the buyer the right, but not the obligation, to buy (call) or sell (put) an underlying asset at a specified strike price before or at expiration. The seller (writer) takes the opposite obligation and receives premium upfront.\n\nUnlike stock ownership, options are finite-life instruments. Time decay, volatility, and strike selection all matter from day one. Every options position is a bundle of exposures to direction, volatility, and time.',
        keyTerms: ['call', 'put', 'strike', 'expiration', 'premium'],
      },
      {
        title: 'Intrinsic vs extrinsic value',
        content:
          'Intrinsic value is how much the option would be worth if exercised immediately. For a call, it is max(0, spot − strike); for a put, max(0, strike − spot). Extrinsic value (time value) is premium minus intrinsic value.\n\nAt expiration, only intrinsic value remains. Before expiration, extrinsic value reflects time left, implied volatility, dividends, and rates. Deep in-the-money options trade mostly on intrinsic value; at-the-money options are dominated by extrinsic value.',
        keyTerms: ['intrinsic value', 'extrinsic value', 'moneyness', 'in the money'],
      },
      {
        title: 'The Greeks — delta, gamma, theta, vega',
        content:
          'Delta measures sensitivity to a $1 move in the underlying. Gamma measures how fast delta changes. Theta measures daily time decay. Vega measures sensitivity to a 1-point change in implied volatility.\n\nProfessionals manage portfolios of Greeks, not just direction. A long call is not only bullish — it is long delta, long gamma, short theta, and long vega. Risk management means understanding which Greek will hurt you if the market moves against your thesis.',
        keyTerms: ['delta', 'gamma', 'theta', 'vega', 'rho'],
      },
      {
        title: 'Buying calls and puts',
        content:
          'Long calls profit when the underlying rises sharply enough to overcome premium paid. Maximum loss is the premium. Long puts profit when the underlying falls; they act as portfolio insurance.\n\nBuying options offers defined risk and leverage, but you fight theta every day. Many long-option positions lose money even when direction is roughly correct because time decay and implied volatility crush erode edge.',
        callout:
          'Defined risk does not mean high probability of profit — theta is a headwind for buyers.',
      },
      {
        title: 'Writing options — covered calls and cash-secured puts',
        content:
          'Selling options collects premium and creates obligation. A covered call sells upside on stock you already own. A cash-secured put sells downside insurance while setting a potential entry price.\n\nWriters earn theta but face tail risk. A short put in a crash can require buying stock far above market. Position sizing and margin awareness are essential before writing any contract.',
        keyTerms: ['covered call', 'cash-secured put', 'assignment', 'obligation'],
      },
      {
        title: 'Vertical spreads',
        content:
          'Vertical spreads combine long and short options at different strikes with the same expiration. Bull call spreads cap cost and upside. Bear put spreads hedge or speculate on declines with limited premium.\n\nCredit spreads (e.g., bull put, bear call) collect premium with defined max loss. Spreads reduce capital requirements versus naked long options and clarify risk/reward at trade inception.',
        keyTerms: ['vertical spread', 'debit spread', 'credit spread', 'max loss'],
      },
      {
        title: 'Volatility — implied vs realized',
        content:
          'Implied volatility is the market’s forecast embedded in option prices. Realized volatility is what actually happened historically. When implied volatility exceeds realized, options tend to be rich — sellers have a statistical edge, though not without risk.\n\nThe volatility smile shows implied vol varies by strike — out-of-the-money puts often trade richer after equity crashes. Earnings and macro events create volatility spikes that collapse after the event (vol crush).',
        visual: {
          type: 'bar-chart',
          data: {
            bars: [
              { label: 'ATM', value: 22, color: 'var(--emerald)' },
              { label: 'OTM Put', value: 28, color: 'var(--negative)' },
              { label: 'OTM Call', value: 24, color: 'var(--info)' },
            ],
            unit: '% IV',
          },
          caption:
            'Implied volatility often rises for out-of-the-money puts — the equity volatility smile.',
        },
      },
      {
        title: 'Straddles, strangles, and iron condors',
        content:
          'Straddles buy ATM call and put — a pure volatility bet. Strangles use OTM legs for lower cost. Iron condors sell premium on both sides with long wings for protection — a range-bound strategy.\n\nMulti-leg structures define risk boxes at entry but require understanding of max profit, max loss, and breakevens. Liquidity in wings matters; wide bid-ask spreads can erase edge on small accounts.',
        keyTerms: ['straddle', 'strangle', 'iron condor', 'breakeven'],
      },
      {
        title: 'Risk management and position sizing',
        content:
          'Risk per trade should be a small fraction of account equity — many professionals target 1–2% max loss per structure. Options leverage can turn small underlying moves into large P&L swings.\n\nDefine exit rules before entry: time stop, profit target, or delta hedge trigger. Never size a naked short option like a stock trade; margin calls can force liquidation at the worst moment.',
      },
      {
        title: 'Expiration, exercise, and assignment',
        content:
          'American options can be exercised early (especially calls before dividends). European options exercise only at expiration. Assignment delivers stock or cash settlement per contract specs.\n\nPin risk near expiration can cause unexpected stock positions. Close or roll positions before expiration week unless you intentionally want delivery. Always read contract specifications (multiplier, settlement style) before trading a new underlying.',
        keyTerms: ['assignment', 'exercise', 'pin risk', 'settlement'],
      },
    ],
    quiz: [],
  },
};
