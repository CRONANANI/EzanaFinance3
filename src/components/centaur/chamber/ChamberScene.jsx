'use client';

import { NightExterior } from './NightExterior';
import { Chair } from './Chair';
import { CentaurSeal } from './CentaurSeal';
import { ADVISORS, buildSeats } from '@/lib/centaur-advisors';

export function ChamberScene({ width = 1600, height = 1000, onSelectAdvisor, speakingId, selectedId }) {
  const seats = buildSeats();
  const sorted = [...seats].sort((a, b) => a.z - b.z);

  return (
    <svg
      className="cc-chamber-svg"
      viewBox={`0 0 ${1600} ${1000}`}
      width="100%"
      height="100%"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label="Council chamber with twelve advisor seats"
    >
      <NightExterior width={1600} height={1000} />
      <ellipse cx={800} cy={920} rx={620} ry={90} fill="rgba(15,23,42,0.75)" stroke="rgba(212,175,55,0.18)" strokeWidth={2} />
      <path
        d="M 280 880 Q 800 760 1320 880"
        fill="none"
        stroke="rgba(212,175,55,0.22)"
        strokeWidth={4}
      />
      <CentaurSeal cx={800} cy={860} size={100} />
      <g className="cc-chairs-layer">
        {sorted.map((seat) => {
          const advisor = ADVISORS[seat.idx];
          if (!advisor) return null;
          return (
            <Chair
              key={advisor.id}
              advisor={advisor}
              seat={seat}
              onSelect={onSelectAdvisor}
              isSpeaking={speakingId === advisor.id}
              isSelected={selectedId === advisor.id}
            />
          );
        })}
      </g>
    </svg>
  );
}
