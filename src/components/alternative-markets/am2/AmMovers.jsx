'use client';

import { useState } from 'react';

const TF_OPTIONS = ['1H', '1D', '7D', '1M', '3M', 'YTD', '1Y'];

export function AmMovers({ winners = [], losers = [], onRowClick }) {
  const [tf, setTf] = useState('1D');

  return (
    <div className="am2-card">
      <div className="am2-card-head">
        <h3 className="am2-card-title">Movers</h3>
        <div className="am2-seg" role="tablist" aria-label="Timeframe">
          {TF_OPTIONS.map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tf === t}
              className={`am2-seg-btn ${tf === t ? 'am2-seg-btn--active' : ''}`}
              onClick={() => setTf(t)}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="am2-card-body--flush">
        <MoverSection
          title="Biggest winners"
          rows={winners.slice(0, 5)}
          kind="up"
          tf={tf}
          onRowClick={onRowClick}
        />
        <MoverSection
          title="Biggest losers"
          rows={losers.slice(0, 5)}
          kind="down"
          tf={tf}
          onRowClick={onRowClick}
        />
      </div>
    </div>
  );
}

function MoverSection({ title, rows, kind, tf, onRowClick }) {
  return (
    <div className="am2-mover-section">
      <div className="am2-mover-section-head">
        <span className="am2-mover-section-title">{title}</span>
        <span className="am2-mover-section-tf">{tf}</span>
      </div>
      {rows.map((row) => (
        <div
          key={`${row.symbol}-${row.rank}`}
          className="am2-mover-row"
          onClick={() => onRowClick?.(row)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onRowClick?.(row)}
        >
          <span className="am2-mover-rank">{String(row.rank).padStart(2, '0')}</span>
          <span className="am2-mover-sym">
            <span className={`am2-mover-sym-dot am2-mover-sym-dot--${kind}`} />
            {row.symbol}
          </span>
          <span className="am2-mover-price">{row.price}</span>
          <span className={`am2-badge-pct am2-badge-pct--${kind}`}>
            {kind === 'up' ? '▲' : '▼'} {Math.abs(row.chg).toFixed(2)}%
          </span>
        </div>
      ))}
    </div>
  );
}
