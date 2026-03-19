'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { EchoSearchBar, AuthorCard } from '@/components/echo';
import './ezana-echo.css';
import './echo-publish.css';

function ArticleCard({ article }) {
  const ref = useRef(null);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      if (!ref.current) return;
      const rect = ref.current.getBoundingClientRect();
      const centerY = rect.top + rect.height / 2;
      const viewportCenter = window.innerHeight / 2;
      const diff = (centerY - viewportCenter) / viewportCenter;
      setOffset(Math.max(-8, Math.min(8, diff * 12)));
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div ref={ref} className="ezana-echo-card-wrapper" style={{ transform: `translateY(${offset}px)` }}>
      <Link href={`/ezana-echo/${article.slug}`} className="ezana-echo-card">
        <div className="ezana-echo-card-image">
          {article.image && !article.image.startsWith('/api/placeholder') ? (
            <img src={article.image} alt={article.title} className="ezana-echo-card-image-img" />
          ) : (
            <div className="ezana-echo-card-image-placeholder">
              <i className="bi bi-newspaper text-4xl text-emerald-500/30" />
            </div>
          )}
          <span className="ezana-echo-card-category">{article.category}</span>
        </div>
        <div className="ezana-echo-card-body">
          <h3 className="ezana-echo-card-title">{article.title}</h3>
          <p className="ezana-echo-card-excerpt">{article.excerpt}</p>
          {article.authorId ? (
            <div className="ezana-echo-card-author" onClick={(e) => e.preventDefault()}>
              <AuthorCard author={{ user_id: article.authorId, display_name: article.author, avatar_url: article.authorAvatar, articleCount: 0, subscriberCount: 0, verified: false }} compact />
            </div>
          ) : (
            <div className="ezana-echo-card-meta">
              <span>{article.author}</span>
              <span>{article.date}</span>
            </div>
          )}
        </div>
      </Link>
    </div>
  );
}

const CATEGORIES = ['All', 'Markets', 'Investing', 'Trading', 'Crypto', 'Economy', 'Politics', 'Technology', 'Education', 'Energy', 'Congress', 'Portfolio', 'Insights'];

const STATIC_ARTICLES = [
  {
    slug: 'oil-assets-surge',
    title: '7 assets that historically surge when oil prices spike',
    excerpt: 'When crude prices rise, certain sectors and securities tend to outperform. Here are seven assets with strong historical correlation to oil rallies.',
    category: 'Energy',
    author: 'Ezana Research',
    date: '2 Mar 2025',
    readTime: '8 min read',
    image: '/api/placeholder/800/450',
    featured: true,
  },
  {
    slug: 'hedge-fund-strategies-backtest',
    title: 'Top 7 beginner Hedge Fund strategies you can backtest',
    excerpt: 'Seven institutional strategies with backtesting formulas—from earnings confirmation to merger arbitrage.',
    category: 'Markets',
    author: 'Ezana Research',
    date: '2 Mar 2025',
    readTime: '8 min read',
    image: '/api/placeholder/400/250',
    featured: false,
  },
  {
    slug: 'sp500-returns-by-president',
    title: 'S&P 500 returns under different presidents',
    excerpt: 'Interactive chart of S&P 500 returns by presidential term from 1989 to 2025. Hover over each term for context.',
    category: 'Markets',
    author: 'Ezana Research',
    date: '2 Mar 2025',
    readTime: '5 min read',
    image: '/images/ezana-echo/sp500-returns-preview.png',
    featured: false,
  },
  {
    slug: 'congressional-trading-q1',
    title: 'Congressional trading activity: Q1 2025 outlook',
    excerpt: 'Key trends in lawmaker disclosures and what they signal for market sentiment.',
    category: 'Congress',
    author: 'Ezana Research',
    date: '28 Feb 2025',
    readTime: '5 min read',
    image: '/api/placeholder/400/250',
    featured: false,
  },
  {
    slug: 'hedge-funds-3y-performance',
    title: 'Hedge funds with the highest 3Y performance (2023–2026)',
    excerpt: 'Top-performing hedge funds by 3-year returns, sourced from 13F filings. From Ratan Capital to Point72.',
    category: 'Markets',
    author: 'Ezana Research',
    date: '2 Mar 2025',
    readTime: '6 min read',
    image: '/api/placeholder/400/250',
    featured: false,
  },
  {
    slug: 'hedge-fund-13f-preview',
    title: 'Hedge fund 13F filings: What to watch this quarter',
    excerpt: 'Major institutional investors are due to report. Here’s how to interpret the data.',
    category: 'Markets',
    author: 'Ezana Research',
    date: '25 Feb 2025',
    readTime: '6 min read',
    image: '/api/placeholder/400/250',
    featured: false,
  },
  {
    slug: 'portfolio-rebalancing-tips',
    title: 'Portfolio rebalancing in volatile markets',
    excerpt: 'Practical strategies to maintain your target allocation when markets swing.',
    category: 'Portfolio',
    author: 'Ezana Research',
    date: '22 Feb 2025',
    readTime: '4 min read',
    image: '/api/placeholder/400/250',
    featured: false,
  },
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
  };
}

