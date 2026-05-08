'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';

const RANGES = ['1D', '1W', '1M', '3M', '6M', '1Y', '3Y', '5Y', 'ALL'];

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div
      style={{
        background: 'var(--card, #0d1117)',
        border: '1px solid rgba(16,185,129,0.2)',
        borderRadius: '8px',
        padding: '8px 12px',
        fontSize: '0.75rem',
        lineHeight: 1.6,
        minWidth: '130px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      }}
    >
      <p style={{ color: 'var(--muted-foreground, #6b7280)', margin: '0 0 4px', fontSize: '0.65rem' }}>
        {label}
      </p>
      <p style={{ color: 'var(--foreground, #f0f6fc)', margin: 0, fontWeight: 700 }}>
        ${Number(d.price).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </p>
      {d.high != null && d.low != null && (
        <>
          <p style={{ color: '#10b981', margin: '2px 0 0', fontSize: '0.65rem' }}>H: ${Number(d.high).toFixed(2)}</p>
          <p style={{ color: '#ef4444', margin: 0, fontSize: '0.65rem' }}>L: ${Number(d.low).toFixed(2)}</p>
        </>
      )}
      {d.volume > 0 && (
        <p style={{ color: 'var(--muted-foreground, #6b7280)', margin: '2px 0 0', fontSize: '0.6rem' }}>
          Vol: {Number(d.volume).toLocaleString()}
        </p>
      )}
    </div>
  );
}

export default function StockPriceChart({ symbol, livePrice = null, stats = null }) {
  const [range, setRange] = useState('1M');
  const [candles, setCandles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasFetched, setHasFetched] = useState(false);

  /* ── Click-to-measure: anchor price + current hover price ── */
  const [anchorPoint, setAnchorPoint] = useState(null);
  const [hoverPoint, setHoverPoint] = useState(null);
  const chartContainerRef = useRef(null);

  const handleChartClick = useCallback(
    (data) => {
      if (anchorPoint) {
        setAnchorPoint(null);
        setHoverPoint(null);
        return;
      }
      if (!data?.activePayload?.[0]) return;
      const point = data.activePayload[0].payload;
      setAnchorPoint({
        price: point.price,
        label: point.label,
        index: data.activeTooltipIndex,
      });
    },
    [anchorPoint],
  );

  const handleChartMouseMove = useCallback(
    (data) => {
      if (!anchorPoint || !data?.activePayload?.[0]) {
        setHoverPoint(null);
        return;
      }
      const point = data.activePayload[0].payload;
      setHoverPoint({
        price: point.price,
        label: point.label,
        index: data.activeTooltipIndex,
        chartX: data.chartX,
        chartY: data.chartY,
      });
    },
    [anchorPoint],
  );

  const handleChartMouseLeave = useCallback(() => {
    setHoverPoint(null);
  }, []);

  const measurePct =
    anchorPoint && hoverPoint ? ((hoverPoint.price - anchorPoint.price) / anchorPoint.price) * 100 : null;

  const fetchCandles = useCallback(async (sym, rng) => {
    if (!sym) return;
    setLoading(true);
    setError(null);
    setHasFetched(false);
    setCandles([]);
    try {
      const res = await fetch(`/api/market-data/stock-candles?symbol=${encodeURIComponent(sym)}&range=${rng}`);
      const data = await res.json();
      if (data.error && !data.candles?.length) {
        setError(data.error);
      } else {
        setCandles(data.candles ?? []);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setHasFetched(true);
    }
  }, []);

  useEffect(() => {
    if (!symbol) return;
    setAnchorPoint(null);
    setHoverPoint(null);
    fetchCandles(symbol, range);
  }, [symbol, range, fetchCandles]);

  const firstPrice = candles[0]?.price;
  const lastPrice  = candles[candles.length - 1]?.price;
  const isPositive = lastPrice != null && firstPrice != null ? lastPrice >= firstPrice : true;
  const pctChange  = firstPrice && lastPrice
    ? (((lastPrice - firstPrice) / firstPrice) * 100).toFixed(2)
    : null;
  const lineColour  = isPositive ? '#10b981' : '#ef4444';
  const gradientId  = `grad-${symbol?.replace(/[^a-zA-Z0-9]/g, '')}`;
  const minPrice    = candles.length ? Math.min(...candles.map((c) => (c.low  ?? c.price) * 0.998)) : 0;
  const maxPrice    = candles.length ? Math.max(...candles.map((c) => (c.high ?? c.price) * 1.002)) : 0;

  if (!symbol) return null;

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 0 }}>

      {/* ── Header row: ticker + price + change  |  range selector top-right ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.5rem',
          padding: '0 0 0.875rem',
          borderBottom: '1px solid rgba(128,128,128,0.12)',
          marginBottom: '0.875rem',
        }}
      >
        {/* Left: ticker, price, change */}
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
          <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--foreground, #f0f6fc)', letterSpacing: '0.02em' }}>
            {symbol}
          </span>
          {(livePrice != null || lastPrice != null) && (
            <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--foreground, #f0f6fc)' }}>
              ${Number(livePrice ?? lastPrice).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          )}
          {pctChange !== null && (
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 600,
                color: isPositive ? '#10b981' : '#ef4444',
                background: isPositive ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                padding: '2px 7px',
                borderRadius: '4px',
              }}
            >
              {isPositive ? '+' : ''}{pctChange}%
            </span>
          )}
        </div>

        {/* Right: range selector — top-right of header */}
        <div
          style={{
            display: 'flex',
            gap: '2px',
            background: 'var(--muted, rgba(255,255,255,0.04))',
            borderRadius: '8px',
            padding: '2px',
            flexShrink: 0,
          }}
        >
          {RANGES.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRange(r)}
              style={{
                padding: '3px 8px',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '0.62rem',
                fontWeight: 700,
                fontFamily: 'var(--font-mono, monospace)',
                letterSpacing: '0.03em',
                transition: 'all 0.12s ease',
                background: range === r ? lineColour : 'transparent',
                color: range === r ? '#fff' : 'var(--muted-foreground, #6b7280)',
                whiteSpace: 'nowrap',
              }}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* ── Chart body ── */}
      <div ref={chartContainerRef} className="chart-viewport-sm relative w-full" style={{ overflow: 'visible' }}>
        {loading && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '8px', color: 'var(--muted-foreground, #6b7280)', fontSize: '0.78rem' }}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" style={{ animation: 'spin 0.9s linear infinite' }}>
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" opacity="0.25" />
              <path d="M12 2a10 10 0 0 1 10 10" stroke="#10b981" strokeWidth="2" strokeLinecap="round" />
            </svg>
            Loading {symbol}…
          </div>
        )}

        {!loading && error && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '6px', color: error.includes('Rate limit') ? 'var(--muted-foreground, #6b7280)' : '#ef4444', fontSize: '0.75rem', textAlign: 'center', padding: '1rem' }}>
            {error.includes('Rate limit') ? (
              <>
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" style={{ opacity: 0.5 }}>
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                <span>Too many requests — please wait a moment</span>
                <span style={{ color: 'var(--muted-foreground, #6b7280)', fontSize: '0.65rem' }}>Chart data will load automatically on retry</span>
              </>
            ) : (
              <>
                Could not load chart data.
                <span style={{ color: 'var(--muted-foreground, #6b7280)', fontSize: '0.65rem' }}>{error}</span>
              </>
            )}
          </div>
        )}

        {!loading && hasFetched && !error && candles.length === 0 && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted-foreground, #6b7280)', fontSize: '0.75rem' }}>
            No data available for {symbol} · {range}
          </div>
        )}

        {!loading && candles.length > 0 && (
          <>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={candles}
                margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
                onClick={handleChartClick}
                onMouseMove={handleChartMouseMove}
                onMouseLeave={handleChartMouseLeave}
                style={{ cursor: anchorPoint ? 'crosshair' : 'pointer' }}
              >
                <defs>
                  <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor={lineColour} stopOpacity={0.25} />
                    <stop offset="100%" stopColor={lineColour} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="2 4" stroke="rgba(128,128,128,0.12)" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{
                    /* fill via .spc-axis-tick in globals.css (--foreground isn’t in theme; inline SVG
                     fill with theme vars fails; stylesheet rules resolve var() on SVG <text>). */
                    className: 'spc-axis-tick',
                    fontSize: 10,
                    fontFamily: 'var(--font-mono, monospace)',
                  }}
                  axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={50}
                />
                <YAxis
                  domain={[minPrice, maxPrice]}
                  tick={{
                    className: 'spc-axis-tick',
                    fontSize: 10,
                    fontFamily: 'var(--font-mono, monospace)',
                  }}
                  axisLine={false} tickLine={false} width={40}
                  tickFormatter={(v) => `$${Number(v).toLocaleString('en-US', { maximumFractionDigits: 0 })}`}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(128,128,128,0.2)', strokeWidth: 1 }} />
                {firstPrice && <ReferenceLine y={firstPrice} stroke="rgba(128,128,128,0.2)" strokeDasharray="3 4" />}
                {anchorPoint && (
                  <ReferenceLine
                    y={anchorPoint.price}
                    stroke="#D4AF37"
                    strokeDasharray="4 3"
                    strokeWidth={1.5}
                    label={{
                      value: `$${Number(anchorPoint.price).toFixed(2)}`,
                      position: 'right',
                      fill: '#D4AF37',
                      fontSize: 10,
                      fontWeight: 700,
                    }}
                  />
                )}
                {anchorPoint && hoverPoint && (
                  <ReferenceLine
                    y={hoverPoint.price}
                    stroke={measurePct >= 0 ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'}
                    strokeDasharray="2 3"
                    strokeWidth={1}
                  />
                )}
                <Area type="monotone" dataKey="price" stroke={lineColour} strokeWidth={1.5} fill={`url(#${gradientId})`} dot={false} activeDot={{ r: 3, fill: lineColour, strokeWidth: 0 }} />
              </AreaChart>
            </ResponsiveContainer>
            {anchorPoint && !hoverPoint && (
              <div
                style={{
                  position: 'absolute',
                  top: 8,
                  left: 8,
                  background: 'rgba(212, 175, 55, 0.12)',
                  border: '1px solid rgba(212, 175, 55, 0.3)',
                  borderRadius: 6,
                  padding: '4px 10px',
                  fontSize: '0.65rem',
                  fontWeight: 600,
                  color: '#D4AF37',
                  pointerEvents: 'none',
                  zIndex: 20,
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                Anchored at ${Number(anchorPoint.price).toFixed(2)} · Move mouse to measure · Click to clear
              </div>
            )}
            {measurePct !== null && (
              <div
                style={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  background: measurePct >= 0 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                  border: `1px solid ${measurePct >= 0 ? 'rgba(16, 185, 129, 0.35)' : 'rgba(239, 68, 68, 0.35)'}`,
                  borderRadius: 8,
                  padding: '6px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-end',
                  gap: 2,
                  zIndex: 20,
                  pointerEvents: 'none',
                  fontVariantNumeric: 'tabular-nums',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                }}
              >
                <span
                  style={{
                    fontSize: '1rem',
                    fontWeight: 800,
                    color: measurePct >= 0 ? '#10b981' : '#ef4444',
                    fontFamily: 'var(--font-mono, monospace)',
                  }}
                >
                  {measurePct >= 0 ? '+' : ''}
                  {measurePct.toFixed(2)}%
                </span>
                <span style={{ fontSize: '0.6rem', color: 'var(--muted-foreground, #8b949e)' }}>
                  ${Number(anchorPoint.price).toFixed(2)} → ${Number(hoverPoint.price).toFixed(2)}
                  {' · '}$
                  {Math.abs(hoverPoint.price - anchorPoint.price).toFixed(2)} {measurePct >= 0 ? 'gain' : 'loss'}
                </span>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Stat cards: Market Cap · P/E · Div Yield · EPS ── */}
      {stats && (
        <div
          className="stock-stat-cards-grid grid grid-cols-2 gap-3 border-t border-[rgba(128,128,128,0.12)] pt-4 mt-5 sm:grid-cols-4 sm:gap-3"
          data-stat-cards
        >
          {[
            { label: 'Market Cap',    value: stats.mcap,     sub: stats.capType  },
            { label: 'P/E Ratio',     value: stats.pe,       sub: 'Price / Earnings' },
            { label: 'Dividend Yield',value: stats.divYield, sub: 'Annual yield' },
            { label: 'EPS',           value: stats.eps,      sub: 'Earnings per share' },
          ].map(({ label, value, sub }) => (
            <div
              key={label}
              style={{
                background: 'rgba(16,185,129,0.03)',
                border: '1px solid rgba(16,185,129,0.1)',
                borderRadius: '10px',
                padding: '0.75rem 0.875rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '3px',
              }}
            >
              <span
                style={{
                  fontSize: '0.6rem',
                  fontWeight: 700,
                  color: 'var(--muted-foreground, #6b7280)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                }}
              >
                {label}
              </span>
              <span
                style={{
                  fontSize: '1rem',
                  fontWeight: 800,
                  color: 'var(--foreground, #f0f6fc)',
                  fontVariantNumeric: 'tabular-nums',
                  lineHeight: 1.2,
                }}
              >
                {value ?? '—'}
              </span>
              {sub && sub !== '--' && (
                <span
                  style={{
                    fontSize: '0.6rem',
                    color: 'var(--muted-foreground, #6b7280)',
                    fontWeight: 500,
                  }}
                >
                  {sub}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Spin keyframe */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
