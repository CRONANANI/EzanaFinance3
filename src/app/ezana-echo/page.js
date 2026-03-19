'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { EchoSearchBar } from '@/components/echo';
import './ezana-echo.css';
import './echo-publish.css';

const PINNED_ARTICLE_SLUG = 'the-45-day-loophole-congressional-trade-disclosure';

const PINNED_ARTICLE = {
  slug: PINNED_ARTICLE_SLUG,
  title: 'The 45-Day Loophole: Why Congressional Trade Disclosure Must Happen in Real Time',
  excerpt: 'Under current law, members of Congress have 45 days to disclose stock trades. The technology for real-time reporting already exists. The only barrier is political will.',
  category: 'Politics',
  author: 'Ezana Finance Editorial',
  readTime: '8 min read',
  image: null,
  is_pinned: true,
};

const CATEGORIES = ['All', 'Markets', 'Investing', 'Trading', 'Crypto', 'Economy', 'Politics', 'Technology', 'Education', 'Energy', 'Congress', 'Portfolio', 'Insights'];

const STATIC_ARTICLES = [
  { slug: 'oil-assets-surge', title: '7 assets that historically surge when oil prices spike', excerpt: 'When crude prices rise, certain sectors and securities tend to outperform.', category: 'Energy', author: 'Ezana Research', date: '2 Mar 2025', readTime: '8 min read', image: null },
  { slug: 'hedge-fund-strategies-backtest', title: 'Top 7 beginner Hedge Fund strategies you can backtest', excerpt: 'Seven institutional strategies with backtesting formulas.', category: 'Markets', author: 'Ezana Research', date: '2 Mar 2025', readTime: '8 min read', image: null },
  { slug: 'sp500-returns-by-president', title: 'S&P 500 returns under different presidents', excerpt: 'Interactive chart of S&P 500 returns by presidential term.', category: 'Markets', author: 'Ezana Research', date: '2 Mar 2025', readTime: '5 min read', image: '/images/ezana-echo/sp500-returns-preview.png' },
  { slug: 'congressional-trading-q1', title: 'Congressional trading activity: Q1 2025 outlook', excerpt: 'Key trends in lawmaker disclosures and market sentiment.', category: 'Congress', author: 'Ezana Research', date: '28 Feb 2025', readTime: '5 min read', image: null },
  { slug: 'hedge-funds-3y-performance', title: 'Hedge funds with the highest 3Y performance (2023–2026)', excerpt: 'Top-performing hedge funds by 3-year returns from 13F filings.', category: 'Markets', author: 'Ezana Research', date: '2 Mar 2025', readTime: '6 min read', image: null },
  { slug: 'hedge-fund-13f-preview', title: 'Hedge fund 13F filings: What to watch this quarter', excerpt: 'Major institutional investors are due to report.', category: 'Markets', author: 'Ezana Research', date: '25 Feb 2025', readTime: '6 min read', image: null },
  { slug: 'portfolio-rebalancing-tips', title: 'Portfolio rebalancing in volatile markets', excerpt: 'Practical strategies to maintain your target allocation.', category: 'Portfolio', author: 'Ezana Research', date: '22 Feb 2025', readTime: '4 min read', image: null },
];

