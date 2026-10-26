'use client';

import { memo, useEffect, useRef, useState } from 'react';
import { HeroDashboardMock } from './hero-dashboard-mock';
import { CODEFALL_POOL, tokenizeFragment } from './hero-codefall-pool';
import './hero-device-showcase.css';

/**
 * Hero device showcase v7.
 *
 * v7 changes:
 *  · One bounded 640x788 design canvas holding every child at fixed
 *    coordinates, scaled as a single unit via --lpd-scale (set from a JS
 *    resize listener, since CSS cannot derive a unitless viewport scale).
 *  · Real device overlap: the iPhone's bottom-left crosses the iMac's
 *    top-right by a ~34px strip. The dashboard mock's right inset keeps
 *    its content out of that strip.
 *  · The iMac screen renders ONE persistent living mockup of the
 *    authenticated dashboard home (HeroDashboardMock), replacing the old
 *    seven-dimension chart cycle.
 *  · Notifications are opaque toasts that animate in ONCE (fade, rise,
 *    settle) and then hold still. The continuous float/bob loop is gone
 *    from the cards AND the devices.
 *  · Phone interior re-spaced: wider screen padding, two-row Capitol
 *    Watch, consistent 14/7 label rhythm.
 *  · <1080px the canvas leaves the absolute overlay and flows below the
 *    copy column, centered and sized to the viewport, instead of hiding.
 *
 * One 2s tick drives discrete frames deterministically (seeded sin, no
 * Math.random); continuous motion (falling JSON) is pure CSS. Decorative
 * only: aria-hidden + pointer-events: none.
 */

/* Two copy-trader rows; the phone's remaining space carries the alert feed. */
const PEOPLE = [
  { id: 'p1', name: 'Taylor J.', cap: '$1.2M', copiers: '1.5K', hue: 'a' },
  { id: 'p2', name: 'Beth C.', cap: '$13.4K', copiers: '24K', hue: 'b' },
];

/* The codefall (Oct 26): nine lanes falling through a 66-fragment pool of
   Ezana's data plane (hero-codefall-pool.js). Each lane has a fixed x (no two
   within 24px), its own speed (6 to 11s), a negative delay so the stream is
   mid-flow on load, a size and an opacity. Three lanes drift a pixel or two
   sideways as they fall.

   Rotation: every time a lane finishes a fall (animationiteration) it takes
   the next fragment from ONE shared counter, so the nine lanes interleave
   through the pool in order and a fragment comes back only after the whole
   pool has passed, about a minute. (Per-lane strides through the pool repeat
   within 20s: lanes end up sharing orbits.) The text is written straight to
   the DOM, never through React state, so the hero never re-renders for it.
   Every ninth swap "types" its fragment in (a stepped clip over the first
   12% of the fall). No Math.random: the first frame is the same on server
   and client. */
const LANES = [
  { x: 6, s: 6.2, d: 0.9, size: 10, o: 0.85 },
  { x: 178, s: 9.4, d: 4.9, size: 9.5, o: 0.55, drift: 1.5 },
  { x: 62, s: 7.1, d: 6.3, size: 10.5, o: 0.75 },
  { x: 238, s: 10.6, d: 2.8, size: 9.5, o: 0.45 },
  { x: 120, s: 6.8, d: 4.3, size: 11, o: 0.9, drift: -2 },
  { x: 34, s: 8.3, d: 7.4, size: 9.5, o: 0.6 },
  { x: 208, s: 11, d: 4.1, size: 10, o: 0.5, drift: 2 },
  { x: 92, s: 7.7, d: 5.7, size: 10, o: 0.7 },
  { x: 150, s: 9, d: 1, size: 10.5, o: 0.65 },
];

function FragmentText({ frag }) {
  return tokenizeFragment(frag).map((tk, i) =>
    tk.c ? (
      <span key={i} className={`lpd-tk-${tk.c}`}>
        {tk.t}
      </span>
    ) : (
      tk.t
    ),
  );
}

/* Rebuild a lane's spans for a new fragment: one DOM write per swap. */
function writeFragment(el, frag) {
  const doc = el.ownerDocument;
  const nodes = tokenizeFragment(frag).map((tk) => {
    if (!tk.c) return doc.createTextNode(tk.t);
    const span = doc.createElement('span');
    span.className = `lpd-tk-${tk.c}`;
    span.textContent = tk.t;
    return span;
  });
  el.replaceChildren(...nodes);
}

