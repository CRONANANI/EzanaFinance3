/**
 * Per-course quiz bank for the Learning Center.
 * Each entry is an array of 10 questions in the format:
 *   { question, options: [4 strings], correct: 0|1|2|3, explanation }
 *
 * The correct answer index is intentionally varied across all 4 positions.
 */

const QUIZ_BANK = {
  /* ════════════════════════════════════════════════════════════════
     STOCKS — Intermediate (courses 4-8)
     ════════════════════════════════════════════════════════════════ */

  'stocks-intermediate-4': [
    // Sector Analysis
    {
      question: 'How many sectors does the Global Industry Classification Standard (GICS) define?',
      options: ['8', '10', '11', '13'],
      correct: 2,
      explanation:
        'GICS defines 11 sectors: Energy, Materials, Industrials, Consumer Discretionary, Consumer Staples, Healthcare, Financials, Information Technology, Communication Services, Utilities, and Real Estate.',
    },
    {
      question: 'Which sectors are considered "cyclical"?',
      options: [
        'Utilities and Consumer Staples',
        'Technology and Consumer Discretionary',
        'Healthcare and Real Estate',
        'Energy and Utilities',
      ],
      correct: 1,
      explanation:
        'Cyclical sectors like Technology and Consumer Discretionary tend to outperform during economic expansions and underperform during recessions, because consumer spending on non-essentials rises and falls with the economy.',
    },
    {
      question: 'What is sector rotation?',
      options: [
        'Regularly rebalancing equal weight across all 11 sectors',
        'Moving capital between sectors based on the stage of the business cycle',
        'Excluding the worst-performing sector from your portfolio each quarter',
        'Rotating between domestic and international sector ETFs monthly',
      ],
      correct: 1,
      explanation:
        'Sector rotation shifts capital to sectors expected to outperform at different phases of the business cycle — for example, Financials in early recovery and Utilities in late-cycle contraction.',
    },
    {
      question:
        "Why is it important to compare a company's P/E ratio within its own sector rather than against the entire market?",
      options: [
        'All sectors have the same average P/E by regulation',
        'Different sectors have structurally different growth rates, margins, and capital intensity that justify different valuation ranges',
        'P/E ratios are only meaningful for technology companies',
        'Cross-sector comparison is actually preferred by most analysts',
      ],
      correct: 1,
      explanation:
        "Capital structure, growth profiles, and margin expectations vary by sector. A utility with a P/E of 20 may be expensive while a tech stock at 20 may be cheap — the sector context determines what's normal.",
    },
    {
      question: 'Which sector typically outperforms during a recession?',
      options: [
        'Information Technology',
        'Consumer Discretionary',
        'Consumer Staples',
        'Financials',
      ],
      correct: 2,
      explanation:
        'Consumer Staples (food, household products, tobacco) are defensive because people buy these regardless of economic conditions. Demand is inelastic, so revenue is more stable during downturns.',
    },
    {
      question: 'What is the difference between a cyclical and a defensive sector?',
      options: [
        'Cyclical sectors pay dividends; defensive sectors do not',
        'Cyclical sectors move with the economy; defensive sectors resist downturns',
        'Defensive sectors only include government-related companies',
        'Cyclical sectors have lower market caps than defensive sectors',
      ],
      correct: 1,
      explanation:
        'Cyclical sectors (Tech, Industrials, Consumer Discretionary) amplify economic trends. Defensive sectors (Utilities, Staples, Healthcare) provide stable earnings regardless of economic conditions.',
    },
    {
      question:
        'If interest rates are rising sharply, which sector is most likely to underperform?',
      options: ['Energy', 'Financials', 'Utilities', 'Materials'],
      correct: 2,
      explanation:
        'Utilities are bond-like — they carry high debt and pay stable dividends. Rising rates increase their borrowing costs and make their dividend yields less attractive relative to risk-free bonds.',
    },
    {
      question: 'What does "sector concentration risk" mean in a portfolio context?',
      options: [
        'Having more than 3 stocks in the same sector',
        'Being so heavily weighted in one sector that a sector-specific shock could devastate the portfolio',
        'Investing only in sector ETFs instead of individual stocks',
        'Holding stocks in a sector that the government is investigating',
      ],
      correct: 1,
      explanation:
        'If 60% of your portfolio is in Technology and the sector drops 30%, your portfolio drops 18% from that exposure alone. Diversification across sectors reduces the impact of sector-specific risks.',
    },
    {
      question: 'Which economic indicator is most useful for anticipating sector rotation?',
      options: [
        'The price of gold',
        'The yield curve (spread between short and long-term Treasury rates)',
        'The daily trading volume of the S&P 500',
        'The number of IPOs in a given quarter',
      ],
      correct: 1,
      explanation:
        "The yield curve is one of the most reliable leading indicators of the business cycle. An inverted curve (short rates above long rates) has preceded every US recession since 1970, signaling it's time to rotate toward defensive sectors.",
    },
    {
      question:
        'What is the primary advantage of using sector ETFs over individual stocks for sector allocation?',
      options: [
        'Sector ETFs always outperform individual stocks',
        'ETFs provide diversified exposure to an entire sector, eliminating single-stock risk',
        'ETFs are exempt from capital gains taxes',
        'ETFs have no management fees',
      ],
      correct: 1,
      explanation:
        'A sector ETF like XLK (Technology) holds dozens of tech stocks. If one company has bad earnings, the impact is diluted. You get the sector thesis without the single-stock concentration risk.',
    },
  ],

  'stocks-intermediate-5': [
    // Dividend Investing
    {
      question: 'How is dividend yield calculated?',
      options: [
        'Share price divided by annual dividend',
        'Annual dividend per share divided by share price',
        'Total dividends paid divided by net income',
        'Quarterly dividend multiplied by the P/E ratio',
      ],
      correct: 1,
      explanation:
        'Dividend yield = annual dividend per share ÷ current share price. A $100 stock paying $3/year has a 3% yield. The yield moves inversely with the stock price.',
    },
    {
      question: 'What is a "Dividend Aristocrat"?',
      options: [
        'Any stock with a dividend yield above 5%',
        'An S&P 500 company that has increased its dividend for at least 25 consecutive years',
        'A company that pays dividends monthly instead of quarterly',
        'The highest-yielding stock in each GICS sector',
      ],
      correct: 1,
      explanation:
        'Dividend Aristocrats have raised their dividend every year for 25+ consecutive years. This consistency signals financial discipline, stable cash flows, and management commitment to shareholder returns.',
    },
    {
      question: 'What does a payout ratio above 90% typically signal?',
      options: [
        'The company is extremely profitable and can easily sustain the dividend',
        'The dividend may be at risk because the company is paying out nearly all its earnings',
        'The stock is guaranteed to outperform the market over the next year',
        'The company is about to announce a special one-time dividend',
      ],
      correct: 1,
      explanation:
        'A payout ratio (dividends ÷ earnings) above 90% leaves almost no retained earnings for growth, debt repayment, or cushion against a bad quarter. If earnings dip even slightly, the dividend may be cut.',
    },
    {
      question: 'What is DRIP and why does it accelerate wealth building?',
      options: [
        'A risk management technique that limits daily losses to 1%',
        'Dividend Reinvestment Plan — automatically buys more shares with dividend payments, harnessing compound growth',
        'A tax strategy that defers dividend income to future years',
        'A type of preferred stock that pays dividends in increments',
      ],
      correct: 1,
      explanation:
        'DRIP automatically uses each dividend payment to purchase additional shares. Those new shares then generate their own dividends, creating a compounding cycle that grows the position over time without requiring new capital.',
    },
    {
      question:
        "If a stock's price drops but its annual dividend stays the same, what happens to the dividend yield?",
      options: ['It decreases', 'It stays the same', 'It increases', 'It becomes negative'],
      correct: 2,
      explanation:
        'Yield = dividend ÷ price. If the dividend stays at $3 but the price drops from $100 to $75, the yield rises from 3% to 4%. A rising yield on a falling stock can signal either value or a dividend cut ahead.',
    },
    {
      question: 'Why might a company with zero dividend yield still be a good investment?',
      options: [
        'Companies with no dividends are always better than dividend payers',
        'The company reinvests all profits into growth that may generate higher total returns through capital appreciation',
        'Zero-dividend stocks are tax-exempt',
        'Dividend-paying companies are legally prohibited from growing',
      ],
      correct: 1,
      explanation:
        'Companies like Amazon and Tesla reinvest profits into R&D, expansion, and acquisitions. If the return on reinvested capital exceeds what shareholders could earn elsewhere, growth investing beats dividend investing.',
    },
    {
      question: 'What is the ex-dividend date and why does it matter?',
      options: [
        'The date the company declares the dividend amount',
        'The date after which buying the stock no longer entitles you to the upcoming dividend payment',
        'The date the dividend check is mailed to shareholders',
        'The last day of the fiscal quarter when dividends are calculated',
      ],
      correct: 1,
      explanation:
        "If you buy a stock on or after the ex-dividend date, you don't receive the next dividend — the seller does. The stock price typically drops by roughly the dividend amount on the ex-date.",
    },
    {
      question: 'Which type of stock is most likely to offer a high dividend yield?',
      options: [
        'A pre-revenue biotech startup',
        'A mature utility company with stable regulated earnings',
        'A fast-growing SaaS company reinvesting heavily in R&D',
        "A recently IPO'd tech company",
      ],
      correct: 1,
      explanation:
        'Mature utilities have stable, regulated cash flows, limited growth opportunities, and thus return most profits as dividends. Growth companies retain earnings for reinvestment.',
    },
    {
      question:
        'What is the difference between ordinary dividends and qualified dividends for US tax purposes?',
      options: [
        'There is no tax difference between the two',
        'Qualified dividends are taxed at lower long-term capital gains rates; ordinary dividends are taxed as regular income',
        'Ordinary dividends are tax-free while qualified dividends are taxed at 50%',
        'Qualified dividends can only be earned in a Roth IRA',
      ],
      correct: 1,
      explanation:
        'Qualified dividends (from US stocks held 60+ days) are taxed at 0%, 15%, or 20% depending on income. Ordinary dividends are taxed at your marginal income tax rate, which can be as high as 37%.',
    },
    {
      question:
        'A stock yields 6% while the average for its sector is 2.5%. What is the most likely explanation?',
      options: [
        'The company is far more profitable than its peers',
        'The stock price has fallen significantly, possibly because the market expects a dividend cut',
        'The company is paying a special one-time dividend that inflates the yield',
        'Sector averages are always unreliable',
      ],
      correct: 1,
      explanation:
        "An abnormally high yield relative to peers usually means the stock price has dropped — often because the market is pricing in a dividend cut. A yield that's too good to be true often is.",
    },
  ],

  'stocks-intermediate-6': [
    // Growth vs Value Investing
    {
      question: 'What metric best distinguishes a "value" stock from a "growth" stock?',
      options: [
        'Market capitalization',
        'Trading volume',
        'Price-to-earnings (P/E) ratio relative to the market average',
        'The number of analysts covering the stock',
      ],
      correct: 2,
      explanation:
        'Value stocks trade at low P/E, P/B, or P/S ratios relative to the market — they appear cheap on fundamental metrics. Growth stocks trade at high multiples because the market prices in rapid future earnings growth.',
    },
    {
      question: 'Historically, which style has outperformed over very long periods (50+ years)?',
      options: [
        'Growth has consistently beaten value',
        'Value has outperformed growth over multi-decade periods, though with long stretches of underperformance',
        'Neither — both produce identical returns over long periods',
        'It depends entirely on which decade you pick',
      ],
      correct: 1,
      explanation:
        'Academic research (Fama-French) shows value has outperformed growth over 50+ year samples. However, growth dominated 2010-2023 driven by tech, showing that neither style works all the time.',
    },
    {
      question: 'What is the "value trap" risk?',
      options: [
        'A stock that appears cheap but is cheap for good reason — deteriorating fundamentals, not temporary undervaluation',
        'A stock that pays dividends but has negative earnings',
        'When a value investor accidentally buys a growth stock',
        'A regulatory restriction on buying stocks with very low P/E ratios',
      ],
      correct: 0,
      explanation:
        'A value trap looks cheap on metrics (low P/E, low P/B) but the business is genuinely deteriorating — declining revenue, losing market share, or facing obsolescence. The stock is cheap because it deserves to be.',
    },
    {
      question: 'What does the PEG ratio measure?',
      options: [
        "Price relative to the company's total debt",
        'P/E ratio divided by the expected earnings growth rate — a stock is considered fairly valued at PEG = 1',
        'The premium a growth stock trades at over the sector average',
        'The percentage of earnings paid as dividends',
      ],
      correct: 1,
      explanation:
        'PEG = P/E ÷ earnings growth rate. A PEG of 1 suggests the stock is fairly priced for its growth. Below 1 may be undervalued; above 1 may be overvalued. Peter Lynch popularized this metric.',
    },
    {
      question: 'Why did growth stocks dramatically outperform value stocks from 2010-2023?',
      options: [
        'Value investing was officially declared obsolete by the SEC',
        'Low interest rates reduced the discount rate on future cash flows, making high-growth companies disproportionately more valuable',
        'Growth stocks paid higher dividends during this period',
        'Value stocks were delisted from major indices',
      ],
      correct: 1,
      explanation:
        'Near-zero rates magnified the present value of future earnings. A tech company expected to earn $10B in 2030 is worth much more at a 2% discount rate than at 6%. Growth is a duration bet on rates.',
    },
    {
      question: 'What is "GARP" investing?',
      options: [
        'Government-Assisted Retirement Planning',
        'Growth At a Reasonable Price — buying growth stocks but only when their valuation metrics are not extreme',
        'Guaranteed Annual Return Protocol',
        'General Asset Rebalancing Procedure',
      ],
      correct: 1,
      explanation:
        'GARP combines growth and value by seeking companies with above-average growth rates but below-average valuations (PEG < 1). Peter Lynch practiced GARP in his later career at Fidelity Magellan.',
    },
    {
      question: 'What happens to value stocks when inflation rises unexpectedly?',
      options: [
        'Value stocks always decline during inflation',
        'Value stocks tend to outperform because they have real assets, current earnings, and shorter duration than growth stocks',
        'There is no relationship between inflation and style performance',
        "Value stocks are unaffected because they don't grow",
      ],
      correct: 1,
      explanation:
        'Value stocks have more near-term cash flows (current earnings, dividends). When inflation raises discount rates, far-future cash flows (growth stocks) lose more present value than near-term ones (value stocks).',
    },
    {
      question: 'Which of these is a typical value investing screen?',
      options: [
        'P/E above 50 and revenue growth above 40%',
        'P/B below 1.5, dividend yield above 3%, and debt-to-equity below 0.5',
        'Market cap above $1 trillion and share price above $500',
        'Only stocks listed on the NASDAQ exchange',
      ],
      correct: 1,
      explanation:
        'Classic value screens look for stocks trading below intrinsic value: low P/B (cheap relative to assets), high dividend yield (income return), and low leverage (financial safety). Benjamin Graham originated these criteria.',
    },
    {
      question:
        'The "style box" used by Morningstar categorizes stocks along which two dimensions?',
      options: [
        'Dividend yield and market cap',
        'Size (large/mid/small cap) and style (value/blend/growth)',
        'Sector and geographic region',
        'Volatility and momentum',
      ],
      correct: 1,
      explanation:
        "Morningstar's 3×3 style box crosses size (large/mid/small) with style (value/blend/growth), creating 9 categories. This helps investors understand what they own and avoid unintended style concentration.",
    },
    {
      question: 'What is "factor crowding" and how does it relate to growth vs value?',
      options: [
        'When too many investors buy the same style, the edge erodes and the reversal risk increases',
        'When a company issues too many shares, diluting existing holders',
        'When regulatory limits cap the number of investors in a fund',
        'When growth and value ETFs hold the same stocks',
      ],
      correct: 0,
      explanation:
        'When the growth trade is crowded (everyone holds the same tech stocks), a shock can cause violent unwinds. The 2022 growth-to-value rotation demonstrated this — growth stocks dropped 30%+ as crowded positions unwound.',
    },
  ],

  'stocks-intermediate-7': [
    // Portfolio Construction
    {
      question: 'What is the primary goal of asset allocation?',
      options: [
        'Maximizing returns regardless of risk',
        'Distributing capital across asset classes to balance risk and return based on your goals, time horizon, and risk tolerance',
        'Holding exactly equal amounts of stocks, bonds, and cash',
        'Picking the single best-performing asset class each year',
      ],
      correct: 1,
      explanation:
        "Asset allocation is the most important investment decision — studies show it explains over 90% of portfolio return variation over time. It's about matching your risk tolerance to the right mix of assets.",
    },
    {
      question: 'What does "correlation" measure in portfolio construction?',
      options: [
        'The average return of two assets',
        'How closely two assets move together — from -1 (perfectly opposite) to +1 (perfectly together)',
        'The total number of assets in the portfolio',
        'The trading volume relationship between two stocks',
      ],
      correct: 1,
      explanation:
        'Correlation of +1 means two assets move identically (no diversification benefit). Correlation of 0 means independent. Negative correlation means they move opposite — the ideal for diversification.',
    },
    {
      question: 'Why does rebalancing a portfolio improve risk-adjusted returns over time?',
      options: [
        'Rebalancing guarantees higher returns than buy-and-hold',
        'It systematically sells winners and buys losers, enforcing a buy-low/sell-high discipline',
        'Rebalancing eliminates all risk from the portfolio',
        'Brokers pay you a rebate every time you rebalance',
      ],
      correct: 1,
      explanation:
        'After a stock rally, stocks become overweight. Rebalancing sells some stocks (high) and buys bonds (low), resetting to target weights. Over many cycles, this mechanical discipline captures mean reversion.',
    },
    {
      question:
        'According to Modern Portfolio Theory, what does the "efficient frontier" represent?',
      options: [
        'The maximum number of stocks you can hold in a tax-advantaged account',
        'The set of portfolios offering the highest expected return for each level of risk',
        'The dividing line between value and growth stocks',
        'The point where a stock becomes too expensive to buy',
      ],
      correct: 1,
      explanation:
        "Harry Markowitz showed that for any given risk level, there's an optimal portfolio mix that maximizes return. The curve connecting all these optimal points is the efficient frontier — you want to be on it, not below it.",
    },
    {
      question: 'What is the biggest practical problem with mean-variance optimization?',
      options: [
        'It requires a PhD in mathematics to compute',
        'The model is extremely sensitive to input estimates — small errors in expected returns or covariances produce wildly different portfolio weights',
        'It can only handle portfolios with fewer than 10 assets',
        'It only works for bond portfolios, not equity portfolios',
      ],
      correct: 1,
      explanation:
        'Estimation error dominates optimization. If your expected return for Tech is 10% ± 5%, the optimizer treats 10% as exact truth and may put 80% in Tech. Garbage in, garbage out — which is why constraints and shrinkage are essential.',
    },
    {
      question: 'What is the "60/40 portfolio" and why has it been a standard allocation?',
      options: [
        '60% gold and 40% cash',
        '60% stocks and 40% bonds — historically effective because stock-bond correlation was low or negative, providing diversification',
        '60% growth stocks and 40% value stocks',
        '60% domestic and 40% international stocks',
      ],
      correct: 1,
      explanation:
        'The 60/40 mix worked for decades because stocks and bonds were negatively correlated — when stocks fell, bonds rallied, cushioning the portfolio. In 2022, both fell simultaneously, challenging this assumption.',
    },
    {
      question: 'What is the "Sharpe ratio" and what does it measure?',
      options: [
        'Total return divided by the number of years invested',
        "Excess return over the risk-free rate divided by the portfolio's standard deviation — it measures risk-adjusted performance",
        'The ratio of stocks to bonds in a portfolio',
        'The percentage of trades that were profitable',
      ],
      correct: 1,
      explanation:
        'Sharpe = (Portfolio Return - Risk-Free Rate) / Standard Deviation. A higher Sharpe means more return per unit of risk. A Sharpe above 1.0 is considered good; above 2.0 is excellent.',
    },
    {
      question:
        'Why does adding a small allocation (5-10%) of an uncorrelated asset improve the portfolio even if that asset has mediocre standalone returns?',
      options: [
        'All assets improve a portfolio if you add enough of them',
        'The low correlation reduces overall portfolio volatility more than the mediocre return hurts — net Sharpe ratio improves',
        'Uncorrelated assets are exempt from capital gains taxes',
        'It is required by fiduciary regulations',
      ],
      correct: 1,
      explanation:
        'This is the diversification free lunch. Adding a low-correlation asset reduces portfolio variance by more than it reduces return. The math (Sharpe triangle) shows combined Sharpe can exceed individual Sharpes when correlation is low.',
    },
    {
      question: 'What is "home bias" in portfolio construction?',
      options: [
        'The tendency to invest disproportionately in your home country despite global diversification being optimal',
        'Preferring to trade from your home computer instead of a mobile device',
        'Investing only in real estate near your primary residence',
        'A regulatory requirement to hold at least 50% domestic assets',
      ],
      correct: 0,
      explanation:
        'US investors hold ~70-80% US equities despite the US being ~60% of world market cap. This overweighting of familiar markets sacrifices diversification. Global allocation reduces single-country risk.',
    },
    {
      question: 'What is a "target-date fund" and who is it designed for?',
      options: [
        'A fund that targets a specific return each year',
        'A fund that automatically shifts from aggressive (stocks) to conservative (bonds) as the target retirement date approaches',
        'A fund that only invests in companies with a target P/E ratio',
        'A fund that must be sold by a specific date',
      ],
      correct: 1,
      explanation:
        'Target-date funds (e.g., "Target 2055") automate the glide path from growth-oriented to income-oriented as you approach retirement. They\'re designed for investors who want a set-it-and-forget-it allocation.',
    },
  ],

  'stocks-intermediate-8': [
    // Tax Basics for Investors
    {
      question:
        'What is the tax difference between long-term and short-term capital gains in the US?',
      options: [
        'There is no difference — all gains are taxed the same',
        'Long-term gains (held over 1 year) are taxed at lower rates (0%, 15%, or 20%); short-term gains are taxed as ordinary income (up to 37%)',
        'Short-term gains are tax-free; long-term gains are taxed at 30%',
        'Only gains above $10,000 are taxed',
      ],
      correct: 1,
      explanation:
        "Holding period matters enormously. A $10,000 gain taxed at 15% (long-term) costs $1,500. The same gain taxed at 37% (short-term) costs $3,700. That's why tax-aware investors hold for at least a year.",
    },
    {
      question: 'What is tax-loss harvesting?',
      options: [
        'Selling all your investments at the end of the year to restart fresh',
        'Selling losing positions to realize losses that offset capital gains, reducing your tax bill',
        'Harvesting dividends from tax-exempt municipal bonds',
        'Converting ordinary income to capital gains through a special election',
      ],
      correct: 1,
      explanation:
        'If you have $5,000 in realized gains and sell a loser for a $3,000 loss, you only owe tax on $2,000 net gain. Up to $3,000 of excess losses can also offset ordinary income each year.',
    },
    {
      question: 'What is the "wash sale rule" and how can it trap investors?',
      options: [
        'You cannot sell a stock for a loss within 60 days of an earnings announcement',
        'If you sell a stock at a loss and repurchase the same or substantially identical security within 30 days, the tax loss is disallowed',
        'You must wash (settle) all trades within 24 hours of execution',
        'Wash sales only apply to options, not stocks',
      ],
      correct: 1,
      explanation:
        'The IRS prevents you from claiming a tax loss if you buy back the same stock within 30 days before or after the sale. The disallowed loss is added to the cost basis of the new shares, deferring but not eliminating the benefit.',
    },
    {
      question: 'What is the primary tax advantage of a Roth IRA?',
      options: [
        'Contributions are tax-deductible in the year they are made',
        'Investments grow tax-free and qualified withdrawals in retirement are also tax-free',
        'You can withdraw any amount at any time without penalty',
        'Roth IRAs have no contribution limits',
      ],
      correct: 1,
      explanation:
        'Roth IRAs use after-tax dollars going in, but all growth and withdrawals after age 59½ are completely tax-free. For a young investor with decades of compounding, the tax-free growth is enormously valuable.',
    },
    {
      question: 'How does asset location differ from asset allocation?',
      options: [
        'They are the same concept',
        'Asset allocation decides WHAT to own; asset location decides WHERE to hold each asset (taxable vs tax-advantaged accounts) to minimize taxes',
        'Asset location is about choosing which stock exchange to trade on',
        'Asset location only matters for international investments',
      ],
      correct: 1,
      explanation:
        'High-yield bonds (taxed at ordinary rates) should go in a tax-deferred IRA. Growth stocks (taxed at favorable capital gains rates) can go in a taxable account. Placing the right assets in the right accounts can save thousands.',
    },
    {
      question: 'If you inherit stock, what is "step-up in basis"?',
      options: [
        "The inherited stock's cost basis is reset to its market value on the date of the previous owner's death, erasing all unrealized gains",
        "You must pay the deceased person's capital gains taxes before receiving the inheritance",
        'The cost basis steps up by 10% each year the stock was held',
        'Step-up only applies to real estate, not stocks',
      ],
      correct: 0,
      explanation:
        "If someone bought AAPL at $5 and died when it was $200, the heir's cost basis becomes $200. All the $195 gain is erased for tax purposes. This is one of the most powerful tax provisions in the US code.",
    },
    {
      question:
        'What is the maximum capital loss you can deduct against ordinary income in a single tax year?',
      options: ['$1,000', '$3,000', '$10,000', 'Unlimited'],
      correct: 1,
      explanation:
        'You can deduct up to $3,000 ($1,500 if married filing separately) of net capital losses against ordinary income per year. Excess losses carry forward to future years indefinitely.',
    },
    {
      question: 'Why are municipal bond interest payments generally exempt from federal taxes?',
      options: [
        'Municipal bonds are issued by the federal government',
        'The federal government exempts state and local government bond interest to make it easier for municipalities to borrow at lower rates',
        'Municipal bonds have no default risk',
        'The tax exemption expired in 2020',
      ],
      correct: 1,
      explanation:
        'The tax exemption is a subsidy that lets municipalities borrow more cheaply. Investors accept lower yields because the after-tax return is competitive with higher-yielding taxable bonds. For high-tax-bracket investors, munis can be compelling.',
    },
    {
      question: 'What is "tax alpha" in portfolio management?',
      options: [
        'The excess return generated by illegal tax avoidance strategies',
        'The measurable additional after-tax return created by tax-efficient strategies like loss harvesting, asset location, and holding period management',
        'The amount of taxes you owe the IRS each year',
        'A tax credit available to professional fund managers',
      ],
      correct: 1,
      explanation:
        'Tax alpha is real and measurable — studies show tax-efficient management can add 0.5-1.5% per year in after-tax returns. Over 30 years of compounding, that compounds to significantly more wealth.',
    },
    {
      question:
        'An investor realizes $20,000 in long-term gains and $25,000 in short-term losses. What is their net tax situation?',
      options: [
        'They owe tax on $20,000 at long-term rates',
        'They have a net $5,000 loss — they can deduct $3,000 this year and carry forward $2,000',
        'They owe tax on $45,000 combined',
        'Losses and gains cannot offset each other',
      ],
      correct: 1,
      explanation:
        'Losses offset gains dollar-for-dollar regardless of type. $20,000 gain - $25,000 loss = -$5,000 net loss. $3,000 deducted against ordinary income this year, $2,000 carries forward to next year.',
    },
  ],

  'stocks-advanced-1': [
    {
      question: 'What does the "right" in a call option represent?',
      options: [
        'The obligation to sell the underlying at the strike price',
        'The right to buy the underlying at the strike price before expiration',
        'The right to receive dividends on the underlying',
        'The obligation to buy the underlying at market price',
      ],
      correct: 1,
      explanation:
        'A call option gives the holder the right, but not the obligation, to buy the underlying at the strike price. The seller (writer) has the obligation if the holder exercises.',
    },
    {
      question:
        'If a stock trades at $52 and a $50 call is priced at $4, what is the intrinsic value of the call?',
      options: ['$4', '$2', '$6', '$0'],
      correct: 1,
      explanation:
        'Intrinsic value for a call is max(0, stock price − strike). Here that is $52 − $50 = $2. The remaining $2 of the $4 premium is extrinsic (time) value.',
    },
    {
      question:
        "Which Greek measures how much an option's delta changes as the underlying price moves?",
      options: ['Theta', 'Vega', 'Gamma', 'Rho'],
      correct: 2,
      explanation:
        'Gamma is the rate of change of delta with respect to the underlying price. It is highest for at-the-money options near expiration and matters most for delta-hedged positions.',
    },
    {
      question: 'An American-style option differs from a European-style option because it:',
      options: [
        'Can only be exercised at expiration',
        'Can be exercised any time before expiration',
        'Is only traded on U.S. exchanges',
        'Has no extrinsic value component',
      ],
      correct: 1,
      explanation:
        'American options allow early exercise at any time before expiration. European options can only be exercised at expiration. Most listed equity options in the U.S. are American-style.',
    },
    {
      question:
        'What happens to the time value of an option as expiration approaches (all else equal)?',
      options: [
        'It increases linearly',
        'It stays constant until the final day',
        'It decays, accelerating in the final weeks',
        'It converts to intrinsic value automatically',
      ],
      correct: 2,
      explanation:
        'Time decay (theta) erodes extrinsic value as expiration nears. The decay accelerates in the final weeks because there is less time for the option to move in-the-money.',
    },
    {
      question:
        'If implied volatility rises sharply while the stock price is unchanged, what typically happens to option premiums?',
      options: [
        'They fall because delta decreases',
        'They rise because the market prices in a larger expected move',
        'They are unaffected because IV is not used in pricing',
        'Only in-the-money options are affected',
      ],
      correct: 1,
      explanation:
        "Implied volatility reflects the market's expectation of future price movement. Higher IV increases the probability-weighted payoff of options, raising premiums even if the spot price is flat.",
    },
    {
      question: 'What is the maximum possible loss for a buyer of a put option?',
      options: [
        'Unlimited',
        'The premium paid for the contract',
        'The strike price minus the premium',
        'The full value of the underlying stock',
      ],
      correct: 1,
      explanation:
        "An option buyer's risk is capped at the premium paid. Even if the underlying rallies indefinitely, a long put simply expires worthless — the buyer loses only what they paid upfront.",
    },
    {
      question:
        'Which moneyness label applies when the strike price equals the current stock price?',
      options: ['In-the-money', 'Out-of-the-money', 'At-the-money', 'Deep-in-the-money'],
      correct: 2,
      explanation:
        'At-the-money (ATM) means strike ≈ spot price. ATM options typically have the highest gamma and time value relative to their premium.',
    },
    {
      question: 'What does exercising a call option at expiration require the holder to do?',
      options: [
        'Sell 100 shares at the strike price',
        'Buy 100 shares at the strike price',
        'Receive cash equal to the strike price with no share delivery',
        'Roll the position into the next expiration automatically',
      ],
      correct: 1,
      explanation:
        'Exercising a call means purchasing the underlying at the strike. For standard U.S. equity options, one contract controls 100 shares.',
    },
    {
      question: 'Why might an option trade below its intrinsic value briefly before expiration?',
      options: [
        'It is illegal for options to trade below intrinsic value',
        'Early exercise and dividend capture can make American puts trade below parity in edge cases',
        'Market makers always enforce parity instantly',
        'Intrinsic value is only calculated after expiration',
      ],
      correct: 1,
      explanation:
        'Put-call parity can break slightly due to early exercise considerations, dividends, and borrowing costs. Deep in-the-money American options may deviate from theoretical parity near ex-dividend dates.',
    },
  ],

  'stocks-advanced-2': [
    {
      question: 'What is the primary goal of a covered call strategy?',
      options: [
        'Unlimited upside with no downside',
        'Generate income from a long stock position while capping upside at the strike',
        'Profit only if the stock falls sharply',
        'Eliminate all market risk from the portfolio',
      ],
      correct: 1,
      explanation:
        'A covered call sells a call against owned shares. You collect premium income but give up gains above the strike. Downside is only partially cushioned by the premium received.',
    },
    {
      question: 'In a long straddle, what is the trader betting on?',
      options: [
        'Low volatility and a range-bound stock',
        'A large move in either direction before expiration',
        'A steady drift higher with low variance',
        'A decline in implied volatility only',
      ],
      correct: 1,
      explanation:
        'A long straddle buys both a call and put at the same strike. It profits if the underlying moves far enough in either direction to exceed the total premium paid.',
    },
    {
      question: 'What defines an iron condor position?',
      options: [
        'Long call and long put at the same strike',
        'Short inner strikes and long outer strikes on both calls and puts',
        'Four long calls at progressively higher strikes',
        'Short stock hedged with a long call only',
      ],
      correct: 1,
      explanation:
        'An iron condor sells an OTM call spread and an OTM put spread simultaneously. It profits from low volatility and time decay if the underlying stays within the inner strikes.',
    },
    {
      question: 'Why is a naked short call considered high risk?',
      options: [
        'Maximum loss is limited to the premium received',
        'Potential loss is theoretically unlimited if the stock rises sharply',
        'It can only lose money if volatility falls',
        'The position automatically closes at the strike price',
      ],
      correct: 1,
      explanation:
        'A naked short call has unlimited upside risk on the underlying. A sudden rally can force the writer to buy shares at much higher prices to cover the obligation.',
    },
    {
      question: 'A protective put on a stock you own functions most like:',
      options: [
        'A short position in the stock',
        'Portfolio insurance with a deductible equal to the put premium',
        'A leveraged bullish bet with no cost',
        'A tax-loss harvesting tool only',
      ],
      correct: 1,
      explanation:
        'Buying a put limits downside below the strike while preserving upside (minus premium). It is essentially insurance — you pay a premium to cap losses.',
    },
    {
      question: 'What is a calendar spread?',
      options: [
        'Buying and selling the same strike but different expirations',
        'Buying two calls at different strikes in the same month',
        'Selling a put and buying a call at the same strike',
        'Rolling a position every calendar quarter',
      ],
      correct: 0,
      explanation:
        'A calendar (time) spread typically sells a near-term option and buys a longer-dated option at the same strike. It profits from faster time decay on the short leg if the stock stays near the strike.',
    },
    {
      question: 'In a bull call spread, what caps the maximum profit?',
      options: [
        'The premium paid for the long call',
        'The short call strike at the upper leg',
        'The expiration date alone',
        'The implied volatility level at entry',
      ],
      correct: 1,
      explanation:
        'A bull call spread buys a lower-strike call and sells a higher-strike call. Gains are limited to the spread width minus net debit because the short call obligation caps upside.',
    },
    {
      question: 'When might a trader use a collar strategy?',
      options: [
        'To maximize leverage on a momentum stock',
        'To protect a long stock position while financing the put by selling a call',
        'To bet on a volatility crush after earnings',
        'To replicate a short stock position exactly',
      ],
      correct: 1,
      explanation:
        'A collar buys a protective put and sells an OTM call against owned stock. The call premium often offsets much of the put cost, creating low-cost downside protection with capped upside.',
    },
    {
      question: 'What is the main risk of selling a cash-secured put?',
      options: [
        'Unlimited loss if the stock rises',
        'Obligation to buy the stock at the strike if assigned, potentially above market value after a drop',
        'Guaranteed profit equal to the premium in all scenarios',
        'The put expires worthless only if the stock falls',
      ],
      correct: 1,
      explanation:
        'If the stock falls below the strike, you may be assigned and must buy shares at the strike. Your effective cost is strike minus premium, but you still face further downside after assignment.',
    },
    {
      question: 'Why do vertical spreads require less margin than naked options?',
      options: [
        'They have no defined risk',
        "The long leg offsets part of the short leg's obligation, bounding maximum loss",
        'Brokers waive margin on all multi-leg trades',
        'Vertical spreads are always delta-neutral',
      ],
      correct: 1,
      explanation:
        'Defined-risk spreads cap the worst-case loss at the width of the spread minus credit (or plus debit). Brokers margin the position based on this bounded risk rather than unlimited naked exposure.',
    },
  ],

  'stocks-advanced-3': [
    {
      question: 'What happens when you short a stock and it pays a dividend?',
      options: [
        'You receive the dividend payment',
        'You owe the dividend to the lender of the shares',
        'Dividends are canceled for short positions',
        'The broker covers the dividend from your margin interest',
      ],
      correct: 1,
      explanation:
        'The short seller must pay the dividend to the stock lender because the lender no longer holds the shares on the record date. This is a real cost of maintaining a short through ex-dividend.',
    },
    {
      question: 'What is a short squeeze?',
      options: [
        'A forced liquidation of a long position at a loss',
        'A rapid price rise driven by short sellers covering as losses mount and borrow costs spike',
        'A regulatory halt on all short selling',
        'When a stock becomes impossible to borrow at any rate',
      ],
      correct: 1,
      explanation:
        'In a squeeze, rising prices force shorts to buy back shares, which pushes the price higher still. Thin float plus high short interest creates reflexive upward pressure.',
    },
    {
      question: 'The maximum gain on a short stock position is theoretically:',
      options: [
        'Unlimited',
        '100% if the stock goes to zero',
        'Limited to the margin deposit posted',
        'Equal to the dividend yield only',
      ],
      correct: 1,
      explanation:
        'The best case for a short is the stock goes to zero — you buy back at $0 and keep the sale proceeds. Unlike a long, upside risk is unlimited because there is no cap on how high a stock can rise.',
    },
    {
      question: 'What does "hard to borrow" (HTB) mean for a short seller?',
      options: [
        'The stock cannot be sold short under any circumstances',
        'Shares are scarce in the lending market, often incurring extra fees and locate requirements',
        'The stock must be held overnight before shorting',
        'Only market makers may short HTB names',
      ],
      correct: 1,
      explanation:
        'HTB stocks have limited lendable supply. Brokers may charge elevated borrow fees, require pre-borrow locates, or restrict shorting entirely if shares cannot be sourced.',
    },
    {
      question: 'Why might a short seller buy a call option against their short stock?',
      options: [
        'To increase exposure to upside',
        'To cap unlimited upside risk on the short position',
        'To collect dividend income',
        'To avoid paying borrow fees',
      ],
      correct: 1,
      explanation:
        "A long call on a short stock creates a synthetic position with bounded upside risk. If the stock surges, the call gains offset part of the short's losses.",
    },
    {
      question: 'What is short interest as a percentage of float?',
      options: [
        'The number of shares sold short divided by shares available for trading',
        'Total shares outstanding divided by short volume',
        'Daily short volume as a percent of average volume',
        'The borrow fee charged by prime brokers',
      ],
      correct: 0,
      explanation:
        'Short interest % of float measures how heavily a stock is shorted relative to tradable shares. Elevated readings signal crowded bearish bets but do not by themselves predict timing.',
    },
    {
      question: 'When a broker issues a "buy-in" notice on a short position, it means:',
      options: [
        'You must deposit additional cash only',
        'The broker is forcing you to cover because shares could not be borrowed or maintained',
        'You are prohibited from trading for 90 days',
        'Your short position has been automatically converted to a long put',
      ],
      correct: 1,
      explanation:
        'A buy-in occurs when the broker cannot maintain the stock loan and must purchase shares in the market to close your short. You may get a poor fill price with little notice.',
    },
    {
      question:
        'Which metric helps estimate how long it would take all short positions to cover at average daily volume?',
      options: [
        'P/E ratio',
        'Days to cover (short interest ÷ average daily volume)',
        'Debt-to-equity ratio',
        'Put/call ratio at the money',
      ],
      correct: 1,
      explanation:
        'Days to cover estimates how many days of normal volume would be required for shorts to buy back all shares. Higher values suggest a more crowded, potentially squeeze-prone short book.',
    },
    {
      question: 'What is the primary purpose of a "short interest report" published twice monthly?',
      options: [
        'To list stocks that cannot be shorted',
        'To disclose aggregate short positions as of settlement dates for transparency',
        'To set official borrow rates for prime brokers',
        'To trigger automatic buy-ins on high-short names',
      ],
      correct: 1,
      explanation:
        'FINRA and exchange data publish short interest twice monthly. It is a lagging snapshot — positions can change significantly between reporting dates.',
    },
    {
      question: 'Why is shorting fundamentally different from buying a put for a bearish view?',
      options: [
        'Puts always cost more than borrow fees',
        'Shorting has unlimited upside risk and ongoing borrow/dividend costs; long puts have defined maximum loss',
        'Shorting is only available on options exchanges',
        'Puts cannot profit from downward moves',
      ],
      correct: 1,
      explanation:
        'Short stock exposes you to unlimited losses and carrying costs. A long put has capped loss (premium paid) and does not require locating shares, though time decay works against the holder.',
    },
  ],

  'stocks-advanced-4': [
    {
      question: 'What is initial margin in a margin account?',
      options: [
        'The minimum equity required to open a new leveraged position',
        'The interest rate charged on borrowed funds',
        'The maximum number of trades allowed per day',
        'Cash that must be kept in a separate escrow account',
      ],
      correct: 0,
      explanation:
        'Initial margin is the equity percentage you must post when opening a leveraged position. Reg T typically requires 50% initial margin on equities, though brokers may require more.',
    },
    {
      question:
        'If your account equity falls below the maintenance margin requirement, what typically happens first?',
      options: [
        'All positions are liquidated immediately without notice',
        'You receive a margin call requiring additional funds or reduced positions',
        'Your account is converted to cash-only permanently',
        'Borrowed funds are automatically forgiven',
      ],
      correct: 1,
      explanation:
        'Falling below maintenance triggers a margin call. You must deposit cash or sell securities to restore required equity. Failure to comply can lead to forced liquidation by the broker.',
    },
    {
      question: 'What is buying power in a margin account?',
      options: [
        'Cash balance only, excluding securities',
        'The maximum dollar value of securities you can purchase given your equity and margin rules',
        'The total dividends received in the account',
        'The amount of short interest you can accumulate',
      ],
      correct: 1,
      explanation:
        'Buying power reflects how much you can deploy given leverage limits. It increases with account equity and decreases when positions consume margin or after losses.',
    },
    {
      question: 'Pattern day trader (PDT) rules in the U.S. apply when an account:',
      options: [
        'Holds more than $25,000 in any asset class',
        'Executes four or more day trades within five business days in a margin account under $25,000',
        'Uses options strategies with more than two legs',
        'Shorts more than 10% of float in one stock',
      ],
      correct: 1,
      explanation:
        'PDT designation triggers when you day trade four or more times in five days in a margin account with less than $25,000 equity. PDT accounts must maintain at least $25,000 minimum equity.',
    },
    {
      question: 'How does margin interest typically accrue on borrowed funds?',
      options: [
        'Only on profits from winning trades',
        "Daily on the outstanding debit balance at the broker's stated rate",
        'Annually on January 1 regardless of balance changes',
        'Only when the account is in a margin call',
      ],
      correct: 1,
      explanation:
        "Margin interest is charged on the net debit balance — cash you've borrowed to fund purchases. It accrues daily and compounds, making long-term leveraged holding expensive.",
    },
    {
      question: 'What is a "fed call" under Regulation T?',
      options: [
        'A request to deposit enough cash to meet the 50% initial margin on a recent purchase',
        'A mandatory liquidation after three losing days',
        'A call from the Federal Reserve raising interest rates',
        'A restriction on trading OTC stocks',
      ],
      correct: 0,
      explanation:
        "A fed call occurs when purchased securities are not paid for in full within the settlement period. You must deposit cash or sell securities to meet Reg T's initial margin requirement.",
    },
    {
      question: 'Why can margin amplify losses as well as gains?',
      options: [
        'Brokers charge fees only on losing trades',
        'Losses reduce equity, which can trigger margin calls and forced sales at unfavorable prices',
        'Margin accounts are exempt from market downturns',
        'Leverage only applies to profitable positions',
      ],
      correct: 1,
      explanation:
        'Leverage magnifies percentage returns in both directions. A 20% drop on a 2× leveraged position can wipe out 40% of equity and trigger liquidation before a recovery.',
    },
    {
      question: 'Portfolio margin differs from standard Reg T margin because it:',
      options: [
        'Uses risk-based stress tests on the entire portfolio rather than fixed percentage requirements per position',
        'Prohibits all short selling',
        'Requires no minimum equity',
        'Only applies to retirement accounts',
      ],
      correct: 0,
      explanation:
        'Portfolio margin models worst-case portfolio losses under various scenarios. Hedged or defined-risk positions often require less margin than under simplistic Reg T rules.',
    },
    {
      question: 'What is the settlement impact of trading on margin before T+1 fully settles?',
      options: [
        'There is no settlement impact for margin accounts',
        'Unsettled funds and good-faith violations can still restrict certain trades in cash portions of the account',
        'Margin trades settle instantly with no restrictions',
        'Only options are subject to settlement rules',
      ],
      correct: 1,
      explanation:
        'Even in margin accounts, free-riding and good-faith violation rules can apply to cash trades. Understanding settlement prevents accidental rule violations when mixing cash and margin buying power.',
    },
    {
      question: 'When a broker issues a "maintenance call," the account equity is:',
      options: [
        'Above the initial margin requirement',
        'Below the maintenance requirement but positions may still be open',
        'Exactly zero',
        'Automatically restored by the SIPC fund',
      ],
      correct: 1,
      explanation:
        "Maintenance calls occur when account equity drops below the broker's maintenance threshold (often 25-30% for equities). You must add funds or liquidate positions to restore compliance.",
    },
  ],

  'stocks-advanced-5': [
    {
      question: 'What does the Sharpe ratio measure?',
      options: [
        'Total return over a calendar year',
        'Excess return per unit of total volatility relative to the risk-free rate',
        'The correlation between two assets',
        'Maximum drawdown from peak to trough',
      ],
      correct: 1,
      explanation:
        'Sharpe = (Return − Risk-free rate) / Standard deviation. It answers whether return compensates for total risk taken. Higher Sharpe indicates better risk-adjusted performance.',
    },
    {
      question: 'In a linear regression of stock returns against market returns, beta is:',
      options: [
        'The intercept term',
        'The slope coefficient measuring sensitivity to market moves',
        'The R-squared value',
        'The standard error of the estimate',
      ],
      correct: 1,
      explanation:
        'Beta is the slope of the regression — how much the stock tends to move for a 1% move in the market. Beta > 1 means more volatile than the market; beta < 1 means less.',
    },
    {
      question: 'What is a key weakness of backtesting trading strategies on historical data?',
      options: [
        'Historical data is always perfectly clean',
        'Overfitting — strategies tuned to past noise may fail out-of-sample',
        'Backtests cannot compute returns',
        'Past volatility cannot be measured',
      ],
      correct: 1,
      explanation:
        'Fitting too many parameters to historical data captures random noise. A strategy that looks brilliant in-sample often degrades sharply on unseen data unless validated rigorously.',
    },
    {
      question: 'What does Value at Risk (VaR) at the 95% level estimate?',
      options: [
        'The maximum possible loss ever',
        "The loss threshold that should not be exceeded on 95% of days under the model's assumptions",
        'Average daily return over 95 days',
        'The 95th percentile of winning trades',
      ],
      correct: 1,
      explanation:
        '95% one-day VaR might read as "we expect losses worse than $X on only 5% of days." It depends heavily on distributional assumptions and can underestimate tail risk.',
    },
    {
      question: 'Why might a quant use z-score normalization on cross-sectional factors?',
      options: [
        'To eliminate all negative returns',
        'To compare stocks on a common scale by expressing values as standard deviations from the cross-sectional mean',
        'To convert prices to dividend yields',
        'To guarantee stationarity of stock prices',
      ],
      correct: 1,
      explanation:
        'Z-scoring factors (e.g., P/E, momentum) puts them on comparable scales for ranking and combination. A z-score of +2 means the stock is two standard deviations above the universe average.',
    },
    {
      question: 'What is walk-forward analysis designed to reduce?',
      options: [
        'Transaction costs only',
        'Look-ahead bias and overfitting by testing on rolling out-of-sample windows',
        'The need for any historical data',
        'Correlation between assets',
      ],
      correct: 1,
      explanation:
        'Walk-forward trains on one window, tests on the next, then rolls forward. Repeated out-of-sample tests give a more honest estimate of live performance than a single in-sample fit.',
    },
    {
      question: 'Monte Carlo simulation in portfolio analysis primarily helps by:',
      options: [
        'Predicting the exact future return path',
        'Generating thousands of random scenarios to estimate the distribution of outcomes',
        'Eliminating all model assumptions',
        'Replacing the need for historical data entirely',
      ],
      correct: 1,
      explanation:
        'Monte Carlo draws random returns from assumed distributions to estimate probability ranges for portfolio values, drawdowns, or strategy P&L — useful for stress testing uncertainty.',
    },
    {
      question: 'What does autocorrelation in return series suggest?',
      options: [
        'Returns are perfectly independent over time',
        'Past returns contain information that may predict future returns (or volatility clustering exists)',
        'The stock follows a random walk with no structure',
        'Beta equals exactly 1',
      ],
      correct: 1,
      explanation:
        'Significant autocorrelation violates pure random walk assumptions. Momentum (positive autocorrelation) and mean reversion (negative) are both empirically observed in different horizons.',
    },
    {
      question:
        'In mean-variance optimization, why do small errors in expected return estimates cause unstable weights?',
      options: [
        'The optimizer ignores expected returns',
        'The optimizer is highly sensitive to return inputs and may concentrate in a few assets',
        'Covariance matrices are always perfectly estimated',
        'Constraints are never used in practice',
      ],
      correct: 1,
      explanation:
        'Markowitz optimization magnifies input errors — tiny changes in expected returns can swing optimal weights from 5% to 80% in one asset. Practitioners use shrinkage, constraints, or robust methods.',
    },
    {
      question: 'What is the purpose of a out-of-sample holdout set?',
      options: [
        'To train the model with more data',
        'To evaluate strategy performance on data not used during development',
        'To increase in-sample fit statistics',
        'To compute only transaction costs',
      ],
      correct: 1,
      explanation:
        'Reserving unseen data for final validation mimics live trading conditions. If performance collapses out-of-sample, the strategy was likely overfit to the training period.',
    },
  ],

  'stocks-advanced-6': [
    {
      question: 'What is loss aversion in behavioral finance?',
      options: [
        'Preferring guaranteed gains over risky gains of equal expected value',
        'Feeling the pain of losses roughly twice as intensely as the pleasure of equivalent gains',
        'Avoiding all investments with any downside',
        'Selling winners immediately and holding losers',
      ],
      correct: 1,
      explanation:
        'Kahneman and Tversky found losses loom larger than gains psychologically. This asymmetry drives suboptimal decisions like holding losers too long to avoid realizing pain.',
    },
    {
      question: 'Confirmation bias leads investors to:',
      options: [
        'Seek disconfirming evidence actively',
        'Favor information that supports an existing thesis while ignoring contradictory data',
        'Diversify across all sectors equally',
        'Trade only on quantitative signals',
      ],
      correct: 1,
      explanation:
        'Confirmation bias causes selective attention — reading bullish articles on a stock you own while dismissing bear cases. It reinforces overconfidence and delays thesis revision.',
    },
    {
      question: 'The disposition effect describes the tendency to:',
      options: [
        'Hold winners too long and sell losers too quickly',
        'Sell winners too early and hold losers too long',
        'Trade excessively on Mondays only',
        'Ignore all tax considerations when selling',
      ],
      correct: 1,
      explanation:
        'Investors often sell profitable positions to "lock in gains" while riding losers hoping for a rebound. Tax-wise and expected-value-wise, this is often backwards.',
    },
    {
      question: 'What is anchoring in investment decisions?',
      options: [
        'Diversifying across multiple asset classes',
        'Over-relying on an initial reference point (e.g., purchase price) when judging fair value',
        'Using only trailing P/E ratios',
        'Following index weights exactly',
      ],
      correct: 1,
      explanation:
        'Anchoring to purchase price ("I\'ll sell when I break even") ignores current fundamentals and opportunity cost. The market does not care what you paid.',
    },
    {
      question: 'Herding behavior in markets often contributes to:',
      options: [
        'Perfectly efficient price discovery',
        "Bubbles and crashes as participants mimic others' actions",
        'Lower trading volume',
        'Reduced correlation among stocks',
      ],
      correct: 1,
      explanation:
        'When investors follow the crowd rather than independent analysis, prices can detach from fundamentals on the way up and crash violently when the herd reverses.',
    },
    {
      question: 'Overconfidence bias may cause traders to:',
      options: [
        'Trade too little and hold too much cash',
        'Underestimate risk, overtrade, and under-diversify',
        'Always use stop-loss orders',
        'Ignore all past performance',
      ],
      correct: 1,
      explanation:
        'Overconfident traders believe their edge is larger than it is, leading to excessive turnover, concentrated bets, and surprise when outcomes regress to reality.',
    },
    {
      question: 'What is the availability heuristic in investing?',
      options: [
        'Using only data from the most recent 10-K',
        'Judging probability by how easily examples come to mind (recent news, vivid stories)',
        'Calculating exact statistical frequencies for every event',
        'Relying solely on analyst price targets',
      ],
      correct: 1,
      explanation:
        'Vivid recent events (meme stock surges, crash headlines) feel more likely than base rates suggest. This distorts risk perception and position sizing.',
    },
    {
      question: 'Mental accounting causes investors to:',
      options: [
        'Treat all dollars as perfectly fungible',
        'Compartmentalize money into buckets with different risk rules (e.g., "play money" vs retirement)',
        'Optimize after-tax returns globally',
        'Ignore framing effects entirely',
      ],
      correct: 1,
      explanation:
        'Mental accounting leads to inconsistent risk-taking — conservative with retirement funds while speculating aggressively in a "fun" account without holistic portfolio view.',
    },
    {
      question: 'Prospect theory implies people are risk-seeking when facing:',
      options: [
        'Certain gains',
        'Probable gains after already being ahead',
        'Losses — they may gamble to avoid realizing a sure loss',
        'Well-diversified portfolios only',
      ],
      correct: 2,
      explanation:
        'In the loss domain, prospect theory predicts risk-seeking behavior — holding a losing lottery ticket or doubling down to avoid locking in defeat, even when expected value favors cutting losses.',
    },
    {
      question: 'A pre-mortem exercise helps counter behavioral bias by:',
      options: [
        'Predicting earnings with machine learning',
        'Imagining the investment failed and working backward to identify risks ignored by optimism',
        'Automating all buy and sell decisions',
        'Increasing position size after wins',
      ],
      correct: 1,
      explanation:
        'Pre-mortems force explicit consideration of failure modes before capital is committed. It surfaces disconfirming scenarios that optimism and confirmation bias would otherwise suppress.',
    },
  ],

  'stocks-advanced-7': [
    {
      question:
        'What does an inverted yield curve (short rates above long rates) historically signal?',
      options: [
        'Immediate strong economic expansion',
        'Elevated recession risk over the following 12-18 months',
        'Rising commodity prices only',
        'Higher corporate earnings growth with certainty',
      ],
      correct: 1,
      explanation:
        'An inverted curve has preceded most U.S. recessions. It reflects tight short-term policy and market expectations of future rate cuts amid slowing growth.',
    },
    {
      question:
        'When the Federal Reserve raises the federal funds rate, which sector often faces headwinds first?',
      options: [
        'Utilities and REITs sensitive to discount rates and financing costs',
        'Early-cycle cyclicals with no debt',
        'Cash-rich mega-cap tech with zero sensitivity to rates',
        'Commodity producers exclusively',
      ],
      correct: 0,
      explanation:
        'Rate-sensitive sectors with high debt and bond-like cash flows (utilities, REITs) reprice lower as discount rates rise. Growth stocks with long-duration cash flows are also pressured.',
    },
    {
      question: 'Core CPI excludes food and energy primarily because:',
      options: [
        'Those categories never affect consumers',
        'They are volatile and can obscure underlying inflation trends',
        'They are not measured by government agencies',
        'They are always deflationary',
      ],
      correct: 1,
      explanation:
        'Food and energy swing with supply shocks (weather, geopolitics). Core inflation strips them to reveal stickier underlying price pressures policymakers watch for persistence.',
    },
    {
      question:
        'What is the typical market reaction to a "hot" jobs report (strong payrolls, rising wages)?',
      options: [
        'Bond yields fall and growth stocks rally on certainty',
        'Bond yields may rise on Fed-tightening fears, pressuring rate-sensitive assets',
        'The dollar weakens sharply and gold crashes',
        'Volatility always goes to zero',
      ],
      correct: 1,
      explanation:
        'Strong labor data can imply persistent inflation and tighter policy. Higher rate expectations lift yields and can weigh on equities, especially long-duration growth.',
    },
    {
      question: 'Leading economic indicators (LEI) differ from coincident indicators because LEI:',
      options: [
        'Measure current activity only',
        'Tend to turn before the broader economy, helping anticipate cycle shifts',
        'Are released only once per decade',
        'Include only stock prices with no other data',
      ],
      correct: 1,
      explanation:
        'Components like building permits, consumer expectations, and yield curve slope often change direction before GDP and employment, giving traders an early cycle read.',
    },
    {
      question: 'Why can "good news is bad news" occur for stocks during certain macro regimes?',
      options: [
        'Markets always prefer recessions',
        'Strong data may imply tighter Fed policy, which hurts valuations even if the economy is healthy',
        'Good news is never reflected in prices',
        'Algorithms ignore macro data entirely',
      ],
      correct: 1,
      explanation:
        'When inflation is the dominant concern, strong growth or jobs data can trigger selloffs as investors price in higher-for-longer rates. Macro context determines whether data is bullish or bearish for equities.',
    },
    {
      question: 'The ISM Manufacturing PMI below 50 indicates:',
      options: [
        'Expansion in manufacturing activity',
        'Contraction in manufacturing activity',
        'Exact GDP growth of 5%',
        'Automatic Fed rate cuts within one week',
      ],
      correct: 1,
      explanation:
        'PMI above 50 signals expansion; below 50 signals contraction. Manufacturing PMI is a timely survey-based read on industrial activity and often leads broader cyclical trends.',
    },
    {
      question: 'How does a stronger U.S. dollar typically affect multinational U.S. exporters?',
      options: [
        'It boosts overseas revenue when translated to dollars',
        'It reduces the dollar value of foreign sales and can compress margins',
        'It has no effect on earnings',
        'It automatically increases domestic demand',
      ],
      correct: 1,
      explanation:
        'A stronger dollar makes U.S. goods more expensive abroad and converts foreign earnings into fewer dollars. Exporters often guide lower when the dollar strengthens sharply.',
    },
    {
      question: 'What is the "wealth effect" relevant to consumer spending and markets?',
      options: [
        'Taxes rise automatically when stocks fall',
        'Rising asset prices make households feel richer, supporting consumption and economic activity',
        'Only bondholders experience wealth changes',
        'Central banks set stock prices directly',
      ],
      correct: 1,
      explanation:
        'When housing and portfolios appreciate, consumers tend to spend more even if income is unchanged. Conversely, bear markets can dampen consumption — a feedback loop traders watch in late cycle.',
    },
    {
      question: 'Why do traders watch initial jobless claims weekly?',
      options: [
        'They predict exact monthly payrolls with no error',
        'They are a high-frequency, timely signal of labor market deterioration or stability',
        'They measure inflation directly',
        'They replace the need to watch Fed meetings',
      ],
      correct: 1,
      explanation:
        'Weekly claims spike early in downturns and normalize slowly in recoveries. They offer one of the fastest reads on whether layoffs are accelerating — critical for recession timing trades.',
    },
  ],

  'stocks-advanced-8': [
    {
      question: 'What is an earnings "whisper number"?',
      options: [
        'The officially guided EPS from company IR',
        'The unofficial consensus among traders, often above published analyst estimates',
        'The SEC-mandated forecast in the 10-Q',
        'The dividend payout implied by earnings',
      ],
      correct: 1,
      explanation:
        'Whisper numbers reflect what the market truly expects versus published Street estimates. Beating the official consensus but missing the whisper can still cause a selloff.',
    },
    {
      question: 'Why might a stock fall after reporting EPS that beats estimates?',
      options: [
        'Beating estimates always guarantees a rally',
        'Forward guidance, margins, or revenue may disappoint versus elevated expectations',
        'The SEC requires a selloff after beats',
        'Options expire on earnings day',
      ],
      correct: 1,
      explanation:
        'Markets trade on expectations versus reality across the full report — guidance, margins, segment detail, and tone matter. A beat on lagging EPS with weak forward outlook often triggers "sell the news."',
    },
    {
      question:
        'Implied volatility typically ______ into earnings and ______ immediately after the report.',
      options: [
        'falls; rises',
        'rises; collapses (IV crush)',
        'stays flat; doubles',
        'rises; rises further',
      ],
      correct: 1,
      explanation:
        'Options price in an uncertain move before the event. Once the number is known, the uncertainty premium evaporates — IV crush hurts long straddle holders even if direction was correct.',
    },
    {
      question: 'What is a "double beat" that investors often reward most?',
      options: [
        'Beating EPS and missing on revenue',
        'Beating on both EPS and revenue versus consensus',
        'Beating twice in the same press release',
        'Beating estimates two quarters in a row only',
      ],
      correct: 1,
      explanation:
        'Beating both top and bottom line suggests broad strength, not just cost cuts or one-time items. The market often penalizes revenue misses even when EPS beats via margins alone.',
    },
    {
      question: 'When is the quiet period most relevant for traders around earnings?',
      options: [
        'The week after results when insiders may buy freely',
        'The period before results when company communications are restricted, limiting official updates',
        'The first day of the fiscal year only',
        'When options are not listed on the stock',
      ],
      correct: 1,
      explanation:
        'Reg FD and quiet-period norms limit what companies say pre-earnings. Information vacuum can amplify volatility as the market relies on leaks, channel checks, and positioning.',
    },
    {
      question: 'A "kitchen sink" quarter refers to management:',
      options: [
        'Reporting perfect results with no adjustments',
        'Taking large one-time charges to reset expectations lower for future periods',
        'Eliminating all non-GAAP metrics',
        'Refusing to hold an earnings call',
      ],
      correct: 1,
      explanation:
        'New CEOs or troubled companies sometimes cram write-downs, restructuring charges, and guidance cuts into one quarter to clear the deck. Skilled traders assess whether bad news is truly one-time.',
    },
    {
      question: 'Why do traders track pre-earnings options skew?',
      options: [
        'Skew is irrelevant to event pricing',
        'Elevated put or call skew reveals directional fear or demand for protection into the event',
        'Skew only matters for bonds',
        'Skew replaces the need to read the income statement',
      ],
      correct: 1,
      explanation:
        'Abnormal skew into earnings shows whether participants pay up for puts (fear) or calls ( upside bets). Combined with straddle pricing, it informs expected move and positioning.',
    },
    {
      question: 'Same-store sales (comps) matter most for which type of earnings analysis?',
      options: [
        'Early-stage biotech with no revenue',
        'Retail and restaurant chains where unit-level growth separates from new store openings',
        'Pure holding companies with no operations',
        'Government bond ETFs',
      ],
      correct: 1,
      explanation:
        'Comps strip out expansion-driven growth to show organic demand. A revenue beat driven only by new stores can mask weakening traffic — a classic earnings-season trap.',
    },
    {
      question: 'What is post-earnings announcement drift (PEAD)?',
      options: [
        'Prices instantly reflect all information with no further move',
        'The tendency for stocks to continue drifting in the direction of the earnings surprise for weeks',
        'Mandatory price limits after earnings',
        'Drift caused only by index rebalancing',
      ],
      correct: 1,
      explanation:
        'PEAD is a documented anomaly where positive surprises tend to outperform and negative surprises underperform over subsequent weeks, suggesting gradual information diffusion.',
    },
    {
      question:
        'When playing earnings with options, why can owning a straddle through the report still lose money?',
      options: [
        'Straddles profit from any move regardless of size',
        'The actual move may be smaller than the priced-in expected move after IV crush',
        'Options cannot be traded on earnings week',
        'Stock prices do not move on earnings',
      ],
      correct: 1,
      explanation:
        "You need the stock to move more than the straddle's breakeven (which embeds elevated pre-event IV). A moderate move in the right direction can still lose after the volatility premium collapses.",
    },
  ],

  'stocks-expert-1': [
    {
      question: 'What is slippage in algorithmic trading?',
      options: [
        'The bid-ask spread on liquid ETFs only',
        'The difference between expected execution price and actual fill price',
        'Latency between order entry and exchange receipt only',
        'Regulatory fees per share traded',
      ],
      correct: 1,
      explanation:
        'Slippage captures implementation shortfall — paying more when buying or receiving less when selling versus the decision price. It erodes backtested edge in live trading.',
    },
    {
      question: 'A VWAP algorithm aims to:',
      options: [
        'Execute entirely in the opening auction',
        'Match or beat the volume-weighted average price over a specified interval',
        'Maximize market impact intentionally',
        'Trade only at the closing print',
      ],
      correct: 1,
      explanation:
        "VWAP algos slice orders to track intraday volume curves, minimizing detection and benchmarking against the day's average price — common for institutional equity execution.",
    },
    {
      question: 'What is look-ahead bias in a backtested algo strategy?',
      options: [
        'Using only live order book data',
        'Accidentally using information that would not have been available at the simulated trade time',
        'Testing on too many stocks',
        'Ignoring transaction costs',
      ],
      correct: 1,
      explanation:
        'Look-ahead bias inflates backtests — e.g., using revised earnings data or closing prices known only after the signal time. It is one of the most common reasons algos fail live.',
    },
    {
      question: 'Low-latency strategies most often compete on:',
      options: [
        'Fundamental analysis of 10-K footnotes',
        'Speed of market data processing and order routing to capture fleeting mispricings',
        'Quarterly dividend capture only',
        'Manual chart pattern recognition',
      ],
      correct: 1,
      explanation:
        'HFT and stat-arb shops invest in co-location, FPGA processing, and optimized feeds to act on microsecond-scale opportunities invisible to discretionary traders.',
    },
    {
      question: 'What does an TWAP execution strategy optimize for?',
      options: [
        'Trading evenly across time regardless of volume patterns',
        'Concentrating all volume in the most volatile hour',
        'Minimizing commission by trading once per week',
        'Matching closing auction price only',
      ],
      correct: 0,
      explanation:
        'TWAP splits orders into equal time slices. It is simpler than VWAP and useful when volume patterns are unpredictable but you want steady participation without timing the book.',
    },
    {
      question: 'Why must algo backtests include realistic transaction cost models?',
      options: [
        'Costs are negligible for all strategies',
        'Spread, fees, and market impact can erase apparent alpha that exists only on paper',
        'Exchanges rebate all HFT losses',
        'Backtests automatically include all costs by default',
      ],
      correct: 1,
      explanation:
        'A strategy with 5 bps theoretical edge per trade loses money if implementation costs 8 bps. Cost modeling separates viable algos from spreadsheet fantasies.',
    },
    {
      question: 'What is order book imbalance used for in short-term algos?',
      options: [
        'Predicting GDP growth',
        'Inferring near-term price pressure from disproportionate bid vs ask size',
        'Calculating long-term fair value from DCF',
        'Determining quarterly tax lots',
      ],
      correct: 1,
      explanation:
        'Heavy bid-side size relative to asks may signal buying pressure (and vice versa). Microstructure signals like imbalance feed short-horizon prediction models.',
    },
    {
      question: 'Smart order routing (SOR) primarily:',
      options: [
        'Routes all orders to a single dark pool',
        'Splits orders across venues to seek best price and liquidity while minimizing information leakage',
        'Eliminates the need for compliance review',
        'Guarantees price improvement on every fill',
      ],
      correct: 1,
      explanation:
        'SOR evaluates lit exchanges, ATSs, and internalizers dynamically. Good routers balance fill quality, speed, and regulatory requirements like NBBO protection.',
    },
    {
      question: 'What is a common pitfall of overfitting an ML trading model?',
      options: [
        'Using too little training data only',
        'Excellent in-sample metrics that collapse live due to fitting noise rather than durable signal',
        'Training on too many uncorrelated features with proper validation',
        'Using cross-validation at all',
      ],
      correct: 1,
      explanation:
        'Complex models memorize historical quirks — specific tickers, regimes, or outliers. Without strict regularization and out-of-sample tests, live performance regresses harshly.',
    },
    {
      question: 'Kill switches in automated trading systems exist to:',
      options: [
        'Increase position size during volatility',
        'Halt trading when predefined loss, error, or connectivity thresholds are breached',
        'Speed up order submission during crashes',
        'Bypass risk limits in fast markets',
      ],
      correct: 1,
      explanation:
        'Kill switches are fail-safes — fat-finger errors, runaway loops, or flash crashes can be contained by automatic cancellation and flattening when limits trip.',
    },
  ],

  'stocks-expert-2': [
    {
      question: 'What is the Fama-French three-factor model adding to market beta?',
      options: [
        'Momentum and quality factors',
        'Size (SMB) and value (HML) factors',
        'Interest rate and credit spreads',
        'Sector and country factors only',
      ],
      correct: 1,
      explanation:
        'FF3 adds small-minus-big (size) and high-minus-low (value) to explain cross-sectional return differences beyond CAPM market exposure alone.',
    },
    {
      question: 'The momentum factor (UMD/WML) typically buys:',
      options: [
        'Stocks with the lowest P/E ratios',
        'Recent winners and shorts recent losers over a 6-12 month formation period',
        'Only dividend aristocrats',
        'Stocks with the lowest beta',
      ],
      correct: 1,
      explanation:
        'Momentum exploits continuation — stocks that outperformed recently tend to keep outperforming short-term. It is powerful but prone to sharp crashes during reversals.',
    },
    {
      question: 'Why might a value factor underperform for extended periods?',
      options: [
        'Value never works in any decade',
        'Growth regimes, low rates, or sector composition can favor expensive growth stocks for years',
        'Value stocks have no earnings',
        'Factor definitions are fixed by law',
      ],
      correct: 1,
      explanation:
        'Value cycles — the 2010-2020 growth dominance showed factors can lag badly. Patience, diversification across factors, and understanding regime drivers are essential.',
    },
    {
      question: 'What is factor crowding risk?',
      options: [
        'Too many stocks in the index',
        'Many investors pursuing the same factor, amplifying drawdowns when the trade unwinds',
        'Regulatory limits on ETF holdings',
        'Using too many factors in a model',
      ],
      correct: 1,
      explanation:
        'When crowded factors reverse, forced deleveraging by quant funds can deepen losses. Crowding metrics (pairwise correlation of factor portfolios) help monitor this risk.',
    },
    {
      question: 'Quality factor screens often emphasize:',
      options: [
        'Highest revenue growth regardless of profitability',
        'Stable profitability, low leverage, and high ROE/ROIC',
        'Smallest market caps only',
        'Highest short interest',
      ],
      correct: 1,
      explanation:
        'Quality targets companies with durable earnings, strong balance sheets, and efficient capital use. It often overlaps partially with low volatility and profitability factors.',
    },
    {
      question: 'Smart beta differs from traditional cap-weighted indexing because it:',
      options: [
        'Ignores all rules and picks stocks randomly',
        'Targets specific factor exposures via systematic rules rather than weighting by market cap alone',
        'Uses only active manager discretion',
        'Guarantees outperformance every year',
      ],
      correct: 1,
      explanation:
        'Smart beta ETFs tilt toward value, momentum, quality, or low vol using transparent rules. They sit between passive cap-weight and fully discretionary active management.',
    },
    {
      question: 'What is a common method to combine multiple factors in one portfolio?',
      options: [
        'Pick whichever factor worked last month only',
        'Score stocks on several factors and combine ranks or z-scores with defined weights',
        'Use only one factor to avoid complexity',
        'Equal-weight all stocks regardless of factor exposure',
      ],
      correct: 1,
      explanation:
        'Multi-factor models rank stocks on value, momentum, quality, etc., then blend scores. Correlation among factors matters — combining low-correlation factors improves diversification of alpha sources.',
    },
    {
      question: 'The low-volatility anomaly suggests:',
      options: [
        'Higher-beta stocks always earn higher risk-adjusted returns',
        'Lower-volatility stocks have historically delivered similar or better risk-adjusted returns than high-vol stocks',
        'Volatility is irrelevant to returns',
        'Only bonds exhibit low volatility',
      ],
      correct: 1,
      explanation:
        'Contrary to CAPM intuition, low-vol stocks have often matched or beaten high-vol stocks on a risk-adjusted basis — partly due to leverage constraints and lottery preferences.',
    },
    {
      question: 'Why do factor premiums require a economic rationale to be durable?',
      options: [
        'Factors work only due to data mining with no explanation needed',
        'Persistent premiums often compensate for risk, behavioral biases, or structural constraints — otherwise they may be arbitraged away',
        'Premium means subscription fee on ETFs',
        'Rationale is optional if backtest Sharpe exceeds 3',
      ],
      correct: 1,
      explanation:
        'Spurious factors from mining disappear out-of-sample. Durable factors typically have stories — distress risk (value), underreaction (momentum), or leverage limits (low vol).',
    },
    {
      question: 'In factor investing, "neutralizing" sector exposure means:',
      options: [
        'Owning only one sector',
        'Constructing portfolios so sector weights match a benchmark, isolating pure factor tilts',
        'Eliminating all stock-specific risk',
        'Shorting every sector ETF',
      ],
      correct: 1,
      explanation:
        'Raw value or momentum scores can overweight financials or tech. Sector-neutral construction removes industry bets so returns attribute more cleanly to the intended factor.',
    },
  ],

  'stocks-expert-3': [
    {
      question: 'Expected shortfall (CVaR) improves on VaR because it:',
      options: [
        'Ignores tail losses entirely',
        'Measures the average loss in the worst tail beyond the VaR threshold',
        'Only uses normally distributed returns',
        'Is always lower than VaR',
      ],
      correct: 1,
      explanation:
        'CVaR captures severity of tail events VaR ignores. If VaR says worst 5% days exceed −2%, CVaR tells you how bad those days are on average — critical for tail risk management.',
    },
    {
      question: 'Maximum drawdown measures:',
      options: [
        'Largest single-day gain',
        'Peak-to-trough decline before a new high is reached',
        'Annualized volatility only',
        'Correlation to the benchmark',
      ],
      correct: 1,
      explanation:
        'Max drawdown quantifies worst historical loss path — essential for sizing leverage and setting investor expectations. Recovery from deep drawdowns requires disproportionately large gains.',
    },
    {
      question: 'Why is correlation unstable during crises?',
      options: [
        'Correlations are always constant',
        'Diversification breaks down as assets move together toward 1 during stress ("correlation goes to one")',
        'Crises eliminate all volatility',
        'Only bonds correlate during stress',
      ],
      correct: 1,
      explanation:
        'Normal-period correlations underestimate crisis co-movement. Risk models assuming stable correlations underestimate portfolio tail risk — a lesson from 2008 and 2020.',
    },
    {
      question: 'Beta hedging a long portfolio with index futures aims to:',
      options: [
        'Increase directional market exposure',
        'Reduce net market (systematic) exposure while retaining stock-specific views',
        'Eliminate all risk including idiosyncratic',
        'Avoid all transaction costs',
      ],
      correct: 1,
      explanation:
        'Shorting index futures against a long stock book offsets broad market moves, isolating alpha from individual picks. Hedge ratio depends on portfolio beta versus the index.',
    },
    {
      question: 'What is stress testing in portfolio risk management?',
      options: [
        'Testing only the best-case scenario',
        'Simulating portfolio performance under hypothetical shocks (rate spikes, oil crash, recession)',
        'Running Monte Carlo with no assumptions',
        'Ignoring liquidity constraints',
      ],
      correct: 1,
      explanation:
        'Stress tests ask "what if 2008 repeats" or "what if rates rise 300 bps" — revealing vulnerabilities VaR models with normal assumptions may miss.',
    },
    {
      question: 'The Sortino ratio differs from Sharpe by using:',
      options: [
        'Total standard deviation in the denominator',
        'Downside deviation — penalizing only harmful volatility below a target return',
        'Maximum drawdown instead of volatility',
        'Beta instead of standard deviation',
      ],
      correct: 1,
      explanation:
        'Sortino focuses on downside risk investors actually fear. Upside volatility does not penalize the ratio, making it attractive for asymmetric return profiles.',
    },
    {
      question: 'Liquidity risk in a portfolio context refers to:',
      options: [
        'The bid-ask spread on Treasury bonds only',
        'The inability to exit positions at fair prices without significant market impact',
        'Currency translation effects',
        'Dividend reinvestment timing',
      ],
      correct: 1,
      explanation:
        'Illiquid holdings may show smooth marks until you need to sell — then impact costs bite. Liquidity-adjusted VaR and position limits address this gap.',
    },
    {
      question: 'What is risk parity allocation?',
      options: [
        'Equal dollar weight in every asset',
        'Sizing positions so each asset class contributes equally to total portfolio risk',
        'Owning only the lowest-volatility stock',
        'Parity between long and short books only in options',
      ],
      correct: 1,
      explanation:
        'Risk parity leverages lower-vol assets (bonds) and de-emphasizes high-vol assets (equities) so risk contributions balance. It assumes diversification benefits across asset classes.',
    },
    {
      question: 'Why might a portfolio have low ex-ante volatility but high tail risk?',
      options: [
        'Tail risk is impossible with diversification',
        'Short option positions or structured products embed hidden convexity losses in crashes',
        'Volatility forecasting is always perfect',
        'Tail risk only exists in crypto',
      ],
      correct: 1,
      explanation:
        'Selling volatility collects steady premiums with low day-to-day vol until a gap move causes nonlinear losses. Risk metrics must capture skew and kurtosis, not just variance.',
    },
    {
      question: 'Rebalancing to target weights in risk management serves to:',
      options: [
        'Maximize taxes paid',
        'Control drift in risk exposures and prevent unintended concentration after moves',
        'Eliminate the need for any hedges',
        'Always increase equity exposure after rallies',
      ],
      correct: 1,
      explanation:
        'Winners grow to dominate the book, silently raising risk. Systematic rebalancing enforces discipline and keeps the portfolio aligned with the intended risk budget.',
    },
  ],

  'stocks-expert-4': [
    {
      question: 'What is the NBBO?',
      options: [
        'National Best Bid and Offer — the highest bid and lowest ask across protected venues',
        'Net Broker Balance Obligation for margin accounts',
        'Non-Binding Buy Order type',
        'NYSE-only book for closing auctions',
      ],
      correct: 0,
      explanation:
        'Reg NMS requires routers to respect the NBBO — trading through a worse price on a protected quote is prohibited. It anchors best execution standards for retail and institutional orders.',
    },
    {
      question: 'Payment for order flow (PFOF) means:',
      options: [
        'Brokers charge exchanges for every trade',
        'Market makers pay brokers to route retail orders to them for execution',
        'Investors pay for direct exchange membership',
        'The Fed pays for Treasury order flow',
      ],
      correct: 1,
      explanation:
        'PFOF compensates brokers routing retail flow to wholesalers. Critics argue it may conflict with best execution; proponents cite price improvement statistics on small orders.',
    },
    {
      question: 'A limit order book displays:',
      options: [
        'Only executed trades from yesterday',
        'Queued buy and sell limit orders at various price levels',
        'Analyst estimates and price targets',
        'Only dark pool indications of interest',
      ],
      correct: 1,
      explanation:
        'The visible book shows resting liquidity at each price. Depth, spread, and order flow dynamics drive short-term price formation and execution algorithms.',
    },
    {
      question: 'What is market impact?',
      options: [
        'The regulatory fee per trade',
        'Price movement caused by your own order consuming available liquidity',
        'Slippage from internet latency only',
        'The dividend effect on ex-date',
      ],
      correct: 1,
      explanation:
        'Large orders move price against the trader — buying lifts the ask and depletes the book. Impact is a major component of implementation shortfall for institutional size.',
    },
    {
      question: 'Dark pools are trading venues that:',
      options: [
        'Publish all orders to the public tape in real time',
        'Match orders with limited pre-trade transparency to reduce information leakage',
        'Only trade cryptocurrency',
        'Guarantee better prices than lit markets always',
      ],
      correct: 1,
      explanation:
        'Dark pools hide order size and identity pre-trade, appealing to institutions fearing front-running. Post-trade reporting still occurs, but opacity raises fairness debates.',
    },
    {
      question: 'The bid-ask spread primarily compensates market makers for:',
      options: [
        'Providing liquidity, inventory risk, and adverse selection',
        'SEC registration fees only',
        'Dividend processing',
        'Clearing house membership exclusively',
      ],
      correct: 0,
      explanation:
        'Market makers earn the spread but face risk the next trade is informed (adverse selection) and must carry inventory through volatility. Wider spreads often reflect uncertainty or illiquidity.',
    },
    {
      question: 'What is adverse selection for a liquidity provider?',
      options: [
        'Choosing the wrong sector ETF',
        'Trading against counterparties who possess superior information',
        'Selecting illiquid stocks for long-term holds',
        'Regulatory adverse action by the SEC',
      ],
      correct: 1,
      explanation:
        'When informed traders pick off stale quotes, market makers lose. They widen spreads or pull liquidity — visible in fast markets around news and earnings.',
    },
    {
      question: 'Opening and closing auctions on exchanges exist primarily to:',
      options: [
        'Eliminate all volatility',
        'Consolidate orders at a single clearing price with maximum executable volume',
        'Prevent retail participation',
        'Set dividend payment dates',
      ],
      correct: 1,
      explanation:
        "Auctions match accumulated orders at an equilibrium price, often producing the day's largest prints. Index rebalances and ETF creations heavily use the close.",
    },
    {
      question: 'Tick size rules (e.g., $0.01 for most U.S. equities) affect microstructure by:',
      options: [
        'Making all stocks equally liquid',
        'Influencing spread width, queue priority, and sub-penny internalization dynamics',
        'Eliminating high-frequency trading entirely',
        'Setting official fair value each minute',
      ],
      correct: 1,
      explanation:
        'Minimum tick increments constrain how tight spreads can be and shape HFT queue competition. Sub-penny pricing is restricted on lit venues but appears in price improvement.',
    },
    {
      question: 'Quote stuffing refers to:',
      options: [
        'Publishing misleading fundamental data',
        'Rapidly placing and canceling orders to flood the book, potentially disrupting other participants',
        'Filling market orders at the NBBO',
        'Mandatory disclosure of large positions',
      ],
      correct: 1,
      explanation:
        'Quote stuffing is a controversial HFT tactic flooding venues with fleeting orders. It raises debate over market fairness, capacity, and regulatory surveillance thresholds.',
    },
  ],

  'stocks-expert-5': [
    {
      question:
        'When the U.S. dollar strengthens, emerging market equities often face pressure because:',
      options: [
        'EM countries benefit from dollar debt becoming cheaper to service',
        'Many EM borrowers owe dollar-denominated debt, and capital flows may reverse',
        'EM currencies always appreciate with the dollar',
        'Commodity prices always rise with the dollar',
      ],
      correct: 1,
      explanation:
        'A stronger dollar raises real burden on USD debt and can trigger outflows from EM assets. Dollar liquidity conditions are a key macro driver for global risk appetite.',
    },
    {
      question: 'The DXY dollar index is heavily weighted toward:',
      options: [
        'Chinese yuan and Indian rupee',
        'Euro and other major developed-market currencies in a trade-weighted basket',
        'Gold and silver only',
        'Emerging market currencies exclusively',
      ],
      correct: 1,
      explanation:
        'DXY is dominated by the euro (~57%). It is not a broad EM dollar measure — traders use other indices for wider currency baskets.',
    },
    {
      question: 'Carry trade in FX involves:',
      options: [
        'Borrowing low-yield currency to invest in higher-yield currency, profiting from rate differential',
        'Arbitraging stock prices across exchanges only',
        'Hedging all currency exposure to zero',
        'Trading only during central bank meetings',
      ],
      correct: 0,
      explanation:
        'Carry captures interest rate differential if the funding currency does not appreciate enough to wipe out yield. It works in stable risk-on regimes but unwinds violently in crises.',
    },
    {
      question:
        'How does unhedged foreign equity exposure affect a U.S. investor when the foreign currency weakens?',
      options: [
        'It boosts dollar returns automatically',
        'It reduces dollar-translated returns even if local stocks are flat',
        'It has no effect on returns',
        'It eliminates FX volatility entirely',
      ],
      correct: 1,
      explanation:
        'Return in dollars = local return + currency move. A 10% local gain with 10% currency loss nets to roughly flat in USD — currency is a first-order component of global equity P&L.',
    },
    {
      question:
        'What is the typical relationship between the yen and risk appetite (the "yen carry" dynamic)?',
      options: [
        'Yen strengthens during aggressive risk-on rallies',
        'Yen often strengthens in risk-off episodes as carry trades unwind and investors repatriate',
        'Yen is uncorrelated to global equities',
        'Yen only moves with Japanese GDP releases',
      ],
      correct: 1,
      explanation:
        'Low JPY rates fund global carry. When volatility spikes, positions unwind — investors buy yen to repay loans, pushing JPY up precisely when equities fall.',
    },
    {
      question: 'Sovereign credit spreads widening in a country most directly signals:',
      options: [
        'Improved fiscal health',
        'Rising perceived default or political risk, often pressuring local assets and currency',
        'Guaranteed equity rally',
        'Lower interest rates forever',
      ],
      correct: 1,
      explanation:
        'Wider spreads mean investors demand more yield to hold government debt — often preceding currency weakness, capital flight, and equity selloffs in fragile economies.',
    },
    {
      question: 'Why do multinationals hedge FX exposure?',
      options: [
        'To speculate on currency direction for profit centers',
        'To stabilize reported earnings and cash flows from translation and transaction effects',
        'Because hedging is legally mandatory for all public companies',
        'To eliminate all international revenue',
      ],
      correct: 1,
      explanation:
        'Hedging forward contracts locks in conversion rates for known foreign cash flows, reducing earnings volatility from currency swings unrelated to operating performance.',
    },
    {
      question: 'Capital flow surges into EM funds during global risk-on periods often cause:',
      options: [
        'Local currency weakness and rate spikes',
        'Local currency appreciation, asset rallies, and sometimes overheating vulnerabilities',
        'Immediate recession in developed markets',
        'Permanent decoupling from U.S. rates',
      ],
      correct: 1,
      explanation:
        'Inflows boost EM currencies and equities but can build imbalances. When Fed tightening or risk-off hits, the same flows reverse quickly — the EM boom-bust cycle.',
    },
    {
      question: 'Purchasing Power Parity (PPP) as a long-run FX concept suggests:',
      options: [
        'Exchange rates should instantaneously equalize every hour',
        'Currencies adjust over time so identical goods cost similar amounts across countries',
        'PPP predicts daily FX moves with no error',
        'Only applies to cryptocurrency',
      ],
      correct: 1,
      explanation:
        'PPP is a slow anchor — deviations can persist for years driven by rates, flows, and risk premia. It informs long-horizon fair value debates, not day trading.',
    },
    {
      question:
        'When trading U.S. equities, European session moves in DAX or STOXX often matter because:',
      options: [
        'U.S. markets never react to overseas action',
        'Overnight and early-session global risk sentiment sets the tone for U.S. open positioning and futures',
        'European indices use different accounting standards only',
        'They determine U.S. dividend policy',
      ],
      correct: 1,
      explanation:
        'ES and NQ futures track global risk throughout the night. Large Europe moves signal macro or geopolitical shocks that U.S. traders price in at the open.',
    },
  ],

  'stocks-expert-6': [
    {
      question: 'An investment thesis should primarily answer:',
      options: [
        'What the stock did last week',
        'Why the market is wrong and what catalyst will close the gap between price and intrinsic value',
        'Which analysts have the highest accuracy scores',
        'The exact daily trading range for the next month',
      ],
      correct: 1,
      explanation:
        'A thesis is a falsifiable view on mispricing plus a path to realization — earnings inflection, multiple re-rating, capital return, or structural change. Without a catalyst, value can stay trapped.',
    },
    {
      question: 'What is the "variant perception" in a thesis?',
      options: [
        'Owning the same view as consensus',
        'Your differentiated view versus the market on a key driver of value',
        "Copying a famous investor's 13F exactly",
        'Trading only on technical patterns',
      ],
      correct: 1,
      explanation:
        'Edge requires seeing something consensus misses — on growth, margins, competitive dynamics, or risk. If your view matches the Street, expected alpha is negligible minus costs.',
    },
    {
      question: 'A pre-mortem on a thesis asks:',
      options: [
        'What price target looks best in a bull case',
        'What would prove this thesis wrong and what early warning signs would appear',
        'Which broker has the lowest commission',
        'How to maximize leverage on day one',
      ],
      correct: 1,
      explanation:
        'Defining kill criteria upfront — specific metrics, events, or timelines — prevents sunk-cost holding when the original rationale breaks.',
    },
    {
      question: 'Why document assumptions explicitly in a thesis journal?',
      options: [
        'To increase confirmation bias',
        'To track which drivers were right or wrong and update beliefs with evidence',
        'Because SEC filing requirements mandate it for retail investors',
        'To avoid ever selling the position',
      ],
      correct: 1,
      explanation:
        'Written assumptions create accountability. When revenue growth, margin, or share loss diverges from assumptions, you can act before narrative drift rationalizes inaction.',
    },
    {
      question: 'Position sizing in thesis-driven investing should reflect:',
      options: [
        'Maximum leverage always',
        'Conviction, liquidity, correlation to the rest of the book, and downside if the thesis fails',
        'Equal weight regardless of edge or risk',
        "Only the stock's market cap rank",
      ],
      correct: 1,
      explanation:
        'High conviction with narrow risk and low correlation warrants larger size. Uncertain theses or binary outcomes deserve smaller bets regardless of upside story quality.',
    },
    {
      question: 'What makes a thesis "falsifiable"?',
      options: [
        'It predicts everything that could happen',
        'It specifies measurable conditions that would cause you to exit or reverse',
        'It relies on vague long-term optimism only',
        'It cannot be tested until retirement',
      ],
      correct: 1,
      explanation:
        'Unfalsifiable stories ("it\'s a 10-year compounder") avoid accountability. Good theses name quarterly metrics, competitive events, or valuation thresholds that trigger revision.',
    },
    {
      question: 'Bear case construction in thesis work should:',
      options: [
        'Be ignored to stay optimistic',
        'Quantify realistic downside scenarios including structural threats, not just temporary setbacks',
        'Assume the stock goes to zero always',
        'Rely only on short seller reports',
      ],
      correct: 1,
      explanation:
        'Stress-testing the bear case reveals asymmetric risk. If downside in a plausible scenario exceeds your risk budget, size down even if the bull case is attractive.',
    },
    {
      question: 'Why is " thesis drift" dangerous?',
      options: [
        'It means updating views with new data',
        'Original reasons for owning morph into new stories as old ones fail, delaying exits',
        'It improves discipline automatically',
        'It only happens in bond portfolios',
      ],
      correct: 1,
      explanation:
        'Investors often rotate narratives ("it\'s no longer a growth story, it\'s a value play") to avoid admitting error. Explicit kill criteria combat this behavioral trap.',
    },
    {
      question: 'A catalyst calendar in thesis tracking includes:',
      options: [
        'Only historical earnings dates from five years ago',
        'Upcoming events (earnings, product launches, regulatory decisions) that could confirm or refute the thesis',
        'Random social media trends',
        'Broker conference room locations',
      ],
      correct: 1,
      explanation:
        'Mapping catalysts focuses attention on decision points. Size and hedge adjustments often align with events that resolve key uncertainties in the thesis.',
    },
    {
      question: 'The best time to write an exit plan is:',
      options: [
        'After the stock has already fallen 40%',
        'At thesis entry — defining profit targets, stop conditions, and time limits before emotions run high',
        'Never — hold forever',
        'Only when tax season begins',
      ],
      correct: 1,
      explanation:
        'Entry-time exit rules remove improvisation under stress. Knowing in advance what data or price action ends the trade preserves capital for the next high-conviction idea.',
    },
  ],

  'crypto-intermediate-1': [
    {
      question:
        'In an Automated Market Maker (AMM) like Uniswap, how is the price of a token pair primarily determined?',
      options: [
        'By a central order book matching bids and asks',
        'By a constant product formula (x × y = k) based on pool reserves',
        'By the average price on centralized exchanges',
        'By a committee of liquidity providers voting daily',
      ],
      correct: 1,
      explanation:
        'AMMs use bonding curves — typically x × y = k — so price moves automatically as traders swap against the pool. No traditional order book is required.',
    },
    {
      question: 'What is "impermanent loss" for a liquidity provider?',
      options: [
        'The temporary loss from gas fees when depositing into a pool',
        'The difference in value versus simply holding the two tokens as the price ratio changes',
        'A penalty charged when withdrawing liquidity within 24 hours',
        'Loss from a smart contract bug that is later refunded',
      ],
      correct: 1,
      explanation:
        'When token prices diverge from the ratio at deposit, the LP position is worth less than holding the assets outright. It becomes "permanent" only when you withdraw at that ratio.',
    },
    {
      question: 'What does Total Value Locked (TVL) measure in DeFi?',
      options: [
        'The total market cap of all DeFi governance tokens',
        'The cumulative trading volume on a DEX over 24 hours',
        'The number of unique wallet addresses using a protocol',
        "The dollar value of assets deposited in a protocol's smart contracts",
      ],
      correct: 3,
      explanation:
        'TVL sums assets staked, lent, or pooled in a protocol. It is a size/usage metric, not profitability — high TVL does not guarantee safety or yield quality.',
    },
    {
      question:
        'In overcollateralized lending (Aave, Compound), why must borrowers post more collateral than they borrow?',
      options: [
        "To pay the protocol's marketing budget",
        'To absorb price volatility and protect lenders if collateral value falls',
        'Because blockchains cannot track partial repayments',
        'To comply with bank reserve requirements',
      ],
      correct: 1,
      explanation:
        'Crypto collateral is volatile. Overcollateralization plus liquidation thresholds ensures lenders can recover funds even if the collateral asset drops sharply.',
    },
    {
      question: 'What is a "flash loan" in DeFi?',
      options: [
        'A loan that charges zero interest forever',
        'A loan secured by a government flash bond',
        'An uncollateralized loan borrowed and repaid within the same transaction block',
        'A loan available only during network congestion',
      ],
      correct: 2,
      explanation:
        'Flash loans must be repaid before the transaction ends, or the entire transaction reverts. They enable arbitrage and refinancing but have been exploited in complex attacks.',
    },
    {
      question:
        'What is the main trade-off when providing liquidity to a volatile token pair on a DEX?',
      options: [
        'You earn trading fees but may suffer impermanent loss if prices diverge',
        'You lose all fees to the protocol treasury',
        'You cannot withdraw until the token lists on a CEX',
        'Your tokens are automatically converted to stablecoins',
      ],
      correct: 0,
      explanation:
        'LPs earn a share of swap fees but take exposure to impermanent loss when the relative prices of the paired assets move significantly.',
    },
    {
      question: 'What is "slippage" in a DeFi swap?',
      options: [
        'The delay between submitting and confirming a transaction',
        'The difference between expected and executed price due to trade size and pool depth',
        'The fee paid to validators for priority inclusion',
        'The spread between bid and ask on a CEX',
      ],
      correct: 1,
      explanation:
        'Large trades move the AMM curve, executing at worse average prices. Slippage tolerance settings let users define the maximum acceptable price deviation.',
    },
    {
      question: 'Why are smart contract audits important but not sufficient for DeFi safety?',
      options: [
        'Audits guarantee zero bugs for the lifetime of the protocol',
        'Audited code cannot be upgraded',
        'Audits replace the need for insurance',
        'Audits may miss logic errors, and upgradeable or composable code can introduce new risks post-audit',
      ],
      correct: 3,
      explanation:
        'Auditors review a snapshot of code. Upgrades, oracle failures, economic design flaws, and novel attack vectors can still cause losses after a clean audit.',
    },
    {
      question: 'What role does a "liquidity pool" play on a decentralized exchange?',
      options: [
        'It stores user passwords for the DEX website',
        'It matches orders off-chain before settlement',
        'It holds token reserves that traders swap against, enabling permissionless trading',
        'It only holds stablecoins for gas fee payments',
      ],
      correct: 2,
      explanation:
        'LPs deposit token pairs into pools; traders swap against those reserves. The pool enables continuous liquidity without a centralized market maker.',
    },
    {
      question: 'What is "yield farming" in DeFi?',
      options: [
        'Deploying capital across protocols to earn rewards — often trading fees plus governance token incentives',
        'Mining Bitcoin with agricultural GPUs',
        'Buying farmland tokenized as NFTs',
        'Staking ETH on the Beacon Chain only',
      ],
      correct: 0,
      explanation:
        'Yield farming actively seeks the best risk-adjusted returns by moving liquidity between pools and protocols, often layering base yield with token emissions.',
    },
  ],

  'crypto-intermediate-2': [
    {
      question: 'What does ERC-721 define on Ethereum?',
      options: [
        'A fungible token standard like USDC',
        'A non-fungible token (NFT) standard where each token has a unique ID',
        'A proof-of-stake consensus rule',
        'A layer-2 rollup specification',
      ],
      correct: 1,
      explanation:
        'ERC-721 is the dominant NFT standard. Each tokenId maps to unique metadata, enabling one-of-one art, collectibles, and unique game items.',
    },
    {
      question: 'What is typically stored on-chain for most NFT collections?',
      options: [
        'The full 4K video file',
        'Only the token ownership record and a URI pointer to metadata',
        "The artist's private key",
        "The buyer's credit card number",
      ],
      correct: 1,
      explanation:
        'On-chain storage is expensive. Most NFTs store a tokenId and tokenURI on-chain while metadata and media live on IPFS, Arweave, or centralized servers.',
    },
    {
      question: 'What is a "floor price" in an NFT collection?',
      options: [
        'The lowest listed asking price for an item in the collection on a marketplace',
        'The price set by the smart contract at mint',
        'The average sale price over all time',
        'The royalty percentage paid to creators',
      ],
      correct: 0,
      explanation:
        'Floor price is the cheapest currently listed NFT — a common liquidity and sentiment metric, though it can be manipulated with wash listings.',
    },
    {
      question: 'What is "metadata" in the context of an NFT?',
      options: [
        'The gas fee paid at mint',
        'The JSON attributes describing name, image, traits, and other properties of the token',
        'The private key of the minter',
        'The block number when the NFT was created',
      ],
      correct: 1,
      explanation:
        'Metadata (often JSON on IPFS) defines what the NFT represents — image URL, attributes, description — and is what marketplaces display to buyers.',
    },
    {
      question: 'What is a creator royalty in NFT marketplaces?',
      options: [
        'A tax paid to the IRS on every sale',
        'A fee paid to the original creator on secondary sales, enforced via smart contract or marketplace policy',
        "The platform's listing fee",
        'A discount for early minters',
      ],
      correct: 1,
      explanation:
        'Royalties (e.g., 5% to the creator on each resale) were a major NFT value proposition. Enforcement varies — some marketplaces made royalties optional after 2022.',
    },
    {
      question: 'What does "minting" an NFT mean?',
      options: [
        'Burning an existing token to reduce supply',
        'Creating a new token on-chain and assigning it to a wallet',
        'Transferring an NFT to a cold wallet',
        'Converting an NFT to a fungible token',
      ],
      correct: 1,
      explanation:
        'Minting executes the smart contract function that creates a new tokenId and assigns ownership — either at public sale or via allowlist.',
    },
    {
      question: 'What is IPFS commonly used for in NFT projects?',
      options: [
        'Executing smart contracts faster',
        'Decentralized content-addressed storage for metadata and media files',
        'Replacing Ethereum consensus',
        'Calculating royalty payments',
      ],
      correct: 1,
      explanation:
        'IPFS uses content hashes (CIDs) so files are retrieved by fingerprint, not location. If the pinning service goes offline, metadata can become inaccessible.',
    },
    {
      question: 'What is a "blue chip" NFT collection generally understood to mean?',
      options: [
        'Any collection with more than 10,000 items',
        'Collections with established brand, liquidity, and community — often higher floor prices and longer track records',
        'NFTs minted on Bitcoin only',
        'Tokens that pay dividends to holders',
      ],
      correct: 1,
      explanation:
        'Blue chip status implies sustained demand, strong community, and relative liquidity (e.g., CryptoPunks, BAYC). It is informal, not a technical classification.',
    },
    {
      question: 'What risk does "off-chain metadata" introduce for NFT holders?',
      options: [
        'The NFT automatically converts to ETH',
        'If the hosting link breaks or is changed, the NFT may display wrong or missing content despite on-chain ownership',
        'Gas fees increase permanently',
        'The token becomes fungible',
      ],
      correct: 1,
      explanation:
        'You may own the token on-chain while the image URL points to a dead server. Fully on-chain art avoids this but is costly and rare.',
    },
    {
      question: 'What is ERC-1155 designed to support?',
      options: [
        'Only single-edition art',
        'Multi-token standard supporting both fungible and non-fungible tokens in one contract — efficient for games and batch mints',
        'Proof-of-work mining pools',
        'Cross-chain bridges only',
      ],
      correct: 1,
      explanation:
        'ERC-1155 lets one contract issue many token types with batch transfers, reducing gas for gaming inventories and semi-fungible items.',
    },
  ],

  'crypto-intermediate-3': [
    {
      question: 'What is the primary role of a Layer 1 (L1) blockchain like Ethereum?',
      options: [
        'Providing base-layer consensus, security, and settlement for transactions and smart contracts',
        'Only processing payments off-chain',
        'Hosting websites for crypto exchanges',
        'Replacing all need for wallets',
      ],
      correct: 0,
      explanation:
        'L1 chains are the foundation — they finalize state, enforce rules, and anchor security. Everything else builds on or connects to this layer.',
    },
    {
      question: 'What problem do Layer 2 (L2) rollups primarily aim to solve?',
      options: [
        'Eliminating the need for private keys',
        'Replacing smart contracts with SQL databases',
        'Making all tokens fungible',
        'Increasing throughput and reducing transaction costs while inheriting L1 security',
      ],
      correct: 3,
      explanation:
        'Rollups batch many transactions off-chain or on a separate chain, then post compressed data or proofs to L1 for final security guarantees.',
    },
    {
      question: 'In an Optimistic Rollup, how is fraud detected?',
      options: [
        'By a centralized server checking every transaction',
        'By requiring KYC on all users',
        'Through a challenge period where anyone can submit fraud proofs disputing invalid state transitions',
        'By burning half the tokens each block',
      ],
      correct: 2,
      explanation:
        'Optimistic rollups assume transactions are valid unless challenged during a dispute window (often ~7 days). Validators who submit successful fraud proofs earn rewards.',
    },
    {
      question: 'What distinguishes a ZK (zero-knowledge) rollup from an Optimistic rollup?',
      options: [
        'ZK rollups do not use Ethereum at all',
        'ZK rollups only support Bitcoin',
        'ZK rollups require no sequencers',
        'ZK rollups submit cryptographic validity proofs to L1, enabling faster finality without a long challenge period',
      ],
      correct: 3,
      explanation:
        'ZK rollups prove batch validity mathematically on L1. Withdrawals can finalize once the proof is verified, avoiding multi-day optimistic challenge delays.',
    },
    {
      question: 'What is "data availability" in the context of L2 scaling?',
      options: [
        'Whether transaction data needed to reconstruct state is accessible on L1 for verification and withdrawals',
        'Whether Netflix streams on the blockchain',
        'The number of validators online',
        'The speed of Wi-Fi for node operators',
      ],
      correct: 0,
      explanation:
        'If L2 transaction data is not available on L1, users cannot verify balances or exit to L1 safely — a critical security requirement for rollups.',
    },
    {
      question:
        'Why might a user experience a long withdrawal delay from an Optimistic rollup to L1?',
      options: [
        'Ethereum blocks are full on weekends only',
        'L1 wallets are incompatible with L2 tokens',
        'The challenge period must elapse before L1 accepts the withdrawal as final',
        'Gas is always zero on L2',
      ],
      correct: 2,
      explanation:
        'Optimistic rollup withdrawals often wait 7+ days for the fraud-proof window. Liquidity bridges or third-party fast-withdrawal services trade time for a fee.',
    },
    {
      question: 'What is a "sequencer" on many L2 networks?',
      options: [
        'A hardware wallet manufacturer',
        'A type of NFT marketplace',
        'A mining pool on Bitcoin',
        'The entity that orders and batches transactions before submitting them to L1',
      ],
      correct: 3,
      explanation:
        'Sequencers provide fast UX by ordering txs off-chain. Centralized sequencers are a common decentralization trade-off in early L2 deployments.',
    },
    {
      question:
        'Which statement best describes the security relationship between Ethereum and an Ethereum rollup?',
      options: [
        "Rollups inherit Ethereum's security for settlement while executing transactions separately",
        'Rollups are completely independent and do not use Ethereum',
        'Ethereum depends on rollups for consensus',
        "Rollups replace Ethereum's native token",
      ],
      correct: 0,
      explanation:
        'Rollups post state roots or proofs to Ethereum. Users trust L1 to enforce correct rollup state transitions, not a separate weaker consensus.',
    },
    {
      question: 'What is a valid reason to use L2 instead of L1 for everyday DeFi activity?',
      options: [
        'L2 tokens are always worth more',
        'L2 eliminates all smart contract risk',
        'Materially lower gas fees and faster confirmations for swaps, mints, and transfers',
        'L2 wallets never need seed phrases',
      ],
      correct: 2,
      explanation:
        'L2s amortize L1 costs across many transactions. For frequent activity, fee savings dominate — though users must manage bridging and counterparty/sequencer risks.',
    },
    {
      question: 'What does "modular blockchain" architecture emphasize?',
      options: [
        'One chain doing everything on a single monolithic stack',
        'Removing all validators',
        'Separating execution, data availability, and consensus into specialized layers',
        'Using only proof-of-work forever',
      ],
      correct: 2,
      explanation:
        'Modular design splits concerns — e.g., Celestia for DA, rollups for execution, Ethereum for settlement — to scale each component independently.',
    },
  ],

  'crypto-intermediate-4': [
    {
      question: 'What is the defining feature of a fiat-collateralized stablecoin like USDC?',
      options: [
        'Each token is backed by reserves of fiat currency or equivalent assets held by an issuer',
        'It is algorithmically expanded without collateral',
        'It is mined through proof-of-work',
        'Its price floats freely with no peg target',
      ],
      correct: 0,
      explanation:
        "Fiat-backed stablecoins (USDC, USDT) aim for 1:1 redeemability with USD via custodied reserves. Trust centers on the issuer's audits and redemption process.",
    },
    {
      question: 'What is a crypto-collateralized stablecoin (e.g., DAI) primarily backed by?',
      options: [
        'Unbacked algorithmic formulas only',
        'Overcollateralized crypto assets locked in smart contracts',
        'Corporate stock certificates',
        "Physical gold bars in every user's wallet",
      ],
      correct: 1,
      explanation:
        'DAI is minted against excess crypto collateral in Maker vaults. Liquidation mechanisms maintain the peg if collateral values fall.',
    },
    {
      question: 'What caused the dramatic collapse of UST/LUNA in 2022?',
      options: [
        'A Bitcoin halving event',
        'A death spiral in an algorithmic stablecoin design that relied on arbitrage with a sister token',
        'Ethereum switching to proof-of-stake',
        'US government banning all stablecoins',
      ],
      correct: 1,
      explanation:
        'UST was an algorithmic stablecoin pegged via LUNA mint/burn mechanics. Loss of confidence broke the peg, hyperinflated LUNA, and wiped out tens of billions.',
    },
    {
      question: 'What is a stablecoin "depeg" event?',
      options: [
        'When the token lists on a new exchange',
        'When the market price deviates significantly from the intended peg (e.g., $1.00)',
        'When gas fees drop to zero',
        'When the issuer adds a new blockchain',
      ],
      correct: 1,
      explanation:
        'Depegs occur during bank runs, collateral crises, or oracle failures. USDC briefly depegged in March 2023 when SVB exposure raised redemption concerns.',
    },
    {
      question: 'Why do regulators scrutinize stablecoin issuers closely?',
      options: [
        'Stablecoins cannot be used in DeFi',
        'They function as payment instruments and store-of-value at scale, raising bank-run, money transmission, and systemic risk concerns',
        'Stablecoins replace all national currencies overnight',
        'They are exempt from securities law',
      ],
      correct: 1,
      explanation:
        'Large stablecoin supply resembles demand deposits. Without credible reserves and oversight, rapid redemptions can stress financial stability.',
    },
    {
      question:
        'What is the purpose of a "proof of reserves" attestation for a centralized stablecoin?',
      options: [
        'To prove the blockchain is decentralized',
        'To provide third-party verification that custodied assets match outstanding token supply',
        'To increase mining difficulty',
        'To set the interest rate on DeFi loans',
      ],
      correct: 1,
      explanation:
        'Attestations (e.g., from accounting firms) aim to show 1:1 backing. Critics note snapshots may not capture liabilities, quality of assets, or intra-period flows.',
    },
    {
      question: 'How does DAI maintain its soft peg to the US dollar?',
      options: [
        'A centralized company prints dollars',
        'Market mechanisms including collateral ratios, stability fees, and DAI savings rate adjust supply and demand',
        'Fixed exchange rate set by the SEC',
        'Automatic burn of all ETH daily',
      ],
      correct: 1,
      explanation:
        'Maker governance tunes rates and collateral types. Arbitrageurs also trade DAI on secondary markets when it drifts from $1.',
    },
    {
      question:
        "What is a key risk of holding stablecoins on a centralized issuer's platform versus self-custody?",
      options: [
        'Self-custody always pays higher interest',
        'Issuer freeze/blacklist capabilities and custodial failure can block access to funds',
        'Stablecoins vanish from self-custody wallets',
        'Gas fees are higher in self-custody',
      ],
      correct: 1,
      explanation:
        'Many fiat stablecoins include admin keys to freeze addresses. Custodial platforms add counterparty risk if the issuer or bank partner fails.',
    },
    {
      question: 'What does "yield on stablecoins" in DeFi typically represent?',
      options: [
        'Guaranteed FDIC insurance returns',
        'Compensation for lending liquidity, taking smart contract risk, and sometimes token incentives — not risk-free interest',
        'Mining rewards from Bitcoin',
        'Automatic US Treasury bill rates with no risk',
      ],
      correct: 1,
      explanation:
        'DeFi stablecoin yields come from borrower demand, LP fees, and emissions. Higher advertised APY usually means higher protocol or depeg risk.',
    },
    {
      question: 'Which stablecoin type generally carries the highest structural peg risk?',
      options: [
        'Fiat-collateralized with audited reserves',
        'Crypto-overcollateralized',
        'Uncollateralized or undercollateralized algorithmic designs',
        'Short-term US T-bill backed',
      ],
      correct: 2,
      explanation:
        'Pure algorithmic stablecoins without robust collateral have historically failed under stress. Collateralized models fail more slowly but still face custody and liquidity risks.',
    },
  ],

  'crypto-intermediate-5': [
    {
      question: 'What does "on-chain analysis" primarily study?',
      options: [
        'Celebrity social media posts only',
        'Public blockchain data — flows, balances, and entity behavior — to infer market activity',
        'Centralized exchange order books exclusively',
        'Private bank wire transfers',
      ],
      correct: 1,
      explanation:
        'On-chain analysts use transparent ledger data (with clustering/heuristics) to track whales, exchange flows, and network usage — data CEX order books alone cannot show.',
    },
    {
      question: 'What does a large inflow of BTC to exchange addresses often signal to analysts?',
      options: [
        'Immediate bullish accumulation',
        'Potential sell pressure as holders may deposit to trade or exit',
        'Network shutdown',
        'Guaranteed price increase within one hour',
      ],
      correct: 1,
      explanation:
        'Exchange inflows suggest coins moving to venues where they can be sold. Context matters — not every inflow leads to selling, but it is a watched bearish indicator.',
    },
    {
      question: 'What is "whale watching" in crypto markets?',
      options: [
        'Tracking large marine mammals via satellite',
        'Monitoring wallets holding significant balances and their transaction patterns',
        'Following small retail wallets only',
        'Analyzing GPU prices for mining',
      ],
      correct: 1,
      explanation:
        'Whales can move markets. Analysts label clusters (exchanges, funds, early miners) and alert on large transfers that may precede volatility.',
    },
    {
      question: 'What metric does "NVT ratio" (Network Value to Transactions) approximate?',
      options: [
        'GPU temperature during mining',
        'Whether network valuation is high relative to on-chain transaction volume — a crude "P/E" for blockchains',
        'The number of validators slashed',
        'NFT floor prices',
      ],
      correct: 1,
      explanation:
        'NVT = market cap / daily on-chain transfer volume. Elevated NVT may suggest valuation outpacing utility, though methodology varies by chain.',
    },
    {
      question: 'Why is address clustering necessary in on-chain analysis?',
      options: [
        'Blockchains display real names by default',
        'One entity often controls many addresses; clustering groups them for accurate flow analysis',
        'It reduces block size',
        'It is required to mine Bitcoin',
      ],
      correct: 1,
      explanation:
        'Exchanges and funds split funds across thousands of addresses. Heuristics (co-spending, peel chains) map addresses to entities for meaningful metrics.',
    },
    {
      question: 'What does "realized cap" measure differently from market cap?',
      options: [
        'It counts only stablecoins',
        'It values each coin at the price when it last moved on-chain, weighting long-term holder cost basis',
        'It excludes Bitcoin entirely',
        'It is identical to fully diluted valuation',
      ],
      correct: 1,
      explanation:
        'Realized cap sums UTXO value at last-move price. It reflects aggregate cost basis and is used in MVRV (market vs realized value) cycle indicators.',
    },
    {
      question: 'What is MVRV (Market Value to Realized Value) commonly used for?',
      options: [
        'Setting gas limits',
        'Identifying macro cycle extremes — high MVRV suggests holders are broadly in profit',
        'Calculating NFT royalties',
        'Determining mining pool fees',
      ],
      correct: 1,
      explanation:
        'MVRV above historical norms often coincided with late-cycle tops as paper profits invite profit-taking; low MVRV with opposite interpretation.',
    },
    {
      question: 'What limitation should analysts remember about on-chain data?',
      options: [
        'All chains are private',
        'Layer-2 activity, OTC deals, and wrapped assets may not fully appear on L1 metrics',
        'On-chain data is always manipulated by miners',
        'Wallets cannot send to exchanges',
      ],
      correct: 1,
      explanation:
        'Much trading happens off L1 or through custodial books. On-chain metrics are powerful but incomplete — combine with market structure and fundamentals.',
    },
    {
      question: 'What does an increasing "active addresses" count suggest?',
      options: [
        'Automatic price doubling',
        'Growing network usage and participation — a fundamental adoption signal',
        'All addresses belong to one person',
        'Mining difficulty is falling',
      ],
      correct: 1,
      explanation:
        'Sustained growth in daily active addresses indicates more users transacting. Spikes can be sybil/airdrop farming — quality filters matter.',
    },
    {
      question: 'What is a "coin days destroyed" (CDD) metric designed to capture?',
      options: [
        'Physical coin wear',
        'When long-held coins move — weighting transfers by how long they were dormant',
        'Daily mining revenue only',
        'Stablecoin mint volume',
      ],
      correct: 1,
      explanation:
        'CDD multiplies coin amount by days held before move. Large CDD often flags old coins waking up, sometimes associated with distribution by long-term holders.',
    },
  ],

  'crypto-intermediate-6': [
    {
      question: 'In crypto technical analysis, what does a "golden cross" indicate?',
      options: [
        'A 50-day moving average crossing above a 200-day moving average — a bullish signal to many traders',
        'Price crossing below all moving averages',
        'Volume dropping to zero',
        'A cross-chain bridge opening',
      ],
      correct: 0,
      explanation:
        'Golden cross = short-term MA above long-term MA. It is a lagging trend signal popular in BTC/ETH charts, not a guarantee of future gains.',
    },
    {
      question: 'What do Bollinger Bands show on a price chart?',
      options: [
        'Only the opening price each day',
        'Volatility bands around a moving average — widening bands suggest higher volatility',
        'Guaranteed support at the lower band',
        'Mining hash rate',
      ],
      correct: 1,
      explanation:
        'Bands are typically 2 standard deviations from a 20-period MA. Squeezes (narrow bands) often precede volatility expansions.',
    },
    {
      question: 'What does RSI (Relative Strength Index) above 70 traditionally suggest?',
      options: [
        'Oversold conditions',
        'Overbought conditions — momentum may be stretched to the upside',
        'Zero trading volume',
        'A confirmed trend reversal',
      ],
      correct: 1,
      explanation:
        'RSI ranges 0–100. Above 70 is overbought, below 30 oversold. In strong trends, RSI can stay extreme for extended periods — not a standalone sell signal.',
    },
    {
      question: 'Why is 24/7 crypto market structure different for TA than traditional equities?',
      options: [
        'Crypto markets close on holidays',
        'No session gaps — weekend and overnight moves are continuous, changing gap and liquidity patterns',
        'Crypto has no volume data',
        'Charts are unavailable for crypto',
      ],
      correct: 1,
      explanation:
        'Unlike stocks, crypto trades around the clock. Gap analysis is rare; instead traders watch global liquidity windows and funding rates on perps.',
    },
    {
      question: 'What is a "support level" on a chart?',
      options: [
        'A price zone where buying interest has historically prevented further decline',
        'The maximum leverage on futures',
        'The IRS tax bracket',
        'A layer-2 sequencer fee',
      ],
      correct: 0,
      explanation:
        'Support is where demand previously absorbed supply. Breakdown below support can trigger stops and accelerate selling — levels are probabilistic, not walls.',
    },
    {
      question: 'What does MACD histogram crossing zero often signal to momentum traders?',
      options: [
        'Network upgrade date',
        'Shifts in momentum direction as the MACD line crosses its signal line',
        'Stablecoin depeg',
        'Wallet seed compromise',
      ],
      correct: 1,
      explanation:
        'MACD tracks relationship between two EMAs. Histogram expansion shows strengthening momentum; zero-line crosses mark momentum shifts traders act on.',
    },
    {
      question: 'Why can volume analysis matter alongside price in crypto TA?',
      options: [
        'Volume is always fake on crypto',
        'Rising price on declining volume may indicate weak trend; breakouts on high volume suggest stronger conviction',
        'Volume only applies to stocks',
        'Exchanges report identical volume',
      ],
      correct: 1,
      explanation:
        'Volume confirms participation. Low-volume rallies are suspect; capitulation often shows climactic volume spikes. Note: reported CEX volume can be inflated.',
    },
    {
      question: 'What is a "bearish divergence" on RSI?',
      options: [
        'Price makes higher highs while RSI makes lower highs — momentum weakening despite rising price',
        'Price and RSI both rise together',
        'RSI stays at 50 forever',
        'Only occurs on monthly charts of gold',
      ],
      correct: 0,
      explanation:
        'Divergence warns trend exhaustion. Bullish divergence is the inverse (price lower lows, RSI higher lows). Confirmation from price action is still required.',
    },
    {
      question: 'What are "perpetual futures funding rates" useful for in crypto TA sentiment?',
      options: [
        'Calculating block rewards',
        'Positive funding means longs pay shorts — extreme positive rates can signal crowded long positioning',
        'Setting Uniswap fees',
        'Determining NFT rarity',
      ],
      correct: 1,
      explanation:
        'Funding aligns perp price with spot. Persistently high positive funding suggests leveraged bullish crowding vulnerable to long squeezes.',
    },
    {
      question: 'What is a key limitation of technical analysis in crypto?',
      options: [
        'Charts cannot display candlesticks',
        'Manipulation, low liquidity alts, and macro shocks can invalidate patterns — TA describes probability, not certainty',
        'TA is illegal for crypto',
        'All indicators use identical timeframes',
      ],
      correct: 1,
      explanation:
        'TA assumes historical patterns repeat. Thin markets, whale prints, and regulatory news can produce false signals. Risk management remains essential.',
    },
  ],

  'crypto-intermediate-7': [
    {
      question: 'What is "tokenomics"?',
      options: [
        'The study of physical coin minting',
        'The economic design of a token — supply, distribution, incentives, and utility',
        'A type of NFT royalty',
        'Ethereum gas fee calculation only',
      ],
      correct: 1,
      explanation:
        'Tokenomics covers how a token is created, allocated, released over time, and used — determining whether incentives align with long-term protocol health.',
    },
    {
      question: 'What does "fully diluted valuation" (FDV) represent?',
      options: [
        'Current market cap only',
        'Market cap if all tokens (including locked/unreleased) were circulating at the current price',
        'Total revenue of the protocol',
        'The amount raised in the seed round only',
      ],
      correct: 1,
      explanation:
        'FDV = price × max supply. Comparing FDV to current market cap reveals how much supply is still to hit the market via unlocks.',
    },
    {
      question: 'What is a "token unlock" or "vesting cliff"?',
      options: [
        'When a wallet password expires',
        'Scheduled release of previously locked tokens to team, investors, or ecosystem — often adding sell pressure',
        'When a blockchain hard forks',
        'A stablecoin redemption event',
      ],
      correct: 1,
      explanation:
        'Large unlocks increase float. Traders track vesting calendars because early stakeholders may sell when restrictions expire.',
    },
    {
      question: 'What is the purpose of a "burn" mechanism in token design?',
      options: [
        'To permanently remove tokens from circulation, potentially reducing supply',
        'To convert tokens to NFTs',
        'To pay validators in fiat',
        'To increase max supply automatically',
      ],
      correct: 0,
      explanation:
        'Burns send tokens to irrecoverable addresses. EIP-1559 burns ETH base fees; some projects burn a portion of fees to create deflationary pressure.',
    },
    {
      question: 'What does "utility token" typically mean?',
      options: [
        "A token that grants access to a protocol's services, governance, or fee discounts — not necessarily a claim on profits",
        'A token backed 1:1 by US Treasuries only',
        'A physical subway pass',
        'A mining hardware warranty',
      ],
      correct: 0,
      explanation:
        'Utility tokens drive ecosystem participation (staking, fees, governance). Regulatory treatment varies — "utility" labels do not automatically avoid securities analysis.',
    },
    {
      question: 'Why might high initial token allocation to insiders concern investors?',
      options: [
        'Insiders always hold forever',
        'Large insider stakes plus short vesting can create sustained sell pressure and misaligned incentives',
        'Insiders cannot sell legally',
        'It guarantees higher decentralization',
      ],
      correct: 1,
      explanation:
        'Fair launches vs heavy VC/team allocations affect decentralization narrative and unlock overhang. Transparent vesting schedules help assess dilution risk.',
    },
    {
      question: 'What is "staking" from a tokenomics perspective?',
      options: [
        'Locking tokens to earn rewards while reducing circulating supply and securing the network',
        'Depositing USD in a bank',
        'Shorting perpetual futures',
        'Minting NFTs',
      ],
      correct: 0,
      explanation:
        'Staking aligns holder incentives with network security (PoS) or protocol goals. Reward rates and inflation funding must be sustainable or dilute non-stakers.',
    },
    {
      question: 'What is "emission schedule" in a crypto project?',
      options: [
        'The calendar of conference talks',
        'The planned rate and timeline of new token issuance to miners, stakers, or ecosystem funds',
        'Gas limit per block',
        'NFT drop dates only',
      ],
      correct: 1,
      explanation:
        'Emissions control inflation. Bitcoin halves every ~4 years; many DeFi tokens front-load emissions to bootstrap liquidity then taper.',
    },
    {
      question: 'What does "circulating supply" exclude?',
      options: [
        'Tokens trading on exchanges',
        'Locked, unvested, or burned tokens not yet available in the open market',
        'All tokens ever created',
        'Tokens in self-custody wallets',
      ],
      correct: 1,
      explanation:
        'Circulating supply counts tokens liquid enough to trade. Locked team/investor tokens and treasury holdings are often excluded until unlocked.',
    },
    {
      question: 'What is a common pitfall of high inflationary token rewards for liquidity mining?',
      options: [
        'Too much decentralization',
        'Mercenary capital exits when rewards drop, causing TVL and price to collapse',
        'Automatic US regulation approval',
        'Permanent peg to USD',
      ],
      correct: 1,
      explanation:
        'Unsustainable emissions attract yield farmers who dump reward tokens. When APY falls, capital rotates out — the "farm and dump" cycle.',
    },
  ],

  'crypto-intermediate-8': [
    {
      question: 'How did the SEC v. Ripple case affect industry understanding of token sales?',
      options: [
        'It ruled all tokens are always securities',
        'It suggested context matters — institutional sales may be securities while programmatic exchange sales might differ',
        'It banned Ethereum in the US',
        'It eliminated all crypto taxes',
      ],
      correct: 1,
      explanation:
        'The 2023 ruling partially favored Ripple on retail exchange sales but found institutional sales violated securities law — reinforcing facts-and-circumstances analysis.',
    },
    {
      question: 'What is the Howey Test used to evaluate in the US?',
      options: [
        'Mining hardware efficiency',
        'Whether an arrangement qualifies as an "investment contract" and thus a security',
        'Blockchain transaction speed',
        'NFT image copyright',
      ],
      correct: 1,
      explanation:
        'Howey asks: investment of money, common enterprise, expectation of profits, efforts of others. ICOs and some token sales have been deemed securities under this framework.',
    },
    {
      question: 'What did EU MiCA regulation primarily aim to establish?',
      options: [
        'A ban on all stablecoins',
        'A harmonized licensing and disclosure framework for crypto assets and stablecoin issuers across EU member states',
        'Proof-of-work requirements for all chains',
        'Mandatory NFT ownership for citizens',
      ],
      correct: 1,
      explanation:
        'Markets in Crypto-Assets (MiCA) creates EU-wide rules for CASPs, token white papers, and stablecoin reserve requirements — phased in from 2024–2025.',
    },
    {
      question: 'What is a "money transmitter" license relevant to in the US?',
      options: [
        'GPU import permits',
        'Businesses that custody or transmit customer funds — including some crypto exchanges and payment processors — at the state level',
        'Patents on blockchain algorithms',
        'Mining pool registration',
      ],
      correct: 1,
      explanation:
        'FinCEN registers MSBs federally; states require MTLs. Exchanges handling customer crypto/fiat often need multi-state licensing plus AML/KYC programs.',
    },
    {
      question: 'What is travel rule compliance in crypto?',
      options: [
        'A tourism tax on Bitcoin',
        'Sharing originator and beneficiary information for transfers above thresholds — extending banking AML rules to VASPs',
        'A rule banning cross-border crypto',
        'Mandatory vacation for traders',
      ],
      correct: 1,
      explanation:
        'FATF Recommendation 16 requires VASPs to share customer data on transfers. Implementation varies globally and raises privacy debates.',
    },
    {
      question: 'Why have US spot Bitcoin ETFs been significant for the industry?',
      options: [
        'They eliminate Bitcoin volatility',
        'They offer regulated brokerage access to BTC exposure without direct self-custody — broadening institutional participation',
        'They replace the Bitcoin network',
        'They pay guaranteed 10% dividends',
      ],
      correct: 1,
      explanation:
        'SEC-approved spot BTC ETFs (2024) let investors buy via traditional accounts. They hold BTC as underlying asset; fees and tracking differ by issuer.',
    },
    {
      question: 'What is "regulatory arbitrage" in crypto?',
      options: [
        'Using tax-loss harvesting',
        'Structuring operations in permissive jurisdictions while serving users elsewhere to minimize compliance burden',
        'Arbitrage between DEX pools',
        'Mining only during off-peak electricity',
      ],
      correct: 1,
      explanation:
        'Firms choose HQ and licensing in crypto-friendly regions. Users may still face local laws; arbitrage does not eliminate home-country obligations.',
    },
    {
      question: 'How does OFAC sanctions compliance affect crypto businesses?',
      options: [
        'It only applies to banks',
        'US persons must block transactions with sanctioned addresses and entities — including on-chain wallet screening',
        'It requires proof-of-stake',
        'It bans all privacy coins globally',
      ],
      correct: 1,
      explanation:
        'Tornado Cash and other addresses have been sanctioned. Exchanges and protocols with US nexus implement chain analytics to freeze or reject flagged flows.',
    },
    {
      question: 'What is a key debate around DeFi and regulation?',
      options: [
        'Whether DeFi has no smart contracts',
        'Whether autonomous protocols with no traditional intermediary fit existing securities/custody frameworks',
        'Whether gas fees should be zero',
        'Whether NFTs are physical goods',
      ],
      correct: 1,
      explanation:
        'Regulators struggle to apply issuer/broker rules to permissionless code. "True DeFi" vs front-end controlled "DeFi" affects enforcement targets.',
    },
    {
      question: 'What trend followed the FTX collapse regarding regulation?',
      options: [
        'Elimination of all CEX rules',
        'Increased calls for proof-of-reserves, segregation of customer assets, and clearer custody standards',
        'Ban on self-custody wallets worldwide',
        'Mandatory algorithmic stablecoins',
      ],
      correct: 1,
      explanation:
        'FTX commingled customer funds. Post-2022 policy pushes emphasized auditable reserves, no rehypothecation of client assets, and licensing clarity for custodians.',
    },
  ],

  'crypto-advanced-1': [
    {
      question: 'What is a "basis trade" in crypto?',
      options: [
        'Trading based on Twitter sentiment only',
        'Exploiting the price difference between spot and futures (or perp) for the same asset',
        'Buying only NFT floor tokens',
        'Mining with free electricity',
      ],
      correct: 1,
      explanation:
        'Traders buy spot and sell rich futures (or vice versa) to capture convergence. Popular when annualized basis exceeds funding/borrow costs.',
    },
    {
      question: 'What does "delta-neutral" positioning aim to achieve?',
      options: [
        'Maximum exposure to price direction',
        'Near-zero net sensitivity to small price moves while earning yield or capturing relative value',
        'Only holding stablecoins',
        'Eliminating all taxes',
      ],
      correct: 1,
      explanation:
        'Delta-neutral stacks offset long and short exposure (e.g., long spot + short perp) to isolate funding, basis, or volatility edge from directional beta.',
    },
    {
      question: 'What is a common risk of high leverage on crypto perpetual futures?',
      options: [
        'Slower transaction confirmation',
        'Liquidation during volatile wicks — losing margin even if price later recovers',
        'Automatic FDIC insurance',
        'Lower funding rates',
      ],
      correct: 1,
      explanation:
        'Exchanges mark positions to market continuously. A brief spike against you can liquidate the position before a mean-reversion occurs.',
    },
    {
      question: 'What is "grid trading" in crypto?',
      options: [
        'A strategy placing layered buy and sell orders at intervals within a range to profit from oscillations',
        'Drawing trend lines only',
        'Staking on a proof-of-grid consensus',
        'Buying every new altcoin at launch',
      ],
      correct: 0,
      explanation:
        'Grid bots automate range trading — buying dips and selling rips. They underperform in strong trends that break the range.',
    },
    {
      question: 'Why do traders monitor cross-exchange BTC spreads?',
      options: [
        'To pick mining pools',
        'Arbitrage opportunities exist when the same asset trades at different prices on different venues',
        'Spreads are always zero',
        'Exchanges share one order book',
      ],
      correct: 1,
      explanation:
        'Kimchi premium, GBTC discounts, and regional gaps create arb. Execution risk, withdrawal delays, and capital limits constrain realizable profit.',
    },
    {
      question: 'What is "swing trading" vs "scalping" in crypto?',
      options: [
        'Identical strategies',
        'Swing holds positions days–weeks for larger moves; scalping targets small intraday moves with rapid entries/exits',
        'Both only use spot with no charts',
        'Scalping requires no liquidity',
      ],
      correct: 1,
      explanation:
        'Scalping needs tight spreads and low fees; swings tolerate wider stops. Crypto 24/7 liquidity suits both but alt slippage hurts scalpers.',
    },
    {
      question: 'What does "risk-reward ratio" of 1:3 mean in trade planning?',
      options: [
        'Risk $3 to make $1',
        'Risk $1 to target $3 profit — seeking asymmetric payoff if win rate supports it',
        'Win 3 trades then lose 1 automatically',
        'Use 3× leverage only',
      ],
      correct: 1,
      explanation:
        'Defined stop and target sizes structure expectancy. You can lose more often than you win and still profit with favorable R:R and discipline.',
    },
    {
      question: 'What is a "stop-loss hunt" or liquidity grab?',
      options: [
        'A regulatory audit',
        'Price briefly moves to trigger clustered stop orders before reversing — common in leveraged markets',
        'A guaranteed bullish signal',
        'When miners stop validating blocks',
      ],
      correct: 1,
      explanation:
        'Stop clusters below support or above resistance are liquidity pools. Whales or algorithms may push price to fill against those stops.',
    },
    {
      question: 'Why might a trader use low-timeframe order flow on crypto perps?',
      options: [
        'To avoid all fees',
        'To read aggressive buying/selling at key levels and infer short-term direction',
        'Because L1 gas is cheaper',
        'To calculate token unlocks',
      ],
      correct: 1,
      explanation:
        'Footprint charts, CVD, and liquidation heatmaps show where leveraged participants get forced out — useful for short-term execution timing.',
    },
    {
      question: 'What is the main purpose of a trading journal for crypto strategies?',
      options: [
        'Posting on social media',
        'Recording setups, emotions, and outcomes to identify edge and eliminate repeated mistakes',
        'Satisfying tax auditors only',
        'Replacing backtesting entirely',
      ],
      correct: 1,
      explanation:
        'Systematic review separates luck from skill. Journals track R:R adherence, overtrading, and which market regimes suit your strategy.',
    },
  ],

  'crypto-advanced-2': [
    {
      question: 'What is "liquidity mining" yield composed of?',
      options: [
        'Only block subsidies from Bitcoin',
        'Trading fees plus often additional governance token emissions',
        'FDIC interest on deposits',
        'Automatic ETH staking rewards only',
      ],
      correct: 1,
      explanation:
        'LPs earn swap fees (real yield) and frequently inflationary reward tokens (mercenary yield). Evaluating sustainability requires separating the two.',
    },
    {
      question: 'What is impermanent loss hedging attempting to do?',
      options: [
        'Eliminate all crypto taxes',
        'Offset LP exposure to price divergence using derivatives or correlated shorts',
        'Increase IL intentionally',
        'Remove all smart contract risk',
      ],
      correct: 1,
      explanation:
        'Advanced LPs short the volatile leg or use options to neutralize delta while collecting fees — complex and can fail if correlations break.',
    },
    {
      question: 'What is a "vault" or "auto-compounder" in DeFi yield strategies?',
      options: [
        'A physical bank safe',
        'A smart contract that automatically claims rewards and reinvests into the same or paired strategy',
        'A cold wallet brand',
        'An NFT storage locker',
      ],
      correct: 1,
      explanation:
        'Vaults (Yearn-style) batch compounding to save gas and optimize allocation — users deposit and receive share tokens representing vault NAV.',
    },
    {
      question: 'What is "recursive lending" (looping) for yield?',
      options: [
        "Borrowing against deposited collateral repeatedly to multiply exposure to the same asset's yield or points",
        'Sending tokens in circles to wash trade',
        'Only lending stablecoins once',
        'A Bitcoin mining technique',
      ],
      correct: 0,
      explanation:
        'Deposit ETH → borrow ETH → redeposit increases leveraged exposure to staking yield or airdrop points. Liquidation risk rises with each loop.',
    },
    {
      question: 'Why is "real yield" distinguished from "token emission yield"?',
      options: [
        'Real yield comes from protocol revenue (fees) paid in productive assets; emissions are inflationary token prints',
        'They are identical concepts',
        'Real yield is always above 100% APY',
        'Emissions never dilute holders',
      ],
      correct: 0,
      explanation:
        'Fee-based yield (ETH, USDC) is funded by user activity. Pure emission APY often dilutes via sell pressure when farmers exit.',
    },
    {
      question: 'What is a primary smart contract risk in complex yield aggregators?',
      options: [
        'Slower block times',
        'Composable protocol stacks multiply attack surface — one vulnerable dependency can drain nested positions',
        'Higher gas on Sundays',
        'Mandatory KYC on-chain',
      ],
      correct: 1,
      explanation:
        'Strategies routing through multiple protocols inherit cumulative bug, oracle, and governance risks. Audits cover specific versions, not all composability paths.',
    },
    {
      question: 'What does "delta-neutral farming" on stablecoin pairs aim to minimize?',
      options: [
        'Gas fees to zero',
        'Directional price exposure while capturing fees or incentives on pegged assets',
        'All impermanent loss on volatile pairs',
        'Regulatory scrutiny',
      ],
      correct: 1,
      explanation:
        'Stable-stable pools (USDC/DAI) have minimal IL but lower fees. Traders accept smart contract and depeg risk for modest steady yield.',
    },
    {
      question: 'What is "points farming" pre-token launch?',
      options: [
        'Earning loyalty points redeemable for potential future airdrops by using protocols before a token exists',
        'Collecting credit card rewards',
        'Mining proof-of-work points',
        'Buying NFT trait points only',
      ],
      correct: 0,
      explanation:
        'Projects track usage metrics and award points speculated to convert to tokens. Sybil attackers multiply wallets — teams add anti-sybil filters at claim.',
    },
    {
      question: 'Why can advertised APY above 50% be a red flag?',
      options: [
        'High APY always means low risk',
        'Extreme rates often rely on unsustainable emissions, reflexive token price, or hidden tail risks',
        'Regulators require 50% minimum',
        'It indicates FDIC backing',
      ],
      correct: 1,
      explanation:
        'Triple-digit APYs usually mean high dilution or depeg/leverage risk. Always trace yield source: fees, borrow demand, or inflation.',
    },
    {
      question: 'What is "auto-deleveraging" (ADL) risk for yield traders using perps to hedge?',
      options: [
        'Wallets auto-delete',
        'Exchange forcibly closes profitable counterparty positions during extreme moves to cover system losses',
        'Automatic tax withholding',
        'Stablecoin rebasing',
      ],
      correct: 1,
      explanation:
        'If insurance fund is insufficient during cascades, exchanges ADL winning hedges — breaking supposed delta-neutral books at the worst time.',
    },
  ],

  'crypto-advanced-3': [
    {
      question: 'What is a crypto perpetual swap ("perp")?',
      options: [
        'A futures contract with no expiry that uses funding payments to anchor price to spot',
        'A spot trade settled in 24 hours',
        'An NFT option',
        'A proof-of-stake validator bond',
      ],
      correct: 0,
      explanation:
        'Perps trade indefinitely. Funding rate transfers between longs and shorts periodically to keep perp price near index spot.',
    },
    {
      question: 'What does "open interest" measure in derivatives markets?',
      options: [
        'Total number of social media posts',
        'The total number of outstanding derivative contracts not yet closed',
        'Daily spot volume only',
        'Mining hash rate',
      ],
      correct: 1,
      explanation:
        'Rising OI with rising price suggests new money entering longs. OI drops on liquidations as positions close. Context distinguishes buildup vs unwind.',
    },
    {
      question: 'What is the difference between European and American style crypto options?',
      options: [
        'European options exercise only at expiry; American options can exercise any time before expiry',
        'European options only trade in Europe',
        'American options have no premium',
        'There is no difference on Deribit',
      ],
      correct: 0,
      explanation:
        'Most listed crypto options are European (Deribit). Early exercise rarely matters for non-dividend crypto, but American-style exists on some venues.',
    },
    {
      question: 'What is a "straddle" options strategy?',
      options: [
        'Buy only call options',
        'Buy a call and put at the same strike and expiry — profiting from large moves in either direction',
        'Sell all portfolio assets',
        'Stake ETH and BTC equally',
      ],
      correct: 1,
      explanation:
        'Long straddle pays if realized volatility exceeds implied. Expensive in high-IV environments; loses if price stays flat and time decay erodes premium.',
    },
    {
      question: 'What does "implied volatility" (IV) represent in options pricing?',
      options: [
        'Historical price range last year only',
        "Market's expectation of future volatility baked into option premiums",
        'Mining difficulty adjustment',
        'Stablecoin reserve ratio',
      ],
      correct: 1,
      explanation:
        'High IV inflates option prices before events (FOMC, ETF decisions). IV crush after the event hurts long option holders even if direction was correct.',
    },
    {
      question: 'What is "liquidation" in leveraged futures trading?',
      options: [
        'Paying income tax',
        'Forced closure of a position when margin falls below maintenance requirement',
        'Converting crypto to cash at an ATM',
        'Unstaking after 32 ETH',
      ],
      correct: 1,
      explanation:
        'Exchanges auto-close underwater positions to prevent negative balance. Partial or full margin is lost; cascades can accelerate price moves.',
    },
    {
      question: 'What is a "cash-and-carry" arbitrage with Bitcoin futures?',
      options: [
        'Carrying physical bitcoin in a bag',
        'Buy spot BTC and sell equivalent futures when futures trade at premium — locking spread at expiry',
        'Only using cash with no crypto',
        'Borrowing BTC to short spot',
      ],
      correct: 1,
      explanation:
        'Classic arb captures contango. Requires capital, fee efficiency, and managing roll if using dated futures instead of perps.',
    },
    {
      question: 'What risk does "counterparty default" pose on unregulated derivatives platforms?',
      options: [
        'None — all perps are on-chain with full collateral',
        'During stress, platform insolvency or auto-deleveraging can leave profitable traders unpaid',
        'Only affects spot holders',
        'It increases block size',
      ],
      correct: 1,
      explanation:
        'CEX perps rely on exchange solvency and insurance funds. On-chain perps reduce some risks but introduce smart contract and oracle issues.',
    },
    {
      question: 'What is "max pain" theory in options markets?',
      options: [
        'The worst personal trading loss',
        'The strike price where most options expire worthless, minimizing payout by option writers — a heuristic, not a law',
        'Maximum mining pain when difficulty rises',
        'The highest gas fee ever paid',
      ],
      correct: 1,
      explanation:
        'Traders watch max pain into expiry as a magnetic price narrative. Market makers hedging can influence pinning, but it is not reliably predictive.',
    },
    {
      question: 'Why might traders use put options on BTC holdings?',
      options: [
        'To increase exposure to unlimited upside only',
        'As portfolio insurance — limiting downside below the strike for the cost of premium',
        'To avoid all taxes automatically',
        'To mine more blocks',
      ],
      correct: 1,
      explanation:
        'Protective puts cap losses on spot BTC during drawdowns. Cost is premium paid; timing IV and expiry matches hedging horizon.',
    },
  ],

  'crypto-advanced-4': [
    {
      question: 'What is MEV (Maximal Extractable Value)?',
      options: [
        'Maximum Ethereum volume per day',
        'Profit validators or searchers extract by ordering, inserting, or censoring transactions within blocks',
        'Mining energy valuation',
        'Minimum exchange volume',
      ],
      correct: 1,
      explanation:
        'MEV includes arbitrage, liquidations, and sandwich attacks. Searchers compete via priority gas fees or builder payments to capture value.',
    },
    {
      question: 'What is a "sandwich attack" on a DEX trade?',
      options: [
        'Eating lunch while trading',
        "A searcher frontruns a victim buy (pushing price up) then backruns with a sell after the victim's trade",
        'A legal M&A strategy',
        'Layer-2 batch compression',
      ],
      correct: 1,
      explanation:
        'Attackers observe mempool txs, buy before large swap, let victim buy at worse price, then sell into inflated price — extracting value from slippage.',
    },
    {
      question: 'What is "frontrunning" in crypto context?',
      options: [
        'Running a validator node faster',
        'Executing your transaction ahead of a known pending trade to profit from the price impact',
        'Posting charts before others',
        'Mining empty blocks',
      ],
      correct: 1,
      explanation:
        'On transparent mempools, bots race to front-run profitable txs. Private mempools and Flashbots mitigate but do not eliminate ordering games.',
    },
    {
      question: 'What problem does Flashbots Protect aim to address?',
      options: [
        'Higher gas for everyone',
        'Private transaction submission to reduce sandwich risk by hiding txs from public mempool',
        'Banning all DeFi',
        'Replacing Ethereum consensus',
      ],
      correct: 1,
      explanation:
        'Users send txs directly to block builders, skipping public mempool observation. Reduces sandwich exposure; trust shifts to builder honesty.',
    },
    {
      question: 'What is "proposer-builder separation" (PBS) in Ethereum post-Merge?',
      options: [
        'Splitting ETH into two tokens',
        'Validators (proposers) select blocks built by specialized builders who optimize for MEV revenue',
        'Separating L1 and L2 forever',
        'Banning smart contracts',
      ],
      correct: 1,
      explanation:
        'PBS via MEV-Boost lets validators auction block space to builders, professionalizing MEV extraction and sharing rewards with stakers.',
    },
    {
      question: 'Why can MEV affect ordinary DeFi users?',
      options: [
        "It only affects miners' electric bills",
        'Poor transaction ordering increases slippage, failed txs, and worse execution on swaps and liquidations',
        'It lowers all gas fees to zero',
        'It prevents wallet usage',
      ],
      correct: 1,
      explanation:
        'Sandwiches and aggressive arb worsen retail execution. Slippage settings, private relays, and L2 sequencing policies partially mitigate harm.',
    },
    {
      question: 'What is a "backrun" in MEV terminology?',
      options: [
        'Running a node on backup power',
        'A transaction placed immediately after a target tx to capture arbitrage or state change it creates',
        'Reversing a blockchain permanently',
        'A failed transaction retry',
      ],
      correct: 1,
      explanation:
        'Liquidations and DEX arb often backrun oracle updates or large swaps — profitable ordering right after the triggering event.',
    },
    {
      question: 'What ethical debate surrounds MEV extraction?',
      options: [
        'Whether Bitcoin should use NFTs',
        'Whether value extraction from user order flow is theft vs efficient market arbitrage that aids price discovery',
        'Whether wallets need colors',
        'Whether stablecoins should peg to EUR only',
      ],
      correct: 1,
      explanation:
        'Pure arb aligns prices; sandwiches harm users. Protocol design (batch auctions, CoW Swap) tries to internalize or redistribute MEV fairly.',
    },
    {
      question: 'What is "time-bandit" attack related to MEV history?',
      options: [
        'Stealing watches',
        'Rewinding chain history to capture past MEV — more feasible under PoW reorg incentives than modern PoS finality',
        'Delayed KYC verification',
        'Clock skew on laptops',
      ],
      correct: 1,
      explanation:
        'Large MEV under PoW could incentivize short reorgs. Ethereum PoS finality and slashing make deep reorgs economically prohibitive.',
    },
    {
      question: 'How do L2 sequencers relate to MEV?',
      options: [
        'They have no ordering power',
        'Centralized sequencers can extract or sell ordering priority similarly to L1 builders — decentralizing sequencers is an active research area',
        'They eliminate all trading fees',
        'They only process NFTs',
      ],
      correct: 1,
      explanation:
        'Many L2s today have single sequencers that order txs. MEV on L2 may stay internal or be shared; fair ordering is part of L2 decentralization roadmaps.',
    },
  ],

  'crypto-advanced-5': [
    {
      question: 'What is the primary function of a cross-chain bridge?',
      options: [
        'Mining alternative coins',
        'Transferring asset representation or liquidity between different blockchains',
        'Replacing all layer-2 rollups',
        'Storing seed phrases securely',
      ],
      correct: 1,
      explanation:
        'Bridges lock assets on source chain and mint wrapped tokens on destination (or use liquidity networks) to enable multi-chain usability.',
    },
    {
      question: 'What is a "wrapped" token (e.g., WBTC)?',
      options: [
        'A token physically mailed in paper',
        'An ERC-20 representing BTC custodied or locked on another chain',
        'A stablecoin algorithm',
        'An NFT of Bitcoin',
      ],
      correct: 1,
      explanation:
        'WBTC is Bitcoin held by custodians with on-chain proof; users trade the Ethereum representation. Trust depends on custodian and merchant network.',
    },
    {
      question: 'Why have bridges been high-value hack targets?',
      options: [
        'Bridges hold large pooled locked assets and complex smart contracts — large attack surface',
        'Bridges are protected by military encryption',
        'Hackers only target Bitcoin base layer',
        'Bridges cannot hold more than $1,000',
      ],
      correct: 0,
      explanation:
        'Ronin, Wormhole, and others lost hundreds of millions. Bridges concentrate TVL and often use multisigs or complex verification — frequent weak links.',
    },
    {
      question: 'What is an "optimistic bridge" or fraud-proof bridge model?',
      options: [
        'A bridge that assumes transfers valid unless challenged within a dispute window',
        'A bridge with no validators ever',
        'A bridge using only email confirmations',
        'A Bitcoin Lightning channel',
      ],
      correct: 0,
      explanation:
        'Similar to optimistic rollups, watchers can submit fraud proofs if invalid mints occur. Security depends on honest watcher participation and liveness.',
    },
    {
      question: 'What is "liquidity network" bridging (e.g., Stargate-style)?',
      options: [
        'Swapping via shared liquidity pools and messaging protocols rather than minting wrapped tokens for every route',
        'Only using centralized banks',
        'Physical armored trucks',
        'Printing paper vouchers',
      ],
      correct: 0,
      explanation:
        'Unified liquidity pools on multiple chains absorb inbound and outbound flows. Faster UX but pool imbalance and smart contract risk remain.',
    },
    {
      question: 'What is "bridge risk" for a DeFi portfolio?',
      options: [
        'Only aesthetic UI differences',
        'Smart contract exploits, custodian failure, or message forgery can permanently lock or steal bridged funds',
        'Slower Wi-Fi on mobile',
        'Higher NFT royalties',
      ],
      correct: 1,
      explanation:
        'Bridged assets are not native on destination chain. If bridge fails, wrapped tokens may become worthless regardless of underlying asset safety.',
    },
    {
      question: 'What does IBC (Inter-Blockchain Communication) enable in Cosmos?',
      options: [
        'Internet browsing on chain',
        'Standardized packet relay between sovereign Cosmos SDK chains without centralized custodians',
        'Proof-of-work on Ethereum',
        'US tax filing',
      ],
      correct: 1,
      explanation:
        'IBC is a protocol for light-client verified cross-chain messaging. Chains retain sovereignty while passing tokens and data trust-minimized.',
    },
    {
      question: 'Why might native multichain assets differ from bridged versions?',
      options: [
        'They always have identical liquidity and redemption rights',
        'Bridged tokens may not be redeemable 1:1 instantly and can trade at discounts if bridge trust fails',
        'Bridged tokens are always worth more',
        'Native tokens cannot move',
      ],
      correct: 1,
      explanation:
        'During bridge outages, wrapped assets depeg from native. Arbitrageurs normally align prices — unless redemption is impossible.',
    },
    {
      question: 'What is a "canonical bridge" recommended by an L2 team?',
      options: [
        'Any random third-party website',
        'The official bridge contract audited and maintained by the rollup team for deposits/withdrawals to L1',
        'A paper check mailed to users',
        'A CEX withdrawal only',
      ],
      correct: 1,
      explanation:
        'Official bridges minimize counterfeit wrapped tokens. Third-party bridges may be faster but add trust assumptions beyond the rollup itself.',
    },
    {
      question: 'What trend reduces need for traditional bridges long-term?',
      options: [
        'Returning to single-chain only forever',
        'Native interoperability, shared sequencers, and intent-based solvers that abstract routing across chains',
        'Banning all tokens except BTC',
        'Eliminating smart contracts',
      ],
      correct: 1,
      explanation:
        'Intent systems and chain abstraction aim to move users/assets seamlessly. Bridges persist but may become backend plumbing rather than user-facing risk points.',
    },
  ],

  'crypto-advanced-6': [
    {
      question: 'What is a DAO (Decentralized Autonomous Organization)?',
      options: [
        'A government agency for mining permits',
        'An organization governed by token holders through on-chain or off-chain voting over treasury and protocol rules',
        'A type of hardware wallet',
        'A centralized crypto exchange',
      ],
      correct: 1,
      explanation:
        'DAOs coordinate capital and decisions via smart contracts and governance tokens. Legal status and liability vary by jurisdiction.',
    },
    {
      question: 'What is a governance token typically used for?',
      options: [
        'Paying electricity bills directly',
        'Voting on proposals — parameter changes, treasury spends, upgrades',
        'Mining proof-of-work',
        'Replacing gas on all chains',
      ],
      correct: 1,
      explanation:
        'One token often equals one vote (or quadratic variants). Large holders wield disproportionate influence — "plutocracy" criticism is common.',
    },
    {
      question: 'What is "vote delegation" in DAOs?',
      options: [
        'Assigning your voting power to another address to participate on your behalf',
        'Delegating mining hash to a pool',
        'Transferring NFTs automatically',
        'Paying taxes through a delegate',
      ],
      correct: 0,
      explanation:
        'Delegation lets inactive holders empower trusted representatives. Protocol politicians accumulate delegated weight similar to proxy advisory in stocks.',
    },
    {
      question: 'What is a common attack vector in DAO governance?',
      options: [
        'Too much transparency',
        'Flash loan borrowed tokens used to vote on a proposal in the same block then returned',
        'Using multisigs',
        'Publishing meeting minutes',
      ],
      correct: 1,
      explanation:
        'Flash governance attacks borrow huge vote weight momentarily. Mitigations include timelocks, snapshot voting off-chain, and vote-lock requirements.',
    },
    {
      question: 'What is a "timelock" on governance execution?',
      options: [
        'A clock on the website',
        'A mandatory delay between vote passage and on-chain execution — allowing exit or response if malicious',
        'A ban on night trading',
        'NFT auction duration',
      ],
      correct: 1,
      explanation:
        'Timelocks give the community time to react (move funds, fork) if a harmful proposal passes — critical security layer for DeFi DAOs.',
    },
    {
      question: 'What is "quorum" in DAO voting?',
      options: [
        'The minimum participation threshold required for a vote to be valid',
        "The CEO's veto power",
        'Total ETH supply',
        'Number of NFT traits',
      ],
      correct: 0,
      explanation:
        'Without quorum, tiny voter turnout could pass massive treasury moves. Quorum rules balance legitimacy against voter apathy.',
    },
    {
      question: 'What is "Snapshot" voting commonly used for?',
      options: [
        'Taking screenshots of charts',
        'Off-chain signature-based voting weighted by token balance at a block — avoiding gas for each vote',
        'On-chain mining votes',
        'Instagram marketing',
      ],
      correct: 1,
      explanation:
        'Snapshot reads balances at a historical block. It is not enforceable on-chain alone — execution requires separate multisig or timelock trust.',
    },
    {
      question: 'What challenge does "voter apathy" create for DAOs?',
      options: [
        'Too many proposals pass with overwhelming participation always',
        'Low turnout lets active minorities or insiders control outcomes',
        'Gas becomes free',
        'Tokens become non-transferable',
      ],
      correct: 1,
      explanation:
        'Many token holders never vote. Delegation and incentives (vote escrow, rewards) attempt to improve participation but apathy persists.',
    },
    {
      question: 'What is a "rage quit" or exit mechanism in some DAO designs (e.g., Moloch)?',
      options: [
        'Deleting Twitter accounts',
        'Members redeeming their share of treasury and leaving when they disagree with decisions',
        'Unlimited leverage trading',
        'Minting infinite tokens',
      ],
      correct: 1,
      explanation:
        'Exit rights let dissenters take proportional assets instead of being trapped — reduces governance deadlock at cost of treasury stability.',
    },
    {
      question: 'What legal wrapper (e.g., Wyoming DAO LLC) attempts to solve?',
      options: [
        'Eliminating all taxes globally',
        'Providing limited liability and recognized entity status for DAO participants in specific jurisdictions',
        'Banning on-chain voting',
        'Making tokens physical cash',
      ],
      correct: 1,
      explanation:
        'Pure on-chain DAOs exist in legal gray zones. LLC wrappers clarify member liability and ability to sign contracts with off-chain world.',
    },
  ],

  'crypto-advanced-7': [
    {
      question:
        'What is a sensible maximum allocation to a single altcoin for most risk-aware crypto portfolios?',
      options: [
        '100% in one micro-cap',
        'Often cited guidance suggests limiting single non-BTC/ETH positions to small percentages — e.g., 1–5% — due to idiosyncratic risk',
        'Exactly 50% always',
        'Zero BTC allowed',
      ],
      correct: 1,
      explanation:
        'Concentration amplifies blow-up risk. Many allocators use BTC/ETH core with satellite alt bets sized so total ruin is impossible from one token.',
    },
    {
      question: 'What is "rebalancing" in a crypto portfolio?',
      options: [
        'Changing passwords monthly',
        'Periodically adjusting holdings back to target weights as prices drift',
        'Only buying all-time highs',
        'Converting everything to NFTs',
      ],
      correct: 1,
      explanation:
        'Rebalancing sells winners and buys laggards mechanically — enforcing discipline. Crypto volatility makes drift large quickly without periodic resets.',
    },
    {
      question:
        'Why do many advisors suggest distinguishing "investment stack" vs "trading stack"?',
      options: [
        'They must use the same wallet',
        'Long-term holdings use cold storage; active trading capital stays on exchanges/hot wallets — limiting catastrophic loss',
        'Trading stack must be 100% of net worth',
        'Investment stack requires daily leverage',
      ],
      correct: 1,
      explanation:
        'Segregation contains exchange hack, overleverage, and opsec failures. Core BTC/ETH should not sit on the same keys as degen perp margin.',
    },
    {
      question: 'What is "correlation" risk when holding many altcoins?',
      options: [
        'Alts always move independently',
        'During market stress, alt-BTC correlations often rise toward 1 — diversification benefits shrink when needed most',
        'Correlation is irrelevant to crypto',
        'Only stablecoins correlate',
      ],
      correct: 1,
      explanation:
        'Alt seasons show diversity; crash phases see everything sell off together. Beta to BTC/ETH dominates portfolio drawdown planning.',
    },
    {
      question: 'What does "risk parity" approach emphasize in portfolio construction?',
      options: [
        'Equal dollar amounts only',
        'Balancing risk contribution across assets rather than equal capital weights',
        '100% stablecoins',
        'Ignoring volatility',
      ],
      correct: 1,
      explanation:
        'Volatile alts contribute disproportionate risk at equal weights. Risk parity sizes positions inversely to volatility for more even shock absorption.',
    },
    {
      question: 'Why is "dollar-cost averaging" (DCA) popular for BTC accumulation?',
      options: [
        'It guarantees the lowest possible price',
        'It reduces timing risk by spreading purchases over time — smoothing entry across volatility',
        'It eliminates all losses',
        'It requires leverage',
      ],
      correct: 1,
      explanation:
        'Lump sum statistically wins in rising markets, but DCA lowers regret and behavioral errors for investors without edge on timing.',
    },
    {
      question: 'What is "staking yield" role in portfolio income planning?',
      options: [
        'Replace all diversification',
        'Can provide native yield on PoS assets but adds slashing, lockup, and tax complexity',
        'Eliminates market risk entirely',
        'Only available on Bitcoin L1',
      ],
      correct: 1,
      explanation:
        'ETH staking ~3–4% historically — real but not risk-free. Liquid staking tokens add smart contract layer; rewards are often taxable events.',
    },
    {
      question: 'What is a "barbell strategy" applied to crypto?',
      options: [
        'Only holding mid-cap alts',
        'Heavy allocation to conservative core (BTC/ETH/stables) plus small speculative bets — avoiding the mushy middle',
        'Equal weight 500 tokens',
        'All funds in leverage',
      ],
      correct: 1,
      explanation:
        'Taleb-style barbell survives drawdowns on the safe side while optional moonshots on the other — avoids moderate-risk alts that fail asymmetrically.',
    },
    {
      question: 'Why track portfolio in fiat AND in BTC terms?',
      options: [
        'Fiat is meaningless for crypto',
        'BTC denomination shows whether you are growing wealth vs simply riding BTC beta — especially for alt-heavy books',
        'BTC terms are illegal',
        'Exchanges require both',
      ],
      correct: 1,
      explanation:
        'Alts can rise in USD while underperforming BTC. Measuring vs BTC reveals whether active choices added alpha or just leveraged beta.',
    },
    {
      question: 'What is "sequence of returns" risk for retirees holding crypto?',
      options: [
        'Random block ordering',
        'Selling assets during early retirement bear markets permanently impairs portfolio sustainability',
        'The order of seed words',
        'Mining reward halving schedule only',
      ],
      correct: 1,
      explanation:
        'Large early drawdowns plus withdrawals deplete principal faster. High crypto volatility makes withdrawal rate planning especially sensitive.',
    },
  ],

  'crypto-advanced-8': [
    {
      question: 'How does the IRS generally classify cryptocurrency for US federal tax purposes?',
      options: [
        'Foreign currency with no capital gains',
        'Property — capital gains/losses apply on disposition',
        'Tax-exempt like municipal bonds',
        'Ordinary income only, never capital gains',
      ],
      correct: 1,
      explanation:
        'IRS Notice 2014-21 treats crypto as property. Selling, swapping, or spending crypto triggers gain/loss calculation on cost basis vs proceeds.',
    },
    {
      question: 'What triggers a taxable event when using crypto?',
      options: [
        'Only converting to USD',
        'Selling for fiat, trading crypto-for-crypto, spending on goods, and often receiving crypto as income',
        'Moving coins between your own wallets only',
        'Viewing price charts',
      ],
      correct: 1,
      explanation:
        'Crypto-to-crypto swaps are taxable dispositions in the US. Self-transfers between your wallets are generally not taxable events.',
    },
    {
      question: 'What is cost basis in crypto accounting?',
      options: [
        'The current market price',
        'The original value (plus fees) used to calculate gain or loss when disposing of an asset',
        'The highest price ever paid',
        'Mining difficulty at purchase',
      ],
      correct: 1,
      explanation:
        'FIFO, specific ID, or HIFO methods determine which lots you sell. Accurate lot tracking is essential for defensible tax reporting.',
    },
    {
      question: 'How are crypto mining rewards typically taxed in the US?',
      options: [
        'Tax-free forever',
        'Ordinary income at fair market value when received; later disposition triggers capital gain/loss on price change',
        'Only capital gains at 0%',
        'Deductible as charity',
      ],
      correct: 1,
      explanation:
        'Mining income is recognized when rewarded. Selling mined coins later adds another layer — short/long-term gain on appreciation after receipt.',
    },
    {
      question: 'What is Form 8949 used for in US crypto tax filing?',
      options: [
        'Mining pool registration',
        'Reporting capital gains and losses from property dispositions including each crypto trade',
        'Applying for an ETF',
        'NFT copyright registration',
      ],
      correct: 1,
      explanation:
        'Each taxable disposal flows to Form 8949 then Schedule D. Exchanges issue 1099 variants but self-custody trades require manual tracking.',
    },
    {
      question: 'What is the wash sale rule status for crypto as of common 2024–2025 guidance?',
      options: [
        'Identical to stocks — always applies',
        'Crypto was not subject to wash sale rules for securities because classified as property — though legislation may change this',
        'Wash sales never exist in any asset',
        'It only applies to NFTs',
      ],
      correct: 1,
      explanation:
        'Unlike stocks, crypto tax-loss harvesting could historically repurchase immediately without wash disallowance. Proposed laws may align treatment with securities.',
    },
    {
      question: 'How should staking rewards be handled for US taxes?',
      options: [
        'Ignore until sold years later with no income event',
        'Generally report ordinary income when received at FMV; staking adds to basis of the rewarded asset',
        'Always 0% rate',
        'Deductible as business expense automatically',
      ],
      correct: 1,
      explanation:
        'IRS and court cases (Jarrett etc.) debate timing, but conservative approach taxes rewards as income upon receipt. Subsequent sale calculates gain from that basis.',
    },
    {
      question: 'What recordkeeping best practice supports crypto tax compliance?',
      options: [
        'Rely on memory of trades from 2017',
        'Export trade history from all CEX/DEX wallets; use cost basis software; track dates, amounts, FMV, and fees',
        'Only save screenshots of memes',
        'Delete records after 30 days',
      ],
      correct: 1,
      explanation:
        'Incomplete records force conservative estimates or IRS penalties. On-chain tools aggregate DeFi txs but manual review catches wraps and bridges.',
    },
    {
      question: 'What is a "like-kind exchange" under Section 1031 for crypto?',
      options: [
        'Currently valid for all BTC-to-ETH swaps in the US',
        'Generally NOT available for crypto swaps after TCJA limited 1031 to real property — crypto-for-crypto is usually taxable',
        'Required for all NFT sales',
        'A DeFi flash loan technique',
      ],
      correct: 1,
      explanation:
        'Pre-2018 debate existed; current law treats personal property crypto swaps as taxable. Do not assume 1031 deferral without qualified legal advice.',
    },
    {
      question: 'What international consideration affects crypto tax for US persons?',
      options: [
        'Foreign accounts never matter',
        'FBAR/FATCA may apply to foreign exchange accounts exceeding thresholds; offshore holdings require disclosure',
        'Only EU citizens pay US tax',
        'Self-custody exempts all reporting',
      ],
      correct: 1,
      explanation:
        'US persons report worldwide income. Foreign CEX accounts may trigger FBAR (>$10k aggregate) and Form 8938 FATCA thresholds — separate from income tax.',
    },
  ],

  'crypto-expert-1': [
    {
      question: 'What is a "reentrancy" vulnerability in smart contracts?',
      options: [
        'A function calls an external contract that callbacks into the original function before state updates complete, allowing repeated withdrawals',
        'When two contracts share the same bytecode hash',
        'When a contract runs out of gas mid-execution',
        'A bug that prevents any external calls from smart contracts',
      ],
      correct: 0,
      explanation:
        'The classic DAO hack exploited reentrancy: withdraw() sent ETH before zeroing balance, letting the attacker loop withdrawals. Checks-effects-interactions ordering and reentrancy guards mitigate this.',
    },
    {
      question: 'In a professional audit report, what does a "Critical" finding typically imply?',
      options: [
        'A cosmetic naming convention issue with no fund risk',
        'A gas optimization that saves 2% on deployment',
        'A documentation typo in NatSpec comments',
        'Exploitable vulnerability that can cause direct, substantial loss of user funds or permanent protocol failure',
      ],
      correct: 3,
      explanation:
        'Severity scales vary by firm, but Critical/High universally signals immediate remediation before mainnet deployment. Medium/Low may be accepted with documented mitigations or timelocks.',
    },
    {
      question: 'What is the "checks-effects-interactions" pattern?',
      options: [
        'Audit the code, deploy, then test on mainnet',
        'Check wallet balance, effect UI update, interact with social media',
        'Validate inputs and update internal state before making any external calls to other contracts',
        'Run formal verification, effect bytecode change, interact with multisig',
      ],
      correct: 2,
      explanation:
        'State changes must precede external calls so reentrant entry sees updated balances. Violating CEI — sending ETH before updating mappings — is the root cause of most reentrancy exploits.',
    },
    {
      question: 'What is "oracle manipulation" in DeFi auditing context?',
      options: [
        'Changing Ethereum consensus rules',
        'Replacing a hardware wallet firmware',
        'Temporarily distorting the price feed a protocol reads — via flash loans or thin pools — to trigger unfair liquidations or mints',
        "A hacker guessing a user's seed phrase",
      ],
      correct: 2,
      explanation:
        'Protocols trusting spot DEX prices or stale Chainlink updates have lost hundreds of millions. Auditors scrutinize oracle sources, TWAP windows, and circuit breakers for manipulation resistance.',
    },
    {
      question: 'What does SWC (Smart Contract Weakness Classification) provide?',
      options: [
        'A standardized taxonomy of common vulnerability classes — similar to CWE for traditional software',
        'A list of approved auditors licensed by the SEC',
        'A gas price oracle for Ethereum mainnet',
        'A token standard for security tokens only',
      ],
      correct: 0,
      explanation:
        'SWC entries (e.g., SWC-107 reentrancy, SWC-105 unprotected ether withdrawal) give auditors and developers shared vocabulary for classifying and tracking known bug patterns.',
    },
    {
      question: 'Why are "upgradeable proxy" patterns a recurring audit concern?',
      options: [
        'Proxies cannot hold ETH',
        'Proxies disable all external calls',
        'Upgrade admin keys can replace implementation logic, potentially rugging users even after a clean initial audit',
        'Upgradeable contracts are illegal in the EU',
      ],
      correct: 2,
      explanation:
        'Transparent/UUPS proxies decouple storage from logic. Compromised admin keys or malicious upgrades post-audit have caused major losses. Timelocks, multisigs, and immutable implementations reduce this trust vector.',
    },
    {
      question: 'What is "formal verification" in smart contract security?',
      options: [
        'A social media campaign verifying project legitimacy',
        'Manual code review by three auditors instead of one',
        'Running the test suite twice before deployment',
        'Mathematical proof that contract behavior satisfies specified properties for all possible inputs and states',
      ],
      correct: 3,
      explanation:
        'Tools like Certora and Coq prove invariants (e.g., "total supply equals sum of balances"). Formal verification catches logic bugs tests miss but is expensive and requires precise specifications.',
    },
    {
      question: 'What is an "access control" vulnerability?',
      options: [
        'When gas limits block legitimate users',
        'When a wallet loses its private key',
        'When RPC endpoints rate-limit requests',
        'When privileged functions lack proper role checks, allowing unauthorized callers to mint, pause, or drain funds',
      ],
      correct: 3,
      explanation:
        'Missing onlyOwner/onlyRole modifiers on admin functions is a top exploit category. Auditors map every external function to required authorization and test for privilege escalation paths.',
    },
    {
      question:
        'What does "invariant testing" (e.g., with Foundry) help auditors and developers discover?',
      options: [
        'Properties that must always hold — such as solvency or conservation of tokens — under randomized sequences of protocol actions',
        'Only whether the frontend matches the whitepaper branding',
        'The legal jurisdiction of token holders',
        'Historical price performance of governance tokens',
      ],
      correct: 0,
      explanation:
        'Fuzzing random deposit/withdraw/borrow sequences against invariants like "protocol always solvent" finds edge-case combinations unit tests never cover. It complements manual audit review.',
    },
    {
      question: 'Why might an audit report explicitly flag "centralization risks"?',
      options: [
        'The code uses too much open-source software',
        'The protocol has too many validators',
        'Users can self-custody their tokens',
        'Admin keys, pausability, upgrade rights, or oracle control concentrated in few hands create trust assumptions beyond smart contract logic',
      ],
      correct: 3,
      explanation:
        'Even bug-free code can be dangerous if a single EOA can pause withdrawals or upgrade to malicious logic. Mature audits document trust assumptions and recommend decentralization roadmaps.',
    },
  ],

  'crypto-expert-2': [
    {
      question: 'What distinguishes a "qualified custodian" in institutional crypto?',
      options: [
        'Any user with a hardware wallet',
        'A DeFi protocol with TVL above $1 billion',
        'An NFT marketplace with KYC on creators only',
        'A regulated entity meeting specific capital, insurance, and segregation standards for holding client digital assets',
      ],
      correct: 3,
      explanation:
        'Qualified custodians (Coinbase Custody, BitGo, Fidelity Digital, etc.) meet regulatory thresholds for asset segregation, insurance, and audit — required for many funds, ETFs, and RIAs holding crypto on behalf of clients.',
    },
    {
      question: 'How does an OTC desk typically serve large institutional crypto trades?',
      options: [
        'By posting all size on a public order book visible to retail',
        'By matching block trades off-exchange with negotiated pricing, minimizing market impact and information leakage',
        'By requiring trades execute only on Sundays',
        'By converting all crypto to NFTs first',
      ],
      correct: 1,
      explanation:
        'Moving 5,000 BTC on a public book would move the market. OTC desks source liquidity from miners, funds, and market makers, offering fixed quotes and settlement via wire or on-chain transfer.',
    },
    {
      question: 'What is "prime brokerage" in crypto institutional markets?',
      options: [
        'A retail app for buying memecoins',
        'Mining pool aggregation only',
        'A bundled service offering custody, lending, leverage, trade execution, and reporting to hedge funds and active managers',
        'A layer-2 sequencer operated by a bank',
      ],
      correct: 2,
      explanation:
        'Crypto prime brokers (Genesis historically, FalconX, Hidden Road) let funds borrow against collateral, access multiple venues, and net exposures — mirroring TradFi prime services adapted for 24/7 digital assets.',
    },
    {
      question: 'In a spot Bitcoin ETF, what is the role of authorized participants (APs)?',
      options: [
        'They mine new bitcoin for the fund',
        'They create and redeem ETF shares in exchange for bitcoin or cash baskets, keeping ETF price aligned with NAV',
        'They vote on Ethereum governance proposals',
        'They provide customer support for retail ticket holders',
      ],
      correct: 1,
      explanation:
        'APs arbitrage ETF premium/discount to NAV by creating/redeeming shares with the issuer. This mechanism is how regulated wrappers track spot BTC without retail holding keys directly.',
    },
    {
      question:
        'Why do institutional treasuries often segregate "cold," "warm," and "hot" wallet tiers?',
      options: [
        'To balance security (offline cold storage for bulk) against operational speed (hot wallets for daily settlements and rebalancing)',
        'For marketing tier names only',
        'Because regulators ban cold storage',
        'To avoid paying any custody fees',
      ],
      correct: 0,
      explanation:
        'Most assets sit in cold multisig; warm wallets fund operational needs with limits; hot wallets handle intraday flows. Policy limits and multi-person approval reduce single-point failure across tiers.',
    },
    {
      question:
        'What is a common reason institutions prefer CME Bitcoin futures over unregulated offshore perps for hedging?',
      options: [
        'CME futures have no margin requirements',
        'Offshore perps are always illiquid',
        'CME is a regulated US exchange with centralized clearing, standardized contracts, and established legal recourse',
        'Futures never require collateral',
      ],
      correct: 2,
      explanation:
        "Institutional compliance teams favor CME's CFTC oversight, predictable margin, and bankruptcy-remote clearing. Offshore venues may offer higher leverage but carry counterparty and jurisdictional risk.",
    },
    {
      question: 'What does "proof of reserves" mean for an institutional custodian serving funds?',
      options: [
        'Proof that the custodian mined all bitcoin in existence',
        'A marketing slide showing past performance',
        'Third-party attestation or cryptographic proof that assets held in custody match or exceed client liabilities',
        'Evidence that all employees hold crypto',
      ],
      correct: 2,
      explanation:
        'Post-FTX, institutions demand regular attestations (Merkle tree proofs, SOC reports) that client assets are segregated and fully backed — not commingled with proprietary trading balances.',
    },
    {
      question:
        'How do institutional allocators typically size crypto within a multi-asset portfolio?',
      options: [
        'Always 100% allocation regardless of mandate',
        'Zero allocation is the only approved approach',
        'Based on mandate, liquidity needs, and risk budget — often 1–5% for conservative allocators, higher for dedicated crypto funds',
        'Exactly equal weight to every altcoin',
      ],
      correct: 2,
      explanation:
        'Endowments and family offices often start with small strategic allocations, rebalance bands, and liquidity gates. Dedicated crypto funds operate under different mandates with higher concentration limits.',
    },
    {
      question:
        'What is "counterparty due diligence" before placing assets with a crypto lender or exchange?',
      options: [
        'Checking the website color scheme',
        'Reading Twitter replies only',
        'Reviewing financials, licensing, insurance, security audits, asset segregation policies, and stress history before transferring client funds',
        'Verifying the CEO owns an NFT',
      ],
      correct: 2,
      explanation:
        'Institutional DD covers legal entity structure, regulatory licenses, proof of reserves, penetration tests, and withdrawal testing. FTX failed DD on commingling and governance despite brand prestige.',
    },
    {
      question:
        'Why might a pension fund use a separately managed account (SMA) for crypto exposure instead of a mutual fund?',
      options: [
        "SMAs allow custom mandate, direct ownership reporting, and specific custody arrangements aligned with the fund's governance policies",
        'SMAs always guarantee higher returns',
        'Mutual funds cannot hold bitcoin',
        'SMAs eliminate all volatility',
      ],
      correct: 0,
      explanation:
        'Large allocators often require bespoke custody paths, ESG screens, and transparent lot-level reporting that pooled vehicles cannot offer. SMAs provide institutional control at higher minimums.',
    },
  ],

  'crypto-expert-3': [
    {
      question: 'What is the first step in building a rigorous crypto investment thesis?',
      options: [
        'Buying the token with the highest 24h volume',
        'Defining the problem the protocol solves, the target user, and how value accrues to the token or equity-like claim',
        'Copying the largest whale wallet on Etherscan',
        'Choosing a ticker symbol that sounds futuristic',
      ],
      correct: 1,
      explanation:
        'A thesis starts with fundamentals: who uses it, why they pay, and whether usage translates to token demand (fees, burns, staking, governance). Hype without value accrual is speculation, not research.',
    },
    {
      question: 'What does "value accrual" analysis ask about a protocol token?',
      options: [
        'Whether the logo uses gradients',
        'How many Discord members exist',
        'Whether increased protocol usage mechanically increases demand, reduces supply, or captures fees for token holders',
        'Whether the founder has a blue checkmark',
      ],
      correct: 2,
      explanation:
        'Many tokens lack cash-flow linkage — governance-only tokens, unlimited emissions, or fees paid in ETH not the native token weaken the investment case. Thesis must trace usage → revenue → token.',
    },
    {
      question: 'In a crypto thesis, what is a "bear case" meant to capture?',
      options: [
        'Only regulatory scenarios that help the token',
        'Historical price charts from 2017 only',
        'Social media sentiment on bull posts',
        'The strongest arguments for failure — competition, regulation, tech risk, tokenomics dilution — and what would invalidate the bull view',
      ],
      correct: 3,
      explanation:
        'Intellectual honesty requires pre-mortems: What kills this thesis? Bear cases force position sizing and exit triggers instead of narrative-only conviction.',
    },
    {
      question: 'What is "comparable analysis" (comps) in crypto sector research?',
      options: [
        "Benchmarking a project's metrics — TVL, fees, users, FDV/revenue — against similar protocols at analogous maturity stages",
        'Comparing wallet addresses byte-by-byte',
        'Matching token colors across portfolios',
        'Only comparing BTC and ETH',
      ],
      correct: 0,
      explanation:
        'Comps contextualize valuation: a new L2 at 100× annualized fees vs established peers signals over/underpricing. Adjust for stage, chain, and token unlock overhang.',
    },
    {
      question: 'What role do "catalysts" play in a crypto thesis timeline?',
      options: [
        'They replace all fundamental analysis',
        'Identifiable events — mainnet launches, upgrades, ETF flows, halvings — that may reprice the asset as the market updates expectations',
        'Catalysts only matter for stablecoins',
        'They guarantee price direction',
      ],
      correct: 1,
      explanation:
        'Thesis maps catalyst calendar: hard dates (unlock cliffs) and soft events (adoption milestones). Trading catalysts without underlying fundamentals is event gambling.',
    },
    {
      question: 'Why should a thesis distinguish "beta" from "alpha" in crypto?',
      options: [
        'They are identical in 24/7 markets',
        'Alpha only applies to stocks',
        'Beta is exposure to broad market moves (BTC/ETH); alpha is idiosyncratic outperformance from the specific protocol thesis proving correct',
        'Beta measures gas fees',
      ],
      correct: 2,
      explanation:
        'An alt rising in a bull market may reflect beta only. Measuring performance vs BTC/ETH isolates whether your sector or protocol pick added real edge.',
    },
    {
      question: 'What is a "moat" in crypto protocol analysis?',
      options: [
        'A physical vault for mining rigs',
        'The moat around a castle-themed NFT',
        'Minimum gas price on L2',
        'Durable competitive advantage — network effects, liquidity depth, integrations, brand, or switching costs — that protects market share',
      ],
      correct: 3,
      explanation:
        'Forkable code is not a moat. Liquidity stickiness, composability integrations, and user habit create defensibility. Thesis must explain why copycats fail to drain the protocol.',
    },
    {
      question:
        'How should token unlock schedules influence thesis conviction near a vesting cliff?',
      options: [
        'Large insider unlocks increase float and potential sell pressure — thesis should model supply shock and whether demand absorbs it',
        'Unlocks are irrelevant to price',
        'Unlocks always cause instant 10× pumps',
        'Only miners are affected by vesting',
      ],
      correct: 0,
      explanation:
        'Supply overhang is quantifiable. Expert theses track vesting calendars, estimate seller behavior (OTC vs open market), and adjust risk/reward before cliffs — not after.',
    },
    {
      question: 'What does "reflexivity" mean in crypto narrative-driven markets?',
      options: [
        'Prices never respond to beliefs',
        'Only applies to government bonds',
        'Rising prices attract attention and capital, reinforcing the narrative and fundamentals (TVL, security budget) in a feedback loop — and reversing viciously on the way down',
        'A technical indicator on RSI',
      ],
      correct: 2,
      explanation:
        'Soros-style reflexivity explains meme and DeFi cycles: belief moves price, price enables real activity, activity validates belief. Theses must note when reflexivity dominates vs fundamentals.',
    },
    {
      question:
        'What is the purpose of assigning "thesis kill criteria" before entering a position?',
      options: [
        'To never sell under any circumstances',
        'To maximize leverage automatically',
        'Predefined observable failures — lost TVL share, broken peg, missed milestone — that trigger reassessment or exit regardless of emotional attachment',
        'To satisfy tax reporting only',
      ],
      correct: 2,
      explanation:
        'Kill criteria prevent sunk-cost holding. Example: "Exit if L2 loses top-3 DEX volume share for two consecutive quarters." Discipline separates research from bag-holding.',
    },
  ],

  'crypto-expert-4': [
    {
      question: 'What is the primary economic role of a professional crypto market maker?',
      options: [
        'Mining blocks on proof-of-work chains',
        'Issuing stablecoins backed by fiat reserves',
        'Continuously quoting bid and ask prices to provide liquidity, earning the spread while managing inventory risk',
        'Auditing smart contracts for DeFi protocols',
      ],
      correct: 2,
      explanation:
        'Market makers supply two-sided quotes on CEX order books or RFQ systems. Profit comes from spread capture minus adverse selection when informed traders pick off stale quotes.',
    },
    {
      question: 'What is "inventory risk" for a crypto market maker?',
      options: [
        'Exposure to price moves on accumulated long or short inventory between quote updates and hedging',
        'Risk that warehouse storage fees rise',
        'Risk of running out of office supplies',
        'Risk that wallets require firmware updates',
      ],
      correct: 0,
      explanation:
        'If a MM buys aggressively on the bid and price dumps before hedging, inventory losses exceed spread earned. Skewing quotes and delta hedging on perps manage this risk.',
    },
    {
      question: 'What is "adverse selection" in market making terminology?',
      options: [
        'Choosing the wrong blockchain to deploy on',
        'Selecting auditors with low ratings',
        'Regulatory selection of jurisdictions',
        'Trading against counterparties who know more — toxic flow that hits your quotes just before price moves against you',
      ],
      correct: 3,
      explanation:
        'Informed order flow (news traders, arbers) picks off stale quotes. MMs widen spreads or pull liquidity before volatile events to reduce adverse selection losses.',
    },
    {
      question:
        'How do automated market makers (AMMs) differ from professional order-book market makers?',
      options: [
        'AMMs use bonding curves and passive LP capital; professional MMs actively manage quotes and inventory on central limit order books',
        'They are identical systems',
        'AMMs only exist on Bitcoin L1',
        'Professional MMs never hedge',
      ],
      correct: 0,
      explanation:
        'AMMs outsource liquidity to LPs and deterministic math. Professional MMs dynamically adjust spreads, size, and skew based on volatility, flow toxicity, and cross-venue arb.',
    },
    {
      question: 'What is "quote skew" in market making?',
      options: [
        'Displaying fake prices on a website',
        'Skewing chart timeframes',
        'Adjusting bid/ask prices asymmetrically to reduce unwanted inventory accumulation — e.g., lowering bid when long-heavy',
        'Randomizing quotes for fairness',
      ],
      correct: 2,
      explanation:
        'If inventory is too long BTC, the MM lowers bid and raises ask to attract sellers and deter buyers — rebalancing toward target neutrality without stopping quotes entirely.',
    },
    {
      question: 'Why do market makers monitor "funding rates" on perpetual futures?',
      options: [
        'Funding sets NFT royalties',
        'Funding rates determine block size',
        'They are unrelated to market making',
        'Extreme funding signals crowded positioning and helps hedge spot inventory via basis trades or adjust directional skew',
      ],
      correct: 3,
      explanation:
        'Rich positive funding may encourage MM to hold spot and short perps (collecting funding) while quoting on spot books — integrating derivatives into inventory management.',
    },
    {
      question: 'What is a "minimum spread" constraint for a crypto MM on an altcoin?',
      options: [
        'Regulators require exactly 0.01% spread always',
        'Spreads must be zero to attract volume',
        'Spread must cover fees, adverse selection, volatility risk, and opportunity cost — thin markets require wider spreads than BTC/ETH',
        'Only applies to stablecoin pairs',
      ],
      correct: 2,
      explanation:
        'On illiquid alts, a 5 bp spread may be unprofitable after exchange fees and toxic flow. MMs widen or reduce size rather than lose money providing tight fake liquidity.',
    },
    {
      question: 'What does "latency arbitrage" mean for market makers on centralized exchanges?',
      options: [
        'Arbitrage using slow mail delivery',
        'Faster participants update quotes on new information before slower MMs, extracting value from stale resting orders',
        'Arbitrage between time zones only',
        'Delayed settlement arbitrage on T+2 equities',
      ],
      correct: 1,
      explanation:
        'Colocation and fast feeds matter on CEXs. Slow quote updates get picked off when index spot moves on another venue. MMs invest heavily in infrastructure to minimize latency edge against them.',
    },
    {
      question: 'What is an "RFQ" (request for quote) workflow in institutional crypto trading?',
      options: [
        'A public limit order visible to all retail',
        'A regulatory filing form',
        'Client requests a firm quote for a specific size; market maker responds with a binding bid/offer for a short window — common for block trades',
        'A method to mint NFTs',
      ],
      correct: 2,
      explanation:
        'RFQ systems (Talos, Paradigm, dealer desks) let institutions trade size without showing intent on public books. MMs compete on spread for each RFQ.',
    },
    {
      question: 'Why might a market maker pull quotes entirely during extreme volatility?',
      options: [
        'Spread-based profits cannot compensate for gap risk and uncertain fair value — withdrawal prevents catastrophic inventory losses',
        'To manipulate elections',
        'Exchanges require quotes during crashes',
        'Pulling quotes increases mining rewards',
      ],
      correct: 0,
      explanation:
        'During flash crashes or exchange outages, fair price is unknown. MMs go wide or flat — liquidity vanishes when needed most, a known structural fragility in crypto market structure.',
    },
  ],

  'crypto-expert-5': [
    {
      question: 'What is the "restaking" narrative fundamentally proposing?',
      options: [
        'Restaking ETH only on Bitcoin',
        'Reusing staked ETH (or other assets) to secure additional actively validated services (AVSs) in exchange for extra yield — with added slashing risk',
        'Banning liquid staking tokens',
        'Converting all DeFi to proof-of-work',
      ],
      correct: 1,
      explanation:
        'EigenLayer-style restaking lets stakers opt into securing oracles, bridges, and middleware. Yield stacks but slashing conditions multiply — thesis must weigh incremental return vs tail risk.',
    },
    {
      question: 'In "Real World Assets" (RWA) crypto narrative, what is being tokenized?',
      options: [
        'Off-chain assets like Treasuries, private credit, real estate, or invoices represented as on-chain tokens with legal claim structures',
        'Only memecoin profile pictures',
        'Validator private keys',
        'Social media posts',
      ],
      correct: 0,
      explanation:
        'RWA projects bridge TradFi yield on-chain via SPVs, custodians, and compliance layers. Thesis hinges on legal enforceability, redemption rights, and demand for on-chain T-bill exposure.',
    },
    {
      question: 'What drives the "modular blockchain" narrative versus monolithic chains?',
      options: [
        'Desire for one chain to do everything on a single node',
        'Eliminating all rollups',
        'Separating execution, data availability, and settlement into specialized layers to scale each component independently',
        'Returning to single-server databases',
      ],
      correct: 2,
      explanation:
        'Celestia (DA), rollups (execution), Ethereum (settlement) exemplify modularity. Narrative bets that specialization out-scales monolithic L1s trying to optimize all layers at once.',
    },
    {
      question: 'How should an expert evaluate "AI + crypto" intersection projects?',
      options: [
        'Assume all AI tokens will 100× because of ChatGPT',
        'Only count Twitter followers',
        'Ignore tokenomics entirely',
        'Assess whether blockchain adds verifiable compute, data ownership, micropayments, or coordination that centralized AI lacks — or if it is a buzzword wrapper',
      ],
      correct: 3,
      explanation:
        'Many AI-crypto projects lack clear on-chain advantage. Durable narratives require provable demand: decentralized inference markets, zkML verification, or data DAOs with real supply-side participation.',
    },
    {
      question: 'What is "intents" architecture in emerging crypto UX narrative?',
      options: [
        'Users sign explicit transaction calldata for every step',
        'Users express desired outcomes ("swap X for best Y"); solvers compete to fill via optimal routing across venues and chains',
        'A legal intent document for ICOs',
        'Mining intention without hardware',
      ],
      correct: 1,
      explanation:
        'Intent systems (Anoma, UniswapX, CoW) abstract complexity. Narrative bets that users want outcome-based UX and MEV-aware execution, not manual path selection.',
    },
    {
      question:
        'Why do "memecoins" persist as a recurring market narrative despite no fundamentals?',
      options: [
        'They encode community identity, speculation, and attention markets — reflexive social coordination that fundamentals-based models poorly price',
        'They are legally required dividend instruments',
        'All memecoins are backed by US Treasuries',
        'Exchanges ban them globally',
      ],
      correct: 0,
      explanation:
        'Memecoins are cultural derivatives. Expert analysis treats them as sentiment/liquidity phenomena with extreme tail risk — not dismissible noise but a distinct regime requiring separate sizing rules.',
    },
    {
      question: 'What is "chain abstraction" as an emerging narrative?',
      options: [
        'Hiding all blockchain data from users permanently',
        'Abstract art sold as NFTs only',
        'Users interact with apps without manually choosing chains, bridges, or gas tokens — infrastructure routes assets and execution in the background',
        'Removing all smart contracts',
      ],
      correct: 2,
      explanation:
        'Chain abstraction aims to kill the "which network?" UX friction. Thesis tracks wallet/account standards (ERC-4337, intents) and whether users actually value invisible cross-chain routing.',
    },
    {
      question:
        'In evaluating "DePIN" (Decentralized Physical Infrastructure Networks), what matters most?',
      options: [
        'Only the token ticker length',
        'Whether real-world supply (hardware, bandwidth, storage) meets sustainable demand and token incentives bootstrap without infinite inflation',
        'Number of Discord emojis',
        'Proof that founders previously worked at FAANG only',
      ],
      correct: 1,
      explanation:
        'DePIN (Helium, Render, Filecoin) ties tokens to physical work. Narratives fail when emissions subsidize supply nobody buys. Unit economics and utilization rate trump whitepaper vision.',
    },
    {
      question: 'What is "points meta" evolution in crypto narratives?',
      options: [
        'Loyalty programs that never convert to tokens',
        'Credit card reward points on Visa only',
        'Proof-of-stake validator scores',
        'Pre-token incentive campaigns speculated to airdrop governance tokens — later phases add sybil resistance and diminishing returns for mercenary farmers',
      ],
      correct: 3,
      explanation:
        'Points seasons drove 2023–2024 activity. Expert view: narratives shift from pure airdrop farming to sustainable usage as teams combat sybil and reduce emission-driven TVL.',
    },
    {
      question: 'How should emerging narrative theses account for "crowded trade" risk?',
      options: [
        'Crowding never affects crypto',
        'Crowded trades always outperform',
        'When capital piles into a narrative (restaking, RWA), valuations embed optimistic assumptions — underperformance follows if growth or token accrual disappoints vs hype',
        'Only BTC suffers from crowding',
      ],
      correct: 2,
      explanation:
        'Narrative cycles peak when everyone owns the story. Expert analysis tracks positioning (TVL inflow rate, social volume, FDV/revenue extremes) and sizes down when reflexivity exceeds fundamentals.',
    },
  ],

  'crypto-expert-6': [
    {
      question: 'What is "regulatory arbitrage" in crypto operations?',
      options: [
        'Exploiting tax-loss harvesting rules only',
        'Structuring entities, licensing, and product offerings in permissive jurisdictions while serving global users to minimize compliance burden — without eliminating home-country obligations',
        'Arbitrage between two DEX pools on the same chain',
        'Using faster internet to front-run trades',
      ],
      correct: 1,
      explanation:
        'Firms choose Malta, Dubai, or Cayman for licensing flexibility. Users and operators may still face local securities, tax, and sanctions laws — arbitrage is partial, not a free pass.',
    },
    {
      question: 'Under EU MiCA, what extra requirements apply to "significant" stablecoin issuers?',
      options: [
        'No requirements beyond memecoins',
        'Mandatory proof-of-work backing',
        'Ban on all euro-denominated products',
        'Stricter reserve, redemption, and supervision standards due to potential systemic impact across member states',
      ],
      correct: 3,
      explanation:
        'MiCA tiers stablecoin issuers by size and usage. Significant asset-referenced or e-money tokens face enhanced capital, liquidity, and ECB oversight — shaping where issuers domicile products.',
    },
    {
      question: 'What is the FATF Travel Rule compliance challenge for VASPs?',
      options: [
        'Virtual asset service providers must share originator and beneficiary identifying information on transfers above thresholds — difficult to implement on pseudonymous chains',
        'Tourists must declare crypto at airports only',
        'It bans all cross-border crypto transfers',
        'It applies only to NFT art sales under $10',
      ],
      correct: 0,
      explanation:
        'Travel Rule extends banking AML standards to crypto transfers. VASPs build messaging protocols (TRISA, Sygna) but DeFi self-custody transfers fall outside traditional VASP-to-VASP pipes.',
    },
    {
      question:
        'Why might a protocol offer separate "geofenced" front-ends for US vs offshore users?',
      options: [
        'To limit access to products likely deemed unregistered securities or derivatives in restrictive jurisdictions while operating fuller feature sets elsewhere',
        'To improve website load speed only',
        'Because US users cannot use the internet',
        'To charge higher gas fees in Europe',
      ],
      correct: 0,
      explanation:
        'IP blocking and terms-of-service splits are imperfect compliance tools. Regulators have pursued teams whose products were accessible to US persons despite disclaimers — geography is risk management, not immunity.',
    },
    {
      question: 'What is OFAC compliance for a centralized crypto exchange?',
      options: [
        'Optional for all non-US firms',
        'Only applies to physical cash',
        'Mandates proof-of-stake consensus',
        'Screening deposits and withdrawals against sanctioned entity lists and blocking transactions involving flagged addresses — required for US nexus firms',
      ],
      correct: 3,
      explanation:
        'Tornado Cash sanctions demonstrated on-chain address blocking. Exchanges use Chainalysis/Elliptic to freeze flows linked to sanctioned wallets — a compliance cost centralized venues bear that pure DeFi protocols debate.',
    },
    {
      question: 'How does the SEC "broker-dealer" framework affect crypto platforms?',
      options: [
        'It has no relevance to digital assets',
        'Platforms that match orders, hold customer assets, or solicit trades may need registration — affecting whether order flow can be internalized or tokens listed',
        'It only regulates Bitcoin mining pools',
        'It requires all tokens to be registered as national banks',
      ],
      correct: 1,
      explanation:
        'Registration triggers custody rules, net capital, and examination. Many US-facing platforms delisted certain tokens or exited US markets rather than register as broker-dealers or ATS operators.',
    },
    {
      question: 'What is a "VASP" license under frameworks like MiCA or Singapore\'s PSA?',
      options: [
        'A validator activation key',
        'A patent on blockchain algorithms',
        'A mining equipment import permit',
        'A regulatory authorization to provide crypto custody, exchange, or transfer services meeting AML, capital, and consumer protection standards',
      ],
      correct: 3,
      explanation:
        'VASP licensing formalizes who may legally operate custodial crypto businesses. Passporting under MiCA lets authorized firms serve EU markets under harmonized rules — reducing patchwork national licenses.',
    },
    {
      question: 'What compliance risk arises from offering "yield" on customer crypto deposits?',
      options: [
        'Products promising returns on pooled assets may be classified as securities or banking products depending on marketing, custody, and who generates yield',
        'None — yield products are universally exempt',
        'Yield products are only regulated in Antarctica',
        'Only NFTs trigger securities analysis',
      ],
      correct: 0,
      explanation:
        'SEC actions against lending products (BlockFi, Celsius-style models) argued pooled yield offerings were unregistered securities. How yield is sourced and marketed determines regulatory treatment across jurisdictions.',
    },
    {
      question:
        'Why do institutions maintain "substance" requirements when domiciling crypto entities offshore?',
      options: [
        'To avoid paying any lawyers',
        'Substance requirements ban all crypto trading',
        'Only affects NFT marketplaces',
        'Regulators and courts may look through shell companies — real offices, directors, and operations in the license jurisdiction reduce "forum shopping" challenges',
      ],
      correct: 3,
      explanation:
        'A PO box in a friendly jurisdiction is insufficient if decisions run from a restricted country. Substance — local staff, board meetings, audits — supports licensing credibility and tax residency claims.',
    },
    {
      question: 'What trend followed global stablecoin scrutiny (US, EU, UK) in 2023–2025?',
      options: [
        'All stablecoins became unbacked algorithms',
        'Issuers pursued narrower licensed products (T-bill-backed, e-money tokens), redomiciled entities, and reduced anonymous redemption to meet reserve and audit mandates',
        'Stablecoins were banned worldwide with no exceptions',
        'MiCA eliminated all disclosure requirements',
      ],
      correct: 1,
      explanation:
        'Regulatory clarity pushed fiat-backed issuers toward audited reserves, monthly attestations, and licensed entities. Algorithmic designs largely exited Western retail markets or rebranded outside major jurisdictions.',
    },
  ],

  'betting-intermediate-1': [
    {
      question: 'What does "expected value" (EV) mean in the context of finding value bets?',
      options: [
        'The amount you will definitely win on a bet',
        'The average profit or loss per bet if you repeated the same wager many times',
        'The maximum payout offered by the sportsbook',
        "The probability implied by the favorite's odds",
      ],
      correct: 1,
      explanation:
        'EV = (probability of winning × profit) − (probability of losing × stake). A positive EV bet is one where your estimated true win probability exceeds what the posted odds imply.',
    },
    {
      question:
        'If a book offers +200 on an outcome you estimate at 40% true probability, what is the approximate EV on a $100 bet?',
      options: ['−$20', '+$20', '+$40', '0% (fair odds)'],
      correct: 1,
      explanation:
        '+200 implies 33.3% break-even probability. At 40% true probability: EV = 0.40×$200 − 0.60×$100 = $80 − $60 = +$20 per $100 wagered.',
    },
    {
      question: 'What is "closing line value" (CLV) and why do sharp bettors track it?',
      options: [
        'The commission charged when you close your account',
        'Whether the line moved in your favor by game time — a proxy for whether you beat the market',
        'The final score margin of victory',
        'The value of parlay insurance offers',
      ],
      correct: 1,
      explanation:
        'If you bet Team A at −3 and the line closes at −5, you captured CLV. Consistently beating the closing line correlates with long-term profitability even before results settle.',
    },
    {
      question:
        'Which conversion correctly turns American odds −150 into implied probability (ignoring vig)?',
      options: ['40%', '50%', '60%', '66.7%'],
      correct: 2,
      explanation:
        'For negative American odds: implied % = |odds| / (|odds| + 100) = 150/250 = 60%. You must beat this implied probability after removing vig to find value.',
    },
    {
      question: 'Why is comparing odds across multiple books essential for value betting?',
      options: [
        'It guarantees every bet wins',
        'Different books shade lines differently; shopping lines improves your effective price and EV',
        'It is required by US federal law',
        'It eliminates the need for bankroll management',
      ],
      correct: 1,
      explanation:
        'A half-point or +10 on juice can swing EV from negative to positive. Line shopping is one of the highest-ROI activities because it costs nothing beyond account maintenance.',
    },
    {
      question: 'What does the "vig" or "juice" represent in a standard −110 / −110 market?',
      options: [
        'A tax paid to the state',
        "The bookmaker's built-in margin that makes both sides sum to more than 100% implied probability",
        'A bonus for parlay bettors',
        'The maximum bet size allowed',
      ],
      correct: 1,
      explanation:
        '−110 each side implies 52.4% + 52.4% = 104.8%. The excess over 100% is the vig. You need roughly 52.4% win rate just to break even on −110 markets.',
    },
    {
      question:
        'A bettor uses a model giving Team B a 55% win chance; the market prices B at 50% implied. What is the core value-betting insight?',
      options: [
        'Always bet the underdog',
        "Bet when your estimated probability exceeds the market's implied probability after vig",
        'Only bet primetime games',
        'Fade public money on every play',
      ],
      correct: 1,
      explanation:
        'Value exists when your edge (true prob − implied prob) is positive. The market at 50% vs your 55% is a 5-point probability edge — the foundation of +EV betting.',
    },
    {
      question: 'What is a common mistake when interpreting "value" from a single winning bet?',
      options: [
        'Confusing one result with proof of +EV process',
        'Using decimal odds instead of American',
        'Betting too small a stake',
        'Tracking CLV too carefully',
      ],
      correct: 0,
      explanation:
        'Short-term variance masks skill. A +EV bet loses often. Edge is measured over hundreds of bets via CLV, EV, and ROI — not one ticket outcome.',
    },
    {
      question:
        'In a two-outcome market priced at 48% / 52% implied, the overround is approximately:',
      options: ['0%', '2%', '4%', '10%'],
      correct: 1,
      explanation:
        '48% + 52% = 100% would be fair; sportsbooks typically sum to 102–105%+. Here 100% total with slight vig embedded per side — always de-vig before comparing to your model.',
    },
    {
      question: 'Kelly criterion suggests bet size based on:',
      options: [
        'Your mood after a loss',
        'Edge and odds — fraction of bankroll proportional to advantage',
        'Always 10% of bankroll flat',
        'The biggest line move of the day',
      ],
      correct: 1,
      explanation:
        'Kelly sizes wagers to maximize long-term growth: f* = (bp − q) / b where b is net odds, p is win prob, q = 1−p. Full Kelly is volatile; many use fractional Kelly (¼–½).',
    },
  ],

  'betting-intermediate-2': [
    {
      question:
        'Political prediction markets often price events in "cents per share" where $1 pays if the event occurs. A contract at 62¢ implies what probability?',
      options: ['38%', '50%', '62%', '100%'],
      correct: 2,
      explanation:
        'On Polymarket/Kalshi-style binary contracts, price ≈ implied probability. 62¢ ≈ 62% chance the stated outcome happens, before fees and spread.',
    },
    {
      question:
        'Why can political betting odds diverge sharply from poll averages weeks before an election?',
      options: [
        'Polls are illegal in the US',
        'Markets incorporate turnout models, late deciders, and trading flow faster than static poll snapshots',
        'All political bets are manipulated',
        'Prediction markets only trade on inauguration day',
      ],
      correct: 1,
      explanation:
        'Markets are forward-looking and continuous. Polls are lagging samples. Traders price information polls miss — fundraising, scandals, early voting, and coalition math.',
    },
    {
      question:
        'What is a key liquidity risk when betting niche political markets (e.g., state legislature control)?',
      options: [
        'Guaranteed arbitrage with sportsbooks',
        'Wide spreads and shallow depth can make large orders move price against you',
        'Federal matching of deposits',
        'Automatic hedging by the exchange',
      ],
      correct: 1,
      explanation:
        'Thin markets mean your order may fill at worse average prices (slippage). Size must match available depth at acceptable prices.',
    },
    {
      question: 'In US elections, "favorite-longshot bias" in political markets often means:',
      options: [
        'Longshots are always underpriced',
        'Favorites may be slightly overbet relative to true odds; longshots can offer value at extremes',
        'All candidates are priced at 50%',
        'Markets never move after debates',
      ],
      correct: 1,
      explanation:
        'Empirical literature shows longshots lose more than implied odds suggest, while heavy favorites sometimes offer slight value — though vig and fees still matter.',
    },
    {
      question:
        'A trader buys "Party X wins presidency" at 40¢ and hedges with "Party Y wins" at 55¢ when both cannot win. What strategy is this?',
      options: [
        'Martingale',
        'Arbitrage or near-arbitrage on mutually exclusive outcomes if total cost < $1',
        'Parlay stacking',
        'Teaser betting',
      ],
      correct: 1,
      explanation:
        'If X + Y prices sum below $1 (after fees), buying both sides locks profit regardless of winner. Political markets occasionally misprice correlated exclusives.',
    },
    {
      question:
        'Why do prediction markets react faster than many media forecasts to breaking political news?',
      options: [
        'They are closed on news days',
        'Continuous trading lets capital express new information immediately',
        'News is banned on exchanges',
        'Only insiders can trade',
      ],
      correct: 1,
      explanation:
        'Traders with private or faster analysis buy/sell instantly. Odds update tick-by-tick; pundit forecasts update on broadcast schedules.',
    },
    {
      question: 'What does "calibration" mean when evaluating political market forecasts?',
      options: [
        'Adjusting your monitor brightness',
        'Whether events priced at 70% historically occur ~70% of the time over many contracts',
        'Matching bet size to poll sample size',
        'Syncing with sportsbook limits',
      ],
      correct: 1,
      explanation:
        'Well-calibrated markets are probabilistically honest. Miscalibration (e.g., 90% contracts hitting only 75%) signals systematic mispricing or bias.',
    },
    {
      question:
        'Regulatory fragmentation (CFTC event contracts vs state gaming laws) mainly affects political bettors by:',
      options: [
        'Eliminating all taxes',
        'Determining which platforms are legal, what contracts exist, and who can participate',
        'Guaranteeing 2% daily returns',
        'Banning hedging',
      ],
      correct: 1,
      explanation:
        'US political trading is evolving under CFTC oversight for designated contracts; offshore and unregulated venues carry different legal and counterparty risks.',
    },
    {
      question:
        'When polls show a 3-point lead inside the margin of error, a rational market price near 52–55% for the leader reflects:',
      options: [
        'Certain victory',
        'Uncertainty — small leads are not decisive with sampling error and electoral college structure',
        'That polls are worthless',
        '100% implied probability',
      ],
      correct: 1,
      explanation:
        'Sampling error, systematic poll bias, and structural factors (EC, turnout) keep probabilities away from 0/100 until evidence accumulates.',
    },
    {
      question: 'Combining poll-based models with market prices is often done via:',
      options: [
        'Ignoring markets entirely',
        'Bayesian or ensemble blending — weighting each signal by historical accuracy',
        'Betting only on vice-presidential debates',
        'Using only Twitter sentiment',
      ],
      correct: 1,
      explanation:
        'Hybrid models reduce overreliance on one source. Markets and polls err differently; blending improves Brier scores and bet selection.',
    },
  ],

  'betting-intermediate-3': [
    {
      question: 'Expected goals (xG) in soccer analytics primarily measures:',
      options: [
        'Final score only',
        'Quality of scoring chances based on shot location, angle, and type',
        'Player salary cap impact',
        'Referee bias',
      ],
      correct: 1,
      explanation:
        'xG assigns a probability to each shot becoming a goal. Teams outperforming xG may regress; underperformers may improve — useful for match odds modeling.',
    },
    {
      question:
        'In baseball, FIP (Fielding Independent Pitching) focuses on outcomes the pitcher most controls:',
      options: [
        'Errors and double plays',
        'Strikeouts, walks, HBP, and home runs allowed',
        'Stolen bases against',
        'Bullpen ERA of teammates',
      ],
      correct: 1,
      explanation:
        'FIP strips defense luck from ERA. Bettors use FIP vs ERA gaps to identify pitchers due for regression or improvement in run prevention.',
    },
    {
      question: 'A basketball team\'s "pace" statistic matters for totals betting because:',
      options: [
        'It measures arena altitude',
        'Faster pace means more possessions and typically higher combined scoring',
        'It only affects moneylines',
        'Pace is irrelevant to NBA totals',
      ],
      correct: 1,
      explanation:
        'Pace = possessions per 48 minutes. High-pace matchups inflate shot volume; low-pace grind games favor unders — adjust totals models accordingly.',
    },
    {
      question:
        'What is "sample size" concern when using a player\'s last 3 games to bet season-long props?',
      options: [
        'Three games is always sufficient',
        'Small samples produce high variance estimates that overfit noise',
        'Larger samples are always worse',
        'Props ignore statistics',
      ],
      correct: 1,
      explanation:
        'Short hot streaks regress to career/true-talent levels. Models should shrink extreme recent performance toward prior baselines.',
    },
    {
      question: 'EPA (expected points added) per play in football is useful because:',
      options: [
        'It counts only touchdowns',
        'It values each play by how much it shifted win probability / expected points',
        'It replaces the scoreboard',
        'It is only for fantasy',
      ],
      correct: 1,
      explanation:
        'EPA contextualizes efficiency — a 2-yard gain on 3rd-and-1 can be more valuable than a 20-yard gain on 3rd-and-20. Sharp totals and spread models use team EPA trends.',
    },
    {
      question:
        'When a star player is ruled out pregame, why might the line move less than your model suggests?',
      options: [
        'Books never adjust',
        'Market may have partially priced injury probability; steam from syndicates already moved the number',
        'Injuries are illegal to report',
        'Player props are unrelated',
      ],
      correct: 1,
      explanation:
        'Efficient markets incorporate injury news quickly. If you react late, you chase stale value. Real-time news monitoring and open/close comparisons matter.',
    },
    {
      question: 'Poisson or Dixon-Coles models are commonly used in soccer betting to:',
      options: [
        'Predict card colors',
        'Estimate goal distributions and derive correct score / totals probabilities',
        'Set referee assignments',
        'Calculate stadium capacity',
      ],
      correct: 1,
      explanation:
        'Goal scoring is modeled as Poisson processes with team attack/defense ratings. Correlation adjustments (Dixon-Coles) fix low-score dependence.',
    },
    {
      question: 'Bettor tracking "yards per play" without down-and-distance context risks:',
      options: [
        'Finding true edge always',
        'Misreading efficiency — garbage-time yards inflate stats',
        'Beating closing line every time',
        'Eliminating vig',
      ],
      correct: 1,
      explanation:
        'Context splits (early downs, neutral script, red zone) matter. Raw volume stats without situation adjustment mislead totals and side models.',
    },
    {
      question: 'Closing line value in sports analytics workflows is often validated by:',
      options: [
        'Ignoring line movement',
        'Comparing your bet price to the final consensus line across sharp books',
        'Only using opening lines',
        'Betting parlays only',
      ],
      correct: 1,
      explanation:
        'If your bets consistently get better numbers than close, your model likely has predictive skill even when short-term ROI is negative due to variance.',
    },
    {
      question: 'Elo ratings adapted for sports betting typically:',
      options: [
        'Reset every game randomly',
        'Update team strength after each match based on result vs expectation and margin',
        'Only work for tennis',
        'Replace all injury data',
      ],
      correct: 1,
      explanation:
        'Elo gives a dynamic power rating. Expected win prob from rating diff can be compared to market implied odds to flag mispriced games.',
    },
  ],

  'betting-intermediate-4': [
    {
      question: 'Market liquidity in prediction markets refers to:',
      options: [
        'The legal jurisdiction',
        'How much size can trade near fair price without large price impact',
        'The number of Twitter followers',
        'Guaranteed daily volume from the house',
      ],
      correct: 1,
      explanation:
        'Deep liquidity means tight spreads and large resting orders. Thin books move cents per dollar traded — critical for sizing.',
    },
    {
      question: 'Slippage occurs when:',
      options: [
        'Your bet is voided',
        'You execute at worse average prices than the quote you saw due to depth consumption',
        'Odds improve after you bet',
        'The game is postponed',
      ],
      correct: 1,
      explanation:
        'Market orders walk the book. A 55¢ ask might fill at 58¢ average if you buy $5,000 when only $500 rests at 55¢.',
    },
    {
      question: 'Bid-ask spread on Polymarket-style CLOBs represents:',
      options: [
        'Government tax',
        'The cost of immediacy — difference between best buy and sell prices',
        'Player injury status',
        'Maximum parlay legs',
      ],
      correct: 1,
      explanation:
        'Wide spread = illiquid market. You pay half-spread (roughly) to cross immediately; makers earn spread by providing liquidity.',
    },
    {
      question:
        'Why do market makers widen spreads before major uncertain events (e.g., debate night)?',
      options: [
        'To attract more flow',
        'Inventory and adverse selection risk rise when prices may gap on news',
        'Spreads never change',
        'Regulators require 50¢ spreads',
      ],
      correct: 1,
      explanation:
        'Informed traders hit stale quotes after news. Makers compensate with wider spreads or pull liquidity — bettors see temporary illiquidity.',
    },
    {
      question: 'A limit order at 48¢ when best ask is 50¢ will:',
      options: [
        'Fill immediately at 50¢',
        'Rest on the book until a seller hits 48¢ or price trades down',
        'Always cancel',
        'Convert to a parlay',
      ],
      correct: 1,
      explanation:
        'Limit orders provide liquidity and control price but may not fill. Patience reduces slippage vs market orders.',
    },
    {
      question: 'Depth-of-book analysis helps bettors by showing:',
      options: [
        'Only historical results',
        'Cumulative size available at each price level for planning entry/exit',
        'Referee assignments',
        'Tax brackets',
      ],
      correct: 1,
      explanation:
        'Reading the ladder reveals whether your target size can fill near mid without moving price several ticks.',
    },
    {
      question: 'In sportsbooks, "limit" on a bet is primarily driven by:',
      options: [
        'Your favorite team',
        'Book risk management, market liquidity, and customer profile (sharp vs recreational)',
        'Weather only',
        'Stadium capacity',
      ],
      correct: 1,
      explanation:
        'Sharps get lower limits; popular liquid markets (NFL sides) accept larger action. Limits are risk caps, not insults.',
    },
    {
      question: 'Comparing slippage on market vs limit orders, a taker typically pays:',
      options: [
        'Less than makers',
        'Spread and price impact; makers may earn rebate minus adverse selection',
        'Nothing',
        'Only on winning bets',
      ],
      correct: 1,
      explanation:
        'Takers cross spread for certainty. Makers earn spread but risk being picked off when news breaks.',
    },
    {
      question: 'Volume spike without price change often suggests:',
      options: [
        'Manipulation only',
        'Two-sided flow absorbing size near equilibrium',
        'Market closure',
        'Guaranteed arbitrage',
      ],
      correct: 1,
      explanation:
        'Heavy two-way trading can print volume at stable mid when bulls and bears are balanced — not necessarily directional edge.',
    },
    {
      question: 'To minimize slippage on a $10,000 political contract purchase, you should:',
      options: [
        'Use one market order instantly',
        'Split orders, use limits at mid, and monitor depth over time',
        'Bet only after election day',
        'Ignore the order book',
      ],
      correct: 1,
      explanation:
        'TWAP-style slicing and patient limits reduce average fill vs blasting a thin book.',
    },
  ],

  'betting-intermediate-5': [
    {
      question: 'Hedging a bet typically means:',
      options: [
        'Doubling your stake on the same side',
        'Taking offsetting positions to reduce exposure to an outcome',
        'Closing your sportsbook account',
        'Only betting parlays',
      ],
      correct: 1,
      explanation:
        'A hedge locks in profit or cuts loss by betting the other side (or correlated market) after your initial position moves favorably or unfavorably.',
    },
    {
      question:
        'You bet $100 on Team A at +300; they lead late and opponent moneyline is −400. Hedging might:',
      options: [
        'Increase risk to $500',
        'Bet opponent to guarantee profit regardless of final result',
        'Void the original ticket',
        'Only work on futures',
      ],
      correct: 1,
      explanation:
        'A sized hedge on the opponent converts volatile +300 ticket into near-arbitrage guaranteed return minus vig on hedge leg.',
    },
    {
      question: 'Middle opportunity arises when:',
      options: [
        'Both bets lose',
        'Line moves so you can win both sides (e.g., bet +3.5 and later −2.5)',
        'Books ban hedging',
        'Only totals qualify',
      ],
      correct: 1,
      explanation:
        'If you bet early +3.5 and later take opponent −2.5, a 3-point margin wins both. Rare but valuable when lines swing.',
    },
    {
      question: 'Hedging a futures ticket at favorable live odds is often rational when:',
      options: [
        'You want maximum variance',
        'Locked profit exceeds risk-adjusted value of riding full futures payout',
        'Books prohibit it',
        'Hedges always have negative EV',
      ],
      correct: 1,
      explanation:
        'Risk management: converting $50 to win $500 ticket into $200 guaranteed may beat utility of longshot variance depending on bankroll and goals.',
    },
    {
      question:
        'Correlation mistake: hedging NFL team win with same-game player yards on same team is:',
      options: [
        'Perfect independence',
        'Partial hedge at best — correlated outcomes may not reduce risk as expected',
        'Always full lock',
        'Illegal',
      ],
      correct: 1,
      explanation:
        'Same-game parlays correlate. True hedge needs negatively correlated or opposite outcomes (win vs lose).',
    },
    {
      question: 'Cash-out features offered by sportsbooks approximate:',
      options: [
        'Free money',
        'Real-time hedge pricing with embedded margin for the book',
        'Regulatory insurance',
        'Parlay bonuses',
      ],
      correct: 1,
      explanation:
        "Cash-out = book's offer to buy your ticket. Price includes vig; compare to manual hedge prices on exchange books.",
    },
    {
      question: 'On prediction markets, selling shares you own before resolution is:',
      options: [
        'Impossible',
        'A hedge/exit that transfers risk to another trader at current market price',
        'Only for losers',
        'Tax-free always',
      ],
      correct: 1,
      explanation:
        'Exit by selling YES shares (or buying NO) realizes P&L early without waiting for event settlement.',
    },
    {
      question: 'Over-hedging after a small lead can:',
      options: [
        'Maximize EV always',
        'Give up most upside while still paying vig on hedge leg',
        'Guarantee double win',
        'Eliminate taxes',
      ],
      correct: 1,
      explanation:
        'Hedge sizing matters. Full hedge on small edge tickets often destroys long-term +EV; partial hedges balance utility and variance.',
    },
    {
      question: 'A "free bet" hedge strategy uses:',
      options: [
        'The promotional stake returned only on win to structure arbitrage-like positions',
        'No second bet',
        'Only live betting',
        'In-game coin toss',
      ],
      correct: 0,
      explanation:
        'Free bets have different EV math (stake not returned). Hedging opposite side with real money can extract most promotional value.',
    },
    {
      question: 'When NOT to hedge is often when:',
      options: [
        'You have no edge on hedge price and are paying extra vig to reduce fun/variance on a +EV original',
        'You are up big',
        'Line moved',
        'You use limits',
      ],
      correct: 0,
      explanation:
        'If hedge odds are bad, you convert +EV position to worse combined EV. Hedging for peace of mind has a price.',
    },
  ],

  'betting-intermediate-6': [
    {
      question: 'ROI in betting tracking is calculated as:',
      options: [
        'Wins divided by losses',
        'Net profit divided by total amount risked (handle)',
        'Largest single win only',
        'Closing line minus opening line',
      ],
      correct: 1,
      explanation:
        'ROI% = (profit / total wagered) × 100. A +5% ROI over 1,000 bets is strong; verify sample size and limits.',
    },
    {
      question: 'CLV tracking spreadsheet should log:',
      options: [
        'Only winning bets',
        'Bet odds, closing line, sport/market, stake, and timestamp',
        'Player jersey colors',
        'Parlay leg count only',
      ],
      correct: 1,
      explanation:
        'Comparing bet line to close isolates pricing skill from result luck. Essential metric for serious review.',
    },
    {
      question: 'Standard deviation of returns matters because:',
      options: [
        'It eliminates vig',
        'High variance means long losing streaks possible even with +EV',
        'It replaces bankroll',
        'Books publish it daily',
      ],
      correct: 1,
      explanation:
        'Edge is small relative to variance. 55% win rate can easily produce 10-loss streaks over hundreds of trials.',
    },
    {
      question: 'Separating bet types (spreads, props, futures) in analysis helps:',
      options: [
        'Hide losses',
        'Identify which markets you actually beat vs leak edge',
        'Avoid taxes',
        'Increase limits',
      ],
      correct: 1,
      explanation:
        'Many bettors are sharp on NFL sides but −EV on parlay props. Segmented P&L drives strategy focus.',
    },
    {
      question: 'Units instead of dollars in reporting:',
      options: [
        'Are meaningless',
        'Normalize stake sizing for comparing performance across bankroll changes',
        'Guarantee wins',
        'Only for casinos',
      ],
      correct: 1,
      explanation:
        '1u = standard bet (e.g., 1% bankroll). Tracking in units shows skill independent of growing/shrinking dollar bankroll.',
    },
    {
      question: 'Brier score evaluates probabilistic forecasts by:',
      options: [
        'Counting tickets cashed',
        'Penalizing squared error between predicted probability and actual 0/1 outcome',
        'Measuring closing line only',
        'Ignoring calibration',
      ],
      correct: 1,
      explanation:
        'Lower Brier is better. Useful if you log model probability vs market and outcome — separates forecasting from ROI.',
    },
    {
      question: 'A betting journal should include emotional/context notes because:',
      options: [
        'Books require them',
        'Tilt and fatigue correlate with −EV decision clusters',
        'They replace odds math',
        'IRS mandates it',
      ],
      correct: 1,
      explanation:
        'Chasing losses, betting drunk, or illiquid markets show up as patterns in notes + worse CLV — fix process leaks.',
    },
    {
      question: 'Drawdown measures:',
      options: [
        'Peak-to-trough bankroll decline from a high point',
        'Only winning streak length',
        'Vig percentage',
        'Number of accounts',
      ],
      correct: 0,
      explanation:
        'Max drawdown informs bankroll size and Kelly fraction. Surviving 30% downswing requires conservative sizing.',
    },
    {
      question: 'Comparing your ROI to closing line without removing vig can:',
      options: ['Overstate edge', 'Always understate skill', 'Have no effect', 'Replace CLV'],
      correct: 0,
      explanation:
        'Beating close by 0.5% on −110 may still be −EV after vig. Always translate to implied prob and net of fees.',
    },
    {
      question: 'Exporting history from multiple books into one database enables:',
      options: [
        'Guaranteed arbitrage',
        'Unified analytics on true combined handle and sport/market breakdown',
        'Higher limits automatically',
        'Tax evasion',
      ],
      correct: 1,
      explanation:
        'Multi-book bettors need consolidated logs; otherwise ROI per book misleads total business performance.',
    },
  ],

  'betting-advanced-1': [
    {
      question: 'A logistic regression model for win probability typically uses:',
      options: [
        'Only team colors',
        'Features (Elo diff, rest days, etc.) mapped to 0–1 probability via sigmoid',
        'Random coin flips',
        'Parlay odds only',
      ],
      correct: 1,
      explanation:
        'Logit link ensures predictions stay in valid probability range. Coefficients show feature impact on log-odds of winning.',
    },
    {
      question: 'Train/test split in betting models prevents:',
      options: [
        'Overfitting past noise — evaluating on unseen seasons or games',
        'All data usage',
        'Closing line access',
        'Vig calculation',
      ],
      correct: 0,
      explanation:
        'In-sample fit can look great on historical data but fail live. Walk-forward validation mimics real deployment.',
    },
    {
      question: 'Feature leakage example to avoid:',
      options: [
        'Using final score in pregame model',
        'Using home/away indicator',
        'Using days rest',
        'Using closing line as feature when predicting open',
      ],
      correct: 0,
      explanation:
        'Postgame stats in pregame predictions inflate backtest accuracy. Use only information available at bet time.',
    },
    {
      question: 'Converting model probability to fair American odds uses:',
      options: [
        'If p>0.5: odds = −100p/(1−p); if p<0.5: +100(1−p)/p (approximately)',
        'Always +100',
        'Square root of p',
        'Ignore vig',
      ],
      correct: 0,
      explanation:
        'Fair odds reflect true p. Compare fair line to market after devigging to find bets.',
    },
    {
      question: 'Ensemble models (stacking random forest + Poisson goals) help by:',
      options: [
        'Guaranteeing profit',
        'Reducing variance and capturing nonlinear patterns single models miss',
        'Eliminating need for data',
        'Bypassing limits',
      ],
      correct: 1,
      explanation:
        'Diverse models err differently; weighted blends often improve calibration vs one misspecified spec.',
    },
    {
      question: 'Regularization (L1/L2) in betting regression:',
      options: [
        'Increases overfitting',
        'Shrinks unstable coefficients when many correlated features exist',
        'Removes all features',
        'Is only for parlays',
      ],
      correct: 1,
      explanation:
        'Many team stats correlate. Penalties stabilize coefficients and improve out-of-sample Brier/ROI.',
    },
    {
      question: 'Backtesting with closing line as benchmark means a bet is +EV if:',
      options: [
        'Model prob beats devigged closing implied prob',
        'You won the bet',
        'Opening line moved',
        'Parlay hits',
      ],
      correct: 0,
      explanation:
        'Beat-close backtests approximate whether model would have captured CLV — stronger signal than W/L alone.',
    },
    {
      question: 'Non-stationarity in sports (rule changes, roster turnover) requires:',
      options: [
        'One static model forever',
        'Periodic retraining and decay weighting on older games',
        'No updates',
        'Only betting favorites',
      ],
      correct: 1,
      explanation:
        'NFL passing explosion, pace changes, etc. shift distributions. Models need rolling windows or regime detection.',
    },
    {
      question: 'Calibration plot shows model says 70% but outcomes hit 55%. You should:',
      options: [
        'Celebrate',
        'Apply Platt scaling or isotonic regression to recalibrate probabilities',
        'Double stakes',
        'Ignore',
      ],
      correct: 1,
      explanation:
        'Miscalibrated probabilities destroy Kelly sizing and EV estimates. Post-hoc calibration fixes probability outputs.',
    },
    {
      question: 'Edge threshold before betting accounts for:',
      options: [
        'Only model error',
        'Model uncertainty, vig, fees, and minimum CLV buffer',
        'Jersey number',
        'Social media',
      ],
      correct: 1,
      explanation:
        'Bet only when edge exceeds noise + costs. Many pros require 2–3+ points prob edge on −110 markets.',
    },
  ],

  'betting-advanced-2': [
    {
      question: 'Pure arbitrage in two-outcome market exists when:',
      options: [
        'Sum of implied probabilities across best prices < 100% (after costs)',
        'You bet both favorites',
        'One book is offline',
        'Parlay pays 2:1',
      ],
      correct: 0,
      explanation:
        'Buy all outcomes for < $1 guaranteed payout = locked profit. Rare after fees; speed and limits constrain.',
    },
    {
      question: 'Dutching across books means:',
      options: [
        'Betting one side only',
        'Staking each outcome so equal profit regardless of winner',
        'Betting only draws',
        'Using teasers',
      ],
      correct: 1,
      explanation:
        'Stake weights = 1/decimal_odds normalized. Used when combined implied prob < 1 for arb or biased dutching for +EV.',
    },
    {
      question: 'Palpable error ("palp") voids are arbitrage risk because:',
      options: [
        'Books may cancel obviously mispriced lines after you bet',
        'They increase payouts',
        'Required by law always',
        'Only on futures',
      ],
      correct: 0,
      explanation:
        'Fat-finger 99¢ lines get voided. Arb bettors factor counterparty risk and speed of execution.',
    },
    {
      question: 'Cross-exchange arb between Polymarket and Kalshi requires:',
      options: [
        'Same settlement rules, timing, and fee structure — or basis risk remains',
        'Nothing — always identical',
        'Only sports data',
        'Parlay cards',
      ],
      correct: 0,
      explanation:
        'Contract wording, resolution sources, and fees differ. "Arb" may be illusion if events are not truly identical.',
    },
    {
      question: 'Synthetic arb using YES + NO on same platform when YES+NO < $1:',
      options: [
        'Locks $1 payout for cost < $1 minus fees',
        'Always loses',
        'Is a parlay',
        'Requires sportsbook',
      ],
      correct: 0,
      explanation:
        'Binary complement should sum to ~$1. Occasional mispricings from book fragmentation allow risk-free capture.',
    },
    {
      question: 'Arb opportunity half-life is often seconds because:',
      options: [
        'Bots and sharps react instantly',
        'Games last hours',
        'Vig is zero',
        'Books never move',
      ],
      correct: 0,
      explanation:
        'Automation dominates. Human arb without low-latency feeds and pre-funded accounts rarely competes.',
    },
    {
      question: 'Middle vs arb: middle has:',
      options: [
        'Guaranteed profit',
        'Possible double win with risk of one side losing both',
        'No line movement',
        'Only on moneylines',
      ],
      correct: 1,
      explanation:
        'Middle is speculative arb cousin — wins both on specific margin; arb is true lock (before void risk).',
    },
    {
      question: 'Bonus arbitrage ("matched betting") exploits:',
      options: [
        'Promotional offers with calculated opposing bets to extract bonus EV',
        'Illegal fixing',
        'Insider trading',
        'Coin toss only',
      ],
      correct: 0,
      explanation:
        'Free bets and deposit matches have quantifiable EV when hedged with real-money opposite at fair-ish odds.',
    },
    {
      question: 'Three-way soccer arb needs:',
      options: [
        'Two books only',
        'Best price on home, draw, away such that implied sum < 100%',
        'Only overtime',
        'Parlay insurance',
      ],
      correct: 1,
      explanation:
        '1X2 markets need three legs. Harder to find but same math as two-way with higher book count.',
    },
    {
      question: 'Why arbs shrink long-term for retail bettors:',
      options: [
        'Books limit or ban arb profiles; palp voids; competition erases gaps',
        'Arbs become more common',
        'Vig disappears',
        'CLV irrelevant',
      ],
      correct: 0,
      explanation:
        'Sustainable edge shifts to soft books, promotional EV, and modeling — not classic arb alone.',
    },
  ],

  'betting-advanced-3': [
    {
      question: 'On Polymarket, UMA Optimistic Oracle resolves disputes by:',
      options: [
        'Instant SEC vote',
        'Proposed outcome with challenge period; disputers bond tokens for vote',
        'Coin flip',
        'Twitter poll',
      ],
      correct: 1,
      explanation:
        'Resolution is proposal + challenge window. Traders must understand resolution criteria and dispute risk on ambiguous events.',
    },
    {
      question: 'Liquidity rewards on CLOB prediction markets incentivize:',
      options: [
        'Only takers',
        'Market makers to post tight two-sided quotes near mid',
        'Parlay bettors',
        'Voided bets',
      ],
      correct: 1,
      explanation:
        'Reward programs pay for rested limit orders within spread thresholds — improves depth for all traders.',
    },
    {
      question: 'Splitting a large YES position before a binary event via selling into strength:',
      options: [
        'Always maximizes EV',
        'Can reduce tail risk and free capital if price rises before resolution',
        'Is illegal',
        'Only for sports',
      ],
      correct: 1,
      explanation:
        'Advanced traders scale out into liquidity when news shifts probability — not only hold to 0/100 settlement.',
    },
    {
      question:
        'Correlation between related Polymarket contracts (e.g., "wins state" vs "wins presidency") enables:',
      options: [
        'Ignore both',
        'Relative value trades — overweight cheaper implied conditional vs reweighted joint prob',
        'Guaranteed arb always',
        'No analysis',
      ],
      correct: 1,
      explanation:
        'Joint probabilities must be coherent. Mispriced baskets suggest trades on underpriced leg vs synthetic from others.',
    },
    {
      question: 'News trading on prediction markets requires:',
      options: [
        'Delayed reaction',
        "Pre-built scenarios and limit orders at prices you'd accept post-news",
        'Only after CNN',
        'Avoiding order book',
      ],
      correct: 1,
      explanation:
        'Latency matters. Pre-placed limits or fast parsing of primary sources beats waiting for social recap.',
    },
    {
      question: 'Holding NO shares on "Will X happen?" is economically similar to:',
      options: [
        'Shorting YES / bearing risk X does not occur for profit if NO wins',
        'Parlay',
        'Teaser',
        'Cash-out ban',
      ],
      correct: 0,
      explanation:
        'NO pays if event fails. Portfolio can express bearish view on probability without selling borrowed shares.',
    },
    {
      question: 'Fee drag on high-turnover Polymarket strategies means:',
      options: [
        'Fees irrelevant',
        'Small edges need fewer round trips; maker rebates help',
        'Always bet bigger',
        'Only hold losers',
      ],
      correct: 1,
      explanation:
        'Taker fees and spread compound. Market-making and patient limits reduce fee erosion vs churning.',
    },
    {
      question: 'Wallet / on-chain settlement risk includes:',
      options: [
        'Smart contract bugs, bridge risk, and USDC depeg — not just prediction risk',
        'Only game injury',
        'Book limit',
        'Parlay leg',
      ],
      correct: 0,
      explanation:
        'Crypto infrastructure adds layers beyond event outcome. Due diligence on chain and custody matters.',
    },
    {
      question: 'Implied volatility analogue in prediction markets is:',
      options: [
        'Price uncertainty near 50% with time decay as resolution approaches',
        'VIX index only',
        'Player speed',
        'Stadium size',
      ],
      correct: 0,
      explanation:
        'Contracts near 50¢ swing more on news; near 0/100 gamma is low. Time value affects hold vs trade.',
    },
    {
      question: 'Building a "scenario tree" for multi-round elections helps traders:',
      options: [
        'Price path-dependent markets (state-by-state) consistently',
        'Avoid all math',
        'Only bet favorites',
        'Ignore calibration',
      ],
      correct: 0,
      explanation:
        'Sequential elections are path dependent. Tree models assign prob to branches vs flat national poll only.',
    },
  ],

  'betting-advanced-4': [
    {
      question: 'When Fed rate-cut odds rise on Kalshi, gold futures often react because:',
      options: [
        'Lower rates reduce opportunity cost of holding non-yielding gold',
        'Gold ignores rates',
        'Rates only affect bonds',
        'Prediction markets set Fed policy',
      ],
      correct: 0,
      explanation:
        'Macro prediction markets and commodities share rate sensitivity. Traders watch cross-asset signals for confirmation or divergence.',
    },
    {
      question: 'S&P 500 "close above X" weekly contracts correlate with:',
      options: [
        'VIX, earnings calendar, and overnight futures — not isolated from finance',
        'Only college football',
        'Weather in Iowa',
        'Player props',
      ],
      correct: 0,
      explanation:
        'Index event contracts are derivative of equity vol and drift. Sports bettors crossing over must learn equity seasonality.',
    },
    {
      question: 'Inflation CPI prediction markets moving up may pressure:',
      options: [
        'Long-duration growth stocks and support TIPS; commodities like oil often rise on demand/repricing',
        'Only crypto',
        'Nothing',
        'Municipal bonds only',
      ],
      correct: 0,
      explanation:
        'CPI surprises reprice Fed path, real yields, and commodity demand expectations simultaneously across markets.',
    },
    {
      question: 'Basis trade between prediction-implied recession prob and cyclical equities:',
      options: [
        'Can flag when equity prices assume lower recession risk than event markets',
        'Always identical',
        'Illegal',
        'Only for FX',
      ],
      correct: 0,
      explanation:
        'Divergence between recession contracts and high-beta stock multiples signals relative value or different horizons.',
    },
    {
      question: 'Oil "WTI above $80" event contract and CL futures hedge:',
      options: [
        'Use futures/options to delta-hedge event contract exposure',
        'Cannot relate',
        'Only parlays',
        'Requires sportsbook',
      ],
      correct: 0,
      explanation:
        'Same macro driver (supply/demand). Traders hedge prediction exposure with correlated futures leg.',
    },
    {
      question: 'Bitcoin price threshold markets and BTC perpetuals correlation is high because:',
      options: [
        'Same underlying spot/perp flow drives both',
        'Unrelated assets',
        'Only SEC regulates both',
        'No arbitrage ever',
      ],
      correct: 0,
      explanation:
        'Crypto event contracts track spot; perps offer hedge. Funding rates and vol matter for sizing.',
    },
    {
      question:
        'Term premium in rates markets vs "Fed cuts by date" contracts — divergence may mean:',
      options: [
        'Markets disagree on timing vs magnitude of easing',
        'Data error only',
        'No trade',
        'Only sports edge',
      ],
      correct: 0,
      explanation:
        'Path of cuts (how many, when) differs from terminal rate view. Cross-market analysis parses policy path.',
    },
    {
      question: 'Using VIX futures as hedge for "S&P down week" YES shares:',
      options: [
        'Adds convexity — VIX spikes when equities sell off',
        'Always loses',
        'Unrelated',
        'Banned',
      ],
      correct: 0,
      explanation:
        'Negative equity-beta of vol products offsets portfolio of bullish index NO or bearish event YES positions.',
    },
    {
      question: 'Labor market prediction contracts (unemployment threshold) tie to:',
      options: [
        'Consumer spending stocks, Fed policy, and wage-sensitive sectors',
        'Only tennis',
        'Stadium ads',
        'Parlay vig',
      ],
      correct: 0,
      explanation:
        'Jobs data moves rates and consumption. Multi-asset desks trade NFP week across preds, bonds, and FX.',
    },
    {
      question: 'Lead-lag between prediction markets and futures during fast macro prints:',
      options: [
        'Often futures move first (deepest liquidity); preds catch up in seconds',
        'Always preds first by minutes',
        'Never move',
        'Only crypto preds',
      ],
      correct: 0,
      explanation:
        'CME/es deep books absorb news first. Thin event contracts lag — short-lived arb for fastest infrastructure.',
    },
  ],

  'betting-advanced-5': [
    {
      question: "A market maker's primary profit source on a CLOB is:",
      options: [
        'Always betting directionally on news',
        'Bid-ask spread capture minus adverse selection losses',
        'Parlay commissions',
        'Account bonuses',
      ],
      correct: 1,
      explanation:
        'Makers provide liquidity, earn spread, and lose when informed flow moves price before they adjust quotes.',
    },
    {
      question: 'Inventory risk for a market maker holding excess YES shares:',
      options: [
        'Loses if event resolves YES',
        'Loses if price falls before resolution — must skew quotes to attract NO buyers',
        'No risk',
        'Only vig',
      ],
      correct: 1,
      explanation:
        'Long inventory = directional exposure. Makers lower YES ask / raise bid to mean-revert inventory toward neutral.',
    },
    {
      question: 'Adverse selection occurs when:',
      options: [
        'Takers know more than your stale quote — you fill losing side before repricing',
        'Spread is zero',
        'You only post bids',
        'Market closes',
      ],
      correct: 0,
      explanation:
        'Informed order flow picks off passive quotes. Wider spread or pull quotes when news uncertainty spikes.',
    },
    {
      question: 'Quote skew example: if maker is long YES, they typically:',
      options: [
        'Widen YES bid and tighten NO — encourage sales of YES to them',
        'Raise YES ask and lower YES bid to reduce further YES accumulation',
        'Stop quoting',
        'Only market buy',
      ],
      correct: 1,
      explanation:
        'Skew makes buying YES from maker harder and selling YES more attractive — rebalancing inventory.',
    },
    {
      question: 'Tick size on a 0–100¢ contract affects:',
      options: [
        'Minimum price increment — profitability of tight spread strategies at extreme prices',
        'Only sports',
        'Tax rate',
        'Parlay legs',
      ],
      correct: 0,
      explanation:
        'At 95¢, one tick is large % of edge. Makers adjust min spread by price level per exchange rules.',
    },
    {
      question: 'Maker rebate vs taker fee structure encourages:',
      options: [
        'More liquidity posting and less blind market sweeping',
        'Only parlays',
        'Higher vig',
        'Account closure',
      ],
      correct: 0,
      explanation:
        'Fee models shape who provides depth. Rebates subsidize tight markets; takers pay for immediacy.',
    },
    {
      question: 'Delta-neutral market making on binary near 50¢ aims to:',
      options: [
        'Profit from spread while keeping net outcome exposure near zero',
        'Max directional bet',
        'Avoid all quotes',
        'Only buy YES',
      ],
      correct: 0,
      explanation:
        'Continuous two-sided quoting with inventory caps approximates earning spread without betting on winner.',
    },
    {
      question: 'Volatility event (debate night) maker response is usually:',
      options: [
        'Widen spreads or pull quotes until uncertainty resolves',
        'Narrow to zero',
        'Double inventory blindly',
        'Ignore',
      ],
      correct: 0,
      explanation:
        'Gamma and news risk rise. Spreads compensate for jump risk; depth thins — takers pay more slippage.',
    },
    {
      question: 'Order book imbalance (heavy bids, thin asks) suggests:',
      options: [
        'Short-term upward pressure — makers may adjust mid upward',
        'Price must crash',
        'No information',
        'Parlay only',
      ],
      correct: 0,
      explanation:
        'Microstructure signals near-term demand. Not fundamental edge alone but input to quote placement.',
    },
    {
      question: 'Capital requirement for market making vs directional betting is higher because:',
      options: [
        'Inventory swings, margin, and multiple resting orders tie up collateral',
        'No capital needed',
        'Only one bet',
        'Books ban makers',
      ],
      correct: 0,
      explanation:
        'MM needs buffer for drawdowns, adverse selection streaks, and simultaneous two-sided resting size.',
    },
  ],

  'betting-advanced-6': [
    {
      question: 'Confirmation bias in betting leads to:',
      options: [
        'Seeking stats that support your existing pick while ignoring contradicting data',
        'Better CLV',
        'Automatic hedging',
        'Lower vig',
      ],
      correct: 0,
      explanation:
        'Bettors cherry-pick angles. Process discipline and pre-written criteria reduce bias.',
    },
    {
      question: "Gambler's fallacy is believing:",
      options: [
        'Past independent outcomes change future probability (e.g., "due" for red after blacks)',
        'EV is always positive',
        'Kelly is useless',
        'Books have no vig',
      ],
      correct: 0,
      explanation:
        'Roulette and fair coins have no memory. Sports have structure but "due" narratives often mislead.',
    },
    {
      question: 'Tilt after bad beat often causes:',
      options: [
        'Larger, less selective bets chasing losses — negative EV behavior',
        'Improved CLV',
        'Automatic bonus',
        'Book limits rise',
      ],
      correct: 0,
      explanation:
        'Emotional escalation breaks bankroll rules. Stop-loss rules and session limits are risk management for psychology.',
    },
    {
      question: 'Loss aversion explains why bettors may:',
      options: [
        'Hold losing futures tickets too long while hedging winners too early',
        'Always maximize EV',
        'Ignore spreads',
        'Never parlay',
      ],
      correct: 0,
      explanation:
        'Pain of realizing loss > pleasure of gain. Pre-commit hedge rules combat irrational hold.',
    },
    {
      question: 'Outcome bias judges bet quality by:',
      options: [
        'Result won/lost instead of whether decision had +EV at placement',
        'CLV only',
        'Closing line always',
        'Tax form',
      ],
      correct: 0,
      explanation:
        'Good process loses often. Review decisions vs outcomes to separate luck from skill.',
    },
    {
      question: 'Overconfidence after winning streak leads to:',
      options: [
        'Oversized bets and inflated true skill estimates',
        'Kelly shrinkage',
        'Lower variance',
        'Free vig',
      ],
      correct: 0,
      explanation:
        'Streaks happen by chance. Stick to fractional Kelly; streak does not increase true edge.',
    },
    {
      question: 'Anchoring to opening line when line moved 4 points means:',
      options: [
        'You fixate on obsolete number and miss current market fair value',
        'Better edge',
        'Guaranteed arb',
        'No effect',
      ],
      correct: 0,
      explanation:
        'Trade the price you can get now, not where it opened. Anchor bias causes chasing steam wrong way.',
    },
    {
      question: 'Pre-commitment devices (bet log, cooling-off period) help by:',
      options: [
        'Removing in-the-moment emotional overrides',
        'Increasing tilt',
        'Eliminating math',
        'Raising vig',
      ],
      correct: 0,
      explanation:
        'Writing thesis before bet and mandatory delay on live chasing reduces impulsive −EV tickets.',
    },
    {
      question: 'Sunk cost fallacy in parlay betting:',
      options: [
        'Adding legs because "already invested" instead of evaluating marginal EV of new leg',
        'Always +EV',
        'Required by books',
        'Lowers juice',
      ],
      correct: 0,
      explanation:
        'Each leg should stand alone. Past legs are sunk; only add if combined price still mispriced (rare).',
    },
    {
      question: 'Mindfulness of base rates (favorite wins X% historically) prevents:',
      options: [
        'Treating longshot narrative as 50/50 coin flip',
        'Using any data',
        'Betting favorites',
        'Tracking CLV',
      ],
      correct: 0,
      explanation:
        'Stories sell longshots. Base rates anchor realistic probabilities before narrative overrides.',
    },
  ],

  'betting-expert-1': [
    {
      question: 'Poisson-based totals model for soccer uses:',
      options: [
        'Independent Poisson goals for each team from attack/defense parameters',
        'Only final score last game',
        'Coin flip',
        'Parlay odds',
      ],
      correct: 0,
      explanation:
        'λ_home, λ_away from ratings → matrix of scorelines → over/under and BTTS probabilities.',
    },
    {
      question: 'Elo with home-field adjustment and margin-of-victory multiplier improves:',
      options: [
        'Spread estimates by reflecting where game was played and blowout information',
        'Only player props',
        'Vig',
        'Account limits',
      ],
      correct: 0,
      explanation:
        'HFA adds points to home rating; MoV multipliers speed rating updates (with caution on blowout noise).',
    },
    {
      question: 'Bayesian prior on team strength shrinks:',
      options: [
        'Early-season small samples toward league mean to avoid overreaction',
        'All data to zero',
        'Only closing line',
        'Parlay stake',
      ],
      correct: 0,
      explanation:
        'Priors stabilize week-1 ratings. Posterior blends prior + likelihood as games accumulate.',
    },
    {
      question: 'Player-level RAPM or tracking data in NBA models captures:',
      options: [
        'Individual contribution beyond box score — useful for injury substitution impact',
        'Only fouls',
        'Jersey sales',
        'Vig',
      ],
      correct: 0,
      explanation:
        'On/off and tracking isolate player impact. Star out → adjust spread/total via minutes-weighted replacement.',
    },
    {
      question: 'Monte Carlo simulation for parlay or same-game correlation:',
      options: [
        'Draws joint outcomes from correlated model instead of multiplying independent probs',
        'Always independent',
        'Banned',
        'Only for coin toss',
      ],
      correct: 0,
      explanation:
        'SGP legs correlate (team wins → player yards). Independence overstates parlay hit rate and misprices hedge.',
    },
    {
      question: 'Closing line as benchmark in quant sports betting implies skill if:',
      options: [
        'Model systematically beats devigged Pinnacle close over 1000+ bets',
        'Win rate > 50%',
        'One good weekend',
        'Parlay hits',
      ],
      correct: 0,
      explanation:
        'Pinnacle close is efficient reference. Persistent CLV beats are industry standard for syndicate validation.',
    },
    {
      question: 'Kelly with parameter uncertainty should use:',
      options: [
        'Fractional Kelly (¼–½) or Bayesian Kelly shrinkage',
        'Full Kelly always',
        'Double bankroll bets',
        'No bankroll',
      ],
      correct: 0,
      explanation:
        'Model error widens true edge distribution. Full Kelly overbets and increases ruin probability.',
    },
    {
      question: 'In-play model latency edge comes from:',
      options: [
        'Faster fair price update than market after observable events (injury, red card)',
        'Delayed TV stream betting',
        'Only pregame',
        'Higher vig',
      ],
      correct: 0,
      explanation:
        'Quants with sub-second data feeds reprice before books adjust — shrinking but real at softer books.',
    },
    {
      question: 'Hierarchical model for league strength (e.g., EPL teams nested):',
      options: [
        'Shares information across teams — stabilizes ratings for promoted clubs',
        'Each team isolated only',
        'No shrinkage',
        'Only futures',
      ],
      correct: 0,
      explanation:
        'Partial pooling borrows strength from league context — better early-season estimates for new entrants.',
    },
    {
      question: 'Execution alpha separate from model alpha means:',
      options: [
        'Getting better fills and limits matters even with same predictions',
        'Only picks matter',
        'Vig zero',
        'No CLV',
      ],
      correct: 0,
      explanation:
        'Line shopping, multi-book, and limit placement add ROI beyond raw win probability accuracy.',
    },
  ],

  'betting-expert-2': [
    {
      question: 'CLOB API integration for prediction market tools needs:',
      options: [
        'Authentication, order signing, rate limits, and idempotent order IDs',
        'Only HTML scraping',
        'No error handling',
        'Parlay builder only',
      ],
      correct: 0,
      explanation:
        'Production bots handle retries, partial fills, websocket feeds, and key security (HSM, env vars).',
    },
    {
      question: 'Websocket feed vs REST polling for odds:',
      options: [
        'Websocket lower latency and less load for real-time book updates',
        'REST always faster',
        'No difference',
        'Only email alerts',
      ],
      correct: 0,
      explanation:
        'Sub-second arb and MM need push updates. REST fine for slow research, not HFT-style preds.',
    },
    {
      question: 'Backtesting prediction market strategy must model:',
      options: [
        'Fees, spread, partial fills, and resolution rules — not mid price only',
        'Mid only always',
        'Free fills',
        'Ignore voids',
      ],
      correct: 0,
      explanation:
        'Paper mid overstates P&L. Simulate taking liquidity at ask/bid with historical book snapshots if available.',
    },
    {
      question: 'Smart contract interaction risk when building on-chain tools includes:',
      options: [
        'ABI changes, approval exploits, and failed txs — test on testnet',
        'Only CSS bugs',
        'No audits needed',
        'Guaranteed profit',
      ],
      correct: 0,
      explanation:
        'Use audited contracts, minimal allowances, and simulation (Tenderly) before mainnet size.',
    },
    {
      question: 'Alert pipeline: model edge > threshold →',
      options: [
        'Push notification / auto-limit order at max acceptable price',
        'Blind market order always',
        'Ignore',
        'Only tweet',
      ],
      correct: 0,
      explanation:
        'Human-in-loop or auto-trader posts limits at pre-computed fair minus buffer; avoids stale market sweeps.',
    },
    {
      question: 'Database schema for bet tracker should store:',
      options: [
        'Immutable ticket ID, odds, stake, book, timestamp, CLV snapshot, model prob',
        'Only W/L',
        'Colors',
        'Parlay memes',
      ],
      correct: 0,
      explanation:
        'Analytics and audit require structured fields. Enables SQL aggregation by market and CLV regression.',
    },
    {
      question: 'Kalshi API rate limits imply:',
      options: [
        'Batch requests and exponential backoff on 429 errors',
        'Unlimited spam',
        'No queue',
        'Scrape instead always',
      ],
      correct: 0,
      explanation:
        'Respect exchange rules or keys get throttled/banned. Queue orders and prioritize edge size.',
    },
    {
      question: 'Paper trading mode in custom tools helps:',
      options: [
        'Validate logic without capital before live slippage and emotions',
        'Guarantee live profits',
        'Skip testing',
        'Raise vig',
      ],
      correct: 0,
      explanation:
        'Log hypothetical fills at realistic prices. Transition to small size live before scale.',
    },
    {
      question: 'Open-source vs proprietary model stack tradeoff:',
      options: [
        'OSS speeds collaboration but exposes edge; secrecy protects but slows iteration',
        'Always publish live edges',
        'No tradeoff',
        'Only Excel',
      ],
      correct: 0,
      explanation:
        'Syndicates guard features; indie may use public data + unique feature engineering for niche markets.',
    },
    {
      question: 'Monitoring dashboard for market-making bot tracks:',
      options: [
        'Inventory, spread, fill rate, adverse selection P&L, and API latency',
        'Only Twitter followers',
        'Jersey sales',
        'Parlay count',
      ],
      correct: 0,
      explanation:
        'Real-time ops metrics prevent blowups. Alerts on inventory caps and disconnects are mandatory.',
    },
  ],

  'betting-expert-3': [
    {
      question:
        'In the US, CFTC-regulated event contracts (Kalshi) differ from state sports wagering because:',
      options: [
        'Federal derivatives framework vs state-by-state gaming licenses for traditional sportsbooks',
        'Identical regulation',
        'No rules anywhere',
        'Only offshore legal',
      ],
      correct: 0,
      explanation:
        'Event contracts are commodity-style under CFTC; sportsbooks need state gaming approvals. Compliance paths differ.',
    },
    {
      question: 'UIGEA (2006) primarily targeted:',
      options: [
        'Payment processing for unlawful internet gambling — not bettors directly in text',
        'Prediction market CFTC contracts',
        'Stock trading',
        'Fantasy only',
      ],
      correct: 0,
      explanation:
        'UIGEA restricted financial transactions to illegal online gambling operators. State law still defines what is unlawful.',
    },
    {
      question: 'PASPA repeal (2018) enabled:',
      options: [
        'States to legalize sports betting individually',
        'Federal ban on all betting',
        'CFTC to ban Kalshi',
        'Offshore-only market',
      ],
      correct: 0,
      explanation:
        'Murphy v NCAA struck PASPA. States now license operators; landscape is patchwork.',
    },
    {
      question: 'Offshore sportsbook legal risk for US residents includes:',
      options: [
        'Violation of state law, payment fraud risk, and no US regulatory recourse',
        'FDIC insurance',
        'Guaranteed tax-free',
        'CFTC protection',
      ],
      correct: 0,
      explanation:
        'Offshore books operate outside US licensing. Funds and dispute resolution are weaker; legality varies by state.',
    },
    {
      question: 'KYC/AML requirements on regulated exchanges exist to:',
      options: [
        'Prevent money laundering and verify identity for tax and compliance',
        'Increase vig only',
        'Ban winners',
        'Eliminate hedging',
      ],
      correct: 0,
      explanation:
        'Regulated venues must collect ID, report suspicious activity, and issue tax forms where applicable.',
    },
    {
      question: 'Tax treatment of betting winnings in the US generally:',
      options: [
        'Taxable income — must be reported; losses may offset up to winnings with documentation',
        'Always tax-free',
        'Only professionals pay',
        'Deductible without limit always',
      ],
      correct: 0,
      explanation:
        'IRS treats gambling winnings as income. Professional status has stricter tests; keep detailed records.',
    },
    {
      question: 'Polymarket US access restrictions relate to:',
      options: [
        'Regulatory jurisdiction — offshore crypto platforms may geo-block US persons',
        'No restrictions ever',
        'Only age 16',
        'SEC stock rule',
      ],
      correct: 0,
      explanation:
        'Compliance varies by entity and contract. US persons face evolving access rules; use licensed US venues when required.',
    },
    {
      question: 'Insider trading laws on securities vs prediction markets:',
      options: [
        'SEC insider rules apply to stocks; event contracts may use different manipulation/disclosure standards under CFTC',
        'Identical everywhere',
        'No rules on any market',
        'Only for sports',
      ],
      correct: 0,
      explanation:
        'Material nonpublic info on regulated preds may still be prohibited. Case law and exchange rules evolving.',
    },
    {
      question: 'Responsible gaming regulations often require:',
      options: [
        'Self-exclusion programs, deposit limits, and problem-gambling resources',
        'Unlimited credit',
        'Mandatory parlays',
        'No age check',
      ],
      correct: 0,
      explanation:
        'Licensed operators must implement RG tools. Serious bettors still benefit from personal limits.',
    },
    {
      question: 'State gaming commission role includes:',
      options: [
        'Licensing operators, auditing fairness, and enforcing consumer protection',
        'Setting NFL lines',
        'Printing money',
        'Running sports teams',
      ],
      correct: 0,
      explanation:
        'Commissions approve vendors, test geolocation compliance, and investigate disputes on licensed books.',
    },
  ],

  'betting-expert-4': [
    {
      question: 'Professional betting bankroll sizing often starts with:',
      options: [
        '200–500+ units and max 1–2% per play for survival through variance',
        'Entire net worth per bet',
        'No reserve',
        'Credit cards',
      ],
      correct: 0,
      explanation:
        'Pros treat betting as business with dedicated bankroll separate from living expenses and multi-year runway.',
    },
    {
      question: 'Syndicate structure typically involves:',
      options: [
        'Capital partners, model team, and execution traders with agreed profit split',
        'Solo only always',
        'Public Twitter picks',
        'No contracts',
      ],
      correct: 0,
      explanation:
        'Legal agreements define equity, draw rules, and roles. Transparency on CLV and P&L splits disputes.',
    },
    {
      question: 'Soft book vs sharp book in business model:',
      options: [
        'Soft books take recreational action; sharps extract CLV until limited',
        'All books unlimited sharps',
        'No difference',
        'Only parlays',
      ],
      correct: 0,
      explanation:
        'Pros cultivate multiple soft accounts via proxies/partners while using Pinnacle for true price discovery.',
    },
    {
      question: 'BE percentage (break-even win rate) at −110 is approximately:',
      options: ['52.38%', '50%', '60%', '45%'],
      correct: 0,
      explanation:
        'Business planning uses required win rate per market type. Props at −120 need higher BE.',
    },
    {
      question: 'Operational costs for pro betting include:',
      options: [
        'Data feeds, software, employees, account fees, and taxes — not just vig',
        'Only subscription to one tipster',
        'Nothing',
        'Stadium tickets only',
      ],
      correct: 0,
      explanation: 'P&L net of all opex determines business viability. Cheap data may cost edge.',
    },
    {
      question: 'Account longevity strategies (without advocating fraud) legally include:',
      options: [
        'Round betting, varied bet types, and not max-betting every edge to avoid profiling',
        'Identity theft',
        'Collusion with athletes',
        'Fixed matches',
      ],
      correct: 0,
      explanation:
        'Books limit winners. Diversifying appearance and using exchanges reduces single-point failure — stay within law.',
    },
    {
      question: 'ROI target for sustainable pro operation might be:',
      options: [
        '3–7% on turnover long-term at scale — high but not Hollywood 50%',
        '100% monthly guaranteed',
        '0% always',
        'Only parlays',
      ],
      correct: 0,
      explanation:
        'At scale, 5% ROI on millions handle is excellent. Unrealistic targets drive overbetting and ruin.',
    },
    {
      question: 'Legal entity (LLC) for betting business helps with:',
      options: [
        'Accounting separation, tax planning, and partner agreements — consult CPA/lawyer',
        'Guaranteed wins',
        'Bypass all KYC',
        'SEC registration',
      ],
      correct: 0,
      explanation:
        'Structure depends on jurisdiction and pro vs hobby classification. Not a license to evade gaming law.',
    },
    {
      question: 'Downswing protocol for funded squad:',
      options: [
        'Predefined reduce-size rules, model review, no discretionary doubling',
        'Double until broke',
        'Fire model after 5 losses',
        'Public chase on Twitter',
      ],
      correct: 0,
      explanation:
        'Business continuity plans prevent emotional escalation. Review if CLV disappears, not after random 2σ loss.',
    },
    {
      question: 'Transition from hobby to pro requires:',
      options: [
        'Documented CLV edge, bankroll runway, legal compliance, and net P&L after tax/opex',
        'One good month',
        '10 parlay wins',
        'Influencer followers',
      ],
      correct: 0,
      explanation:
        'Profession is proven process + capital + infrastructure. Short-term luck insufficient.',
    },
  ],

  'commodities-intermediate-1': [
    {
      question: 'A futures contract obligates the holder to:',
      options: [
        'Buy or sell a standardized quantity at a set price on a future date (or cash-settle)',
        'Receive dividends forever',
        'Own physical storage automatically',
        'Trade only spot',
      ],
      correct: 0,
      explanation:
        'Futures are forward commitments on exchanges (CME, ICE). Most financial players close or roll before delivery.',
    },
    {
      question: 'Initial margin on futures is:',
      options: [
        'Good-faith deposit — not full notional — marking to market daily',
        'Full contract value upfront always',
        'Optional',
        'Paid only on profit',
      ],
      correct: 0,
      explanation:
        'Leverage comes from margin fraction of notional. Daily mark-to-market adjusts account for price moves.',
    },
    {
      question: 'Contango means futures price is:',
      options: [
        'Above expected spot (carry costs dominate)',
        'Below spot always',
        'Equal to spot always',
        'Unrelated to storage',
      ],
      correct: 0,
      explanation:
        'Storage, insurance, and financing embed in deferred months. Long ETFs in contango suffer roll decay.',
    },
    {
      question: 'Backwardation occurs when:',
      options: [
        'Near futures trade above deferred — often tight supply near term',
        'Supply is infinite',
        'Only gold can backwardate',
        'Roll yield is always negative',
      ],
      correct: 0,
      explanation:
        'Backwardation favors long futures roll (buy cheap deferred, sell rich front). Common in oil tightness.',
    },
    {
      question: 'Contract "tick size" for crude oil (CL) is typically:',
      options: [
        '$0.01 per barrel = $10 per 1,000 bbl contract',
        '$1 per barrel',
        'One cent total',
        'No minimum',
      ],
      correct: 0,
      explanation: '1,000 barrels × $0.01 = $10/tick. Know tick value for risk and stop placement.',
    },
    {
      question: 'Rolling a futures position means:',
      options: [
        'Closing near expiry and opening next liquid month',
        'Holding through delivery always',
        'Converting to stock',
        'Ignoring expiry',
      ],
      correct: 0,
      explanation:
        'Traders roll to maintain exposure without taking delivery. Roll cost = spread between months.',
    },
    {
      question: 'First Notice Day matters because:',
      options: [
        'Long may be assigned delivery notice — many retail close before this',
        'Nothing happens',
        'Only shorts affected',
        'Contract expires same day',
      ],
      correct: 0,
      explanation:
        'Physical commodities have delivery process. Failure to exit can mean storage obligations.',
    },
    {
      question: 'Notional value of one WTI contract at $75/bbl is:',
      options: ['$75,000 (1,000 bbl)', '$7,500', '$750,000', '$75'],
      correct: 0,
      explanation:
        'Notional = price × multiplier. Margin is fraction of this — leverage magnifies P&L %.',
    },
    {
      question: 'Cash-settled vs physically-settled futures:',
      options: [
        'Cash settle to index at expiry; physical requires delivery logistics',
        'Identical for traders always',
        'Only crypto uses cash',
        'Physical is always default for indices',
      ],
      correct: 0,
      explanation:
        'Many financial commodities cash-settle (e.g., some indices). Grains and oil are physically settled on CME.',
    },
    {
      question: 'Hedger vs speculator in futures markets:',
      options: [
        'Hedger offsets commercial price risk; speculator provides liquidity seeking profit',
        'Same role',
        'Hedgers only trade stocks',
        'Speculators always deliver trucks',
      ],
      correct: 0,
      explanation:
        'Commercials (airlines, farmers) hedge. Speculators take other side — regulators monitor positioning.',
    },
  ],

  'commodities-intermediate-2': [
    {
      question: 'A candlestick "doji" after a long rally in oil may signal:',
      options: [
        'Indecision — potential reversal if confirmed by volume and next session',
        'Guaranteed crash',
        'Nothing',
        'Only bullish continuation',
      ],
      correct: 0,
      explanation:
        'Doji shows open≈close. Context matters — need trend, support/resistance, and inventory data confirmation.',
    },
    {
      question: 'Support level on a copper chart is:',
      options: [
        'Price zone where buying historically emerged — breaks may accelerate selling',
        'Government mandate',
        'Random line',
        'Only for stocks',
      ],
      correct: 0,
      explanation:
        'Technicals map psychology and positioning. Fundamentals (China demand) still drive breaks of key levels.',
    },
    {
      question: 'RSI above 70 on gold daily chart indicates:',
      options: [
        'Overbought momentum — not automatic short; trends can stay overbought in crises',
        'Must buy',
        'Bear market start',
        'Irrelevant for commodities',
      ],
      correct: 0,
      explanation:
        'RSI is oscillator context. War premium can keep RSI elevated weeks — combine with structure.',
    },
    {
      question: 'Volume spike on breakout above range in natural gas often:',
      options: [
        'Confirms participation — false breakouts show weak volume',
        'Means nothing',
        'Guarantees reversal',
        'Only for equities',
      ],
      correct: 0,
      explanation:
        'NG is volatile; volume validates move. Low-volume breaks often fade back into range.',
    },
    {
      question: 'Moving average crossover (50 crossing 200) on corn is:',
      options: [
        'Lagging signal — late but popular for trend following systems',
        'Leading indicator of USDA report',
        'Illegal',
        'Same as contango',
      ],
      correct: 0,
      explanation:
        'MA crossovers lag price. CTAs use them with risk controls; not sole fundamental thesis.',
    },
    {
      question: 'Chart pattern "head and shoulders" top in silver implies:',
      options: [
        'Trend reversal potential — neckline break triggers measured move target',
        'Immediate delivery notice',
        'Mine shutdown',
        'Only bullish',
      ],
      correct: 0,
      explanation:
        'Classic reversal pattern. Confirm with dollar, real yields, and industrial demand fundamentals.',
    },
    {
      question: 'Fibonacci retracement 61.8% bounce in wheat often used by traders to:',
      options: [
        'Identify pullback entry in trend — self-fulfilling to degree',
        'Predict USDA acreage',
        'Set margin rates',
        'Replace COT report',
      ],
      correct: 0,
      explanation:
        'Fib levels are tool not law. Weather bull markets can blow through retracements.',
    },
    {
      question: 'Open interest rising with price in crude futures suggests:',
      options: [
        'New money entering longs (or shorts covering) — trend may have fuel',
        'Market closed',
        'Only shorts exist',
        'Roll only',
      ],
      correct: 0,
      explanation:
        'OI + price direction parses long/short initiation. Falling OI rally = short covering not new demand.',
    },
    {
      question: 'Weekly COT report chart overlay helps commodity traders see:',
      options: [
        'Managed money net positioning extremes — contrarian at tails',
        'Exact mine output daily',
        'Shipping rates only',
        'Fed minutes',
      ],
      correct: 0,
      explanation:
        'CFTC Commitments of Traders show commercial vs spec nets. Extremes can precede reversals.',
    },
    {
      question: 'Multi-timeframe analysis for soybeans means:',
      options: [
        'Align weekly trend with daily entry — avoid counter-trend scalps on report day',
        'Only 1-minute charts',
        'Ignore fundamentals',
        'Charts replace USDA',
      ],
      correct: 0,
      explanation:
        'Higher timeframe defines bias; lower for execution. WASDE days need wider stops.',
    },
  ],

  'commodities-intermediate-3': [
    {
      question: 'Brent vs WTI spread widens when:',
      options: [
        'North Sea/Atlantic basin tight vs US inland glut or transport bottlenecks',
        'They must always equal',
        'Only OPEC decides spread',
        'Gold correlates',
      ],
      correct: 0,
      explanation:
        'Regional supply/demand and freight drive Brent-WTI. Traders arb and trade spread futures.',
    },
    {
      question: 'OPEC+ production cut announcement typically affects:',
      options: [
        'Prompt crude grades and backwardation more than distant years initially',
        'Only natural gas',
        'Corn basis',
        'VIX only',
      ],
      correct: 0,
      explanation:
        'Supply cuts tighten near curve. Compliance cheating and demand fear modulate sustained impact.',
    },
    {
      question: 'Henry Hub natural gas price spikes often driven by:',
      options: [
        'Cold weather forecasts, LNG export demand, and storage vs 5-year average',
        'Only oil OPEC',
        'Gold lease rates',
        'Wheat harvest',
      ],
      correct: 0,
      explanation: 'NG is local weather and storage story. Polar vortex can move NG 20%+ in days.',
    },
    {
      question: 'Crack spread (3:2:1) measures:',
      options: [
        'Refining margin — crude vs gasoline + heating oil products',
        'Oil minus gold',
        'Pipeline tariff only',
        'Wind power output',
      ],
      correct: 0,
      explanation:
        'Refiners hedge crack. Wide crack = strong refining demand; narrow = margin compression.',
    },
    {
      question: 'Strategic Petroleum Reserve (SPR) release affects market by:',
      options: [
        'Adding supply — can cap prompt spikes but may not fix structural deficit',
        'Permanent demand destruction',
        'Only Brent',
        'Eliminating futures',
      ],
      correct: 0,
      explanation: 'SPR is policy tool. Market prices timing, volume, and refill expectations.',
    },
    {
      question: 'LNG netback pricing links US gas to:',
      options: [
        'Global gas via JKM/TTF — export arb when US price low vs Asia/Europe',
        'Only local weather',
        'Corn ethanol',
        'Silver mine costs',
      ],
      correct: 0,
      explanation:
        'LNG terminals connect Henry Hub to world gas. Arbitrage limits regional divergence long-term.',
    },
    {
      question: 'Renewable build-out long-term can:',
      options: [
        'Cap coal demand and shift oil demand growth — structural energy transition theme',
        'Eliminate all oil tomorrow',
        'Remove all commodity trading',
        'Only affect equities',
      ],
      correct: 0,
      explanation:
        'Transition is decades. Oil/gas still trade on cyclical and geopolitical shocks within trend.',
    },
    {
      question: 'Iran sanctions tightening usually:',
      options: [
        'Removes barrels from market — bullish risk premium on Brent',
        'Bearish oil always',
        'Only affects gas',
        'Lowers gold',
      ],
      correct: 0,
      explanation: 'Supply disruption premium. Enforcement and cheat barrels determine magnitude.',
    },
    {
      question: 'US rig count rising with flat oil price may signal:',
      options: [
        'Efficiency gains or shale breakeven drop — bearish supply response over time',
        'Immediate shortage',
        'Only bullish',
        'No supply effect',
      ],
      correct: 0,
      explanation:
        'More rigs → more production with lag. Market weighs vs demand growth and decline rates.',
    },
    {
      question: 'Diesel shortage (gasoil) in Europe impacts:',
      options: [
        'Heating oil and distillate cracks — freight and agriculture fuel costs',
        'Only gold',
        'Soybeans directly',
        'Fed funds',
      ],
      correct: 0,
      explanation:
        'Distillates move economies. Crack spreads and inventory reports are key energy watch items.',
    },
  ],

  'commodities-intermediate-4': [
    {
      question: 'Gold often inversely correlates with:',
      options: [
        'Real interest rates (TIPS yields) — higher real rates raise opportunity cost of gold',
        'Oil always positively',
        'All currencies equally always',
        'Only wheat',
      ],
      correct: 0,
      explanation:
        'No yield on gold vs real return on bonds. Rising real yields historically pressure gold.',
    },
    {
      question: "Silver's dual role means:",
      options: [
        'Monetary safe-haven plus industrial demand (solar, electronics) — more volatile than gold',
        'Only jewelry',
        'No industrial use',
        'Tracks corn',
      ],
      correct: 0,
      explanation:
        'Silver beta to growth higher. Green energy demand is structural bull case; recession hits industrial leg.',
    },
    {
      question: 'Platinum group metals (PGM) supply concentrated in:',
      options: [
        'South Africa / Russia — geopolitical and labor risk premium',
        'Iowa',
        'Only recycled',
        'China exclusively',
      ],
      correct: 0,
      explanation: 'Auto catalyst demand and supply shocks move platinum/palladium sharply.',
    },
    {
      question: 'Gold ETF (GLD) holdings change indicates:',
      options: [
        'Investment demand flow — rising holdings often bullish sentiment',
        'Mine output daily',
        'Central bank sales only',
        'Oil inventory',
      ],
      correct: 0,
      explanation:
        'ETF flows proxy institutional allocation. Not perfect vs physical but watched widely.',
    },
    {
      question: 'COMEX vs LBMA gold price divergence can create:',
      options: [
        'Arbitrage and delivery stress narratives — watch lease rates and spreads',
        'Nothing',
        'Only silver effect',
        'Ban on futures',
      ],
      correct: 0,
      explanation:
        'Physical tightness shows in loco spreads. Futures lead but physical confirms shortage.',
    },
    {
      question: 'Central bank gold buying (China, Poland) generally:',
      options: [
        'Supports long-term floor on prices — de-dollarization reserve diversification theme',
        'Bearish gold',
        'Only affects silver',
        'Eliminates volatility',
      ],
      correct: 0,
      explanation:
        'Official sector is price-insensitive buyer. Cumulative tonnage matters over years.',
    },
    {
      question: 'Inflation hedge debate for gold: strongest when:',
      options: [
        'Real rates fall and inflation uncertainty rises — stagflation fear',
        'Deflation and rising real yields',
        'Only when stocks rally',
        'Never',
      ],
      correct: 0,
      explanation:
        'Gold shines when fiat purchasing power concern rises and bonds fail to protect.',
    },
    {
      question: 'Gold/silver ratio at 90 vs historical 60 may prompt traders to:',
      options: [
        'Pair trade long silver / short gold on mean reversion thesis',
        'Ignore both',
        'Only buy platinum',
        'Short both always',
      ],
      correct: 0,
      explanation:
        'Ratio trades are relative value. Industrial bust can keep ratio extended — risk management required.',
    },
    {
      question: 'Jewelry demand for gold is largest in:',
      options: [
        'India and China — festival and wedding seasons move regional premiums',
        'Antarctica',
        'Only US ETFs',
        'Natural gas hubs',
      ],
      correct: 0,
      explanation:
        'Physical demand seasons affect local premiums vs LBMA. Macro still dominates futures.',
    },
    {
      question: 'Miner equity (GDX) vs gold futures leverage:',
      options: [
        'Equities have operational risk — can underperform gold in cost inflation',
        'Always 1:1',
        'No correlation',
        'Only bearish',
      ],
      correct: 0,
      explanation:
        'Miners are beta on gold with credit, labor, and jurisdiction risk. Not pure exposure.',
    },
  ],

  'commodities-intermediate-5': [
    {
      question: 'USDA WASDE report moves grain markets because:',
      options: [
        'It revises global supply/demand balance — acreage, yield, stocks-to-use',
        'Sets oil OPEC quota',
        'Only affects cattle',
        'Fixed prices legally',
      ],
      correct: 0,
      explanation:
        'Surprise vs trade guess on ending stocks drives limit-up/down moves in corn, beans, wheat.',
    },
    {
      question: 'Corn ethanol mandate (RFS) links corn to:',
      options: [
        'Gasoline demand and oil prices indirectly — energy policy cross-impact',
        'Gold only',
        'Silver industrial',
        'LNG only',
      ],
      correct: 0,
      explanation:
        'Mandated ethanol grind supports corn demand. Oil crash can reduce gasoline blending economics.',
    },
    {
      question: 'Soybean crush margin means:',
      options: [
        'Value of meal + oil minus bean cost — processor profitability',
        'Oil minus gas spread',
        'Gold minus silver',
        'Freight only',
      ],
      correct: 0,
      explanation: 'High crush encourages processing. China hog herd recovery boosts meal demand.',
    },
    {
      question: 'La Niña weather pattern often associated with:',
      options: [
        'US Plains dryness risk — bullish wheat/corn volatility',
        'Guaranteed record crops always',
        'Only bearish ag',
        'No weather impact',
      ],
      correct: 0,
      explanation:
        'ENSO shifts global rainfall. South America soy crop also sensitive — watch Brazil forecasts.',
    },
    {
      question: 'Basis in local grain markets is:',
      options: [
        'Cash price minus futures — reflects local supply/demand vs board',
        'Same as contango always',
        'Fed funds spread',
        'Only for oil',
      ],
      correct: 0,
      explanation: 'Weak basis = local surplus vs futures. Strong basis = tight local supplies.',
    },
    {
      question: 'Hog/cattle futures react to:',
      options: [
        'Feed costs (corn), disease outbreaks, and consumer meat demand',
        'Only gold',
        'SPR releases',
        'VIX',
      ],
      correct: 0,
      explanation:
        'Livestock is margin story. African swine fever in China moved global protein trade flows.',
    },
    {
      question: 'Coffee frost in Brazil can:',
      options: [
        'Spike arabica futures limit-up — weather binary risk',
        'Only affect tea',
        'Lower oil',
        'Fix corn basis',
      ],
      correct: 0,
      explanation:
        'Coffee is concentrated geography risk. Frost headlines cause violent short-covering.',
    },
    {
      question: 'Cotton prices tie to:',
      options: [
        'Textile demand, competing synthetic fiber, and acreage vs grains',
        'Only oil rigs',
        'TIPS yields only',
        'Coal',
      ],
      correct: 0,
      explanation: 'Cotton is ag + macro China consumption. Dollar strength weighs on exports.',
    },
    {
      question: 'Black Sea grain corridor disruptions primarily hit:',
      options: [
        'Wheat and corn export flows — global food security premium',
        'Gold lease',
        'Natural gas Henry Hub only',
        'PGM',
      ],
      correct: 0,
      explanation:
        'Ukraine/Russia export share moves world prices. Freight insurance spikes add cost.',
    },
    {
      question: 'Crop insurance and planted acres report (Prospective Plantings) sets:',
      options: [
        'Early season supply expectations before growing season weather',
        'OPEC quota',
        'Fed dot plot',
        'Only livestock',
      ],
      correct: 0,
      explanation:
        'March acres guide balance sheets. Deviations from trend shift new-crop spreads.',
    },
  ],

  'commodities-intermediate-6': [
    {
      question: 'Middle East tanker attack risk premium mainly impacts:',
      options: [
        'Brent and insurance costs on Strait of Hormuz flows',
        'Corn silos only',
        'US hog futures',
        'Gold negatively always',
      ],
      correct: 0,
      explanation:
        'Geopolitical supply fear spikes oil vol. Duration depends on alternative routes and SPR response.',
    },
    {
      question: 'Russia pipeline gas cut to Europe historically moved:',
      options: [
        'TTF gas and coal substitute demand — energy security repricing',
        'Soybeans only',
        'Cotton',
        'Copper mine grades',
      ],
      correct: 0,
      explanation:
        '2022 energy crisis showed geopolitics rewiring trade. LNG imports replaced pipe gas.',
    },
    {
      question: 'Chile copper supply risk (strikes, constitution debates) affects:',
      options: [
        'Global copper price — Chile large share of mine supply',
        'Wheat basis',
        'Henry Hub',
        'Lean hogs',
      ],
      correct: 0,
      explanation:
        'Copper is electrification metal. Supply disruption + green demand = bullish reflex.',
    },
    {
      question: 'US-China tariffs on agricultural goods can:',
      options: [
        'Shift export destinations and basis — Brazil gains share',
        'Eliminate all trade',
        'Only help US farmers always',
        'Fix gold ratio',
      ],
      correct: 0,
      explanation:
        'Trade war reroutes soy to Brazil. Currency and logistics adjust global arb flows.',
    },
    {
      question: 'Sanctions on Russian metals (aluminum, nickel) caused:',
      options: [
        'Exchange chaos and short squeezes — LME nickel limit event',
        'Nothing in markets',
        'Only oil down',
        'Corn surplus',
      ],
      correct: 0,
      explanation:
        'Geopolitical exclusion removes supply from normal market. Exchange must manage disorderly moves.',
    },
    {
      question: 'Red Sea shipping attacks raise:',
      options: [
        'Freight rates and delay premiums on goods — oil and container costs',
        'Only gold negatively',
        'USDA acres',
        'VIX only equities',
      ],
      correct: 0,
      explanation:
        'Suez diversion adds time and fuel. Inflationary supply chain shock crosses commodities.',
    },
    {
      question: 'Dollar strength after geopolitical flight-to-safety often:',
      options: [
        'Pressures dollar-priced commodities (gold, oil) despite conflict',
        'Always bullish all commodities',
        'Only helps EM currencies',
        'No FX link',
      ],
      correct: 0,
      explanation:
        'USD denomination effect: strong dollar = cheaper for non-US buyers → demand headwind.',
    },
    {
      question: 'Strategic mineral nationalism (lithium, rare earths) leads to:',
      options: [
        'Friend-shoring and price premiums on secure supply chains',
        'Elimination of EVs',
        'Only bearish oil',
        'Wheat only',
      ],
      correct: 0,
      explanation:
        'Governments subsidize domestic mining. Geopolitics adds cost to energy transition metals.',
    },
    {
      question: 'Iran-Israel escalation risk trade often includes:',
      options: [
        'Long oil vol, Brent calls, and gold — hedge tail scenarios',
        'Short all energy always',
        'Only corn',
        'Ignore headers',
      ],
      correct: 0,
      explanation:
        'Tail hedges are insurance not directional certainty. Vol crush if de-escalation fast.',
    },
    {
      question: 'Embargo on Venezuelan crude historically:',
      options: [
        'Redirected flows and quality discounts — USGC refinery adjustments',
        'Zero global oil price effect',
        'Only agricultural',
        'Fed rate cut',
      ],
      correct: 0,
      explanation: 'Sanctions fragment markets. Heavy sour crude slate shifts refinery economics.',
    },
  ],

  'commodities-advanced-1': [
    {
      question: 'Spread trading crude calendar (buy Dec / sell Jun) is a bet on:',
      options: [
        'Term structure — contango/backwardation shift vs flat price direction',
        'Only spot',
        'Dividends',
        'USDA stocks',
      ],
      correct: 0,
      explanation:
        'Calendar spreads isolate curve. Inventory draws steepen backwardation — bull spread for long near/short deferred.',
    },
    {
      question: 'Margin offset for correlated spreads on CME:',
      options: [
        'Lower margin than outright legs — exchange recognizes partial hedge',
        'Double margin',
        'No margin',
        'Only stocks',
      ],
      correct: 0,
      explanation:
        'Spread margins reflect reduced vol. Still risk if correlation breaks in stress.',
    },
    {
      question: 'Limit-up limit-down in ag futures exists to:',
      options: [
        'Pause disorderly moves — may halt trading expanding ranges next session',
        'Guarantee profits',
        'Only for oil',
        'Replace clearing',
      ],
      correct: 0,
      explanation:
        'Circuit breakers manage gap risk. Traders plan for locked limit markets unable to exit.',
    },
    {
      question: 'Stop order in thin overnight session risk:',
      options: [
        'Slippage far beyond stop level — gap through stop',
        'Perfect fill always',
        'No risk',
        'Only for equities',
      ],
      correct: 0,
      explanation:
        'Commodity overnight liquidity thin. Stops become market orders at worse prices.',
    },
    {
      question: 'Delta of futures position is always:',
      options: [
        '1 per contract (linear) vs options non-linear',
        '0.5',
        'Variable with IV',
        'Negative only',
      ],
      correct: 0,
      explanation: 'Futures P&L moves 1:1 with underlying. Options need Greeks for hedge ratios.',
    },
    {
      question: 'Clearinghouse role in futures:',
      options: [
        'Central counterparty — mutualizes default risk, marks margin daily',
        'Only matchmaking',
        'Sets OPEC quota',
        'Prints money',
      ],
      correct: 0,
      explanation: 'CME clearing guarantees performance. Member firms post default funds.',
    },
    {
      question: 'Brent-WTI arb trader monitors:',
      options: [
        'Freight, US export capacity, and Midland differentials',
        'Only corn basis',
        'Fed dot plot only',
        'Silver ratio',
      ],
      correct: 0,
      explanation:
        'Arb closes when transport economics align. Infrastructure changes shift fair spread.',
    },
    {
      question: 'Rollover week liquidity often:',
      options: [
        'Thins in front month — wider spreads; volume shifts to next month',
        'Doubles always',
        'Closes exchange',
        'Only equities',
      ],
      correct: 0,
      explanation: 'Roll windows see volume migrate. Slippage higher if holding expiring contract.',
    },
    {
      question: 'Leverage ratio 10:1 on margin means 10% move against you:',
      options: [
        'Roughly wipes margin deposit (before calls) — risk of liquidation',
        '2% loss',
        'No effect',
        'Profit doubles',
      ],
      correct: 0,
      explanation: 'Small price moves = large % P&L. Risk management uses stops and size caps.',
    },
    {
      question: 'Exchange for Physical (EFP) allows:',
      options: [
        'Swap futures vs cash bilaterally — linked to commercial hedging',
        'Only retail day trade',
        'Free gold delivery to home',
        'Ignore reporting',
      ],
      correct: 0,
      explanation:
        'EFP transfers futures position to cash market off exchange tape — institutional tool.',
    },
  ],

  'commodities-advanced-2': [
    {
      question: 'Crack spread trade long gasoline / short crude benefits when:',
      options: [
        'Refining margins expand — strong driving season or outage',
        'Oil crashes only',
        'Corn rallies',
        'Dollar up only',
      ],
      correct: 0,
      explanation: 'Refiner margin play. Independent of flat crude if products outperform.',
    },
    {
      question: 'Calendar spread in soybeans (old crop vs new crop) reflects:',
      options: [
        'Old-crop tightness vs new-crop production expectations',
        'Only gold',
        'NG weather',
        'VIX',
      ],
      correct: 0,
      explanation:
        'July/Nov spread trades carryout vs upcoming harvest. Weather rallies invert spread.',
    },
    {
      question: 'Inter-commodity spread (corn/wheat ratio) used when:',
      options: [
        'Feed substitution economics favor one grain over another',
        'OPEC meets',
        'Only technical',
        'Fed speaks',
      ],
      correct: 0,
      explanation: 'Livestock feeders switch grain by price ratio. Ratio mean-reverts with supply.',
    },
    {
      question: 'Spark spread in power markets is:',
      options: [
        'Power price minus fuel cost (gas) — gas plant margin analogue',
        'Oil minus gold',
        'Corn crush',
        'Freight only',
      ],
      correct: 0,
      explanation:
        'European power traders hedge spark. Gas and power correlated in thermal systems.',
    },
    {
      question: 'Lithium carbonate vs hydroxide spread trade involves:',
      options: [
        'Battery chemistry demand differences — technical grade premiums',
        'Only oil rigs',
        'Cattle',
        'TIPS',
      ],
      correct: 0,
      explanation: 'EV supply chain nuance. Different products for NMC vs LFP batteries.',
    },
    {
      question: 'Contango roll yield for long-only commodity index is typically:',
      options: [
        'Negative — sells low front, buys high deferred',
        'Always positive',
        'Zero',
        'Only for gold',
      ],
      correct: 0,
      explanation: 'Indices roll monthly. Persistent contango erodes long ETF returns vs spot.',
    },
    {
      question: 'Butterfly spread in futures is:',
      options: [
        'Long wing, short 2× middle — bets on curvature of term structure',
        'Only directional outright',
        'Physical delivery',
        'Stock dividend',
      ],
      correct: 0,
      explanation: 'Butterfly isolates belly vs wings on curve. Advanced relative value.',
    },
    {
      question: 'Copper-gold ratio rising may signal:',
      options: [
        'Growth/industrial optimism vs safety — risk-on macro',
        'Deflation only',
        'Bear stocks',
        'Only ag bullish',
      ],
      correct: 0,
      explanation: 'Copper = Dr Copper growth; gold = fear. Ratio used as macro risk gauge.',
    },
    {
      question: 'Hedge ratio in spread should adjust when:',
      options: [
        'Volatility correlation changes — beta not constant',
        'Never',
        'Only once yearly',
        'USDA only',
      ],
      correct: 0,
      explanation:
        'Regression hedge ratios update. Stress breaks historical correlation (2020 example).',
    },
    {
      question: 'Maximum drawdown on spread vs outright often:',
      options: [
        'Lower vol — but correlation breakdown can cause spread blowouts',
        'Always zero',
        'Higher always',
        'Unrelated',
      ],
      correct: 0,
      explanation:
        'Spreads reduce beta but not eliminate risk. NG calendar can move huge on weather.',
    },
  ],

  'commodities-advanced-3': [
    {
      question: 'Just-in-time inventory in manufacturing means commodity demand:',
      options: [
        'Amplifies cycles — restocking waves after destocking',
        'Perfectly smooth',
        'Only bullish',
        'Ignores prices',
      ],
      correct: 0,
      explanation: 'Bullwhip effect: small end-demand change swings raw material orders.',
    },
    {
      question: 'Baltic Dry Index measures:',
      options: [
        'Dry bulk shipping rates — leading indicator of raw material trade volume',
        'Gold volatility',
        'Fed funds',
        'Corn yield',
      ],
      correct: 0,
      explanation:
        'BDI rises with China steel demand etc. Leading but noisy — ship supply matters too.',
    },
    {
      question: 'LME warehouse queues and cancellations signal:',
      options: [
        'Physical tightness — metal available for immediate draw',
        'Bearish surplus always',
        'Only paper trade',
        'Oil SPR',
      ],
      correct: 0,
      explanation:
        'Low warrants = tight nearby copper/aluminum. Watch cancelled warrants vs arrivals.',
    },
    {
      question: 'Semiconductor shortage (2021) impacted commodities via:',
      options: [
        'Auto production cuts → palladium/platinum demand; later chip glut reversed',
        'Only wheat',
        'NG only',
        'Gold mine supply',
      ],
      correct: 0,
      explanation: 'Supply chains link sectors. Industrial metals follow production schedules.',
    },
    {
      question: 'China PMI below 50 historically correlates with:',
      options: [
        'Weaker copper and iron ore demand expectations',
        'Guaranteed oil spike',
        'Only bullish ag',
        'No commodity link',
      ],
      correct: 0,
      explanation: 'China is marginal buyer of industrial commodities. PMI surprises move metals.',
    },
    {
      question: 'Panama Canal drought restrictions affect:',
      options: [
        'Grain and LNG shipping costs/time — reroute premiums',
        'Only forex',
        'Gold lease',
        'Fed policy',
      ],
      correct: 0,
      explanation: 'Logistics bottleneck adds freight component to landed prices globally.',
    },
    {
      question: 'Inventory draw in Cushing OK matters for:',
      options: [
        'WTI prompt pricing and backwardation — delivery hub stocks',
        'Corn ethanol',
        'Silver jewelry',
        'VIX',
      ],
      correct: 0,
      explanation: 'Cushing fill/empty drives WTI curve shape. EIA weekly stocks key release.',
    },
    {
      question: 'Traceability in battery supply chain (ESG) pushes:',
      options: [
        'Premiums for certified lithium/cobalt origins',
        'Elimination of all mining',
        'Only oil demand',
        'Lower cotton',
      ],
      correct: 0,
      explanation: 'OEMs audit supply chains. Approved origin metal trades at premium.',
    },
    {
      question: 'Restocking cycle after pandemic caused:',
      options: [
        'Container shortages and commodity demand surge — inflationary 2021-22',
        'Deflation',
        'Only bear markets',
        'Zero shipping impact',
      ],
      correct: 0,
      explanation:
        'Synchronized global restock pulled forward demand. Freight spiked; later normalized.',
    },
    {
      question: 'Vendor-managed inventory shift to retailer shifts risk:',
      options: [
        'To suppliers who need commodity hedging programs',
        'To consumers only',
        'Eliminates futures',
        'Only to Fed',
      ],
      correct: 0,
      explanation: 'Suppliers hold stock risk → more hedging demand in plastics, metals inputs.',
    },
  ],

  'commodities-advanced-4': [
    {
      question: 'Fed hiking cycle typically pressures gold when:',
      options: [
        'Nominal and real yields rise faster than inflation fears',
        'Always bullish gold',
        'Only oil',
        'Corn only',
      ],
      correct: 0,
      explanation: 'Opportunity cost channel dominates unless financial stress spikes gold anyway.',
    },
    {
      question: 'DXY (dollar index) up 5% often means for commodities:',
      options: [
        'Headwind for dollar-denominated prices — empirical negative correlation',
        'Always rally',
        'No link',
        'Only helps EM',
      ],
      correct: 0,
      explanation:
        'Strong dollar makes commodities expensive in other currencies → demand dampening.',
    },
    {
      question: 'Fed QE (balance sheet expansion) 2020 contributed to:',
      options: [
        'Financial conditions easing — risk assets and commodities rallied with liquidity',
        'Only bond crash',
        'Permanent deflation',
        'Ag only down',
      ],
      correct: 0,
      explanation:
        'Liquidity and negative real rates supported gold, copper, and risk commodities.',
    },
    {
      question: 'Yield curve inversion signals for commodities often:',
      options: [
        'Recession risk — bearish industrial demand outlook (copper, oil)',
        'Bullish oil always',
        'Only gold down',
        'No macro use',
      ],
      correct: 0,
      explanation:
        'Inversion precedes slowdowns. Energy demand forecasts cut — curve can move to contango.',
    },
    {
      question: 'ECB energy shock 2022 forced:',
      options: [
        'Fiscal subsidies and rate hikes together — mixed commodity impacts',
        'Only gold down',
        'Corn embargo',
        'Zero FX move',
      ],
      correct: 0,
      explanation:
        'Europe gas crisis diverged regional energy costs from US — macro policy complex.',
    },
    {
      question: 'China PBOC easing and commodity prices:',
      options: [
        'Stimulus hopes can rally metals and oil demand expectations',
        'Always bearish',
        'Only cotton',
        'Unrelated',
      ],
      correct: 0,
      explanation: 'Credit impulse tracks property and infrastructure — key for iron ore, copper.',
    },
    {
      question: 'Real rate = nominal yield minus breakeven inflation. Rising real rates:',
      options: [
        'Often weigh on gold; industrial commodities depend on growth mix',
        'Always bullish all commodities',
        'Only affect bonds',
        'Fix corn basis',
      ],
      correct: 0,
      explanation: 'Decompose macro: growth up + rates up can be mixed for copper vs gold.',
    },
    {
      question: 'Carry trade in currencies affects commodity exporters:',
      options: [
        'Weak EM currency can boost export competitiveness — producer currency collapse can raise USD prices',
        'No effect',
        'Only US',
        'Only equities',
      ],
      correct: 0,
      explanation: 'Brazil real vs soy exports example. FX is part of global ag competitiveness.',
    },
    {
      question: 'Inflation swaps breakeven rising without Fed pivot:',
      options: [
        'Can support gold as inflation hedge even if nominal yields elevated',
        'Bearish all commodities always',
        'Only helps oil down',
        'Irrelevant',
      ],
      correct: 0,
      explanation:
        'Market prices inflation persistence. Gold can rise on inflation fear despite high nominal rates briefly.',
    },
    {
      question: 'Bank of Japan YCC exit risk trades include:',
      options: [
        'Higher global yields pressure — volatility in gold, JPY, and risk assets',
        'Only cotton',
        'USDA report',
        'Hog spreads',
      ],
      correct: 0,
      explanation:
        'Japan flow reversal affects global bond vol — spillover to commodity risk premia.',
    },
  ],

  'commodities-advanced-5': [
    {
      question: 'EU ETS carbon price rising increases:',
      options: [
        'Power sector fuel switching cost — gas vs coal economics in Europe',
        'Only gold supply',
        'US corn acres',
        'Silver jewelry',
      ],
      correct: 0,
      explanation:
        'Carbon cost embedded in European power and industry. Shifts merit order of generation.',
    },
    {
      question: 'ESG divestment from fossil equities does not always:',
      options: [
        'Reduce physical oil consumption near-term — capital cycle may tighten supply later',
        'Instantly end oil demand',
        'Lower emissions day one',
        'Eliminate futures',
      ],
      correct: 0,
      explanation:
        'Underinvestment thesis: less capex → supply constraint → price spike possible (2022 debate).',
    },
    {
      question: 'Carbon border adjustment (CBAM) affects:',
      options: [
        'Embedded carbon cost on steel/aluminum imports — trade flow shifts',
        'Only USDA',
        'Gold lease',
        'Henry Hub only',
      ],
      correct: 0,
      explanation: 'CBAM changes competitive landscape for carbon-intensive exports to EU.',
    },
    {
      question: 'Renewable certificate (REC) markets tie to:',
      options: [
        'Power greening mandates — complement physical power trading',
        'Corn crush',
        'Oil crack only',
        'Cattle',
      ],
      correct: 0,
      explanation:
        'Compliance markets for renewables. Separate from but linked to power commodities.',
    },
    {
      question: 'Critical minerals list (US/EU) investment impact:',
      options: [
        'Subsidies for domestic lithium, graphite — long-dated supply response',
        'Instant price crash',
        'Only bearish copper',
        'No commodity effect',
      ],
      correct: 0,
      explanation:
        'Policy drives mining capex with 5–10 year lags. Near-term still tight if demand grows.',
    },
    {
      question: 'Green hydrogen hype vs grey hydrogen today:',
      options: [
        'Cost gap large — transition fuel is mostly NG-derived grey H2 near-term',
        'All steel uses green H2 now',
        'Only affects gold',
        'Eliminates oil',
      ],
      correct: 0,
      explanation:
        'Energy transition is gradual. NG demand for hydrogen and power remains transitional theme.',
    },
    {
      question: 'Scope 3 emissions reporting pushes corporates to:',
      options: [
        'Audit supplier commodities carbon — preference for low-carbon inputs',
        'Ignore supply chain',
        'Only trade FX',
        'Stop hedging',
      ],
      correct: 0,
      explanation: 'Scope 3 includes upstream commodities. Aluminum low-carbon premium example.',
    },
    {
      question: 'Coal phase-out in Europe accelerated by:',
      options: [
        '2022 gas crisis repricing — but long-term ESG still down coal',
        'Permanent coal boom',
        'Only gold bullish',
        'USDA',
      ],
      correct: 0,
      explanation:
        'Short-term coal burn rose for power security; structural decline continues with policy.',
    },
    {
      question: 'EV sales growth curve affects:',
      options: [
        'Lithium, nickel, graphite demand — multi-year structural bull case with volatility',
        'Only wheat',
        'SPR',
        'VIX only',
      ],
      correct: 0,
      explanation:
        'Battery metals have elastic supply response. Price spikes incentivize new supply.',
    },
    {
      question: 'Stranded asset risk for oil majors means:',
      options: [
        'Reserves may not be produced if transition accelerates — valuation and capex discipline',
        'Guaranteed higher oil tomorrow',
        'Only equity issue',
        'No commodity price link',
      ],
      correct: 0,
      explanation:
        'Long-dated oil projects need price deck assumptions. Transition risk caps some investment.',
    },
  ],

  'commodities-advanced-6': [
    {
      question: 'A commodities investment thesis should state:',
      options: [
        'Driver, timeframe, invalidation level, and position expression (outright vs spread)',
        'Only "bullish"',
        'Twitter poll',
        'Random chart pattern',
      ],
      correct: 0,
      explanation:
        'Professional thesis is falsifiable. If inventory builds 3 weeks, exit long oil thesis.',
    },
    {
      question: 'Bull case for copper thesis often centers on:',
      options: [
        'Grid buildout + mine supply lag — deficit narrative',
        'Only jewelry',
        'SPR release',
        'Hog disease',
      ],
      correct: 0,
      explanation:
        'Electrification demand vs 10-year mine development timeline is core bull argument.',
    },
    {
      question: 'Bear case for oil in 2030 thesis may cite:',
      options: [
        'EV penetration, efficiency, and policy — demand peak arguments',
        'Guaranteed shortage',
        'Only OPEC dissolution',
        'Corn ethanol end',
      ],
      correct: 0,
      explanation:
        'Demand destruction long-term vs inelastic short-term supply — timeframe matters.',
    },
    {
      question: 'Position sizing for thesis trade uses:',
      options: [
        'Vol targeting — smaller size in NG than gold due to sigma',
        'Max leverage always',
        'No stops',
        'One contract rule',
      ],
      correct: 0,
      explanation:
        'Equal risk contribution across book. NG 3× vol of gold → fewer contracts same risk.',
    },
    {
      question: 'Catalyst calendar for ag thesis includes:',
      options: [
        'WASDE dates, planting progress, and La Niña updates',
        'Only FOMC',
        'OPEC for corn',
        'Earnings season',
      ],
      correct: 0,
      explanation:
        'Know event risk. Reduce size before binary USDA if thesis not about report surprise.',
    },
    {
      question: 'Thesis invalidation on long gold:',
      options: [
        'Real yields spike + dollar surge without financial stress bid',
        'Price up 1%',
        'Random RSI',
        'Mine opens',
      ],
      correct: 0,
      explanation: 'Predefined exit when driver reverses — not when P&L feels bad only.',
    },
    {
      question: 'Expressing stagflation thesis might combine:',
      options: [
        'Long gold + long energy + short duration bonds (macro basket)',
        'Only short copper',
        'Only long VIX equities',
        'Corn only',
      ],
      correct: 0,
      explanation:
        'Thesis mapping to instruments. Stagflation = slow growth + inflation — multi-asset expression.',
    },
    {
      question: 'Scenario analysis (bull/base/bear) assigns:',
      options: [
        'Probabilities and price targets per path — expected value weighted position',
        'One certainty',
        'Only technicals',
        'Ignore bear case',
      ],
      correct: 0,
      explanation: 'Weighted EV prevents binary thinking. Adjust size to probability × payoff.',
    },
    {
      question: 'Journal review of closed commodity trades should log:',
      options: [
        'Thesis at entry, exit reason, slippage, and whether driver played out',
        'Only P&L color',
        'Memes',
        'Ignore fundamentals',
      ],
      correct: 0,
      explanation: 'Process improvement separates luck from repeatable edge in macro commodities.',
    },
    {
      question: 'Crowded COT speculative long in crude suggests thesis risk:',
      options: [
        'Positioning unwind can accelerate drop even if fundamentals lag',
        'Safe to add size',
        'Ignore',
        'Always bullish',
      ],
      correct: 0,
      explanation:
        'Sentiment extreme is risk factor. Combine fundamentals with positioning overlay.',
    },
  ],

  'commodities-expert-1': [
    {
      question: 'CTA (Commodity Trading Advisor) trend programs often use:',
      options: [
        'Time-series momentum across diversified futures — long winners, short losers',
        'Only stock picking',
        'Fundamental USDA only',
        'No risk limits',
      ],
      correct: 0,
      explanation:
        'Managed futures funds systematic rules. Perform in crises when trends emerge; struggle in chop.',
    },
    {
      question: 'CTA volatility targeting scales exposure:',
      options: [
        'Inversely to recent vol — maintain constant risk budget',
        'To max leverage always',
        'Only on Fridays',
        'Ignore covariance',
      ],
      correct: 0,
      explanation: 'When NG vol doubles, cut contracts halve to keep portfolio vol stable.',
    },
    {
      question: 'Maximum diversification CTA portfolio holds:',
      options: [
        '30+ markets — low average pairwise correlation improves Sharpe',
        'One oil contract',
        'Only S&P',
        'Cash only',
      ],
      correct: 0,
      explanation: 'Diversification across energies, metals, ag, FX, rates is CTA edge source.',
    },
    {
      question: 'CTA drawdown in 2011-2014 "death zone" caused by:',
      options: [
        'Low vol range markets — trend signals whipsawed',
        'Single corn report',
        'Only fraud',
        'Gold standard return',
      ],
      correct: 0,
      explanation:
        'Prolonged mean reversion hurt trend followers. Investors redeemed until vol returned.',
    },
    {
      question: 'Skewness of CTA returns is often:',
      options: [
        'Positive skew — many small losses, occasional large trend wins',
        'Always negative only',
        'Gaussian perfect',
        'Zero vol',
      ],
      correct: 0,
      explanation: 'Option-like payoff profile. Crisis trends (2008, 2022) drive tail returns.',
    },
    {
      question: 'CTA capacity constraint comes from:',
      options: [
        'Market impact in illiquid contracts — size caps per market',
        'Unlimited AUM always',
        'Only regulation',
        'No trading',
      ],
      correct: 0,
      explanation:
        'Too large AUM moves markets against signals. Smaller markets (coffee) cap capacity.',
    },
    {
      question: 'CTA vs discretionary macro differ:',
      options: [
        'CTA systematic rules; discretionary uses judgment on geopolitical shocks',
        'Identical',
        'CTA never trades energy',
        'Discretionary never stops',
      ],
      correct: 0,
      explanation:
        'Hybrid funds exist. CTA provides crisis convexity; discretion handles one-off events.',
    },
    {
      question: 'Risk parity overlap with CTAs:',
      options: [
        'Both use vol scaling and futures — correlation spikes in stress',
        'No overlap',
        'Only equities',
        'Only cash',
      ],
      correct: 0,
      explanation:
        '2008 and 2020 saw correlation rises. Portfolio construction accounts for tail dependence.',
    },
    {
      question: 'CTA fee structure historically:',
      options: [
        '2 and 20 — high-water mark on incentive fee',
        'Zero fees',
        'Only subscription',
        'SEC mutual fund only',
      ],
      correct: 0,
      explanation:
        'Managed futures often in hedge fund format. High water protects investors from paying twice.',
    },
    {
      question: 'Adding CTA to traditional 60/40 portfolio aims to:',
      options: [
        'Crisis diversification when stocks/bonds correlate positive',
        'Reduce all vol to zero',
        'Guarantee 20% yearly',
        'Replace commodities exposure entirely',
      ],
      correct: 0,
      explanation: 'CTAs can profit in inflation shocks when bonds sell off — portfolio convexity.',
    },
  ],

  'commodities-expert-2': [
    {
      question: 'Physical vs paper gold market disconnect during COVID reflected:',
      options: [
        'Refinery/transport disruption — physical premium vs futures',
        'Manipulation only',
        'No impact',
        'Only ETFs',
      ],
      correct: 0,
      explanation:
        'Flight to physical squeezed deliverable. Futures led but loco spreads blew out.',
    },
    {
      question: 'Backwardation in oil with low Cushing stocks means:',
      options: [
        'Prompt physical scarcity — paper near month rich',
        'Surplus always',
        'Contango forever',
        'Only paper trade',
      ],
      correct: 0,
      explanation: 'Cash-and-carry arb needs storage. Low tanks → prompt premium.',
    },
    {
      question: 'Warehouse receipt in LME copper gives holder:',
      options: [
        'Claim on metal in approved warehouse — can withdraw or deliver',
        'Stock dividend',
        'Only paper',
        'USDA certificate',
      ],
      correct: 0,
      explanation:
        'Physical chain: mine → smelter → warehouse warrant. Cancels tighten prompt supply.',
    },
    {
      question: 'Gold lease rate spiking indicates:',
      options: [
        'Tightness borrowing physical gold — bullish physical demand',
        'Bearish gold always',
        'Only silver',
        'Oil surplus',
      ],
      correct: 0,
      explanation:
        'High lease = scramble for metal. Often seen with strong physical buying or short squeeze.',
    },
    {
      question: 'Paper silver stack vs COMEX registered inventories debate centers on:',
      options: [
        'Whether deliverable metal backs large open interest — squeeze risk narrative',
        'Corn yield',
        'Fed funds',
        'Only ETFs',
      ],
      correct: 0,
      explanation:
        'Registered vs eligible metal matters for delivery stress. Mostly narrative unless drain accelerates.',
    },
    {
      question: 'Brent CFD vs Dated Brent physical reflects:',
      options: [
        'Atlantic basin waterborne pricing — different from WTI pipeline economics',
        'Identical to corn',
        'Only US shale',
        'No trade',
      ],
      correct: 0,
      explanation:
        'Waterborne crude pricing includes freight and quality. Physical traders arb CFD to cargo.',
    },
    {
      question: 'Force majeure at mine (copper) affects:',
      options: [
        'Immediate supply removal — spot premia can rise faster than curve back',
        'Only paper down',
        'Guaranteed 10-year glut',
        'Corn basis',
      ],
      correct: 0,
      explanation:
        'Physical shocks hit prompt first. Curve shape adjusts as duration of outage known.',
    },
    {
      question: 'Contango storage trade (buy spot, sell futures) profitable when:',
      options: [
        'Carry exceeds storage + financing costs',
        'Always',
        'Never',
        'Only in gold backwardation',
      ],
      correct: 0,
      explanation:
        'Cash-and-carry arb locks margin when curve steep enough. Fills storage tanks economically.',
    },
    {
      question: 'Physical uranium market vs U3O8 futures (UxC) liquidity:',
      options: [
        'OTC bilateral thin — price discovery less transparent than oil',
        'Same as CL',
        'Only stocks',
        'Fed sets price',
      ],
      correct: 0,
      explanation:
        'Nuclear fuel is niche physical. Utilities long-term contracts; vol in squeeze headlines.',
    },
    {
      question: 'Deliverable supply chain bullwhip in aluminum when:',
      options: [
        'Smelter power cuts (Europe) remove metal — spot premium spikes',
        'Only stocks rally',
        'USDA report',
        'VIX low',
      ],
      correct: 0,
      explanation:
        'Energy-intensive smelting ties to power markets. Physical cuts faster than demand destruction.',
    },
  ],

  'commodities-expert-3': [
    {
      question: 'Buying a call option on crude oil gives:',
      options: [
        'Right to buy futures at strike — limited premium risk, nonlinear upside',
        'Obligation to sell',
        'Unlimited loss',
        'Dividend stream',
      ],
      correct: 0,
      explanation:
        'Long call benefits from rally above strike + premium. Theta decay hurts if flat.',
    },
    {
      question: 'Put option on gold used by producer to:',
      options: [
        'Floor sale price — protective put on inventory',
        'Guarantee higher gold forever',
        'Eliminate mining',
        'Only speculators',
      ],
      correct: 0,
      explanation: 'Producers hedge forward sales with puts/collars. Cost is insurance on revenue.',
    },
    {
      question: 'Implied volatility rising in grain options before USDA means:',
      options: [
        'Market prices big move — straddle prices expensive',
        'No move expected',
        'Vol crush certain',
        'Only calls cheap',
      ],
      correct: 0,
      explanation:
        'Event vol inflates premiums. Post-report IV crush ("vol crush") hits long straddle holders.',
    },
    {
      question: 'Delta-neutral straddle long profits when:',
      options: [
        'Realized move larger than implied move priced in',
        'Price unchanged',
        'Only down move',
        'IV collapses pre-event',
      ],
      correct: 0,
      explanation: 'Long straddle needs magnitude. Wrong if move smaller than market priced.',
    },
    {
      question: 'Calendar spread options in soy differ from futures calendar because:',
      options: [
        'Options on spreads have vol on spread itself — correlation risk',
        'Identical risk',
        'No vol',
        'Only American exercise',
      ],
      correct: 0,
      explanation:
        'Spread option vol is vol of difference. Correlation drop hurts spread option value.',
    },
    {
      question: 'Selling naked commodity options risk:',
      options: [
        'Unlimited loss potential on rallies/crashes — margin calls',
        'Only premium gain',
        'Capped loss',
        'No margin',
      ],
      correct: 0,
      explanation:
        'Short gamma strategies (covered or naked) face tail risk. NG short strangle blew accounts in spikes.',
    },
    {
      question: 'Skew in oil options often shows:',
      options: [
        'Higher implied vol on OTM calls during supply fear — upside tail priced',
        'Flat vol always',
        'Only puts exist',
        'No skew',
      ],
      correct: 0,
      explanation:
        'Energy skew reflects tail risks (war, OPEC). Skew trades are relative value on tails.',
    },
    {
      question: 'Hedging futures with options delta requires:',
      options: [
        'Adjusting hedge ratio as spot moves (gamma) — dynamic hedging',
        'Set once forever',
        'Ignore delta',
        'Only stocks',
      ],
      correct: 0,
      explanation:
        'Market makers delta-hedge continuously. Gamma scalping P&L ties to realized vol.',
    },
    {
      question: 'Asian options on average price reduce:',
      options: [
        'Gamma risk for hedgers — path-dependent settlement',
        'All risk to zero',
        'Only American style',
        'Corn basis',
      ],
      correct: 0,
      explanation: 'APO used in oil hedging. Average smooths manipulation of expiry pin.',
    },
    {
      question: 'Commodity option margin SPAN system:',
      options: [
        'Scenario-based worst-loss margin — offsets for spreads',
        'Full notional always',
        'No margin',
        'Only equity rules',
      ],
      correct: 0,
      explanation: 'SPAN scans price/vol scenarios. Spread margins lower than sum of legs.',
    },
  ],

  'commodities-expert-4': [
    {
      question: 'Global macro commodity trade links:',
      options: [
        'FX, rates, equities, and geopolitics into one directional or relative value book',
        'Only one chart',
        'USDA only',
        'Ignore cross-asset',
      ],
      correct: 0,
      explanation:
        'Soros-style macro trades policy mistakes across assets. Commodities are expression of worldview.',
    },
    {
      question: '1970s stagflation macro trade classic expression:',
      options: [
        'Long gold, long oil, short bonds — real asset outperformance',
        'Short all commodities',
        'Only tech long',
        'Cash only',
      ],
      correct: 0,
      explanation:
        'Historical template for inflation shock. Modern variants adjust for different central bank reaction.',
    },
    {
      question: 'China property crisis (Evergrande) macro impact on commodities:',
      options: [
        'Iron ore and copper demand fear — bearish industrial metals',
        'Bullish oil always',
        'Only ag up',
        'No link',
      ],
      correct: 0,
      explanation:
        'Property = huge steel/copper demand. Credit crunch reduces construction = metal bearish.',
    },
    {
      question: 'Fed pivot trade in macro commodities often:',
      options: [
        'Long gold/copper on easing expectations — weaker dollar tailwind',
        'Short everything',
        'Only short gold',
        'Ignore rates',
      ],
      correct: 0,
      explanation:
        'First cut cycle can reflate risk assets. Timing matters — growth scare vs pure liquidity.',
    },
    {
      question: 'War premium in oil macro thesis must separate:',
      options: [
        'Risk premium vs physical loss — premium can fade on ceasefire without demand destruction',
        'Permanent $200',
        'Only paper',
        'Corn impact',
      ],
      correct: 0,
      explanation:
        'Geopolitical risk premium is volatile. Distinguish barrel actually offline vs fear only.',
    },
    {
      question: 'Carry in commodity currencies (AUD, CAD, NOK) ties to:',
      options: [
        'Oil/metal export revenues — FX as proxy hedge for macro commodity view',
        'Only euro',
        'Fixed peg',
        'No commodity link',
      ],
      correct: 0,
      explanation:
        'Long commodity view can express via resource FX vs USD. Beta not perfect but liquid.',
    },
    {
      question: 'Inflation breakeven trade long TIPS short nominals pairs with:',
      options: [
        'Long commodity basket hedge if inflation realizes',
        'Short gold always',
        'Only equities',
        'Deflation bet',
      ],
      correct: 0,
      explanation:
        'Macro relative value: breakevens + commodities double expression on CPI surprise.',
    },
    {
      question: 'Sovereign wealth fund oil surplus recycling historically:',
      options: [
        'Correlated petrodollar flows into financial assets — macro liquidity link',
        'Only affects corn',
        'Eliminated 2020',
        'Bearish gold always',
      ],
      correct: 0,
      explanation: 'High oil = surplus SWF buying. Low oil = reserve draw — EM FX pressure.',
    },
    {
      question: 'Tail hedge fund strategy for macro book may buy:',
      options: [
        'Deep OTM puts on oil/gold and VIX calls — convexity for crash',
        'Only futures long',
        'No hedges',
        'Corn calls only',
      ],
      correct: 0,
      explanation:
        'Cheap tails hedge gap risk. Cost drag in calm years — insurance not alpha alone.',
    },
    {
      question: 'Macro risk management uses gross exposure caps because:',
      options: [
        'Correlations go to 1 in crises — diversified book becomes one trade',
        'Never needed',
        'Only for retail',
        'Guarantees profit',
      ],
      correct: 0,
      explanation:
        'Expert macro traders cut gross when vol rises. Survival > hero trade in liquidity crunch.',
    },
  ],

  'risk-intermediate-1': [
    {
      question: 'What does Value at Risk (VaR) at the 95% confidence level tell you?',
      options: [
        'The maximum profit you can earn in 95% of trading days',
        'The minimum loss you will experience on any given day',
        'The loss threshold that should not be exceeded on 95% of days, given recent volatility',
        'The average daily return over the last 95 trading sessions',
      ],
      correct: 2,
      explanation:
        'VaR estimates the worst expected loss over a time horizon at a given confidence level. A 1-day 95% VaR of $5,000 means you should not lose more than $5,000 on 19 out of 20 days — though tail events can exceed it.',
    },
    {
      question: 'How is portfolio beta calculated relative to a benchmark?',
      options: [
        'Portfolio return divided by benchmark return',
        'Covariance of portfolio and benchmark returns divided by benchmark variance',
        'Standard deviation of the portfolio divided by standard deviation of the benchmark',
        'Maximum drawdown of the portfolio divided by benchmark drawdown',
      ],
      correct: 1,
      explanation:
        'Beta = Cov(Rp, Rm) / Var(Rm). A beta of 1.2 means the portfolio tends to move 1.2% for every 1% move in the benchmark. It measures systematic market sensitivity, not total risk.',
    },
    {
      question: 'What does maximum drawdown measure?',
      options: [
        'The peak-to-trough decline from a portfolio high to its subsequent low before a new high is reached',
        "The largest single-day loss in the portfolio's history",
        'The difference between expected return and actual return',
        'The total number of losing trades in a month',
      ],
      correct: 0,
      explanation:
        'Max drawdown captures the worst sustained loss episode — critical for understanding how painful a strategy feels in practice. A 40% drawdown requires a 67% gain just to recover.',
    },
    {
      question:
        'If a portfolio has 15% annualized volatility, what does that approximately represent?',
      options: [
        'The guaranteed annual loss limit',
        'The expected annual return',
        'The fixed margin requirement',
        'The standard deviation of returns — roughly two-thirds of daily/annual returns fall within ±15% of the mean under normal assumptions',
      ],
      correct: 3,
      explanation:
        'Volatility (standard deviation) quantifies return dispersion. Higher volatility means wider outcome ranges. It is the denominator in Sharpe ratio and a key input for position sizing.',
    },
    {
      question: 'What is the Sortino ratio and how does it differ from the Sharpe ratio?',
      options: [
        'Sortino uses only downside deviation in the denominator instead of total standard deviation',
        'Sortino measures total return without adjusting for risk',
        'Sortino only applies to bond portfolios',
        'Sortino uses upside volatility instead of downside',
      ],
      correct: 0,
      explanation:
        'The Sortino ratio penalizes harmful volatility only: (Return - Target) / Downside Deviation. Traders who accept large upside swings but want to minimize downside pain prefer Sortino over Sharpe.',
    },
    {
      question: 'A portfolio with a beta of 0.5 and the market rises 4% is expected to:',
      options: ['Fall 2%', 'Rise 8%', 'Rise approximately 2%', 'Remain unchanged'],
      correct: 2,
      explanation:
        'Expected portfolio move ≈ Beta × Market move. Beta 0.5 × 4% market gain ≈ 2% portfolio gain. Low-beta portfolios provide partial downside protection but lag in strong bull markets.',
    },
    {
      question: 'What does tracking error measure for a portfolio relative to its benchmark?',
      options: [
        'The annual fee charged by the fund manager',
        'The difference between portfolio beta and market beta',
        'The standard deviation of the difference between portfolio returns and benchmark returns',
        'The total number of holdings that differ from the index',
      ],
      correct: 2,
      explanation:
        'Tracking error quantifies how closely a portfolio follows its benchmark. Active managers accept higher tracking error in pursuit of alpha; index funds target near-zero tracking error.',
    },
    {
      question:
        'Why is conditional VaR (CVaR / Expected Shortfall) considered more informative than standard VaR?',
      options: [
        'CVaR is always lower than VaR',
        'CVaR only measures upside risk',
        'CVaR ignores tail events entirely',
        'CVaR averages losses in the worst tail beyond the VaR threshold, capturing severity not just frequency',
      ],
      correct: 3,
      explanation:
        'VaR tells you the threshold; CVaR tells you how bad it gets when you breach that threshold. During crises, average loss beyond VaR can be far worse than VaR itself suggests.',
    },
    {
      question:
        'If two portfolios have identical returns but Portfolio A has half the volatility of Portfolio B, which statement is true?',
      options: [
        'Portfolio B has better risk-adjusted performance',
        'Both portfolios are equally attractive on a risk-adjusted basis',
        'Portfolio A has better risk-adjusted performance',
        'Volatility does not affect performance comparison',
      ],
      correct: 2,
      explanation:
        'Same return with lower volatility means a higher Sharpe ratio. Risk-adjusted metrics reward efficiency — getting the same result with less variance is strictly superior.',
    },
    {
      question:
        'What is the primary limitation of using historical volatility to forecast future risk?',
      options: [
        'Historical volatility is always too low',
        'Volatility is constant and never changes',
        'Historical data cannot be calculated for liquid assets',
        'Volatility clusters and regime-shifts — past calm periods can understate future crisis risk',
      ],
      correct: 3,
      explanation:
        'Markets exhibit volatility clustering: calm begets calm, then shocks spike vol rapidly. Relying on a quiet 12-month window before a crisis systematically underestimates tail risk.',
    },
  ],

  'risk-intermediate-2': [
    {
      question: 'Two assets with a correlation of +0.85 provide what diversification benefit?',
      options: [
        'Maximum diversification — they move in opposite directions',
        'Moderate diversification — they move similarly but not identically',
        'Minimal diversification — they tend to move together, reducing portfolio risk reduction',
        'Negative diversification — correlation above 0.5 always increases risk',
      ],
      correct: 2,
      explanation:
        'High positive correlation means assets rise and fall together. Diversification benefit requires low or negative correlation. At +0.85, adding the second asset barely reduces portfolio volatility.',
    },
    {
      question:
        'What happens to portfolio risk when you combine two assets with correlation of -0.3?',
      options: [
        "Portfolio risk equals the average of both assets' risk",
        'Portfolio risk can be lower than either asset alone due to offsetting movements',
        'Portfolio risk doubles',
        'Correlation has no effect on portfolio risk',
      ],
      correct: 1,
      explanation:
        'Negative correlation is the diversification ideal. When one asset falls, the other tends to rise, smoothing combined returns. This is the mathematical foundation of Modern Portfolio Theory.',
    },
    {
      question: 'During the March 2020 COVID crash, correlations between most asset classes:',
      options: [
        'Stayed near zero as usual',
        'Became negative across all pairs',
        'Became irrelevant because markets closed',
        'Spiked toward +1 as investors sold everything simultaneously to raise cash',
      ],
      correct: 3,
      explanation:
        'In liquidity crises, correlations converge toward 1 — the "correlation goes to 1" phenomenon. Diversification fails precisely when you need it most, which is why stress testing matters.',
    },
    {
      question: 'What is "diversification ratio" in portfolio construction?',
      options: [
        'The ratio of stocks to bonds in a 60/40 portfolio',
        'The number of countries represented divided by total holdings',
        'The ratio of weighted average individual asset volatility to actual portfolio volatility',
        'The percentage of the portfolio held in the largest position',
      ],
      correct: 2,
      explanation:
        'Diversification ratio = (weighted sum of individual volatilities) / portfolio volatility. A ratio of 2.0 means diversification cuts risk in half versus holding assets separately at the same weights.',
    },
    {
      question:
        'Adding a 10% allocation to gold in a stock-heavy portfolio primarily helps because:',
      options: [
        'Gold always outperforms stocks',
        'Gold has historically low or negative correlation with equities during certain stress periods',
        'Gold eliminates all portfolio drawdowns',
        'Gold is exempt from market risk',
      ],
      correct: 1,
      explanation:
        'Gold often acts as a crisis hedge — not because it always rises, but because its correlation with stocks drops or turns negative during equity selloffs, providing a partial offset.',
    },
    {
      question:
        'Why does diversifying across 50 stocks reduce unsystematic risk more than diversifying across 5 sectors with 10 stocks each?',
      options: [
        'Sector diversification captures different economic drivers; 50 stocks in one sector still share sector-specific shocks',
        '50 stocks always outperform 5 sectors',
        'Sector ETFs have higher fees than individual stocks',
        'Unsystematic risk cannot be reduced by any diversification',
      ],
      correct: 0,
      explanation:
        'Company-specific risk diversifies away with more names, but sector concentration leaves you exposed to sector shocks (e.g., all tech falling on rate hikes). Cross-sector diversification addresses both layers.',
    },
    {
      question: 'What is the "diversification paradox" during market stress?',
      options: [
        'More diversification always reduces losses in crises',
        'Diversification only works in bull markets',
        'Assets that diversify in normal times often become correlated in crises, reducing the hedge when needed',
        'Paradox refers to the tax treatment of diversified portfolios',
      ],
      correct: 2,
      explanation:
        'The free lunch of diversification shrinks under stress. Correlations that were 0.3 in calm markets jump to 0.8+ in panics. Prudent portfolios plan for this breakdown, not just average correlations.',
    },
    {
      question: 'Pairwise correlation of 0 between two assets means:',
      options: [
        'Their returns move in perfect opposite directions',
        "Their returns are statistically independent — knowing one's move tells you nothing about the other's direction",
        'Both assets have zero volatility',
        'One asset must be a bond and the other a stock',
      ],
      correct: 1,
      explanation:
        'Zero correlation means no linear relationship. Returns are independent on average. This is ideal for diversification, though non-linear dependencies (tail risk) may still exist.',
    },
    {
      question:
        'A portfolio holds US stocks, international stocks, REITs, and corporate bonds. Which pair is likely to have the LOWEST correlation in normal markets?',
      options: [
        'US stocks and international stocks',
        'Corporate bonds and US stocks',
        'REITs and US stocks',
        'US stocks and US stocks in the same sector',
      ],
      correct: 1,
      explanation:
        'Investment-grade bonds typically have low or negative correlation with equities in normal conditions. US and international stocks correlate highly (~0.85). Same-sector stocks correlate even higher.',
    },
    {
      question: 'What is "false diversification"?',
      options: [
        'Holding assets in different brokerage accounts',
        'Owning many positions that share the same underlying risk factor — appearing diversified but concentrated',
        'Investing in both large-cap and mid-cap versions of the same sector ETF',
        'Using dollar-cost averaging across time',
      ],
      correct: 1,
      explanation:
        'Owning 20 tech stocks feels diversified but all respond to the same factor (growth/rates). True diversification spreads exposure across uncorrelated risk factors: rates, credit, growth, inflation, geography.',
    },
  ],

  'risk-intermediate-3': [
    {
      question: 'What is "tilt" in trading psychology?',
      options: [
        'An emotional state where recent losses or wins cause deviation from your trading plan — often leading to oversized or impulsive trades',
        'A technical chart pattern indicating reversal',
        'The optimal portfolio tilt toward growth stocks',
        'A regulatory requirement to report emotional trades',
      ],
      correct: 0,
      explanation:
        'Tilt — borrowed from poker — describes emotional decision-making after variance hits. On tilt, traders abandon position sizing, chase losses, or overtrade. Recognizing tilt is the first step to stopping it.',
    },
    {
      question:
        'According to prospect theory, how do people typically weigh losses versus equivalent gains?',
      options: [
        'Losses and gains are weighted equally',
        'Gains feel twice as painful as losses',
        'Losses feel approximately 2–2.5 times more painful than equivalent gains',
        'People are always rational about P&L',
      ],
      correct: 2,
      explanation:
        'Kahneman and Tversky showed loss aversion: losing $1,000 hurts roughly twice as much as gaining $1,000 feels good. This asymmetry drives holding losers too long and cutting winners too early.',
    },
    {
      question: 'What is the most effective immediate response after recognizing you are on tilt?',
      options: [
        'Double position size to recover faster',
        'Switch to a completely different strategy',
        'Close the platform and enforce a mandatory cooldown period before trading again',
        'Increase leverage to maximize the next winning trade',
      ],
      correct: 2,
      explanation:
        'Physical separation breaks the feedback loop. A cooldown — 30 minutes to 24 hours — lets cortisol levels drop and prefrontal cortex re-engage. No trade is worth trading while emotionally compromised.',
    },
    {
      question: 'Why does journaling trades improve emotional discipline over time?',
      options: [
        'Journals guarantee profitable trades',
        'Journals replace the need for stop losses',
        'Writing creates a feedback loop that separates process quality from outcome luck, reducing emotional reactivity to variance',
        'Brokers require journals for tax purposes',
      ],
      correct: 2,
      explanation:
        'Reviewing decisions independent of P&L reveals patterns: "I broke my rules on 8 of 10 losing trades." Process focus reduces the emotional sting of individual losses because you evaluate adherence, not just outcomes.',
    },
    {
      question: 'What is "outcome bias" in trading?',
      options: [
        'Judging a decision as good because it was profitable, or bad because it lost money — regardless of whether the process was sound',
        'Bias toward trading only outcome-focused ETFs',
        'Preferring trades with defined outcomes',
        'Ignoring trade outcomes entirely',
      ],
      correct: 0,
      explanation:
        'A well-researched trade that loses is still a good decision if the process was sound. Outcome bias causes traders to abandon valid strategies after unlucky streaks or double down on lucky gambles.',
    },
    {
      question: 'Pre-commitment devices (writing rules before trading) work because:',
      options: [
        'They eliminate all losses',
        'They are legally binding contracts with your broker',
        'They guarantee the market will respect your levels',
        'They leverage your calm, rational state to constrain your future emotional self',
      ],
      correct: 3,
      explanation:
        'You are most rational before entering a trade. Pre-defined stops, targets, and size limits act as guardrails when adrenaline and cortisol would otherwise override judgment mid-trade.',
    },
    {
      question: 'What is "recency bias" and how does it affect traders?',
      options: [
        'Overweighting the most recent market events when making decisions — assuming recent trends will continue indefinitely',
        'Bias against recent IPOs',
        'Only trading stocks listed in the last year',
        'Ignoring all recent price data',
      ],
      correct: 0,
      explanation:
        'After a winning streak, recency bias inflates confidence and size. After losses, it triggers fear and paralysis. Markets mean-revert; recency bias causes buying tops and selling bottoms.',
    },
    {
      question: 'Why should traders detach self-worth from individual trade outcomes?',
      options: [
        'Because trading is a probabilistic game where variance dominates short-term results — tying identity to P&L makes variance unbearable',
        'Because self-worth is irrelevant to all decision-making',
        'Because profitable traders never feel emotions',
        'Because brokers penalize emotional traders with higher fees',
      ],
      correct: 0,
      explanation:
        'Even a 60% win-rate strategy loses 4 in a row 1.3% of the time. If each loss feels like personal failure, you will abandon the edge. Process identity ("I follow my rules") beats outcome identity ("I am a winner/loser").',
    },
    {
      question: 'What is a "circuit breaker" rule in emotional discipline?',
      options: [
        'A market-wide trading halt during volatility',
        'A personal rule that automatically stops trading after a defined loss threshold or number of rule violations in a session',
        'A technical indicator that breaks trend lines',
        'A broker feature that limits order types',
      ],
      correct: 1,
      explanation:
        'Personal circuit breakers — e.g., "stop trading after 3% daily loss or 2 rule violations" — prevent one bad session from becoming a catastrophic week. They are non-negotiable, like market halts.',
    },
    {
      question: 'Confirmation bias in trading leads to:',
      options: [
        'Seeking only information that supports an existing thesis while ignoring contradictory evidence',
        'Confirming all trades with a second broker',
        'Bias toward confirmed breakout patterns only',
        'Automatically confirming stop-loss orders',
      ],
      correct: 0,
      explanation:
        'Once committed to a trade, confirmation bias makes you read bullish news on a long and dismiss bearish data. Actively seeking disconfirming evidence is the antidote — "What would make me wrong?"',
    },
  ],

  'risk-intermediate-4': [
    {
      question: 'What is "averaging down" and why is it dangerous without a defined edge?',
      options: [
        'Selling half your position at a loss — always safe',
        'Adding to a losing position to lower average cost — which increases total exposure to a thesis that is already wrong',
        'Averaging entry prices across multiple days — a valid DCA strategy',
        'Reducing position size after each loss',
      ],
      correct: 1,
      explanation:
        'Averaging down turns a small loss into a large one. Without a verified edge and strict size limits, you are doubling down on hope. Professionals add to winners (pyramiding), not losers.',
    },
    {
      question:
        'Why is trading without a stop-loss one of the most common account-killing mistakes?',
      options: [
        'Stops guarantee profits on every trade',
        'Stops are only needed for day traders',
        'Brokers require stops on all orders',
        'A single unbounded loss can exceed dozens of small wins — one catastrophic trade can wipe out months of gains',
      ],
      correct: 3,
      explanation:
        'Without a stop, your maximum loss is your entire position. A 50% loss requires a 100% gain to recover. Defined risk per trade is the foundation of survival.',
    },
    {
      question: 'What is "overtrading" and what typically causes it?',
      options: [
        'Trading too many different asset classes',
        'Executing excessive trades driven by boredom, FOMO, or need to "do something" — generating fees and emotional decisions without edge',
        'Using too many technical indicators',
        'Trading only during market hours',
      ],
      correct: 1,
      explanation:
        'Overtrading erodes returns through commissions, spreads, and slippage while increasing emotional exposure. The best trade is often no trade. Quality over quantity.',
    },
    {
      question: 'Why is using excessive leverage one of the fastest paths to account destruction?',
      options: [
        'Leverage only affects institutional traders',
        'Leverage guarantees higher long-term returns',
        'Margin calls force liquidation at adverse prices, turning manageable losses into account-ending events',
        'Leverage is free and has no downside',
      ],
      correct: 2,
      explanation:
        'Leverage amplifies both directions. A 10% adverse move on 5x leverage is a 50% account loss. Margin calls force selling at the worst prices. Most blown accounts trace to excessive leverage.',
    },
    {
      question:
        'What mistake do traders make when they "move their stop to avoid being stopped out"?',
      options: [
        'They improve their risk-reward ratio',
        'They reduce total portfolio risk',
        'They follow proper risk management protocol',
        'They transform a small defined loss into a potentially large undefined one — exactly what stops are designed to prevent',
      ],
      correct: 3,
      explanation:
        'Moving stops wider mid-trade is hope-based risk management. The original stop reflected your thesis invalidation point. Widening it means you no longer have a plan — you have a prayer.',
    },
    {
      question: 'Why is failing to account for slippage and commissions a common mistake?',
      options: [
        'Slippage only occurs in crypto markets',
        'Commissions were eliminated in 2019',
        'A strategy with positive gross expectancy can have negative net expectancy after costs — especially with high-frequency trading',
        "Slippage always works in the trader's favor",
      ],
      correct: 2,
      explanation:
        'A scalper making 0.1% per trade but paying 0.05% in spread and commission keeps only half. Always model net expectancy including realistic fill prices, not idealized backtests.',
    },
    {
      question: 'What is the "sunk cost fallacy" in trading?',
      options: [
        'Calculating the cost basis of a position for tax purposes',
        "Holding a losing position because you've already lost money — treating past losses as a reason to stay rather than evaluating forward expected value",
        'Recording trade costs in a journal',
        'Selling immediately after any loss',
      ],
      correct: 1,
      explanation:
        'Money already lost is gone regardless of what you do next. The only relevant question is: "Given current information, is this the best use of my capital?" Past losses should not influence that answer.',
    },
    {
      question: 'Why is trading a stock you don\'t understand ("story stock" trading) risky?',
      options: [
        'Story stocks always go to zero',
        'Regulators ban story stock trading',
        'You cannot size risk properly without understanding the business, catalysts, and volatility drivers — leaving you vulnerable to unexpected moves',
        'Story stocks have no liquidity',
      ],
      correct: 2,
      explanation:
        'If you cannot explain why the stock should move and what would invalidate your thesis, you are gambling. Risk management requires knowing what you own and what can go wrong.',
    },
    {
      question: 'What is "position size creep" and why is it dangerous?',
      options: [
        'Gradually increasing position sizes after wins without recalibrating to account equity — inflating risk beyond your plan',
        'Positions slowly moving in price',
        'Reducing size over time',
        'A broker feature that auto-scales orders',
      ],
      correct: 0,
      explanation:
        'After a winning streak, confidence rises and sizes creep up. A 2% risk trade becomes 5%, then 8%. One reversal at inflated size wipes out the entire winning streak plus more.',
    },
    {
      question: 'Why is checking your P&L constantly during a trade a mistake?',
      options: [
        'P&L data is always delayed',
        'Brokers charge per P&L refresh',
        'It triggers emotional reactions to noise — causing premature exits on winners and panic on normal pullbacks',
        'P&L is only available after market close',
      ],
      correct: 2,
      explanation:
        'Intra-trade P&L monitoring converts a planned trade into an emotional roller coaster. Trust your pre-defined plan. Check P&L at session end for journaling, not tick-by-tick for decision-making.',
    },
  ],

  'risk-advanced-1': [
    {
      question: 'What is "pyramiding" in position management?',
      options: [
        'Closing all positions simultaneously',
        'Adding to a winning position as it moves in your favor, with each add smaller than the last',
        'Building a position all at once at entry',
        'Hedging with options on the same underlying',
      ],
      correct: 1,
      explanation:
        'Pyramiding adds to winners, not losers. Each subsequent add is smaller, so average cost rises but the bulk of your position was established at the best price. It lets trends pay you more while limiting risk on late adds.',
    },
    {
      question: 'What is a "risk budget" in advanced position management?',
      options: [
        'The maximum amount you can deposit into your account',
        'A pre-allocated amount of portfolio risk (e.g., 6% total) distributed across active positions and strategies',
        "The broker's margin requirement",
        'Your annual trading commission limit',
      ],
      correct: 1,
      explanation:
        'A risk budget caps total portfolio heat. If each trade risks 1% and your budget is 6%, you can have at most 6 correlated positions open. It prevents over-concentration when multiple setups appear simultaneously.',
    },
    {
      question: 'When scaling out of a position, what is the typical professional approach?',
      options: [
        'Close the entire position at the first target',
        'Never take partial profits — all or nothing',
        'Take partial profits at predefined targets while letting a "runner" portion ride with a trailing stop',
        'Add to the position at each target',
      ],
      correct: 2,
      explanation:
        'Scaling out locks in gains incrementally while preserving upside exposure. A common structure: sell 1/3 at 1R, 1/3 at 2R, trail the final 1/3. This balances certainty with trend participation.',
    },
    {
      question: 'What does "portfolio heat" measure?',
      options: [
        'The total open risk across all positions expressed as a percentage of account equity',
        'The temperature of the server running your trading platform',
        'The number of trades executed today',
        'The average holding period of open positions',
      ],
      correct: 0,
      explanation:
        'Portfolio heat = sum of all individual trade risks. If you have 4 trades each risking 1.5%, heat is 6%. Exceeding your heat limit means a bad day across all positions could exceed your maximum acceptable daily loss.',
    },
    {
      question:
        'Why should stop placement be based on volatility (e.g., ATR) rather than arbitrary dollar amounts?',
      options: [
        'ATR stops guarantee no whipsaws',
        'Volatility-based stops adapt to market conditions — wider in volatile names, tighter in calm ones — reducing noise exits while respecting structure',
        'Dollar stops are illegal for retail traders',
        'ATR is only used for options pricing',
      ],
      correct: 1,
      explanation:
        "A $2 stop on a $50 low-volatility stock is reasonable; on a $50 high-volatility biotech it gets hunted instantly. ATR-multiple stops (e.g., 2× ATR) scale to each instrument's natural noise level.",
    },
    {
      question: 'What is "time-based stop" management?',
      options: [
        "Closing a position if it hasn't moved in your favor within a defined period — freeing capital from dead trades",
        'Stopping trading at a specific time of day',
        'Using only stop-limit orders',
        'Holding positions for exactly one year for tax purposes',
      ],
      correct: 0,
      explanation:
        "Capital has opportunity cost. If a trade sits flat for 2 weeks when your edge plays out in days, the capital is better redeployed. Time stops enforce discipline on trades that aren't working.",
    },
    {
      question: 'When managing multiple correlated positions, you should:',
      options: [
        'Treat each as independent 1% risk trades — 5 tech longs = 5% total risk',
        'Ignore correlation because diversification always protects you',
        'Reduce individual position sizes because combined correlation means aggregate risk exceeds the sum of parts',
        'Only trade one position at a time always',
      ],
      correct: 2,
      explanation:
        'Five 1% risk longs in the same sector might behave like one 3–4% risk bet when the sector moves. Adjust sizes down for correlated clusters or count them as one position against your risk budget.',
    },
    {
      question: 'What is the purpose of a "hard stop" versus a "mental stop"?',
      options: [
        'Hard stops are placed with the broker and execute automatically; mental stops rely on discipline and fail under emotional pressure',
        'They are identical in practice',
        'Mental stops are more reliable',
        'Hard stops are only for institutional traders',
      ],
      correct: 0,
      explanation:
        'Mental stops fail when you need them most — during fast moves when emotions peak. Hard stops (broker-held) execute regardless of your emotional state. Always use hard stops for defined risk.',
    },
    {
      question: 'What is "position sizing via the Kelly Criterion" and its practical limitation?',
      options: [
        'Kelly tells you the mathematically optimal fraction of capital to risk based on edge and odds — but full Kelly is too aggressive; most traders use half-Kelly or less',
        'Kelly is a chart pattern for entry timing',
        'Kelly only applies to casino games, not trading',
        'Kelly requires you to risk 100% of capital on every trade',
      ],
      correct: 0,
      explanation:
        'Kelly = (Win% × Avg Win - Loss% × Avg Loss) / Avg Win. Full Kelly maximizes long-run growth but produces brutal drawdowns. Half-Kelly sacrifices ~25% of growth for ~50% less drawdown — much more livable.',
    },
    {
      question: 'When should you reduce position size mid-trade?',
      options: [
        'Never — size should be fixed at entry',
        'Only when the stock pays a dividend',
        "When the original thesis is partially invalidated but not fully — reducing exposure limits damage while keeping some upside if you're wrong about the invalidation",
        'Always double size when a trade moves against you',
      ],
      correct: 2,
      explanation:
        'Full exit vs. full hold is a false binary. If a key support breaks but your macro thesis holds, trimming 50% reduces risk while maintaining partial exposure. Adapt size to evolving conviction.',
    },
  ],

  'risk-advanced-2': [
    {
      question: 'How is the Sharpe ratio calculated?',
      options: [
        'Total return divided by maximum drawdown',
        'Portfolio return minus risk-free rate, divided by portfolio standard deviation',
        'Beta multiplied by alpha',
        'Win rate divided by loss rate',
      ],
      correct: 1,
      explanation:
        'Sharpe = (Rp - Rf) / σp. It measures excess return per unit of total volatility. A Sharpe of 1.0 means you earn 1% above risk-free for every 1% of volatility — the universal risk-adjusted benchmark.',
    },
    {
      question: 'What does a negative alpha indicate?',
      options: [
        'The portfolio outperformed its benchmark on a risk-adjusted basis',
        'The portfolio underperformed its benchmark after adjusting for market exposure (beta)',
        'The portfolio has negative returns',
        'Alpha is always positive by definition',
      ],
      correct: 1,
      explanation:
        'Alpha = Actual Return - [Rf + Beta × (Rm - Rf)]. Negative alpha means you took market risk but got less return than beta alone would predict — the manager destroyed value.',
    },
    {
      question:
        'Why might a portfolio with 20% returns and 30% volatility be inferior to one with 12% returns and 8% volatility?',
      options: [
        'Higher returns are always better regardless of risk',
        'The 12%/8% portfolio has a Sharpe ratio of ~1.0+ versus ~0.5 for the 20%/30% portfolio — more return per unit of risk',
        'Volatility does not matter for long-term investors',
        'The 20% return portfolio is always preferable for tax reasons',
      ],
      correct: 1,
      explanation:
        'Sharpe of 20%/30% ≈ 0.5 vs 12%/8% ≈ 1.0+. The smoother portfolio compounds more reliably because drawdowns are shallower and recovery is faster. Risk-adjusted beats raw return.',
    },
    {
      question: 'What is the Treynor ratio and when is it preferred over Sharpe?',
      options: [
        'Treynor uses beta in the denominator instead of total standard deviation — preferred when evaluating well-diversified portfolios where unsystematic risk is eliminated',
        'Treynor measures only downside risk',
        'Treynor is identical to Sharpe for all portfolios',
        'Treynor only applies to bond portfolios',
      ],
      correct: 0,
      explanation:
        'Treynor = (Rp - Rf) / Beta. For diversified portfolios, total risk ≈ systematic risk, so beta is the relevant risk measure. Sharpe penalizes all volatility; Treynor penalizes only market exposure.',
    },
    {
      question: 'What is the Information Ratio?',
      options: [
        'The ratio of buy orders to sell orders',
        'Active return divided by tracking error — measuring risk-adjusted value added by active management',
        'The ratio of fundamental to technical analysis',
        'Total return divided by number of trades',
      ],
      correct: 1,
      explanation:
        'IR = (Portfolio Return - Benchmark Return) / Tracking Error. An IR above 0.5 is good; above 1.0 is exceptional. It answers: "Is the manager\'s active risk worth the active return?"',
    },
    {
      question:
        'Why is the Sortino ratio often more relevant than Sharpe for asymmetric strategies?',
      options: [
        'Sortino ignores all volatility',
        'Sortino uses downside deviation only — not penalizing favorable upside volatility that traders intentionally accept',
        'Sortino is always higher than Sharpe so it looks better',
        'Sortino only works for short strategies',
      ],
      correct: 1,
      explanation:
        'A trend-following strategy may have huge upside days (good) and moderate down days (bad). Sharpe penalizes the upside vol equally. Sortino only penalizes harmful downside, giving a fairer picture.',
    },
    {
      question: 'What is "risk-adjusted return" fundamentally measuring?',
      options: [
        'Return after subtracting taxes',
        'Return per unit of risk taken — answering "was the return worth the ride?"',
        'Return adjusted for inflation only',
        'Return divided by the number of trades',
      ],
      correct: 1,
      explanation:
        'Raw return without risk context is meaningless. 30% return with 50% drawdown is worse than 15% return with 5% drawdown for most investors. Risk-adjusted metrics normalize for the journey, not just the destination.',
    },
    {
      question:
        'A hedge fund reports 15% annual return with a max drawdown of 5%. A competitor reports 25% return with 40% max drawdown. Which likely has better risk-adjusted performance?',
      options: [
        'The 25% return fund — higher is always better',
        'Cannot determine without more data',
        'The 15% return fund — similar return-to-drawdown ratio with far less pain and faster recovery',
        'Both are equal on a risk-adjusted basis',
      ],
      correct: 2,
      explanation:
        "Return/drawdown ratio: Fund A = 3.0, Fund B = 0.625. Fund A delivers strong returns with minimal drawdown — investors can stay invested without panic selling. Fund B's 40% drawdown requires 67% recovery.",
    },
    {
      question: 'What is the Calmar ratio?',
      options: [
        'Annualized return divided by maximum drawdown over the same period',
        'Calorie-adjusted return for health-conscious investors',
        'Return divided by beta',
        'A ratio used only in commodity trading',
      ],
      correct: 0,
      explanation:
        'Calmar = Annual Return / Max Drawdown. It directly links reward to worst pain. A Calmar above 1.0 means annual return exceeds worst drawdown — a hallmark of robust strategies.',
    },
    {
      question:
        'Why can two strategies with the same Sharpe ratio still feel very different to live through?',
      options: [
        'Sharpe ratio is always wrong',
        'Sharpe captures return distribution shape differences perfectly',
        'Sharpe only applies to one-year periods',
        'Sharpe uses standard deviation which treats upside and downside equally — strategies with fat left tails (crash risk) can have identical Sharpe but worse real-world outcomes',
      ],
      correct: 3,
      explanation:
        'Two strategies: one with steady small gains, one with frequent small losses and occasional huge wins. Same Sharpe, vastly different emotional experience. Supplement Sharpe with max drawdown, CVaR, and tail metrics.',
    },
  ],

  'risk-advanced-3': [
    {
      question: 'What is the primary purpose of portfolio stress testing?',
      options: [
        'Guaranteeing profits in all market conditions',
        'Estimating how a portfolio would perform under extreme but plausible scenarios that historical averages miss',
        'Predicting the exact date of the next market crash',
        'Replacing the need for diversification',
      ],
      correct: 1,
      explanation:
        'Stress tests ask "what if?" — what if rates spike 200bps, what if oil doubles, what if credit spreads blow out? They reveal vulnerabilities that calm-period metrics hide.',
    },
    {
      question: 'What is a "historical scenario" stress test?',
      options: [
        "Applying a past crisis period's asset returns (e.g., 2008 GFC, 2020 COVID) to your current portfolio holdings",
        'Testing only the most recent month of data',
        'A scenario invented by analysts with no historical basis',
        'Testing portfolio performance in simulated future markets',
      ],
      correct: 0,
      explanation:
        'Historical scenarios replay real crisis return profiles on today\'s portfolio. "How would my current holdings have performed in March 2020?" is the most intuitive stress test.',
    },
    {
      question: 'What is a "hypothetical scenario" stress test?',
      options: [
        "A test using only the portfolio's best historical month",
        'A test that replays exact past market data',
        'A test that only applies to hypothetical portfolios, not real ones',
        'A forward-looking test applying analyst-defined shocks (e.g., "oil +50%, rates +300bps, USD +10%") to model portfolio impact',
      ],
      correct: 3,
      explanation:
        "Hypothetical scenarios test shocks that haven't happened yet or combine multiple factors simultaneously. They complement historical tests by exploring tail combinations history hasn't observed.",
    },
    {
      question:
        'During stress testing, why does correlation often increase compared to normal periods?',
      options: [
        'Correlations are fixed and never change',
        'Stress tests artificially inflate returns',
        'Correlations only decrease under stress',
        'In crises, the "flight to quality" and deleveraging cause previously uncorrelated assets to sell off together',
      ],
      correct: 3,
      explanation:
        'Stress tests should use stressed correlations (often 0.7–0.9), not calm-period correlations (0.2–0.4). Using normal correlations in stress tests systematically underestimates portfolio losses.',
    },
    {
      question: 'What is "reverse stress testing"?',
      options: [
        'Testing the portfolio in bull market conditions only',
        'Running the stress test backward in time',
        'Starting with a defined loss threshold (e.g., "what scenario causes a 30% portfolio loss?") and working backward to identify the scenarios that would cause it',
        'Testing only short positions',
      ],
      correct: 2,
      explanation:
        'Reverse stress testing asks: "What has to go wrong for me to lose 30%?" It identifies the specific combination of shocks that breaks your portfolio — often more actionable than forward scenario testing.',
    },
    {
      question:
        'Why is a 2008-style stress test still relevant for a portfolio with no direct mortgage exposure?',
      options: [
        "It isn't — only test scenarios matching your exact holdings",
        '2008 only affected mortgage-backed securities',
        'Liquidity crises transmit through correlated selloffs across all risk assets — equity, credit, commodities, and alternatives all fell together',
        'Stress tests expire after 5 years',
      ],
      correct: 2,
      explanation:
        'The GFC lesson is systemic contagion. Even diversified portfolios suffered 30–50% drawdowns because correlations spiked and liquidity evaporated across all risk assets simultaneously.',
    },
    {
      question: 'What is "factor stress testing"?',
      options: [
        'Testing individual stock factors only',
        'Applying shocks to underlying risk factors (rates, credit spreads, equity beta, FX, volatility) rather than individual asset prices',
        'Stress testing only factor-based ETFs',
        'A test that ignores macro factors',
      ],
      correct: 1,
      explanation:
        'Factor stress tests are more robust because they decompose portfolio risk into drivers. Shocking "rates +200bps" affects bonds, growth stocks, REITs, and utilities differently but through a common factor.',
    },
    {
      question:
        'A stress test shows your portfolio would lose 35% in a severe recession scenario. What is the appropriate response?',
      options: [
        'Ignore it — stress tests are theoretical',
        'Immediately sell everything',
        'Evaluate whether you can emotionally and financially withstand that drawdown; if not, reduce risk now while calm rather than during the crisis',
        'Leverage up because prices will be cheaper',
      ],
      correct: 2,
      explanation:
        'The value of stress testing is proactive adjustment. If a 35% loss would force you to sell at the bottom, reduce equity exposure, add hedges, or increase cash now — when you can think clearly.',
    },
    {
      question: 'What is "liquidity stress testing"?',
      options: [
        'Testing how long it takes to withdraw cash from a checking account',
        'Estimating whether you can exit positions at reasonable prices during a market freeze — when bid-ask spreads widen and volume collapses',
        'Testing only liquid large-cap stocks',
        'Measuring portfolio turnover rate',
      ],
      correct: 1,
      explanation:
        "In crises, the problem isn't just price decline — it's inability to sell at any price. Liquidity stress tests model execution at stressed bid prices and extended settlement times.",
    },
    {
      question:
        'Why should stress test results be reviewed regularly rather than once at portfolio inception?',
      options: [
        "Portfolio composition, correlations, and macro environment change — yesterday's stress profile may not reflect today's vulnerabilities",
        'Stress tests are only valid for one day',
        'Regulations require daily stress testing for all investors',
        'Markets never change so one test is sufficient',
      ],
      correct: 0,
      explanation:
        'A portfolio that was conservative in 2019 may be aggressive in 2025 after drift, new positions, and regime change. Re-stress after major allocation changes, market shifts, or at least quarterly.',
    },
  ],

  'risk-advanced-4': [
    {
      question: 'What is "decision fatigue" and how does it affect traders under pressure?',
      options: [
        'Physical exhaustion from staring at screens',
        'The deteriorating quality of decisions after prolonged cognitive effort — leading to impulsive trades, ignored rules, and simplified reasoning',
        'Fatigue caused by profitable trading sessions',
        'A medical condition unrelated to trading',
      ],
      correct: 1,
      explanation:
        'Willpower is a depleting resource. After hours of monitoring, each subsequent decision gets worse. Under pressure, pre-commitment to rules matters more because your decision quality is actively declining.',
    },
    {
      question:
        'What is the recommended approach when facing a large unexpected loss during a trading session?',
      options: [
        'Immediately enter a larger trade to recover the loss',
        'Stop trading, step away, and review whether the loss resulted from process failure or normal variance before deciding next steps',
        'Switch to a completely different market',
        'Increase leverage because variance "must" revert',
      ],
      correct: 1,
      explanation:
        'The first impulse after a large loss is revenge trading — the most dangerous response. Stopping preserves remaining capital and allows rational analysis. Was the loss within expected variance or a process break?',
    },
    {
      question:
        'Why is a pre-written trading plan especially critical during high-volatility events (FOMC, CPI, earnings)?',
      options: [
        'Volatility events are predictable and easy to trade',
        'High volatility increases emotional arousal and narrows cognitive focus — pre-written rules are your only defense against impulsive action',
        'Brokers require written plans during volatile events',
        'Volatility events always produce profits for prepared traders',
      ],
      correct: 1,
      explanation:
        'During FOMC minutes, cortisol spikes and tunnel vision sets in. Without pre-written entry, size, and exit rules, you will react to noise. The plan is your rational self speaking when your emotional self cannot.',
    },
    {
      question: 'What is "anchoring bias" under pressure and how does it manifest in trading?',
      options: [
        'Fixating on a reference price (entry, high, round number) and making exit decisions based on that anchor rather than current market structure',
        'Anchoring your boat during market hours',
        'Bias toward anchor stocks in the Dow',
        'Using anchor charts exclusively',
      ],
      correct: 0,
      explanation:
        'Under pressure, traders anchor to entry price ("I\'ll sell when I\'m breakeven") or the day\'s high ("It was $155 an hour ago, it\'ll go back"). Current market structure, not historical anchors, should drive decisions.',
    },
    {
      question: 'What physical techniques help maintain decision quality under trading pressure?',
      options: [
        'Drinking more caffeine to stay alert',
        'Structured breathing, brief physical movement, and hydration — which reduce cortisol and restore prefrontal cortex function',
        'Trading faster to get through the pressure event',
        'Avoiding all food during trading hours',
      ],
      correct: 1,
      explanation:
        'Physiology drives psychology. Box breathing (4-4-4-4), a 5-minute walk, and water reduce the fight-or-flight response that hijacks rational trading decisions during volatile sessions.',
    },
    {
      question:
        'Why should position sizes be REDUCED (not increased) during high-volatility periods?',
      options: [
        'Smaller sizes in volatile markets maintain constant dollar risk because the same price move represents a larger percentage',
        'Volatility has no effect on position sizing',
        'Brokers require smaller sizes during volatility',
        'Smaller sizes guarantee profits',
      ],
      correct: 0,
      explanation:
        'If your stop is 2× ATR and ATR doubles in volatility, the same share count risks twice as much. Cut size in half to maintain constant dollar risk. This is how professionals survive volatile regimes.',
    },
    {
      question: 'What is a "if-then" contingency plan in pressure trading?',
      options: [
        'A legal contract with your broker',
        'Pre-defined responses to specific scenarios: "If the market drops 3% in the first hour, then I reduce all positions by 50% and stop trading for the day"',
        'A plan that only applies to winning trades',
        'An algorithmic trading bot configuration',
      ],
      correct: 1,
      explanation:
        "If-then plans eliminate real-time decision-making under stress. You've already decided what to do when X happens — you just execute. This is how pilots, surgeons, and professional traders handle emergencies.",
    },
    {
      question: 'What is "analysis paralysis" under pressure?',
      options: [
        "Over-analyzing to the point of inaction — missing valid setups or failing to cut losses because you're seeking one more confirming data point",
        'Paralysis caused by too many profitable opportunities',
        'A technical indicator signal',
        'Being unable to open the trading platform',
      ],
      correct: 0,
      explanation:
        "Under pressure, the desire for certainty increases. But markets don't offer certainty. Pre-defined rules with clear triggers (not ambiguous conditions) prevent paralysis by reducing the decision to a binary: rule met or not.",
    },
    {
      question:
        'Why is trading with "house money" (profits from earlier in the session) psychologically dangerous?',
      options: [
        'House money profits are tax-free',
        'The "house money effect" causes reckless risk-taking with unrealized gains — treating them as "free" money not worth protecting',
        'Brokers confiscate house money at end of day',
        'House money refers to borrowed funds only',
      ],
      correct: 1,
      explanation:
        'After a big morning win, traders often increase afternoon size because "I\'m playing with house money." Those profits are real. Risking them recklessly turns a good day into a breakeven or losing day.',
    },
    {
      question: 'What is the "one-good-decision" framework for trading under pressure?',
      options: [
        'Making one trade per day regardless of conditions',
        'In a crisis, focus on making just the next correct decision (cut this loss, reduce this size) rather than trying to solve the entire portfolio problem at once',
        'Only trading one asset class',
        'Making decisions once per week',
      ],
      correct: 1,
      explanation:
        'Under pressure, the overwhelm of total P&L damage causes panic. Narrow focus to the single next action: "Should I close this one position?" One good decision at a time rebuilds control without requiring a grand plan.',
    },
  ],

  'risk-expert-1': [
    {
      question: 'What are the "Three Lines of Defense" in institutional risk management?',
      options: [
        'Technical, fundamental, and sentiment analysis',
        'Operational business units (1st), independent risk/compliance functions (2nd), and internal audit (3rd)',
        'Stop loss, take profit, and position size',
        'Equity, fixed income, and alternatives',
      ],
      correct: 1,
      explanation:
        'First line: business units own and manage their risks. Second line: independent risk and compliance oversee and challenge. Third line: internal audit provides independent assurance. Separation prevents conflicts of interest.',
    },
    {
      question: 'What is Value-at-Risk (VaR) model validation and why is it critical?',
      options: [
        'Checking that VaR software is installed correctly',
        'Backtesting VaR predictions against actual losses to verify the model is calibrated — too many breaches means the model underestimates risk',
        'Validating that VaR is always positive',
        'A one-time setup procedure with no ongoing need',
      ],
      correct: 1,
      explanation:
        'If your 99% VaR is breached 5% of the time instead of 1%, the model is wrong. Continuous backtesting and recalibration are required — especially after regime changes.',
    },
    {
      question: 'What is the difference between "risk appetite" and "risk tolerance"?',
      options: [
        'They are identical terms used interchangeably',
        "Risk appetite is the organization's strategic willingness to take risk; risk tolerance is the acceptable deviation from objectives before action is required",
        'Risk tolerance is always higher than risk appetite',
        'Risk appetite applies only to traders, tolerance to investors',
      ],
      correct: 1,
      explanation:
        'Appetite = "We are a growth fund willing to accept 15% drawdowns." Tolerance = "If drawdown exceeds 12%, we reduce exposure." Appetite is strategic; tolerance triggers action.',
    },
    {
      question: 'What is an Risk Management Framework (RMF) and its core components?',
      options: [
        'A single spreadsheet tracking daily P&L',
        'A structured approach encompassing governance, risk identification, assessment, mitigation, monitoring, and reporting — integrated into business decisions',
        'A framework only used by banks',
        'A technical analysis methodology',
      ],
      correct: 1,
      explanation:
        'Professional RMF (COSO, ISO 31000) embeds risk management into strategy, not as a separate compliance function. Components: governance, identification, assessment, response, monitoring, communication.',
    },
    {
      question: 'What is "risk culture" and why do regulators emphasize it?',
      options: [
        "The cultural sector's market risk",
        'The shared values, beliefs, and behaviors that determine how an organization responds to risk — which ultimately drives outcomes more than models or policies',
        'A type of alternative investment',
        'Culture is irrelevant to risk management',
      ],
      correct: 1,
      explanation:
        'Long-Term Capital Management had Nobel laureates and sophisticated models but a culture of excessive leverage. Regulators post-2008 focus on culture because models are only as good as the behavior around them.',
    },
    {
      question: 'What is Counterparty Risk Management and when does it matter most?',
      options: [
        'Risk that your trading counterparty fails to fulfill obligations — critical during liquidity crises when counterparty defaults cascade',
        'Risk of trading against counter-trend signals',
        'Risk only relevant in OTC derivatives markets',
        'Risk managed by using market orders only',
      ],
      correct: 0,
      explanation:
        "Lehman Brothers' collapse demonstrated counterparty risk: thousands of trades became worthless overnight. Professional frameworks include credit limits, collateral (margin), netting agreements, and central clearing.",
    },
    {
      question: 'What is the role of a Chief Risk Officer (CRO) in a professional framework?',
      options: [
        'Executing trades on behalf of the firm',
        'Providing independent oversight of enterprise-wide risk, with authority to challenge business units and escalate to the board',
        "Marketing the firm's risk products",
        'Managing only operational IT risk',
      ],
      correct: 1,
      explanation:
        "The CRO must be independent from profit-generating units — reporting to the CEO or board, not the head of trading. Independence ensures risk concerns aren't suppressed for short-term P&L.",
    },
    {
      question: 'What is "risk aggregation" and its key challenge?',
      options: [
        'Adding up all profits from different desks',
        'Combining risk measures across business units while accounting for diversification and correlation — challenging because correlations shift in stress',
        'Aggregating only market risk, ignoring credit risk',
        'Summing individual VaRs without adjustment always gives accurate total risk',
      ],
      correct: 1,
      explanation:
        'Simple VaR addition assumes perfect correlation (conservative). Diversified VaR assumes normal correlations (understates stress). Professional frameworks use copulas, stressed correlations, and scenario aggregation.',
    },
    {
      question: 'What is an Risk Register in professional risk management?',
      options: [
        'A broker account registration form',
        'A living document cataloging identified risks, their likelihood, impact, owners, and mitigation actions — reviewed and updated regularly',
        'A register of all profitable trades',
        'A regulatory filing submitted annually',
      ],
      correct: 1,
      explanation:
        "The risk register makes risk visible and accountable. Each entry has an owner, mitigation plan, and review date. Without it, risks exist in individual heads but aren't managed at the organizational level.",
    },
    {
      question:
        'Why do professional frameworks distinguish between "risk management" and "risk governance"?',
      options: [
        'Governance is optional while management is mandatory',
        'Management is the process of identifying and mitigating risks; governance is the structure of accountability, policies, and oversight that ensures management actually happens',
        'They are the same function with different names',
        'Governance only applies to public companies',
      ],
      correct: 1,
      explanation:
        'Governance sets the rules: board risk committee, risk appetite statements, CRO independence, reporting lines. Management executes within those rules. Without governance, management becomes box-checking.',
    },
  ],

  'risk-expert-2': [
    {
      question: 'What is the first priority in a crisis playbook when markets are in freefall?',
      options: [
        'Deploy all available cash into the cheapest assets immediately',
        'Preserve capital and liquidity — assess what you hold, what you owe, and what you can exit without catastrophic slippage',
        'Short the market aggressively',
        'Ignore the crisis and maintain all positions',
      ],
      correct: 1,
      explanation:
        'In a crisis, the question is survival, not opportunity. Map your exposures, margin requirements, liquidity profile, and counterparty risk before making any tactical moves.',
    },
    {
      question: 'What is "deleveraging" during a crisis and why does it cascade?',
      options: [
        'Banks increasing lending to stimulate the economy',
        'Forced selling of assets to meet margin calls or redemption requests — which pushes prices lower, triggering more margin calls in a self-reinforcing loop',
        'Government policy to reduce national debt',
        'Investors voluntarily reducing positions for tax purposes',
      ],
      correct: 1,
      explanation:
        'The 2008 and 2020 cascades: falling prices → margin calls → forced selling → lower prices → more margin calls. Understanding this loop explains why crises accelerate and why liquidity is the first casualty.',
    },
    {
      question: 'What role does cash play in a crisis playbook?',
      options: [
        'Cash is trash — always be fully invested',
        'Cash is optionality — it allows you to buy quality assets at distressed prices when others are forced to sell',
        'Cash loses all value during crises',
        'Cash should be converted to gold immediately',
      ],
      correct: 1,
      explanation:
        'Buffett held $128B in cash before deploying into crisis bargains. Cash earns nothing in calm markets but is invaluable during crises when having dry powder separates survivors from victims.',
    },
    {
      question: 'What is a "flight to quality" during market crises?',
      options: [
        'Investors moving from speculative assets to safe havens — Treasuries, gold, USD, and high-quality short-duration bonds',
        'Airlines outperforming during crises',
        'Quality stocks always rising while everything else falls',
        'A regulatory mandate to buy quality stocks',
      ],
      correct: 0,
      explanation:
        'Flight to quality is the first reflex in panics. Treasuries rally (yields fall), USD strengthens, gold often rises, and speculative assets get sold indiscriminately. Crisis playbooks account for this rotation.',
    },
    {
      question: 'Why should a crisis playbook be written and rehearsed BEFORE a crisis occurs?',
      options: [
        'Crises are predictable and can be timed',
        'During a crisis, cognitive function degrades — pre-written protocols with clear triggers ensure disciplined action when emotions would otherwise dominate',
        'Rehearsal guarantees profits during crises',
        'Crises no longer occur in modern markets',
      ],
      correct: 1,
      explanation:
        'Fire drills exist because people panic in fires. A crisis playbook with predefined triggers ("if VIX > 40, reduce equity to 40%") removes real-time decision-making when it\'s least reliable.',
    },
    {
      question: 'What is "liquidity tiering" in a crisis playbook?',
      options: [
        'Ranking assets by expected return',
        'Classifying holdings by how quickly and cheaply they can be sold — ensuring you know which assets to sell first if forced to raise cash',
        'Tiering brokers by commission rates',
        'Organizing trades by size',
      ],
      correct: 1,
      explanation:
        'Tier 1: cash and T-bills (instant). Tier 2: large-cap equities (hours). Tier 3: corporate bonds (days, with spread cost). Tier 4: private/alternative (weeks to months, fire-sale prices). Know your tiers before you need them.',
    },
    {
      question: 'What is the "breakdown playbook" for when correlations go to 1?',
      options: [
        'A plan for when diversification fails — including pre-identified hedges (Treasuries, puts, cash), maximum portfolio heat limits, and circuit breakers',
        'A plan for when trading platforms crash',
        'A technical analysis pattern',
        'A plan only for bond traders',
      ],
      correct: 0,
      explanation:
        'Every crisis playbook must include a "when diversification fails" section. Pre-positioned hedges, hard portfolio heat limits, and personal circuit breakers are the backup when all risk assets fall together.',
    },
    {
      question:
        "During the 2020 COVID crash, what did the Fed's emergency response teach crisis playbook designers?",
      options: [
        'Central banks will never intervene in markets',
        "Policy response speed and magnitude matter — the Fed's rapid liquidity injection truncated what could have been a multi-year bear market into a weeks-long crash",
        'COVID had no market impact',
        'Emergency responses always fail',
      ],
      correct: 1,
      explanation:
        'Crisis playbooks must include a "policy response" scenario. The speed and scale of central bank intervention (rate cuts, QE, credit facilities) can dramatically alter crisis trajectories — plan for both delayed and aggressive policy responses.',
    },
    {
      question: 'What is "opportunistic rebalancing" in a crisis playbook?',
      options: [
        'Rebalancing on a fixed calendar schedule regardless of conditions',
        'Deliberately shifting toward assets that have been disproportionately sold — buying quality at distressed prices when forced selling creates mispricings',
        'Only rebalancing bond portfolios',
        'Avoiding all rebalancing during crises',
      ],
      correct: 1,
      explanation:
        'Crises create the best buying opportunities because forced selling drives prices below fundamental value. A playbook pre-defines: "If the S&P drops 30% from highs, deploy 25% of cash reserves into index ETFs."',
    },
    {
      question:
        'What communication protocol should a crisis playbook include for managed accounts or partners?',
      options: [
        'No communication until the crisis is over',
        'Pre-defined communication templates, frequency, and escalation paths — proactive transparency reduces panic redemptions and maintains trust',
        'Only communicate if the portfolio is up',
        'Communication is optional during crises',
      ],
      correct: 1,
      explanation:
        "Silence during a crisis breeds fear and redemption requests. Pre-written templates (\"Here's what we hold, here's our plan, here's why we're not panicking\") maintain confidence and prevent forced selling at the worst time.",
    },
  ],

  'risk-expert-3': [
    {
      question:
        'What is "systematic risk management" as distinct from discretionary risk management?',
      options: [
        'Risk management applied only to systematic (market) risk, ignoring idiosyncratic risk',
        'A rules-based, automated approach where risk limits, position sizing, and exits are codified and executed without emotional intervention',
        'Managing risk in systematic trading strategies only',
        'A quarterly review process',
      ],
      correct: 1,
      explanation:
        'Systematic risk management removes human discretion from risk decisions. Rules are coded, backtested, and executed automatically — eliminating the emotional failures that discretionary traders consistently exhibit.',
    },
    {
      question: 'What is a "kill switch" in systematic risk management?',
      options: [
        'A button that permanently closes your brokerage account',
        'An automated mechanism that halts all trading when predefined loss thresholds, error rates, or anomaly conditions are breached',
        'A switch between live and paper trading',
        'A method for eliminating losing strategies from a portfolio',
      ],
      correct: 1,
      explanation:
        'Kill switches are non-negotiable circuit breakers: "If daily loss exceeds 3%, close all positions and halt trading." Knight Capital lost $440M in 45 minutes without one. Every systematic system needs a kill switch.',
    },
    {
      question: 'What is "risk parity" as a systematic allocation approach?',
      options: [
        'Allocating equal dollar amounts to each asset',
        'Allocating so each asset class contributes equally to total portfolio risk — typically requiring leverage on lower-volatility assets like bonds',
        'Parity between long and short positions only',
        'Equal risk per trade regardless of asset',
      ],
      correct: 1,
      explanation:
        'Traditional 60/40 is ~90% equity risk. Risk parity balances risk contributions — more bonds (often levered), commodities, and alternatives — so no single factor dominates portfolio volatility.',
    },
    {
      question: 'What is "drawdown control" in systematic risk management?',
      options: [
        'Preventing any losing day',
        'Dynamically reducing exposure as drawdowns deepen — using rules like "at -5% drawdown, reduce equity allocation by 25%" to limit cascade losses',
        'Controlling the drawdown of individual charts',
        'A manual process requiring daily judgment calls',
      ],
      correct: 1,
      explanation:
        'Systematic drawdown control removes the hardest discretionary decision: when to reduce risk. Pre-coded rules scale down exposure as losses mount, preserving capital for recovery.',
    },
    {
      question: 'What is "regime detection" and why is it critical for systematic risk systems?',
      options: [
        'Detecting regulatory regime changes',
        'Identifying shifts between market environments (low-vol trending, high-vol mean-reverting, crisis) and adjusting risk parameters accordingly',
        'Detecting which political regime is in power',
        'A one-time calibration at system launch',
      ],
      correct: 1,
      explanation:
        'A strategy optimized for low-vol trending markets will bleed in high-vol choppy markets. Systematic regime detection (volatility level, trend strength, correlation structure) triggers parameter adjustments automatically.',
    },
    {
      question: 'What is "tail risk hedging" in a systematic framework?',
      options: [
        'Hedging only the most probable outcomes',
        'Systematically purchasing cheap out-of-the-money puts or maintaining crisis hedges as a permanent portfolio insurance cost — accepting small drag for crash protection',
        'Hedging only during earnings season',
        'Eliminating all tail risk through diversification alone',
      ],
      correct: 1,
      explanation:
        'Tail hedges (OTM puts, VIX calls, trend-following overlays) cost premium in calm markets but pay massively in crashes. Systematic frameworks budget this cost as insurance, not alpha.',
    },
    {
      question: 'What is "position limit enforcement" in systematic risk management?',
      options: [
        'A suggestion to limit position sizes',
        'Hard-coded maximum position sizes, sector concentrations, and leverage limits that the system cannot override — even when signals are strong',
        'Limits set manually each morning',
        'Limits that apply only to losing positions',
      ],
      correct: 1,
      explanation:
        'Human override of position limits is how Archegos built $100B in hidden exposure. Systematic enforcement means the code physically cannot exceed limits — no matter how compelling the trade looks.',
    },
    {
      question: 'What is the role of " Monte Carlo simulation" in systematic risk management?',
      options: [
        'A casino-based trading strategy',
        'Running thousands of randomized scenarios to estimate the range of possible portfolio outcomes and calibrate risk limits to acceptable confidence levels',
        'Simulating only the best-case scenario',
        'A marketing tool with no analytical value',
      ],
      correct: 1,
      explanation:
        'Monte Carlo generates thousands of possible future paths based on return distributions and correlations. It reveals the probability of various drawdown levels — essential for setting risk limits with quantified confidence.',
    },
    {
      question: 'What is "adaptive position sizing" in systematic frameworks?',
      options: [
        'Fixed position sizes regardless of conditions',
        'Position sizes that automatically adjust based on current volatility, recent performance, and regime indicators — larger in favorable conditions, smaller in adverse ones',
        'Sizes adjusted manually by the portfolio manager daily',
        'Only increasing sizes, never decreasing',
      ],
      correct: 1,
      explanation:
        'Adaptive sizing (e.g., volatility targeting) maintains constant risk exposure. When vol doubles, size halves automatically. This prevents the common failure mode of fixed sizing during regime changes.',
    },
    {
      question: 'Why must systematic risk systems include "model decay monitoring"?',
      options: [
        'Models never decay — once built, they work forever',
        "Markets evolve, and strategies that worked in one regime lose edge in another — continuous monitoring detects when a model's risk/return profile is deteriorating before major losses occur",
        'Decay monitoring is only for machine learning models',
        'Model decay is a theoretical concept with no practical application',
      ],
      correct: 1,
      explanation:
        'Every edge decays as markets adapt. Systematic monitoring tracks rolling Sharpe, hit rate, and drawdown metrics. When performance degrades beyond statistical thresholds, the system reduces allocation or halts — before human intuition catches on.',
    },
  ],

  'risk-expert-4': [
    {
      question: 'What is "edge" in the context of professional trading?',
      options: [
        'Trading from the edge of your seat during volatile markets',
        'A statistical advantage that produces positive expectancy over a large sample of trades — a repeatable source of profit after costs',
        'Having insider information',
        'Using the most advanced charting software',
      ],
      correct: 1,
      explanation:
        'Edge = positive expectancy: (Win% × Avg Win) - (Loss% × Avg Loss) > 0, after costs. Without edge, risk management only delays ruin. With edge, risk management determines how fast you compound.',
    },
    {
      question: 'What is the relationship between edge, position sizing, and risk of ruin?',
      options: [
        'Larger positions always increase edge',
        'Edge determines direction (profit vs loss); position sizing determines speed and survival — even positive edge leads to ruin with oversized bets',
        'Risk of ruin is zero with any positive edge',
        'Position sizing is irrelevant if you have edge',
      ],
      correct: 1,
      explanation:
        'A coin flip with 51% edge will still bankrupt you if you bet 50% of capital each time. Edge is necessary but not sufficient — sizing determines whether you survive long enough for edge to manifest.',
    },
    {
      question: 'What is "sample size" significance when validating a trading edge?',
      options: [
        'Only the most recent 5 trades matter',
        'Edge validation requires sufficient trades (typically 100+ for most strategies) to distinguish genuine edge from random variance',
        'Sample size is irrelevant — one big win proves edge',
        '1000 trades minimum for any strategy',
      ],
      correct: 1,
      explanation:
        "A 70% win rate over 10 trades could easily be luck. Over 200 trades, it's almost certainly skill. Underpowered sample sizes cause traders to abandon valid edges (or persist with invalid ones) based on noise.",
    },
    {
      question: 'What is "edge erosion" and what causes it?',
      options: [
        'Physical wear on trading equipment',
        "The gradual decline of a strategy's profitability as more participants discover and crowd the same approach, compressing returns",
        'Edge erosion only affects retail traders',
        'Government regulations causing edge erosion',
      ],
      correct: 1,
      explanation:
        'Every public edge gets crowded. Momentum worked better in the 1990s than today. Mean reversion in ETFs is weaker now than a decade ago. Continuous research and adaptation are required to maintain edge.',
    },
    {
      question: 'What is a "trading journal edge audit" and what should it track?',
      options: [
        'Only recording profitable trades',
        'Systematically logging entry rationale, market conditions, execution quality, and outcome — then analyzing patterns to identify which conditions produce your edge and which destroy it',
        "Auditing your broker's fees",
        'Tracking only losing trades for tax purposes',
      ],
      correct: 1,
      explanation:
        'Edge lives in specific conditions. Your journal might reveal: "My edge exists in trending markets above the 200 MA but I lose in ranges." That insight lets you trade when you have edge and sit out when you don\'t.',
    },
    {
      question: 'What is "multi-strategy edge" and its advantage over single-strategy dependence?',
      options: [
        'Running multiple copies of the same strategy',
        'Combining uncorrelated strategies (trend, mean reversion, carry, vol) so that when one loses, others may profit — stabilizing the equity curve',
        'Using multiple brokers for the same trades',
        'Edge that only works in multiple timeframes simultaneously',
      ],
      correct: 1,
      explanation:
        'Renaissance, Citadel, and other top firms run dozens of uncorrelated strategies. No single strategy works all the time. Multi-strategy portfolios have smoother returns and lower drawdowns than any individual strategy.',
    },
    {
      question: 'What is the "expectancy formula" and how do you use it to validate edge?',
      options: [
        'Expected Return = (Win Rate × Average Win) - (Loss Rate × Average Loss); positive expectancy over 100+ trades confirms edge',
        'Expectancy = total profit / number of years',
        'Expectancy is a technical indicator on charts',
        'Expectancy cannot be calculated for discretionary traders',
      ],
      correct: 0,
      explanation:
        'Expectancy of $50/trade means you expect to make $50 per trade over time. Combined with win rate and payoff ratio, it determines optimal sizing (Kelly) and whether the strategy is worth trading at all.',
    },
    {
      question: 'What is "execution edge" and how does it differ from "signal edge"?',
      options: [
        'They are the same thing',
        'Signal edge is identifying what to trade; execution edge is capturing the identified opportunity at minimal cost through superior order routing, timing, and market microstructure understanding',
        'Execution edge only matters for institutional traders',
        'Signal edge is more important and execution does not matter',
      ],
      correct: 1,
      explanation:
        'A strategy with 0.2% signal edge but 0.15% execution cost (slippage, spread, impact) retains only 0.05%. Execution edge — smart order routing, limit vs market timing, dark pools — can double net returns.',
    },
    {
      question: 'Why is "intellectual honesty" about edge the hallmark of expert risk management?',
      options: [
        'Experts never lose money',
        'Acknowledging when you have no edge (and not trading) is as important as exploiting edge when you have it — most losses come from trading without edge',
        'Intellectual honesty means always being bullish',
        'Experts have permanent edge that never decays',
      ],
      correct: 1,
      explanation:
        'The hardest decision is not trading. Most retail losses come not from bad risk management on valid trades, but from taking trades with no edge. Expertise is knowing the difference and having the discipline to wait.',
    },
    {
      question:
        'What is "compounding edge" and why is it the ultimate goal of systematic risk management?',
      options: [
        'Edge that compounds interest on cash balances',
        'The combination of positive expectancy, optimal position sizing, drawdown control, and reinvestment that produces exponential wealth growth over time — the intersection of edge and survival',
        'A type of compound option strategy',
        'Edge that only works in compound interest calculations',
      ],
      correct: 1,
      explanation:
        'Compounding edge = Edge × Sizing × Survival × Time. Miss any factor and you fail. Positive edge with bad sizing = ruin. Good sizing without edge = slow bleed. Both without drawdown control = panic exit. All four together = compounding.',
    },
  ],
};

export default QUIZ_BANK;
