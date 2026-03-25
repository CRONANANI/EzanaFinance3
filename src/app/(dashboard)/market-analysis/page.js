'use client';

import { useState, useRef, useEffect } from 'react';
import { WorldMap } from '@/components/ui/world-map';
import {
  PANEL_ID_TO_CITY_KEY,
  PANEL_ID_TO_FINHUB_CITY_ID,
} from '@/config/cityNewsSources';

import '../../../../app-legacy/assets/css/theme.css';
import '../../../../app-legacy/assets/css/unified-component-cards.css';
import '../../../../app-legacy/assets/css/pages-common.css';
import '../../../../app-legacy/assets/css/light-mode-fixes.css';
import './market-analysis-world-monitor.css';

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

const FINANCIAL_CITIES = [
  { id: 'toronto', name: 'Toronto', country: 'Canada', exchange: 'TSX', timezone: 'EST' },
  { id: 'new-york', name: 'New York', country: 'United States', exchange: 'NYSE / NASDAQ', timezone: 'EST' },
  { id: 'boston', name: 'Boston', country: 'United States', exchange: 'Biotech / Education', timezone: 'EST' },
  { id: 'sao-paulo', name: 'São Paulo', country: 'Brazil', exchange: 'B3', timezone: 'BRT' },
  { id: 'santiago', name: 'Santiago', country: 'Chile', exchange: 'SSE', timezone: 'CLT' },
  { id: 'lima', name: 'Lima', country: 'Peru', exchange: 'BVL', timezone: 'PET' },
  { id: 'bogota', name: 'Bogotá', country: 'Colombia', exchange: 'BVC', timezone: 'COT' },
  { id: 'medellin', name: 'Medellín', country: 'Colombia', exchange: 'BVC', timezone: 'COT' },
  { id: 'buenos-aires', name: 'Buenos Aires', country: 'Argentina', exchange: 'BYMA', timezone: 'ART' },
  { id: 'london', name: 'London', country: 'United Kingdom', exchange: 'LSE', timezone: 'GMT' },
  { id: 'frankfurt', name: 'Frankfurt', country: 'Germany', exchange: 'Deutsche Börse', timezone: 'CET' },
  { id: 'dubai', name: 'Dubai', country: 'UAE', exchange: 'DFM', timezone: 'GST' },
  { id: 'mumbai', name: 'Mumbai', country: 'India', exchange: 'BSE / NSE', timezone: 'IST' },
  { id: 'singapore', name: 'Singapore', country: 'Singapore', exchange: 'SGX', timezone: 'SGT' },
  { id: 'hong-kong', name: 'Hong Kong', country: 'China', exchange: 'HKEX', timezone: 'HKT' },
  { id: 'shanghai', name: 'Shanghai', country: 'China', exchange: 'SSE', timezone: 'CST' },
  { id: 'tokyo', name: 'Tokyo', country: 'Japan', exchange: 'TSE', timezone: 'JST' },
  { id: 'sydney', name: 'Sydney', country: 'Australia', exchange: 'ASX', timezone: 'AEST' },
  { id: 'auckland', name: 'Auckland', country: 'New Zealand', exchange: 'NZX', timezone: 'NZDT' },
  { id: 'melbourne', name: 'Melbourne', country: 'Australia', exchange: 'ASX', timezone: 'AEST' },
  { id: 'johannesburg', name: 'Johannesburg', country: 'South Africa', exchange: 'JSE', timezone: 'SAST' },
  { id: 'addis-ababa', name: 'Addis Ababa', country: 'Ethiopia', exchange: 'ESX', timezone: 'EAT' },
  { id: 'lagos', name: 'Lagos', country: 'Nigeria', exchange: 'NGX', timezone: 'WAT' },
  { id: 'nairobi', name: 'Nairobi', country: 'Kenya', exchange: 'NSE', timezone: 'EAT' },
  { id: 'moscow', name: 'Moscow', country: 'Russia', exchange: 'MOEX', timezone: 'MSK' },
  { id: 'paris', name: 'Paris', country: 'France', exchange: 'Euronext', timezone: 'CET' },
  { id: 'tel-aviv', name: 'Tel Aviv', country: 'Israel', exchange: 'TASE', timezone: 'IST' },
  { id: 'miami', name: 'Miami', country: 'United States', exchange: 'Fintech Hub', timezone: 'EST' },
  { id: 'san-francisco', name: 'San Francisco', country: 'United States', exchange: 'VC / Tech', timezone: 'PST' },
  { id: 'chicago', name: 'Chicago', country: 'United States', exchange: 'CME / CBOE', timezone: 'CST' },
  { id: 'seoul', name: 'Seoul', country: 'South Korea', exchange: 'KRX', timezone: 'KST' },
  { id: 'geneva', name: 'Geneva', country: 'Switzerland', exchange: 'SIX', timezone: 'CET' },
  { id: 'dublin', name: 'Dublin', country: 'Ireland', exchange: 'Euronext Dublin', timezone: 'GMT' },
  { id: 'stockholm', name: 'Stockholm', country: 'Sweden', exchange: 'Nasdaq Nordic', timezone: 'CET' },
  { id: 'montreal', name: 'Montreal', country: 'Canada', exchange: 'TMX / MX', timezone: 'EST' },
  { id: 'hamilton', name: 'Hamilton', country: 'Bermuda', exchange: 'BSX', timezone: 'AST' },
];

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

