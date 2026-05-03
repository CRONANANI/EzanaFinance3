'use client';

import { useState } from 'react';
import { EXPLAINER_TRADES } from '@/lib/for-the-quants-mock-data';

export function BacktestExplainer() {
  const [expandedId, setExpandedId] = useState(null);

  return (
    <div className="ftq-expl">
      <div className="ftq-expl-header">
        <i className="bi bi-lightbulb" /> Trade Explainability
      </div>
      <p className="ftq-expl-sub">Why did each trade trigger? Click to expand.</p>
      {EXPLAINER_TRADES.map((trade) => (
        <div key={trade.id} className="ftq-expl-trade">
          <button
            type="button"
            className="ftq-expl-trade-header"
            onClick={() => setExpandedId((prev) => (prev === trade.id ? null : trade.id))}
          >
            <span className={`ftq-expl-action ${trade.action.toLowerCase()}`}>{trade.action}</span>
            <span className="ftq-expl-ticker">{trade.ticker}</span>
            <span className="ftq-expl-price">{trade.price}</span>
            <span className="ftq-expl-date">{trade.date}</span>
            {trade.outcome.pnl ? (
              <span
                className={`ftq-expl-pnl ${
                  trade.outcome.pnl.startsWith('+')
                    ? 'positive'
                    : trade.outcome.pnl === 'Open'
                      ? 'open'
                      : 'negative'
                }`}
              >
                {trade.outcome.pnl}
              </span>
            ) : null}
            <i className={`bi bi-chevron-${expandedId === trade.id ? 'up' : 'down'}`} />
          </button>
          {expandedId === trade.id && (
            <div className="ftq-expl-detail">
              <div className="ftq-expl-reasons">
                {trade.reasons.map((r, i) => (
                  <div key={`${trade.id}-r-${i}`} className="ftq-expl-reason">
                    <span className="ftq-expl-check">
                      <i className="bi bi-check-circle-fill" />
                    </span>
                    <div>
                      <div className="ftq-expl-cond">{r.condition}</div>
                      <div className="ftq-expl-detail-text">{r.detail}</div>
                    </div>
                  </div>
                ))}
              </div>
              {trade.outcome.exitDate ? (
                <div className="ftq-expl-outcome">
                  Exited {trade.outcome.exitDate} at {trade.outcome.exitPrice} · Held {trade.outcome.holdDays} days · P/L:{' '}
                  <strong>{trade.outcome.pnl}</strong>
                </div>
              ) : (
                <div className="ftq-expl-outcome ftq-expl-outcome--open">Position still open</div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
