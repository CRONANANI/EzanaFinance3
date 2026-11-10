/**
 * Learning Center hub (Nov 2026), server only: the LearningELO rating and
 * history, streaks and the daily quest, all computed from the caller's own
 * rows with the service-role client after the route has authenticated them.
 *
 * LearningELO = the sum of the user's learning ELO events (course
 * completions and quest rewards, elo_transactions.category = 'learning').
 * Quest rewards are awarded here, once per task per day (award_elo key),
 * never from the client.
 */
import { awardELO } from '@/lib/elo';
import { buildProgressMap } from '@/lib/learning-progress-logic';
import {
  TRACK_IDS,
  activeDays,
  evaluateQuest,
  isDone,
  nextCourse,
  foldRating,
  networkTopPct,
  nextUtcMidnight,
  questTasks,
  ratingChange,
  streaksFromDays,
  utcDay,
  validTrack,
} from '@/lib/learning/hub-model';

const MAX_NETWORK = 300;
const PAGE = 1000;

/** Every learning ELO event for these users (paged). */
async function learningEvents(
  admin,
  userIds,
  cols = 'user_id, delta, reason, metadata, created_at',
) {
  const out = [];
  for (let from = 0; from < 20000; from += PAGE) {
    // eslint-disable-next-line no-await-in-loop
    const { data, error } = await admin
      .from('elo_transactions')
      .select(cols)
      .in('user_id', userIds)
      .eq('category', 'learning')
      .order('created_at', { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw error;
    out.push(...(data || []));
    if (!data || data.length < PAGE) break;
  }
  return out;
}

async function followingIds(admin, userId) {
  const { data, error } = await admin
    .from('user_follows')
    .select('following_id')
    .eq('follower_id', userId)
    .limit(MAX_NETWORK);
  if (error) return [];
  return [...new Set((data || []).map((r) => r.following_id).filter((id) => id && id !== userId))];
}

/** Learning rating per user id from their events. */
function ratingsByUser(events) {
  const by = new Map();
  for (const e of events) {
    const arr = by.get(e.user_id) || [];
    arr.push(e);
    by.set(e.user_id, arr);
  }
  return new Map([...by.entries()].map(([id, evs]) => [id, foldRating(evs).rating]));
}

/**
 * The caller's LearningELO: overall and per track, the 7-day change, the
 * daily history (ending at the current rating), and where they sit in their
 * network (the people they follow).
 */
export async function getLearningRating(admin, userId, { now = Date.now() } = {}) {
  const mine = await learningEvents(admin, [userId]);
  const { rating, byTrack, history } = foldRating(mine);

  const friends = await followingIds(admin, userId);
  let network = { size: 0, topPct: null };
  if (friends.length) {
    const theirs = await learningEvents(admin, friends, 'user_id, delta, created_at');
    const map = ratingsByUser(theirs);
    const others = friends.map((id) => map.get(id) || 0);
    network = { size: friends.length, topPct: networkTopPct(rating, others) };
  }

  return {
    scope: 'overall',
    rating,
    byTrack,
    change7d: ratingChange(history, rating, 7, now),
    history,
    network,
  };
}

/* ------------------------------------------------------------------ */
/* Streaks                                                             */
/* ------------------------------------------------------------------ */

/**
 * Current and best streak from real activity (course starts and
 * completions, learning ELO events), saved to user_learning_streaks so other
 * surfaces read the same numbers. The best streak never goes down.
 */
export async function getLearningStreak(admin, userId, { now = Date.now() } = {}) {
  const [{ data: progress }, events, { data: stored }] = await Promise.all([
    admin.from('user_course_progress').select('started_at, completed_at').eq('user_id', userId),
    learningEvents(admin, [userId], 'created_at'),
    admin
      .from('user_learning_streaks')
      .select('longest_streak')
      .eq('user_id', userId)
      .maybeSingle(),
  ]);
  const s = streaksFromDays(activeDays(progress || [], events), now);
  const best = Math.max(s.best, Number(stored?.longest_streak) || 0);

  const week = [];
  const today = new Date(now);
  const monday = new Date(
    Date.UTC(
      today.getUTCFullYear(),
      today.getUTCMonth(),
      today.getUTCDate() - ((today.getUTCDay() + 6) % 7),
    ),
  );
  const days = new Set(activeDays(progress || [], events));
  for (let i = 0; i < 7; i += 1) week.push(days.has(utcDay(monday.getTime() + i * 86400000)));

  await admin.from('user_learning_streaks').upsert(
    {
      user_id: userId,
      current_streak: s.current,
      longest_streak: best,
      last_activity_date: s.lastActive,
      days_this_week: week,
      updated_at: new Date(now).toISOString(),
    },
    { onConflict: 'user_id' },
  );
  return {
    current_streak: s.current,
    longest_streak: best,
    days_this_week: week,
    last_activity_date: s.lastActive,
  };
}

/* ------------------------------------------------------------------ */
/* Daily quest                                                         */
/* ------------------------------------------------------------------ */

/**
 * Today's quest: the three tasks with server-computed progress. A task that
 * is newly complete is rewarded once (award_elo key per user, day and task)
 * and stored as rewarded. The featured lesson is the next uncompleted course
 * in the user's main track and is re-picked once it has been completed.
 */
/** Keep today's featured lesson unless it is done; then the next one in the main track, then anywhere. */
export function pickPrimary(mainTrack, rows, storedId) {
  const byId = buildProgressMap(rows);
  if (storedId && !isDone(byId[storedId])) return storedId;
  const order = [mainTrack, ...TRACK_IDS.filter((t) => t !== mainTrack)];
  for (const t of order) {
    const c = nextCourse(t, byId);
    if (c) return c.id;
  }
  return null;
}

export async function getDailyQuest(admin, userId, { now = Date.now() } = {}) {
  const date = utcDay(now);
  const [{ data: existing }, { data: progress }, { data: profile }, friends] = await Promise.all([
    admin
      .from('user_daily_quests')
      .select('*')
      .eq('user_id', userId)
      .eq('quest_date', date)
      .maybeSingle(),
    admin.from('user_course_progress').select('*').eq('user_id', userId),
    admin.from('profiles').select('user_settings').eq('id', userId).maybeSingle(),
    followingIds(admin, userId),
  ]);
  const mainTrack = validTrack(profile?.user_settings?.learning_main_track) || 'stocks';
  const rows = progress || [];

  const stored = Array.isArray(existing?.bonus_quests) ? existing.bonus_quests : [];
  let tasks =
    stored.length && stored.every((t) => t && t.type && t.id)
      ? stored
      : questTasks({ hasNetwork: friends.length > 0 });

  /* Ratings for "pass a friend": mine at the start of today and now. */
  let ctx = {
    date,
    progressRows: rows,
    mainTrack,
    ratingAtStart: 0,
    ratingNow: 0,
    friendRatings: [],
  };
  if (tasks.some((t) => t.type === 'pass_friend' && !t.done)) {
    const mine = await learningEvents(admin, [userId], 'user_id, delta, created_at');
    const before = mine.filter((e) => utcDay(e.created_at) < date);
    const theirs = friends.length
      ? await learningEvents(admin, friends, 'user_id, delta, created_at')
      : [];
    const map = ratingsByUser(theirs);
    ctx = {
      ...ctx,
      ratingAtStart: foldRating(before).rating,
      ratingNow: foldRating(mine).rating,
      friendRatings: friends.map((id) => map.get(id) || 0),
    };
  }
  tasks = evaluateQuest(tasks, ctx);

  /* Reward newly finished tasks, once each. */
  for (const t of tasks) {
    if (!t.done || t.rewarded) continue;
    // eslint-disable-next-line no-await-in-loop
    await awardELO(
      userId,
      t.reward_elo,
      `Daily quest: ${t.label}`,
      'learning',
      { source: 'daily_quest', quest_id: t.id, quest_date: date, track: mainTrack },
      { key: `quest:${userId}:${date}:${t.id}` },
    );
    t.rewarded = true; // the key makes a repeat award a no-op even if this flag is lost
  }

  const primary = pickPrimary(mainTrack, rows, existing?.primary_course_id);
  await admin.from('user_daily_quests').upsert(
    {
      user_id: userId,
      quest_date: date,
      primary_course_id: primary,
      bonus_quests: tasks,
      updated_at: new Date(now).toISOString(),
    },
    { onConflict: 'user_id,quest_date' },
  );

  return {
    date,
    primary: { course_id: primary },
    bonus: tasks,
    resets_at: nextUtcMidnight(now),
  };
}
