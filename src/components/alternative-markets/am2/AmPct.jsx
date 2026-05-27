'use client';

/**
 * Percent delta with leading triangle, color-coded by sign.
 */
export function AmPct({ ch, signed = false }) {
  let num;
  if (typeof ch === 'number') {
    num = ch;
  } else {
    num = parseFloat(String(ch).replace(/[^\d.-]/g, '')) || 0;
    if (String(ch).startsWith('-')) num = -Math.abs(num);
  }
  const up = num >= 0;
  return (
    <span className={`am2-pct ${up ? 'am2-pct--up' : 'am2-pct--down'}`}>
      <span className={up ? 'am2-pct-arrow-up' : 'am2-pct-arrow-down'} aria-hidden />
      {signed && up ? '+' : ''}
      {Math.abs(num).toFixed(2)}%
    </span>
  );
}
