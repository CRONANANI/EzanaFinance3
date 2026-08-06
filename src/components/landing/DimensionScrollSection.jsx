'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DATASET_TAXONOMY } from '@/lib/datasets/taxonomy';
import { PortfolioSignalCard } from './PortfolioSignalCard';
import { DimensionVisual } from './dimension-visuals';
import './dimension-scroll.css';
import './portfolio-signal-card.css';

/**
 * Pinned "Seven dimensions" section.
 *
 * DESKTOP: a tall `.dscroll-track` holds a `position: sticky` stage. The stage
 * pins under the navbar and the page keeps scrolling THROUGH the track; scroll
 * progress across the track maps to an active index 0..6, and the right column
 * shows exactly ONE dimension card at a time (previous lifts out, next rises
 * in). The left column — heading + the "Your portfolio" card — never moves.
 *
 * MOBILE (<1024px) and prefers-reduced-motion: pinning is dropped entirely and
 * the same content renders as a normal stacked list. Scroll-jacking on a phone
 * is hostile, and pinning is itself vestibular motion for reduced-motion users.
 *
 * The dimensions, labels, taglines, blurbs, colors, and source names all come
 * from the shared DATASET_TAXONOMY — this component adds NO new source of truth.
 * The only thing defined locally is the Bootstrap icon per dimension.
 */

/* Bootstrap Icons only (branding guide §10). Keyed by taxonomy id. */
const DIMENSION_ICONS = {
  capitol: 'bi-bank',
  titans: 'bi-buildings',
  eyes: 'bi-broadcast-pin',
  whispers: 'bi-chat-square-dots',
  hive: 'bi-people',
  lighthouse: 'bi-globe2',
  regulatory: 'bi-file-earmark-ruled',
};

/* How much page scroll each dimension holds the stage for, as a fraction of the
   viewport height. Lower = faster swaps. 0.62 ≈ a comfortable read per card. */
const HOLD_VH = 0.62;

