/**
 * Bronze-tier course content: betting, commodities, risk tracks.
 * Bronze crypto (crypto-basic-1..8) lives in course-content-crypto-bronze.js.
 * Shape matches buildPlaceholderContent. Educational tone; no fabricated citations.
 */

function q(question, options, correctIndex, explanation) {
  return { question, options, correctIndex, explanation };
}

const mk = (sections, quiz) => ({ sections, quiz });

export default {
  'betting-basic-1': mk(
    [
      {
        title: 'Prediction markets in one sentence',
        content:
          'Prediction markets let participants trade contracts whose payouts depend on real-world outcomes — aggregating beliefs into prices that approximate probabilities. Liquidity and design matter: thin markets can swing wildly; deep markets often outperform polls for some event types.',
      },
      {
        title: 'Why prices move',
        content:
          'Prices change as traders incorporate new information and as risk-averse participants demand compensation for holding risky positions. A 60-cent price does not mean “60% true” in every model — it reflects marginal trader beliefs plus fees and constraints.',
      },
      {
        title: 'Ezana context',
        content:
          'Platforms like Polymarket have popularized crypto-settled event markets. Always read the resolution rules: ambiguous wording causes disputes. The market price is only as good as the rulebook.',
      },
    ],
    [
      q(
        'A prediction market price can be interpreted as:',
        [
          'A guaranteed outcome',
          'A sports score',
          'A market-implied probability blended with fees and risk premia',
          'A bank interest rate',
        ],
        2,
        'It is informative but not infallible.',
      ),
      q(
        'Liquidity matters because:',
        [
          'Thin books mean small trades move prices more',
          'It only affects colors',
          'It removes all risk',
          'It bans retail',
        ],
        0,
        'Depth reduces slippage and noise.',
      ),
      q(
        'Resolution rules matter because:',
        [
          'They are irrelevant',
          'They are always identical',
          'They replace math',
          'They define what counts as winning',
        ],
        3,
        'Read the contract carefully before trading.',
      ),
      q(
        'Why might prediction markets outperform simple polls?',
        [
          'They always bribe voters',
          'Participants have financial incentives to be informed',
          'They ignore news',
          'They sample randomly',
        ],
        1,
        'Skin in the game can aggregate information.',
      ),
      q(
        'New information tends to:',
        [
          'Move prices as traders update beliefs',
          'Never affect prices',
          'Freeze markets forever',
          'Guarantee arbitrage profits',
        ],
        0,
        'Markets are forward-looking.',
      ),
    ],
  ),

  'betting-basic-2': mk(
    [
      {
        title: 'Decimal odds',
        content:
          'Decimal odds of 3.0 mean a winning one-unit stake returns three units total (profit plus stake). Implied probability is roughly 1/decimal for fair-ish markets before margin — bookmakers embed margin so implied probabilities sum above 100%.',
      },
      {
        title: 'American odds',
        content:
          'Positive American odds (+200) show profit on a $100 stake; negative (-150) shows how much you must stake to win $100. Converting formats is essential when line shopping.',
      },
      {
        title: 'Implied probability',
        content:
          'Implied probability is the break-even win rate needed ignoring fees. Comparing implied probability to your own estimate is the start of value betting — never the end.',
      },
    ],
    [
      q(
        'Decimal odds of 2.5 on a winning bet return:',
        [
          'Exactly 1 unit always',
          '0 units',
          '2.5 units total including stake in typical display',
          'Stake × 10',
        ],
        2,
        'Decimal includes stake in the return multiple (check your book’s display).',
      ),
      q(
        'American odds of +300 imply a $100 bet wins how much profit if successful?',
        ['$30', '$300', '$3', '$100'],
        1,
        '+300 means $300 profit on $100 stake at standard interpretation.',
      ),
      q(
        'Bookmaker margin causes:',
        [
          'Perfect efficiency with no spread',
          'Free money',
          'Negative decimals',
          'Implied probabilities to sum above 100%',
        ],
        3,
        'The overround is how books earn.',
      ),
      q(
        'Implied probability helps you:',
        [
          'Guarantee wins',
          'Eliminate variance',
          'Compare market price to your own fair odds',
          'Avoid math',
        ],
        2,
        'Edge is the gap between belief and price — if you are calibrated.',
      ),
      q(
        'Fractional odds 5/1 profit on a 1-unit stake is:',
        ['5 units profit', '1 unit', '6 units total always', '0.2 units'],
        0,
        'Classic fractional shows profit relative to stake.',
      ),
    ],
  ),

  'betting-basic-3': mk(
    [
      {
        title: 'Spreads and moneylines',
        content:
          'Point spreads handicap favorites: covering means beating the spread after the adjustment. Moneylines pick winners outright with odds reflecting strength. Totals (over/under) bet combined scores. Parlays multiply payouts but multiply risk — each leg must win.',
      },
      {
        title: 'House edge',
        content:
          'Sportsbooks embed margin in lines. Beating sports long-run requires finding mispriced lines — not picking winners more often in a naive sense. Bankroll discipline keeps you in the game while signal accumulates.',
      },
      {
        title: 'Variance',
        content:
          'Even positive-expectation bets can lose for long streaks due to variance. Short-term results are noisy; evaluate process over many bets.',
      },
    ],
    [
      q(
        'A favorite “covers the spread” when:',
        [
          'They win the game',
          'The game ties always',
          'They win after applying the point spread adjustment',
          'The spread is zero',
        ],
        2,
        'Spread betting is about margin of victory, not only W/L.',
      ),
      q(
        'A parlay loses if:',
        ['Any leg loses', 'Any leg wins', 'The first leg loses only', 'Weather is cold'],
        0,
        'Parlays chain outcomes — variance spikes.',
      ),
      q(
        'The sportsbook’s margin mainly:',
        [
          'Guarantees you win',
          'Eliminates randomness',
          'Sets player salaries',
          'Skews lines so implied probabilities include profit for the book',
        ],
        3,
        'You are paying for market making and risk.',
      ),
      q(
        'Why is “picking winners” alone a weak strategy?',
        [
          'Win rate without odds is meaningless',
          'Edges live in price vs probability',
          'Sports are random',
          'Books are illegal',
        ],
        1,
        'Value is price-relative.',
      ),
      q(
        'Variance means:',
        [
          'Short-run outcomes can deviate wildly from expectation',
          'Results equal expectation every time',
          'Odds never change',
          'Kelly is illegal',
        ],
        0,
        'Even good processes face losing streaks.',
      ),
    ],
  ),

  'betting-basic-4': mk(
    [
      {
        title: 'Getting started safely',
        content:
          'Create an account on a reputable platform, enable two-factor authentication, and fund with amounts you can afford to lose. Read each market’s rules: some markets resolve on specific oracles or sources. Start small while learning order types and fees.',
      },
      {
        title: 'Orders and liquidity',
        content:
          'Limit orders control price; market orders prioritize speed. In thin markets, market orders can slip badly. Watch the order book depth when sizing trades.',
      },
      {
        title: 'Responsible participation',
        content:
          'Treat prediction markets as high-risk entertainment unless you have a verified edge and strict bankroll rules. Seek help if trading causes distress.',
      },
    ],
    [
      q(
        'Before trading a Polymarket-style contract you should:',
        [
          'Ignore the rules',
          'Max leverage always',
          'Read resolution criteria and fee schedule',
          'Share your seed phrase',
        ],
        2,
        'Ambiguous rules cause disputes and losses.',
      ),
      q(
        'Two-factor authentication helps because:',
        [
          'It removes fees',
          'It adds a second layer beyond password theft',
          'It guarantees profits',
          'It replaces KYC',
        ],
        1,
        'Stolen passwords are common; 2FA mitigates.',
      ),
      q(
        'Market orders in illiquid books may:',
        [
          'Always fill at mid',
          'Be free',
          'Cancel automatically',
          'Execute at worse prices than expected (slippage)',
        ],
        3,
        'Depth protects execution quality.',
      ),
      q(
        'You should size positions:',
        ['With rent money', 'Randomly', 'With money you can afford to lose', 'Based on horoscopes'],
        2,
        'Prediction markets are risky and can go to zero.',
      ),
      q(
        'Limit orders help traders:',
        [
          'Control execution price at the risk of non-fill',
          'Guarantee fills',
          'Eliminate taxes',
          'Remove oracle risk',
        ],
        0,
        'Price vs certainty trade-off.',
      ),
    ],
  ),

  'betting-basic-5': mk(
    [
      {
        title: 'Crowd wisdom',
        content:
          'Aggregating diverse independent estimates can outperform individual experts under the right conditions — but markets need sufficient participation and incentives. Manipulation and thin liquidity break the magic.',
      },
      {
        title: 'Information incorporation',
        content:
          'Prices should reflect available public information quickly when traders compete. If some participants have private information, markets may be less “fair” in the informational sense.',
      },
      {
        title: 'Limits',
        content:
          'Crowds can herd and panic. Financial markets and prediction markets both suffer bubbles. Use markets as inputs, not oracles of moral truth.',
      },
    ],
    [
      q(
        'The “wisdom of crowds” works best when:',
        [
          'Everyone copies one influencer',
          'No one trades',
          'Estimates are diverse and independent',
          'Information is secret to one person',
        ],
        2,
        'Diversity reduces correlated error.',
      ),
      q(
        'Manipulation can break prediction markets when:',
        [
          'A trader can move prices with relatively small size',
          'Liquidity is deep',
          'Regulators exist',
          'There are fees',
        ],
        0,
        'Thin markets are fragile.',
      ),
      q(
        'Prediction market prices update when:',
        [
          'Only once per year',
          'Never',
          'Only if the SEC posts',
          'Traders incorporate new information',
        ],
        3,
        'Markets are forward-looking mechanisms.',
      ),
      q(
        'Herding can cause:',
        [
          'More accurate prices always',
          'Bubbles and correlated mistakes',
          'Zero volatility',
          'Perfect forecasts',
        ],
        1,
        'Independence assumption fails.',
      ),
      q(
        'A fair market in the economic sense:',
        [
          'Still can be wrong ex post about outcomes',
          'Means you always win',
          'Ignores probabilities',
          'Eliminates risk',
        ],
        0,
        'Good prices ≠ guaranteed truth.',
      ),
    ],
  ),

  'betting-basic-6': mk(
    [
      {
        title: 'Bankroll basics',
        content:
          'Your bankroll is the dedicated trading stake — separate from living expenses. Risking a tiny fraction per bet (often 1–2% or less of bankroll) prevents ruin during losing streaks. Chasing losses with larger bets is a common path to zero.',
      },
      {
        title: 'Kelly criterion (intro)',
        content:
          'Kelly sizing suggests bet size grows with edge and shrinks with odds — but real Kelly requires accurate probability estimates and can be volatile. Many pros use fractional Kelly to reduce variance.',
      },
      {
        title: 'Emotional discipline',
        content:
          'Tilt after losses leads to oversized bets. Pre-commit to rules and take breaks. Track results to see if your edge is real or imagined.',
      },
    ],
    [
      q(
        'Why do professionals avoid betting the rent?',
        [
          'Rent is too cheap',
          'Landlords forbid it',
          'Ruin risk dominates even with a small edge',
          'Taxes are zero',
        ],
        2,
        'Survival first — then edge.',
      ),
      q(
        'Chasing losses typically:',
        [
          'Restores EV',
          'Increases risk of ruin and emotional decisions',
          'Is required',
          'Guarantees recovery',
        ],
        1,
        'Negative expectancy spirals hurt.',
      ),
      q(
        'Fractional Kelly is often used because:',
        [
          'It is illegal',
          'It removes all risk',
          'It doubles your bankroll daily',
          'Full Kelly assumes perfect probabilities and can be very volatile',
        ],
        3,
        'Real-world uncertainty warrants downsizing.',
      ),
      q(
        'A 1% per-bet rule means:',
        [
          'You always win 1%',
          'You bet once per year',
          'Each bet risks ~1% of bankroll (definitions vary)',
          'You ignore odds',
        ],
        2,
        'Common heuristic — adapt to your edge model.',
      ),
      q(
        'Tracking results helps you:',
        [
          'Win every week',
          'Prove you have an edge or discover you do not',
          'Avoid taxes',
          'Predict coin flips',
        ],
        0,
        'Process evaluation beats gut feelings.',
      ),
    ],
  ),

  'commodities-basic-1': mk(
    [
      {
        title: 'What commodities are',
        content:
          'Commodities are fungible physical goods traded in standardized units: energy (oil, gas), metals (gold, copper), agriculture (corn, coffee). Prices balance global supply and demand with storage, transport, and geopolitics layered on top.',
      },
      {
        title: 'Why they matter to portfolios',
        content:
          'Commodities can diversify equity risk and sometimes hedge inflation — but they are volatile and can draw down for years. Role in a portfolio should match your horizon and risk tolerance.',
      },
      {
        title: 'Spot vs futures',
        content:
          'Spot refers to immediate delivery markets; most retail exposure is via futures-based products or ETFs that roll contracts. Rolling introduces nuances like contango that affect returns.',
      },
    ],
    [
      q(
        'Commodities are generally:',
        [
          'Identical branded goods',
          'Only stocks',
          'Fungible bulk goods with standardized grades',
          'Tax-exempt always',
        ],
        2,
        'Standardization enables global markets.',
      ),
      q(
        'Why might commodities diversify stocks?',
        [
          'Drivers differ — supply shocks, weather, geopolitics',
          'They always move together',
          'They are the same asset class',
          'They never fall',
        ],
        0,
        'Correlation is not fixed at 1.',
      ),
      q(
        'Retail investors often gain exposure through:',
        [
          'Storing oil in a garage',
          'Printing gold',
          'Only coins',
          'ETFs, funds, or futures products',
        ],
        3,
        'Physical storage is costly; products abstract it.',
      ),
      q(
        'Geopolitics can move commodity prices because:',
        [
          'CEOs choose colors',
          'Supply chains and sanctions affect availability',
          'Bond yields are fixed',
          'Weather stops',
        ],
        1,
        'Energy and ag markets are politically sensitive.',
      ),
      q(
        '“Fungible” means:',
        ['Units are interchangeable within a grade', 'Unique art pieces', 'Illiquid', 'Illegal'],
        0,
        'Standard barrels or bushels trade interchangeably.',
      ),
    ],
  ),

  'commodities-basic-2': mk(
    [
      {
        title: 'Gold',
        content:
          'Gold is a monetary metal and jewelry/industrial input. It often behaves as a crisis and inflation hedge — imperfectly — and pays no coupon, so opportunity cost rises when real rates are high.',
      },
      {
        title: 'Oil',
        content:
          'Crude oil prices hinge on OPEC+ decisions, shale supply, refining constraints, and global demand. Inventory data releases routinely move markets.',
      },
      {
        title: 'Agriculture',
        content:
          'Weather dominates short-run crop prices; disease affects livestock. Seasonal planting and harvest patterns create recurring annual rhythms traders watch.',
      },
    ],
    [
      q(
        'Gold’s lack of coupon means:',
        [
          'It always beats stocks',
          'It pays monthly dividends',
          'Its opportunity cost rises when real interest rates are attractive elsewhere',
          'It cannot be stored',
        ],
        2,
        'Yielding assets compete for capital.',
      ),
      q(
        'Oil inventories often:',
        [
          'Have no impact',
          'Move prices when they surprise versus expectations',
          'Are secret',
          'Are fixed by law',
        ],
        1,
        'Stock levels signal near-term tightness.',
      ),
      q(
        'Weather primarily impacts:',
        [
          'Tech stock multiples',
          'Bond coupons',
          'Forever unchanged oil',
          'Agricultural yields and short-run ag prices',
        ],
        3,
        'Crop stress and yields link to price.',
      ),
      q(
        'OPEC+ coordination can influence oil by:',
        [
          'Setting fashion trends',
          'Setting retail gas prices directly in every country',
          'Adjusting production targets affecting supply',
          'Banning futures',
        ],
        2,
        'Supply policy shifts the global balance.',
      ),
      q(
        'Gold industrial and jewelry demand:',
        [
          'Contributes to baseline physical demand alongside investment flows',
          'Is irrelevant',
          'Sets Fed policy',
          'Fixes bitcoin price',
        ],
        0,
        'Multiple demand channels matter.',
      ),
    ],
  ),

  'commodities-basic-3': mk(
    [
      {
        title: 'Supply and demand',
        content:
          'Commodity prices clear markets where supply meets demand. Supply shocks (hurricanes, wars) can spike prices even without demand changes. Demand shocks (recessions) can crush energy use.',
      },
      {
        title: 'Seasonality',
        content:
          'Agricultural markets show planting and harvest cycles. Natural gas has winter heating demand. Seasonality is a tendency, not a guarantee — exogenous shocks override patterns.',
      },
      {
        title: 'Inventories',
        content:
          'Low inventories amplify price volatility when supply wobbles. High inventories buffer shocks. Analysts track days of supply and stockpiles.',
      },
    ],
    [
      q(
        'A hurricane in the Gulf might:',
        [
          'Ignore oil markets',
          'Lower all prices',
          'Disrupt refining or production, affecting fuel prices',
          'Guarantee calm markets',
        ],
        2,
        'Physical disruptions propagate to prices.',
      ),
      q(
        'Seasonal patterns:',
        [
          'Provide tendencies that can be overridden by shocks',
          'Always repeat exactly',
          'Only apply to stocks',
          'Are illegal',
        ],
        0,
        'Expectations vs surprises.',
      ),
      q(
        'Recessions often reduce commodity demand because:',
        [
          'Governments ban oil',
          'Gold stops trading',
          'Weather stops',
          'Factories and transport slow',
        ],
        3,
        'Industrial activity ties to energy and metals.',
      ),
      q(
        'Inventories buffer prices by:',
        [
          'Eliminating speculation',
          'Allowing consumption without immediate production shocks',
          'Fixing OPEC',
          'Setting interest rates',
        ],
        1,
        'Stocks smooth short mismatches.',
      ),
      q(
        'Demand elasticity varies:',
        [
          'By commodity — gasoline is inelastic short-run vs luxury goods',
          'Never',
          'Only for bitcoin',
          'Only weekly',
        ],
        0,
        'Substitution and necessity matter.',
      ),
    ],
  ),

  'commodities-basic-4': mk(
    [
      {
        title: 'Commodity ETFs',
        content:
          'ETFs like broad commodity funds or single-commodity trackers offer exposure without futures accounts — but returns may differ from spot due to rolling futures, fees, and tax treatment.',
      },
      {
        title: 'ETNs and credit risk',
        content:
          'Exchange-traded notes are unsecured debt of the issuer — if the bank fails, you may lose money unrelated to the commodity. Read the prospectus.',
      },
      {
        title: 'Equity producers',
        content:
          'Buying mining or oil company stocks gives commodity-linked exposure with corporate fundamentals layered in — not a pure commodity play.',
      },
    ],
    [
      q(
        'A futures-based commodity ETF may diverge from spot because:',
        [
          'It always matches spot perfectly',
          'Spots do not exist',
          'It rolls contracts and pays fees',
          'ETFs cannot trade',
        ],
        2,
        'Roll yield and expenses matter.',
      ),
      q(
        'An ETN’s risk includes:',
        ['Only commodity risk', 'Issuer credit risk', 'No risk', 'Football scores'],
        1,
        'You are exposed to the note issuer.',
      ),
      q(
        'Buying an oil major’s stock gives:',
        [
          'Pure oil spot exposure',
          'A barrel delivery',
          'Guaranteed dividends',
          'Equity exposure with company-specific risks',
        ],
        3,
        'Stocks ≠ commodities.',
      ),
      q(
        'Expense ratios:',
        [
          'Do not matter',
          'Are always zero',
          'Drag long-run returns and vary by fund',
          'Are paid by the Fed',
        ],
        2,
        'Compare products carefully.',
      ),
      q(
        'Physical gold ETFs hold:',
        [
          'Bullion or claims per prospectus — verify',
          'Your house deeds',
          'Only bitcoin',
          'Cash only',
        ],
        0,
        'Read what backs shares.',
      ),
    ],
  ),

  'commodities-basic-5': mk(
    [
      {
        title: 'OPEC and cartels',
        content:
          'OPEC+ coordinates production targets among major oil exporters. When members comply, prices can stabilize or rise; cheating or political fractures undermine agreements. Sanctions also reroute oil flows.',
      },
      {
        title: 'Strategic reserves',
        content:
          'Countries maintain petroleum reserves to buffer emergencies. Releases can temporarily lower prices but do not fix structural shortages.',
      },
      {
        title: 'Non-OPEC supply',
        content:
          'U.S. shale, Norway, Brazil, and others add non-OPEC supply that responds to price with lags — technology and financing matter.',
      },
    ],
    [
      q(
        'OPEC+ decisions matter because:',
        [
          'They set your mortgage rate',
          'They ban gold',
          'They influence collective oil supply targets',
          'They control weather',
        ],
        2,
        'Supply policy shifts global balances.',
      ),
      q(
        'Cartel cohesion can weaken when:',
        [
          'Members cheat on quotas or face domestic budget stress',
          'Everyone always complies perfectly',
          'Oil is free',
          'Demand is zero',
        ],
        0,
        'Incentives misalign across members.',
      ),
      q(
        'Sanctions can:',
        [
          'Have no economic effect',
          'Guarantee lower prices always',
          'Eliminate futures',
          'Shift oil flows between regions and affect prices',
        ],
        3,
        'Barrels find routes — at a cost.',
      ),
      q(
        'Strategic reserve releases:',
        [
          'Guarantee permanently lower prices',
          'Can add short-term supply',
          'Replace production forever',
          'Ban exports',
        ],
        1,
        'Temporary buffer, not a fix.',
      ),
      q(
        'Shale supply often responds to:',
        [
          'Price signals with drilling and financing lags',
          'Daily tweets only',
          'Moon phases',
          'Stock buybacks only',
        ],
        0,
        'High prices eventually attract capital — with delay.',
      ),
    ],
  ),

  'commodities-basic-6': mk(
    [
      {
        title: 'Correlation over time',
        content:
          'Commodities and equities are not perfectly correlated — correlation rises in some crises when everything sells off (liquidity crunch) and diverges during supply shocks that hurt growth but raise energy prices.',
      },
      {
        title: 'Inflation hedging',
        content:
          'Commodities can help when inflation surprises — but they are volatile and can lag policy responses. Size positions thoughtfully.',
      },
      {
        title: 'Portfolio role',
        content:
          'Think of commodities as a satellite allocation: potential diversification and inflation sensitivity, not a core replacement for diversified equities and bonds for most investors.',
      },
    ],
    [
      q(
        'During a liquidity crisis, many assets may:',
        [
          'Always decorrelate',
          'Stop trading forever',
          'Correlate upward as investors raise cash',
          'Guarantee profits',
        ],
        2,
        'Correlation is not stable in stress.',
      ),
      q(
        'Commodities as an inflation hedge are:',
        [
          'Perfect and risk-free',
          'Imperfect but sometimes helpful',
          'Unrelated to inflation',
          'Guaranteed by FDIC',
        ],
        1,
        'Macro regimes matter.',
      ),
      q(
        'A satellite allocation means:',
        [
          'All-in bet',
          'Only bonds',
          'Margin-only',
          'Smaller supportive slice around a core portfolio',
        ],
        3,
        'Risk budgeting concept.',
      ),
      q(
        'Energy price spikes can:',
        [
          'Help everyone equally',
          'Lower all stock prices always',
          'Hurt consumers while benefiting producers',
          'Eliminate inflation',
        ],
        2,
        'Winners and losers differ.',
      ),
      q(
        'Long-run commodity returns are:',
        ['Volatile and cycle-dependent', 'Guaranteed above stocks', 'Zero always', 'Equal to cash'],
        0,
        'Cycles and supercycles dominate narratives.',
      ),
    ],
  ),

  'risk-basic-1': mk(
    [
      {
        title: 'Why risk management matters',
        content:
          'Markets are uncertain; outcomes are path-dependent. Risk management exists so one bad streak does not end your ability to participate. Professionals obsess about survival first, returns second — because without capital, there is no compounding.',
      },
      {
        title: 'Process over prediction',
        content:
          'You cannot control whether the next trade wins; you can control position sizing, entry rules, and how you respond to losses. A repeatable process is the only durable edge for most participants.',
      },
      {
        title: 'Expectancy',
        content:
          'Long-run results approximate average win × win rate minus average loss × loss rate (simplified). Negative expectancy cannot be fixed by doubling down — only by improving the strategy or quitting.',
      },
    ],
    [
      q(
        'The main goal of risk management is often:',
        [
          'Win every trade',
          'Eliminate all losses',
          'Stay in the game and limit ruin risk',
          'Predict the future',
        ],
        2,
        'Survival enables compounding.',
      ),
      q(
        'You control:',
        [
          'Position size and adherence to rules',
          'Tomorrow’s headlines',
          'Other traders’ emotions',
          'Fed decisions',
        ],
        0,
        'Focus on controllable inputs.',
      ),
      q(
        'Doubling down after losses without edge:',
        ['Always recovers', 'Is required', 'Removes variance', 'Increases risk of ruin'],
        3,
        'Martingale-like behavior is dangerous.',
      ),
      q(
        'Expectancy depends on:',
        [
          'Only win rate',
          'The full distribution of wins and losses',
          'Luck spells',
          'Chart colors',
        ],
        1,
        'Size of wins/losses matters as much as frequency.',
      ),
      q(
        'A process-based approach means:',
        [
          'Documented rules you follow consistently',
          'No rules',
          'Random entries',
          'Ignoring stops',
        ],
        0,
        'Discipline scales better than hero trades.',
      ),
    ],
  ),

  'risk-basic-2': mk(
    [
      {
        title: 'The 1–2% idea',
        content:
          'A common guideline is to risk only a small fraction of account equity on a single trade — often 1–2% — so a string of losses cannot wipe you out. The exact number should fit your strategy’s win rate and payoff ratio.',
      },
      {
        title: 'Risk per trade vs stop distance',
        content:
          'Position size links stop distance to dollar risk: tighter stops allow larger share counts for the same dollar risk — but tight stops get hunted in noise. Calibrate stops to volatility, not wishful thinking.',
      },
      {
        title: 'Leverage',
        content:
          'Leverage multiplies both gains and losses — and margin calls can force exits at the worst time. Treat leverage as a risk amplifier, not a free tool.',
      },
    ],
    [
      q(
        'Risking 1% per trade means:',
        [
          'You always lose 1%',
          'You trade once per year',
          'Each trade risks ~1% of equity (by common definition)',
          'You ignore stops',
        ],
        2,
        'Definitions vary — write yours down.',
      ),
      q(
        'Wider stops generally require:',
        [
          'Larger size always',
          'Smaller position size for the same dollar risk',
          'No math',
          'Higher leverage',
        ],
        1,
        'Risk = size × per-unit move to stop.',
      ),
      q(
        'Leverage increases:',
        ['Only upside', 'Certainty', 'Tax refunds', 'Both upside and downside variability'],
        3,
        'Borrowed money magnifies outcomes.',
      ),
      q(
        'Position sizing should reflect:',
        ['Only optimism', 'Round numbers', 'Your edge quality and volatility', 'Social media'],
        2,
        'Match size to strategy stats and market conditions.',
      ),
      q(
        'A losing streak with proper sizing should:',
        [
          'Still leave capital to continue if rules were sound',
          'Always mean the strategy is wrong immediately',
          'Force all-in',
          'Ignore review',
        ],
        0,
        'Evaluate after enough samples.',
      ),
    ],
  ),

  'risk-basic-3': mk(
    [
      {
        title: 'Stop losses',
        content:
          'A stop order exits a position at a market order once a price level trades — it caps loss but can be whipsawed in volatile names. Stops are insurance, not perfection.',
      },
      {
        title: 'Take profits',
        content:
          'Taking profits locks in gains — but cutting winners too early can forfeit trend upside. Some traders scale out: partial profits at targets, runner for trends.',
      },
      {
        title: 'Plan before entry',
        content:
          'Define stop and target logic before you enter — when you are calm. In the trade, emotions argue for moving stops; pre-commitment resists that.',
      },
    ],
    [
      q(
        'A stop-loss order primarily:',
        [
          'Guarantees fill at exactly the stop price in all conditions',
          'Eliminates gaps',
          'Triggers a market order after the stop level — slippage possible',
          'Prevents all losses',
        ],
        2,
        'Gaps can blow through stops.',
      ),
      q(
        'Take-profit rules help by:',
        [
          'Removing some emotional exit decisions in advance',
          'Guaranteeing maximum gains',
          'Banning losses',
          'Replacing research',
        ],
        0,
        'Automation supports discipline.',
      ),
      q(
        'Whipsaw risk means:',
        [
          'Stops always win',
          'No volatility',
          'Profits double',
          'Stops can exit before a favorable move continues',
        ],
        3,
        'Balance stop tightness vs noise.',
      ),
      q(
        'Planning exits before entry reduces:',
        [
          'All risk to zero',
          'Emotional decision-making mid-trade',
          'Need for research',
          'Liquidity',
        ],
        1,
        'Process beats panic.',
      ),
      q(
        'Trailing stops:',
        [
          'Move with favorable price to protect gains',
          'Never change',
          'Only for bonds',
          'Guarantee tops',
        ],
        0,
        'Lock in progress while allowing trend participation.',
      ),
    ],
  ),

  'risk-basic-4': mk(
    [
      {
        title: 'Losses hurt more than gains help',
        content:
          'Loss aversion is well documented: a dollar lost feels worse than a dollar gained feels good. Revenge trading tries to “make it back” immediately — usually enlarging mistakes.',
      },
      {
        title: 'Cooldown routines',
        content:
          'After a loss, step away, journal what happened, and return only when rules are clear. Reducing trade frequency after tilt preserves capital.',
      },
      {
        title: 'Identity',
        content:
          'If your self-worth is tied to each trade’s outcome, variance becomes unbearable. Treat trading as a probabilistic game with bounded risk — not a verdict on your value.',
      },
    ],
    [
      q(
        'Revenge trading usually:',
        [
          'Restores discipline',
          'Is encouraged',
          'Increases size and risk after losses',
          'Eliminates emotions',
        ],
        2,
        'Emotional escalation compounds damage.',
      ),
      q(
        'A trading journal helps because:',
        [
          'It guarantees profits',
          'It forces review of decisions independent of P&L luck',
          'It replaces stops',
          'It is optional always',
        ],
        1,
        'Feedback loops improve process.',
      ),
      q(
        'Loss aversion implies:',
        [
          'People are rational always',
          'Gains hurt',
          'Risk does not exist',
          'People feel losses more strongly than equivalent gains',
        ],
        3,
        'Classic behavioral finding.',
      ),
      q(
        'After a large loss, a healthy step is:',
        [
          'Immediately double position',
          'Ignore the loss',
          'Cooldown and review rules before next trade',
          'Blame others only',
        ],
        2,
        'Break the tilt cycle.',
      ),
      q(
        'Detaching self-worth from each trade:',
        [
          'Reduces emotional overreaction to variance',
          'Makes you careless',
          'Means no rules',
          'Bans journaling',
        ],
        0,
        'Process focus beats ego protection.',
      ),
    ],
  ),
};