/* Memoised with no props: it renders once and the lanes then live in the DOM. */
const Codefall = memo(function Codefall() {
  const laneRefs = useRef([]);
  const textRefs = useRef([]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined;
    const P = CODEFALL_POOL.length;
    let counter = LANES.length;
    const offs = laneRefs.current.map((lane, i) => {
      if (!lane) return null;
      const onIter = (e) => {
        /* The typed reveal (lpd-type) iterates in lockstep; count falls only. */
        if (e.animationName !== 'lpd-fall') return;
        const frag = CODEFALL_POOL[counter % P];
        const text = textRefs.current[i];
        if (text) writeFragment(text, frag);
        lane.dataset.k = frag.k;
        lane.classList.toggle('is-typed', counter % LANES.length === 0);
        counter += 1;
      };
      lane.addEventListener('animationiteration', onIter);
      return () => lane.removeEventListener('animationiteration', onIter);
    });
    return () => offs.forEach((off) => off && off());
  }, []);

  return (
    <div className="lpd-codefall">
      <div className="lpd-codefall-shade" />
      {LANES.map((l, i) => {
        const frag = CODEFALL_POOL[i];
        return (
          <span
            key={i}
            ref={(el) => {
              laneRefs.current[i] = el;
            }}
            className="lpd-fall lpd-mono"
            data-k={frag.k}
            style={{
              left: `${l.x}px`,
              fontSize: `${l.size}px`,
              animationDelay: `-${l.d}s`,
              animationDuration: `${l.s}s`,
              '--lpd-o': l.o,
              '--lpd-drift': `${l.drift || 0}px`,
            }}
          >
            <span
              ref={(el) => {
                textRefs.current[i] = el;
              }}
            >
              <FragmentText frag={frag} />
            </span>
          </span>
        );
      })}
    </div>
  );
});

