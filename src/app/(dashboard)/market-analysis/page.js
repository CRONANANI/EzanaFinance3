'use client';

import { useState } from 'react';
import { WorldMap } from '@/components/ui/world-map';

import '../../../../app-legacy/assets/css/theme.css';
import '../../../../app-legacy/assets/css/unified-component-cards.css';
import '../../../../app-legacy/assets/css/pages-common.css';
import '../../../../app-legacy/assets/css/light-mode-fixes.css';
import './market-analysis-world-monitor.css';

/* ── Layer definitions with icons ── */
const LAYERS = [
  { id: 'markets', label: 'Markets', icon: 'bi-graph-up' },
  { id: 'centralbanks', label: 'Central Banks', icon: 'bi-bank' },
  { id: 'indices', label: 'Indices', icon: 'bi-bar-chart-line' },
  { id: 'commodities', label: 'Commodities', icon: 'bi-box-seam' },
  { id: 'currencies', label: 'Currencies', icon: 'bi-currency-exchange' },
  { id: 'volatility', label: 'Volatility', icon: 'bi-activity' },
];

/* ── Map panel labels (news drawer) — ids match WorldMap center.panelId ── */
const MAP_DOT_LABELS = {
  newyork: 'New York',
  toronto: 'Toronto',
  saopaulo: 'São Paulo',
  london: 'London',
  frankfurt: 'Frankfurt',
  dubai: 'Dubai',
  mumbai: 'Mumbai',
  singapore: 'Singapore',
  hongkong: 'Hong Kong',
  shanghai: 'Shanghai',
  tokyo: 'Tokyo',
  sydney: 'Sydney',
};

/* ── Map events — data behind each dot ── */
const MAP_EVENTS = {
  newyork: { title: 'Fed Policy & US Markets', desc: 'Federal Reserve signals data-dependent approach to rate cuts. S&P 500 near all-time highs with AI sector leading gains. Markets pricing 2 cuts in 2026.', impact: 'Moderate impact on global risk sentiment. USD strength may persist near-term as rate differential favors dollar assets.' },
  toronto: { title: 'Bank of Canada Easing', desc: 'BoC continues easing cycle with rates below Fed. Canadian dollar under pressure as commodity prices stabilize.', impact: 'CAD weakness supports Canadian exporters. TSX energy sector sensitive to oil price movements.' },
  saopaulo: { title: 'Brazil Fiscal Concerns', desc: 'Ibovespa faces headwinds from fiscal policy uncertainty. Real weakens as budget deficit concerns mount.', impact: 'EM sentiment cautious. Brazilian equities offer high dividend yields but currency risk elevated.' },
  london: { title: 'BoE Dovish Pivot', desc: 'UK gilt yields fall as BoE signals dovish pivot. Sterling faces pressure as growth outlook weakens. FTSE 100 benefits from weak pound boosting multinational earnings.', impact: 'UK bonds rally. Sterling may face further pressure as rate differentials narrow with ECB.' },
  frankfurt: { title: 'ECB Rate Path', desc: 'ECB signals potential rate cut in June as eurozone inflation cools toward 2% target. DAX reaches new highs driven by luxury and industrial exporters.', impact: 'EUR weakness expected. European equities may benefit from lower rates and improved credit conditions.' },
  dubai: { title: 'Gulf Markets & Oil', desc: 'UAE markets benefit from elevated oil prices and economic diversification. Dubai real estate sector shows continued momentum.', impact: 'Petrodollar flows support regional equity markets. Diversification into tech and tourism reduces oil dependency.' },
  mumbai: { title: 'India Growth Story', desc: 'Sensex and Nifty at record highs. India GDP growth exceeds 7% as manufacturing and services PMI expand. FDI inflows reach record levels.', impact: 'India emerges as key allocation for global EM funds. Rupee stability supports foreign investment confidence.' },
  singapore: { title: 'ASEAN Financial Hub', desc: 'SGX benefits from regional capital flows. MAS maintains tight monetary policy as inflation moderates. Singapore REIT sector attracts yield-seekers.', impact: 'Regional safe haven status supports SGD. Trade hub position benefits from supply chain restructuring.' },
  hongkong: { title: 'China Recovery Play', desc: 'Hang Seng rebounds on PBOC stimulus measures. Tech sector leads recovery as regulatory headwinds ease. Southbound flows from mainland increase.', impact: 'Hong Kong serves as proxy for China recovery thesis. Valuation discount to US peers attracts contrarian capital.' },
  shanghai: { title: 'PBOC Stimulus', desc: 'PBOC cuts reserve ratio to support economy. Shanghai Composite gains as property sector stabilization measures take effect. A-share inclusion in global indices increases.', impact: 'Chinese equities rally. Commodity demand outlook improves as construction activity rebounds.' },
  tokyo: { title: 'BOJ Policy Normalization', desc: 'Bank of Japan maintains ultra-loose policy but signals gradual normalization. Yen carry trade remains dominant theme. Nikkei 225 surpasses 1989 record.', impact: 'Yen carry trade flows support global risk assets. Japanese exporters benefit from weak currency competitive advantage.' },
  sydney: { title: 'RBA Watch & Resources', desc: 'ASX 200 supported by resource sector strength. RBA holds rates steady as housing market shows resilience. Iron ore prices stabilize above $100/ton.', impact: 'Australian dollar sensitive to China demand outlook. Mining sector dividends attract income-focused global investors.' },
};

