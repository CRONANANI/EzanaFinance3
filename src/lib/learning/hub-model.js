/**
 * Learning Center hub (Nov 2026 redesign): the pure model behind the page.
 *
 * Everything the page shows is derived here from real rows (course progress,
 * learning ELO events, streak days, bookmarks) so the ELO badge, the tier
 * list, "rating to next tier", the next course, the daily quest's featured
 * lesson and active tracks always agree. No React, no fetch. Safe on client
 * and server. Tested by scripts/check-learning-hub.mjs.
 */
import { ALL_COURSES, LEVEL_KEYS, TRACKS, getCourseById } from '@/lib/learning-curriculum';

/* ------------------------------------------------------------------ */
/* Config: one place for tiers, levels and track presentation          */
/* ------------------------------------------------------------------ */

/**
 * LearningELO rating tiers (highest last so `min` reads upward). The
 * thresholds come from the design; the ELO badge, the tier list and
 * "rating to next tier" all read this array. To add Diamond above
 * Platinum, append { key: 'diamond', label: 'Diamond', min: N }.
 */
export const RATING_TIERS = [
  { key: 'bronze', label: 'Bronze', min: 0 },
  { key: 'silver', label: 'Silver', min: 500 },
  { key: 'gold', label: 'Gold', min: 1500 },
  { key: 'platinum', label: 'Platinum', min: 2520 },
];

/**
 * Which rating the ELO card shows: 'overall' (every learning event) or
 * 'track' (only the selected track's courses). Overall by default: the tier
 * thresholds span the whole catalogue (a single track tops out between 480
 * and 870, so a per-track rating could never pass Silver).
 */
export const RATING_SCOPE = 'overall';

/**
 * Course levels inside a track. They share names with the rating tiers in
 * the current product copy; rename them here (e.g. Level 1 to 4) and every
 * label, tab and course code follows.
 */
export const LEVELS = [
  { key: 'basic', label: 'Bronze', code: 'B' },
  { key: 'intermediate', label: 'Silver', code: 'S' },
  { key: 'advanced', label: 'Gold', code: 'G' },
  { key: 'expert', label: 'Platinum', code: 'P' },
];
export const LEVEL_BY_KEY = Object.fromEntries(LEVELS.map((l) => [l.key, l]));
export const levelLabel = (key) => LEVEL_BY_KEY[key]?.label || key;

/** Track icon (Bootstrap Icons) and accent token. */
export const TRACK_STYLE = {
  stocks: { icon: 'bi-graph-up-arrow', accent: 'var(--chart-cat-1)' },
  crypto: { icon: 'bi-hexagon', accent: 'var(--chart-cat-4)' },
  betting: { icon: 'bi-bullseye', accent: 'var(--chart-cat-3)' },
  commodities: { icon: 'bi-droplet-half', accent: 'var(--chart-cat-5)' },
  risk: { icon: 'bi-shield-check', accent: 'var(--chart-cat-2)' },
};
export const trackStyle = (id) => TRACK_STYLE[id] || { icon: 'bi-book', accent: 'var(--emerald)' };

export const TRACK_IDS = TRACKS.map((t) => t.id);
export const trackName = (id) =>
  TRACKS.find((t) => t.id === id)?.shortLabel || 'Stocks & Investing';
export const validTrack = (id) => (TRACK_IDS.includes(id) ? id : null);

/* ------------------------------------------------------------------ */
/* Formatting                                                          */
/* ------------------------------------------------------------------ */

const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
export const fmtInt = (v) => (isNum(v) ? Math.round(v).toLocaleString('en-US') : '0');
export const fmtSigned = (v) =>
  isNum(v) ? `${v > 0 ? '+' : v < 0 ? '-' : ''}${fmtInt(Math.abs(v))}` : '+0';
export const fmtSignedPct = (v) =>
  isNum(v) ? `${v > 0 ? '+' : v < 0 ? '-' : ''}${Math.abs(v).toFixed(1)}%` : '';
