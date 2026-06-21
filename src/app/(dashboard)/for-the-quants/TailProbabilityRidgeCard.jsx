'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { buildTailRidge } from '@/lib/quants/backtest-simulation-mapper';

export default function TailProbabilityRidgeCard({ seed = 13 }) {
  const data = useMemo(() => buildTailRidge({ seed }), [seed]);
  const [reveal, setReveal] = useState(0); // 0..1 left-to-right reveal
  const [phase, setPhase] = useState(0); // continuous breathing clock
  const rafRef = useRef(null);

  useEffect(() => {
    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      setReveal(1);
      return;
    }
    let start = null;
    const tick = (ts) => {
      if (start === null) start = ts;
      const elapsed = ts - start;
      setReveal(Math.min(1, elapsed / 1400));
      setPhase(elapsed / 1000);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [seed]);

  const W = 560;
  const H = 300;
  const laneGap = 9;
  const amp = 70;

  // tail mass = integral of the curve beyond +1.5 sigma (rough), computed not hardcoded
  const tailStats = useMemo(() => {
    let tail = 0,
      total = 0;
    data.lanes.forEach((l) =>
      l.curve.forEach((pt) => {
        total += pt.y;
        if (pt.x > 0.72) tail += pt.y;
      }),
    );
    return { tailMass: tail, impliedTailPct: (tail / total) * 100, tailBins: data.lanes.length };
  }, [data]);

  const highlightLane = Math.floor(data.lanes.length * 0.62);

  return (
    <div className="ezana-card ftq-sim-card">
      <div className="ezana-card-header">
        <div>
          <div className="ezana-card-title">Tail Probability Ridge</div>
          <div className="ezana-card-subtitle">Strike Landscape</div>
        </div>
        <span className="ezana-pill ftq-sim-live">
          <span className="ftq-sim-dot" aria-hidden="true" /> LIVE
        </span>
      </div>

      <div className="ftq-sim-lattice-body">
        <div className="ftq-sim-rail">
          <Stat label="Tail Mass" value={tailStats.tailMass.toFixed(1)} />
          <Stat label="Tail Bins" value={String(tailStats.tailBins)} />
          <Stat label="Implied Tail" value={`${tailStats.impliedTailPct.toFixed(2)}%`} positive />
        </div>

        <svg
          className="ftq-sim-svg"
          viewBox={`0 0 ${W} ${H}`}
          role="img"
          aria-label="Tail probability ridgeline of backtested return distributions"
        >
          {data.lanes.map((lane, li) => {
            const baseY = 70 + li * laneGap;
            const phaseOffset = li * 0.4;
            const breath = 1 + 0.04 * Math.sin(phase + phaseOffset);
            const revealX = reveal * W;

            const pts = lane.curve.map((pt) => {
              const x = 16 + pt.x * (W - 32);
              const y = baseY - pt.y * amp * breath;
              return { x, y, shown: x <= revealX };
            });

            const shownPts = pts.filter((p) => p.shown);
            if (shownPts.length < 2) return null;

            const d =
              `M ${shownPts[0].x} ${baseY} ` +
              shownPts.map((p) => `L ${p.x} ${p.y}`).join(' ') +
              ` L ${shownPts[shownPts.length - 1].x} ${baseY} Z`;

            const isHi = li === highlightLane;
            return (
              <path
                key={li}
                d={d}
                fill={isHi ? 'var(--warning-bg)' : 'var(--emerald-bg-subtle)'}
                stroke={isHi ? 'var(--amber)' : 'var(--emerald-border)'}
                strokeWidth={isHi ? 1.4 : 0.8}
                opacity={isHi ? 0.95 : 0.7}
              />
            );
          })}
        </svg>
      </div>
    </div>
  );
}

function Stat({ label, value, positive }) {
  return (
    <div className="ftq-sim-stat">
      <div className="ftq-sim-stat-label">{label}</div>
      <div className={`ftq-sim-stat-value${positive ? ' is-pos' : ''}`}>{value}</div>
    </div>
  );
}
