'use client';

import React, { useState, useEffect, CSSProperties } from 'react';

export interface CybercoreBackgroundProps {
  /** Number of animated light beams */
  beamCount?: number;
  className?: string;
}

const DEFAULT_BEAM_COUNT = 56;

export const CybercoreBackground: React.FC<CybercoreBackgroundProps> = ({
  beamCount = DEFAULT_BEAM_COUNT,
  className = '',
}) => {
  const [beams, setBeams] = useState<
    Array<{ id: number; type: 'primary' | 'secondary'; style: CSSProperties }>
  >([]);

  useEffect(() => {
    const generated = Array.from({ length: beamCount }).map((_, i) => {
      const riseDur = Math.random() * 3 + 5;
      const fadeDur = riseDur;
      const type = Math.random() < 0.18 ? 'secondary' : 'primary';
      return {
        id: i,
        type,
        style: {
          left: `${Math.random() * 100}%`,
          width: `${Math.floor(Math.random() * 2) + 1}px`,
          animationDelay: `${Math.random() * 6}s`,
          animationDuration: `${riseDur}s, ${fadeDur}s`,
        },
      };
    });
    setBeams(generated);
  }, [beamCount]);

  return (
    <div
      className={`cybercore-scene ${className}`.trim()}
      role="img"
      aria-label="Animated grid background"
    >
      <div className="cybercore-floor" aria-hidden />
      <div className="cybercore-main-column" aria-hidden />
      <div className="cybercore-light-stream">
        {beams.map((beam) => (
          <div
            key={beam.id}
            className={`cybercore-light-beam cybercore-light-beam--${beam.type}`}
            style={beam.style}
          />
        ))}
      </div>
    </div>
  );
};

export default CybercoreBackground;
