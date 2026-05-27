'use client';

export function LcEloSparkline({ data, width = 600, height = 120 }) {
  const safe = data && data.length >= 2 ? data : [0, 0];
  const min = Math.min(...safe);
  const max = Math.max(...safe);
  const range = max - min || 1;
  const stepX = width / (safe.length - 1);

  const points = safe.map((v, i) => {
    const x = i * stepX;
    const y = height - ((v - min) / range) * height * 0.85 - height * 0.075;
    return [x, y];
  });

  const linePath = points
    .map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`)
    .join(' ');
  const areaPath = `${linePath} L ${width} ${height} L 0 ${height} Z`;
  const [endX, endY] = points[points.length - 1];

  return (
    <svg
      width="100%"
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      role="img"
      aria-label={`ELO trend: ${safe[0]} to ${safe[safe.length - 1]}`}
    >
      <defs>
        <linearGradient id="lc-sparkline-area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--lc-accent)" stopOpacity="0.30" />
          <stop offset="100%" stopColor="var(--lc-accent)" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="lc-sparkline-line" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="var(--lc-accent-deep)" />
          <stop offset="100%" stopColor="var(--lc-accent)" />
        </linearGradient>
      </defs>

      {[0.25, 0.5, 0.75].map((y, i) => (
        <line
          key={i}
          x1="0"
          y1={height * y}
          x2={width}
          y2={height * y}
          stroke="var(--lc-line)"
          strokeWidth="1"
        />
      ))}

      <path d={areaPath} fill="url(#lc-sparkline-area)" />
      <path
        d={linePath}
        fill="none"
        stroke="url(#lc-sparkline-line)"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      <circle cx={endX} cy={endY} r="5" fill="var(--lc-accent)" opacity="0.25" />
      <circle cx={endX} cy={endY} r="3" fill="var(--lc-accent)" />
    </svg>
  );
}
