'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { EchoFigureShell } from './EchoFigureShell';

/**
 * F27 · scrolly-spotlight — a scroll-driven section: the chart stays pinned
 * while a narrative card swaps per step. Each step re-styles the pinned chart —
 * the active era gets a dashed red highlight window, its annotations render bold
 * with filled markers, everything else dims. Degrades to a readable stacked
 * sequence with no JS (noscript) and respects prefers-reduced-motion.
 */

const CW = 760; // chart viewBox width
const CH = 520;
const PAD = { l: 56, r: 30, t: 40, b: 36 };

export function EchoScrollySpotlight({
  figureLabel,
  kicker,
  hint,
  source,
  series = [],
  annotations = [],
  yLabel,
  yMax,
  xMin,
  xMax,
  steps = [],
}) {
  const wrapRef = useRef(null);
  const [active, setActive] = useState(0);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    setReduced(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    const onScroll = () => {
      const el = wrapRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const travel = r.height - window.innerHeight;
      const prog = Math.min(1, Math.max(0, -r.top / Math.max(1, travel)));
      setActive(Math.min(steps.length - 1, Math.floor(prog * steps.length)));
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, [steps.length]);

  const allPts = series.flatMap((s) => s.data);
  const x0 = xMin ?? Math.min(...allPts.map((p) => p.x));
  const x1 = xMax ?? Math.max(...allPts.map((p) => p.x));
  const y1 = yMax ?? Math.max(...allPts.map((p) => p.y)) * 1.1;
  const sx = (v) => PAD.l + ((v - x0) / (x1 - x0)) * (CW - PAD.l - PAD.r);
  const sy = (v) => CH - PAD.b - (v / y1) * (CH - PAD.t - PAD.b);

  const step = steps[active] ?? {};
  const emph = step.emphasis; // undefined = all full
  const activeAnn = step.activeAnnotations;

  const gridY = useMemo(() => {
    const g = [];
    for (let v = 0; v <= y1; v += y1 > 40 ? 10 : 5) g.push(v);
    return g;
  }, [y1]);

  const chart = (
    <svg
      className="echo-fig-svg echo-scrolly-chart"
      viewBox={`0 0 ${CW} ${CH}`}
      role="img"
      aria-label={figureLabel}
    >
      {gridY.map((v) => (
        <g key={v}>
          <line x1={PAD.l} y1={sy(v)} x2={CW - PAD.r} y2={sy(v)} stroke="var(--echo-chart-grid)" />
          <text
            x={PAD.l - 8}
            y={sy(v) + 4}
            textAnchor="end"
            className="echo-fig-mono"
            fontSize="13"
            fill="var(--text-muted)"
          >
            {v}
          </text>
        </g>
      ))}
      {yLabel && (
        <text
          x={PAD.l - 40}
          y={PAD.t - 16}
          className="echo-fig-mono"
          fontSize="13"
          fill="var(--text-muted)"
        >
          {yLabel}
        </text>
      )}
      {[x0, Math.round((x0 + x1) / 2), x1].map((v) => (
        <text
          key={v}
          x={sx(v)}
          y={CH - PAD.b + 22}
          textAnchor="middle"
          className="echo-fig-mono"
          fontSize="13"
          fill="var(--text-muted)"
        >
          {v}
        </text>
      ))}

      {/* era highlight window */}
      {step.highlight && (
        <g className="echo-scrolly-window">
          <rect
            x={sx(step.highlight.from)}
            y={PAD.t - 14}
            width={sx(step.highlight.to) - sx(step.highlight.from)}
            height={CH - PAD.t - PAD.b + 14}
            fill="color-mix(in srgb, var(--echo-chart-red) 10%, transparent)"
            stroke="var(--echo-chart-red)"
            strokeWidth="1.4"
            strokeDasharray="6 4"
          />
        </g>
      )}

      {series.map((s) => {
        const on = !emph || emph.includes(s.key);
        const d = s.data.map((p, i) => `${i ? 'L' : 'M'} ${sx(p.x)} ${sy(p.y)}`).join(' ');
        const area = `${d} L ${sx(s.data.at(-1).x)} ${sy(0)} L ${sx(s.data[0].x)} ${sy(0)} Z`;
        return (
          <g key={s.key} opacity={on ? 1 : 0.25} className="echo-scrolly-series">
            {s.fill && <path d={area} fill={s.color} opacity="0.12" />}
            <path d={d} fill="none" stroke={s.color} strokeWidth={on && emph ? 2.6 : 2} />
            <text
              x={sx(s.data.at(-1).x) + 6}
              y={sy(s.data.at(-1).y) + 4}
              className="echo-fig-mono"
              fontSize="13.5"
              fontWeight="700"
              fill={s.color}
            >
              {s.label}
            </text>
          </g>
        );
      })}

      {annotations.map((a) => {
        const on = !activeAnn || activeAnn.includes(a.label);
        return (
          <g key={a.label} opacity={on ? 1 : 0.3} className="echo-scrolly-ann">
            <line
              x1={sx(a.x)}
              y1={sy(a.y) - 6}
              x2={sx(a.x)}
              y2={sy(a.y) - 26}
              stroke="var(--echo-chart-annotation)"
              strokeDasharray="2 2"
            />
            <circle
              cx={sx(a.x)}
              cy={sy(a.y)}
              r={on && activeAnn ? 5 : 4}
              fill={on && activeAnn ? 'var(--echo-chart-red)' : 'var(--bg-primary)'}
              stroke="var(--echo-chart-red)"
              strokeWidth="1.6"
            />
            <text
              x={sx(a.x)}
              y={sy(a.y) - 32}
              textAnchor="middle"
              className="echo-fig-mono"
              fontSize="13"
              fontWeight={on && activeAnn ? '700' : '500'}
              fill="var(--text-primary)"
            >
              {a.label}
            </text>
          </g>
        );
      })}
    </svg>
  );

  return (
    <EchoFigureShell figureLabel={figureLabel} kicker={kicker} hint={hint} source={source}>
      <div ref={wrapRef} className="echo-scrolly" style={{ height: `${steps.length * 90}vh` }}>
        <div className="echo-scrolly-sticky">
          <div className="echo-scrolly-grid">
            <div className="echo-scrolly-chartcol">{chart}</div>
            <div className="echo-scrolly-cardcol" aria-live="polite">
              <div
                key={active}
                className={`echo-scrolly-card${reduced ? '' : ' echo-scrolly-card-anim'}`}
              >
                <div className="echo-scrolly-counter">
                  {String(active + 1).padStart(2, '0')} / {String(steps.length).padStart(2, '0')}
                </div>
                <h5 className="echo-scrolly-title">{step.title}</h5>
                <p className="echo-scrolly-body">{step.body}</p>
              </div>
            </div>
          </div>
        </div>
        {/* no-JS / SEO fallback: all step text present in DOM */}
        <noscript>
          {steps.map((s, i) => (
            <div key={i} className="echo-scrolly-card">
              <strong>{s.title}</strong>
              <p>{s.body}</p>
            </div>
          ))}
        </noscript>
      </div>
    </EchoFigureShell>
  );
}
