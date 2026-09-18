'use client';

/**
 * Session metrics as a sub-column: the weekly streak on the thin rail, then
 * dotted metric rows with mono values.
 */
export function LcSessionMetrics({ streak, rows = [] }) {
  const days = streak?.daysThisWeek || Array(7).fill(false);
  const onCount = days.filter(Boolean).length;

  return (
    <div>
      <div className="lc3-sub-head">
        <h3 className="lc3-sub-title">Session metrics</h3>
        <span className="lc3-sec-meta">Today</span>
      </div>

      <div className="lc3-item">
        <span className="lc3-item-name">Weekly streak</span>
        <span className="lc3-item-v lc3-green">{onCount}/7 days</span>
      </div>
      <div className="lc3-streak" aria-hidden>
        {days.map((on, i) => (
          <span key={i} className={`lc3-streak-cell${on ? ' is-on' : ''}`} />
        ))}
      </div>

      {rows.map((r) => (
        <div className="lc3-item" key={r.label}>
          <span className="lc3-item-name">{r.label}</span>
          <span className={`lc3-item-v${r.color === 'green' ? ' lc3-green' : ''}`}>{r.value}</span>
        </div>
      ))}
    </div>
  );
}
