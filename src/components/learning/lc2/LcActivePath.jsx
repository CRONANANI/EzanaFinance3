'use client';

import { NumberText } from './NumberText';
import { TRACKS, getLevelLabel } from '@/lib/learning-curriculum';

const TIER_BUTTONS = [
  { key: 'basic', label: 'Bronze', className: 'lc-ap-tier-btn--bronze' },
  { key: 'intermediate', label: 'Silver', className: 'lc-ap-tier-btn--silver' },
  { key: 'advanced', label: 'Gold', className: 'lc-ap-tier-btn--gold' },
  { key: 'expert', label: 'Platinum', className: 'lc-ap-tier-btn--platinum' },
];

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

  return (
    <div className="lc-card">
      <div className="lc-card-head">
        <div>
          <div className="lc-card-title">Active path</div>
          <div className="lc-ap-head-meta">
            {trackLabel}
            <span className="lc-dq-lesson-meta-dot" />
            <span className="lc-ap-head-meta-green">
              {completedCount} / {totalCount} complete
            </span>
            <span className="lc-dq-lesson-meta-dot" />
            {totalMinutes} min studied
          </div>
        </div>

        <div className="lc-ap-tier-switcher" role="tablist" aria-label="Select tier">
          {TIER_BUTTONS.map((b) => {
            const count = levelCounts[b.key] ?? 0;
            const isActive = selectedLevel === b.key;
            return (
              <button
                key={b.key}
                type="button"
                role="tab"
                aria-selected={isActive}
                className={`lc-ap-tier-btn ${b.className} ${isActive ? 'lc-ap-tier-btn--active' : ''}`}
                onClick={() => onSelectLevel(b.key)}
              >
                {b.label}
                <NumberText size={10} weight={500} color="inherit" className="lc-ap-tier-btn-count">
                  ({count})
                </NumberText>
              </button>
            );
          })}
        </div>
      </div>

      <div className="lc-ap-body">
        <div className="lc-lesson-rail">
          {courses.slice(0, 8).map((c, i) => (
            <button
              key={c.id}
              type="button"
              className="lc-lesson-node"
              data-task-target={i === 0 ? 'learning-module-card' : undefined}
              onClick={() => onLessonClick?.(c.id)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              aria-label={`Lesson ${i + 1}: ${c.title}`}
            >
              <span
                className={`lc-lesson-dot ${c.state !== 'completed' ? 'lc-lesson-dot--inactive' : ''}`}
              />
              <span className="lc-lesson-num">L.{String(i + 1).padStart(2, '0')}</span>
              <span className="lc-lesson-name">{c.title}</span>
              <span className="lc-lesson-meta">
                {c.duration_minutes}m{' · '}
                <span className="lc-lesson-meta-elo">+{(c.duration_minutes || 10) * 2}</span>
              </span>
            </button>
          ))}
        </div>
      </div>

      {tierComplete && nextTierLabel && (
        <div className="lc-ap-footer">
          <div className="lc-ap-footer-text">
            <span className="lc-ap-footer-text-strong">{tierLabel} tier complete</span>— earned +
            {completedCount * 25} ELO across {completedCount} lessons over {totalMinutes} minutes.
          </div>
          <button type="button" className="lc-ap-continue" onClick={onContinue}>
            Continue to {nextTierLabel} →
          </button>
        </div>
      )}
    </div>
  );
}
