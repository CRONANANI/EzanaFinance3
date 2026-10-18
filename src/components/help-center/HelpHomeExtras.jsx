'use client';

/**
 * The second row of the support centre home, under Start here (Oct 18). The
 * main column used to end at the six step cards, leaving a tall empty area
 * beside the category rail. Two cards fill it:
 *
 *   Most read      the five most-viewed articles in the last 30 days, from
 *                  /api/help-center/trending (help_article_views). Each row
 *                  carries a bar scaled to its views. Until views exist the
 *                  list is the static fallback SupportCenter already holds,
 *                  shown as "Popular guides" with no bars, never fake counts.
 *   Try asking     six one-click questions that run the AI answer in place,
 *                  the same flow as the search pill (source 'try').
 *
 * Both are links or buttons with visible text; the bars are decorative and
 * the view count is in the row's text for screen readers.
 */
import Link from 'next/link';

const fmt = (n) => Number(n || 0).toLocaleString('en-US');

export default function HelpHomeExtras({ trending = [], base, tryAsking = [], onAsk, onArticle }) {
  const rows = trending.slice(0, 5);
  const live = rows.some((r) => typeof r.views === 'number' && r.views > 0);
  const max = live ? Math.max(...rows.map((r) => r.views || 0), 1) : 1;
  if (!rows.length && !tryAsking.length) return null;

  return (
    <div className="hcs-extras">
      {rows.length ? (
        <section className="hcs-xcard" aria-labelledby="hcs-popular-title">
          <div className="hcs-sec-head">
            <h2 id="hcs-popular-title" className="hcs-h2">
              {live ? 'Most read' : 'Popular guides'}
            </h2>
            <span className="hcs-cap">{live ? 'last 30 days' : 'where most people begin'}</span>
          </div>
          <ol className="hcs-pop">
            {rows.map((a, i) => (
              <li key={a.slug}>
                <Link
                  href={a.url || `${base}/article/${a.slug}`}
                  className="hcs-pop-row"
                  onClick={onArticle ? onArticle('popular', a.slug) : undefined}
                >
                  <span className="hcs-pop-idx hcs-mono" aria-hidden="true">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="hcs-pop-body">
                    <span className="hcs-pop-title">{a.title}</span>
                    <span className="hcs-pop-meta">
                      {a.category ? <span>{a.category}</span> : null}
                      {live ? <span className="hcs-mono">{fmt(a.views)} reads</span> : null}
                    </span>
                    {live ? (
                      <span className="hcs-pop-bar" aria-hidden="true">
                        <span style={{ width: `${Math.max(6, ((a.views || 0) / max) * 100)}%` }} />
                      </span>
                    ) : null}
                  </span>
                  <i className="bi bi-chevron-right hcs-chev" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {tryAsking.length ? (
        <section className="hcs-xcard hcs-xcard--ask" aria-labelledby="hcs-try-title">
          <div className="hcs-sec-head">
            <h2 id="hcs-try-title" className="hcs-h2">
              Try asking
            </h2>
            <span className="hcs-cap">answers cite the articles they come from</span>
          </div>
          <ul className="hcs-try">
            {tryAsking.map((t) => (
              <li key={t.q}>
                <button type="button" className="hcs-try-btn" onClick={() => onAsk?.(t.q)}>
                  <i className={`bi ${t.icon || 'bi-chat-left-text'}`} aria-hidden="true" />
                  <span>{t.q}</span>
                  <i className="bi bi-arrow-up-right hcs-try-go" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
