/**
 * Sample content for the Learning Center hub (Nov 2026 redesign).
 *
 * Served ONLY to master admin and demo accounts by /api/learning/sample, so
 * the page can be reviewed and presented from an account with no learning
 * activity. Real members never receive it. Nothing here is written anywhere:
 * while it is showing, the page keeps saves and the track choice local.
 *
 * Nothing is typed in as a figure. The bundle is a set of sample progress
 * rows and learning events, dated relative to `now`, and every number the
 * page shows (rating, tier, 7 day change, history, streaks, active days,
 * track stats, the quest) is derived from them by the same model the real
 * page uses (hub-model.js). So the sample obeys the real rules: a course
 * pays 10, 20, 35 or 55 by level, tracks keep their real totals, and each
 * track has exactly one next course.
 *
 * Pure: no React, no fetch, no server imports.
 */
import { getCourseById } from '@/lib/learning-curriculum';
import {
  LEVELS,
  activeDays,
  courseCode,
  courseReward,
  evaluateQuest,
  foldRating,
  isDone,
  levelCounts,
  nextUtcMidnight,
  orderedCourses,
  questTasks,
  ratingChange,
  streaksFromDays,
  utcDay,
  TRACK_IDS,
} from '@/lib/learning/hub-model';
import { buildProgressMap } from '@/lib/learning-progress-logic';

const DAY = 86400000;

/* How many courses the sample learner has passed in each track, in
   curriculum order. Three tracks are active; two are untouched. */
const PASSED = { stocks: 19, crypto: 10, risk: 4 };

/* Days ago with learning activity, oldest first. The last six run up to
   today (the current streak); days 33 to 20 are the best streak (14). */
const ACTIVE_DAYS_AGO = [
  84, 80, 77, 72, 68, 63, 60, 55, 52, 47, 44, 40, 33, 32, 31, 30, 29, 28, 27, 26, 25, 24, 23, 22,
  21, 20, 5, 4, 3, 2, 1, 0,
];

/* Days ago on which a daily quest task paid out, and how much. */
const QUEST_REWARDS = [
  [80, 10],
  [68, 5],
  [55, 10],
  [44, 20],
  [33, 10],
  [31, 5],
  [29, 35],
  [27, 10],
  [25, 20],
  [23, 5],
  [21, 10],
  [5, 10],
  [3, 20],
  [2, 5],
  [1, 10],
];

const SAVED = [
  'stocks-advanced-3',
  'stocks-advanced-4',
  'crypto-intermediate-4',
  'betting-basic-1',
  'commodities-basic-1',
  'risk-intermediate-1',
  'stocks-expert-1',
  'crypto-advanced-1',
];

/** A sample quiz score between 72 and 96, fixed per course. */
const score = (i) => 72 + ((i * 7) % 25);

export function buildLearningSample(now = Date.now()) {
  const at = (daysAgo, hour) => {
    const d = new Date(now - daysAgo * DAY);
    /* Never later than `now`, so today's rows are in the past. */
    const t = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), hour);
    return new Date(Math.min(t, now - 60000)).toISOString();
  };

  /* Passed courses, interleaved across the three tracks, one or two a day. */
  const queue = [];
  const lists = Object.entries(PASSED).map(([t, n]) => orderedCourses(t).slice(0, n));
  for (let i = 0; lists.some((l) => l[i]); i += 1)
    for (const l of lists) if (l[i]) queue.push(l[i]);

  const progress = [];
  const events = [];
  queue.forEach((c, i) => {
    /* Spread over the older active days; the last two land in the current
       streak (three days ago and today), so the 7 day change stays modest. */
    const older = ACTIVE_DAYS_AGO.length - 7;
    const last = queue.length - 1;
    const slot =
      i === last
        ? ACTIVE_DAYS_AGO.length - 1
        : i === last - 1
          ? ACTIVE_DAYS_AGO.length - 4
          : Math.round((i * older) / (last - 2));
    const daysAgo = ACTIVE_DAYS_AGO[slot];
    const done = at(daysAgo, 14);
    progress.push({
      course_id: c.id,
      status: 'completed',
      quiz_passed: true,
      /* Today's course stays under 90 so the quiz task is still open. */
      quiz_score: i === queue.length - 1 ? 84 : score(i),
      started_at: at(daysAgo, 13),
      completed_at: done,
      is_sample: true,
    });
    events.push({
      delta: courseReward(c.level),
      reason: `Completed ${courseCode(c)}: ${c.title}`,
      metadata: { course_id: c.id },
      created_at: done,
    });
  });
  for (const [daysAgo, delta] of QUEST_REWARDS) {
    events.push({
      delta,
      reason: 'Daily quest',
      metadata: { source: 'daily_quest', track: 'stocks' },
      created_at: at(daysAgo, 16),
    });
  }
  /* A day with no course still counts as active when a lesson was opened. */
  const usedDays = new Set(events.map((e) => utcDay(e.created_at)));
  const opened = orderedCourses('stocks')[PASSED.stocks];
  for (const daysAgo of ACTIVE_DAYS_AGO) {
    if (!usedDays.has(utcDay(now - daysAgo * DAY))) {
      events.push({
        delta: 0,
        reason: '',
        metadata: {},
        created_at: at(daysAgo, 12),
      });
    }
  }
  /* The next stocks course is part done, so the page offers "Resume". */
  if (opened) {
    progress.push({
      course_id: opened.id,
      status: 'in_progress',
      quiz_passed: false,
      quiz_score: null,
      started_at: at(1, 18),
      completed_at: null,
      is_sample: true,
    });
  }

  const { rating, byTrack, history } = foldRating(events);
  const days = activeDays(progress, events);
  const streak = streaksFromDays(days, now);
  const daySet = new Set(days);
  const today = new Date(now);
  const monday = Date.UTC(
    today.getUTCFullYear(),
    today.getUTCMonth(),
    today.getUTCDate() - ((today.getUTCDay() + 6) % 7),
  );
  const week = [0, 1, 2, 3, 4, 5, 6].map((i) => daySet.has(utcDay(monday + i * DAY)));

  /* One learning badge per completed level, as the real page awards them. */
  const byId = buildProgressMap(progress);
  const badges = [];
  for (const t of TRACK_IDS) {
    const counts = levelCounts(t, byId);
    for (const l of LEVELS) {
      if (counts[l.key].total > 0 && counts[l.key].done === counts[l.key].total)
        badges.push({ track: t, level: l.key, is_sample: true });
    }
  }

  const quest = evaluateQuest(questTasks({ hasNetwork: false }), {
    date: utcDay(now),
    progressRows: progress,
    mainTrack: 'stocks',
    ratingAtStart: 0,
    ratingNow: rating,
    friendRatings: [],
  });

  return {
    is_sample: true,
    courses: { progress, badges, viewer: { displayName: 'Sample learner', currentTrackId: null } },
    rating: {
      scope: 'overall',
      rating,
      byTrack,
      change7d: ratingChange(history, rating, 7, now),
      history,
      /* The one figure with no rows behind it: a sample network position. */
      network: { size: 24, topPct: 18 },
    },
    quest: {
      date: utcDay(now),
      primary: { course_id: opened?.id || null },
      bonus: quest,
      resets_at: nextUtcMidnight(now),
    },
    streak: {
      current_streak: streak.current,
      longest_streak: streak.best,
      days_this_week: week,
      last_activity_date: streak.lastActive,
    },
    bookmarks: SAVED.filter((id) => getCourseById(id) && !isDone(byId[id])).map((id) => ({
      course_id: id,
      is_sample: true,
    })),
    mainTrack: 'stocks',
  };
}