export const fmtRatio = (a, b) => `${fmtInt(a)} / ${fmtInt(b)}`;
export const fmtHours = (minutes) => (isNum(minutes) ? (minutes / 60).toFixed(1) : '0.0');

/** "14h 22m" until `iso`; "0h 0m" once it has passed. */
export function fmtCountdown(iso, now = Date.now()) {
  const ms = Math.max(0, Date.parse(iso) - now);
  if (!Number.isFinite(ms)) return '';
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return `${h}h ${m}m`;
}

/** The next UTC midnight (quests are keyed by UTC date). */
export function nextUtcMidnight(now = Date.now()) {
  const d = new Date(now);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1)).toISOString();
}

export const utcDay = (v) => {
  if (!v) return null;
  const t = typeof v === 'number' ? v : Date.parse(v);
  return Number.isFinite(t) ? new Date(t).toISOString().slice(0, 10) : null;
};

/* ------------------------------------------------------------------ */
/* Tiers                                                               */
/* ------------------------------------------------------------------ */

/** The tier a rating sits in. */
export function tierFor(rating) {
  const r = isNum(rating) ? Math.max(0, rating) : 0;
  let out = RATING_TIERS[0];
  for (const t of RATING_TIERS) if (r >= t.min) out = t;
  return out;
}

/** The next tier and the rating still needed, or null at the top. */
export function nextTier(rating) {
  const cur = tierFor(rating);
  const i = RATING_TIERS.indexOf(cur);
  const next = RATING_TIERS[i + 1];
  if (!next) return null;
  return { tier: next, needed: Math.max(0, next.min - Math.round(rating || 0)) };
}

/** Tier rows highest first with their display range: "1,500 to 2,519", "2,520+". */
export function tierRows() {
  return RATING_TIERS.map((t, i) => {
    const next = RATING_TIERS[i + 1];
    return {
      ...t,
      range: next ? `${fmtInt(t.min)} – ${fmtInt(next.min - 1)}` : `${fmtInt(t.min)}+`,
    };
  }).reverse();
}

/* ------------------------------------------------------------------ */
/* Courses and progress                                                */
/* ------------------------------------------------------------------ */

export const isDone = (row) => !!row && row.status === 'completed' && row.quiz_passed === true;

export function orderedCourses(trackId) {
  return ALL_COURSES.filter((c) => c.track === trackId).sort(
    (a, b) => a.level_order - b.level_order || a.course_order - b.course_order,
  );
}

/** "B7": the level's letter and the course's position in its level. */
export const courseCode = (c) => `${LEVEL_BY_KEY[c.level]?.code || '?'}${c.course_order}`;

/** The first course in the track that is not fully completed, or null. */
export function nextCourse(trackId, progressById) {
  return orderedCourses(trackId).find((c) => !isDone(progressById[c.id])) || null;
}

/**
 * Where "Resume learning" goes: the most recently started in-progress course
 * anywhere, else the next course in the active track. `isNew` when the user
 * has never started anything (the button reads "Start learning").
 */
export function resumeTarget(trackId, progressRows, progressById) {
  const inProgress = (progressRows || [])
    .filter((r) => r.status === 'in_progress' && !isDone(r) && getCourseById(r.course_id))
    .sort((a, b) => (Date.parse(b.started_at || 0) || 0) - (Date.parse(a.started_at || 0) || 0));
  const isNew = !(progressRows || []).some((r) => r.started_at || r.status !== 'not_started');
  if (inProgress[0])
    return { course: getCourseById(inProgress[0].course_id), isNew: false, resume: true };
  const next = isNew ? orderedCourses('stocks')[0] : nextCourse(trackId, progressById);
  return { course: next, isNew, resume: false };
}

