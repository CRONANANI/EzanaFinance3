'use client';

import { useState, useRef } from 'react';
import { WorldMap } from '@/components/ui/world-map';

import '../../../../app-legacy/assets/css/theme.css';
import '../../../../app-legacy/assets/css/unified-component-cards.css';
import '../../../../app-legacy/assets/css/pages-common.css';
import '../../../../app-legacy/assets/css/light-mode-fixes.css';
import './market-analysis-world-monitor.css';

const TICKER_DATA = [
  { symbol: 'S&P 500', price: '5,892.34', change: 0.45, changePercent: '+0.45' },
  { symbol: 'NASDAQ', price: '18,743.21', change: 0.72, changePercent: '+0.72' },
  { symbol: 'DOW', price: '43,127.89', change: -0.18, changePercent: '-0.18' },
  { symbol: 'FTSE 100', price: '8,234.56', change: 0.31, changePercent: '+0.31' },
  { symbol: 'DAX', price: '19,456.78', change: 0.58, changePercent: '+0.58' },
  { symbol: 'CAC 40', price: '7,891.23', change: -0.12, changePercent: '-0.12' },
  { symbol: 'NIKKEI 225', price: '39,234.56', change: 1.24, changePercent: '+1.24' },
  { symbol: 'HANG SENG', price: '17,892.34', change: -0.87, changePercent: '-0.87' },
  { symbol: 'SHANGHAI', price: '3,089.45', change: 0.34, changePercent: '+0.34' },
  { symbol: 'SENSEX', price: '73,456.78', change: 0.65, changePercent: '+0.65' },
  { symbol: 'ASX 200', price: '7,823.45', change: 0.22, changePercent: '+0.22' },
  { symbol: 'TSX', price: '22,345.67', change: 0.18, changePercent: '+0.18' },
  { symbol: 'BOVESPA', price: '128,456.78', change: -0.45, changePercent: '-0.45' },
  { symbol: 'KOSPI', price: '2,634.12', change: 0.89, changePercent: '+0.89' },
  { symbol: 'GOLD', price: '2,178.34', change: 0.15, changePercent: '+0.15' },
  { symbol: 'OIL WTI', price: '78.45', change: -1.23, changePercent: '-1.23' },
  { symbol: 'EUR/USD', price: '1.0876', change: 0.08, changePercent: '+0.08' },
  { symbol: 'BTC/USD', price: '87,234.56', change: 2.34, changePercent: '+2.34' },
];

const MARKET_INTEL_CARDS = [
  { badge: 'Markets', badgeClass: 'markets', title: 'S&P 500 extends rally to 5th consecutive week', time: '45m ago', location: 'New York' },
  { badge: 'Central Banks', badgeClass: 'fed', title: 'Fed Chair Powell: Policy appropriately restrictive', time: '2h ago', location: 'Washington' },
  { badge: 'Asia', badgeClass: 'asia', title: 'Bank of Japan maintains ultra-loose policy; yen at 34-year low', time: '4h ago', location: 'Tokyo' },
  { badge: 'Bonds', badgeClass: 'bonds', title: 'US Treasury 10Y yield rises to 4.5% on strong jobs data', time: '5h ago', location: 'New York' },
  { badge: 'Commodities', badgeClass: 'commodities', title: 'Oil prices surge on Middle East tensions; Brent above $88', time: '6h ago', location: 'London' },
  { badge: 'Emerging', badgeClass: 'em', title: "India's Sensex hits record high on strong earnings", time: '8h ago', location: 'Mumbai' },
];

