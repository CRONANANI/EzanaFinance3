'use client';

import { useEloTheme } from './EloThemeContext';

export function Sparkline({ data, w = 62, h = 14, color }) {
  const { delta: deltaTokens, brand } = useEloTheme();
  const lineColor = color ?? brand.base;
  if (!data || data.length < 2) {
    return <svg width={w} height={h} aria-hidden />;
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const stepX = w / (data.length - 1);

  const points = data
    .map((v, i) => {
      const x = i * stepX;
      const y = h - ((v - min) / range) * h;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(' L ');

  const path = `M ${points}`;
  const isDown = data[data.length - 1] < data[0];
  const strokeColor = isDown ? deltaTokens.neg : lineColor;

  const ariaLabel = `${data[0].toLocaleString()} to ${data[data.length - 1].toLocaleString()}`;

  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      role="img"
      aria-label={ariaLabel}
      style={{ display: 'block' }}
    >
      <path
        d={path}
        fill="none"
        stroke={strokeColor}
        strokeWidth={1.25}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
