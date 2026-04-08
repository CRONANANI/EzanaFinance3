'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  getAllArticles,
  getFeaturedArticle,
  ECHO_TRENDING,
  formatPublishedShort,
} from '@/lib/ezana-echo-mock';

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

// Category badge colours matching the app's accent palette
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

export default function EzanaEchoPage() {
  const featured = useMemo(() => getFeaturedArticle(), []);
  const allArticles = useMemo(() => getAllArticles(), []);

  const [tab, setTab] = useState('all');
  const [sort, setSort] = useState('Newest');

  const sortedFiltered = useMemo(() => {
    let list = tab === 'all' ? allArticles : allArticles.filter((a) => a.category === tab);
    if (sort === 'Most Read') {
      list = [...list].sort((a, b) => (b.reads ?? 0) - (a.reads ?? 0));
    } else if (sort === 'Most Discussed') {
      list = [...list].sort((a, b) => (b.comments ?? 0) - (a.comments ?? 0));
    } else {
      list = [...list].sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
    }
    return list;
  }, [allArticles, tab, sort]);

  const gridArticles = useMemo(
    () => allArticles.filter((a) => a.id !== featured.id),
    [allArticles, featured],
  );

  return (
    <div className="echo-page-v2 dashboard-page-inset">
      <Link href={`/ezana-echo/${featured.id}`} className="echo-hero-banner" aria-label={featured.title}>
        <div className="echo-hero-banner-img-wrap">
          <img
            src="/congress-chamber.jpg"
            alt="U.S. Congress chamber"
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

      <div className="echo-blog-header">
        <div>
          <h2 className="echo-blog-title">Blog</h2>
          <p className="echo-blog-desc">Financial news, analysis, and insights curated for Ezana investors.</p>
        </div>
        <div className="echo-blog-header-right">
          <div className="echo-filter-tabs">
            {FEED_TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                className={`echo-filter-tab ${tab === t.id ? 'active' : ''}`}
                onClick={() => setTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="echo-sort-wrap">
            <span className="echo-sort-label">Sort by:</span>
            <select className="echo-sort-select" value={sort} onChange={(e) => setSort(e.target.value)}>
              {SORT_OPTIONS.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="echo-article-grid">
        {(tab === 'all' ? gridArticles : sortedFiltered)
          .slice(0, 9)
          .map((article) => (
            <Link key={article.id} href={`/ezana-echo/${article.id}`} className="echo-article-card">
              <div className="echo-article-card-img-wrap">
                <div className="echo-article-card-img-placeholder">
                  <CategoryBadge category={article.category} />
                </div>
              </div>
              <div className="echo-article-card-body">
                <p className="echo-article-card-date">
                  {formatPublishedShort(article.publishedAt)} &nbsp;·&nbsp; {article.readTime} mins read
                </p>
                <h3 className="echo-article-card-title">{article.title}</h3>
                <p className="echo-article-card-excerpt">{article.excerpt}</p>
                <div className="echo-article-card-author">
                  <AuthorAvatar name={article.author} />
                  <span className="echo-article-card-author-name">{article.author}</span>
                </div>
              </div>
            </Link>
          ))}
      </div>

      <div className="echo-bottom-row" id="latest">
        <div className="echo-latest-col">
          <div className="echo-section-head">
            <h3 className="echo-section-heading">📰 Latest</h3>
          </div>
          <div className="echo-feed-list">
            {sortedFiltered.map((a) => (
              <Link key={a.id} href={`/ezana-echo/${a.id}`} className="echo-feed-row">
                <div className="echo-feed-row-body">
                  <CategoryBadge category={a.category} />
                  <p className="echo-feed-row-title">{a.title}</p>
                  <p className="echo-feed-row-meta">
                    {a.author} · {formatPublishedShort(a.publishedAt)} · {a.readTime} min
                  </p>
                  <p className="echo-feed-row-engage">
                    ❤️ {a.likes} &nbsp; 💬 {a.comments}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="echo-trending-col">
          <div className="echo-section-head">
            <h3 className="echo-section-heading">🔥 Trending</h3>
          </div>
          <div className="echo-trend-group">
            <p className="echo-trend-group-label">Most Read This Week</p>
            {ECHO_TRENDING.mostRead.map((row, i) => (
              <Link key={row.id} href={`/ezana-echo/${row.id}`} className="echo-trend-row">
                <span className="echo-trend-num">{i + 1}</span>
                <div>
                  <p className="echo-trend-row-title">{row.title}</p>
                  <p className="echo-trend-row-meta">{row.reads.toLocaleString()} reads</p>
                </div>
              </Link>
            ))}
          </div>
          <div className="echo-trend-group">
            <p className="echo-trend-group-label">Most Discussed</p>
            {ECHO_TRENDING.mostDiscussed.map((row, i) => (
              <Link key={row.id} href={`/ezana-echo/${row.id}`} className="echo-trend-row">
                <span className="echo-trend-num">{i + 1}</span>
                <div>
                  <p className="echo-trend-row-title">{row.title}</p>
                  <p className="echo-trend-row-meta">{row.comments} comments</p>
                </div>
              </Link>
            ))}
          </div>
          <div className="echo-trend-group">
            <p className="echo-trend-group-label">📌 Community Bookmarks</p>
            {ECHO_TRENDING.bookmarks.map((row) => (
              <Link key={row.id} href={`/ezana-echo/${row.id}`} className="echo-trend-row">
                <div>
                  <p className="echo-trend-row-title">{row.title}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