const CATEGORY_DATA = {
  markets: {
    title: 'MARKETS',
    tabs: ['Major Indices', 'Sectors', 'Futures', 'Pre-Market'],
    items: [
      { id: 'sp500', name: 'S&P 500', region: 'United States', price: '5,892.34', change: '+0.45%', status: 'OPEN', summary: 'Extended rally to 5th consecutive week. Tech and healthcare leading gains.' },
      { id: 'nasdaq', name: 'NASDAQ Composite', region: 'United States', price: '18,743.21', change: '+0.72%', status: 'OPEN', summary: 'AI and semiconductor stocks driving momentum. New 52-week high.' },
      { id: 'djia', name: 'Dow Jones', region: 'United States', price: '43,127.89', change: '-0.18%', status: 'OPEN', summary: 'Industrials and energy weigh on index. Financials mixed.' },
      { id: 'ftse', name: 'FTSE 100', region: 'United Kingdom', price: '8,234.56', change: '+0.31%', status: 'OPEN', summary: 'Mining stocks boost index. BOE rate decision pending.' },
      { id: 'dax', name: 'DAX 40', region: 'Germany', price: '19,456.78', change: '+0.58%', status: 'CLOSED', summary: 'Automotive sector recovery lifts index. ECB dovish signals.' },
      { id: 'nikkei', name: 'Nikkei 225', region: 'Japan', price: '39,234.56', change: '+1.24%', status: 'CLOSED', summary: 'Yen weakness supports exporters. BOJ maintains ultra-loose policy.' },
    ],
  },
  'central-banks': {
    title: 'CENTRAL BANKS',
    tabs: ['Rate Decisions', 'Speeches', 'Minutes', 'Forecasts'],
    items: [
      { id: 'fed', name: 'Federal Reserve', region: 'United States', price: '4.25-4.50%', change: 'Hold', status: 'NEXT: Jun 18', summary: 'Powell signals patience. Inflation remains above target. 2 cuts priced for 2026.' },
      { id: 'ecb', name: 'European Central Bank', region: 'Eurozone', price: '2.65%', change: '-25bp', status: 'NEXT: Apr 17', summary: 'Lagarde dovish pivot. Growth concerns outweigh inflation risks.' },
      { id: 'boj', name: 'Bank of Japan', region: 'Japan', price: '0.50%', change: 'Hold', status: 'NEXT: May 1', summary: 'Ultra-loose maintained. Yen at 34-year low against USD.' },
    ],
  },
  indices: {
    title: 'INDICES',
    tabs: ['Global', 'Americas', 'Europe', 'Asia-Pacific'],
    items: [
      { id: 'vix', name: 'VIX', region: 'Global', price: '14.32', change: '-3.2%', status: 'LOW', summary: 'Volatility near 2-year lows. Complacency risk building.' },
      { id: 'russell', name: 'Russell 2000', region: 'United States', price: '2,089.45', change: '+0.92%', status: 'OPEN', summary: 'Small caps outperforming. Regional bank recovery.' },
    ],
  },
  commodities: {
    title: 'COMMODITIES',
    tabs: ['Energy', 'Metals', 'Agriculture', 'Futures'],
    items: [
      { id: 'gold', name: 'Gold', region: 'Global', price: '$2,178.34', change: '+0.15%', status: 'TRADING', summary: 'Safe haven demand on geopolitical tensions. Central bank buying.' },
      { id: 'wti', name: 'Crude Oil (WTI)', region: 'Global', price: '$78.45', change: '-1.23%', status: 'TRADING', summary: 'OPEC+ cuts offset by US production growth. Demand concerns.' },
    ],
  },
  currencies: {
    title: 'CURRENCIES',
    tabs: ['Major Pairs', 'Crosses', 'Emerging', 'Crypto'],
    items: [
      { id: 'eurusd', name: 'EUR/USD', region: 'Global', price: '1.0876', change: '+0.08%', status: 'TRADING', summary: 'ECB rate differential narrowing. Euro recovery on growth data.' },
      { id: 'btcusd', name: 'BTC/USD', region: 'Crypto', price: '$87,234', change: '+2.34%', status: 'TRADING', summary: 'Institutional inflows via ETFs. Halving cycle momentum.' },
    ],
  },
};

