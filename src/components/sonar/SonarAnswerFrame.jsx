'use client';

/**
 * SonarAnswerFrame: the universal shell around every Sonar answer (the country board and
 * the ping board on /datasets and /sonar, the research board in a standard or deep report).
 *
 * Nov 21 2026 skeleton, the same for every query:
 *   - Contents menu, far left: styled like the Ezana Echo article contents (text links,
 *     caps headings, the current section in emerald with a short emerald rule). The Research
 *     menu, this report's sections in one vocabulary (lib/sonar/answer-sections), then the
 *     deep sections (open on an unlocked deep run, otherwise listed and not clickable, with
 *     an honest state: Locked, Not run, Running or Complete) and the deep research call to
 *     action. On a wide screen the menu hangs in the page margin, so the answer itself starts
 *     where the menu used to start, and the canvas is about a fifth wider.
 *   - Centre: one top line with the query composer on the left (`queryBar`, kept short) and
 *     the tools row on the right (`tools`: Research controls, Evidence and sources, Next
 *     steps, each opening over the page); the follow-up questions under it (`followUps`);
 *     then the answer (`children`), whose cards come from the exemplary layout for the kind
 *     of question. The menu, the composer and the three tools are the skeleton of every
 *     Sonar response.
 *
 * Narrow: the sections are a row of chips above the answer. `navTop` (a research run's Back
 * and ping bar) sits at the top of the menu. Scroll-spy reads the section anchors
 * (`sa-<key>`) in the capture phase, so it works whatever element scrolls.
 * Styles: sonar-answer-frame.css (san-). Tokens only, no outlines on any card.
 */

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { VisuallyHidden } from '@/components/ds';
import { answerNav, activeKey } from '@/lib/sonar/answer-sections';
import { SonarToolsRow, OPEN_TOOL_EVENT } from './SonarToolsRow';
import './sonar-answer-frame.css';

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
  /* Nov 21: the tools row items (SonarToolsRow workspaceTools()). */
  tools = null,
  /* Legacy right-rail content: now placed under the answer. */
  rail = null,
  /* The deep research cost and quota line, shown in the left rail's card. */
  deepNote = null,
  /* Nov 21: the skeleton's top line: the query composer (left) and the tools row (right),
     then the follow-up questions under them. */
  queryBar = null,
  followUps = null,
  /* Anything else a host keeps above the answer. */
  top = null,
  /* Nov 21: a deep research run is in flight for this question. */
  deepRunning = false,
  /* Nov 28: deep sections this page already shows to every reader (answerNav `open`). */
  open = [],
  children,
  className = '',
}) {
  const unlocked = Boolean(access?.unlocked);
  const key = [...present].join('|');
  const openKey = [...open].join('|');
  const nav = useMemo(
    () => answerNav(present, { unlocked, equity, open }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key, unlocked, equity, openKey],
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
    /* Evidence and sources lives in the tools row: open its panel too. */
    if (s.key === 'sources' && el.classList.contains('stl-item'))
      window.dispatchEvent(new CustomEvent(OPEN_TOOL_EVENT, { detail: { key: 'sources' } }));
  }, []);

  /* Nov 28: a deep section the page shows to everyone (an investment memo's methodology)
     sits in Current report, so it is never presented as a completed deep run. */
  const inReport = (s) => s.tier === 'free' || (!unlocked && open.includes(s.key));
  const free = nav.filter((s) => !s.locked && inReport(s));
  const deepOpen = nav.filter((s) => !s.locked && s.tier === 'deep' && !inReport(s));
  const locked = nav.filter((s) => s.locked);
  const cta = !unlocked ? access?.cta || null : null;
  /* Nov 21: the deep research state, told apart honestly. Locked: the plan does not include
     it. Available: the plan includes it and it has not been run on this question. Running:
     a run is in flight. Complete: the deep sections are on the page. */
  const deepState = deepRunning
    ? 'running'
    : unlocked
      ? deepOpen.length
        ? 'complete'
        : 'available'
      : cta?.kind === 'deep'
        ? 'available'
        : 'locked';
  const DEEP_STATUS = {
    locked: { label: 'Locked', icon: 'bi-lock-fill' },
    available: { label: 'Not run', icon: 'bi-circle' },
    running: { label: 'Running', icon: 'bi-arrow-repeat' },
    complete: { label: 'Complete', icon: 'bi-check-circle-fill' },
  };
  const status = DEEP_STATUS[deepState];
  const statusChip = (
    <span className={`san-status san-status--${deepState}`}>
      <i className={`bi ${status.icon}`} aria-hidden="true" />
      {status.label}
    </span>
  );

  const sectionLink = (s) => (
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
  );

  return (
    <div className={`san san--wide ${className}`.trim()}>
      <div className="san-grid">
        <div className={`san-side${navTop ? ' has-top' : ''}`}>
          {navTop ? <div className="san-top">{navTop}</div> : null}

          {research?.length ? (
            <nav className="san-research" aria-label="Research">
              <p className="san-head">Research</p>
              <ul className="san-list">
                {research.map((r) => (
                  <li key={r.key}>
                    {r.href && !r.current ? (
                      <Link href={r.href} className="san-link">
                        {r.label}
                      </Link>
                    ) : (
                      <span
                        className={`san-link${r.current ? ' is-current' : ''}`}
                        aria-current={r.current ? 'page' : undefined}
                      >
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
          </nav>

          {deepOpen.length || locked.length || deepState === 'running' ? (
            <nav className="san-nav san-nav--deep" aria-label="Deep research sections">
              {deepOpen.length ? (
                <>
                  <p className="san-head san-head--deep">
                    <span className="san-head-text">Deep research</span> {statusChip}
                  </p>
                  <ul className="san-list">{deepOpen.map(sectionLink)}</ul>
                </>
              ) : null}
              {locked.length ? (
                <>
                  <p className="san-head san-head--locked" id={lockedHead}>
                    <span className="san-head-text">Deep research</span> {statusChip}
                  </p>
                  <ul className="san-list san-list--locked" aria-labelledby={lockedHead}>
                    {locked.map((s) =>
                      deepState === 'locked' ? (
                        <li key={s.key}>
                          <span className="san-link is-locked" aria-disabled="true">
                            {s.label}
                            <i className="bi bi-lock-fill san-lock" aria-hidden="true" />
                            <VisuallyHidden>
                              , locked: deep research on the Starter plan
                            </VisuallyHidden>
                          </span>
                        </li>
                      ) : (
                        <li key={s.key}>
                          <span className="san-link is-pending" aria-disabled="true">
                            {s.label}
                            <VisuallyHidden>
                              {deepState === 'running'
                                ? ', being researched now'
                                : ', opens when deep research is run on this question'}
                            </VisuallyHidden>
                          </span>
                        </li>
                      ),
                    )}
                  </ul>
                </>
              ) : null}
            </nav>
          ) : null}

          {cta ? (
            <div className="san-cta">
              <p className="san-cta-title">
                <i className="bi bi-rocket-takeoff" aria-hidden="true" /> Run deeper research
              </p>
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
              {deepNote && cta.kind === 'deep' ? <p className="san-cta-note">{deepNote}</p> : null}
            </div>
          ) : null}
        </div>
        <div className="san-body">
          {queryBar || tools?.length || followUps || top ? (
            <div className="san-lead">
              {queryBar || tools?.length ? (
                <div className={`san-topline${queryBar && tools?.length ? ' is-split' : ''}`}>
                  {queryBar ? <div className="san-query">{queryBar}</div> : null}
                  {tools?.length ? (
                    <div className="san-tools">
                      <SonarToolsRow items={tools} />
                    </div>
                  ) : null}
                </div>
              ) : null}
              {followUps}
              {top}
            </div>
          ) : null}
          {children}
          {rail ? (
            <aside className="san-rail" aria-label="Research tools">
              {rail}
            </aside>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default SonarAnswerFrame;
