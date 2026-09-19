import { ALL_COURSES, LEVEL_KEYS, TRACKS } from '@/lib/learning-curriculum';

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
 * Course access policy: every course is open to every user.
 *
 * The previous sequential gate (predecessor must be fully completed) locked
 * users out of the catalog and produced the bare "This course is locked."
 * page. Ordering still drives recommendations (next-up, resume) but never
 * blocks access. The signature is kept so the three consumers (course GET
 * route, progress POST route, hub state mapping) need no changes: the route
 * now always returns unlocked: true, quiz submissions are accepted for any
 * course, and the hub never assigns the 'locked' state.
 *
 * @param {object} course
 * @param {Record<string, any>} _progressById map course_id -> progress row
 */
export function canAccessCourse(course, _progressById) {
  return { ok: true };
}

export function countCompletedInLevel(track, level, progressById) {
  return ALL_COURSES.filter((c) => c.track === track && c.level === level).filter((c) =>
    isCourseFullyCompleted(progressById[c.id]),
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

/** Track where the learner has an in-progress course, else first track with remaining work. */
export function getActiveLearningTrack(progressById) {
  for (const c of ALL_COURSES) {
    const row = progressById[c.id];
    if (row?.status === 'in_progress' && !isCourseFullyCompleted(row)) {
      return c.track;
    }
  }
  for (const t of TRACKS) {
    const s = computeTrackSummary(t.id, progressById);
    if (s.completed < s.total) return t.id;
  }
  return TRACKS[0]?.id || 'stocks';
}