const CHAIN_EVENTS = [
  { id: 1, title: 'S&P 500 EXTENDS RALLY', region: 'United States', severity: 'POSITIVE', time: 'Mar 20, afternoon', ago: '~45m ago', body: 'S&P 500 extends rally to 5th consecutive week on strong earnings and AI sector momentum. Technology and healthcare sectors leading gains.' },
  { id: 2, title: 'FED CHAIR POWELL TESTIMONY', region: 'United States', severity: 'CRITICAL', time: 'Mar 20, morning', ago: '~2h ago', body: 'Powell maintains restrictive stance, saying policy is "appropriately restrictive" and the Fed is watching data carefully before any rate adjustments.' },
  { id: 3, title: 'BANK OF JAPAN RATE DECISION', region: 'Japan', severity: 'ELEVATED', time: 'Mar 20, early morning', ago: '~4h ago', body: 'BOJ maintains ultra-loose monetary policy. Yen falls to 34-year low against USD at 158.31. Intervention risk elevated.' },
  { id: 4, title: 'US TREASURY 10Y YIELD RISES', region: 'United States', severity: 'ELEVATED', time: 'Mar 20, morning', ago: '~5h ago', body: 'US Treasury 10-year yield rises to 4.5% on strong jobs data. Bond market pricing in fewer rate cuts for 2026.' },
  { id: 5, title: 'OIL PRICES SURGE', region: 'Global', severity: 'CRITICAL', time: 'Mar 20, early morning', ago: '~6h ago', body: 'Oil prices surge on Middle East tensions. Brent crude above $88. OPEC+ maintains production cuts through Q2 2026.' },
];

const MAP_DOT_LABELS = {
  newyork: 'New York', toronto: 'Toronto', saopaulo: 'São Paulo', london: 'London',
  frankfurt: 'Frankfurt', dubai: 'Dubai', mumbai: 'Mumbai', singapore: 'Singapore',
  hongkong: 'Hong Kong', shanghai: 'Shanghai', tokyo: 'Tokyo', sydney: 'Sydney',
};

const MAP_EVENTS = {
  newyork: { title: 'Fed Policy & US Markets', desc: 'Federal Reserve signals data-dependent approach to rate cuts. S&P 500 near all-time highs with AI sector leading gains.', impact: 'Moderate impact on global risk sentiment.' },
  toronto: { title: 'Bank of Canada Easing', desc: 'BoC continues easing cycle with rates below Fed. Canadian dollar under pressure as commodity prices stabilize.', impact: 'CAD weakness supports Canadian exporters.' },
  saopaulo: { title: 'Brazil Fiscal Concerns', desc: 'Ibovespa faces headwinds from fiscal policy uncertainty. Real weakens as budget deficit concerns mount.', impact: 'EM sentiment cautious.' },
  london: { title: 'BoE Dovish Pivot', desc: 'UK gilt yields fall as BoE signals dovish pivot. Sterling faces pressure as growth outlook weakens.', impact: 'UK bonds rally.' },
  frankfurt: { title: 'ECB Rate Path', desc: 'ECB signals potential rate cut in June as eurozone inflation cools toward 2% target. DAX reaches new highs.', impact: 'EUR weakness expected.' },
  dubai: { title: 'Gulf Markets & Oil', desc: 'UAE markets benefit from elevated oil prices and economic diversification. Dubai real estate sector shows continued momentum.', impact: 'Petrodollar flows support regional equity markets.' },
  mumbai: { title: 'India Growth Story', desc: 'Sensex and Nifty at record highs. India GDP growth exceeds 7% as manufacturing and services PMI expand.', impact: 'India emerges as key allocation for global EM funds.' },
  singapore: { title: 'ASEAN Financial Hub', desc: 'SGX benefits from regional capital flows. MAS maintains tight monetary policy as inflation moderates.', impact: 'Regional safe haven status supports SGD.' },
  hongkong: { title: 'China Recovery Play', desc: 'Hang Seng rebounds on PBOC stimulus measures. Tech sector leads recovery as regulatory headwinds ease.', impact: 'Hong Kong serves as proxy for China recovery thesis.' },
  shanghai: { title: 'PBOC Stimulus', desc: 'PBOC cuts reserve ratio to support economy. Shanghai Composite gains as property sector stabilization measures take effect.', impact: 'Chinese equities rally.' },
  tokyo: { title: 'BOJ Policy Normalization', desc: 'Bank of Japan maintains ultra-loose policy but signals gradual normalization. Yen carry trade remains dominant theme.', impact: 'Yen carry trade flows support global risk assets.' },
  sydney: { title: 'RBA Watch & Resources', desc: 'ASX 200 supported by resource sector strength. RBA holds rates steady as housing market shows resilience.', impact: 'Australian dollar sensitive to China demand outlook.' },
};

