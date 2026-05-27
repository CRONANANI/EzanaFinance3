'use client';

import { AmPct } from './AmPct';

export function MarqueeTicker({ items = [] }) {
  if (items.length === 0) return null;
  const doubled = [...items, ...items];

  return (
    <div className="am2-marquee" aria-label="Live ticker">
      <div className="am2-marquee-track">
        {doubled.map((it, i) => (
          <span className="am2-marquee-cell" key={`${it.symbol}-${i}`}>
            <span className="am2-marquee-symbol">{it.symbol}</span>
            <span className="am2-marquee-price">{it.price}</span>
            <AmPct ch={it.ch} />
          </span>
        ))}
      </div>
    </div>
  );
}
