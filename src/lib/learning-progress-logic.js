import { ALL_COURSES, LEVEL_KEYS } from '@/lib/learning-curriculum';

export function getOrderedCoursesForTrack(trackId) {
  return ALL_COURSES.filter((c) => c.track === trackId).sort((a, b) => {
    if (a.level_order !== b.level_order) return a.level_order - b.level_order;
    return a.course_order - b.course_order;
  });
}

export function getPreviousCourseInSequence(course) {
  const ordered = getOrderedCoursesForTrack(course.track);
  const idx = ordered.findIndex((c) => c.id === course.id);
  if (idx <= 0) return null;
  return ordered[idx - 1];
}

export function isCourseFullyCompleted(row) {
  if (!row) return false;
  return row.status === 'completed' && row.quiz_passed === true;
}

/**
 * @param {Record<string, any>} progressById map course_id -> progress row
 */
export function canAccessCourse(course, progressById) {
  const ordered = getOrderedCoursesForTrack(course.track);
  const idx = ordered.findIndex((c) => c.id === course.id);
  if (idx <= 0) return { ok: true };

  const prev = ordered[idx - 1];
  const prevDone = isCourseFullyCompleted(progressById[prev.id]);
  if (!prevDone) {
    return {
      ok: false,
      reason: 'Complete the previous course in this learning path first.',
    };
  }
  return { ok: true };
}

export function countCompletedInLevel(track, level, progressById) {
  return ALL_COURSES.filter((c) => c.track === track && c.level === level).filter((c) =>
    isCourseFullyCompleted(progressById[c.id])
  ).length;
}

export function countTotalInLevel(track, level) {
  return ALL_COURSES.filter((c) => c.track === track && c.level === level).length;
}

export function isLevelComplete(track, level, progressById) {
  const total = countTotalInLevel(track, level);
  if (total === 0) return false;
  return countCompletedInLevel(track, level, progressById) === total;
}

/** Basic always unlocked; other levels unlock when the previous level is 100% complete */
export function isLevelUnlocked(track, level, progressById) {
  if (level === 'basic') return true;
  const idx = LEVEL_KEYS.indexOf(level);
  if (idx <= 0) return true;
  const prev = LEVEL_KEYS[idx - 1];
  return isLevelComplete(track, prev, progressById);
}

/** Level badge keys (per track) */
export const LEVEL_BADGE_KEYS = {
  basic: 'foundation',
  intermediate: 'analyst',
  advanced: 'advanced_trader',
  expert: 'market_expert',
};

export const LEVEL_BADGE_LABELS = {
  foundation: '📚 Foundation',
  analyst: '📊 Analyst',
  advanced_trader: '🎓 Advanced Trader',
  market_expert: '🏆 Market Expert',
};

export const TRACK_BADGE_LABELS = {
  stocks: '📈 Stock Market Master',
  crypto: '₿ Crypto Expert',
  betting: '🎯 Prediction Pro',
  commodities: '🛢️ Commodity Specialist',
  risk: '🧠 Risk Management Pro',
};

export function levelBadgeKey(track, level) {
  const suffix = LEVEL_BADGE_KEYS[level];
  if (!suffix) return null;
  return `${track}_level_${suffix}`;
}

export function trackBadgeKey(track) {
  return `${track}_track_master`;
}

export function computeTrackSummary(track, progressById) {
  const courses = getOrderedCoursesForTrack(track);
  const total = courses.length;
  const completed = courses.filter((c) => isCourseFullyCompleted(progressById[c.id])).length;
  const pct = total ? Math.round((completed / total) * 100) : 0;
  const levels = {};
  for (const lv of LEVEL_KEYS) {
    const t = countTotalInLevel(track, lv);
    const d = countCompletedInLevel(track, lv, progressById);
    levels[lv] = { completed: d, total: t };
  }
  return { total, completed, pct, levels };
}

export function buildProgressMap(rows) {
  const m = {};
  for (const r of rows || []) {
    m[r.course_id] = r;
  }
  return m;
}