function mapApiArticle(a) {
  return {
    slug: a.article_slug,
    title: a.article_title,
    excerpt: a.article_excerpt,
    category: a.article_category,
    author: a.author_name,
    authorId: a.author_id,
    authorAvatar: a.author_avatar,
    date: a.published_at ? new Date(a.published_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '',
    readTime: `${a.read_time_minutes || 5} min read`,
    image: a.cover_image_url,
    isFromApi: true,
    is_pinned: a.is_pinned || false,
  };
}

const SAMPLE_AUTHORS = [
  { id: '1', display_name: 'Ezana Research', avatar_url: null, articleCount: 12, subscriberCount: 2400, verified: true },
  { id: '2', display_name: 'Market Insights', avatar_url: null, articleCount: 8, subscriberCount: 1200, verified: false },
];

export default function EzanaEchoPage() {
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [apiArticles, setApiArticles] = useState([]);
  const [apiAuthors, setApiAuthors] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams();
    if (searchQuery) params.set('search', searchQuery);
    Promise.all([
      fetch(`/api/echo/articles?${params}`).then((r) => r.json()).then((d) => (d.articles || []).map(mapApiArticle)).catch(() => []),
      fetch('/api/echo/authors').then((r) => r.json()).then((d) => d.authors || []).catch(() => []),
    ]).then(([articles, authors]) => {
      setApiArticles(articles);
      setApiAuthors(authors.length > 0 ? authors : SAMPLE_AUTHORS);
    }).finally(() => setLoading(false));
  }, [searchQuery]);

  const staticMapped = STATIC_ARTICLES.map((a) => ({ ...a, isFromApi: false, date: a.date || '' }));
  const allArticles = [PINNED_ARTICLE, ...apiArticles.filter((a) => a.slug !== PINNED_ARTICLE_SLUG), ...staticMapped.filter((s) => !apiArticles.some((x) => x.slug === s.slug) && s.slug !== PINNED_ARTICLE_SLUG)];

  const gridArticles = allArticles.filter((a) => a.slug !== PINNED_ARTICLE_SLUG);
  const filteredArticles = activeCategory === 'All' ? gridArticles : gridArticles.filter((a) => a.category === activeCategory);

  return (
    <div className="echo-page">
      {/* 1. Hero Section */}
      <section className="echo-hero">
        <span className="echo-hero-label">Ezana Echo</span>
        <h1 className="echo-hero-title">Where Markets Meet Insight</h1>
        <p className="echo-hero-sub">
          Market insights, congressional trading analysis, and portfolio strategies from the Ezana Research team.
        </p>
        <div className="echo-hero-search">
          <EchoSearchBar onSearch={setSearchQuery} placeholder="Search articles or authors..." />
        </div>
      </section>

      {/* 2. Content Area */}
      <div className="echo-content">
        {/* 3. Pinned Article Banner */}
        <Link href={`/ezana-echo/${PINNED_ARTICLE_SLUG}`} className="echo-pinned-link" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className="echo-pinned">
            <div className="echo-pinned-content">
              <span className="echo-pinned-badge"><i className="bi bi-pin-fill" /> Pinned</span>
              <span className="echo-pinned-category">{PINNED_ARTICLE.category}</span>
              <h2 className="echo-pinned-title">{PINNED_ARTICLE.title}</h2>
              <p className="echo-pinned-excerpt">{PINNED_ARTICLE.excerpt}</p>
              <div className="echo-pinned-meta">
                <span className="echo-pinned-author">{PINNED_ARTICLE.author}</span>
                <span>{PINNED_ARTICLE.readTime}</span>
              </div>
              <span className="echo-pinned-read-btn">Read Article <i className="bi bi-arrow-right" /></span>
            </div>
            <div className="echo-pinned-image">
              <div className="echo-pinned-image-placeholder">
                <i className="bi bi-journal-text" />
              </div>
            </div>
          </div>
        </Link>

        {/* 4. Category Filter Pills */}
        <div className="echo-section-header">
          <h3 className="echo-section-title">Articles</h3>
        </div>
        <div className="echo-categories">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              className={`echo-cat-pill ${activeCategory === cat ? 'active' : ''}`}
              onClick={() => setActiveCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* 5. Article Cards Grid */}
        <div className="echo-grid">
          {loading ? (
            <p style={{ gridColumn: '1 / -1', textAlign: 'center', color: '#64748b' }}>Loading articles...</p>
          ) : (
            filteredArticles.map((article) => (
              <Link key={article.slug} href={`/ezana-echo/${article.slug}`} className="echo-article-card">
                <div className="echo-card-image">
                  {article.image && !article.image.startsWith('/api/placeholder') ? (
                    <img src={article.image} alt={article.title} />
                  ) : (
                    <div className="echo-card-image-placeholder">
                      <i className="bi bi-newspaper" />
                    </div>
                  )}
                  <span className="echo-card-cat">{article.category}</span>
                </div>
                <div className="echo-card-body">
                  <h3 className="echo-card-title">{article.title}</h3>
                  <p className="echo-card-excerpt">{article.excerpt}</p>
                  <div className="echo-card-footer">
                    <div className="echo-card-author-row">
                      <div className="echo-card-avatar">{article.author?.[0] || 'E'}</div>
                      <span className="echo-card-author-name">{article.author}</span>
                    </div>
                    <div className="echo-card-meta">
                      <span><i className="bi bi-clock" /> {article.readTime}</span>
                      {article.viewCount != null && <span><i className="bi bi-eye" /> {article.viewCount}</span>}
                    </div>
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>

        {/* 6. Authors Row */}
        <div className="echo-section-header">
          <h3 className="echo-section-title">Authors</h3>
          <Link href="/ezana-echo/author" className="echo-section-link">View all <i className="bi bi-arrow-right" /></Link>
        </div>
        <div className="echo-authors-row">
          {apiAuthors.slice(0, 6).map((a) => (
            <Link key={a.user_id || a.id} href={a.user_id ? `/ezana-echo/author/${a.user_id}` : '#'} className="echo-author-mini">
              <div className="echo-author-mini-avatar">
                {a.avatar_url ? <img src={a.avatar_url} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} /> : a.display_name?.[0] || 'E'}
                {a.verified && <i className="bi bi-patch-check-fill echo-author-mini-verified" />}
              </div>
              <div>
                <span className="echo-author-mini-name">{a.display_name}</span>
                <span className="echo-author-mini-stat">{a.articleCount || 0} articles · {(a.subscriberCount || 0).toLocaleString()} subscribers</span>
              </div>
            </Link>
          ))}
        </div>

        {/* 7. Newsletter CTA */}
        <section className="echo-newsletter">
          <h3>Stay Informed</h3>
          <p>Get market insights and congressional trading alerts delivered to your inbox.</p>
          <form className="echo-newsletter-form" onSubmit={(e) => e.preventDefault()}>
            <input type="email" className="echo-newsletter-input" placeholder="you@example.com" />
            <button type="submit" className="echo-newsletter-btn">Subscribe</button>
          </form>
        </section>
      </div>
    </div>
  );
}
