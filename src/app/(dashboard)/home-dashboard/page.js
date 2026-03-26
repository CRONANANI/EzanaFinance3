'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { HeroSparkline } from '@/components/dashboard/HeroSparkline';
import './home-dashboard.css';

/* ═══════════════════════════════════════════════════════════
   TIMEFRAME-AWARE DATA — Hero + Holdings update when 1D/1M/6M/1Y clicked
   ═══════════════════════════════════════════════════════════ */
const HERO_DATA = {
  '1D': { value: 220360.00, change: 4.9, changeDollar: 10297.64, companies: 26, cash: 10250, committed: 7000 },
  '1M': { value: 224800.00, change: 7.2, changeDollar: 15068.00, companies: 26, cash: 10250, committed: 7000 },
  '6M': { value: 248500.00, change: 18.6, changeDollar: 39012.00, companies: 26, cash: 12400, committed: 5200 },
  '1Y': { value: 278900.00, change: 34.1, changeDollar: 71040.00, companies: 26, cash: 14800, committed: 4500 },
};

const HOLDINGS_DATA = {
  '1D': [
    { ticker: 'GOOGL', name: 'Google', price: 1320.00, change: 4.12, changeDollar: 52.40, qty: 7, color: '#4285F4' },
    { ticker: 'MSFT', name: 'Microsoft', price: 1120.00, change: 3.25, changeDollar: 35.40, qty: 10, color: '#00a4ef' },
    { ticker: 'NFLX', name: 'Netflix', price: 980.00, change: 2.10, changeDollar: 20.10, qty: 6, color: '#e50914' },
    { ticker: 'TSLA', name: 'Tesla', price: 760.00, change: 1.85, changeDollar: 13.80, qty: 5, color: '#cc0000' },
    { ticker: 'META', name: 'Meta', price: 740.00, change: -1.45, changeDollar: -10.85, qty: 9, color: '#0082fb', worst: true },
    { ticker: 'SHOP', name: 'Shopify', price: 610.00, change: -2.30, changeDollar: -14.40, qty: 11, color: '#96bf48', worst: true },
  ],
  '1M': [
    { ticker: 'GOOGL', name: 'Google', price: 1320.00, change: 8.70, changeDollar: 105.60, qty: 7, color: '#4285F4' },
    { ticker: 'MSFT', name: 'Microsoft', price: 1120.00, change: 6.40, changeDollar: 67.20, qty: 10, color: '#00a4ef' },
    { ticker: 'TSLA', name: 'Tesla', price: 760.00, change: 5.20, changeDollar: 37.50, qty: 5, color: '#cc0000' },
    { ticker: 'NFLX', name: 'Netflix', price: 980.00, change: 3.80, changeDollar: 35.90, qty: 6, color: '#e50914' },
    { ticker: 'META', name: 'Meta', price: 740.00, change: -3.20, changeDollar: -24.50, qty: 9, color: '#0082fb', worst: true },
    { ticker: 'SHOP', name: 'Shopify', price: 610.00, change: -5.10, changeDollar: -32.80, qty: 11, color: '#96bf48', worst: true },
  ],
  '6M': [
    { ticker: 'GOOGL', name: 'Google', price: 1320.00, change: 22.40, changeDollar: 241.60, qty: 7, color: '#4285F4' },
    { ticker: 'MSFT', name: 'Microsoft', price: 1120.00, change: 18.90, changeDollar: 178.20, qty: 10, color: '#00a4ef' },
    { ticker: 'NFLX', name: 'Netflix', price: 980.00, change: 14.50, changeDollar: 124.20, qty: 6, color: '#e50914' },
    { ticker: 'TSLA', name: 'Tesla', price: 760.00, change: 12.10, changeDollar: 82.00, qty: 5, color: '#cc0000' },
    { ticker: 'SHOP', name: 'Shopify', price: 610.00, change: -8.60, changeDollar: -57.60, qty: 11, color: '#96bf48', worst: true },
    { ticker: 'META', name: 'Meta', price: 740.00, change: -4.30, changeDollar: -33.20, qty: 9, color: '#0082fb', worst: true },
  ],
  '1Y': [
    { ticker: 'GOOGL', name: 'Google', price: 1320.00, change: 38.50, changeDollar: 368.40, qty: 7, color: '#4285F4' },
    { ticker: 'MSFT', name: 'Microsoft', price: 1120.00, change: 32.20, changeDollar: 273.60, qty: 10, color: '#00a4ef' },
    { ticker: 'NFLX', name: 'Netflix', price: 980.00, change: 28.70, changeDollar: 218.40, qty: 6, color: '#e50914' },
    { ticker: 'TSLA', name: 'Tesla', price: 760.00, change: 24.50, changeDollar: 142.80, qty: 5, color: '#cc0000' },
    { ticker: 'META', name: 'Meta', price: 740.00, change: -12.40, changeDollar: -105.20, qty: 9, color: '#0082fb', worst: true },
    { ticker: 'SHOP', name: 'Shopify', price: 610.00, change: -18.70, changeDollar: -133.60, qty: 11, color: '#96bf48', worst: true },
  ],
};

