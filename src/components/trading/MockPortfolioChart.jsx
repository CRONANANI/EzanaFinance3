'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { CHART } from '@/lib/chart-theme';
import { DateSelector } from '@/components/ui/DateSelector';
import {
  DEFAULT_RANGE,
  RANGES,
  disabledRanges,
  fmtCompactUSD,
  fmtSignedPct,
  fmtSignedUSD,
  fmtUSD,
  rangeCaption,
  signOf,
} from '@/lib/trading/mock-ticket';
import { rangeReturn } from '@/lib/trading/mock-risk';
import './mock-portfolio-chart.css';

function formatUSD(v) {
  if (!Number.isFinite(v)) return '$0';
  if (Math.abs(v) >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
  if (Math.abs(v) >= 1_000) return `$${(v / 1_000).toFixed(1)}K`;
  return `$${v.toFixed(0)}`;
}

function formatDateLabel(iso, range) {
  const d = new Date(iso);
  if (range === '1W' || range === '1M' || range === '3M' || range === 'ALL') {
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
  return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}

const pctFrom = (v, base) =>
  Number.isFinite(v) && Number.isFinite(base) && base > 0 ? (v / base - 1) * 100 : null;

/* Date, portfolio value and its change over the range, the S&P 500 (rebased
   to the same start) and its change, and with a starting balance the
   all-time P&L. */
function CustomTooltip({ active, payload, startingCash, base }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  const pl = Number.isFinite(startingCash) && startingCash > 0 ? p.value - startingCash : null;
  const pv = pctFrom(p.value, base);
  const bv = pctFrom(p.bench, base);
  return (
    <div className="mpc-tooltip">
      <div className="mpc-tooltip-date">
        {new Date(p.at).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })}
      </div>
      <div className="mpc-tooltip-row">
        <span>Portfolio</span>
        <span className="mpc-tooltip-value">
          {fmtUSD(p.value)}
          {pv != null ? (
            <span className={`mpc-tooltip-pct is-${signOf(pv)}`}> {fmtSignedPct(pv)}</span>
          ) : null}
        </span>
      </div>
      {Number.isFinite(p.bench) ? (
        <div className="mpc-tooltip-row">
          <span>S&amp;P 500</span>
          <span className="mpc-tooltip-value">
            {fmtUSD(p.bench)}
            {bv != null ? (
              <span className={`mpc-tooltip-pct is-${signOf(bv)}`}> {fmtSignedPct(bv)}</span>
            ) : null}
          </span>
        </div>
      ) : null}
      {pl != null && (
        <div className="mpc-tooltip-row">
          <span>All-time P&amp;L</span>
          <span className={`mpc-tooltip-value is-${signOf(pl)}`}>
            {fmtSignedUSD(pl)} ({fmtSignedPct((pl / startingCash) * 100)})
          </span>
        </div>
      )}
    </div>
  );
}

/**
 * @param {object} props
 * @param {number} [props.startingCash] enables all-time P&L in the tooltip
 * @param {import('react').ReactNode} [props.headerExtra] rendered beside the title
 *   (the Mock Trading page puts its Portfolio / Selected asset switch here)
 */
