'use client';

import { useEffect, useState } from 'react';

/**
 * "On this page" rail. Reads the already-rendered prose container by id,
 * collects its h2/h3 nodes, gives any without one a slugified id, and tracks
 * the heading currently in view. Renders nothing for a short article.
 */
const slugify = (s) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

export function ArticleToc({ containerId }) {
  const [items, setItems] = useState([]);
  const [activeId, setActiveId] = useState(null);

  useEffect(() => {
    const root = document.getElementById(containerId);
    if (!root) return undefined;
    const heads = Array.from(root.querySelectorAll('h2, h3'));
    const collected = heads.map((el) => {
      if (!el.id) el.id = slugify(el.textContent || '');
      return { id: el.id, text: el.textContent, level: el.tagName === 'H3' ? 3 : 2 };
    });
    setItems(collected);
    if (typeof IntersectionObserver === 'undefined') return undefined;
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length) setActiveId(visible[0].target.id);
      },
      { rootMargin: '-96px 0px -70% 0px' },
    );
    heads.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [containerId]);

  if (items.length < 2) return null;

  return (
    <nav className="hc-toc" aria-label="On this page">
      <p className="hc-toc-label">On this page</p>
      <ul>
        {items.map((it) => (
          <li key={it.id} className={it.level === 3 ? 'hc-toc-sub' : ''}>
            <a href={`#${it.id}`} className={activeId === it.id ? 'is-active' : ''}>
              {it.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export default ArticleToc;
