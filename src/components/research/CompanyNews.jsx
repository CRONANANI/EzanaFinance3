'use client';

import { useState, useEffect, useMemo } from 'react';
import { useCompanyNews } from '@/hooks/useFinnhub';

/**
 * Relative time label (e.g., "~2h ago", "~3d ago")
 */
function timeAgo(ts) {
  if (!ts) return '';
  const ms = typeof ts === 'number' ? Date.now() - ts * 1000 : Date.now() - new Date(ts).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `~${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `~${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `~${days}d ago`;
}

/**
 * Formatted date string
 */
function formatDate(ts) {
  if (!ts) return '';
  const d = typeof ts === 'number' ? new Date(ts * 1000) : new Date(ts);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/**
 * Derive a severity label from AV sentiment score or headline keywords
 */
function deriveSeverity(item) {
  if (item._avSentiment != null) {
    const abs = Math.abs(item._avSentiment);
    if (abs > 0.35) return 'CRITICAL';
    if (abs > 0.2) return 'ELEVATED';
    if (abs > 0.1) return 'MODERATE';
    return 'LOW';
  }
  const hl = (item.headline || '').toLowerCase();
  if (/breaking|crash|surge|plunge|halt|bankrupt|fraud|sec charge/i.test(hl)) return 'CRITICAL';
  if (/beat|miss|downgrad|upgrade|acquisition|merger|layoff/i.test(hl)) return 'ELEVATED';
  return 'MODERATE';
}

function severityClass(severity) {
  switch (severity) {
    case 'CRITICAL':
      return 'critical';
    case 'ELEVATED':
      return 'elevated';
    case 'POSITIVE':
      return 'positive';
    default:
      return '';
  }
}

/**
 * Fetch Alpha Vantage NEWS_SENTIMENT for a specific ticker
 */
async function fetchAvNews(symbol) {
  try {
    const res = await fetch(`/api/alpha/news?tickers=${encodeURIComponent(symbol)}&limit=20`, {
      cache: 'no-store',
    });
    if (!res.ok) return [];
    const data = await res.json();
    if (Array.isArray(data.articles)) return data.articles;
    if (Array.isArray(data.news)) return data.news;
    return [];
  } catch {
    return [];
  }
}

export function CompanyNews({ symbol, className = '' }) {
  const { data: finnhubNews, loading: finnhubLoading } = useCompanyNews(symbol, 30);
  const [avNews, setAvNews] = useState([]);
  const [avLoading, setAvLoading] = useState(false);

  useEffect(() => {
    if (!symbol) {
      setAvNews([]);
      return;
    }
    let cancelled = false;
    setAvLoading(true);
    fetchAvNews(symbol)
      .then((articles) => {
        if (!cancelled) setAvNews(articles);
      })
      .catch(() => {
        if (!cancelled) setAvNews([]);
      })
      .finally(() => {
        if (!cancelled) setAvLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [symbol]);

  const mergedNews = useMemo(() => {
    const urlSet = new Set();
    const all = [];

    for (const item of finnhubNews || []) {
      const url = item.url || '';
      if (url && urlSet.has(url)) continue;
      if (url) urlSet.add(url);
      all.push({
        id: item.id || url,
        headline: item.headline || 'Untitled',
        summary: item.summary || '',
        source: item.source || 'Unknown',
        url,
        datetime: item.datetime,
        image: item.image,
        _avSentiment: null,
        _origin: 'finnhub',
      });
    }

    for (const item of avNews) {
      const url = item.url || '';
      if (url && urlSet.has(url)) continue;
      if (url) urlSet.add(url);
      all.push({
        id: url || `av-${Date.now()}-${Math.random()}`,
        headline: item.title || 'Untitled',
        summary: item.summary || '',
        source: item.source || 'Alpha Vantage',
        url,
        datetime: item.time_published
          ? new Date(
              `${item.time_published.slice(0, 4)}-${item.time_published.slice(4, 6)}-${item.time_published.slice(6, 8)}T${item.time_published.slice(9, 11)}:${item.time_published.slice(11, 13)}:00Z`,
            ).toISOString()
          : null,
        image: item.banner_image,
        _avSentiment: item.overall_sentiment_score
          ? parseFloat(item.overall_sentiment_score)
          : null,
        _origin: 'alpha_vantage',
      });
    }

    all.sort((a, b) => {
      const tA =
        typeof a.datetime === 'number' ? a.datetime * 1000 : new Date(a.datetime || 0).getTime();
      const tB =
        typeof b.datetime === 'number' ? b.datetime * 1000 : new Date(b.datetime || 0).getTime();
      return tB - tA;
    });

    return all.slice(0, 20);
  }, [finnhubNews, avNews]);

  const loading = finnhubLoading || avLoading;

  if (!symbol) return null;

  if (loading) {
    return (
      <div className={`cr-news-chain-card ${className}`}>
        <div className="cr-news-chain-header">
          <h3>Company News</h3>
        </div>
        <div className="cr-news-chain-loading">
          <span>LOADING NEWS FEED...</span>
        </div>
      </div>
    );
  }

  if (!mergedNews.length) {
    return (
      <div className={`cr-news-chain-card ${className}`}>
        <div className="cr-news-chain-header">
          <h3>Company News</h3>
        </div>
        <div className="cr-news-chain-empty">No news available for {symbol}.</div>
      </div>
    );
  }

  return (
    <div className={`cr-news-chain-card ${className}`}>
      <div className="cr-news-chain-header">
        <h3>Company News</h3>
        <span className="cr-news-chain-count">{mergedNews.length} articles</span>
      </div>
      <div className="cr-news-chain-scroll">
        <div className="cr-news-chain-list">
          {mergedNews.map((item) => {
            const severity = deriveSeverity(item);
            return (
              <div key={item.id} className="cr-news-chain-item">
                <div className="cr-news-chain-dot" />
                <div className="cr-news-chain-content">
                  <div className="cr-news-chain-row">
                    <span className="cr-news-chain-title">{item.headline}</span>
                    <span className="cr-news-chain-source">{item.source}</span>
                    <span className={`cr-news-chain-severity ${severityClass(severity)}`}>
                      {severity}
                    </span>
                    <span className="cr-news-chain-ago">{timeAgo(item.datetime)}</span>
                  </div>
                  <div className="cr-news-chain-time">{formatDate(item.datetime)}</div>
                  {item.summary && (
                    <p className="cr-news-chain-body">
                      {item.summary.length > 200 ? `${item.summary.slice(0, 200)}…` : item.summary}
                    </p>
                  )}
                  <div className="cr-news-chain-actions">
                    {item.url && (
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="cr-news-chain-link"
                      >
                        Read more →
                      </a>
                    )}
                    {item._origin === 'alpha_vantage' && item._avSentiment != null && (
                      <span
                        className="cr-news-chain-sentiment"
                        style={{
                          color:
                            item._avSentiment > 0.1
                              ? '#10b981'
                              : item._avSentiment < -0.1
                                ? '#ef4444'
                                : '#6b7280',
                        }}
                      >
                        Sentiment: {item._avSentiment > 0 ? '+' : ''}
                        {item._avSentiment.toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
