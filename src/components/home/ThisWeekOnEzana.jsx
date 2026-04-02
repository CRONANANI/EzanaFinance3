'use client';

import { useMemo, useState } from 'react';
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from 'recharts';

const TABS = [
  { key: 'market', label: 'Market Performance' },
  { key: 'activity', label: 'Platform Activity' },
];

/** Absolute index levels Mon–Fri (reference layout) */
const INDEX_CHART_DATA = [
  { day: 'Mon', sp500: 5420, nasdaq: 16100, dow: 35800 },
  { day: 'Tue', sp500: 5450, nasdaq: 16150, dow: 35900 },
  { day: 'Wed', sp500: 5480, nasdaq: 16200, dow: 36000 },
  { day: 'Thu', sp500: 5500, nasdaq: 16280, dow: 36050 },
  { day: 'Fri', sp500: 5523, nasdaq: 16302, dow: 36107 },
];

const INDEX_CARDS = [
  {
    name: 'S&P 500',
    value: '5,522.9',
    pct: '+1.32%',
    positive: true,
    badge: 'PARTIAL',
    cap: '$42.1T cap',
    status: 'Rebounding',
  },
  {
    name: 'NASDAQ',
    value: '16,302',
    pct: '+1.29%',
    positive: true,
    badge: 'SUCCESS',
    cap: '$18.4T cap',
    status: 'Alternating',
  },
  {
    name: 'SCOP1',
    value: '36,167',
    pct: '+1.39%',
    positive: true,
    badge: 'SUCCESS',
    cap: 'Composite',
    status: 'Rebounding',
  },
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

function MarketPerformanceTab({ compact = false }) {
  const chartH = compact ? 150 : 220;
  const idxTitle = compact ? '0.6875rem' : '0.75rem';
  const idxValue = compact ? '0.9375rem' : '1.125rem';
  const gridCols = compact ? 'minmax(0, 128px) minmax(0, 1fr)' : 'minmax(0, 200px) minmax(0, 1fr)';
  const cardPad = compact ? '0.5rem 0.6rem' : '0.75rem 0.85rem';
  const gap = compact ? '0.5rem' : '1.25rem';

  return (
    <div
      className="hts-week-tab-inner hts-week-market-v2"
      style={{
        display: 'grid',
        gridTemplateColumns: gridCols,
        gap,
        alignItems: 'stretch',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: compact ? '0.35rem' : '0.65rem' }}>
        {INDEX_CARDS.map((idx) => (
          <div
            key={idx.name}
            style={{
              padding: cardPad,
              borderRadius: 12,
              background: 'rgba(16, 185, 129, 0.04)',
              border: '1px solid rgba(16, 185, 129, 0.08)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <span style={{ fontSize: idxTitle, fontWeight: 800, color: '#f0f6fc' }}>{idx.name}</span>
              <span
                style={{
                  fontSize: compact ? '0.5rem' : '0.5625rem',
                  fontWeight: 700,
                  padding: '0.15rem 0.4rem',
                  borderRadius: 4,
                  background: idx.badge === 'SUCCESS' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.12)',
                  color: idx.badge === 'SUCCESS' ? '#10b981' : '#f59e0b',
                }}
              >
                {idx.badge}
              </span>
            </div>
            <p style={{ margin: 0, fontSize: idxValue, fontWeight: 800, color: '#f0f6fc', letterSpacing: '-0.02em' }}>
              {idx.value}
            </p>
            <p style={{ margin: '0.25rem 0 0', fontSize: compact ? '0.6rem' : '0.6875rem', color: '#6b7280' }}>{idx.cap}</p>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
              <span style={{ fontSize: compact ? '0.65rem' : '0.75rem', fontWeight: 700, color: idx.positive ? '#10b981' : '#ef4444' }}>
                {idx.pct}
              </span>
              <span style={{ fontSize: compact ? '0.55rem' : '0.625rem', color: '#8b949e' }}>{idx.status}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="hts-week-chart-wrap" style={{ minHeight: chartH }}>
        <ResponsiveContainer width="100%" height={chartH}>
          <LineChart data={INDEX_CHART_DATA} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
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
            />
            <Legend
              wrapperStyle={{ fontSize: compact ? '0.6rem' : '0.6875rem', color: '#8b949e', paddingTop: compact ? 4 : 8 }}
              formatter={(value) => <span style={{ color: '#e2e8f0' }}>{value}</span>}
            />
            <Line type="monotone" dataKey="sp500" stroke="#ef4444" strokeWidth={2} dot={false} name="S&P 500" />
            <Line type="monotone" dataKey="nasdaq" stroke="#10b981" strokeWidth={2} dot={false} name="NASDAQ" />
            <Line type="monotone" dataKey="dow" stroke="#f59e0b" strokeWidth={2} dot={false} name="Dow Jones" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function PlatformActivityTab() {
  const rows = [
    {
      title: 'NVDA is the most discussed stock',
      sub: '900 mentions this week',
      score: '+9 / 5',
      pct: 85,
    },
    {
      title: 'Community sentiment is bullish',
      sub: '72% buying activity this month',
      score: '72%',
      pct: 72,
    },
    {
      title: 'Engaged in 3 community posts',
      sub: 'Keep the streak alive',
      score: '+0 / 5',
      pct: 60,
    },
    {
      title: 'Reviewed 10 capitol trades',
      sub: 'Capitol watchlist',
      score: '+7 / 10',
      pct: 70,
    },
  ];

  return (
    <div className="hts-week-tab-inner hts-week-activity-v2" style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
      {rows.map((row) => (
        <div
          key={row.title}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '0.65rem 0',
            borderBottom: '1px solid rgba(16, 185, 129, 0.06)',
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: 'rgba(16, 185, 129, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <i className="bi bi-graph-up-arrow" style={{ color: '#10b981', fontSize: '0.9rem' }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: '0.8125rem', fontWeight: 700, color: '#f0f6fc' }}>{row.title}</p>
            <p style={{ margin: '0.15rem 0 0', fontSize: '0.6875rem', color: '#6b7280' }}>{row.sub}</p>
            <div
              style={{
                marginTop: 6,
                height: 4,
                borderRadius: 2,
                background: 'rgba(16, 185, 129, 0.1)',
                overflow: 'hidden',
              }}
            >
              <div style={{ width: `${row.pct}%`, height: '100%', borderRadius: 2, background: '#10b981' }} />
            </div>
          </div>
          <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#10b981', whiteSpace: 'nowrap' }}>{row.score}</span>
        </div>
      ))}

      <div style={{ marginTop: '0.5rem' }}>
        <p style={{ fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6b7280', margin: '0 0 0.5rem' }}>
          Your standing
        </p>
        <p style={{ margin: '0 0 0.5rem', fontSize: '0.8125rem', color: '#e2e8f0' }}>
          You&apos;re more active than <strong style={{ color: '#10b981' }}>60%</strong> of users
        </p>
        <div style={{ height: 8, borderRadius: 4, background: 'rgba(16, 185, 129, 0.1)', overflow: 'hidden', marginBottom: '0.65rem' }}>
          <div style={{ width: '60%', height: '100%', borderRadius: 4, background: 'linear-gradient(90deg, #10b981, #34d399)' }} />
        </div>
        <p style={{ margin: 0, fontSize: '0.75rem', color: '#8b949e' }}>
          <i className="bi bi-bar-chart-line" style={{ marginRight: 6, color: '#10b981' }} />
          Ranked <strong style={{ color: '#f0f6fc' }}>#8</strong> amongst friends{' '}
          <span style={{ color: '#10b981' }}>(up 2 spots from last month)</span>
        </p>
      </div>
    </div>
  );
}

export function ThisWeekOnEzana({ compact = false }) {
  const [activeTab, setActiveTab] = useState('market');
  const range = useMemo(() => weekRangeLabel(), []);

  return (
    <>
      <div className="db-card-header hts-week-header">
        <div className="hts-week-header-titles">
          <h3>
            <span className="hts-week-title-ico" aria-hidden>
              📊{' '}
            </span>
            This Week on Ezana
          </h3>
          <span className="hts-week-date-range">{range}</span>
        </div>
      </div>
      <div className={`hts-card-body hts-week-card-body${compact ? ' hts-week-card-body--compact' : ''}`}>
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
          {activeTab === 'market' && <MarketPerformanceTab compact={compact} />}
          {activeTab === 'activity' && <PlatformActivityTab />}
        </div>
      </div>
    </>
  );
}
