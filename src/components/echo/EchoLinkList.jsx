'use client';

import Link from 'next/link';
import './echo-link-list.css';

/**
 * A short list of in-app links inside an Echo article (Nov 21st, 2026): the
 * research questions to put to Sonar, or the datasets worth watching. Each
 * item is a link plus an optional one-line note (what it answers, or the
 * caveat that comes with it). Block shape:
 *   { type: 'link-list', title, intro?, items: [{ label, href, note? }] }
 */
export function EchoLinkList({ title, intro, items = [] }) {
  if (!items.length) return null;
  return (
    <aside className="echo-link-list">
      {title && <h3 className="echo-link-list-title">{title}</h3>}
      {intro && <p className="echo-link-list-intro">{intro}</p>}
      <ul className="echo-link-list-items">
        {items.map((it) => (
          <li key={it.href + it.label} className="echo-link-list-item">
            <Link href={it.href} className="echo-link-list-link">
              {it.label}
              <i className="bi bi-arrow-up-right" aria-hidden />
            </Link>
            {it.note && <span className="echo-link-list-note">{it.note}</span>}
          </li>
        ))}
      </ul>
    </aside>
  );
}
