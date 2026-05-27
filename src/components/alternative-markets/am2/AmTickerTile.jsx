'use client';

export function AmTickerTile({ symbol }) {
  const text = String(symbol || '')
    .slice(0, 3)
    .toUpperCase();
  return (
    <span className="am2-ticker-tile" aria-hidden>
      {text}
    </span>
  );
}
