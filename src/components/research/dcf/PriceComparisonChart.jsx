'use client';

export default function PriceComparisonChart({ symbol, livePrice, fairValue, loading, error }) {
  if (loading) {
    return (
      <div className="dcf-chart-empty">
        <div className="dcf-chart-spinner" />
        <span>Calculating DCF…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dcf-chart-empty">
        <i className="bi bi-exclamation-triangle" style={{ color: '#ef4444', fontSize: '1.5rem' }} />
        <span style={{ color: '#ef4444' }}>{error}</span>
        <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
          Try clicking Recalculate, or check your assumptions.
        </span>
      </div>
    );
  }

  const live = typeof livePrice === 'number' ? livePrice : Number(livePrice);
  const fair = typeof fairValue === 'number' ? fairValue : Number(fairValue);

  if (!Number.isFinite(live) || live <= 0 || !Number.isFinite(fair) || fair <= 0) {
    return (
      <div className="dcf-chart-empty">
        <i className="bi bi-graph-up" style={{ fontSize: '1.5rem', color: '#6b7280' }} />
        <span>Loading price data…</span>
      </div>
    );
  }

  const delta = fair - live;
  const deltaPct = (delta / live) * 100;
  const isUndervalued = delta > 0;

  const maxValue = Math.max(live, fair);
  const liveBarPct = (live / maxValue) * 100;
  const fairBarPct = (fair / maxValue) * 100;

  return (
    <div className="dcf-chart-root">
      <div className="dcf-chart-header">
        <h4>{symbol} · Fair Value vs Market</h4>
        <div className={`dcf-chart-verdict ${isUndervalued ? 'undervalued' : 'overvalued'}`}>
          {isUndervalued ? '↑ Undervalued' : '↓ Overvalued'}
          <span className="dcf-chart-delta">
            {isUndervalued ? '+' : ''}
            {deltaPct.toFixed(1)}%
          </span>
        </div>
      </div>

      <div className="dcf-chart-bars">
        <div className="dcf-chart-bar-row">
          <span className="dcf-chart-bar-label">Live Market Price</span>
          <div className="dcf-chart-bar-track">
            <div className="dcf-chart-bar-fill dcf-chart-bar-live" style={{ width: `${liveBarPct}%` }} />
          </div>
          <span className="dcf-chart-bar-value">${live.toFixed(2)}</span>
        </div>

        <div className="dcf-chart-bar-row">
          <span className="dcf-chart-bar-label">DCF Fair Value</span>
          <div className="dcf-chart-bar-track">
            <div
              className={`dcf-chart-bar-fill ${isUndervalued ? 'dcf-chart-bar-fair-up' : 'dcf-chart-bar-fair-down'}`}
              style={{ width: `${fairBarPct}%` }}
            />
          </div>
          <span className="dcf-chart-bar-value">${fair.toFixed(2)}</span>
        </div>
      </div>

      <div className="dcf-chart-footer">
        <p>
          The DCF model values {symbol} at <strong>${fair.toFixed(2)}</strong> per share, a{' '}
          <strong>{Math.abs(deltaPct).toFixed(1)}%</strong>{' '}
          {isUndervalued ? 'discount to' : 'premium over'} the current market price of{' '}
          <strong>${live.toFixed(2)}</strong>.{' '}
          {isUndervalued
            ? 'The model suggests the stock may be undervalued at current levels.'
            : 'The model suggests the stock may be overvalued at current levels.'}
        </p>
      </div>
    </div>
  );
}
