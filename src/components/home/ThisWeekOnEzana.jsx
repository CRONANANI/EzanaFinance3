'use client';

import { useMemo, useState, useEffect } from 'react';
import { Calendar } from 'lucide-react';
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
  ReferenceLine,
} from 'recharts';

const TABS = [
  { key: 'market', label: 'Market Performance' },
  { key: 'activity', label: 'Platform Activity' },
];

function addDaysYmd(ymd, delta) {
  const [Y, M, D] = ymd.split('-').map(Number);
  const ms = Date.UTC(Y, M - 1, D, 12, 0, 0) + delta * 86400000;
  return new Date(ms).toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
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

const SERIES_COLORS = {
  spx: '#ef4444',
  ixic: '#10b981',
  rut: '#8b5cf6',
  dji: '#f59e0b',
  vix: '#ec4899',
};

const SERIES_NAMES = {
  spx: 'S&P 500 (SPX)',
  ixic: 'NASDAQ (IXIC)',
  rut: 'Russell 2000 (RUT)',
  dji: 'Dow (DJIA)',
  vix: 'VIX',
};

/**
 * Convert raw close prices to % change from Monday's close.
 * When data is flat (all identical), spread lines across a small visual band
 * so all 5 indices are visible rather than stacking on top of each other at 0.
 * @returns {{ data: Array, sourceWasFlat: boolean }}
 */
function normalizeToPercentChange(series) {
  if (!Array.isArray(series) || series.length === 0) {
    return { data: [], sourceWasFlat: false };
  }

  const num = (v) =>
    typeof v === 'number' && Number.isFinite(v)
      ? v
      : typeof v === 'string'
        ? parseFloat(v)
        : NaN;

  // Find the first valid value for each key (Monday's close = baseline)
  const bases = {};
  for (const k of CHART_KEYS) {
    bases[k] = null;
    for (const row of series) {
      const parsed = num(row[k]);
      if (!Number.isNaN(parsed) && parsed !== 0) {
        bases[k] = parsed;
        break;
      }
    }
  }

  const normalized = series.map((r) => {
    const out = { day: r.day };
    for (const k of CHART_KEYS) {
      const b = bases[k];
      const parsed = num(r[k]);
      if (!Number.isNaN(parsed) && b != null && b !== 0) {
        out[k] = ((parsed - b) / b) * 100;
      } else {
        out[k] = null;
      }
    }
    return out;
  });

  // Check if all values are flat (same across all days for every series)
  let isFlat = true;
  for (const k of CHART_KEYS) {
    const vals = normalized.map((r) => r[k]).filter((v) => v != null);
    if (vals.length >= 2) {
      const first = vals[0];
      if (vals.some((v) => Math.abs(v - first) > 0.001)) {
        isFlat = false;
        break;
      }
    }
  }

  // If flat, offset each series by a small visual amount (±0.2%) so lines are distinct
  if (isFlat && normalized.length > 0) {
    const offsets = { spx: 0.4, ixic: 0.2, rut: 0, dji: -0.2, vix: -0.4 };
    const data = normalized.map((r) => {
      const out = { day: r.day };
      for (const k of CHART_KEYS) {
        out[k] = r[k] != null ? r[k] + offsets[k] : null;
      }
      return out;
    });
    return { data, sourceWasFlat: true };
  }

  return { data: normalized, sourceWasFlat: false };
}

function MarketPerformanceTab({ compact = false, indexPayload, chartOnly = false }) {
  const chartH = chartOnly ? (compact ? 268 : 300) : compact ? 168 : 220;
  const { data: chartData, sourceWasFlat } = useMemo(
    () => normalizeToPercentChange(indexPayload?.series || []),
    [indexPayload],
  );
  const loading = indexPayload === null;
  const cards = indexPayload?.cards;

  const noData =
    !loading &&
    indexPayload &&
    (!chartData.length ||
      chartData.every((r) => CHART_KEYS.every((k) => r[k] == null)));

  // Same quote gap-filled → flat before offsets; sourceWasFlat preserves the warning after visual offsets
  const dataIsFlat = !noData && chartData.length > 0 && sourceWasFlat;

  // Compute Y domain with some padding so lines don't hug the edges
  const yDomain = useMemo(() => {
    if (!chartData.length) return [-2, 2];
    let min = 0;
    let max = 0;
    for (const row of chartData) {
      for (const k of CHART_KEYS) {
        const v = row[k];
        if (v != null) {
          if (v < min) min = v;
          if (v > max) max = v;
        }
      }
    }
    // If all values are 0 (flat), show a reasonable range
    if (min === 0 && max === 0) return [-2, 2];
    const pad = Math.max(Math.abs(max - min) * 0.2, 0.5);
    return [Math.floor((min - pad) * 10) / 10, Math.ceil((max + pad) * 10) / 10];
  }, [chartData]);

  return (
    <div
      className={`hts-week-tab-inner hts-week-market-v3${chartOnly ? ' hts-week-market-v3--chart-only' : ''}`}
    >
      {loading && (
        <p
          className="hts-week-loading"
          style={{ margin: '0 0 0.35rem', textAlign: 'center' }}
        >
          Loading market data…
        </p>
      )}
      {cards && !loading && (
        <div
          className="hts-week-index-strip"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
            gap: compact ? '2px 4px' : '4px 6px',
            marginBottom: '0.35rem',
          }}
        >
          {[
            { label: 'SPX', val: cards.spx },
            { label: 'IXIC', val: cards.ixic },
            { label: 'RUT', val: cards.rut },
            { label: 'DJIA', val: cards.dji },
            { label: 'VIX', val: cards.vix },
          ].map(({ label, val }) => (
            <div key={label} style={{ minWidth: 0, textAlign: 'center' }}>
              <div className="hts-week-metric-label" style={{ marginBottom: 2 }}>
                {label}
              </div>
              <div className="hts-week-metric-val" style={{ lineHeight: 1.2 }}>
                {val}
              </div>
            </div>
          ))}
        </div>
      )}
      <div
        className="hts-week-chart-wrap hts-week-chart-wrap--full"
        style={{
          height: chartH,
          minHeight: chartH,
          flex: chartOnly ? '1 1 auto' : undefined,
          minWidth: 0,
          width: '100%',
          position: 'relative',
        }}
      >
        {noData && (
          <p
            className="hts-week-loading"
            style={{ margin: '0.5rem 0', textAlign: 'center' }}
          >
            {indexPayload?.error === 'no_key'
              ? 'Add FINNHUB_API_KEY for live index data.'
              : indexPayload?.ok === false || indexPayload?.error === 'fetch_failed'
                ? 'Could not load market data — check Vercel logs and FINNHUB_API_KEY.'
                : indexPayload?._debug?.hasAnyData === false
                  ? 'Finnhub returned empty data — this may be a rate limit issue or the market is closed. Check Vercel function logs.'
                  : 'No OHLC data for this week yet.'}
          </p>
        )}
        {dataIsFlat && !noData && (
          <p
            className="hts-week-loading"
            style={{
              margin: '0',
              textAlign: 'center',
              fontSize: '0.625rem',
              color: 'var(--home-muted)',
              position: 'absolute',
              top: 4,
              left: 0,
              right: 0,
              zIndex: 2,
            }}
          >
            Showing latest available prices — intraweek candle data may be delayed.
          </p>
        )}
        <ResponsiveContainer width="100%" height={chartH}>
          <LineChart
            data={
              chartData.length
                ? chartData
                : [
                    { day: 'Mon' },
                    { day: 'Tue' },
                    { day: 'Wed' },
                    { day: 'Thu' },
                    { day: 'Fri' },
                  ]
            }
            margin={{
              top: 8,
              right: 12,
              left: compact ? -4 : 4,
              bottom: chartOnly ? 52 : 40,
            }}
          >
            <XAxis
              dataKey="day"
              interval={0}
              padding={{ left: 12, right: 8 }}
              tick={{ fill: 'var(--home-muted)', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              domain={yDomain}
              tickFormatter={(v) => `${v > 0 ? '+' : ''}${v.toFixed(1)}%`}
              tick={{ fill: 'var(--home-muted)', fontSize: 9 }}
              axisLine={false}
              tickLine={false}
              width={compact ? 38 : 44}
              tickCount={5}
            />
            <ReferenceLine y={0} stroke="rgba(107, 114, 128, 0.3)" strokeDasharray="3 3" />
            <Tooltip
              formatter={(value, name) => {
                if (typeof value !== 'number') return ['—', name];
                const sign = value >= 0 ? '+' : '';
                return [`${sign}${value.toFixed(2)}%`, name];
              }}
              contentStyle={{
                background: '#161b22',
                border: '1px solid rgba(16, 185, 129, 0.15)',
                borderRadius: '8px',
                fontSize: '0.7rem',
                color: '#e2e8f0',
              }}
              labelStyle={{ color: 'var(--home-muted-soft)', fontWeight: 600, marginBottom: 4 }}
            />
            <Legend
              iconType="plainline"
              iconSize={8}
              wrapperStyle={{
                fontSize: compact ? '0.5rem' : '0.5625rem',
                color: 'var(--home-muted-soft)',
                paddingTop: 2,
                lineHeight: 1.2,
              }}
              formatter={(value) => (
                <span style={{ color: 'var(--home-row-text)' }}>{value}</span>
              )}
            />
            {CHART_KEYS.map((k) => (
              <Line
                key={k}
                type="monotone"
                dataKey={k}
                stroke={SERIES_COLORS[k]}
                strokeWidth={1.8}
                dot={{ r: 2.5, fill: SERIES_COLORS[k], strokeWidth: 0 }}
                activeDot={{ r: 4, strokeWidth: 1.5, stroke: '#161b22' }}
                connectNulls
                name={SERIES_NAMES[k]}
                isAnimationActive={false}
              />
            ))}
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
      color: '#3b82f6',
    },
    {
      title: 'Community sentiment is bullish',
      sub: '72% buying activity this month',
      score: '72%',
      pct: 72,
      color: '#10b981',
    },
    {
      title: 'Engaged in 3 community posts',
      sub: 'Keep the streak alive',
      score: '+0 / 5',
      pct: 60,
      color: '#f59e0b',
    },
    {
      title: 'Reviewed 10 capitol trades',
      sub: 'Capitol watchlist',
      score: '+7 / 10',
      pct: 70,
      color: '#8b5cf6',
    },
  ];

  return (
    <div
      className="hts-week-tab-inner hts-week-activity-v2"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
      }}
    >
      {rows.map((row) => (
        <div
          key={row.title}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '0.3rem 0',
            borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: `${row.color}1f`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <i
              className="bi bi-graph-up-arrow"
              style={{ color: row.color, fontSize: '0.9rem' }}
            />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p
              style={{
                margin: 0,
                fontSize: '0.8125rem',
                fontWeight: 700,
                color: '#f0f6fc',
              }}
            >
              {row.title}
            </p>
            <p
              style={{
                margin: '0.15rem 0 0',
                fontSize: '0.6875rem',
                color: 'var(--home-muted)',
              }}
            >
              {row.sub}
            </p>
            <div
              style={{
                marginTop: 6,
                height: 4,
                borderRadius: 2,
                background: `${row.color}1a`,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${row.pct}%`,
                  height: '100%',
                  borderRadius: 2,
                  background: row.color,
                }}
              />
            </div>
          </div>
          <span className="db-tx-amount" style={{ color: row.color, whiteSpace: 'nowrap' }}>
            {row.score}
          </span>
        </div>
      ))}

      <div style={{ marginTop: '0.35rem' }}>
        <p
          style={{
            fontSize: '0.625rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
                color: 'var(--home-muted)',
            margin: '0 0 0.5rem',
          }}
        >
          Your standing
        </p>
        <p
          style={{
            margin: '0 0 0.5rem',
            fontSize: '0.8125rem',
            color: 'var(--home-row-text)',
          }}
        >
          You&apos;re more active than{' '}
          <strong style={{ color: '#10b981' }}>60%</strong> of users
        </p>
        <div
          style={{
            height: 8,
            borderRadius: 4,
            background: 'rgba(16, 185, 129, 0.1)',
            overflow: 'hidden',
            marginBottom: '0.65rem',
          }}
        >
          <div
            style={{
              width: '60%',
              height: '100%',
              borderRadius: 4,
              background: 'linear-gradient(90deg, #10b981, #34d399)',
            }}
          />
        </div>
        <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--home-muted-soft)' }}>
          <i
            className="bi bi-bar-chart-line"
            style={{ marginRight: 6, color: '#10b981' }}
          />
          Ranked <strong style={{ color: '#f0f6fc' }}>#8</strong> amongst
          friends{' '}
          <span style={{ color: '#10b981' }}>
            (up 2 spots from last month)
          </span>
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
      .then(async (r) => {
        let data = {};
        try {
          data = await r.json();
        } catch {
          data = {};
        }
        if (!r.ok) {
          return {
            ok: false,
            error: 'fetch_failed',
            series: Array.isArray(data.series) ? data.series : [],
          };
        }
        return data;
      })
      .then((data) => {
        if (!cancelled) setIndexPayload(data);
      })
      .catch(() => {
        if (!cancelled)
          setIndexPayload({ ok: false, error: 'fetch_failed', series: [] });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      <div className="db-card-header hts-week-header">
        <div className="hts-week-header-titles">
          <h3 style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
            <Calendar
              className="hts-week-title-ico"
              size={18}
              strokeWidth={2}
              aria-hidden
              style={{ flexShrink: 0, color: 'var(--home-heading)' }}
            />
            This Week on Ezana
          </h3>
          <span className="hts-week-date-range">{range}</span>
        </div>
      </div>
      <div
        className={`hts-card-body hts-week-card-body${compact ? ' hts-week-card-body--compact' : ''}`}
      >
        <div
          className="hts-week-tabs db-tf-group-sm"
          role="tablist"
          aria-label="Weekly recap sections"
        >
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
          className={`hts-week-panel ${activeTab === 'activity' ? 'hts-week-panel--fit' : ''}`}
          role="tabpanel"
        >
          {activeTab === 'market' && (
            <MarketPerformanceTab
              compact={compact}
              indexPayload={indexPayload}
              chartOnly={marketChartOnly}
            />
          )}
          {activeTab === 'activity' && <PlatformActivityTab />}
        </div>
      </div>
    </>
  );
}
