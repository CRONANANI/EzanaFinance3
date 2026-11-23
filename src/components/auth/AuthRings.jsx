'use client';

import { Fragment, useEffect, useRef } from 'react';

/* Concentric rings with slow orbiting arcs and two pulses spreading from the
   centre, laid over the dotted world map behind every sign-in card (Nov 22,
   2026). Adapted from the 21st.dev "pro sign-in animation" portal, recoloured
   in the Ezana emerald, mint and gold. Radii are in the 2000-unit viewBox. */
const RING_RADII = [300, 372, 452, 542, 644, 758, 884, 1000];

export default function AuthRings() {
  const ref = useRef(null);

  /* A gentle parallax: the rings drift a few pixels against the pointer.
     Skipped for reduced motion and on touch screens (no pointer to follow). */
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof window === 'undefined') return undefined;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    if (!window.matchMedia('(pointer: fine)').matches) return undefined;

    let frame = 0;
    let px = 0;
    let py = 0;
    let tx = 0;
    let ty = 0;
    const onMove = (e) => {
      tx = (e.clientX / window.innerWidth) * 2 - 1;
      ty = (e.clientY / window.innerHeight) * 2 - 1;
    };
    const tick = () => {
      px += (tx - px) * 0.05;
      py += (ty - py) * 0.05;
      el.style.setProperty('--as-rx', `${(px * -14).toFixed(2)}px`);
      el.style.setProperty('--as-ry', `${(py * -10).toFixed(2)}px`);
      frame = requestAnimationFrame(tick);
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    frame = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener('pointermove', onMove);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div ref={ref} className="as-rings" aria-hidden="true">
      <div className="as-rings-glow" />
      <svg className="as-rings-svg" viewBox="0 0 2000 2000" focusable="false">
        <defs>
          <linearGradient
            id="as-arc-gradient"
            gradientUnits="userSpaceOnUse"
            x1="300"
            y1="300"
            x2="1700"
            y2="1700"
          >
            <stop offset="0" style={{ stopColor: 'var(--brand-band-mint)' }} />
            <stop offset="0.55" style={{ stopColor: 'var(--emerald)' }} />
            <stop offset="1" style={{ stopColor: 'var(--gold)' }} />
          </linearGradient>
        </defs>

        <circle className="as-ring-wave" cx="1000" cy="1000" r="300" />
        <circle className="as-ring-wave as-ring-wave--b" cx="1000" cy="1000" r="300" />

        {RING_RADII.map((r, i) => {
          const len = 9 + (i % 3) * 5;
          return (
            <Fragment key={r}>
              <circle className="as-ring-base" cx="1000" cy="1000" r={r} />
              <circle
                className={`as-ring-arc${i % 2 ? ' as-ring-arc--reverse' : ''}`}
                cx="1000"
                cy="1000"
                r={r}
                pathLength="100"
                strokeDasharray={`${len} ${100 - len}`}
                style={{ '--as-orbit': `${38 + i * 12}s`, animationDelay: `${-i * 7.3}s` }}
              />
            </Fragment>
          );
        })}
      </svg>
    </div>
  );
}
