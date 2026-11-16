'use client';

/*
 * Biggest winners and losers by 24 hour change, from the same illustrative
 * rows as the prices table. The page has no history, so there is no
 * timeframe to choose: every change here is the 24 hour figure. Clicking a
 * row shows that asset in the price chart.
 */
export function AmMovers({ winners = [], losers = [], selected, onRowClick }) {
  return (
    <div className="am2-card">
      <div className="am2-card-head">
        <div className="am2-card-head-titles">
          <h3 className="am2-card-title">Movers</h3>
          <span className="am2-card-subtitle">24h, illustrative</span>
        </div>
      </div>

      <div className="am2-card-body--flush">
        <MoverSection
          title="Biggest winners"
          rows={winners.slice(0, 5)}
          kind="up"
          selected={selected}
          onRowClick={onRowClick}
        />
        <MoverSection
          title="Biggest losers"
          rows={losers.slice(0, 5)}
          kind="down"
          selected={selected}
          onRowClick={onRowClick}
        />
      </div>
    </div>
  );
}

function MoverSection({ title, rows, kind, selected, onRowClick }) {
  return (
    <div className="am2-mover-section">
      <div className="am2-mover-section-head">
        <span className="am2-mover-section-title">{title}</span>
        <span className="am2-mover-section-tf">24h</span>
      </div>
      {rows.length === 0 ? (
        <p className="am2-mover-empty">None in this view.</p>
      ) : (
        rows.map((row) => {
          const isSel = selected === row.ticker;
          return (
            <button
              key={`${row.ticker}-${row.rank}`}
              type="button"
              className={`am2-mover-row${isSel ? ' am2-mover-row--selected' : ''}`}
              aria-pressed={isSel}
              aria-label={`Show ${row.name} in the price chart`}
              onClick={() => onRowClick?.(row)}
            >
              <span className="am2-mover-rank">{String(row.rank).padStart(2, '0')}</span>
              <span className="am2-mover-sym">{row.ticker}</span>
              <span className="am2-mover-price">{row.price}</span>
              <span className={`am2-badge-pct am2-badge-pct--${kind}`}>
                {row.chg24h > 0 ? '+' : row.chg24h < 0 ? '-' : ''}
                {Math.abs(row.chg24h).toFixed(2)}%
              </span>
            </button>
          );
        })
      )}
    </div>
  );
}
