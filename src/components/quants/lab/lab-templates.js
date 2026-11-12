// Starter strategies for the Quant Lab builder. These are rule definitions
// only: they carry no return, Sharpe or win-rate figures, because nothing has
// been measured until the user runs a backtest of their own.

const cond = (id, params) => ({ op: 'cond', id, params });

export const LAB_TEMPLATES = [
  {
    id: 'trend-following',
    name: 'Trend following',
    summary: 'Hold a stock while its 50 day average is above its 200 day average.',
    spec: {
      universe: ['SPY'],
      benchmark: 'SPY',
      side: 'long',
      entry: { op: 'and', args: [cond('sma_cross_up', { fast: 50, slow: 200 })] },
      exit: { rule: { op: 'or', args: [cond('sma_cross_down', { fast: 50, slow: 200 })] } },
      sizing: { type: 'equal_weight', maxPositions: 1 },
    },
  },
  {
    id: 'mean-reversion',
    name: 'Oversold bounce',
    summary: 'Buy an oversold stock that is still in a long-term uptrend; exit when it recovers.',
    spec: {
      universe: ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'JPM'],
      benchmark: 'SPY',
      side: 'long',
      entry: {
        op: 'and',
        args: [
          cond('rsi_below', { threshold: 30, period: 14 }),
          cond('price_above_sma', { period: 200 }),
        ],
      },
      exit: {
        rule: { op: 'or', args: [cond('rsi_above', { threshold: 55, period: 14 })] },
        stopLossPct: 8,
        maxHoldDays: 30,
      },
      sizing: { type: 'equal_weight', maxPositions: 5 },
    },
  },
  {
    id: 'momentum-trailing',
    name: 'Momentum with trailing stop',
    summary: 'Enter on a MACD cross above its signal line; let a trailing stop decide the exit.',
    spec: {
      universe: ['NVDA', 'META', 'AVGO', 'TSLA'],
      benchmark: 'QQQ',
      side: 'long',
      entry: {
        op: 'and',
        args: [cond('macd_cross_up', {}), cond('price_above_sma', { period: 50 })],
      },
      exit: { trailingStopPct: 10 },
      sizing: { type: 'pct_equity', pct: 25, maxPositions: 4 },
    },
  },
  {
    id: 'congress-following',
    name: 'Follow Congress purchases',
    summary:
      'Buy after a member of Congress discloses a purchase, while the stock is in an uptrend.',
    spec: {
      universe: ['AAPL', 'MSFT', 'NVDA', 'GOOGL', 'AMZN', 'JPM', 'XOM', 'UNH'],
      benchmark: 'SPY',
      side: 'long',
      entry: {
        op: 'and',
        args: [cond('congress_buy', { withinDays: 10 }), cond('price_above_sma', { period: 200 })],
      },
      exit: { stopLossPct: 10, maxHoldDays: 60 },
      sizing: { type: 'equal_weight', maxPositions: 4 },
    },
  },
];
