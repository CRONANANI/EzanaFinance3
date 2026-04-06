'use client';

import { useState, useMemo, useRef } from 'react';

const W = 500;
const H = 120;
const W_CUSTOM = 480;
const H_CUSTOM = 80;
const POINTS = 40;

function generateDataPoints() {
  const pts = [];
  let y = H * 0.7;
  const step = W / POINTS;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  for (let i = 0; i <= POINTS; i++) {
    y += (Math.random() - 0.35) * (H * 0.06);
    y = Math.max(H * 0.2, Math.min(H * 0.85, y));
    if (i > POINTS * 0.7) y -= Math.random() * (H * 0.04);
    const val = 180000 + (1 - y / H) * 60000;
    pts.push({ x: i * step, y, val, month: months[Math.floor((i / POINTS) * 11)] });
  }
  return pts;
}

export function HeroSparkline({ portfolioValue, changePct, chartPath, axisLabels }) {
  const [hover, setHover] = useState(null);
  const [crosshairX, setCrosshairX] = useState(null);
  const svgRef = useRef(null);

  const data = useMemo(generateDataPoints, []);
  const pathD = data.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const areaD = `${pathD} L${W},${H} L0,${H} Z`;

  const handleMouseMove = (e) => {
    if (chartPath || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * W;
    const idx = Math.round((x / W) * POINTS);
    const pt = data[Math.min(idx, data.length - 1)];
    if (pt) {
      setHover(pt);
      setCrosshairX(pt.x);
    }
  };

  const handleMouseLeave = () => {
    setHover(null);
    setCrosshairX(null);
  };

  if (chartPath) {
    const areaPath = `${chartPath} L${W_CUSTOM},${H_CUSTOM} L0,${H_CUSTOM} Z`;
    const axis =
      Array.isArray(axisLabels) && axisLabels.length > 0
        ? axisLabels
        : ['Jan', 'Mar', 'May', 'Jul', 'Sep', 'Dec'];
    return (
      <div className="db-hero-chart" style={{ position: 'relative' }}>
        <svg viewBox={`0 0 ${W_CUSTOM} ${H_CUSTOM}`} preserveAspectRatio="none" className="db-sparkline-svg">
          <defs>
            <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={areaPath} fill="url(#chartGradient)" />
          <path d={chartPath} fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <div className="db-chart-axis">
          {axis.map((label, i) => (
            <span key={`${label}-${i}`}>{label}</span>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="db-hero-chart" style={{ position: 'relative' }} onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave}>
      <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="db-sparkline-svg">
        <defs>
          <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaD} fill="url(#sparkGrad)" />
        <path d={pathD} fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {crosshairX !== null && (
          <line x1={crosshairX} y1={0} x2={crosshairX} y2={H} stroke="rgba(16,185,129,0.5)" strokeWidth="1" strokeDasharray="4 2" />
        )}
        {hover && (
          <circle cx={hover.x} cy={hover.y} r="5" fill="#10b981" stroke="#0a0e13" strokeWidth="2" />
        )}
      </svg>
      {hover && (
        <div className="db-hero-tooltip" style={{
          position: 'absolute',
          left: `${(hover.x / W) * 100}%`,
          transform: 'translateX(-50%)',
          bottom: '100%',
          marginBottom: 8,
          padding: '6px 10px',
          background: 'rgba(10,14,19,0.95)',
          border: '1px solid rgba(16,185,129,0.3)',
          borderRadius: 8,
          fontSize: '0.75rem',
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
          zIndex: 10,
        }}>
          <div style={{ color: '#8b949e' }}>{hover.month}</div>
          <div style={{ color: '#10b981', fontWeight: 700 }}>${hover.val.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
        </div>
      )}
      <div className="db-chart-axis">
        <span>Jan</span><span>Mar</span><span>May</span><span>Jul</span><span>Sep</span><span>Dec</span>
      </div>
    </div>
  );
}
