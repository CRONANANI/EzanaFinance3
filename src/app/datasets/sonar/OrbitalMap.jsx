'use client';

/**
 * The datasets sonar, drawn as the Ezana orbital map (the 7-dimension
 * radar card from the landing page: PersonalizationRadar and its band fork
 * SonarOrbitalMap), on the sonar card's dark ground.
 *
 * Every mark still encodes something true:
 *   axis + label   a dimension, in taxonomy order, with its live state
 *   vertex         live dimensions sit out by how many datasets are live;
 *                  roadmap dimensions sit near the hub; every vertex drifts
 *   halo ping      a live dimension (its datasets are receiving records)
 *   dashed vertex  a roadmap dimension: no ping, no count, a smaller drift
 *   sweep          the sonar sweeping the map from the Ezana Sonar hub
 *
 * The SVG is decorative to assistive tech (aria-hidden). The real controls
 * are <button>s laid over each dimension's label (labels do not move, so the
 * hit targets never chase a drifting dot), and a visually hidden list names
 * every dimension and its state. Drift runs on requestAnimationFrame after
 * mount with deterministic per-axis parameters (no Math.random), so server
 * and client markup agree; under prefers-reduced-motion it never starts and
 * the sweep rests as a static wedge.
 */
import { useEffect, useRef, useState } from 'react';
import { useSonarSelection } from './SonarSelection';

const W = 1240;
const H = 760;
const CX = 620;
const CY = 380;
const RMAX = 280;
const RINGS = [0.36, 0.68, 1];
const ROAD_W = 0.32;
const SWEEP_DEG = 58;

const r2 = (n) => Math.round(n * 10) / 10;

/* Axis i, clockwise from 12 o'clock (the orbital map's layout). */
function angle(i, n) {
  return ((-90 + (i * 360) / n) * Math.PI) / 180;
}
function pointAt(i, n, w) {
  const a = angle(i, n);
  return { x: CX + RMAX * w * Math.cos(a), y: CY + RMAX * w * Math.sin(a) };
}
function labelAt(i, n) {
  const a = angle(i, n);
  const lr = RMAX + 38;
  const c = Math.cos(a);
  return {
    x: r2(CX + lr * c),
    y: r2(CY + lr * Math.sin(a)),
    anchor: Math.abs(c) < 0.25 ? 'middle' : c > 0 ? 'start' : 'end',
  };
}

/* Resting weight: live dimensions sit further out the more datasets are live. */
function baseWeight(b) {
  if (!b.live) return ROAD_W;
  return Math.min(0.94, 0.56 + 0.09 * b.liveCount);
}

/* Deterministic drift parameters per axis (golden-ratio spread). */
function driftParams(i) {
  const g = (k) => ((i + 1) * 0.618034 * k) % 1;
  return {
    a1: 0.05 + 0.03 * g(1),
    a2: 0.025 + 0.02 * g(2),
    f1: 0.05 + 0.04 * g(3),
    f2: 0.11 + 0.06 * g(5),
    p1: 6.283 * g(7),
    p2: 6.283 * g(11),
  };
}
function weightAt(base, s, t, scale = 1) {
  const w =
    base +
    scale * (s.a1 * Math.sin(6.283 * s.f1 * t + s.p1) + s.a2 * Math.sin(6.283 * s.f2 * t + s.p2));
  return Math.max(0.22, Math.min(0.98, w));
}

function useMotionAllowed() {
  const [ok, setOk] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const on = () => setOk(!mq.matches);
    on();
    mq.addEventListener?.('change', on);
    return () => mq.removeEventListener?.('change', on);
  }, []);
  return ok;
}

function stateText(b) {
  return b.live ? `${b.liveCount} live, pinging` : 'roadmap, silent';
}

/* Sweep wedge path from the hub, opening clockwise from 12 o'clock. */
function sweepPath() {
  const a = (SWEEP_DEG * Math.PI) / 180;
  const x = r2(CX + RMAX * Math.sin(a));
  const y = r2(CY - RMAX * Math.cos(a));
  return `M ${CX} ${CY} L ${CX} ${CY - RMAX} A ${RMAX} ${RMAX} 0 0 1 ${x} ${y} Z`;
}
const SWEEP = sweepPath();

