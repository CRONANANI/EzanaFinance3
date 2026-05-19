'use client';
import { useState, useCallback } from 'react';

function corrColor(v) {
  if (v === null) return '#1f2937';
  if (v >= 0.8) return 'rgba(16,185,129,0.7)';
  if (v >= 0.5) return 'rgba(16,185,129,0.35)';
  if (v >= 0.2) return 'rgba(16,185,129,0.15)';
  if (v >= -0.2) return 'rgba(107,114,128,0.15)';
  if (v >= -0.5) return 'rgba(239,68,68,0.15)';
  if (v >= -0.8) return 'rgba(239,68,68,0.35)';
  return 'rgba(239,68,68,0.7)';
}

export function CorrelationMatrixCard() {
  const [input, setInput] = useState('AAPL, MSFT, NVDA, GOOG, AMZN');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const compute = useCallback(async () => {
    const tickers = input
      .split(/[,\s]+/)
      .map((t) => t.trim().toUpperCase())
      .filter(Boolean);
    if (tickers.length < 2) return;
    setLoading(true);
    try {
      const res = await fetch('/api/quants/correlation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tickers, days: 90 }),
      });
      const json = await res.json();
      if (res.ok) setData(json);
    } catch {
      /* */
    } finally {
      setLoading(false);
    }
  }, [input]);

  return (
    <div className="db-card">
      <div className="db-card-header">
        <h3 className="ftq-section-title">
          <i className="bi bi-grid-3x3" aria-hidden /> Correlation Matrix
        </h3>
      </div>
      <div className="ftq-card-body-pad">
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
          <input
            className="ftq-pm-input"
            placeholder="AAPL, MSFT, NVDA, GOOG, AMZN"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && compute()}
          />
          <button type="button" className="ftq-btn-primary" onClick={compute} disabled={loading}>
            {loading ? 'Computing...' : 'Compute'}
          </button>
        </div>
        {data && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
              <thead>
                <tr>
                  <th style={{ padding: '4px 8px', textAlign: 'left', color: '#9ca3af' }}></th>
                  {data.tickers.map((t) => (
                    <th key={t} style={{ padding: '4px 6px', color: '#d1d5db', fontWeight: 700 }}>
                      {t}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.tickers.map((row) => (
                  <tr key={row}>
                    <td style={{ padding: '4px 8px', fontWeight: 700, color: '#d1d5db' }}>{row}</td>
                    {data.tickers.map((col) => {
                      const v = data.matrix[row]?.[col];
                      return (
                        <td
                          key={col}
                          style={{
                            padding: '4px 6px',
                            textAlign: 'center',
                            fontFamily: 'monospace',
                            fontWeight: 600,
                            background: corrColor(v),
                            color: '#f0f6fc',
                            borderRadius: 4,
                          }}
                        >
                          {v != null ? v.toFixed(2) : '—'}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            <p style={{ fontSize: '0.7rem', color: '#6b7280', marginTop: '0.5rem' }}>
              Based on {data.days}-day daily returns. Green = positively correlated, Red =
              negatively correlated.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
