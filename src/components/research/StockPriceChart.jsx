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
  ReferenceArea,
} from 'recharts';
import { DateSelector } from '@/components/ui/DateSelector';

const RANGES = ['1D', '1W', '1M', '3M', '6M', '1Y', '3Y', '5Y', '10Y', 'ALL'];

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
      <p
        style={{
          color: 'var(--muted-foreground, #6b7280)',
          margin: '0 0 4px',
          fontSize: '0.65rem',
        }}
      >
        {label}
      </p>
      <p style={{ color: 'var(--foreground, #f0f6fc)', margin: 0, fontWeight: 700 }}>
        $
        {Number(d.price).toLocaleString('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}
      </p>
      {d.high != null && d.low != null && (
        <>
          <p style={{ color: '#10b981', margin: '2px 0 0', fontSize: '0.65rem' }}>
            H: ${Number(d.high).toFixed(2)}
          </p>
          <p style={{ color: '#ef4444', margin: 0, fontSize: '0.65rem' }}>
            L: ${Number(d.low).toFixed(2)}
          </p>
        </>
      )}
      {d.volume > 0 && (
        <p
          style={{
            color: 'var(--muted-foreground, #6b7280)',
            margin: '2px 0 0',
            fontSize: '0.6rem',
          }}
        >
          Vol: {Number(d.volume).toLocaleString()}
        </p>
      )}
    </div>
  );
}