const CHART_PATHS = {
  '1D': 'M0,65 C40,60 80,45 120,50 C160,55 200,35 240,30 C280,25 320,40 360,20 C400,15 440,25 480,10',
  '1M': 'M0,70 C40,65 80,55 120,60 C160,50 200,45 240,35 C280,40 320,30 360,25 C400,20 440,15 480,10',
  '6M': 'M0,75 C40,70 80,60 120,55 C160,65 200,50 240,40 C280,35 320,25 360,30 C400,20 440,12 480,8',
  '1Y': 'M0,80 C40,75 80,70 120,60 C160,55 200,65 240,45 C280,35 320,40 360,25 C400,18 440,12 480,5',
};

const WATCHLIST = [
  { ticker: 'NVDA', name: 'NVIDIA Corp.', price: 954.7, change: 3.12 },
  { ticker: 'AAPL', name: 'Apple Inc.', price: 198.32, change: 1.27 },
  { ticker: 'AMZN', name: 'Amazon.com Inc.', price: 174.66, change: 0.84 },
  { ticker: 'UBER', name: 'Uber Technologies', price: 954.7, change: 3.12 },
  { ticker: 'SONY', name: 'Sony Group Corp.', price: 954.7, change: 3.12 },
];

const SECTOR_DATA_DEFAULT = [
  { name: 'Energy', pct: 45, value: 38096.0, color: '#10b981' },
  { name: 'Technology', pct: 20, value: 18404.0, color: '#3b82f6' },
  { name: 'Telecom', pct: 25, value: 30200.0, color: '#a78bfa' },
  { name: 'Healthcare', pct: 10, value: 9202.0, color: '#fbbf24' },
];

/** Demo account: extra sector so the card reads full */
const SECTOR_DATA_DEMO = [
  { name: 'Energy', pct: 40, value: 33800.0, color: '#10b981' },
  { name: 'Technology', pct: 20, value: 18404.0, color: '#3b82f6' },
  { name: 'Telecom', pct: 18, value: 21744.0, color: '#a78bfa' },
  { name: 'Healthcare', pct: 10, value: 9202.0, color: '#fbbf24' },
  { name: 'Manufacturing', pct: 12, value: 10140.0, color: '#ec4899' },
];

const PROFIT_BREAKDOWN = [
  { label: 'Stocks', pct: 45, color: '#10b981' },
  { label: 'Funds', pct: 20, color: '#3b82f6' },
  { label: 'ETFs', pct: 25, color: '#a78bfa' },
  { label: 'Crypto', pct: 10, color: '#fbbf24' },
];

