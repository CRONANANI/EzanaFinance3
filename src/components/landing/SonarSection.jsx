/**
 * SonarSection: the Sonar landing band.
 *
 * Makes the Sonar mechanic legible in three seconds: a ping goes out, eight
 * datasets light up, a cited briefing comes back. The animation is the argument,
 * which is why this is a choreographed loop rather than a screenshot.
 *
 * Structure: an eyebrow row and headline block over three columns. The ping
 * bar and live synthesis panel sit on the left, the original orbital radar
 * (SonarOrbital, wrapping PersonalizationRadar unchanged) in the centre, and
 * the sourced-matches dossier on the right, poking in from the page edge.
 *
 * Motion is one 15s CSS master timeline in sonar-band.css. Every sequenced
 * element shares var(--snr-cycle) and is keyed by percentage of it, so the radar
 * and the text cannot drift apart over time. Nothing is pseudo-random, so SSR and
 * client markup are identical. Every element's base style is the composed END
 * frame, which means prefers-reduced-motion resolves the whole band to the
 * finished composition just by killing animation, with no second stylesheet and nothing
 * left blank. The loop ticks only while the band is in view, via the same
 * IntersectionObserver pattern as the other landing sections, toggling
 * animation-play-state rather than unmounting.
 *
 * The ping bar is a real form that routes to /sonar. The typed query and the
 * pointer are decorative narration layered over it. The synthesis panel is NOT
 * decorative any more: it holds real prose with real interactive links, so it
 * is exposed to assistive tech and only the status pills stay aria-hidden. The
 * dossier column remains narration.
 *
 * The synthesis links do not navigate. The tools they name live behind login,
 * so clicking one opens an auth gate offering log in or sign up rather than
 * dropping a signed-out visitor onto a gated route.
 *
 * The synthesis panel is a four-state surface. Pristine (no ping this visit)
 * runs the demo narration. From the first real submit onward the demo is frozen
 * out for the rest of the visit and the panel shows, in turn, a sweep skeleton
 * while the request is in flight, the real cited answer, or the failure at full
 * size. A backend failure must never leave the Lockheed demo copy on screen
 * pretending to be the answer to what was actually asked.
 *
 * On desktop the band is a full-viewport takeover. Scrolling down into it
 * snaps the page to the band and locks it: the body and navbar take the
 * band's ground colour and downward scroll is blocked, by wheel, touch,
 * keyboard and scrollbar drag alike. The bouncing chevron is the only way
 * down, and using it releases the lock for the rest of the visit. Upward
 * intent always releases immediately, so the lock is never a trap. Below
 * 1024px none of this runs: the stacked band is taller than a phone
 * viewport, and locking it would push content off screen with no way back.
 * The edge fades are gone; the page matching the band replaces them.
 *
 * The dossier renders deterministic bracketed placeholders on the server and
 * swaps in real public-record rows from /api/landing/sonar-fixture after
 * hydration. SSR and first client render are therefore byte identical, and a
 * failed fetch simply leaves the placeholders in place. No figure is ever
 * invented to fill a bracket.
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import { SonarOrbital } from './SonarOrbital';
import './sonar-band.css';

/* Three short Lockheed Martin paragraphs. Link segments render as buttons
   styled as links: clicking one opens the auth gate instead of navigating.
   Figure-light on purpose, so nothing here can go stale or be a number nobody
   sourced. The snr-anim-syn1/3/5 classes are the existing timeline keys,
   reused rather than renumbered. */
const SYNTHESIS = [
  {
    cls: 'snr-anim-syn1',
    lead: true,
    segments: [
      {
        t: 'Lockheed Martin (LMT) is the largest U.S. defense prime, anchored by the F-35 program across Aeronautics, with Missiles and Fire Control, Rotary and Mission Systems, and Space rounding out the book. See the ',
      },
      { t: 'company screener', link: true },
      { t: ' and ' },
      { t: 'segment revenue chart', link: true },
      { t: '.' },
    ],
    cite: '[S1]',
  },
  {
    cls: 'snr-anim-syn3',
    segments: [
      {
        t: 'The vast majority of its revenue comes from U.S. government contracts, so award flow is the leading signal. Track it in the ',
      },
      { t: 'contract award tracker', link: true },
      { t: ' and the ' },
      { t: 'USAspending awards feed', link: true },
      { t: '.' },
    ],
    cite: '[S3]',
  },
  {
    cls: 'snr-anim-syn5',
    segments: [
      {
        t: 'Cross-signals: congressional trading disclosures periodically report LMT positions, SEC filings land on EDGAR, and defense budget questions trade on prediction markets. Open the ',
      },
      { t: 'congressional trades chart', link: true },
      { t: ', ' },
      { t: 'EDGAR filing stream', link: true },
      { t: ', or ' },
      { t: 'Echo coverage', link: true },
      { t: '.' },
    ],
    cite: '[S2] [S7]',
  },
];
/* Deterministic SSR fallback for the dossier. Replaced after hydration when
   /api/landing/sonar-fixture returns enough real rows. */