function CategoryPanel({ category, onClose }) {
  const [expanded, setExpanded] = useState(null);
  const [minimized, setMinimized] = useState(false);
  const data = CATEGORY_DATA[category];
  const [activeTab, setActiveTab] = useState(data?.tabs?.[0] || '');

  if (!data) return null;
  if (minimized) {
    return (
      <div className="ma-panel ma-panel-minimized" style={{ cursor: 'pointer' }} onClick={() => setMinimized(false)}>
        <span className="ma-panel-dot" /> {data.title}
      </div>
    );
  }

  return (
    <div className="ma-panel">
      <div className="ma-panel-header">
        <span><span className="ma-panel-dot" /> {data.title}</span>
        <div className="ma-panel-actions">
          <button type="button" onClick={() => setMinimized(true)} title="Minimize">—</button>
          <button type="button" onClick={onClose} title="Close">✕</button>
        </div>
      </div>
      <div className="ma-panel-tabs">
        {data.tabs.map((tab) => (
          <button key={tab} type="button" className={`ma-panel-tab ${activeTab === tab ? 'active' : ''}`} onClick={() => setActiveTab(tab)}>
            {tab.toUpperCase()}
          </button>
        ))}
      </div>
      <div className="ma-panel-list">
        {data.items.map((item) => (
          <div key={item.id} className={`ma-panel-item ${expanded === item.id ? 'expanded' : ''}`} onClick={() => setExpanded(expanded === item.id ? null : item.id)}>
            <div className="ma-panel-item-row">
              <span className="ma-panel-item-dot" />
              <div className="ma-panel-item-info">
                <span className="ma-panel-item-name">{item.name}</span>
                <span className="ma-panel-item-region">{item.region}</span>
              </div>
              <div className="ma-panel-item-data">
                <span className="ma-panel-item-price">{item.price}</span>
                <span className={`ma-panel-item-change ${item.change.startsWith('+') || item.change === 'Hold' ? 'positive' : item.change.startsWith('-') ? 'negative' : ''}`}>{item.change}</span>
              </div>
              <span className="ma-panel-item-status">{item.status}</span>
            </div>
            {expanded === item.id && (
              <div className="ma-panel-item-detail">
                <p>{item.summary}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function FilterPanel({ onClose }) {
  const [filters, setFilters] = useState({
    openMarkets: true, closedMarkets: true, americas: true, europe: true,
    asiaPacific: true, middleEast: true, bullish: true, bearish: true,
  });
  const toggle = (key) => setFilters((p) => ({ ...p, [key]: !p[key] }));
  return (
    <div className="ma-panel ma-panel-right">
      <div className="ma-panel-header">
        <span><span className="ma-panel-dot" /> FILTER</span>
        <div className="ma-panel-actions"><button type="button" onClick={onClose}>✕</button></div>
      </div>
      <div className="ma-filter-body">
        <div className="ma-filter-section">
          <h4>MARKET STATUS</h4>
          <label><input type="checkbox" checked={filters.openMarkets} onChange={() => toggle('openMarkets')} /> Open Markets</label>
          <label><input type="checkbox" checked={filters.closedMarkets} onChange={() => toggle('closedMarkets')} /> Closed Markets</label>
        </div>
        <div className="ma-filter-section">
          <h4>REGIONS</h4>
          <label><input type="checkbox" checked={filters.americas} onChange={() => toggle('americas')} /> Americas</label>
          <label><input type="checkbox" checked={filters.europe} onChange={() => toggle('europe')} /> Europe</label>
          <label><input type="checkbox" checked={filters.asiaPacific} onChange={() => toggle('asiaPacific')} /> Asia-Pacific</label>
          <label><input type="checkbox" checked={filters.middleEast} onChange={() => toggle('middleEast')} /> Middle East & Africa</label>
        </div>
        <div className="ma-filter-section">
          <h4>SENTIMENT</h4>
          <label><input type="checkbox" checked={filters.bullish} onChange={() => toggle('bullish')} /> Bullish / Positive</label>
          <label><input type="checkbox" checked={filters.bearish} onChange={() => toggle('bearish')} /> Bearish / Negative</label>
        </div>
        <div className="ma-filter-actions">
          <button type="button" className="ma-filter-reset" onClick={() => setFilters(Object.fromEntries(Object.keys(filters).map((k) => [k, true])))}>RESET ALL</button>
          <button type="button" className="ma-filter-close" onClick={onClose}>CLOSE</button>
        </div>
      </div>
    </div>
  );
}

function SettingsPanel({ onClose }) {
  return (
    <div className="ma-panel ma-panel-right">
      <div className="ma-panel-header">
        <span><span className="ma-panel-dot" /> SETTINGS</span>
        <div className="ma-panel-actions"><button type="button" onClick={onClose}>✕</button></div>
      </div>
      <div className="ma-settings-body">
        <div className="ma-filter-section">
          <h4>TIMEZONE</h4>
          <select className="ma-settings-select"><option>UTC</option><option>EST</option><option>GMT</option><option>JST</option><option>CET</option></select>
        </div>
        <div className="ma-filter-section">
          <h4>DATE FORMAT</h4>
          <select className="ma-settings-select"><option>MM/DD/YYYY — US</option><option>DD/MM/YYYY — EU</option><option>YYYY-MM-DD — ISO</option></select>
        </div>
        <div className="ma-filter-section">
          <h4>TICKER SPEED</h4>
          <select className="ma-settings-select"><option>Slow</option><option>Normal</option><option>Fast</option></select>
        </div>
      </div>
    </div>
  );
}

function ChainView() {
  return (
    <div className="ma-chain">
      <div className="ma-chain-list">
        {CHAIN_EVENTS.map((event) => (
          <div key={event.id} className="ma-chain-item">
            <div className="ma-chain-dot" />
            <div className="ma-chain-content">
              <div className="ma-chain-header">
                <span className="ma-chain-title">{event.title}</span>
                <span className="ma-chain-region">{event.region}</span>
                <span className={`ma-chain-severity ${event.severity.toLowerCase()}`}>{event.severity}</span>
                <span className="ma-chain-ago">{event.ago}</span>
              </div>
              <div className="ma-chain-time">{event.time}</div>
              <p className="ma-chain-body">{event.body}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function MarketAnalysisPage() {
  const [view, setView] = useState('map');
  const [activeCategory, setActiveCategory] = useState(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [selectedDot, setSelectedDot] = useState(null);
  const mapRef = useRef(null);

  const handleCenterClick = (center) => {
    setSelectedDot((prev) => (prev === center.panelId ? null : center.panelId));
  };

  const toggleCategory = (cat) => {
    setActiveCategory((prev) => (prev === cat ? null : cat));
  };

  const selectedEvent = selectedDot ? MAP_EVENTS[selectedDot] : null;

  return (
    <div className="ma-fullscreen">
      <div className="ma-top-bar">
        <div className="ma-view-toggle">
          <button type="button" className={`ma-view-btn ${view === 'map' ? 'active' : ''}`} onClick={() => setView('map')}>THE MAP</button>
          <button type="button" className={`ma-view-btn ${view === 'chain' ? 'active' : ''}`} onClick={() => setView('chain')}>THE CHAIN</button>
        </div>
      </div>

      {view === 'map' ? (
        <>
          <div className="ma-map-area">
            <WorldMap
              ref={mapRef}
              lineColor="#10b981"
              selectedPanelId={selectedDot}
              onDotClick={handleCenterClick}
              hideControls
            />
          </div>

          <div className="ma-sidebar">
            {['markets', 'central-banks', 'indices', 'commodities', 'currencies'].map((cat) => (
              <button key={cat} type="button" className={`ma-sidebar-btn ${activeCategory === cat ? 'active' : ''}`} onClick={() => toggleCategory(cat)}>
                <i className={`bi ${cat === 'markets' ? 'bi-graph-up' : cat === 'central-banks' ? 'bi-bank' : cat === 'indices' ? 'bi-bar-chart-line' : cat === 'commodities' ? 'bi-gem' : 'bi-currency-exchange'}`} />
                {cat.replace('-', ' ').toUpperCase()}
              </button>
            ))}
          </div>

          <div className="ma-controls">
            <button type="button" className="ma-control-btn ma-control-filter" onClick={() => setFilterOpen(true)}>
              <i className="bi bi-funnel" /> FILTER
            </button>
            <button type="button" className="ma-control-btn" onClick={() => mapRef.current?.zoomIn()}>
              <span>+</span> ZOOM IN
            </button>
            <button type="button" className="ma-control-btn" onClick={() => mapRef.current?.zoomOut()}>
              <span>−</span> ZOOM OUT
            </button>
            <button type="button" className="ma-control-btn" onClick={() => mapRef.current?.resetZoom()}>
              <i className="bi bi-arrows-fullscreen" /> RESET
            </button>
            <button type="button" className="ma-control-btn" onClick={() => setSettingsOpen(true)}>
              <i className="bi bi-gear" /> SETTINGS
            </button>
          </div>

          {activeCategory && <CategoryPanel category={activeCategory} onClose={() => setActiveCategory(null)} />}
          {filterOpen && <FilterPanel onClose={() => setFilterOpen(false)} />}
          {settingsOpen && <SettingsPanel onClose={() => setSettingsOpen(false)} />}

          <div className="ma-bottom-cards">
            {MARKET_INTEL_CARDS.map((card, i) => (
              <div key={i} className="ma-bottom-card">
                <span className={`ma-bottom-card-category ${card.badgeClass}`}>{card.badge}</span>
                <h4 className="ma-bottom-card-title">{card.title}</h4>
                <div className="ma-bottom-card-footer">
                  <span className="ma-bottom-card-location">{card.location}</span>
                  <span className="ma-bottom-card-time">{card.time}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="ma-ticker-bar">
            <span className="ma-ticker-live"><span className="ma-ticker-dot" /> LIVE</span>
            <div className="ma-ticker-scroll">
              <div className="ma-ticker-content">
                {[...TICKER_DATA, ...TICKER_DATA].map((item, i) => (
                  <span key={i} className="ma-ticker-item">
                    <span className="ma-ticker-symbol">{item.symbol}</span>
                    <span className={`ma-ticker-price ${item.change >= 0 ? 'positive' : 'negative'}`}>
                      {item.price} {item.change >= 0 ? '+' : ''}{item.changePercent}%
                    </span>
                    <span className="ma-ticker-sep">•</span>
                  </span>
                ))}
              </div>
            </div>
          </div>

          {selectedDot && (
            <div className="ma-news-panel open">
              <div className="ma-news-panel-header">
                <div>
                  <span className="ma-news-panel-badge"><i className="bi bi-geo-alt-fill" /> {MAP_DOT_LABELS[selectedDot] || selectedDot}</span>
                  <h3>{selectedEvent?.title || 'Event Details'}</h3>
                </div>
                <button type="button" className="ma-news-panel-close" onClick={() => setSelectedDot(null)} aria-label="Close"><i className="bi bi-x-lg" /></button>
              </div>
              {selectedEvent && (
                <div className="ma-news-panel-body">
                  <p>{selectedEvent.desc}</p>
                  <div className="ma-news-impact"><strong>AI Impact:</strong> {selectedEvent.impact}</div>
                </div>
              )}
            </div>
          )}
        </>
      ) : (
        <ChainView />
      )}
    </div>
  );
}
