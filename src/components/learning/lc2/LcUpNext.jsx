'use client';

const LEVEL_CLASS = {
  basic: 'lc-un-level-pill--bronze',
  intermediate: 'lc-un-level-pill--silver',
  advanced: 'lc-un-level-pill--gold',
  expert: 'lc-un-level-pill--platinum',
  Bronze: 'lc-un-level-pill--bronze',
  Silver: 'lc-un-level-pill--silver',
  Gold: 'lc-un-level-pill--gold',
  Platinum: 'lc-un-level-pill--platinum',
  Intermediate: 'lc-un-level-pill--intermediate',
};

export function LcUpNext({ lessons = [], onLessonClick }) {
  return (
    <div className="lc-card">
      <div className="lc-card-head">
        <span className="lc-card-title">Recommended up next</span>
        <span className="lc-card-eyebrow">curated for you</span>
      </div>
      <div>
        {lessons.map((l, i) => (
          <div
            key={l.id}
            className="lc-un-row"
            role="button"
            tabIndex={0}
            onClick={() => onLessonClick?.(l.id)}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onLessonClick?.(l.id)}
          >
            <span className="lc-un-idx">{String(i + 1).padStart(2, '0')}</span>
            <div>
              <div className="lc-un-name">{l.name}</div>
              <div className="lc-un-track">{l.track}</div>
            </div>
            <span className="lc-un-min">{l.minutes} MIN</span>
            <span
              className={`lc-un-level-pill ${LEVEL_CLASS[l.level] || 'lc-un-level-pill--bronze'}`}
            >
              {l.level}
            </span>
            <span className="lc-un-elo">+{l.elo} ELO</span>
          </div>
        ))}
      </div>
    </div>
  );
}
