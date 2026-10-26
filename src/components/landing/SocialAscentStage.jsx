/**
 * SocialAscentStage: the pinned "climb" that opens the Social investing
 * section. A tall runway pins the stage; scroll progress through the runway
 * decides how many steps have landed, and the gauge tweens to the rating those
 * steps add up to. Each step pops in as a card on its side of the gauge.
 *
 * Oct 25: the promotion. When the climb crosses a tier line on the platform
 * ladder (social-rating.js, the real ELO tiers) and the visitor keeps
 * scrolling toward the end of the runway, the gauge fills, a short
 * celebration plays, and the gauge resets to the start of the new tier's band
 * (Strategist at 2500, 2500 to Tactician). The earned step cards then give way
 * to the next league's tasks (nextTasks), which land one by one on further
 * scroll. Scrolling back up demotes instantly, with no celebration. If the
 * climb crosses no tier line, the stage behaves exactly as before.
 *
 * Presentational. The section owns the fixture: steps (points read from the
 * ledger pool), the start rating, the gauge's floor and ceiling, and the
 * next league's tasks. The figure, arc, needle, tier and "to {next tier}"
 * all derive from one number, so they cannot disagree.
 *
 * Oct 26: the gauge measures the climb to the next tier, not to first place.
 * Its ceiling is the tier line the climb is heading for (Strategist at 2500),
 * so the meta reads "Apprentice · 52 to Strategist" at the start and the arc
 * is full exactly when the climb reaches the line. The promotion therefore
 * starts from a full arc: the fill phase holds it full (a pulse rather than a
 * sweep) while the burst plays.
 *
 * Composed frame (SSR, no JS, prefers-reduced-motion): the end of the runway.
 * With a promotion that is the new tier, gauge at its start, every task
 * shown, no celebration; without one, every step landed.
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

/* Runway fractions. Without a promotion the steps use the whole run, as
   before; with one, the steps land in the first half, the promotion fires at
   PROMO.at and the next league's tasks land after it. The tail is a hold. */
const PLAIN = { from: 0.06, to: 0.84 };
const PROMO = { from: 0.05, to: 0.5, at: 0.6, tasksFrom: 0.68, tasksTo: 0.9 };
const TWEEN_MS = 450;

/* The celebration timeline, in ms from the crossing: the arc fills to the
   end, holds while the burst plays, then sweeps back to the new tier's start. */
const FILL_MS = 350;
const HOLD_MS = 900;
const RESET_MS = 1500;

/* The burst: fixed angles and distances (no Math.random, so server and
   client agree), alternating three ink roles. */
const BURST = Array.from({ length: 18 }, (_, i) => ({
  a: (360 / 18) * i + (i % 2 ? 6 : -4),
  d: 92 + ((i * 37) % 5) * 14,
  tone: ['a', 'b', 'c'][i % 3],
  s: 6 + ((i * 13) % 3) * 2,
}));

const clamp01 = (n) => (n < 0 ? 0 : n > 1 ? 1 : n);
const easeOut = (t) => 1 - (1 - t) ** 3;
const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

function pointAt(pct, r) {
  const a = Math.PI * (1 - pct / 100);
  return { x: CX + r * Math.cos(a), y: CY - r * Math.sin(a) };
}

const spread = (count, from, to) =>
  Array.from({ length: count }, (_, i) => from + (count > 1 ? i / (count - 1) : 0) * (to - from));

