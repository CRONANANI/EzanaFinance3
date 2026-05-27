import COURSE_CONTENT from './course-content';
import QUIZ_BANK from './course-quiz-bank';
import { transformCourseContent } from './section-modules-transform';
import COURSE_CONTENT_BRONZE_REST_MODULES from './course-content-bronze-rest.modules.json';
import COURSE_CONTENT_CRYPTO_BRONZE_MODULES from './course-content-crypto-bronze.modules.json';
import COURSE_CONTENT_SILVER_GOLD_PLATINUM_MODULES from './course-content-silver-gold-platinum.modules.json';

const MIGRATED_CONTENT = {
  ...COURSE_CONTENT_SILVER_GOLD_PLATINUM_MODULES,
  ...COURSE_CONTENT_CRYPTO_BRONZE_MODULES,
  ...COURSE_CONTENT_BRONZE_REST_MODULES,
};

function hashSeed(str) {
  let h = 0;
  for (let i = 0; i < str.length; i += 1) h = (h << 5) - h + str.charCodeAt(i);
  return Math.abs(h);
}

function sanitizeAuthorRefs(text) {
  if (!text || typeof text !== 'string') return text;
  return text
    .replace(/Isichenko \(Ch\.[^)]+\)/g, 'Research')
    .replace(/Isichenko's/g, 'The')
    .replace(/Isichenko /g, '')
    .replace(/Kanungo \(B3[^)]*\)/g, 'Probabilistic analysis')
    .replace(/Kanungo's/g, 'The')
    .replace(/Kanungo /g, '')
    .replace(/Hilpisch \(Ch\.[^)]+\)/g, 'Empirical research')
    .replace(/Hilpisch /g, '')
    .replace(/Feynman: "[^"]+"/g, 'Self-deception is the most common analytical error.')
    .replace(/\(Ch\.[^)]+\)/g, '')
    .replace(/ \(B3\)/g, '')
    .replace(/ \(B1 Ch\.[^)]+\)/g, '')
    .replace(/  +/g, ' ')
    .trim();
}

function sanitizeModule(module) {
  if (!module || typeof module !== 'object') return module;
  const out = { ...module };
  if (typeof out.body === 'string') out.body = sanitizeAuthorRefs(out.body);
  if (typeof out.caption === 'string') out.caption = sanitizeAuthorRefs(out.caption);
  if (typeof out.title === 'string') out.title = sanitizeAuthorRefs(out.title);
  if (Array.isArray(out.events)) {
    out.events = out.events.map((e) => ({
      ...e,
      label: sanitizeAuthorRefs(e.label),
      detail: sanitizeAuthorRefs(e.detail),
    }));
  }
  if (Array.isArray(out.terms)) {
    out.terms = out.terms.map((t) =>
      typeof t === 'string'
        ? sanitizeAuthorRefs(t)
        : { ...t, name: sanitizeAuthorRefs(t.name), definition: sanitizeAuthorRefs(t.definition) },
    );
  }
  return out;
}

function sanitizeSections(sections) {
  if (!Array.isArray(sections)) return sections;
  return sections.map((s) => ({
    ...s,
    title: sanitizeAuthorRefs(s.title),
    content: sanitizeAuthorRefs(s.content),
    callout: sanitizeAuthorRefs(s.callout),
    modules: Array.isArray(s.modules) ? s.modules.map(sanitizeModule) : s.modules,
  }));
}

/* ═══════════════════════════════════════════════════════════════
   TEXTBOOK KNOWLEDGE BASE — embedded educational content
   keyed by topic keywords matched against course titles.
   Sources cited inline per the project's textbook library.
   ═══════════════════════════════════════════════════════════════ */

