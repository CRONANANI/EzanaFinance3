'use client';

export function ConvictionMap({ tickers = [], activeTicker, onSelect }) {
  const items = (tickers || []).slice(0, 6);

  if (!items.length) {
    return (
      <div className="ez-card evo-conviction-map" style={{ padding: 16, marginBottom: 16 }}>
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>No conviction data yet.</div>
      </div>
    );
  }

  return (
    <div className="ez-card evo-conviction-map" style={{ padding: 16, marginBottom: 16 }}>
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: 'var(--text-muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          marginBottom: 12,
        }}
      >
        Conviction map
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
          gap: 10,
        }}
      >
        {items.map((t) => {
          const symbol = t.symbol || t.ticker;
          const bull = t.bullPct ?? t.bull_pct ?? t.bull ?? 50;
          const bear = t.bearPct ?? t.bear_pct ?? t.bear ?? 100 - bull;
          const selected = activeTicker === symbol;
          return (
            <button
              key={symbol}
              type="button"
              onClick={() => onSelect?.(symbol)}
              style={{
                padding: 12,
                background: selected ? 'var(--emerald-bg-subtle)' : 'var(--bg-tertiary)',
                border: `1px solid ${selected ? 'var(--emerald-border)' : 'var(--border-secondary)'}`,
                borderRadius: 10,
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <div
                className="ez-mono"
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  marginBottom: 8,
                }}
              >
                ${symbol}
              </div>
              <div
                style={{
                  display: 'flex',
                  height: 6,
                  borderRadius: 999,
                  overflow: 'hidden',
                  background: 'var(--surface-card)',
                }}
              >
                <div
                  style={{ width: `${bull}%`, background: 'var(--positive)' }}
                  title={`Bull ${bull}%`}
                />
                <div
                  style={{ width: `${bear}%`, background: 'var(--negative)' }}
                  title={`Bear ${bear}%`}
                />
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginTop: 6,
                  fontSize: 10,
                  fontFamily: 'var(--font-mono)',
                }}
              >
                <span style={{ color: 'var(--positive)' }}>Bull {bull}%</span>
                <span style={{ color: 'var(--negative)' }}>Bear {bear}%</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
