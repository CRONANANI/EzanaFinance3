'use client';

/**
 * RiskReturnVisual — scatter plot of asset classes on risk/return axes.
 *
 * Props:
 *   assets: Array<{ label: string, risk: number, return: number, color?: string }>
 *     risk and return are expected as 0-10 scores
 */

const DEFAULT_COLORS = [
  '#10b981', '#3b82f6', '#a78bfa', '#fbbf24',
  '#f97316', '#ec4899', '#06b6d4', '#84cc16',
];

export default function RiskReturnVisual({ assets = [] }) {
  if (!assets.length) return null;

  const width = 520;
  const height = 300;
  const padding = { top: 24, right: 24, bottom: 48, left: 64 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const xScale = (risk) => padding.left + (risk / 10) * chartW;
  const yScale = (ret) => padding.top + chartH - (ret / 10) * chartH;

  // Grid lines every 2 units
  const gridLines = [2, 4, 6, 8];

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="course-visual-svg"
      role="img"
      aria-label="Risk vs return scatter plot for different asset classes"
    >
      {/* Grid */}
      {gridLines.map((g) => (
        <g key={g}>
          <line
            x1={xScale(g)}
            y1={padding.top}
            x2={xScale(g)}
            y2={padding.top + chartH}
            stroke="currentColor"
            strokeOpacity="0.08"
          />
          <line
            x1={padding.left}
            y1={yScale(g)}
            x2={padding.left + chartW}
            y2={yScale(g)}
            stroke="currentColor"
            strokeOpacity="0.08"
          />
        </g>
      ))}

      {/* Axes */}
      <line
        x1={padding.left}
        y1={padding.top}
        x2={padding.left}
        y2={padding.top + chartH}
        stroke="currentColor"
        strokeOpacity="0.35"
      />
      <line
        x1={padding.left}
        y1={padding.top + chartH}
        x2={padding.left + chartW}
        y2={padding.top + chartH}
        stroke="currentColor"
        strokeOpacity="0.35"
      />

      {/* Axis labels */}
      <text
        x={padding.left + chartW / 2}
        y={height - 14}
        textAnchor="middle"
        fontSize="12"
        fontWeight="600"
        fill="currentColor"
      >
        Risk →
      </text>
      <text
        x={18}
        y={padding.top + chartH / 2}
        textAnchor="middle"
        fontSize="12"
        fontWeight="600"
        fill="currentColor"
        transform={`rotate(-90 18 ${padding.top + chartH / 2})`}
      >
        Return →
      </text>

      {/* Low/High annotations on axes */}
      <text x={padding.left} y={padding.top + chartH + 18} fontSize="10" fill="currentColor" opacity="0.5">
        Low
      </text>
      <text x={padding.left + chartW - 18} y={padding.top + chartH + 18} fontSize="10" fill="currentColor" opacity="0.5">
        High
      </text>

      {/* Data points */}
      {assets.map((asset, i) => {
        const color = asset.color || DEFAULT_COLORS[i % DEFAULT_COLORS.length];
        const cx = xScale(asset.risk);
        const cy = yScale(asset.return);
        return (
          <g key={asset.label}>
            <circle cx={cx} cy={cy} r="10" fill={color} opacity="0.3">
              <animate
                attributeName="r"
                from="0"
                to="10"
                dur="0.6s"
                begin={`${i * 0.1}s`}
                fill="freeze"
              />
            </circle>
            <circle cx={cx} cy={cy} r="5" fill={color}>
              <animate
                attributeName="r"
                from="0"
                to="5"
                dur="0.6s"
                begin={`${i * 0.1}s`}
                fill="freeze"
              />
            </circle>
            <text
              x={cx + 14}
              y={cy + 4}
              fontSize="11"
              fontWeight="600"
              fill="currentColor"
            >
              {asset.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
