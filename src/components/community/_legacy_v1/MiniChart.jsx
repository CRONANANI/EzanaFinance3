'use client';

export function MiniChart({ direction = 'up', width = 280, height = 80, color }) {
  const c = color || (direction === 'up' ? 'var(--emerald)' : 'var(--negative)');
  const gradId = `grad-${direction}-${String(color || 'def').replace(/[^a-z0-9]/gi, '')}`;
  const points =
    direction === 'up'
      ? [
          [0, 60],
          [20, 55],
          [40, 58],
          [60, 48],
          [80, 42],
          [100, 38],
          [120, 40],
          [140, 32],
          [160, 28],
          [180, 22],
          [200, 24],
          [220, 18],
          [240, 14],
          [260, 10],
          [280, 6],
        ]
      : [
          [0, 12],
          [20, 18],
          [40, 16],
          [60, 22],
          [80, 28],
          [100, 26],
          [120, 32],
          [140, 38],
          [160, 34],
          [180, 42],
          [200, 48],
          [220, 46],
          [240, 52],
          [260, 58],
          [280, 62],
        ];
  const linePath = `M ${points.map((p) => p.join(',')).join(' L ')}`;
  const areaPath = `${linePath} L 280,${height} L 0,${height} Z`;
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 280 ${height}`}
      style={{ display: 'block', width: '100%' }}
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={c} stopOpacity="0.25" />
          <stop offset="100%" stopColor={c} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gradId})`} />
      <path
        d={linePath}
        stroke={c}
        strokeWidth="1.6"
        fill="none"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}
