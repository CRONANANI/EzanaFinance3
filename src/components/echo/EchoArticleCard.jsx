import Link from 'next/link';
import { Archive } from 'lucide-react';
import { formatPublishedShort } from '@/lib/echo-format';

import './echo-card.css';

/**
 * Reusable Echo article card — hero image on top, serif title + mono meta below.
 * Semantic <article> wrapping a Link so the whole card is one keyboard-focusable
 * target. Admins get an inline archive control.
 */
export function EchoArticleCard({
  article,
  isAdmin = false,
  onArchive,
  archivingId,
  focusable = true,
}) {
  return (
    <article className="echo-card">
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
        tabIndex={focusable ? undefined : -1}
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
        </div>
        <div className="echo-card__body">
          <h3 className="echo-card__title">{article.title}</h3>
          <p className="echo-card__meta">
            {formatPublishedShort(article.publishedAt)} · {article.readTime} MIN
          </p>
        </div>
      </Link>
    </article>
  );
}
