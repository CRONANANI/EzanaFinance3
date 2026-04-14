'use client';

/**
 * CompoundGrowthVisual — shows $principal growing at annualRate% over years.
 */

export default function CompoundGrowthVisual({
  principal = 1000,
  rate = 0.07,
  years = 30,
  milestones = [0, 5, 10, 20, 30],
}) {
  const points = milestones
    .filter((y) => y <= years)
    .map((y) => ({
      year: y,
      value: principal * Math.pow(1 + rate, y),
    }));

  const maxValue = points[points.length - 1].value;
  const width = 560;
  const height = 220;
  const padding = { top: 20, right: 90, bottom: 36, left: 56 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;
  const barGap = 12;
  const barW = (chartW - barGap * (points.length - 1)) / points.length;

  const fmtUSD = (n) =>
    `$${n.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="course-visual-svg"
      role="img"
      aria-label={`Compound growth of ${fmtUSD(principal)} at ${(rate * 100).toFixed(1)}% over ${years} years`}
    >
      <defs>
        <linearGradient id="cgrow-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#34d399" />
          <stop offset="100%" stopColor="#10b981" />
        </linearGradient>
      </defs>

      <line
        x1={padding.left}
        y1={padding.top}
        x2={padding.left}
        y2={padding.top + chartH}
        stroke="currentColor"
        strokeOpacity="0.2"
      />
      <line
        x1={padding.left}
        y1={padding.top + chartH}
        x2={padding.left + chartW}
        y2={padding.top + chartH}
        stroke="currentColor"
        strokeOpacity="0.2"
      />

      {points.map((p, i) => {
        const barH = (p.value / maxValue) * chartH;
        const x = padding.left + i * (barW + barGap);
        const y = padding.top + chartH - barH;
        return (
          <g key={p.year}>
            <rect
              x={x}
              y={y}
              width={barW}
              height={barH}
              fill="url(#cgrow-grad)"
              rx="3"
            >
              <animate
                attributeName="height"
                from="0"
                to={barH}
                dur="0.8s"
                begin="0.1s"
                fill="freeze"
              />
              <animate
                attributeName="y"
                from={padding.top + chartH}
                to={y}
                dur="0.8s"
                begin="0.1s"
                fill="freeze"
              />
            </rect>
            <text
              x={x + barW / 2}
              y={y - 6}
              textAnchor="middle"
              fontSize="11"
              fontWeight="600"
              fill="currentColor"
            >
              {fmtUSD(p.value)}
            </text>
            <text
              x={x + barW / 2}
              y={padding.top + chartH + 20}
              textAnchor="middle"
              fontSize="11"
              fill="currentColor"
              opacity="0.7"
            >
              Year {p.year}
            </text>
          </g>
        );
      })}

      <g transform={`translate(${padding.left + chartW + 12}, ${padding.top + 10})`}>
        <text fontSize="10" fill="currentColor" opacity="0.6">
          Annual return
        </text>
        <text fontSize="18" fontWeight="700" fill="#10b981" y="16">
          {(rate * 100).toFixed(1)}%
        </text>
        <text fontSize="9" fill="currentColor" opacity="0.5" y="32">
          Starting
        </text>
        <text fontSize="11" fontWeight="600" fill="currentColor" y="46">
          {fmtUSD(principal)}
        </text>
      </g>
    </svg>
  );
}
