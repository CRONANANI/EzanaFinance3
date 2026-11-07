'use client';

/**
 * Monthly deaths in organized violence, stacked by type (state-based, non-state, one-sided),
 * shared by the Armed Conflict Tracker and Sonar's country conflict panel. Hover or focus a
 * month for its counts and UCDP's low to high range; months from the monthly (preliminary)
 * release are hatched and labelled. Values are also given to screen readers as text.
 */
import { useId, useMemo, useState } from 'react';
import { TYPES, fmt, monthLabel, monthlySeries } from '@/lib/ucdp/view';
import './conflict.css';

export default function ConflictMonthlyChart({ monthly = [], height = 200, months = null, label }) {
  const pid = useId().replace(/:/g, '');
  const [hover, setHover] = useState(null);
  const series = useMemo(() => {
    const s = monthlySeries(monthly);
    return months ? s.slice(-months) : s;
  }, [monthly, months]);
  if (!series.length) return <p className="cfc-empty">No recorded events in this period.</p>;
  const W = 640;
  const H = height;
  const pad = { l: 44, r: 6, t: 10, b: 24 };
  const max = Math.max(1, ...series.map((m) => m.total));
  const bw = (W - pad.l - pad.r) / series.length;
  const y = (v) => pad.t + (H - pad.t - pad.b) * (1 - v / max);
  const ticks = [0, max / 2, max];
  const every = Math.max(1, Math.ceil(series.length / 9));
  const shown = hover != null ? series[hover] : series[series.length - 1];
  return (
    <div className="cfc-chart">
      <p className="cfc-readout" aria-live="polite">
        <b>{monthLabel(shown.month, true)}</b>
        {`: ${fmt(shown.total)} deaths (range ${fmt(shown.low)} to ${fmt(shown.high)}), `}
        {TYPES.map((t) => `${t.label.toLowerCase()} ${fmt(shown[t.tone])}`).join(', ')}
        {shown.preliminary ? ' · preliminary' : ''}
      </p>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="cfc-svg"
        role="img"
        aria-label={label || 'Monthly deaths in organized violence by type'}
      >
        <defs>
          <pattern
            id={`hatch-cfc-${pid}`}
            width="4"
            height="4"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(45)"
          >
            <line x1="0" y1="0" x2="0" y2="4" className="cfc-hatch" />
          </pattern>
        </defs>
        {ticks.map((t) => (
          <g key={t}>
            <line className="cfc-grid" x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} />
            <text className="cfc-axis" x={pad.l - 6} y={y(t) + 3} textAnchor="end">
              {fmt(t)}
            </text>
          </g>
        ))}
        {series.map((m, i) => {
          let base = 0;
          const x = pad.l + i * bw;
          return (
            <g
              key={m.month}
              className={`cfc-col${hover === i ? ' is-hover' : ''}`}
              tabIndex={0}
              aria-label={`${monthLabel(m.month, true)}: ${fmt(m.total)} deaths`}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              onFocus={() => setHover(i)}
              onBlur={() => setHover(null)}
            >
              <rect className="cfc-hit" x={x} y={pad.t} width={bw} height={H - pad.t - pad.b} />
              {TYPES.map((t) => {
                const v = m[t.tone];
                if (!v) return null;
                const y0 = y(base + v);
                const h = y(base) - y0;
                base += v;
                return (
                  <rect
                    key={t.id}
                    className={`cfc-bar is-${t.tone}`}
                    x={x + bw * 0.12}
                    y={y0}
                    width={Math.max(1, bw * 0.76)}
                    height={Math.max(0.5, h)}
                  />
                );
              })}
              {m.preliminary && m.total ? (
                <rect
                  x={x + bw * 0.12}
                  y={y(m.total)}
                  width={Math.max(1, bw * 0.76)}
                  height={y(0) - y(m.total)}
                  fill={`url(#hatch-cfc-${pid})`}
                />
              ) : null}
              {i % every === 0 ? (
                <text className="cfc-axis" x={x + bw / 2} y={H - 8} textAnchor="middle">
                  {monthLabel(m.month)}
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>
      <div className="cfc-legend">
        {TYPES.map((t) => (
          <span key={t.id} className={`cfc-key is-${t.tone}`}>
            {t.label}
          </span>
        ))}
        {series.some((m) => m.preliminary) ? (
          <span className="cfc-key is-prelim">Preliminary</span>
        ) : null}
      </div>
    </div>
  );
}
