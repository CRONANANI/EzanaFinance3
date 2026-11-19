'use client';

import { useMemo, useState } from 'react';
import { EchoFigureShell } from './EchoFigureShell';

/**
 * Ridgeline (Nov 2026): the shape of many distributions at once, one smoothed
 * density per row, rising into the rows above. Hover (or arrow keys) lifts a
 * ridge and shows its median, middle half and range. Each ridge is shaded by
 * its median, from a light tint to the full emerald. Static SVG.
 *
 *   series: [{ id, label, values: [raw observations] }]
 *   unit: suffix for values; overlap: how many rows a peak may rise
 */
const SAMPLES = 80;
const quant = (s, q) => {
  if (!s.length) return 0;
  const at = (s.length - 1) * q;
  const lo = Math.floor(at);
  const hi = Math.ceil(at);
  return s[lo] + (s[hi] - s[lo]) * (at - lo);
};
function stats(values) {
  const s = values.filter(Number.isFinite).sort((a, b) => a - b);
  return {
    s,
    n: s.length,
    min: s[0] ?? 0,
    max: s[s.length - 1] ?? 0,
    q1: quant(s, 0.25),
    med: quant(s, 0.5),
    q3: quant(s, 0.75),
  };
}
function bandwidth(st) {
  if (st.n < 2) return 1;
  const mean = st.s.reduce((a, v) => a + v, 0) / st.n;
  const sd = Math.sqrt(st.s.reduce((a, v) => a + (v - mean) ** 2, 0) / (st.n - 1));
  const spread = Math.min(sd, (st.q3 - st.q1) / 1.34 || sd) || 1;
  return Math.max(1e-6, 0.9 * spread * st.n ** -0.2);
}

