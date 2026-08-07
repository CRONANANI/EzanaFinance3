'use client';

import { useEffect, useState } from 'react';
import './hero-device-showcase.css';

/**
 * Hero device showcase v4 — social copy-trading composition on the hero's
 * right side.
 *
 * v4 changes:
 *  · MacBook replaced with an iMac SVG frame (adapted from a 21st.dev
 *    component: converted TSX→JSX, shadcn/Tailwind stripped, `src` image
 *    slot replaced with a live HTML screen overlay). SVG hardware hex is
 *    the established device-chrome scoped exception.
 *  · iMac screen shows "Ezana Sonar · live parse": a continuously
 *    scrolling parse log (left) + tick-driven bar chart and cycling alert
 *    cards (right).
 *  · A falling stream of code fragments feeds into the iMac from above.
 *  · iPhone (unchanged from v3, 190px) moved right so the two device
 *    frames overlap by only ~12px of corner layering.
 *  · Alerts reference real filing EVENTS only (13F updates, congressional
 *    disclosures) — NEVER invented performance figures for a real firm.
 *
 * One 2s tick drives all discrete frames deterministically (seeded sin, no
 * Math.random) so SSR and first client render match; continuous motion
 * (scroll loop, falling code) is pure CSS keyframes. Decorative only:
 * aria-hidden + pointer-events: none.
 */

function seeded(n) {
  const x = Math.sin(n * 12.9898 + 4.1) * 43758.5453;
  return x - Math.floor(x);
}

const PEOPLE = [
  { id: 'p1', name: 'Taylor J.', cap: '$1.2M', copiers: '1.5K', hue: 'a' },
  { id: 'p2', name: 'Beth C.', cap: '$13.4K', copiers: '24K', hue: 'b' },
  { id: 'p3', name: 'Tarcis M.', cap: '$85.1K', copiers: '9.2K', hue: 'c' },
  { id: 'p4', name: 'Joy Chen', cap: '$2.4K', copiers: '895', hue: 'd' },
];

const FEED = [
  { id: 'f1', who: 'Beth C.', what: 'rebalanced', when: '3m' },
  { id: 'f2', who: 'Rep. Whitfield', what: 'filed a disclosure', when: '12m' },
  { id: 'f3', who: 'BlackRock', what: 'updated 13F', when: '31m' },
  { id: 'f4', who: 'Taylor J.', what: 'opened NVDA', when: '48m' },
  { id: 'f5', who: 'Joy Chen', what: 'started copying you', when: '1h' },
];

/* Parse log shown scrolling on the iMac. Duplicated in render for a
   seamless -50% translateY loop. */
const CODE_LINES = [
  'ingest("sec/edgar/13f-hr")',
  'chunk = tokenize(doc, 512)',
  'vec = embed(chunk)  // gte-small',
  'match_score: 0.91',
  'diff(holdings, prev_quarter)',
  'route → sonar.alerts',
  'parse(house_disclosure.pdf)',
  'rerank(top_k = 8)',
];

/* Code fragments falling from above into the iMac. `x` = px offset inside
   .lpd-codefall; `d` = negative animation-delay so the stream is already
   mid-flow on load. */
const FALLING = [
  { id: 'c1', text: 'parse(13f_hr.xml)', x: 6, d: 0 },
  { id: 'c2', text: 'embed(chunk_042)', x: 118, d: 1.3 },
  { id: 'c3', text: 'score → 0.91', x: 52, d: 2.6 },
  { id: 'c4', text: 'alerts.push("AVGO")', x: 138, d: 3.8 },
  { id: 'c5', text: 'diff(q1, q2)', x: 84, d: 5.0 },
];

/* Filing/flow EVENTS only — no performance claims about real firms. */
const ALERTS = [
  { id: 'a1', icon: 'bi-broadcast', title: 'Unusual options flow', meta: 'AVGO · vol 4.2×' },
  { id: 'a2', icon: 'bi-bank', title: '13F update parsed', meta: 'Bridgewater · 214 positions' },
  { id: 'a3', icon: 'bi-building', title: 'Congressional filing', meta: 'Rep. Whitfield · NVDA' },
];

