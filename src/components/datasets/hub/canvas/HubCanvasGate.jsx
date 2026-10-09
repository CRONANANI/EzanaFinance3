'use client';

/**
 * The waitlist gate for the hub canvas. Opens when a signed-out visitor
 * reaches for a members-only card, or for a fourth card. Same destinations
 * and wording family as the EzanaQL AccountGate (Join the waitlist, Sign in),
 * with copy specific to the reason.
 */
import { useEffect, useRef, useState } from 'react';

export default function HubCanvasGate({ reason, cardTitle, onClose }) {
  const ref = useRef(null);
  const returnTo = useRef(null);
  const [here, setHere] = useState('/datasets');

  useEffect(() => {
    returnTo.current = document.activeElement;
    setHere(`${window.location.pathname}${window.location.search}`);
    ref.current?.focus();
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      returnTo.current?.focus?.();
    };
  }, [onClose]);

  const r = encodeURIComponent(here);
  const title =
    reason === 'limit'
      ? 'Guests can keep three cards on a hub'
      : cardTitle
        ? `${cardTitle} is a members card`
        : 'This card is for members';

  return (
    <div className="hcv-gate-wrap">
      <div className="hcv-gate-backdrop" aria-hidden="true" onClick={onClose} />
      <div
        ref={ref}
        className="hcv-gate"
        role="dialog"
        aria-modal="true"
        aria-labelledby="hcv-gate-title"
        aria-describedby="hcv-gate-sub"
        tabIndex={-1}
      >
        <span className="hcv-gate-ic" aria-hidden="true">
          <i className="bi bi-grid-1x2" />
        </span>
        <h2 id="hcv-gate-title" className="hcv-gate-title">
          {title}
        </h2>
        <p id="hcv-gate-sub" className="hcv-gate-sub">
          Create an account to place every card on this hub, arrange them your way and keep the
          layout. Ezana is opening access in waves: join the waitlist and we will email you an
          invite.
        </p>
        <div className="hcv-gate-actions">
          <a className="hcv-gate-btn hcv-gate-btn--primary" href={`/auth/signup?redirect=${r}`}>
            Join the waitlist
          </a>
          <a className="hcv-gate-btn" href={`/auth/signin?redirect=${r}`}>
            Sign in
          </a>
        </div>
        <button type="button" className="hcv-gate-x" onClick={onClose} aria-label="Close">
          <i className="bi bi-x-lg" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
