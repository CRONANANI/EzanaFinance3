'use client';

import { useState, useRef, useEffect } from 'react';
import { WorldMap } from '@/components/ui/world-map';
import {
  PANEL_ID_TO_CITY_KEY,
  PANEL_ID_TO_FINHUB_CITY_ID,
} from '@/config/cityNewsSources';
import {
  MARKETS_DATA,
  CENTRAL_BANKS_DATA,
  CENTRAL_BANKS,
  TRACKED_INDICES,
  INDICES_DATA,
  COMMODITIES_DATA,
  CURRENCIES_DATA,
  hasRecentOrUpcomingCBDecision,
} from '@/config/marketAnalysisData';

import '../../../../app-legacy/assets/css/theme.css';
import '../../../../app-legacy/assets/css/unified-component-cards.css';
import '../../../../app-legacy/assets/css/pages-common.css';
import '../../../../app-legacy/assets/css/light-mode-fixes.css';
import './market-analysis-world-monitor.css';

// Layer configuration mapping
const LAYER_CONFIG = {
  markets: {
    title: 'MARKETS',
    tabs: Object.keys(MARKETS_DATA),
    dataSource: MARKETS_DATA,
  },
  'central-banks': {
    title: 'CENTRAL BANKS',
    tabs: Object.keys(CENTRAL_BANKS_DATA),
    dataSource: CENTRAL_BANKS_DATA,
  },
  indices: {
    title: 'INDICES',
    tabs: Object.keys(INDICES_DATA),
    dataSource: INDICES_DATA,
  },
  commodities: {
    title: 'COMMODITIES',
    tabs: Object.keys(COMMODITIES_DATA),
    dataSource: COMMODITIES_DATA,
  },
  currencies: {
    title: 'CURRENCIES',
    tabs: Object.keys(CURRENCIES_DATA),
    dataSource: CURRENCIES_DATA,
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
];

// Render different content based on tab type
function renderTabContent(tabName, category, tabData) {
  if (!tabData) return null;

  const displayType = tabData.displayType || tabData.type;

  // SECTORS display
  if (displayType === 'sectors-performance' && tabData.items) {
    return (
      <div className="ma-panel-list">
        {tabData.items.map((item, idx) => (
          <div key={idx} className="ma-panel-item ma-sector-item">
            <div className="ma-panel-item-row">
              <span className="ma-panel-item-dot" />
              <div className="ma-panel-item-info" style={{ flex: 1 }}>
                <span className="ma-panel-item-name">{item.name}</span>
              </div>
              <div className="ma-panel-item-data">
                <span className={`ma-panel-item-change ${item.changeVal >= 0 ? 'positive' : 'negative'}`}>
                  {item.changeVal >= 0 ? '▲' : '▼'} {item.change}
                </span>
              </div>
            </div>
            <div className="ma-sector-bar">
              <div className="ma-sector-bar-fill" style={{ width: `${item.bar}%`, backgroundColor: item.changeVal >= 0 ? '#10b981' : '#f87171' }} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // FUTURES display
  if (displayType === 'futures-table' && tabData.groups) {
    return (
      <div className="ma-panel-list">
        {tabData.groups.map((group, gIdx) => (
          <div key={gIdx}>
            <div style={{ padding: '0.75rem 1rem 0.5rem', fontSize: '0.625rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {group.title}
            </div>
            {group.items.map((item, iIdx) => (
              <div key={`${gIdx}-${iIdx}`} className="ma-panel-item">
                <div className="ma-panel-item-row">
                  <span className="ma-panel-item-dot" />
                  <div className="ma-panel-item-info" style={{ flex: 1 }}>
                    <span className="ma-panel-item-name">{item.name}</span>
                  </div>
                  <div className="ma-panel-item-data">
                    <span className="ma-panel-item-price">{item.value}</span>
                    <span className={`ma-panel-item-change ${item.changeVal >= 0 ? 'positive' : 'negative'}`}>
                      {item.changeVal >= 0 ? '▲' : '▼'} {item.change}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  }

  // PRE-MARKET display
  if (displayType === 'pre-market-table' && tabData.groups) {
    return (
      <div className="ma-panel-list">
        <div style={{ padding: '0.75rem 1rem', fontSize: '0.5625rem', color: '#9ca3af', fontFamily: 'var(--font-mono, monospace)' }}>
          PRE-MARKET SESSION: {tabData.preMarketSession}
        </div>
        {tabData.groups.map((group, gIdx) => (
          <div key={gIdx}>
            <div style={{ padding: '0.75rem 1rem 0.5rem', fontSize: '0.625rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {group.title}
            </div>
            {group.items.map((item, iIdx) => (
              <div key={`${gIdx}-${iIdx}`} className="ma-panel-item">
                <div className="ma-panel-item-row">
                  <span className="ma-panel-item-dot" />
                  <div className="ma-panel-item-info" style={{ flex: 1 }}>
                    <span className="ma-panel-item-name">{item.name}</span>
                    {item.note && <span style={{ fontSize: '0.5rem', color: '#9ca3af', marginLeft: '0.5rem' }}>({item.note})</span>}
                  </div>
                  <div className="ma-panel-item-data">
                    <span className="ma-panel-item-price">{item.value}</span>
                    <span className={`ma-panel-item-change ${item.changeVal >= 0 ? 'positive' : 'negative'}`}>
                      {item.changeVal >= 0 ? '▲' : '▼'} {item.change}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  }

  // RATE DECISIONS display
  if (displayType === 'rate-decisions-table') {
    return (
      <div className="ma-panel-list">
        <div style={{ padding: '0.75rem 1rem 0.5rem', fontSize: '0.625rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Upcoming Rate Decisions
        </div>
        {tabData.upcoming && tabData.upcoming.map((item, idx) => (
          <div key={`u-${idx}`} className="ma-panel-item">
            <div className="ma-panel-item-row">
              <span className="ma-panel-item-dot" />
              <div className="ma-panel-item-info" style={{ flex: 1 }}>
                <span className="ma-panel-item-name">{item.bank}</span>
                <span className="ma-panel-item-region">{item.date} · {item.current}</span>
              </div>
              <div className="ma-panel-item-data">
                <span style={{ fontSize: '0.75rem', color: '#10b981' }}>Expected: {item.expected}</span>
              </div>
            </div>
          </div>
        ))}
        <div style={{ padding: '0.75rem 1rem 0.5rem', fontSize: '0.625rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '1rem' }}>
          Recent Decisions
        </div>
        {tabData.recent && tabData.recent.map((item, idx) => (
          <div key={`r-${idx}`} className="ma-panel-item">
            <div className="ma-panel-item-row">
              <span className="ma-panel-item-dot" />
              <div className="ma-panel-item-info" style={{ flex: 1 }}>
                <span className="ma-panel-item-name">{item.bank}</span>
                <span className="ma-panel-item-region">{item.date}</span>
              </div>
              <div className="ma-panel-item-data">
                <span style={{ fontSize: '0.75rem' }}>{item.decision} {item.outcome}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // SPEECHES display
  if (displayType === 'speeches-table') {
    return (
      <div className="ma-panel-list">
        <div style={{ padding: '0.75rem 1rem 0.5rem', fontSize: '0.625rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Upcoming Speeches
        </div>
        {tabData.upcoming && tabData.upcoming.map((item, idx) => (
          <div key={`u-${idx}`} className="ma-panel-item">
            <div className="ma-panel-item-row">
              <span className="ma-panel-item-dot" />
              <div className="ma-panel-item-info" style={{ flex: 1 }}>
                <span className="ma-panel-item-name">{item.official}</span>
                <span className="ma-panel-item-region">{item.title} · {item.location}</span>
              </div>
              <div className="ma-panel-item-data">
                <span style={{ fontSize: '0.75rem', color: '#10b981' }}>{item.date}</span>
              </div>
            </div>
          </div>
        ))}
        <div style={{ padding: '0.75rem 1rem 0.5rem', fontSize: '0.625rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '1rem' }}>
          Recent Speeches
        </div>
        {tabData.recent && tabData.recent.map((item, idx) => (
          <div key={`r-${idx}`} className="ma-panel-item">
            <div className="ma-panel-item-row">
              <span className="ma-panel-item-dot" />
              <div className="ma-panel-item-info" style={{ flex: 1 }}>
                <span className="ma-panel-item-name">{item.official}</span>
                <span className="ma-panel-item-region">{item.title} · {item.location}</span>
              </div>
              <div className="ma-panel-item-data">
                <span style={{ fontSize: '0.75rem' }}>{item.date}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // COMMODITIES display
  if (displayType === 'commodities-list' && tabData.items) {
    return (
      <div className="ma-panel-list">
        {tabData.items.map((item, idx) => (
          <div key={idx} className="ma-panel-item">
            <div className="ma-panel-item-row">
              <span className="ma-panel-item-dot" />
              <div className="ma-panel-item-info" style={{ flex: 1 }}>
                <span className="ma-panel-item-name">{item.name}</span>
                <span className="ma-panel-item-region">{item.symbol}</span>
              </div>
              <div className="ma-panel-item-data">
                <span className="ma-panel-item-price">{item.value}</span>
                <span className={`ma-panel-item-change ${item.changeVal >= 0 ? 'positive' : 'negative'}`}>
                  {item.changeVal >= 0 ? '▲' : '▼'} {item.change}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // CURRENCIES display
  if (displayType === 'currency-list' || (tabData.items && !displayType)) {
    return (
      <div className="ma-panel-list">
        {tabData.items && tabData.items.map((item, idx) => (
          <div key={idx} className="ma-panel-item">
            <div className="ma-panel-item-row">
              <span className="ma-panel-item-dot" />
              <div className="ma-panel-item-info" style={{ flex: 1 }}>
                <span className="ma-panel-item-name">{item.emoji} {item.code} - {item.country}</span>
              </div>
              <div className="ma-panel-item-data">
                <span className="ma-panel-item-price">{item.value}</span>
                <span className={`ma-panel-item-change ${item.changeVal >= 0 ? 'positive' : 'negative'}`}>
                  {item.changeVal >= 0 ? '▲' : '▼'} {item.change}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Default: indices or generic item list
  if (tabData.items) {
    return (
      <div className="ma-panel-list">
        {tabData.items.map((item, idx) => (
          <div key={idx} className="ma-panel-item">
            <div className="ma-panel-item-row">
              <span className="ma-panel-item-dot" />
              <div className="ma-panel-item-info" style={{ flex: 1 }}>
                <span className="ma-panel-item-name">{item.name}</span>
                {item.region && <span className="ma-panel-item-region">{item.region}</span>}
              </div>
              <div className="ma-panel-item-data">
                {item.price && <span className="ma-panel-item-price">{item.price}</span>}
                {item.change && <span className={`ma-panel-item-change ${item.changeVal >= 0 ? 'positive' : 'negative'}`}>
                  {item.changeVal >= 0 ? '▲' : '▼'} {item.change}
                </span>}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return <div style={{ padding: '1rem', color: '#6b7280' }}>No data available</div>;
}

function CategoryPanel({ category, onClose }) {
  const [minimized, setMinimized] = useState(false);
  const layerConfig = LAYER_CONFIG[category];
  const [activeTab, setActiveTab] = useState(layerConfig?.tabs?.[0] || '');

  if (!layerConfig) return null;

  const tabData = layerConfig.dataSource[activeTab];

  if (minimized) {
    return (
      <div className="ma-panel ma-panel-minimized" style={{ cursor: 'pointer' }} onClick={() => setMinimized(false)}>
        <span className="ma-panel-dot" /> {layerConfig.title}
      </div>
    );
  }

  return (
    <div className="ma-panel">
      <div className="ma-panel-header">
        <span><span className="ma-panel-dot" /> {layerConfig.title}</span>
        <div className="ma-panel-actions">
          <button type="button" onClick={() => setMinimized(true)} title="Minimize">—</button>
          <button type="button" onClick={onClose} title="Close">✕</button>
        </div>
      </div>
      <div className="ma-panel-tabs">
        {layerConfig.tabs.map((tab) => (
          <button key={tab} type="button" className={`ma-panel-tab ${activeTab === tab ? 'active' : ''}`} onClick={() => setActiveTab(tab)}>
            {tab.toUpperCase()}
          </button>
        ))}
      </div>
      {renderTabContent(activeTab, category, tabData)}
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
  const [analyzeEvent, setAnalyzeEvent] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState('');
  const [toast, setToast] = useState(null);

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

  const handleAnalyze = async (event) => {
    setAnalyzeEvent(event);
    setAnalyzing(true);
    setAnalysis('');

    try {
      const res = await fetch('/api/market-data/analyze-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventTitle: event.title,
          eventBody: event.body,
          eventUrl: event.url,
          eventCountry: event.country,
        }),
      });
      const data = await res.json();
      setAnalysis(data.analysis || 'Analysis unavailable.');
    } catch {
      setAnalysis('Failed to analyze. Please try again.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleAddToDebrief = async (event, analysis) => {
    try {
      const res = await fetch('/api/debrief-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_title: event.title,
          event_body: event.body,
          event_country: event.country,
          event_url: event.url,
          event_time: event.time,
          analysis,
        }),
      });
      if (!res.ok) throw new Error('Failed to save');
      setToast({ type: 'success', message: '✓ Event added to Debrief' });
      setAnalyzeEvent(null);
      setTimeout(() => setToast(null), 3000);
    } catch (err) {
      setToast({ type: 'error', message: '✗ Failed to add to Debrief' });
      setTimeout(() => setToast(null), 3000);
    }
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
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginTop: '0.5rem' }}>
                {event.url && (
                  <a href={event.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.5625rem', color: '#10b981', fontFamily: 'var(--font-mono, monospace)', textDecoration: 'none' }}>
                    {event.source || 'Read more'} →
                  </a>
                )}
                <button
                  onClick={() => handleAnalyze(event)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '4px 10px',
                    background: 'rgba(212, 175, 55, 0.15)',
                    border: '1px solid rgba(212, 175, 55, 0.3)',
                    borderRadius: '4px',
                    color: '#D4AF37',
                    fontSize: '0.625rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    fontFamily: 'var(--font-mono, monospace)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(212, 175, 55, 0.25)';
                    e.currentTarget.style.borderColor = '#D4AF37';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(212, 175, 55, 0.15)';
                    e.currentTarget.style.borderColor = 'rgba(212, 175, 55, 0.3)';
                  }}
                >
                  <i className="bi bi-lightning-charge-fill" style={{ fontSize: '0.6rem' }} />
                  Analyze
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {analyzeEvent && (
        <>
          <div onClick={() => setAnalyzeEvent(null)} style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.85)', zIndex: 9998,
            backdropFilter: 'blur(4px)',
          }} />
          <div style={{
            position: 'fixed', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 'calc(100% - 4rem)', maxWidth: '1600px', maxHeight: '80vh',
            background: '#111',
            border: '1px solid #D4AF37',
            borderRadius: '12px',
            overflow: 'hidden',
            zIndex: 9999,
          }}>
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '1.25rem 1.5rem', borderBottom: '1px solid #222',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="bi bi-lightning-charge-fill" style={{ color: '#D4AF37' }} />
                <h3 style={{ color: '#fff', fontSize: '1rem', fontWeight: '600' }}>Event Analysis</h3>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button 
                  onClick={() => handleAddToDebrief(analyzeEvent, analysis)}
                  title="Add to Debrief"
                  style={{
                    background: 'rgba(212, 175, 55, 0.15)',
                    border: '1px solid rgba(212, 175, 55, 0.3)',
                    borderRadius: '6px',
                    padding: '6px 10px',
                    color: '#D4AF37',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '0.85rem',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(212, 175, 55, 0.25)';
                    e.currentTarget.style.borderColor = '#D4AF37';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(212, 175, 55, 0.15)';
                    e.currentTarget.style.borderColor = 'rgba(212, 175, 55, 0.3)';
                  }}
                >
                  <i className="bi bi-plus-lg" style={{ fontSize: '0.7rem' }} />
                  Add to Debrief
                </button>
                <button onClick={() => setAnalyzeEvent(null)} style={{
                  background: 'none', border: 'none', color: '#888', fontSize: '1.5rem', cursor: 'pointer',
                }}>×</button>
              </div>
            </div>
            <div style={{ padding: '1.5rem', overflowY: 'auto', maxHeight: 'calc(80vh - 60px)' }}>
              <h4 style={{ color: '#D4AF37', fontSize: '0.85rem', marginBottom: '0.5rem' }}>{analyzeEvent.title}</h4>
              <p style={{ color: '#666', fontSize: '0.8rem', marginBottom: '1.5rem' }}>{analyzeEvent.country} · {formatDate(analyzeEvent.time)}</p>
              
              {analyzing ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#888' }}>
                  <i className="bi bi-lightning-charge-fill" style={{ fontSize: '1.5rem', color: '#D4AF37', display: 'block', marginBottom: '0.5rem' }} />
                  Analyzing impact on your portfolio...
                </div>
              ) : (
                <div style={{ color: '#ccc', fontSize: '0.85rem', lineHeight: '1.7', whiteSpace: 'pre-line' }}>
                  {analysis}
                </div>
              )}
            </div>
          </div>
        </>
      )}
      
      {toast && (
        <div style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          padding: '12px 16px',
          borderRadius: '8px',
          background: toast.type === 'success' ? 'rgba(16, 185, 129, 0.9)' : 'rgba(239, 68, 68, 0.9)',
          color: '#fff',
          fontSize: '0.85rem',
          fontWeight: '500',
          zIndex: 10000,
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          animation: 'slideIn 0.3s ease-out',
        }}>
          {toast.message}
        </div>
      )}
    </div>
  );
}

export default function MarketAnalysisPage() {
  const [view, setView] = useState('map');
  const [activeCategory, setActiveCategory] = useState(null);
  const [activeTab, setActiveTab] = useState(null);
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
    const newCat = activeCategory === cat ? null : cat;
    setActiveCategory(newCat);
    // Update map styling
    if (mapRef.current) {
      mapRef.current.setActiveLayers && mapRef.current.setActiveLayers(newCat);
    }
    // Update active tab when switching layers
    if (newCat && LAYER_CONFIG[newCat]) {
      setActiveTab(LAYER_CONFIG[newCat].tabs[0]);
    }
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
              activeLayer={activeCategory}
              activeLayerTab={activeTab}
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
