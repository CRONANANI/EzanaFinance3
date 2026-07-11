'use client';

import { useId, useMemo, useState } from 'react';
import { money, pct } from './format';

/**
 * Lightweight inline-SVG line chart — fund (emerald solid, gradient fill) vs.
 * S&P 500 (grey dashed). No chart dependency. Empty state handled by the parent
 * (< 2 points). Hover readout tracks the nearest fund point.
 */
export function FundVsBenchmarkChart({ series }) {
  const gid = useId().replace(/[:]/g, '');
  const [hover, setHover] = useState(null);

  const W = 560;
  const H = 168;
  const PAD = { t: 10, r: 8, b: 16, l: 8 };

  const model = useMemo(() => {
    const pts = (series || []).filter((d) => d.fund_return_pct != null);
    if (pts.length < 2) return null;
    const rets = pts.flatMap((d) =>
      [d.fund_return_pct, d.benchmark_return_pct].filter((n) => n != null),
    );
    let min = Math.min(...rets, 0);
    let max = Math.max(...rets, 0);
    if (min === max) {
      min -= 1;
      max += 1;
    }
    const iw = W - PAD.l - PAD.r;
    const ih = H - PAD.t - PAD.b;
    const X = (i) => PAD.l + (pts.length === 1 ? iw / 2 : (i / (pts.length - 1)) * iw);
    const Y = (v) => PAD.t + ih - ((v - min) / (max - min)) * ih;
    const line = (key) =>
      pts
        .map((d, i) => (d[key] == null ? null : `${i === 0 ? 'M' : 'L'}${X(i)},${Y(d[key])}`))
        .filter(Boolean)
        .join(' ');
    const fundPath = line('fund_return_pct');
    const area = `${fundPath} L${X(pts.length - 1)},${PAD.t + ih} L${X(0)},${PAD.t + ih} Z`;
    return { pts, X, Y, fundPath, benchPath: line('benchmark_return_pct'), area, zeroY: Y(0) };
  }, [series]);

  if (!model) return <div className="fa-empty">Not enough history yet.</div>;

  const { pts, X, Y, fundPath, benchPath, area, zeroY } = model;
  const onMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * W;
    let idx = 0;
    let best = Infinity;
    pts.forEach((_, i) => {
      const d = Math.abs(X(i) - x);
      if (d < best) {
        best = d;
        idx = i;
      }
    });
    setHover(idx);
  };
  const hp = hover != null ? pts[hover] : null;

  return (
    <div style={{ position: 'relative' }}>
      <svg
        className="fa-chart"
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        role="img"
        aria-label="Fund value versus S&P 500 over the selected period"
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id={`fill${gid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--emerald, #10b981)" stopOpacity="0.22" />
            <stop offset="100%" stopColor="var(--emerald, #10b981)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <line
          x1={PAD.l}
          y1={zeroY}
          x2={W - PAD.r}
          y2={zeroY}
          stroke="var(--border-primary)"
          strokeWidth="1"
        />
        <path d={area} fill={`url(#fill${gid})`} />
        <path
          d={benchPath}
          fill="none"
          stroke="var(--text-muted, #94a3b8)"
          strokeWidth="1.6"
          strokeDasharray="4 3"
        />
        <path
          d={fundPath}
          fill="none"
          stroke="var(--emerald, #10b981)"
          strokeWidth="2.2"
          strokeLinejoin="round"
        />
        {hp && (
          <>
            <line
              x1={X(hover)}
              y1={PAD.t}
              x2={X(hover)}
              y2={H - PAD.b}
              stroke="var(--border-hover, rgba(16,185,129,0.4))"
              strokeWidth="1"
            />
            <circle
              cx={X(hover)}
              cy={Y(hp.fund_return_pct)}
              r="3.4"
              fill="var(--emerald, #10b981)"
              stroke="var(--surface-card, #fff)"
              strokeWidth="1.4"
            />
          </>
        )}
      </svg>
      {hp && (
        <div
          className="an4-num"
          style={{
            position: 'absolute',
            top: 4,
            right: 8,
            fontSize: '0.66rem',
            color: 'var(--text-muted)',
            textAlign: 'right',
            pointerEvents: 'none',
          }}
        >
          <div style={{ color: 'var(--text-primary)', fontWeight: 700 }}>
            {new Date(`${hp.date}T00:00:00`).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
            })}
            {hp.fund_value != null ? ` · ${money(hp.fund_value)}` : ''}
          </div>
          <div>
            Fund {pct(hp.fund_return_pct, 1)} · S&amp;P {pct(hp.benchmark_return_pct, 1)}
          </div>
        </div>
      )}
    </div>
  );
}
