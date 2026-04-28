'use client';

import { useEffect, useRef, useState } from 'react';
import Lightning from './Lightning';

/**
 * Periodic lightning using React Bits' Lightning shader.
 * Strike: every `intervalMs`, ~400ms window with Lightning mounted; drives
 * `--lightning-flash` on `.hero-cybercore-root` for globe opacity.
 */
export default function HeroLightning({ intervalMs = 3000 }) {
  const containerRef = useRef(null);
  const [strikeActive, setStrikeActive] = useState(false);
  const [strikeKey, setStrikeKey] = useState(0);
  const flashTimeoutsRef = useRef([]);

  useEffect(() => {
    const clearFlashTimeouts = () => {
      flashTimeoutsRef.current.forEach(clearTimeout);
      flashTimeoutsRef.current = [];
    };

    const triggerStrike = () => {
      clearFlashTimeouts();
      setStrikeActive(true);
      setStrikeKey((k) => k + 1);
      const root = containerRef.current?.closest('.hero-cybercore-root');
      const t1 = setTimeout(() => {
        if (root) root.style.setProperty('--lightning-flash', '1');
      }, 80);
      const t2 = setTimeout(() => {
        if (root) root.style.setProperty('--lightning-flash', '0.4');
      }, 240);
      const t3 = setTimeout(() => {
        if (root) root.style.setProperty('--lightning-flash', '0');
        setStrikeActive(false);
      }, 400);
      flashTimeoutsRef.current.push(t1, t2, t3);
    };

    const mountedTimer = setTimeout(triggerStrike, 800);
    const interval = setInterval(triggerStrike, intervalMs);

    return () => {
      clearTimeout(mountedTimer);
      clearInterval(interval);
      clearFlashTimeouts();
      const root = containerRef.current?.closest('.hero-cybercore-root');
      if (root) root.style.setProperty('--lightning-flash', '0');
    };
  }, [intervalMs]);

  return (
    <div ref={containerRef} className="hero-lightning-strike" aria-hidden="true">
      {strikeActive && (
        <div key={strikeKey} className="hero-lightning-canvas">
          <Lightning
            hue={150}
            xOffset={-0.3}
            speed={0.8}
            intensity={1.2}
            size={0.7}
          />
        </div>
      )}
    </div>
  );
}