export default function OrbitalMap({ blips, pinging, silent }) {
  const { selected, select } = useSonarSelection();
  const motion = useMotionAllowed();
  const n = blips.length;
  const bases = blips.map(baseWeight);
  const [weights, setWeights] = useState(bases);
  const raf = useRef(0);

  useEffect(() => {
    if (!motion) {
      setWeights(blips.map(baseWeight));
      return undefined;
    }
    const params = blips.map((_, i) => driftParams(i));
    const start = performance.now();
    let last = 0;
    const tick = (now) => {
      raf.current = requestAnimationFrame(tick);
      if (now - last < 33) return; // ~30fps is plenty for a slow drift
      last = now;
      const t = (now - start) / 1000;
      setWeights(blips.map((b, i) => weightAt(baseWeight(b), params[i], t, b.live ? 1 : 0.7)));
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [motion, blips]);

  const pts = blips.map((_, i) => pointAt(i, n, weights[i] ?? bases[i]));
  const poly = pts.map((p) => `${r2(p.x)},${r2(p.y)}`).join(' ');

  return (
    <div className="dso-orb">
      <div className="dso-orb-stage">
        <svg className="dso-orb-svg" viewBox={`0 0 ${W} ${H}`} aria-hidden="true" focusable="false">
          <defs>
            <radialGradient id="dso-orb-fill" cx="50%" cy="50%" r="50%">
              <stop offset="0%" className="dso-orb-stop-in" />
              <stop offset="100%" className="dso-orb-stop-out" />
            </radialGradient>
            <linearGradient id="dso-orb-sweep" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" className="dso-orb-stop-clear" />
              <stop offset="100%" className="dso-orb-stop-sweep" />
            </linearGradient>
          </defs>

          {/* range rings and the seven spokes */}
          {RINGS.map((k) => (
            <circle key={k} className="dso-orb-ring" cx={CX} cy={CY} r={RMAX * k} />
          ))}
          {blips.map((b, i) => {
            const end = pointAt(i, n, 1);
            return (
              <line
                key={`ax-${b.id}`}
                className={`dso-orb-axis${b.id === selected ? ' is-selected' : ''}`}
                x1={CX}
                y1={CY}
                x2={r2(end.x)}
                y2={r2(end.y)}
              />
            );
          })}

          {/* the sweep: one group, rotated by CSS about the hub */}
          <g className="dso-orb-sweep">
            <path d={SWEEP} fill="url(#dso-orb-sweep)" />
          </g>

          {/* the shape */}
          <polygon className="dso-orb-shape" points={poly} fill="url(#dso-orb-fill)" />

          {/* hub */}
          <circle className="dso-orb-hub-ring" cx={CX} cy={CY} r="52" />
          <circle className="dso-orb-hub" cx={CX} cy={CY} r="42" />
          <text className="dso-orb-hub-t1" x={CX} y={CY - 2} textAnchor="middle">
            Ezana
          </text>
          <text className="dso-orb-hub-t2" x={CX} y={CY + 15} textAnchor="middle">
            SONAR
          </text>

          {/* vertices and labels */}
          {blips.map((b, i) => {
            const p = pts[i];
            const lab = labelAt(i, n);
            const isSel = b.id === selected;
            return (
              <g
                key={b.id}
                className={`dso-orb-dim${b.live ? ' is-live' : ' is-road'}${isSel ? ' is-selected' : ''}`}
                style={{ '--dso-i': i }}
              >
                {b.live ? <circle className="dso-orb-halo" cx={p.x} cy={p.y} r="16" /> : null}
                {isSel ? <circle className="dso-orb-sel" cx={p.x} cy={p.y} r="12" /> : null}
                <circle className="dso-orb-dot" cx={p.x} cy={p.y} r={b.live ? 6.5 : 5.5} />
                <text className="dso-orb-name" x={lab.x} y={lab.y} textAnchor={lab.anchor}>
                  {b.label}
                </text>
                <text
                  className={`dso-orb-sub${b.live ? '' : ' is-road'}`}
                  x={lab.x}
                  y={lab.y + 24}
                  textAnchor={lab.anchor}
                >
                  {b.live ? `${b.liveCount} LIVE · PINGING` : 'ROADMAP · SILENT'}
                </text>
              </g>
            );
          })}
        </svg>

        {/* the real controls, over each label (labels never move) */}
        {blips.map((b, i) => {
          const lab = labelAt(i, n);
          return (
            <button
              key={b.id}
              type="button"
              className={`dso-orb-btn is-${lab.anchor}`}
              style={{ left: `${r2((lab.x / W) * 100)}%`, top: `${r2(((lab.y + 6) / H) * 100)}%` }}
              aria-pressed={b.id === selected}
              aria-label={`${b.label}, ${b.live ? `${b.liveCount} live datasets` : 'on the roadmap'}, select`}
              onClick={() => select(b.id, 'radar')}
            />
          );
        })}
      </div>

      <ul className="dso-sr">
        {blips.map((b) => (
          <li key={b.id}>
            {b.label}: {stateText(b)}
            {b.id === selected ? ' (selected)' : ''}
          </li>
        ))}
        <li>
          {pinging} datasets pinging, {silent} silent until live.
        </li>
      </ul>
    </div>
  );
}
