'use client';

export function ConvictionMap({ tickers = [], activeTicker, onSelect }) {
  const items = (tickers || []).slice(0, 6);

  if (!items.length) {
    return (
      <div className="ez-card ledger-card evo-conviction-map">
        <div className="cardhdr">Conviction map</div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>No conviction data yet.</div>
      </div>
    );
  }

  return (
    <div className="ez-card ledger-card evo-conviction-map">
      <div className="cardhdr">
        <span>Conviction map</span>
        <span className="cardhdr-meta ez-mono">{items.length} tickers</span>
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
          gap: 8,
        }}
      >
        {items.map((t) => {
          const symbol = t.symbol || t.ticker;
          const bull = t.bullPct ?? t.bull_pct ?? t.bull ?? 50;
          const bear = 100 - bull;
          const selected = activeTicker === symbol;
          return (
            <button
              key={symbol}
              type="button"
              className={`ctile ${selected ? 'active' : ''}`}
              onClick={() => onSelect?.(symbol)}
            >
              <div className="ctile-ticker">${symbol}</div>
              {t.name && <div className="ctile-name">{t.name}</div>}
              <div className="bbar" title={`Bull ${bull}%`}>
                <div className="bull" style={{ width: `${bull}%` }} />
              </div>
              <div className="ctile-split">
                <span style={{ color: 'var(--emerald-ink)' }} className="ez-mono">
                  {bull}% bull
                </span>
                <span style={{ color: 'var(--negative)' }} className="ez-mono">
                  {bear}% bear
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
