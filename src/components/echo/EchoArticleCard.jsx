import Link from 'next/link';
import { Archive } from 'lucide-react';
import { formatPublishedShort } from '@/lib/echo-format';

import './echo-card.css';

/**
 * Reusable Echo article card — hero image on top, serif title + mono meta below.
 * Semantic <article> wrapping a Link so the whole card is one keyboard-focusable
 * target. `carve` ('br' | 'tr' | 'bl' | 'tl') masks the IMAGE ONLY so the card's
 * image curves away from the featured circle (the title/meta are never masked).
 * Admins get an inline archive control.
 */
export function EchoArticleCard({ article, carve = null, isAdmin = false, onArchive, archivingId }) {
  const carveClass = carve ? ` echo-card--carve-${carve}` : '';

  // Gravity hover: tilt the card toward the cursor so the nearest corner lifts.
  // Carved cards are excluded — their mask is locked to the circle, so we never
  // transform them.
  const gravity = !carve;
  const handleMove = (e) => {
    const el = e.currentTarget;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    const max = 6;
    el.style.setProperty('--tiltX', `${(-py * max).toFixed(2)}deg`);
    el.style.setProperty('--tiltY', `${(px * max).toFixed(2)}deg`);
    el.style.setProperty('--lift', '1');
  };
  const handleLeave = (e) => {
    const el = e.currentTarget;
    el.style.setProperty('--tiltX', '0deg');
    el.style.setProperty('--tiltY', '0deg');
    el.style.setProperty('--lift', '0');
  };

  return (
    <article
      className={`echo-card${carveClass}`}
      onMouseMove={gravity ? handleMove : undefined}
      onMouseLeave={gravity ? handleLeave : undefined}
    >
      {isAdmin && (
        <button
          type="button"
          className="echo-card__archive"
          onClick={(e) => onArchive?.(article.id, e)}
          disabled={archivingId === article.id}
          title="Archive this article"
        >
          <Archive size={13} aria-hidden />
          {archivingId === article.id ? '…' : 'Archive'}
        </button>
      )}
      <Link href={`/ezana-echo/${article.id}`} className="echo-card__link">
        <div className="echo-card__img">
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
