'use client';

import { useMemo, useState, useEffect, useCallback } from 'react';
import { TrendingUp } from 'lucide-react';
import { TimeRangeSelector } from '@/components/ui/TimeRangeSelector';
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

const PERIOD_OPTIONS = ['1D', '7D', '1M', '3M', '6M', '1Y', 'ALL'];

function periodToLabel(period) {
  const labels = {
    '1D': 'Today',
    '7D': 'Past 7 Days',
    '1M': 'Past Month',
    '3M': 'Past 3 Months',
    '6M': 'Past 6 Months',
    '1Y': 'Past Year',
    ALL: 'All Time',
  };
  return labels[period] || period;
}

/** Get today's short day label (Mon, Tue, etc.) in NY timezone */
function todayDayLabel() {
  const dayName = new Date().toLocaleDateString('en-US', {
    timeZone: 'America/New_York',
    weekday: 'short',
  });
  return dayName; // "Mon", "Tue", etc.
}

const MARKET_KEYS = ['spx', 'ixic', 'rut', 'dji', 'vix', 'wti', 'brent', 'tnx'];
const PORTFOLIO_KEY = 'portfolio';
const CHART_KEYS = [...MARKET_KEYS, PORTFOLIO_KEY];

const SERIES_COLORS = {
  spx: '#ef4444',
  ixic: '#10b981',
  rut: '#8b5cf6',
  dji: '#f59e0b',
  vix: '#f43f5e',
  wti: '#d97706',
  brent: '#92400e',
  tnx: '#0ea5e9',
  portfolio: '#06b6d4',
};

const SERIES_NAMES = {
  spx: 'S&P 500',
  ixic: 'NASDAQ',
  rut: 'Russell 2K',
  dji: 'Dow Jones',
  vix: 'VIX',
  wti: 'WTI Crude',
  brent: 'Brent Crude',
  tnx: '10Y Treasury',
  portfolio: 'My Portfolio',
};

const SERIES_DESCRIPTIONS = {
  spx: 'Tracks the 500 largest US public companies. The broadest measure of how well the American stock market is performing overall.',
  ixic: 'The NASDAQ Composite is heavily weighted toward technology stocks. It tells you how well the tech sector and growth companies are doing relative to the broader market.',
  rut: 'Tracks 2,000 small-cap US companies. Small caps tend to lead in early recoveries and lag in recessions — a useful economic sentiment gauge.',
  dji: "The Dow Jones Industrial Average tracks 30 blue-chip US stocks. It's price-weighted, so higher-priced stocks have more influence.",
  vix: 'The CBOE Volatility Index measures expected market volatility over the next 30 days. Often called the "Fear Index" — a spike in VIX means investors are pricing in uncertainty and hedging aggressively. When VIX is above 30, markets are in stress.',
  wti: 'West Texas Intermediate is the US benchmark for crude oil. Tracking WTI helps you understand how oil prices are fluctuating, which directly impacts energy stocks, transportation costs, and consumer inflation.',
  brent:
    'Brent Crude is the international benchmark for oil pricing. It tends to trade at a premium to WTI and reflects global supply/demand dynamics, especially from the Middle East and Europe.',
  tnx: "The 10-Year US Treasury yield is the benchmark for interest rates across the economy. When yields rise, borrowing costs increase for mortgages, corporate debt, and government spending. It's the single most important number in fixed income.",
  portfolio:
    "Your portfolio's weekly performance based on your mock trading positions. Compare against the indices to see if you're outperforming or underperforming the market.",
};

/**
 * Pearson correlation between two equal-length numeric arrays.
 * Returns null if arrays mismatch, are too short, or have zero variance.
 */
