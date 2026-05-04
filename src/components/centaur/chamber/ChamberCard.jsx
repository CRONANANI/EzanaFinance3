'use client';

import { useEffect, useState } from 'react';
import { ChamberScene } from './ChamberScene';
import { ADVISORS } from '@/lib/centaur-advisors';

const QUORUM_PRESENT = 8;
const QUORUM_TOTAL = 12;

/**
 * Cycles a random "speaking" advisor id for ambient chamber animation (~4.5s).
 */
export function useAmbientSpeaker(seedId) {
  const [speakingId, setSpeakingId] = useState(() => {
    if (seedId && ADVISORS.some((a) => a.id === seedId)) return seedId;
    return ADVISORS[0]?.id ?? null;
  });

  useEffect(() => {
    const tick = () => {
      const pick = ADVISORS[Math.floor(Math.random() * ADVISORS.length)];
      setSpeakingId(pick.id);
    };
    const t = setInterval(tick, 4500);
    return () => clearInterval(t);
  }, []);

  return speakingId;
}

export function ChamberCard({ onSelectAdvisor, selectedId, speakingId }) {
  return (
    <div className="cc-chamber-card er-card">
      <div className="cc-chamber-toolbar">
        <div className="cc-chamber-toolbar-left">
          <i className="bi bi-shield-lock" aria-hidden />
          <div>
            <h3 className="cc-chamber-title">Council Chamber</h3>
            <p className="cc-chamber-sub">Twelve advisors · Horseshoe quorum</p>
          </div>
        </div>
        <div className="cc-quorum" aria-label={`Quorum ${QUORUM_PRESENT} of ${QUORUM_TOTAL}`}>
          <span className="cc-quorum-label">
            QUORUM <strong>{QUORUM_PRESENT}/{QUORUM_TOTAL}</strong>
          </span>
          <div className="cc-quorum-dots">
            {Array.from({ length: QUORUM_TOTAL }).map((_, i) => (
              <span key={i} className={`cc-quorum-dot${i < QUORUM_PRESENT ? ' is-lit' : ''}`} />
            ))}
          </div>
        </div>
      </div>
      <div className="cc-chamber-scene-wrap">
        <ChamberScene onSelectAdvisor={onSelectAdvisor} speakingId={speakingId} selectedId={selectedId} />
      </div>
    </div>
  );
}
