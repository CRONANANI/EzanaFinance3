'use client';

import { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import { formatPublishedShort } from '@/lib/echo-format';
import { getTag } from '@/lib/echo-tag-taxonomy';
import { useAuth } from '@/components/AuthProvider';
import { isAdminUserClient } from '@/lib/admin-helpers-client';

import './ezana-echo.css';

const FEED_TABS = [
  { id: 'all', label: 'All' },
  { id: 'markets', label: 'Markets' },
  { id: 'companies', label: 'Companies' },
  { id: 'policy', label: 'Policy' },
  { id: 'crypto', label: 'Crypto' },
];

const SORT_OPTIONS = ['Newest', 'Oldest'];

const CATEGORY_GRADIENTS = {
  markets: '#0f2a22',
  companies: '#2d4a3a',
  policy: '#3a3a3a',
  crypto: '#1b3a5a',
};

function AuthorAvatar({ name, size = 'md' }) {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  return (
    <span className={`echo-v3-avatar echo-v3-avatar--${size}`} aria-hidden="true">
      {initials}
    </span>
  );
}

function MetaDot() {
  return <span className="echo-v3-meta-dot" />;
}

export default function EzanaEchoPage() {
  const { user } = useAuth();
  const isAdmin = isAdminUserClient(user);
  const [archivedSet, setArchivedSet] = useState(new Set());
  const [archivedCount, setArchivedCount] = useState(0);
  const [archivingId, setArchivingId] = useState(null);

  const [tab, setTab] = useState('all');
  const [sort, setSort] = useState('Newest');
  const [activeTag, setActiveTag] = useState(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const tagFromUrl = new URLSearchParams(window.location.search).get('tag');
    if (tagFromUrl) setActiveTag(tagFromUrl);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/echo/article-statuses', { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        const ids = new Set(data.archivedIds || []);
        setArchivedSet(ids);
        setArchivedCount(ids.size);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleArchive(articleId, e) {
    e?.preventDefault();
    e?.stopPropagation();
    if (!confirm('Archive this article? It will be hidden from non-admin users.')) return;
    setArchivingId(articleId);
    try {
      const res = await fetch('/api/echo/admin/archive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ articleId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || `HTTP ${res.status}`);
      }
      setArchivedSet((prev) => {
        const next = new Set(prev);
        next.add(articleId);
        return next;
      });
      setArchivedCount((c) => c + 1);
    } catch (err) {
      alert(`Failed to archive: ${err.message}`);
    } finally {
      setArchivingId(null);
    }
  }

  const [rawArticles, setRawArticles] = useState([]);
  const [featuredRaw, setFeaturedRaw] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/echo/hub', { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        setRawArticles(data.articles || []);
        setFeaturedRaw(data.featured || null);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const allArticles = useMemo(
    () => rawArticles.filter((a) => !archivedSet.has(a.id)),
    [rawArticles, archivedSet],
  );
  const featured = useMemo(
    () => (featuredRaw && !archivedSet.has(featuredRaw.id) ? featuredRaw : null),
    [featuredRaw, archivedSet],
  );

  const sortedFiltered = useMemo(() => {
    let list = tab === 'all' ? allArticles : allArticles.filter((a) => a.category === tab);
    if (activeTag) list = list.filter((a) => a.tags?.includes(activeTag));
    if (sort === 'Oldest') {
      list = [...list].sort((a, b) => new Date(a.publishedAt) - new Date(b.publishedAt));
    } else {
      list = [...list].sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
    }
    return list;
  }, [allArticles, tab, sort, activeTag]);

  const gridArticles = useMemo(
    () =>
      tab === 'all' && !activeTag
        ? allArticles.filter((a) => a.id !== featured?.id)
        : sortedFiltered,
    [allArticles, sortedFiltered, tab, activeTag, featured],
  );

  return (
    <div className="echo-v3-page">
      <section className="echo-v3-hero-band">
        <div className="echo-v3-page-head">
          <div className="echo-v3-page-head-left">
            <h1 className="echo-v3-h1">
              Markets, <span className="echo-v3-h1-accent">made clear.</span>
            </h1>
            <p className="echo-v3-page-sub">
              Long-form analysis on the companies, commodities, and policies moving capital —
              written for investors who want the why, not just the what.
            </p>
          </div>
          <div className="echo-v3-page-head-right">
            <Link href="/ezana-echo/archived" className="echo-v3-archived-btn">
              View archived articles
              <span className="echo-v3-archived-count">{archivedCount}</span>
            </Link>
          </div>
        </div>

        {featured && (
          <div className="echo-v3-featured-wrap">
            {isAdmin && (
              <button
                type="button"
                className="echo-v3-admin-archive-btn"
                onClick={(e) => handleArchive(featured.id, e)}
                disabled={archivingId === featured.id}
                title="Archive this article"
              >
                <i className="bi bi-archive" />
                {archivingId === featured.id ? 'Archiving…' : 'Archive'}
              </button>
            )}
            <Link href={`/ezana-echo/${featured.id}`} className="echo-v3-hero-card">
              <div className="echo-v3-hero-img">
                {featured.heroImage?.src && (
                  <img
                    src={featured.heroImage.src}
                    alt={featured.heroImage.alt || featured.title}
                    className="echo-v3-hero-cover-img"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                )}
                <span className="echo-v3-hero-badge">
                  {featured.category.charAt(0).toUpperCase() + featured.category.slice(1)} · Feature
                </span>
                {isAdmin && <span className="echo-v3-hero-archive-chip">Archive</span>}
              </div>

              <div className="echo-v3-hero-body">
                <div className="echo-v3-hero-meta-top">
                  FEATURE
                  <MetaDot />
                  {formatPublishedShort(featured.publishedAt).toUpperCase()}
                  <MetaDot />
                  {featured.readTime} MIN READ
                </div>
                <h2 className="echo-v3-hero-title">{featured.title}</h2>
                <p className="echo-v3-hero-dek">{featured.excerpt}</p>

                <div className="echo-v3-hero-stats">
                  <div>
                    <div className="echo-v3-stat-label">Tech weight</div>
                    <div className="echo-v3-stat-value echo-v3-stat-value--positive">31.2%</div>
                  </div>
                  <div>
                    <div className="echo-v3-stat-label">Peak finance · 1929</div>
                    <div className="echo-v3-stat-value">39.4%</div>
                  </div>
                  <div>
                    <div className="echo-v3-stat-label">Eras compared</div>
                    <div className="echo-v3-stat-value">7</div>
                  </div>
                </div>

                <div className="echo-v3-hero-author">
                  <AuthorAvatar name={featured.author} size="md" />
                  <div>
                    <div className="echo-v3-hero-author-name">{featured.author}</div>
                    <div className="echo-v3-hero-author-role">Editorial · Equity research</div>
                  </div>
                </div>
              </div>
            </Link>
          </div>
        )}
      </section>

      <section className="echo-v3-latest-section">
        <div className="echo-v3-section-head">
          <div>
            <h3 className="echo-v3-sec-h">Featured</h3>
            <p className="echo-v3-sec-sub">
              Financial news, analysis, and insights curated for Ezana investors.
            </p>
          </div>
          <div className="echo-v3-sec-right">
            <div className="echo-v3-chip-group">
              {FEED_TABS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  className={`echo-v3-chip ${tab === f.id ? 'echo-v3-chip--active' : ''}`}
                  onClick={() => {
                    setTab(f.id);
                    setActiveTag(null);
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <span className="echo-v3-sort">
              Sort by
              <select
                className="echo-v3-sort-select"
                value={sort}
                onChange={(e) => setSort(e.target.value)}
              >
                {SORT_OPTIONS.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </span>
          </div>
        </div>

        {activeTag && (
          <div className="echo-v3-active-tag-banner">
            <i className="bi bi-funnel-fill" />
            <span>Filtered by:</span>
            <span className="echo-v3-active-tag-chip">{getTag(activeTag).label}</span>
            <button
              type="button"
              className="echo-v3-active-tag-clear"
              onClick={() => setActiveTag(null)}
            >
              <i className="bi bi-x-lg" /> Clear
            </button>
          </div>
        )}

        <div className="echo-v3-grid">
          {gridArticles.slice(0, 9).map((article) => (
            <div key={article.id} className="echo-v3-card-wrap">
              {isAdmin && (
                <button
                  type="button"
                  className="echo-v3-admin-archive-btn echo-v3-admin-archive-btn--card"
                  onClick={(e) => handleArchive(article.id, e)}
                  disabled={archivingId === article.id}
                  title="Archive this article"
                >
                  <i className="bi bi-archive" />
                  {archivingId === article.id ? 'Archiving…' : 'Archive'}
                </button>
              )}
              <Link href={`/ezana-echo/${article.id}`} className="echo-v3-card">
                <div
                  className="echo-v3-card-img"
                  style={{
                    background: article.heroImage?.src
                      ? undefined
                      : `linear-gradient(160deg, ${CATEGORY_GRADIENTS[article.category] || '#1b3a5a'} 0%, var(--bg-primary) 100%)`,
                  }}
                >
                  {article.heroImage?.src && (
                    <img
                      src={article.heroImage.src}
                      alt={article.heroImage.alt || article.title}
                      className="echo-v3-card-cover-img"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        e.currentTarget.parentElement.style.background = `linear-gradient(160deg, ${CATEGORY_GRADIENTS[article.category] || '#1b3a5a'} 0%, var(--bg-primary) 100%)`;
                      }}
                    />
                  )}
                  <span className="echo-v3-card-badge">
                    {article.category.charAt(0).toUpperCase() + article.category.slice(1)}
                  </span>
                  {isAdmin && archivedSet.has(article.id) && (
                    <span className="echo-v3-card-archive-chip">Archive</span>
                  )}
                </div>

                <div className="echo-v3-card-body">
                  <div className="echo-v3-card-meta">
                    {formatPublishedShort(article.publishedAt)}
                    <MetaDot />
                    {article.readTime} min read
                  </div>
                  <h4 className="echo-v3-card-title">{article.title}</h4>
                  {article.excerpt && (
                    <p className="echo-v3-card-dek">
                      {article.excerpt.length > 160
                        ? article.excerpt.slice(0, 160) + '…'
                        : article.excerpt}
                    </p>
                  )}
                  <div className="echo-v3-card-tags">
                    {(article.tags || []).slice(1, 4).map((tagId) => {
                      const t = getTag(tagId);
                      return (
                        <span
                          key={tagId}
                          className="echo-v3-tag"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setTab('all');
                            setActiveTag(tagId);
                          }}
                        >
                          {t.label}
                        </span>
                      );
                    })}
                  </div>
                  <div className="echo-v3-card-foot">
                    <AuthorAvatar name={article.author} size="sm" />
                    <span>{article.author}</span>
                  </div>
                </div>
              </Link>
            </div>
          ))}
        </div>

        {gridArticles.length === 0 && (
          <div className="echo-v3-empty">
            No articles match this filter.{' '}
            <button
              type="button"
              className="echo-v3-empty-clear"
              onClick={() => {
                setTab('all');
                setActiveTag(null);
              }}
            >
              Clear filter
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