export function HeroDeviceShowcase() {
  const [tick, setTick] = useState(0);
  const stackRef = useRef(null);
  /* Viewport-proportional scale for the 640x788 composition canvas.
     >=1080px: right-anchored beside the copy, scale eases 0.62 -> 1 as the
     viewport grows (formula unchanged). <1080px: the cluster flows below the
     copy inside the hero band, so the scale must fit the band's CONTENT box,
     not the raw viewport: the band carries 16-40px side padding that the old
     (vw - 24) formula ignored, which pushed the canvas past the right edge on
     phones. SSR renders scale 1; the first client effect corrects it before
     the entrance animation finishes. */
  const [scale, setScale] = useState(1);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const apply = () => {
      const vw = window.innerWidth;
      let s;
      if (vw >= 1080) {
        s = Math.min(1, Math.max(0.6, (vw - 640) / 750));
      } else {
        let avail = vw - 24;
        const host = stackRef.current?.parentElement;
        if (host) {
          const cs = window.getComputedStyle(host);
          avail =
            host.clientWidth -
            (parseFloat(cs.paddingLeft) || 0) -
            (parseFloat(cs.paddingRight) || 0);
        }
        s = Math.min(1, avail / 690);
      }
      setScale(Number(s.toFixed(3)));
    };
    apply();
    window.addEventListener('resize', apply);
    return () => window.removeEventListener('resize', apply);
  }, []);

  /* Tick only while the composition is actually on screen: the hero scrolls
     away quickly, and a timer driving unseen re-renders is pure waste. The
     observed frames are identical — off-screen ticks were never visible. */
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = stackRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return undefined;
    }
    const io = new IntersectionObserver((es) => setInView(es.some((e) => e.isIntersecting)), {
      rootMargin: '100px',
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!inView) return undefined;
    if (typeof window === 'undefined' || !window.matchMedia) return undefined;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const id = setInterval(() => setTick((t) => t + 1), 2000);
    return () => clearInterval(id);
  }, [inView]);

  const likes = 12 + (tick % 6);
  const filedMin = 2 + (tick % 4);
  const titansMin = 14 + (tick % 5);

  return (
    <div className="lpd-stack" ref={stackRef} style={{ '--lpd-scale': scale }} aria-hidden="true">
      <div className="lpd-canvas">
        {/* ── Shaded feed zone + falling JSON, above the desktop only ── */}
        <Codefall />

        {/* ── Layer 1: iMac ── */}
        <div className="lpd-imac">
          <div className="lpd-imac-frame">
            <svg viewBox="0 0 600 500" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
              <rect fill="url(#lpdImacStand)" x="232.4" y="401.32" width="135.19" height="83.37" />
              <rect
                fill="#dedfe2"
                x="234.32"
                y="489.39"
                width="17.21"
                height="1.9"
                rx=".15"
                ry=".15"
              />
              <rect
                fill="#dedfe2"
                x="348.45"
                y="489.39"
                width="17.21"
                height="1.9"
                rx=".15"
                ry=".15"
              />
              <rect fill="#dedfe1" x="232.4" y="484.69" width="135.19" height="5.61" />
              <path
                fill="#eeeeef"
                d="M23.83,10.99h552.03c4.92,0,8.91,3.99,8.91,8.91v324.18H14.92V19.9c0-4.92,3.99-8.91,8.91-8.91Z"
              />
              <path
                fill="#d9d9db"
                d="M23.83,343.94h552.03c4.92,0,8.91,3.99,8.91,8.91v48.47H14.92v-48.47c0-4.92,3.99-8.91,8.91-8.91Z"
                transform="translate(599.69 745.26) rotate(180)"
              />
              {/* The dark ring that used to bound the screen rect is removed:
                  the white screen surface against the aluminum bezel is enough
                  separation. The bezel/aluminum hardware paths below stay. */}
              {/* The black screen-backing rect is gone too. It sat a fraction
                  of a percent outside the CSS screen overlay on every side, and
                  that overhang antialiased into the 1px dark line that hugged
                  the screen. The overlay is opaque, so nothing needs to back
                  it; the white surface now meets the aluminum bezel directly. */}
              <circle fill="#414042" cx="300" cy="17.7" r="2.11" />
              <circle fill="#262262" cx="300" cy="17.7" r=".85" />
              <defs>
                <linearGradient
                  id="lpdImacStand"
                  x1="300"
                  y1="484.69"
                  x2="300"
                  y2="401.32"
                  gradientUnits="userSpaceOnUse"
                >
                  <stop offset="0" stopColor="#a7a9ac" />
                  <stop offset=".1" stopColor="#d1d3d4" />
                  <stop offset=".41" stopColor="#e6e7e8" />
                  <stop offset=".73" stopColor="#e6e7e8" />
                  <stop offset="1" stopColor="#d1d3d4" />
                </linearGradient>
              </defs>
            </svg>
            <div className="lpd-imac-screen">
              <div className="lpd-imac-chrome">
                <i className="lpd-dot lpd-dot--close" />
                <i className="lpd-dot lpd-dot--min" />
                <i className="lpd-dot lpd-dot--zoom" />
                <span className="lpd-imac-url">ezana.world/home</span>
              </div>
              {/* Single persistent screen content: a miniature living mockup of
                  the authenticated dashboard home, driven by the shared tick. */}
              <HeroDashboardMock tick={tick} />
            </div>
          </div>
        </div>

        {/* ── Layer 2: iPhone (unchanged) ── */}
        <div className="lpd-phone">
          <div className="lpd-phone-island" />
          <div className="lpd-phone-screen">
            <div className="lpd-phone-head">
              <span className="lpd-phone-hi">Welcome, Investor.</span>
              <i className="bi bi-bell lpd-bell" />
            </div>

            <div className="lpd-socialbar">
              <span className="lpd-socialstat">
                <i className="bi bi-people-fill" /> 12.4K community
              </span>
              <span className="lpd-socialstat">
                <i className="bi bi-arrow-repeat" /> copy trading live
              </span>
            </div>

            <div className="lpd-label">Who you&apos;re copying…</div>
            <div className="lpd-people">
              {PEOPLE.map((p, i) => (
                <div key={p.id} className="lpd-person">
                  <span className={`lpd-avatar lpd-avatar--${p.hue}`}>{p.name.slice(0, 1)}</span>
                  <span className="lpd-person-name">{p.name}</span>
                  <span className="lpd-person-meta lpd-mono">{p.cap}</span>
                  <span className="lpd-person-meta lpd-mono lpd-dim-text">{p.copiers} copiers</span>
                  {/* Static: the button no longer cycles to a Following state,
                      so there is one label and no transition to drive. */}
                  <span className="lpd-btn lpd-btn--tiny">Follow</span>
                </div>
              ))}
            </div>

            <div className="lpd-alerts-divider">
              <span className="lpd-mono lpd-alerts-kicker">Alerts</span>
            </div>

            {/* Capitol Watch alert: fictional member, disclosure-filing event. */}
            <div className="lpd-alert lpd-alert--capitol">
              <div className="lpd-alert-head">
                <i className="bi bi-bank lpd-alert-icon" />
                <span className="lpd-mono lpd-alert-kicker">Capitol Watch</span>
                <span className="lpd-t lpd-mono lpd-alert-when">{filedMin}m</span>
              </div>
              <div className="lpd-alert-name">Rep. A. Whitfield</div>
              <div className="lpd-alert-line">
                disclosure filed
                <span className="lpd-mono lpd-alert-chip">LMT</span>
                <span className="lpd-mono lpd-alert-val">$100K-250K</span>
              </div>
            </div>

            {/* Titans Shadow alert: filing EVENT only for the named institution,
                never a return, prediction, or strategy characterization. */}
            <div className="lpd-alert lpd-alert--titans">
              <div className="lpd-alert-head">
                <i className="bi bi-buildings lpd-alert-icon" />
                <span className="lpd-mono lpd-alert-kicker">Titans Shadow</span>
                <span className="lpd-t lpd-mono lpd-alert-when">{titansMin}m</span>
              </div>
              <div className="lpd-alert-name">Goldman Sachs</div>
              <div className="lpd-alert-line">
                13F position disclosed
                <span className="lpd-mono lpd-alert-chip">AVGO</span>
                <span className="lpd-mono lpd-alert-val">+1.2M sh</span>
              </div>
            </div>
          </div>
          <div className="lpd-phone-homebar" />
        </div>

        {/* ── Layer 3: satellites ── */}
        <div className="lpd-sat lpd-sat--sync">
          <div className="lpd-sat-head">
            <span className="lpd-sat-check">
              <i className="bi bi-check-lg" />
            </span>
            <span className="lpd-sat-title">Auto-copy synced</span>
          </div>
          <p className="lpd-sat-body">
            Your account rebalanced automatically to match Rep. Whitfield&apos;s filing.
          </p>
          <svg viewBox="0 0 180 34" className="lpd-sync-chart" aria-hidden>
            <polyline points="0,26 40,22 80,20 120,12 180,8" className="lpd-sync-a" />
            <polyline
              className="lpd-t lpd-sync-b"
              points={`0,${30 - (tick % 3) * 2} 50,24 100,${16 - (tick % 2) * 2} 180,9`}
            />
          </svg>
          <div className="lpd-sat-foot lpd-mono">512 copiers updated · 2 min ago</div>
        </div>

        <div className="lpd-sat lpd-sat--follower">
          <div className="lpd-sat-head">
            <span className="lpd-avatar lpd-avatar--b lpd-avatar--sm">K</span>
            <span className="lpd-sat-title">New follower</span>
          </div>
          <p className="lpd-sat-body">
            &quot;Appreciate you walking through the reasoning. Good to know the strategy isn&apos;t
            chasing the dip.&quot;
          </p>
          <div className="lpd-sat-foot">
            <i className="bi bi-heart-fill lpd-heart" aria-hidden />{' '}
            <span className="lpd-t lpd-mono">{likes}</span>
            <span className="lpd-mono lpd-dim-text"> · Katherine C. started copying you</span>
          </div>
        </div>

        <div className="lpd-sat lpd-sat--rebalance">
          <div className="lpd-sat-head">
            <span className="lpd-avatar lpd-avatar--c lpd-avatar--sm">R</span>
            <span className="lpd-sat-title">AI Supply Chain · Rebalance</span>
            <span className="lpd-sat-when lpd-mono">5h</span>
          </div>
          <div className="lpd-pills">
            <span className="lpd-pill lpd-pill--buy">Buy AVGO</span>
            <span className="lpd-pill lpd-pill--sell">Sell PLTR</span>
            <span className="lpd-pill lpd-pill--hold">Hold MSFT</span>
          </div>
          <p className="lpd-sat-body">
            Rotating weight toward stronger risk-adjusted signals after the pullback. Routine,
            signal-driven, not a change in the core thesis.
          </p>
        </div>
      </div>
    </div>
  );
}

export default HeroDeviceShowcase;
