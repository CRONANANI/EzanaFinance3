'use client';

import { useEffect, useState } from 'react';

/*
 * City news card for the Echo globe rail: recent coverage for the city the
 * reader is on, from /api/news/city?q=. Query ladder: the article's optional
 * `newsQuery`, else "City", then "City Country" when that returns fewer than
 * 3 items, then "Country". Results are cached per query for the session
 * (module-scope Map), in-flight requests abort when focus moves, and any
 * failure renders the empty state: it never throws into the article.
 */
const cache = new Map(); // query -> articles[]
const MIN_RESULTS = 3;
const LIMIT = 5;

async function fetchQuery(q, signal) {
  if (cache.has(q)) return cache.get(q);
  const res = await fetch(`/api/news/city?q=${encodeURIComponent(q)}`, { signal });
  const data = res.ok ? await res.json().catch(() => ({})) : {};
  const articles = Array.isArray(data.articles) ? data.articles.slice(0, LIMIT) : [];
  cache.set(q, articles);
  return articles;
}

function queriesFor(city) {
  if (city.newsQuery) return [city.newsQuery];
  const list = [city.name];
  if (city.country) list.push(`${city.name} ${city.country}`, city.country);
  return [...new Set(list.filter(Boolean))];
}

function relTime(iso) {
  const t = iso ? Date.parse(iso) : NaN;
  if (!Number.isFinite(t)) return '';
  const mins = Math.max(0, Math.round((Date.now() - t) / 60000));
  if (mins < 60) return `${mins || 1}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 48) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

export default function EchoCityNews({ city, className = '' }) {
  const [state, setState] = useState({ key: null, status: 'loading', items: [] });
  const key = city ? `${city.name}|${city.country || ''}|${city.newsQuery || ''}` : null;

  useEffect(() => {
    if (!city) return undefined;
    const ctrl = new AbortController();
    setState({ key, status: 'loading', items: [] });
    (async () => {
      let best = [];
      try {
        for (const q of queriesFor(city)) {
          const items = await fetchQuery(q, ctrl.signal);
          if (items.length > best.length) best = items;
          if (best.length >= MIN_RESULTS) break;
        }
      } catch {
        if (ctrl.signal.aborted) return;
      }
      if (!ctrl.signal.aborted) setState({ key, status: 'ready', items: best });
    })();
    return () => ctrl.abort();
    // key captures every field the fetch depends on
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  if (!city) return null;
  const loading = state.status === 'loading' || state.key !== key;

  return (
    <section
      className={`echo-grail-news ${className}`.trim()}
      aria-label={`Recent news for ${city.name}`}
      aria-busy={loading}
    >
      <p className="echo-grail-news-kicker echo-grail-mono">News · {city.name}</p>
      {loading ? (
        <ul className="echo-grail-news-list" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <li key={i} className="echo-grail-news-skel">
              <span />
              <span />
            </li>
          ))}
        </ul>
      ) : state.items.length ? (
        <ul className="echo-grail-news-list">
          {state.items.map((a) => (
            <li key={a.url}>
              <a
                className="echo-grail-news-item"
                href={a.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                <span className="echo-grail-news-title">{a.title}</span>
                <span className="echo-grail-news-meta">
                  {[a.source, relTime(a.publishedAt)].filter(Boolean).join(' · ')}
                </span>
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <p className="echo-grail-news-empty">No recent coverage indexed for {city.name}.</p>
      )}
    </section>
  );
}
