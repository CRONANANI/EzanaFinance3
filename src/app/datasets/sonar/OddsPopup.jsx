'use client';

/**
 * Polymarket market detail, opened from an ODDS ticker item or the Arrivals
 * odds card. Ported from the old overview unchanged in behaviour: Escape and
 * the backdrop close it, it links to the verified event page, and it carries
 * the information-only note. Bootstrap Icons, page tokens, no dashes.
 */
import { useEffect, useRef, useState } from 'react';
import { compactUsd } from './derive';
import { marketOutcomes } from './feeds';

function fmtDate(d) {
  const t = Date.parse(d);
  if (!Number.isFinite(t)) return null;
  return new Date(t).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export default function OddsPopup({ slug, question, onClose }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);
  const dialogRef = useRef(null);

  useEffect(() => {
    const opener = document.activeElement;
    dialogRef.current?.focus();
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Tab' && dialogRef.current) {
        const f = dialogRef.current.querySelectorAll('a[href], button:not([disabled])');
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
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      if (opener && typeof opener.focus === 'function') opener.focus();
    };
  }, [onClose]);

  useEffect(() => {
    let alive = true;
    setData(null);
    setError(false);
    fetch(`/api/polymarket/market?slug=${encodeURIComponent(slug)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!alive) return;
        if (d && !d.error && (d.question || d.outcomes)) setData(d);
        else setError(true);
      })
      .catch(() => alive && setError(true));
    return () => {
      alive = false;
    };
  }, [slug]);

  const outcomes = data ? marketOutcomes(data) : [];
  /* The verified event slug, never the market slug: the latter 404s in an
     /event/ URL. No event slug, no link. */
  const eventUrl = data?.eventSlug ? `https://polymarket.com/event/${data.eventSlug}` : null;
  const resolves = data?.endDate ? fmtDate(data.endDate) : null;

  return (
    <div className="dso-modal-backdrop" onClick={onClose}>
      <div
        className="dso-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dso-modal-q"
        tabIndex={-1}
        ref={dialogRef}
      >
        <button type="button" className="dso-modal-x" onClick={onClose} aria-label="Close">
          <i className="bi bi-x-lg" aria-hidden="true" />
        </button>
        <span className="dso-modal-tag dso-mono">Odds · prediction market</span>
        <h2 className="dso-modal-q" id="dso-modal-q">
          {data?.question || question}
        </h2>

        {!data && !error ? (
          <div aria-busy="true" aria-live="polite">
            <span className="dso-skel" style={{ width: '55%' }} />
            <span className="dso-skel dso-skel--bar" />
            <span className="dso-skel dso-skel--bar" />
          </div>
        ) : null}

        {error ? (
          <p className="dso-modal-state">
            This market could not load just now.{' '}
            <a
              className="dso-modal-link"
              href="https://polymarket.com"
              target="_blank"
              rel="noopener noreferrer"
            >
              View on Polymarket <i className="bi bi-box-arrow-up-right" aria-hidden="true" />
            </a>
          </p>
        ) : null}

        {data ? (
          <>
            <p className="dso-modal-meta">
              {data.category ? <span>{data.category}</span> : null}
              {resolves ? (
                <span>
                  Resolves <b className="dso-mono">{resolves}</b>
                </span>
              ) : null}
              {Number(data.volume) > 0 ? (
                <span>
                  Volume <b className="dso-mono">{compactUsd(data.volume)}</b>
                </span>
              ) : null}
            </p>
            <h3 className="dso-modal-h">Current market-implied probabilities</h3>
            {outcomes.length ? (
              outcomes.map((o) => {
                const pct = Math.round(o.prob * 100);
                return (
                  <div className="dso-outcome" key={o.name}>
                    <div className="dso-outcome-top">
                      <span>{o.name}</span>
                      <span className="dso-mono">
                        {pct}¢ · {pct}%
                      </span>
                    </div>
                    <div className="dso-bar" aria-hidden="true">
                      <i style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="dso-modal-state">No current outcome prices published.</p>
            )}
            {eventUrl ? (
              <a
                className="dso-modal-link"
                href={eventUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                View on Polymarket <i className="bi bi-box-arrow-up-right" aria-hidden="true" />
              </a>
            ) : null}
            <p className="dso-modal-note">
              Current market-implied probabilities from Polymarket, shown for information only, not
              investment advice.
            </p>
          </>
        ) : null}
      </div>
    </div>
  );
}
