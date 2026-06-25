'use client';

import { useEffect, useRef, useState } from 'react';
import { ExternalLink, X } from 'lucide-react';

/**
 * ContractDetailPopup — ONE shared, accessible detail popup used by both the
 * "Top contract recipients" list and the contract awards table on the
 * Government Contracts page. It renders a generic modal shell (overlay +
 * `.mkt-award-*` card, close button, Escape/overlay close, focus + scroll
 * lock) and branches on `detail.kind`:
 *
 *   - 'award'     → full USAspending award profile (GET /api/usaspending/award/<id>)
 *   - 'recipient' → recipient facts + their recent awards
 *                   (GET /api/usaspending/contract-awards?recipient=<name>)
 *
 * Every field is real USAspending data; nulls render as "—" / "Not disclosed"
 * and failures degrade to an honest "view on USAspending.gov" state — never
 * fabricated. A recipient's listed awards are themselves clickable and reopen
 * the popup in 'award' mode via `onOpenAward`.
 *
 * Props:
 *  - detail: { kind: 'award' | 'recipient', data }
 *  - onClose()
 *  - onOpenAward({ awardId, recipient }) — switch to an award from a recipient
 */
export function ContractDetailPopup({ detail, onClose, onOpenAward }) {
  const closeRef = useRef(null);
  const modalRef = useRef(null);

  // Shared shell behaviour: Escape closes, focus the close button on open,
  // lock body scroll, and trap Tab focus within the dialog while open.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key !== 'Tab' || !modalRef.current) return;
      const focusables = modalRef.current.querySelectorAll(
        'a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])',
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
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

  return (
    <div className="mkt-award-overlay" onClick={onClose} role="presentation">
      <div
        ref={modalRef}
        className="mkt-award-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="mkt-detail-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          ref={closeRef}
          className="mkt-award-close"
          onClick={onClose}
          aria-label="Close details"
        >
          <X size={18} aria-hidden />
        </button>

        {detail.kind === 'recipient' ? (
          <RecipientBody item={detail.data} onOpenAward={onOpenAward} />
        ) : (
          <AwardBody award={detail.data} />
        )}
      </div>
    </div>
  );
}

/* ── Award profile body ─────────────────────────────────────────────────── */

function AwardBody({ award }) {
  const { awardId, recipient } = award;
  const [state, setState] = useState({ status: 'loading', detail: null, url: null });

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    setState({ status: 'loading', detail: null, url: null });

    fetch(`/api/usaspending/award/${encodeURIComponent(awardId)}`, { signal: controller.signal })
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (data?.detail) {
          setState({ status: 'ready', detail: data.detail, url: data.detail.usaspendingUrl });
        } else {
          setState({ status: 'error', detail: null, url: data?.usaspendingUrl || null });
        }
      })
      .catch((err) => {
        if (cancelled || err?.name === 'AbortError') return;
        setState({ status: 'error', detail: null, url: null });
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [awardId]);

  const { status, detail, url } = state;
  const fallbackUrl = url || `https://www.usaspending.gov/award/${encodeURIComponent(awardId)}`;

  return (
    <>
      <div className="mkt-award-head">
        <p className="mkt-award-eyebrow">{detail?.awardType || 'Federal contract award'}</p>
        <h2 id="mkt-detail-title" className="mkt-award-title">
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
    </>
  );
}

/* ── Recipient body ─────────────────────────────────────────────────────── */

/** Split the leaderboard `meta` ("BA · Air Force" or "Department of Defense"). */
function parseMeta(meta) {
  if (!meta) return ['—', '—'];
  const parts = String(meta).split(' · ');
  if (parts.length >= 2) return [parts[0], parts.slice(1).join(' · ')];
  return ['—', meta];
}

function RecipientBody({ item, onOpenAward }) {
  const { name, meta, value } = item;
  const [ticker, agency] = parseMeta(meta);
  const [state, setState] = useState({ status: 'loading', rows: [] });

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    setState({ status: 'loading', rows: [] });

    fetch(`/api/usaspending/contract-awards?recipient=${encodeURIComponent(name)}&limit=8`, {
      signal: controller.signal,
    })
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        const rows = Array.isArray(data?.rows) ? data.rows : [];
        setState({ status: rows.length ? 'ready' : 'empty', rows });
      })
      .catch((err) => {
        if (cancelled || err?.name === 'AbortError') return;
        setState({ status: 'empty', rows: [] });
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [name]);

  // Honest outbound link — USAspending's search, where the visitor can verify
  // this recipient's full record. (We don't guess a fragile deep-link URL.)
  const searchUrl = 'https://www.usaspending.gov/search';

  return (
    <>
      <div className="mkt-award-head">
        <p className="mkt-award-eyebrow">Top contract recipient · this fiscal year</p>
        <h2 id="mkt-detail-title" className="mkt-award-title">
          {name}
        </h2>
        {meta ? <p className="mkt-award-id">{meta}</p> : null}
      </div>

      <section className="mkt-award-section">
        <h3 className="mkt-award-section-title">Key facts</h3>
        <dl className="mkt-award-facts">
          <Fact label="Total awarded this FY" value={value || '—'} mono />
          <Fact label="Ticker" value={ticker} mono={ticker !== '—'} />
          <Fact label="Primary awarding agency" value={agency} />
        </dl>
      </section>

      <section className="mkt-award-section">
        <h3 className="mkt-award-section-title">Recent awards</h3>
        {state.status === 'loading' && <p className="mkt-award-state">Loading recent awards…</p>}
        {state.status === 'empty' && (
          <p className="mkt-award-empty-note">
            More detail available on USAspending.gov for this recipient.
          </p>
        )}
        {state.status === 'ready' && (
          <ul className="mkt-award-mods">
            {state.rows.map((row) => (
              <li key={row.id}>
                <button
                  type="button"
                  className="mkt-award-mod mkt-award-mod--btn"
                  onClick={() => onOpenAward?.({ awardId: row.awardId, recipient: row.recipient })}
                  disabled={!row.awardId}
                  aria-label={`Open award details — ${row.agency}, ${row.amount}`}
                >
                  <span className="mkt-award-mod-main">
                    <span className="mkt-ds-mono">{row.date}</span>
                    <span className="mkt-award-mod-type">{row.agency}</span>
                  </span>
                  <span className="mkt-award-mod-amt mkt-ds-mono">{row.amount}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="mkt-award-foot">
        <a className="mkt-award-link" href={searchUrl} target="_blank" rel="noopener noreferrer">
          View on USAspending.gov
          <ExternalLink size={15} aria-hidden />
        </a>
        <p className="mkt-award-source">Data from USAspending.gov (U.S. Treasury).</p>
      </div>
    </>
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
