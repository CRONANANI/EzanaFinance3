'use client';

import { useEffect, useRef, useState } from 'react';
import { DATASET_TAXONOMY } from '@/lib/datasets/taxonomy';
import { HeroDimensionVisual } from './hero-dimension-visuals';
import './hero-device-showcase.css';

/**
 * Hero device showcase v7.
 *
 * v7 changes:
 *  · One bounded 640x788 design canvas holding every child at fixed
 *    coordinates, scaled as a single unit via --lpd-scale (set from a JS
 *    resize listener, since CSS cannot derive a unitless viewport scale).
 *  · Real device overlap: the iPhone's bottom-left crosses the iMac's
 *    top-right by a ~34px strip. A reserved right inset on the dimension
 *    stage keeps chart data out of that strip for all 7 visuals.
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

const PEOPLE = [
  { id: 'p1', name: 'Taylor J.', cap: '$1.2M', copiers: '1.5K', hue: 'a' },
  { id: 'p2', name: 'Beth C.', cap: '$13.4K', copiers: '24K', hue: 'b' },
  { id: 'p3', name: 'Tarcis M.', cap: '$85.1K', copiers: '9.2K', hue: 'c' },
];

const FEED = [
  { id: 'f1', who: 'Beth C.', what: 'rebalanced', when: '3m' },
  { id: 'f2', who: 'Rep. Whitfield', what: 'filed a disclosure', when: '12m' },
  { id: 'f3', who: 'BlackRock', what: 'updated 13F', when: '31m' },
  { id: 'f4', who: 'Taylor J.', what: 'opened NVDA', when: '48m' },
  { id: 'f5', who: 'Katherine C.', what: 'started copying you', when: '1h' },
];

/* Falling JSON fragments — same schema shape as PortfolioSignalCard's
   SIGNALS (key: value pairs, signal/ticker/delta style). `x` px offset in
   .lpd-codefall; `d` = negative delay so the stream is mid-flow on load;
   `s` = fall duration for varied speeds. */
const FALLING = [
  { id: 'c1', text: '"signal": "consumer_spending"', x: 4, d: 0, s: 7 },
  { id: 'c2', text: '"ticker": "PLTR", "value": "$27M"', x: 120, d: 1.2, s: 7.8 },
  { id: 'c3', text: '"Δ30d": +6.2%', x: 66, d: 2.4, s: 6.6 },
  { id: 'c4', text: '"signal": "government_contracts"', x: 150, d: 3.5, s: 7.4 },
  { id: 'c5', text: '"sector": "discretionary"', x: 28, d: 4.6, s: 7 },
  { id: 'c6', text: '"filer": "13F-HR", "positions": 214', x: 96, d: 5.8, s: 7.6 },
];

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
        s = Math.min(1, Math.max(0.62, (vw - 620) / 700));
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
        s = Math.min(1, avail / 640);
      }
      setScale(Number(s.toFixed(3)));
    };
    apply();
    window.addEventListener('resize', apply);
    return () => window.removeEventListener('resize', apply);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const id = setInterval(() => setTick((t) => t + 1), 2000);
    return () => clearInterval(id);
  }, []);

  const followed = tick % (PEOPLE.length + 1);
  const likes = 12 + (tick % 6);
  const filedMin = 2 + (tick % 4);
  /* Each dimension holds for 3 ticks (6s), then cross-fades to the next. */
  const activeDim = Math.floor(tick / 3) % DATASET_TAXONOMY.length;

  return (
    <div className="lpd-stack" ref={stackRef} style={{ '--lpd-scale': scale }} aria-hidden="true">
      <div className="lpd-canvas">
        {/* ── Shaded feed zone + falling JSON, above the desktop only ── */}
        <div className="lpd-codefall">
          <div className="lpd-codefall-shade" />
          {FALLING.map((c) => (
            <span
              key={c.id}
              className="lpd-fall lpd-mono"
              style={{
                left: `${c.x}px`,
                animationDelay: `-${c.d}s`,
                animationDuration: `${c.s}s`,
              }}
            >
              {c.text}
            </span>
          ))}
        </div>

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
              <path
                fill="#231f20"
                d="M570.43,330.43H29.57c-.44,0-.79-.36-.79-.79V25.47c0-.44.36-.79.79-.79h540.87c.44,0,.79.36.79.79v304.17c0,.44-.36.79-.79.79ZM29.57,25.37c-.05,0-.1.04-.1.09v304.17c0,.05.04.1.1.1h540.87c.05,0,.09-.04.09-.1V25.47c0-.05-.04-.09-.09-.09H29.57Z"
              />
              <rect
                fill="#0d1013"
                x="29.12"
                y="25.02"
                width="541.76"
                height="305.06"
                rx=".44"
                ry=".44"
              />
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
                <i className="lpd-dot" />
                <i className="lpd-dot" />
                <i className="lpd-dot" />
                <span key={activeDim} className="lpd-imac-url lpd-url-swap">
                  ezana.world/intelligence/{DATASET_TAXONOMY[activeDim]?.id}
                </span>
              </div>
              <div className="lpd-dims">
                {DATASET_TAXONOMY.map((d, i) => (
                  <div
                    key={d.id}
                    className={`lpd-dim${i === activeDim ? ' is-active' : ''}`}
                    style={{ '--dv-accent': d.color }}
                  >
                    <HeroDimensionVisual dimensionId={d.id} tick={i === activeDim ? tick : 0} />
                  </div>
                ))}
                <div className="lpd-dim-name lpd-mono">
                  {DATASET_TAXONOMY[activeDim]?.label || ''}
                </div>
              </div>
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
                  <span className={`lpd-t lpd-btn lpd-btn--tiny${i < followed ? ' is-on' : ''}`}>
                    <span className="lpd-btn-off">Follow</span>
                    <span className="lpd-btn-on">Following</span>
                  </span>
                </div>
              ))}
            </div>

            <div className="lpd-label">Capitol Watch</div>
            <div className="lpd-disclosure">
              <div className="lpd-disc-row">
                <span className="lpd-avatar lpd-avatar--gov lpd-avatar--sm">W</span>
                <span className="lpd-disc-name">Rep. A. Whitfield</span>
                <span className="lpd-t lpd-disc-when lpd-mono">{filedMin}m</span>
              </div>
              <div className="lpd-disc-row lpd-disc-row--detail">
                <span className="lpd-disc-line">
                  Bought <b className="lpd-mono">NVDA</b> · disclosed today
                </span>
                <span className="lpd-copybtn">Copy</span>
              </div>
            </div>

            <div className="lpd-label">While you were gone…</div>
            <div className="lpd-feed">
              {FEED.map((f, i) => {
                const slot = (((i - tick) % FEED.length) + FEED.length) % FEED.length;
                return (
                  <div
                    key={f.id}
                    className="lpd-t lpd-feedrow"
                    style={{
                      transform: `translateY(${slot * 31}px)`,
                      opacity: slot < 3 ? 1 : 0,
                    }}
                  >
                    <span className="lpd-feed-who">{f.who}</span>
                    <span className="lpd-feed-what">{f.what}</span>
                    <span className="lpd-feed-when lpd-mono">{f.when}</span>
                  </div>
                );
              })}
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
            &quot;Appreciate you walking through the reasoning — good to know the strategy
            isn&apos;t chasing the dip.&quot;
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
            signal-driven — not a change in the core thesis.
          </p>
        </div>
      </div>
    </div>
  );
}

export default HeroDeviceShowcase;
