'use client';

/* One achievement tile (Nov 2026 spacing pass). Stacked so nothing shares a
   row with the icon: icon, category, name (two lines max), status, and a
   progress bar while in progress. Styles live in profile-redesign.css
   (`.pach-*`); the category colour comes in as --pach-accent. */

import { achievementProgress } from './mappers';

const CATEGORY_ACCENT = {
  TRADING: 'var(--emerald)',
  LEARNING: 'var(--purple)',
  COMMUNITY: 'var(--blue)',
};

const CATEGORY_LABEL = {
  TRADING: 'Trading',
  LEARNING: 'Learning',
  COMMUNITY: 'Community',
};

export function AchievementCard({ achievement }) {
  const earned = Boolean(achievement.earned ?? achievement.earnedAt);
  const progress = achievementProgress(achievement.progress);
  const inProgress = !earned && progress > 0;
  const placeholder = Boolean(achievement.placeholder);
  const pct = Math.round(progress * 100);

  /* Only a recorded date is shown (QA RET-17); live-derived badges have none. */
  const earnedDate =
    earned && achievement.earnedAt
      ? new Date(achievement.earnedAt).toLocaleDateString('en-US', {
          month: 'numeric',
          day: 'numeric',
        })
      : '';

  const status = earned
    ? earnedDate
      ? `Earned ${earnedDate}`
      : 'Earned'
    : inProgress
      ? `${pct}% there`
      : 'Locked';

  const state = earned ? 'is-earned' : inProgress ? 'is-progress' : 'is-locked';
  const label = CATEGORY_LABEL[achievement.category] || 'Trading';

  return (
    <div
      role="article"
      aria-label={
        placeholder ? 'More achievements to come' : `${achievement.name}, ${label}, ${status}`
      }
      className={`pach-tile ${state}`}
      style={{ '--pach-accent': CATEGORY_ACCENT[achievement.category] || 'var(--text-muted)' }}
    >
      <span className="pach-icon" aria-hidden="true">
        <i className={`bi ${earned || inProgress ? achievement.icon : 'bi-lock'}`} />
      </span>
      {placeholder ? (
        <span className="pach-name pach-name--soon">More to come</span>
      ) : (
        <>
          <span className="pach-cat">{label}</span>
          <span className="pach-name" title={achievement.name}>
            {achievement.name}
          </span>
          <span className="pach-status">{status}</span>
          {inProgress ? (
            <span className="pach-bar" aria-hidden="true">
              <span className="pach-bar-fill" style={{ width: `${pct}%` }} />
            </span>
          ) : null}
        </>
      )}
    </div>
  );
}