/* ── Conveyor belt intel cards ── */
const CONVEYER_CARDS = [
  { badge: 'Markets', badgeClass: 'markets', title: 'S&P 500 extends rally to 5th consecutive week', time: '45m ago', location: 'New York', icon: 'bi-graph-up', impact: 'high' },
  { badge: 'Central Banks', badgeClass: 'fed', title: 'Fed Chair Powell: Policy appropriately restrictive, watching data', time: '2h ago', location: 'Washington', icon: 'bi-bank', impact: 'high' },
  { badge: 'Asia', badgeClass: 'asia', title: 'Bank of Japan maintains ultra-loose policy; yen at 34-year low', time: '4h ago', location: 'Tokyo', icon: 'bi-currency-yen', impact: 'medium' },
  { badge: 'Bonds', badgeClass: 'bonds', title: 'US Treasury 10Y yield rises to 4.5% on strong jobs data', time: '5h ago', location: 'New York', icon: 'bi-graph-up-arrow', impact: 'high' },
  { badge: 'Commodities', badgeClass: 'commodities', title: 'Oil prices surge on Middle East tensions; Brent above $88', time: '6h ago', location: 'London', icon: 'bi-droplet-half', impact: 'high' },
  { badge: 'Emerging', badgeClass: 'em', title: "India's Sensex hits record high on strong earnings, FDI inflows", time: '8h ago', location: 'Mumbai', icon: 'bi-arrow-up-right', impact: 'medium' },
  { badge: 'Crypto', badgeClass: 'crypto', title: 'Bitcoin ETF inflows reach $12B as institutional adoption accelerates', time: '10h ago', location: 'Global', icon: 'bi-currency-bitcoin', impact: 'medium' },
  { badge: 'China', badgeClass: 'china', title: 'PBOC cuts reserve ratio by 50bp; Shanghai Composite rallies 2.3%', time: '12h ago', location: 'Beijing', icon: 'bi-bank2', impact: 'high' },
  { badge: 'Europe', badgeClass: 'europe', title: 'ECB signals June rate cut as eurozone CPI drops to 2.1%', time: '14h ago', location: 'Frankfurt', icon: 'bi-currency-euro', impact: 'high' },
  { badge: 'Currencies', badgeClass: 'currencies', title: 'DXY strengthens above 105 as rate cut expectations pushed back', time: '16h ago', location: 'Global', icon: 'bi-currency-exchange', impact: 'medium' },
  { badge: 'Volatility', badgeClass: 'volatility', title: 'VIX drops below 14 as equity markets extend calm streak', time: '18h ago', location: 'Chicago', icon: 'bi-activity', impact: 'low' },
  { badge: 'Commodities', badgeClass: 'commodities', title: 'Gold breaks $2,400 as central bank buying continues record pace', time: '20h ago', location: 'London', icon: 'bi-gem', impact: 'high' },
];

const MOCK_ARTICLES = [
  { title: 'Fed Chair Powell Testifies Before Congress on Monetary Policy Outlook', source: 'Reuters', url: '#' },
  { title: 'Global Markets React to Shifting Central Bank Signals on Rate Cuts', source: 'Bloomberg', url: '#' },
  { title: 'Emerging Markets Face Currency Pressure as Dollar Strengthens', source: 'Financial Times', url: '#' },
  { title: 'AI Sector Valuations Draw Comparisons to Dot-Com Era', source: 'WSJ', url: '#' },
];

