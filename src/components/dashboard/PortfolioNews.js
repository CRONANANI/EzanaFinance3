'use client';

import { usePortfolio } from '@/hooks/usePortfolio';
import { usePortfolioNews } from '@/hooks/usePortfolioNews';

export function PortfolioNews() {
  const { portfolio, isLoading } = usePortfolio();
  const { insights, loading } = usePortfolioNews(
    portfolio?.holdings || [],
    portfolio?.summary || null
  );

  if (isLoading || loading) {
    return (
      <div className="portfolio-news-sidebar">
        <div className="news-header">
          <h3>Relevant Portfolio News</h3>
          <i className="bi bi-newspaper" />
        </div>
        <div className="news-ticker-wrapper">
          <div className="flex items-center justify-center py-8 text-gray-400">
            <div className="w-5 h-5 border-2 border-emerald-500/50 border-t-emerald-500 rounded-full animate-spin mr-2" />
            Loading...
          </div>
        </div>
      </div>
    );
  }

  return (
    <section className="portfolio-news-sidebar">
      <div className="news-header">
        <h3>Relevant Portfolio News</h3>
        <i className="bi bi-newspaper" />
      </div>
      <div className="news-ticker-wrapper">
        <div className="news-ticker" id="newsTicker">
          {insights.length === 0 ? (
            <div className="news-insight">
              <div className="insight-icon info">
                <i className="bi bi-info-circle" />
              </div>
              <div className="insight-content">
                <p className="insight-text">
                  Connect your brokerage to see personalized news and statistics for your portfolio holdings.
                </p>
                <span className="insight-time">—</span>
              </div>
            </div>
          ) : (
            insights.map((item) => (
              <a
                key={item.id}
                href={item.url || '#'}
                target={item.url ? '_blank' : undefined}
                rel={item.url ? 'noopener noreferrer' : undefined}
                className={`news-insight ${item.url ? 'cursor-pointer hover:bg-[rgba(16,185,129,0.05)]' : ''}`}
              >
                <div className={`insight-icon ${item.type}`}>
                  <i className={`bi ${item.icon}`} />
                </div>
                <div className="insight-content">
                  <p className="insight-text">{item.text}</p>
                  <span className="insight-time">{item.time}</span>
                </div>
              </a>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
