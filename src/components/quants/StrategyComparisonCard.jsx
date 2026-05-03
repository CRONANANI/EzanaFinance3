'use client';

import { useMemo, useState } from 'react';
import { COMPARISON_STRATEGIES } from '@/lib/for-the-quants-mock-data';

/** Deterministic pseudo-random walk for SSR-safe charts */
function generateEquityCurve(seed, n) {
  const pts = [];
  let v = 100;
  for (let i = 0; i < n; i++) {
    const jitter = Math.sin(i * 0.37 + seed * 0.13) * 0.65;
    v += Math.sin(i * 0.2 + seed) * 1.2 + 0.3 + jitter;
    v = Math.max(80, v);
    pts.push(v);
  }
  return pts;
}

function pointsToPath(pts, w, h) {
  const min = Math.min(...pts);
  const max = Math.max(...pts);
  const range = max - min || 1;
  return pts
    .map((p, i) => {
      const x = (i / (pts.length - 1)) * w;
      const y = 4 + (h - 8) * (1 - (p - min) / range);
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
}

export function StrategyComparisonCard() {
  const [selectedA, setSelectedA] = useState(COMPARISON_STRATEGIES[0].id);
  const [selectedB, setSelectedB] = useState(COMPARISON_STRATEGIES[1].id);

  const stratA = COMPARISON_STRATEGIES.find((s) => s.id === selectedA) || COMPARISON_STRATEGIES[0];
  const stratB = COMPARISON_STRATEGIES.find((s) => s.id === selectedB) || COMPARISON_STRATEGIES[1];

  const curveA = useMemo(() => generateEquityCurve(stratA.id.charCodeAt(4), 60), [stratA.id]);
  const curveB = useMemo(() => generateEquityCurve(stratB.id.charCodeAt(4) + 5, 60), [stratB.id]);

  const W = 400;
  const H = 120;

  const metrics = ['returnPct', 'sharpe', 'maxDd', 'winRate', 'trades', 'alpha'];
  const labels = {
    returnPct: 'Return',
    sharpe: 'Sharpe',
    maxDd: 'Max DD',
    winRate: 'Win Rate',
    trades: 'Trades',
    alpha: 'Alpha',
  };

  return (
    <div className="db-card">
      <div className="db-card-header">
        <h3 className="ftq-section-title">
          <i className="bi bi-arrow-left-right" aria-hidden />
          Strategy Comparison
        </h3>
      </div>
      <div className="ftq-card-body-pad ftq-card-body-pad--flush-top">
        <div className="ftq-cmp-selectors">
          <div className="ftq-cmp-sel">
            <span className="ftq-cmp-label" style={{ color: stratA.color }}>
              Strategy A
            </span>
            <select className="ftq-vb-select" value={selectedA} onChange={(e) => setSelectedA(e.target.value)}>
              {COMPARISON_STRATEGIES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <span className="ftq-cmp-vs">VS</span>
          <div className="ftq-cmp-sel">
            <span className="ftq-cmp-label" style={{ color: stratB.color }}>
              Strategy B
            </span>
            <select className="ftq-vb-select" value={selectedB} onChange={(e) => setSelectedB(e.target.value)}>
              {COMPARISON_STRATEGIES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="ftq-cmp-chart">
          <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: '100%', height: 120 }}>
            <path d={pointsToPath(curveA, W, H)} fill="none" stroke={stratA.color} strokeWidth="2" />
            <path
              d={pointsToPath(curveB, W, H)}
              fill="none"
              stroke={stratB.color}
              strokeWidth="2"
              strokeDasharray="4 3"
            />
          </svg>
          <div className="ftq-cmp-legend">
            <span style={{ color: stratA.color }}>━ {stratA.name}</span>
            <span style={{ color: stratB.color }}>╌ {stratB.name}</span>
          </div>
        </div>

        <div className="ftq-cmp-table">
          <div className="ftq-cmp-header-row">
            <span className="ftq-cmp-cell ftq-cmp-cell--label">Metric</span>
            <span className="ftq-cmp-cell" style={{ color: stratA.color }}>
              {stratA.name}
            </span>
            <span className="ftq-cmp-cell" style={{ color: stratB.color }}>
              {stratB.name}
            </span>
          </div>
          {metrics.map((m) => (
            <div key={m} className="ftq-cmp-row">
              <span className="ftq-cmp-cell ftq-cmp-cell--label">{labels[m]}</span>
              <span className="ftq-cmp-cell">{stratA[m]}</span>
              <span className="ftq-cmp-cell">{stratB[m]}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