export default function EzanaEchoPage() {
  const [activeCategory, setActiveCategory] = useState('All');
  const [sortBy, setSortBy] = useState('Newest');
  const [searchQuery, setSearchQuery] = useState('');
  const [apiArticles, setApiArticles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams();
    if (searchQuery) params.set('search', searchQuery);
    fetch(`/api/echo/articles?${params}`)
      .then((r) => r.json())
      .then((d) => setApiArticles((d.articles || []).map(mapApiArticle)))
      .catch(() => setApiArticles([]))
      .finally(() => setLoading(false));
  }, [searchQuery]);

  const staticMapped = STATIC_ARTICLES.map((a) => ({ ...a, isFromApi: false }));
  const allArticles = [...apiArticles, ...staticMapped.filter((s) => !apiArticles.some((x) => x.slug === s.slug))];
  const featuredArticle = allArticles.find((a) => a.featured) || allArticles[0];
  const gridArticles = allArticles.filter((a) => !a.featured && a !== featuredArticle);

  const filteredArticles =
    activeCategory === 'All'
      ? gridArticles
      : gridArticles.filter((a) => a.category === activeCategory);

  return (
    <div className="ezana-echo-page">
      <div className="ezana-echo-bg" />
      <div className="ezana-echo-container">
        {/* Hero - Featured Article */}
        <section className="ezana-echo-hero">
          <Link href={featuredArticle ? `/ezana-echo/${featuredArticle.slug}` : '#'} className="ezana-echo-hero-link">
            <div className="ezana-echo-hero-image">
              {featuredArticle?.image && !featuredArticle.image.startsWith('/api/placeholder') ? (
                <img src={featuredArticle.image} alt={featuredArticle.title} className="ezana-echo-hero-image-img" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div className="ezana-echo-hero-image-placeholder">
                  <i className="bi bi-graph-up-arrow text-6xl text-emerald-500/40" />
                </div>
              )}
              <div className="ezana-echo-hero-overlay">
                <div className="ezana-echo-hero-content">
                  <span className="ezana-echo-category-tag">{featuredArticle?.category}</span>
                  <h1 className="ezana-echo-hero-title">{featuredArticle?.title}</h1>
                  <p className="ezana-echo-hero-excerpt">{featuredArticle?.excerpt}</p>
                  <div className="ezana-echo-hero-dots">
                    <span className="ezana-echo-dot active" />
                    <span className="ezana-echo-dot" />
                    <span className="ezana-echo-dot" />
                  </div>
                </div>
                <div className="ezana-echo-hero-meta">
                  <div className="ezana-echo-avatar">
                    <i className="bi bi-person-fill text-emerald-400" />
                  </div>
                  <div>
                    <div className="ezana-echo-meta-author">{featuredArticle?.author}</div>
                    <div className="ezana-echo-meta-date">
                      {featuredArticle?.date} · {featuredArticle?.readTime}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Link>
        </section>

        {/* Blog Section */}
        <section className="ezana-echo-blog">
          <div className="ezana-echo-blog-header">
            <div>
              <h2 className="ezana-echo-blog-title">Articles</h2>
              <p className="ezana-echo-blog-intro">
                Market insights, congressional trading analysis, and portfolio strategies from the Ezana Research team.
              </p>
            </div>
            <div className="ezana-echo-sort">
              <span className="ezana-echo-sort-label">Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="ezana-echo-sort-select"
              >
                <option value="Newest">Newest</option>
                <option value="Oldest">Oldest</option>
                <option value="Popular">Popular</option>
              </select>
            </div>
          </div>

          <div className="ezana-echo-filters" style={{ flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
            <EchoSearchBar onSearch={setSearchQuery} placeholder="Search articles or authors..." />
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategory(cat)}
                className={`ezana-echo-filter-btn ${activeCategory === cat ? 'active' : ''}`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="ezana-echo-grid">
            {filteredArticles.map((article) => (
              <ArticleCard key={article.slug} article={article} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
