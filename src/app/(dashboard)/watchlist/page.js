'use client';

import { useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { PinnableCard } from '@/components/ui/PinnableCard';
import '../../../../app-legacy/assets/css/theme.css';
import '../../../../app-legacy/assets/css/unified-component-cards.css';
import '../../../../app-legacy/assets/css/pages-common.css';
import '../../../../app-legacy/assets/css/light-mode-fixes.css';
import './watchlist.css';

/* ── Helper ── */
function slugify(s) { return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''); }
function fmtPrice(n) { return n >= 1000 ? n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : n.toFixed(2); }
function fmtChange(n) { return `${n >= 0 ? '+' : ''}${n.toFixed(2)}`; }
function fmtPct(n) { return `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`; }

/* ── Data: Indices ticker strip ── */
const INDICES = [
  { symbol: 'DJI', name: 'Dow Jones', price: 44524.40, change: 143.05, pct: 0.56 },
  { symbol: 'SPX', name: 'S&P 500', price: 6024.54, change: 10.32, pct: 0.58 },
  { symbol: 'FTSE', name: 'FTSE 100', price: 8296.68, change: 7.43, pct: 0.56 },
  { symbol: 'TSX', name: 'S&P/TSX', price: 25053.74, change: 7.43, pct: 0.56 },
  { symbol: 'NKY', name: 'NIKKEI 225', price: 39053.78, change: 7.43, pct: 0.56 },
  { symbol: 'DAX', name: 'DAX', price: 19243.28, change: 7.43, pct: 0.56 },
  { symbol: 'HSI', name: 'Hang Seng', price: 17642.12, change: -82.30, pct: -0.46 },
];

/* ── Data: Commodities strip ── */
const COMMODITIES = [
  { name: 'Gold', price: 2648.50, change: 18.25, pct: 0.69 },
  { name: 'Silver', price: 30123.90, change: 5167, pct: 5.67 },
  { name: 'Copper', price: 12345.67, change: -1.37, pct: -1.37 },
  { name: 'Oil (WTI)', price: 78.91, change: 1.24, pct: 1.60 },
  { name: 'Nat Gas', price: 3.42, change: -0.08, pct: -2.28 },
];

/* ── Watchable items: stocks, politician portfolios, institutional firms ── */
const WATCHLIST_ITEMS = [
  { id: 'NVDA', type: 'stock', name: 'NVIDIA Corp', ticker: 'NVDA', price: 875.20, change: 12.40, pct: 1.44, topHoldings: ['GPUs', 'Data Center', 'AI Chips', 'Automotive'] },
  { id: 'AAPL', type: 'stock', name: 'Apple Inc', ticker: 'AAPL', price: 192.30, change: 2.10, pct: 1.10, topHoldings: ['iPhone', 'Services', 'Mac', 'Wearables'] },
  { id: 'MSFT', type: 'stock', name: 'Microsoft Corp', ticker: 'MSFT', price: 428.75, change: 3.30, pct: 0.78, topHoldings: ['Azure', 'Office 365', 'Windows', 'Gaming'] },
  { id: 'TSLA', type: 'stock', name: 'Tesla Inc', ticker: 'TSLA', price: 248.50, change: -8.20, pct: -3.19, topHoldings: ['Model Y', 'Energy', 'FSD', 'Cybertruck'] },
  { id: 'META', type: 'stock', name: 'Meta Platforms', ticker: 'META', price: 512.80, change: 6.40, pct: 1.26, topHoldings: ['Instagram', 'WhatsApp', 'Reality Labs', 'Ads'] },
  { id: 'AMZN', type: 'stock', name: 'Amazon.com', ticker: 'AMZN', price: 188.75, change: 4.20, pct: 2.27, topHoldings: ['AWS', 'E-commerce', 'Prime', 'Ads'] },
  { id: 'pol-pelosi', type: 'politician', name: 'Nancy Pelosi', ticker: 'PELOSI', price: 3036028, change: 88045, pct: 2.9, slug: 'nancy-pelosi', party: 'Democrat', topHoldings: ['NVDA', 'AAPL', 'RBLX', 'MSFT'] },
  { id: 'pol-tuberville', type: 'politician', name: 'Tommy Tuberville', ticker: 'TUBER', price: 1280000, change: -17920, pct: -1.4, slug: 'tommy-tuberville', party: 'Republican', topHoldings: ['KMB', 'HPQ', 'CLX', 'PG'] },
  { id: 'pol-crenshaw', type: 'politician', name: 'Dan Crenshaw', ticker: 'CRENSH', price: 890000, change: 33820, pct: 3.8, slug: 'dan-crenshaw', party: 'Republican', topHoldings: ['AAPL', 'MSFT', 'AMZN', 'XOM'] },
  { id: 'pol-warner', type: 'politician', name: 'Mark Warner', ticker: 'WARNER', price: 2140000, change: 25680, pct: 1.2, slug: 'mark-warner', party: 'Democrat', topHoldings: ['META', 'CRM', 'SNOW', 'MSFT'] },
  { id: 'inst-citadel', type: 'institution', name: 'Citadel Advisors', ticker: 'CITADEL', price: 62400000000, change: 1248000000, pct: 2.04, topHoldings: ['NVDA', 'SPY', 'AAPL', 'META'] },
  { id: 'inst-berkshire', type: 'institution', name: 'Berkshire Hathaway', ticker: 'BRK', price: 348000000000, change: 3480000000, pct: 1.01, topHoldings: ['AAPL', 'BAC', 'AXP', 'KO'] },
  { id: 'inst-bridgewater', type: 'institution', name: 'Bridgewater Assoc.', ticker: 'BWATER', price: 19700000000, change: -197000000, pct: -0.99, topHoldings: ['SPY', 'GLD', 'TLT', 'EEM'] },
  { id: 'inst-renaissance', type: 'institution', name: 'Renaissance Tech', ticker: 'RENTECH', price: 31200000000, change: 936000000, pct: 3.10, topHoldings: ['NVO', 'VRTX', 'NOW', 'REGN'] },
];

