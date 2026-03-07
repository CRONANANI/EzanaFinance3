'use client';

import { useState } from 'react';
import Link from 'next/link';

import '../../../../app-legacy/assets/css/theme.css';
import '../../../../app-legacy/assets/css/unified-component-cards.css';
import '../../../../app-legacy/assets/css/pages-common.css';
import '../../../../app-legacy/assets/css/light-mode-fixes.css';
import './market-analysis-world-monitor.css';

const MAP_EVENTS = [
  { id: 'usa', region: 'usa', title: 'Fed Policy', desc: 'Federal Reserve signals data-dependent approach. Markets pricing 2 cuts in 2026.', impact: 'Moderate impact on global risk sentiment. USD strength may persist.' },
  { id: 'europe', region: 'europe', title: 'ECB Rate Cut', desc: 'ECB signals potential rate cut in June as eurozone inflation cools.', impact: 'EUR weakness expected. European equities may benefit from lower rates.' },
  { id: 'asia', region: 'asia', title: 'BOJ Policy', desc: 'Bank of Japan maintains ultra-loose policy; yen weakens to 34-year low.', impact: 'Yen carry trade flows. Japanese exporters benefit from weak currency.' },
  { id: 'uk', region: 'uk', title: 'BoE Dovish Pivot', desc: 'UK gilt yields fall as BoE signals dovish pivot.', impact: 'UK bonds rally. Sterling may face pressure.' },
  { id: 'china', region: 'china', title: 'PBOC Stimulus', desc: 'PBOC cuts reserve ratio to support economy; Shanghai Composite gains.', impact: 'Chinese equities rally. Commodity demand outlook improves.' },
];

const MOCK_ARTICLES = [
  { title: 'Fed Chair Powell Testifies Before Congress', source: 'Reuters', url: '#' },
  { title: 'Markets React to Central Bank Signals', source: 'Bloomberg', url: '#' },
  { title: 'Global Rate Outlook Shifts', source: 'Financial Times', url: '#' },
];

const CONVEYER_CARDS = [
  { badge: 'Markets', title: 'ECB signals potential rate cut in June', time: '2h ago', location: 'Frankfurt' },
  { badge: 'Asia', title: 'Bank of Japan maintains ultra-loose policy', time: '4h ago', location: 'Tokyo' },
  { badge: 'Bonds', title: 'US Treasury yields rise on strong jobs data', time: '5h ago', location: 'New York' },
  { badge: 'Commodities', title: 'Oil prices surge on Middle East tensions', time: '6h ago', location: 'London' },
  { badge: 'Emerging Markets', title: "India's Sensex hits record high", time: '8h ago', location: 'Mumbai' },
  { badge: 'Fed', title: 'Fed Chair Powell: Policy appropriately restrictive', time: '10h ago', location: 'Washington' },
  { badge: 'Crypto', title: 'Bitcoin ETF inflows reach $12B', time: '12h ago', location: 'Global' },
  { badge: 'China', title: 'PBOC cuts reserve ratio to support economy', time: '14h ago', location: 'Beijing' },
  { badge: 'Europe', title: 'UK gilt yields fall as BoE signals dovish pivot', time: '16h ago', location: 'London' },
];

export default function MarketAnalysisPage() {
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [activeLayer, setActiveLayer] = useState('markets');

  return (
    <div className={`market-analysis-world-monitor ${selectedEvent ? 'has-news-panel' : ''}`}>
      {/* Map - 60% top */}
      <aside className="map-panel">
        <div className="map-header">
          <h2 className="map-title">
            <i className="bi bi-globe2" />
            Global Capital Markets
          </h2>
          <div className="map-controls">
            <div className="map-layers">
              <span className="layer-label">Layers</span>
              {['Markets', 'Central Banks', 'Indices', 'Commodities'].map((l) => (
                <button key={l} type="button" className={`layer-btn ${activeLayer === l.toLowerCase().replace(' ', '') ? 'active' : ''}`} onClick={() => setActiveLayer(l.toLowerCase().replace(' ', ''))}>{l}</button>
              ))}
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
            {MAP_EVENTS.map((ev) => (
              <div
                key={ev.id}
                className={`market-dot ${ev.region}`}
                title={ev.title}
                onClick={() => setSelectedEvent(ev)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && setSelectedEvent(ev)}
              />
            ))}
          </div>
        </div>
      </aside>

      {/* Horizontal conveyer belt */}
      <section className="conveyer-section">
        <div className="conveyer-track">
          {[...CONVEYER_CARDS, ...CONVEYER_CARDS].map((card, i) => (
            <div key={i} className="conveyer-card">
              <div className="intel-card-header">
                <span className={`intel-badge ${card.badge.toLowerCase().replace(/\s/g, '')}`}>{card.badge}</span>
                <span className="intel-time">{card.time}</span>
              </div>
              <h4>{card.title}</h4>
              <div className="intel-meta">
                <span><i className="bi bi-geo-alt" /> {card.location}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* News panel - slides in from right when event selected */}
      <div className={`news-panel ${selectedEvent ? 'open' : ''}`}>
        <div className="news-panel-header">
          <h3>{selectedEvent?.title || 'Event'}</h3>
          <button type="button" className="news-panel-close" onClick={() => setSelectedEvent(null)} aria-label="Close"><i className="bi bi-x-lg" /></button>
        </div>
        {selectedEvent && (
          <div className="news-panel-body">
            <p>{selectedEvent.desc}</p>
            <div className="ai-impact-metrics">
              <strong>AI Impact Assessment:</strong> {selectedEvent.impact}
            </div>
            <p><strong>Read more:</strong></p>
            {MOCK_ARTICLES.map((a, i) => (
              <div key={i} className="news-article-item">
                <a href={a.url} target="_blank" rel="noopener noreferrer">{a.title}</a> — {a.source}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Legacy cards panel - hidden when using new layout */}
      <div className="cards-panel" style={{ display: 'none' }}>
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
            <Link href="/for-the-quants" className="view-more-link">
              View Quant Tools <i className="bi bi-arrow-right" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