export default function MarketAnalysisPage() {
  const [selectedDot, setSelectedDot] = useState(null);
  const [activeLayer, setActiveLayer] = useState('markets');
  const [timeRange, setTimeRange] = useState('24h');
  const selectedEvent = selectedDot ? MAP_EVENTS[selectedDot] : null;

  const handleCenterClick = (center) => {
    const id = center.panelId;
    setSelectedDot((prev) => (prev === id ? null : id));
  };

  return (
    <div className={`market-analysis-world-monitor ${selectedDot ? 'has-news-panel' : ''}`}>
      {/* ── Map Panel — 60% of viewport ── */}
      <div className="map-panel">
        <div className="map-header">
          <div className="map-header-top">
            <h2 className="map-title">
              <i className="bi bi-globe2" />
              Global Capital Markets
            </h2>
            <div className="map-header-right">
              <div className="map-live-indicator">
                <span className="live-pulse" />
                <span className="live-text">LIVE</span>
              </div>
              <div className="map-time-range">
                {['24h', '7d', '30d'].map((t) => (
                  <button
                    key={t}
                    type="button"
                    className={`time-range-btn ${timeRange === t ? 'active' : ''}`}
                    onClick={() => setTimeRange(t)}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="map-layers">
            {LAYERS.map((layer) => (
              <button
                key={layer.id}
                type="button"
                className={`layer-pill ${activeLayer === layer.id ? 'active' : ''}`}
                onClick={() => setActiveLayer(layer.id)}
              >
                <i className={`bi ${layer.icon}`} />
                <span>{layer.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="map-container">
          <WorldMap
            lineColor="#10b981"
            selectedPanelId={selectedDot}
            onDotClick={handleCenterClick}
          />
        </div>
      </div>

      {/* ── Horizontal conveyor belt ── */}
      <section className="conveyer-section">
        <div className="conveyer-header">
          <i className="bi bi-broadcast" />
          <span>MARKET INTELLIGENCE</span>
        </div>
        <div className="conveyer-track">
          {[...CONVEYER_CARDS, ...CONVEYER_CARDS].map((card, i) => (
            <div key={i} className="conveyer-card">
              <div className="conveyer-card-header">
                <span className={`intel-badge ${card.badgeClass}`}>
                  <i className={`bi ${card.icon}`} />
                  {card.badge}
                </span>
                <span className="intel-time">{card.time}</span>
              </div>
              <h4 className="conveyer-card-title">{card.title}</h4>
              <div className="conveyer-card-footer">
                <span className="intel-location">
                  <i className="bi bi-geo-alt" /> {card.location}
                </span>
                <span className={`intel-impact ${card.impact}`}>
                  {card.impact === 'high' ? '●●●' : card.impact === 'medium' ? '●●○' : '●○○'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── News panel — slides in from right ── */}
      <div className={`news-panel ${selectedDot ? 'open' : ''}`}>
        <div className="news-panel-header">
          <div className="news-panel-header-left">
            {selectedDot && (
              <span className="news-panel-region-badge">
                <i className="bi bi-geo-alt-fill" />
                {MAP_DOT_LABELS[selectedDot] || selectedDot}
              </span>
            )}
            <h3>{selectedEvent?.title || 'Event Details'}</h3>
          </div>
          <button
            type="button"
            className="news-panel-close"
            onClick={() => setSelectedDot(null)}
            aria-label="Close"
          >
            <i className="bi bi-x-lg" />
          </button>
        </div>
        {selectedEvent && (
          <div className="news-panel-body">
            <div className="news-panel-summary">
              <p>{selectedEvent.desc}</p>
            </div>

            <div className="ai-impact-section">
              <div className="ai-impact-header">
                <i className="bi bi-cpu" />
                <span>AI Impact Assessment</span>
              </div>
              <p>{selectedEvent.impact}</p>
            </div>

            <div className="news-panel-articles">
              <h4 className="news-articles-title">
                <i className="bi bi-newspaper" />
                Related Coverage
              </h4>
              {MOCK_ARTICLES.map((a, i) => (
                <a key={i} href={a.url} target="_blank" rel="noopener noreferrer" className="news-article-item">
                  <span className="news-article-title">{a.title}</span>
                  <span className="news-article-source">{a.source}</span>
                  <i className="bi bi-arrow-up-right" />
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
