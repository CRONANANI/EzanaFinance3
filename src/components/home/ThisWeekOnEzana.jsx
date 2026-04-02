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

const FALLBACK_CARDS = [
  { name: 'S&P 500', value: '—', pct: '—', positive: true, badge: 'LIVE', cap: 'ETF proxy', status: 'Loading' },
  { name: 'NASDAQ', value: '—', pct: '—', positive: true, badge: 'LIVE', cap: 'ETF proxy', status: 'Loading' },
  { name: 'SCOP1', value: '—', pct: '—', positive: true, badge: 'LIVE', cap: 'DIA proxy', status: 'Loading' },
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

/** Index to 100 at first row with all three closes so lines are comparable (not flat at bottom). */
function normalizeWeekSeries(series) {
  if (!Array.isArray(series) || series.length === 0) return [];
  let baseSp;
  let baseNq;
  let baseDj;
  for (const row of series) {
    if (row.sp500 != null && row.nasdaq != null && row.dow != null) {
      baseSp = row.sp500;
      baseNq = row.nasdaq;
      baseDj = row.dow;
      break;
    }
  }
  if (baseSp == null) return series.map((r) => ({ ...r, sp500: null, nasdaq: null, dow: null }));
  return series.map((r) => ({
    day: r.day,
    sp500: r.sp500 != null ? (r.sp500 / baseSp) * 100 : null,
    nasdaq: r.nasdaq != null ? (r.nasdaq / baseNq) * 100 : null,
    dow: r.dow != null ? (r.dow / baseDj) * 100 : null,
  }));
}

function buildIndexCards(apiPayload) {
  const c = apiPayload?.cards;
  if (!c) return FALLBACK_CARDS;
  const week = apiPayload?.series;
  let wtdSp = null;
  let wtdNq = null;
  let wtdDj = null;
  if (Array.isArray(week) && week.length) {
    const first = week.find((r) => r.sp500 != null);
    const last = [...week].reverse().find((r) => r.sp500 != null);
    if (first && last && first !== last) {
      wtdSp = ((last.sp500 - first.sp500) / first.sp500) * 100;
      wtdNq = ((last.nasdaq - first.nasdaq) / first.nasdaq) * 100;
      wtdDj = ((last.dow - first.dow) / first.dow) * 100;
    }
  }
  const fmtPct = (x) => (x == null || Number.isNaN(x) ? '—' : `${x >= 0 ? '+' : ''}${x.toFixed(2)}%`);
  return [
    {
      name: 'S&P 500',
      value: c.sp500 ?? '—',
      pct: fmtPct(wtdSp),
      positive: wtdSp == null || wtdSp >= 0,
      badge: 'LIVE',
      cap: 'SPY daily close',
      status: apiPayload?.ok === false ? 'Demo' : 'Week',
    },
    {
      name: 'NASDAQ',
      value: c.nasdaq ?? '—',
      pct: fmtPct(wtdNq),
      positive: wtdNq == null || wtdNq >= 0,
      badge: 'LIVE',
      cap: 'QQQ daily close',
      status: apiPayload?.ok === false ? 'Demo' : 'Week',
    },
    {
      name: 'SCOP1',
      value: c.scop1 ?? '—',
      pct: fmtPct(wtdDj),
      positive: wtdDj == null || wtdDj >= 0,
      badge: 'LIVE',
      cap: 'DIA daily close',
      status: apiPayload?.ok === false ? 'Demo' : 'Week',
    },
  ];
}

function MarketPerformanceTab({ compact = false, indexPayload }) {
  const chartH = compact ? 168 : 220;
  const idxTitle = compact ? '0.6875rem' : '0.75rem';
  const idxValue = compact ? '0.9375rem' : '1.125rem';
  const cardPad = compact ? '0.45rem 0.5rem' : '0.75rem 0.85rem';
  const cards = useMemo(() => buildIndexCards(indexPayload), [indexPayload]);
  const chartData = useMemo(() => normalizeWeekSeries(indexPayload?.series || []), [indexPayload]);

  const noData =
    indexPayload &&
    (!chartData.length || chartData.every((r) => r.sp500 == null && r.nasdaq == null && r.dow == null));

  return (
    <div className="hts-week-tab-inner hts-week-market-v3">
      <div
        className="hts-week-index-cards-row"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
          gap: compact ? '0.4rem' : '0.65rem',
        }}
      >
        {cards.map((idx) => (
          <div
            key={idx.name}
            style={{
              padding: cardPad,
              borderRadius: 10,
              background: 'rgba(16, 185, 129, 0.04)',
              border: '1px solid rgba(16, 185, 129, 0.08)',
              minWidth: 0,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
              <span style={{ fontSize: idxTitle, fontWeight: 800, color: '#f0f6fc' }}>{idx.name}</span>
              <span
                style={{
                  fontSize: compact ? '0.45rem' : '0.5625rem',
                  fontWeight: 700,
                  padding: '0.1rem 0.3rem',
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
            <p style={{ margin: '0.15rem 0 0', fontSize: compact ? '0.55rem' : '0.6875rem', color: '#6b7280' }}>{idx.cap}</p>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
              <span
                style={{
                  fontSize: compact ? '0.6rem' : '0.75rem',
                  fontWeight: 700,
                  color: idx.positive ? '#10b981' : '#ef4444',
                }}
              >
                {idx.pct}
              </span>
              <span style={{ fontSize: compact ? '0.5rem' : '0.625rem', color: '#8b949e' }}>{idx.status}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="hts-week-chart-wrap hts-week-chart-wrap--full" style={{ minHeight: chartH, flex: 1, minWidth: 0 }}>
        {noData && (
          <p className="hts-week-loading" style={{ margin: '0.5rem 0', textAlign: 'center' }}>
            {indexPayload?.ok === false
              ? 'Add FINNHUB_API_KEY for live index data.'
              : 'No OHLC data for this week yet.'}
          </p>
        )}
        <ResponsiveContainer width="100%" height={chartH}>
          <LineChart data={chartData.length ? chartData : [{ day: 'Mon' }, { day: 'Tue' }, { day: 'Wed' }, { day: 'Thu' }, { day: 'Fri' }]} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
            <XAxis dataKey="day" tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} />
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
            <Line type="monotone" dataKey="sp500" stroke="#ef4444" strokeWidth={2} dot={false} connectNulls={false} name="S&P 500" isAnimationActive={false} />
            <Line type="monotone" dataKey="nasdaq" stroke="#10b981" strokeWidth={2} dot={false} connectNulls={false} name="NASDAQ" isAnimationActive={false} />
            <Line type="monotone" dataKey="dow" stroke="#f59e0b" strokeWidth={2} dot={false} connectNulls={false} name="SCOP1" isAnimationActive={false} />
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
          {activeTab === 'market' && <MarketPerformanceTab compact={compact} indexPayload={indexPayload} />}
          {activeTab === 'activity' && <PlatformActivityTab />}
        </div>
      </div>
    </>
  );
}
