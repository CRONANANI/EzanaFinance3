'use client';

import { useMemo } from 'react';

function mulberry32(seed) {
  return function rand() {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function NightExterior({ width = 1600, height = 1000 }) {
  const { stars, buildings, aircraft } = useMemo(() => {
    const rand = mulberry32(42);
    const starList = [];
    for (let i = 0; i < 180; i++) {
      starList.push({
        cx: rand() * width,
        cy: rand() * (height * 0.52),
        r: rand() * 1.4 + 0.4,
        o: 0.35 + rand() * 0.65,
      });
    }
    const b = [];
    let x = 0;
    while (x < width) {
      const w = 22 + rand() * 55;
      const h = 40 + rand() * 120;
      b.push({ x, w, h });
      x += w - 4 + rand() * 12;
    }
    const planes = [
      { x1: width * 0.08, y1: height * 0.18, x2: width * 0.22, y2: height * 0.15 },
      { x1: width * 0.78, y1: height * 0.12, x2: width * 0.92, y2: height * 0.14 },
    ];
    return { stars: starList, buildings: b, aircraft: planes };
  }, [width, height]);

  return (
    <g className="cc-night-exterior" aria-hidden>
      <defs>
        <linearGradient id="ccSkyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#0c1220" />
          <stop offset="55%" stopColor="#151b2e" />
          <stop offset="100%" stopColor="#1a2238" />
        </linearGradient>
        <linearGradient id="ccMoonGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f8fafc" />
          <stop offset="100%" stopColor="#cbd5e1" />
        </linearGradient>
      </defs>
      <rect width={width} height={height * 0.58} fill="url(#ccSkyGrad)" />
      {stars.map((s, i) => (
        <circle key={i} cx={s.cx} cy={s.cy} r={s.r} fill="#e2e8f0" opacity={s.o} />
      ))}
      <circle cx={width * 0.88} cy={height * 0.12} r={38} fill="url(#ccMoonGrad)" opacity={0.92} />
      <circle cx={width * 0.88 - 12} cy={height * 0.12 - 8} r={32} fill="#151b2e" opacity={0.35} />
      <path
        d={`M0 ${height * 0.48} Q ${width * 0.25} ${height * 0.42} ${width * 0.5} ${height * 0.46} T ${width} ${height * 0.44} L ${width} ${height * 0.58} L 0 ${height * 0.58} Z`}
        fill="#0f172a"
        opacity={0.85}
      />
      <g transform={`translate(0,${height * 0.34})`}>
        {buildings.map((bg, i) => (
          <rect key={i} x={bg.x} y={-bg.h} width={bg.w} height={bg.h} fill="#1e293b" rx={2} />
        ))}
      </g>
      {aircraft.map((p, i) => (
        <line
          key={i}
          x1={p.x1}
          y1={p.y1}
          x2={p.x2}
          y2={p.y2}
          stroke="rgba(148,163,184,0.35)"
          strokeWidth={1}
          strokeDasharray="6 14"
        />
      ))}
    </g>
  );
}