const RECENT_TRANSACTIONS = [
  { company: 'Meta', date: '10 Dec 2025', amount: 954.7, positive: true, txId: '#784512372' },
  { company: 'UBER', date: '10 Dec 2025', amount: 954.7, positive: false, txId: '#784512371' },
  { company: 'NVDA', date: '09 Dec 2025', amount: 954.7, positive: true, txId: '#784512370' },
  { company: 'Apple', date: '08 Dec 2025', amount: 1240.5, positive: true, txId: '#784512369' },
  { company: 'MSFT', date: '07 Dec 2025', amount: 980.75, positive: true, txId: '#784512368' },
];

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
}

function formatLongDate() {
  return new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

/* ═══════════════════════════════════════════════════════════
   DONUT CHART COMPONENT
   ═══════════════════════════════════════════════════════════ */
function DonutChart({ segments, size = 160, strokeWidth = 22, centerValue, centerLabel }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="db-donut-wrap" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} className="db-donut-svg">
        {segments.map((seg, i) => {
          const dash = (seg.pct / 100) * circumference;
          const currentOffset = offset;
          offset += dash;
          return (
            <circle
              key={i}
              cx={size / 2} cy={size / 2} r={radius}
              fill="none" stroke={seg.color} strokeWidth={strokeWidth}
              strokeDasharray={`${dash} ${circumference - dash}`}
              strokeDashoffset={-currentOffset}
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
              strokeLinecap="round"
              style={{ transition: 'stroke-dashoffset 0.6s ease' }}
            />
          );
        })}
      </svg>
      <div className="db-donut-center">
        <span className="db-donut-value">{centerValue}</span>
        {centerLabel && <span className="db-donut-label">{centerLabel}</span>}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN DASHBOARD PAGE
   ═══════════════════════════════════════════════════════════ */
export default function HomeDashboardPage() {
  const { user } = useAuth();
  const [timeframe, setTimeframe] = useState('1D');
  const heroData = HERO_DATA[timeframe];
  const holdings = HOLDINGS_DATA[timeframe];
  const chartPath = CHART_PATHS[timeframe];

  const userName = user?.user_metadata?.first_name
    || user?.user_metadata?.full_name?.split(' ')[0]
    || user?.email?.split('@')[0]
    || 'Investor';

  const greeting = getGreeting();

  const sectorRows = useMemo(() => {
    if (user?.email === 'axmabeto@gmail.com') return SECTOR_DATA_DEMO;
    return SECTOR_DATA_DEFAULT;
  }, [user?.email]);

  return (
    <div className="db-page dashboard-page-inset">
      {/* ═══ GREETING ═══ */}
      <div className="db-greeting-section">
        <div>
          <h1 className="db-greeting">
            {greeting}, {userName}{' '}
            <span className="db-greeting-waving" aria-hidden>
              <i className="bi bi-hand-thumbs-up" />
            </span>
          </h1>
          <p className="db-greeting-sub">
            {heroData.change >= 0 ? (
              <>Today you amassed a <strong className="db-greeting-highlight">+{heroData.change}% increase</strong> in your portfolio holdings</>
            ) : (
              <>Markets are down <strong className="db-greeting-highlight">{Math.abs(heroData.change)}%</strong> today — stay the course, long-term wins</>
            )}
          </p>
          <p className="db-greeting-date">{formatLongDate()}</p>
          <div className="db-quick-actions">
            <a href="/trading" className="db-quick-action-pill"><i className="bi bi-lightning-charge" /> Trade</a>
            <a href="/trading#fund" className="db-quick-action-pill"><i className="bi bi-bank" /> Deposit</a>
            <a href="/ezana-echo" className="db-quick-action-pill"><i className="bi bi-search" /> Research</a>
            <a href="/community" className="db-quick-action-pill"><i className="bi bi-people" /> Community</a>
          </div>
        </div>
      </div>

      {/* ═══ HERO: Portfolio Value Card ═══ */}
      <div className="db-hero-card">
        <div className="db-hero-left">
          <div className="db-hero-top">
            <div>
              <span className="db-hero-label">Current Value <i className="bi bi-arrow-up-right" /></span>
              <div className="db-hero-value">
                ${heroData.value.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
              <span className={`db-hero-change ${heroData.change >= 0 ? 'positive' : 'negative'}`}>
                {heroData.change >= 0 ? '+' : ''}{heroData.change}%
                <span className="db-hero-change-amt">{heroData.changeDollar >= 0 ? '+' : ''}${heroData.changeDollar.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </span>
            </div>
            <div className="db-hero-timeframes">
              {['1D', '1M', '6M', '1Y'].map((tf) => (
                <button
                  key={tf}
                  className={`db-tf-btn ${timeframe === tf ? 'active' : ''}`}
                  onClick={() => setTimeframe(tf)}
                >{tf}</button>
              ))}
            </div>
          </div>

          {/* Mini stats row */}
          <div className="db-hero-stats">
            <div className="db-hero-stat">
              <span className="db-hero-stat-label">Total Companies <i className="bi bi-arrow-up-right" /></span>
              <span className="db-hero-stat-value">{heroData.companies}</span>
            </div>
            <div className="db-hero-stat">
              <span className="db-hero-stat-label">Cash Balance <i className="bi bi-arrow-up-right" /></span>
              <span className="db-hero-stat-value">${heroData.cash.toLocaleString()}</span>
            </div>
            <div className="db-hero-stat">
              <span className="db-hero-stat-label">Committed Cash <i className="bi bi-arrow-up-right" /></span>
              <span className="db-hero-stat-value">${heroData.committed.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Chart area */}
        <HeroSparkline portfolioValue={heroData.value} changePct={heroData.change} chartPath={chartPath} />
      </div>

      {/* ═══ ROW 2: Portfolios + Watchlist ═══ */}
      <div className="db-row-2">
        {/* My Holdings */}
        <div className="db-card db-portfolios-card">
          <div className="db-card-header">
            <h3>My Holdings</h3>
            <div className="db-card-header-right">
              <div className="db-tf-group-sm">
                {['1D', '1M', '6M', '1Y'].map((tf) => (
                  <button key={tf} className={`db-tf-btn-sm ${timeframe === tf ? 'active' : ''}`} onClick={() => setTimeframe(tf)}>{tf}</button>
                ))}
              </div>
              <button className="db-icon-btn" title="Export"><i className="bi bi-box-arrow-up-right" /></button>
            </div>
          </div>
          <div className="db-portfolio-grid">
            {holdings.map((h) => (
              <Link key={h.ticker} href={`/company-research?ticker=${h.ticker}`} className={`db-holding-card db-holding-card-link ${h.change >= 0 ? 'db-holding-positive' : 'db-holding-negative'}`}>
                <div className="db-holding-top">
                  <span className="db-holding-dot" style={{ background: h.color }} />
                  <div className="db-holding-info">
                    <span className="db-holding-label">{h.name} ({h.ticker})</span>
                    <span className="db-holding-value">${h.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    <span className={`db-holding-change ${h.change >= 0 ? 'positive' : 'negative'}`}>
                      {h.change >= 0 ? '+' : ''}{h.change}% ({h.changeDollar >= 0 ? '+' : ''}${Math.abs(h.changeDollar).toFixed(2)})
                    </span>
                    <span className="db-holding-qty">Quantity: {h.qty}</span>
                  </div>
                </div>
                {h.worst && <span className="db-holding-worst-badge">Underperforming</span>}
                <span className="db-holding-view-details">View Details</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Watchlist */}
        <div className="db-card db-watchlist-card">
          <div className="db-card-header">
            <h3>Watchlist</h3>
            <button className="db-icon-btn" title="Add"><i className="bi bi-plus-lg" /></button>
          </div>
          <div className="db-watchlist-list">
            {WATCHLIST.length === 0 ? (
              <div className="db-watchlist-empty">
                <i className="bi bi-bookmark" style={{ fontSize: '2rem', color: '#6b7280', marginBottom: '0.5rem' }} />
                <p style={{ margin: 0, fontSize: '0.875rem', color: '#8b949e' }}>Empty watchlist — add stocks to track</p>
                <button className="db-icon-btn" style={{ marginTop: '0.75rem' }} title="Add stock"><i className="bi bi-plus-lg" /></button>
              </div>
            ) : (
              WATCHLIST.map((w) => (
                <div key={w.ticker} className="db-watchlist-item">
                  <div className="db-watchlist-left">
                    <div className="db-watchlist-avatar">
                      <span>{w.ticker[0]}</span>
                    </div>
                    <div>
                      <span className="db-watchlist-ticker">{w.ticker}</span>
                      <span className="db-watchlist-name">{w.name}</span>
                    </div>
                  </div>
                  <div className="db-watchlist-right">
                    <span className="db-watchlist-price">${w.price.toLocaleString()}</span>
                    <span className={`db-watchlist-change ${w.change >= 0 ? 'positive' : 'negative'}`}>
                      <i className={`bi ${w.change >= 0 ? 'bi-caret-up-fill' : 'bi-caret-down-fill'}`} style={{ fontSize: '0.625rem', marginRight: 2 }} />
                      {w.change >= 0 ? '+' : ''}{w.change}%
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ═══ ROW 3: Profits + Sectors + Transactions ═══ */}
      <div className="db-row-3">
        {/* Total Profits */}
        <div className="db-card db-profits-card">
          <div className="db-card-header">
            <h3>Total Profits</h3>
            <button className="db-icon-btn"><i className="bi bi-box-arrow-up-right" /></button>
          </div>
          <div className="db-profits-body">
            <div className="db-profits-chart-wrap">
              <DonutChart
                segments={PROFIT_BREAKDOWN}
                size={150}
                strokeWidth={20}
                centerValue="$4,030"
                centerLabel="-$150.20 from last month"
              />
            </div>
            <div className="db-profits-legend">
              {PROFIT_BREAKDOWN.map((p) => (
                <div key={p.label} className="db-profits-legend-item">
                  <span className="db-legend-dot" style={{ background: p.color }} />
                  <span className="db-legend-label">{p.label}</span>
                  <span className="db-legend-pct">{p.pct}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sector Distribution */}
        <div className="db-card db-sector-card">
          <div className="db-card-header">
            <h3>Sector Distribution</h3>
            <div className="db-sector-bar-mini">
              {sectorRows.map((s) => (
                <div key={s.name} className="db-sector-bar-seg" style={{ width: `${s.pct}%`, background: s.color }} />
              ))}
            </div>
          </div>
          <div className="db-sector-list db-sector-list--compact">
            {sectorRows.map((s) => (
              <div key={s.name} className="db-sector-item">
                <div className="db-sector-item-left">
                  <span className="db-sector-dot" style={{ background: s.color }} />
                  <div>
                    <span className="db-sector-name">{s.name}</span>
                    <span className="db-sector-pct">{s.pct}%</span>
                  </div>
                </div>
                <span className="db-sector-value">${s.value.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="db-card db-transactions-card">
          <div className="db-card-header">
            <h3>Recent Transactions</h3>
            <button className="db-icon-btn"><i className="bi bi-box-arrow-up-right" /></button>
          </div>
          <div className="db-tx-table-header">
            <span>Companies</span>
            <span>Amount</span>
            <span>Transaction ID</span>
          </div>
          <div className="db-tx-list">
            {RECENT_TRANSACTIONS.map((tx) => (
              <div key={tx.txId} className="db-tx-item">
                <div className="db-tx-company">
                  <div className="db-tx-avatar"><span>{tx.company[0]}</span></div>
                  <div>
                    <span className="db-tx-name">{tx.company}</span>
                    <span className="db-tx-date">{tx.date}</span>
                  </div>
                </div>
                <span className={`db-tx-amount ${tx.positive ? 'positive' : 'negative'}`}>
                  {tx.positive ? '+' : '-'}${tx.amount.toLocaleString()}
                </span>
                <span className="db-tx-id">{tx.txId}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
