'use client';

import { useState, useRef, useEffect } from 'react';
import { WorldMap } from '@/components/ui/world-map';

import '../../../../app-legacy/assets/css/theme.css';
import '../../../../app-legacy/assets/css/unified-component-cards.css';
import '../../../../app-legacy/assets/css/pages-common.css';
import '../../../../app-legacy/assets/css/light-mode-fixes.css';
import './market-analysis-world-monitor.css';

const TICKER_ITEMS = [
  { symbol: 'S&P 500', price: '5,892.34', change: 0.45 },
  { symbol: 'NASDAQ', price: '18,743.21', change: 0.72 },
  { symbol: 'DOW JONES', price: '43,127.89', change: -0.18 },
  { symbol: 'FTSE 100', price: '8,234.56', change: 0.31 },
  { symbol: 'DAX 40', price: '19,456.78', change: 0.58 },
  { symbol: 'CAC 40', price: '7,891.23', change: -0.12 },
  { symbol: 'NIKKEI 225', price: '39,234.56', change: 1.24 },
  { symbol: 'HANG SENG', price: '17,892.34', change: -0.87 },
  { symbol: 'SHANGHAI', price: '3,089.45', change: 0.34 },
  { symbol: 'SENSEX', price: '73,456.78', change: 0.65 },
  { symbol: 'ASX 200', price: '7,823.45', change: 0.22 },
  { symbol: 'TSX', price: '22,345.67', change: 0.18 },
  { symbol: 'KOSPI', price: '2,634.12', change: 0.89 },
  { symbol: 'BOVESPA', price: '128,456', change: -0.45 },
  { symbol: 'GOLD', price: '$2,178.34', change: 0.15 },
  { symbol: 'SILVER', price: '$27.89', change: 1.45 },
  { symbol: 'OIL WTI', price: '$78.45', change: -1.23 },
  { symbol: 'OIL BRENT', price: '$82.67', change: -0.98 },
  { symbol: 'COPPER', price: '$4.23', change: 0.67 },
  { symbol: 'NATURAL GAS', price: '$2.34', change: -2.1 },
  { symbol: 'EUR/USD', price: '1.0876', change: 0.08 },
  { symbol: 'USD/JPY', price: '158.31', change: 0.34 },
  { symbol: 'GBP/USD', price: '1.2654', change: -0.12 },
  { symbol: 'BTC', price: '$87,234', change: 2.34 },
  { symbol: 'ETH', price: '$3,456', change: 1.87 },
  { symbol: 'FED RATE', price: '4.25-4.50%', change: 0 },
  { symbol: 'ECB RATE CUT', price: '-25BP TO 2.65%', change: -0.25 },
  { symbol: 'BOJ HOLD', price: '0.50%', change: 0 },
  { symbol: 'US 10Y', price: '4.50%', change: 0.03 },
  { symbol: 'VIX', price: '14.32', change: -3.2 },
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

const FINANCIAL_CITIES = [
  { id: 'toronto', name: 'Toronto', country: 'Canada', exchange: 'TSX', timezone: 'EST' },
  { id: 'new-york', name: 'New York', country: 'United States', exchange: 'NYSE / NASDAQ', timezone: 'EST' },
  { id: 'sao-paulo', name: 'São Paulo', country: 'Brazil', exchange: 'B3', timezone: 'BRT' },
  { id: 'london', name: 'London', country: 'United Kingdom', exchange: 'LSE', timezone: 'GMT' },
  { id: 'frankfurt', name: 'Frankfurt', country: 'Germany', exchange: 'Deutsche Börse', timezone: 'CET' },
  { id: 'dubai', name: 'Dubai', country: 'UAE', exchange: 'DFM', timezone: 'GST' },
  { id: 'mumbai', name: 'Mumbai', country: 'India', exchange: 'BSE / NSE', timezone: 'IST' },
  { id: 'singapore', name: 'Singapore', country: 'Singapore', exchange: 'SGX', timezone: 'SGT' },
  { id: 'hong-kong', name: 'Hong Kong', country: 'China', exchange: 'HKEX', timezone: 'HKT' },
  { id: 'shanghai', name: 'Shanghai', country: 'China', exchange: 'SSE', timezone: 'CST' },
  { id: 'tokyo', name: 'Tokyo', country: 'Japan', exchange: 'TSE', timezone: 'JST' },
  { id: 'sydney', name: 'Sydney', country: 'Australia', exchange: 'ASX', timezone: 'AEST' },
];

const PANEL_ID_TO_CITY_ID = {
  toronto: 'toronto', newyork: 'new-york', saopaulo: 'sao-paulo', london: 'london',
  frankfurt: 'frankfurt', dubai: 'dubai', mumbai: 'mumbai', singapore: 'singapore',
  hongkong: 'hong-kong', shanghai: 'shanghai', tokyo: 'tokyo', sydney: 'sydney',
};

const CITY_NEWS = {
  'new-york': [
    { id: 1, category: 'MARKETS', severity: 'positive', title: 'S&P 500 extends rally to 5th consecutive week on strong earnings', time: '45m ago', source: 'Reuters', url: '#' },
    { id: 2, category: 'FED', severity: 'critical', title: 'Fed Chair Powell: Policy appropriately restrictive, watching data', time: '2h ago', source: 'Bloomberg', url: '#' },
    { id: 3, category: 'BONDS', severity: 'elevated', title: 'US Treasury 10Y yield rises to 4.5% on strong jobs data', time: '3h ago', source: 'CNBC', url: '#' },
    { id: 4, category: 'EARNINGS', severity: 'positive', title: 'NVIDIA beats Q4 expectations, raises guidance on AI demand', time: '6h ago', source: 'WSJ', url: '#' },
    { id: 5, category: 'GEOPOLITICAL', severity: 'elevated', title: 'US expands semiconductor export controls to additional Chinese firms', time: '8h ago', source: 'FT', url: '#' },
    { id: 6, category: 'IPO', severity: 'neutral', title: 'Reddit files for IPO, targets $6.5B valuation amid social media pivot', time: '12h ago', source: 'TechCrunch', url: '#' },
  ],
  london: [
    { id: 1, category: 'BOE', severity: 'elevated', title: 'Bank of England holds rates at 4.5%, split vote signals future cut', time: '1h ago', source: 'Reuters', url: '#' },
    { id: 2, category: 'MARKETS', severity: 'positive', title: 'FTSE 100 hits record high on mining and banking sector gains', time: '3h ago', source: 'Bloomberg', url: '#' },
    { id: 3, category: 'ENERGY', severity: 'critical', title: 'Brent crude surges past $88 on Middle East supply disruption fears', time: '4h ago', source: 'FT', url: '#' },
    { id: 4, category: 'GEOPOLITICAL', severity: 'elevated', title: 'UK announces new defense spending increase, £2.5B for cyber warfare', time: '6h ago', source: 'The Guardian', url: '#' },
    { id: 5, category: 'REAL ESTATE', severity: 'negative', title: 'London commercial property values decline 3.2% QoQ amid remote work shift', time: '10h ago', source: 'Reuters', url: '#' },
  ],
  tokyo: [
    { id: 1, category: 'BOJ', severity: 'critical', title: 'Bank of Japan maintains ultra-loose policy; yen at 34-year low', time: '4h ago', source: 'Nikkei', url: '#' },
    { id: 2, category: 'CURRENCY', severity: 'elevated', title: 'USD/JPY breaches 158 — intervention risk at critical level', time: '4h ago', source: 'Bloomberg', url: '#' },
    { id: 3, category: 'MARKETS', severity: 'positive', title: 'Nikkei 225 surges 1.24% as weak yen boosts exporters', time: '5h ago', source: 'Reuters', url: '#' },
    { id: 4, category: 'TECH', severity: 'positive', title: 'Toyota announces $10B EV battery investment with Panasonic partnership', time: '8h ago', source: 'Nikkei Asia', url: '#' },
    { id: 5, category: 'GEOPOLITICAL', severity: 'elevated', title: 'Japan expands Taiwan Strait patrol missions amid rising tensions', time: '14h ago', source: 'Japan Times', url: '#' },
  ],
  frankfurt: [
    { id: 1, category: 'ECB', severity: 'elevated', title: 'ECB signals rate cuts ahead as eurozone growth concerns mount', time: '2h ago', source: 'Reuters', url: '#' },
    { id: 2, category: 'MARKETS', severity: 'positive', title: 'DAX 40 rises 0.58% led by automotive and industrial recovery', time: '3h ago', source: 'Bloomberg', url: '#' },
    { id: 3, category: 'INDUSTRY', severity: 'positive', title: 'German manufacturing PMI beats expectations at 48.2, recovery signaled', time: '5h ago', source: 'FT', url: '#' },
    { id: 4, category: 'ENERGY', severity: 'elevated', title: 'Germany accelerates LNG terminal construction, reduces Russian dependence to 4%', time: '9h ago', source: 'DW', url: '#' },
  ],
  'hong-kong': [
    { id: 1, category: 'MARKETS', severity: 'negative', title: 'Hang Seng falls 0.87% as property sector selloff deepens', time: '5h ago', source: 'SCMP', url: '#' },
    { id: 2, category: 'PROPERTY', severity: 'critical', title: 'Evergrande liquidation proceedings enter final phase; creditor losses mount', time: '6h ago', source: 'Bloomberg', url: '#' },
    { id: 3, category: 'TECH', severity: 'positive', title: 'Alibaba and Tencent rally on Beijing stimulus signals for tech sector', time: '7h ago', source: 'Reuters', url: '#' },
    { id: 4, category: 'GEOPOLITICAL', severity: 'elevated', title: 'Hong Kong passes new security legislation; foreign business groups voice concerns', time: '12h ago', source: 'FT', url: '#' },
  ],
  shanghai: [
    { id: 1, category: 'PBOC', severity: 'positive', title: 'PBOC announces targeted stimulus for property and infrastructure', time: '6h ago', source: 'Xinhua', url: '#' },
    { id: 2, category: 'MARKETS', severity: 'positive', title: 'Shanghai Composite rises 0.34% on state fund buying support', time: '6h ago', source: 'Bloomberg', url: '#' },
    { id: 3, category: 'TRADE', severity: 'elevated', title: 'China retaliates with tariffs on US agricultural imports; trade war escalates', time: '10h ago', source: 'Reuters', url: '#' },
    { id: 4, category: 'TECH', severity: 'positive', title: 'Huawei unveils new AI chip, challenging NVIDIA in domestic market', time: '14h ago', source: 'Nikkei Asia', url: '#' },
  ],
  mumbai: [
    { id: 1, category: 'MARKETS', severity: 'positive', title: 'Sensex hits record high on strong FDI inflows and IT earnings', time: '5h ago', source: 'Economic Times', url: '#' },
    { id: 2, category: 'RBI', severity: 'neutral', title: 'RBI holds rates at 6.25%; GDP growth forecast maintained at 7.2%', time: '1d ago', source: 'Reuters', url: '#' },
    { id: 3, category: 'GEOPOLITICAL', severity: 'elevated', title: 'India-China border talks resume with cautious optimism on LAC disengagement', time: '1d ago', source: 'The Hindu', url: '#' },
    { id: 4, category: 'TECH', severity: 'positive', title: 'Infosys and TCS report strong Q4 guidance; IT sector outlook bullish', time: '2d ago', source: 'Mint', url: '#' },
  ],
  singapore: [
    { id: 1, category: 'MARKETS', severity: 'positive', title: 'SGX reports record derivatives trading volume in March', time: '3h ago', source: 'Bloomberg', url: '#' },
    { id: 2, category: 'TRADE', severity: 'elevated', title: 'Singapore non-oil exports rise 8.3% as chip demand surges', time: '8h ago', source: 'Straits Times', url: '#' },
    { id: 3, category: 'REGULATION', severity: 'neutral', title: 'MAS tightens crypto exchange regulations; new licensing framework', time: '1d ago', source: 'Reuters', url: '#' },
  ],
  dubai: [
    { id: 1, category: 'ENERGY', severity: 'critical', title: 'Oil prices surge on Middle East tensions; Strait of Hormuz risk elevated', time: '3h ago', source: 'Reuters', url: '#' },
    { id: 2, category: 'MARKETS', severity: 'positive', title: 'Dubai Financial Market gains 1.2% on real estate and banking strength', time: '5h ago', source: 'Bloomberg', url: '#' },
    { id: 3, category: 'GEOPOLITICAL', severity: 'critical', title: 'UAE activates air defense systems; regional military posture heightened', time: '6h ago', source: 'Al Jazeera', url: '#' },
    { id: 4, category: 'PROPERTY', severity: 'positive', title: 'Dubai property transactions hit $12B record in Q1 2026', time: '1d ago', source: 'Gulf News', url: '#' },
  ],
  toronto: [
    { id: 1, category: 'MARKETS', severity: 'positive', title: 'TSX gains 0.18% led by mining and energy sector', time: '2h ago', source: 'Globe and Mail', url: '#' },
    { id: 2, category: 'BOC', severity: 'elevated', title: 'Bank of Canada signals pause after 3 consecutive cuts; CAD steadies', time: '1d ago', source: 'Reuters', url: '#' },
    { id: 3, category: 'PROPERTY', severity: 'negative', title: 'Canadian housing starts decline 12% as mortgage rates weigh on demand', time: '1d ago', source: 'Bloomberg', url: '#' },
  ],
  'sao-paulo': [
    { id: 1, category: 'MARKETS', severity: 'negative', title: 'Bovespa falls 0.45% on fiscal concerns and currency weakness', time: '3h ago', source: 'Reuters', url: '#' },
    { id: 2, category: 'BCB', severity: 'elevated', title: 'Brazil central bank holds Selic rate at 13.25%; inflation remains sticky', time: '1d ago', source: 'Bloomberg', url: '#' },
    { id: 3, category: 'COMMODITIES', severity: 'positive', title: 'Brazilian soybean exports surge 15% on strong Chinese demand', time: '2d ago', source: 'Valor Econômico', url: '#' },
  ],
  sydney: [
    { id: 1, category: 'MARKETS', severity: 'positive', title: 'ASX 200 gains 0.22% on mining sector strength; BHP hits 6-month high', time: '6h ago', source: 'AFR', url: '#' },
    { id: 2, category: 'RBA', severity: 'neutral', title: 'RBA extends rate pause; markets price first cut for September', time: '1d ago', source: 'Reuters', url: '#' },
    { id: 3, category: 'TRADE', severity: 'elevated', title: 'Australia-China trade relations normalize; wine tariffs removed', time: '2d ago', source: 'Sydney Morning Herald', url: '#' },
  ],
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

function CityNewsPanel({ cityId, onClose }) {
  const city = FINANCIAL_CITIES.find((c) => c.id === cityId);
  if (!city) return null;

  const news = CITY_NEWS[cityId] || [];

  const severityColors = {
    critical: { bg: 'rgba(239,68,68,0.1)', color: '#ef4444', border: 'rgba(239,68,68,0.2)' },
    elevated: { bg: 'rgba(251,191,36,0.1)', color: '#fbbf24', border: 'rgba(251,191,36,0.2)' },
    positive: { bg: 'rgba(16,185,129,0.1)', color: '#10b981', border: 'rgba(16,185,129,0.2)' },
    negative: { bg: 'rgba(239,68,68,0.1)', color: '#ef4444', border: 'rgba(239,68,68,0.2)' },
    neutral: { bg: 'rgba(107,114,128,0.1)', color: '#6b7280', border: 'rgba(107,114,128,0.2)' },
  };

  return (
    <div className="ma-city-panel">
      <div className="ma-city-panel-header">
        <div>
          <h3 className="ma-city-panel-name">{city.name}</h3>
          <span className="ma-city-panel-meta">{city.country} · {city.exchange} · {city.timezone}</span>
        </div>
        <button type="button" className="ma-city-panel-close" onClick={onClose} aria-label="Close"><i className="bi bi-x-lg" /></button>
      </div>

      <div className="ma-city-panel-count">{news.length} ACTIVE ITEMS</div>

      <div className="ma-city-panel-list">
        {news.map((item) => {
          const sev = severityColors[item.severity] || severityColors.neutral;
          return (
            <a key={item.id} href={item.url} className="ma-city-news-item" target="_blank" rel="noopener noreferrer">
              <div className="ma-city-news-top">
                <span className="ma-city-news-badge" style={{ background: sev.bg, color: sev.color, borderColor: sev.border }}>
                  {item.category}
                </span>
                <span className="ma-city-news-time">{item.time}</span>
              </div>
              <p className="ma-city-news-title">{item.title}</p>
              <span className="ma-city-news-source">{item.source} →</span>
            </a>
          );
        })}
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

  const cityId = selectedDot ? PANEL_ID_TO_CITY_ID[selectedDot] : null;

  useEffect(() => {
    const onKeyDown = (e) => { if (e.key === 'Escape') setSelectedDot(null); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

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

          <div className="ma-ticker-bar">
            <span className="ma-ticker-live"><span className="ma-ticker-dot" /> LIVE</span>
            <div className="ma-ticker-scroll">
              <div className="ma-ticker-content">
                {TICKER_ITEMS.map((item, i) => (
                  <span key={i} className="ma-ticker-item">
                    <span className="ma-ticker-symbol">{item.symbol}</span>
                    <span className={`ma-ticker-value ${item.change >= 0 ? 'up' : 'down'}`}>
                      {item.price} {item.change >= 0 ? '+' : ''}{item.change}%
                    </span>
                    <span className="ma-ticker-sep">•</span>
                  </span>
                ))}
                {TICKER_ITEMS.map((item, i) => (
                  <span key={`d-${i}`} className="ma-ticker-item">
                    <span className="ma-ticker-symbol">{item.symbol}</span>
                    <span className={`ma-ticker-value ${item.change >= 0 ? 'up' : 'down'}`}>
                      {item.price} {item.change >= 0 ? '+' : ''}{item.change}%
                    </span>
                    <span className="ma-ticker-sep">•</span>
                  </span>
                ))}
              </div>
            </div>
          </div>

          {cityId && (
            <CityNewsPanel cityId={cityId} onClose={() => setSelectedDot(null)} />
          )}
        </>
      ) : (
        <ChainView />
      )}
    </div>
  );
}
