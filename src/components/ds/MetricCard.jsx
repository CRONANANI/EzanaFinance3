'use client';

import { useId, useMemo, useState } from 'react';
import { cx } from './tokens';

/* Metric cards (Nov 22, 2026): a KPI as one large figure, with the series
   behind it drawn on the right over a dotted grid, and a footer for the
   change and the series' peak, low and average. Adapted from the 21st.dev
   progress metric card at the founder's request, in Ezana tokens, with no
   chart library (one small SVG). A metric with no history keeps the same
   card and grid, without the line. */

const NEUTRAL_PCT = 0.5;
const MAX_BARS = 36;

const defaultFormat = (n) =>
  new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 }).format(n);

/** Smooth path through points (Catmull-Rom as cubic Béziers), in 0..100. */
function smoothPath(pts) {
  if (pts.length < 2) return '';
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i += 1) {
    const p0 = pts[i - 1] || pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] || p2;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C${c1x.toFixed(2)},${c1y.toFixed(2)} ${c2x.toFixed(2)},${c2y.toFixed(2)} ${p2[0].toFixed(2)},${p2[1].toFixed(2)}`;
  }
  return d;
}

function MetricChart({ data, view, tone, gradId, format, formatDate }) {
  const [hover, setHover] = useState(null);
  const values = data.map((d) => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  /* Leave room at the top for the tooltip and at the bottom for the footer. */
  const y = (v) => 88 - ((v - min) / span) * 62;
  const x = (i) => (data.length === 1 ? 50 : (i / (data.length - 1)) * 100);
  const pts = data.map((d, i) => [x(i), y(d.value)]);
  const line = smoothPath(pts);
  const area = `${line} L100,100 L0,100 Z`;

  const step = Math.max(1, Math.ceil(data.length / MAX_BARS));
  const bars = data
    .map((d, i) => ({ ...d, i }))
    .filter((d, k) => k % step === 0 || d.i === data.length - 1);
  const barW = Math.max(0.8, (100 / bars.length) * 0.55);

  const idx = hover ?? data.length - 1;
  const point = data[idx];

  const onMove = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    const f = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    setHover(Math.round(f * (data.length - 1)));
  };

  return (
    <div
      className="ds-metric__plot"
      onPointerMove={onMove}
      onPointerLeave={() => setHover(null)}
      role="img"
      aria-label={`Trend over ${data.length} points, latest ${format(values[values.length - 1])}`}
    >
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" className={`ds-metric__stop-top is-${tone}`} />
            <stop offset="1" className="ds-metric__stop-bottom" />
          </linearGradient>
        </defs>
        {view === 'bars' ? (
          bars.map((b) => {
            const top = y(b.value);
            return (
              <rect
                key={b.i}
                className={cx('ds-metric__bar', `is-${tone}`, b.i === idx && 'is-on')}
                x={x(b.i) - barW / 2}
                y={top}
                width={barW}
                height={100 - top}
                rx="0.6"
              />
            );
          })
        ) : (
          <>
            <path d={area} fill={`url(#${gradId})`} />
            <path className={`ds-metric__line is-${tone}`} d={line} />
          </>
        )}
        <line className="ds-metric__guide" x1={x(idx)} x2={x(idx)} y1="6" y2="100" />
      </svg>
      {view !== 'bars' ? (
        <span
          className={`ds-metric__dot is-${tone}`}
          style={{ left: `${x(idx)}%`, top: `${y(point.value)}%` }}
        />
      ) : null}
      {hover != null ? (
        <span
          className="ds-metric__tip"
          style={{
            left: `${Math.min(80, Math.max(20, x(idx)))}%`,
            top: `${Math.max(30, y(point.value))}%`,
          }}
        >
          <strong>{format(point.value)}</strong>
          {point.date ? <span>{formatDate(point.date)}</span> : null}
        </span>
      ) : null}
    </div>
  );
}

/**
 * title         the metric's name
 * value         the headline figure, formatted
 * changeText    small figure top right (e.g. "+2.1% vs avg"); arrow from trend
 * trend         'up' | 'down' | 'flat'; defaults to the series' direction
 * series        [{ value, date? }] oldest first; two or more draws the chart
 * periods       [{ label, points? }] text tabs that window the series
 * format        number formatter for the tooltip and the footer stats
 * formatDate    date formatter for the tooltip
 * footer        left of the footer (defaults to nothing)
 * showStats     peak / low / avg on the right of the footer (with a series)
 * size          'sm' | 'md'
 */