const TEXTBOOK_PARAGRAPHS = {
  // ── Stocks topics ──
  'fundamental analysis': [
    'Isichenko (Ch.2.1.3) notes that "quarterly and yearly company reports of earnings, sales, cash flows, R&D expenditure, and other financials are among the primary indicators of management quality, financial health, and competitiveness." Various accounting ratios including "earnings to price, book value to price, debt to equity" serve as dimensionality reduction for cross-sectional analysis.',
    'Kanungo (B3) emphasizes that every valuation estimate should be treated as a distribution, not a point estimate. A P/E of 15 means different things depending on earnings volatility. Always pair your estimate with a confidence interval.',
    'Khraisha defines the three core financial statements: income statement (performance over time), balance sheet (financial position at a point), and cash flow statement (cash movements). Understanding how they link is essential for company evaluation.',
  ],
  'technical analysis': [
    'Isichenko (Ch.2.2.1) explains mean reversion: "most stock moves are correlated with, and can be explained by, the market." After removing the market effect, residual returns show mean-reverting behavior driven by herding — stocks deviate from the mean due to overreaction, then revert.',
    'Isichenko (Ch.2.2.2) describes momentum: "over longer horizons, stock returns tend to be positively autocorrelated," attributed to "delayed information propagation and behavioral effects." Momentum is more natural in group forecasts like industry returns where idiosyncratic noise cancels out.',
    'Trading volume (Isichenko Ch.2.2.3) provides crucial confirmation — a breakout on heavy volume means many participants agree with the move. Volume validates price signals and distinguishes real moves from noise.',
  ],
  'financial statements': [
    'Khraisha defines three core statements: the balance sheet ("what a firm owns, what it owes, and what its shareholders own"), the income statement ("financial performance over a specific period"), and the cash flow statement ("information on cash movements"). These are linked by accounting identity.',
    'The income statement cascade: Revenue → Gross Profit → Operating Income (EBIT) → Net Income. Each level removes a layer of costs, revealing where the business model creates or destroys value.',
    'Free cash flow = operating cash flow minus capital expenditures. Khraisha notes the cash flow statement "can help determine whether the firm is generating enough cash to carry out its operations." When earnings grow but FCF shrinks, earnings quality may be poor.',
  ],
  'sector analysis': [
    'Isichenko (Ch.2.1.3) warns that "cross-sectional application of accounting data would benefit from understanding differences between industries" — the "capital structure of banks and manufacturers is not the same." Always compare within sectors.',
    'The 11 GICS sectors represent the standard classification for equity analysis. Cyclical sectors (Technology, Consumer Discretionary) move with the economy; defensive sectors (Utilities, Consumer Staples) resist downturns.',
    'Sector rotation strategies follow the business cycle: early recovery favors Financials and Consumer Discretionary; late cycle favors Energy and Materials; recession favors Utilities and Healthcare.',
  ],
  dividend: [
    "Dividend yield = annual dividend per share ÷ share price. A high yield can signal value or a dividend cut risk. Compare yield to the company's payout ratio (dividends ÷ earnings) — above 80% may be unsustainable.",
    'Dividend aristocrats have raised dividends for 25+ consecutive years. This consistency signals financial discipline and stable cash flows. DRIP (dividend reinvestment plans) harness compound growth by automatically buying more shares.',
    'Isichenko notes dividend-related data as useful cross-sectional features. From a factor perspective, high-dividend stocks have historically shown defensive characteristics and lower volatility than the broad market.',
  ],
  'growth vs value': [
    'Isichenko (Ch.4.3) identifies growth and value as standard risk factors, noting these themes are "widely followed, and therefore subject to crowding." Growth stocks trade at high multiples on earnings expectations; value stocks trade at low multiples relative to fundamentals.',
    'Hilpisch (Ch.4) debunks the assumption of normally distributed returns, showing that "central assumptions of popular financial theories are invalid." Both growth and value strategies experience fat-tail events that standard models underestimate.',
    'The historical debate: value has outperformed growth over very long periods (decades), but growth has dominated recent years driven by tech. The key insight: neither approach works all the time, and crowding erodes the edge of whichever style is popular.',
  ],
  'portfolio construction': [
    'Isichenko (Ch.3.1) presents the "Sharpe triangle" — when combining two portfolios, the combined Sharpe ratio depends on individual Sharpe ratios AND their correlation. Lower correlation yields higher combined Sharpe, even if individual components are mediocre.',
    'Mean-variance optimization (Isichenko Ch.6) maximizes expected return for a given level of risk. The utility function U = E[return] - (k/2) × Var[return] balances greed and fear. The risk aversion coefficient k determines the optimal point on the efficient frontier.',
    'Kanungo (B3 Ch.5) warns against treating covariance estimates as precise — estimation error in the covariance matrix often dominates the optimization, leading to extreme and unstable weights. Regularization (shrinkage, constraints) is essential.',
  ],
  tax: [
    'Long-term capital gains (assets held over one year) are taxed at lower rates than short-term gains. Tax-loss harvesting — selling losing positions to offset gains — can reduce your tax bill significantly if done systematically.',
    'Tax-advantaged accounts (401k, IRA, Roth IRA) shelter different types of income. Traditional accounts defer taxes until withdrawal; Roth accounts use after-tax contributions but allow tax-free growth and withdrawal.',
    'Wash sale rules prevent claiming a tax loss if you repurchase the same or substantially identical security within 30 days. Plan harvesting carefully to avoid losing the deduction.',
  ],
  options: [
    'A call option gives the right (not obligation) to buy at the strike price. A put gives the right to sell. The premium is the price of this optionality. Options have leverage built in — a small move in the underlying can cause a large move in the option price.',
    'Isichenko (Ch.5) discusses trading costs including options-related impact: "Stock options are sensitive to stock price and volatility. Option-implied volatility can predict future stock returns and can be used as a risk factor." This dual sensitivity (price + vol) makes options complex but informative.',
    'The Greeks: Delta measures price sensitivity to underlying, Gamma measures delta sensitivity, Theta measures time decay, Vega measures volatility sensitivity. Understanding Greeks is essential for managing option positions.',
  ],
  'options strategies': [
    'Covered calls: own the stock, sell a call above current price. You collect premium (income) but cap your upside. Best in flat-to-slightly-bullish markets. Risk: stock drops and you keep the shares at a loss.',
    'Protective puts: own the stock, buy a put below current price. You pay premium for downside protection (insurance). Best when you want to maintain upside exposure but fear a near-term decline.',
    'Spreads combine buying and selling options to define risk. Bull call spreads (buy lower strike, sell higher strike) cap both profit and loss. Iron condors sell both a put spread and a call spread, profiting from range-bound markets.',
  ],
  'short selling': [
    'Short selling borrows shares and sells them, hoping to buy them back cheaper later. The profit is the price difference minus borrowing costs. Isichenko (Ch.4.8) covers "liquidity risk and short squeeze" — the danger that a heavily shorted stock surges as shorts are forced to cover.',
    'Margin requirements for short positions are strict: you must maintain collateral (typically 150% of the short position value). A margin call forces you to add capital or close the position — often at the worst possible time.',
    'Short interest (shares sold short ÷ float) is a useful sentiment indicator. Very high short interest can signal either a troubled company or a potential short squeeze. Isichenko warns about crowding — heavily shorted names attract contrarian buyers.',
  ],
  'margin trading': [
    'Leverage amplifies both gains and losses. A 2x leveraged position doubles your returns on the upside but also doubles losses on the downside. Isichenko (Ch.6.9) discusses optimal leverage via the Kelly criterion.',
    'The Kelly criterion suggests optimal bet size grows with edge and shrinks with uncertainty: f* = (bp - q) / b where b is odds, p is win probability, q = 1-p. Most practitioners use fractional Kelly (25-50%) to reduce variance.',
    'Margin calls occur when your equity falls below the maintenance requirement (typically 25-30% of position value). The broker forces you to deposit more cash or liquidate positions — always at the worst time. This is why position sizing matters more than stock picking.',
  ],
  'quantitative analysis': [
    'Isichenko (Ch.2.3) covers "basic concepts of statistical learning" — the goal is to find an approximation of an unknown function from observed data pairs. In finance, this means predicting future returns from observable features.',
    'Backtesting (Hilpisch Ch.10) validates strategies on historical data. Vectorized backtesting processes entire time series at once for speed. But Isichenko (Ch.7.2) warns: "simulation and overfitting" — the more you test, the more likely you find false positives.',
    'The Sharpe ratio (return / volatility) is the standard risk-adjusted performance metric. Alpha measures excess return above the benchmark. Beta measures market sensitivity. These metrics form the vocabulary of quantitative analysis.',
  ],
  'behavioral finance': [
    'Isichenko (Ch.2.2.1) attributes mean reversion to herding behavior: investors overreact to news, pushing prices away from fair value, then the overreaction corrects. Understanding this cycle is the foundation of contrarian investing.',
    'Loss aversion (Kahneman & Tversky): a dollar lost feels roughly twice as painful as a dollar gained feels good. This asymmetry drives revenge trading, premature profit-taking, and the inability to cut losses.',
    'Confirmation bias causes investors to seek information that confirms existing beliefs. The antidote: before making any investment, write down the strongest argument against your thesis. If you cannot articulate the counter-argument, you do not understand the position.',
  ],
  macroeconomics: [
    'Isichenko (Ch.2.1.10) identifies macroeconomic data as important for forecasting: "Common trends among stocks can be already deduced from mainstream news soundbites discussing investors putting money into stocks, bonds, or fleeing to cash."',
    'Interest rates set by central banks are the most powerful force in markets. Lower rates make borrowing cheaper (bullish for growth stocks), higher rates make bonds more attractive (bearish for equities). The Fed funds rate cascades through every asset class.',
    'Hilpisch (Ch.4) shows that "debunking central assumptions" of traditional finance reveals that real market returns are not normally distributed and relationships are not linear. Macro shocks create fat-tail events that standard models miss.',
  ],
  earnings: [
    "Our platform's Earnings Call Analyzer uses the Loughran-McDonald financial lexicon to score transcript sentiment, Q&A evasiveness, and uncertainty language — providing quantitative signals from qualitative data.",
    'Isichenko (Ch.2.1.3) notes that "companies occasionally issue earnings guidance statements or conference calls typically designed to manage investor expectations." Forward guidance is often more market-moving than the actual earnings number.',
    'Earnings surprise (actual EPS minus consensus estimate) has been shown to predict short-term stock returns. But Isichenko warns about crowding — too many traders following the same earnings signals erodes the edge.',
  ],
  'algorithmic trading': [
    'Isichenko (Ch.6.10.3) covers "algorithmic trading and HFT" — execution algorithms break large orders into smaller pieces to minimize market impact. The goal is to trade at the best possible price while hiding your intentions from other participants.',
    'Hilpisch (Ch.12) details deployment of trading bots — from data retrieval through order execution. The key challenge is bridging the gap between backtest performance and live trading, where slippage, latency, and partial fills degrade returns.',
    'Isichenko (Ch.5) discusses trading costs and market elasticity: "the cost of acquiring a position can be significant." Linear impact models estimate that price moves proportionally to order size — larger trades move prices more. Smart order routing minimizes this cost.',
  ],
  'factor investing': [
    'Isichenko (Ch.4.3) identifies standard risk factor types used in portfolio construction. Factors include market (beta), size (small vs large), value (cheap vs expensive), momentum (winners vs losers), and volatility (low vol vs high vol).',
    'Factor models decompose returns into systematic components (factor exposures) and residual (stock-specific) returns. Isichenko (Ch.4.4): "Return and risk decomposition" allows you to understand whether performance comes from skill (alpha) or factor exposure (beta).',
    'Crowding is the critical risk: Isichenko (Ch.4.7) warns that widely followed factors "are subject to crowding." When too many portfolios hold the same factor exposures, the factor becomes fragile — it can reverse violently when crowded positions unwind simultaneously.',
  ],
  'portfolio risk': [
    'Isichenko (Ch.4.1) defines Value at Risk (VaR) as "the maximum expected loss over a time horizon at a confidence level." VaR at 95% = the loss you should exceed only 5% of the time. Expected Shortfall (CVaR) averages the losses beyond VaR — a more conservative measure.',
    'Stress testing (Isichenko Ch.4) simulates extreme scenarios: what happens to your portfolio if the market drops 30%? If interest rates spike 200bps? If your largest position goes to zero? These scenarios reveal hidden concentrations.',
    'Kanungo (B3) emphasizes that "conventional ML models make point predictions with false confidence." For portfolio risk, this means VaR estimates carry uncertainty — a model that says VaR is $10,000 might be wrong by 50%. Use multiple methods and take the worst case.',
  ],
  'market microstructure': [
    'Isichenko (Ch.6.10) covers execution mechanics: trade curves, forecast-timed execution, and algorithmic trading. The order book shows limit orders at various prices. Market orders execute immediately but take liquidity; limit orders provide liquidity but may not fill.',
    "Dark pools are private exchanges where large institutional orders execute without displaying to the public order book. This hides the institution's intentions but creates information asymmetry.",
    'Isichenko (Ch.6.10.4) discusses "HFT controversy" — high-frequency traders provide liquidity and narrow spreads, but they also front-run slower participants. The debate over whether HFT helps or hurts markets remains unresolved.',
  ],
  'global markets': [
    'Isichenko (Ch.2.1.10) includes macroeconomic data as a forecasting input. Currency movements affect equity returns for international investors — a stock rising 10% in local currency gains nothing if the currency depreciated 10% against your home currency.',
    'Currency hedging eliminates FX risk but costs carry (the interest rate differential between currencies). Whether to hedge depends on your time horizon and whether you view FX exposure as risk or diversification.',
    'Hilpisch shows that "central assumptions of popular financial theories are invalid" globally as well — emerging market returns have even fatter tails than developed markets, and correlations spike during crises (exactly when you need diversification most).',
  ],
  // ── Crypto topics ──
  defi: [
    'DeFi (Decentralized Finance) replicates traditional financial services — lending, borrowing, trading — using smart contracts on blockchains. The key innovation: anyone can participate without permission from a gatekeeper.',
    'Yield farming provides liquidity to DeFi protocols in exchange for token rewards. But Kanungo (B3) would warn: high yields often indicate high risk — the yield is compensation for impermanent loss, smart contract risk, and protocol insolvency.',
    'Liquidity pools replace traditional order books with automated market makers (AMMs). Depositors earn trading fees but face impermanent loss — when the price ratio of deposited assets changes, you would have been better off simply holding.',
  ],
  nft: [
    'NFTs (Non-Fungible Tokens) use blockchain to prove ownership of unique digital assets. Unlike fungible tokens (every BTC is identical), each NFT is distinct. The technology has applications beyond art: real estate titles, event tickets, identity verification.',
    'From an investment perspective, NFTs are extremely illiquid, have no cash flows, and are valued purely by subjective demand. Apply the same skepticism you would to any collectible — most lose value, a few appreciate dramatically.',
  ],
  stablecoin: [
    'Stablecoins maintain a peg to a reference asset (usually USD). Three mechanisms: fiat-backed (USDC holds dollars in bank accounts), crypto-backed (DAI uses overcollateralized crypto), and algorithmic (maintain peg through supply adjustments).',
    'Kanungo (B3) would classify algorithmic stablecoins as carrying significant model risk — the peg mechanism relies on assumptions about market behavior that may break under stress. The Terra/Luna collapse in 2022 demonstrated this catastrophically.',
  ],
  'crypto trading': [
    "Isichenko's mean reversion (Ch.2.2.1) and momentum (Ch.2.2.2) frameworks apply to crypto with amplified magnitude. Crypto markets are more volatile, trade 24/7 with no circuit breakers, and are more retail-driven — creating larger mispricings and stronger trends.",
    'Hilpisch (Ch.10-11) covers backtesting and risk management for trading strategies. In crypto, additional risks include: exchange counterparty risk, smart contract bugs, regulatory changes, and extreme leverage through perpetual futures.',
  ],
  'crypto derivatives': [
    'Perpetual futures (perps) have no expiration date — they use a funding rate mechanism to keep the price aligned with spot. When longs pay shorts (positive funding), the market is bullish; when shorts pay longs, bearish.',
    "Isichenko's Kelly criterion (Ch.6.9) is critical for crypto derivatives: leverage of 10-100x means a 1% adverse move can liquidate your position. Most successful crypto traders use 1-3x leverage at most.",
  ],
  // ── Betting topics ──
  'value bet': [
    'Eager (Ch.6) defines expected value: EV = (probability × payout) - (1 - probability) × stake. A positive EV bet has long-term profitability. The key challenge: estimating the true probability more accurately than the market.',
    'Line shopping — comparing odds across sportsbooks or prediction markets — is the simplest edge. Eager notes that the vigorish (vig) requires a 52.38% success rate at standard -110 lines just to break even.',
    'Kanungo (B3 Ch.8) covers "Making Probabilistic Decisions" — you should only act when your model probability exceeds the break-even probability by a meaningful margin. A thin edge is easily eroded by variance.',
  ],
  'political betting': [
    'Prediction markets aggregate diverse opinions into prices. Eager (Ch.6) references the "wisdom of crowds" — markets with sufficient participation and incentives tend to outperform individual experts.',
    'Political markets are unique: they resolve on specific dates (election day), have binary outcomes, and are influenced by both fundamentals (polling) and sentiment. The most accurate forecasts combine poll aggregates with market prices.',
  ],
  'sports analytics': [
    'Eager (Ch.6) demonstrates Poisson regression for modeling count outcomes (touchdowns, goals): P(X=k) = (λ^k × e^-λ) / k!. The Poisson distribution works because scoring events are discrete and roughly independent within a game.',
    'Eager (Ch.2) emphasizes regression to the mean: "when people are above average, statistical models expect them to decrease to be closer to average." This is critical for evaluating streaky performance in sports and markets alike.',
    'Eager (Ch.5) uses logistic regression for binary outcomes (win/loss, cover/no-cover): P(Y=1) = 1/(1+e^(-Xβ)). The same GLM framework applies to predicting any binary financial event.',
  ],
  'betting model': [
    'Eager (Ch.6) demonstrates building a Poisson regression model for NFL prop bets: log(λ) = β₀ + β₁(player_rate) + β₂(total_line) + β₃(opponent_defense). The model outputs expected counts that convert to probabilities via the Poisson PMF.',
    'Hilpisch (Ch.6) extends this to ML: "Market Prediction Based on Returns Data" shows that neural networks can capture nonlinear patterns that GLMs miss — but at the cost of interpretability and overfitting risk.',
    'Isichenko (Ch.7.2) warns about "simulation and overfitting" — the more models you test, the more likely you find one that fits the past by chance. Cross-validation (Ch.2.4.8) and out-of-sample testing are essential.',
  ],
  arbitrage: [
    'Arbitrage in prediction markets exploits price differences across platforms. If one market prices an event at 60% and another at 40%, buying YES on one and NO on the other guarantees profit regardless of outcome.',
    'Isichenko (Ch.2.1.6) discusses "M&A and risk arbitrage" in equities — similar principles apply: when a spread exists between the market price and the expected outcome, systematic traders capture it.',
  ],
  // ── Commodities topics ──
  futures: [
    'Futures contracts obligate the buyer to purchase (and seller to deliver) a commodity at a specified price on a future date. Margin requirements are typically 5-15% of contract value, providing inherent leverage.',
    'Isichenko (Ch.5) discusses trading costs including impact: "the cost of acquiring a position can be significant." In commodity futures, rolling contracts (closing the expiring month, opening the next) incurs additional costs — especially in contango markets.',
    'Contango (futures price > spot price) means rolling costs you money; backwardation (futures < spot) means rolling earns money. This "roll yield" can dominate commodity fund returns over time.',
  ],
  'commodity chart': [
    'Seasonal patterns are a key feature of commodity markets: agricultural commodities follow planting and harvest cycles; natural gas has winter heating demand; gasoline prices rise before summer driving season.',
    "Isichenko's technical forecasting framework (Ch.2.2) applies to commodities: mean reversion dominates short-term moves (supply shocks revert), while momentum drives medium-term trends (sustained demand shifts).",
  ],
  'energy market': [
    'Crude oil prices depend on OPEC+ production decisions, shale supply economics, refining capacity constraints, and global demand. Isichenko (Ch.2.1.10) notes macroeconomic data directly impacts energy demand forecasts.',
    'The oil market has a unique structural feature: strategic petroleum reserves held by governments can buffer supply shocks. SPR releases temporarily lower prices but do not fix structural shortages.',
  ],
  gold: [
    'Gold functions as a monetary metal, jewelry input, and crisis hedge. It pays no coupon, so its opportunity cost rises when real interest rates increase. Historical data shows imperfect but real inflation-hedging properties.',
    'Kanungo (B3) would classify gold as having high uncertainty in any directional forecast — it lacks cash flows for DCF valuation, making it inherently harder to price than equities or bonds.',
  ],
  agricultural: [
    'Agricultural commodity prices are dominated by weather (droughts, floods), disease (affecting livestock), and government policy (subsidies, tariffs). These supply-side shocks create higher volatility than in most financial assets.',
    "Eager's regression framework (Ch.3-4) for normalizing data by context applies: raw crop yields must be adjusted for weather, soil quality, and technology trends before meaningful analysis is possible.",
  ],
  geopolitics: [
    'Isichenko (Ch.2.1.7) covers "event-based predictors" including geopolitical events. Wars, sanctions, and trade disruptions can cause sudden commodity price spikes that persist for months.',
    'The petrodollar system links oil pricing to the US dollar. Dollar strength suppresses commodity prices (commodities become more expensive for non-USD buyers); dollar weakness supports them.',
  ],
  // ── Risk topics ──
  'position sizing': [
    'Isichenko (Ch.6.9) derives the Kelly criterion for optimal leverage: bet size should be proportional to your edge divided by the variance of outcomes. The formula f* = edge / variance maximizes long-term geometric growth.',
    'In practice, most professionals use fractional Kelly (25-50% of the optimal) because estimation error in edge and variance can lead to catastrophic over-sizing. A smaller bet survives longer when your estimates are wrong.',
    'The 1-2% rule: never risk more than 1-2% of portfolio equity on a single trade. This ensures you can survive a long losing streak (which is statistically inevitable) without catastrophic drawdown.',
  ],
  'stop loss': [
    "Stop-losses define the maximum acceptable loss per trade BEFORE entry. Isichenko's portfolio optimization framework (Ch.6) embeds risk constraints — stops are the individual-trade expression of portfolio-level risk budgets.",
    'Trailing stops move with the price, locking in profits as the trade moves in your favor. The trade-off: too tight and you get stopped out by normal volatility; too wide and you give back too much profit on reversals.',
  ],
  psychology: [
    'Isichenko opens Ch.2.4.2 (Overfitting) with Feynman: "The first principle is that you must not fool yourself — and you are the easiest person to fool." This applies equally to trading psychology: your brain is wired to find patterns that don\'t exist.',
    'Loss aversion causes three destructive behaviors: (1) holding losers too long (hoping they\'ll recover), (2) cutting winners too early (locking in gains before they reverse), and (3) revenge trading (doubling down after losses to "get even").',
  ],
  'risk metrics': [
    'Isichenko (Ch.4.1) defines VaR and Expected Shortfall as the standard risk measures. VaR answers: "What is the maximum loss at a given confidence level?" ES answers: "Given that we exceed VaR, how bad does it get on average?"',
    'The Sharpe ratio (excess return / standard deviation) assumes normally distributed returns — which Hilpisch (Ch.4) shows is false. The Sortino ratio (excess return / downside deviation) only penalizes negative volatility, which better reflects how investors experience risk.',
    'Maximum drawdown measures the largest peak-to-trough decline. A 50% drawdown requires a 100% gain to recover. The Calmar ratio (annualized return / max drawdown) captures this — a ratio above 1.0 means you earn more than your worst decline.',
  ],
  correlation: [
    'Isichenko (Ch.3.1) demonstrates that "correlation and diversification" are the foundation of portfolio construction. The combined Sharpe ratio of two portfolios depends on their individual Sharpes AND their correlation. Lower correlation = higher combined Sharpe.',
    'Nelson (B8 Ch.6) covers SVD for decomposing the correlation matrix into independent factors. This reveals hidden structure: what looks like 50 independent stocks might actually be 5 correlated clusters plus noise.',
    'Kanungo (B3) warns that correlations are not stable — they spike during crises (exactly when you need diversification most). A portfolio that looks diversified in normal markets may not be diversified during a crash.',
  ],
  'stress test': [
    'Stress testing simulates extreme scenarios: market crash, interest rate shock, liquidity freeze. Kanungo (B3 Ch.3) advocates Monte Carlo simulation: generate thousands of scenarios by sampling from historical distributions (including fat tails) to map the full range of outcomes.',
    'Isichenko (Ch.4.9) discusses "forecast uncertainty and alpha risk" — your model\'s predictions carry uncertainty that compounds with portfolio size. Stress testing should include scenarios where your model is simply wrong, not just where markets move.',
  ],
  'advanced position': [
    'Scaling in: adding to a winning position as it proves you right. Scaling out: taking partial profits at predefined targets while leaving a "runner" for trend continuation. Both reduce the binary all-in/all-out decision.',
    'Isichenko (Ch.6.5) covers "multi-period portfolio optimization" — positions should be managed over their full lifecycle, not just at entry. The optimal path considers current position, forecast horizon, and trading costs at every step.',
  ],
  'risk adjusted': [
    'Isichenko derives the Sharpe ratio from the mean-variance utility function (Ch.3.2): U = E[return] - (k/2) × Var[return]. The Sharpe ratio is the slope of the capital allocation line — it measures how much return you earn per unit of risk.',
    'The Calmar ratio (annualized return ÷ max drawdown) is favored by CTA/managed futures managers. Isichenko (Ch.6.9) shows that maximizing geometric growth (Kelly) is equivalent to maximizing the Sharpe ratio when returns are normally distributed.',
  ],
  'professional risk': [
    'Isichenko (Ch.4) presents the full professional risk framework: factor models decompose portfolio risk into systematic (factor) and idiosyncratic (stock-specific) components. Risk budgets allocate acceptable risk across factors, sectors, and individual positions.',
    'Huyen (B1 Ch.8) covers "data distribution shifts" — when the statistical properties of your data change, your models degrade. In risk management, this means your VaR model calibrated on recent calm markets will underestimate risk when a regime change occurs.',
  ],
  crisis: [
    'Isichenko (Ch.4.7-4.8) covers "crowding and liquidation" and "liquidity risk and short squeeze" — the most dangerous market events occur when many participants are forced to exit similar positions simultaneously, creating a cascade.',
    'Kanungo (B3) argues that "conventional ML models make point predictions with false confidence." During crises, standard models fail because they were calibrated on normal conditions. The only protection is to size positions assuming the worst case.',
  ],
  'systematic risk': [
    'Isichenko (Ch.6.10) discusses automated execution: "algorithmic trading" breaks orders into pieces to minimize impact. Automated risk management extends this — circuit breakers halt trading when losses exceed thresholds, kill switches shut down strategies entirely.',
    'Huyen (B1 Ch.9) covers "continual learning" — risk models should retrain automatically as market conditions change. Static models calibrated once become stale; the best systems detect regime changes and adapt.',
  ],
  'trading edge': [
    'Isichenko (Ch.3.8.1) provides "forecast development guidelines" — a systematic edge requires: point-in-time data (no lookahead), appropriate horizon, and scaling to match the target timeframe. Without these basics, any apparent edge is likely data mining.',
    'The final test: Isichenko (Ch.7.4) advocates "paper trading" — run your strategy in simulation with real-time data before committing capital. If paper trading results differ significantly from backtest results, your backtest had a bug or an overfit.',
  ],
};

