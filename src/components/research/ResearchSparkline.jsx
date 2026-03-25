'use client';

import { useMemo } from 'react';

function generatePoints(seed, n, min, max) {
  const pts = [];
  let v = min + (max - min) * 0.35;
  for (let i = 0; i < n; i++) {
    v += Math.sin(i * 0.32 + seed) * ((max - min) * 0.04) + (max - min) * 0.002;
    v += (Math.random() - 0.45) * ((max - min) * 0.02);
    v = Math.max(min, Math.min(max, v));
    pts.push(v);
  }
  return pts;
}

function toPath(pts, w, h) {
  const min = Math.min(...pts);
  const max = Math.max(...pts);
  const range = max - min || 1;
  const pad = 6;
  return pts
    .map((p, i) => {
      const x = (i / (pts.length - 1)) * w;
      const y = pad + (h - 2 * pad) * (1 - (p - min) / range);
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
}

export function ResearchSparkline({ seed = 1, color = '#10b981', height = 120, className = '' }) {
  const w = 320;
  const h = 100;
  const pts = useMemo(() => generatePoints(seed, 48, 40, 100), [seed]);
  const line = toPath(pts, w, h);
  return (
    <div className={className} style={{ height, width: '100%' }}>
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ width: '100%', height: '100%', display: 'block' }}>
        <path d={line} fill="none" stroke={color} strokeWidth="2" />
      </svg>
    </div>
  );
}
