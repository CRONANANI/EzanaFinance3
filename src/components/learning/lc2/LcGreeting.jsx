'use client';

import Link from 'next/link';

/**
 * Hero left column: kicker, greeting, lede, the two text affordances, and
 * the active-track progress rail pinned to the bottom of the column so it
 * lines up with the stat strip opposite.
 */
export function LcGreeting({
  firstName,
  subline,
  onResume,
  onSavedClick,
  trackLabel,
  completed = 0,
  total = 0,
}) {
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="lc3-hero-l">
      <p className="lc3-kicker">Learning Center</p>
      <h1 className="lc3-hero-greet">Welcome back, {firstName}.</h1>
      {subline && <p className="lc3-hero-lede">{subline}</p>}

      <div className="lc3-hero-actions">
        <button type="button" className="lc3-link" onClick={onResume}>
          Resume lesson
        </button>
        <button type="button" className="lc3-link" onClick={onSavedClick}>
          Saved courses
        </button>
        <Link href="/learning-center/badges" className="lc3-link">
          Badges
        </Link>
      </div>

      <div className="lc3-hero-progress">
        <div className="lc3-hero-progress-head">
          <span className="lc3-label">{trackLabel} progress</span>
          <span className="lc3-mono lc3-item-v">
            {completed}/{total}
          </span>
        </div>
        <div className="lc3-track">
          <div className="lc3-track-fill" style={{ width: `${pct}%` }} />
        </div>
      </div>
    </div>
  );
}