const TIME_RANGES = ['1D', '5D', '1M', 'YTD', '6M', '1Y', '5Y', 'MAX'];
const FILTER_TABS = ['All', 'Stocks', 'Politicians', 'Institutions'];

/* ── Spark line generator ── */
function generateChartPoints(seed, count = 80, trend = 'up') {
  const pts = [];
  let v = 50;
  for (let i = 0; i < count; i++) {
    v += Math.sin(i * 0.3 + seed) * 3 + (trend === 'up' ? 0.15 : -0.1) + Math.sin(i * 0.8 + seed * 2) * 1.5;
    v = Math.max(5, Math.min(95, v));
    pts.push(v);
  }
  return pts;
}

function MiniSparkline({ seed, positive, width = 80, height = 28 }) {
  const pts = useMemo(() => generateChartPoints(seed, 20, positive ? 'up' : 'down'), [seed, positive]);
  const path = pts.map((y, i) => `${(i / (pts.length - 1)) * width},${height - (y / 100) * height}`).join(' ');
  const color = positive ? '#10b981' : '#ef4444';
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="wl-mini-spark">
      <polyline points={path} fill="none" stroke={color} strokeWidth="1.5" />
    </svg>
  );
}

function MainChart({ item, timeRange }) {
  const seed = item ? item.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0) : 42;
  const positive = item ? item.change >= 0 : true;
  const pts = useMemo(() => generateChartPoints(seed, 120, positive ? 'up' : 'down'), [seed, positive]);
  const w = 800, h = 320;
  const xStep = w / (pts.length - 1);
  const mainPath = pts.map((y, i) => `${i === 0 ? 'M' : 'L'}${i * xStep},${h - (y / 100) * h}`).join(' ');
  const areaPath = `${mainPath} L${w},${h} L0,${h} Z`;
  const color = positive ? '#10b981' : '#ef4444';

  const yLabels = item ? (() => {
    const base = item.type === 'stock' ? item.price : item.price;
    const range = base * 0.15;
    return Array.from({ length: 5 }, (_, i) => base - range / 2 + (range * i) / 4);
  })() : [10000, 20000, 30000, 40000, 50000];

  return (
    <div className="wl-chart-area">
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="wl-chart-svg">
        <defs>
          <linearGradient id="chartAreaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.15" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.2, 0.4, 0.6, 0.8].map((f) => (
          <line key={f} x1="0" y1={h * f} x2={w} y2={h * f} stroke="rgba(16,185,129,0.06)" strokeWidth="1" />
        ))}
        <path d={areaPath} fill="url(#chartAreaGrad)" />
        <path d={mainPath} fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" />
        <circle cx={w} cy={h - (pts[pts.length - 1] / 100) * h} r="4" fill={color} stroke="#0d1117" strokeWidth="2" />
      </svg>
      <div className="wl-chart-yaxis">
        {yLabels.reverse().map((l, i) => (
          <span key={i}>{item?.type === 'stock' ? `$${fmtPrice(l)}` : `$${(l / 1e6).toFixed(1)}M`}</span>
        ))}
      </div>
    </div>
  );
}

