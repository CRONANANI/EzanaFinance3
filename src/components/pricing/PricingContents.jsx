'use client';

/**
 * Contents menu for /pricing (Nov 21), modelled on the Ezana Echo article
 * rail: a CONTENTS eyebrow over the page's sections, the current one in
 * emerald with an emerald left rule.
 *
 * It lives in the top-left corner. Where the viewport leaves room beside the
 * 1280px page (1760px and up) the list stays open as a rail; below that it
 * is a "Contents" button that opens the same list as a panel, which closes on
 * a pick, Escape or a click outside.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import './pricing-contents.css';

const RAIL_QUERY = '(min-width: 1760px)';

export default function PricingContents({ sections }) {
  const [active, setActive] = useState(sections[0]?.id || null);
  const [open, setOpen] = useState(false);
  const [rail, setRail] = useState(false);
  const rootRef = useRef(null);

  /* Rail or button, by viewport width. */
  useEffect(() => {
    const mq = window.matchMedia(RAIL_QUERY);
    const sync = () => setRail(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  /* The current section: the last one whose top has passed 30% of the
     viewport, so a section takes over once it fills the reading area. */
  useEffect(() => {
    let frame = 0;
    const measure = () => {
      frame = 0;
      const line = window.innerHeight * 0.3;
      let current = sections[0]?.id || null;
      for (const s of sections) {
        const el = document.getElementById(s.id);
        if (el && el.getBoundingClientRect().top <= line) current = s.id;
      }
      /* At the very bottom the last section is current even if it is short. */
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) {
        current = sections[sections.length - 1]?.id || current;
      }
      setActive(current);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [sections]);

  /* Escape and outside clicks close the panel. */
  useEffect(() => {
    if (!open || rail) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    const onDown = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onDown);
    };
  }, [open, rail]);

  const go = useCallback(
    (e, id) => {
      const el = document.getElementById(id);
      if (!el) return;
      e.preventDefault();
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
      history.replaceState(null, '', `#${id}`);
      setActive(id);
      if (!rail) setOpen(false);
    },
    [rail],
  );

  const showList = rail || open;

  return (
    <nav
      ref={rootRef}
      className={`pricing-contents${rail ? ' is-rail' : ''}${open ? ' is-open' : ''}`}
      aria-label="Pricing page contents"
    >
      {rail ? null : (
        <button
          type="button"
          className="pricing-contents-toggle"
          aria-expanded={open}
          aria-controls="pricing-contents-list"
          onClick={() => setOpen((v) => !v)}
        >
          <i className={`bi ${open ? 'bi-x-lg' : 'bi-list-ul'}`} aria-hidden="true" />
          Contents
        </button>
      )}
      {showList ? (
        <div className="pricing-contents-panel" id="pricing-contents-list">
          <p className="pricing-contents-head">Contents</p>
          <ul>
            {sections.map((s) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  className={active === s.id ? 'is-active' : undefined}
                  aria-current={active === s.id ? 'location' : undefined}
                  onClick={(e) => go(e, s.id)}
                >
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </nav>
  );
}
