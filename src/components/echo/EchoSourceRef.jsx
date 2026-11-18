'use client';

/**
 * A numbered source reference in Echo article text (Nov 18 2026). Renders as
 * a small superscript number; tapping it opens a compact card with where the
 * figure comes from, and a link when the note carries one. Escape, a tap
 * outside or the close button dismisses it. On phones the card sits in the
 * middle of the screen; elsewhere under the number.
 */
import { useEffect, useId, useRef, useState } from 'react';

const URL_RE = /(https?:\/\/[^\s)]+)/;

export function EchoSourceRef({ n, note }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const id = useId();
  const url = String(note || '').match(URL_RE)?.[1] || null;
  const text = String(note || '')
    .replace(URL_RE, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (!wrapRef.current?.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <span ref={wrapRef} className="echo-src">
      <button
        type="button"
        className={`echo-src-n${open ? ' is-open' : ''}`}
        aria-expanded={open}
        aria-controls={id}
        aria-label={`Source ${n}`}
        onClick={() => setOpen((o) => !o)}
      >
        {n}
      </button>
      {open ? (
        <span id={id} role="dialog" aria-label={`Source ${n}`} className="echo-src-card">
          <span className="echo-src-head">
            <span className="echo-src-eyebrow">Source {n}</span>
            <button
              type="button"
              className="echo-src-x"
              aria-label="Close source"
              onClick={() => setOpen(false)}
            >
              <i className="bi bi-x-lg" aria-hidden="true" />
            </button>
          </span>
          {text ? <span className="echo-src-text">{text}</span> : null}
          {url ? (
            <a className="echo-src-link" href={url} target="_blank" rel="noopener noreferrer">
              Open the data <i className="bi bi-box-arrow-up-right" aria-hidden="true" />
            </a>
          ) : null}
        </span>
      ) : null}
    </span>
  );
}

export default EchoSourceRef;