function formatItemPrice(item) {
  if (item.type === 'stock') return `$${fmtPrice(item.price)}`;
  if (item.type === 'politician') return `$${(item.price / 1e6).toFixed(2)}M`;
  return `$${(item.price / 1e9).toFixed(1)}B`;
}

function formatItemChange(item) {
  if (item.type === 'stock') return `${fmtChange(item.change)}`;
  if (item.type === 'politician') return `${item.change >= 0 ? '+' : ''}$${Math.abs(item.change / 1e3).toFixed(1)}K`;
  return `${item.change >= 0 ? '+' : ''}$${Math.abs(item.change / 1e9).toFixed(2)}B`;
}

export default function WatchlistPage() {
  const [selectedItem, setSelectedItem] = useState(WATCHLIST_ITEMS[0]);
  const [timeRange, setTimeRange] = useState('1Y');
  const [filterTab, setFilterTab] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredItems = useMemo(() => {
    let items = WATCHLIST_ITEMS;
    if (filterTab === 'Stocks') items = items.filter((i) => i.type === 'stock');
    if (filterTab === 'Politicians') items = items.filter((i) => i.type === 'politician');
    if (filterTab === 'Institutions') items = items.filter((i) => i.type === 'institution');
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter((i) => i.name.toLowerCase().includes(q) || i.ticker.toLowerCase().includes(q));
    }
    return items;
  }, [filterTab, searchQuery]);

  const handleSelectItem = useCallback((item) => {
    setSelectedItem(item);
  }, []);

  return (
    <div className="wl-page">
      {/* ── INDEX TICKER STRIP ── */}
      <div className="wl-ticker-strip">
        {INDICES.map((idx) => (
          <button key={idx.symbol} type="button" className="wl-ticker-card" onClick={() => {}}>
            <div className="wl-tc-name">{idx.name}</div>
            <div className="wl-tc-price">{fmtPrice(idx.price)}</div>
            <div className="wl-tc-row">
              <span className={`wl-tc-change ${idx.change >= 0 ? 'up' : 'down'}`}>
                {fmtChange(idx.change)} {fmtPct(idx.pct)}
              </span>
              <MiniSparkline seed={idx.symbol.charCodeAt(0)} positive={idx.change >= 0} width={60} height={20} />
            </div>
          </button>
        ))}
      </div>

      {/* ── COMMODITIES STRIP ── */}
      <div className="wl-commodity-strip">
        {COMMODITIES.map((c) => (
          <div key={c.name} className="wl-commodity-card">
            <span className="wl-cm-name">{c.name}</span>
            <span className="wl-cm-price">{fmtPrice(c.price)}</span>
            <span className={`wl-cm-change ${c.change >= 0 ? 'up' : 'down'}`}>{fmtChange(c.change)} {fmtPct(c.pct)}</span>
          </div>
        ))}
      </div>

      {/* ── MAIN CONTENT: Chart + Sidebar ── */}
      <div className="wl-main-layout">
        {/* LEFT: Chart section */}
        <div className="wl-chart-section">
          <div className="wl-chart-header">
            <div className="wl-chart-breadcrumb">
              <span className="wl-bc-home">HOME</span>
              <i className="bi bi-chevron-right" />
              <span className="wl-bc-current">{selectedItem.ticker}</span>
              {selectedItem.type !== 'stock' && (
                <span className={`wl-bc-type ${selectedItem.type}`}>
                  {selectedItem.type === 'politician' ? 'PORTFOLIO' : '13F'}
                </span>
              )}
            </div>
            <div className="wl-chart-title-row">
              <div className="wl-chart-price-block">
                <span className="wl-chart-big-price">{formatItemPrice(selectedItem)}</span>
                <span className="wl-chart-meta">{selectedItem.name}</span>
              </div>
              <div className="wl-chart-change-block">
                <span className={`wl-chart-change ${selectedItem.change >= 0 ? 'up' : 'down'}`}>
                  <i className={`bi ${selectedItem.change >= 0 ? 'bi-arrow-up-right' : 'bi-arrow-down-right'}`} />
                  {formatItemChange(selectedItem)} ({fmtPct(selectedItem.pct)})
                </span>
              </div>
            </div>
          </div>

          <div className="wl-time-range">
            {TIME_RANGES.map((t) => (
              <button key={t} type="button" className={`wl-tr-btn ${timeRange === t ? 'on' : ''}`} onClick={() => setTimeRange(t)}>{t}</button>
            ))}
          </div>

          <MainChart item={selectedItem} timeRange={timeRange} />

          <div className="wl-selected-holdings">
            <h4 className="wl-sh-title">
              {selectedItem.type === 'stock' ? 'Revenue Segments' : 'Top Holdings'}
            </h4>
            <div className="wl-sh-grid">
              {selectedItem.topHoldings.map((h) => (
                <div key={h} className="wl-sh-chip">
                  {selectedItem.type !== 'stock' && <span className="wl-sh-dot" />}
                  {h}
                </div>
              ))}
            </div>
          </div>

          <div className="wl-comparison-table">
            <div className="wl-cmp-header">
              <span />
              <span>Index</span>
              <span>Value</span>
              <span>Change</span>
              <span>Score</span>
              <span />
            </div>
            {INDICES.slice(0, 4).map((idx) => (
              <div key={idx.symbol} className="wl-cmp-row">
                <input type="checkbox" className="wl-cmp-check" readOnly checked={false} />
                <span className="wl-cmp-name">{idx.name}</span>
                <span className="wl-cmp-val">{fmtPrice(idx.price)}</span>
                <span className={`wl-cmp-chg ${idx.change >= 0 ? 'up' : 'down'}`}>{fmtChange(idx.change)}</span>
                <span className="wl-cmp-score">{(80 + Math.random() * 20).toFixed(1)}</span>
                <span className={`wl-cmp-pct ${idx.pct >= 0 ? 'up' : 'down'}`}>
                  <i className={`bi ${idx.pct >= 0 ? 'bi-arrow-up' : 'bi-arrow-down'}`} />
                  {fmtPct(idx.pct)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT: Watchlist sidebar */}
        <aside className="wl-sidebar">
          <div className="wl-sidebar-header">
            <h3>My Watchlist</h3>
            <span className="wl-sidebar-count">{filteredItems.length} items</span>
          </div>

          <div className="wl-search-wrap">
            <i className="bi bi-search" />
            <input
              type="text"
              placeholder="Search stocks, portfolios…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="wl-search-input"
            />
          </div>

          <div className="wl-filter-tabs">
            {FILTER_TABS.map((f) => (
              <button key={f} type="button" className={`wl-ftab ${filterTab === f ? 'on' : ''}`} onClick={() => setFilterTab(f)}>{f}</button>
            ))}
          </div>

          <div className="wl-items-list">
            {filteredItems.map((item) => {
              const isSelected = selectedItem.id === item.id;
              const isPositive = item.change >= 0;
              return (
                <button key={item.id} type="button" className={`wl-item ${isSelected ? 'selected' : ''} ${item.type}`} onClick={() => handleSelectItem(item)}>
                  <div className="wl-item-left">
                    <div className="wl-item-icon-wrap">
                      {item.type === 'stock' && <span className="wl-item-ticker-badge">{item.ticker}</span>}
                      {item.type === 'politician' && (
                        <span className={`wl-item-avatar ${item.party?.toLowerCase()}`}>{item.name.split(' ').map(w => w[0]).join('')}</span>
                      )}
                      {item.type === 'institution' && <span className="wl-item-inst-badge"><i className="bi bi-building" /></span>}
                    </div>
                    <div className="wl-item-info">
                      <span className="wl-item-name">{item.name}</span>
                      <span className="wl-item-type-label">
                        {item.type === 'stock' ? item.ticker : item.type === 'politician' ? 'Politician Portfolio' : 'Institutional 13F'}
                      </span>
                    </div>
                  </div>
                  <div className="wl-item-right">
                    <span className="wl-item-price">{formatItemPrice(item)}</span>
                    <span className={`wl-item-change ${isPositive ? 'up' : 'down'}`}>{fmtPct(item.pct)}</span>
                  </div>
                </button>
              );
            })}
          </div>

          <button type="button" className="wl-add-btn">
            <i className="bi bi-plus-lg" />
            Add to Watchlist
          </button>
        </aside>
      </div>
    </div>
  );
}