export function MetricCard({
  title,
  value,
  changeText,
  trend,
  series,
  periods,
  format = defaultFormat,
  formatDate = (d) => d,
  footer,
  showStats = true,
  size = 'sm',
  muted = false,
  className,
}) {
  const gradId = `dsm-${useId().replace(/:/g, '')}`;
  const [view, setView] = useState('curve');
  const [period, setPeriod] = useState(periods?.length ? periods[periods.length - 1].label : null);

  const data = useMemo(() => {
    const all = (series || []).filter((d) => Number.isFinite(Number(d?.value)));
    const p = periods?.find((o) => o.label === period);
    const n = p?.points;
    return (n && n < all.length ? all.slice(-n) : all).map((d) => ({ ...d, value: Number(d.value) }));
  }, [series, periods, period]);

  const hasChart = data.length >= 2;
  const stats = useMemo(() => {
    if (!hasChart) return null;
    const v = data.map((d) => d.value);
    return {
      first: v[0],
      last: v[v.length - 1],
      peak: Math.max(...v),
      low: Math.min(...v),
      avg: v.reduce((a, b) => a + b, 0) / v.length,
    };
  }, [data, hasChart]);

  const resolved =
    trend ??
    (stats
      ? Math.abs(stats.first ? ((stats.last - stats.first) / Math.abs(stats.first)) * 100 : stats.last - stats.first) <
        NEUTRAL_PCT
        ? 'flat'
        : stats.last >= stats.first
          ? 'up'
          : 'down'
      : 'flat');
  const arrow =
    resolved === 'up' ? 'bi-arrow-up' : resolved === 'down' ? 'bi-arrow-down' : 'bi-arrow-right';

  return (
    <section className={cx('ds-metric', `ds-metric--${size}`, `is-${resolved}`, className)}>
      <div className="ds-metric__region" aria-hidden={!hasChart || undefined}>
        <div className="ds-metric__wash" />
        <div className="ds-metric__dots" />
        {hasChart ? (
          <MetricChart
            data={data}
            view={view}
            tone={resolved}
            gradId={gradId}
            format={format}
            formatDate={formatDate}
          />
        ) : null}
      </div>

      <div className="ds-metric__body">
        <div className="ds-metric__head">
          <h3 className="ds-metric__title">{title}</h3>
          {changeText ? (
            <span className={`ds-metric__change is-${resolved}`}>
              <i className={`bi ${arrow}`} aria-hidden="true" />
              {changeText}
            </span>
          ) : null}
        </div>
        {hasChart && (periods?.length || data.length > 3) ? (
          <div className="ds-metric__controls">
            <div className="ds-metric__tabs" role="group" aria-label={`${title} chart style`}>
              {[
                ['curve', 'bi-graph-up', 'Line'],
                ['bars', 'bi-bar-chart', 'Bars'],
              ].map(([id, icon, label]) => (
                <button
                  key={id}
                  type="button"
                  aria-pressed={view === id}
                  aria-label={label}
                  title={label}
                  onClick={() => setView(id)}
                >
                  <i className={`bi ${icon}`} aria-hidden="true" />
                </button>
              ))}
            </div>
            {periods?.length ? (
              <div className="ds-metric__tabs" role="group" aria-label={`${title} period`}>
                {periods.map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    aria-pressed={period === p.label}
                    onClick={() => setPeriod(p.label)}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
        <div className={cx('ds-metric__value', muted && 'is-muted')}>{value}</div>
      </div>

      {footer || (showStats && stats) ? (
        <div className="ds-metric__foot">
          <div className="ds-metric__foot-left">{footer}</div>
          {showStats && stats ? (
            <div className="ds-metric__stats">
              <span>
                <strong>{format(stats.peak)}</strong> peak
              </span>
              <span aria-hidden="true">·</span>
              <span>
                <strong>{format(stats.low)}</strong> low
              </span>
              <span aria-hidden="true">·</span>
              <span>
                <strong>{format(stats.avg)}</strong> avg
              </span>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
