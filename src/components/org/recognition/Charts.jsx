'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { CHART } from '@/lib/chart-theme';
import { fmtDay, fmtInt, signed } from '@/lib/org-recognition-model';

function useWidth(ref, fallback) {
  const [w, setW] = useState(fallback);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver((entries) => {
      const next = Math.round(entries[0]?.contentRect?.width || 0);
      if (next > 0) setW(next);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return w;
}

function niceTicks(min, max, count = 4) {
  if (min === max) {
    min -= 25;
    max += 25;
  }
  const raw = (max - min) / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) || raw;
  const lo = Math.floor(min / step) * step;
  const hi = Math.ceil(max / step) * step;
  const ticks = [];
  for (let v = lo; v <= hi + step / 2; v += step) ticks.push(Math.round(v));
  return ticks;
}

/**
 * Rating history. Dated: x is time and the first point is the rating at the
 * start of the window. Undated: x is the order of the changes, with no date
 * labels, because the stored dates cannot be trusted.
 */
export function HistoryChart({ points, dated }) {
  const wrap = useRef(null);
  const width = useWidth(wrap, 440);
  const gid = useId().replace(/:/g, '');
  const H = 200;
  const pad = { l: 44, r: 12, t: 12, b: 26 };
  const vals = points.map((p) => p.rating);
  const ticks = niceTicks(Math.min(...vals), Math.max(...vals));
  const yMin = ticks[0];
  const yMax = ticks[ticks.length - 1];
  const times = points.map((p, i) => (dated ? new Date(p.t).getTime() : i));
  const xMin = times[0];
  const xMax = Math.max(times[times.length - 1], xMin + 1);
  const iw = Math.max(40, width - pad.l - pad.r);
  const ih = H - pad.t - pad.b;
  const x = (v) => pad.l + ((v - xMin) / (xMax - xMin)) * iw;
  const y = (v) => pad.t + ih - ((v - yMin) / (yMax - yMin || 1)) * ih;
  /* A rating holds between changes: draw steps. */
  let d = '';
  points.forEach((p, i) => {
    const px = x(times[i]).toFixed(1);
    const py = y(p.rating).toFixed(1);
    if (i === 0) d = `M${px},${py}`;
    else d += ` H${px} V${py}`;
  });
  const lastX = x(xMax).toFixed(1);
  d += ` H${lastX}`;
  const area = `${d} V${pad.t + ih} H${x(xMin).toFixed(1)} Z`;
  const xLabels = dated
    ? [xMin, xMin + (xMax - xMin) / 2, xMax].map((t) => ({ t, label: fmtDay(t) }))
    : [];
  const last = points[points.length - 1];

  return (
    <div className="orc-chart" ref={wrap}>
      <svg width={width} height={H} role="img" aria-labelledby={`${gid}-t`}>
        <title id={`${gid}-t`}>
          {`Rating history: ${fmtInt(points[0].rating)} to ${fmtInt(last.rating)} over ${points.length - 1} ${points.length - 1 === 1 ? 'change' : 'changes'}`}
        </title>
        <defs>
          <linearGradient id={`${gid}-g`} x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="0%"
              stopColor={CHART.primaryStroke}
              stopOpacity={CHART.gradientFromOpacity}
            />
            <stop
              offset="100%"
              stopColor={CHART.primaryStroke}
              stopOpacity={CHART.gradientToOpacity}
            />
          </linearGradient>
        </defs>
        {ticks.map((t) => (
          <g key={t}>
            <line
              className="orc-chart__grid"
              x1={pad.l}
              x2={pad.l + iw}
              y1={y(t)}
              y2={y(t)}
              strokeDasharray={CHART.gridDash}
            />
            <text className="orc-chart__tick" x={pad.l - 8} y={y(t) + 4} textAnchor="end">
              {fmtInt(t)}
            </text>
          </g>
        ))}
        {xLabels.map((l, i) => (
          <text
            key={i}
            className="orc-chart__tick"
            x={x(l.t)}
            y={H - 6}
            textAnchor={i === 0 ? 'start' : i === xLabels.length - 1 ? 'end' : 'middle'}
          >
            {l.label}
          </text>
        ))}
        <path d={area} fill={`url(#${gid}-g)`} />
        <path className="orc-chart__line" d={d} />
        {points.map((p, i) =>
          p.opening ? null : (
            <circle
              key={i}
              className={`orc-chart__dot${p.delta < 0 ? ' is-neg' : ''}`}
              cx={x(times[i])}
              cy={y(p.rating)}
              r={3}
            >
              <title>
                {`${dated ? `${fmtDay(p.t)}: ` : ''}${signed(p.delta)} (${p.reason === 'decay' ? 'inactivity decay' : p.ticker || 'scored pitch'}), rating ${fmtInt(p.rating)}`}
              </title>
            </circle>
          ),
        )}
      </svg>
    </div>
  );
}

/**
 * Calibration: declared conviction (1 to 5) against the share of those
 * pitches that beat the market. The dashed line is the engine's ideal
 * (conviction 5 beats it every time, conviction 1 one time in five).
 */
export function CalibrationChart({ series }) {
  const wrap = useRef(null);
  const width = useWidth(wrap, 440);
  const gid = useId().replace(/:/g, '');
  const H = 220;
  const pad = { l: 44, r: 16, t: 12, b: 40 };
  const iw = Math.max(40, width - pad.l - pad.r);
  const ih = H - pad.t - pad.b;
  const x = (c) => pad.l + ((c - 1) / 4) * iw;
  const y = (r) => pad.t + ih - r * ih;
  const maxN = Math.max(...series.map((s) => s.total), 1);

  return (
    <div className="orc-chart" ref={wrap}>
      <svg width={width} height={H} role="img" aria-labelledby={`${gid}-t`}>
        <title id={`${gid}-t`}>
          {`Calibration: ${series
            .map(
              (s) =>
                `conviction ${s.conviction}, ${Math.round(s.hitRate * 100)}% of ${s.total} beat the market`,
            )
            .join('; ')}`}
        </title>
        {[0, 0.25, 0.5, 0.75, 1].map((r) => (
          <g key={r}>
            <line
              className="orc-chart__grid"
              x1={pad.l}
              x2={pad.l + iw}
              y1={y(r)}
              y2={y(r)}
              strokeDasharray={CHART.gridDash}
            />
            <text className="orc-chart__tick" x={pad.l - 8} y={y(r) + 4} textAnchor="end">
              {`${Math.round(r * 100)}%`}
            </text>
          </g>
        ))}
        {[1, 2, 3, 4, 5].map((c) => (
          <text
            key={c}
            className="orc-chart__tick"
            x={x(c)}
            y={pad.t + ih + 16}
            textAnchor="middle"
          >
            {c}
          </text>
        ))}
        <text className="orc-chart__axis" x={pad.l + iw / 2} y={H - 4} textAnchor="middle">
          Declared conviction
        </text>
        <line
          className="orc-chart__ideal"
          x1={x(1)}
          y1={y(0.2)}
          x2={x(5)}
          y2={y(1)}
          strokeDasharray={CHART.benchmarkDash}
        />
        {series.map((s) => (
          <g key={s.conviction}>
            <circle
              className="orc-chart__point"
              cx={x(s.conviction)}
              cy={y(s.hitRate)}
              r={4 + 3 * Math.sqrt(s.total / maxN)}
            />
            <text
              className="orc-chart__tick"
              x={x(s.conviction)}
              y={s.hitRate > 0.85 ? y(s.hitRate) + 20 : y(s.hitRate) - 10}
              textAnchor="middle"
            >
              {s.total}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
