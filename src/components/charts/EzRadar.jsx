'use client';

import { useId, useState } from 'react';
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import './ez-radar.css';

/**
 * EzRadar (Nov 2026): the house radar chart, used by every radar in the app
 * and on dataset pages. A legend row over the plot (hover a name to isolate
 * that series), a quiet polygon grid in the text colour at 18%, filled
 * series (first 22%, the rest 16%) or outlines only, hover on a polygon dims
 * the others, a tooltip card, and loading bars while data arrives. In dark
 * mode the series glow (charts-glow.css). Plain JS on Recharts.
 *
 * data:   rows, one per axis, e.g. { dimension: 'Trade', a: 71, b: 55 }
 * axisKey: the row key that names the axis ('dimension')
 * series: [{ key: 'a', label: 'Canada', color: 'var(--emerald)' }, ...]
 * labelOf(row): optional full axis name for the tooltip
 * glow: the glowing variant, outlines with a soft glow in light mode too
 *   (dark mode glows every radar already, charts-glow.css)
 */
export function EzRadar({
  data,
  axisKey = 'dimension',
  series,
  domain = [0, 100],
  labelOf,
  formatValue = (v) => (v == null ? 'N/A' : Number(v).toFixed(1)),
  variant = 'filled',
  gridType = 'polygon',
  showLegend = true,
  isLoading = false,
  height = 300,
  outerRadius = '72%',
  glow = false,
  ariaLabel,
  className = '',
}) {
  const uid = useId().replace(/:/g, '');
  const [activeKey, setActiveKey] = useState(null);
  const filled = variant === 'filled';
  const opacityOf = (key) => (activeKey == null || activeKey === key ? 1 : 0.22);

  return (
    <figure
      className={`ezr${glow ? ' ezr--glow' : ''} ${className}`.trim()}
      aria-label={ariaLabel}
      onMouseLeave={() => setActiveKey(null)}
    >
      {showLegend ? (
        <div className="ezr-legend" role="list">
          {series.map((s) => (
            <button
              key={s.key}
              type="button"
              role="listitem"
              className={`ezr-legend-item${activeKey === s.key ? ' is-active' : ''}${
                activeKey != null && activeKey !== s.key ? ' is-dim' : ''
              }`}
              onMouseEnter={() => setActiveKey(s.key)}
              onFocus={() => setActiveKey(s.key)}
              onBlur={() => setActiveKey(null)}
            >
              <span className="ezr-swatch" style={{ background: s.color }} aria-hidden="true" />
              {s.label}
            </button>
          ))}
        </div>
      ) : null}
      {isLoading ? (
        <div className="ezr-loading" style={{ height }} aria-busy="true" aria-label="Loading">
          {Array.from({ length: 8 }, (_, i) => (
            <span key={i} className="ezr-bar" style={{ animationDelay: `${i * 0.08}s` }} />
          ))}
        </div>
      ) : (
        <div className="ezr-plot" style={{ height }}>
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <RadarChart data={data} cx="50%" cy="50%" outerRadius={outerRadius} id={`ezr-${uid}`}>
              <PolarGrid gridType={gridType} stroke="currentColor" strokeOpacity={0.18} />
              <PolarAngleAxis
                dataKey={axisKey}
                tick={<WrapTick />}
              />
              <PolarRadiusAxis tick={false} axisLine={false} domain={domain} />
              <Tooltip
                cursor={false}
                content={(p) => (
                  <EzRadarTooltip
                    {...p}
                    series={series}
                    labelOf={labelOf}
                    axisKey={axisKey}
                    formatValue={formatValue}
                  />
                )}
              />
              {series.map((s, i) => (
                <Radar
                  key={s.key}
                  dataKey={s.key}
                  name={s.label}
                  stroke={s.color}
                  fill={s.color}
                  fillOpacity={
                    (filled ? (s.fillOpacity ?? (i === 0 ? 0.22 : 0.16)) : 0) * opacityOf(s.key)
                  }
                  strokeOpacity={opacityOf(s.key)}
                  strokeWidth={2}
                  /* Recharts leaves radar polygons where they were first
                     drawn when the container resizes mid-animation, so the
                     draw-in is off: the shapes always sit on the grid. */
                  isAnimationActive={false}
                  style={{
                    opacity: opacityOf(s.key),
                    transition: 'opacity 0.15s ease',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={() => setActiveKey(s.key)}
                />
              ))}
            </RadarChart>
          </ResponsiveContainer>
        </div>
      )}
    </figure>
  );
}

/* Axis label that wraps to the room left beside it, so long names never run
   past the chart edge on a phone. Up to three lines, ellipsis after that. */
function WrapTick({ x, y, cx, cy, payload, textAnchor }) {
  const label = String(payload?.value ?? '');
  const room = textAnchor === 'start' ? cx * 2 - x : textAnchor === 'end' ? x : cx * 2;
  const per = Math.max(6, Math.floor((room - 6) / 6.2));
  const words = label.split(/\s+/);
  const lines = [];
  let cur = '';
  words.forEach((w) => {
    const next = cur ? `${cur} ${w}` : w;
    if (next.length <= per) cur = next;
    else {
      if (cur) lines.push(cur);
      cur = w.length > per ? `${w.slice(0, per - 1)}…` : w;
    }
  });
  if (cur) lines.push(cur);
  const shown = lines.slice(0, 3);
  if (lines.length > 3) shown[2] = `${shown[2].slice(0, per - 1)}…`;
  const lift = y < (cy ?? 0) - 4 ? -(shown.length - 1) * 12 : 0;
  return (
    <text x={x} y={y + lift} textAnchor={textAnchor} fill="var(--text-muted)" fontSize={11}>
      <title>{label}</title>
      {shown.map((l, i) => (
        <tspan key={i} x={x} dy={i === 0 ? '0.35em' : 12}>
          {l}
        </tspan>
      ))}
    </text>
  );
}

function EzRadarTooltip({ active, payload, series, labelOf, axisKey, formatValue }) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload || {};
  const title = labelOf ? labelOf(row) : row[axisKey];
  return (
    <div className="ezr-tip">
      <div className="ezr-tip-title">{title}</div>
      {series.map((s) => (
        <div key={s.key} className="ezr-tip-row">
          <span className="ezr-swatch" style={{ background: s.color }} aria-hidden="true" />
          <span className="ezr-tip-name">{s.label}</span>
          <span className="ezr-tip-val">{formatValue(row[s.key])}</span>
        </div>
      ))}
    </div>
  );
}

export default EzRadar;
