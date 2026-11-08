'use client';

/**
 * SonarAnswerFrame (Nov 2026): the side navigation and the board beside it, for every Sonar
 * answer (the country board and the ping board on /datasets, the research board in a
 * standard or deep report). One vocabulary of twelve sections (lib/sonar/answer-sections),
 * plus Valuation on an answer about one listed company (`equity`):
 *
 *   - the five free sections the page has, clickable, the current one in emerald;
 *   - the seven deep sections: open when this is a deep research run on a Starter plan (or an
 *     org or partner seat); otherwise listed greyed out with a lock, legible but not
 *     clickable or focusable, and a call to action under them (sign up, get Starter, or run
 *     deep research, by who is reading).
 *
 * Wide container: a sticky column on the left. Narrow: a row of chips above the board.
 * Nov 7: `navTop` (a research run's Back and ping bar) sits at the top of that column, so the
 * run needs no full-width bar above the answer and the board starts at the top.
 * Scroll-spy reads the section anchors (`sa-<key>`) in the capture phase, so it works
 * whatever element scrolls. Styles: sonar-answer-frame.css (san-). Tokens only.
 */

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { VisuallyHidden } from '@/components/ds';
import { answerNav, activeKey } from '@/lib/sonar/answer-sections';
import './sonar-answer-frame.css';

export function SonarAnswerFrame({
  present = [],
  access = null,
  onDeep = null,
  navTop = null,
  /* Nov 2026: an answer about one listed company lists the Valuation section too. */
  equity = false,
  children,
  className = '',
}) {
  const unlocked = Boolean(access?.unlocked);
  const key = [...present].join('|');
  const nav = useMemo(
    () => answerNav(present, { unlocked, equity }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key, unlocked, equity],
  );
  const [active, setActive] = useState(null);
  /* After a nav click the clicked section stays current while the smooth scroll runs, so the
     spy does not flicker through the sections it passes. */
  const holdUntil = useRef(0);
  const lockedHead = useId();

  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      if (performance.now() < holdUntil.current) return;
      const line = window.innerHeight * 0.35;
      const tops = nav.map((s) =>
        s.locked ? undefined : document.getElementById(s.id)?.getBoundingClientRect().top,
      );
      const doc = document.documentElement;
      const atBottom =
        window.innerHeight + window.scrollY >= doc.scrollHeight - 2 &&
        doc.scrollHeight > window.innerHeight;
      const next = activeKey(nav, tops, line, atBottom);
      setActive((prev) => (prev === next ? prev : next));
    };
    const onScroll = () => {
      if (!raf) raf = window.requestAnimationFrame(update);
    };
    update();
    document.addEventListener('scroll', onScroll, { passive: true, capture: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      document.removeEventListener('scroll', onScroll, { capture: true });
      window.removeEventListener('resize', onScroll);
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, [nav]);

  const go = useCallback((e, s) => {
    const el = document.getElementById(s.id);
    if (!el) return;
    e.preventDefault();
    holdUntil.current = performance.now() + 1200;
    setActive(s.key);
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
  }, []);

  const locked = nav.filter((s) => s.locked);
  const cta = !unlocked ? access?.cta || null : null;

  return (
    <div className={`san ${className}`.trim()}>
      <div className="san-grid">
        <div className={`san-side${navTop ? ' has-top' : ''}`}>
          {navTop ? <div className="san-top">{navTop}</div> : null}
          <nav className="san-nav" aria-label="Answer sections">
            <p className="san-head">Sections</p>
            <ul className="san-list">
              {nav
                .filter((s) => !s.locked)
                .map((s) => (
                  <li key={s.key}>
                    <a
                      href={`#${s.id}`}
                      className={`san-link${active === s.key ? ' is-active' : ''}`}
                      aria-current={active === s.key ? 'location' : undefined}
                      onClick={(e) => go(e, s)}
                    >
                      {s.label}
                    </a>
                  </li>
                ))}
            </ul>
            {locked.length ? (
              <>
                <p className="san-head san-head--locked" id={lockedHead}>
                  <i className="bi bi-lock" aria-hidden="true" /> Deep research
                </p>
                <ul className="san-list san-list--locked" aria-labelledby={lockedHead}>
                  {locked.map((s) => (
                    <li key={s.key}>
                      <span className="san-link is-locked" aria-disabled="true">
                        <i className="bi bi-lock-fill" aria-hidden="true" />
                        {s.label}
                        <VisuallyHidden>, locked: deep research on the Starter plan</VisuallyHidden>
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
            {cta ? (
              <div className="san-cta">
                {/* The count is the locked sections this answer lists (Valuation on a stock). */}
                <p className="san-cta-title">
                  {locked.length} more section{locked.length === 1 ? '' : 's'} with deep research
                </p>
                <p className="san-cta-line">{cta.line}</p>
                {cta.href ? (
                  <a className="san-cta-btn" href={cta.href}>
                    {cta.action}
                    <i className="bi bi-arrow-right" aria-hidden="true" />
                  </a>
                ) : onDeep ? (
                  <button type="button" className="san-cta-btn" onClick={onDeep}>
                    {cta.action}
                    <i className="bi bi-arrow-right" aria-hidden="true" />
                  </button>
                ) : null}
              </div>
            ) : null}
          </nav>
        </div>
        <div className="san-body">{children}</div>
      </div>
    </div>
  );
}

export default SonarAnswerFrame;