function pearson(xs, ys) {
  if (!Array.isArray(xs) || !Array.isArray(ys)) return null;
  const filtered = [];
  for (let i = 0; i < Math.min(xs.length, ys.length); i++) {
    if (
      typeof xs[i] === 'number' &&
      typeof ys[i] === 'number' &&
      Number.isFinite(xs[i]) &&
      Number.isFinite(ys[i])
    ) {
      filtered.push([xs[i], ys[i]]);
    }
  }
  if (filtered.length < 3) return null;

  const n = filtered.length;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumX2 = 0;
  let sumY2 = 0;
  for (const [x, y] of filtered) {
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumX2 += x * x;
    sumY2 += y * y;
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
      .then((d) => {
        if (!cancelled) setPortfolioPayload(d);
      })
      .catch(() => {
        if (!cancelled) setPortfolioPayload({ ok: false, series: [] });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const [visibleSeries, setVisibleSeries] = useState({
    spx: true,
    ixic: true,
    rut: true,
    dji: true,
    vix: false,
    wti: false,
    brent: false,
    tnx: false,
    portfolio: true,
  });

  const [hoveredKey, setHoveredKey] = useState(null);

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

    const byYmd = new Map();

    for (const k of MARKET_KEYS) {
      const ser = idx[k]?.series;
      if (!Array.isArray(ser)) continue;
      for (const pt of ser) {
        const ymd = pt.ymd;
        if (!ymd) continue;
        if (!byYmd.has(ymd)) {
          byYmd.set(ymd, { ymd, day: pt.day });
        }
        const row = byYmd.get(ymd);
        if (pt.day) row.day = pt.day;
        if (pt.pct != null && Number.isFinite(pt.pct)) row[k] = pt.pct;
      }
    }

    const sorted = [...byYmd.keys()].sort();
    if (sorted.length === 0) return [];

    const portfolioSeries = portfolioPayload?.series || [];
    const portfolioByYmd = {};
    for (const pt of portfolioSeries) {
      if (pt?.ymd && pt.pct != null) portfolioByYmd[pt.ymd] = pt.pct;
    }
    const portfolioByDay = {};
    for (const pt of portfolioSeries) {
      if (pt?.day && pt?.pct != null) portfolioByDay[pt.day] = pt.pct;
    }

    const allDays = sorted.map((ymd) => {
      const base = byYmd.get(ymd);
      const out = { day: base.day, ymd };
      MARKET_KEYS.forEach((k) => {
        out[k] = typeof base[k] === 'number' ? base[k] : null;
      });
      out.portfolio = portfolioByYmd[ymd] ?? portfolioByDay[base.day] ?? null;
      return out;
    });

    return allDays.filter((row) => {
      const hasAnyData = CHART_KEYS.some((k) => row[k] !== null && row[k] !== undefined);
      return hasAnyData;
    });
  }, [indexPayload, portfolioPayload]);

  const { yDomain, yTicks } = useMemo(() => {
    if (!chartData.length) return { yDomain: [-2.5, 2.5], yTicks: [-2, -1, 0, 1, 2] };
    let min = 0;
    let max = 0;
    for (const row of chartData) {
      for (const k of CHART_KEYS) {
        const v = row[k];
        if (typeof v === 'number' && Number.isFinite(v)) {
          if (v < min) min = v;
          if (v > max) max = v;
        }
      }
    }
    const absMax = Math.max(Math.abs(min), Math.abs(max), 1);
    const padded = Math.ceil(absMax * 1.3);
    const step = padded <= 3 ? 1 : padded <= 10 ? 2 : padded <= 25 ? 5 : 10;
    const ticks = [];
    for (let t = -padded; t <= padded; t += step) ticks.push(t);
    if (!ticks.includes(0)) ticks.push(0);
    ticks.sort((a, b) => a - b);
    return { yDomain: [-padded, padded], yTicks: ticks };
  }, [chartData]);

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
    <div
      className={`hts-week-tab-inner hts-week-market-v3${chartOnly ? ' hts-week-market-v3--chart-only' : ''}`}
    >
      {visibleSeries.portfolio && (
        <div
          className="hts-week-corr-badge"
          aria-label={
            correlationDisplay
              ? `Portfolio correlation: ${correlationDisplay}`
              : 'Portfolio correlation: insufficient data'
          }
        >
          <span className="hts-week-corr-label">Portfolio ρ</span>
          <span
            className="hts-week-corr-value"
            style={{ color: correlationDisplay ? correlationColor : 'var(--home-muted)' }}
          >
            {correlationDisplay ?? '—'}
          </span>
        </div>
      )}

      {loading && (
        <p className="hts-week-loading" style={{ textAlign: 'center', margin: '0.5rem 0' }}>
          Loading market data…
        </p>
      )}
      {failed && !loading && (
        <p
          className="hts-week-loading"
          style={{ textAlign: 'center', margin: '0.5rem 0', color: '#ef4444' }}
        >
          {indexPayload?.error === 'no_key'
            ? 'Could not load index data. Add ALPHA_VANTAGE_API_KEY for multi-period charts, or FMP_API_KEY for weekly data.'
            : 'Could not load index data. Check ALPHA_VANTAGE_API_KEY / FMP_API_KEY and server logs.'}
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
                data={chartData.length ? chartData : [{ day: todayDayLabel() }]}
                margin={{ top: 2, right: 12, left: compact ? -4 : 4, bottom: chartOnly ? 4 : 8 }}
              >
                <CartesianGrid
                  stroke="rgba(255,255,255,0.04)"
                  vertical={false}
                  strokeDasharray="2 4"
                />
                <XAxis
                  dataKey="day"
                  interval={chartData.length > 16 ? 'preserveStartEnd' : 0}
                  padding={{
                    left: chartData.length <= 1 ? 100 : 12,
                    right: chartData.length <= 1 ? 100 : 8,
                  }}
                  tick={{ fill: 'var(--home-muted)', fontSize: 9 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  domain={yDomain}
                  ticks={yTicks}
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
                {CHART_KEYS.map((k) =>
                  visibleSeries[k] ? (
                    <Line
                      key={k}
                      type="monotone"
                      dataKey={k}
                      stroke={SERIES_COLORS[k]}
                      strokeWidth={k === PORTFOLIO_KEY ? 2.4 : 1.8}
                      dot={{
                        r: chartData.length <= 1 ? 5 : 2.5,
                        fill: SERIES_COLORS[k],
                        strokeWidth: chartData.length <= 1 ? 2 : 0,
                        stroke: chartData.length <= 1 ? '#161b22' : 'none',
                      }}
                      activeDot={{
                        r: chartData.length <= 1 ? 7 : 4,
                        strokeWidth: 1.5,
                        stroke: '#161b22',
                      }}
                      connectNulls
                      name={SERIES_NAMES[k]}
                      isAnimationActive={false}
                    />
                  ) : null,
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div
            className="hts-week-legend"
            role="group"
            aria-label="Toggle chart series"
            style={{ flexWrap: 'wrap', gap: '0.3rem 0.5rem' }}
          >
            {CHART_KEYS.map((k) => {
              const isVisible = visibleSeries[k];
              const isMarket = MARKET_KEYS.includes(k);
              const visibleMarketCount = MARKET_KEYS.filter((mk) => visibleSeries[mk]).length;
              const isLastMarket = isMarket && isVisible && visibleMarketCount === 1;
              const isHovered = hoveredKey === k;
              const desc = SERIES_DESCRIPTIONS[k];

              return (
                <div key={k} style={{ position: 'relative' }}>
                  <button
                    type="button"
                    className={`hts-week-legend-item ${isVisible ? 'is-on' : 'is-off'} ${isLastMarket ? 'is-locked' : ''}`}
                    onClick={() => toggleSeries(k)}
                    disabled={isLastMarket}
                    title={isLastMarket ? 'At least one market must remain selected' : undefined}
                    aria-pressed={isVisible}
                    onMouseEnter={() => setHoveredKey(k)}
                    onMouseLeave={() => setHoveredKey(null)}
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

                  {isHovered && desc && (
                    <div
                      style={{
                        position: 'absolute',
                        bottom: 'calc(100% + 8px)',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        width: 260,
                        padding: '0.6rem 0.75rem',
                        background: '#0d1117',
                        border: '1px solid rgba(16, 185, 129, 0.2)',
                        borderRadius: 10,
                        boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                        zIndex: 100,
                        pointerEvents: 'none',
                      }}
                    >
                      <p
                        style={{
                          margin: '0 0 0.25rem',
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          color: SERIES_COLORS[k],
                        }}
                      >
                        {SERIES_NAMES[k]}
                      </p>
                      <p
                        style={{ margin: 0, fontSize: '0.6rem', lineHeight: 1.5, color: '#c9d1d9' }}
                      >
                        {desc}
                      </p>
                      <div
                        style={{
                          position: 'absolute',
                          bottom: -6,
                          left: '50%',
                          transform: 'translateX(-50%)',
                          width: 0,
                          height: 0,
                          borderLeft: '6px solid transparent',
                          borderRight: '6px solid transparent',
                          borderTop: '6px solid rgba(16, 185, 129, 0.2)',
                        }}
                      />
                    </div>
                  )}
                </div>
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
            <i className="bi bi-graph-up-arrow" style={{ color: row.color, fontSize: '0.9rem' }} />
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
          You&apos;re more active than <strong style={{ color: '#10b981' }}>60%</strong> of users
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
          <i className="bi bi-bar-chart-line" style={{ marginRight: 6, color: '#10b981' }} />
          Ranked <strong style={{ color: '#10b981', fontWeight: 600 }}>#8</strong> amongst friends{' '}
          <span style={{ color: '#10b981' }}>(up 2 spots from last month)</span>
        </p>
      </div>
    </div>
  );
}

export function LatelyOnEzana({ compact = false, marketChartOnly = false }) {
  const [activeTab, setActiveTab] = useState('market');
  const [period, setPeriod] = useState('7D');
  const [indexPayload, setIndexPayload] = useState(null);

  const fetchData = useCallback((p) => {
    setIndexPayload(null);
    fetch(`/api/market/index-history?period=${encodeURIComponent(p)}`, {
      credentials: 'same-origin',
    })
      .then(async (r) => {
        let data = {};
        try {
          data = await r.json();
        } catch {
          data = {};
        }
        if (!r.ok) {
          return { ok: false, error: 'fetch_failed', indices: {} };
        }
        return data;
      })
      .then((data) => setIndexPayload(data))
      .catch(() => setIndexPayload({ ok: false, error: 'fetch_failed', indices: {} }));
  }, []);

  useEffect(() => {
    fetchData(period);
  }, [period, fetchData]);

  const handlePeriodChange = useCallback((newPeriod) => {
    setPeriod(newPeriod);
  }, []);

  return (
    <>
      <div
        className="db-card-header hts-week-header"
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          textAlign: 'left',
          gap: '0.5rem',
        }}
      >
        <div className="hts-week-header-titles" style={{ flex: 1, alignItems: 'flex-start' }}>
          <h3 style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
            <TrendingUp
              className="hts-week-title-ico"
              size={18}
              strokeWidth={2}
              aria-hidden
              style={{ flexShrink: 0, color: 'var(--home-heading)' }}
            />
            Lately on Ezana
          </h3>
          <span className="hts-week-date-range">{periodToLabel(period)}</span>
        </div>
        <TimeRangeSelector
          ranges={PERIOD_OPTIONS}
          value={period}
          onChange={handlePeriodChange}
          size="xs"
          inactiveTextColor="var(--home-muted)"
        />
      </div>
      <div
        className={`hts-card-body hts-week-card-body${compact ? ' hts-week-card-body--compact' : ''}`}
      >
        <div
          className="hts-week-tabs db-tf-group-sm"
          role="tablist"
          aria-label="Lately recap sections"
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

export { LatelyOnEzana as ThisWeekOnEzana };
