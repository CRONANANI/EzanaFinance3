'use client';

/**
 * Daily quest as a sub-column under the chart: group head plus dotted item
 * rows, with the quest progress shown on the thin track rail.
 */
export function LcDailyQuest({ primary, bonus = [], resetsInLabel, onStart }) {
  const done = bonus.filter((b) => b.done).length;
  const pct = bonus.length > 0 ? Math.round((done / bonus.length) * 100) : 0;

  return (
    <div>
      <div className="lc3-sub-head">
        <h3 className="lc3-sub-title">Daily quest</h3>
        <span className="lc3-sec-meta">Resets in {resetsInLabel}</span>
      </div>

      {primary && (
        <button type="button" className="lc3-item lc3-item--click" onClick={onStart}>
          <span>
            <span className="lc3-item-name">{primary.name}</span>
            <span className="lc3-item-meta">
              {primary.track} · {primary.level} · {primary.durationMinutes} min
            </span>
          </span>
          <span className="lc3-item-v lc3-green">Start</span>
        </button>
      )}

      {bonus.map((b) => (
        <div className="lc3-item" key={b.id}>
          <span className="lc3-item-name">{b.text}</span>
          <span className="lc3-item-v lc3-green">+{b.elo} ELO</span>
        </div>
      ))}

      {bonus.length > 0 && (
        <div className="lc3-quest-bar">
          <div className="lc3-hero-progress-head">
            <span className="lc3-label">Bonus complete</span>
            <span className="lc3-item-v">
              {done}/{bonus.length}
            </span>
          </div>
          <div className="lc3-track">
            <div className="lc3-track-fill" style={{ width: `${pct}%` }} />
          </div>
        </div>
      )}
    </div>
  );
}