/** The level the learner is working in: the first one not finished. */
export function currentLevel(trackId, progressById) {
  for (const l of LEVELS) {
    const list = orderedCourses(trackId).filter((c) => c.level === l.key);
    if (list.some((c) => !isDone(progressById[c.id]))) return l.key;
  }
  return LEVELS[LEVELS.length - 1].key;
}

/** Done/total per level for a track. */
export function levelCounts(trackId, progressById) {
  const out = {};
  for (const l of LEVELS) {
    const list = orderedCourses(trackId).filter((c) => c.level === l.key);
    out[l.key] = {
      done: list.filter((c) => isDone(progressById[c.id])).length,
      total: list.length,
    };
  }
  return out;
}

/** One track's numbers for the ELO card and the track list. */
export function trackStats(trackId, progressRows, progressById, now = Date.now()) {
  const list = orderedCourses(trackId);
  const ids = new Set(list.map((c) => c.id));
  const rows = (progressRows || []).filter((r) => ids.has(r.course_id));
  const done = list.filter((c) => isDone(progressById[c.id])).length;
  const scored = rows.filter((r) => isNum(r.quiz_score));
  const accuracy = scored.length
    ? Math.round(scored.reduce((s, r) => s + r.quiz_score, 0) / scored.length)
    : null;
  const month = new Date(now).toISOString().slice(0, 7);
  const minutesThisMonth = rows
    .filter((r) => isDone(r) && String(r.completed_at || '').slice(0, 7) === month)
    .reduce((s, r) => s + (getCourseById(r.course_id)?.duration_minutes || 0), 0);
  const lvl = currentLevel(trackId, progressById);
  const lc = levelCounts(trackId, progressById)[lvl];
  return {
    done,
    total: list.length,
    quizzesPassed: rows.filter((r) => r.quiz_passed === true).length,
    accuracy,
    minutesThisMonth,
    nextBadge: { level: lvl, left: lc.total - lc.done, done: lc.done, total: lc.total },
  };
}

/** Tracks with at least one completed course. */
export const activeTrackCount = (progressById) =>
  TRACK_IDS.filter((t) => orderedCourses(t).some((c) => isDone(progressById[c.id]))).length;

/**
 * The course rows for one level of the active path. Exactly one row is
 * 'next' (the track's next course, when it is in this level); the rest are
 * 'completed' or 'unstarted'. `resume` when the next course is part done.
 */
export function pathRows(trackId, level, progressById, bookmarked = new Set()) {
  const next = nextCourse(trackId, progressById);
  return orderedCourses(trackId)
    .filter((c) => c.level === level)
    .map((c) => {
      const row = progressById[c.id];
      const state = isDone(row) ? 'completed' : next?.id === c.id ? 'next' : 'unstarted';
      return {
        id: c.id,
        code: courseCode(c),
        title: c.title,
        minutes: c.duration_minutes,
        state,
        resume: state === 'next' && row?.status === 'in_progress',
        bookmarked: bookmarked.has(c.id),
      };
    });
}

/**
 * "Recommended for you": uncompleted courses after the next one in the
 * active track, then the next course in each other track. Every course is
 * open (canAccessCourse), so nothing here is locked.
 */
export function recommendations(trackId, progressById, limit = 3) {
  const next = nextCourse(trackId, progressById);
  const out = orderedCourses(trackId)
    .filter((c) => !isDone(progressById[c.id]) && c.id !== next?.id)
    .slice(0, 1);
  for (const t of TRACK_IDS) {
    if (out.length >= limit) break;
    if (t === trackId) continue;
    const c = nextCourse(t, progressById);
    if (c) out.push(c);
  }
  return out.slice(0, limit);
}

/* ------------------------------------------------------------------ */
/* Rating                                                              */
/* ------------------------------------------------------------------ */

/** Track of a learning ELO event: its course's track, else metadata.track. */
export function eventTrack(e) {
  const c = e?.metadata?.course_id ? getCourseById(e.metadata.course_id) : null;
  return c?.track || validTrack(e?.metadata?.track) || null;
}

