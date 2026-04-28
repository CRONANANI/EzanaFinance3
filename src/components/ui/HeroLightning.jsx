'use client';

import { useEffect, useId, useRef, useState } from 'react';

/**
 * Emerald lightning bolt that flashes across the hero every `intervalMs`.
 * Drives `--lightning-flash` on `.hero-cybercore-root` so the globe can
 * react to the strike.
 */
export default function HeroLightning({ intervalMs = 6000 }) {
  const containerRef = useRef(null);
  const [strikeCount, setStrikeCount] = useState(0);
  const filterId = useId().replace(/:/g, '');

  useEffect(() => {
    const interval = setInterval(() => {
      setStrikeCount((n) => n + 1);
    }, intervalMs);
    return () => clearInterval(interval);
  }, [intervalMs]);

  useEffect(() => {
    if (strikeCount === 0) return;
    const root = containerRef.current?.closest('.hero-cybercore-root');
    if (!root) return;

    const peak = setTimeout(() => {
      root.style.setProperty('--lightning-flash', '1');
    }, 80);
    const fade = setTimeout(() => {
      root.style.setProperty('--lightning-flash', '0.4');
    }, 180);
    const end = setTimeout(() => {
      root.style.setProperty('--lightning-flash', '0');
    }, 300);

    return () => {
      clearTimeout(peak);
      clearTimeout(fade);
      clearTimeout(end);
    };
  }, [strikeCount]);

  const seed = strikeCount % 5;
  const boltPaths = [
    'M 50,5 L 45,30 L 55,32 L 40,55 L 50,58 L 38,85 L 48,88 L 35,100',
    'M 55,5 L 48,28 L 58,30 L 42,52 L 53,55 L 40,78 L 50,82 L 42,100',
    'M 48,5 L 52,25 L 42,28 L 55,50 L 45,53 L 58,75 L 46,80 L 50,100',
    'M 52,5 L 46,32 L 55,35 L 44,58 L 52,62 L 42,82 L 51,86 L 48,100',
    'M 50,5 L 55,28 L 45,30 L 58,52 L 47,56 L 52,80 L 42,84 L 50,100',
  ];

  return (
    <div ref={containerRef} className="hero-lightning-strike" aria-hidden="true">
      {strikeCount > 0 ? (
        <svg
          key={strikeCount}
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="hero-lightning-svg"
        >
          <defs>
            <filter id={filterId} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="0.8" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <path
            d={boltPaths[seed]}
            stroke="#10b981"
            strokeWidth="0.4"
            fill="none"
            filter={`url(#${filterId})`}
            className="hero-lightning-path"
          />
          <path
            d={boltPaths[(seed + 1) % 5]}
            stroke="#34d399"
            strokeWidth="0.2"
            fill="none"
            opacity="0.6"
            filter={`url(#${filterId})`}
            className="hero-lightning-path-secondary"
          />
        </svg>
      ) : null}
    </div>
  );
}
