'use client';

import { NumberText } from './NumberText';

export function LcSessionMetrics({ streak, rows = [] }) {
  const days = streak?.daysThisWeek || Array(7).fill(false);

  return (
    <div className="lc-card">
      <div className="lc-card-head">
        <span className="lc-card-title">Session metrics</span>
        <span className="lc-card-eyebrow">today</span>
      </div>

      <div className="lc-sm-streak">
        <div className="lc-sm-streak-head">
          <span className="lc-sm-label">Weekly streak</span>
          <span className="lc-sm-streak-value">
            <NumberText size={14} weight={500} color="var(--lc-accent)">
              {days.filter(Boolean).length} / 7
            </NumberText>
            <span style={{ color: 'var(--lc-accent)', marginLeft: 4 }}>days</span>
          </span>
        </div>
        <div className="lc-sm-streak-bars">
          {days.map((on, i) => (
            <div key={i} className={`lc-sm-streak-bar ${on ? 'lc-sm-streak-bar--on' : ''}`} />
          ))}
        </div>
      </div>

      {rows.map((r) => {
        const colorClass =
          r.color === 'green'
            ? 'lc-sm-value--green'
            : r.color === 'bronze'
              ? 'lc-sm-value--bronze'
              : r.color === 'dim'
                ? 'lc-sm-value--dim'
                : '';
        return (
          <div className="lc-sm-row" key={r.label}>
            <span className="lc-sm-label">{r.label}</span>
            <span className={`lc-sm-value ${colorClass}`}>{r.value}</span>
          </div>
        );
      })}
    </div>
  );
}
