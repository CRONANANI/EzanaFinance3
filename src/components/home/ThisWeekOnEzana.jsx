'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const TABS = [
  { key: 'week', label: 'Your Week' },
  { key: 'market', label: 'Market Performance' },
  { key: 'activity', label: 'Platform Activity' },
  { key: 'community', label: 'Community' },
];

const INDEX_DATA = [
  { day: 'Mon', sp500: 0, nasdaq: 0, dow: 0 },
  { day: 'Tue', sp500: 0.3, nasdaq: 0.5, dow: -0.1 },
  { day: 'Wed', sp500: 0.7, nasdaq: 1.0, dow: 0.1 },
  { day: 'Thu', sp500: 0.9, nasdaq: 1.4, dow: -0.2 },
  { day: 'Fri', sp500: 1.2, nasdaq: 1.8, dow: -0.3 },
];

const ACTIVITY_ROWS = [
  { href: '/inside-the-capitol', icon: '🏛️', cat: 'Congress', text: 'Pelosi bought $1M–5M of NVDA', ago: '2d' },
  { href: '/inside-the-capitol', icon: '🏛️', cat: 'Congress', text: 'Tuberville sold $100K–250K of KMB', ago: '1d' },
  { href: '/community', icon: '💬', cat: 'Community', text: '3 new discussions in topics you follow', ago: '' },
  { href: '/company-research', icon: '📊', cat: 'Earnings', text: 'AAPL (Wed AH) · MSFT (Thu AH) this week', ago: '' },
  { href: '/watchlist', icon: '🔔', cat: 'Alert', text: 'NVDA within 0.6% of your $960 target', ago: '' },
  { href: '/home-dashboard', icon: '📈', cat: 'Movers', text: 'SMCI +18.4% · RIVN -9.2% this week', ago: '' },
  { href: '/home-dashboard', icon: '🎯', cat: 'Checklist', text: 'You completed 2 new tasks this week', ago: '' },
  { href: '/community', icon: '🏆', cat: 'Leaderboard', text: 'You moved up 14 spots to #127', ago: '' },
];