export default function MockPortfolioChart({ startingCash = null, headerExtra = null } = {}) {
  const [range, setRange] = useState(DEFAULT_RANGE);
  /* First trade date, kept across range changes, so longer ranges can be disabled. */
  const [startedAt, setStartedAt] = useState(null);
  const [customRange, setCustomRange] = useState(null);
  const [data, setData] = useState({ points: [], source: 'loading' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let retryTimer = null;
    setLoading(true);
    setError(null);

    const url =
      range === 'CUSTOM' && customRange?.start && customRange?.end
        ? `/api/portfolio/mock-value-series?range=ALL&benchmark=1&from=${encodeURIComponent(
            customRange.start.toISOString(),
          )}&to=${encodeURIComponent(customRange.end.toISOString())}`
        : `/api/portfolio/mock-value-series?range=${range}&benchmark=1`;

    const load = async (attempt) => {
      try {
        const r = await fetch(url, { cache: 'no-store' });
        if (cancelled) return;

        /* Rate limited: wait the server's Retry-After (capped) and retry
           up to twice before surfacing anything. */
        if (r.status === 429 && attempt < 2) {
          const secs = Math.min(Math.max(Number(r.headers.get('Retry-After')) || 5, 2), 15);
          retryTimer = setTimeout(() => {
            if (!cancelled) load(attempt + 1);
          }, secs * 1000);
          return;
        }

        const d = await r.json().catch(() => ({}));
        if (cancelled) return;

        if (!r.ok || d.error) {
          setError(
            r.status === 429
              ? 'Market data is busy right now. Try again in a minute.'
              : d.error || `Request failed (HTTP ${r.status}).`,
          );
          setData({ points: [], source: 'error', note: null });
        } else {
          setData({
            points: d.points || [],
            benchmark: Array.isArray(d.benchmark) ? d.benchmark : null,
            source: d.source || 'unknown',
            note: d.note || null,
            startedAt: d.startedAt || null,
          });
          if (d.startedAt) setStartedAt(d.startedAt);
        }
        setLoading(false);
      } catch (e) {
        if (cancelled) return;
        setError(e?.message || 'Network error.');
        setData({ points: [], source: 'error', note: null });
        setLoading(false);
      }
    };

    load(0);

    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [range, customRange, reloadKey]);

  /* The benchmark joins the portfolio points by calendar day; days without a
     close (weekends, holidays) leave a gap the line bridges. */
  const chartData = useMemo(() => {
    const bench = new Map(
      (data.benchmark || []).map((b) => [String(b.t).slice(0, 10), Number(b.v)]),
    );
    return (data.points || []).map((p) => {
      const b = bench.get(String(p.at).slice(0, 10));
      return {
        ...p,
        bench: Number.isFinite(b) ? b : null,
        label: formatDateLabel(p.at, range),
      };
    });
  }, [data.points, data.benchmark, range]);

  // Summary stats: the range return and the S&P 500's over the same window.
  const stats = useMemo(() => {
    if (chartData.length < 2) return null;
    const start = chartData[0].value;
    const end = chartData[chartData.length - 1].value;
    const change = end - start;
    const ret = rangeReturn(data.points);
    const benchRet = data.benchmark ? rangeReturn(data.benchmark) : null;
    return { start, end, change, changePct: ret, benchRet, isPositive: change >= 0 };
  }, [chartData, data.points, data.benchmark]);
  const hasBench = chartData.some((p) => p.bench != null);

  const isEmpty = !loading && chartData.length === 0;
  const lineColor = stats?.isPositive === false ? 'var(--negative)' : 'var(--emerald)';
  const gradientId = stats?.isPositive === false ? 'mpc-gradient-down' : 'mpc-gradient-up';

  return (
    <div className="mpc-root">
      <div className="mpc-header">
        <div className="mpc-header-left">
          <h2 className="mpc-title">Portfolio performance</h2>
          {headerExtra}
        </div>
        <DateSelector
          ranges={RANGES}
          value={range}
          onChange={setRange}
          size="xs"
          variant="default"
          disabledRanges={disabledRanges(startedAt)}
          disabledTitle="Longer than your account history"
          showCustomDateButton={true}
          onCustomDateChange={(custom) => {
            if (custom?.start && custom?.end) {
              setRange('CUSTOM');
              setCustomRange(custom);
            }
          }}
        />
      </div>

      {stats && (
        <div className="mpc-headline">
          <div className="mpc-stats">
            <span className="mpc-stat-value">{fmtCompactUSD(stats.end)}</span>
            <span className={`mpc-stat-change is-${signOf(stats.change)}`}>
              {fmtSignedUSD(stats.change)} ({fmtSignedPct(stats.changePct)})
            </span>
            {hasBench && stats.benchRet != null ? (
              <span className="mpc-stat-bench">
                vs. S&amp;P 500{' '}
                <span className={`mpc-stat-change is-${signOf(stats.benchRet)}`}>
                  {fmtSignedPct(stats.benchRet)}
                </span>
              </span>
            ) : null}
          </div>
          <span className="mpc-caption">
            {rangeCaption(range, customRange)}
            {hasBench ? (
              <span className="mpc-legend" aria-hidden="true">
                <span className="mpc-legend-item">
                  <span className="mpc-legend-swatch" /> Portfolio
                </span>
                <span className="mpc-legend-item">
                  <span className="mpc-legend-swatch is-bench" /> S&amp;P 500
                </span>
              </span>
            ) : null}
          </span>
        </div>
      )}

      {loading && (
        <div className="mpc-skel" aria-busy="true">
          <span className="mpc-sr">Loading portfolio history</span>
        </div>
      )}

      {!loading && isEmpty && (
        <div className="mpc-empty">
          <i className="bi bi-graph-up mpc-empty-icon" />
          <p>
            {data.source === 'empty-portfolio' &&
              'Your portfolio is empty. Add some starting cash to begin.'}
            {data.source === 'error' && 'Unable to load portfolio history.'}
            {!['empty-portfolio', 'error'].includes(data.source) &&
              'Your performance chart will appear after your first trade.'}
          </p>
        </div>
      )}

      {!loading && !isEmpty && (
        <>
          <div className="mpc-chart-wrap">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 8, right: 24, left: 4, bottom: 0 }}>
                <defs>
                  <linearGradient id="mpc-gradient-up" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={CHART.primaryStroke} stopOpacity={0.4} />
                    <stop offset="100%" stopColor={CHART.primaryStroke} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="mpc-gradient-down" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={CHART.negativeStroke} stopOpacity={0.4} />
                    <stop offset="100%" stopColor={CHART.negativeStroke} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={CHART.gridStroke} vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={CHART.tick}
                  axisLine={false}
                  tickLine={false}
                  interval="preserveStartEnd"
                  minTickGap={50}
                />
                <YAxis
                  tick={CHART.tick}
                  axisLine={false}
                  tickLine={false}
                  width={60}
                  tickFormatter={(v) => formatUSD(v)}
                  domain={['auto', 'auto']}
                />
                <Tooltip
                  content={<CustomTooltip startingCash={startingCash} base={stats?.start} />}
                  allowEscapeViewBox={{ x: false, y: false }}
                  cursor={{
                    stroke: CHART.primaryStroke,
                    strokeOpacity: 0.3,
                    strokeDasharray: CHART.gridDash,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={lineColor}
                  strokeWidth={2}
                  fill={`url(#${gradientId})`}
                  name="Portfolio"
                />
                {hasBench ? (
                  <Line
                    type="monotone"
                    dataKey="bench"
                    name="S&P 500"
                    stroke={CHART.benchmarkStroke}
                    strokeWidth={CHART.secondaryStrokeWidth}
                    strokeDasharray={CHART.benchmarkDash}
                    dot={false}
                    activeDot={false}
                    connectNulls
                    isAnimationActive={false}
                  />
                ) : null}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          {data.note && (
            <div className="mpc-source-note">
              <i className="bi bi-info-circle" />
              {data.note}
            </div>
          )}
          {data.source === 'trade-replay-tradeprice' && (
            <div className="mpc-source-note">
              <i className="bi bi-info-circle" />
              Historical prices unavailable, showing approximation based on trade execution prices.
            </div>
          )}
        </>
      )}

      {error && (
        <div className="mpc-error" role="status">
          <span>{error}</span>
          <button type="button" className="ez-retry-btn" onClick={() => setReloadKey((k) => k + 1)}>
            Try again
          </button>
        </div>
      )}
    </div>
  );
}
