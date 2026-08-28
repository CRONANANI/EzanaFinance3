import Link from 'next/link';
import { Archive } from 'lucide-react';
import { formatPublishedShort } from '@/lib/echo-format';

import './echo-card.css';

/**
 * Reusable Echo article card — hero image on top, serif title + mono meta below.
 * Semantic <article> wrapping a Link so the whole card is one keyboard-focusable
 * target. Admins get an inline archive control.
 */
/* Hover tag marquee: the card's real metadata dims as one mono line along the
   hero's bottom edge. Counts come only from real card data; dims with zero
   count are omitted, and with no nonzero dims the strip is not rendered. */
function peekDims(article) {
  return [
    ['Tickers', article.tickers?.length || 0],
    ['Sectors', article.meta?.sectors?.length || 0],
    ['Themes', article.meta?.themes?.length || 0],
    ['Geos', (article.geos?.length ?? article.meta?.geos?.length) || 0],
  ]
    .filter(([, n]) => n > 0)
    .slice(0, 4);
}

export function EchoArticleCard({
  article,
  isAdmin = false,
  onArchive,
  archivingId,
  focusable = true,
  // Geo-filter muting (homepage continent hover): dims the card in place
  // without unmounting, reordering, or resizing it. Additive; default off.
  muted = false,
}) {
  const peek = peekDims(article);
  const tagLine = peek.map(([label, n]) => `${label.toUpperCase()} ${n}`).join(' · ');
  // Loop duration scales with content length (deterministic, ~8s to 12s).
  const marqueeDur = `${Math.min(12, Math.max(8, 6 + peek.length * 1.5))}s`;
  return (
    <article className={muted ? 'echo-card is-geo-muted' : 'echo-card'}>
      {isAdmin && (
        <button
          type="button"
          className="echo-card__archive"
          onClick={(e) => onArchive?.(article.id, e)}
          disabled={archivingId === article.id}
          tabIndex={focusable ? undefined : -1}
          title="Archive this article"
        >
          <Archive size={13} aria-hidden />
          {archivingId === article.id ? '…' : 'Archive'}
        </button>
      )}
      <Link
        href={`/ezana-echo/${article.id}`}
        className="echo-card__link"
        tabIndex={focusable && !muted ? undefined : -1}
        aria-disabled={muted || undefined}
      >
        <div className="echo-card__img">
          {article.partner && (
            <span className="echo-card__partner-chip">
              <span className="echo-card__partner-label">Partner</span>
              <span className="echo-card__partner-handle">
                {article.partner.handle || article.partner.name}
              </span>
            </span>
          )}
          {article.heroImage?.src ? (
            <img
              src={article.heroImage.src}
              alt={article.heroImage.alt || article.title}
              loading="lazy"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          ) : null}
          {peek.length > 0 && (
            <span
              className="echo-card__marquee"
              aria-hidden="true"
              style={{ '--marquee-dur': marqueeDur }}
            >
              {/* Duplicated sequence = seamless conveyor loop at translateX(-50%). */}
              <span className="echo-card__marquee-track">
                <span className="echo-card__marquee-seq">{tagLine} · </span>
                <span className="echo-card__marquee-seq">{tagLine} · </span>
              </span>
            </span>
          )}
        </div>
        <div className="echo-card__body">
          {/* Tile Modules: mono tag row (subcategory or column label + read
              time), then the headline, then a two-line excerpt. */}
          <p className="echo-card__tags">
            {(article.subcategory || article.categoryLabel) && (
              <span className="echo-card__tag">{article.subcategory || article.categoryLabel}</span>
            )}
            <span className="echo-card__tag-time">
              {formatPublishedShort(article.publishedAt)} · {article.readTime} MIN
            </span>
          </p>
          <h3 className="echo-card__title">{article.title}</h3>
          {article.excerpt && <p className="echo-card__excerpt">{article.excerpt}</p>}
        </div>
      </Link>
    </article>
  );
}