/* ═══════════════════════════════════════════════════════════════
   VISUAL GENERATION — track and topic-aware
   ═══════════════════════════════════════════════════════════════ */

function generateVisual(course, sectionIndex) {
  if (sectionIndex !== 1) return null;

  const TRACK_VISUALS = {
    stocks: {
      type: 'risk-return',
      data: {
        assets: [
          { label: 'T-Bills', risk: 2, return: 3 },
          { label: 'Bonds', risk: 6, return: 5 },
          { label: 'Large Cap', risk: 8, return: 7 },
          { label: 'Small Cap', risk: 9, return: 8 },
          { label: 'Emerging', risk: 10, return: 7 },
        ],
      },
      caption:
        'Higher expected returns come with higher volatility — the fundamental trade-off (Isichenko Ch.4).',
    },
    crypto: {
      type: 'bar-chart',
      data: {
        bars: [
          { label: 'Bitcoin', value: 55, color: '#f7931a' },
          { label: 'Ethereum', value: 18, color: '#627eea' },
          { label: 'Stablecoins', value: 10, color: '#26a17b' },
          { label: 'Other L1s', value: 8, color: '#e6007a' },
          { label: 'DeFi', value: 5, color: '#ff007a' },
          { label: 'Other', value: 4, color: '#6b7280' },
        ],
        unit: '%',
      },
      caption:
        'Bitcoin dominance rises in risk-off and falls in alt-season — a proxy for crypto risk appetite.',
    },
    betting: {
      type: 'bar-chart',
      data: {
        bars: [
          { label: 'Prediction Markets', value: 74, color: '#10b981' },
          { label: 'Poll Aggregates', value: 68, color: '#6366f1' },
          { label: 'Expert Panels', value: 62, color: '#f59e0b' },
          { label: 'Individual Pundits', value: 48, color: '#ef4444' },
        ],
        unit: '%',
      },
      caption:
        'Markets that aggregate many estimates tend to outperform individuals (Eager Ch.6 — wisdom of crowds).',
    },
    commodities: {
      type: 'timeline',
      data: {
        events: [
          { year: '1973', label: 'OPEC Embargo', description: 'Oil 4x from $3→$12' },
          { year: '2008', label: 'Oil $147', description: 'Demand + speculation peak' },
          { year: '2011', label: 'Gold $1,900', description: 'Post-crisis safe haven' },
          { year: '2020', label: 'Negative Oil', description: 'COVID demand collapse' },
          { year: '2022', label: 'Ukraine Crisis', description: 'Grain + energy shock' },
        ],
      },
      caption:
        'Commodity prices are driven by supply shocks as much as demand — geopolitics is unavoidable.',
    },
    risk: {
      type: 'compound-growth',
      data: {
        principal: 100000,
        rate: 0.1,
        years: 5,
        milestones: [0, 1, 2, 3, 4, 5],
      },
      caption:
        'A 50% loss requires a 100% gain to break even. Capital preservation is always priority #1 (Isichenko Ch.4).',
    },
  };

  return TRACK_VISUALS[course.track] || null;
}

