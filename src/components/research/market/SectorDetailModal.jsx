'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import './sector-detail-modal.css';

const TIME_AGO_LABELS = (unixSeconds) => {
  if (!unixSeconds) return '';
  const diffMs = Date.now() - Number(unixSeconds) * 1000;
  const m = Math.floor(diffMs / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
};

const formatChange = (pct) => {
  if (!Number.isFinite(pct)) return '—';
  return `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`;
};

const formatPrice = (n) => {
  if (!Number.isFinite(n)) return '—';
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export function SectorDetailModal({ sector, displayName, changePct, rangeLabel, isOpen, onClose }) {
  const [data, setData] = useState({ topPerformers: [], news: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const headerLabel = displayName || sector;

  useEffect(() => {
    if (!isOpen || !sector) return undefined;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/market-data/sector-detail?sector=${encodeURIComponent(sector)}`)
      .then(async (r) => {
        const d = await r.json().catch(() => ({}));
        if (cancelled) return;
        if (!r.ok) {
          setError(typeof d.error === 'string' ? d.error : `Failed to load (${r.status})`);
          return;
        }
        if (d.error) {
          setError(typeof d.error === 'string' ? d.error : 'Failed to load sector');
          return;
        }
        setData({ topPerformers: d.topPerformers || [], news: d.news || [] });
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [sector, isOpen]);

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
            <span className="sdm-eyebrow">Sector</span>
            <h2 className="sdm-title">{headerLabel}</h2>
            {(Number.isFinite(changePct) || rangeLabel) && (
              <div className="sdm-heading-meta">
                {Number.isFinite(changePct) && (
                  <span className={`sdm-heading-change ${changePct >= 0 ? 'is-up' : 'is-down'}`}>
                    {formatChange(changePct)}
                  </span>
                )}
                {rangeLabel ? <span className="sdm-range-pill">{rangeLabel}</span> : null}
              </div>
            )}
          </div>
          <button type="button" className="sdm-close" onClick={onClose} aria-label="Close">
            <i className="bi bi-x-lg" />
          </button>
        </header>

        {loading && (
          <div className="sdm-loading">
            <i className="bi bi-arrow-clockwise sdm-spin" />
            <span>Loading {headerLabel} details...</span>
          </div>
        )}

        {error && !loading && (
          <div className="sdm-error">
            <i className="bi bi-exclamation-triangle" />
            <span>{error}</span>
          </div>
        )}

        {!loading && !error && (
          <div className="sdm-grid">
            <section className="sdm-section">
              <header className="sdm-section-header">
                <h3>Top Performers</h3>
                <span className="sdm-section-meta">By daily % change</span>
              </header>
              {data.topPerformers.length === 0 ? (
                <div className="sdm-empty">No performer data available right now.</div>
              ) : (
                <ul className="sdm-performer-list">
                  {data.topPerformers.map((p) => (
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
                            className={`sdm-performer-change ${p.changePct >= 0 ? 'is-up' : 'is-down'}`}
                          >
                            {formatChange(p.changePct)}
                          </span>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="sdm-section">
              <header className="sdm-section-header">
                <h3>Recent News</h3>
                <span className="sdm-section-meta">{data.news.length} articles</span>
              </header>
              {data.news.length === 0 ? (
                <div className="sdm-empty">
                  No recent news matching {headerLabel}. Try a broader sector.
                </div>
              ) : (
                <ul className="sdm-news-list">
                  {data.news.map((n) => (
                    <li key={n.id}>
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
                              {n.summary.length > 140 ? `${n.summary.slice(0, 140)}…` : n.summary}
                            </span>
                          )}
                          <span className="sdm-news-meta">
                            <span className="sdm-news-source">{n.source}</span>
                            <span className="sdm-news-time">{TIME_AGO_LABELS(n.time)}</span>
                          </span>
                        </div>
                        <i className="bi bi-arrow-up-right sdm-news-arrow" />
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}

export default SectorDetailModal;
