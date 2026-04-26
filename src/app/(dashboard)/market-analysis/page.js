'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { WorldMap, scoreToColor } from '@/components/ui/world-map';
import { useGlobalPowerMap } from '@/hooks/useGlobalPowerMap';
import { buildArticleQuery } from '@/lib/powerMapArticleQueries';
import { ShowMeDataButton } from '@/components/market-analysis/ShowMeDataButton';
import { RelatedMarketsPanel } from '@/components/polymarket/RelatedMarketsPanel';
import { useProGate } from '@/components/upgrade/ProGateContext';
import { useAuth } from '@/components/AuthProvider';

/* WorldMap itself stays eagerly imported because it's the LCP element on
   this route (the dotted world map is the first meaningful paint). Lazy-
   loading it would regress LCP. The surrounding UI — control panel, ISR
   feed, tutorial, modal — is below the fold / interaction-triggered, so
   we dynamic-import those to take ~80 KB off the critical bundle. */
const GlobalPowerMapControl = dynamic(
  () => import('@/components/market-analysis/GlobalPowerMapControl'),
  { ssr: false, loading: () => null }
);
const TutorialOverlay = dynamic(
  () => import('@/components/market-analysis/TutorialOverlay').then((m) => ({ default: m.TutorialOverlay })),
  { ssr: false, loading: () => null }
);
const ISRFeedCard = dynamic(
  () => import('@/components/market-analysis/ISRFeedCard').then((m) => ({ default: m.ISRFeedCard })),
  { ssr: false, loading: () => null }
);
const ISRArticleModal = dynamic(
  () => import('@/components/market-analysis/ISRArticleModal').then((m) => ({ default: m.ISRArticleModal })),
  { ssr: false, loading: () => null }
);
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
import '../centaur-intelligence/centaur-intelligence.css';

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

function CityNewsPanel({ panelId, powerCountry, selectedLayers, countryScores, onClose }) {
  const finhubCityId = panelId ? PANEL_ID_TO_FINHUB_CITY_ID[panelId] : null;
  const cityKey = panelId ? PANEL_ID_TO_CITY_KEY[panelId] : null;
  const city = finhubCityId ? FINANCIAL_CITIES.find((c) => c.id === finhubCityId) : null;

  const [regional, setRegional] = useState(null);
  const [news, setNews] = useState([]);
  const [loadingRegional, setLoadingRegional] = useState(true);
  const [loadingNews, setLoadingNews] = useState(true);

  useEffect(() => {
    if (powerCountry) {
      setRegional(null);
      setLoadingRegional(false);
      return;
    }
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
  }, [cityKey, powerCountry]);

  useEffect(() => {
    if (powerCountry) {
      setLoadingNews(true);
      const q = buildArticleQuery(powerCountry.name, selectedLayers);
      fetch(`/api/market-data/power-map-news?q=${encodeURIComponent(q)}`)
        .then((res) => res.json())
        .then((data) => {
          setNews(data.news || []);
          setLoadingNews(false);
        })
        .catch(() => setLoadingNews(false));
      return;
    }
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
  }, [finhubCityId, powerCountry, selectedLayers]);

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

  if (powerCountry) {
    const powerScore = countryScores?.find((c) => c.iso === powerCountry.iso)?.score;
    return (
      <div className="ma-city-panel">
        <div className="ma-city-panel-header">
          <div>
            <h3 className="ma-city-panel-name">{powerCountry.name}</h3>
            <span className="ma-city-panel-meta">
              {selectedLayers.length} power layer{selectedLayers.length !== 1 ? 's' : ''} selected
            </span>
          </div>
          <button type="button" className="ma-city-panel-close" onClick={onClose} aria-label="Close"><i className="bi bi-x-lg" /></button>
        </div>

        <div className="ma-city-panel-body">
          {selectedLayers.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem', marginBottom: '0.75rem' }}>
              {selectedLayers.map((layer) => (
                <span
                  key={layer}
                  style={{
                    fontSize: '0.65rem',
                    padding: '0.15rem 0.5rem',
                    borderRadius: '9999px',
                    background: 'rgba(168, 85, 247, 0.15)',
                    color: '#c4b5fd',
                    border: '1px solid rgba(168, 85, 247, 0.25)',
                    textTransform: 'capitalize',
                    fontFamily: 'var(--font-mono, monospace)',
                  }}
                >
                  {layer.replace(/_/g, ' ')}
                </span>
              ))}
            </div>
          )}
          {powerScore != null && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '0.65rem', color: '#6b7280' }}>Power score</span>
              <div style={{ flex: 1, height: '6px', background: '#1f2937', borderRadius: '4px', overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    borderRadius: '4px',
                    width: `${powerScore}%`,
                    background: powerScore >= 70 ? '#22c55e' : powerScore >= 45 ? '#facc15' : '#ef4444',
                  }}
                />
              </div>
              <span
                style={{
                  fontSize: '0.65rem',
                  fontFamily: 'var(--font-mono, monospace)',
                  fontWeight: 700,
                  color: powerScore >= 70 ? '#22c55e' : powerScore >= 45 ? '#facc15' : '#ef4444',
                }}
              >
                {powerScore}/100
              </span>
            </div>
          )}

          <div className="ma-city-panel-section-label">Latest headlines</div>
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
                No recent headlines for this query.
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

