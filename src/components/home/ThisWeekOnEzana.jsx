'use client';

import { useMemo, useState, useEffect } from 'react';
import { Calendar } from 'lucide-react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const TABS = [
  { key: 'market', label: 'Market Performance' },
  { key: 'activity', label: 'Platform Activity' },
];

/**
 * Fixed Y-axis for Market Performance: domain ±2.5% with ticks every 1 percentage
 * point (less crowded than 0.25% steps). Chart height is derived from width so
 * vertical distance between ticks ≈ 70% of horizontal distance between weekday
 * ticks: (innerH / 5) = 0.7 * (innerW / 4) → innerH = 0.875 * innerW.
 */
const Y_AXIS_TICKS = [-2, -1, 0, 1, 2];
const Y_AXIS_DOMAIN = [-2.5, 2.5];

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

const CHART_KEYS = ['spx', 'ixic', 'rut', 'dji', 'portfolio'];
const MARKET_KEYS = ['spx', 'ixic', 'rut', 'dji'];
const PORTFOLIO_KEY = 'portfolio';

const SERIES_COLORS = {
  spx:       '#ef4444',
  ixic:      '#10b981',
  rut:       '#8b5cf6',
  dji:       '#f59e0b',
  portfolio: '#06b6d4',
};

const SERIES_NAMES = {
  spx:       'S&P 500',
  ixic:      'NASDAQ',
  rut:       'Russell 2K',
  dji:       'Dow Jones',
  portfolio: 'My Portfolio',
};

/**
 * Pearson correlation between two equal-length numeric arrays.
 * Returns null if arrays mismatch, are too short, or have zero variance.
 */
function pearson(xs, ys) {
  if (!Array.isArray(xs) || !Array.isArray(ys)) return null;
  const filtered = [];
  for (let i = 0; i < Math.min(xs.length, ys.length); i++) {
    if (typeof xs[i] === 'number' && typeof ys[i] === 'number' &&
        Number.isFinite(xs[i]) && Number.isFinite(ys[i])) {
      filtered.push([xs[i], ys[i]]);
    }
  }
  if (filtered.length < 3) return null;

  const n = filtered.length;
  let sumX = 0; let sumY = 0; let sumXY = 0; let sumX2 = 0; let sumY2 = 0;
  for (const [x, y] of filtered) {
    sumX += x; sumY += y;
    sumXY += x * y;
    sumX2 += x * x; sumY2 += y * y;
  }
  const num = n * sumXY - sumX * sumY;
  const den = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
  if (den === 0) return null;
  return num / den;
}

