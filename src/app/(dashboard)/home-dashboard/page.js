'use client';

import { useState, useMemo } from 'react';
import { useAuth } from '@/components/AuthProvider';
import './home-dashboard.css';

/* ═══════════════════════════════════════════════════════════
   SAMPLE DATA — Replace with real data from usePortfolio()
   once Plaid integration is live.
   ═══════════════════════════════════════════════════════════ */
const PORTFOLIO_VALUE = 220360.0;
const PORTFOLIO_CHANGE_PCT = 4.9;
const PORTFOLIO_CHANGE_AMT = 10297.64;
const TOTAL_COMPANIES = 26;
const CASH_BALANCE = 10250.0;
const COMMITTED_CASH = 7000.0;

const MY_HOLDINGS = [
  { ticker: 'MSFT', name: 'Microsoft', value: 1120.0, change: 3.25, changeAmt: 35.4, qty: 10, color: '#4cc9f0' },
  { ticker: 'NFLX', name: 'Netflix', value: 980.0, change: -1.12, changeAmt: -11.0, qty: 6, color: '#ef4444' },
  { ticker: 'META', name: 'Meta', value: 740.0, change: 2.85, changeAmt: 20.45, qty: 9, color: '#3b82f6' },
  { ticker: 'GOOGL', name: 'Google', value: 1320.0, change: 4.12, changeAmt: 52.4, qty: 7, color: '#10b981' },
  { ticker: 'TSLA', name: 'Tesla', value: 760.0, change: -0.85, changeAmt: -6.5, qty: 5, color: '#ef4444' },
  { ticker: 'SHOP', name: 'Shopify', value: 610.0, change: 6.4, changeAmt: 36.2, qty: 11, color: '#10b981' },
];

const WATCHLIST = [
  { ticker: 'NVDA', name: 'NVIDIA Corp.', price: 954.7, change: 3.12 },
  { ticker: 'AAPL', name: 'Apple Inc.', price: 198.32, change: 1.27 },
  { ticker: 'AMZN', name: 'Amazon.com Inc.', price: 174.66, change: 0.84 },
  { ticker: 'UBER', name: 'Uber Technologies', price: 954.7, change: 3.12 },
  { ticker: 'SONY', name: 'Sony Group Corp.', price: 954.7, change: 3.12 },
];