/* ── iMac frame (adapted from 21st.dev "Mac" SVG). The screen rect in the
   600×500 viewBox is x=29.12 y=25.02 w=541.76 h=305.06; the HTML overlay
   (.lpd-imac-screen) is positioned over it with matching percentages. ── */
function ImacFrame({ children }) {
  return (
    <div className="lpd-imac-frame">
      <svg viewBox="0 0 600 500" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
        {/* stand column */}
        <rect fill="url(#lpdImacStand)" x="232.4" y="401.32" width="135.19" height="83.37" />
        {/* foot pads */}
        <rect fill="#dedfe2" x="234.32" y="489.39" width="17.21" height="1.9" rx=".15" ry=".15" />
        <rect fill="#dedfe2" x="348.45" y="489.39" width="17.21" height="1.9" rx=".15" ry=".15" />
        {/* foot */}
        <rect fill="#dedfe1" x="232.4" y="484.69" width="135.19" height="5.61" />
        {/* display body */}
        <path
          fill="#eeeeef"
          d="M23.83,10.99h552.03c4.92,0,8.91,3.99,8.91,8.91v324.18H14.92V19.9c0-4.92,3.99-8.91,8.91-8.91Z"
        />
        {/* chin */}
        <path
          fill="#d9d9db"
          d="M23.83,343.94h552.03c4.92,0,8.91,3.99,8.91,8.91v48.47H14.92v-48.47c0-4.92,3.99-8.91,8.91-8.91Z"
          transform="translate(599.69 745.26) rotate(180)"
        />
        {/* bezel line */}
        <path
          fill="#231f20"
          d="M570.43,330.43H29.57c-.44,0-.79-.36-.79-.79V25.47c0-.44.36-.79.79-.79h540.87c.44,0,.79.36.79.79v304.17c0,.44-.36.79-.79.79ZM29.57,25.37c-.05,0-.1.04-.1.09v304.17c0,.05.04.1.1.1h540.87c.05,0,.09-.04.09-.1V25.47c0-.05-.04-.09-.09-.09H29.57Z"
        />
        {/* screen panel (dark, sits under the HTML overlay) */}
        <rect fill="#0d1013" x="29.12" y="25.02" width="541.76" height="305.06" rx=".44" ry=".44" />
        {/* camera */}
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
      <div className="lpd-imac-screen">{children}</div>
    </div>
  );
}

