import { Fragment } from 'react';

/* Concentric rings with slow orbiting arcs, laid over the dotted world map
   behind every sign-in card (Nov 22, 2026). Adapted from the 21st.dev "pro
   sign-in animation" portal, recoloured in the Ezana emerald, mint and gold.
   Nov 23: steady by design. No fading pulses, no pointer parallax and no
   hover brightening; only the arcs turn, slowly and evenly. Radii are in the
   2000-unit viewBox. */
const RING_RADII = [300, 372, 452, 542, 644, 758, 884, 1000];

export default function AuthRings() {
  return (
    <div className="as-rings" aria-hidden="true">
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