export default function SocialAscentStage({
  steps,
  start,
  floor,
  ceiling,
  ceilingLabel,
  nextTasks = [],
}) {
  const rootRef = useRef(null);
  const stageRef = useRef(null);
  const gridRef = useRef(null);
  const n = steps.length;
  const m = nextTasks.length;

  const cum = useMemo(() => {
    const out = [start];
    steps.forEach((s) => out.push(out[out.length - 1] + s.points));
    return out;
  }, [steps, start]);

  /* Does the climb cross a line on the real ladder? */
  const promo = useMemo(() => {
    const before = deriveTierState(cum[0]);
    const after = deriveTierState(cum[n]);
    if (before.current.id === after.current.id || !m) return null;
    return { from: before.current, to: after.current };
  }, [cum, n, m]);

  const plan = promo ? PROMO : PLAIN;
  const stepAt = useMemo(() => spread(n, plan.from, plan.to), [n, plan]);
  const taskAt = useMemo(
    () => (promo ? spread(m, PROMO.tasksFrom, PROMO.tasksTo) : []),
    [promo, m],
  );

  /* Composed state: the end of the runway. */
  const [reached, setReached] = useState(n);
  const [promoted, setPromoted] = useState(Boolean(promo));
  const [tasksIn, setTasksIn] = useState(promo ? m : 0);
  const [shown, setShown] = useState(cum[n]);
  const [live, setLive] = useState(false);
  /* A pct override while the celebration timeline runs; null otherwise. */
  const [sweep, setSweep] = useState(null);
  const [celebrating, setCelebrating] = useState(false);
  const shownRef = useRef(cum[n]);
  const snapRef = useRef(false);
  const promotedRef = useRef(Boolean(promo));

  /* Scroll progress -> steps landed, promotion, tasks landed. Never runs
     under reduced motion. */
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
      while (k < n && p >= stepAt[k]) k += 1;
      setReached(k);
      if (promo) {
        const isPromoted = k === n && p >= PROMO.at;
        setPromoted(isPromoted);
        let t = 0;
        while (isPromoted && t < m && p >= taskAt[t]) t += 1;
        setTasksIn(t);
      }
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
  }, [n, m, stepAt, taskAt, promo]);

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

  /* Where the arc sits at the end of the climb, in the climb's band: the
     celebration fills from here (100 when the ceiling is the tier line, so
     the fill phase is a held, full arc). */
  const prePct = clamp01((cum[n] - floor) / (ceiling - floor)) * 100;

  /* The celebration: only on a live, forward crossing. The composed state
     starts promoted, so the first measurement (a reload mid-page) never
     plays it, and demotion (scrolling back up) never does either. */
  useEffect(() => {
    const was = promotedRef.current;
    promotedRef.current = promoted;
    if (!live || !promo || !promoted || was) {
      setSweep(null);
      setCelebrating(false);
      return undefined;
    }
    let raf = 0;
    let t0 = 0;
    /* Seed the override now, so the first frame in the new mode shows the
       arc where the climb left it, never the new band's empty start. */
    setSweep(prePct);
    setCelebrating(true);
    const tick = (now) => {
      if (!t0) t0 = now;
      const e = now - t0;
      if (e < FILL_MS) setSweep(prePct + (100 - prePct) * easeOut(e / FILL_MS));
      else if (e < HOLD_MS) setSweep(100);
      else if (e < RESET_MS) {
        setSweep(100 * (1 - easeInOut((e - HOLD_MS) / (RESET_MS - HOLD_MS))));
      } else {
        setSweep(null);
        setCelebrating(false);
        return;
      }
      raf = window.requestAnimationFrame(tick);
    };
    raf = window.requestAnimationFrame(tick);
    return () => {
      window.cancelAnimationFrame(raf);
      setSweep(null);
      setCelebrating(false);
    };
  }, [promoted, live, promo, prePct]);

  /* The stage is a viewport tall while it pins, but its content is not, so
     the runway hands back the empty space below it (--sled-asc-slack, read as
     a negative bottom margin in social-ledger.css): the board starts right
     under the gauge instead of half a screen later. Zero when the stage is
     not pinned (stacked phones, reduced motion), where stage = content. */
  useEffect(() => {
    const root = rootRef.current;
    const stage = stageRef.current;
    const grid = gridRef.current;
    if (!root || !stage || !grid || typeof ResizeObserver === 'undefined') return undefined;
    const apply = () => {
      /* Top-aligned stage (social-ledger.css): everything under the content
         is empty, less the stage's own top padding. */
      const padTop = parseFloat(getComputedStyle(stage).paddingTop) || 0;
      const slack = Math.max(0, stage.clientHeight - padTop - grid.offsetHeight);
      root.style.setProperty('--sled-asc-slack', `${Math.round(slack)}px`);
    };
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(stage);
    ro.observe(grid);
    return () => ro.disconnect();
  }, []);

  /* The band the gauge is showing: the climb's band before the promotion, the new
     tier's own band (its min to the next tier's min) after it. */
  const inNewTier = Boolean(promo && promoted);
  const tierState = deriveTierState(shown);
  const { current, next } = tierState;
  let bandPct;
  if (!inNewTier) bandPct = clamp01((shown - floor) / (ceiling - floor)) * 100;
  else if (next) bandPct = clamp01((shown - current.min) / (next.min - current.min)) * 100;
  else bandPct = 100;
  const pct = sweep ?? bandPct;
  const tier = current.name;
  /* Before the promotion the gauge is heading for the first tier above the
     climb's start (the ceiling), whatever tier the figure is in right now. */
  const goal = deriveTierState(cum[0]).next;
  const needleIn = pointAt(pct, R_RING - 2);
  const needleOut = pointAt(pct, R_ARC + 22);
  const latest = live && !inNewTier && reached > 0 ? steps[reached - 1] : null;
  const nextName = (inNewTier ? next : goal)?.name || 'the top';

  let meta;
  let cap;
  let rangeL;
  let rangeR;
  let aria;
  if (inNewTier) {
    meta = next ? `${tier} ${DOT} ${tierState.toGo} to ${next.name}` : `${tier} ${DOT} Top tier`;
    cap = `${tier} league ${DOT} next, ${nextName}`;
    rangeL = current.min;
    rangeR = next ? `${next.min} ${DOT} ${next.name}` : '';
    aria = `Promoted to ${tier} at ${shown}${next ? `, ${tierState.toGo} to ${next.name}` : ''}`;
  } else {
    const toNext = goal ? Math.max(0, goal.min - shown) : 0;
    meta = goal
      ? `${tier} ${DOT} ${toNext ? `${toNext} to ${goal.name}` : 'Tier reached'}`
      : `${tier} ${DOT} Top tier`;
    cap = `Season 4 climb ${DOT} next, ${nextName}`;
    rangeL = floor;
    rangeR = ceilingLabel;
    aria = `Season 4 rating ${shown}${goal ? `, ${toNext} to ${goal.name}` : ''}`;
  }

  const stepCards = (which) =>
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

  const taskCards = (which) =>
    nextTasks.map((t, i) =>
      t.side === which ? (
        <li
          key={t.id}
          className={[
            'sled-asc-card',
            'sled-asc-card--task',
            i < tasksIn && 'is-in',
            live && i === tasksIn - 1 && 'is-latest',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <i className={`bi ${t.icon} sled-asc-icon`} aria-hidden="true" />
          <span className="sled-asc-text">
            <span className="sled-asc-label">{t.label}</span>
            <span className="sled-asc-event">{t.detail}</span>
          </span>
          <span className="sled-asc-todo">To do</span>
        </li>
      ) : null,
    );

  const side = (which) => (inNewTier ? taskCards(which) : stepCards(which));

  return (
    <div
      ref={rootRef}
      className={[
        'sled-asc',
        live && 'is-live',
        promo && 'has-promo',
        inNewTier && 'is-promoted',
        celebrating && 'is-celebrating',
      ]
        .filter(Boolean)
        .join(' ')}
      style={{ '--sled-asc-steps': n, '--sled-asc-extra': promo ? m : 0 }}
    >
      <div ref={stageRef} className="sled-asc-stage">
        <div ref={gridRef} className="sled-asc-grid">
          {/* Keyed on the mode, so the task cards mount fresh (hidden) and
              land with the same entrance the step cards use. */}
          <ul
            key={inNewTier ? 'tasks-l' : 'steps-l'}
            className="sled-asc-col sled-asc-col--left"
            aria-label={inNewTier ? `To reach ${nextName}` : 'Ways to climb'}
          >
            {side('left')}
          </ul>

          <div className="sled-asc-gauge">
            <p className="sled-asc-cap">{cap}</p>
            <div className="sled-asc-dial">
              <div
                className="sled-asc-halo"
                aria-hidden="true"
                style={{ opacity: 0.45 + (pct / 100) * 0.55 }}
              />
              <svg viewBox="0 0 560 300" role="img" aria-label={aria}>
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

              {/* The celebration: a ring pulse and a burst from the readout,
                  mounted only while it plays. Decorative. */}
              {celebrating ? (
                <div className="sled-asc-burst" aria-hidden="true">
                  <span className="sled-asc-pulse" />
                  {BURST.map((b, i) => (
                    <span
                      key={i}
                      className={`sled-asc-spark sled-asc-spark--${b.tone}`}
                      style={{ '--a': `${b.a}deg`, '--d': `${b.d}px`, '--s': `${b.s}px` }}
                    />
                  ))}
                </div>
              ) : null}

              <div className="sled-asc-readout">
                {inNewTier ? (
                  <span className="sled-asc-badge" role="status">
                    <i className="bi bi-stars" aria-hidden="true" />
                    Promoted {DOT} {tier}
                  </span>
                ) : latest ? (
                  <span key={reached} className="sled-asc-bump" aria-hidden="true">
                    +{latest.points}
                  </span>
                ) : null}
                <span className="sled-asc-figure">{shown}</span>
                <span className="sled-asc-meta">{meta}</span>
              </div>
            </div>
            <div className="sled-asc-range" aria-hidden="true">
              <span>{rangeL}</span>
              <span>{rangeR}</span>
            </div>
          </div>

          <ul
            key={inNewTier ? 'tasks-r' : 'steps-r'}
            className="sled-asc-col sled-asc-col--right"
            aria-label={inNewTier ? 'More tasks for the next league' : 'More ways to climb'}
          >
            {side('right')}
          </ul>
        </div>
      </div>
    </div>
  );
}
