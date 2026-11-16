'use client';

/**
 * Percent change with a leading triangle, colour-coded by sign. Signed values
 * always carry their sign; a missing value reads N/A.
 */
export function AmPct({ ch, signed = false }) {
  let num;
  if (ch == null || ch === '') {
    num = null;
  } else if (typeof ch === 'number') {
    num = Number.isFinite(ch) ? ch : null;
  } else {
    num = parseFloat(String(ch).replace(/[^\d.-]/g, ''));
    if (!Number.isFinite(num)) num = null;
    else if (String(ch).trim().startsWith('-')) num = -Math.abs(num);
  }
  if (num == null) return <span className="am2-pct am2-pct--na">N/A</span>;
  const up = num >= 0;
  const sign = num > 0 ? '+' : num < 0 ? '-' : '';
  return (
    <span className={`am2-pct ${up ? 'am2-pct--up' : 'am2-pct--down'}`}>
      <span className={up ? 'am2-pct-arrow-up' : 'am2-pct-arrow-down'} aria-hidden />
      {signed ? sign : num < 0 ? '-' : ''}
      {Math.abs(num).toFixed(2)}%
    </span>
  );
}
