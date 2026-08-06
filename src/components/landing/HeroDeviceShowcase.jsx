'use client';

import { useEffect, useState } from 'react';
import './hero-device-showcase.css';

/**
 * Hero device showcase — the social copy-trading composition that replaces the
 * old floating portfolio card on the right side of the landing hero.
 *
 * Three stacked layers over the dotted map:
 *   · MacBook (behind, tilted): institutions leaderboard with a cycling
 *     highlight row.
 *   · Phone (foreground): Discover feed — copyable investors with Follow
 *     buttons, a Capitol Watch disclosure card, and a rolling activity feed.
 *   · Three glass satellite cards: Auto-copy synced, New follower, Rebalance.
 *
 * One integer `tick` (2000ms) drives every stateful frame, derived
 * deterministically (seeded sin, no Math.random) so SSR and the first client
 * render match. `.lpd-t` children transition BETWEEN frames rather than snap.
 * prefers-reduced-motion ⇒ tick stays 0 and CSS kills the float loops.
 *
 * Entirely decorative marketing content — fictional names only, aria-hidden,
 * pointer-events: none so it can never intercept hero CTA clicks.
 */

function seeded(n) {
  const x = Math.sin(n * 12.9898 + 4.1) * 43758.5453;
  return x - Math.floor(x);
}

/* ── Fictional people to copy (phone avatar row) ── */
const PEOPLE = [
  { id: 'p1', name: 'Taylor J.', cap: '$1.2M', copiers: '1.5K', hue: 'a' },
  { id: 'p2', name: 'Beth C.', cap: '$13.4K', copiers: '24K', hue: 'b' },
  { id: 'p3', name: 'Tarcis M.', cap: '$85.1K', copiers: '9.2K', hue: 'c' },
  { id: 'p4', name: 'Joy Chen', cap: '$2.4K', copiers: '895', hue: 'd' },
];

/* ── Rolling activity feed (phone) ── */
const FEED = [
  { id: 'f1', who: 'Beth C.', what: 'rebalanced', when: '3m' },
  { id: 'f2', who: 'Rep. Whitfield', what: 'filed a disclosure', when: '12m' },
  { id: 'f3', who: 'Meridian Cap', what: 'updated 13F', when: '31m' },
  { id: 'f4', who: 'Taylor J.', what: 'opened NVDA', when: '48m' },
  { id: 'f5', who: 'Joy Chen', what: 'started copying you', when: '1h' },
];

/* ── Institutions leaderboard (MacBook) — fictional funds ── */
const FUNDS = [
  { id: 'i1', name: 'MERIDIAN CAP', delta: '+4.2%' },
  { id: 'i2', name: 'ATLAS GLOBAL', delta: '+2.8%' },
  { id: 'i3', name: 'NORTHWALL', delta: '+1.9%' },
  { id: 'i4', name: 'VANTAGE AM', delta: '−0.7%' },
];

function Spark({ seed, up = true }) {
  const pts = Array.from({ length: 9 }, (_, i) => {
    const y = 14 - (up ? i * 1.1 : -i * 0.6) - 5 * seeded(seed * 7 + i * 3);
    return `${i * 8},${Math.max(2, Math.min(18, y)).toFixed(1)}`;
  }).join(' ');
  return (
    <svg viewBox="0 0 64 20" className="lpd-spark" aria-hidden>
      <polyline points={pts} className={`lpd-t ${up ? 'lpd-spark-up' : 'lpd-spark-down'}`} />
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

  const followed = tick % (PEOPLE.length + 1); // 0..4: how many read "Following"
  const activeFund = tick % FUNDS.length;
  const likes = 12 + (tick % 6);
  const filedMin = 2 + (tick % 4);

  return (
    <div className="lpd-stack" aria-hidden="true">
      {/* ── Layer 1: MacBook (behind) ── */}
      <div className="lpd-mac lpd-float lpd-float--slow">
        <div className="lpd-mac-screen">
          <div className="lpd-mac-chrome">
            <i className="lpd-dot" />
            <i className="lpd-dot" />
            <i className="lpd-dot" />
            <span className="lpd-mac-url">ezana.world/discover/institutions</span>
          </div>
          <div className="lpd-mac-body">
            <div className="lpd-mac-title">Institutions you can follow</div>
            {FUNDS.map((f, i) => {
              const up = !f.delta.startsWith('−');
              return (
                <div key={f.id} className={`lpd-t lpd-fund${i === activeFund ? ' is-active' : ''}`}>
                  <span className="lpd-fund-rank">{String(i + 1).padStart(2, '0')}</span>
                  <span className="lpd-fund-name">{f.name}</span>
                  <Spark seed={tick + i * 11} up={up} />
                  <span className={`lpd-fund-delta ${up ? 'lpd-pos' : 'lpd-neg'}`}>{f.delta}</span>
                  <span className={`lpd-t lpd-follow-mini${i === activeFund ? ' is-on' : ''}`}>
                    {i === activeFund ? 'Following' : 'Follow'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
        <div className="lpd-mac-base" />
      </div>

      {/* ── Layer 2: Phone (foreground) ── */}
      <div className="lpd-phone lpd-float lpd-float--mid">
        <div className="lpd-phone-notch" />
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
                <span className="lpd-person-meta">
                  {p.cap} · {p.copiers}
                </span>
                <span className={`lpd-t lpd-follow${i < followed ? ' is-on' : ''}`}>
                  {i < followed ? 'Following' : 'Follow'}
                </span>
              </div>
            ))}
          </div>

          <div className="lpd-label">Capitol Watch</div>
          <div className="lpd-disclosure">
            <span className="lpd-avatar lpd-avatar--gov">W</span>
            <div className="lpd-disc-main">
              <span className="lpd-disc-name">Rep. A. Whitfield</span>
              <span className="lpd-disc-line">
                Bought <b className="lpd-mono">NVDA</b>{' '}
                <span className="lpd-mono lpd-dim">$100K–250K</span>
              </span>
              <span className="lpd-t lpd-disc-when lpd-mono">filed {filedMin}m ago</span>
            </div>
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
