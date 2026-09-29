'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  USER_CATEGORIES,
  PARTNER_CATEGORIES,
  USER_ARTICLES,
  PARTNER_ARTICLES,
} from '@/lib/help-center-content';

/**
 * "Trending articles" rail on the Help Center hubs: the most-visited articles
 * of the last 30 days (GET /api/help-center/trending). Until views accrue, or
 * if the API returns nothing, it falls back to the first articles of the first
 * two categories so the rail is never empty.
 */
const CATALOG = {
  user: { cats: USER_CATEGORIES, arts: USER_ARTICLES, base: '/help-center/user' },
  partner: { cats: PARTNER_CATEGORIES, arts: PARTNER_ARTICLES, base: '/help-center/partner' },
};

function fallbackItems(section, n) {
  const { cats, arts } = CATALOG[section];
  const out = [];
  const perCat = Math.ceil(n / 2);
  for (const cat of cats.slice(0, 2)) {
    for (const a of cat.articles.slice(0, perCat)) {
      if (out.length >= n) return out;
      if (arts[a.slug]) {
        out.push({ slug: a.slug, title: arts[a.slug].title, category: cat.title, views: null });
      }
    }
  }
  return out;
}

export default function TrendingArticles({ section = 'user', limit = 6 }) {
  /* Start from the static fallback so the server-rendered HTML (and a reader
     whose fetch fails) always sees real links, never empty skeleton rows;
     live counts replace it when the API has any. */
  const [items, setItems] = useState(() => fallbackItems(section, limit));
  const { base, arts } = CATALOG[section];

  useEffect(() => {
    let alive = true;
    fetch(`/api/help-center/trending?section=${section}&limit=${limit}`)
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((d) => {
        if (!alive) return;
        /* Resolve titles locally too, so a slug the content module no longer
           has can never render a dead link. */
        const live = (d.items || []).filter((it) => arts[it.slug]);
        setItems(live.length ? live : fallbackItems(section, limit));
      })
      .catch(() => alive && setItems(fallbackItems(section, limit)));
    return () => {
      alive = false;
    };
  }, [section, limit, arts]);

  return (
    <aside className="hc-trending" aria-labelledby="hc-trending-title">
      <h2 id="hc-trending-title" className="hc-trending-title">
        <i className="bi bi-graph-up-arrow" aria-hidden="true" />
        Trending articles
      </h2>
      <p className="hc-trending-sub">
        {items.some((it) => it.views != null)
          ? 'Most visited in the last 30 days'
          : 'Good places to start'}
      </p>
      {!items.length ? null : (
        <ol className="hc-trending-list">
          {items.map((it, i) => (
            <li key={it.slug}>
              <Link href={`${base}/article/${it.slug}`} className="hc-trending-item">
                <span className="hc-trending-rank">{String(i + 1).padStart(2, '0')}</span>
                <span className="hc-trending-body">
                  <span className="hc-trending-name">{arts[it.slug]?.title || it.title}</span>
                  {it.category ? <span className="hc-trending-cat">{it.category}</span> : null}
                </span>
                {it.views != null ? (
                  <span className="hc-trending-views" aria-label={`${it.views} views`}>
                    {it.views.toLocaleString('en-US')}
                  </span>
                ) : null}
              </Link>
            </li>
          ))}
        </ol>
      )}
    </aside>
  );
}
