'use client';

/**
 * TimelineVisual — horizontal timeline with labeled events.
 *
 * Props:
 *   events: Array<{ year: number | string, label: string, description?: string }>
 */

export default function TimelineVisual({ events = [] }) {
  if (!events.length) return null;

  const width = 600;
  const height = 180;
  const padding = { top: 50, bottom: 50, left: 40, right: 40 };
  const lineY = height / 2;
  const trackW = width - padding.left - padding.right;
  const stepX = trackW / Math.max(events.length - 1, 1);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="course-visual-svg"
      role="img"
      aria-label="Timeline of events"
    >
      {/* Track line */}
      <line
        x1={padding.left}
        y1={lineY}
        x2={width - padding.right}
        y2={lineY}
        stroke="#10b981"
        strokeWidth="3"
        strokeLinecap="round"
      />

      {events.map((evt, i) => {
        const x = padding.left + i * stepX;
        const isTop = i % 2 === 0;
        return (
          <g key={i}>
            {/* Dot */}
            <circle cx={x} cy={lineY} r="8" fill="#10b981">
              <animate
                attributeName="r"
                from="0"
                to="8"
                dur="0.4s"
                begin={`${i * 0.15}s`}
                fill="freeze"
              />
            </circle>
            <circle cx={x} cy={lineY} r="4" fill="#ffffff" />

            {/* Connector line */}
            <line
              x1={x}
              y1={isTop ? lineY - 8 : lineY + 8}
              x2={x}
              y2={isTop ? lineY - 28 : lineY + 28}
              stroke="currentColor"
              strokeOpacity="0.3"
              strokeDasharray="2 2"
            />

            {/* Year label */}
            <text
              x={x}
              y={isTop ? lineY - 34 : lineY + 44}
              textAnchor="middle"
              fontSize="13"
              fontWeight="700"
              fill="#10b981"
            >
              {evt.year}
            </text>
            {/* Event label */}
            <text
              x={x}
              y={isTop ? lineY - 20 : lineY + 58}
              textAnchor="middle"
              fontSize="10"
              fill="currentColor"
              opacity="0.75"
            >
              {evt.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
