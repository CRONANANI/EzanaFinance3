'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import '@/app/(dashboard)/home-dashboard/home-dashboard.css';
import './home-terminal-summary.css';

const MOCK_MOVERS = [
  { ticker: 'NVDA', pctChange: 4.2 },
  { ticker: 'AAPL', pctChange: 1.3 },
  { ticker: 'META', pctChange: -2.1 },
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

const MOCK_CAPITOL = {
  following: 4,
  newThisWeek: 3,
  rows: [
    { name: 'Nancy Pelosi', line: 'Bought NVDA  $1M–$5M', ago: '2d' },
    { name: 'Tommy Tuberville', line: 'Sold KMB  100K–250K', ago: '1d' },
    { name: 'Dan Crenshaw', line: 'No new trades', ago: '' },
    { name: 'Mark Warner', line: 'Sold META  50K–100K', ago: '3d' },
  ],
};

const MOCK_PULSE_SECTORS = [
  { name: 'Technology', pct: 1.8, bar: 72 },
  { name: 'Energy', pct: -0.4, bar: 45 },
  { name: 'Consumer', pct: 0.6, bar: 55 },
];

const MOCK_PULSE_STOCKS = [
  { tk: 'NVDA', up: true, v: 4.2 },
  { tk: 'TSLA', up: false, v: 1.8 },
  { tk: 'AAPL', up: true, v: 1.3 },
  { tk: 'META', up: false, v: 0.9 },
];

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
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={seg.color}
              strokeWidth={strokeWidth}
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

function scoreLabel(score) {
  if (score <= 30) return 'Casual Observer';
  if (score <= 70) return 'Active Investor';
  if (score <= 90) return 'Power User';
  return 'Market Expert';
}

export function HomeTerminalSummary({
  portfolioTotal = 0,
  portfolioChange = 0,
  enrichedHoldings = [],
  loading = false,
}) {
  const hasPortfolio = enrichedHoldings.length > 0;
  const todayPct = portfolioTotal > 0 ? (portfolioChange / portfolioTotal) * 100 : 0;
  const investedPct = hasPortfolio ? Math.min(95, 82) : 0;

  const movers = useMemo(() => {
    const sorted = [...enrichedHoldings].sort(
      (a, b) => Math.abs(b.pctChange) - Math.abs(a.pctChange),
    );
    const top = sorted.slice(0, 3);
    if (top.length > 0) return top;
    return MOCK_MOVERS.map((m) => ({
      ticker: m.ticker,
      pctChange: m.pctChange,
    }));
  }, [enrichedHoldings]);

  const displayValue = loading
    ? '—'
    : `$${portfolioTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const changeStr =
    portfolioChange >= 0
      ? `+$${Math.abs(portfolioChange).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      : `-$${Math.abs(portfolioChange).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const activityScore = 78;
  const streakDays = 12;
  const checklistDone = 9;
  const checklistTotal = 18;

  return (
    <div className="home-terminal-body dashboard-page-inset">
      {/* Row 1 */}
      <div className="hts-row hts-row-1">
        <div className="db-card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="db-card-header">
            <h3>Portfolio Today</h3>
          </div>
          <div className="hts-card-body">
            <p className="hts-muted" style={{ margin: 0 }}>Total value</p>
            <div className="hts-snapshot-value">{displayValue}</div>
            <div
              className={`hts-snapshot-change ${portfolioChange >= 0 ? 'up' : 'down'}`}
            >
              {hasPortfolio ? (
                <>
                  {portfolioChange >= 0 ? '▲' : '▼'} {changeStr}{' '}
                  <span className="hts-muted" style={{ fontWeight: 600 }}>
                    ({todayPct >= 0 ? '+' : ''}
                    {todayPct.toFixed(2)}%) today
                  </span>
                </>
              ) : (
                <span className="hts-muted">Connect a brokerage to track daily P&amp;L</span>
              )}
            </div>
            <div className="hts-progress-track">
              <div className="hts-progress-fill" style={{ width: `${investedPct}%` }} />
            </div>
            <p className="hts-muted" style={{ margin: 0, fontSize: '0.7rem' }}>
              {hasPortfolio ? `${investedPct}% invested` : '0% invested'}
            </p>
            <Link href="/home-dashboard" className="hts-link">
              View portfolio <i className="bi bi-arrow-right" />
            </Link>
          </div>
        </div>

        <div className="db-card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="db-card-header">
            <h3>Your Movers Today</h3>
          </div>
          <div className="hts-card-body">
            {movers.length === 0 ? (
              <p className="hts-empty">No price data yet.</p>
            ) : (
              movers.map((m) => (
                <div key={m.ticker} className="hts-mover-row">
                  <span className={`hts-dot ${m.pctChange >= 0 ? 'up' : 'down'}`} />
                  <span className="hts-mover-tk">{m.ticker}</span>
                  <span className={`hts-mover-pct ${m.pctChange >= 0 ? 'up' : 'down'}`}>
                    {m.pctChange >= 0 ? '▲' : '▼'}{' '}
                    {m.pctChange >= 0 ? '+' : ''}
                    {m.pctChange.toFixed(1)}%
                  </span>
                </div>
              ))
            )}
            <p className="hts-muted" style={{ marginTop: '0.5rem' }}>
              {hasPortfolio ? `${enrichedHoldings.length} stocks in portfolio` : '0 stocks in portfolio'}
            </p>
            <Link href="/home-dashboard" className="hts-link">
              See all holdings <i className="bi bi-arrow-right" />
            </Link>
          </div>
        </div>

        <div className="db-card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="db-card-header">
            <h3>Your Streak</h3>
          </div>
          <div className="hts-card-body">
            <div className="hts-streak-num">🔥 {streakDays} Days</div>
            <div className="hts-week-dots">
              {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
                <span key={d + i}>
                  {d}
                  <span className={`hts-dot-day ${i < 5 ? 'on' : ''}`} />
                </span>
              ))}
            </div>
            <p className="hts-muted" style={{ marginTop: '0.5rem' }}>
              Checklist: {checklistDone}/{checklistTotal} complete
            </p>
            <Link href="/home-dashboard" className="hts-link">
              Keep it going <i className="bi bi-arrow-right" />
            </Link>
          </div>
        </div>
      </div>

      {/* Row 2 */}
      <div className="hts-row hts-row-2">
        <div className="db-card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="db-card-header">
            <h3>📊 This Week on Ezana</h3>
          </div>
          <div className="hts-card-body">
            <ul className="hts-weekly-lines">
              <li>
                <Link href="/home-dashboard">You made 7 trades this week</Link>
              </li>
              <li>
                <Link href="/home-dashboard">
                  Your portfolio is up +0.57% ($1,247)
                </Link>
              </li>
              <li>
                <Link href="/inside-the-capitol">Nancy Pelosi bought $1M–5M of NVDA</Link>
              </li>
              <li>
                <Link href="/community">3 new discussions in communities you follow</Link>
              </li>
              <li>
                <Link href="/watchlist">AAPL earnings report coming up Apr 8</Link>
              </li>
            </ul>
            <p className="hts-weekly-footer">
              You&apos;re more active than 68% of users
            </p>
          </div>
        </div>

        <div className="db-card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="db-card-header">
            <h3>Quick Links</h3>
          </div>
          <div className="hts-card-body">
            <div className="hts-quick-grid">
              <Link href="/inside-the-capitol" className="hts-quick-tile">
                <span className="hts-quick-icon">🏛️</span>
                <span className="hts-quick-label">Capitol</span>
                <span className="hts-quick-status">3 new trades</span>
              </Link>
              <Link href="/ezana-echo" className="hts-quick-tile">
                <span className="hts-quick-icon">📊</span>
                <span className="hts-quick-label">Research</span>
                <span className="hts-quick-status">—</span>
              </Link>
              <Link href="/watchlist" className="hts-quick-tile">
                <span className="hts-quick-icon">👁️</span>
                <span className="hts-quick-label">Watchlist</span>
                <span className="hts-quick-status">5 stocks</span>
              </Link>
              <Link href="/learning-center" className="hts-quick-tile">
                <span className="hts-quick-icon">🎓</span>
                <span className="hts-quick-label">Learning</span>
                <span className="hts-quick-status">2 modules</span>
              </Link>
              <Link href="/community" className="hts-quick-tile">
                <span className="hts-quick-icon">💬</span>
                <span className="hts-quick-label">Community</span>
                <span className="hts-quick-status">8 new posts</span>
              </Link>
              <Link href="/market-analysis" className="hts-quick-tile">
                <span className="hts-quick-icon">🌍</span>
                <span className="hts-quick-label">Markets</span>
                <span className="hts-quick-status">—</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Row 3 */}
      <div className="hts-row hts-row-3">
        <div className="db-card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="db-card-header">
            <h3>🏛️ Your Congressional Watchlist</h3>
          </div>
          <div className="hts-card-body">
            <p className="hts-muted" style={{ marginTop: 0 }}>
              Following: {MOCK_CAPITOL.following} Politicians
            </p>
            {MOCK_CAPITOL.rows.map((r) => (
              <div key={r.name} className="hts-capitol-line">
                <span className="hts-capitol-name">● {r.name}</span>
                <span>
                  {r.line}
                  {r.ago ? `  ${r.ago}` : ''}
                </span>
              </div>
            ))}
            <p className="hts-muted" style={{ marginTop: '0.75rem' }}>
              🔔 {MOCK_CAPITOL.newThisWeek} new trades from your watchlist this week
            </p>
            <Link href="/inside-the-capitol" className="hts-link">
              View all <i className="bi bi-arrow-right" />
            </Link>
          </div>
        </div>

        <div className="db-card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="db-card-header">
            <h3>⚡ Market Pulse</h3>
          </div>
          <div className="hts-card-body">
            <p className="hts-muted" style={{ marginTop: 0 }}>
              Personalized for your portfolio
            </p>
            <p className="hts-card-title" style={{ fontSize: '0.75rem', marginBottom: '0.5rem' }}>
              Your Sectors Today
            </p>
            {MOCK_PULSE_SECTORS.map((s) => (
              <div key={s.name} className="hts-sector-row">
                <span>{s.name}</span>
                <span className={s.pct >= 0 ? 'up' : 'down'} style={{ color: s.pct >= 0 ? '#10b981' : '#f87171', fontWeight: 700 }}>
                  {s.pct >= 0 ? '▲' : '▼'} {s.pct >= 0 ? '+' : ''}
                  {s.pct}%
                </span>
                <div className="hts-sector-bar">
                  <span style={{ width: `${s.bar}%`, display: 'block' }} />
                </div>
              </div>
            ))}
            <p className="hts-card-title" style={{ fontSize: '0.75rem', margin: '0.75rem 0 0.35rem' }}>
              Stocks You Own Moving Most
            </p>
            <div className="hts-movers-grid">
              {MOCK_PULSE_STOCKS.map((s) => (
                <span key={s.tk}>
                  {s.tk}{' '}
                  <span style={{ color: s.up ? '#10b981' : '#f87171', fontWeight: 700 }}>
                    {s.up ? '▲' : '▼'} {s.up ? '+' : '-'}
                    {s.v}%
                  </span>
                </span>
              ))}
            </div>
            <p className="hts-muted" style={{ marginBottom: '0.35rem' }}>Market Sentiment</p>
            <div className="hts-sentiment-bar">
              <div className="hts-sentiment-fill" style={{ width: '72%' }} />
            </div>
            <p className="hts-muted" style={{ margin: 0, fontSize: '0.7rem' }}>
              Bullish (72%) · Based on your 6 holdings across 3 sectors
            </p>
          </div>
        </div>
      </div>

      {/* Row 4 */}
      <div className="hts-row hts-row-4">
        <div className="db-card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="db-card-header">
            <h3>🎯 Your Activity Score</h3>
          </div>
          <div className="hts-card-body">
            <div className="hts-activity-score">
              {activityScore} / 100
            </div>
            <div className="hts-activity-bar">
              <span style={{ width: `${activityScore}%` }} />
            </div>
            <div className="hts-activity-label">{scoreLabel(activityScore)}</div>
            <p className="hts-muted">Streak: 🔥 {streakDays} days</p>
            <p className="hts-card-title" style={{ fontSize: '0.75rem', marginTop: '0.75rem' }}>
              This Week
            </p>
            <div className="hts-check-row">
              <i className="bi bi-check-circle-fill" />
              <span>Checked watchlist — 5 times</span>
            </div>
            <div className="hts-check-row">
              <i className="bi bi-check-circle-fill" />
              <span>Viewed research — 3 companies</span>
            </div>
            <div className="hts-check-row">
              <i className="bi bi-check-circle-fill" />
              <span>Read community posts — 8 posts</span>
            </div>
            <div className="hts-check-row">
              <i className="bi bi-check-circle-fill" />
              <span>Capitol trades reviewed — 12 trades</span>
            </div>
            <div className="hts-check-row">
              <i className="bi bi-circle" />
              <span>Learning modules — 0 completed</span>
            </div>
            <p className="hts-muted" style={{ marginTop: '0.75rem', fontSize: '0.7rem' }}>
              Complete a learning module to hit 85+
            </p>
          </div>
        </div>

        <div className="db-card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="db-card-header">
            <h3>📅 Coming Up</h3>
          </div>
          <div className="hts-card-body">
            <div className="hts-event-block">
              <div className="hts-event-group-title">Today</div>
              <div className="hts-event-line">
                🔔 <strong>NVDA</strong> approaching alert price ($960)
                <br />
                <span className="hts-muted">Current: $954.70 — 0.6% away</span>
              </div>
            </div>
            <div className="hts-event-block">
              <div className="hts-event-group-title">Tomorrow</div>
              <div className="hts-event-line">
                📊 <strong>AAPL</strong> Earnings Report (After Hours)
                <br />
                <span className="hts-muted">You hold 7 shares</span>
              </div>
            </div>
            <div className="hts-event-block">
              <div className="hts-event-group-title">This Week</div>
              <div className="hts-event-line">
                🏛️ Senate Banking Committee Hearing
                <br />
                <span className="hts-muted">3 politicians you follow are members</span>
              </div>
            </div>
            <div className="hts-event-block">
              <div className="hts-event-group-title">Apr 2</div>
              <div className="hts-event-line">
                📊 <strong>GOOGL</strong> Earnings Report
                <br />
                <span className="hts-muted">You hold 10 shares</span>
              </div>
            </div>
            <p className="hts-muted" style={{ marginTop: 'auto', paddingTop: '0.75rem', fontSize: '0.7rem' }}>
              3 events this week · 2 price alerts active
            </p>
          </div>
        </div>
      </div>

      {/* Row 5 — kept from dashboard */}
      <div className="hts-row hts-row-5">
        <div className="db-card db-profits-card">
          <div className="db-card-header">
            <h3>Total Profits</h3>
            <button type="button" className="db-icon-btn" aria-label="Open">
              <i className="bi bi-box-arrow-up-right" />
            </button>
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
                <span className="db-sector-value">
                  ${s.value.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="db-card db-transactions-card">
          <div className="db-card-header">
            <h3>Recent Transactions</h3>
            <button type="button" className="db-icon-btn" aria-label="Open">
              <i className="bi bi-box-arrow-up-right" />
            </button>
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
                  <div className="db-tx-avatar">
                    <span>{tx.company[0]}</span>
                  </div>
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
