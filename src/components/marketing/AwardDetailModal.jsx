'use client';

import { useEffect, useRef, useState } from 'react';
import { ExternalLink, X } from 'lucide-react';

/**
 * AwardDetailModal — accessible dialog showing one USAspending federal award.
 * Fetches /api/usaspending/award/<awardId> on open. Every field is real
 * USAspending data; null fields render as "—" / "Not disclosed" (never
 * fabricated). On fetch failure it shows a graceful empty state with the
 * outbound "View on USAspending.gov" link rather than a forever-spinner.
 *
 * Props:
 *  - award: { awardId, recipient } — recipient seeds the header before the
 *      profile loads.
 *  - onClose(): close handler.
 */
export function AwardDetailModal({ award, onClose }) {
  const { awardId, recipient } = award;
  const [state, setState] = useState({ status: 'loading', detail: null, error: null, url: null });
  const closeRef = useRef(null);

  // Fetch the award profile. Aborted if the modal closes / award changes.
  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    setState({ status: 'loading', detail: null, error: null, url: null });

    fetch(`/api/usaspending/award/${encodeURIComponent(awardId)}`, { signal: controller.signal })
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (data?.detail) {
          setState({
            status: 'ready',
            detail: data.detail,
            error: null,
            url: data.detail.usaspendingUrl,
          });
        } else {
          setState({
            status: 'error',
            detail: null,
            error: data?.error || 'unavailable',
            url: data?.usaspendingUrl || null,
          });
        }
      })
      .catch((err) => {
        if (cancelled || err?.name === 'AbortError') return;
        setState({ status: 'error', detail: null, error: 'unavailable', url: null });
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [awardId]);

  // Escape closes; focus the close button on open; restore body scroll lock.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    closeRef.current?.focus();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  const { status, detail, url } = state;
  const fallbackUrl = url || `https://www.usaspending.gov/award/${encodeURIComponent(awardId)}`;

  return (
    <div className="mkt-award-overlay" onClick={onClose} role="presentation">
      <div
        className="mkt-award-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="mkt-award-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          ref={closeRef}
          className="mkt-award-close"
          onClick={onClose}
          aria-label="Close award details"
        >
          <X size={18} aria-hidden />
        </button>

        <div className="mkt-award-head">
          <p className="mkt-award-eyebrow">{detail?.awardType || 'Federal contract award'}</p>
          <h2 id="mkt-award-title" className="mkt-award-title">
            {detail?.recipientName || recipient || 'Award details'}
          </h2>
          <p className="mkt-award-id mkt-ds-mono">{detail?.piid || awardId}</p>
        </div>

        {status === 'loading' && <p className="mkt-award-state">Loading award details…</p>}

        {status === 'error' && (
          <div className="mkt-award-state">
            <p>Details unavailable right now.</p>
            <a
              className="mkt-award-link"
              href={fallbackUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              View on USAspending.gov
              <ExternalLink size={15} aria-hidden />
            </a>
          </div>
        )}

        {status === 'ready' && detail && (
          <div className="mkt-award-body">
            {detail.description && detail.description !== 'Not disclosed' && (
              <p className="mkt-award-desc">{detail.description}</p>
            )}

            <section className="mkt-award-section">
              <h3 className="mkt-award-section-title">Key facts</h3>
              <dl className="mkt-award-facts">
                <Fact label="Total obligation" value={detail.totalObligation} mono />
                <Fact label="Base &amp; all options" value={detail.baseAndAllOptions} mono />
                <Fact label="Date signed" value={detail.dateSigned} mono />
                <Fact
                  label="Period of performance"
                  value={`${detail.popStart} → ${detail.popEnd}`}
                  mono
                />
                <Fact
                  label="Awarding agency"
                  value={detail.awardingAgency}
                  sub={detail.awardingSubAgency}
                />
                {detail.fundingDiffers && (
                  <Fact
                    label="Funding agency"
                    value={detail.fundingAgency}
                    sub={detail.fundingSubAgency}
                  />
                )}
              </dl>
            </section>

            <section className="mkt-award-section">
              <h3 className="mkt-award-section-title">Classification</h3>
              <dl className="mkt-award-facts">
                <Fact
                  label="NAICS"
                  value={
                    detail.naics.code
                      ? `${detail.naics.code}${detail.naics.description ? ` · ${detail.naics.description}` : ''}`
                      : 'Not disclosed'
                  }
                  mono={!!detail.naics.code}
                />
                <Fact
                  label="PSC"
                  value={
                    detail.psc.code
                      ? `${detail.psc.code}${detail.psc.description ? ` · ${detail.psc.description}` : ''}`
                      : 'Not disclosed'
                  }
                  mono={!!detail.psc.code}
                />
                <Fact
                  label="Place of performance"
                  value={detail.placeOfPerformance || 'Not disclosed'}
                />
                {detail.businessCategories.length > 0 && (
                  <Fact
                    label="Business categories"
                    value={detail.businessCategories.slice(0, 6).join(', ')}
                  />
                )}
                {detail.parentAward && (
                  <Fact
                    label="Parent award (IDV)"
                    value={detail.parentAward.piid || detail.parentAward.id}
                    mono
                  />
                )}
              </dl>
            </section>

            {detail.modifications.length > 0 && (
              <section className="mkt-award-section">
                <h3 className="mkt-award-section-title">Modification history</h3>
                <ul className="mkt-award-mods">
                  {detail.modifications.map((m) => (
                    <li key={m.id} className="mkt-award-mod">
                      <span className="mkt-award-mod-main">
                        <span className="mkt-ds-mono">{m.date}</span>
                        {m.modNumber ? (
                          <span className="mkt-award-mod-num">mod {m.modNumber}</span>
                        ) : null}
                        <span className="mkt-award-mod-type">{m.type}</span>
                      </span>
                      <span className="mkt-award-mod-amt mkt-ds-mono">{m.amount}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <div className="mkt-award-foot">
              <a
                className="mkt-award-link"
                href={detail.usaspendingUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                View on USAspending.gov
                <ExternalLink size={15} aria-hidden />
              </a>
              <p className="mkt-award-source">Data from USAspending.gov (U.S. Treasury).</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Fact({ label, value, sub, mono }) {
  return (
    <div className="mkt-award-fact">
      <dt className="mkt-award-fact-label">{label}</dt>
      <dd className={`mkt-award-fact-value${mono ? ' mkt-ds-mono' : ''}`}>
        {value}
        {sub ? <span className="mkt-award-fact-sub">{sub}</span> : null}
      </dd>
    </div>
  );
}