/**
 * Fold learning ELO events ({ delta, reason, created_at, metadata }) into
 * the overall rating, per-track ratings and a daily history. The history's
 * last point is always the current rating.
 */
export function foldRating(events) {
  const sorted = [...(events || [])].sort(
    (a, b) => Date.parse(a.created_at) - Date.parse(b.created_at),
  );
  const byTrack = Object.fromEntries(TRACK_IDS.map((t) => [t, 0]));
  const days = new Map();
  let rating = 0;
  for (const e of sorted) {
    const d = Math.round(Number(e.delta) || 0);
    if (!d) continue;
    rating = Math.max(0, rating + d);
    const t = eventTrack(e);
    if (t) byTrack[t] = Math.max(0, byTrack[t] + d);
    const day = utcDay(e.created_at);
    const cur = days.get(day) || { date: day, delta: 0, reasons: [] };
    cur.delta += d;
    if (e.reason && cur.reasons.length < 3) cur.reasons.push(`${e.reason} ${d > 0 ? '+' : ''}${d}`);
    cur.rating = rating;
    days.set(day, cur);
  }
  return { rating, byTrack, history: [...days.values()] };
}

/** Change over the last `days` days: { delta, pct } against the rating before it. */
export function ratingChange(history, current, days = 7, now = Date.now()) {
  const since = utcDay(now - days * 86400000);
  const before = [...(history || [])].filter((h) => h.date <= since).pop();
  const start = before ? before.rating : 0;
  const delta = Math.round((current || 0) - start);
  return { delta, pct: start > 0 ? (delta / start) * 100 : null, since };
}

export const RANGES = ['1M', '3M', '6M', '1Y', 'ALL'];
const RANGE_DAYS = { '1M': 30, '3M': 91, '6M': 182, '1Y': 365 };

/**
 * Chart points for a range: the rating carried in at the window's start,
 * each day with a change, and today at the current rating (so the line
 * always ends where the headline says).
 */
export function ratingSeries(history, current, range = '3M', now = Date.now()) {
  const today = utcDay(now);
  const hist = history || [];
  if (!hist.length) return [];
  const startDay = range === 'ALL' ? hist[0].date : utcDay(now - RANGE_DAYS[range] * 86400000);
  const before = hist.filter((h) => h.date < startDay).pop();
  const inside = hist.filter((h) => h.date >= startDay);
  const pts = [];
  if (before || range !== 'ALL')
    pts.push({ date: startDay, rating: before ? before.rating : 0, delta: 0, reasons: [] });
  for (const h of inside) pts.push({ ...h });
  const last = pts[pts.length - 1];
  if (!last || last.date !== today)
    pts.push({ date: today, rating: current, delta: 0, reasons: [] });
  else last.rating = current;
  return pts;
}

/** Five y-axis ticks on a 25/50/100 step with headroom around the data. */
export function yTicks(points) {
  const vals = (points || []).map((p) => p.rating);
  if (!vals.length) return [0, 25, 50, 75, 100];
  const lo = Math.min(...vals);
  const hi = Math.max(...vals);
  const span = Math.max(hi - lo, 1);
  const step = [25, 50, 100, 250, 500].find((s) => s * 4 >= span * 1.2) || 1000;
  let start = Math.max(0, Math.floor((lo - span * 0.1) / step) * step);
  if (start + step * 4 < hi) start = Math.max(0, Math.ceil(hi / step) * step - step * 4);
  return [0, 1, 2, 3, 4].map((i) => start + i * step);
}

/** Top p% of the network by rating (rank 1 = best). Null with no network. */
export function networkTopPct(myRating, others) {
  const list = (others || []).filter(isNum);
  if (!list.length) return null;
  const rank = 1 + list.filter((r) => r > myRating).length;
  return Math.max(1, Math.ceil((rank / (list.length + 1)) * 100));
}

/* ------------------------------------------------------------------ */
/* Streaks                                                             */
/* ------------------------------------------------------------------ */

