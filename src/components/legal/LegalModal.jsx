'use client';

/**
 * Terms of Service and Privacy Policy as a popup card (Nov 20, 2026; after the
 * 21st.dev "terms and conditions" and "privacy policy modal" dialogs, rebuilt
 * on Ezana tokens: no shadcn, Tailwind or lucide).
 *
 * - Overlay card per the UI guide (4.4): solid surface, hairline border,
 *   shadow, radius-lg. Header: mono "LEGAL" eyebrow, title, last-updated line,
 *   an "Open full page" icon link and a close icon button.
 * - A thin emerald bar under the header tracks how far the reader has
 *   scrolled. "I agree" stays disabled until the end is reached, with a hint
 *   line beside it; Cancel is a plain text button (no outlined buttons).
 * - Agreeing records the version read in localStorage (wrapped; storage can
 *   be unavailable) so a returning reader sees "Accepted" with the date.
 * - Escape, a click on the backdrop and Cancel close it; Tab stays inside;
 *   focus returns to the link that opened it; the page behind does not
 *   scroll. Respects prefers-reduced-motion.
 * - Privacy content is the Termly export served by /api/legal/privacy and
 *   styled by the same .privacy-policy-termly overrides as the full page.
 */
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { TermsBody, TERMS_LAST_UPDATED } from '@/components/legal/TermsBody';
import '@/app/legal-pages.css';
import './legal-modal.css';

const DOCS = {
  terms: {
    title: 'Terms of Service',
    href: '/terms-of-service',
    updated: TERMS_LAST_UPDATED,
    accept: 'I agree',
    decline: 'Cancel',
    hint: 'Read all terms before accepting.',
  },
  privacy: {
    title: 'Privacy Policy',
    href: '/privacy-policy',
    updated: null,
    accept: 'Accept',
    decline: 'Decline',
    hint: 'Scroll to the end to accept.',
  },
};

const FOCUSABLE =
  'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';
const ACK_KEY = (doc) => `ezana.legal.accepted.${doc}`;

function readAck(doc) {
  try {
    const raw = window.localStorage.getItem(ACK_KEY(doc));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeAck(doc, version) {
  try {
    window.localStorage.setItem(
      ACK_KEY(doc),
      JSON.stringify({ version, at: new Date().toISOString() }),
    );
  } catch {
    /* storage unavailable: the popup still closes */
  }
}

let privacyCache = null;
function loadPrivacy() {
  if (!privacyCache) {
    privacyCache = fetch('/api/legal/privacy')
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json();
      })
      .catch((err) => {
        privacyCache = null;
        throw err;
      });
  }
  return privacyCache;
}

/** Warm the privacy text before the popup opens (hover or focus on a link). */
export function prefetchPrivacy() {
  loadPrivacy().catch(() => {});
}

