'use client';

import { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import { createBrowserClient } from '@supabase/ssr';
import '@/app/(dashboard)/home-dashboard/home-dashboard.css';
import './home-terminal-summary.css';
import { ThisWeekOnEzana } from './ThisWeekOnEzana';
import { OrgHomeCards } from '@/components/org/OrgHomeCards';
import { useOrg } from '@/contexts/OrgContext';
import { generateUserMockData } from '@/lib/userMockData';

const MOCK_MOVERS = [
  { ticker: 'NVDA', pctChange: 4.2 },
  { ticker: 'AAPL', pctChange: 1.3 },
  { ticker: 'META', pctChange: -2.1 },
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
  hasUser = false,
  weekPlaidTransactions = [],
  weekTradeHistory = [],
  weekActivityLoading = true,
}) {
  const [mockData, setMockData] = useState(null);
  const { isOrgUser } = useOrg();

  // Generate unique mock data for this user on mount
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const supabase = createBrowserClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        );
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.id) {
          const data = generateUserMockData(user.id);
          setMockData(data);
        }
      } catch (error) {
        console.error('Failed to load user for mock data:', error);
      }
    };
    fetchUser();
  }, []);

  const hasPortfolio = enrichedHoldings.length > 0;
  const todayPct = portfolioTotal > 0 ? (portfolioChange / portfolioTotal) * 100 : 0;
  const investedPct = hasPortfolio ? Math.min(95, 82) : 0;

  // Use generated mover data or fallback to MOCK_MOVERS
  const movers = useMemo(() => {
    const sorted = [...enrichedHoldings].sort(
      (a, b) => Math.abs(b.pctChange) - Math.abs(a.pctChange),
    );
    const top = sorted.slice(0, 3);
    if (top.length > 0) return top;
    
    // Use generated movers if available
    if (mockData?.movers) {
      return mockData.movers.map((m) => ({
        ticker: m.ticker,
        pctChange: m.change,
      }));
    }
    
    return MOCK_MOVERS.map((m) => ({
      ticker: m.ticker,
      pctChange: m.pctChange,
    }));
  }, [enrichedHoldings, mockData]);

  const displayValue = loading
    ? '—'
    : `$${portfolioTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const changeStr =
    portfolioChange >= 0
      ? `+$${Math.abs(portfolioChange).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      : `-$${Math.abs(portfolioChange).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  // Use generated or mock values
  const activityScore = mockData?.activityScore || 78;
  const streakDays = mockData?.streak || 12;
  const checklistDone = 9;
  const checklistTotal = 18;

  return (
    <div className="home-terminal-body dashboard-page-inset">
      {/* Centaur Intelligence Banner */}
      <Link href="/centaur-intelligence" style={{ textDecoration: 'none', display: 'block' }}>
        <div style={{
          width: '100%',
          background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.08) 0%, rgba(212, 175, 55, 0.15) 100%)',
          border: '1px solid rgba(212, 175, 55, 0.3)',
          borderRadius: '10px',
          padding: '10px 1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          transition: 'all 0.3s ease',
          marginBottom: '1rem',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = '#D4AF37';
          e.currentTarget.style.background = 'linear-gradient(135deg, rgba(212, 175, 55, 0.12) 0%, rgba(212, 175, 55, 0.22) 100%)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = 'rgba(212, 175, 55, 0.3)';
          e.currentTarget.style.background = 'linear-gradient(135deg, rgba(212, 175, 55, 0.08) 0%, rgba(212, 175, 55, 0.15) 100%)';
        }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <i className="bi bi-lightning-charge-fill" style={{ color: '#D4AF37', fontSize: '1rem' }} />
            <span style={{
              color: '#D4AF37',
              fontSize: '0.8rem',
              fontWeight: '700',
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              fontFamily: '"Cinzel", "Playfair Display", serif',
            }}>
              CENTAUR INTELLIGENCE
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: 'rgba(212, 175, 55, 0.6)', fontSize: '0.7rem' }}>
              Meet Yohannes, your AI advisor
            </span>
            <i className="bi bi-chevron-right" style={{ color: '#D4AF37', fontSize: '0.7rem' }} />
          </div>
        </div>
      </Link>

      <OrgHomeCards />

      {!isOrgUser && (
        <>
      {/* Row 1 — three equal cards */}
      <div className="hts-row hts-row-1">
        <div className="db-card hts-card">
          <div className="db-card-header">
            <h3>Portfolio Snapshot</h3>
          </div>
          <div className="hts-card-body">
            <p className="hts-label">Total value</p>
            <div className="hts-stat-lg">{displayValue}</div>
            <div className={`hts-change-row ${portfolioChange >= 0 ? 'positive' : 'negative'}`}>
              {hasPortfolio ? (
                <>
                  {portfolioChange >= 0 ? '▲' : '▼'} {changeStr}{' '}
                  <span className="hts-muted-inline">
                    ({todayPct >= 0 ? '+' : ''}
                    {todayPct.toFixed(2)}%) today
                  </span>
                </>
              ) : (
                <span className="hts-muted-inline">Connect a brokerage to track daily P&amp;L</span>
              )}
            </div>
            <div className="hts-progress-track">
              <div className="hts-progress-fill" style={{ width: `${investedPct}%` }} />
            </div>
            <p className="hts-caption">
              {hasPortfolio ? `${investedPct}% invested` : '0% invested'}
            </p>
            <Link href="/home-dashboard" className="hts-card-link">
              View portfolio <i className="bi bi-arrow-right" />
            </Link>
          </div>
        </div>

        <div className="db-card hts-card">
          <div className="db-card-header">
            <h3>Your Movers Today</h3>
          </div>
          <div className="hts-card-body">
            {movers.length === 0 ? (
              <p className="hts-empty">No price data yet.</p>
            ) : (
              movers.map((m) => (
                <div key={m.ticker} className="hts-mover-row">
                  <span className={`hts-indicator-dot ${m.pctChange >= 0 ? 'positive' : 'negative'}`} />
                  <span className="hts-ticker-name">{m.ticker}</span>
                  <span className={`hts-ticker-pct ${m.pctChange >= 0 ? 'positive' : 'negative'}`}>
                    {m.pctChange >= 0 ? '▲' : '▼'}{' '}
                    {m.pctChange >= 0 ? '+' : ''}
                    {m.pctChange.toFixed(1)}%
                  </span>
                </div>
              ))
            )}
            <p className="hts-footnote">
              {hasPortfolio ? `${enrichedHoldings.length} stocks in portfolio` : '0 stocks in portfolio'}
            </p>
            <Link href="/home-dashboard" className="hts-card-link">
              See all holdings <i className="bi bi-arrow-right" />
            </Link>
          </div>
        </div>

        <div className="db-card hts-card">
          <div className="db-card-header">
            <h3>Your Streak</h3>
          </div>
          <div className="hts-card-body">
            <div className="hts-streak-head">
              <span className="hts-streak-emoji" aria-hidden style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'rgba(245, 158, 11, 0.1)',
                border: '1px solid rgba(245, 158, 11, 0.15)',
              }}>
                <i className="bi bi-fire" style={{ fontSize: '1.1rem', color: '#f59e0b' }} />
              </span>
              <span className="hts-streak-num">{streakDays} Days</span>
            </div>
            <div className="hts-week-dots">
              {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
                <span key={d + i} className="hts-week-dot-wrap">
                  {d}
                  <span className={`hts-dot-day ${i < 5 ? 'on' : ''}`} />
                </span>
              ))}
            </div>
            <p className="hts-footnote">
              Checklist: {checklistDone}/{checklistTotal} complete
            </p>
            <Link href="/home-dashboard" className="hts-card-link">
              Keep it going <i className="bi bi-arrow-right" />
            </Link>
          </div>
        </div>
      </div>

      {/* Row 2 — full width weekly recap (tabbed) */}
      <div className="hts-row hts-row-2">
        <div className="db-card hts-card hts-week-card">
          <ThisWeekOnEzana
            hasPortfolio={hasPortfolio}
            hasUser={hasUser}
            portfolioTotal={portfolioTotal}
            portfolioChange={portfolioChange}
            enrichedHoldings={enrichedHoldings}
            portfolioLoading={loading}
            weekPlaidTransactions={weekPlaidTransactions}
            weekTradeHistory={weekTradeHistory}
            weekActivityLoading={weekActivityLoading}
          />
        </div>
      </div>

      {/* Row 3 — two equal cards */}
      <div className="hts-row hts-row-3">
        <div className="db-card hts-card">
          <div className="db-card-header">
            <h3>Congressional Tracker</h3>
          </div>
          <div className="hts-card-body">
            <p className="hts-footnote" style={{ marginTop: 0 }}>
              Following: {MOCK_CAPITOL.following} Politicians
            </p>
            {MOCK_CAPITOL.rows.map((r) => (
              <div key={r.name} className="hts-capitol-line">
                <Link href="/inside-the-capitol" className="hts-capitol-name hts-capitol-name--link">
                  {r.name}
                </Link>
                <span className="hts-capitol-detail hts-capitol-detail--right">
                  {r.line}
                  {r.ago ? <span className="hts-capitol-ago">  {r.ago}</span> : null}
                </span>
              </div>
            ))}
            <p className="hts-footnote" style={{ marginTop: '0.75rem' }}>
              🔔 {MOCK_CAPITOL.newThisWeek} new trades from your watchlist this week
            </p>
            <Link href="/inside-the-capitol" className="hts-card-link">
              View all <i className="bi bi-arrow-right" />
            </Link>
          </div>
        </div>

        <div className="db-card hts-card">
          <div className="db-card-header">
            <h3>Market Pulse</h3>
          </div>
          <div className="hts-card-body">
            <p className="hts-footnote" style={{ marginTop: 0 }}>
              Personalized for your portfolio
            </p>
            <p className="hts-subsection-title">Your Sectors Today</p>
            {(mockData?.sectors || MOCK_PULSE_SECTORS).map((s) => {
              const pct = Number(s.change ?? s.pct ?? 0);
              return (
                <div key={s.name} className="hts-sector-row">
                  <span className="hts-sector-name">{s.name}</span>
                  <span className={`hts-sector-pct ${pct >= 0 ? 'positive' : 'negative'}`}>
                    {pct >= 0 ? '▲' : '▼'} {pct >= 0 ? '+' : ''}
                    {pct.toFixed(1)}%
                  </span>
                </div>
              );
            })}
            <p className="hts-subsection-title">Stocks You Own Moving Most</p>
            <div className="hts-movers-grid">
              {MOCK_PULSE_STOCKS.map((s) => (
                <span key={s.tk} className="hts-pulse-stock">
                  {s.tk}{' '}
                  <span className={`hts-pulse-change ${s.up ? 'positive' : 'negative'}`}>
                    {s.up ? '▲' : '▼'} {s.up ? '+' : '-'}
                    {s.v}%
                  </span>
                </span>
              ))}
            </div>
            <p className="hts-label" style={{ marginBottom: '0.35rem' }}>
              Market Sentiment
            </p>
            <div className="hts-sentiment-bar">
              <div className="hts-sentiment-fill" style={{ width: '72%' }} />
            </div>
            <p className="hts-caption">
              Bullish (72%) · Based on your 6 holdings across 3 sectors
            </p>
          </div>
        </div>
      </div>

      {/* Row 4 — two equal cards */}
      <div className="hts-row hts-row-4">
        <div className="db-card hts-card">
          <div className="db-card-header">
            <h3>Activity Score</h3>
          </div>
          <div className="hts-card-body">
            <div className="hts-activity-score">{activityScore} / 100</div>
            <div className="hts-activity-bar">
              <span style={{ width: `${activityScore}%` }} />
            </div>
            <div className="hts-activity-label">{scoreLabel(activityScore)}</div>
            <p className="hts-footnote">Streak: <i className="bi bi-fire" style={{ color: '#f59e0b', marginRight: '2px' }} /> {streakDays} days</p>
            <p className="hts-subsection-title">This Week</p>
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
            <p className="hts-caption" style={{ marginTop: '0.75rem' }}>
              Complete a learning module to hit 85+
            </p>
          </div>
        </div>

        <div className="db-card hts-card">
          <div className="db-card-header">
            <h3>Upcoming Events &amp; Alerts</h3>
          </div>
          <div className="hts-card-body">
            <div className="hts-events-chain">
              <div className="hts-chain-item">
                <div className="hts-chain-dot" />
                <div className="hts-chain-content">
                  <div className="hts-chain-header">
                    <span className="hts-chain-title">NVDA Alert</span>
                    <span className="hts-chain-severity hts-chain-elevated">ALERT</span>
                    <span className="hts-chain-ago">Today</span>
                  </div>
                  <div className="hts-chain-time">Approaching target price ($960)</div>
                  <p className="hts-chain-body">Current: $954.70 — 0.6% away from your alert</p>
                </div>
              </div>
              <div className="hts-chain-item">
                <div className="hts-chain-dot" />
                <div className="hts-chain-content">
                  <div className="hts-chain-header">
                    <span className="hts-chain-title">AAPL Earnings</span>
                    <span className="hts-chain-severity hts-chain-moderate">EARNINGS</span>
                    <span className="hts-chain-ago">Tomorrow</span>
                  </div>
                  <div className="hts-chain-time">After Hours</div>
                  <p className="hts-chain-body">You hold 7 shares — watch for guidance update</p>
                </div>
              </div>
              <div className="hts-chain-item">
                <div className="hts-chain-dot" />
                <div className="hts-chain-content">
                  <div className="hts-chain-header">
                    <span className="hts-chain-title">Senate Banking Hearing</span>
                    <span className="hts-chain-severity hts-chain-moderate">CONGRESS</span>
                    <span className="hts-chain-ago">This Week</span>
                  </div>
                  <div className="hts-chain-time">Committee Hearing</div>
                  <p className="hts-chain-body">3 politicians you follow are members</p>
                </div>
              </div>
              <div className="hts-chain-item">
                <div className="hts-chain-dot" />
                <div className="hts-chain-content">
                  <div className="hts-chain-header">
                    <span className="hts-chain-title">GOOGL Earnings</span>
                    <span className="hts-chain-severity hts-chain-moderate">EARNINGS</span>
                    <span className="hts-chain-ago">Apr 2</span>
                  </div>
                  <div className="hts-chain-time">Earnings Report</div>
                  <p className="hts-chain-body">You hold 10 shares</p>
                </div>
              </div>
            </div>
            <p className="hts-events-footer">3 events · 2 alerts</p>
          </div>
        </div>
      </div>
        </>
      )}
    </div>
  );
}
