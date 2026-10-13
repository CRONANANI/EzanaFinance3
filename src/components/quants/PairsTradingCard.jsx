'use client';
import { useState, useCallback } from 'react';

const SIGNAL_MAP = {
  long_spread: {
    label: 'LONG SPREAD',
    color: '#10b981',
    desc: 'A is undervalued relative to B — buy A, sell B',
  },
  short_spread: {
    label: 'SHORT SPREAD',
    color: '#ef4444',
    desc: 'A is overvalued relative to B — sell A, buy B',
  },
  watch_long: {
    label: 'WATCH (Long)',
    color: '#f59e0b',
    desc: 'Approaching long entry threshold',
  },
  watch_short: {
    label: 'WATCH (Short)',
    color: '#f59e0b',
    desc: 'Approaching short entry threshold',
  },
  no_trade: { label: 'NO TRADE', color: '#6b7280', desc: 'Spread within normal range' },
};

export function PairsTradingCard() {
  const [tickerA, setTickerA] = useState('KO');
  const [tickerB, setTickerB] = useState('PEP');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const analyze = useCallback(async () => {
    if (!tickerA.trim() || !tickerB.trim()) return;
    setLoading(true);
    try {
      const res = await fetch('/api/quants/pairs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tickerA: tickerA.trim(), tickerB: tickerB.trim(), days: 252 }),
      });
      const json = await res.json();
      if (res.ok && !json.error) setData(json);
      else setData(null);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [tickerA, tickerB]);

  const sig = data ? SIGNAL_MAP[data.signal] : null;

  return (
    <div className="db-card">
      <div className="db-card-header">
        <h3 className="ftq-section-title">
          <i className="bi bi-arrow-left-right" aria-hidden /> Pairs Trading Screener
        </h3>
      </div>
      <div className="ftq-card-body-pad">
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', alignItems: 'center' }}>
          <input
            className="ftq-pm-input"
            style={{ width: 80 }}
            placeholder="Ticker A"
            value={tickerA}
            onChange={(e) => setTickerA(e.target.value)}
          />
          <span style={{ color: '#6b7280', fontSize: '0.8rem' }}>vs</span>
          <input
            className="ftq-pm-input"
            style={{ width: 80 }}
            placeholder="Ticker B"
            value={tickerB}
            onChange={(e) => setTickerB(e.target.value)}
          />
          <button type="button" className="ftq-btn-primary" onClick={analyze} disabled={loading}>
            {loading ? 'Analyzing...' : 'Analyze Pair'}
          </button>
        </div>
        {data && sig && (
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            <div
              style={{
                textAlign: 'center',
                padding: '0.75rem',
                borderRadius: 8,
                background: `${sig.color}15`,
                border: `1px solid ${sig.color}40`,
              }}
            >
              <div style={{ fontSize: '1rem', fontWeight: 800, color: sig.color }}>{sig.label}</div>
              <div style={{ fontSize: '0.7rem', color: '#9ca3af' }}>{sig.desc}</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
              {[
                {
                  label: 'Z-Score',
                  value: data.zScore?.toFixed(2),
                  color: Math.abs(data.zScore) > 2 ? '#ef4444' : '#d1d5db',
                },
                {
                  label: 'Correlation',
                  value: data.correlation?.toFixed(3),
                  color: data.correlation > 0.7 ? '#10b981' : '#f59e0b',
                },
                {
                  label: 'Half-Life',
                  value: data.halfLife ? `${data.halfLife.toFixed(0)} days` : '—',
                  color: '#d1d5db',
                },
              ].map((m) => (
                <div
                  key={m.label}
                  style={{
                    textAlign: 'center',
                    padding: '0.5rem',
                    borderRadius: 6,
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.06)',
                  }}
                >
                  <div style={{ fontSize: '0.65rem', color: '#6b7280' }}>{m.label}</div>
                  <div
                    style={{
                      fontSize: '1rem',
                      fontWeight: 800,
                      fontFamily: 'monospace',
                      color: m.color,
                    }}
                  >
                    {m.value}
                  </div>
                </div>
              ))}
            </div>
            <p style={{ fontSize: '0.65rem', color: '#6b7280', margin: 0 }}>
              {data.dataPoints} trading days analyzed. Entry at |z| {'>'} 2, exit at |z| {'<'} 0.5.
              Half-life = estimated days for spread to revert halfway to mean.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
