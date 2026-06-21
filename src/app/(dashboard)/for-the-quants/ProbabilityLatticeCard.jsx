'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { buildProbabilityLattice } from '@/lib/quants/backtest-simulation-mapper';

const REPLAY_MS = 6000;
const LOOP_PAUSE_MS = 3000;

export default function ProbabilityLatticeCard({ seed = 7 }) {
  const data = useMemo(() => buildProbabilityLattice({ seed }), [seed]);
  const [progress, setProgress] = useState(0); // 0..1 replay clock
  const rafRef = useRef(null);
  const reduceMotion = useRef(false);

  useEffect(() => {
    reduceMotion.current =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reduceMotion.current) {
      setProgress(1);
      return;
    }

    let start = null;
    const tick = (ts) => {
      if (start === null) start = ts;
      const elapsed = ts - start;
      const cycle = REPLAY_MS + LOOP_PAUSE_MS;
      const p = Math.min(1, (elapsed % cycle) / REPLAY_MS);
      setProgress(p);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [seed]);

  const W = 560;
  const H = 300;
  const HIST_H = 70;
  const fieldH = H - HIST_H - 16;

  const visibleCount = Math.floor(progress * data.points.length);
  const landedBins = useMemo(() => {
    const bins = {};
    data.points.slice(0, visibleCount).forEach((p) => {
      const idx = data.histogram.findIndex(
        (h, i) =>
          p.pnl >= h.x0 && (i === data.histogram.length - 1 || p.pnl < data.histogram[i + 1].x0),
      );
      if (idx >= 0) bins[idx] = (bins[idx] || 0) + 1;
    });
    return bins;
  }, [visibleCount, data]);

  const maxHist = Math.max(...data.histogram.map((h) => h.count), 1);

  return (
    <div className="ezana-card ftq-sim-card">
      <div className="ezana-card-header">
        <div>
          <div className="ezana-card-title">Probability Lattice</div>
          <div className="ezana-card-subtitle">
            {data.stats.totalTrades.toLocaleString()} Trades · One Board
          </div>
        </div>
        <span className="ezana-pill ftq-sim-live">
          <span className="ftq-sim-dot" aria-hidden="true" /> LIVE
        </span>
      </div>

      <div className="ftq-sim-lattice-body">
        <div className="ftq-sim-rail">
          <Stat label="Win Rate" value={`${(data.stats.winRate * 100).toFixed(1)}%`} positive />
          <Stat label="Sample" value={data.stats.sampleN.toLocaleString()} />
          <Stat
            label="All-Time"
            value={`${data.stats.allTimePnl >= 0 ? '+' : ''}${data.stats.allTimePnl.toFixed(2)}`}
            positive={data.stats.allTimePnl >= 0}
            negative={data.stats.allTimePnl < 0}
          />
          <Stat label="Shown" value={visibleCount.toLocaleString()} />
        </div>

        <svg
          className="ftq-sim-svg"
          viewBox={`0 0 ${W} ${H}`}
          role="img"
          aria-label="Probability lattice scatter of backtested trade outcomes"
        >
          {/* baseline */}
          <line
            x1="0"
            y1={fieldH / 2}
            x2={W}
            y2={fieldH / 2}
            stroke="var(--border-secondary)"
            strokeWidth="1"
            strokeDasharray="3 4"
          />
          {/* scatter points */}
          {data.points.slice(0, visibleCount).map((p) => {
            const cx = 16 + p.seq * (W - 32);
            const cy = fieldH / 2 - p.pnl * (fieldH * 7);
            const age = (visibleCount - p.id) / 60;
            const op = Math.max(0.18, Math.min(0.9, 0.9 - age * 0.4));
            return (
              <circle
                key={p.id}
                cx={cx}
                cy={Math.max(4, Math.min(fieldH - 4, cy))}
                r={p.win ? 2.6 : 2.2}
                fill={p.win ? 'var(--emerald)' : 'var(--negative)'}
                opacity={op}
              />
            );
          })}

          {/* histogram */}
          {data.histogram.map((h, i) => {
            const bw = (W - 32) / data.histogram.length;
            const landed = landedBins[i] || 0;
            const ratio = landed / maxHist;
            const bh = ratio * HIST_H;
            return (
              <rect
                key={i}
                x={16 + i * bw + 1}
                y={H - bh}
                width={bw - 2}
                height={bh}
                rx="1"
                fill={h.positive ? 'var(--emerald)' : 'var(--negative)'}
                opacity="0.55"
              />
            );
          })}
        </svg>
      </div>
    </div>
  );
}

function Stat({ label, value, positive, negative }) {
  return (
    <div className="ftq-sim-stat">
      <div className="ftq-sim-stat-label">{label}</div>
      <div className={`ftq-sim-stat-value${positive ? ' is-pos' : ''}${negative ? ' is-neg' : ''}`}>
        {value}
      </div>
    </div>
  );
}
