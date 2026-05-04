'use client';

export function Chair({ advisor, seat, onSelect, isSpeaking, isSelected }) {
  const { x, y, scale, idx } = seat;
  const title = `${advisor.name} · ${advisor.animal} · ${advisor.edge}`;

  return (
    <g
      role="button"
      tabIndex={0}
      className={`cc-chair ${isSpeaking ? 'cc-chair--speaking' : ''} ${isSelected ? 'cc-chair--selected' : ''}`}
      transform={`translate(${x},${y}) scale(${scale})`}
      style={{ cursor: 'pointer' }}
      onClick={() => onSelect(advisor)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(advisor);
        }
      }}
    >
      <title>{title}</title>
      {isSpeaking && (
        <circle cx={0} cy={0} r={52} fill="none" stroke="rgba(16,185,129,0.55)" strokeWidth={3} className="cc-speaking-ring" />
      )}
      <ellipse cx={0} cy={8} rx={46} ry={22} fill="rgba(15,23,42,0.85)" stroke="rgba(212,175,55,0.35)" strokeWidth={2} />
      <circle cx={0} cy={-18} r={34} fill="rgba(30,41,59,0.95)" stroke="rgba(212,175,55,0.5)" strokeWidth={2} />
      <text x={0} y={-10} textAnchor="middle" fontSize={28} style={{ userSelect: 'none' }}>
        {advisor.glyph}
      </text>
      <text x={0} y={36} textAnchor="middle" fill="#94a3b8" fontSize={11} fontWeight={600} style={{ userSelect: 'none' }}>
        {idx + 1}
      </text>
    </g>
  );
}