const SECTOR_DATA = [
  { name: 'Energy', pct: 45, value: 38096.0, color: '#10b981' },
  { name: 'Technology', pct: 20, value: 18404.0, color: '#3b82f6' },
  { name: 'Telecom', pct: 25, value: 30200.0, color: '#a78bfa' },
  { name: 'Healthcare', pct: 10, value: 9202.0, color: '#fbbf24' },
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

// Generate a simple sparkline path (upward trend)
function generateSparkline(width, height, points = 40) {
  let y = height * 0.7;
  const step = width / points;
  const coords = [];
  for (let i = 0; i <= points; i++) {
    y += (Math.random() - 0.35) * (height * 0.06);
    y = Math.max(height * 0.2, Math.min(height * 0.85, y));
    if (i > points * 0.7) y -= Math.random() * (height * 0.04);
    coords.push(`${i === 0 ? 'M' : 'L'}${(i * step).toFixed(1)},${y.toFixed(1)}`);
  }
  return coords.join(' ');
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
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
  const [heroTimeframe, setHeroTimeframe] = useState('1Y');
  const [portfolioTimeframe, setPortfolioTimeframe] = useState('1Y');

  const userName = user?.user_metadata?.first_name
    || user?.user_metadata?.full_name?.split(' ')[0]
    || user?.email?.split('@')[0]
    || 'Investor';

  const greeting = getGreeting();

  const sparklinePath = useMemo(() => generateSparkline(500, 120), []);

  return (
    <div className="db-page">
      {/* ═══ GREETING ═══ */}
      <div className="db-greeting-section">
        <div>
          <h1 className="db-greeting">{greeting}, {userName} <span className="db-greeting-emoji">👋</span></h1>
          <p className="db-greeting-sub">
            Today you amassed a <strong className="db-greeting-highlight">+{PORTFOLIO_CHANGE_PCT}% increase</strong> in your portfolio holdings
          </p>
        </div>
      </div>

      {/* ═══ HERO: Portfolio Value Card ═══ */}
      <div className="db-hero-card">
        <div className="db-hero-left">
          <div className="db-hero-top">
            <div>
              <span className="db-hero-label">Current Value <i className="bi bi-arrow-up-right" /></span>
              <div className="db-hero-value">
                ${PORTFOLIO_VALUE.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
              <span className="db-hero-change positive">
                +{PORTFOLIO_CHANGE_PCT}%
                <span className="db-hero-change-amt">+${PORTFOLIO_CHANGE_AMT.toLocaleString()}</span>
              </span>
            </div>
            <div className="db-hero-timeframes">
              {['1D', '1M', '6M', '1Y'].map((tf) => (
                <button
                  key={tf}
                  className={`db-tf-btn ${heroTimeframe === tf ? 'active' : ''}`}
                  onClick={() => setHeroTimeframe(tf)}
                >{tf}</button>
              ))}
            </div>
          </div>

          {/* Mini stats row */}
          <div className="db-hero-stats">
            <div className="db-hero-stat">
              <span className="db-hero-stat-label">Total Companies <i className="bi bi-arrow-up-right" /></span>
              <span className="db-hero-stat-value">{TOTAL_COMPANIES}</span>
            </div>
            <div className="db-hero-stat">
              <span className="db-hero-stat-label">Cash Balance <i className="bi bi-arrow-up-right" /></span>
              <span className="db-hero-stat-value">${CASH_BALANCE.toLocaleString()}</span>
            </div>
            <div className="db-hero-stat">
              <span className="db-hero-stat-label">Committed Cash <i className="bi bi-arrow-up-right" /></span>
              <span className="db-hero-stat-value">${COMMITTED_CASH.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Chart area */}
        <div className="db-hero-chart">
          <svg viewBox="0 0 500 120" preserveAspectRatio="none" className="db-sparkline-svg">
            <defs>
              <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
              </linearGradient>
            </defs>
            {/* Fill area */}
            <path d={`${sparklinePath} L500,120 L0,120 Z`} fill="url(#sparkGrad)" />
            {/* Line */}
            <path d={sparklinePath} fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <div className="db-chart-axis">
            <span>Jan</span><span>Mar</span><span>May</span><span>Jul</span><span>Sep</span><span>Dec</span>
          </div>
        </div>
      </div>

      {/* ═══ ROW 2: Portfolios + Watchlist ═══ */}
      <div className="db-row-2">
        {/* My Portfolios */}
        <div className="db-card db-portfolios-card">
          <div className="db-card-header">
            <h3>My Portfolios</h3>
            <div className="db-card-header-right">
              <div className="db-tf-group-sm">
                {['1D', '1M', '6M', '1Y'].map((tf) => (
                  <button key={tf} className={`db-tf-btn-sm ${portfolioTimeframe === tf ? 'active' : ''}`} onClick={() => setPortfolioTimeframe(tf)}>{tf}</button>
                ))}
              </div>
              <button className="db-icon-btn" title="Export"><i className="bi bi-box-arrow-up-right" /></button>
            </div>
          </div>
          <div className="db-portfolio-grid">
            {MY_HOLDINGS.map((h) => (
              <div key={h.ticker} className="db-holding-card">
                <div className="db-holding-top">
                  <div className="db-holding-ticker-wrap">
                    <span className="db-holding-dot" style={{ background: h.change >= 0 ? '#10b981' : '#ef4444' }} />
                    <span className="db-holding-label">{h.name} ({h.ticker})</span>
                  </div>
                </div>
                <div className="db-holding-value">${h.value.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                <div className="db-holding-bottom">
                  <span className={`db-holding-change ${h.change >= 0 ? 'positive' : 'negative'}`}>
                    {h.change >= 0 ? '+' : ''}{h.change}% (${Math.abs(h.changeAmt).toFixed(2)})
                  </span>
                  <span className="db-holding-qty">Quantity: {h.qty}</span>
                </div>
              </div>
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
            {WATCHLIST.map((w) => (
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
                    {w.change >= 0 ? '+' : ''}{w.change}%
                  </span>
                </div>
              </div>
            ))}
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
            <DonutChart
              segments={PROFIT_BREAKDOWN}
              size={150}
              strokeWidth={20}
              centerValue="$4,030"
              centerLabel="-$150.20 from last month"
            />
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
              {SECTOR_DATA.map((s) => (
                <div key={s.name} className="db-sector-bar-seg" style={{ width: `${s.pct}%`, background: s.color }} />
              ))}
            </div>
          </div>
          <div className="db-sector-list">
            {SECTOR_DATA.map((s) => (
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