export default function StockPriceChart({
  symbol,
  livePrice = null,
  stats = null,
  initialRange = '1M',
  defaultRange,
  compact = false,
  hideRangeButtons = false,
}) {
  const resolvedInitialRange = defaultRange || initialRange;
  const [range, setRange] = useState(resolvedInitialRange);
  const [candles, setCandles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasFetched, setHasFetched] = useState(false);

  /* ── Google-style drag-to-measure ── */
  const [dragStart, setDragStart] = useState(null);
  const [dragEnd, setDragEnd] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [measurement, setMeasurement] = useState(null);
  const chartContainerRef = useRef(null);

  const handleChartMouseDown = useCallback(
    (data) => {
      if (!data?.activePayload?.[0]) return;
      const point = data.activePayload[0].payload;
      if (measurement) {
        setMeasurement(null);
        return;
      }
      const idx =
        typeof data.activeTooltipIndex === 'number'
          ? data.activeTooltipIndex
          : candles.findIndex((c) => c.label === point.label);
      setDragStart({
        price: point.price,
        label: point.label,
        index: idx >= 0 ? idx : 0,
      });
      setDragEnd(null);
      setIsDragging(true);
    },
    [measurement, candles],
  );

  const handleChartMouseMove = useCallback(
    (data) => {
      if (!isDragging || !dragStart || !data?.activePayload?.[0]) return;
      const point = data.activePayload[0].payload;
      const idx =
        typeof data.activeTooltipIndex === 'number'
          ? data.activeTooltipIndex
          : candles.findIndex((c) => c.label === point.label);
      setDragEnd({
        price: point.price,
        label: point.label,
        index: idx >= 0 ? idx : 0,
      });
    },
    [isDragging, dragStart, candles],
  );

  const handleChartMouseUp = useCallback(() => {
    if (!isDragging) return;
    if (!dragStart || !dragEnd) {
      setIsDragging(false);
      setDragStart(null);
      setDragEnd(null);
      return;
    }
    const startPrice = dragStart.price;
    const endPrice = dragEnd.price;
    const dollarChange = endPrice - startPrice;
    const pct = ((endPrice - startPrice) / startPrice) * 100;

    setMeasurement({
      start: dragStart,
      end: dragEnd,
      pct,
      dollarChange,
      dateRange: `${dragStart.label} – ${dragEnd.label}`,
      startIndex: Math.min(dragStart.index, dragEnd.index),
      endIndex: Math.max(dragStart.index, dragEnd.index),
    });
    setIsDragging(false);
    setDragStart(null);
    setDragEnd(null);
  }, [isDragging, dragStart, dragEnd]);

  const handleChartMouseLeave = useCallback(() => {
    if (isDragging) {
      if (dragStart && dragEnd) {
        handleChartMouseUp();
      } else {
        setIsDragging(false);
        setDragStart(null);
        setDragEnd(null);
      }
    }
  }, [isDragging, dragStart, dragEnd, handleChartMouseUp]);

  const activePct =
    isDragging && dragStart && dragEnd
      ? ((dragEnd.price - dragStart.price) / dragStart.price) * 100
      : null;
  const activeDollar = isDragging && dragStart && dragEnd ? dragEnd.price - dragStart.price : null;

  const fetchCandles = useCallback(async (sym, rng) => {
    if (!sym) return;
    setLoading(true);
    setError(null);
    setHasFetched(false);
    setCandles([]);
    try {
      const res = await fetch(
        `/api/market-data/stock-candles?symbol=${encodeURIComponent(sym)}&range=${rng}`,
      );
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
    setDragStart(null);
    setDragEnd(null);
    setIsDragging(false);
    setMeasurement(null);
    fetchCandles(symbol, range);
  }, [symbol, range, fetchCandles]);

  const firstPrice = candles[0]?.price;
  const lastPrice = candles[candles.length - 1]?.price;
  const displayPrice = livePrice ?? lastPrice;
  const refPrice = displayPrice ?? lastPrice;
  const isPositive = refPrice != null && firstPrice != null ? refPrice >= firstPrice : true;
  const pctChange =
    firstPrice && refPrice ? (((refPrice - firstPrice) / firstPrice) * 100).toFixed(2) : null;
  const lineColour = isPositive ? '#10b981' : '#ef4444';
  const gradientId = `grad-${symbol?.replace(/[^a-zA-Z0-9]/g, '')}`;
  const minPrice = candles.length ? Math.min(...candles.map((c) => (c.low ?? c.price) * 0.998)) : 0;
  const maxPrice = candles.length
    ? Math.max(...candles.map((c) => (c.high ?? c.price) * 1.002))
    : 0;

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
          <span
            style={{
              fontSize: '1.1rem',
              fontWeight: 800,
              color: 'var(--foreground, #f0f6fc)',
              letterSpacing: '0.02em',
            }}
          >
            {symbol}
          </span>
          {(livePrice != null || lastPrice != null) && (
            <span
              style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--foreground, #f0f6fc)' }}
            >
              $
              {Number(livePrice ?? lastPrice).toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
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
              {isPositive ? '+' : ''}
              {pctChange}%
            </span>
          )}
        </div>

        {!hideRangeButtons && (
          <DateSelector ranges={RANGES} value={range} onChange={setRange} size="xs" />
        )}
      </div>

      {/* ── Chart body ── */}
      <div
        ref={chartContainerRef}
        className={`chart-viewport-sm relative w-full${compact ? ' stock-price-chart--compact' : ''}`}
        style={{ overflow: 'visible' }}
      >
        {loading && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column',
              gap: '8px',
              color: 'var(--muted-foreground, #6b7280)',
              fontSize: '0.78rem',
            }}
          >
            <svg
              viewBox="0 0 24 24"
              width="20"
              height="20"
              fill="none"
              style={{ animation: 'spin 0.9s linear infinite' }}
            >
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" opacity="0.25" />
              <path
                d="M12 2a10 10 0 0 1 10 10"
                stroke="#10b981"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
            Loading {symbol}…
          </div>
        )}

        {!loading && error && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column',
              gap: '6px',
              color: error.includes('Rate limit') ? 'var(--muted-foreground, #6b7280)' : '#ef4444',
              fontSize: '0.75rem',
              textAlign: 'center',
              padding: '1rem',
            }}
          >
            {error.includes('Rate limit') ? (
              <>
                <svg
                  viewBox="0 0 24 24"
                  width="20"
                  height="20"
                  fill="none"
                  style={{ opacity: 0.5 }}
                >
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
                  <path
                    d="M12 6v6l4 2"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
                <span>Too many requests — please wait a moment</span>
                <span style={{ color: 'var(--muted-foreground, #6b7280)', fontSize: '0.65rem' }}>
                  Chart data will load automatically on retry
                </span>
              </>
            ) : (
              <>
                Could not load chart data.
                <span style={{ color: 'var(--muted-foreground, #6b7280)', fontSize: '0.65rem' }}>
                  {error}
                </span>
              </>
            )}
          </div>
        )}

        {!loading && hasFetched && !error && candles.length === 0 && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--muted-foreground, #6b7280)',
              fontSize: '0.75rem',
            }}
          >
            No data available for {symbol} · {range}
          </div>
        )}

        {!loading && candles.length > 0 && (
          <>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={candles}
                margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
                onMouseDown={handleChartMouseDown}
                onMouseMove={handleChartMouseMove}
                onMouseUp={handleChartMouseUp}
                onMouseLeave={handleChartMouseLeave}
                style={{ cursor: isDragging ? 'col-resize' : 'crosshair', userSelect: 'none' }}
              >
                <defs>
                  <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={lineColour} stopOpacity={0.25} />
                    <stop offset="100%" stopColor={lineColour} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="2 4"
                  stroke="rgba(128,128,128,0.12)"
                  vertical={false}
                />
                <XAxis
                  dataKey="label"
                  tick={{
                    /* fill via .spc-axis-tick in globals.css (--foreground isn’t in theme; inline SVG
                     fill with theme vars fails; stylesheet rules resolve var() on SVG <text>). */
                    className: 'spc-axis-tick',
                    fontSize: 10,
                    fontFamily: 'var(--font-mono, monospace)',
                  }}
                  axisLine={false}
                  tickLine={false}
                  interval="preserveStartEnd"
                  minTickGap={50}
                />
                <YAxis
                  domain={[minPrice, maxPrice]}
                  tick={{
                    className: 'spc-axis-tick',
                    fontSize: 10,
                    fontFamily: 'var(--font-mono, monospace)',
                  }}
                  axisLine={false}
                  tickLine={false}
                  width={40}
                  tickFormatter={(v) =>
                    `$${Number(v).toLocaleString('en-US', { maximumFractionDigits: 0 })}`
                  }
                />
                <Tooltip
                  content={<CustomTooltip />}
                  cursor={{ stroke: 'rgba(128,128,128,0.2)', strokeWidth: 1 }}
                />
                {firstPrice && (
                  <ReferenceLine
                    y={firstPrice}
                    stroke="rgba(128,128,128,0.2)"
                    strokeDasharray="3 4"
                  />
                )}
                {isDragging && dragStart && dragEnd && (
                  <ReferenceArea
                    x1={candles[Math.min(dragStart.index, dragEnd.index)]?.label}
                    x2={candles[Math.max(dragStart.index, dragEnd.index)]?.label}
                    fill={activePct >= 0 ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)'}
                    strokeOpacity={0}
                  />
                )}
                {measurement && (
                  <ReferenceArea
                    x1={candles[measurement.startIndex]?.label}
                    x2={candles[measurement.endIndex]?.label}
                    fill={
                      measurement.pct >= 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)'
                    }
                    stroke={
                      measurement.pct >= 0 ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'
                    }
                    strokeDasharray="3 3"
                  />
                )}
                <Area
                  type="monotone"
                  dataKey="price"
                  stroke={lineColour}
                  strokeWidth={1.5}
                  fill={`url(#${gradientId})`}
                  dot={false}
                  activeDot={{ r: 3, fill: lineColour, strokeWidth: 0 }}
                />
              </AreaChart>
            </ResponsiveContainer>
            {isDragging && dragStart && dragEnd && activePct !== null && (
              <div
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  background: 'rgba(13, 17, 23, 0.92)',
                  border: `1px solid ${activePct >= 0 ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`,
                  borderRadius: 10,
                  padding: '8px 16px',
                  pointerEvents: 'none',
                  zIndex: 30,
                  textAlign: 'center',
                  backdropFilter: 'blur(8px)',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'baseline',
                    gap: 6,
                    justifyContent: 'center',
                  }}
                >
                  <span
                    style={{
                      fontSize: '0.95rem',
                      fontWeight: 800,
                      fontFamily: 'var(--font-mono, monospace)',
                      color: activePct >= 0 ? '#10b981' : '#ef4444',
                    }}
                  >
                    {activeDollar >= 0 ? '+' : ''}
                    {activeDollar.toFixed(2)}
                  </span>
                  <span
                    style={{
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      fontFamily: 'var(--font-mono, monospace)',
                      color: activePct >= 0 ? '#10b981' : '#ef4444',
                    }}
                  >
                    ({Math.abs(activePct).toFixed(2)}%)
                  </span>
                  <span
                    style={{ fontSize: '0.85rem', color: activePct >= 0 ? '#10b981' : '#ef4444' }}
                  >
                    {activePct >= 0 ? '↑' : '↓'}
                  </span>
                </div>
                <div style={{ fontSize: '0.6rem', color: '#8b949e', marginTop: 3 }}>
                  {dragStart.label} – {dragEnd.label}
                </div>
              </div>
            )}

            {measurement && !isDragging && (
              <div
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  background: 'rgba(13, 17, 23, 0.95)',
                  border: `1px solid ${measurement.pct >= 0 ? 'rgba(16, 185, 129, 0.5)' : 'rgba(239, 68, 68, 0.5)'}`,
                  borderRadius: 10,
                  padding: '10px 18px',
                  pointerEvents: 'none',
                  zIndex: 30,
                  textAlign: 'center',
                  backdropFilter: 'blur(8px)',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'baseline',
                    gap: 6,
                    justifyContent: 'center',
                  }}
                >
                  <span
                    style={{
                      fontSize: '1.05rem',
                      fontWeight: 800,
                      fontFamily: 'var(--font-mono, monospace)',
                      color: measurement.pct >= 0 ? '#10b981' : '#ef4444',
                    }}
                  >
                    {measurement.dollarChange >= 0 ? '+' : ''}
                    {measurement.dollarChange.toFixed(2)}
                  </span>
                  <span
                    style={{
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      fontFamily: 'var(--font-mono, monospace)',
                      color: measurement.pct >= 0 ? '#10b981' : '#ef4444',
                    }}
                  >
                    ({Math.abs(measurement.pct).toFixed(2)}%)
                  </span>
                  <span
                    style={{
                      fontSize: '0.95rem',
                      color: measurement.pct >= 0 ? '#10b981' : '#ef4444',
                    }}
                  >
                    {measurement.pct >= 0 ? '↑' : '↓'}
                  </span>
                </div>
                <div style={{ fontSize: '0.625rem', color: '#8b949e', marginTop: 4 }}>
                  {measurement.dateRange}
                </div>
                <div style={{ fontSize: '0.5rem', color: '#6b7280', marginTop: 2 }}>
                  Click anywhere to clear
                </div>
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
            { label: 'Market Cap', value: stats.mcap, sub: stats.capType },
            { label: 'P/E Ratio', value: stats.pe, sub: 'Price / Earnings' },
            { label: 'Dividend Yield', value: stats.divYield, sub: 'Annual yield' },
            { label: 'EPS', value: stats.eps, sub: 'Earnings per share' },
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
