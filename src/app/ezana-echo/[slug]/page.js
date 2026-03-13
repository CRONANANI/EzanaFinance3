'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Sp500Chart } from '@/components/ezana-echo/Sp500Chart';
import './article.css';

const ARTICLES = {
  'oil-assets-surge': {
    title: '7 assets that historically surge when oil prices spike',
    category: 'Energy',
    author: 'Ezana Research',
    date: '2 Mar 2025',
    readTime: '8 min read',
    content: (
      <>
        <p className="ezana-article-lead">
          When crude prices rise, certain sectors and securities tend to outperform. Here are seven assets with strong historical correlation to oil rallies—from ETFs and integrated majors to pure-play producers and futures-tracking funds.
        </p>

        <h2>1. VanEck Oil Services ETF (OIH)</h2>
        <p>
          Tracks oilfield service companies. These firms benefit when producers increase drilling capex, which typically accelerates when crude prices exceed $80 per barrel.
        </p>

        <h2>2. Exxon Mobil (XOM)</h2>
        <p>
          They produce about 4.8M barrels of oil per day from Guyana, the Permian Basin, and offshore Brazil. Generated $55B operating cash flow in 2023, with upstream profits highly leveraged to crude prices.
        </p>

        <h2>3. Energy Select Sector SPDR (XLE)</h2>
        <p>
          Holds the largest US energy companies, with Exxon Mobil and Chevron exceeding 40% of portfolio weight. It manages roughly $30B in assets and tracks the S&P 500 energy sector, which historically has outperformed during oil rallies.
        </p>

        <h2>4. EOG Resources (EOG)</h2>
        <p>
          Leading U.S. shale producer operating in the Permian, Eagle Ford, and Powder River basins. The company reports breakeven costs near $40 per barrel, allowing strong margin expansion during oil rallies.
        </p>

        <h2>5. Schlumberger (SLB)</h2>
        <p>
          Operates in 100+ countries providing drilling, reservoir, modeling, and subsea production technology. 2023 revenue: $33B with earnings tied mostly to upstream capex, which historically rises when crude exceeds $80 per barrel.
        </p>

        <h2>6. ConocoPhillips (COP)</h2>
        <p>
          Produces 1.9M barrels of oil daily across the Permian Basin, Alaska, and LNG projects in Qatar and Australia. Its earnings move in positive correlation with crude oil prices and upstream margins.
        </p>

        <h2>7. United States Oil Fund (USO)</h2>
        <p>
          Tracks WTI crude oil through front-month NYMEX futures. The ETF manages roughly $3B in assets and historically moves nearly one-for-one with WTI, which surged to $120 per barrel in 2022 during supply shocks.
        </p>

        <div className="ezana-article-map-section">
          <h3>The Permian Basin: A Key Oil-Producing Region</h3>
          <p>
            The Permian Basin spans West Texas and Southeast New Mexico and is one of the most productive oil regions in the United States. Many of the assets listed above—including Exxon Mobil, EOG Resources, and ConocoPhillips—have significant operations in the Permian, making it a critical area to understand when analyzing oil price sensitivity.
          </p>
          <div className="ezana-article-map">
            <PermianBasinMap />
          </div>
        </div>
      </>
    ),
  },
  'hedge-funds-3y-performance': {
    title: 'Hedge funds with the highest 3Y performance (2023–2026)',
    category: 'Markets',
    author: 'Ezana Research',
    date: '2 Mar 2025',
    readTime: '6 min read',
    content: (
      <>
        <p className="ezana-article-lead">
          Based on 13F filings and performance data from 2023–2026, these seven hedge funds delivered the strongest three-year returns. From concentrated Tiger Cubs to global macro strategies, here are the top performers and what drives their edge.
        </p>

        <h2>1. Ratan Capital — ~277.8%</h2>
        <p>
          Concentrated Tiger-Cub hedge fund running a catalyst-driven equity strategy with large positions in companies such as NVIDIA, Amazon, Meta and Microsoft. The firm was founded by Nehal Chopra, a former Tiger Management analyst.
        </p>

        <h2>2. Duquesne Family Office — ~242.3%</h2>
        <p>
          Global macro strategy investing across equities, sectors and macro themes with positions such as Natera, XLF and Insmed. The firm traces back to Duquesne Capital, the hedge fund Stanley Druckenmiller ran for George Soros.
        </p>

        <h2>3. NWI Management — ~227.3%</h2>
        <p>
          Growth-focused equity hedge fund concentrating capital in leaders like MercadoLibre and Microsoft. The firm is known for maintaining a small number of high-conviction positions rather than a diversified portfolio.
        </p>

        <h2>4. Coatue Management — ~219.1%</h2>
        <p>
          Technology-focused hedge fund investing across public stocks and venture capital, with major holdings such as Amazon, Meta, Microsoft and TSMC. Founded in 1999 by Philippe Laffont, a former Tiger Management analyst.
        </p>

        <h2>5. Peconic Partners — ~204.1%</h2>
        <p>
          Highly concentrated fundamental hedge fund focusing on companies like Quanta Services and Freeport-McMoRan. The fund was founded by William Harnisch and became known for running extremely concentrated portfolios.
        </p>

        <h2>6. Tiger Global — ~184.9%</h2>
        <p>
          Global growth hedge fund with major holdings including Alphabet, Amazon, Microsoft and NVIDIA. The firm is one of the most famous Tiger Management spin-offs and an early investor in companies like Facebook, JD.com and Stripe.
        </p>

        <h2>7. Point72 — ~184.2%</h2>
        <p>
          Massive multi-manager hedge fund with large exposure to AI and semiconductor companies. The firm was created by Steven Cohen after SAC Capital, one of the most successful trading firms in hedge fund history.
        </p>
      </>
    ),
  },
  'hedge-fund-strategies-backtest': {
    title: 'Top 7 beginner Hedge Fund strategies you can backtest',
    category: 'Markets',
    author: 'Ezana Research',
    date: '2 Mar 2025',
    readTime: '8 min read',
    content: (
      <>
        <p className="ezana-article-lead">
          These seven institutional strategies can be backtested with the formulas below. Click any strategy title to sign in and run backtests in our For The Quants backtesting engine.
        </p>

        <div className="ezana-strategy-block">
          <h2 className="ezana-strategy-title">
            <Link href="/auth/signin/backtest" className="ezana-strategy-link">1. Earnings Beat + Confirmed Move</Link>
          </h2>
          <span className="ezana-strategy-category">Earnings Confirmation</span>
          <p>Funds like Renaissance, Two Sigma trade earnings where profits beat estimates and price rises next day (or misses and falls), as confirmed surprises tend to drift 1–3 months.</p>
          <p className="ezana-backtest-formula"><strong>Backtest:</strong> Surprise = Actual EPS - Estimate and Move = NextClose ÷ EarningsClose - 1, trade if signs match, hold ~60 days.</p>
        </div>

        <div className="ezana-strategy-block">
          <h2 className="ezana-strategy-title">
            <Link href="/auth/signin/backtest" className="ezana-strategy-link">2. IPO Lock-Up Expiration</Link>
          </h2>
          <span className="ezana-strategy-category">IPO</span>
          <p>Hedge funds track IPO lock-ups because insider selling becoming legal often increases float and historically produces short-term negative returns and heavy volume around expiration.</p>
          <p className="ezana-backtest-formula"><strong>Backtest:</strong> Short 5 trading days before expiration, cover 3 trading days after, compute Return = Entry ÷ Exit - 1, exclude earnings weeks.</p>
        </div>

        <div className="ezana-strategy-block">
          <h2 className="ezana-strategy-title">
            <Link href="/auth/signin/backtest" className="ezana-strategy-link">3. Time-Series Momentum Futures</Link>
          </h2>
          <span className="ezana-strategy-category">Momentum</span>
          <p>Man AHL, Winton, AQR run global trend portfolios long assets above their level 12 months ago and short those below, a rule validated across equities, bonds, FX, and commodities for decades.</p>
          <p className="ezana-backtest-formula"><strong>Backtest:</strong> Monthly with ETFs: Signal = Price today ÷ Price 12m ago - 1, go Long if &gt;0, Short/Flat if &lt;0, rebalance monthly.</p>
        </div>

        <div className="ezana-strategy-block">
          <h2 className="ezana-strategy-title">
            <Link href="/auth/signin/backtest" className="ezana-strategy-link">4. VIX Term-Structure Carry</Link>
          </h2>
          <span className="ezana-strategy-category">Volatility Trading</span>
          <p>Volatility hedge funds trade the slope between near-term and current volatility because calm markets usually show higher future volatility pricing, favoring short-volatility exposure until stress flips the curve.</p>
          <p className="ezana-backtest-formula"><strong>Backtest:</strong> Weekly with Slope = FutureVIX ÷ CurrentVIX - 1, stay ShortVol if Slope&gt;0, reduce or exit if Slope&lt;0 or VIX spikes.</p>
        </div>

        <div className="ezana-strategy-block">
          <h2 className="ezana-strategy-title">
            <Link href="/auth/signin/backtest" className="ezana-strategy-link">5. Index-vs-Stock Volatility Dispersion</Link>
          </h2>
          <span className="ezana-strategy-category">Volatility Dispersion</span>
          <p>Citadel and Millennium sell index volatility while buying single-stock volatility to monetize correlation risk, profiting when individual stocks move differently instead of in one direction.</p>
          <p className="ezana-backtest-formula"><strong>Backtest:</strong> Simulate Sell SPY volatility + Buy volatility on 10–20 large stocks, keep exposure balanced, track Profit = Premium received - Premium paid - payouts.</p>
        </div>

        <div className="ezana-strategy-block">
          <h2 className="ezana-strategy-title">
            <Link href="/auth/signin/backtest" className="ezana-strategy-link">6. Merger Arbitrage Spread</Link>
          </h2>
          <span className="ezana-strategy-category">M&A</span>
          <p>Event funds such as Elliott, Paulson, Citadel buy takeover targets trading below the agreed deal price, focusing on larger spreads that compensate for time and failure risk.</p>
          <p className="ezana-backtest-formula"><strong>Backtest:</strong> Gap = DealPrice ÷ MarketPrice - 1, buy when gap is clearly positive and deal expected &lt;1 year, exit at completion or break, track win rate and drawdowns.</p>
        </div>

        <div className="ezana-strategy-block">
          <h2 className="ezana-strategy-title">
            <Link href="/auth/signin/backtest" className="ezana-strategy-link">7. Short-Horizon Reversal</Link>
          </h2>
          <span className="ezana-strategy-category">Liquidity Stat-Arb</span>
          <p>Renaissance / DE Shaw tradition buy stocks with the worst recent returns because extreme short-term losses often reverse once selling pressure fades.</p>
          <p className="ezana-backtest-formula"><strong>Backtest:</strong> Daily with Return5d = Price today ÷ Price 5d ago - 1, buy lowest 10%, hold 5 trading days, include trading costs.</p>
        </div>

        <div className="ezana-article-cta">
          <Link href="/auth/signin/backtest" className="ezana-cta-btn">
            <i className="bi bi-calculator" />
            Backtest These Strategies in For The Quants
          </Link>
        </div>
      </>
    ),
  },
  'sp500-returns-by-president': {
    title: 'S&P 500 returns under different presidents',
    category: 'Markets',
    author: 'Ezana Research',
    date: '2 Mar 2025',
    readTime: '5 min read',
    content: (
      <>
        <p className="ezana-article-lead">
          S&P 500 total returns vary significantly by presidential term, driven by economic cycles, Fed policy, and global events. Hover over each point to see the context behind the numbers—from the dot-com boom and bust to the financial crisis rebound and beyond.
        </p>
        <Sp500Chart />
      </>
    ),
  },
};

