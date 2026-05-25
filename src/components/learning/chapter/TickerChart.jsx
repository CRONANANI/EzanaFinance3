'use client';

import StockPriceChart from '@/components/research/StockPriceChart';

export function TickerChart({ ticker, range = '1Y', eyebrow = 'Live example', title, annotation }) {
  const resolvedTitle = title || `${ticker} — ${range} price`;
  return (
    <div className="lc-edit-tickerchart">
      <div className="lc-edit-chart-header">
        <div>
          <div className="lc-edit-chart-eyebrow">
            <i className="bi bi-diamond-fill" /> {eyebrow}
          </div>
          <h3 className="lc-edit-chart-title">{resolvedTitle}</h3>
          {annotation && <p className="lc-edit-chart-sub">{annotation}</p>}
        </div>
        <span className="lc-edit-chart-hint">
          <i className="bi bi-graph-up" /> Live · refreshes every 5 min
        </span>
      </div>
      <div className="lc-edit-chart-canvas lc-edit-tickerchart-canvas">
        <StockPriceChart symbol={ticker} initialRange={range} compact />
      </div>
    </div>
  );
}