/**
 * Current and best streak from active days ('YYYY-MM-DD'). The current
 * streak counts back from today, or from yesterday when today has no
 * activity yet (the streak is still alive until midnight).
 */
export function streaksFromDays(dayList, now = Date.now()) {
  const days = [...new Set((dayList || []).filter(Boolean))].sort();
  const set = new Set(days);
  let best = 0;
  let run = 0;
  let prev = null;
  for (const d of days) {
    run = prev && Date.parse(d) - Date.parse(prev) === 86400000 ? run + 1 : 1;
    best = Math.max(best, run);
    prev = d;
  }
  const today = utcDay(now);
  const yesterday = utcDay(now - 86400000);
  let cursor = set.has(today) ? today : set.has(yesterday) ? yesterday : null;
  let current = 0;
  while (cursor && set.has(cursor)) {
    current += 1;
    cursor = utcDay(Date.parse(cursor) - 86400000);
  }
  return { current, best, lastActive: days[days.length - 1] || null };
}

/** Active learning days from progress rows and learning ELO events. */
export function activeDays(progressRows, events) {
  const out = [];
  for (const r of progressRows || []) out.push(utcDay(r.started_at), utcDay(r.completed_at));
  for (const e of events || []) out.push(utcDay(e.created_at));
  return out.filter(Boolean);
}

/* ------------------------------------------------------------------ */
/* Daily quest                                                         */
/* ------------------------------------------------------------------ */

/** The day's three tasks. With no network, "pass a friend" becomes "ace a quiz". */
export function questTasks({ hasNetwork }) {
  return [
    {
      id: 'q1',
      type: 'finish_lessons',
      label: 'Finish 2 lessons today',
      target: 2,
      reward_elo: 10,
    },
    hasNetwork
      ? {
          id: 'q2',
          type: 'pass_friend',
          label: 'Pass a friend on the leaderboard',
          target: 1,
          reward_elo: 20,
        }
      : {
          id: 'q2',
          type: 'ace_quiz',
          label: 'Score 90% or more on a quiz',
          target: 1,
          reward_elo: 20,
        },
    {
      id: 'q3',
      type: 'try_track',
      label: 'Open a lesson in another track',
      target: 1,
      reward_elo: 5,
    },
  ].map((t) => ({ ...t, progress: 0, done: false, rewarded: false }));
}

/**
 * Progress on each task for `date` from the server's own rows. Never trusts
 * anything the client sent.
 *   ctx = { date, progressRows, mainTrack, ratingAtStart, ratingNow, friendRatings }
 */
export function evaluateQuest(tasks, ctx) {
  const today = (r, k) => utcDay(r[k]) === ctx.date;
  const doneToday = (ctx.progressRows || []).filter((r) => isDone(r) && today(r, 'completed_at'));
  return (tasks || []).map((t) => {
    let progress = 0;
    if (t.type === 'finish_lessons') progress = doneToday.length;
    else if (t.type === 'ace_quiz')
      progress = doneToday.some((r) => (r.quiz_score || 0) >= 90) ? 1 : 0;
    else if (t.type === 'try_track') {
      progress = (ctx.progressRows || []).some((r) => {
        const c = getCourseById(r.course_id);
        return (
          c && c.track !== ctx.mainTrack && (today(r, 'started_at') || today(r, 'completed_at'))
        );
      })
        ? 1
        : 0;
    } else if (t.type === 'pass_friend') {
      progress = (ctx.friendRatings || []).some((f) => f >= ctx.ratingAtStart && f < ctx.ratingNow)
        ? 1
        : 0;
    }
    const capped = Math.min(t.target, progress);
    return { ...t, progress: capped, done: t.done || capped >= t.target };
  });
}

export const questEarned = (tasks) =>
  (tasks || []).filter((t) => t.done).reduce((s, t) => s + (t.reward_elo || 0), 0);

export { LEVEL_KEYS };
