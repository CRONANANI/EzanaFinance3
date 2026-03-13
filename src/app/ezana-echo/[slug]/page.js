'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
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
      <div className="ezana-article-container">
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
