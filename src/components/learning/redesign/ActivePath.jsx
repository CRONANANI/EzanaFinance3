'use client';

import Link from 'next/link';
import { LEVEL_KEYS, getLevelLabel, TRACKS } from '@/lib/learning-curriculum';
import { isLevelUnlocked } from '@/lib/learning-progress-logic';
import { TrackIcon } from './atoms';

const TIER_TAB_COLORS = {
  basic: 'var(--tier-bronze)',
  intermediate: 'var(--tier-silver)',
  advanced: 'var(--tier-gold)',
  expert: 'var(--tier-diamond)',
};

function PathVis({ courses, onToggleBookmark }) {
  const n = courses.length || 8;
  const points = Array.from({ length: n }, (_, i) => {
    const x = (i / Math.max(1, n - 1)) * 100;
    const y = 50 + Math.sin((i / Math.max(1, n - 1)) * Math.PI) * 18;
    return `${x},${y}`;
  });
  const pathD = points.length > 1 ? `M ${points.join(' L ')}` : '';
  const nextIdx = courses.findIndex((c) => c.state === 'next');
  const progressIdx = nextIdx >= 0 ? nextIdx : courses.findIndex((c) => c.state === 'completed');

  return (
    <div className="lc-path-vis">
      <svg className="lc-path-svg" viewBox="0 0 100 80" preserveAspectRatio="none" aria-hidden>
        <path
          d={pathD}
          fill="none"
          stroke="var(--border)"
          strokeWidth="1.5"
          strokeDasharray="4 4"
        />
        {progressIdx >= 0 && (
          <path
            d={
              points.slice(0, progressIdx + 1).length > 1
                ? `M ${points.slice(0, progressIdx + 1).join(' L ')}`
                : ''
            }
            fill="none"
            stroke="var(--emerald)"
            strokeWidth="2"
          />
        )}
      </svg>
      <div className="lc-path-nodes">
        {courses.map((course, i) => (
          <PathNode
            key={course.id}
            course={course}
            index={i + 1}
            onToggleBookmark={onToggleBookmark}
          />
        ))}
      </div>
    </div>
  );
}

function PathNode({ course, index, onToggleBookmark }) {
  const locked = course.state === 'locked';
  const completed = course.state === 'completed';
  const isNext = course.state === 'next';
  const stateClass = `lc-path-node lc-path-node--${course.state}`;

  const inner = (
    <>
      {completed && <i className="bi bi-check-lg" />}
      {locked && <i className="bi bi-lock" />}
      {!completed && !locked && <span className="lc-path-node-idx">{index}</span>}
      {isNext && <span className="lc-path-node-pulse" aria-hidden />}
      {course.bookmarked && (
        <button
          type="button"
          className="lc-path-node-bookmark"
          aria-label="Bookmarked"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onToggleBookmark?.(course.id);
          }}
        >
          <i className="bi bi-bookmark-fill" />
        </button>
      )}
    </>
  );

  const label = (
    <div className="lc-path-node-label">
      <div className="lc-path-node-title">{course.title}</div>
      <div className="lc-path-node-meta">{course.duration_minutes} min</div>
      {isNext && <span className="lc-path-node-here">YOU ARE HERE</span>}
    </div>
  );

  if (locked) {
    return (
      <div className="lc-path-col" aria-disabled="true">
        <div className={stateClass}>{inner}</div>
        {label}
      </div>
    );
  }

  return (
    <Link href={`/learning-center/course/${course.id}`} className="lc-path-col">
      <div className={stateClass}>{inner}</div>
      {label}
    </Link>
  );
}

export function ActivePath({
  selectedTrack,
  selectedLevel,
  onSelectLevel,
  courses = [],
  levelUnlocked = true,
  prevLevelLabel,
  onToggleBookmark,
  progressById = {},
}) {
  const trackMeta = TRACKS.find((t) => t.id === selectedTrack);
  const completed = courses.filter((c) => c.state === 'completed').length;
  const nextCourse =
    courses.find((c) => c.state === 'next') || courses.find((c) => c.state === 'unstarted');

  return (
    <section className="lc-active-path">
      <div className="lc-ap-header">
        <div className="lc-ap-header-left">
          <TrackIcon trackId={selectedTrack} size={22} />
          <div>
            <div className="lc-eyebrow">Active path</div>
            <h2 className="lc-ap-title">{trackMeta?.shortLabel || selectedTrack}</h2>
          </div>
        </div>
        <div className="lc-ap-tier-tabs">
          {LEVEL_KEYS.map((lv) => {
            const locked = !isLevelUnlocked(selectedTrack, lv, progressById);
            const active = lv === selectedLevel;
            return (
              <button
                key={lv}
                type="button"
                className={`lc-tier-tab ${active ? 'lc-tier-tab--active' : ''} ${locked ? 'lc-tier-tab--locked' : ''}`}
                onClick={() => !locked && onSelectLevel?.(lv)}
                disabled={locked}
              >
                <span className="lc-tier-tab-dot" style={{ background: TIER_TAB_COLORS[lv] }} />
                {getLevelLabel(lv)}
                {locked && <i className="bi bi-lock" style={{ fontSize: 10 }} />}
              </button>
            );
          })}
        </div>
      </div>

      {!levelUnlocked && (
        <p className="lc-text-sm lc-fg-muted" style={{ marginBottom: 12 }}>
          Complete all {prevLevelLabel || 'previous level'} courses to unlock this tier.
        </p>
      )}

      <PathVis courses={courses} onToggleBookmark={onToggleBookmark} />

      <div className="lc-ap-footer">
        <div className="lc-ap-footer-stats">
          <span>
            <strong>{completed}</strong>/{courses.length} complete
          </span>
          <span>{trackMeta?.shortLabel}</span>
          <span>{getLevelLabel(selectedLevel)}</span>
        </div>
        {nextCourse && levelUnlocked && (
          <Link href={`/learning-center/course/${nextCourse.id}`} className="lc-btn lc-btn-primary">
            Continue with course {courses.findIndex((c) => c.id === nextCourse.id) + 1}
            <i className="bi bi-arrow-right" />
          </Link>
        )}
      </div>
    </section>
  );
}
