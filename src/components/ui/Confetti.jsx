'use client';

import { useEffect, useState } from 'react';
import './confetti.css';

export function Confetti({ active = false, onComplete }) {
  const [particles, setParticles] = useState([]);

  useEffect(() => {
    if (!active) return;
    const count = 24;
    const arr = Array.from({ length: count }, (_, i) => ({
      id: i,
      x: 50 + (Math.random() - 0.5) * 60,
      delay: Math.random() * 0.3,
      duration: 1.2 + Math.random() * 0.6,
      size: 4 + Math.random() * 6,
      rotation: Math.random() * 360,
    }));
    setParticles(arr);
    const t = setTimeout(() => {
      setParticles([]);
      onComplete?.();
    }, 2000);
    return () => clearTimeout(t);
  }, [active, onComplete]);

  if (particles.length === 0) return null;

  return (
    <div className="confetti-container" aria-hidden="true" style={{
      position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 99998, overflow: 'hidden',
    }}>
      {particles.map((p) => (
        <div
          key={p.id}
          className="confetti-particle"
          style={{
            position: 'absolute', left: `${p.x}%`, top: '-20px',
            width: p.size, height: p.size,
            background: ['#10b981', '#34d399', '#059669', '#047857'][p.id % 4],
            borderRadius: p.id % 3 === 0 ? '50%' : '2px',
            transform: `rotate(${p.rotation}deg)`,
            animation: `confetti-fall ${p.duration}s ease-out ${p.delay}s forwards`,
            opacity: 0,
          }}
        />
      ))}
    </div>
  );
}
