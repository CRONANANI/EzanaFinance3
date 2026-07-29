import Link from 'next/link';
import { formatPublishedShort } from '@/lib/echo-format';

import './echo-feature.css';

function truncate(text, max) {
  if (!text) return '';
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

/**
 * Featured "Article of the Month" — a circle filled with the article's HERO
 * IMAGE, a single emerald ring, and an emerald pulse. No background fill, no
 * white backing disc, no second ring. A dark gradient overlay keeps the centered
 * white text legible. Rendered as a Link so it is natively keyboard-focusable and
 * activatable. Sizing/placement come from the shared --echo-circle-* variables.
 */
export function EchoFeatureCircle({ article, className = '' }) {
  if (!article) return null;
  return (
    <Link
      href={`/ezana-echo/${article.id}`}
      className={`echo-feature${className ? ` ${className}` : ''}`}
      aria-label={`Article of the Month: ${article.title}`}
    >
      {article.heroImage?.src ? (
        <img
          className="echo-feature__img"
          src={article.heroImage.src}
          alt={article.heroImage.alt || article.title}
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
      ) : null}
      <span className="echo-feature__overlay">
        <span className="echo-feature__eyebrow">Article of the Month</span>
        <h2 className="echo-feature__title">{article.title}</h2>
        {article.excerpt && (
          <span className="echo-feature__sub">{truncate(article.excerpt, 90)}</span>
        )}
        <span className="echo-feature__meta">
          {formatPublishedShort(article.publishedAt)} · {article.readTime} MIN
        </span>
      </span>
    </Link>
  );
}