function MarketPerformanceTab({ compact = false, indexPayload, chartOnly = false }) {
  const loading = indexPayload === null;
  const failed = !loading && (!indexPayload?.ok || !indexPayload?.indices);

  const [portfolioPayload, setPortfolioPayload] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/portfolio/week-series', { credentials: 'same-origin' })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((d) => { if (!cancelled) setPortfolioPayload(d); })
      .catch(() => { if (!cancelled) setPortfolioPayload({ ok: false, series: [] }); });
    return () => { cancelled = true; };
  }, []);

  const [visibleSeries, setVisibleSeries] = useState({
    spx: true, ixic: true, rut: true, dji: true, portfolio: true,
  });

  const toggleSeries = (key) => {
    setVisibleSeries((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      const visibleMarkets = MARKET_KEYS.filter((k) => next[k]);
      if (visibleMarkets.length === 0) {
        return prev;
      }
      return next;
    });
  };

  const chartData = useMemo(() => {
    const idx = indexPayload?.indices;
    if (!idx) return [];
    const marketSeries = MARKET_KEYS.map((k) => idx[k]?.series).find((s) => Array.isArray(s) && s.length > 0);
    if (!marketSeries) return [];

    const portfolioSeries = portfolioPayload?.series || [];

    return marketSeries.map((row, i) => {
      const out = { day: row.day };
      MARKET_KEYS.forEach((k) => {
        const pt = idx[k]?.series?.[i];
        out[k] = pt?.pct ?? null;
      });
      out.portfolio = portfolioSeries[i]?.pct ?? null;
      return out;
    });
  }, [indexPayload, portfolioPayload]);

  const correlation = useMemo(() => {
    if (!visibleSeries.portfolio) return null;
    if (chartData.length < 3) return null;

    const selectedMarkets = MARKET_KEYS.filter((k) => visibleSeries[k]);
    if (selectedMarkets.length === 0) return null;

    const portfolioVals = [];
    const blendedVals = [];
    for (const row of chartData) {
      const pct = row.portfolio;
      if (pct == null) continue;
      const marketPcts = selectedMarkets.map((k) => row[k]).filter((v) => typeof v === 'number');
      if (marketPcts.length === 0) continue;
      const avg = marketPcts.reduce((s, v) => s + v, 0) / marketPcts.length;
      portfolioVals.push(pct);
      blendedVals.push(avg);
    }

    return pearson(portfolioVals, blendedVals);
  }, [chartData, visibleSeries]);

  const correlationDisplay = useMemo(() => {
    if (correlation == null) return null;
    const sign = correlation >= 0 ? '+' : '';
    return `${sign}${correlation.toFixed(2)}`;
  }, [correlation]);

  const correlationColor = useMemo(() => {
    if (correlation == null) return 'var(--home-muted)';
    const abs = Math.abs(correlation);
    if (correlation > 0) {
      if (abs >= 0.5) return '#10b981';
      if (abs >= 0.2) return '#34d399';
      return 'var(--home-muted-soft)';
    }
    if (abs >= 0.5) return '#ef4444';
    if (abs >= 0.2) return '#fca5a5';
    return 'var(--home-muted-soft)';
  }, [correlation]);

  const chartH = chartOnly ? (compact ? 220 : 240) : compact ? 160 : 200;

  return (
    <div className={`hts-week-tab-inner hts-week-market-v3${chartOnly ? ' hts-week-market-v3--chart-only' : ''}`}>

      {correlationDisplay !== null && (
        <div className="hts-week-corr-badge" aria-label={`Portfolio correlation: ${correlationDisplay}`}>
          <span className="hts-week-corr-label">Portfolio correlation</span>
          <span className="hts-week-corr-value" style={{ color: correlationColor }}>
            {correlationDisplay}
          </span>
        </div>
      )}

      {loading && (
        <p className="hts-week-loading" style={{ textAlign: 'center', margin: '0.5rem 0' }}>
          Loading market data…
        </p>
      )}
      {failed && !loading && (
        <p className="hts-week-loading" style={{ textAlign: 'center', margin: '0.5rem 0', color: '#ef4444' }}>
          {indexPayload?.error === 'no_key'
            ? 'Could not load index data. Add FMP_API_KEY (or NEXT_PUBLIC_FMP_API_KEY) in environment.'
            : 'Could not load index data. Check FMP_API_KEY and server logs.'}
        </p>
      )}

      {!loading && !failed && (
        <>
          <div
            className="w-full min-w-0 overflow-hidden"
            style={{ height: chartH, minHeight: chartH, position: 'relative' }}
          >
            <ResponsiveContainer width="100%" height={chartH}>
              <LineChart
                data={chartData.length ? chartData : [{ day: 'Mon' }, { day: 'Tue' }, { day: 'Wed' }, { day: 'Thu' }, { day: 'Fri' }]}
                margin={{ top: 2, right: 12, left: compact ? -4 : 4, bottom: chartOnly ? 4 : 8 }}
              >
                <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} strokeDasharray="2 4" />
                <XAxis
                  dataKey="day"
                  interval="preserveStartEnd"
                  minTickGap={12}
                  padding={{ left: 12, right: 8 }}
                  tick={{ fill: 'var(--home-muted)', fontSize: 9 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  domain={Y_AXIS_DOMAIN}
                  ticks={Y_AXIS_TICKS}
                  tickFormatter={(v) => `${v > 0 ? '+' : ''}${v.toFixed(2)}%`}
                  tick={{ fill: 'var(--home-muted)', fontSize: 9 }}
                  axisLine={false}
                  tickLine={false}
                  width={compact ? 38 : 44}
                  interval={0}
                />
                <ReferenceLine y={0} stroke="rgba(107,114,128,0.3)" strokeDasharray="3 3" />
                <Tooltip
                  formatter={(value, name) => {
                    if (typeof value !== 'number') return ['—', name];
                    const sign = value >= 0 ? '+' : '';
                    return [`${sign}${value.toFixed(2)}%`, name];
                  }}
                  contentStyle={{
                    background: '#161b22',
                    border: '1px solid rgba(16,185,129,0.15)',
                    borderRadius: '8px',
                    fontSize: '0.7rem',
                    color: 'var(--text-secondary, #e2e8f0)',
                  }}
                  labelStyle={{ color: 'var(--home-muted-soft)', fontWeight: 600, marginBottom: 4 }}
                />
                {CHART_KEYS.map((k) => (
                  visibleSeries[k] ? (
                    <Line
                      key={k}
                      type="monotone"
                      dataKey={k}
                      stroke={SERIES_COLORS[k]}
                      strokeWidth={k === PORTFOLIO_KEY ? 2.4 : 1.8}
                      dot={{ r: 2.5, fill: SERIES_COLORS[k], strokeWidth: 0 }}
                      activeDot={{ r: 4, strokeWidth: 1.5, stroke: '#161b22' }}
                      connectNulls
                      name={SERIES_NAMES[k]}
                      isAnimationActive={false}
                    />
                  ) : null
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="hts-week-legend" role="group" aria-label="Toggle chart series">
            {CHART_KEYS.map((k) => {
              const isVisible = visibleSeries[k];
              const isMarket = MARKET_KEYS.includes(k);
              const visibleMarketCount = MARKET_KEYS.filter((mk) => visibleSeries[mk]).length;
              const isLastMarket = isMarket && isVisible && visibleMarketCount === 1;

              return (
                <button
                  key={k}
                  type="button"
                  className={`hts-week-legend-item ${isVisible ? 'is-on' : 'is-off'} ${isLastMarket ? 'is-locked' : ''}`}
                  onClick={() => toggleSeries(k)}
                  disabled={isLastMarket}
                  title={isLastMarket ? 'At least one market must remain selected' : `Toggle ${SERIES_NAMES[k]}`}
                  aria-pressed={isVisible}
                >
                  <span
                    className="hts-week-legend-swatch"
                    style={{
                      background: isVisible ? SERIES_COLORS[k] : 'transparent',
                      borderColor: SERIES_COLORS[k],
                    }}
                  />
                  <span className="hts-week-legend-label">{SERIES_NAMES[k]}</span>
                </button>
              );
            })}
          </div>
        </>
      )}
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
                color: 'var(--text-primary, #f0f6fc)',
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
          <span
            style={{
              fontSize: '0.75rem',
              fontWeight: 800,
              color: row.color,
              whiteSpace: 'nowrap',
            }}
          >
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
          Ranked{' '}
          <strong style={{ color: '#10b981', fontWeight: 600 }}>#8</strong> amongst
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
    fetch('/api/market/index-week', { credentials: 'same-origin' })
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
            indices: {},
          };
        }
        return data;
      })
      .then((data) => {
        if (!cancelled) setIndexPayload(data);
      })
      .catch(() => {
        if (!cancelled)
          setIndexPayload({ ok: false, error: 'fetch_failed', indices: {} });
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