function weekRangeLabel() {
  const now = new Date();
  const day = now.getDay();
  const toMonday = day === 0 ? -6 : 1 - day;
  const mon = new Date(now);
  mon.setDate(now.getDate() + toMonday);
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  const a = mon.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const b = sun.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${a} – ${b}`;
}

function YourWeekTab({ hasPortfolio }) {
  const trades = [2, 3, 0, 0, 2];
  const activeDays = trades.map((n) => n > 0);

  if (!hasPortfolio) {
    return (
      <div className="hts-week-tab-inner hts-week-tab-empty">
        <p>No trades this week</p>
        <p className="hts-label">Connect a brokerage and place trades to see your weekly summary here.</p>
      </div>
    );
  }

  return (
    <div className="hts-week-tab-inner">
      <div className="hts-week-stat-row">
        <div>
          <p className="hts-week-metric-label">Trades Placed</p>
          <p className="hts-week-metric-val">7</p>
        </div>
        <div>
          <p className="hts-week-metric-label">Portfolio Change</p>
          <p className="hts-week-metric-val hts-week-chg-pos">+$1,247 (+0.57%)</p>
        </div>
        <div>
          <p className="hts-week-metric-label">Win Rate</p>
          <p className="hts-week-metric-val">5/7 (71%)</p>
        </div>
      </div>

      <div className="hts-week-best-worst">
        <div>
          <p className="hts-week-metric-label">Best Performer</p>
          <p className="hts-week-metric-val hts-week-chg-pos">
            NVDA <span className="hts-week-metric-sub">▲ +12.3%</span>
          </p>
        </div>
        <div>
          <p className="hts-week-metric-label">Worst Performer</p>
          <p className="hts-week-metric-val hts-week-chg-neg">
            META <span className="hts-week-metric-sub">▼ -3.2%</span>
          </p>
        </div>
      </div>

      <div className="hts-week-inline-pair">
        <span>
          <span className="hts-week-metric-label">Avg Trade Size</span>
          <span className="hts-week-inline-val">$487</span>
        </span>
        <span>
          <span className="hts-week-metric-label">Total Volume</span>
          <span className="hts-week-inline-val">$3,412</span>
        </span>
      </div>

      <div className="hts-week-day-activity">
        <div className="hts-week-day-labels">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map((d) => (
            <span key={d}>{d}</span>
          ))}
        </div>
        <div className="hts-week-day-dots">
          {activeDays.map((on, i) => (
            <span key={String(i)} className={`hts-week-trade-dot ${on ? 'on' : ''}`} />
          ))}
        </div>
        <div className="hts-week-day-counts">
          {trades.map((n, i) => (
            <span key={String(i)}>{n}</span>
          ))}
        </div>
        <p className="hts-week-day-caption">5 of 5 trading days active · trades per day</p>
      </div>

      <p className="hts-week-compare">
        You traded more than <span className="hts-accent-stat">68%</span> of users this week
      </p>
    </div>
  );
}

function MarketPerformanceTab() {
  return (
    <div className="hts-week-tab-inner hts-week-market">
      <div className="hts-week-legend-row">
        <span>
          <i className="hts-week-legend-dot" style={{ background: '#10b981' }} /> S&amp;P 500{' '}
          <span className="hts-week-chg-pos">▲ +1.2%</span>
        </span>
        <span>
          <i className="hts-week-legend-dot" style={{ background: '#3b82f6' }} /> NASDAQ{' '}
          <span className="hts-week-chg-pos">▲ +1.8%</span>
        </span>
        <span>
          <i className="hts-week-legend-dot" style={{ background: '#f59e0b' }} /> DOW{' '}
          <span className="hts-week-chg-neg">▼ -0.3%</span>
        </span>
      </div>

      <div className="hts-week-chart-wrap">
        <ResponsiveContainer width="100%" height={160}>
          <LineChart data={INDEX_DATA} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <XAxis
              dataKey="day"
              tick={{ fill: '#6b7280', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis hide domain={['auto', 'auto']} />
            <Tooltip
              contentStyle={{
                background: '#161b22',
                border: '1px solid rgba(16, 185, 129, 0.15)',
                borderRadius: '8px',
                fontSize: '0.75rem',
                color: '#e2e8f0',
              }}
              formatter={(value) => [`${value > 0 ? '+' : ''}${value}%`, '']}
            />
            <Line type="monotone" dataKey="sp500" stroke="#10b981" strokeWidth={2} dot={false} name="S&P 500" />
            <Line type="monotone" dataKey="nasdaq" stroke="#3b82f6" strokeWidth={2} dot={false} name="NASDAQ" />
            <Line type="monotone" dataKey="dow" stroke="#f59e0b" strokeWidth={2} dot={false} name="DOW" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="hts-week-market-footer">
        <span>VIX: 33.84 (+2.11%)</span>
        <span>Gold: $404.13</span>
        <span>Oil: $114.54</span>
      </div>
    </div>
  );
}

function PlatformActivityTab() {
  return (
    <div className="hts-week-tab-inner hts-week-activity-list">
      {ACTIVITY_ROWS.map((row) => (
        <Link key={row.text} href={row.href} className="hts-week-activity-row">
          <span className="hts-week-activity-icon" aria-hidden>
            {row.icon}
          </span>
          <span className="hts-week-activity-cat">{row.cat}</span>
          <span className="hts-week-activity-desc">{row.text}</span>
          {row.ago ? <span className="hts-week-activity-ago">{row.ago}</span> : null}
        </Link>
      ))}
    </div>
  );
}

function CommunityTab() {
  return (
    <div className="hts-week-tab-inner hts-week-community">
      <div className="hts-week-community-grid">
        <div>
          <p className="hts-week-metric-label">Most Discussed Stock</p>
          <p className="hts-week-metric-val">NVDA — 847 mentions</p>
          <div className="hts-week-mini-bar">
            <span style={{ width: '85%' }} />
          </div>
        </div>
        <div>
          <p className="hts-week-metric-label">Community Sentiment</p>
          <div className="hts-week-sentiment-inline">
            <div className="hts-sentiment-bar hts-week-sentiment-track">
              <div className="hts-sentiment-fill" style={{ width: '72%' }} />
            </div>
            <span className="hts-week-sentiment-pct">Bullish 72%</span>
          </div>
        </div>
      </div>

      <div className="hts-week-community-grid">
        <div>
          <p className="hts-week-metric-label">Trending Topic</p>
          <p className="hts-week-body">AI Stocks — 154 discussions</p>
        </div>
        <div>
          <p className="hts-week-metric-label">Most Followed Politician</p>
          <p className="hts-week-body">Nancy Pelosi — 3,420 followers</p>
        </div>
      </div>

      <div className="hts-week-community-divider" />

      <p className="hts-week-metric-label">Your Standing</p>
      <div className="hts-week-standing-row">
        <span>
          More active than <span className="hts-accent-stat">68%</span> of users
        </span>
        <div className="hts-week-mini-bar wide">
          <span style={{ width: '68%' }} />
        </div>
      </div>
      <p className="hts-week-body">
        Rank: <strong>#127</strong> (<span className="hts-week-chg-pos">▲14</span> from last week)
      </p>
      <p className="hts-week-body">
        <span aria-hidden>🔥</span> 12-day login streak
      </p>
    </div>
  );
}

export function ThisWeekOnEzana({ hasPortfolio = false }) {
  const [activeTab, setActiveTab] = useState('week');
  const range = useMemo(() => weekRangeLabel(), []);

  return (
    <>
      <div className="db-card-header">
        <h3>
          <span className="hts-week-title-ico" aria-hidden>
            📊{' '}
          </span>
          This Week on Ezana
        </h3>
        <span className="hts-week-date-range">{range}</span>
      </div>
      <div className="hts-card-body hts-week-card-body">
        <div className="hts-week-tabs db-tf-group-sm" role="tablist" aria-label="Weekly recap sections">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.key}
              className={`db-tf-btn-sm ${activeTab === tab.key ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div
          className={`hts-week-panel ${activeTab === 'activity' ? 'hts-week-panel--scroll' : ''}`}
          role="tabpanel"
        >
          {activeTab === 'week' && <YourWeekTab hasPortfolio={hasPortfolio} />}
          {activeTab === 'market' && <MarketPerformanceTab />}
          {activeTab === 'activity' && <PlatformActivityTab />}
          {activeTab === 'community' && <CommunityTab />}
        </div>
      </div>
    </>
  );
}
