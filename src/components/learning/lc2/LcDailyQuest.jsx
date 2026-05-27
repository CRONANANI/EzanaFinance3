'use client';

export function LcDailyQuest({ primary, bonus = [], resetsInLabel, onStart }) {
  return (
    <div className="lc-card">
      <div className="lc-card-head">
        <span className="lc-card-title">Daily quest</span>
        <span className="lc-card-eyebrow">resets in {resetsInLabel}</span>
      </div>
      <div className="lc-dq-body">
        <h3 className="lc-dq-title">Earn bonus ELO today</h3>

        {primary && (
          <div className="lc-dq-lesson">
            <p className="lc-dq-lesson-eyebrow">Pick up where you left off</p>
            <p className="lc-dq-lesson-name">{primary.name}</p>
            <p className="lc-dq-lesson-meta">
              {primary.track}
              <span className="lc-dq-lesson-meta-dot" />
              {primary.level}
              <span className="lc-dq-lesson-meta-dot" />
              {primary.durationMinutes} min
            </p>
            <button type="button" className="lc-dq-start-btn" onClick={onStart}>
              Start lesson →
            </button>
          </div>
        )}

        {bonus.length > 0 && (
          <div>
            <div className="lc-dq-bonus-head">Bonus quests</div>
            {bonus.map((b) => (
              <div className="lc-dq-bonus-row" key={b.id}>
                <div className="lc-dq-checkbox-row">
                  <span className="lc-dq-checkbox" />
                  <span className="lc-dq-bonus-text">{b.text}</span>
                </div>
                <span className="lc-elo-pill">+{b.elo} ELO</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
