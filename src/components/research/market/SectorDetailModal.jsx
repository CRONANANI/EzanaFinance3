'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import './sector-detail-modal.css';

/* Relative time from an ISO timestamp, or unix seconds for older payloads. */
function timeAgo(publishedAt, unixSeconds) {
  const ms = publishedAt
    ? new Date(publishedAt).getTime()
    : unixSeconds
      ? Number(unixSeconds) * 1000
      : NaN;
  if (!Number.isFinite(ms)) return '';
  const m = Math.floor((Date.now() - ms) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const formatChange = (pct) =>
  Number.isFinite(pct) ? `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%` : 'n/a';

const formatPrice = (n) =>
  Number.isFinite(n)
    ? `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : 'n/a';

const formatCap = (n) => {
  if (!Number.isFinite(n) || n <= 0) return '';
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  return `$${(n / 1e6).toFixed(0)}M`;
};

const PERIOD_LABEL = {
  '1D': 'By daily return',
  '1W': 'By 1-week return',
  '5D': 'By 5-day return',
  '1M': 'By 1-month return',
  '3M': 'By 3-month return',
  '6M': 'By 6-month return',
  YTD: 'By YTD return',
  '1Y': 'By 1-year return',
};

function SkeletonRows({ count }) {
  return (
    <ul className="sdm-skeleton" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <li key={i} className="sdm-skeleton-row" />
      ))}
    </ul>
  );
}

const EMPTY = { topPerformers: [], news: [], errors: { performers: false, news: false } };

export function SectorDetailModal({
  sector,
  displayName,
  changePct,
  range = '1D',
  isOpen,
  onClose,
}) {
  const [data, setData] = useState(EMPTY);
  const [loading, setLoading] = useState(false);
  /* A request that failed outright: both panels show their error state. */
  const [failed, setFailed] = useState(false);
  const headerLabel = displayName || sector;

  /* The API falls back to daily returns when multi-day history is thin. */
  const performersMeta = PERIOD_LABEL[data.performanceRange || range] || PERIOD_LABEL['1D'];

  useEffect(() => {
    if (!isOpen || !sector) return undefined;
    const ctrl = new AbortController();
    setLoading(true);
    setFailed(false);
    setData(EMPTY);
    fetch(
      `/api/market-data/sector-detail?sector=${encodeURIComponent(sector)}&period=${encodeURIComponent(range)}`,
      { signal: ctrl.signal },
    )
      .then(async (r) => {
        const d = await r.json().catch(() => ({}));
        if (!r.ok && !d.errors) {
          setFailed(true);
          return;
        }
        setData({
          topPerformers: d.topPerformers || [],
          news: d.news || [],
          performanceRange: d.performanceRange || null,
          errors: d.errors || EMPTY.errors,
        });
      })
      .catch((err) => {
        if (err?.name !== 'AbortError') setFailed(true);
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setLoading(false);
      });
    return () => ctrl.abort();
  }, [sector, range, isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const perfError = failed || data.errors?.performers;
  const newsError = failed || data.errors?.news;

  return (
    <div
      className="sdm-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label={`${headerLabel} sector details`}
      onClick={onClose}
    >
      <div className="sdm-panel" onClick={(e) => e.stopPropagation()}>
        <header className="sdm-header">
          <div>
            <span className="sdm-eyebrow">Sector · {range}</span>
            <h2 className="sdm-title">{headerLabel}</h2>
            {Number.isFinite(changePct) && (
              <div className="sdm-heading-meta">
                <span className={`sdm-heading-change ${changePct >= 0 ? 'is-up' : 'is-down'}`}>
                  {formatChange(changePct)}
                </span>
                <span className="sdm-sector-index-label">Sector avg.</span>
              </div>
            )}
          </div>
          <button type="button" className="sdm-close" onClick={onClose} aria-label="Close">
            <i className="bi bi-x-lg" aria-hidden="true" />
          </button>
        </header>

        <div className="sdm-grid" aria-busy={loading}>
          <section className="sdm-section" aria-label="Top performers">
            <header className="sdm-section-header">
              <h3>Top Performers</h3>
              <span className="sdm-section-meta">{performersMeta}</span>
            </header>
            {loading ? (
              <SkeletonRows count={6} />
            ) : perfError ? (
              <div className="sdm-error" role="status">
                <i className="bi bi-exclamation-triangle" aria-hidden="true" />
                <span>Couldn&apos;t load performers right now.</span>
              </div>
            ) : data.topPerformers.length === 0 ? (
              <div className="sdm-empty">No data available for this sector and time period.</div>
            ) : (
              <ol className="sdm-performer-list">
                {data.topPerformers.map((p) => {
                  const pct = Number.isFinite(p.returnPct) ? p.returnPct : p.changePct;
                  return (
                    <li key={p.symbol}>
                      <Link
                        href={`/company-research?ticker=${encodeURIComponent(p.symbol)}`}
                        className="sdm-performer-row"
                        onClick={onClose}
                      >
                        <div className="sdm-performer-id">
                          <span className="sdm-performer-symbol">{p.symbol}</span>
                          <span className="sdm-performer-name">{p.name}</span>
                        </div>
                        <div className="sdm-performer-metrics">
                          <span className="sdm-performer-price">{formatPrice(p.price)}</span>
                          <span
                            className={`sdm-performer-change ${pct >= 0 ? 'is-up' : 'is-down'}`}
                          >
                            {formatChange(pct)}
                          </span>
                          {formatCap(p.marketCap) && (
                            <span className="sdm-performer-cap">{formatCap(p.marketCap)} cap</span>
                          )}
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ol>
            )}
          </section>

          <section className="sdm-section" aria-label="Recent news">
            <header className="sdm-section-header">
              <h3>Recent News</h3>
              {!loading && !newsError && (
                <span className="sdm-section-meta">
                  {data.news.length} {data.news.length === 1 ? 'article' : 'articles'}
                </span>
              )}
            </header>
            {loading ? (
              <SkeletonRows count={5} />
            ) : newsError ? (
              <div className="sdm-error" role="status">
                <i className="bi bi-exclamation-triangle" aria-hidden="true" />
                <span>Couldn&apos;t load news right now.</span>
              </div>
            ) : data.news.length === 0 ? (
              <div className="sdm-empty">No recent news for this sector yet.</div>
            ) : (
              <ul className="sdm-news-list">
                {data.news.map((n) => (
                  <li key={n.id || n.url}>
                    <a
                      href={n.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="sdm-news-row"
                    >
                      <div className="sdm-news-body">
                        <span className="sdm-news-title">{n.title}</span>
                        {n.summary && (
                          <span className="sdm-news-summary">
                            {n.summary.length > 140 ? `${n.summary.slice(0, 140)}...` : n.summary}
                          </span>
                        )}
                        <span className="sdm-news-meta">
                          {n.source && <span className="sdm-news-source">Source: {n.source}</span>}
                          <span className="sdm-news-time">{timeAgo(n.publishedAt, n.time)}</span>
                        </span>
                      </div>
                      <i className="bi bi-arrow-up-right sdm-news-arrow" aria-hidden="true" />
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

export default SectorDetailModal;
