'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '@/components/AuthProvider';
import './sonar-signup-cta.css';

/**
 * Sign-up prompt on the Datasets results. Guests only: hidden while auth is
 * resolving (no flash for members) and for anyone signed in. The return path
 * brings the visitor back to the same search on /datasets. Copy stays inside
 * what a free account actually unlocks (the guest gate in SonarSection: 5
 * free pings, then a free account keeps pinging across every dataset and
 * opens charts, filings and trackers).
 *
 * Oct 25 (later): a centred popup card instead of a rail in the results.
 * It opens once the briefing has landed (`ready`), so it never covers the
 * loader. Minimize (the button, Escape, or a click on the scrim) flies the
 * card into a small widget at the bottom left; the widget expands it again.
 * The choice is remembered for the tab (sessionStorage), so a follow-up ping
 * does not pop it back open. Portaled to <body>: the results band pauses
 * every animation inside it once a ping is live, and the page shell's
 * stacking would trap a fixed layer. The fly is a Web Animations FLIP, and is
 * skipped under prefers-reduced-motion.
 */

const STORE_KEY = 'ezana_sonar_cta';
const OPEN_DELAY_MS = 600;
const FLY_MS = 360;

const reduced = () =>
  typeof window !== 'undefined' &&
  Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);

function readStored() {
  try {
    return window.sessionStorage.getItem(STORE_KEY);
  } catch {
    return null;
  }
}
function writeStored(v) {
  try {
    window.sessionStorage.setItem(STORE_KEY, v);
  } catch {
    /* storage can throw in private windows; the popup still works */
  }
}

/** The transform that maps box `from` onto box `to` (origin top left). */
function flipTo(from, to) {
  const sx = to.width / from.width;
  const sy = to.height / from.height;
  return `translate(${to.left - from.left}px, ${to.top - from.top}px) scale(${sx}, ${sy})`;
}

function CtaCard({ q, signupHref, loginHref, onMinimize, cardRef }) {
  return (
    <section
      ref={cardRef}
      className="ssc ssc--popup"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ssc-popup-title"
      tabIndex={-1}
    >
      <button
        type="button"
        className="ssc-min"
        onClick={onMinimize}
        aria-label="Minimize the free account card"
      >
        <i className="bi bi-dash-lg" aria-hidden="true" />
      </button>

      <div className="ssc-copy">
        <span className="ssc-kicker">Free Ezana account</span>
        <h2 id="ssc-popup-title" className="ssc-title">
          {q ? (
            <>
              There is more on <span className="ssc-query">{q}</span> than one brief.
            </>
          ) : (
            'There is more behind this brief.'
          )}
        </h2>
        <p className="ssc-sub">
          This ping searched every Ezana dataset. A free account opens what sits behind each match.
        </p>
      </div>

      <ul className="ssc-list">
        <li className="ssc-item">
          <i className="bi bi-broadcast" aria-hidden="true" />
          <span>Keep pinging past the 5 guest pings</span>
        </li>
        <li className="ssc-item">
          <i className="bi bi-bar-chart-line" aria-hidden="true" />
          <span>Open the charts, filings and trackers behind each match</span>
        </li>
        <li className="ssc-item">
          <i className="bi bi-clock-history" aria-hidden="true" />
          <span>Pick up your recent pings in Sonar</span>
        </li>
      </ul>

      <div className="ssc-actions">
        <div className="ssc-btns">
          <a className="ssc-btn ssc-btn--primary" href={signupHref}>
            Sign up free
            <i className="bi bi-arrow-right" aria-hidden="true" />
          </a>
          <a className="ssc-btn ssc-btn--ghost" href={loginHref}>
            Log in
          </a>
        </div>
        <p className="ssc-plan-note">
          <span aria-hidden="true">*</span> The Free plan gives you immediate access to the
          platform. The Starter plan has a waitlist, and we will email you as soon as you can sign
          up for it.
        </p>
        <span className="ssc-note">Findings only, never financial advice.</span>
      </div>
    </section>
  );
}

