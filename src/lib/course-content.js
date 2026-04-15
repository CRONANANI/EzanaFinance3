/**
 * Real course content keyed by course id from learning-curriculum.js.
 * Shape matches buildPlaceholderContent:
 *   {
 *     sections: [
 *       {
 *         title,
 *         content,
 *         visual?: { type, data, caption },  // optional — rendered by CourseVisual
 *         keyTerms?,
 *         callout?,
 *       },
 *     ],
 *     quiz: [...]
 *   }
 *
 * Bronze stocks (stocks-basic-1..8) and bronze crypto (crypto-basic-1..8)
 * courses are substantially expanded educational content with 10-question
 * quizzes and distributed visual elements.
 */

import BRONZE_REST from './course-content-bronze-rest';
import CRYPTO_BRONZE from './course-content-crypto-bronze';

const STOCKS_BRONZE = {
  'stocks-basic-1': {
    sections: [
      {
        title: 'What a stock exchange actually is',
        content:
          "A stock exchange is an organized marketplace where buyers and sellers of ownership shares in public companies come together to transact at prices set by their own bids and offers. When people picture an exchange, they often imagine a crowded trading floor with shouting traders in colored jackets. That image is mostly a relic. Modern exchanges are regulated electronic networks, and the overwhelming majority of U.S. stock trades now execute through computer matching engines operated by organizations like the New York Stock Exchange, Nasdaq, and a growing list of alternative trading systems. The exchange itself does not own the shares being traded. It simply provides the venue, the rules, and the mechanism for price discovery. Think of it as a referee at a very fast auction — it enforces the rules, publishes the results, and stays out of the way of the trade itself. When you place an order through your brokerage, your broker routes that order to one of these exchanges (or to a dealer who trades against their own inventory), and a match is found in milliseconds. The price you pay or receive is determined by whoever happens to be on the other side of your order at that exact moment — not by the exchange, not by the company, not by any central authority.",
        keyTerms: ['stock exchange', 'matching engine', 'price discovery', 'alternative trading system'],
      },
      {
        title: 'Bids, asks, and the spread',
        content:
          "At any given moment during trading hours, every publicly traded stock has two prices posted: the highest bid, which is the most any buyer is currently willing to pay, and the lowest ask (sometimes called the offer), which is the least any seller is willing to accept. The gap between them is called the bid-ask spread. When a buyer agrees to the asking price, or a seller agrees to the bid, a trade happens and a new price is printed to the tape. This continuous auction is how markets discover what a share is worth right now. There is no committee setting the price. No government agency publishes a daily rate. The price emerges from the aggregated decisions of every participant — from individual retail investors placing small orders to pension funds moving billions. A narrow spread of a penny or two usually means the stock is highly liquid, with lots of buyers and sellers competing to trade. A wide spread of several dollars usually means the opposite: few participants, low volume, or unusual conditions. When you buy a stock, you typically pay the ask; when you sell, you typically receive the bid. That spread is effectively a small cost of transacting, and it matters more for stocks that trade less frequently.",
        visual: {
          type: 'comparison-table',
          data: {
            columns: [
              { label: 'Highly liquid stock', color: '#10b981' },
              { label: 'Thinly traded stock', color: '#f97316' },
            ],
            rows: [
              { attribute: 'Typical spread', values: ['$0.01 – $0.05', '$0.50 – $5.00+'] },
              { attribute: 'Daily volume', values: ['Millions of shares', 'Thousands or fewer'] },
              { attribute: 'Impact of a large order', values: ['Barely moves price', 'Can move price several percent'] },
              { attribute: 'Example ticker type', values: ['Large-cap like AAPL, MSFT', 'Micro-cap or emerging markets'] },
            ],
          },
          caption: 'Liquidity directly affects the cost of transacting. Wider spreads are a hidden friction on less-traded names.',
        },
        keyTerms: ['bid', 'ask', 'spread', 'liquidity'],
      },
      {
        title: 'The market as a moody business partner',
        content:
          "One of the most useful mental models for a beginning investor is to imagine the stock market as a single business partner — a slightly unstable one. Every trading day, this partner shows up at your door and offers to either buy your share of the business or sell you more of his. He quotes a new price every day. Some days he is euphoric and offers you wildly high prices; other days he is depressed and will sell you his shares for a pittance. He never takes offense if you ignore him, and he always comes back the next day with fresh quotes. The crucial insight is this: you are under no obligation to trade with him at the prices he quotes. He exists to serve you, not to instruct you. If his price is clearly too low relative to what the underlying business is actually worth, you can buy from him cheaply. If his price is clearly too high, you can sell to him expensively. And if his price makes no sense in either direction, you can simply do nothing and wait. The market, like this imaginary partner, is there to offer you opportunities. Treating its daily moves as commands — feeling that you must act when prices rise or panic when prices fall — is precisely the behavior that destroys most amateur investors' returns. The sensible investor uses the market's mood swings, rather than being swept along by them.",
        callout:
          "The market exists to serve you, not instruct you. Its daily price quotes are opportunities, not commands.",
        keyTerms: ['market psychology', 'mental model'],
      },
      {
        title: 'Trading hours and why they matter',
        content:
          "U.S. equity markets have a regular trading session that runs from 9:30 a.m. to 4:00 p.m. Eastern Time, Monday through Friday, excluding holidays. This is when the vast majority of volume trades and when price discovery is most active. Most brokers also offer pre-market trading (roughly 4:00 a.m. to 9:30 a.m. ET) and after-hours trading (4:00 p.m. to 8:00 p.m. ET), but these extended sessions carry their own risks for beginners. Volume is much thinner, which means spreads are wider and prices can move more dramatically on much smaller trades. An earnings release that drops a stock 10% after the bell might show wild swings in the first few minutes of after-hours trading, only to settle into a narrower range by the next morning's open. The official closing price at 4:00 p.m. is a critically important reference point: it is the number most data vendors publish, most index providers use in their calculations, and most mutual funds use to compute the net asset value they report to investors. That is why so much trading volume clusters in the final minutes before the close. For a beginner, the simplest rule is this: trade during regular hours unless you have a specific reason not to. The spreads are tighter, the prices are more reliable, and you are less likely to be on the wrong side of an overnight news release.",
        keyTerms: ['regular session', 'pre-market', 'after-hours', 'closing price'],
      },
      {
        title: 'Primary vs secondary markets',
        content:
          "There is an important distinction between the two places where shares change hands. When a company first sells shares to the public through an initial public offering, or an IPO, the money flows from investors directly to the company itself — this is the primary market. After that, when one investor sells shares to another on an exchange, the money flows between investors and the company receives nothing new. This is the secondary market, and it is where 99.9% of the activity you hear about on financial news takes place. Most investors will never participate in a primary market transaction; IPO shares are usually allocated to large institutional clients long before retail investors can buy them. What retail investors interact with is the secondary market — the continuous auction where already-issued shares change hands. A company whose shares are trading at $150 today does not receive any cash when you buy those shares from another investor. The company received its cash at the IPO years ago. This distinction matters because it clarifies a common confusion: rising or falling stock prices in the secondary market don't directly transfer money to or from the companies themselves. They transfer money between the investors trading those shares. A company benefits indirectly from a high share price — it can issue more stock, borrow at better terms, and compensate employees with more valuable equity — but the daily price action is not a direct revenue stream.",
        keyTerms: ['primary market', 'secondary market', 'IPO'],
      },
      {
        title: 'Key takeaways',
        content:
          "Exchanges are neutral venues that match buyers and sellers — they don't set prices or own shares. Every stock has a bid and an ask, with the spread representing a small but real cost of transacting. The market's daily prices are the collective opinion of all participants combined, not a pronouncement of true value, which is why treating them as opportunities rather than commands is so important. U.S. markets trade from 9:30 a.m. to 4:00 p.m. Eastern; extended hours exist but carry wider spreads and thinner liquidity. And most importantly, nearly all the trading you'll ever do happens in the secondary market between investors — not with the companies themselves.",
      },
    ],
    quiz: [
      {
        question: 'What does a stock exchange actually do?',
        options: [
          'Buys and sells shares on behalf of investors using its own money',
          'Provides the venue, rules, and matching mechanism for buyers and sellers to trade',
          'Sets daily prices for listed companies based on their earnings',
          'Guarantees that every trade will be profitable',
        ],
        correctIndex: 1,
        explanation: 'An exchange is a neutral marketplace — it matches orders and enforces rules, but it does not own shares or set prices itself.',
      },
      {
        question: 'The bid-ask spread is best described as:',
        options: [
          'A tax that brokers charge on every trade',
          'The difference between the highest bid and the lowest ask at a given moment',
          'The gap between yesterday’s close and today’s open',
          'The commission your broker earns for placing your order',
        ],
        correctIndex: 1,
        explanation: 'The spread is the gap between the best available buy price and the best available sell price. Tight spreads usually mean a liquid market.',
      },
      {
        question: 'If a stock you own drops sharply on no company-specific news, the best framing for a sensible investor is:',
        options: [
          'The market is telling you to sell immediately',
          'The market is always right and you should accept the new valuation',
          'The market is offering you an opportunity — you can act on it or ignore it',
          'The company must have done something wrong you don’t know about',
        ],
        correctIndex: 2,
        explanation: 'The market serves you with daily prices; it does not instruct you. Moves on no news are opportunities to evaluate, not commands to act on.',
      },
      {
        question: 'Why does after-hours trading typically have wider spreads than regular hours?',
        options: [
          'Exchanges charge extra fees after 4 p.m.',
          'There are far fewer participants, so the order book is thinner',
          'The SEC requires wider spreads outside normal hours',
          'Stocks are literally worth less when markets are closed',
        ],
        correctIndex: 1,
        explanation: 'Lower participation means less depth on both sides of the order book, and small orders can move the price disproportionately.',
      },
      {
        question: 'When you buy 100 shares of a company from another investor on the exchange, who receives your money?',
        options: [
          'The company whose shares you bought',
          'The exchange, which keeps a percentage as profit',
          'The investor who sold you the shares (minus your broker’s fees)',
          'The SEC, which redistributes it to shareholders',
        ],
        correctIndex: 2,
        explanation: 'This is a secondary market transaction — money flows between investors, not to the company. Companies receive cash from share sales at IPO or follow-on offerings, not from secondary trading.',
      },
      {
        question: 'The "primary market" refers to:',
        options: [
          'Trading on the New York Stock Exchange specifically',
          'The market where a company sells new shares directly to investors for the first time',
          'Trading in large-cap stocks only',
          'The first hour of trading each day',
        ],
        correctIndex: 1,
        explanation: 'The primary market is where shares are first issued, such as through an IPO. The secondary market is where those shares trade between investors afterward.',
      },
      {
        question: 'Why is the official closing price at 4:00 p.m. a particularly important reference?',
        options: [
          'It is guaranteed to be the next day’s opening price',
          'Data vendors, indices, and fund NAVs use it as their benchmark value',
          'It is the only price the SEC considers official',
          'Dividends are calculated from the closing price',
        ],
        correctIndex: 1,
        explanation: 'The 4 p.m. close anchors index calculations, fund net asset values, and most published performance figures, which is why so much volume concentrates in the final minutes.',
      },
      {
        question: 'Two stocks trade at the same price of $50. Stock A has a bid-ask spread of $0.02. Stock B has a spread of $2.00. What is the most likely explanation?',
        options: [
          'Stock A is more expensive overall',
          'Stock A is more liquid, with many more active buyers and sellers',
          'Stock B is in a different industry',
          'Stock B pays a higher dividend',
        ],
        correctIndex: 1,
        explanation: 'A tighter spread almost always indicates deeper liquidity — more participants competing to trade at the best available price.',
      },
      {
        question: 'If the stock market is closed and you place a market order at 2 a.m., what typically happens?',
        options: [
          'The order executes at whatever the last trade price was',
          'The order is queued and will be routed when the market opens',
          'The order is automatically cancelled',
          'The order executes at a randomly chosen price',
        ],
        correctIndex: 1,
        explanation: 'Orders placed outside trading hours are queued by your broker and routed to the market when trading resumes, at which point they execute at the prevailing prices.',
      },
      {
        question: 'A beginner is considering trading in the pre-market session because they saw surprising earnings news. The strongest caution is:',
        options: [
          'Pre-market trading is illegal for retail investors',
          'Pre-market spreads are typically wider and prices can swing sharply on thin volume',
          'Earnings news never moves stocks meaningfully',
          'You cannot sell stocks in the pre-market, only buy',
        ],
        correctIndex: 1,
        explanation: 'Pre-market volume is a small fraction of regular-hours volume. Orders have bigger price impact and spreads are wider, which makes beginner trading in these sessions particularly risky.',
      },
    ],
  },
  'stocks-basic-2': {
    sections: [
      {
        title: 'Stocks: ownership in a business',
        content:
          "When you buy a share of stock, you are buying a tiny fractional piece of a real business. That single share entitles you to a proportional claim on the company's future profits (usually paid out as dividends or reinvested in the business), a proportional vote on certain corporate decisions, and a proportional claim on the leftover assets if the company ever liquidates. People sometimes lose sight of this and think of stocks as abstract trading tokens whose prices bounce around on a screen, but every share of every listed company is ultimately a slice of an operating business with employees, customers, factories, warehouses, software, and contracts. The price of that share reflects what the collective market thinks all of those things, plus the future profits they'll generate, are worth at this moment. Stocks are also called \"equities\" because they represent equity ownership. When people say \"invest in equities,\" they mean own pieces of businesses. Over long time horizons, owning a diversified portfolio of stocks has historically delivered higher returns than any other liquid asset class, largely because the businesses themselves grow, innovate, and reinvest profits into producing more profits. But the ride is bumpy. A stock can drop 50% in a year for reasons that have little to do with the underlying business, and individual companies can go bankrupt, wiping out their shareholders entirely. The tradeoff for higher long-term returns is accepting that the short-term path is unpredictable.",
        keyTerms: ['equity', 'share', 'dividend', 'shareholder'],
      },
      {
        title: 'Bonds: lending money for interest',
        content:
          "A bond is fundamentally different from a stock. When you buy a bond, you are not becoming a part-owner of anything. You are lending money — to a government, a corporation, or a municipality — in exchange for a contractual promise that the borrower will pay you interest at regular intervals and return your original principal at the end of the bond's term. That's it. You don't get upside if the business thrives; you just collect the interest you were promised. And you don't get a vote in how the company is run. In exchange for giving up the upside, you get a more predictable cash flow and, usually, a higher priority than stockholders if the company runs into trouble. If a company goes bankrupt, bondholders get paid back (at least partially) before stockholders see a dime. This is why bonds are generally considered \"safer\" than stocks, though the word \"safe\" is doing a lot of work there — bonds have their own risks, including the risk that inflation erodes the real value of the fixed interest payments, the risk that interest rates rise and make your older bond less attractive, and the risk that the borrower simply can't pay you back (called credit risk or default risk). U.S. Treasury bonds, backed by the federal government's taxing power, are usually considered the lowest-risk fixed-income investment in the world. Corporate bonds carry more risk and therefore usually pay higher interest. Junk bonds — bonds from companies in shaky financial condition — pay the highest interest of all, because you're taking on the real possibility of not getting your money back.",
        visual: {
          type: 'comparison-table',
          data: {
            columns: [
              { label: 'Stocks (equity)', color: '#10b981' },
              { label: 'Bonds (debt)', color: '#3b82f6' },
            ],
            rows: [
              { attribute: 'What you own', values: ['A piece of the business', 'A promise to repay plus interest'] },
              { attribute: 'Upside if company thrives', values: ['Unlimited (price + dividends)', 'Capped at the promised interest'] },
              { attribute: 'Downside if company fails', values: ['Can go to zero', 'Paid before stockholders in bankruptcy'] },
              { attribute: 'Typical volatility', values: ['High', 'Low to moderate'] },
              { attribute: 'Historical long-term return', values: ['~9-10% annually', '~4-5% annually'] },
              { attribute: 'Income pattern', values: ['Dividends (variable)', 'Coupon payments (fixed)'] },
            ],
          },
          caption: 'Stocks and bonds are not just different risk levels — they are fundamentally different legal and economic relationships with the issuing company.',
        },
        keyTerms: ['bond', 'coupon', 'principal', 'credit risk', 'Treasury'],
      },
      {
        title: 'ETFs: a basket in a single ticker',
        content:
          "An ETF — short for exchange-traded fund — is a single investment that actually contains a whole basket of underlying securities. When you buy one share of an S&P 500 index ETF, you are effectively buying tiny fractions of all 500 companies in the S&P 500 index at once, in the proportions that match the index. The ETF is run by a fund manager who buys and holds the underlying stocks on your behalf and charges a small annual fee (called the expense ratio) for the service. ETFs trade on stock exchanges just like regular stocks — you can buy and sell them during market hours at whatever price the market sets, which is kept very close to the net asset value of the underlying holdings by a creation/redemption mechanism that runs in the background. The genius of the ETF is that it lets a small investor achieve the kind of diversification that used to require either a lot of money or a mutual fund with high minimum investments. For $200 you can buy a single share of a total-market ETF and own a microscopic slice of thousands of companies. Some ETFs track broad indices like the S&P 500 or the total stock market. Others track specific sectors (technology, healthcare, energy), specific geographies (emerging markets, Europe, Japan), or specific themes (clean energy, artificial intelligence, gold miners). There are also bond ETFs that give you a basket of bonds in a single ticker, and commodity ETFs that track prices of things like gold or oil. The expense ratios on broad index ETFs are typically very low — under 0.1% per year is common — which is one of the main reasons they have become the default building block for most individual investors' portfolios.",
        visual: {
          type: 'diversification',
          data: {
            segments: [
              { label: 'Technology', pct: 28 },
              { label: 'Healthcare', pct: 13 },
              { label: 'Financials', pct: 13 },
              { label: 'Consumer', pct: 11 },
              { label: 'Industrials', pct: 9 },
              { label: 'Energy', pct: 4 },
              { label: 'Other sectors', pct: 22 },
            ],
            centerLabel: 'S&P 500',
          },
          caption: 'A single share of an S&P 500 ETF gives you exposure to roughly this sector breakdown — diversification in one ticker.',
        },
        keyTerms: ['ETF', 'expense ratio', 'index fund', 'diversification'],
      },
      {
        title: 'Mutual funds: the older cousin of ETFs',
        content:
          "Before ETFs existed, the primary way ordinary investors got diversified exposure was through mutual funds. A mutual fund is similar in concept to an ETF — a professionally managed basket of securities — but the mechanics are different in important ways. Mutual funds don't trade on exchanges during the day. When you place an order to buy or sell a mutual fund, your order is queued and executed once, at the end of the trading day, at the net asset value computed from the closing prices of the fund's holdings. Mutual funds also tend to carry higher fees than comparable ETFs (though this is changing), and many charge front-end loads or back-end loads — sales fees you pay when you buy or sell. Mutual funds come in two broad flavors: actively managed and passively managed. An actively managed fund is run by a portfolio manager who picks individual stocks with the goal of beating some benchmark. These funds charge higher fees (often 0.5% to 1.5% per year) to pay for the manager's research and salary. A passively managed fund, also called an index fund, simply holds whatever is in a target index and charges minimal fees for the service. Decades of academic research have found that the vast majority of actively managed funds fail to beat their benchmark index over the long run, especially after fees. This finding is one of the most robust in all of investment research, and it is the main reason index funds and ETFs have taken over the retail investor landscape. If the average active fund can't beat the index after fees, a simple low-cost index fund becomes the rational default.",
        keyTerms: ['mutual fund', 'NAV', 'active management', 'passive management', 'index fund'],
      },
      {
        title: 'How to think about what to own',
        content:
          "A beginning investor doesn't need to master every security type to build a sensible portfolio. The structure most thoughtful professionals recommend for a new investor is surprisingly simple: a diversified core of broad stock-market ETFs, supplemented by some bond exposure to dampen volatility, and possibly a small international allocation. The exact percentages depend on your age, goals, and tolerance for seeing your account balance swing around. A common starting framework is 60% stocks and 40% bonds for someone who wants a balanced ride, with the stock portion held through low-cost index ETFs. Younger investors who won't need the money for decades often tilt more heavily toward stocks — 80% or even 100% — because they have time to ride out the inevitable downturns. Older investors approaching retirement typically tilt the other way, adding more bonds to protect against a market drop right before they need to start withdrawing. The single worst thing a beginner can do is try to pick individual winning stocks on gut feel, or chase whatever asset class went up the most last year. The single best thing a beginner can do is establish a simple allocation to low-cost diversified funds, contribute to it regularly, and leave it alone for long periods. This is less exciting than day trading, but the historical data are overwhelming: the boring approach almost always beats the clever approach over multi-decade time horizons.",
        callout:
          'Simple, diversified, low-cost, and held for a long time is the approach that has worked for nearly everyone who has followed it.',
      },
      {
        title: 'Key takeaways',
        content:
          "Stocks make you a part-owner of a business with unlimited upside and real downside. Bonds make you a lender with capped upside and (usually) steadier cash flow. ETFs package a basket of securities into a single tradable ticker, giving instant diversification for almost no effort. Mutual funds do the same thing but trade at end-of-day prices and often carry higher fees than comparable ETFs. For most beginning investors, a handful of broad low-cost index ETFs, held for a long time, beats any more complex strategy. Stocks are for growth, bonds are for stability, and a sensible mix of the two held in diversified funds is the foundation of nearly every reasonable investment plan.",
      },
    ],
    quiz: [
      {
        question: 'Buying a share of stock means:',
        options: [
          'Lending money to the company in exchange for interest',
          'Owning a fractional piece of a real business with a claim on its profits',
          'Buying a contract that tracks the stock price without ownership',
          'Reserving the right to buy the stock at a future date',
        ],
        correctIndex: 1,
        explanation: 'A share represents equity ownership in the underlying business — a proportional claim on profits, votes, and residual assets.',
      },
      {
        question: 'The key difference between a stock and a bond is:',
        options: [
          'Stocks are listed on exchanges; bonds are not',
          'Stocks represent ownership; bonds represent a loan to the issuer',
          'Bonds always return more than stocks',
          'Stocks are tax-free; bonds are not',
        ],
        correctIndex: 1,
        explanation: 'Stocks give you ownership and upside in the business. Bonds give you a contractual promise of interest and principal repayment with capped upside.',
      },
      {
        question: 'If a company goes bankrupt, who gets paid first?',
        options: [
          'Stockholders, because they took the most risk',
          'The CEO, because they run the company',
          'Bondholders, because they are creditors with priority over equity',
          'Everyone is paid equally from whatever is left',
        ],
        correctIndex: 2,
        explanation: 'Bondholders are creditors and sit higher in the capital structure than stockholders. They get paid (or partially paid) before equity holders see anything.',
      },
      {
        question: 'An ETF that tracks the S&P 500 index contains:',
        options: [
          'A single large company chosen by the fund manager',
          'The 500 companies in the S&P 500, held in roughly the index proportions',
          'Bonds issued by 500 different companies',
          'Any 500 stocks the fund manager thinks will perform well',
        ],
        correctIndex: 1,
        explanation: 'An S&P 500 index ETF holds all the companies in the index in weights that match the index. This is passive management.',
      },
      {
        question: 'The expense ratio of a fund is best described as:',
        options: [
          'The front-end sales fee you pay when you buy',
          'The annual fee charged as a percentage of assets to cover the fund’s operating costs',
          'The tax you owe on dividends',
          'The commission your broker earns per trade',
        ],
        correctIndex: 1,
        explanation: 'The expense ratio is an ongoing annual fee expressed as a percentage of assets. Broad index ETFs often charge under 0.1% per year.',
      },
      {
        question: 'A mutual fund order placed at 11 a.m. will typically execute:',
        options: [
          'Immediately at the current price',
          'At the net asset value computed after the market closes that day',
          'At the next day’s opening price',
          'At whatever price the fund manager decides',
        ],
        correctIndex: 1,
        explanation: 'Mutual funds transact once per day at the end-of-day NAV. This is a key difference from ETFs, which trade continuously during market hours.',
      },
      {
        question: 'Long-term academic research on actively managed funds has found that:',
        options: [
          'Most active funds beat their benchmark index after fees',
          'Most active funds fail to beat their benchmark index, especially after fees',
          'Active management always wins over multi-decade periods',
          'Index funds are illegal for retail investors',
        ],
        correctIndex: 1,
        explanation: 'A large body of research shows that most active funds underperform simple index funds over long horizons once fees are subtracted.',
      },
      {
        question: 'Why do junk bonds pay higher interest rates than Treasury bonds?',
        options: [
          'Because they trade on a different exchange',
          'Because the issuers are riskier and investors demand compensation for default risk',
          'Because they are tax-free',
          'Because the federal government sets their rates higher',
        ],
        correctIndex: 1,
        explanation: 'Higher risk of the borrower defaulting requires a higher interest rate to attract lenders — this is the fundamental pricing logic of credit.',
      },
      {
        question: 'A 25-year-old with a 40-year time horizon is typically advised to:',
        options: [
          'Hold mostly bonds to avoid volatility',
          'Tilt heavily toward stocks because they have decades to ride out downturns',
          'Keep everything in cash until they are older',
          'Trade options to generate monthly income',
        ],
        correctIndex: 1,
        explanation: 'Long time horizons let younger investors absorb short-term volatility in exchange for stocks’ higher long-term expected returns.',
      },
      {
        question: 'The simplest evidence-backed starting portfolio for a beginner is:',
        options: [
          'A carefully chosen list of individual high-growth stocks',
          'Whatever asset class went up the most last year',
          'A handful of low-cost diversified index ETFs held for a long time',
          'A single junk bond fund',
        ],
        correctIndex: 2,
        explanation: 'The evidence overwhelmingly favors low-cost diversified index funds held over long periods. It is not exciting, but it is what has worked for nearly everyone who has stuck with it.',
      },
    ],
  },
  'stocks-basic-3': {
    sections: [
      {
        title: 'Anatomy of a stock quote',
        content:
          "Pull up any stock on a financial website and you'll see a cluster of numbers next to the ticker symbol. At first glance it looks like a wall of trivia, but each number actually answers a specific question about the stock, and a patient beginner can learn what all of them mean in about ten minutes. At the top you'll typically see the current or last-traded price, the change from the previous day's close (both in dollars and percent), the day's range (the high and low prices the stock has hit so far today), and the 52-week range (the high and low over the past year). Below that you'll usually find metrics like the market capitalization, the trading volume, the price-to-earnings ratio, the dividend yield, and the earnings per share. None of these numbers alone tells you whether a stock is a good investment — that requires deeper analysis — but together they give you a snapshot of the stock's recent behavior and basic financial profile. The critical habit for a beginner is to read these numbers in context rather than in isolation. A price of $5 is not automatically \"cheap,\" and a price of $500 is not automatically \"expensive.\" The share price by itself tells you very little. What matters is the relationship between the price and the company's underlying earnings, growth, assets, and cash flow — which is exactly what the other numbers on the quote are there to help you gauge.",
        keyTerms: ['ticker', 'quote', '52-week range', 'previous close'],
      },
      {
        title: 'Why share price alone means nothing',
        content:
          "This point confuses more beginners than almost any other. A share of Berkshire Hathaway's Class A stock has traded for hundreds of thousands of dollars per share, while many penny stocks trade for under a dollar. This does not mean Berkshire is expensive and penny stocks are cheap. The share price is essentially arbitrary — it's a function of how many shares the company has chosen to issue, and companies can split their stock at any time to change the per-share price without changing anything about the underlying business. If a company with 100 million shares at $50 each does a 2-for-1 split, it becomes 200 million shares at $25 each. The business is identical. The total market value is identical. The per-share price has simply been cut in half. The right way to compare companies is by total market value — the price per share multiplied by the total number of shares outstanding. That number is called the market capitalization, and it's the first thing a thoughtful investor looks at when sizing up a company. A $50 stock with 100 million shares has the same market cap as a $25 stock with 200 million shares. One is not twice as expensive as the other, despite the naive comparison the per-share prices suggest.",
        callout:
          'Two companies can have wildly different per-share prices but identical market values. Always compare companies by market cap, not by share price alone.',
      },
      {
        title: 'Market capitalization: what it really measures',
        content:
          "Market capitalization, often shortened to \"market cap,\" is the total dollar value the market is currently putting on all the outstanding shares of a company. The math is simple: share price × total shares outstanding. A company with 1 billion shares trading at $50 has a market cap of $50 billion. A company with 10 million shares trading at $500 has a market cap of $5 billion. The first company is ten times larger despite having a lower share price. Market cap is the single most useful number for quickly gauging the size of a company, and it is also how stocks are typically categorized. The industry conventions shift over time, but a rough set of categories is: mega-cap (over $200 billion), large-cap ($10B–$200B), mid-cap ($2B–$10B), small-cap ($300M–$2B), and micro-cap (under $300M). Large-cap stocks tend to be established businesses with relatively stable cash flows and less dramatic price swings. Small-cap stocks tend to be younger or more specialized businesses with higher growth potential but also higher volatility and more bankruptcy risk. Neither is automatically better — they serve different roles in a diversified portfolio — but the categorization helps you understand what kind of company you're dealing with before you dig deeper.",
        visual: {
          type: 'bar-chart',
          data: {
            bars: [
              { label: 'Micro-cap', value: 300, color: '#f97316', suffix: 'M' },
              { label: 'Small-cap', value: 2, color: '#fbbf24', suffix: 'B' },
              { label: 'Mid-cap', value: 10, color: '#3b82f6', suffix: 'B' },
              { label: 'Large-cap', value: 200, color: '#10b981', suffix: 'B' },
              { label: 'Mega-cap', value: 1000, color: '#a78bfa', suffix: 'B+' },
            ],
          },
          caption: 'Approximate upper bounds for each market cap category. The boundaries are conventions, not strict rules, and they shift over time.',
        },
        keyTerms: ['market capitalization', 'shares outstanding', 'large-cap', 'small-cap'],
      },
      {
        title: 'The P/E ratio in plain English',
        content:
          "The price-to-earnings ratio, or P/E, is probably the most quoted valuation metric in investing, and the most misused. Here's what it actually measures: you take the current stock price and divide it by the company's earnings per share over the past year (or sometimes the projected earnings for the next year). The result is a number that tells you how many dollars the market is currently paying for one dollar of the company's annual profit. If a stock trades at $100 and the company earned $5 per share last year, the P/E is 20 — meaning investors are paying $20 for each dollar of current earnings. You can also flip this and think of it as the implied annual return if earnings stayed flat forever: a P/E of 20 implies a 5% earnings yield (1/20 = 0.05), while a P/E of 10 implies a 10% earnings yield. A high P/E usually signals that investors expect the company's earnings to grow rapidly in the future — they're paying a premium today for growth they think will arrive later. A low P/E usually signals the opposite: investors are skeptical, or the company is in a slow-growing or troubled industry. Neither is automatically good or bad. A \"cheap\" company at a P/E of 8 might be cheap because the business is slowly dying. A \"expensive\" company at a P/E of 50 might justify that valuation if its earnings really do triple over the next decade. The P/E is a starting point for analysis, not the analysis itself. Compare P/Es within the same industry, and be deeply suspicious of any single metric that claims to definitively tell you whether a stock is a buy.",
        keyTerms: ['P/E ratio', 'earnings per share', 'earnings yield'],
      },
      {
        title: 'Volume: a gauge of conviction',
        content:
          "Trading volume is simply the number of shares that have changed hands over a given period, usually quoted as the total for the current trading day. By itself, volume doesn't tell you whether a stock is going up or down. But in context, it tells you something useful about conviction. When a stock makes a big price move on unusually high volume, that move is generally considered more meaningful than the same move on thin volume. Heavy volume on a rising day suggests broad interest from many buyers. Heavy volume on a falling day suggests determined selling. Thin volume on either direction suggests a move that might not have staying power — just a few traders pushing the price around without the weight of many participants agreeing. Average daily volume — the typical amount traded on a normal day — is a useful comparison baseline. If a stock usually trades 2 million shares a day and suddenly trades 20 million on some piece of news, something significant has changed even before you read the headlines. Volume also matters for practical reasons: if a stock trades only a few thousand shares a day, placing a large order can move the price against you simply because there aren't enough natural sellers to match your buy. This is one of the reasons beginners should generally stick to stocks with robust daily volume — thousands of dollars or more, preferably millions.",
        visual: {
          type: 'bar-chart',
          data: {
            bars: [
              { label: 'Mon (avg day)', value: 2, color: '#6b7280', suffix: 'M' },
              { label: 'Tue (avg day)', value: 2, color: '#6b7280', suffix: 'M' },
              { label: 'Wed (earnings)', value: 12, color: '#10b981', suffix: 'M' },
              { label: 'Thu (aftermath)', value: 4, color: '#6b7280', suffix: 'M' },
              { label: 'Fri (fades)', value: 3, color: '#6b7280', suffix: 'M' },
            ],
          },
          caption: 'Volume surges on meaningful events (like earnings) and fades back to normal. Reading volume in context helps separate real signals from noise.',
        },
        keyTerms: ['volume', 'average daily volume'],
      },
      {
        title: 'Dividend yield and payout basics',
        content:
          "Many mature companies return cash directly to their shareholders in the form of dividends — periodic cash payments, usually paid quarterly. The dividend yield is the annual dividend divided by the current stock price, expressed as a percentage. A stock trading at $100 that pays $3 per year in dividends has a dividend yield of 3%. This is approximately the annual cash return you would receive as a shareholder if the stock price and the dividend payment both stayed perfectly flat. High-dividend stocks tend to be mature, slower-growing businesses that generate more cash than they need to reinvest in their operations. Technology companies, especially younger ones, often pay no dividend at all — they reinvest every dollar into growth. Utilities, consumer staples, and financial services firms tend to be the biggest dividend payers. A few warnings are worth noting. First, a very high dividend yield (say, above 8%) often means the market expects the dividend to be cut — the yield looks big because the stock price has already dropped in anticipation. Second, dividends are not guaranteed; companies can cut or eliminate them at any time, and they often do during recessions. Third, dividends are usually taxable in the year you receive them, which matters for your after-tax return. None of this makes dividends bad — they can be a useful source of portfolio income and a signal of financial discipline — but they should not be the only thing you look at when evaluating a stock.",
        keyTerms: ['dividend', 'dividend yield', 'payout ratio'],
      },
      {
        title: 'Key takeaways',
        content:
          "A stock quote is a dashboard, not a verdict. Share price alone is meaningless — two companies can have wildly different per-share prices but identical business values. Always compare companies by market cap, which is share price times total shares outstanding. The P/E ratio tells you how much the market is paying for each dollar of current earnings, and it should always be interpreted in context — high P/Es imply expected growth, low P/Es imply skepticism or stagnation. Volume tells you about conviction: big moves on big volume matter more than big moves on thin volume. Dividends are useful for cash-returning mature companies but should never be the only lens through which you evaluate a stock. No single number makes or breaks an investment thesis, and the beginner who learns to read these numbers together, in context, is already doing better analysis than most.",
      },
    ],
    quiz: [
      {
        question: 'Two companies have identical businesses but different share prices: Company A trades at $20 and Company B trades at $200. What does this tell you about their relative size?',
        options: [
          'Company B is ten times larger than Company A',
          'Company A is cheaper and therefore a better investment',
          'Nothing — share price alone doesn’t measure company size',
          'Company B is riskier because it has a higher price',
        ],
        correctIndex: 2,
        explanation: 'Share price is arbitrary — it depends on how many shares were issued. Total size is measured by market cap (price × shares), not per-share price.',
      },
      {
        question: 'Market capitalization is calculated as:',
        options: [
          'Share price plus annual revenue',
          'Share price multiplied by the number of shares outstanding',
          'Share price divided by earnings',
          'Share price minus book value',
        ],
        correctIndex: 1,
        explanation: 'Market cap = price × shares outstanding. It measures the total dollar value the market is putting on the entire company.',
      },
      {
        question: 'A P/E ratio of 20 means:',
        options: [
          'The stock will return 20% per year',
          'Investors are paying $20 for each $1 of the company’s annual earnings',
          'The stock will double in 20 years',
          'The company has 20 years until bankruptcy',
        ],
        correctIndex: 1,
        explanation: 'The P/E ratio expresses how many dollars of market price each dollar of annual earnings is worth. A P/E of 20 means $20 of price for $1 of earnings.',
      },
      {
        question: 'A company with a P/E ratio of 50 is most likely:',
        options: [
          'In financial distress',
          'Guaranteed to outperform the market',
          'One that investors expect to grow earnings significantly in the future',
          'Too small to trade',
        ],
        correctIndex: 2,
        explanation: 'High P/Es usually reflect market expectations of rapid earnings growth. Whether that growth actually arrives is a separate question — a high P/E is neither automatically good nor bad.',
      },
      {
        question: 'A stock rises 10% on volume that is 5 times its normal daily volume. Compared to a 10% rise on normal volume, this move is generally interpreted as:',
        options: [
          'Less meaningful, because volume is irrelevant',
          'More meaningful, because many participants are confirming the move',
          'A sign of manipulation',
          'Identical — volume has no bearing on price movement',
        ],
        correctIndex: 1,
        explanation: 'Heavy volume on a big move suggests broad participation and conviction, making the move more significant than the same move on thin volume.',
      },
      {
        question: 'Dividend yield is calculated as:',
        options: [
          'Annual dividend ÷ share price',
          'Quarterly dividend × 4 × shares outstanding',
          'Share price ÷ earnings per share',
          'Dividend growth rate over the past year',
        ],
        correctIndex: 0,
        explanation: 'Dividend yield = annual dividend per share ÷ current share price. It expresses the annual cash return as a percentage of the price.',
      },
      {
        question: 'A stock has a dividend yield of 12%. A beginner excited about the "income" should be cautious because:',
        options: [
          'High yields are illegal',
          'A very high yield often means the market expects the dividend to be cut',
          'Taxes on dividends are higher than 12%',
          'Dividend stocks cannot be sold',
        ],
        correctIndex: 1,
        explanation: 'An unusually high yield is often a warning sign: the stock price has already dropped in anticipation of a dividend cut, inflating the yield on paper.',
      },
      {
        question: 'A stock’s 52-week range is $30 to $80, and it currently trades at $75. This tells you:',
        options: [
          'The stock is guaranteed to hit $100 next',
          'The stock is near the high end of its recent range',
          'The stock is undervalued',
          'The stock has paid a dividend 52 weeks in a row',
        ],
        correctIndex: 1,
        explanation: 'The 52-week range shows the high and low over the past year. At $75 out of a $30-$80 range, the stock is near the top of that range. That is context, not a buy or sell signal.',
      },
      {
        question: 'If Company A has a market cap of $500 billion and Company B has a market cap of $5 billion, the most accurate statement is:',
        options: [
          'A is 100 times more expensive per share',
          'A is classified as large-cap or mega-cap; B is mid-cap or small-cap',
          'B is a better investment because it is cheaper',
          'A is always safer than B',
        ],
        correctIndex: 1,
        explanation: 'Market cap determines size classification. A at $500B is mega-cap; B at $5B sits in the mid-cap range. Neither is automatically better — they serve different roles in a portfolio.',
      },
      {
        question: 'Which of these statements about the P/E ratio is most accurate?',
        options: [
          'A low P/E always indicates a bargain',
          'A high P/E always indicates an overvalued stock',
          'P/E ratios are most useful when compared across companies in the same industry',
          'P/E ratios only apply to dividend-paying stocks',
        ],
        correctIndex: 2,
        explanation: 'Different industries have structurally different P/E ranges — tech tends to be higher, utilities lower. Comparing a growth software company’s P/E to a utility’s P/E is a common beginner mistake.',
      },
    ],
  },
  'stocks-basic-4': {
    sections: [
      {
        title: 'What an index actually measures',
        content:
          "A stock market index is a calculated average of the prices (or values) of a specific group of stocks, designed to give you a single number that summarizes how a slice of the market is doing. When you hear someone on the news say \"the market was up 0.6% today,\" they're almost always quoting the change in a major index like the S&P 500 rather than talking about every single stock. An index is essentially a shorthand. It lets you describe the behavior of hundreds or thousands of individual stocks with one number that moves up and down in a way that correlates roughly with the performance of that slice of the market. Different indices track different slices. The S&P 500 tracks 500 of the largest U.S. companies. The Dow Jones Industrial Average tracks 30 large U.S. stocks chosen by a committee. The Nasdaq Composite tracks nearly every stock listed on the Nasdaq exchange. The Russell 2000 tracks 2,000 smaller U.S. companies. The MSCI World tracks thousands of large companies across developed markets globally. No index is \"the\" market. They're all different lenses on different parts of it, and they can diverge significantly over short periods. In 2000, the Nasdaq Composite dropped more than 70% over the next two years while the broader S&P 500 dropped about 40% over the same period. Both were real, both were market indices, and both told very different stories about what was happening.",
        keyTerms: ['index', 'benchmark', 'S&P 500', 'Dow Jones', 'Nasdaq Composite', 'Russell 2000'],
      },
      {
        title: 'Why most indices are weighted by size, not equally',
        content:
          "The way an index is constructed — specifically, how it weights its constituents — has huge consequences for how it behaves. There are three main approaches: market-cap weighted, price weighted, and equal weighted. Most modern indices, including the S&P 500, are market-cap weighted. This means bigger companies carry bigger influence on the index. If Apple is worth 7% of the total market cap of the S&P 500, then Apple alone drives 7% of the S&P 500's daily movement. A smaller company worth only 0.1% of the index barely matters. The Dow Jones Industrial Average is unusual in that it is price weighted — the literal share price of each company determines its influence, regardless of how many shares are outstanding. This has strange consequences. A company with a share price of $500 carries more weight in the Dow than a company with a share price of $50, even if the $50 company is a hundred times bigger by market cap. Equal-weighted indices, which give each company identical influence regardless of size, exist but are less common. Understanding the weighting method matters because it changes what the index is actually telling you. A cap-weighted index is dominated by the few largest companies and reflects mostly what those giants are doing. An equal-weighted version of the same universe gives you a much cleaner read on the \"average\" stock's performance.",
        visual: {
          type: 'comparison-table',
          data: {
            columns: [
              { label: 'Cap-weighted', color: '#10b981' },
              { label: 'Price-weighted', color: '#f97316' },
              { label: 'Equal-weighted', color: '#3b82f6' },
            ],
            rows: [
              { attribute: 'Example index', values: ['S&P 500, MSCI', 'Dow Jones', 'S&P 500 Equal Weight'] },
              { attribute: 'Bigger companies matter more', values: ['Yes', 'No (based on price)', 'No'] },
              { attribute: 'Price-based distortion', values: ['No', 'Yes — $500 stock > $50 stock', 'No'] },
              { attribute: 'Reflects', values: ['Market value dynamics', 'Price movement of chosen list', 'Average stock performance'] },
            ],
          },
          caption: 'The weighting method determines what the index is actually measuring — and it can cause two indices of the same market to tell quite different stories.',
        },
        keyTerms: ['market-cap weighted', 'price weighted', 'equal weighted'],
      },
      {
        title: 'The S&P 500 in particular',
        content:
          "The S&P 500 is, for most practical purposes, the single most important index in U.S. investing. It's made up of roughly 500 of the largest U.S. public companies (the exact number shifts occasionally due to additions and removals) and is chosen by a committee at Standard & Poor's that applies specific criteria: the company has to be U.S.-based, profitable over recent periods, large enough (typically at least $14 billion in market cap), and sufficiently liquid. The index is weighted by market capitalization, so larger companies have more influence. At the time of this writing, the top 10 holdings typically account for around 30% of the entire index — meaning a few giant companies like Apple, Microsoft, and Amazon drive a disproportionate share of the index's movements. The remaining 490 or so companies collectively account for the other 70%. The S&P 500 is the benchmark most commonly used to evaluate the performance of active fund managers, and it's the index most broadly tracked by index funds and ETFs. Over the past several decades, the S&P 500 has returned roughly 10% per year on average (including reinvested dividends), though this long-run average masks enormous year-to-year variation — some years up 30%, some years down 30%, and plenty in between. When somebody talks about \"owning the market\" in a simple, low-cost way, they usually mean owning a fund that tracks the S&P 500 or something even broader like the total U.S. stock market.",
        keyTerms: ['S&P 500', 'benchmark', 'total return'],
      },
      {
        title: 'Why the Dow Jones is less useful than you think',
        content:
          "The Dow Jones Industrial Average is probably the best-known stock market index in American culture — it's the number newsreaders quote most often and the headline figure in most casual conversations about \"the stock market.\" But it has several quirks that make it a poor benchmark for serious analysis. First, it contains only 30 companies, which is a tiny sliver of the actual U.S. stock market. Second, it's price-weighted rather than cap-weighted, which means the influence of each company depends on its share price rather than its actual size. If a $40 stock splits 2-for-1 and becomes a $20 stock, its influence on the Dow suddenly drops by half — even though nothing about the underlying business has changed. Third, the 30 companies in the Dow are picked by a committee at the Wall Street Journal based on vague criteria like \"reputation\" and \"representativeness,\" and changes are rare, which means the Dow often reflects an older view of what the U.S. economy looks like. The S&P 500 is a far better benchmark for most purposes: it covers 16 times more companies, uses the more sensible cap-weighting methodology, and is updated continuously to reflect changes in company size and composition. The Dow persists in headlines mostly because of tradition. When you're trying to understand what the market is doing, the S&P 500 (or a broader total-market index) is almost always the better number to look at.",
        callout:
          'The Dow Jones is the most famous index but one of the least useful for serious analysis. The S&P 500 is a far better benchmark.',
        keyTerms: ['Dow Jones', 'price-weighted'],
      },
      {
        title: 'International and sector indices',
        content:
          "The U.S. market is huge, but it's only about 40-45% of the global stock market by value. The rest is spread across developed markets (Europe, Japan, Canada, Australia) and emerging markets (China, India, Brazil, Indonesia, and many others). A thoughtful investor who wants true geographic diversification can't ignore international stocks, and international indices exist to help track them. The most common are the MSCI EAFE (Europe, Australasia, and the Far East, excluding the U.S.), the MSCI Emerging Markets index, and the MSCI All Country World Index (ACWI), which combines everything. You can buy low-cost ETFs that track any of these, giving you instant global exposure through a single ticker. There are also sector-specific indices that track only companies in a particular industry — technology, healthcare, financials, consumer staples, energy, utilities, and so on. These are useful when you want to understand how a specific part of the economy is performing, or when you want concentrated exposure to an industry you have a view on. A word of warning about sector investing for beginners: concentrating your portfolio in a single sector is the opposite of diversification. It can amplify both gains and losses, and it's historically been a way that retail investors lose a lot of money by chasing whichever sector happened to do well most recently. Broad indices are generally a better starting point than narrow ones.",
        keyTerms: ['international index', 'MSCI EAFE', 'emerging markets', 'sector index'],
      },
      {
        title: 'Why beginner investors should care about indices',
        content:
          "For a beginning investor, indices matter for two practical reasons. First, they are the benchmark against which you should compare your portfolio's performance. If you pick individual stocks and your portfolio returns 12% in a year while the S&P 500 returns 15%, you underperformed the simple alternative of just buying an index fund. Knowing this is important — it's how you honestly assess whether your active decisions are adding any value or whether you'd be better off owning the index directly. Second, indices are the basis for the low-cost index funds and ETFs that most thoughtful investors recommend as the backbone of a diversified portfolio. When somebody says \"buy and hold a total-market index fund,\" they're saying: accept that you don't know how to pick winners, buy the whole haystack instead, pay almost nothing in fees, and let compounding do the work. Decades of research suggest this approach beats the vast majority of active strategies for ordinary investors. You do not need to know any market insider to benefit from this. You just need to pick one or two broad index ETFs, set up regular contributions, and leave them alone for a long time. That boring discipline is what indices enable, and it's what has worked for most people who have followed it.",
      },
      {
        title: 'Key takeaways',
        content:
          "An index is a summary of a slice of the market — not the whole market. The S&P 500 tracks 500 of the largest U.S. companies and is cap-weighted, making it the most useful broad benchmark. The Dow Jones is famous but less informative because it contains only 30 companies and uses a price-weighting method with strange distortions. International indices exist for investors who want true global diversification, which the U.S. alone doesn't provide. Indices matter to ordinary investors in two ways: as a benchmark to honestly evaluate whether your own choices are beating the simple alternative, and as the foundation for the low-cost index funds that most evidence-based investment advice revolves around.",
      },
    ],
    quiz: [
      {
        question: 'The S&P 500 is best described as:',
        options: [
          'The 500 stocks with the highest share price',
          'A list of 500 large U.S. companies weighted by market capitalization',
          'The 500 most heavily traded stocks each day',
          'A random sample of 500 U.S. stocks updated weekly',
        ],
        correctIndex: 1,
        explanation: 'The S&P 500 contains roughly 500 of the largest U.S. public companies, selected by a committee, and weighted by market cap.',
      },
      {
        question: 'In a market-cap weighted index, the largest companies:',
        options: [
          'Have the same influence as the smallest ones',
          'Have more influence on the index’s movement than smaller ones',
          'Are excluded so the index isn’t dominated',
          'Are capped at 1% each',
        ],
        correctIndex: 1,
        explanation: 'Cap-weighted indices give bigger companies more influence. A 7%-weighted company moves the index seven times more per percent change than a 1%-weighted company.',
      },
      {
        question: 'The Dow Jones Industrial Average is unusual because it is:',
        options: [
          'Market-cap weighted like most modern indices',
          'Price-weighted — share price, not size, determines influence',
          'Equal-weighted among all 30 companies',
          'Weighted by revenue',
        ],
        correctIndex: 1,
        explanation: 'The Dow is price-weighted, which means a company with a higher per-share price carries more influence, regardless of its actual size — a quirky methodology that produces distortions.',
      },
      {
        question: 'Why is the S&P 500 a better benchmark than the Dow Jones for most investors?',
        options: [
          'It has more colorful logos',
          'It contains far more companies (500 vs 30) and uses the more sensible cap-weighting method',
          'It updates more frequently during the day',
          'It is cheaper to invest in',
        ],
        correctIndex: 1,
        explanation: 'The S&P 500 covers 16 times more companies and uses cap-weighting, which reflects actual company sizes. The Dow persists mostly due to tradition.',
      },
      {
        question: 'Over the past several decades, the S&P 500 has returned roughly:',
        options: [
          '2% per year on average',
          '10% per year on average including dividends',
          '25% per year on average',
          '50% per year on average',
        ],
        correctIndex: 1,
        explanation: 'The S&P 500 has averaged about 10% annually over long periods including reinvested dividends. Year-to-year variation is enormous — some years +30%, others -30% — but the long-run average clusters around 10%.',
      },
      {
        question: 'An index fund that tracks the S&P 500 is designed to:',
        options: [
          'Beat the S&P 500 by active stock picking',
          'Match the S&P 500’s return before fees by holding the index’s components',
          'Hold only the top 10 companies in the index',
          'Rotate holdings daily based on momentum',
        ],
        correctIndex: 1,
        explanation: 'An index fund passively holds the constituent stocks in index proportions, aiming to match the index’s return rather than beat it. This keeps costs very low.',
      },
      {
        question: 'The U.S. stock market represents roughly what share of the total global stock market value?',
        options: [
          '10%',
          '40-45%',
          '80%',
          '100% — international markets are too small to matter',
        ],
        correctIndex: 1,
        explanation: 'The U.S. is the single largest market but still only around 40-45% of global stock market value. International stocks matter for true geographic diversification.',
      },
      {
        question: 'You pick a portfolio of individual stocks and earn 8% in a year. The S&P 500 returns 14% that year. What should you conclude?',
        options: [
          'Your stock picks are clearly winning',
          'Your active choices underperformed the simple alternative of an index fund',
          'Indices are irrelevant to individual portfolios',
          'You should pick even more aggressive stocks next year',
        ],
        correctIndex: 1,
        explanation: 'If your active picks underperform a low-cost index fund, you failed to add value with your effort. Honestly comparing your results to an index is the main way investors evaluate whether their active choices are justified.',
      },
      {
        question: 'Sector-specific indices (like a technology index or energy index) are:',
        options: [
          'The best starting point for every beginner portfolio',
          'Useful for concentrated exposure but the opposite of broad diversification',
          'Illegal for retail investors',
          'Always safer than broad indices',
        ],
        correctIndex: 1,
        explanation: 'Sector indices concentrate your exposure in one industry, which is the opposite of diversification. They can amplify both gains and losses and are usually not a great starting point for beginners.',
      },
      {
        question: 'Two S&P 500 index funds from different companies, both tracking the same index, should have:',
        options: [
          'Wildly different returns',
          'Nearly identical returns, with differences mostly driven by fees',
          'Returns that diverge by 5% or more per year',
          'Returns that depend on which company has the better manager',
        ],
        correctIndex: 1,
        explanation: 'Both funds hold the same underlying stocks in the same proportions. Their returns should be nearly identical, with the tiny remaining difference coming from expense ratios and trading efficiency.',
      },
    ],
  },
  'stocks-basic-5': {
    sections: [
      {
        title: 'Opening a brokerage account',
        content:
          "A brokerage account is the on-ramp to the stock market for ordinary people. It's an account at a financial firm (a brokerage) that is authorized to buy and sell securities on your behalf and to hold those securities for you afterward. Opening one is much simpler than most beginners expect. Most major U.S. brokerages — Fidelity, Charles Schwab, Vanguard, E*TRADE, Robinhood, and several others — let you open an account entirely online in about fifteen minutes. You'll be asked for basic personal information (name, address, Social Security number), employment details, and a few questions about your investing experience and financial goals. Those questions are part of a regulatory requirement called \"know your customer\" rules designed to help match you with appropriate investment products and to flag anything unusual. Once the account is approved, you link your bank account and transfer money in. After a short waiting period (often a few business days for electronic transfers to fully settle), the cash is available and you can start buying investments. The fees for maintaining a brokerage account have dropped dramatically over the past decade. Many major brokers now charge zero commissions on U.S. stock and ETF trades, zero account maintenance fees, and no minimum balance. This was not always the case — as recently as the early 2000s, placing a single trade could cost $20 or more — but fee compression has made basic investing nearly free for small accounts. Beginners do not need a fancy or expensive brokerage. Any of the major low-cost providers will do everything a typical investor needs to do.",
        keyTerms: ['brokerage account', 'know your customer', 'commission-free trading'],
      },
      {
        title: 'Cash accounts vs margin accounts',
        content:
          "When you open a brokerage account, you will usually be offered two types: a cash account or a margin account. A cash account is the simpler of the two. You can only buy securities with money you've already deposited. If you have $1,000 in the account, you can buy up to $1,000 of stock. When you sell a stock, the proceeds have to \"settle\" (typically a day or two) before that cash is available to buy something else. A margin account lets you borrow money from the brokerage to buy more stock than you actually have cash to pay for. If you deposit $1,000, a margin account might let you buy up to $2,000 of stock — with the other $1,000 borrowed from the broker at an interest rate set by the broker. This is called \"buying on margin\" or \"leverage,\" and it has historically been a very effective way for inexperienced investors to destroy their wealth. The math is simple: leverage amplifies both gains and losses. If the stock goes up 10%, you earn 20% on your original $1,000 (minus interest). But if the stock goes down 10%, you lose 20% of your original money. And if the stock drops far enough that your account equity falls below the brokerage's required minimum, the broker will issue a \"margin call\" and can forcibly sell your positions at the worst possible moment to cover the loan. For beginners, the correct choice is almost always a cash account. The temptation of margin is real — more buying power looks like more opportunity — but it is a specialized tool that has a long history of wrecking investors who used it without understanding it.",
        callout:
          'Beginners should open a cash account, not a margin account. The extra buying power from margin is the main way inexperienced investors turn losses into catastrophes.',
        keyTerms: ['cash account', 'margin account', 'leverage', 'margin call'],
      },
      {
        title: 'Market orders vs limit orders',
        content:
          "When you place an order to buy or sell a stock, your broker asks you what type of order you want to use. The two most common types are market orders and limit orders, and understanding the difference is more important than it first sounds. A market order tells your broker \"buy (or sell) this stock right now at whatever price the market is currently offering.\" It's fast — it usually fills in a fraction of a second — and you are virtually guaranteed that the order will execute. The tradeoff is that you don't control the exact price. If you place a market order to buy a stock quoted at $50, you'll probably get filled at around $50, but in a fast-moving market or a thinly traded stock, you might get $50.25 or even $51. For highly liquid stocks during normal trading hours, this is usually no big deal. For thinly traded stocks or during chaotic moments, the difference can be significant. A limit order tells your broker \"buy (or sell) this stock only at a specific price or better.\" If you place a limit buy at $50, you will only get filled if the market price drops to $50 or below. If the market never reaches your price, your order simply doesn't execute. Limit orders give you precise price control but they don't guarantee execution — you might wait forever for a stock that never comes down to your target. The general rule is: use market orders for fast execution on highly liquid stocks when the exact fill price doesn't matter much, and use limit orders when the price matters or the stock is illiquid.",
        visual: {
          type: 'comparison-table',
          data: {
            columns: [
              { label: 'Market order', color: '#10b981' },
              { label: 'Limit order', color: '#3b82f6' },
            ],
            rows: [
              { attribute: 'Execution', values: ['Almost guaranteed', 'Only if price reaches your target'] },
              { attribute: 'Price control', values: ['No — you take the current market', 'Yes — set your max/min'] },
              { attribute: 'Speed', values: ['Immediate', 'Depends on market reaching your price'] },
              { attribute: 'Best for', values: ['Liquid stocks, fast fills', 'Thin stocks, specific price targets'] },
              { attribute: 'Risk of bad fill', values: ['Higher in thin markets', 'Zero — you control the price'] },
              { attribute: 'Risk of non-execution', values: ['Very low', 'Real — order may never fill'] },
            ],
          },
          caption: 'The choice between market and limit orders is a tradeoff between execution certainty and price control.',
        },
        keyTerms: ['market order', 'limit order'],
      },
      {
        title: 'Stop orders and other special types',
        content:
          "Beyond basic market and limit orders, most brokerages offer a few additional order types that are worth knowing even if you don't use them often. A stop order is an order that only becomes active once the stock reaches a specific price. The most common use is the \"stop-loss order,\" which is designed to automatically sell a position if the price drops to a predetermined level — a way to limit your downside if a trade goes against you. You buy a stock at $100 and set a stop-loss at $90. If the stock ever trades at or below $90, your stop order becomes a market sell order and your position is closed out at roughly that price. Stop orders have one notable weakness: in a sharp gap or fast-moving market, the execution price can be significantly worse than the stop price you set, because the order becomes a market order once triggered. A \"stop-limit order\" is a variant that tries to address this by converting into a limit order instead of a market order, but then you face the opposite risk — your order may not execute at all if the price gaps past your limit. There are also time-in-force modifiers you can attach to any order: \"day\" (the order is valid only for today; if it doesn't fill, it's cancelled at market close) and \"good-til-cancelled\" (GTC, meaning the order stays open until it fills or you manually cancel it). For most beginners, day orders are safer. A GTC order you forgot about and then remembered three months later might execute at a surprising price on a day when you weren't paying attention.",
        keyTerms: ['stop order', 'stop-loss', 'stop-limit', 'time in force', 'GTC'],
      },
      {
        title: 'Fractional shares and small accounts',
        content:
          "Historically, you could only buy stocks in whole-share units. If a share of Berkshire Hathaway Class A cost $500,000, you needed $500,000 to own one share, and the entire asset class was effectively out of reach for small investors. That changed over the past several years as most major brokerages introduced fractional share trading, which lets you buy a tiny slice of a share based on a dollar amount rather than a share count. You can now put $25 into a stock that trades at $3,000 and own roughly 0.00833 of a share. This might sound like a gimmick but it's actually a significant improvement for small accounts and for systematic investors. It means you can invest any whole-dollar amount you want, without having to round up or down to a whole number of shares. It means a $50 weekly contribution to your brokerage account can buy a small slice of an expensive stock instead of sitting in cash. It also makes automated dollar-cost averaging much smoother — you can set up an automatic $200 contribution every two weeks and have it buy exactly $200 of whatever you've chosen, not $187 or $213 because the share price doesn't divide evenly. A word of caution: fractional shares at most brokerages are held by the broker on your behalf as an internal accounting matter rather than as an actual exchange-traded security, which means in some edge cases (transferring shares between brokerages, for example) fractional holdings may behave differently from whole shares. But for everyday buying and selling, the fraction works exactly like a full share scaled down.",
        keyTerms: ['fractional shares', 'dollar-cost averaging'],
      },
      {
        title: 'Settlement and practical timing',
        content:
          "When you buy a stock, there's a small but important lag between the moment the trade executes and the moment the transaction is officially \"settled.\" In the U.S. equity market, the current settlement period is T+1 — one business day after the trade date. If you buy on Monday, the trade settles on Tuesday. Before settlement, your broker shows the stock as owned in your account (and you're entitled to any dividends that may be paid in that window) but technically the cash transfer is still in progress in the background. For most buy-and-hold investors, settlement is invisible — you don't notice it because you're not rapidly moving in and out of positions. But if you're doing a lot of trading in a cash account, you need to be aware of rules about using unsettled funds. Selling a stock before the cash from a previous sale has settled, then using those proceeds to buy something else, can trigger a restriction called a \"good faith violation\" if you then sell the new position before the original cash has settled. Most beginners don't run into this because most beginners don't trade that frequently, but it's a useful rule to know. Settlement also explains why you can't instantly move newly deposited cash out of your brokerage account — the bank transfer has to complete before the cash is available for withdrawal.",
        keyTerms: ['settlement', 'T+1', 'good faith violation'],
      },
      {
        title: 'Key takeaways',
        content:
          "Opening a brokerage account is quick and usually free at a major low-cost provider. Cash accounts are the safer default for beginners — margin accounts can amplify losses to catastrophic levels. Market orders execute fast but at whatever price the market offers; limit orders control the price but may never fill. Stop-loss orders can automate downside protection but they're not foolproof, especially in gap markets. Fractional shares have democratized stock investing by letting you put any whole-dollar amount into any stock, regardless of per-share price. And settlement still exists as a one-business-day lag that most buy-and-hold investors will never notice. The combination of low fees, simple order types, and fractional shares means that starting to invest today costs less and requires less money than at any point in the history of the U.S. market.",
      },
    ],
    quiz: [
      {
        question: 'A cash account differs from a margin account in that:',
        options: [
          'A cash account cannot hold any stocks',
          'A cash account only lets you buy with money you’ve already deposited, while a margin account lets you borrow from the broker',
          'A cash account has higher fees',
          'Only margin accounts can hold ETFs',
        ],
        correctIndex: 1,
        explanation: 'Cash accounts require settled cash for every purchase. Margin accounts allow borrowing from the broker, amplifying both gains and losses.',
      },
      {
        question: 'Why is a cash account the safer default for beginners?',
        options: [
          'It earns higher interest',
          'It prevents the catastrophic downside of leverage and margin calls',
          'It allows fractional shares; margin accounts do not',
          'It is required by law for anyone under 30',
        ],
        correctIndex: 1,
        explanation: 'Margin amplifies losses and can force involuntary selling at the worst moments via margin calls. A cash account protects beginners from this specific risk.',
      },
      {
        question: 'A market order is best described as:',
        options: [
          '"Buy this stock when it drops below my price"',
          '"Buy this stock right now at whatever the current market price is"',
          '"Buy this stock only during the closing auction"',
          '"Buy this stock if the market index rises"',
        ],
        correctIndex: 1,
        explanation: 'A market order executes immediately at the best available price. You trade price control for execution certainty.',
      },
      {
        question: 'When is a limit order particularly useful?',
        options: [
          'When you want execution certainty above all else',
          'When the stock is thinly traded or you care about the exact fill price',
          'When you want the order to execute only on weekends',
          'When you are trading in a margin account',
        ],
        correctIndex: 1,
        explanation: 'Limit orders give you precise price control. They shine when the stock is illiquid (where market orders can fill at bad prices) or when you need a specific price.',
      },
      {
        question: 'What is the primary risk of a stop-loss order in a fast-moving market?',
        options: [
          'The broker will charge extra fees',
          'The stock may gap down past the stop price and execute at a much lower price than intended',
          'The order will never trigger',
          'The SEC prohibits stop-losses',
        ],
        correctIndex: 1,
        explanation: 'Once triggered, a stop-loss converts to a market order. In a gap-down scenario, the execution can happen well below the stop price, undermining the protection you thought you had.',
      },
      {
        question: 'Fractional shares allow you to:',
        options: [
          'Invest any dollar amount in any stock, regardless of its per-share price',
          'Only buy whole numbers of shares',
          'Avoid paying taxes on gains',
          'Vote at shareholder meetings with weighted votes',
        ],
        correctIndex: 0,
        explanation: 'Fractional shares decouple investment amount from per-share price. You can buy $25 of a $3,000 stock, which is especially helpful for small-dollar systematic investing.',
      },
      {
        question: 'A "GTC" (good-til-cancelled) order:',
        options: [
          'Is guaranteed to fill within 24 hours',
          'Stays open until it fills or you manually cancel it',
          'Automatically becomes a market order at market close',
          'Is only valid for margin accounts',
        ],
        correctIndex: 1,
        explanation: 'A GTC order remains active indefinitely until filled or cancelled. This is powerful but also risky — a forgotten GTC can surprise you by executing weeks later.',
      },
      {
        question: 'The U.S. equity settlement period is:',
        options: [
          'Same day (T+0)',
          'T+1 — one business day after trade date',
          'T+5 — five business days',
          'Two calendar weeks',
        ],
        correctIndex: 1,
        explanation: 'U.S. equity trades settle T+1, meaning the actual transfer of securities and cash officially completes one business day after the trade date.',
      },
      {
        question: 'If you have $1,000 of cash in a brokerage account and you buy $500 of Stock A today, what happens if you try to buy another $500 of Stock B using those funds tomorrow?',
        options: [
          'You cannot, because the broker will reject the order',
          'You can — you still have $500 of unspent cash available',
          'The broker will automatically sell Stock A',
          'You need a margin account for this',
        ],
        correctIndex: 1,
        explanation: 'You only spent $500 of your $1,000 on Stock A. The remaining $500 is available for other purchases. No margin or leverage is involved.',
      },
      {
        question: 'Commission-free stock trading is now standard at most major U.S. brokerages. This means:',
        options: [
          'All trading is completely free with no hidden costs',
          'You pay no per-trade commission, though other costs like bid-ask spreads still apply',
          'The brokerage is losing money on every trade',
          'There are no regulations on commissions',
        ],
        correctIndex: 1,
        explanation: 'Most brokerages charge no explicit per-trade commission, but you still incur spreads and other small indirect costs. The headline "commission-free" is accurate but not the only cost to consider.',
      },
    ],
  },
  'stocks-basic-6': {
    sections: [
      {
        title: 'The arithmetic of compounding',
        content:
          "Compounding is the single most important mathematical concept in investing, and it is also the most emotionally underwhelming on any given day. The idea is simple: when you earn a return on your investment and leave that return invested, you then earn a return on the return, and so on, recursively. In the first year your earnings are computed on your original stake. In the second year your earnings are computed on your original stake plus last year's gain. In year three you earn a return on the original stake, on year one's gain, and on year two's gain — and so on. After enough years this process starts to produce numbers that look unreasonable. They are not unreasonable. They are just what happens when you leave math alone for a long time. A simple example: $1,000 invested at 7% annually, left completely alone, becomes about $1,967 in ten years. That's nearly double. Not that exciting yet. But by year twenty, it's around $3,870. By year thirty, it's about $7,612. By year forty, it's over $14,900. The first decade produced about $967 in growth. The fourth decade produces over $7,000 in growth — on the same original $1,000 with the same 7% return. The engine is the same every year. It just has more and more to work on as time passes. This is why financial professionals, teachers, and honest advisors all hammer the same point: the single most powerful lever in wealth-building is time. Not stock picking. Not market timing. Not some clever strategy. Just giving the arithmetic enough runway to do its thing.",
        visual: {
          type: 'compound-growth',
          data: {
            principal: 1000,
            rate: 0.07,
            years: 40,
            milestones: [0, 10, 20, 30, 40],
          },
          caption: 'A single $1,000 deposit growing at 7% per year. Notice how the bars barely move for the first decade and then explode — that is compounding doing its work.',
        },
        keyTerms: ['compound interest', 'principal', 'annual return', 'time horizon'],
      },
      {
        title: 'Why starting early dwarfs starting big',
        content:
          "Here is a thought experiment that makes the power of time visceral. Imagine two investors: Alice starts saving at age 25 and invests $5,000 per year for ten years (through age 34), then stops entirely and never adds another dollar. She invests a total of $50,000 over her lifetime. Bob starts saving at age 35 — exactly when Alice stopped — and invests the same $5,000 per year, but he keeps going for thirty years straight until age 65. Bob invests a total of $150,000 over his lifetime, three times as much as Alice. Assuming both earn a steady 7% annual return, who ends up with more money at age 65? The answer, counterintuitive but mathematically inevitable, is that Alice ends up with more. Her $50,000 total contribution, started ten years earlier, grows to roughly $602,000 by age 65. Bob's $150,000 total contribution, spread over thirty years starting later, grows to roughly $540,000. Alice wins despite investing a third as much money, because her dollars had a decade of additional compounding to work on. This is not a trick. It's just what the arithmetic says when you plug in the numbers. The lesson is not that Bob shouldn't start at 35 — of course he should, some saving is always better than none — but that the single most valuable thing a young person can do for their future self is to start as early as possible, even with small amounts. A 25-year-old who saves $100 a month is probably ahead of a 45-year-old who saves $500 a month, over a long enough horizon. Time is the thing neither of them can buy back.",
        callout:
          'Starting early with small amounts almost always beats starting later with bigger amounts. Time is the only ingredient you cannot buy back.',
      },
      {
        title: 'The rule of 72',
        content:
          "A handy shortcut for estimating how long it takes money to double at a given rate of return is the \"rule of 72.\" You take 72 and divide it by the annual return percentage, and the result is roughly the number of years it will take your money to double. At 6% per year, money doubles in about 72/6 = 12 years. At 8%, it doubles in 72/8 = 9 years. At 12%, it doubles in 72/12 = 6 years. This isn't exact — the actual math involves logarithms — but it's accurate enough for back-of-envelope thinking about investments and makes for fast mental calibration. Consider some implications. If the S&P 500 returns its long-run average of about 10% annually, money invested in a broad U.S. stock index fund doubles roughly every 7 years. A 30-year-old with $10,000 in a low-cost index fund can expect, in a very rough mathematical sense, that money to become about $20,000 by age 37, $40,000 by age 44, $80,000 by age 51, $160,000 by age 58, and about $320,000 by age 65 — without adding a single additional dollar. If they keep contributing over that same period, the final number is vastly higher. The rule of 72 also works in reverse to show the corrosive effect of fees. A 2% annual fee (on top of whatever the fund earns) is equivalent to your money taking 36 years to double instead of 72/return. That's why fees matter so much over long horizons: a small annual drag compounds just as ruthlessly as returns do.",
        keyTerms: ['rule of 72', 'doubling time'],
      },
      {
        title: 'Inflation: the invisible headwind',
        content:
          "Every discussion of long-term returns has to grapple with inflation, which is the general rise in the price of goods and services over time. A dollar in 2000 does not buy the same amount of groceries or rent that a dollar buys today. Inflation erodes the real purchasing power of money, and it does so continuously in the background whether or not you're paying attention. If your savings earn 3% per year and inflation runs at 2% per year, your real return — the growth in your actual purchasing power — is only about 1%. If your savings earn 3% and inflation runs at 4% (as it did in 2022), you are actually losing purchasing power even though the nominal dollar figure in your account is growing. This is critically important context for thinking about \"safe\" investments. A savings account paying 0.5% interest in a 3% inflation environment is effectively losing you about 2.5% per year in real terms. Cash in a drawer is guaranteed to lose purchasing power over any meaningful time horizon. This is one of the core arguments for investing in stocks over the long run, despite their volatility: over multi-decade periods, stocks have historically returned significantly more than the rate of inflation, producing real wealth growth rather than just nominal numbers that keep up with rising prices. Always ask yourself about an investment: is this going to beat inflation over the period I'm holding it? If the answer is no, you're running in place or slowly falling behind.",
        visual: {
          type: 'bar-chart',
          data: {
            bars: [
              { label: 'Cash in a drawer', value: -2, color: '#ef4444', suffix: '%' },
              { label: 'Savings account', value: 0, color: '#f97316', suffix: '%' },
              { label: 'Treasury bonds', value: 1, color: '#fbbf24', suffix: '%' },
              { label: 'Corporate bonds', value: 2, color: '#3b82f6', suffix: '%' },
              { label: 'U.S. stocks (broad)', value: 7, color: '#10b981', suffix: '%' },
            ],
          },
          caption: 'Approximate real (inflation-adjusted) historical returns for different asset classes over long periods. Cash actually loses purchasing power over time.',
        },
        keyTerms: ['inflation', 'real return', 'nominal return', 'purchasing power'],
      },
      {
        title: 'Dollar-cost averaging',
        content:
          "Dollar-cost averaging is a simple discipline where you invest a fixed dollar amount into the same investment at regular intervals — say, $500 into an S&P 500 ETF on the first of every month — regardless of what the market is doing that day. Over time this produces two useful effects. First, it smooths out the price you pay: when the market is high, your $500 buys fewer shares; when the market is low, your $500 buys more shares. The average cost per share works out to something close to the mathematical average of prices over the period, which is typically better than the outcome you'd get from trying to time the market with lump-sum decisions. Second, and maybe more importantly, it removes emotion from the process. You don't have to decide whether today is a good day to invest. You don't have to agonize over whether the market has \"pulled back enough\" to get in. You just follow the schedule. During market downturns, the discipline is especially valuable: a mechanical schedule keeps buying even while the news is full of warnings, which is precisely when the best long-term prices tend to appear. Dollar-cost averaging is not optimal in the mathematical sense — if you have a lump sum and the market goes straight up, investing it all at once will beat dollar-cost averaging on paper. But for most human beings, most of the time, the behavioral benefits of a steady schedule outweigh the theoretical cost of not timing a lump sum perfectly. Most 401(k) retirement plans work this way by default, with a fixed percentage of your paycheck going into chosen funds on every pay cycle. That's dollar-cost averaging happening automatically, and it's one of the reasons 401(k) investors often outperform investors who try to be clever with their own accounts.",
        keyTerms: ['dollar-cost averaging', '401(k)'],
      },
      {
        title: 'Why fees matter so much over time',
        content:
          "If there's one quiet thief that steals from investors more effectively than any other, it's fees. A 1% annual fund fee sounds trivial. Over a 40-year investing lifetime, it isn't. Consider two investors who each invest $10,000 at age 25 and earn 7% per year before fees. Investor A holds a fund charging 0.05% per year in fees. Investor B holds a fund charging 1% per year. Both hold their funds until age 65. Investor A ends up with about $148,000. Investor B ends up with about $102,000. The difference — $46,000 — is almost half again of Investor A's final balance, and it comes entirely from a seemingly small difference in fees. This is compounding working in reverse. A fee drags on your return every year, and that drag compounds just as ruthlessly as the returns do. Over a 40-year horizon, a 1% fee difference typically costs you between 20% and 30% of your final balance. This is why modern investment advice is so obsessed with low-cost index funds. It's not that indexing is intellectually pure or morally superior. It's that fees are a guaranteed loss and indices offer the lowest fees available. When you hear the advice \"pay attention to expense ratios,\" what's really being said is: small numbers that look trivial year-by-year become enormous over a lifetime, and fees are one of the few variables in investing you can actually control.",
      },
      {
        title: 'Key takeaways',
        content:
          "Compounding is the math engine that turns patience into wealth. The first decade produces modest results; later decades produce spectacular ones, because each year's gains are themselves earning returns. Starting early beats starting big because time is the variable you can't buy later. The rule of 72 lets you estimate doubling time in seconds. Inflation is a constant background headwind that quietly erodes cash and low-yield savings — always think in real returns, not just nominal numbers. Dollar-cost averaging removes emotion and automates discipline, which for most humans is worth more than theoretical optimization. And fees, which look trivial annually, silently steal enormous amounts of wealth over long horizons. The lessons from this course all point in the same direction: start early, keep costs low, invest regularly, think in real returns, and give the math the time it needs.",
      },
    ],
    quiz: [
      {
        question: 'Compound interest differs from simple interest because:',
        options: [
          'It requires a larger initial deposit',
          'Each period’s interest is calculated on the original principal plus all previous interest earned',
          'It is only available in retirement accounts',
          'It is calculated once per year instead of monthly',
        ],
        correctIndex: 1,
        explanation: 'Compound interest earns returns on the accumulated value, not just the original principal. This recursive effect is what makes long-term returns grow faster and faster over time.',
      },
      {
        question: 'Using the rule of 72, approximately how many years does it take money to double at a 9% annual return?',
        options: [
          '4 years',
          '8 years',
          '12 years',
          '20 years',
        ],
        correctIndex: 1,
        explanation: '72 ÷ 9 = 8 years. The rule of 72 gives a quick mental estimate of doubling time at any given rate of return.',
      },
      {
        question: 'Alice invests $5,000/year from age 25 to 34 (total $50,000) then stops. Bob invests $5,000/year from age 35 to 64 (total $150,000). Both earn 7% per year. At age 65, who likely has more?',
        options: [
          'Bob, because he invested three times as much money',
          'Alice, because her money had 10 extra years to compound',
          'They end up exactly equal',
          'It depends entirely on which stocks they picked',
        ],
        correctIndex: 1,
        explanation: 'Alice’s earlier start gives her money a decade of additional compounding, and those early years matter enormously. This is the mathematical case for starting as early as possible, even with small amounts.',
      },
      {
        question: 'Your savings account pays 2% annual interest. Inflation is 4%. What is your real return?',
        options: [
          '+6% — you’re gaining 6% per year in real terms',
          '+2% — the inflation rate is irrelevant',
          '−2% — you are actually losing purchasing power',
          '0% — they cancel out exactly',
        ],
        correctIndex: 2,
        explanation: 'Real return is approximately nominal return minus inflation. 2% − 4% = −2%. Your nominal dollars are growing but their purchasing power is shrinking.',
      },
      {
        question: 'Why do most long-term financial advisors recommend investing in stocks rather than holding cash over multi-decade periods?',
        options: [
          'Stocks are guaranteed to go up every year',
          'Stocks have historically produced returns well above inflation, growing real purchasing power',
          'Cash is illegal to hold for more than five years',
          'Stocks avoid all taxes on gains',
        ],
        correctIndex: 1,
        explanation: 'Over long horizons, stocks have historically delivered real (inflation-adjusted) returns of around 6-7%, while cash effectively loses purchasing power. This is the central case for investing over saving.',
      },
      {
        question: 'Dollar-cost averaging is best described as:',
        options: [
          'A way to guarantee buying at the lowest price every month',
          'Investing a fixed dollar amount at regular intervals, regardless of market conditions',
          'Only buying when the market is down',
          'A strategy for picking individual winning stocks',
        ],
        correctIndex: 1,
        explanation: 'DCA involves investing a fixed amount on a schedule. It removes emotional timing and smooths out the average price paid over time.',
      },
      {
        question: 'The primary behavioral benefit of dollar-cost averaging is:',
        options: [
          'It always produces higher returns than lump-sum investing',
          'It removes the need to decide when to invest, which reduces emotional mistakes',
          'It eliminates taxes on capital gains',
          'It works only in bull markets',
        ],
        correctIndex: 1,
        explanation: 'DCA’s main value is behavioral — by pre-committing to a schedule, investors avoid the emotional traps of trying to time markets. The mechanical discipline often beats clever improvisation.',
      },
      {
        question: 'Two index funds track the same index. Fund A charges 0.05% per year; Fund B charges 1% per year. Over 40 years on a $10,000 investment at 7% pre-fee returns, the fee difference costs you approximately:',
        options: [
          'Less than $1,000',
          'Around $5,000',
          'Around $45,000',
          'Around $500,000',
        ],
        correctIndex: 2,
        explanation: 'A 0.95% annual fee drag compounds to roughly $46,000 of lost wealth over 40 years on a $10,000 investment. Small fees become enormous over long horizons — this is why expense ratios matter so much.',
      },
      {
        question: 'A 25-year-old who invests $100/month is typically in a better long-term position than a 45-year-old who invests $500/month because:',
        options: [
          '$100 buys more shares than $500',
          'Young people automatically earn higher returns',
          'The younger person has vastly more time for compounding to work',
          'Markets always perform better for young investors',
        ],
        correctIndex: 2,
        explanation: 'The 25-year-old has 40 years of compounding ahead, while the 45-year-old has 20. That extra time often outweighs larger monthly contributions starting later.',
      },
      {
        question: 'A "real return" of 5% means:',
        options: [
          'The investment actually paid you $5 per month',
          'The return after adjusting for inflation — your purchasing power grew by 5%',
          'The return is guaranteed and cannot be negative',
          'The return was in dollars rather than foreign currency',
        ],
        correctIndex: 1,
        explanation: 'Real return = nominal return − inflation rate. It measures growth in actual purchasing power, which is what matters for long-term wealth building.',
      },
    ],
  },
  'stocks-basic-7': {
    sections: [
      {
        title: 'Why every investment carries risk',
        content:
          "Every investment carries some form of risk — there is no such thing as a truly safe investment. Even cash sitting in a checking account is exposed to inflation risk, which slowly erodes its purchasing power over time. A U.S. Treasury bond, which is considered the closest thing to a risk-free investment in the world, still has interest rate risk (if rates rise, the market value of your bond drops) and inflation risk (if prices rise faster than the bond's yield, your real return is negative). Stocks carry all of the above plus business risk (the company might fail), market risk (the whole market might crash), and liquidity risk (in extreme conditions, you might not be able to sell when you want to). Real estate has property-specific risks, natural disaster risks, and interest rate sensitivity. Commodities have storage costs and dramatic price swings. Cryptocurrency has all of the market risks plus regulatory risks and exchange hack risks. None of this means investing is foolish. It means that the question \"is this investment safe?\" is the wrong question. The right question is \"what kinds of risk does this investment carry, and am I being compensated enough to take them?\" A sensible investor accepts that risk is unavoidable and focuses on understanding what they're taking on and how it fits into the rest of their portfolio. The goal isn't to eliminate risk — that's impossible — but to structure your portfolio so that no single risk can do catastrophic damage.",
        keyTerms: ['risk', 'inflation risk', 'market risk', 'business risk', 'liquidity risk'],
      },
      {
        title: 'Diversification: the closest thing to a free lunch',
        content:
          "There's an old saying among economists that \"there's no such thing as a free lunch\" — meaning every benefit comes at a cost. Diversification is the one well-documented exception to that rule. It is the practice of spreading your investments across many different securities, industries, and asset classes so that no single bad outcome can wipe you out. The math behind diversification is interesting: when you combine assets whose prices don't move perfectly in sync, the volatility of the overall portfolio is lower than the weighted average volatility of the individual holdings. You get less risk for the same return, or more return for the same risk. This is the \"free lunch\" that diversification provides. Crucially, it only works if your holdings are actually uncorrelated — or at least imperfectly correlated. Owning 20 different tech stocks in 2000 did not diversify you meaningfully because they all dropped together. Owning a mix of stocks, bonds, international equity, and real estate is much more diversifying because those assets respond differently to different economic conditions. When stocks are crashing in a recession, high-quality bonds often hold their value or even rise. When inflation surprises to the upside, commodities and real estate often do better than stocks. The combinations smooth out your overall ride. The key insight: diversification isn't about owning a lot of things. It's about owning things that don't all move together for the same reasons at the same time.",
        visual: {
          type: 'diversification',
          data: {
            segments: [
              { label: 'US stocks', pct: 45 },
              { label: 'International stocks', pct: 20 },
              { label: 'US bonds', pct: 25 },
              { label: 'International bonds', pct: 5 },
              { label: 'Real estate', pct: 5 },
            ],
            centerLabel: 'Diversified',
          },
          caption: 'A simple globally-diversified portfolio mix. The goal is not to own everything — it is to own things that behave differently under different conditions.',
        },
        keyTerms: ['diversification', 'correlation', 'asset classes'],
      },
      {
        title: 'Systematic vs unsystematic risk',
        content:
          "Risk in a portfolio comes in two flavors. Unsystematic risk is risk specific to individual companies or industries — an earnings miss, a product recall, a scandal, a lawsuit, a bad CEO decision. This kind of risk can be diversified away almost entirely by owning a broad basket of stocks. If one company in your portfolio of 500 companies has a bad quarter, it barely moves the needle on your total wealth. Systematic risk, also called market risk, is risk that affects the entire market at once — recessions, financial crises, wars, pandemics, and large-scale panic. This kind of risk cannot be diversified away by holding more stocks. If the whole market drops 30%, a diversified portfolio of 500 stocks will still drop about 30%, because the drop is happening to everything at once. The practical implication is that diversification protects you from bad luck with individual companies but not from broad market downturns. To protect against systematic risk, you need to diversify across asset classes, not just across stocks — adding bonds, international exposure, real estate, and possibly some commodity exposure. This is the rationale behind the classic balanced portfolio: stocks provide long-term growth, bonds provide stability during market crashes, international exposure protects against a U.S.-specific catastrophe, and so on. No combination completely eliminates risk, but a thoughtfully diversified portfolio can significantly reduce the chance of a portfolio-destroying event.",
        keyTerms: ['systematic risk', 'unsystematic risk', 'market risk'],
      },
      {
        title: 'The risk-reward tradeoff is not a free trade',
        content:
          "A common beginner mistake is to treat risk and reward as if they were opposites — as if by taking more risk, you're automatically promised a higher return. This is not true. What's actually true is that risky investments have to offer the prospect of higher returns in order to attract any buyers at all. Nobody would buy a junk bond yielding 4% when a Treasury bond yields 4% without being compensated for the extra default risk. Nobody would own a small, volatile emerging-market stock for the same expected return as a stable, blue-chip U.S. stock. So riskier investments do tend to offer higher expected returns — but \"expected\" is the operative word. Those higher returns are not guaranteed. You can take lots of risk and still get a poor outcome, especially over short periods or in unlucky draws. The risk-reward tradeoff says that higher risk comes with higher expected returns on average, over long periods, in a probabilistic sense. It does not say that every risky investment will reward you. A useful way to think about this: a higher potential return is compensation for bearing the uncertainty of outcomes, not a guarantee of better results. If you take on significantly more risk than you're comfortable with and the bad scenario arrives, you will likely panic and sell at the worst moment, locking in losses that a more conservative investor would have avoided. Matching your risk to your actual tolerance (not your imagined tolerance) is one of the most important exercises a beginner can do.",
        visual: {
          type: 'risk-return',
          data: {
            assets: [
              { label: 'Cash', risk: 1, return: 1 },
              { label: 'Treasury bonds', risk: 2, return: 2 },
              { label: 'Corporate bonds', risk: 3, return: 4 },
              { label: 'Large-cap stocks', risk: 6, return: 7 },
              { label: 'Small-cap stocks', risk: 8, return: 8 },
              { label: 'Emerging markets', risk: 9, return: 8 },
              { label: 'Crypto / junk bonds', risk: 10, return: 8 },
            ],
          },
          caption: 'Rough positioning of asset classes on risk/return axes. The upward trend is real but imperfect — at the extremes, more risk does not necessarily mean proportionally more expected return.',
        },
        keyTerms: ['risk-reward tradeoff', 'expected return'],
      },
      {
        title: 'How much risk can you actually handle?',
        content:
          "Risk tolerance is the amount of portfolio volatility you can live with without making panic decisions. This is a personal, emotional, often uncomfortable question, and it's different from the question of how much risk your situation can theoretically support. A 30-year-old with a stable job and a 35-year time horizon can theoretically support a lot of risk — a 40% portfolio drawdown would eventually recover long before retirement. But the same 30-year-old might be emotionally unable to watch their account balance drop 40% without selling out in panic. Theoretical capacity is one thing; real human behavior is another. The best way to measure your actual risk tolerance is not to ask yourself how you'd feel about a hypothetical 40% drop — most people dramatically overestimate how calm they'd be — but to notice how you reacted during real market downturns in the past, or to start with a moderate allocation and honestly assess whether you're losing sleep at night. If you are, your allocation is too aggressive for you regardless of what any textbook says. The right risk level is the one you can actually stick with for decades. A boring 50/50 stock-bond portfolio that you hold through a 30-year career will typically beat an aggressive 100% stock portfolio that you panic out of during the first crash. The only strategy that works is the one you follow. Matching risk to tolerance means not just asking \"what should I own?\" but \"what could I actually hold during the worst moments this market might throw at me?\"",
        callout:
          'The best portfolio is not the one that looks optimal on paper — it’s the one you can actually stick with through bad markets without panic-selling.',
        keyTerms: ['risk tolerance', 'asset allocation'],
      },
      {
        title: 'Key takeaways',
        content:
          "Every investment carries risk — the question is not whether, but what kind. Diversification is the one free lunch in investing: spreading your holdings across assets that don't all move together reduces total risk without reducing expected return proportionally. Unsystematic risk (individual company problems) can be diversified away by owning many stocks. Systematic risk (broad market crashes) cannot, but can be dampened by diversifying across asset classes. The risk-reward tradeoff offers higher expected returns for higher risk on average over long horizons — but not guaranteed returns on any given day or year. And the most important part of risk management is honest self-assessment: the right risk level is the one you can actually stick with when markets are crashing, not the one that looks ideal in a spreadsheet. Risk is the price of admission to real returns, and thoughtful diversification is how you pay that price without handing over more than you can afford.",
      },
    ],
    quiz: [
      {
        question: 'The statement "cash is safe" is misleading primarily because:',
        options: [
          'Banks are frequently robbed',
          'Inflation erodes the real purchasing power of cash over time',
          'Cash is illegal above certain amounts',
          'Interest rates are always negative',
        ],
        correctIndex: 1,
        explanation: 'Cash faces inflation risk — its nominal value is stable but its purchasing power declines. Over decades, inflation can cut the real value of cash in half or more.',
      },
      {
        question: 'Diversification reduces risk most effectively when:',
        options: [
          'You own many investments that all move up and down together',
          'You own investments that respond differently to different economic conditions',
          'You own only the largest stocks in each sector',
          'You hold only cash',
        ],
        correctIndex: 1,
        explanation: 'The magic of diversification comes from combining assets that aren’t perfectly correlated. Owning 50 tech stocks is less diversified than owning 10 stocks across 10 different sectors.',
      },
      {
        question: 'Unsystematic risk is:',
        options: [
          'Risk to the entire market from recessions or crises',
          'Risk specific to individual companies or industries, which diversification can reduce',
          'Risk that only affects bond investors',
          'Risk that cannot ever be measured',
        ],
        correctIndex: 1,
        explanation: 'Unsystematic (or idiosyncratic) risk is company-specific — an earnings miss, a scandal, a product failure. Owning many stocks averages these risks out.',
      },
      {
        question: 'Systematic risk cannot be diversified away by owning more stocks because:',
        options: [
          'It only affects small companies',
          'It affects the entire market at once, so every stock is exposed to it',
          'It is illegal to diversify against it',
          'It doesn’t actually exist',
        ],
        correctIndex: 1,
        explanation: 'Systematic risk — market-wide events like recessions or crashes — hits all stocks simultaneously. To protect against it, you need to diversify across asset classes (bonds, international, etc.), not just across individual stocks.',
      },
      {
        question: 'The risk-reward tradeoff says that:',
        options: [
          'Riskier investments always produce higher returns',
          'Riskier investments offer higher expected returns on average over long periods, but no guarantee on any specific outcome',
          'Risk and reward are unrelated',
          'You can eliminate risk entirely with enough diversification',
        ],
        correctIndex: 1,
        explanation: 'Higher risk demands compensation in the form of higher expected return on average, but "expected" does not mean "guaranteed." Bad outcomes still happen, even over long horizons.',
      },
      {
        question: 'A portfolio of 50 technology stocks is:',
        options: [
          'Fully diversified because it owns 50 different companies',
          'Still concentrated in a single industry and vulnerable to sector-wide downturns',
          'The safest possible portfolio',
          'Not allowed for retail investors',
        ],
        correctIndex: 1,
        explanation: 'Concentration in one sector means correlated exposures. If the tech sector falls 30%, nearly all 50 stocks will fall together. True diversification requires cross-industry exposure.',
      },
      {
        question: 'What is the best way to actually measure your own risk tolerance?',
        options: [
          'Fill out a questionnaire on a financial website',
          'Observe how you reacted during real past market downturns, or notice whether a moderate allocation lets you sleep at night',
          'Ask a friend what they do',
          'Copy whatever Warren Buffett does',
        ],
        correctIndex: 1,
        explanation: 'Theoretical capacity is easy to overestimate. Real past behavior and present emotional reaction are the only reliable signals for how you’ll act in the next crash.',
      },
      {
        question: 'In a financial crisis where stocks drop 40%, a well-diversified stock-heavy portfolio will most likely:',
        options: [
          'Be unaffected — diversification eliminates all drops',
          'Drop significantly, since diversification within stocks doesn’t protect against systematic risk',
          'Rise because diversification reverses losses',
          'Become illegal to sell',
        ],
        correctIndex: 1,
        explanation: 'Stock diversification protects against individual company failures but not against broad market downturns. A crisis that pushes all stocks down will push a diversified stock portfolio down roughly in proportion.',
      },
      {
        question: 'A young investor with a 30-year horizon tells you they cannot emotionally handle watching their portfolio drop 30%. What’s the right conclusion?',
        options: [
          'They should hold 100% stocks anyway because of their long time horizon',
          'Their emotional risk tolerance is lower than their theoretical capacity, and their allocation should reflect what they can actually stick with',
          'They should stay out of markets entirely',
          'They are not ready to invest at any age',
        ],
        correctIndex: 1,
        explanation: 'The best portfolio is one the investor can actually hold through bad markets. Matching risk to real emotional tolerance (not textbook capacity) prevents panic-selling at the worst moments.',
      },
      {
        question: 'The statement "diversification is a free lunch" means:',
        options: [
          'Diversification requires no effort',
          'Combining uncorrelated assets can reduce portfolio risk without proportionally reducing expected return',
          'You can eat for free at diversified funds',
          'Diversification eliminates all risk at no cost',
        ],
        correctIndex: 1,
        explanation: 'The "free lunch" phrase captures the fact that uncorrelated diversification reduces volatility more than it reduces expected return — a mathematically proven benefit with no equivalent cost.',
      },
    ],
  },
  'stocks-basic-8': {
    sections: [
      {
        title: 'The financial press as entertainment',
        content:
          "When you turn on a financial news channel, open a market website, or scroll through investing content on social media, you are not primarily consuming information. You are primarily consuming entertainment dressed up as information. This is not a cynical or conspiratorial claim — it follows directly from the business model of financial media. These outlets generate revenue through advertising, subscriptions, and clicks, all of which depend on keeping an audience glued to the screen. Keeping an audience glued requires drama: urgent-sounding headlines, breathless coverage of minor market moves, confident predictions that rarely pan out, interviews with people who sound like they know something, and a constant drumbeat of \"now is a pivotal moment.\" Markets are actually boring most of the time — they grind slowly upward over decades — and a media ecosystem that told you \"nothing interesting happened today, just keep doing what you were doing\" would go out of business within a month. So instead the ecosystem manufactures drama. A routine 1% market move becomes \"stocks plunge\" or \"stocks soar.\" A routine interest rate comment becomes \"breaking news\" with red banners. A company's earnings result becomes a \"miss\" or a \"beat\" regardless of whether it matters over any horizon longer than a day. A patient investor learns to recognize this pattern and step back from it. The frantic tone is almost never correlated with what you should actually do, which is almost always: nothing.",
        keyTerms: ['financial media', 'business model', 'attention economy'],
      },
      {
        title: 'The difference between signal and noise',
        content:
          "In signal-processing terms, a \"signal\" is the useful pattern in a stream of data, and \"noise\" is the random variation surrounding it. Financial markets produce vastly more noise than signal. The noise consists of daily price fluctuations, analyst upgrades and downgrades, rumors, political soundbites, short-term trader positioning, and the endless river of media commentary trying to explain the day's moves after the fact. The signal is much smaller: the slow accumulation of company earnings, the gradual growth of the underlying economy, the long-term demographic and technological trends that shape industries, and the compounding of dividends and reinvested returns over many years. A useful rule of thumb: the shorter the timeframe you're looking at, the more noise and less signal you're seeing. A one-minute chart is almost pure noise. A one-day chart is mostly noise with a tiny bit of signal. A one-year chart has a clearer signal but still substantial noise. A ten-year chart starts to show the actual long-term direction of a company or market, with noise mostly averaged out. This is why short-term trading is so much harder than long-term investing: traders are trying to extract meaning from a stream that is mostly meaningless. Long-term investors, by contrast, can simply wait for the noise to cancel itself out and let the signal accumulate. The discipline is in learning to ignore the daily and weekly commotion and only pay attention to the events that matter on the timescales you actually care about.",
        visual: {
          type: 'comparison-table',
          data: {
            columns: [
              { label: 'Signal (meaningful)', color: '#10b981' },
              { label: 'Noise (not meaningful)', color: '#ef4444' },
            ],
            rows: [
              { attribute: 'Multi-year earnings trends', values: ['Yes — reflects real business performance', ''] },
              { attribute: 'One-day price moves', values: ['', 'Yes — random short-term fluctuation'] },
              { attribute: 'Long-term demographic shifts', values: ['Yes — changes industries over decades', ''] },
              { attribute: 'Analyst price targets', values: ['', 'Yes — frequently wrong, rarely actionable'] },
              { attribute: 'Company fundamentals over years', values: ['Yes — the actual underlying business', ''] },
              { attribute: 'Social media stock tips', values: ['', 'Yes — almost always noise or worse'] },
              { attribute: 'Policy/regulatory changes', values: ['Sometimes — depends on durability', 'Sometimes'] },
            ],
          },
          caption: 'Learning to sort signal from noise is one of the most valuable skills an investor can develop. Most of what fills a financial news feed is noise.',
        },
        keyTerms: ['signal', 'noise', 'time horizon'],
      },
      {
        title: 'Why predictions are mostly worthless',
        content:
          "Financial media is saturated with confident predictions — where the market will be in three months, which stock will triple, when the next recession will hit, which sector will lead next year. The evidence on the accuracy of these predictions, collected over decades of research, is damning: the average professional forecaster is not meaningfully better than a coin flip for short-term predictions, and even long-term predictions tend to cluster around whatever has happened recently rather than reflect genuine foresight. This is not because forecasters are stupid or dishonest. Most are reasonably intelligent people doing their best. The problem is that markets aggregate the views of millions of participants in real time, and by the time any single forecaster has an insight worth acting on, the market has already priced it in. To consistently beat the market requires not just being right, but being right in ways and at times that nobody else has yet figured out — a standard very few people can reliably meet. The practical takeaway is that a beginner should treat confident predictions in financial media with deep skepticism, regardless of how credentialed the person making them is. Economists predicting recessions, analysts predicting earnings, pundits predicting crashes — none have a track record that would justify changing your long-term strategy based on what they say. Keep a mental file of predictions you hear this year, revisit it in a year, and you'll probably notice that roughly half were wrong and that even the right ones were mostly lucky. The best investors learn to say \"I don't know\" and build portfolios robust to many possible futures rather than betting on any single forecast.",
        callout:
          'Forecasters are usually wrong and almost never consistently right. Build portfolios that survive many possible futures, not ones that bet on a single prediction.',
        keyTerms: ['forecasting', 'market prediction', 'hindsight bias'],
      },
      {
        title: 'The emotional cycle of investing',
        content:
          "Markets don't just move based on news and earnings — they also move because of the collective emotional state of millions of investors, which tends to swing between extremes. A well-documented pattern shows investors becoming most optimistic near market tops, piling into stocks after they've already risen significantly, and most pessimistic near market bottoms, selling after they've already fallen significantly. Buying high and selling low is the exact opposite of what makes money, but it's what the average investor does on average, because fear and greed are more persuasive than patience. Media coverage tends to reinforce this cycle. When markets are hot, financial shows are full of euphoric predictions and stories of people getting rich quickly. New investors pour in, convinced they've finally figured it out. When markets crash, the coverage flips to apocalyptic warnings about the end of wealth as we know it, and those same new investors sell in panic. A patient long-term investor learns to do the opposite of whatever the emotional crowd is doing — or, more realistically, learns to ignore the crowd entirely and stick to a pre-committed plan. The tools for doing this are boring but effective: automated contributions to diversified funds on a fixed schedule, a predetermined rebalancing rule that forces you to sell winners and buy losers periodically, and a conscious discipline of turning off the financial news during market extremes. A useful mental habit is to notice when you're feeling especially confident or especially frightened about markets, and treat that feeling as a warning sign that you might be about to do something emotional rather than analytical.",
        visual: {
          type: 'timeline',
          data: {
            events: [
              { year: 'Boom', label: 'Euphoria, buy high' },
              { year: 'Peak', label: 'Confidence maxed' },
              { year: 'Drop', label: 'Denial, hold' },
              { year: 'Crash', label: 'Panic, sell low' },
              { year: 'Bottom', label: 'Despair, capitulate' },
              { year: 'Recovery', label: 'Skepticism returns' },
              { year: 'New high', label: 'Greed returns' },
            ],
          },
          caption: 'The emotional cycle most investors go through — and the one that destroys returns. The antidote is mechanical discipline rather than emotional response.',
        },
        keyTerms: ['emotional cycle', 'fear and greed', 'rebalancing'],
      },
      {
        title: 'A simple media diet',
        content:
          "You don't have to consume zero financial media to be a good investor — you just have to consume it intentionally. A few practical rules of thumb: first, prefer sources that focus on long-term fundamentals over short-term price action. Quarterly earnings reports from companies you actually own are more useful than daily market commentary. Second, prefer writers or analysts with published track records you can verify, rather than voices that sound confident but have no record of accountability. Third, when you see a dramatic prediction, ask yourself what would have to be true for the prediction to pay off and whether that's something you can verify independently. Most predictions don't survive that test. Fourth, limit your exposure to news during market extremes — when things are crashing or soaring is exactly when emotionally driven coverage is most misleading. Fifth, treat any piece of financial advice that pressures you to \"act now\" with maximum skepticism; genuine long-term investment opportunities rarely depend on reacting within a few hours. Finally, read financial history. Books about past bubbles, crashes, manias, and recoveries are far more educational than the current day's coverage, because they let you see the full arc of how these stories end rather than catching them mid-drama. A patient investor reading books about 1929, 1987, 2000, and 2008 will be better prepared for the next crash than someone glued to real-time news feeds during the crash itself.",
        keyTerms: ['media diet', 'long-term focus'],
      },
      {
        title: 'Key takeaways',
        content:
          "Financial media is structured to hold attention, not to help you invest. Most of what you see is noise rather than signal, and the ratio of noise to signal gets worse as the timeframe gets shorter. Confident predictions from forecasters have a poor track record — they are not reliable enough to change your long-term strategy on. The emotional cycle of markets leads most investors to buy high and sell low, and the antidote is mechanical discipline rather than trying to be emotionally stoic. A minimal, intentional media diet — preferring fundamentals over commentary, limiting exposure during extremes, and reading financial history — is better than either total media avoidance or constant consumption. The best investors are boring. They tune out the noise, stick to their plan, and let compounding do the work.",
      },
    ],
    quiz: [
      {
        question: 'Financial media outlets primarily serve:',
        options: [
          'The public interest, by informing investors accurately',
          'An attention-driven business model that rewards drama over calm accuracy',
          'The government, as required by law',
          'Individual stockbrokers who provide their content',
        ],
        correctIndex: 1,
        explanation: 'Financial media is mostly funded by ads and subscriptions tied to attention. Dramatic coverage keeps viewers watching; calm accurate coverage doesn’t, so the incentives push toward drama.',
      },
      {
        question: 'In financial markets, the ratio of noise to signal tends to:',
        options: [
          'Be constant across timeframes',
          'Get worse as the timeframe gets shorter',
          'Get better as you watch more news',
          'Only apply to bond markets',
        ],
        correctIndex: 1,
        explanation: 'One-day price movements are nearly all noise. Multi-year trends are mostly signal. Short timeframes give you more random variation and less meaningful information.',
      },
      {
        question: 'A thoughtful investor should treat confident short-term market predictions with:',
        options: [
          'Deep skepticism regardless of the forecaster’s credentials',
          'Automatic acceptance if the person is on TV',
          'Immediate action to implement their recommendation',
          'Indifference — predictions are harmless',
        ],
        correctIndex: 0,
        explanation: 'Decades of research show that short-term forecasts have poor accuracy regardless of credentials. Even well-credentialed forecasters do not consistently beat a coin flip over short horizons.',
      },
      {
        question: 'The typical emotional cycle of investing leads most amateur investors to:',
        options: [
          'Buy low and sell high',
          'Buy high (during euphoria) and sell low (during panic)',
          'Never buy or sell anything',
          'Only trade in bear markets',
        ],
        correctIndex: 1,
        explanation: 'Fear and greed drive most investors to do the opposite of what makes money. Piling in at tops and selling at bottoms is a well-documented behavioral failure.',
      },
      {
        question: 'Which of these is most likely to be signal rather than noise?',
        options: [
          'A 1% move in the S&P 500 on a random Tuesday',
          'An analyst’s 12-month price target for a single stock',
          'Multi-year trends in a company’s revenue and earnings',
          'Intraday social media chatter about a stock',
        ],
        correctIndex: 2,
        explanation: 'Multi-year fundamental trends reflect real business performance. Daily moves, price targets, and social chatter are almost entirely noise.',
      },
      {
        question: 'The best antidote to the emotional cycle of investing is:',
        options: [
          'Watching more financial news so you’re always informed',
          'Trying harder to stay calm through force of will',
          'Mechanical discipline — automated contributions, pre-set rebalancing, and a written plan you stick to',
          'Only trading on weekends when markets are closed',
        ],
        correctIndex: 2,
        explanation: 'Emotional discipline through willpower fails for most people. Pre-committed mechanical rules remove the need to decide in the heat of the moment and defeat most behavioral errors.',
      },
      {
        question: 'A headline reads "Market Plunges on Fed Comments." A patient long-term investor should:',
        options: [
          'Sell immediately to avoid further losses',
          'Ignore the headline and continue their long-term plan',
          'Double their position in the most volatile stocks',
          'Call their broker to ask what to do',
        ],
        correctIndex: 1,
        explanation: 'Dramatic headlines describe noise, not signal. A long-term plan is not improved by reacting to one day’s news. The best action is almost always inaction.',
      },
      {
        question: 'The phrase "the market has already priced it in" means:',
        options: [
          'The government has set the price of the stock',
          'The information you’re considering is already reflected in the current price, so acting on it offers no edge',
          'Commissions have been added to the price',
          'The stock has reached its ceiling',
        ],
        correctIndex: 1,
        explanation: 'Markets aggregate millions of participants’ views in real time. By the time news is public, the price usually already reflects it, which is why acting on widely known information rarely produces excess returns.',
      },
      {
        question: 'Which of the following is the most useful thing a beginner can do to improve their investing judgment?',
        options: [
          'Watch CNBC all day to stay informed',
          'Read books about historical market bubbles, crashes, and recoveries',
          'Subscribe to as many stock tip services as possible',
          'Follow hot stock influencers on social media',
        ],
        correctIndex: 1,
        explanation: 'Reading financial history gives you the full arc of past manias and crashes, which is far more educational than real-time coverage of the current cycle. Historical perspective is one of the most underrated investing skills.',
      },
      {
        question: 'When you notice yourself feeling especially confident or especially frightened about markets, that emotion should be treated as:',
        options: [
          'A strong signal to act immediately',
          'A warning sign that you might be about to make an emotional rather than analytical decision',
          'Proof that your instincts are correct',
          'Irrelevant to investing',
        ],
        correctIndex: 1,
        explanation: 'Strong emotional reactions are usually a sign that the crowd is at an extreme, which is historically the worst time to act on instinct. Noticing the emotion is the first step to not being ruled by it.',
      },
    ],
  },
};

const COURSE_CONTENT = { ...STOCKS_BRONZE, ...BRONZE_REST, ...CRYPTO_BRONZE };

export default COURSE_CONTENT;
