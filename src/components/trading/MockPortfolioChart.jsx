'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { CHART } from '@/lib/chart-theme';
import { DateSelector } from '@/components/ui/DateSelector';
import './mock-portfolio-chart.css';

const RANGES = ['1M', '6M', '1Y', '3Y', '5Y', '10Y', 'ALL'];

function formatUSD(v) {
  if (!Number.isFinite(v)) return '$0';
  if (Math.abs(v) >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
  if (Math.abs(v) >= 1_000) return `$${(v / 1_000).toFixed(1)}K`;
  return `$${v.toFixed(0)}`;
}

function formatDateLabel(iso, range) {
  const d = new Date(iso);
  if (range === '1M' || range === 'ALL') {
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
  return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="mpc-tooltip">
      <div className="mpc-tooltip-date">
        {new Date(p.at).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })}
      </div>
      <div className="mpc-tooltip-value">{formatUSD(p.value)}</div>
    </div>
  );
}

export default function MockPortfolioChart() {
  const [range, setRange] = useState('ALL'); // 'ALL' = since inception (default)
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
        ? `/api/portfolio/mock-value-series?range=ALL&from=${encodeURIComponent(
            customRange.start.toISOString(),
          )}&to=${encodeURIComponent(customRange.end.toISOString())}`
        : `/api/portfolio/mock-value-series?range=${range}`;

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
            source: d.source || 'unknown',
            note: d.note || null,
            startedAt: d.startedAt || null,
          });
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

  const chartData = useMemo(() => {
    return (data.points || []).map((p) => ({
      ...p,
      label: formatDateLabel(p.at, range),
    }));
  }, [data.points, range]);

  // Compute summary stats
  const stats = useMemo(() => {
    if (chartData.length < 2) return null;
    const start = chartData[0].value;
    const end = chartData[chartData.length - 1].value;
    const change = end - start;
    const changePct = start > 0 ? (change / start) * 100 : 0;
    return { start, end, change, changePct, isPositive: change >= 0 };
  }, [chartData]);

  const isEmpty = !loading && chartData.length === 0;
  const lineColor = stats?.isPositive === false ? 'var(--negative)' : 'var(--emerald)';
  const gradientId = stats?.isPositive === false ? 'mpc-gradient-down' : 'mpc-gradient-up';

  return (
    <div className="mpc-root">
      <div className="mpc-header">
        <div className="mpc-header-left">
          <h3 className="mpc-title">Portfolio Performance</h3>
          {stats && (
            <div className="mpc-stats">
              <span className="mpc-stat-value">{formatUSD(stats.end)}</span>
              <span className={`mpc-stat-change ${stats.isPositive ? 'is-up' : 'is-down'}`}>
                {stats.isPositive ? '+' : ''}
                {formatUSD(stats.change)} ({stats.changePct.toFixed(2)}%)
              </span>
            </div>
          )}
        </div>
        <DateSelector
          ranges={RANGES}
          value={range}
          onChange={setRange}
          size="xs"
          variant="default"
          showCustomDateButton={true}
          onCustomDateChange={(custom) => {
            if (custom?.start && custom?.end) {
              setRange('CUSTOM');
              setCustomRange(custom);
            }
          }}
        />
      </div>

      {loading && <div className="mpc-loading">Loading portfolio history…</div>}

      {!loading && isEmpty && (
        <div className="mpc-empty">
          <i className="bi bi-graph-up mpc-empty-icon" />
          <p>
            {data.source === 'no-portfolio' &&
              'No portfolio activity yet — place a trade to start tracking performance.'}
            {data.source === 'no-trades' &&
              'Your portfolio has cash but no trades yet. Place a trade to see performance over time.'}
            {data.source === 'empty-portfolio' &&
              'Your portfolio is empty. Add some starting cash to begin.'}
            {data.source === 'error' && 'Unable to load portfolio history.'}
            {!['no-portfolio', 'no-trades', 'empty-portfolio', 'error'].includes(data.source) &&
              'Start trading to see your portfolio performance over time.'}
          </p>
        </div>
      )}

      {!loading && !isEmpty && (
        <>
          <div className="mpc-chart-wrap">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
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
                  width={50}
                  tickFormatter={(v) => formatUSD(v)}
                  domain={['auto', 'auto']}
                />
                <Tooltip
                  content={<CustomTooltip />}
                  cursor={{ stroke: 'rgba(16,185,129,0.3)', strokeDasharray: '3 3' }}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={lineColor}
                  strokeWidth={2}
                  fill={`url(#${gradientId})`}
                />
              </AreaChart>
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
              Historical prices unavailable — showing approximation based on trade execution prices.
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
