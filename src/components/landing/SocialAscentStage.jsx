/**
 * SocialAscentStage: the pinned "climb" that opens the Social investing
 * section. A tall runway pins the stage; scroll progress through the runway
 * decides how many steps have landed, and the gauge tweens to the rating those
 * steps add up to. Each step pops in as a card on its side of the gauge.
 *
 * Presentational. The section owns the fixture: steps (points read from the
 * ledger pool), the start rating, and the gauge's floor and ceiling. The
 * figure, arc, needle, tier and "to first" all derive from one number, so they
 * cannot disagree.
 *
 * Composed frame (SSR, no JS, prefers-reduced-motion): every step landed, the
 * final rating shown, nothing pinned.
 */

'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { deriveTierState } from './social-rating';

const DOT = '·';

/* Gauge geometry, in viewBox units (560 x 300). */
const CX = 280;
const CY = 286;
const R_ARC = 236;
const R_RING = 178;
const ARC = `M ${CX - R_ARC} ${CY} A ${R_ARC} ${R_ARC} 0 0 1 ${CX + R_ARC} ${CY}`;
const RING = `M ${CX - R_RING} ${CY} A ${R_RING} ${R_RING} 0 0 1 ${CX + R_RING} ${CY}`;

/* Steps land between these runway fractions; the tail is a hold. */
const REVEAL_FROM = 0.06;
const REVEAL_TO = 0.84;
const TWEEN_MS = 450;

const clamp01 = (n) => (n < 0 ? 0 : n > 1 ? 1 : n);
const easeOut = (t) => 1 - (1 - t) ** 3;

function pointAt(pct, r) {
  const a = Math.PI * (1 - pct / 100);
  return { x: CX + r * Math.cos(a), y: CY - r * Math.sin(a) };
}

