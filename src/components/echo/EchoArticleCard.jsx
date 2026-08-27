import Link from 'next/link';
import { Archive } from 'lucide-react';
import { formatPublishedShort } from '@/lib/echo-format';

import './echo-card.css';

/**
 * Reusable Echo article card — text-only editorial tile: category kicker row,
 * serif headline, sans dek. No imagery by design (the Echo home is text-first;
 * article pages keep their hero images). Semantic <article> wrapping a Link so
 * the whole card is one keyboard-focusable target. Admins get an inline
 * archive control.
 */
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
        <div className="echo-card__body">
          {/* Transparent paid-partnership labeling: the chip moved from the
              (removed) hero image into the text flow, above the kicker row. */}
          {article.partner && (
            <span className="echo-card__partner-chip">
              <span className="echo-card__partner-label">Partner</span>
              <span className="echo-card__partner-handle">
                {article.partner.handle || article.partner.name}
              </span>
            </span>
          )}
          {/* Text-only tile: mono tag row (subcategory or column label + read
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
