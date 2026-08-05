'use client';

/**
 * Per-card methodology button — a 16px mono "i" at the card's top-right that
 * opens a persistent, card-anchored popover. Closes on outside click or Esc;
 * focus moves into the dialog and returns to the button on close. Copy comes
 * from `oecd-methodology.js` (authored verbatim). Positioned by CSS relative to
 * the card (which is position: relative), so it needs no portal.
 */
import { useEffect, useId, useRef, useState } from 'react';

export default function OecdInfoButton({ entry }) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef(null);
  const popRef = useRef(null);
  const id = useId();

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (
        popRef.current &&
        !popRef.current.contains(e.target) &&
        btnRef.current &&
        !btnRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    };
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setOpen(false);
        btnRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    popRef.current?.focus();
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!entry) return null;

  return (
    <span className="oecd-info-wrap">
      <button
        ref={btnRef}
        type="button"
        className="oecd-info-btn"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        aria-label={`Methodology: ${entry.title}`}
        onClick={() => setOpen((o) => !o)}
      >
        i
      </button>
      {open ? (
        <div
          ref={popRef}
          id={id}
          className="oecd-info-pop"
          role="dialog"
          aria-label={entry.title}
          tabIndex={-1}
        >
          <div className="oecd-info-pop-title">{entry.title}</div>
          <p className="oecd-info-pop-body">{entry.body}</p>
        </div>
      ) : null}
    </span>
  );
}
