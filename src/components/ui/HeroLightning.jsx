'use client';

import { useEffect, useRef, useState } from 'react';
import Lightning from './Lightning';

/**
 * Periodic lightning. Each strike randomizes position, hue, intensity,
 * size, speed, and canvas rotation. Mounts shader only during ~400ms window.
 */

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

function nextStrikeParams() {
  return {
    xOffset: randomBetween(-0.6, 0.6),
    hue: randomBetween(140, 170),
    intensity: randomBetween(1.0, 1.6),
    size: randomBetween(0.6, 0.9),
    rotation: randomBetween(-15, 15),
    speed: randomBetween(0.7, 1.0),
  };
}

export default function HeroLightning({ intervalMs = 3000 }) {
  const containerRef = useRef(null);
  const [strikeActive, setStrikeActive] = useState(false);
  const [strikeKey, setStrikeKey] = useState(0);
  const [strikeParams, setStrikeParams] = useState(nextStrikeParams);
  const flashTimeoutsRef = useRef([]);

  useEffect(() => {
    const clearFlashTimeouts = () => {
      flashTimeoutsRef.current.forEach(clearTimeout);
      flashTimeoutsRef.current = [];
    };

    const triggerStrike = () => {
      clearFlashTimeouts();
      setStrikeParams(nextStrikeParams());
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
        <div
          key={strikeKey}
          className="hero-lightning-canvas"
          style={{
            transform: `rotate(${strikeParams.rotation}deg)`,
          }}
        >
          <Lightning
            hue={strikeParams.hue}
            xOffset={strikeParams.xOffset}
            speed={strikeParams.speed}
            intensity={strikeParams.intensity}
            size={strikeParams.size}
          />
        </div>
      )}
    </div>
  );
}
