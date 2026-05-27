'use client';

export function AmSpark({ values, positive = true, w = 88, h = 24, fill = true, dot = false }) {
  if (!values || values.length < 2) {
    return <svg width={w} height={h} aria-hidden />;
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const stepX = w / (values.length - 1);
  const pad = 1.5;
  const usableH = h - pad * 2;

  const points = values.map((v, i) => {
    const x = i * stepX;
    const y = pad + usableH - ((v - min) / range) * usableH;
    return [x, y];
  });

  const linePath = points
    .map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`)
    .join(' ');
  const areaPath = `${linePath} L ${w} ${h} L 0 ${h} Z`;
  const [endX, endY] = points[points.length - 1];

  const stroke = positive ? 'var(--positive)' : 'var(--negative)';
  const gradientId = `am2-spark-grad-${Math.abs(values[0]).toString(36).slice(0, 8)}-${values.length}-${positive ? 'u' : 'd'}`;

  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      style={{ display: 'block', overflow: 'visible' }}
      role="img"
      aria-label={`Sparkline: ${values[0].toFixed(2)} to ${values[values.length - 1].toFixed(2)}`}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.22" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      {fill && <path d={areaPath} fill={`url(#${gradientId})`} />}
      <path
        d={linePath}
        fill="none"
        stroke={stroke}
        strokeWidth="1.4"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {dot && <circle cx={endX} cy={endY} r="1.8" fill={stroke} />}
    </svg>
  );
}
