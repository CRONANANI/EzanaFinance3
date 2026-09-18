'use client';

import { TRACKS, getLevelLabel } from '@/lib/learning-curriculum';

const TIER_BUTTONS = [
  { key: 'basic', label: 'Bronze' },
  { key: 'intermediate', label: 'Silver' },
  { key: 'advanced', label: 'Gold' },
  { key: 'expert', label: 'Platinum' },
];

const STATE_LABEL = {
  completed: 'Done',
  next: 'In progress',
  unstarted: 'Not started',
  locked: 'Locked',
};

/**
 * Active path as a positions-style table: mono order number, title, mono
 * duration, and a status cell. Level tabs are the segmented control. The
 * next-tier affordance is an underlined green text link, matching the
 * broadsheet's link treatment rather than a filled button.
 */
export function LcActivePath({
  selectedTrack,
  selectedLevel,
  onSelectLevel,
  courses = [],
  levelCounts = {},
  completedCount = 0,
  totalCount = 0,
  totalMinutes = 0,
  nextTierLabel,
  tierComplete,
  onContinue,
  onLessonClick,
}) {
  const trackLabel = TRACKS.find((t) => t.id === selectedTrack)?.shortLabel || 'Stocks';
  const tierLabel =
    TIER_BUTTONS.find((b) => b.key === selectedLevel)?.label || getLevelLabel(selectedLevel);
  const firstActionable = courses.find((c) => c.state === 'next' || c.state === 'unstarted');

  return (
    <section>
      <div className="lc3-sec-head">
        <h2 className="lc3-sec-title">Active path</h2>
        <span className="lc3-sec-meta">
          {trackLabel} · {completedCount}/{totalCount} complete · {totalMinutes} min studied
        </span>
      </div>

      <div className="lc3-seg" role="tablist" aria-label="Select tier">
        {TIER_BUTTONS.map((b) => (
          <button
            key={b.key}
            type="button"
            role="tab"
            aria-selected={selectedLevel === b.key}
            className={`lc3-seg-btn${selectedLevel === b.key ? ' is-active' : ''}`}
            onClick={() => onSelectLevel(b.key)}
          >
            {b.label}
            <span className="lc3-seg-count">{levelCounts[b.key] ?? 0}</span>
          </button>
        ))}
      </div>

      <div className="lc3-table-scroll" style={{ marginTop: 20 }}>
        <table className="lc3-table">
          <thead>
            <tr>
              <th className="lc3-th">No.</th>
              <th className="lc3-th">Course</th>
              <th className="lc3-th lc3-th--r">Minutes</th>
              <th className="lc3-th lc3-th--r">Status</th>
            </tr>
          </thead>
          <tbody>
            {courses.map((c, i) => {
              const locked = c.state === 'locked';
              const done = c.state === 'completed';
              return (
                <tr
                  key={c.id}
                  className={`lc3-tr ${locked ? 'lc3-tr--locked' : 'lc3-tr--click'}`}
                  data-task-target={
                    firstActionable && c.id === firstActionable.id
                      ? 'learning-module-card'
                      : undefined
                  }
                  onClick={locked ? undefined : () => onLessonClick?.(c.id)}
                  role={locked ? undefined : 'button'}
                  tabIndex={locked ? undefined : 0}
                  aria-disabled={locked || undefined}
                  onKeyDown={
                    locked
                      ? undefined
                      : (e) => {
                          if (e.key === 'Enter' || e.key === ' ') onLessonClick?.(c.id);
                        }
                  }
                >
                  <td className="lc3-td lc3-td--sym">{String(i + 1).padStart(2, '0')}</td>
                  <td className="lc3-td lc3-td--title">{c.title}</td>
                  <td className="lc3-td lc3-td--r lc3-mono">{c.duration_minutes}</td>
                  <td className={`lc3-td lc3-td--r ${done ? 'lc3-green' : 'lc3-dim'}`}>
                    {locked && <i className="bi bi-lock" aria-hidden />} {STATE_LABEL[c.state]}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {tierComplete && nextTierLabel && (
        <p className="lc3-hero-lede" style={{ marginTop: 18 }}>
          <span className="lc3-strong">{tierLabel} tier complete.</span> You earned ELO across{' '}
          {completedCount} lessons over {totalMinutes} minutes.{' '}
          <button type="button" className="lc3-link" onClick={onContinue}>
            Continue to {nextTierLabel}
          </button>
        </p>
      )}
    </section>
  );
}