export default function LegalModal({ doc, onClose }) {
  const meta = DOCS[doc] || DOCS.terms;
  const titleId = useId();
  const cardRef = useRef(null);
  const bodyRef = useRef(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const [progress, setProgress] = useState(0);
  const [privacy, setPrivacy] = useState(null);
  const [privacyError, setPrivacyError] = useState(false);
  const [ack, setAck] = useState(null);

  const version = meta.updated || 'current';
  const accepted = ack && ack.version === version;
  const reachedEnd = progress >= 0.99;

  useEffect(() => {
    setAck(readAck(doc));
    setProgress(0);
    if (bodyRef.current) bodyRef.current.scrollTop = 0;
  }, [doc]);

  useEffect(() => {
    if (doc !== 'privacy') return undefined;
    let live = true;
    setPrivacyError(false);
    loadPrivacy()
      .then((d) => live && setPrivacy(d))
      .catch(() => live && setPrivacyError(true));
    return () => {
      live = false;
    };
  }, [doc]);

  const measure = useCallback(() => {
    const el = bodyRef.current;
    if (!el) return;
    const room = el.scrollHeight - el.clientHeight;
    /* Content shorter than the box counts as read. */
    setProgress(room <= 4 ? 1 : Math.min(1, el.scrollTop / room));
  }, []);

  /* Re-measure once the content (or the fetched privacy text) is in. */
  useEffect(() => {
    const id = requestAnimationFrame(measure);
    return () => cancelAnimationFrame(id);
  }, [measure, doc, privacy]);

  /* Scroll lock, focus trap, Escape, focus return. */
  useEffect(() => {
    const previously = document.activeElement;
    const root = document.documentElement;
    const prevOverflow = root.style.overflow;
    root.style.overflow = 'hidden';
    const card = cardRef.current;
    const items = () => (card ? Array.from(card.querySelectorAll(FOCUSABLE)) : []);
    /* Focus the card itself (no ring): Tab then reaches the controls. */
    card?.focus?.({ preventScroll: true });

    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCloseRef.current?.();
        return;
      }
      if (e.key !== 'Tab') return;
      const list = items();
      if (!list.length) {
        e.preventDefault();
        return;
      }
      const first = list[0];
      const last = list[list.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      root.style.overflow = prevOverflow;
      previously?.focus?.();
    };
  }, []);

  const agree = () => {
    writeAck(doc, version);
    onClose();
  };

  const ackDate = accepted
    ? new Date(ack.at).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : null;

  return (
    <div
      className="lgm-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={cardRef}
        className="lgm-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <header className="lgm-head">
          <div className="lgm-head__text">
            <span className="lgm-eyebrow">Legal</span>
            <h2 id={titleId} className="lgm-title">
              {meta.title}
            </h2>
            {meta.updated ? <span className="lgm-meta">Last updated {meta.updated}</span> : null}
          </div>
          <div className="lgm-head__actions">
            <a
              className="lgm-icon"
              href={meta.href}
              data-legal-skip=""
              aria-label={`Open the full ${meta.title} page`}
              title="Open full page"
            >
              <i className="bi bi-box-arrow-up-right" aria-hidden="true" />
            </a>
            <button type="button" className="lgm-icon lgm-close" onClick={onClose} aria-label="Close">
              <i className="bi bi-x-lg" aria-hidden="true" />
            </button>
          </div>
        </header>

        <div
          className="lgm-progress"
          role="progressbar"
          aria-label="Reading progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress * 100)}
        >
          <span style={{ transform: `scaleX(${progress})` }} />
        </div>

        <div ref={bodyRef} className="lgm-body" onScroll={measure} tabIndex={0}>
          {doc === 'privacy' ? (
            privacy ? (
              <>
                <style dangerouslySetInnerHTML={{ __html: privacy.css }} />
                <div
                  className="privacy-policy-termly lgm-termly"
                  dangerouslySetInnerHTML={{ __html: privacy.html }}
                />
              </>
            ) : privacyError ? (
              <p className="lgm-state">
                The policy did not load. <a href={meta.href} data-legal-skip="">Open the full page</a>
                .
              </p>
            ) : (
              <p className="lgm-state" aria-live="polite">
                Loading the policy...
              </p>
            )
          ) : (
            <div className="legal-container lgm-legal">
              <TermsBody />
            </div>
          )}
        </div>

        <footer className="lgm-foot">
          <span className={`lgm-hint${accepted ? ' is-ok' : ''}`} aria-live="polite">
            {accepted ? (
              <>
                <i className="bi bi-check2-circle" aria-hidden="true" /> Accepted {ackDate}
              </>
            ) : reachedEnd ? (
              'Thanks for reading.'
            ) : (
              meta.hint
            )}
          </span>
          <button type="button" className="lgm-btn lgm-btn--text" onClick={onClose}>
            {meta.decline}
          </button>
          <button
            type="button"
            className="lgm-btn lgm-btn--primary"
            disabled={!reachedEnd && !accepted}
            onClick={agree}
          >
            {meta.accept}
          </button>
        </footer>
      </div>
    </div>
  );
}
