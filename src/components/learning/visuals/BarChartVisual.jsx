'use client';

/**
 * BarChartVisual — generic horizontal bar chart for comparisons.
 *
 * Props:
 *   bars: Array<{ label: string, value: number, color?: string, suffix?: string }>
 *   unit: string (optional suffix appended to numeric values, e.g. '%', 'x')
 */

const DEFAULT_COLORS = [
  '#10b981', '#3b82f6', '#a78bfa', '#fbbf24',
  '#f97316', '#ec4899', '#06b6d4', '#84cc16',
];

export default function BarChartVisual({ bars = [], unit = '' }) {
  if (!bars.length) return null;

  const maxValue = Math.max(...bars.map((b) => Math.abs(b.value)));
  const width = 560;
  const rowH = 40;
  const labelW = 160;
  const valueW = 70;
  const barAreaW = width - labelW - valueW - 16;
  const height = bars.length * rowH + 20;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="course-visual-svg"
      role="img"
      aria-label="Comparison bar chart"
    >
      {bars.map((bar, i) => {
        const barW = (Math.abs(bar.value) / maxValue) * barAreaW;
        const y = 10 + i * rowH;
        const color = bar.color || DEFAULT_COLORS[i % DEFAULT_COLORS.length];
        const displayValue =
          bar.suffix != null
            ? `${bar.value}${bar.suffix}`
            : unit === '%'
              ? `${bar.value}${unit}`
              : unit === '$'
                ? `$${bar.value.toLocaleString('en-US')}`
                : `${bar.value}${unit}`;
        return (
          <g key={i}>
            <text
              x={labelW - 8}
              y={y + rowH / 2 + 4}
              textAnchor="end"
              fontSize="12"
              fontWeight="600"
              fill="currentColor"
            >
              {bar.label}
            </text>
            <rect
              x={labelW}
              y={y + 8}
              width={barW}
              height={rowH - 16}
              rx="4"
              fill={color}
            >
              <animate
                attributeName="width"
                from="0"
                to={barW}
                dur="0.7s"
                begin={`${i * 0.08}s`}
                fill="freeze"
              />
            </rect>
            <text
              x={labelW + barW + 8}
              y={y + rowH / 2 + 4}
              fontSize="12"
              fontWeight="700"
              fill="currentColor"
            >
              {displayValue}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
