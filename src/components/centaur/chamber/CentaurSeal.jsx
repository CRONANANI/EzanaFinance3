'use client';

export function CentaurSeal({ cx, cy, size }) {
  const r = size / 2;
  return (
    <g transform={`translate(${cx},${cy})`}>
      <g className="cc-centaur-seal">
        <circle cx={0} cy={0} r={r} fill="rgba(212,175,55,0.12)" stroke="rgba(212,175,55,0.45)" strokeWidth={2} />
        <circle cx={0} cy={0} r={r - 10} fill="none" stroke="rgba(212,175,55,0.25)" strokeWidth={1} strokeDasharray="4 6" />
        <text
          x={0}
          y={6}
          textAnchor="middle"
          fill="#D4AF37"
          fontSize={size * 0.22}
          fontWeight={800}
          fontFamily="system-ui, sans-serif"
          letterSpacing="0.15em"
        >
          CI
        </text>
      </g>
    </g>
  );
}
