'use client';

/**
 * A small inline sparkline (about 84 by 28) for metric cards and the securities monitor.
 * Draws only the values it is given; a null breaks the line (no line through a missing
 * period). Neutral grey unless `tone` is 'emerald'. Decorative: the card states the figures.
 */
import { splitAtGaps } from '@/lib/sonar/presentation/contracts';

export function Sparkline({ values = [], tone = 'emerald', width = 84, height = 28 }) {
  const pts = (values || []).map((v, i) => ({ x: i, y: v }));
  const segs = splitAtGaps(pts);
  const all = segs.flat();
  if (all.length < 2) return null;
  const lo = Math.min(...all.map((p) => p.y));
  const hi = Math.max(...all.map((p) => p.y));
  const span = hi - lo || 1;
  const n = Math.max(1, pts.length - 1);
  const X = (x) => (x / n) * width;
  const Y = (y) => height - ((y - lo) / span) * (height - 2) - 1;
  const d = segs
    .map((s) =>
      s.map((p, i) => `${i ? 'L' : 'M'}${X(p.x).toFixed(1)},${Y(p.y).toFixed(1)}`).join(''),
    )
    .join('');
  return (
    <svg
      className={`srl-spark${tone === 'emerald' ? '' : ' is-neutral'}`}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
    >
      <path d={d} />
    </svg>
  );
}

export default Sparkline;
