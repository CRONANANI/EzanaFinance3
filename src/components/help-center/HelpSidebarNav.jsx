'use client';

import { useState } from 'react';
import Link from 'next/link';

/**
 * Persistent topic tree for the help center, shown beside category and
 * article pages. Each category is a collapsible group: the one containing the
 * current page starts expanded, the rest are opened by their chevron.
 *
 * Bootstrap Icons here rather than lucide: the surrounding help-center island
 * is still on lucide, but the repo rule is Bootstrap Icons in new components.
 */
export function HelpSidebarNav({ categories, base, activeCategoryId, activeSlug }) {
  const [open, setOpen] = useState(() => new Set(activeCategoryId ? [activeCategoryId] : []));

  const toggle = (id) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <nav className="hc-sidenav" aria-label="Help center topics">
      {categories.map((cat) => {
        const expanded = open.has(cat.id);
        return (
          <div key={cat.id} className="hc-sidenav-group">
            <div className="hc-sidenav-head">
              <Link
                href={`${base}/category/${cat.id}`}
                className={`hc-sidenav-cat${cat.id === activeCategoryId ? ' is-active' : ''}`}
              >
                {cat.title}
              </Link>
              <button
                type="button"
                className="hc-sidenav-toggle"
                aria-expanded={expanded}
                aria-label={`${expanded ? 'Collapse' : 'Expand'} ${cat.title}`}
                onClick={() => toggle(cat.id)}
              >
                <i
                  className={`bi ${expanded ? 'bi-chevron-down' : 'bi-chevron-right'}`}
                  aria-hidden
                />
              </button>
            </div>
            {expanded && (
              <ul className="hc-sidenav-list">
                {cat.articles.map((a) => (
                  <li key={a.slug}>
                    <Link
                      href={`${base}/article/${a.slug}`}
                      className={`hc-sidenav-link${a.slug === activeSlug ? ' is-active' : ''}`}
                      aria-current={a.slug === activeSlug ? 'page' : undefined}
                    >
                      {a.title}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </nav>
  );
}

export default HelpSidebarNav;
