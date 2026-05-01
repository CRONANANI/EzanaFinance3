'use client';

import { useState, useEffect } from 'react';
import './kairos-correlations-card.css';

function rColor(r) {
  if (r >= 0.5) return '#10b981';
  if (r >= 0.2) return '#34d399';
  if (r > -0.2) return '#94a3b8';
  if (r > -0.5) return '#f87171';
  return '#ef4444';
}

function CorrelationRow({ correlation }) {
  const [expanded, setExpanded] = useState(false);
  const r = correlation.pearson_r;
  const absR = Math.abs(r);
  const direction = r >= 0 ? 'positive' : 'negative';
  const color = rColor(r);
  const barPos = ((r + 1) / 2) * 100;

  const wetReturn = correlation.top_quintile_mean_return;
  const dryReturn = correlation.bottom_quintile_mean_return;

  return (
    <li className={`kcc-row ${expanded ? 'is-expanded' : ''}`}>
      <button
        type="button"
        className="kcc-row-head"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
      >
        <div className="kcc-row-titles">
          <div className="kcc-row-title">
            {correlation.weather_label}
            <span className="kcc-arrow">→</span>
            {correlation.commodity_label}
          </div>
          <div className="kcc-row-meta">
            {correlation.lookahead_days}-day lookahead · n={correlation.sample_count}
            {correlation.p_value != null && ` · p=${correlation.p_value.toFixed(4)}`}
          </div>
        </div>
        <div className="kcc-r-display" style={{ color }}>
          {r >= 0 ? '+' : ''}
          {r.toFixed(2)}
        </div>
      </button>

      <div className="kcc-r-bar">
        <div className="kcc-r-bar-track">
          <div className="kcc-r-bar-zero" />
          <div
            className="kcc-r-bar-fill"
            style={{
              left: r >= 0 ? '50%' : `${barPos}%`,
              width: `${absR * 50}%`,
              background: color,
            }}
          />
        </div>
        <div className="kcc-r-bar-labels">
          <span>-1</span>
          <span>0</span>
          <span>+1</span>
        </div>
      </div>

      {expanded && (
        <div className="kcc-row-detail">
          <div className="kcc-detail-grid">
            <div className="kcc-detail-cell">
              <div className="kcc-detail-label">When {correlation.weather_label.toLowerCase()} is HIGH</div>
              <div
                className="kcc-detail-value"
                style={{ color: wetReturn != null ? (wetReturn >= 0 ? '#10b981' : '#ef4444') : 'inherit' }}
              >
                {wetReturn != null ? `${wetReturn >= 0 ? '+' : ''}${wetReturn.toFixed(2)}%` : '—'}
              </div>
              <div className="kcc-detail-sub">avg forward return</div>
            </div>
            <div className="kcc-detail-cell">
              <div className="kcc-detail-label">When {correlation.weather_label.toLowerCase()} is LOW</div>
              <div
                className="kcc-detail-value"
                style={{ color: dryReturn != null ? (dryReturn >= 0 ? '#10b981' : '#ef4444') : 'inherit' }}
              >
                {dryReturn != null ? `${dryReturn >= 0 ? '+' : ''}${dryReturn.toFixed(2)}%` : '—'}
              </div>
              <div className="kcc-detail-sub">avg forward return</div>
            </div>
          </div>
          <div className="kcc-detail-interpretation">
            {direction === 'positive' ? (
              <>
                Higher {correlation.weather_label.toLowerCase()} historically associates with higher{' '}
                {correlation.commodity_label} returns over the next {correlation.lookahead_days} days.
              </>
            ) : (
              <>
                Higher {correlation.weather_label.toLowerCase()} historically associates with lower{' '}
                {correlation.commodity_label} returns over the next {correlation.lookahead_days} days.
              </>
            )}
          </div>
        </div>
      )}
    </li>
  );
}

/** @param {{ regionId: string }} props */
export function KairosCorrelationsCard({ regionId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!regionId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/kairos/correlations?region=${encodeURIComponent(regionId)}&limit=10`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [regionId]);

  return (
    <section className="kairos-card kairos-card--wide kcc-card">
      <div className="kairos-card-header">
        <div className="kairos-card-header-left">
          <i className="bi bi-graph-up-arrow kairos-card-icon" aria-hidden />
          <h2 className="kairos-card-title">Historical correlations</h2>
        </div>
        <div className="kcc-header-meta">
          {data?.total_significant != null && (
            <span className="kcc-header-meta-text">{data.total_significant} significant relationships</span>
          )}
        </div>
      </div>
      <div className="kairos-card-body">
        <p className="kairos-card-hint">
          The strongest weather-to-commodity relationships in this region over the past 5 years. Only correlations
          with p &lt; 0.05 and |r| ≥ 0.2 are shown.
        </p>

        {loading && <div className="kcc-state">Loading correlations…</div>}

        {error && <div className="kcc-state kcc-state-error">Failed to load: {error}</div>}

        {!loading && !error && data?.correlations?.length === 0 && (
          <div className="kcc-state">
            No significant correlations found for this region yet. The cron may not have run, or relationships are
            below the significance threshold.
          </div>
        )}

        {!loading && !error && data?.correlations?.length > 0 && (
          <ul className="kcc-list">
            {data.correlations.map((c) => (
              <CorrelationRow key={c.id} correlation={c} />
            ))}
          </ul>
        )}

        <div className="kcc-disclaimer">
          Past correlations don&apos;t guarantee future performance. Use as one signal among many.
        </div>
      </div>
    </section>
  );
}