export default function SocialAscentStage({ steps, start, floor, ceiling, ceilingLabel }) {
  const rootRef = useRef(null);
  const n = steps.length;

  const cum = useMemo(() => {
    const out = [start];
    steps.forEach((s) => out.push(out[out.length - 1] + s.points));
    return out;
  }, [steps, start]);

  const thresholds = useMemo(
    () => steps.map((_, i) => REVEAL_FROM + (n > 1 ? i / (n - 1) : 0) * (REVEAL_TO - REVEAL_FROM)),
    [steps, n],
  );

  const [reached, setReached] = useState(n);
  const [shown, setShown] = useState(cum[n]);
  const [live, setLive] = useState(false);
  const shownRef = useRef(cum[n]);
  const snapRef = useRef(false);

  /* Scroll progress -> steps landed. Never runs under reduced motion. */
  useEffect(() => {
    const el = rootRef.current;
    if (!el || typeof window === 'undefined') return undefined;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined;
    const stacked = window.matchMedia('(max-width: 760px)');
    let raf = 0;

    const measure = () => {
      raf = 0;
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight || 1;
      let p;
      if (stacked.matches) {
        p = clamp01((vh * 0.85 - r.top) / Math.max(1, r.height));
      } else {
        const run = r.height - vh;
        p = run > 0 ? clamp01(-r.top / run) : 1;
      }
      let k = 0;
      while (k < n && p >= thresholds[k]) k += 1;
      setReached(k);
    };
    const onScroll = () => {
      if (!raf) raf = window.requestAnimationFrame(measure);
    };

    /* The first measurement snaps instead of tweening, so a reload mid-page
       never shows the figure counting backwards. */
    snapRef.current = true;
    setLive(true);
    measure();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    stacked.addEventListener?.('change', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      stacked.removeEventListener?.('change', onScroll);
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, [n, thresholds]);

  /* Tween the figure to the landed total. The arc and needle read the same
     number, so all three move together with no CSS transition of their own. */
  const target = cum[reached];
  useEffect(() => {
    const from = shownRef.current;
    if (!live || snapRef.current || from === target) {
      /* Only clear the snap once live: on mount this effect runs before the
         render that turns live on, and must not eat the snap flag. */
      if (live) snapRef.current = false;
      shownRef.current = target;
      setShown(target);
      return undefined;
    }
    let raf = 0;
    let t0 = 0;
    const tick = (now) => {
      if (!t0) t0 = now;
      const t = clamp01((now - t0) / TWEEN_MS);
      const v = Math.round(from + (target - from) * easeOut(t));
      shownRef.current = v;
      setShown(v);
      if (t < 1) raf = window.requestAnimationFrame(tick);
    };
    raf = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(raf);
  }, [target, live]);

  const pct = clamp01((shown - floor) / (ceiling - floor)) * 100;
  const tier = deriveTierState(shown).current.name;
  const toFirst = Math.max(0, ceiling - shown);
  const needleIn = pointAt(pct, R_RING - 2);
  const needleOut = pointAt(pct, R_ARC + 22);
  const latest = live && reached > 0 ? steps[reached - 1] : null;

  const side = (which) =>
    steps.map((s, i) =>
      s.side === which ? (
        <li
          key={s.id}
          className={[
            'sled-asc-card',
            i < reached && 'is-in',
            live && i === reached - 1 && 'is-latest',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <i className={`bi ${s.icon} sled-asc-icon`} aria-hidden="true" />
          <span className="sled-asc-text">
            <span className="sled-asc-label">{s.label}</span>
            <span className="sled-asc-event">{s.event}</span>
          </span>
          <span className="sled-asc-pts">+{s.points}</span>
        </li>
      ) : null,
    );

  return (
    <div
      ref={rootRef}
      className={`sled-asc${live ? ' is-live' : ''}`}
      style={{ '--sled-asc-steps': n }}
    >
      <div className="sled-asc-stage">
        <div className="sled-asc-grid">
          <ul className="sled-asc-col sled-asc-col--left" aria-label="Ways to climb">
            {side('left')}
          </ul>

          <div className="sled-asc-gauge">
            <p className="sled-asc-cap">Season 4 climb {DOT} you vs. first place</p>
            <div className="sled-asc-dial">
              <div
                className="sled-asc-halo"
                aria-hidden="true"
                style={{ opacity: 0.45 + (pct / 100) * 0.55 }}
              />
              <svg
                viewBox="0 0 560 300"
                role="img"
                aria-label={`Season 4 rating ${shown}, ${toFirst} behind first place`}
              >
                <defs>
                  <linearGradient id="sledAscFill" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" style={{ stopColor: 'var(--emerald-dark)' }} />
                    <stop offset="100%" style={{ stopColor: 'var(--emerald)' }} />
                  </linearGradient>
                </defs>
                <path className="sled-asc-track" d={ARC} />
                <path
                  className="sled-asc-fill"
                  d={ARC}
                  pathLength="100"
                  strokeDasharray={`${pct.toFixed(2)} 100`}
                />
                <path className="sled-asc-ring" d={RING} />
                <line
                  className="sled-asc-needle"
                  x1={needleIn.x.toFixed(2)}
                  y1={needleIn.y.toFixed(2)}
                  x2={needleOut.x.toFixed(2)}
                  y2={needleOut.y.toFixed(2)}
                />
              </svg>
              <div className="sled-asc-readout">
                {latest ? (
                  <span key={reached} className="sled-asc-bump" aria-hidden="true">
                    +{latest.points}
                  </span>
                ) : null}
                <span className="sled-asc-figure">{shown}</span>
                <span className="sled-asc-meta">
                  {tier} {DOT} {toFirst ? `${toFirst} to first` : 'First place'}
                </span>
              </div>
            </div>
            <div className="sled-asc-range" aria-hidden="true">
              <span>{floor}</span>
              <span>{ceilingLabel}</span>
            </div>
          </div>

          <ul className="sled-asc-col sled-asc-col--right" aria-label="More ways to climb">
            {side('right')}
          </ul>
        </div>
      </div>
    </div>
  );
}
