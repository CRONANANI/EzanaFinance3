'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

const CONFIDENCE_CONFIG = {
  high: { color: '#10b981', label: 'High Confidence', icon: 'bi-shield-fill-check' },
  medium: { color: '#f59e0b', label: 'Medium Confidence', icon: 'bi-shield-fill-exclamation' },
  low: { color: '#ef4444', label: 'Low Confidence', icon: 'bi-shield-fill-x' },
};

function normalizeConfidence(raw) {
  const k = String(raw || 'medium').toLowerCase();
  if (k === 'high' || k === 'low' || k === 'medium') return k;
  return 'medium';
}

export function OpportunityAnalysisModal({ event, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    if (!event) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch('/api/market-opportunities/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event }),
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('Failed'))))
      .then((d) => {
        if (!cancelled) {
          setData(d);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError('Could not load analysis');
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [event, retryKey]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  if (!event) return null;

  const isWindfall = event.type === 'windfall';
  const accentColor = isWindfall ? '#10b981' : '#ef4444';
  const analysis = data?.analysis;
  const confKey = normalizeConfidence(analysis?.confidence);
  const conf = CONFIDENCE_CONFIG[confKey] || CONFIDENCE_CONFIG.medium;

  return (
    <div className="mkt-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="mkt-modal">
        <div className="mkt-modal-header">
          <div className="mkt-modal-header-left">
            <div
              className="mkt-modal-type-badge"
              style={{
                background: `${accentColor}18`,
                color: accentColor,
                borderColor: `${accentColor}40`,
              }}
            >
              <i className={`bi ${isWindfall ? 'bi-graph-up-arrow' : 'bi-exclamation-triangle'}`} />
              {isWindfall ? 'Windfall' : 'Bane'}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h2 className="mkt-modal-title">{event.headline}</h2>
              <div className="mkt-modal-meta">
                {event.ticker && (
                  <Link href={`/company-research?q=${encodeURIComponent(event.ticker)}`} className="mkt-modal-ticker">
                    ${event.ticker}
                  </Link>
                )}
                <span>{event.source}</span>
                <span>
                  {new Date(event.publishedAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            </div>
          </div>
          <button type="button" className="mkt-modal-close" onClick={onClose} aria-label="Close">
            <i className="bi bi-x-lg" />
          </button>
        </div>

        <div className="mkt-modal-body">
          {loading ? (
            <div className="mkt-modal-loading">
              <div className="mkt-modal-spinner" />
              <p>Generating analysis tailored to your profile…</p>
            </div>
          ) : error ? (
            <div className="mkt-modal-error">
              <i className="bi bi-exclamation-triangle" />
              <p>{error}</p>
              <button
                type="button"
                className="mkt-modal-retry"
                onClick={() => {
                  setError(null);
                  setRetryKey((k) => k + 1);
                }}
              >
                Retry
              </button>
            </div>
          ) : (
            <>
              <div className="mkt-modal-badges">
                <span
                  className="mkt-modal-conf-badge"
                  style={{
                    color: conf.color,
                    borderColor: `${conf.color}40`,
                    background: `${conf.color}12`,
                  }}
                >
                  <i className={`bi ${conf.icon}`} /> {conf.label}
                </span>
                {data?.riskProfile && (
                  <span className="mkt-modal-profile-badge">
                    <i className="bi bi-person-gear" /> {data.riskProfile} Profile
                  </span>
                )}
              </div>

              <div className="mkt-modal-section">
                <h3 className="mkt-modal-section-title">
                  <i className="bi bi-robot" /> Why This Matters For You
                </h3>
                <p className="mkt-modal-context">{analysis?.context}</p>
              </div>

              {analysis?.factors?.length > 0 && (
                <div className="mkt-modal-factors">
                  {analysis.factors.map((f, i) => (
                    <div key={i} className="mkt-modal-factor">
                      <span className="mkt-modal-factor-dot" style={{ background: accentColor }} />
                      {f}
                    </div>
                  ))}
                </div>
              )}

              {data?.kpis?.length > 0 && (
                <div className="mkt-modal-section">
                  <h3 className="mkt-modal-section-title">
                    <i className="bi bi-bar-chart-line" /> Key Metrics
                  </h3>
                  <div className="mkt-modal-kpi-grid">
                    {data.kpis.map((kpi, i) => (
                      <div key={i} className="mkt-modal-kpi">
                        <span className="mkt-modal-kpi-label">{kpi.label}</span>
                        <span className="mkt-modal-kpi-value">{kpi.value}</span>
                        {kpi.sub && <span className="mkt-modal-kpi-sub">{kpi.sub}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {data?.relatedNews?.length > 0 && (
                <div className="mkt-modal-section">
                  <h3 className="mkt-modal-section-title">
                    <i className="bi bi-newspaper" /> Supporting News
                  </h3>
                  <div className="mkt-modal-news-list">
                    {data.relatedNews.map((n, i) => (
                      <a
                        key={i}
                        href={n.url || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mkt-modal-news-item"
                        onClick={(e) => {
                          if (!n.url) e.preventDefault();
                        }}
                      >
                        <span className="mkt-modal-news-num">{i + 1}</span>
                        <div className="mkt-modal-news-body">
                          <p className="mkt-modal-news-title">{n.title}</p>
                          <span className="mkt-modal-news-source">
                            {n.source} ·{' '}
                            {new Date(n.publishedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                        <i className="bi bi-box-arrow-up-right mkt-modal-news-arrow" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              <div className="mkt-modal-insight" style={{ borderLeftColor: accentColor }}>
                <div className="mkt-modal-insight-label">
                  <i className="bi bi-lightbulb" /> Actionable Insight
                </div>
                <p className="mkt-modal-insight-text">{analysis?.insight}</p>
              </div>

              <div className="mkt-modal-actions">
                {event.ticker && (
                  <Link
                    href={`/company-research?q=${encodeURIComponent(event.ticker)}`}
                    className="mkt-modal-action-btn mkt-modal-action-btn--primary"
                  >
                    <i className="bi bi-graph-up" /> View {event.ticker} Research
                  </Link>
                )}
                {event.url && (
                  <a href={event.url} target="_blank" rel="noopener noreferrer" className="mkt-modal-action-btn">
                    <i className="bi bi-box-arrow-up-right" /> Read Full Article
                  </a>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
