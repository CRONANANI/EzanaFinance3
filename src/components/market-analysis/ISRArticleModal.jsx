'use client';

/**
 * Article viewer for ISR events — matches the "chain view" modal chrome used
 * elsewhere on the Market Analysis page (same sentinel-modal class family)
 * so the UX is consistent. Renders an optional Polymarket badge at the top
 * when the event was matched to an active market.
 */

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { RelatedMarketsPanel } from '@/components/polymarket/RelatedMarketsPanel';
import { useOrg } from '@/contexts/OrgContext';

const OrgSendToTeamModal = dynamic(
  () => import('@/components/org/OrgSendToTeamModal').then((m) => ({ default: m.OrgSendToTeamModal })),
  { ssr: false }
);

function formatLong(iso) {
  try {
    return new Date(iso).toLocaleString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export function ISRArticleModal({ event, polymarket, onClose }) {
  const [showRelated, setShowRelated] = useState(false);
  const { isOrgUser, hasPermission } = useOrg();
  const [showSendModal, setShowSendModal] = useState(false);

  useEffect(() => {
    if (!event) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [event]);

  if (!event) return null;

  return (
    <div
      className="sentinel-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="isr-article-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div className="sentinel-modal-shell ma-event-analysis-shell isr-article-shell">
        <header className="sentinel-modal-header">
          <div>
            <p className="sentinel-modal-kicker">
              ISR · {event.city ? `${event.city}, ` : ''}{event.country}
            </p>
            <h2 id="isr-article-title" className="sentinel-modal-title">
              {event.headline}
            </h2>
            <p className="sentinel-modal-date">
              {event.source} · {formatLong(event.publishedAt)}
            </p>
          </div>
          <button
            type="button"
            className="sentinel-modal-close"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </header>

        <div className="sentinel-modal-main">
          {polymarket && (
            <a
              className="isr-polymarket-banner"
              href={polymarket.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              <div className="isr-polymarket-banner-icon" aria-hidden>
                <span className="isr-polymarket-banner-pulse" />
              </div>
              <div className="isr-polymarket-banner-body">
                <div className="isr-polymarket-banner-kicker">Live on Polymarket</div>
                <div className="isr-polymarket-banner-title">{polymarket.marketTitle}</div>
                <div className="isr-polymarket-banner-meta">
                  YES {(polymarket.yesProbability * 100).toFixed(0)}¢
                  {' · '}
                  Volume ${Math.round(polymarket.volume).toLocaleString()}
                </div>
              </div>
              <i className="bi bi-box-arrow-up-right isr-polymarket-banner-ext" aria-hidden />
            </a>
          )}

          <div className="sentinel-related-markets-section">
            <button
              type="button"
              onClick={() => setShowRelated((v) => !v)}
              className="sentinel-related-markets-toggle"
            >
              <i className="bi bi-graph-up-arrow" />
              {showRelated ? 'Hide related markets' : 'View related prediction markets'}
              <i className={`bi ${showRelated ? 'bi-chevron-up' : 'bi-chevron-down'}`} />
            </button>
            {showRelated && (
              <RelatedMarketsPanel event={event} enabled={showRelated} limit={8} variant="inline" />
            )}
          </div>

          <div className="sentinel-report-section">
            <h3 className="sentinel-report-section-title sentinel-report-section-title--gold">
              Summary
            </h3>
            <div className="sentinel-report-section-body">
              <p>{event.summary || 'No summary available for this event.'}</p>
            </div>
          </div>

          {(event.impactedSymbols?.length || event.impactedKeywords?.length) && (
            <div className="sentinel-report-section">
              <h3 className="sentinel-report-section-title sentinel-report-section-title--gold">
                Potential impact
              </h3>
              <div className="sentinel-report-section-body">
                {event.impactedSymbols?.length ? (
                  <p>
                    <strong>Symbols watched:</strong>{' '}
                    {event.impactedSymbols.join(', ')}
                  </p>
                ) : null}
                {event.impactedKeywords?.length ? (
                  <p>
                    <strong>Tags:</strong>{' '}
                    {event.impactedKeywords.join(', ')}
                  </p>
                ) : null}
              </div>
            </div>
          )}

          <div className="sentinel-report-section">
            <h3 className="sentinel-report-section-title sentinel-report-section-title--gold">
              Source
            </h3>
            <div className="sentinel-report-section-body">
              {event.isSeed ? (
                <p>
                  <strong>{event.source}</strong> — sample entry.{' '}
                  <span className="isr-article-source-note">
                    Live news from this region will replace this once the news feed catches up.
                  </span>
                </p>
              ) : event.url ? (
                <p>
                  Published by <strong>{event.source}</strong>.{' '}
                  <a
                    href={event.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="isr-article-source-link"
                  >
                    Open the original article ↗
                  </a>
                </p>
              ) : (
                <p>
                  Published by <strong>{event.source}</strong>. No public URL available for this story.
                </p>
              )}
              <p className="isr-article-disclaimer">
                ISR aggregates publicly reported news and geolocates events to a
                city/country. It does not surveil private or ambient data.
              </p>
            </div>
          </div>

          {isOrgUser && hasPermission('send_to_team') && (
            <div className="sentinel-report-section">
              <button
                type="button"
                className="ot-btn-primary"
                style={{
                  width: '100%',
                  justifyContent: 'center',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
                onClick={() => setShowSendModal(true)}
              >
                <i className="bi bi-send" /> Send to Team Member
              </button>
            </div>
          )}
        </div>
      </div>

      {showSendModal && (
        <OrgSendToTeamModal
          onClose={() => setShowSendModal(false)}
          attachment={{
            kind: 'isr_event',
            ref: JSON.stringify({ id: event.id, headline: event.headline, url: event.url }),
            label: event.headline,
            meta: { source: event.source, severity: event.severity, country: event.country },
          }}
        />
      )}
    </div>
  );
}
