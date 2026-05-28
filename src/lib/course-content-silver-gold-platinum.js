/**
 * Course content for Silver/Gold/Platinum levels — textbook-sourced.
 * Sources: Isichenko, Hilpisch, Khraisha, Eager, Kanungo (B3), Huyen (B1), Nelson (B8)
 */

import FINANCIAL_STATEMENTS from './course-content-financial-statements.js';

const CONTENT = {
  'stocks-intermediate-1': {
    sections: [
      {
        title: 'What Is Fundamental Analysis?',
        content: `Fundamental analysis evaluates a company's intrinsic value by examining its financial statements, competitive position, and growth prospects. Isichenko (Ch.2.1.3) notes that "quarterly and yearly company reports of earnings, sales, cash flows, R&D expenditure, and other financials are among the primary indicators of management quality, financial health, and competitiveness." These data are sparse — typically once per quarter — and fairly complex, including hundreds of numeric and text fields per company.

The core principle: markets can misprice securities short-term, but prices converge toward intrinsic value over time. Fundamental analysis asks what a business is actually worth based on its cash flows, not what the market thinks today.

Isichenko warns that "forming relevant systematic features from company reports requires an accounting expertise. Cross-sectional application of accounting data would benefit from understanding differences between industries." The capital structure of banks and manufacturers is not the same — you cannot compare their ratios directly.`,
        keyTerms: ['intrinsic value', 'P/E ratio', 'EPS', 'free cash flow'],
      },
      {
        title: 'P/E Ratio and Valuation Multiples',
        content: `Isichenko describes how "various accounting ratios are often used" including "earnings to price, book value to price, debt to equity, dividend payout to income, assets to liabilities, profit to sales." These ratios serve dimensionality reduction — simplifying complex financials into comparable numbers, similar to how physicists use dimensional analysis.

The P/E ratio divides stock price by earnings per share. A P/E of 20 means investors pay $20 for each $1 of annual earnings. Context is everything: compare within the same industry, against historical averages, and consider growth expectations. A tech company at 30x P/E might be cheap if peers trade at 50x.

Forward P/E (using estimated future earnings) is more useful than trailing P/E because you buy future cash flows, not past ones. Isichenko (Ch.2.1.4) notes that "analyst estimates and their revisions carry a predictive power for stock returns either directly or via statistics such as the variance of analysts' opinions."`,
        visual: {
          type: 'bar-chart',
          data: {
            bars: [
              { label: 'Technology', value: 32, color: '#6366f1' },
              { label: 'Healthcare', value: 22, color: '#10b981' },
              { label: 'Financials', value: 14, color: '#f59e0b' },
              { label: 'Utilities', value: 18, color: '#06b6d4' },
              { label: 'Energy', value: 11, color: '#ef4444' },
            ],
            unit: 'x',
          },
          caption:
            'P/E ratios vary dramatically by sector — always compare within the same industry (Isichenko Ch.2.1.3).',
        },
      },
      {
        title: 'Beyond P/E \u2014 Free Cash Flow and Earnings Quality',
        content: `Khraisha defines the cash flow statement as providing "information on a firm's cash movements (in and out), which can help determine whether the firm is generating enough cash to carry out its operations." Free cash flow — operating cash flow minus capital expenditures — is the cash available after maintaining the asset base.

Why FCF matters more than earnings: accrual accounting creates gaps between reported profits and actual cash. A company might recognize revenue before collecting payment or capitalize expenses across years. When earnings grow but free cash flow shrinks, something is off.

Isichenko references how fundamental data including "earnings, sales, cash flows" are primary indicators. The shortcut: follow the cash. If free cash flow consistently exceeds net income, earnings quality is high.`,
        keyTerms: ['free cash flow', 'earnings quality', 'accrual accounting'],
        callout:
          'Isichenko Ch.2.1.3: Forming features from company reports "requires an accounting expertise." Start with FCF — it is harder to manipulate than earnings.',
      },
      {
        title: 'Margin of Safety and Practical Application',
        content: `Screen quantitatively: P/E below sector median, revenue growth above 10%, positive free cash flow, debt-to-equity below 1.5. This eliminates most noise.

Analyze survivors: read the 10-K, listen to the earnings call (our Earnings Call Analyzer helps), and build a simple earnings model. Isichenko (Ch.2.12) emphasizes "forecast research vs simulation" — validate your process.

Value: compare your intrinsic value estimate to market price. Graham recommended at least a 30% margin of safety. Kanungo (B3) adds the probabilistic perspective: your estimate is a distribution, not a point. If reasonable values range $80-$120 and the stock trades at $70, that is a strong margin of safety even with uncertainty.`,
        callout:
          'Isichenko (Ch.4.7) warns about "crowding" — when too many investors follow the same factors (like low P/E), the edge erodes. Use fundamentals as a starting point, not the entire strategy.',
      },
      {
        title: 'Connecting to the Platform',
        content: `On Ezana, the Company Research page provides real-time fundamental data via Alpha Vantage: P/E, EPS, revenue growth, margins, and free cash flow. The 3-Statement Model projects income statement, balance sheet, and cash flow forward — exactly the integrated analysis Khraisha describes.

The Comparable Company Analysis model applies peer-group median multiples to your target's financials, giving you an implied valuation range. Use this alongside your own DCF estimate for triangulation.

Isichenko's advice applies directly: "due to being widely followed, and therefore subject to crowding, these themes are also used as risk factors." Don't just screen for low P/E — combine fundamental analysis with technical timing and risk management.`,
      },
    ],
    quiz: [
      {
        question:
          'According to Isichenko, what makes cross-sectional fundamental analysis challenging?',
        options: [
          'Companies report at different frequencies',
          'Financial statements are always accurate',
          'The capital structure of different industries is not the same — direct ratio comparison across sectors is misleading',
          'All companies use the same accounting standards',
        ],
        correctIndex: 2,
        explanation:
          'Isichenko Ch.2.1.3 warns that "cross-sectional application of accounting data would benefit from understanding differences between industries" — banks and manufacturers have fundamentally different capital structures.',
      },
      {
        question: 'Why is free cash flow often more reliable than reported earnings?',
        options: [
          "Cash either arrives or it doesn't — it is harder to manipulate through accounting choices than accrual-based earnings",
          'Free cash flow is always larger',
          'The SEC verifies FCF but not earnings',
          'FCF includes stock-based compensation',
        ],
        correctIndex: 0,
        explanation:
          'Per Khraisha, the cash flow statement reveals whether the firm generates "enough cash to carry out its operations." Accounting choices affect earnings but not cash.',
      },
      {
        question: 'What does Isichenko mean by "crowding" in the context of valuation factors?',
        options: [
          'Physical overcrowding on trading floors',
          'When market cap gets too large',
          'When too many analysts cover a stock',
          'When many investors follow the same factors, the edge erodes and the trade becomes a risk factor',
        ],
        correctIndex: 3,
        explanation:
          'Isichenko Ch.4.7: widely followed factors like value and momentum become risk factors because crowded positions unwind violently.',
      },
      {
        question: 'According to Kanungo (B3), how should valuation estimates be treated?',
        options: [
          'As exact prices to trade at',
          'As distributions with uncertainty ranges, not point estimates',
          'As irrelevant to investment decisions',
          'As government-mandated figures',
        ],
        correctIndex: 1,
        explanation:
          "Kanungo's probabilistic framework emphasizes every prediction should output a distribution — ignoring uncertainty leads to overconfidence.",
      },
      {
        question: 'What does Isichenko say about analyst estimates (Ch.2.1.4)?',
        options: [
          'Their revisions carry predictive power for stock returns, but the data is complicated by varying coverage and conflicts of interest',
          'They are always accurate',
          'They should be ignored entirely',
          'Only sell-side analysts matter',
        ],
        correctIndex: 0,
        explanation:
          'Isichenko: "analyst estimates and their revisions carry a predictive power for stock returns either directly or via statistics such as the variance of analysts\' opinions."',
      },
    ],
  },

  'stocks-intermediate-2': {
    sections: [
      {
        title: 'Mean Reversion and Momentum \u2014 The Two Forces',
        content: `Isichenko (Ch.2.2) identifies two primary technical phenomena. Mean reversion (Ch.2.2.1): "most stock moves are correlated with, and can be 'explained by,' the market." After removing the market effect via beta regression (Eq. 2.2), residual returns show mean-reverting behavior. Isichenko explains: "The story of mean reversion is herding" — stocks deviate from the mean due to overreaction, then revert as the overreaction corrects.

Momentum (Ch.2.2.2): "over longer horizons, stock returns tend to be positively autocorrelated," attributed to "delayed information propagation and behavioral effects." Momentum is "more natural to expect in group forecasts, such as for industry or other factor returns, where the oscillatory residual noise tends to cancel out."

These two forces operate on different timescales: mean reversion dominates daily residual returns (1-5 days), while momentum drives trend-following over weeks to months.`,
        keyTerms: ['mean reversion', 'momentum', 'beta', 'residual return'],
      },
      {
        title: 'Reading Charts \u2014 Candlesticks, Support, Resistance',
        content: `Candlestick charts encode open, high, low, and close. The body shows open-to-close range; wicks show high-low extremes. Key patterns: doji (indecision), hammer (potential reversal), engulfing (strong reversal signal).

Support and resistance form because of market memory. Isichenko's mean reversion framework explains why: stocks that deviate from their recent range experience statistical pull back toward the mean. When support breaks, it often becomes resistance (the "polarity flip").

Isichenko (Ch.2.2.3) emphasizes trading volume as confirmation: "a breakout on heavy volume means many participants confirmed the move." Volume validates price signals and distinguishes real moves from noise.`,
        visual: {
          type: 'comparison-table',
          data: {
            columns: [
              { label: 'Mean Reversion', color: '#10b981' },
              { label: 'Momentum', color: '#6366f1' },
            ],
            rows: [
              {
                attribute: 'Time horizon',
                values: ['Short (1-5 days)', 'Medium (weeks-months)'],
              },
              {
                attribute: 'Isichenko reference',
                values: [
                  'Ch.2.2.1 — residual returns revert',
                  'Ch.2.2.2 — positive autocorrelation',
                ],
              },
              {
                attribute: 'Technical tool',
                values: ['RSI, Bollinger Bands', 'Moving average crossovers, MACD'],
              },
              {
                attribute: 'Story',
                values: ['Herding → overreaction → reversion', 'Delayed information propagation'],
              },
            ],
          },
          caption:
            'Isichenko identifies these as the two primary technical phenomena — they operate on different timescales.',
        },
      },
      {
        title: 'Moving Averages and Indicators',
        content: `The 50-day and 200-day simple moving averages (SMA) are the most-watched. The "Golden Cross" (50-day crossing above 200-day) confirms uptrends; the "Death Cross" confirms downtrends. These are lagging indicators — useful for confirmation, not prediction.

RSI measures momentum on a 0-100 scale. Above 70 is "overbought"; below 30 is "oversold." But Isichenko's momentum research (Ch.2.2.2) shows that in strong trends, prices can stay overbought for weeks — don't blindly fade momentum.

MACD shows the relationship between two exponential moving averages. The histogram is the most actionable signal. These indicators are available live on Ezana's Technical Scanner on the For the Quants page, pulling real-time data from Alpha Vantage.`,
        callout:
          'Isichenko Ch.2.2.2: Momentum "has been attributed to delayed information propagation and behavioral effects." Strong trends can persist longer than mean reversion traders expect.',
      },
      {
        title: 'Backtesting Technical Signals',
        content: `Hilpisch (Ch.10) introduces vectorized backtesting: processing entire time series at once for speed. "Backtesting an SMA-Based Strategy" shows how to validate moving average crossover signals on historical data.

But Isichenko (Ch.7.2) warns about "simulation and overfitting" — the more strategies you test, the more likely you find false positives. Cross-validation (Ch.2.4.8) is essential: split data into training and testing sets, and the "final testing verdict is supposed to be rendered only once."

Isichenko quotes Feynman: "The first principle is that you must not fool yourself — and you are the easiest person to fool." This is the central challenge of technical analysis: distinguishing real patterns from noise.`,
      },
      {
        title: 'Risk Management for Technical Traders',
        content: `Every setup needs three elements before entry: trigger, stop loss, and target. Position sizing: never risk more than 1-2% per trade.

Isichenko (Ch.6.9) derives optimal sizing via the Kelly criterion: "a gambler receives a positive return R on the bet amount with probability p and otherwise loses the whole bet. The question is what fraction φ of money at hand to bet repeatedly for long-term success." The optimal fraction is φ* = p - (1-p)/R. Most practitioners use fractional Kelly (25-50%) because estimation error in p and R can lead to catastrophic over-sizing.

The best technical traders win only 40-60% of the time. They profit because winners exceed losers — the math of expectation, not accuracy.`,
      },
    ],
    quiz: [
      {
        question:
          'According to Isichenko Ch.2.2.1, what drives mean reversion in stock residual returns?',
        options: [
          'Government intervention',
          'Random chance with no mechanism',
          'Herding behavior — stocks deviate from the mean due to overreaction, then revert',
          'Dividend payments',
        ],
        correctIndex: 2,
        explanation:
          'Isichenko: "The story of mean reversion is herding" — stocks move with the market and experience residual motion that reverts.',
      },
      {
        question: 'What does Isichenko attribute momentum to (Ch.2.2.2)?',
        options: [
          'Delayed information propagation and behavioral effects',
          'Insider trading',
          'Market manipulation',
          'Seasonal patterns',
        ],
        correctIndex: 0,
        explanation:
          'Isichenko: "Momentum has been attributed to delayed information propagation and behavioral effects."',
      },
      {
        question: 'What does Isichenko (Ch.7.2) warn about backtesting?',
        options: [
          'Backtesting is always accurate',
          'Only forward testing matters',
          'Backtesting should never be used',
          'The more strategies you test, the more likely you find false positives (overfitting)',
        ],
        correctIndex: 3,
        explanation:
          'Ch.7.2 "Simulation and overfitting" — extensive testing increases the risk of discovering patterns that are noise, not signal.',
      },
      {
        question: 'Hilpisch (Ch.10) introduces what approach to backtesting?',
        options: [
          'Manual paper trading only',
          'Vectorized backtesting — processing entire time series at once for speed',
          'Asking experts for opinions',
          'Only using monthly data',
        ],
        correctIndex: 1,
        explanation:
          'Hilpisch Ch.10 "Vectorized Backtesting" processes whole time series simultaneously, enabling rapid strategy validation.',
      },
      {
        question:
          'Using the Kelly criterion (Isichenko Ch.6.9), what determines optimal position size?',
        options: [
          'The edge (win probability and payoff) relative to the variance of outcomes',
          'The stock price',
          'How many other traders are in the position',
          'The time of day',
        ],
        correctIndex: 0,
        explanation:
          'Kelly sizes positions based on edge relative to variance: φ* = p - (1-p)/R. Larger edge with less uncertainty justifies bigger positions.',
      },
    ],
  },

  ...FINANCIAL_STATEMENTS,
};

export default CONTENT;
