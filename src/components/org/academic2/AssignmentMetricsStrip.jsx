'use client';

import { NA } from '@/lib/org-display';

/* Full-width metrics row: Open · Overdue (amber) · Awaiting review · Completion. */
export function AssignmentMetricsStrip({ metrics }) {
  const m = metrics || {};
  const rate = m.completion_rate_pct;
  const delta = m.completion_delta_pct;

  return (
    <div className="asg2-metrics">
      <div className="asg2-metric">
        <p className="asg2-metric-label">
          <i
            className="bi bi-clipboard-data"
            aria-hidden="true"
            style={{ verticalAlign: '-2px', marginRight: 4 }}
          />
          Open
        </p>
        <div className="asg2-metric-value">{m.open ?? 0}</div>
      </div>

      <div className="asg2-metric asg2-metric--overdue">
        <p className="asg2-metric-label">
          <i
            className="bi bi-exclamation-triangle"
            aria-hidden="true"
            style={{ verticalAlign: '-2px', marginRight: 4 }}
          />
          Overdue
        </p>
        <div className="asg2-metric-value">{m.overdue ?? 0}</div>
      </div>

      <div className="asg2-metric">
        <p className="asg2-metric-label">
          <i
            className="bi bi-eye"
            aria-hidden="true"
            style={{ verticalAlign: '-2px', marginRight: 4 }}
          />
          Awaiting review
        </p>
        <div className="asg2-metric-value">{m.awaiting_review ?? 0}</div>
      </div>

      <div className="asg2-metric">
        <p className="asg2-metric-label">
          <i
            className="bi bi-check-circle"
            aria-hidden="true"
            style={{ verticalAlign: '-2px', marginRight: 4 }}
          />
          Completion · term
        </p>
        <div className="asg2-metric-value">{rate == null ? NA : `${rate}%`}</div>
        {delta != null && (
          <div className="asg2-metric-sub">
            <span className={`asg2-delta ${delta >= 0 ? 'asg2-delta--up' : 'asg2-delta--down'}`}>
              {delta >= 0 ? (
                <i className="bi bi-graph-up-arrow" aria-hidden="true" />
              ) : (
                <i className="bi bi-graph-down-arrow" aria-hidden="true" />
              )}{' '}
              {delta >= 0 ? '+' : ''}
              {delta}%
            </span>{' '}
            vs last term
          </div>
        )}
      </div>
    </div>
  );
}