/* ═══════════════════════════════════════════════════════════════
   CONTENT BUILDER
   ═══════════════════════════════════════════════════════════════ */

function findMatchingParagraphs(course) {
  const titleLower = course.title.toLowerCase();
  const descLower = (course.description || '').toLowerCase();
  const combined = titleLower + ' ' + descLower;

  for (const [keyword, paragraphs] of Object.entries(TEXTBOOK_PARAGRAPHS)) {
    const words = keyword.split(/\s+/);
    if (words.every((w) => combined.includes(w))) {
      return paragraphs.map(sanitizeAuthorRefs);
    }
  }

  // Partial match
  for (const [keyword, paragraphs] of Object.entries(TEXTBOOK_PARAGRAPHS)) {
    if (combined.includes(keyword)) {
      return paragraphs.map(sanitizeAuthorRefs);
    }
  }

  return null;
}

function extractKeyTerms(title, seed) {
  const words = title
    .replace(/[^a-zA-Z0-9 ]/g, '')
    .split(/\s+/)
    .filter((w) => w.length > 3);
  const pick = [...new Set(words)].slice(0, 4);
  return pick.length >= 2 ? pick : ['analysis', 'risk', 'strategy', 'framework'].slice(0, 3);
}

export function buildPlaceholderContent(course) {
  const seed = hashSeed(course.id);
  const title = course.title;
  const desc = course.description;
  const level = course.level;
  const track = course.track;
  const matchedParas = findMatchingParagraphs(course);

  const levelDesc =
    {
      intermediate: 'building on foundational knowledge',
      advanced: 'for experienced practitioners',
      expert: 'at an institutional/professional level',
    }[level] || '';
  const trackNoun =
    {
      stocks: 'equity investing',
      crypto: 'digital assets',
      betting: 'prediction markets',
      commodities: 'commodity markets',
      risk: 'risk management',
    }[track] || 'financial markets';

  const sections = [
    {
      title: `Introduction to ${title}`,
      content: `This lesson covers **${title}** — ${desc}. ${levelDesc ? `This is ${level}-level material designed ${levelDesc}.` : ''}\n\n${matchedParas ? matchedParas[0] : `Understanding ${title.toLowerCase()} is essential for any serious practitioner of ${trackNoun}. The concepts here build on your foundational knowledge and introduce frameworks used by professional analysts and portfolio managers.`}\n\nAs you work through the material, connect these ideas to your existing knowledge. The most powerful learning happens at the intersection of new concepts and practical experience.`,
      keyTerms: extractKeyTerms(title, seed),
    },
    {
      title: 'Core Framework and Principles',
      content: `${matchedParas && matchedParas[1] ? matchedParas[1] : `The key framework for ${title.toLowerCase()} combines quantitative rigor with qualitative judgment. Self-deception is the most common analytical error — every framework has limitations, and knowing those limits is as important as knowing the framework itself.`}\n\n${matchedParas && matchedParas[2] ? matchedParas[2] : `Practitioners combine multiple inputs when making decisions in ${trackNoun}. No single metric or model captures the full picture. The goal is to build a dashboard of complementary signals that cross-validate each other.`}\n\nContext always matters more than any single number. The same metric can be bullish or bearish depending on the broader environment, the company's history, and the current market regime.`,
      visual: generateVisual(course, 1),
      callout: matchedParas
        ? 'Refer to the cited sources for deeper reading on the concepts introduced here.'
        : seed % 3 === 0
          ? `Key insight: crowding erodes edges. If everyone follows the same signal, it stops working.`
          : seed % 3 === 1
            ? `Practice: After this section, identify one real-world application you can analyze this week.`
            : `Treat every estimate as a distribution, not a point. How confident are you?`,
    },
    {
      title: 'Practical Application',
      content: `Applying ${title.toLowerCase()} in practice requires disciplined process.\n\nStart by identifying the key variables that drive outcomes. For ${trackNoun}, statistical learning frames this as finding an approximation of a function known only through observed data pairs. Your job is to find the features (inputs) that reliably predict the target (outcome).\n\nA common mistake at the ${level} level is overcomplicating the analysis. Simpler models often outperform complex ones out-of-sample because they have fewer parameters to overfit. The right features matter more than the right algorithm.\n\nDocument your process. Every analysis should be reproducible. If you can't explain why you made a decision, you can't learn from the outcome.`,
      callout:
        'Paper trading validates your process before you risk real capital. If paper results differ significantly from backtests, investigate before deploying.',
    },
    {
      title: 'Common Mistakes and Pitfalls',
      content: `At the ${level} level, the most dangerous mistakes are subtle:\n\n**Overfitting**: The more strategies you test, the more likely you find false positives. Cross-validation and out-of-sample testing are essential — you must not fool yourself.\n\n**Ignoring base rates**: Most active strategies don't outperform their benchmark after costs. Even sophisticated models rarely exceed ~75% directional accuracy. Starting from this baseline prevents overconfidence.\n\n**Survivorship bias**: You see the winners but not the graveyard. For every successful example in ${trackNoun}, dozens of failed attempts received no attention.\n\n**Crowding**: Widely followed signals stop working because too many traders act on them simultaneously. When everyone does the same thing, the edge disappears and the trade becomes a risk factor.\n\nThe antidote: systematic process, written rules, and honest evaluation of results versus expectations.`,
    },
    {
      title: 'Bringing It All Together',
      content: `The key takeaway: success in ${title.toLowerCase()} requires combining analytical skill with disciplined execution.\n\nThree forecast-development fundamentals: use point-in-time data (no lookahead), match your analysis horizon to your trading horizon, and account for transaction costs. Without these basics, any apparent edge is likely data mining.\n\nA probabilistic perspective ties it together: every forecast should be accompanied by a confidence level. A high-conviction call with narrow uncertainty justifies a larger position; a low-conviction view with wide uncertainty should be sized small or skipped.\n\nNext steps: apply one concept from this lesson to a real-world example this week. Track your reasoning and review the outcome after a defined period. Repetition turns knowledge into skill.\n\nBefore taking the quiz, review the key terms from section one and make sure you can explain each in your own words. If you can teach the concept, you truly understand it.`,
    },
  ];

  return { sections, quiz: [] };
}

