'use client';

/**
 * SonarAnswerFrame: the research workspace around every Sonar answer (the country board and
 * the ping board on /datasets and /sonar, the research board in a standard or deep report).
 *
 * Nov 13 2026 (docs/sonar/answer-templates, template 03): three columns.
 *   - Left rail: the Research menu, then this report's sections in one vocabulary
 *     (lib/sonar/answer-sections): the free sections the page has, then the deep sections,
 *     open on an unlocked deep run and otherwise listed greyed out with a lock, legible but
 *     not clickable or focusable, then the "Run deeper research" card with the call to
 *     action that fits the reader (sign up, get Starter, or run deep research).
 *   - Centre: the board (`children`).
 *   - Right rail (`rail`): research controls, next steps and related research. Optional: a
 *     board that passes none keeps a two-column page.
 *
 * Wide container: three columns, the left rail sticky. Mid: the right rail drops under the
 * board. Narrow: the sections are a row of chips above the board.
 * `navTop` (a research run's Back and ping bar) sits at the top of the left rail.
 * Scroll-spy reads the section anchors (`sa-<key>`) in the capture phase, so it works
 * whatever element scrolls. Styles: sonar-answer-frame.css (san-). Tokens only, and no
 * outlines on any card (the Sonar card rule).
 */

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { VisuallyHidden } from '@/components/ds';
import { answerNav, activeKey } from '@/lib/sonar/answer-sections';
import './sonar-answer-frame.css';

/* One Bootstrap icon per section, so the rail reads at a glance. */
const SECTION_ICON = {
  answer: 'bi-layers',
  metrics: 'bi-speedometer2',
  findings: 'bi-lightning-charge',
  charts: 'bi-bar-chart-line',
  sources: 'bi-database',
  team: 'bi-people',
  methodology: 'bi-clipboard-data',
  valuation: 'bi-calculator',
  scenarios: 'bi-diagram-2',
  monitor: 'bi-binoculars',
  risks: 'bi-shield-check',
  relationships: 'bi-share',
  explorer: 'bi-database-check',
};

/* The Research menu when a host passes none: this answer. The history, saved research and
   library links are added by the host once those pages exist (see SonarResearchLinks). */
const CURRENT_ONLY = [
  { key: 'current', label: 'Current analysis', icon: 'bi-chat-square-text', current: true },
];

export function SonarAnswerFrame({
  present = [],
  access = null,
  onDeep = null,
  navTop = null,
  /* Nov 2026: an answer about one listed company lists the Valuation section too. */
  equity = false,
  /* The Research menu: [{ key, label, icon, href?, current? }]. */
  research = CURRENT_ONLY,
  /* The right rail's content, or null for none. */
  rail = null,
  /* The deep research cost and quota line, shown in the left rail's card. */
  deepNote = null,
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

  const free = nav.filter((s) => !s.locked && s.tier === 'free');
  const deepOpen = nav.filter((s) => !s.locked && s.tier === 'deep');
  const locked = nav.filter((s) => s.locked);
  const cta = !unlocked ? access?.cta || null : null;

  const sectionLink = (s) => (
    <li key={s.key}>
      <a
        href={`#${s.id}`}
        className={`san-link${active === s.key ? ' is-active' : ''}`}
        aria-current={active === s.key ? 'location' : undefined}
        onClick={(e) => go(e, s)}
      >
        <i className={`bi ${SECTION_ICON[s.key] || 'bi-dot'}`} aria-hidden="true" />
        {s.label}
      </a>
    </li>
  );

  return (
    <div className={`san${rail ? ' has-rail' : ''} ${className}`.trim()}>
      <div className="san-grid">
        <div className={`san-side${navTop ? ' has-top' : ''}`}>
          {navTop ? <div className="san-top">{navTop}</div> : null}

          {research?.length ? (
            <nav className="san-research" aria-label="Research">
              <p className="san-head">Research</p>
              <ul className="san-list san-list--research">
                {research.map((r) => (
                  <li key={r.key}>
                    {r.href && !r.current ? (
                      <Link href={r.href} className="san-link san-link--menu">
                        <i className={`bi ${r.icon}`} aria-hidden="true" />
                        {r.label}
                      </Link>
                    ) : (
                      <span
                        className={`san-link san-link--menu${r.current ? ' is-current' : ''}`}
                        aria-current={r.current ? 'page' : undefined}
                      >
                        <i className={`bi ${r.icon}`} aria-hidden="true" />
                        {r.label}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </nav>
          ) : null}

          <nav className="san-nav" aria-label="Answer sections">
            <p className="san-head">Current report</p>
            <ul className="san-list">{free.map(sectionLink)}</ul>
            {deepOpen.length ? (
              <>
                <p className="san-head san-head--deep">Deep research</p>
                <ul className="san-list">{deepOpen.map(sectionLink)}</ul>
              </>
            ) : null}
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
                <i className="bi bi-rocket-takeoff san-cta-icon" aria-hidden="true" />
                <p className="san-cta-title">Run deeper research</p>
                {/* The count is the locked sections this answer lists (Valuation on a stock). */}
                <p className="san-cta-count">
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
                {deepNote && cta.kind === 'deep' ? (
                  <p className="san-cta-note">{deepNote}</p>
                ) : null}
              </div>
            ) : null}
          </nav>
        </div>
        <div className="san-body">{children}</div>
        {rail ? (
          <aside className="san-rail" aria-label="Research tools">
            {rail}
          </aside>
        ) : null}
      </div>
    </div>
  );
}

export default SonarAnswerFrame;
