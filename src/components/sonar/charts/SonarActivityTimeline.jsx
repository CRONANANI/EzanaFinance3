'use client';

/**
 * SonarActivityTimeline (Nov 28 2026): the research activity family extracted from the
 * 21st.dev "creator dashboard". The source dashboard is not inserted whole; its useful
 * patterns are: an annotated time series, period-over-period metrics above it, event markers
 * on the series, and a chronological event feed under it. Applied to congressional activity,
 * 13F filings over time, award obligations, lobbying spend, earnings-event impact and revenue
 * or margin trajectories. The source's creator metrics are gone.
 *
 * Every point and event marker is a source record. A missing period breaks the line and the
 * frame says so (contracts.splitAtGaps); nothing is drawn through it.
 *
 * payload.data: { series: [{ x, y }], events: [{ x, label, href? }],
 *                 metrics: [{ label, value, unit, change?, changeUnit? }] }
 */
import { useMemo, useState } from 'react';
import { formatFigure, formatChange, num, splitAtGaps } from '@/lib/sonar/presentation/contracts';
import './sonar-research-library.css';

const W = 640;
const H = 200;
const PAD = 8;

export function SonarActivityTimeline({ payload }) {
  const p = payload || {};
  const d = p.data || {};
  const series = useMemo(() => d.series || [], [d.series]);
  const [hover, setHover] = useState(null);

  const geo = useMemo(() => {
    const ys = series.map((s) => num(s.y)).filter((v) => v !== null);
    const lo = Math.min(0, ...ys);
    const hi = Math.max(...ys, 0) || 1;
    const n = Math.max(1, series.length - 1);
    const X = (i) => PAD + (i / n) * (W - PAD * 2);
    const Y = (v) => H - PAD - ((v - lo) / (hi - lo || 1)) * (H - PAD * 2);
    const segs = splitAtGaps(series.map((s, i) => ({ ...s, i })));
    const line = segs
      .map((s) =>
        s.map((pt, k) => `${k ? 'L' : 'M'}${X(pt.i).toFixed(1)},${Y(pt.y).toFixed(1)}`).join(''),
      )
      .join('');
    const area = segs
      .map(
        (s) =>
          `M${X(s[0].i)},${Y(lo)}${s.map((pt) => `L${X(pt.i).toFixed(1)},${Y(pt.y).toFixed(1)}`).join('')}L${X(s[s.length - 1].i)},${Y(lo)}Z`,
      )
      .join('');
    const idxOf = new Map(series.map((s, i) => [String(s.x), i]));
    const marks = (d.events || [])
      .filter((e) => idxOf.has(String(e.x)))
      .map((e) => ({ ...e, i: idxOf.get(String(e.x)) }));
    return { X, Y, line, area, marks, lo, hi };
  }, [series, d.events]);

  const pt = hover !== null ? series[hover] : null;
  const fmt = (v) => formatFigure(v, p.unit, { currency: p.currency, compact: true });

  return (
    <div>
      {d.metrics?.length ? (
        <div className="srl-keys" style={{ gap: '8px 28px' }}>
          {d.metrics.slice(0, 4).map((m) => (
            <span key={m.label} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ fontSize: 12, color: 'var(--srl-faint)' }}>{m.label}</span>
              <span
                style={{
                  fontFamily: 'var(--srl-mono)',
                  fontSize: 18,
                  fontWeight: 600,
                  color: 'var(--srl-text)',
                }}
              >
                {formatFigure(m.value, m.unit, { compact: true })}
              </span>
              {num(m.change) !== null ? (
                <span className="srl-change">
                  {formatChange(m.change, { pp: m.changeUnit === 'pp' })}
                </span>
              ) : null}
            </span>
          ))}
        </div>
      ) : null}
      <svg
        className="srl-plot"
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        role="img"
        aria-label={`${p.title || 'Series'}${p.period?.label ? `, ${p.period.label}` : ''}`}
        onMouseLeave={() => setHover(null)}
        onMouseMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          const i = Math.round(((e.clientX - r.left) / r.width) * (series.length - 1));
          setHover(Math.max(0, Math.min(series.length - 1, i)));
        }}
      >
        {[0.25, 0.5, 0.75].map((f) => (
          <line key={f} className="srl-gridline" x1={0} x2={W} y1={H * f} y2={H * f} />
        ))}
        <path className="srl-area" d={geo.area} />
        <path className="srl-line" d={geo.line} />
        {geo.marks.map((m) => (
          <line
            key={`${m.x}-${m.label}`}
            className="srl-event"
            x1={geo.X(m.i)}
            x2={geo.X(m.i)}
            y1={0}
            y2={H}
          />
        ))}
        {pt && num(pt.y) !== null ? (
          <circle cx={geo.X(hover)} cy={geo.Y(num(pt.y))} r={3.5} fill="var(--srl-emerald)" />
        ) : null}
      </svg>
      <div className="srl-axis" aria-hidden="true">
        <span>{series[0]?.x}</span>
        <span>{series[series.length - 1]?.x}</span>
      </div>
      <p className="srl-readout" aria-live="polite">
        {pt ? `${pt.x}: ${num(pt.y) === null ? 'no observation' : fmt(pt.y)}` : ' '}
      </p>
      {d.events?.length ? (
        <ol className="srl-feed" aria-label="Events">
          {[...d.events]
            .sort((a, b) => String(b.x).localeCompare(String(a.x)))
            .slice(0, 8)
            .map((e) => (
              <li key={`${e.x}-${e.label}`}>
                <time>{e.x}</time>
                <span>
                  {e.href ? (
                    <a
                      href={e.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: 'inherit' }}
                    >
                      {e.label}
                    </a>
                  ) : (
                    e.label
                  )}
                </span>
              </li>
            ))}
        </ol>
      ) : null}
    </div>
  );
}

export default SonarActivityTimeline;
