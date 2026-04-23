'use client';

import { useState, useMemo, useRef } from 'react';
import { buildAxisLabelRow, formatTooltipTimeLabel } from '@/lib/portfolio-value-series-synth';

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

/**
 * @param {number[]} values
 * @returns {[number, number]}
 */
function yDomainForValues(values) {
  if (values.length === 0) return [0, 1];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const pad = (max - min) * 0.08 || Math.abs(max) * 0.02 || 1;
  return [min - pad, max + pad];
}

/**
 * @param {{ at: string, value: number }[]} seriesPoints
 * @param {number} w
 * @param {number} h
 */
function pathFromSeries(seriesPoints, w, h) {
  if (seriesPoints.length === 0) {
    const midY = h * 0.5;
    return { pathD: `M0,${midY} L${w},${midY}`, areaD: `M0,${midY} L${w},${midY} L${w},${h} L0,${h} Z`, parts: [] };
  }
  if (seriesPoints.length === 1) {
    const values = [seriesPoints[0].value];
    const [yMin, yMax] = yDomainForValues(values);
    const span = yMax - yMin || 1;
    const v = seriesPoints[0].value;
    const yn = 1 - (v - yMin) / span;
    const yp = Math.min(h * 0.95, Math.max(h * 0.05, yn * h * 0.9 + h * 0.05));
    return {
      pathD: `M0,${yp.toFixed(1)} L${w},${yp.toFixed(1)}`,
      areaD: `M0,${yp.toFixed(1)} L${w},${yp.toFixed(1)} L${w},${h} L0,${h} Z`,
      parts: [
        { x: 0, y: yp, at: seriesPoints[0].at, val: seriesPoints[0].value },
        { x: w, y: yp, at: seriesPoints[0].at, val: seriesPoints[0].value },
      ],
    };
  }
  const values = seriesPoints.map((p) => p.value);
  const [yMin, yMax] = yDomainForValues(values);
  const span = yMax - yMin || 1;
  const n = seriesPoints.length;
  const parts = seriesPoints.map((p, i) => {
    const t = n > 1 ? i / (n - 1) : 0;
    const x = t * w;
    const v = p.value;
    const yn = 1 - (v - yMin) / span;
    const yp = Math.min(h * 0.95, Math.max(h * 0.05, yn * h * 0.9 + h * 0.05));
    return { x, y: yp, at: p.at, val: p.value };
  });
  const pathD = parts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const areaD = `${pathD} L${w},${h} L0,${h} Z`;
  return { pathD, areaD, parts };
}

/**
 * @param {object} p
 * @param {string} [p.range]
 */