export function EchoRidgeline({
  figureLabel,
  kicker,
  hint,
  source,
  series = [],
  unit = '',
  overlap = 2.2,
  rowHeight = 30,
}) {
  const [active, setActive] = useState(null);
  const W = 720;
  const GUTTER = 92;
  const AXIS = 28;
  const top = Math.ceil((overlap - 1) * rowHeight) + 12;
  const H = top + series.length * rowHeight + AXIS;
  const plotW = W - GUTTER - 12;
  const fmt = (v) => `${Number(v).toLocaleString('en-US', { maximumFractionDigits: 1 })}${unit}`;

  const model = useMemo(() => {
    const st = series.map((s) => stats(s.values || []));
    const bws = st.map(bandwidth);
    const filled = st.map((x, i) => ({ x, room: 2.5 * bws[i] })).filter((d) => d.x.n);
    let lo = Math.min(...filled.map((d) => d.x.min - d.room));
    let hi = Math.max(...filled.map((d) => d.x.max + d.room));
    if (!Number.isFinite(lo) || !Number.isFinite(hi) || lo === hi) {
      lo = 0;
      hi = 1;
    }
    const curves = st.map((x, i) => {
      const ys = [];
      const norm = 1 / (Math.max(1, x.n) * bws[i] * Math.sqrt(2 * Math.PI));
      for (let k = 0; k < SAMPLES; k += 1) {
        const v = lo + ((hi - lo) * k) / (SAMPLES - 1);
        let sum = 0;
        for (const o of x.s) {
          const u = (v - o) / bws[i];
          if (u > -5 && u < 5) sum += Math.exp(-0.5 * u * u);
        }
        ys.push(sum * norm);
      }
      return ys;
    });
    const peak = Math.max(1e-9, ...curves.flat());
    return { st, lo, hi, curves: curves.map((c) => c.map((y) => y / peak)) };
  }, [series]);

  const sx = (v) => GUTTER + ((v - model.lo) / (model.hi - model.lo || 1)) * plotW;
  const base = (row) => top + (row + 1) * rowHeight;
  const lift = rowHeight * overlap;
  const path = (row, closed) => {
    const ys = model.curves[row];
    const pts = ys.map((y, k) => {
      const v = model.lo + ((model.hi - model.lo) * k) / (SAMPLES - 1);
      return `${sx(v).toFixed(1)},${(base(row) - y * lift).toFixed(1)}`;
    });
    return closed
      ? `M${sx(model.lo).toFixed(1)},${base(row)}L${pts.join('L')}L${sx(model.hi).toFixed(1)},${base(row)}Z`
      : `M${pts.join('L')}`;
  };
  const tone = (med) =>
    `color-mix(in srgb, var(--echo-chart-green) ${Math.round(
      38 + Math.max(0, Math.min(1, (med - model.lo) / (model.hi - model.lo || 1))) * 62,
    )}%, var(--bg-primary))`;
  const ticks = [];
  const raw = (model.hi - model.lo) / 5;
  const pow = 10 ** Math.floor(Math.log10(raw || 1));
  const step = (raw / pow >= 5 ? 5 : raw / pow >= 2 ? 2 : 1) * pow;
  for (let v = Math.ceil(model.lo / step) * step; v <= model.hi + 1e-9; v += step) {
    ticks.push(Math.round(v * 1e6) / 1e6);
  }
  const cur = active != null ? model.st[active] : null;

  const onKey = (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const d = e.key === 'ArrowDown' ? 1 : -1;
      setActive((a) => Math.max(0, Math.min(series.length - 1, (a ?? -d) + d)));
    } else if (e.key === 'Escape') setActive(null);
  };

  return (
    <EchoFigureShell figureLabel={figureLabel} kicker={kicker} hint={hint} source={source}>
      <div
        className="echo-ridge"
        tabIndex={0}
        role="group"
        aria-label={`${figureLabel || 'Ridgeline'}. Up and down arrows choose a row.`}
        onKeyDown={onKey}
        onMouseLeave={() => setActive(null)}
        onBlur={() => setActive(null)}
      >
        <svg viewBox={`0 0 ${W} ${H}`} className="echo-ridge-svg" aria-hidden="true">
          {ticks.map((v) => (
            <g key={v}>
              <line
                x1={sx(v)}
                x2={sx(v)}
                y1={top - rowHeight * 0.5}
                y2={H - AXIS}
                className="echo-ridge-grid"
              />
              <text x={sx(v)} y={H - 8} className="echo-ridge-tick" textAnchor="middle">
                {fmt(v)}
              </text>
            </g>
          ))}
          {series.map((s, row) => {
            const st = model.st[row];
            const dim = active != null && active !== row;
            return (
              <g
                key={s.id || s.label}
                className={`echo-ridge-row${dim ? ' is-dim' : ''}${active === row ? ' is-on' : ''}`}
                style={{ color: tone(st.med) }}
                onMouseEnter={() => setActive(row)}
              >
                <path d={path(row, true)} className="echo-ridge-fill" />
                <path d={path(row, false)} className="echo-ridge-line" />
                {active === row && st.n ? (
                  <line
                    x1={sx(st.med)}
                    x2={sx(st.med)}
                    y1={base(row)}
                    y2={base(row) - lift * 0.9}
                    className="echo-ridge-med"
                  />
                ) : null}
                <text
                  x={GUTTER - 10}
                  y={base(row) - 6}
                  className="echo-ridge-label"
                  textAnchor="end"
                >
                  {s.label}
                </text>
              </g>
            );
          })}
        </svg>
        <div className="echo-ridge-read" aria-live="polite">
          {cur && cur.n ? (
            <>
              <strong>{series[active].label}</strong>
              <span>Median {fmt(cur.med)}</span>
              <span>
                Middle half {fmt(cur.q1)} to {fmt(cur.q3)}
              </span>
              <span>
                Range {fmt(cur.min)} to {fmt(cur.max)}
              </span>
              <span>{cur.n} values</span>
            </>
          ) : (
            <span className="echo-ridge-idle">Hover a row for its median and spread</span>
          )}
        </div>
      </div>
    </EchoFigureShell>
  );
}

export default EchoRidgeline;
