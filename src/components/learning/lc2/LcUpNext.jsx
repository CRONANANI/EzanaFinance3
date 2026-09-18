'use client';

/**
 * Recommended up next as a movers-style sub-column: numbered mono index,
 * title and track, mono duration and ELO on the right.
 */
export function LcUpNext({ lessons = [], onLessonClick }) {
  return (
    <div>
      <div className="lc3-sub-head">
        <h3 className="lc3-sub-title">Recommended up next</h3>
        <span className="lc3-sec-meta">Curated for you</span>
      </div>

      {lessons.length === 0 && <p className="lc3-empty">Nothing queued right now.</p>}

      {lessons.map((l, i) => (
        <button
          type="button"
          className="lc3-item lc3-item--click"
          key={l.id}
          onClick={() => onLessonClick?.(l.id)}
        >
          <span>
            <span className="lc3-item-name">
              <span className="lc3-mono lc3-dim">{String(i + 1).padStart(2, '0')}</span> {l.name}
            </span>
            <span className="lc3-item-meta">
              {l.track} · {l.level}
            </span>
          </span>
          <span className="lc3-item-v">
            {l.minutes}m <span className="lc3-green">+{l.elo}</span>
          </span>
        </button>
      ))}
    </div>
  );
}
