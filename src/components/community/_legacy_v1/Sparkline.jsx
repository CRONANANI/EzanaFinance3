'use client';

export function Sparkline({ direction = 'up', width = 80, height = 24, color }) {
  const c = color || (direction === 'up' ? 'var(--emerald)' : 'var(--negative)');
  const flat = direction === 'flat';
  const up = direction === 'up';
  const path = up
    ? '0,18 8,16 16,17 24,14 32,12 40,13 48,9 56,10 64,6 72,4 80,2'
    : flat
      ? '0,12 8,11 16,13 24,12 32,11 40,12 48,11 56,12 64,11 72,12 80,11'
      : '0,4 8,6 16,5 24,8 32,10 40,9 48,13 56,12 64,16 72,18 80,20';
  return (
    <svg width={width} height={height} viewBox="0 0 80 24" style={{ display: 'block' }}>
      <polyline
        points={path}
        fill="none"
        stroke={c}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}
