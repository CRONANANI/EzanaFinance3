/**
 * Real course content keyed by course id from learning-curriculum.js.
 * Shape matches buildPlaceholderContent:
 *   { sections: [{ title, content, keyTerms?, callout? }], quiz: [...] }
 *
 * Bronze stocks (stocks-basic-1..8) draw on themes from Graham & Zweig,
 * The Intelligent Investor, and Mayo, Basic Finance (11th ed.) — paraphrased for education.
 *
 * Bronze crypto (crypto-basic-1..8): Edelman, The Truth About Crypto (2022);
 * Leinweber, Willig & Schoenfeld, Mastering Crypto Assets (2023) — see course-content-crypto-bronze.js.
 */

import BRONZE_REST from './course-content-bronze-rest';
import CRYPTO_BRONZE from './course-content-crypto-bronze';

const STOCKS_BRONZE = {
  'stocks-basic-1': {
    sections: [
      {
        title: 'What an exchange actually is',
        content:
          'A stock exchange is an organized marketplace where buyers and sellers of ownership shares in public companies meet to transact at prices set by their bids and offers. Mayo describes the modern exchange less as a physical floor than as a regulated electronic network — most U.S. equity volume now executes through computer matching engines operated by NYSE, Nasdaq, and a growing list of alternative trading systems. The exchange itself does not own the shares being traded; it simply provides the venue, the rules, and the price-discovery mechanism.',
        keyTerms: ['exchange', 'bid', 'ask', 'liquidity'],
      },
      {
        title: 'Buyers, sellers, and price discovery',
        content:
          'At any moment a stock has a highest bid (the most a buyer is willing to pay) and a lowest ask (the least a seller is willing to accept). The gap between them is the spread. When a buyer accepts the ask or a seller hits the bid, a trade prints and the price moves. This continuous auction is how markets discover what a share is worth right now — not through any single authority, but through the aggregated decisions of every participant.',
        callout:
          'Graham\'s Mr. Market parable: imagine a manic-depressive partner who shows up daily quoting wildly different prices for the same business. You are free to trade with him or ignore him.',
      },
      {
        title: 'Market hours and after-hours',
        content:
          'U.S. exchanges open at 9:30 a.m. and close at 4:00 p.m. Eastern. Pre-market and after-hours sessions exist but trade with thinner liquidity and wider spreads, which means a small order can move the price more than during regular hours. Mayo emphasizes that the official closing price is the reference point most data vendors and index providers use, which is why so much trading volume clusters in the final minutes of the session.',
      },
    ],
    quiz: [
      {
        question: 'What does the bid-ask spread represent?',
        options: [
          'The fee an exchange charges per trade',
          'The difference between the highest price a buyer will pay and the lowest price a seller will accept',
          'The dividend yield of a stock',
          'The total daily volume of a stock',
        ],
        correctIndex: 1,
        explanation: 'The spread is the gap between the best bid and the best ask. Tight spreads usually indicate a liquid market.',
      },
      {
        question: 'Who sets the price of a stock during the trading day?',
        options: [
          'The exchange',
          'The company that issued the stock',
          'The continuous interaction of all buyers and sellers',
          'The Securities and Exchange Commission',
        ],
        correctIndex: 2,
        explanation: 'Prices are discovered through bids and offers from market participants. The exchange only provides the venue and rules.',
      },
      {
        question: 'In Graham\'s "Mr. Market" parable, the lesson is that you should:',
        options: [
          'Always trade at the price Mr. Market quotes',
          'Treat his daily prices as opportunities, not commands',
          'Avoid the market entirely',
          'Trade more often when he is excited',
        ],
        correctIndex: 1,
        explanation: 'Graham urges using Mr. Market\'s mood swings to your advantage rather than letting them dictate your decisions.',
      },
      {
        question: 'Why does after-hours trading typically have wider spreads?',
        options: [
          'Exchanges add a surcharge after 4 p.m.',
          'There are fewer buyers and sellers, so liquidity is thinner',
          'The SEC requires it',
          'Stocks are worth less after hours',
        ],
        correctIndex: 1,
        explanation: 'Lower participation means less depth on each side of the order book, which widens spreads.',
      },
      {
        question: 'What is the official "closing price" of a stock used for?',
        options: [
          'Setting the next day\'s opening price exactly',
          'Index calculations, mark-to-market, and most data vendor reference points',
          'Determining the company\'s tax liability',
          'Nothing — it is purely symbolic',
        ],
        correctIndex: 1,
        explanation: 'Closing prices anchor index values, fund NAVs, and most published performance figures.',
      },
    ],
  },

  'stocks-basic-2': {
    sections: [
      {
        title: 'Stocks: ownership in a business',
        content:
          'A share of stock is a fractional ownership claim on a company\'s assets and earnings. Graham\'s central insight in The Intelligent Investor is that an investor who buys a stock is buying part of a real business, not a flickering ticker symbol — and the long-run return of that share is tied to the long-run economics of that business. Common shareholders sit at the bottom of the capital structure, which means they are paid only after creditors and preferred holders, but they capture the unlimited upside if the business thrives.',
        keyTerms: ['equity', 'common stock', 'residual claim'],
      },
      {
        title: 'Bonds: lending money for interest',
        content:
          'A bond is a loan. The bondholder lends a fixed principal to the issuer (a company, a government, a municipality) in exchange for periodic interest payments and return of the principal at maturity. Mayo distinguishes bonds from stocks along three axes: bonds have a defined maturity date, bonds have a contractually fixed coupon, and bondholders are creditors with priority over equity holders if the issuer goes bankrupt. The trade-off is upside: a bond\'s best case is being paid in full, while a stock\'s best case is unlimited growth.',
      },
      {
        title: 'ETFs: a basket in one ticker',
        content:
          'An exchange-traded fund holds a portfolio of underlying assets — often stocks tracking an index, sometimes bonds or commodities — and trades on an exchange like a single stock. ETFs give a small investor instant diversification and (in the case of broad index ETFs) very low fees. Graham would have approved of low-cost index funds for the "defensive investor" who lacks time or temperament for individual security analysis, and Zweig\'s commentary in the revised edition makes that connection explicit.',
        callout:
          'Graham\'s defensive investor: "The defensive investor must confine himself to the shares of important companies with a long record of profitable operations and in strong financial condition." For most people today, an index ETF satisfies this rule by construction.',
      },
    ],
    quiz: [
      {
        question: 'A common shareholder\'s claim on a company is best described as:',
        options: [
          'A fixed-income loan',
          'A residual ownership claim, paid after creditors',
          'A guarantee of a percentage of profits',
          'A tax credit',
        ],
        correctIndex: 1,
        explanation: 'Shareholders own what is left after creditors and preferred holders are paid — the residual.',
      },
      {
        question: 'What is the primary difference between a bond and a stock?',
        options: [
          'Bonds are riskier than stocks',
          'Bonds represent debt with fixed payments and a maturity date; stocks represent ownership',
          'Stocks pay interest; bonds pay dividends',
          'Bonds always outperform stocks',
        ],
        correctIndex: 1,
        explanation: 'Bonds are loans with contractual terms; stocks are equity with no maturity and no fixed payment.',
      },
      {
        question: 'An ETF tracking the S&P 500 gives an investor:',
        options: [
          'A single stock pick from the index',
          'Exposure to all 500 component stocks in one transaction',
          'A guaranteed 10% annual return',
          'Voting rights on every company',
        ],
        correctIndex: 1,
        explanation: 'A broad index ETF holds (or replicates) every component, giving instant diversification.',
      },
      {
        question: 'Why does Graham recommend index funds for the "defensive investor"?',
        options: [
          'They guarantee profits',
          'They provide broad diversification with low cost and minimal time commitment',
          'They are exempt from taxes',
          'They always beat actively managed funds in any single year',
        ],
        correctIndex: 1,
        explanation: 'The defensive investor wants low effort and broad exposure — exactly what an index fund provides.',
      },
      {
        question: 'In a corporate bankruptcy, who gets paid first?',
        options: [
          'Common shareholders',
          'Preferred shareholders',
          'Bondholders and other creditors',
          'The CEO',
        ],
        correctIndex: 2,
        explanation: 'Creditors (including bondholders) are senior to all equity holders in bankruptcy.',
      },
    ],
  },

  'stocks-basic-3': {
    sections: [
      {
        title: 'Anatomy of a stock quote',
        content:
          'A stock quote bundles several pieces of real-time information: the ticker symbol (a short alphabetic identifier — AAPL for Apple), the last trade price, the bid and ask, the volume traded so far today, the day\'s high and low, the 52-week range, and the market capitalization. Mayo emphasizes that no single number on a quote screen tells you whether a stock is "cheap" or "expensive" — that requires comparing the price to the underlying business fundamentals, which Graham covers extensively in his chapters on intrinsic value.',
        keyTerms: ['ticker', 'volume', 'market cap', '52-week range'],
      },
      {
        title: 'What market capitalization actually measures',
        content:
          'Market capitalization is share price multiplied by shares outstanding. It is the market\'s current verdict on the total equity value of the business. A $50 stock with 2 billion shares outstanding has the same market cap ($100 billion) as a $200 stock with 500 million shares — share price alone tells you nothing about company size. Graham warns repeatedly that investors who focus on the per-share price in isolation often confuse a "low-priced" stock with a "cheap" stock; the two are unrelated.',
      },
      {
        title: 'Volume tells you about conviction',
        content:
          'Daily volume is the number of shares that have changed hands. High volume on a price move suggests broad participation and conviction; low volume on a move suggests it could be noise from a few large orders. This is why news of a major event often shows up first as a volume spike. Mayo notes that volume also matters for liquidity: thinly traded stocks can be hard to exit without moving the price against you, especially in a hurry.',
      },
    ],
    quiz: [
      {
        question: 'Which of these tells you the total equity value the market assigns to a company?',
        options: [
          'The share price',
          'The 52-week high',
          'Market capitalization (price × shares outstanding)',
          'Daily volume',
        ],
        correctIndex: 2,
        explanation: 'Market cap is the only one that incorporates both price and the number of shares.',
      },
      {
        question: 'A $5 stock and a $500 stock with the same market cap have:',
        options: [
          'Different valuations',
          'The same total equity value — share price alone is meaningless without shares outstanding',
          'Different earnings',
          'Different bond ratings',
        ],
        correctIndex: 1,
        explanation: 'Per-share price tells you nothing about size; only market cap does.',
      },
      {
        question: 'A high daily volume on a sharp price move usually indicates:',
        options: [
          'A pricing error',
          'Broad participation and conviction behind the move',
          'That the stock will reverse tomorrow',
          'That trading is closed',
        ],
        correctIndex: 1,
        explanation: 'Volume is a measure of how many participants endorsed the move with real money.',
      },
      {
        question: 'Why does Graham caution against equating "low-priced" with "cheap"?',
        options: [
          'Low-priced stocks pay no dividends',
          'A stock\'s price tells you nothing about whether it is undervalued — only the relationship between price and underlying business value does',
          'Cheap stocks always go to zero',
          'Brokers charge more for cheap stocks',
        ],
        correctIndex: 1,
        explanation: 'Price relative to intrinsic value is what matters, not the dollar amount per share.',
      },
      {
        question: 'A stock\'s 52-week range tells you:',
        options: [
          'Its future price',
          'The highest and lowest prices it has traded at over the past year',
          'Its dividend yield',
          'Its market cap',
        ],
        correctIndex: 1,
        explanation: 'The 52-week range is purely historical and bounds the past year of trading.',
      },
    ],
  },

  'stocks-basic-4': {
    sections: [
      {
        title: 'What an index measures',
        content:
          'A market index is a statistical summary of a basket of stocks intended to represent a market or segment. The S&P 500 tracks 500 large U.S. companies weighted by market cap; the Dow Jones Industrial Average tracks 30 large U.S. companies weighted by share price (an artifact of its 1896 origin); the Nasdaq Composite tracks essentially every stock listed on Nasdaq and skews heavily toward technology. Mayo stresses that an index is not the market — it is a model of the market chosen by its creator.',
      },
      {
        title: 'Cap-weighted vs price-weighted',
        content:
          'In a cap-weighted index like the S&P 500, larger companies move the index more. In a price-weighted index like the Dow, higher-priced stocks move the index more — regardless of company size. This is why a small move in a $400 stock can swing the Dow more than a large move in a $40 stock from a much bigger company. Graham himself was suspicious of price-weighted indices for exactly this reason.',
      },
      {
        title: 'Why indices matter to ordinary investors',
        content:
          'Indices serve three jobs: as benchmarks (am I beating "the market"?), as the basis for index funds and ETFs (which let you own the whole basket cheaply), and as economic signals that journalists and policymakers use as shorthand for market conditions. Graham\'s endorsement of broad index funds for defensive investors is grounded in the first two of those uses.',
      },
    ],
    quiz: [
      {
        question: 'The S&P 500 is weighted by:',
        options: ['Share price', 'Market capitalization', 'Dividend yield', 'Alphabetical order'],
        correctIndex: 1,
        explanation: 'S&P 500 components are weighted by market cap, so larger companies have more influence.',
      },
      {
        question: 'The Dow Jones Industrial Average is weighted by:',
        options: ['Market cap', 'Share price', 'Revenue', 'Number of employees'],
        correctIndex: 1,
        explanation: 'The Dow is price-weighted — an artifact of its 1896 design.',
      },
      {
        question: 'Which index is most concentrated in technology?',
        options: ['Dow Jones Industrial Average', 'S&P 500', 'Nasdaq Composite', 'Russell 2000'],
        correctIndex: 2,
        explanation: 'The Nasdaq Composite skews heavily toward tech because of where those companies historically listed.',
      },
      {
        question: 'What is the main use of an index for an individual investor?',
        options: [
          'As a guarantee of returns',
          'As a benchmark and the basis for low-cost index funds',
          'As a tax deduction',
          'As a substitute for research',
        ],
        correctIndex: 1,
        explanation: 'Indices let you measure performance and own a slice of the market via index funds.',
      },
      {
        question: 'Why does a $400 stock move the Dow more than a $40 stock?',
        options: [
          'Because it has higher earnings',
          'Because the Dow is price-weighted, so dollar moves drive the index',
          'Because of SEC rules',
          'Because of higher volume',
        ],
        correctIndex: 1,
        explanation: 'In a price-weighted index, the absolute dollar change in the share price is what matters.',
      },
    ],
  },

  'stocks-basic-5': {
    sections: [
      {
        title: 'Opening a brokerage account',
        content:
          'A brokerage is the intermediary that gives you access to the exchanges. Mayo walks through the modern landscape: full-service brokers (research and advice, higher fees), discount brokers (cheap or zero-commission trading, no advice), and robo-advisors (algorithmic portfolios). To open an account you\'ll provide identification, link a bank account, and answer suitability questions about your experience and risk tolerance. Funds typically settle in one to two business days.',
      },
      {
        title: 'Market orders vs limit orders',
        content:
          'A market order says "buy or sell at whatever price the market is offering right now." It executes almost immediately but you give up control of the price — risky on thinly traded stocks or in volatile moments. A limit order says "buy at this price or lower" or "sell at this price or higher." It controls price but may not fill if the market never reaches your level. Graham strongly favored limit orders for the careful investor: "the patient investor sets his own price."',
      },
      {
        title: 'Fractional shares',
        content:
          'Many modern brokers now allow purchases of fractional shares — you can buy $50 of Berkshire Hathaway even though one full share costs hundreds of thousands. This dissolves the old barrier where high-priced stocks were inaccessible to small investors and lets you build a diversified portfolio with very little capital. The economic ownership is the same as a whole share, scaled proportionally.',
      },
    ],
    quiz: [
      {
        question: 'A market order executes:',
        options: ['Only at the closing price', 'At whatever price the market is currently offering', 'Only during pre-market hours', 'Never on Fridays'],
        correctIndex: 1,
        explanation: 'Market orders trade speed for price control — they fill immediately at the prevailing price.',
      },
      {
        question: 'A limit order to buy at $50 will fill:',
        options: ['At $50 or lower', 'At $50 or higher', 'Only at exactly $50', 'Never'],
        correctIndex: 0,
        explanation: 'A buy limit order sets a maximum price you are willing to pay.',
      },
      {
        question: 'Why did Graham favor limit orders?',
        options: [
          'They have lower commissions',
          'They give the investor control over the price paid, supporting disciplined entry',
          'They are required by the SEC',
          'They guarantee fills',
        ],
        correctIndex: 1,
        explanation: 'Graham emphasized patience and price discipline — limit orders enforce both.',
      },
      {
        question: 'Fractional shares allow you to:',
        options: [
          'Vote multiple times',
          'Own less than one full share, scaled proportionally to your dollars',
          'Avoid taxes',
          'Trade only during pre-market',
        ],
        correctIndex: 1,
        explanation: 'Fractional shares give proportional economic ownership in any dollar amount.',
      },
      {
        question: 'What is the main trade-off of a discount broker vs a full-service broker?',
        options: [
          'Lower fees in exchange for less personalized advice and research',
          'Higher safety',
          'More tax deductions',
          'Faster execution only',
        ],
        correctIndex: 0,
        explanation: 'You save money but get fewer advisory services — Mayo notes this is the right trade-off for most self-directed investors.',
      },
    ],
  },

  'stocks-basic-6': {
    sections: [
      {
        title: 'The arithmetic of compounding',
        content:
          'If you invest $1,000 at 8% annual return and reinvest the gains, after one year you have $1,080. After two years, you have $1,166.40 — not $1,160 — because the second year\'s 8% applied to the larger balance. After 30 years you have $10,062. Mayo presents this as the single most important number in personal finance: the ratio of the final balance to the initial investment grows exponentially, not linearly, with time. Graham puts it more bluntly: time is the friend of the wonderful business.',
      },
      {
        title: 'Why starting early dwarfs starting big',
        content:
          'A 25-year-old who invests $200/month for 10 years and then stops will, by age 65, end up with more than a 35-year-old who invests $200/month every single month until age 65 — assuming the same 8% return. The early money compounded for longer. This is why both Graham and Mayo treat consistent early saving as more important than picking great stocks.',
      },
      {
        title: 'Inflation eats some of your return',
        content:
          'Compound returns are nominal — they ignore inflation. If your portfolio earns 8% per year and inflation runs 3%, your real return is roughly 5%. Graham devotes an entire chapter to inflation and emphasizes that the long-run real return on stocks is what matters for purchasing power, not the headline number. Always think in real terms when planning for the long run.',
        callout:
          'Graham\'s rule of thumb: the long-run real return on a diversified stock portfolio has been roughly 6-7% per year — meaningfully positive but not the 10% the headlines suggest.',
      },
    ],
    quiz: [
      {
        question: 'Compounding makes returns grow:',
        options: ['Linearly with time', 'Exponentially with time', 'Only when the market is up', 'Only in tax-free accounts'],
        correctIndex: 1,
        explanation: 'Each period\'s return applies to a larger base, producing exponential growth.',
      },
      {
        question: 'Why does starting to invest at 25 vs 35 matter so much?',
        options: [
          'Stocks pay higher dividends to younger investors',
          'The extra decade gives compounding more time to work',
          'Brokers charge less to younger investors',
          'Younger investors get tax breaks',
        ],
        correctIndex: 1,
        explanation: 'Time is the most powerful variable in compound growth.',
      },
      {
        question: 'If a portfolio earns 8% nominally and inflation is 3%, the real return is approximately:',
        options: ['11%', '5%', '3%', '8%'],
        correctIndex: 1,
        explanation: 'Real return ≈ nominal return minus inflation, so 8% − 3% ≈ 5%.',
      },
      {
        question: 'According to Graham, why is "real" return the right way to think about long-run investing?',
        options: [
          'Because it ignores fees',
          'Because it measures purchasing power, not just dollar count',
          'Because the IRS requires it',
          'Because nominal returns are always negative',
        ],
        correctIndex: 1,
        explanation: 'Inflation erodes the purchasing power of dollars, so only the real return tells you whether you got wealthier.',
      },
      {
        question: 'In compounding, the second year\'s gain is calculated on:',
        options: [
          'The original investment only',
          'The original investment plus the first year\'s gain',
          'Half the original investment',
          'Inflation only',
        ],
        correctIndex: 1,
        explanation: 'That growing base is what makes compounding compound.',
      },
    ],
  },

  'stocks-basic-7': {
    sections: [
      {
        title: 'Why all investments carry risk',
        content:
          'Risk in finance means the possibility that actual returns will differ from expected returns — usually with the painful side being more memorable. Mayo divides risk into two broad buckets: systematic risk (which affects the whole market — recessions, interest rate moves, geopolitical shocks) and unsystematic risk (which affects a single company or industry — a CEO scandal, a failed product launch). The first kind cannot be diversified away; the second kind can.',
      },
      {
        title: 'Diversification: free lunch (almost)',
        content:
          'Diversification is the practice of spreading investments across many securities so that no single bad outcome can sink the portfolio. Mayo cites the standard finding that as you add more uncorrelated stocks to a portfolio, the unsystematic risk falls quickly — most of the benefit is captured by the first 20-30 holdings. Graham\'s defensive investor goes further by holding broad index funds, which by construction diversify away nearly all unsystematic risk.',
        callout:
          'Graham: "The investor must recognize that there is always some risk in any common stock; and the soundest plans for risk control therefore depend upon adequate diversification."',
      },
      {
        title: 'Risk vs reward is not a free trade',
        content:
          'Higher expected return generally requires accepting higher risk — that is the central trade-off of finance. But the relationship is not linear, and Graham warns repeatedly that taking on more risk does not guarantee higher returns; it merely opens the door to a wider range of outcomes, including very bad ones. The intelligent investor seeks the best return achievable for the level of risk he can sleep with.',
      },
    ],
    quiz: [
      {
        question: 'Systematic risk is risk that:',
        options: [
          'Can be diversified away by holding more stocks',
          'Affects the entire market and cannot be diversified away',
          'Only applies to bonds',
          'Is illegal',
        ],
        correctIndex: 1,
        explanation: 'Systematic (market) risk hits everything; only unsystematic risk responds to diversification.',
      },
      {
        question: 'Most of diversification\'s benefit is captured by holding approximately:',
        options: ['2 stocks', '20 to 30 well-chosen stocks', '500 stocks', '2,000 stocks'],
        correctIndex: 1,
        explanation: 'Mayo and standard finance research both find that 20-30 uncorrelated holdings capture most of the benefit.',
      },
      {
        question: 'Does taking more risk guarantee higher returns?',
        options: [
          'Yes, always',
          'No — it widens the range of possible outcomes, including bad ones',
          'Only in bull markets',
          'Only with leverage',
        ],
        correctIndex: 1,
        explanation: 'Higher risk means higher possible reward AND higher possible loss; it is not a guarantee.',
      },
      {
        question: 'Graham\'s defensive investor reduces unsystematic risk primarily by:',
        options: [
          'Trading frequently',
          'Holding broadly diversified index funds',
          'Concentrating on one stock',
          'Avoiding equities entirely',
        ],
        correctIndex: 1,
        explanation: 'Index funds give wide diversification with minimal effort, suiting the defensive investor.',
      },
      {
        question: 'A failed product launch at a single company is an example of:',
        options: ['Systematic risk', 'Unsystematic risk', 'Inflation risk', 'Interest rate risk'],
        correctIndex: 1,
        explanation: 'Company-specific events are the textbook example of unsystematic (idiosyncratic) risk.',
      },
    ],
  },

  'stocks-basic-8': {
    sections: [
      {
        title: 'The financial press as entertainment',
        content:
          'Graham reserves some of his sharpest writing for the financial media, observing that headlines are designed to provoke a reaction, not a decision. Today\'s "market plunges on Fed fears" is tomorrow\'s "rally as fears subside" — and the underlying businesses are the same in both cases. Mayo similarly notes that most financial journalism describes price movements after the fact and assigns narrative reasons that may or may not be causal. Reading the news for context is healthy; reading it for instructions is not.',
      },
      {
        title: 'Signal vs noise',
        content:
          'Useful financial information tends to be quiet: a company\'s annual report, a long-form analysis from a credible source, an SEC filing. Noisy information tends to be loud: cable TV ticker chyrons, intra-day price alerts, breathless social media posts. Graham\'s rule for the intelligent investor is that the louder the source, the more skeptical you should be — and the less it should influence the next thing you do.',
        callout: 'Graham: "The investor\'s chief problem — and even his worst enemy — is likely to be himself."',
      },
      {
        title: 'A simple practice',
        content:
          'When a piece of market news upsets you, sit on it for 24 hours before acting. If the news is real and material, it will still be material tomorrow, and you will have given yourself time to assess it without panic. If the news is noise, the urge to act will probably have passed. Both Graham and Mayo recommend habits like this for separating emotional reaction from rational decision-making.',
      },
    ],
    quiz: [
      {
        question: 'According to Graham, why are dramatic financial headlines often unreliable as a basis for action?',
        options: [
          'Because the journalists are dishonest',
          'Because they are designed for emotional reaction and the underlying businesses change far less than the headlines suggest',
          'Because they are always wrong',
          'Because they are illegal',
        ],
        correctIndex: 1,
        explanation:
          'Graham emphasizes that prices fluctuate far more than the underlying businesses do — most headlines describe price moves, not business changes.',
      },
      {
        question: 'Which of these is generally a higher-quality information source for investors?',
        options: [
          'A 30-second cable TV segment',
          'A company\'s annual report or 10-K filing',
          'A trending social media post',
          'A push notification on your phone',
        ],
        correctIndex: 1,
        explanation: 'Primary documents like annual reports and SEC filings carry far more signal than commentary about them.',
      },
      {
        question: 'Graham wrote that "the investor\'s chief problem — and even his worst enemy — is likely to be":',
        options: ['The Federal Reserve', 'Himself', 'The IRS', 'His broker'],
        correctIndex: 1,
        explanation: 'Graham repeatedly emphasizes that emotional self-management is the hardest and most important investing skill.',
      },
      {
        question: 'A useful habit when shocking financial news arrives is to:',
        options: [
          'Trade immediately',
          'Wait 24 hours before acting so you can assess it without panic',
          'Sell everything',
          'Borrow money to buy more',
        ],
        correctIndex: 1,
        explanation: 'A cooling-off window separates emotional reaction from rational decision-making.',
      },
      {
        question: 'In Mayo\'s framing, most financial journalism explains price moves:',
        options: [
          'Before they happen, with high accuracy',
          'After the fact, with narrative reasons that may or may not be causal',
          'Only when the SEC requires it',
          'Only for bond markets',
        ],
        correctIndex: 1,
        explanation: 'Post-hoc narrative is a recurring critique of financial media — the story is fitted to whatever already happened.',
      },
    ],
  },
};

const COURSE_CONTENT = { ...STOCKS_BRONZE, ...BRONZE_REST, ...CRYPTO_BRONZE };

export default COURSE_CONTENT;