const ROWS = [
  { cls: 'snr-anim-row0', tag: 'ECHO', source: 'Echo editorial', line: '[MATCH TITLE]' },
  {
    cls: 'snr-anim-row1',
    tag: 'CONGRESS',
    source: 'House disclosure',
    line: '[MEMBER], [TRADE TYPE], [DATE]',
  },
  {
    cls: 'snr-anim-row2',
    tag: 'CONTRACTS',
    source: 'usaspending.gov',
    line: '[AWARDING AGENCY], [AWARD VALUE]',
  },
  {
    cls: 'snr-anim-row3',
    tag: 'MARKETS',
    source: 'polymarket',
    line: '[MARKET QUESTION], [XX]% YES',
  },
  { cls: 'snr-anim-row4', tag: 'SEC', source: 'EDGAR', line: '[FORM TYPE] filed [DATE]' },
];

export function SonarSection() {
  const bandRef = useRef(null);
  const inputRef = useRef(null);
  const [inView, setInView] = useState(true);
  const [gateOpen, setGateOpen] = useState(false);
  /* Live guest Sonar. null until the first real ping answers; after that the
     band is a live surface for the rest of the visit and the demo timeline
     stays paused. */
  const [live, setLive] = useState(null);
  const [pinging, setPinging] = useState(false);
  const [pingError, setPingError] = useState(null);
  /* The gate serves two paths with different copy: an exhausted quota, and a
     visitor clicking a tool link. Default is the tool-link wording. */
  const [gateCopy, setGateCopy] = useState(null);
  /* Starts as the deterministic fallback so the server render and the first
     client render agree; real rows arrive after hydration. */
  const [rows, setRows] = useState(ROWS);
  /* Bumped on an empty-query Ping press. Keying the row container by it
     remounts the list, which is what restarts the CSS pop animation without
     juggling classes. 0 means untouched, so the first paint and the 15s
     master loop are exactly as before. */
  const [pingPulse, setPingPulse] = useState(0);
  /* True from the first real ping of the visit onward, never reset. It is what
     freezes the demo choreography and takes the panel out of its pristine
     state: mid-request and after a failure alike, the demo copy is gone. */
  const [hasPinged, setHasPinged] = useState(false);
  const [lastQuery, setLastQuery] = useState('');
  /* Takeover lock. lockedIn drives the arrow; the refs are what the scroll
     listeners read, since they fire far too often to chase React state. */
  const [lockedIn, setLockedIn] = useState(false);
  const dismissedRef = useRef(false);
  const lockedRef = useRef(false);
  const settlingRef = useRef(false);

  /* Viewport gating. Pausing rather than unmounting: unmounting restarts the
     loop mid-sequence on scroll back, which reads as broken. */
  useEffect(() => {
    const el = bandRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return undefined;
    const io = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry) setInView(entry.isIntersecting);
      },
      { threshold: 0.15 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  /* Real dossier rows, fetched after hydration so SSR markup stays byte
     identical. A failure leaves the bracketed placeholders alone. The
     threshold of 3 keeps the card from rendering a half-populated state. */
  useEffect(() => {
    let alive = true;
    fetch('/api/landing/sonar-fixture')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (alive && Array.isArray(data?.rows) && data.rows.length >= 3) {
          setRows(data.rows.map((r, i) => ({ ...r, cls: `snr-anim-row${i}` })));
        }
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  /* Escape closes the gate, as a dialog should. */
  useEffect(() => {
    if (!gateOpen) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') setGateOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [gateOpen]);

  /* Takeover lock manager. One effect owns every listener and its cleanup;
     passive:false only where preventDefault is actually needed. The body
     class drives the page and navbar recolour over in sonar-band.css. */
  useEffect(() => {
    const band = bandRef.current;
    if (!band) return undefined;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

    const bandTop = () => band.getBoundingClientRect().top + window.scrollY;

    let settleTimer = null;
    /* Both elements: body carries the class the stylesheet scopes off, and
       html is what paints the canvas behind rubber-band overscroll. */
    const setLock = (on) => {
      lockedRef.current = on;
      setLockedIn(on);
      document.body.classList.toggle('snr-takeover', on);
      document.documentElement.classList.toggle('snr-takeover', on);
      /* The band's own class: while locked it becomes a scroll container
         capped at the viewport, which is what lets a band taller than the
         screen still be read without unlocking the page behind it. */
      band.classList.toggle('snr-locked', on);
      if (!on) band.scrollTop = 0;
    };

    const endSettle = () => {
      settlingRef.current = false;
      if (settleTimer) {
        clearTimeout(settleTimer);
        settleTimer = null;
      }
    };

    const release = () => {
      endSettle();
      setLock(false);
    };

    const engage = () => {
      if (lockedRef.current || dismissedRef.current) return;
      setLock(true);
      settlingRef.current = true;
      /* A smooth scroll that gets interrupted never reaches its target, and
         a settling flag that never clears would leave the page green with
         nothing actually locked. Hard deadline, so the state cannot stick. */
      if (settleTimer) clearTimeout(settleTimer);
      settleTimer = setTimeout(endSettle, 900);
      window.scrollTo({ top: bandTop(), behavior: reduced.matches ? 'auto' : 'smooth' });
    };

    let lastY = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      const goingDown = y > lastY;
      lastY = y;
      if (lockedRef.current) {
        const target = bandTop();
        if (settlingRef.current) {
          if (Math.abs(y - target) < 4) endSettle();
          return;
        }
        /* Scrollbar drags and leftover momentum: clamp back to the band. */
        if (Math.abs(y - target) > 4) window.scrollTo({ top: target });
        return;
      }
      /* Arm when the band's top crosses the upper third on the way down. */
      if (goingDown && band.getBoundingClientRect().top <= window.innerHeight * 0.33) engage();
    };

    /* While locked the wheel drives the BAND, never the page. Leaving the
       default action to the browser made the band scroll only when the
       pointer happened to be over it, and scroll the page underneath (then
       get yanked back by the clamp) when it was not. Taking the delta and
       applying it ourselves makes it deterministic and jitter-free. */
    const onWheel = (e) => {
      if (!lockedRef.current || settlingRef.current) return;
      const max = band.scrollHeight - band.clientHeight;
      if (e.deltaY > 0) {
        e.preventDefault();
        if (max > 0) band.scrollTop = Math.min(max, band.scrollTop + e.deltaY);
      } else if (e.deltaY < 0) {
        if (band.scrollTop > 0) {
          e.preventDefault();
          band.scrollTop = Math.max(0, band.scrollTop + e.deltaY);
        } else if (e.deltaY < -8) {
          /* At the band's own top, upward intent is a request to leave. */
          release();
        }
      }
    };

    let touchY = null;
    const onTouchStart = (e) => {
      touchY = e.touches?.[0]?.clientY ?? null;
    };
    const onTouchMove = (e) => {
      if (!lockedRef.current || settlingRef.current || touchY === null) return;
      const dy = (e.touches?.[0]?.clientY ?? touchY) - touchY;
      const insideBand = band.contains(e.target);
      /* The band scrolls internally while locked. A downward swipe inside it
         belongs to the band until the band has nothing left to show; only
         then does blocking the page mean anything. Outside the band, or at
         its bottom, the block is the lock. */
      const atBottom = band.scrollTop + band.clientHeight >= band.scrollHeight - 2;
      if (dy < 0) {
        if (!insideBand || atBottom) e.preventDefault();
      } else if (dy > 24) {
        /* Upward swipe releases only from the band's own top, so a visitor
           reading the middle of a tall band is not thrown out of it. */
        if (!insideBand || band.scrollTop <= 2) release();
      }
    };

    const DOWN_KEYS = new Set(['ArrowDown', 'PageDown', 'End', ' ']);
    const UP_KEYS = new Set(['ArrowUp', 'PageUp', 'Home']);
    const onKeyDown = (e) => {
      if (!lockedRef.current) return;
      const t = e.target;
      const typing =
        t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
      if (typing) return; /* the ping bar stays typeable, space included */
      const max = band.scrollHeight - band.clientHeight;
      const step = e.key === 'PageDown' || e.key === 'PageUp' ? band.clientHeight * 0.9 : 120;
      if (DOWN_KEYS.has(e.key)) {
        e.preventDefault();
        if (max > 0)
          band.scrollTop = Math.min(max, band.scrollTop + (e.key === 'End' ? max : step));
      } else if (UP_KEYS.has(e.key)) {
        if (band.scrollTop > 0) {
          e.preventDefault();
          band.scrollTop = e.key === 'Home' ? 0 : Math.max(0, band.scrollTop - step);
        } else {
          release();
        }
      }
    };

    /* An in-page anchor would fight the clamp and lose, stranding the
       visitor on the band with the wrong target under them. */
    const onHashChange = () => {
      dismissedRef.current = true;
      release();
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('hashchange', onHashChange);

    return () => {
      if (settleTimer) clearTimeout(settleTimer);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('hashchange', onHashChange);
      document.body.classList.remove('snr-takeover');
      document.documentElement.classList.remove('snr-takeover');
      band.classList.remove('snr-locked');
    };
  }, []);

  /* The arrow: dismiss the lock for the rest of the visit, then hand the
     page back to the visitor at the section below. */
  function onContinue() {
    dismissedRef.current = true;
    lockedRef.current = false;
    settlingRef.current = false;
    setLockedIn(false);
    document.body.classList.remove('snr-takeover');
    document.documentElement.classList.remove('snr-takeover');
    const band = bandRef.current;
    if (band) band.classList.remove('snr-locked');
    if (band) {
      const nextTop = band.getBoundingClientRect().bottom + window.scrollY;
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      window.scrollTo({ top: nextTop, behavior: reduced ? 'auto' : 'smooth' });
    }
  }

  function openGate(copy) {
    setGateCopy(copy || null);
    setGateOpen(true);
  }

  /* Guest Sonar runs inline now. The form keeps action="/sonar" so a no-JS
     visitor still reaches the app, but with JS on every submit is intercepted:
     an empty press replays the demo pop, a real query pings for real. */
  async function onPingSubmit(e) {
    e.preventDefault();
    const q = e.currentTarget.elements?.q?.value?.trim();
    if (!q) {
      setPingPulse((n) => n + 1);
      return;
    }
    if (pinging) return;
    setHasPinged(true);
    setLastQuery(q);
    setPinging(true);
    setPingError(null);
    try {
      const res = await fetch('/api/sonar/landing-query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q }),
      });
      const data = await res.json().catch(() => null);
      if (data?.gate) {
        openGate({
          title: 'You have used your 5 free pings.',
          sub: 'Create a free account to keep pinging across every Ezana dataset.',
        });
        setLive((l) => (l ? { ...l, remaining: 0 } : l));
      } else if (res.ok && data?.answer) {
        setLive({ answer: data.answer, sources: data.sources || [], remaining: data.remaining });
        setPingPulse((n) => n + 1);
      } else if (res.ok) {
        /* The ping worked; the datasets just had nothing on this subject. That
           is a finding, not a failure, and telling the visitor to try again
           would be telling them to retry something a retry cannot fix. The
           quota was still spent, so the remaining count is carried through. */
        setPingError(
          typeof data?.remaining === 'number'
            ? `No dataset coverage for that ping yet. ${data.remaining} free pings left.`
            : 'No dataset coverage for that ping yet.',
        );
      } else if (res.status === 429) {
        /* The strict per-IP limiter, not a broken ping. Naming it stops a
           visitor retrying into the same wall. */
        setPingError('Too many pings too fast. Wait a minute and try again.');
      } else {
        setPingError(data?.error || 'That ping did not land. Try again.');
      }
    } catch {
      setPingError('That ping did not land. Try again.');
    } finally {
      setPinging(false);
    }
  }

  return (
    <section
      ref={bandRef}
      className={`snr-band${inView ? '' : ' snr-paused'}${hasPinged ? ' snr-live' : ''}`}
    >
      <div className="snr-grid-layer" aria-hidden="true" />

      <div className="snr-inner">
        <div className="snr-head">
          <div className="snr-eyebrow-row">
            <span className="snr-beacon" aria-hidden="true" />
            <span className="snr-eyebrow">Sonar</span>
            <span className="snr-rule" aria-hidden="true" />
            <span className="snr-kicker">RESEARCH SURFACE, NOT A CHATBOT</span>
          </div>
          <h2 className="snr-headline">Ping anything. Sonar sweeps everything.</h2>
          <p className="snr-subhead">
            One query, swept across congressional trades, government contracts, SEC filings,
            prediction markets, lobbying disclosures, Echo editorial, and the live web. Every claim
            cited. Findings only, never advice.
          </p>
        </div>

        <div className="snr-cols">
          <div className="snr-col-left">
            <form
              className="snr-pingbar"
              action="/sonar"
              method="get"
              role="search"
              onSubmit={onPingSubmit}
            >
              <i className="bi bi-search snr-pingbar-icon" aria-hidden="true" />
              <label className="snr-label-sr" htmlFor="snr-ping-input">
                Ping a company, ticker, politician or bill
              </label>
              <input
                ref={inputRef}
                id="snr-ping-input"
                className="snr-input"
                type="search"
                name="q"
                placeholder=" "
                autoComplete="off"
              />
              {/* Decorative demo: the typed query, its caret and the pointer.
                  Clears the moment the real field is focused or typed into. */}
              <span className="snr-demo" aria-hidden="true">
                <span className="snr-query snr-anim-query">Lockheed Martin</span>
                <span className="snr-caret snr-anim-caret" />
              </span>
              <button type="submit" className="snr-ping-btn snr-anim-press" disabled={pinging}>
                {pinging ? (
                  <>
                    <span className="snr-beacon-sm snr-ping-dot" aria-hidden="true" />
                    Pinging
                  </>
                ) : (
                  'Ping'
                )}
              </button>
              <svg
                className="snr-cursor snr-anim-cursor"
                viewBox="0 0 24 24"
                fill="#ffffff"
                stroke="#04261c"
                strokeWidth="1.5"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M5 3l14 8.5-6.2 1.4L9.7 19z" />
              </svg>
            </form>

            <div className="snr-synth">
              <div className="snr-panel-head">
                <span className="snr-beacon-sm" aria-hidden="true" />
                <span className="snr-panel-title">LIVE SYNTHESIS</span>
                <span className="snr-rule-soft" aria-hidden="true" />
                <span className="snr-status" aria-hidden="true">
                  <span className="snr-state-ready snr-anim-ready">READY</span>
                  <span className="snr-state-sweep snr-anim-sweepstate">SWEEPING 8 DATASETS</span>
                  <span className="snr-state-done snr-anim-done">8 CLAIMS CITED</span>
                </span>
              </div>

              <div className="snr-synth-body">
                <p className="snr-empty snr-anim-idle" aria-hidden="true">
                  Awaiting ping. Nothing is synthesized until you ask.
                </p>
                {!hasPinged ? (
                  SYNTHESIS.map((p) => (
                    <p key={p.cls} className={`snr-para${p.lead ? ' snr-line-lead' : ''} ${p.cls}`}>
                      {p.segments.map((seg, i) =>
                        seg.link ? (
                          <button
                            key={`${p.cls}-${i}`}
                            type="button"
                            className="snr-link"
                            onClick={() => openGate()}
                          >
                            {seg.t}
                          </button>
                        ) : (
                          <span key={`${p.cls}-${i}`}>{seg.t}</span>
                        ),
                      )}
                      {p.cite ? <span className="snr-cite"> {p.cite}</span> : null}
                    </p>
                  ))
                ) : pinging ? (
                  <>
                    <p className="snr-para snr-line-lead">Sweeping datasets for “{lastQuery}”…</p>
                    <div className="snr-skel snr-anim-rowpop" aria-hidden="true" />
                    <div
                      className="snr-skel snr-anim-rowpop"
                      style={{ animationDelay: '0.1s' }}
                      aria-hidden="true"
                    />
                    <div
                      className="snr-skel snr-anim-rowpop snr-skel--short"
                      style={{ animationDelay: '0.2s' }}
                      aria-hidden="true"
                    />
                  </>
                ) : live ? (
                  <>
                    {live.answer
                      .split(/\n\s*\n/)
                      .slice(0, 3)
                      .map((para, i) => (
                        <p
                          key={`live-${i}`}
                          className={`snr-para${i === 0 ? ' snr-line-lead' : ''} snr-anim-rowpop`}
                          style={{ animationDelay: `${i * 0.1}s` }}
                        >
                          {para}
                        </p>
                      ))}
                    <p className="snr-para">
                      <button type="button" className="snr-link" onClick={() => openGate()}>
                        Open the full dossier in Sonar
                      </button>
                      {typeof live.remaining === 'number' ? (
                        <span className="snr-cite"> {live.remaining} free pings left</span>
                      ) : null}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="snr-para snr-line-lead">
                      {pingError || 'That ping did not land.'}
                    </p>
                    <p className="snr-para">
                      <button
                        type="button"
                        className="snr-link"
                        onClick={() => {
                          setPingPulse((n) => n + 1);
                          inputRef.current?.focus();
                        }}
                      >
                        Try another ping
                      </button>
                    </p>
                  </>
                )}
              </div>

              {gateOpen ? (
                <div className="snr-gate" role="dialog" aria-label="Sign in to open this tool">
                  <button
                    type="button"
                    className="snr-gate-close"
                    aria-label="Close"
                    onClick={() => setGateOpen(false)}
                  >
                    <i className="bi bi-x-lg" aria-hidden="true" />
                  </button>
                  <p className="snr-gate-title">
                    {gateCopy?.title || 'This tool lives inside Ezana.'}
                  </p>
                  <p className="snr-gate-sub">
                    {gateCopy?.sub ||
                      'Log in or create a free account to open charts, filings, and trackers.'}
                  </p>
                  <div className="snr-gate-actions">
                    <a className="snr-gate-btn snr-gate-btn-ghost" href="/signin?next=/sonar">
                      Log in
                    </a>
                    <a className="snr-gate-btn snr-gate-btn-solid" href="/signup?next=/sonar">
                      Sign up free
                    </a>
                  </div>
                </div>
              ) : null}

              <div className="snr-divider-line" aria-hidden="true" />

              <div className="snr-foot">
                <p className="snr-footnote">
                  Findings only, never financial advice. Every claim carries its source.
                </p>
                <a className="snr-cta" href="/sonar">
                  Run your first ping
                  <i className="bi bi-arrow-right" aria-hidden="true" />
                </a>
              </div>
            </div>
          </div>

          <div className="snr-col-radar">
            <SonarOrbital />
          </div>

          <div className="snr-col-dossier" aria-hidden={hasPinged ? undefined : 'true'}>
            <div className="snr-dossier-head">
              <span className="snr-dossier-title">SOURCED MATCHES</span>
              <span className="snr-rule" />
              <span className="snr-meta">
                {hasPinged ? lastQuery.toUpperCase().slice(0, 14) : 'LMT'}
              </span>
            </div>

            <div className="snr-dossier-body">
              <p className="snr-empty snr-anim-idle">
                No matches yet.
                <br />
                The dossier fills as each dataset returns.
              </p>

              <div className="snr-rows" key={pingPulse}>
                {(live && live.sources.length
                  ? live.sources.slice(0, 5).map((sc, i) => ({
                      tag: sc.label.toUpperCase().slice(0, 12),
                      source: sc.used ? 'matched' : 'searched',
                      line: sc.label,
                      used: sc.used,
                      cls: `snr-anim-row${i}`,
                    }))
                  : rows
                ).map((r, i) => (
                  <div
                    key={`${r.tag}-${r.cls}`}
                    className={`snr-row${r.used === false ? ' snr-row--dry' : ''} ${
                      pingPulse === 0 ? r.cls : 'snr-anim-rowpop'
                    }`}
                    style={pingPulse === 0 ? undefined : { animationDelay: `${i * 0.12}s` }}
                  >
                    <div className="snr-row-top">
                      <span className="snr-tag">{r.tag}</span>
                      <span className="snr-rule" />
                      <span className="snr-src">{r.source}</span>
                    </div>
                    <span className="snr-row-line">{r.line}</span>
                  </div>
                ))}
              </div>
            </div>

            <div
              className={`snr-row-footer ${pingPulse === 0 ? 'snr-anim-row5' : 'snr-anim-rowpop'}`}
              style={pingPulse === 0 ? undefined : { animationDelay: `${rows.length * 0.12}s` }}
            >
              <span className="snr-meta">13F, LOBBYING, WEB</span>
              <span className="snr-rule-soft" />
              <span className="snr-meta">3 MORE</span>
            </div>
          </div>
        </div>
      </div>

      {lockedIn ? (
        <button
          type="button"
          className="snr-continue snr-anim-bounce"
          aria-label="Continue to the rest of the page"
          onClick={onContinue}
        >
          <i className="bi bi-chevron-down" aria-hidden="true" />
        </button>
      ) : null}
    </section>
  );
}

export default SonarSection;
