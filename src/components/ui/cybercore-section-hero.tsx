'use client';

import React, { useState, useEffect, CSSProperties } from 'react';

export interface AuroraBackgroundProps {
  /** Number of animated light beams */
  beamCount?: number;
  className?: string;
}

const DEFAULT_BEAM_COUNT = 60;

export const AuroraBackground: React.FC<AuroraBackgroundProps> = ({
  beamCount = DEFAULT_BEAM_COUNT,
  className = '',
}) => {
  const [beams, setBeams] = useState<
    Array<{ id: number; type: 'primary' | 'secondary'; style: CSSProperties }>
  >([]);

  useEffect(() => {
    const generated = Array.from({ length: beamCount }).map((_, i) => {
      const riseDur = Math.random() * 2 + 4; // 4–6s rise
      const fadeDur = riseDur; // sync fade
      const type = Math.random() < 0.18 ? 'secondary' : 'primary';

      return {
        id: i,
        type,
        style: {
          left: `${Math.random() * 100}%`,
          width: `${Math.floor(Math.random() * 3) + 1}px`,
          animationDelay: `${Math.random() * 5}s`,
          animationDuration: `${riseDur}s, ${fadeDur}s`,
        },
      };
    });
    setBeams(generated);
  }, [beamCount]);

  return (
    <div
      className={`aurora-scene ${className}`.trim()}
      role="img"
      aria-label="Animated aurora background"
    >
      <div className="aurora-floor" aria-hidden />
      <div className="aurora-main-column" aria-hidden />
      <div className="aurora-light-stream">
        {beams.map((beam) => (
          <div
            key={beam.id}
            className={`aurora-light-beam aurora-light-beam--${beam.type}`}
            style={beam.style}
          />
        ))}
      </div>
    </div>
  );
};

export default AuroraBackground;
