'use client';

/**
 * DiversificationVisual — donut chart showing portfolio allocation.
 *
 * Props:
 *   segments: Array<{ label: string, pct: number, color?: string }>
 *   centerLabel: string (text shown in the donut's hole, default "Portfolio")
 */

const DEFAULT_COLORS = [
  '#10b981', '#3b82f6', '#a78bfa', '#fbbf24',
  '#f97316', '#ec4899', '#06b6d4', '#84cc16',
];

export default function DiversificationVisual({
  segments = [],
  centerLabel = 'Portfolio',
}) {
  if (!segments.length) return null;

  const size = 280;
  const cx = 140;
  const cy = 140;
  const outerR = 100;
  const innerR = 62;

  let currentAngle = -Math.PI / 2;
  const total = segments.reduce((s, seg) => s + seg.pct, 0) || 100;

  const arcs = segments.map((seg, i) => {
    const angle = (seg.pct / total) * 2 * Math.PI;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angle;
    currentAngle = endAngle;

    const x1 = cx + outerR * Math.cos(startAngle);
    const y1 = cy + outerR * Math.sin(startAngle);
    const x2 = cx + outerR * Math.cos(endAngle);
    const y2 = cy + outerR * Math.sin(endAngle);
    const x3 = cx + innerR * Math.cos(endAngle);
    const y3 = cy + innerR * Math.sin(endAngle);
    const x4 = cx + innerR * Math.cos(startAngle);
    const y4 = cy + innerR * Math.sin(startAngle);
    const largeArc = angle > Math.PI ? 1 : 0;

    const d = [
      `M ${x1} ${y1}`,
      `A ${outerR} ${outerR} 0 ${largeArc} 1 ${x2} ${y2}`,
      `L ${x3} ${y3}`,
      `A ${innerR} ${innerR} 0 ${largeArc} 0 ${x4} ${y4}`,
      'Z',
    ].join(' ');

    const midAngle = (startAngle + endAngle) / 2;
    const labelR = (outerR + innerR) / 2;
    const labelX = cx + labelR * Math.cos(midAngle);
    const labelY = cy + labelR * Math.sin(midAngle);

    return {
      d,
      color: seg.color || DEFAULT_COLORS[i % DEFAULT_COLORS.length],
      label: seg.label,
      pct: seg.pct,
      labelX,
      labelY,
    };
  });

  return (
    <div className="course-visual-dual">
      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="course-visual-svg"
        role="img"
        aria-label="Portfolio diversification breakdown"
        style={{ maxWidth: '280px' }}
      >
        {arcs.map((arc, i) => (
          <g key={i}>
            <path d={arc.d} fill={arc.color}>
              <animate
                attributeName="opacity"
                from="0"
                to="1"
                dur="0.5s"
                begin={`${i * 0.08}s`}
                fill="freeze"
              />
            </path>
            {arc.pct >= 8 && (
              <text
                x={arc.labelX}
                y={arc.labelY}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="11"
                fontWeight="700"
                fill="#ffffff"
              >
                {arc.pct}%
              </text>
            )}
          </g>
        ))}
        <text
          x={cx}
          y={cy - 4}
          textAnchor="middle"
          fontSize="11"
          opacity="0.6"
          fill="currentColor"
        >
          {centerLabel}
        </text>
        <text
          x={cx}
          y={cy + 12}
          textAnchor="middle"
          fontSize="14"
          fontWeight="700"
          fill="currentColor"
        >
          100%
        </text>
      </svg>
      <ul className="course-visual-legend">
        {arcs.map((arc, i) => (
          <li key={i}>
            <span
              className="course-visual-legend-dot"
              style={{ background: arc.color }}
            />
            <span className="course-visual-legend-label">{arc.label}</span>
            <span className="course-visual-legend-pct">{arc.pct}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