/** Same paragraph splitting as Sentinel report modal body */
function EventAnalysisProse({ text }) {
  const cleaned = (text || '').trim();
  if (!cleaned) {
    return <p className="sentinel-report-section-body sentinel-report-section-body--empty">—</p>;
  }
  const lines = cleaned.split('\n').map((l) => l.trim()).filter(Boolean);
  return (
    <div className="sentinel-report-section-body">
      {lines.map((line, i) => (
        <p key={i}>{line}</p>
      ))}
    </div>
  );
}

function ChainView() {
  const { openProGate } = useProGate();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [analyzeEvent, setAnalyzeEvent] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState('');
  const [toast, setToast] = useState(null);
  const [showRelatedPm, setShowRelatedPm] = useState(false);

  useEffect(() => {
    if (!analyzeEvent) setShowRelatedPm(false);
  }, [analyzeEvent]);

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

  const formatDateLong = (isoOrUnix) => {
    const d = typeof isoOrUnix === 'number' ? new Date(isoOrUnix * 1000) : new Date(isoOrUnix);
    return d.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const handleAnalyze = async (event) => {
    setAnalyzeEvent(event);
    setShowRelatedPm(false);
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
                  type="button"
                  onClick={openProGate}
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
        <div
          className="sentinel-modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="ma-event-analysis-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setAnalyzeEvent(null);
          }}
        >
          <div className="sentinel-modal-shell ma-event-analysis-shell">
            <header className="sentinel-modal-header">
              <div>
                <p className="sentinel-modal-kicker">Confidential · Portfolio intelligence</p>
                <h2 id="ma-event-analysis-title" className="sentinel-modal-title">
                  Event Analysis
                </h2>
                <p className="sentinel-modal-date">{analyzeEvent.country} · {formatDateLong(analyzeEvent.time)}</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', flexShrink: 0 }}>
                <button
                  type="button"
                  className="ma-event-analysis-debrief-btn"
                  onClick={() => handleAddToDebrief(analyzeEvent, analysis)}
                  title="Add to Debrief"
                >
                  <i className="bi bi-plus-lg" style={{ fontSize: '0.7rem' }} aria-hidden />
                  Add to Debrief
                </button>
                <button
                  type="button"
                  className="sentinel-modal-close"
                  onClick={() => setAnalyzeEvent(null)}
                  aria-label="Close"
                >
                  ×
                </button>
              </div>
            </header>

            <div className="sentinel-modal-main">
              <div className="sentinel-report-section">
                <h3 className="sentinel-report-section-title sentinel-report-section-title--gold">Event</h3>
                <p className="sentinel-report-health-value">{analyzeEvent.title}</p>
                <div className="sentinel-report-section-body">
                  <p>{analyzeEvent.body}</p>
                </div>
              </div>

              <div className="sentinel-related-markets-section">
                <button
                  type="button"
                  onClick={() => setShowRelatedPm((v) => !v)}
                  className="sentinel-related-markets-toggle"
                >
                  <i className="bi bi-graph-up-arrow" />
                  {showRelatedPm ? 'Hide related markets' : 'View related prediction markets'}
                  <i className={`bi ${showRelatedPm ? 'bi-chevron-up' : 'bi-chevron-down'}`} />
                </button>
                {showRelatedPm && (
                  <RelatedMarketsPanel
                    event={{
                      id: analyzeEvent.id,
                      headline: analyzeEvent.title,
                      title: analyzeEvent.title,
                      summary: analyzeEvent.body,
                      description: analyzeEvent.body,
                      country: analyzeEvent.country,
                    }}
                    enabled={showRelatedPm}
                    limit={8}
                    variant="inline"
                  />
                )}
              </div>

              <div className="sentinel-report-section">
                <h3 className="sentinel-report-section-title sentinel-report-section-title--gold">Portfolio impact</h3>
                {analyzing ? (
                  <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
                    <i
                      className="bi bi-lightning-charge-fill"
                      style={{ fontSize: '1.5rem', color: '#d4af37', display: 'block', marginBottom: '0.5rem' }}
                      aria-hidden
                    />
                    <p className="sentinel-modal-prose" style={{ margin: 0, color: '#9ca3af' }}>
                      Analyzing impact on your portfolio…
                    </p>
                  </div>
                ) : (
                  <EventAnalysisProse text={analysis} />
                )}
              </div>
            </div>
          </div>
        </div>
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

// ISR tutorial steps — centered on the distinctive features of this page.
// Each target is a data-tour selector attached to the live DOM node.
const TUTORIAL_STEPS = [
  {
    id: 'welcome',
    title: 'Welcome to Global Market Analysis',
    body:
      "Here's a quick tour of what each tool does. You can skip at any time and replay from the help icon in the top-right.",
    placement: 'center',
  },
  {
    id: 'power-map',
    title: 'Global Power Map',
    body:
      'Toggle overlays to visualize geopolitical influence, reserves, trade flows, and more across every country on the map.',
    target: "[data-tour='sidebar-power-map']",
    placement: 'right',
  },
  {
    id: 'markets',
    title: 'Markets',
    body: 'Live global market indices, session status, and regional snapshots at a glance.',
    target: "[data-tour='sidebar-markets']",
    placement: 'right',
  },
  {
    id: 'central-banks',
    title: 'Central Banks',
    body: 'Rate decisions, policy stances, and upcoming meetings for major central banks worldwide.',
    target: "[data-tour='sidebar-central-banks']",
    placement: 'right',
  },
  {
    id: 'indices',
    title: 'Indices',
    body: 'Major world indices with real-time moves and relative strength.',
    target: "[data-tour='sidebar-indices']",
    placement: 'right',
  },
  {
    id: 'commodities',
    title: 'Commodities',
    body: 'Oil, gold, copper, wheat, and more — spot levels and futures curves.',
    target: "[data-tour='sidebar-commodities']",
    placement: 'right',
  },
  {
    id: 'currencies',
    title: 'Currencies',
    body: 'FX pairs, DXY, and currency strength indexes across the majors.',
    target: "[data-tour='sidebar-currencies']",
    placement: 'right',
  },
  {
    id: 'isr',
    title: 'ISR — Intelligence, Surveillance & Reconnaissance',
    body:
      'Live geolocated news from public sources, plus Polymarket signals when events could move prediction markets.',
    target: "[data-tour='sidebar-isr']",
    placement: 'right',
  },
  {
    id: 'globe',
    title: 'The map',
    body:
      'Drag to pan, scroll to zoom. Pulsating dots mark live news events — click one to read the article inline.',
    target: "[data-tour='globe-canvas']",
    placement: 'left',
  },
  {
    id: 'done',
    title: "You're set",
    body: 'You can replay this tour anytime from the help icon in the top-right.',
    placement: 'center',
  },
];

// Tutorial persistence key prefix. We scope by user so different accounts on
// the same device each get their own tour, with a "guest" fallback when the
// user isn't authenticated yet.
function tutorialKeyFor(userId) {
  return `ezana.tutorial.globalMarket.${userId || 'guest'}`;
}

export default function MarketAnalysisPage() {
  const { user } = useAuth() || {};
  const [view, setView] = useState('map');
  const [activeCategory, setActiveCategory] = useState(null);
  const [activeTab, setActiveTab] = useState(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [selectedDot, setSelectedDot] = useState(null);
  const [selectedPowerCountry, setSelectedPowerCountry] = useState(null);
  const [tickerData, setTickerData] = useState([]);
  const [isrOpen, setIsrOpen] = useState(false);
  const [isrEvents, setIsrEvents] = useState([]);
  const [isrMatches, setIsrMatches] = useState({});
  const [selectedIsrEvent, setSelectedIsrEvent] = useState(null);
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const mapRef = useRef(null);
  const gpmButtonRef = useRef(null);
  const arrowDismissTimer = useRef(null);
  const [showGpmArrow, setShowGpmArrow] = useState(false);
  const [dismissingArrow, setDismissingArrow] = useState(false);
  const selectedLayers = useGlobalPowerMap((s) => s.selectedLayers);
  const countryScores = useGlobalPowerMap((s) => s.countryScores);
  const setClickedCountry = useGlobalPowerMap((s) => s.setClickedCountry);
  const isPowerMapActive = selectedLayers.length > 0;

  // First-visit tutorial: fire once per user, persisted in localStorage.
  // Deliberately gated behind a short timeout so the layout has a chance to
  // settle before we start measuring spotlight targets.
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const key = tutorialKeyFor(user?.id);
    if (window.localStorage.getItem(key)) return undefined;
    const t = setTimeout(() => setTutorialOpen(true), 600);
    return () => clearTimeout(t);
  }, [user?.id]);

  const finishTutorial = useCallback(() => {
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(tutorialKeyFor(user?.id), 'done');
      }
    } catch {
      // localStorage can throw in private-mode Safari; safe to ignore
    }
    setTutorialOpen(false);
  }, [user?.id]);

  const replayTutorial = useCallback(() => {
    setTutorialOpen(true);
  }, []);

  // ISR events lifted out of ISRFeedCard so we can render the same list as
  // pulsating dots on the map and resolve Polymarket matches in the article.
  const handleIsrEventsChange = useCallback((events, matches) => {
    setIsrEvents(events || []);
    setIsrMatches(matches || {});
  }, []);

  const openIsrEvent = useCallback((event, match) => {
    setSelectedIsrEvent({ event, match: match || null });
  }, []);

  const openIsrEventById = useCallback(
    (eventId) => {
      const ev = isrEvents.find((e) => e.id === eventId);
      if (!ev) return;
      setSelectedIsrEvent({ event: ev, match: isrMatches?.[eventId] || null });
    },
    [isrEvents, isrMatches]
  );

  // Decorate the ISR events with a hasPolymarket flag so the WorldMap can
  // show the blue Polymarket indicator dot without needing the full match.
  const isrEventsForMap = useMemo(
    () =>
      (isrEvents || []).map((ev) => ({
        id: ev.id,
        lat: ev.lat,
        lng: ev.lng,
        severity: ev.severity,
        headline: ev.headline,
        city: ev.city,
        country: ev.country,
        hasPolymarket: Boolean(isrMatches?.[ev.id]),
      })),
    [isrEvents, isrMatches]
  );

  const dismissArrow = useCallback(() => {
    setDismissingArrow(true);
    setTimeout(() => {
      setShowGpmArrow(false);
      setDismissingArrow(false);
    }, 260);
  }, []);

  useEffect(() => {
    const showTimer = setTimeout(() => {
      setShowGpmArrow(true);
    }, 600);

    arrowDismissTimer.current = setTimeout(() => {
      dismissArrow();
    }, 4600);

    return () => {
      clearTimeout(showTimer);
      clearTimeout(arrowDismissTimer.current);
    };
  }, [dismissArrow]);

  useEffect(() => {
    if (!showGpmArrow) return;

    function handlePageClick() {
      clearTimeout(arrowDismissTimer.current);
      dismissArrow();
    }

    document.addEventListener('click', handlePageClick, { once: true });
    return () => document.removeEventListener('click', handlePageClick);
  }, [showGpmArrow, dismissArrow]);

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
    setSelectedPowerCountry(null);
    setSelectedDot((prev) => (prev === center.panelId ? null : center.panelId));
  };

  const handlePowerCountryClick = ({ iso, name, lng, lat }) => {
    setSelectedDot(null);
    setSelectedPowerCountry((prev) =>
      prev?.iso === iso ? null : { iso, name, lng, lat }
    );
  };

  useEffect(() => {
    if (!isPowerMapActive) {
      setSelectedPowerCountry(null);
    }
  }, [isPowerMapActive]);

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
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        setSelectedDot(null);
        setSelectedPowerCountry(null);
        setClickedCountry(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [setClickedCountry]);

  return (
    <div className={`ma-fullscreen force-dark-theme ${view === 'map' ? 'ma-view-map' : ''} ${view === 'chain' ? 'ma-view-chain' : ''}`}>
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <Link href="/empire-ranking" className="ma-view-btn ma-view-btn--gold">
              <i className="bi bi-globe-americas" style={{ marginRight: 4 }} />
              EMPIRE RANKING &amp; ANALYSIS
            </Link>
            {view === 'map' && isPowerMapActive && <ShowMeDataButton />}
          </div>
        </div>
      </div>

      <button
        type="button"
        className="ma-help-btn"
        onClick={replayTutorial}
        data-tour="help-icon"
        aria-label="Replay Global Market Analysis tour"
        title="Replay tour"
      >
        <i className="bi bi-question-lg" aria-hidden />
      </button>

      {view === 'map' ? (
        <>
          <div
            className="ma-map-area"
            onClick={() => {
              setSelectedDot(null);
              setSelectedPowerCountry(null);
              setClickedCountry(null);
            }}
          >
            <div style={{ position: 'relative', width: '100%', height: '100%' }} data-tour="globe-canvas">
              <WorldMap
                ref={mapRef}
                lineColor="#10b981"
                selectedPanelId={selectedDot}
                onDotClick={handleCenterClick}
                onPowerCountryClick={handlePowerCountryClick}
                activeLayer={activeCategory}
                activeLayerTab={activeTab}
                hideControls
                hideFinancialDots={isPowerMapActive}
                powerCountryScores={countryScores}
                isrEvents={isrOpen ? isrEventsForMap : []}
                onIsrEventClick={openIsrEventById}
              />

              {/* Top 5 ranking bar */}
              {isPowerMapActive && countryScores.length > 0 && (
                <div
                  style={{
                    position: 'absolute',
                    bottom: '12px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    zIndex: 20,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 14px',
                    background: 'rgba(10, 14, 19, 0.82)',
                    backdropFilter: 'blur(8px)',
                    WebkitBackdropFilter: 'blur(8px)',
                    borderRadius: '12px',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
                    pointerEvents: 'none',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {/* Label */}
                  <span
                    style={{
                      fontSize: '0.58rem',
                      fontWeight: 700,
                      color: 'rgba(255,255,255,0.35)',
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      marginRight: '4px',
                    }}
                  >
                    Power Rank
                  </span>

                  {/* Divider */}
                  <div
                    style={{
                      width: '1px',
                      height: '24px',
                      background: 'rgba(255,255,255,0.1)',
                      marginRight: '4px',
                    }}
                  />

                  {/* Legend */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginRight: '8px' }}>
                    {[
                      { label: '#1',  colour: '#FFD700' },
                      { label: '#2',  colour: '#00E5FF' },
                      { label: '#3',  colour: '#00FF88' },
                      { label: 'low', colour: '#BF0000' },
                    ].map(({ label, colour }) => (
                      <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: colour }} />
                        <span style={{ fontSize: '0.5rem', color: 'rgba(255,255,255,0.4)', fontVariantNumeric: 'tabular-nums' }}>
                          {label}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Top 5 countries */}
                  {countryScores.slice(0, 5).map((cs, rank) => {
                    const colour = scoreToColor(cs.score);
                    const medals = ['🥇', '🥈', '🥉'];
                    const medal = medals[rank] ?? null;

                    // Country flag emoji from ISO 2-letter code
                    const flag = cs.iso
                      .toUpperCase()
                      .split('')
                      .map(c => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65))
                      .join('');

                    return (
                      <div
                        key={cs.iso}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '2px',
                          padding: '4px 10px',
                          borderRadius: '8px',
                          background: colour + '15',
                          border: `1px solid ${colour}30`,
                          minWidth: '64px',
                        }}
                      >
                        {/* Rank + flag */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                          {medal ? (
                            <span style={{ fontSize: '0.7rem', lineHeight: 1 }}>
                              {medal}
                            </span>
                          ) : (
                            <span
                              style={{
                                fontSize: '0.6rem',
                                fontWeight: 700,
                                color: colour,
                                lineHeight: 1,
                              }}
                            >
                              #{rank + 1}
                            </span>
                          )}
                          <span style={{ fontSize: '0.85rem', lineHeight: 1 }}>
                            {flag}
                          </span>
                        </div>

                        {/* Country name — truncated */}
                        <span
                          style={{
                            fontSize: '0.58rem',
                            fontWeight: 600,
                            color: '#f0f6fc',
                            maxWidth: '60px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            lineHeight: 1,
                          }}
                        >
                          {cs.name}
                        </span>

                        {/* Score bar + number */}
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            width: '100%',
                          }}
                        >
                          <div
                            style={{
                              flex: 1,
                              height: '2px',
                              background: 'rgba(255,255,255,0.08)',
                              borderRadius: '1px',
                              overflow: 'hidden',
                            }}
                          >
                            <div
                              style={{
                                width: `${cs.score}%`,
                                height: '100%',
                                background: colour,
                                borderRadius: '1px',
                                transition: 'width 0.4s ease',
                              }}
                            />
                          </div>
                          <span
                            style={{
                              fontSize: '0.58rem',
                              fontWeight: 700,
                              color: colour,
                              lineHeight: 1,
                              fontVariantNumeric: 'tabular-nums',
                            }}
                          >
                            {cs.score}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="ma-sidebar">
            <div className="ma-sidebar-power-wrap" data-tour="sidebar-power-map">
              {showGpmArrow && (
                <div
                  className={`gpm-arrow-indicator ${dismissingArrow ? 'dismissing' : ''}`}
                  style={{
                    position: 'relative',
                    justifyContent: 'center',
                    paddingBottom: '2px',
                    pointerEvents: 'none',
                  }}
                >
                  <span className="gpm-arrow-label">try this</span>
                  <span className="gpm-arrow-icon" aria-hidden>
                    <span style={{ transform: 'rotate(90deg)', display: 'inline-block' }}>→</span>
                  </span>
                </div>
              )}
              <GlobalPowerMapControl ref={gpmButtonRef} />
            </div>
            {['markets', 'central-banks', 'indices', 'commodities', 'currencies'].map((cat) => (
              <button
                key={cat}
                type="button"
                className={`ma-sidebar-btn ${activeCategory === cat ? 'active' : ''}`}
                onClick={() => toggleCategory(cat)}
                data-tour={`sidebar-${cat}`}
              >
                <i className={`bi ${cat === 'markets' ? 'bi-graph-up' : cat === 'central-banks' ? 'bi-bank' : cat === 'indices' ? 'bi-bar-chart-line' : cat === 'commodities' ? 'bi-gem' : 'bi-currency-exchange'}`} />
                {cat.replace('-', ' ').toUpperCase()}
              </button>
            ))}
            <button
              type="button"
              className={`ma-sidebar-btn ma-sidebar-btn--isr ${isrOpen ? 'active' : ''}`}
              onClick={() => setIsrOpen((v) => !v)}
              data-tour="sidebar-isr"
              title="Intelligence, Surveillance & Reconnaissance"
            >
              <i className="bi bi-airplane-fill" />
              ISR
            </button>
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

          {(selectedDot || selectedPowerCountry) && (
            <CityNewsPanel
              panelId={selectedDot}
              powerCountry={selectedPowerCountry}
              selectedLayers={selectedLayers}
              countryScores={countryScores}
              onClose={() => {
                setSelectedDot(null);
                setSelectedPowerCountry(null);
                setClickedCountry(null);
              }}
            />
          )}

          {isrOpen && (
            <ISRFeedCard
              onSelectEvent={openIsrEvent}
              onClose={() => setIsrOpen(false)}
              onEventsChange={handleIsrEventsChange}
            />
          )}
        </>
      ) : (
        <ChainView />
      )}

      {selectedIsrEvent && (
        <ISRArticleModal
          event={selectedIsrEvent.event}
          polymarket={selectedIsrEvent.match}
          onClose={() => setSelectedIsrEvent(null)}
        />
      )}

      <TutorialOverlay
        steps={TUTORIAL_STEPS}
        open={tutorialOpen}
        onComplete={finishTutorial}
        onSkip={finishTutorial}
      />
    </div>
  );
}