function buildTopicQuiz(course, seed) {
  // Use per-course quiz bank if available
  if (QUIZ_BANK[course.id] && QUIZ_BANK[course.id].length >= 10) {
    return QUIZ_BANK[course.id].map((q, qIdx) => shuffleOptionsDeterministic(q, seed + qIdx));
  }

  const track = course.track;
  const trackCtx =
    {
      stocks: 'equity investing',
      crypto: 'digital assets',
      betting: 'prediction markets',
      commodities: 'commodity markets',
      risk: 'risk management',
    }[track] || 'financial markets';

  const trackNoun =
    {
      stocks: 'stocks',
      crypto: 'crypto assets',
      betting: 'prediction-market contracts',
      commodities: 'commodities',
      risk: 'investments',
    }[track] || 'investments';

  const sourceQuestions = [
    {
      question: `In ${trackCtx}, what does the term "crowding" describe?`,
      options: [
        'Too many traders entering a market makes prices more efficient and stable',
        'A widely followed signal whose edge erodes as more participants act on it',
        'A platform where retail traders gather to share investing tips and ideas',
        'A regulatory designation for markets with very high daily trading volume',
      ],
      correct: 1,
      explanation:
        'When a signal becomes widely followed, its edge erodes because too many participants act on it simultaneously — and when they exit, the trade can unwind violently.',
    },
    {
      question: 'What is overfitting in the context of analyzing market data?',
      options: [
        'Holding a position for longer than the original analysis time horizon required',
        'Building a model so closely fit to past noise that it fails on new data',
        'Putting too much capital into one position relative to the overall portfolio',
        'Trading more frequently than the underlying signal actually justifies',
      ],
      correct: 1,
      explanation:
        "Overfitting is finding patterns in noise — the model 'works' on historical data but breaks on new data because it learned the past's random features.",
    },
    {
      question: 'Why should a forecast be expressed as a distribution rather than a single number?',
      options: [
        'Regulators require all published financial forecasts to include a confidence band',
        'A range conveys the uncertainty and prevents the false precision of a point estimate',
        'Spreadsheets and trading software prefer ranges over single number inputs',
        'Distributions are only useful when pricing options or other derivative contracts',
      ],
      correct: 1,
      explanation:
        'Every prediction involves uncertainty. A distribution communicates that uncertainty — a point estimate hides it and encourages overconfidence.',
    },
    {
      question: `When real ${trackNoun} returns are tested against the normal-distribution assumption, what happens?`,
      options: [
        'Real returns match the bell curve almost exactly across all historical samples',
        'Real returns have fat tails — extreme moves happen much more often than predicted',
        'The assumption is more accurate for long horizons than for short ones',
        'It only matters for backtesting models, not for live trading decisions',
      ],
      correct: 1,
      explanation:
        'Financial returns violate normality — fat tails mean rare extreme events happen far more often than a bell curve predicts. This is the single most important departure from textbook finance.',
    },
    {
      question: 'What is the most important first step before applying any analytical framework?',
      options: [
        'Find the model that has worked best in published academic research recently',
        'Use point-in-time data with no lookahead, matched to your trading horizon',
        'Choose the most sophisticated model your computer can handle running',
        'Consult a registered financial advisor about which framework is appropriate',
      ],
      correct: 1,
      explanation:
        'Without point-in-time data and horizon alignment, any apparent edge is likely data-mining. These two checks come before any modeling choice.',
    },
    {
      question: 'What does "survivorship bias" mean when looking at examples in financial markets?',
      options: [
        'Newer companies are systematically more profitable than older established ones',
        'You see the winners that survived but not the failures that disappeared',
        'Surviving companies tend to be larger, which makes them harder to analyze',
        'Markets eventually punish bad actors, so only legitimate firms remain visible',
      ],
      correct: 1,
      explanation:
        'For every visible success story there are dozens of failed attempts that got no attention. Reasoning from survivors alone makes outcomes look more predictable than they are.',
    },
    {
      question: `Why does position-sizing matter as much as picking the right ${trackNoun}?`,
      options: [
        'Larger positions automatically have lower transaction costs per share traded',
        'A correct call sized too small or too large produces a different total outcome',
        'Position size is regulated and must follow specific exchange-level limits',
        'Most brokers offer better fills on standard round-lot position sizes only',
      ],
      correct: 1,
      explanation:
        'Sizing translates a forecast into outcomes. A high-conviction view should be sized larger; a low-conviction view should be skipped or sized small. The same call at the wrong size produces the wrong result.',
    },
    {
      question: 'What is base-rate neglect, and why does it affect investors?',
      options: [
        'Ignoring the interest rate set by central banks when valuing future cash flows',
        'Ignoring how often most strategies actually succeed when judging a new one',
        'Failing to account for trading commissions in the total cost of a position',
        'Not adjusting return calculations for the effects of inflation over time',
      ],
      correct: 1,
      explanation:
        "Most active strategies don't outperform their benchmark after costs. Starting from that base rate prevents overconfidence about any specific new strategy.",
    },
    {
      question: 'What does it mean to have an "edge" in markets?',
      options: [
        'Access to faster network connections than other participants in the market',
        'A repeatable reason your decisions should outperform a passive benchmark',
        'Holding a larger position than other traders in the same security',
        'Trading at a premium brokerage tier with reduced commission structures',
      ],
      correct: 1,
      explanation:
        'An edge is a structural or analytical reason your decisions should outperform a passive benchmark net of costs. Without one, the expected outcome is the benchmark minus fees.',
    },
    {
      question: 'Why is it important to write down your reasoning before placing a trade?',
      options: [
        'Most regulators require traders to document every position they open up front',
        'It forces you to evaluate the outcome against the original thesis, not after-the-fact rationalization',
        'Written notes are useful primarily for tax reporting at the end of the year',
        'It satisfies the audit trail requirements of standard portfolio accounting software',
      ],
      correct: 1,
      explanation:
        "Written reasoning lets you compare outcomes to the original thesis instead of rewriting your beliefs after the fact. It's the single most effective antidote to hindsight bias.",
    },
  ];

  return sourceQuestions.map((q, qIdx) => shuffleOptionsDeterministic(q, seed + qIdx));
}

