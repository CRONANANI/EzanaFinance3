'use client';

import Link from 'next/link';

const NONE = '·';

/**
 * The category list, ONE component in three modes:
 *   resting  every category with icon, name, chevron (home)
 *   matches  the same rows with a match count; rows with matches are
 *            highlighted, rows without are dimmed with a middle dot
 *   strip    a horizontal scroll of pills under the header (below 1000px)
 * Order is always canonical; nothing resorts by count.
 */
export default function CategoryRail({ categories, mode = 'resting', counts = {}, q = '' }) {
  const matching = mode === 'matches';
  const withQ = (url) => (matching && q ? `${url}?q=${encodeURIComponent(q)}` : url);
  const total = categories.length;

  return (
    <nav
      className={`hcs-rail hcs-rail--${mode}`}
      aria-label="Categories"
      data-strip={mode === 'strip' ? '' : undefined}
    >
      <div className="hcs-rail-head">
        <span className="hcs-mono-label">ALL CATEGORIES</span>
        <span className="hcs-mono-label">{matching ? 'MATCHES' : total}</span>
      </div>
      <ul className="hcs-rail-list">
        {categories.map((c) => {
          const n = counts[c.title] || 0;
          const hit = matching && n > 0;
          const dim = matching && n === 0;
          return (
            <li key={c.id}>
              <Link
                href={withQ(c.url)}
                className={`hcs-rail-row${hit ? ' is-hit' : ''}${dim ? ' is-dim' : ''}`}
              >
                <span className="hcs-tile hcs-tile--30" aria-hidden="true">
                  <i className={`bi ${c.icon}`} />
                </span>
                <span className="hcs-rail-name">{c.title}</span>
                {matching ? (
                  <span className="hcs-rail-count hcs-mono">
                    {n > 0 ? n : NONE}
                    <span className="hcs-sr">
                      {n === 1 ? ' 1 matching article' : ` ${n} matching articles`}
                    </span>
                  </span>
                ) : (
                  <i className="bi bi-chevron-right hcs-chev" aria-hidden="true" />
                )}
              </Link>
            </li>
          );
        })}
      </ul>
      {matching ? (
        <p className="hcs-rail-note">
          Highlighted categories hold at least one article relevant to your question.
        </p>
      ) : null}
    </nav>
  );
}
