'use client';

import { useRelatedPolymarketMarkets } from '@/hooks/useRelatedPolymarketMarkets';
import './related-markets-panel.css';

/**
 * Displays Polymarket prediction markets related to the given event.
 * Visual style matches Polymarket's own dark dense aesthetic:
 *   - Dark surface, emerald accent on YES probability
 *   - ¢ pricing (e.g. "65¢" instead of "65%")
 *   - Compact rows with title, odds, volume, end date
 *   - Each row links to the live market on polymarket.com
 *
 * Designed to be embedded inline in event detail views OR shown as a modal panel.
 */
export function RelatedMarketsPanel({
  event,
  enabled = true,
  limit = 8,
  variant = 'inline',
  onClose,
}) {
  const { markets, noHighConfidence, isLoading, error } = useRelatedPolymarketMarkets(event, {
    enabled,
    limit,
  });

  const className = `pm-related${variant === 'modal' ? ' pm-related--modal' : ''}`;

  return (
    <div className={className}>
      <header className="pm-related__header">
        <div className="pm-related__title-group">
          <span className="pm-related__live-dot" aria-hidden />
          <h3 className="pm-related__title">Related on Polymarket</h3>
        </div>
        {variant === 'modal' && (
          <button
            type="button"
            onClick={onClose}
            className="pm-related__close"
            aria-label="Close"
          >
            ×
          </button>
        )}
      </header>

      {variant === 'modal' && (
        <p className="pm-related__subtitle">
          Live prediction markets matched to this event&apos;s keywords. Odds shown in cents
          (¢) — the implied probability of the YES outcome.
        </p>
      )}

      {isLoading && (
        <div className="pm-related__skeleton">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="pm-related__skeleton-row" />
          ))}
        </div>
      )}

      {!isLoading && error && (
        <div className="pm-related__empty">
          Couldn&apos;t reach Polymarket right now. Try again in a moment.
        </div>
      )}

      {!isLoading && !error && markets.length === 0 && noHighConfidence && (
        <div className="pm-related__empty">
          No high-confidence prediction markets match this article. We searched Polymarket with this
          event&apos;s keywords and symbols, but nothing passed the relevance bar right now.
        </div>
      )}

      {!isLoading && !error && markets.length === 0 && !noHighConfidence && (
        <div className="pm-related__empty">
          No related markets found on Polymarket. The keywords from this event didn&apos;t match
          any active markets right now — that&apos;s normal for niche or breaking news.
        </div>
      )}

      {!isLoading && !error && markets.length > 0 && (
        <ul className="pm-related__list">
          {markets.map((m) => (
            <MarketRow key={m.marketId || m.marketTitle} market={m} />
          ))}
        </ul>
      )}

      <footer className="pm-related__footer">
        <span>Data sourced live from Polymarket&apos;s public Gamma API.</span>
        <a
          href="https://polymarket.com"
          target="_blank"
          rel="noopener noreferrer"
          className="pm-related__footer-link"
        >
          polymarket.com →
        </a>
      </footer>
    </div>
  );
}

function MarketRow({ market }) {
  const yesCents = Math.round((market.yesProbability ?? 0.5) * 100);
  const noCents = 100 - yesCents;
  const vol = formatVolume(market.volume24hr || market.volume);
  const ends = market.endDate ? formatRelativeEnd(market.endDate) : null;

  return (
    <li>
      <a
        href={market.url}
        target="_blank"
        rel="noopener noreferrer"
        className="pm-related__row"
      >
        <div className="pm-related__row-icon-cell">
          {market.icon ? (
            <img
              src={market.icon}
              alt=""
              className="pm-related__row-icon"
              loading="lazy"
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
          ) : null}
        </div>

        <div className="pm-related__row-body">
          <div className="pm-related__row-title">{market.marketTitle}</div>
          <div className="pm-related__row-meta">
            {ends && <span>Ends {ends}</span>}
            {ends && vol && <span aria-hidden> · </span>}
            {vol && <span>${vol} 24h vol</span>}
          </div>
        </div>

        <div className="pm-related__row-odds">
          <div className="pm-related__odds-pair">
            <div className="pm-related__odds pm-related__odds--yes">
              <span className="pm-related__odds-label">YES</span>
              <span className="pm-related__odds-value">{yesCents}¢</span>
            </div>
            <div className="pm-related__odds pm-related__odds--no">
              <span className="pm-related__odds-label">NO</span>
              <span className="pm-related__odds-value">{noCents}¢</span>
            </div>
          </div>
        </div>

        <i
          className="bi bi-box-arrow-up-right pm-related__row-ext"
          aria-hidden
        />
      </a>
    </li>
  );
}

function formatVolume(v) {
  if (!v || v < 1) return null;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
  return Math.round(v).toString();
}

function formatRelativeEnd(iso) {
  try {
    const end = new Date(iso);
    const now = new Date();
    const diffMs = end - now;
    if (diffMs < 0) return 'closed';
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (days === 0) return 'today';
    if (days === 1) return 'tomorrow';
    if (days < 7) return `in ${days}d`;
    if (days < 60) return `in ${Math.floor(days / 7)}w`;
    return end.toLocaleDateString([], { month: 'short', day: 'numeric' });
  } catch {
    return null;
  }
}
