'use client';

import { useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import './ez-donut.css';

/**
 * EzDonut (Nov 2026): the house donut. Rounded segment ends with a hair of
 * space between them, a draw-in on mount, and a hover that lifts the slice
 * (slight scale and a glow in its own colour) while the centre switches to
 * that slice's name, value and share. Plain JS, no Tailwind.
 *
 * segments: [{ key, label, value, className?, color? }]
 *   className sets the slice colour through `color` (currentColor), so a
 *   page's own swatch classes colour the donut and its legend alike; or
 *   pass `color` as a token, e.g. 'var(--emerald)'.
 * active / onActiveChange: optional, to sync a legend outside the chart.
 * renderCenter(activeSegment | null, shareOf): the middle of the ring.
 */
export function EzDonut({
  segments,
  size = 180,
  stroke = 22,
  active: activeProp,
  onActiveChange,
  renderCenter,
  ariaLabel,
  className = '',
}) {
  const reduced = useReducedMotion();
  const [own, setOwn] = useState(null);
  const active = activeProp !== undefined ? activeProp : own;
  const setActive = (k) => {
    if (activeProp === undefined) setOwn(k);
    onActiveChange?.(k);
  };

  const r = size / 2 - stroke / 2;
  const c = 2 * Math.PI * r;
  const total = useMemo(
    () => segments.reduce((a, x) => a + (Number(x.value) > 0 ? Number(x.value) : 0), 0),
    [segments],
  );
  const shareOf = (seg) => (total > 0 ? (seg.value / total) * 100 : 0);

  /* Round caps reach stroke/2 past each end, so each arc is drawn that much
     shorter at both ends to leave a small gap between neighbours. */
  const many = segments.filter((x) => x.value > 0).length > 1;
  let acc = 0;
  const arcs = segments
    .filter((x) => x.value > 0)
    .map((x) => {
      const full = (x.value / (total || 1)) * c;
      const trim = many ? Math.min(stroke + 2, full * 0.6) : 0;
      const arc = { ...x, len: Math.max(0.01, full - trim), off: acc + trim / 2 };
      acc += full;
      return arc;
    });
  const activeSeg = arcs.find((a) => a.key === active) || null;

  return (
    <figure
      className={`ezd ${className}`.trim()}
      style={{ width: size, height: size }}
      onMouseLeave={() => setActive(null)}
    >
      <svg
        viewBox={`0 0 ${size} ${size}`}
        width={size}
        height={size}
        role="img"
        aria-label={ariaLabel}
        className="ezd-svg"
      >
        <circle className="ezd-track" cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} />
        {arcs.map((a, i) => (
          <motion.circle
            key={a.key}
            className={`ezd-slice ${a.className || ''}${a.key === active ? ' is-active' : ''}${
              active != null && a.key !== active ? ' is-dim' : ''
            }`}
            style={a.color ? { color: a.color } : undefined}
            cx={size / 2}
            cy={size / 2}
            r={r}
            strokeWidth={stroke}
            strokeLinecap={many ? 'round' : 'butt'}
            strokeDasharray={`${a.len} ${c}`}
            initial={reduced ? false : { strokeDashoffset: -a.off + a.len, opacity: 0 }}
            animate={{ strokeDashoffset: -a.off, opacity: 1 }}
            transition={{
              strokeDashoffset: { duration: 0.9, ease: 'easeOut', delay: i * 0.05 },
              opacity: { duration: 0.25, delay: i * 0.05 },
            }}
            onMouseEnter={() => setActive(a.key)}
            onFocus={() => setActive(a.key)}
            onBlur={() => setActive(null)}
            tabIndex={0}
            aria-label={`${a.label}: ${Math.round(shareOf(a))}%`}
          />
        ))}
      </svg>
      {renderCenter ? (
        <figcaption className="ezd-center" style={{ inset: stroke + 6 }}>
          <motion.div
            key={activeSeg ? activeSeg.key : '__total'}
            className="ezd-center-inner"
            initial={reduced ? false : { opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
          >
            {renderCenter(activeSeg, shareOf)}
          </motion.div>
        </figcaption>
      ) : null}
    </figure>
  );
}

export default EzDonut;
