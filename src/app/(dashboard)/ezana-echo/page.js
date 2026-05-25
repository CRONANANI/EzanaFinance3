'use client';

import { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import { getAllArticles, getFeaturedArticle, formatPublishedShort } from '@/lib/ezana-echo-mock';
import { getTag } from '@/lib/echo-tag-taxonomy';
import { useAuth } from '@/components/AuthProvider';
import { isAdminUserClient } from '@/lib/admin-helpers-client';

import '../../../../app-legacy/assets/css/theme.css';
import '../../../../app-legacy/assets/css/unified-component-cards.css';
import '../../../../app-legacy/assets/css/pages-common.css';
import '../../../../app-legacy/assets/css/light-mode-fixes.css';
import '../../../../app-legacy/pages/home-dashboard.css';
import './ezana-echo.css';

const FEED_TABS = [
  { id: 'all', label: 'All' },
  { id: 'markets', label: 'Markets' },
  { id: 'companies', label: 'Companies' },
  { id: 'policy', label: 'Policy' },
  { id: 'crypto', label: 'Crypto' },
];

const SORT_OPTIONS = ['Newest', 'Most Read', 'Most Discussed'];

const CATEGORY_COLOURS = {
  policy: { bg: 'rgba(99,102,241,0.12)', text: '#6366f1', border: 'rgba(99,102,241,0.25)' },
  markets: { bg: 'rgba(16,185,129,0.12)', text: '#10b981', border: 'rgba(16,185,129,0.25)' },
  companies: { bg: 'rgba(245,158,11,0.12)', text: '#f59e0b', border: 'rgba(245,158,11,0.25)' },
  crypto: { bg: 'rgba(59,130,246,0.12)', text: '#3b82f6', border: 'rgba(59,130,246,0.25)' },
};

function CategoryBadge({ category }) {
  const c = CATEGORY_COLOURS[category] ?? CATEGORY_COLOURS.markets;
  const label = category.charAt(0).toUpperCase() + category.slice(1);
  return (
    <span
      className="echo-category-badge"
      style={{ background: c.bg, color: c.text, border: `1px solid ${c.border}` }}
    >
      {label}
    </span>
  );
}

function AuthorAvatar({ name }) {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  return (
    <div className="echo-author-avatar" aria-hidden>
      {initials}
    </div>
  );
}

const HERO_FALLBACK_IMG = '/congress-chamber.jpg';

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

  const rawArticles = useMemo(() => getAllArticles(), []);
  const allArticles = useMemo(
    () => rawArticles.filter((a) => !archivedSet.has(a.id)),
    [rawArticles, archivedSet],
  );

  const featuredRaw = useMemo(() => getFeaturedArticle(), []);
  const featured = useMemo(
    () => (featuredRaw && !archivedSet.has(featuredRaw.id) ? featuredRaw : null),
    [featuredRaw, archivedSet],
  );

  const heroSrc = featured?.heroImage?.src ?? HERO_FALLBACK_IMG;
  const heroAlt = featured?.heroImage?.alt ?? featured?.title;

  const sortedFiltered = useMemo(() => {
    let list = tab === 'all' ? allArticles : allArticles.filter((a) => a.category === tab);
    if (activeTag) list = list.filter((a) => a.tags?.includes(activeTag));
    if (sort === 'Most Read') {
      list = [...list].sort((a, b) => (b.reads ?? 0) - (a.reads ?? 0));
    } else if (sort === 'Most Discussed') {
      list = [...list].sort((a, b) => (b.comments ?? 0) - (a.comments ?? 0));
    } else {
      list = [...list].sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
    }
    return list;
  }, [allArticles, tab, sort, activeTag]);

  const gridArticles = useMemo(
    () => allArticles.filter((a) => a.id !== featured?.id),
    [allArticles, featured],
  );

  return (
    <div className="echo-page-v2 dashboard-page-inset">
      {isAdmin && (
        <div className="echo-admin-bar">
          <Link href="/ezana-echo/archived" className="echo-admin-bar-link">
            <i className="bi bi-archive-fill" />
            View Archived Articles{' '}
            {archivedCount > 0 && <span className="echo-admin-bar-count">({archivedCount})</span>}
          </Link>
        </div>
      )}

      {featured && (
        <div className="echo-article-card-wrap">
          {isAdmin && (
            <button
              type="button"
              className="echo-admin-archive-btn"
              onClick={(e) => handleArchive(featured.id, e)}
              disabled={archivingId === featured.id}
              title="Archive this article"
            >
              <i className="bi bi-archive" />
              {archivingId === featured.id ? 'Archiving…' : 'Archive'}
            </button>
          )}
          <Link
            href={`/ezana-echo/${featured.id}`}
            className="echo-hero-banner"
            aria-label={featured.title}
          >
            <div className="echo-hero-banner-img-wrap">
              <img
                src={heroSrc}
                alt={heroAlt}
                className="echo-hero-banner-img"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
              <div className="echo-hero-banner-overlay" />
            </div>
            <div className="echo-hero-banner-content">
              <CategoryBadge category={featured.category} />
              <h1 className="echo-hero-banner-title">{featured.title}</h1>
              <p className="echo-hero-banner-excerpt">{featured.excerpt}</p>
              <div className="echo-hero-banner-meta">
                <AuthorAvatar name={featured.author} />
                <span>{featured.author}</span>
                <span className="echo-hero-banner-sep">·</span>
                <span>{formatPublishedShort(featured.publishedAt)}</span>
                <span className="echo-hero-banner-sep">·</span>
                <span>{featured.readTime} min read</span>
              </div>
            </div>
          </Link>
        </div>
      )}

      <div className="echo-blog-header">
        <div>
          <h2 className="echo-blog-title">Blog</h2>
          <p className="echo-blog-desc">
            Financial news, analysis, and insights curated for Ezana investors.
          </p>
        </div>
        <div className="echo-blog-header-right">
          <div className="echo-filter-tabs">
            {FEED_TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                className={`echo-filter-tab ${tab === t.id ? 'active' : ''}`}
                onClick={() => {
                  setTab(t.id);
                  setActiveTag(null);
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="echo-sort-wrap">
            <span className="echo-sort-label">Sort by:</span>
            <select
              className="echo-sort-select"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {activeTag && (
        <div className="echo-active-tag-banner">
          <i className="bi bi-funnel-fill" />
          <span>Filtered by:</span>
          <span className="echo-active-tag-chip">{getTag(activeTag).label}</span>
          <button
            type="button"
            className="echo-active-tag-clear"
            onClick={() => setActiveTag(null)}
          >
            <i className="bi bi-x-lg" /> Clear
          </button>
        </div>
      )}

      <div className="echo-article-grid">
        {(tab === 'all' && !activeTag ? gridArticles : sortedFiltered)
          .slice(0, 9)
          .map((article) => (
            <div key={article.id} className="echo-article-card-wrap">
              {isAdmin && (
                <button
                  type="button"
                  className="echo-admin-archive-btn"
                  onClick={(e) => handleArchive(article.id, e)}
                  disabled={archivingId === article.id}
                  title="Archive this article"
                >
                  <i className="bi bi-archive" />
                  {archivingId === article.id ? 'Archiving…' : 'Archive'}
                </button>
              )}
              <Link href={`/ezana-echo/${article.id}`} className="echo-article-card">
                <div className="echo-article-card-img-wrap">
                  {article.heroImage?.src ? (
                    <div
                      className="echo-article-card-img-placeholder"
                      style={{ position: 'relative', overflow: 'hidden' }}
                    >
                      <img
                        src={article.heroImage.src}
                        alt={article.heroImage.alt || article.title}
                        style={{
                          position: 'absolute',
                          inset: 0,
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                        }}
                      />
                      <div style={{ position: 'absolute', top: 8, left: 8, zIndex: 2 }}>
                        <CategoryBadge category={article.category} />
                      </div>
                    </div>
                  ) : (
                    <div className="echo-article-card-img-placeholder">
                      <CategoryBadge category={article.category} />
                    </div>
                  )}
                </div>
                <div className="echo-article-card-body">
                  <p className="echo-article-card-date">
                    {formatPublishedShort(article.publishedAt)} &nbsp;·&nbsp; {article.readTime}{' '}
                    mins read
                  </p>
                  <h3 className="echo-article-card-title">{article.title}</h3>
                  <p className="echo-article-card-excerpt">{article.excerpt}</p>
                  {article.tags && article.tags.length > 1 && (
                    <div className="echo-article-tags">
                      {article.tags.slice(1, 4).map((tagId) => {
                        const t = getTag(tagId);
                        return (
                          <button
                            key={tagId}
                            type="button"
                            className="echo-article-tag-chip"
                            style={{
                              background: t.color.bg,
                              color: t.color.fg,
                              border: `1px solid ${t.color.border}`,
                            }}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setTab('all');
                              setActiveTag(tagId);
                            }}
                          >
                            {t.label}
                          </button>
                        );
                      })}
                    </div>
                  )}
                  <div className="echo-article-card-author">
                    <AuthorAvatar name={article.author} />
                    <span className="echo-article-card-author-name">{article.author}</span>
                  </div>
                </div>
              </Link>
            </div>
          ))}
      </div>
    </div>
  );
}