function PermianBasinMap() {
  return (
    <svg
      viewBox="0 0 400 280"
      className="permian-basin-map"
      aria-label="Map of the Permian Basin region in West Texas and Southeast New Mexico"
    >
      <defs>
        <linearGradient id="permianGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#10b981" stopOpacity="0.05" />
        </linearGradient>
      </defs>
      {/* Simplified outline of Texas */}
      <path
        d="M 80 40 L 320 40 L 340 80 L 360 140 L 350 200 L 320 240 L 260 260 L 180 250 L 100 220 L 60 160 L 50 100 Z"
        fill="none"
        stroke="rgba(16, 185, 129, 0.4)"
        strokeWidth="1.5"
      />
      {/* Permian Basin region - approximate outline */}
      <ellipse
        cx="180"
        cy="140"
        rx="90"
        ry="70"
        fill="url(#permianGradient)"
        stroke="#10b981"
        strokeWidth="2"
        strokeDasharray="4 2"
      />
      <text x="180" y="135" textAnchor="middle" fill="#10b981" fontSize="14" fontWeight="600">
        Permian Basin
      </text>
      <text x="180" y="155" textAnchor="middle" fill="#94a3b8" fontSize="10">
        West TX / SE NM
      </text>
      {/* City markers */}
      <circle cx="120" cy="120" r="4" fill="#10b981" />
      <text x="125" y="125" fill="#94a3b8" fontSize="9">Midland</text>
      <circle cx="140" cy="160" r="4" fill="#10b981" />
      <text x="145" y="165" fill="#94a3b8" fontSize="9">Odessa</text>
      <circle cx="220" cy="110" r="4" fill="#10b981" />
      <text x="225" y="115" fill="#94a3b8" fontSize="9">Lubbock</text>
      {/* State labels */}
      <text x="280" y="100" fill="rgba(148, 163, 184, 0.6)" fontSize="11">Texas</text>
      <text x="50" y="180" fill="rgba(148, 163, 184, 0.6)" fontSize="10">New Mexico</text>
    </svg>
  );
}

export default function ArticlePage() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug;
  const article = slug ? ARTICLES[slug] : null;

  if (!slug) return null;
  if (!article) {
    if (typeof window !== 'undefined') router.replace('/ezana-echo');
    return null;
  }

  return (
    <div className="ezana-article-page">
      <div className="ezana-echo-bg" />
      <div className={`ezana-article-container ${slug === 'sp500-returns-by-president' ? 'ezana-article-wide' : ''}`}>
        <Link href="/ezana-echo" className="ezana-article-back">
          <i className="bi bi-arrow-left" />
          Back to Articles
        </Link>

        <article className="ezana-article">
          <span className="ezana-echo-category-tag">{article.category}</span>
          <h1 className="ezana-article-title">{article.title}</h1>
          <div className="ezana-article-meta">
            <span>{article.author}</span>
            <span>{article.date}</span>
            <span>{article.readTime}</span>
          </div>

          <div className="ezana-article-content">{article.content}</div>
        </article>
      </div>
    </div>
  );
}