export function HeroDeviceShowcase() {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const id = setInterval(() => setTick((t) => t + 1), 2000);
    return () => clearInterval(id);
  }, []);

  const followed = tick % (PEOPLE.length + 1);
  const activeAlert = tick % ALERTS.length;
  const likes = 12 + (tick % 6);
  const filedMin = 2 + (tick % 4);

  return (
    <div className="lpd-stack" aria-hidden="true">
      {/* ── Falling code, feeding into the iMac from above ── */}
      <div className="lpd-codefall">
        {FALLING.map((c) => (
          <span
            key={c.id}
            className="lpd-fall lpd-mono"
            style={{ left: `${c.x}px`, animationDelay: `-${c.d}s` }}
          >
            {c.text}
          </span>
        ))}
      </div>

      {/* ── Layer 1: iMac ── */}
      <div className="lpd-imac lpd-float lpd-float--slow">
        <ImacFrame>
          <div className="lpd-imac-chrome">
            <i className="lpd-dot" />
            <i className="lpd-dot" />
            <i className="lpd-dot" />
            <span className="lpd-imac-url">ezana.world/sonar · live parse</span>
            <span className="lpd-ping" />
          </div>
          <div className="lpd-imac-grid">
            <div className="lpd-ingest">
              <div className="lpd-panel-label">Ingest</div>
              <div className="lpd-ingest-viewport">
                <div className="lpd-ingest-scroll">
                  {[...CODE_LINES, ...CODE_LINES].map((line, i) => (
                    <div key={i} className="lpd-code-line lpd-mono">
                      <span className="lpd-code-ln">
                        {String((i % CODE_LINES.length) + 1).padStart(2, '0')}
                      </span>
                      {line}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="lpd-signals">
              <div className="lpd-panel-label">Signals</div>
              <div className="lpd-bars">
                {Array.from({ length: 12 }, (_, i) => {
                  const h = 8 + Math.round(seeded(tick * 3 + i * 7) * 22);
                  return <i key={i} className="lpd-t" style={{ height: `${h}px` }} />;
                })}
              </div>
              <div className="lpd-alerts">
                {ALERTS.map((a, i) => (
                  <div
                    key={a.id}
                    className={`lpd-t lpd-alert${i === activeAlert ? ' is-live' : ''}`}
                  >
                    <i className={`bi ${a.icon} lpd-alert-icon`} />
                    <span className="lpd-alert-title">{a.title}</span>
                    <span className="lpd-alert-meta lpd-mono">{a.meta}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </ImacFrame>
      </div>

      {/* ── Layer 2: iPhone (unchanged from v3) ── */}
      <div className="lpd-phone lpd-float lpd-float--mid">
        <div className="lpd-phone-island" />
        <div className="lpd-phone-screen">
          <div className="lpd-phone-head">
            <span className="lpd-phone-hi">Welcome, Investor.</span>
            <i className="bi bi-bell lpd-bell" />
          </div>

          <div className="lpd-label">Who you&apos;re copying…</div>
          <div className="lpd-people">
            {PEOPLE.map((p, i) => (
              <div key={p.id} className="lpd-person">
                <span className={`lpd-avatar lpd-avatar--${p.hue}`}>{p.name.slice(0, 1)}</span>
                <span className="lpd-person-name">{p.name}</span>
                <span className="lpd-person-meta lpd-mono">{p.cap}</span>
                <span className="lpd-person-meta lpd-mono lpd-dim">{p.copiers} copiers</span>
                <span className={`lpd-t lpd-btn lpd-btn--tiny${i < followed ? ' is-on' : ''}`}>
                  <span className="lpd-btn-off">Follow</span>
                  <span className="lpd-btn-on">Following</span>
                </span>
              </div>
            ))}
          </div>

          <div className="lpd-label">Capitol Watch</div>
          <div className="lpd-disclosure">
            <span className="lpd-avatar lpd-avatar--gov lpd-avatar--sm">W</span>
            <span className="lpd-disc-name">Rep. A. Whitfield</span>
            <span className="lpd-disc-line">
              Bought <b className="lpd-mono">NVDA</b>
            </span>
            <span className="lpd-t lpd-disc-when lpd-mono">{filedMin}m</span>
            <span className="lpd-copybtn">Copy</span>
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
                    transform: `translateY(${slot * 30}px)`,
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
      <div className="lpd-sat lpd-sat--sync lpd-float lpd-float--fast">
        <div className="lpd-sat-head">
          <span className="lpd-sat-check">
            <i className="bi bi-check-lg" />
          </span>
          <span className="lpd-sat-title">Auto-copy synced</span>
          <span className="lpd-ping" />
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

      <div className="lpd-sat lpd-sat--follower lpd-float lpd-float--mid2">
        <div className="lpd-sat-head">
          <span className="lpd-avatar lpd-avatar--b lpd-avatar--sm">K</span>
          <span className="lpd-sat-title">New follower</span>
        </div>
        <p className="lpd-sat-body">
          &quot;Appreciate you walking through the reasoning — good to know the strategy isn&apos;t
          chasing the dip.&quot;
        </p>
        <div className="lpd-sat-foot">
          <i className="bi bi-heart-fill lpd-heart" aria-hidden />{' '}
          <span className="lpd-t lpd-mono">{likes}</span>
          <span className="lpd-mono lpd-dim"> · Katherine C. started copying you</span>
        </div>
      </div>

      <div className="lpd-sat lpd-sat--rebalance lpd-float lpd-float--slow2">
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
  );
}

export default HeroDeviceShowcase;
