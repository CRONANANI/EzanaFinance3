'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  getAllArticles,
  getArticleListForSection,
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

export default function EzanaEchoPage() {
  const featured = useMemo(() => getFeaturedArticle(), []);
  const marketSection = useMemo(() => getArticleListForSection('marketAnalysis'), []);
  const companySection = useMemo(() => getArticleListForSection('companySpotlights'), []);
  const policySection = useMemo(() => getArticleListForSection('politicalPolicy'), []);
  const allArticles = useMemo(() => getAllArticles(), []);

  const [tab, setTab] = useState('all');

  const sortedLatest = useMemo(() => {
    return [...allArticles].sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
  }, [allArticles]);

  const filteredLatest = useMemo(() => {
    if (tab === 'all') return sortedLatest;
    return sortedLatest.filter((a) => a.category === tab);
  }, [sortedLatest, tab]);

  return (
    <div className="dashboard-page-inset echo-page db-page">
      <header style={{ marginBottom: '1.5rem' }}>
        <h1 className="echo-header-title">Ezana Echo</h1>
        <p className="echo-header-desc">Financial news, analysis, and insights curated for Ezana investors</p>
      </header>

      <Link href={`/ezana-echo/${featured.id}`} className="echo-hero db-card">
        <div className="echo-hero-kicker">
          <span>Featured</span>
          <span className="echo-hero-date">{formatPublishedShort(featured.publishedAt)}</span>
        </div>
        <h2 className="echo-hero-title">{featured.title}</h2>
        <p className="echo-hero-excerpt">{featured.excerpt}</p>
        <p className="echo-hero-meta">
          By {featured.author} · {featured.readTime} min read
        </p>
        <div className="echo-ticker-row">
          {featured.tickers.map((t) => (
            <span key={t} className="echo-ticker">
              📈 {t}
            </span>
          ))}
        </div>
        <span className="echo-hero-cta">
          Read Article <i className="bi bi-arrow-right" aria-hidden />
        </span>
      </Link>

      <div className="echo-row-3">
        <div className="db-card echo-section-card">
          <div className="db-card-header">
            <h3 className="echo-section-title">📊 Market Analysis</h3>
          </div>
          <div style={{ padding: '0 1.25rem 1.25rem' }}>
            {marketSection.map((a) => (
              <Link key={a.id} href={`/ezana-echo/${a.id}`} className="echo-mini-article">
                <div className="echo-mini-title">{a.title}</div>
                <div className="echo-mini-meta">
                  {a.readTime} min · {a.listMeta}
                </div>
              </Link>
            ))}
            <Link href="/ezana-echo#latest" className="echo-section-link" onClick={() => setTab('markets')}>
              View All Market Analysis <i className="bi bi-arrow-right" aria-hidden />
            </Link>
          </div>
        </div>

        <div className="db-card echo-section-card">
          <div className="db-card-header">
            <h3 className="echo-section-title">🏢 Company Spotlights</h3>
          </div>
          <div style={{ padding: '0 1.25rem 1.25rem' }}>
            {companySection.map((a) => (
              <Link key={a.id} href={`/ezana-echo/${a.id}`} className="echo-mini-article">
                <div className="echo-mini-title">{a.title}</div>
                <div className="echo-mini-meta">
                  {a.readTime} min · {a.listMeta}
                </div>
              </Link>
            ))}
            <Link href="/ezana-echo#latest" className="echo-section-link" onClick={() => setTab('companies')}>
              View All Spotlights <i className="bi bi-arrow-right" aria-hidden />
            </Link>
          </div>
        </div>

        <div className="db-card echo-section-card">
          <div className="db-card-header">
            <h3 className="echo-section-title">🏛️ Political &amp; Policy</h3>
          </div>
          <div style={{ padding: '0 1.25rem 1.25rem' }}>
            {policySection.map((a) => (
              <Link key={a.id} href={`/ezana-echo/${a.id}`} className="echo-mini-article">
                <div className="echo-mini-title">{a.title}</div>
                <div className="echo-mini-meta">
                  {a.readTime} min · {a.listMeta}
                </div>
              </Link>
            ))}
            <Link href="/ezana-echo#latest" className="echo-section-link" onClick={() => setTab('policy')}>
              View All Policy News <i className="bi bi-arrow-right" aria-hidden />
            </Link>
          </div>
        </div>
      </div>

      <div className="echo-row-60-40" id="latest">
        <div className="db-card">
          <div className="db-card-header">
            <h3 className="echo-section-title">📰 Latest</h3>
          </div>
          <div style={{ padding: '0 1.25rem 1.25rem' }}>
            <div className="echo-tabs">
              {FEED_TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={`echo-tab ${tab === t.id ? 'active' : ''}`}
                  onClick={() => setTab(t.id)}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <div className="echo-feed-scroll">
              {filteredLatest.map((a) => (
                <Link key={a.id} href={`/ezana-echo/${a.id}`} className="echo-feed-item">
                  <div className="echo-feed-title">{a.title}</div>
                  <div className="echo-feed-line">
                    {a.tickers.slice(0, 4).map((t) => (
                      <span key={t} style={{ marginRight: '0.35rem' }}>
                        📈 {t}
                      </span>
                    ))}
                    · {a.readTime} min · {a.listMeta}
                  </div>
                  <div className="echo-feed-engage">
                    ❤️ {a.likes} &nbsp; 💬 {a.comments}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>

        <div className="db-card">
          <div className="db-card-header">
            <h3 className="echo-section-title">🔥 Trending on Echo</h3>
          </div>
          <div style={{ padding: '0 1.25rem 1.25rem' }}>
            <div className="echo-trend-block">
              <div className="echo-trend-label">Most Read This Week</div>
              {ECHO_TRENDING.mostRead.map((row, i) => (
                <div key={row.id} className="echo-trend-line">
                  {i + 1}.{' '}
                  <Link href={`/ezana-echo/${row.id}`}>&quot;{row.title}&quot;</Link> — {row.reads.toLocaleString()} reads
                </div>
              ))}
            </div>
            <div className="echo-trend-block">
              <div className="echo-trend-label">Most Discussed</div>
              {ECHO_TRENDING.mostDiscussed.map((row, i) => (
                <div key={row.id} className="echo-trend-line">
                  {i + 1}.{' '}
                  <Link href={`/ezana-echo/${row.id}`}>&quot;{row.title}&quot;</Link> — {row.comments} comments
                </div>
              ))}
            </div>
            <div className="echo-trend-block">
              <div className="echo-trend-label">Community Bookmarks</div>
              <p className="echo-mini-meta" style={{ marginBottom: '0.5rem' }}>
                Most saved by members this week
              </p>
              {ECHO_TRENDING.bookmarks.map((row) => (
                <div key={row.id} className="echo-trend-line">
                  📌 <Link href={`/ezana-echo/${row.id}`}>{row.title}</Link>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