function CityNewsPanel({ panelId, onClose }) {
  const finhubCityId = panelId ? PANEL_ID_TO_FINHUB_CITY_ID[panelId] : null;
  const cityKey = panelId ? PANEL_ID_TO_CITY_KEY[panelId] : null;
  const city = finhubCityId ? FINANCIAL_CITIES.find((c) => c.id === finhubCityId) : null;

  const [regional, setRegional] = useState(null);
  const [news, setNews] = useState([]);
  const [loadingRegional, setLoadingRegional] = useState(true);
  const [loadingNews, setLoadingNews] = useState(true);

  useEffect(() => {
    if (!cityKey) {
      setRegional(null);
      setLoadingRegional(false);
      return;
    }
    setLoadingRegional(true);
    fetch(`/api/news/city?city=${encodeURIComponent(cityKey)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        setRegional(data);
        setLoadingRegional(false);
      })
      .catch(() => {
        setRegional(null);
        setLoadingRegional(false);
      });
  }, [cityKey]);

  useEffect(() => {
    if (!finhubCityId) {
      setNews([]);
      setLoadingNews(false);
      return;
    }
    setLoadingNews(true);
    fetch(`/api/market-data/city-news?city=${encodeURIComponent(finhubCityId)}`)
      .then((res) => res.json())
      .then((data) => {
        setNews(data.news || []);
        setLoadingNews(false);
      })
      .catch(() => setLoadingNews(false));
  }, [finhubCityId]);

  const timeAgo = (unixOrIso) => {
    const ms = typeof unixOrIso === 'number'
      ? Date.now() - unixOrIso * 1000
      : Date.now() - new Date(unixOrIso).getTime();
    const mins = Math.floor(ms / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  if (!city || !cityKey) return null;

  const displayName = regional?.city || city.name;
  const displayRegion = regional?.region;

  return (
    <div className="ma-city-panel">
      <div className="ma-city-panel-header">
        <div>
          <h3 className="ma-city-panel-name">{displayName}</h3>
          <span className="ma-city-panel-meta">
            {displayRegion ? `${displayRegion} · ` : ''}{city.country} · {city.exchange} · {city.timezone}
          </span>
        </div>
        <button type="button" className="ma-city-panel-close" onClick={onClose} aria-label="Close"><i className="bi bi-x-lg" /></button>
      </div>

      <div className="ma-city-panel-body">
        <div className="ma-city-panel-section-label">Regional financial news sources</div>
        {loadingRegional ? (
          <div style={{ padding: '1rem', textAlign: 'center', color: '#4b5563', fontSize: '0.625rem', fontFamily: 'var(--font-mono, monospace)' }}>
            Loading sources…
          </div>
        ) : regional?.sources?.length ? (
          <div className="ma-city-sources">
            {regional.sources.map((source, i) => (
              <div key={`${source.name}-${i}`} className="ma-city-source-card">
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ma-city-source-link"
                >
                  {source.name}
                  {' '}
                  <span aria-hidden>↗</span>
                </a>
                <p className="ma-city-source-focus">{source.focus}</p>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ padding: '0.75rem', color: '#6b7280', fontSize: '0.65rem' }}>No curated sources for this hub.</div>
        )}

        <div className="ma-city-panel-section-label ma-city-panel-section-label--mt">Latest headlines</div>
        <div className="ma-city-panel-count">
          {loadingNews ? 'LOADING…' : `${news.length} ARTICLES (AGGREGATED)`}
        </div>

        <div className="ma-city-panel-list">
          {loadingNews ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#4b5563', fontSize: '0.625rem', fontFamily: 'var(--font-mono, monospace)' }}>
              Fetching latest news…
            </div>
          ) : news.length === 0 ? (
            <div style={{ padding: '1rem', textAlign: 'center', color: '#4b5563', fontSize: '0.625rem', fontFamily: 'var(--font-mono, monospace)' }}>
              No recent headlines. Open a regional source above for live coverage.
            </div>
          ) : (
            news.map((item) => (
              <a key={item.id} href={item.url || '#'} className="ma-city-news-item" target="_blank" rel="noopener noreferrer">
                <div className="ma-city-news-top">
                  <span className="ma-city-news-badge">{item.category}</span>
                  <span className="ma-city-news-time">{timeAgo(item.time)}</span>
                </div>
                <p className="ma-city-news-title">{item.title}</p>
                <span className="ma-city-news-source">{item.source || 'Finnhub'} →</span>
              </a>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function ChainView() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/market-data/economic-calendar')
      .then((res) => res.json())
      .then((data) => {
        setEvents(data.events || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const timeAgo = (isoOrUnix) => {
    const ms = typeof isoOrUnix === 'number'
      ? Date.now() - isoOrUnix * 1000
      : Date.now() - new Date(isoOrUnix).getTime();
    const mins = Math.floor(ms / 60000);
    if (mins < 60) return `~${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `~${hours}h ago`;
    return `~${Math.floor(hours / 24)}d ago`;
  };

  const formatDate = (isoOrUnix) => {
    const d = typeof isoOrUnix === 'number' ? new Date(isoOrUnix * 1000) : new Date(isoOrUnix);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  };

  if (loading) {
    return (
      <div className="ma-chain ma-chain--loading chain-view-scroll custom-scrollbar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: '#4b5563', fontFamily: 'var(--font-mono, monospace)', fontSize: '0.75rem' }}>LOADING CHAIN DATA...</span>
      </div>
    );
  }

  return (
    <div className="ma-chain chain-view-scroll custom-scrollbar">
      <div className="ma-chain-list">
        {events.map((event) => (
          <div key={event.id} className="ma-chain-item">
            <div className="ma-chain-dot" />
            <div className="ma-chain-content">
              <div className="ma-chain-header">
                <span className="ma-chain-title">{event.title}</span>
                <span className="ma-chain-region">{event.country}</span>
                <span className={`ma-chain-severity ${(event.impact || '').toLowerCase()}`}>{event.impact || 'MODERATE'}</span>
                <span className="ma-chain-ago">{timeAgo(event.time)}</span>
              </div>
              <div className="ma-chain-time">{formatDate(event.time)}</div>
              <p className="ma-chain-body">{event.body}</p>
              {event.url && (
                <a href={event.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.5625rem', color: '#10b981', fontFamily: 'var(--font-mono, monospace)', textDecoration: 'none' }}>
                  {event.source || 'Read more'} →
                </a>
              )}
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
  const [tickerData, setTickerData] = useState([]);
  const mapRef = useRef(null);

  useEffect(() => {
    const fetchTicker = async () => {
      try {
        const res = await fetch('/api/market-data/quotes');
        const data = await res.json();
        if (data.quotes) {
          setTickerData(data.quotes.filter((q) => q.price !== '—'));
        }
      } catch (err) {
        console.error('Ticker fetch failed:', err);
      }
    };
    fetchTicker();
    const interval = setInterval(fetchTicker, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleCenterClick = (center) => {
    setSelectedDot((prev) => (prev === center.panelId ? null : center.panelId));
  };

  const toggleCategory = (cat) => {
    setActiveCategory((prev) => (prev === cat ? null : cat));
  };


  useEffect(() => {
    const onKeyDown = (e) => { if (e.key === 'Escape') setSelectedDot(null); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <div className={`ma-fullscreen ${view === 'map' ? 'ma-view-map' : ''} ${view === 'chain' ? 'ma-view-chain' : ''}`}>
      {view === 'map' && (
        <div className="ma-ticker-bar">
          <span className="ma-ticker-live"><span className="ma-ticker-dot" /> LIVE</span>
          <div className="ma-ticker-scroll">
            <div className="ma-ticker-content">
              {tickerData.length === 0 && (
                <span className="ma-ticker-item">
                  <span className="ma-ticker-symbol" style={{ color: '#4b5563' }}>LOADING MARKET DATA...</span>
                </span>
              )}
              {tickerData.map((item, i) => (
                <span key={i} className="ma-ticker-item">
                  <span className="ma-ticker-symbol">{item.symbol}</span>
                  <span className={`ma-ticker-value ${parseFloat(item.change) >= 0 ? 'up' : 'down'}`}>
                    {item.price} {parseFloat(item.change) >= 0 ? '+' : ''}{item.change}%
                  </span>
                  <span className="ma-ticker-sep">•</span>
                </span>
              ))}
              {tickerData.map((item, i) => (
                <span key={`d-${i}`} className="ma-ticker-item">
                  <span className="ma-ticker-symbol">{item.symbol}</span>
                  <span className={`ma-ticker-value ${parseFloat(item.change) >= 0 ? 'up' : 'down'}`}>
                    {item.price} {parseFloat(item.change) >= 0 ? '+' : ''}{item.change}%
                  </span>
                  <span className="ma-ticker-sep">•</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="ma-top-bar">
        <div className="ma-view-toggle">
          <button type="button" className={`ma-view-btn ${view === 'map' ? 'active' : ''}`} onClick={() => setView('map')}>THE MAP</button>
          <button type="button" className={`ma-view-btn ${view === 'chain' ? 'active' : ''}`} onClick={() => setView('chain')}>THE CHAIN</button>
        </div>
      </div>

      {view === 'map' ? (
        <>
          <div className="ma-map-area" onClick={() => setSelectedDot(null)}>
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

          {selectedDot && (
            <CityNewsPanel panelId={selectedDot} onClose={() => setSelectedDot(null)} />
          )}
        </>
      ) : (
        <ChainView />
      )}
    </div>
  );
}
