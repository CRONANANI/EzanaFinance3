'use client';

import { useMemo, useState, useEffect } from 'react';
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

function addDaysYmd(ymd, delta) {
  const [Y, M, D] = ymd.split('-').map(Number);
  const t = Date.UTC(Y, M - 1, D) + delta * 86400000;
  return new Date(t).toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
}

function weekdayLongNyFromYmd(ymd) {
  const [Y, M, D] = ymd.split('-').map(Number);
  return new Date(Date.UTC(Y, M - 1, D, 12, 0, 0)).toLocaleDateString('en-US', {
    timeZone: 'America/New_York',
    weekday: 'long',
  });
}

function weekRangeLabel() {
  const fmt = { timeZone: 'America/New_York', month: 'short', day: 'numeric' };
  let cur = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
  for (let i = 0; i < 10; i++) {
    if (weekdayLongNyFromYmd(cur) === 'Monday') break;
    cur = addDaysYmd(cur, -1);
  }
  const sun = addDaysYmd(cur, 6);
  const fmtYmd = (ymd) => {
    const [y, m, d] = ymd.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d, 12, 0, 0)).toLocaleDateString('en-US', fmt);
  };
  return `${fmtYmd(cur)} – ${fmtYmd(sun)}`;
}

const CHART_KEYS = ['spx', 'ixic', 'rut', 'dji', 'vix'];

/** Each series indexed to 100 from its own first available close this week (scales differ: VIX vs SPX). */
function normalizeWeekSeries(series) {
  if (!Array.isArray(series) || series.length === 0) return [];
  const bases = Object.fromEntries(CHART_KEYS.map((k) => [k, undefined]));
  for (const row of series) {
    for (const k of CHART_KEYS) {
      if (bases[k] == null && row[k] != null) bases[k] = row[k];
    }
  }
  return series.map((r) => {
    const out = { day: r.day };
    for (const k of CHART_KEYS) {
      const b = bases[k];
      out[k] = r[k] != null && b != null ? (r[k] / b) * 100 : null;
    }
    return out;
  });
}

function MarketPerformanceTab({ compact = false, indexPayload, chartOnly = false }) {
  const chartH = chartOnly ? (compact ? 268 : 300) : compact ? 168 : 220;
  const chartData = useMemo(() => normalizeWeekSeries(indexPayload?.series || []), [indexPayload]);

  const noData =
    indexPayload &&
    (!chartData.length ||
      chartData.every((r) => CHART_KEYS.every((k) => r[k] == null)));

  return (
    <div className={`hts-week-tab-inner hts-week-market-v3${chartOnly ? ' hts-week-market-v3--chart-only' : ''}`}>
      <div
        className="hts-week-chart-wrap hts-week-chart-wrap--full"
        style={{ minHeight: chartH, flex: chartOnly ? 1 : undefined, minWidth: 0, width: '100%' }}
      >
        {noData && (
          <p className="hts-week-loading" style={{ margin: '0.5rem 0', textAlign: 'center' }}>
            {indexPayload?.ok === false
              ? 'Add FINNHUB_API_KEY for live index data.'
              : 'No OHLC data for this week yet.'}
          </p>
        )}
        <ResponsiveContainer width="100%" height={chartH}>
          <LineChart
            data={chartData.length ? chartData : [{ day: 'Mon' }, { day: 'Tue' }, { day: 'Wed' }, { day: 'Thu' }, { day: 'Fri' }]}
            margin={{ top: 10, right: 10, left: 4, bottom: chartOnly ? 28 : 4 }}
          >
            <XAxis
              dataKey="day"
              interval={0}
              tick={{ fill: '#6b7280', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis hide domain={['auto', 'auto']} />
            <Tooltip
              formatter={(value) => (typeof value === 'number' ? `${value.toFixed(3)} (idx)` : '—')}
              contentStyle={{
                background: '#161b22',
                border: '1px solid rgba(16, 185, 129, 0.15)',
                borderRadius: '8px',
                fontSize: '0.7rem',
                color: '#e2e8f0',
              }}
            />
            <Legend
              wrapperStyle={{ fontSize: compact ? '0.55rem' : '0.6875rem', color: '#8b949e', paddingTop: 4 }}
              formatter={(value) => <span style={{ color: '#e2e8f0' }}>{value}</span>}
            />
            <Line type="monotone" dataKey="spx" stroke="#ef4444" strokeWidth={2} dot={false} connectNulls={false} name="S&P 500 (SPX)" isAnimationActive={false} />
            <Line type="monotone" dataKey="ixic" stroke="#10b981" strokeWidth={2} dot={false} connectNulls={false} name="NASDAQ (IXIC)" isAnimationActive={false} />
            <Line type="monotone" dataKey="rut" stroke="#8b5cf6" strokeWidth={2} dot={false} connectNulls={false} name="Russell 2000 (RUT)" isAnimationActive={false} />
            <Line type="monotone" dataKey="dji" stroke="#f59e0b" strokeWidth={2} dot={false} connectNulls={false} name="Dow (DJIA)" isAnimationActive={false} />
            <Line type="monotone" dataKey="vix" stroke="#ec4899" strokeWidth={1.5} dot={false} connectNulls={false} name="VIX" isAnimationActive={false} />
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

export function ThisWeekOnEzana({ compact = false, marketChartOnly = false }) {
  const [activeTab, setActiveTab] = useState('market');
  const [indexPayload, setIndexPayload] = useState(null);
  const range = useMemo(() => weekRangeLabel(), []);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/market/index-week')
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setIndexPayload(data);
      })
      .catch(() => {
        if (!cancelled) setIndexPayload({ ok: false, series: [] });
      });
    return () => {
      cancelled = true;
    };
  }, []);

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
          {activeTab === 'market' && (
            <MarketPerformanceTab compact={compact} indexPayload={indexPayload} chartOnly={marketChartOnly} />
          )}
          {activeTab === 'activity' && <PlatformActivityTab />}
        </div>
      </div>
    </>
  );
}
