'use client';

function hashSeed(str) {
  let h = 0;
  for (let i = 0; i < (str || '').length; i += 1) h = Math.imul(31, h) + str.charCodeAt(i);
  return Math.abs(h);
}

export function TradeSparkline({ seed = 'x', positive = true }) {
  const h = hashSeed(String(seed));
  const w = 200;
  const ht = 50;
  const pts = 12;
  const step = w / (pts - 1);
  const values = [];
  let y = ht / 2;
  for (let i = 0; i < pts; i += 1) {
    const jitter = ((h >> (i % 8)) % 17) - 8;
    y = Math.max(4, Math.min(ht - 4, y + jitter * (positive ? -0.4 : 0.4)));
    values.push(y);
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  const norm = (v) => ht - 4 - ((v - min) / (max - min || 1)) * (ht - 8);
  const d = values.map((v, i) => `${i === 0 ? 'M' : 'L'} ${i * step} ${norm(v)}`).join(' ');
  const stroke = positive ? '#22c55e' : '#ef4444';
  return (
    <svg width={w} height={ht} className="shrink-0" aria-hidden>
      <path d={d} fill="none" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity={0.85} />
    </svg>
  );
}
