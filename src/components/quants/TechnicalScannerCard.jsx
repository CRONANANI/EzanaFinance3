'use client';
import { useState, useCallback } from 'react';

const SIGNAL_COLORS = {
  buy: { bg: 'rgba(16,185,129,0.12)', text: '#10b981', label: 'Buy' },
  sell: { bg: 'rgba(239,68,68,0.12)', text: '#ef4444', label: 'Sell' },
  neutral: { bg: 'rgba(107,114,128,0.12)', text: '#9ca3af', label: 'Neutral' },
};

export function TechnicalScannerCard() {
  const [symbol, setSymbol] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const scan = useCallback(async () => {
    if (!symbol.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/quants/indicators/${encodeURIComponent(symbol.trim().toUpperCase())}`,
      );
      const json = await res.json();
      if (res.ok) setData(json);
      else setData(null);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [symbol]);

  return (
    <div className="db-card">
      <div className="db-card-header">
        <h3 className="ftq-section-title">
          <i className="bi bi-activity" aria-hidden /> Live Technical Scanner
        </h3>
      </div>
      <div className="ftq-card-body-pad">
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
          <input
            className="ftq-pm-input"
            placeholder="Enter ticker (e.g. AAPL)"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && scan()}
          />
          <button type="button" className="ftq-btn-primary" onClick={scan} disabled={loading}>
            {loading ? 'Scanning...' : 'Scan'}
          </button>
        </div>
        {data && (
          <>
            <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
              <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                {data.symbol} · Aggregate Signal
              </span>
              <div
                style={{
                  fontSize: '1.25rem',
                  fontWeight: 800,
                  color: data.aggregate.includes('Buy')
                    ? '#10b981'
                    : data.aggregate.includes('Sell')
                      ? '#ef4444'
                      : '#f59e0b',
                  marginTop: '0.25rem',
                }}
              >
                {data.aggregate}
              </div>
              <span style={{ fontSize: '0.7rem', color: '#6b7280' }}>
                {data.buyCount} Buy · {data.sellCount} Sell · {data.neutralCount} Neutral
              </span>
            </div>
            <div style={{ display: 'grid', gap: '0.5rem' }}>
              {data.indicators.map((ind) => {
                const sc = SIGNAL_COLORS[ind.signal];
                return (
                  <div
                    key={ind.name}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '0.5rem 0.75rem',
                      borderRadius: 8,
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid rgba(255,255,255,0.06)',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#f0f6fc' }}>
                        {ind.name}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: '#6b7280' }}>{ind.detail}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div
                        style={{
                          fontSize: '0.875rem',
                          fontWeight: 700,
                          fontFamily: 'monospace',
                          color: '#d1d5db',
                        }}
                      >
                        {ind.formatted ?? '—'}
                      </div>
                      <span
                        style={{
                          fontSize: '0.65rem',
                          fontWeight: 700,
                          padding: '2px 6px',
                          borderRadius: 4,
                          background: sc.bg,
                          color: sc.text,
                        }}
                      >
                        {sc.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