function shuffleOptionsDeterministic(question, seed) {
  let state = (seed * 2654435761) >>> 0;
  const next = () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };

  const tagged = question.options.map((text, i) => ({
    text,
    isCorrect: i === question.correct,
  }));

  for (let i = tagged.length - 1; i > 0; i -= 1) {
    const j = Math.floor(next() * (i + 1));
    [tagged[i], tagged[j]] = [tagged[j], tagged[i]];
  }

  const newCorrectIndex = tagged.findIndex((t) => t.isCorrect);

  return {
    question: question.question,
    options: tagged.map((t) => t.text),
    correctIndex: newCorrectIndex,
    explanation: question.explanation,
  };
}

const AUTHOR_REF_RE = /Isichenko|Kanungo|Hilpisch|Feynman|Ch\.\d/i;

function quizNeedsReplacement(quiz) {
  if (!Array.isArray(quiz) || quiz.length === 0) return true;
  const blob = JSON.stringify(quiz);
  if (AUTHOR_REF_RE.test(blob)) return true;
  if (quiz.length < 10) return true;
  return quiz.every((q) => q.correctIndex === 1);
}

function finalizeQuiz(quiz, course) {
  const seed = hashSeed(course.id);
  if (quizNeedsReplacement(quiz)) {
    return buildTopicQuiz(course, seed);
  }
  return quiz.map((q, i) =>
    shuffleOptionsDeterministic(
      {
        question: q.question,
        options: q.options,
        correct: q.correct ?? q.correctIndex ?? 0,
        explanation: q.explanation,
      },
      seed + i,
    ),
  );
}

/**
 * Returns authored content for a course when present in {@link COURSE_CONTENT},
 * otherwise falls back to the textbook-enhanced generator.
 */
export function getCourseContent(course) {
  let raw;
  const migrated = MIGRATED_CONTENT[course.id];
  if (migrated && Array.isArray(migrated.sections) && Array.isArray(migrated.quiz)) {
    raw = migrated;
  } else {
    const handWritten = COURSE_CONTENT[course.id];
    if (handWritten && Array.isArray(handWritten.sections) && Array.isArray(handWritten.quiz)) {
      raw = handWritten;
    } else {
      raw = buildPlaceholderContent(course);
    }
  }

  const transformed = transformCourseContent(raw);
  return {
    ...transformed,
    sections: sanitizeSections(transformed.sections),
    quiz: finalizeQuiz(transformed.quiz, course),
  };
}