export function DimensionScrollSection() {
  const dims = DATASET_TAXONOMY;
  const steps = dims.length;

  const rootRef = useRef(null);
  const trackRef = useRef(null);
  const stageRef = useRef(null);

  const [active, setActive] = useState(0);
  const [tick, setTick] = useState(0);
  const [unpinned, setUnpinned] = useState(true); // SSR-safe default: stacked
  const [seen, setSeen] = useState(() => new Set([0]));

  /* ── Measure the real navbar height so the stage pins flush beneath it ──
     The landing navbar is `position: sticky; top: 0` in normal flow, so a
     nested sticky element must offset by its height or it renders underneath. */
  useEffect(() => {
    const root = rootRef.current;
    if (!root || typeof window === 'undefined') return undefined;
    const measure = () => {
      const nav = document.querySelector('.navbar-sticky') || document.querySelector('.navbar');
      const h = nav ? Math.round(nav.getBoundingClientRect().height) : 80;
      root.style.setProperty('--dscroll-nav', `${h || 80}px`);
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  /* ── Decide pinned vs stacked ── */
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined;
    const narrow = window.matchMedia('(max-width: 1023px)');
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => setUnpinned(narrow.matches || reduce.matches);
    apply();
    narrow.addEventListener('change', apply);
    reduce.addEventListener('change', apply);
    return () => {
      narrow.removeEventListener('change', apply);
      reduce.removeEventListener('change', apply);
    };
  }, []);

  /* ── Scroll driver (pinned mode only), rAF-throttled + passive ── */
  useEffect(() => {
    if (unpinned || typeof window === 'undefined') return undefined;
    let raf = 0;
    const read = () => {
      raf = 0;
      const track = trackRef.current;
      const stage = stageRef.current;
      if (!track || !stage) return;
      const rect = track.getBoundingClientRect();
      const runway = rect.height - stage.offsetHeight;
      if (runway <= 0) return;
      // `rect.top` already accounts for the sticky offset; `stage.offsetTop` is
      // the stage's offset inside the track (0 here, but kept so top padding on
      // the track later stays correct).
      const scrolled = -rect.top + (stage.offsetTop || 0);
      const p = Math.min(1, Math.max(0, scrolled / runway));
      const next = Math.min(steps - 1, Math.floor(p * steps));
      setActive((prev) => (prev === next ? prev : next));
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(read);
    };
    read();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [unpinned, steps]);

  /* ── Stacked mode: reveal + animate cards only once they're on screen ── */
  useEffect(() => {
    if (!unpinned || typeof window === 'undefined') return undefined;
    if (typeof IntersectionObserver === 'undefined') {
      setSeen(new Set(dims.map((_, i) => i)));
      return undefined;
    }
    const nodes = Array.from(rootRef.current?.querySelectorAll('[data-dscroll-index]') || []);
    const io = new IntersectionObserver(
      (entries) => {
        const add = entries
          .filter((e) => e.isIntersecting)
          .map((e) => Number(e.target.getAttribute('data-dscroll-index')));
        if (add.length) setSeen((prev) => new Set([...prev, ...add]));
      },
      { threshold: 0.25 },
    );
    nodes.forEach((n) => io.observe(n));
    return () => io.disconnect();
  }, [unpinned, dims]);

  /* ── One shared 2s tick, paused when nothing is on screen or motion is off ── */
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const id = setInterval(() => setTick((t) => t + 1), 2000);
    return () => clearInterval(id);
  }, []);

  /* ── Rail click → scroll to that step ── */
  const goTo = useCallback(
    (i) => {
      const track = trackRef.current;
      const stage = stageRef.current;
      if (!track || !stage || unpinned) return;
      const runway = track.offsetHeight - stage.offsetHeight;
      const top = track.offsetTop + (runway * (i + 0.5)) / steps;
      window.scrollTo({ top, behavior: 'smooth' });
    },
    [unpinned, steps],
  );

  const activeDim = dims[active] || dims[0];
  const trackStyle = useMemo(
    () => ({ '--dscroll-steps': steps, '--dscroll-hold': `${HOLD_VH}` }),
    [steps],
  );

  return (
    <section
      className={`dimension-scroll-section${unpinned ? ' dscroll--stacked' : ''}`}
      id="dimensions"
      ref={rootRef}
    >
      <div className="dscroll-track" ref={trackRef} style={trackStyle}>
        <div className="dscroll-stage" ref={stageRef}>
          <div className="dscroll-inner">
            {/* ── Left: constant ── */}
            <div className="dscroll-left">
              <p className="dscroll-eyebrow">Portfolio intelligence</p>
              <h2 className="dscroll-title">Your portfolio, read seven ways.</h2>
              <p className="dscroll-sub">
                One holding is never one story. Ezana reads every position against seven independent
                dimensions of evidence — then weighs them against how you actually invest.
              </p>
              <PortfolioSignalCard
                activeLabel={unpinned ? null : activeDim.label}
                activeColor={activeDim.color}
              />
            </div>

            {/* ── Right: one dimension at a time ── */}
            <div className="dscroll-right">
              <ol className="dscroll-rail" aria-label="Seven dataset dimensions">
                {dims.map((d, i) => (
                  <li key={d.id}>
                    <button
                      type="button"
                      className={`dscroll-rail-btn${i === active ? ' is-active' : ''}`}
                      style={{ '--dscroll-accent': d.color }}
                      aria-current={i === active ? 'true' : undefined}
                      onClick={() => goTo(i)}
                    >
                      <span className="dscroll-rail-num">{String(i + 1).padStart(2, '0')}</span>
                      <span className="dscroll-rail-label">{d.label}</span>
                    </button>
                  </li>
                ))}
              </ol>

              <div className="dscroll-viewport">
                {dims.map((d, i) => {
                  const isActive = unpinned ? seen.has(i) : i === active;
                  const state = unpinned
                    ? seen.has(i)
                      ? 'in'
                      : 'down'
                    : i === active
                      ? 'in'
                      : i < active
                        ? 'up'
                        : 'down';
                  return (
                    <article
                      key={d.id}
                      data-dscroll-index={i}
                      className={`dscroll-card dscroll-card--${state}`}
                      style={{ '--dv-accent': d.color }}
                      aria-hidden={state === 'in' ? undefined : 'true'}
                    >
                      <header className="dscroll-card-head">
                        <span className="dscroll-card-icon" aria-hidden>
                          <i className={`bi ${DIMENSION_ICONS[d.id] || 'bi-circle'}`} />
                        </span>
                        <span className="dscroll-card-corner">{d.corner}</span>
                        <span className="dscroll-card-index">
                          {String(i + 1).padStart(2, '0')}/07
                        </span>
                      </header>

                      <h3 className="dscroll-card-title">{d.label}</h3>
                      <p className="dscroll-card-tagline">{d.tagline}</p>

                      <div className="dscroll-card-viz">
                        <DimensionVisual dimensionId={d.id} tick={isActive ? tick : 0} />
                      </div>

                      <p className="dscroll-card-blurb">{d.blurb}</p>

                      <ul className="dscroll-card-sources">
                        {d.items.slice(0, 4).map((it) => (
                          <li key={it.label} className="dscroll-source">
                            {it.label}
                            {it.live ? null : <em className="dscroll-soon">soon</em>}
                          </li>
                        ))}
                      </ul>
                    </article>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default DimensionScrollSection;
