'use client';

import Link from 'next/link';

import '../../../../app-legacy/assets/css/theme.css';
import '../../../../app-legacy/assets/css/unified-component-cards.css';
import '../../../../app-legacy/assets/css/pages-common.css';
import '../../../../app-legacy/assets/css/light-mode-fixes.css';
import './market-analysis-world-monitor.css';

export default function MarketAnalysisPage() {
  return (
    <div className="market-analysis-world-monitor">
      {/* Left: Full-height sticky world map */}
      <aside className="map-panel">
        <div className="map-header">
          <h2 className="map-title">
            <i className="bi bi-globe2" />
            Global Capital Markets
          </h2>
          <div className="map-controls">
            <div className="map-layers">
              <span className="layer-label">Layers</span>
              <button type="button" className="layer-btn active">Markets</button>
              <button type="button" className="layer-btn">Central Banks</button>
              <button type="button" className="layer-btn">Indices</button>
              <button type="button" className="layer-btn">Commodities</button>
            </div>
            <div className="map-time-range">
              <select className="time-range-select">
                <option value="24h">24h</option>
                <option value="7d">7d</option>
                <option value="30d">30d</option>
              </select>
            </div>
          </div>
        </div>
        <div className="map-container">
          <img
            src="https://upload.wikimedia.org/wikipedia/commons/thumb/8/83/Equirectangular_projection_SW.jpg/1200px-Equirectangular_projection_SW.jpg"
            alt="World Map - Global Capital Markets"
            className="world-map-img"
          />
          <div className="map-overlay-dots">
            <div className="market-dot usa" title="United States - S&P 500" />
            <div className="market-dot europe" title="Europe - STOXX 600" />
            <div className="market-dot asia" title="Asia - Nikkei 225" />
            <div className="market-dot uk" title="UK - FTSE 100" />
            <div className="market-dot china" title="China - Shanghai Composite" />
          </div>
        </div>
      </aside>

      {/* Right: Scrollable news/component cards */}
      <div className="cards-panel">
        <div className="cards-panel-inner">
          <div className="cards-header">
            <h3>International Capital Markets Intelligence</h3>
            <p>Real-time news, central bank moves, and market developments</p>
          </div>

          {/* News/Intelligence Cards */}
          <article className="intel-card">
            <div className="intel-card-header">
              <span className="intel-badge markets">Markets</span>
              <span className="intel-time">2h ago</span>
            </div>
            <h4>ECB signals potential rate cut in June as eurozone inflation cools</h4>
            <p>European Central Bank President Christine Lagarde indicated policymakers may consider easing monetary policy at the June meeting, with inflation trending toward the 2% target.</p>
            <div className="intel-meta">
              <span><i className="bi bi-geo-alt" /> Frankfurt</span>
              <span><i className="bi bi-tag" /> Central Banks</span>
            </div>
          </article>

          <article className="intel-card">
            <div className="intel-card-header">
              <span className="intel-badge asia">Asia</span>
              <span className="intel-time">4h ago</span>
            </div>
            <h4>Bank of Japan maintains ultra-loose policy; yen weakens to 34-year low</h4>
            <p>BOJ kept interest rates unchanged at -0.1% and maintained yield curve control. The yen fell against the dollar as investors bet on continued divergence with Fed policy.</p>
            <div className="intel-meta">
              <span><i className="bi bi-geo-alt" /> Tokyo</span>
              <span><i className="bi bi-tag" /> FX</span>
            </div>
          </article>

          <article className="intel-card">
            <div className="intel-card-header">
              <span className="intel-badge bonds">Bonds</span>
              <span className="intel-time">5h ago</span>
            </div>
            <h4>US Treasury yields rise on strong jobs data; 10-year hits 4.5%</h4>
            <p>Benchmark 10-year Treasury yield climbed after nonfarm payrolls beat expectations, reinforcing expectations the Fed will delay rate cuts. Bond markets now price fewer than two cuts in 2026.</p>
            <div className="intel-meta">
              <span><i className="bi bi-geo-alt" /> New York</span>
              <span><i className="bi bi-tag" /> Fixed Income</span>
            </div>
          </article>

          <article className="intel-card">
            <div className="intel-card-header">
              <span className="intel-badge commodities">Commodities</span>
              <span className="intel-time">6h ago</span>
            </div>
            <h4>Oil prices surge on Middle East tensions; Brent above $88</h4>
            <p>Crude oil rallied as geopolitical risks in the Red Sea and Persian Gulf raised supply concerns. Gold also gained as a safe-haven bid intensified amid global uncertainty.</p>
            <div className="intel-meta">
              <span><i className="bi bi-geo-alt" /> London</span>
              <span><i className="bi bi-tag" /> Oil &amp; Gold</span>
            </div>
          </article>

          <article className="intel-card">
            <div className="intel-card-header">
              <span className="intel-badge em">Emerging Markets</span>
              <span className="intel-time">8h ago</span>
            </div>
            <h4>India&apos;s Sensex hits record high on strong earnings, FDI inflows</h4>
            <p>Indian equity markets extended gains as corporate earnings beat estimates and foreign direct investment reached record levels. Rupee strengthened against the dollar.</p>
            <div className="intel-meta">
              <span><i className="bi bi-geo-alt" /> Mumbai</span>
              <span><i className="bi bi-tag" /> Equities</span>
            </div>
          </article>

          <article className="intel-card">
            <div className="intel-card-header">
              <span className="intel-badge fed">Fed</span>
              <span className="intel-time">10h ago</span>
            </div>
            <h4>Fed Chair Powell: Policy appropriately restrictive, watching data</h4>
            <p>Federal Reserve Chair Jerome Powell testified before Congress that current policy is well-positioned and the central bank will remain data-dependent. Markets interpreted comments as neutral to slightly hawkish.</p>
            <div className="intel-meta">
              <span><i className="bi bi-geo-alt" /> Washington</span>
              <span><i className="bi bi-tag" /> Monetary Policy</span>
            </div>
          </article>

          <article className="intel-card">
            <div className="intel-card-header">
              <span className="intel-badge crypto">Crypto</span>
              <span className="intel-time">12h ago</span>
            </div>
            <h4>Bitcoin ETF inflows reach $12B as institutional adoption accelerates</h4>
            <p>Spot Bitcoin ETFs have attracted record inflows as pension funds and asset managers add digital asset exposure. BlackRock&apos;s IBIT leads with over $18B in assets.</p>
            <div className="intel-meta">
              <span><i className="bi bi-geo-alt" /> Global</span>
              <span><i className="bi bi-tag" /> Digital Assets</span>
            </div>
          </article>

          <article className="intel-card">
            <div className="intel-card-header">
              <span className="intel-badge china">China</span>
              <span className="intel-time">14h ago</span>
            </div>
            <h4>PBOC cuts reserve ratio to support economy; Shanghai Composite gains</h4>
            <p>People&apos;s Bank of China announced a 50bp cut to the reserve requirement ratio, injecting liquidity to support growth. Chinese equities rallied on the stimulus measures.</p>
            <div className="intel-meta">
              <span><i className="bi bi-geo-alt" /> Beijing</span>
              <span><i className="bi bi-tag" /> Stimulus</span>
            </div>
          </article>

          <article className="intel-card">
            <div className="intel-card-header">
              <span className="intel-badge europe">Europe</span>
              <span className="intel-time">16h ago</span>
            </div>
            <h4>UK gilt yields fall as BoE signals dovish pivot</h4>
            <p>Bank of England Governor Andrew Bailey suggested the next move in rates could be down. UK government bonds rallied, with 10-year gilt yields dropping 8bp.</p>
            <div className="intel-meta">
              <span><i className="bi bi-geo-alt" /> London</span>
              <span><i className="bi bi-tag" /> Gilts</span>
            </div>
          </article>

          <div className="cards-footer">
            <Link href="/economic-indicators" className="view-more-link">
              View Economic Indicators <i className="bi bi-arrow-right" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