export function SonarSignupCta({ query, ready = true }) {
  const { isAuthenticated, loading } = useAuth();
  const [mode, setMode] = useState('hidden'); // hidden | open | min
  const [mounted, setMounted] = useState(false);
  const cardRef = useRef(null);
  const widgetRef = useRef(null);
  const flyRef = useRef(null); // 'min' | 'open' while a fly is pending
  const fromRectRef = useRef(null);

  useEffect(() => setMounted(true), []);

  const guest = !loading && !isAuthenticated;

  /* Open once the briefing has landed, or straight to the widget if the
     visitor minimized it earlier in this tab. */
  useEffect(() => {
    if (!guest || !ready || mode !== 'hidden') return undefined;
    if (readStored() === 'min') {
      setMode('min');
      return undefined;
    }
    const t = window.setTimeout(() => setMode('open'), OPEN_DELAY_MS);
    return () => window.clearTimeout(t);
  }, [guest, ready, mode]);

  const minimize = useCallback(() => {
    writeStored('min');
    fromRectRef.current = cardRef.current?.getBoundingClientRect() || null;
    flyRef.current = 'min';
    setMode('min');
  }, []);

  const expand = useCallback(() => {
    writeStored('open');
    fromRectRef.current = widgetRef.current?.getBoundingClientRect() || null;
    flyRef.current = 'open';
    setMode('open');
  }, []);

  /* The fly. After the swap, the element now on screen is animated FROM the
     box the other one occupied, so the card appears to shrink into the
     widget (or the widget to grow into the card). */
  useLayoutEffect(() => {
    const dir = flyRef.current;
    const from = fromRectRef.current;
    flyRef.current = null;
    fromRectRef.current = null;
    const el = mode === 'min' ? widgetRef.current : mode === 'open' ? cardRef.current : null;
    if (!el) return;
    if (dir) el.focus({ preventScroll: true });
    if (!dir || !from || reduced() || typeof el.animate !== 'function') return;
    const to = el.getBoundingClientRect();
    if (!to.width || !to.height || !from.width || !from.height) return;
    el.animate(
      [
        {
          transformOrigin: 'top left',
          transform: flipTo(to, from),
          opacity: dir === 'min' ? 0.6 : 0.4,
        },
        { transformOrigin: 'top left', transform: 'none', opacity: 1 },
      ],
      { duration: FLY_MS, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' },
    );
  }, [mode]);

  /* Escape minimizes; Tab stays inside the open card. */
  useEffect(() => {
    if (mode !== 'open') return undefined;
    const card = cardRef.current;
    if (card && !card.contains(document.activeElement)) card.focus({ preventScroll: true });
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        minimize();
        return;
      }
      if (e.key !== 'Tab' || !cardRef.current) return;
      const f = cardRef.current.querySelectorAll('a[href], button:not([disabled])');
      if (!f.length) return;
      const first = f[0];
      const last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [mode, minimize]);

  if (!mounted || !guest || mode === 'hidden') return null;

  const q = String(query || '').trim();
  const next = `/datasets${q ? `?q=${encodeURIComponent(q)}` : ''}`;
  const signupHref = `/auth/continue?intent=signup&next=${encodeURIComponent(next)}`;
  const loginHref = `/auth/continue?next=${encodeURIComponent(next)}`;

  return createPortal(
    mode === 'open' ? (
      <div className="sscp">
        {/* A button, not a div, so the click target is a real control; out of
            the tab order because the card's own minimize button covers it. */}
        <button
          type="button"
          className="sscp-scrim"
          tabIndex={-1}
          aria-label="Minimize the free account card"
          onClick={minimize}
        />
        <CtaCard
          q={q}
          signupHref={signupHref}
          loginHref={loginHref}
          onMinimize={minimize}
          cardRef={cardRef}
        />
      </div>
    ) : (
      <button
        ref={widgetRef}
        type="button"
        className="sscw"
        onClick={expand}
        aria-label="Open the free Ezana account card"
      >
        <span className="sscw-dot" aria-hidden="true" />
        <span className="sscw-text">
          <span className="sscw-kicker">Free account</span>
          <span className="sscw-label">Sign up free</span>
        </span>
        <i className="bi bi-arrows-angle-expand sscw-icon" aria-hidden="true" />
      </button>
    ),
    document.body,
  );
}

export default SonarSignupCta;
