'use client';

import { useEffect, useState } from 'react';
import './hero-device-showcase.css';

/**
 * Hero device showcase v2 — social copy-trading composition on the hero's
 * right side.
 *
 * v2 changes (screenshot review):
 *  · MacBook now has real laptop anatomy: bezel + camera, hinge, keyboard
 *    deck with key-grid and trackpad.
 *  · iPhone framing: Dynamic-Island bar at top, grey home-indicator pill at
 *    the BOTTOM; body is taller.
 *  · Capitol Watch disclosure row ~30% thinner (single-line).
 *  · Follow buttons are fixed-size in both states so toggling to "Following"
 *    can never reflow or overflow the phone.
 *  · Satellites repositioned so no card covers another card's content.
 *  · Laptop lists REAL 13F filers (BlackRock, Bridgewater, Citadel,
 *    Renaissance Tech, Vanguard). The metric shown is Ezana follower count —
 *    a platform metric — NEVER an invented performance % attributed to a
 *    real firm. Keep it that way.
 *
 * One 2s tick drives all frames deterministically (seeded sin, no
 * Math.random) so SSR and first client render match. Decorative only:
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

/* Real 13F filers users can follow on Ezana. `followers` is an Ezana platform
   metric (illustrative) — NOT a claim about the firm. Never show invented
   performance figures beside these names. */
const FUNDS = [
  { id: 'i1', name: 'BLACKROCK', followers: '31.2K' },
  { id: 'i2', name: 'BRIDGEWATER', followers: '24.8K' },
  { id: 'i3', name: 'CITADEL', followers: '19.5K' },
  { id: 'i4', name: 'RENAISSANCE TECH', followers: '17.1K' },
  { id: 'i5', name: 'VANGUARD', followers: '12.9K' },
];

function Spark({ seed }) {
  const pts = Array.from({ length: 9 }, (_, i) => {
    const y = 15 - i * 0.9 - 5 * seeded(seed * 7 + i * 3);
    return `${i * 8},${Math.max(2, Math.min(18, y)).toFixed(1)}`;
  }).join(' ');
  return (
    <svg viewBox="0 0 64 20" className="lpd-spark" aria-hidden>
      <polyline points={pts} className="lpd-t lpd-spark-line" />
    </svg>
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
  const activeFund = tick % FUNDS.length;
  const likes = 12 + (tick % 6);
  const filedMin = 2 + (tick % 4);

  return (
    <div className="lpd-stack" aria-hidden="true">
      {/* ── Layer 1: MacBook ── */}
      <div className="lpd-mac lpd-float lpd-float--slow">
        <div className="lpd-mac-lid">
          <span className="lpd-mac-cam" />
          <div className="lpd-mac-screen">
            <div className="lpd-mac-chrome">
              <i className="lpd-dot" />
              <i className="lpd-dot" />
              <i className="lpd-dot" />
              <span className="lpd-mac-url">ezana.world/discover/institutions</span>
            </div>
            <div className="lpd-mac-body">
              <div className="lpd-mac-title">Institutions you can follow</div>
              {FUNDS.map((f, i) => (
                <div key={f.id} className={`lpd-t lpd-fund${i === activeFund ? ' is-active' : ''}`}>
                  <span className="lpd-fund-rank">{String(i + 1).padStart(2, '0')}</span>
                  <span className="lpd-fund-name">{f.name}</span>
                  <Spark seed={tick + i * 11} />
                  <span className="lpd-fund-followers lpd-mono">{f.followers}</span>
                  <span
                    className={`lpd-t lpd-btn lpd-btn--mini${i === activeFund ? ' is-on' : ''}`}
                  >
                    <span className="lpd-btn-off">Follow</span>
                    <span className="lpd-btn-on">Following</span>
                  </span>
                </div>
              ))}
              <div className="lpd-mac-foot lpd-mono">SEC EDGAR · 13F-HR · quarterly</div>
            </div>
          </div>
        </div>
        <div className="lpd-mac-hinge" />
        <div className="lpd-mac-deck">
          <div className="lpd-mac-keys">
            {Array.from({ length: 42 }, (_, i) => (
              <i key={i} />
            ))}
          </div>
          <div className="lpd-mac-trackpad" />
        </div>
      </div>

      {/* ── Layer 2: iPhone ── */}
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
                    transform: `translateY(${slot * 32}px)`,
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