export function HeroSparkline({
  portfolioValue: _pv,
  changePct: _cp,
  chartPath,
  axisLabels,
  seriesPoints,
  range,
  isLoading,
  loadError,
}) {
  const isDashboardMode = Array.isArray(seriesPoints) && range;

  const [hover, setHover] = useState(
    /** @type {null | { x: number, y: number, at: string, val: number, month?: string }} */ (null),
  );
  const [crosshairX, setCrosshairX] = useState(/** @type {number | null} */ (null));
  const demoSvgRef = useRef(/** @type {SVGSVGElement | null} */ (null));
  const seriesSvgRef = useRef(/** @type {SVGSVGElement | null} */ (null));

  const data = useMemo(generateDataPoints, []);
  const pathD = data.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const areaD = `${pathD} L${W},${H} L0,${H} Z`;

  const seriesPath = useMemo(() => {
    if (!isDashboardMode || !seriesPoints.length) return null;
    return pathFromSeries(seriesPoints, W_CUSTOM, H_CUSTOM);
  }, [isDashboardMode, seriesPoints]);

  const lineColor = useMemo(() => {
    if (!seriesPath?.parts?.length || !seriesPoints?.length) return '#10b981';
    if (seriesPoints.length < 2) return '#10b981';
    const a = seriesPoints[0].value;
    const b = seriesPoints[seriesPoints.length - 1].value;
    if (b >= a) return '#10b981';
    return '#ef4444';
  }, [seriesPath, seriesPoints]);

  const axisRow = useMemo(() => {
    if (isDashboardMode && range && seriesPoints.length) {
      return buildAxisLabelRow(seriesPoints, range);
    }
    return null;
  }, [isDashboardMode, range, seriesPoints]);

  const handleMouseMoveSeries = (e) => {
    if (!seriesSvgRef.current || !seriesPath?.parts?.length) return;
    const rect = seriesSvgRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * W_CUSTOM;
    const n = seriesPath.parts.length;
    const idx = Math.max(0, Math.min(n - 1, Math.round((x / W_CUSTOM) * (n - 1))));
    if (!seriesPoints[idx]) return;
    const pt = seriesPath.parts[idx];
    setHover({ x: pt.x, y: pt.y, at: seriesPoints[idx].at, val: seriesPoints[idx].value });
    setCrosshairX(pt.x);
  };

  const handleMouseMoveDemo = (e) => {
    if (chartPath || !demoSvgRef.current) return;
    const rect = demoSvgRef.current.getBoundingClientRect();
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

  if (isDashboardMode) {
    if (loadError) {
      return (
        <div
          className="db-hero-chart"
          style={{ position: 'relative', minHeight: H_CUSTOM, display: 'flex', alignItems: 'center' }}
        >
          <p style={{ fontSize: '0.7rem', color: 'var(--chart-muted, #8b949e)', margin: 0, width: '100%', textAlign: 'center' }}>
            Couldn&apos;t load the chart.
          </p>
        </div>
      );
    }
    if (seriesPoints.length === 0) {
      if (isLoading) {
        return (
          <div className="db-hero-chart" style={{ position: 'relative' }}>
            <div
              style={{
                height: H_CUSTOM,
                borderRadius: 6,
                background: 'rgba(107,114,128,0.12)',
                animation: 'pulse 1.5s ease-in-out infinite',
              }}
            />
            <div className="db-chart-axis" style={{ opacity: 0.4 }} />
          </div>
        );
      }
      return (
        <div
          className="db-hero-chart"
          style={{ position: 'relative', minHeight: H_CUSTOM, display: 'flex', alignItems: 'center' }}
        >
          <p style={{ fontSize: '0.7rem', color: 'var(--chart-muted, #8b949e)', margin: 0, width: '100%', textAlign: 'center' }}>
            Not enough history for {range}
          </p>
        </div>
      );
    }

    return (
      <div
        className="db-hero-chart"
        style={{ position: 'relative' }}
        onMouseMove={handleMouseMoveSeries}
        onMouseLeave={handleMouseLeave}
        role="img"
        aria-label={`Portfolio value, ${range}`}
      >
        {isLoading && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: 6,
              background: 'rgba(107,114,128,0.08)',
              pointerEvents: 'none',
              zIndex: 0,
            }}
            aria-hidden
          />
        )}
        <svg
          ref={seriesSvgRef}
          viewBox={`0 0 ${W_CUSTOM} ${H_CUSTOM}`}
          preserveAspectRatio="none"
          className="db-sparkline-svg"
          style={{ position: 'relative', zIndex: 1 }}
        >
          <defs>
            <linearGradient id="chartGradSeries" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={lineColor} stopOpacity="0.3" />
              <stop offset="100%" stopColor={lineColor} stopOpacity="0" />
            </linearGradient>
          </defs>
          {seriesPath && (
            <>
              <path d={seriesPath.areaD} fill="url(#chartGradSeries)" />
              <path
                d={seriesPath.pathD}
                fill="none"
                stroke={lineColor}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </>
          )}
          {crosshairX !== null && (
            <line
              x1={crosshairX}
              y1={0}
              x2={crosshairX}
              y2={H_CUSTOM}
              stroke="rgba(255,255,255,0.25)"
              strokeWidth="1"
              strokeDasharray="4 2"
            />
          )}
          {hover && typeof hover.at === 'string' && (
            <circle
              cx={hover.x}
              cy={hover.y}
              r={4.5}
              fill={lineColor}
              stroke="#0a0e13"
              strokeWidth="2"
            />
          )}
        </svg>
        {hover && typeof hover.at === 'string' && range && (
          <div
            className="db-hero-tooltip"
            style={{
              position: 'absolute',
              left: `${(hover.x / W_CUSTOM) * 100}%`,
              transform: 'translateX(-50%)',
              bottom: '100%',
              marginBottom: 8,
              padding: '6px 10px',
              background: 'rgba(10,14,19,0.95)',
              border: `1px solid ${lineColor}55`,
              borderRadius: 8,
              fontSize: '0.75rem',
              whiteSpace: 'nowrap',
              pointerEvents: 'none',
              zIndex: 10,
            }}
          >
            <div style={{ color: '#8b949e' }}>{formatTooltipTimeLabel(hover.at, range)}</div>
            <div style={{ color: lineColor, fontWeight: 700 }}>
              ${hover.val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
        )}
        {axisRow && (
          <div className="db-chart-axis" style={{ position: 'relative', zIndex: 1 }}>
            {axisRow.map((label, i) => (
              <span key={`${label}-${i}`}>{label}</span>
            ))}
          </div>
        )}
      </div>
    );
  }

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
    <div
      className="db-hero-chart"
      style={{ position: 'relative' }}
      onMouseMove={handleMouseMoveDemo}
      onMouseLeave={handleMouseLeave}
    >
      <svg ref={demoSvgRef} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="db-sparkline-svg">
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
        {hover && 'month' in hover && (
          <circle cx={hover.x} cy={hover.y} r={5} fill="#10b981" stroke="#0a0e13" strokeWidth="2" />
        )}
      </svg>
      {hover && 'month' in hover && (
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
        }}
        >
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
