/**
 * Activity summary, server side (Nov 2026).
 *
 * Shared by GET /api/activity-density (home card and profile Activity
 * section) and the daily cron /api/cron/activity-percentiles. Every query
 * here runs on the service-role client, so each one is scoped to a user id
 * the route has already authorised (see resolveActivitySubject).
 *
 * Percentiles: the live stats of the requested member are placed in the
 * latest daily distribution (public.user_activity_stats). A stat of 0 is
 * "not ranked yet" (null), and nothing is ranked until the distribution has
 * MIN_POPULATION members, so a young platform never shows silly numbers.
 */
import {
  ACTIVITY_STAT_KEYS,
  buildGrid,
  computeStats,
  dayMs,
  statValues,
} from '@/lib/activity-density';

export const ACTIVITY_WINDOW_DAYS = 371;
export const MIN_POPULATION = 25;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MISSING_FN = new Set(['PGRST202', '42883']);
const MISSING_TABLE = new Set(['PGRST205', '42P01']);

const utcYmd = (d) => d.toISOString().slice(0, 10);

/** Clamp the requested window to the card's supported range. */
export function clampWindow(raw) {
  const n = parseInt(raw || String(ACTIVITY_WINDOW_DAYS), 10) || ACTIVITY_WINDOW_DAYS;
  return Math.min(Math.max(n, 7), 400);
}

/** Today (UTC) and the first day of a `days`-long window ending today. */
export function activityWindow(days, now = new Date()) {
  const end = utcYmd(now);
  const since = utcYmd(
    new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - (days - 1))),
  );
  return { end, since };
}

/**
 * Whose activity the viewer may see.
 *   - no `requestedId`, or their own id: the viewer.
 *   - someone else: only if that member exists, is active, and has not
 *     turned off privacy_show_activity.
 * Returns { ok, userId, slug, isOwn } or { ok: false, status, error }.
 */
export async function resolveActivitySubject(admin, viewerId, requestedId) {
  const targetId = requestedId && requestedId !== viewerId ? requestedId : viewerId;
  if (targetId !== viewerId && !UUID_RE.test(targetId)) {
    return { ok: false, status: 400, error: 'invalid_user' };
  }
  const { data: prof, error } = await admin
    .from('profiles')
    .select('id, username, deleted_at, is_disabled, privacy_show_activity')
    .eq('id', targetId)
    .maybeSingle();
  if (error) throw error;

  const isOwn = targetId === viewerId;
  if (!isOwn) {
    if (!prof || prof.deleted_at || prof.is_disabled) {
      return { ok: false, status: 404, error: 'not_found' };
    }
    if (prof.privacy_show_activity === false) {
      return { ok: false, status: 403, error: 'activity_private' };
    }
  }
  return { ok: true, userId: targetId, slug: prof?.username || targetId, isOwn };
}

/**
 * Per-day activity `{ date, actions, login }` for one member. Falls back to
 * login days only while the user_activity_days RPC is missing.
 */
export async function fetchActivityDays(admin, userId, since) {
  const { data, error } = await admin.rpc('user_activity_days', { p_user: userId, p_since: since });
  if (!error) {
    return {
      partial: false,
      days: (data || []).map((r) => ({
        date: String(r.day).slice(0, 10),
        actions: Number(r.actions) || 0,
        login: Boolean(r.logged_in),
      })),
    };
  }
  if (!MISSING_FN.has(error.code)) throw error;
  const { data: logins, error: loginErr } = await admin
    .from('user_login_history')
    .select('login_date')
    .eq('user_id', userId)
    .gte('login_date', since);
  if (loginErr) throw loginErr;
  return {
    partial: true,
    days: (logins || []).map((r) => ({
      date: String(r.login_date).slice(0, 10),
      actions: 0,
      login: true,
    })),
  };
}

/** The same four stats the card computes, so the percentile matches what is shown. */
export function summarizeActivity(days, end) {
  const grid = buildGrid(days, dayMs(end), 0);
  return computeStats(grid.cells);
}

/**
 * Percentiles for the four stats, keyed like ACTIVITY_STAT_KEYS:
 *   { population, computedAt, activeDays, busiestDay, longestStreak, currentStreak }
 * Each stat is a 0 to 100 number, or null when that stat is 0. Returns null
 * when the distribution is missing or smaller than MIN_POPULATION.
 */
export async function fetchActivityPercentiles(admin, stats) {
  const v = statValues(stats);
  const { data, error } = await admin.rpc('activity_stat_percentiles', {
    p_active_days: v.activeDays,
    p_busiest: v.busiestDay,
    p_longest: v.longestStreak,
    p_current: v.currentStreak,
  });
  if (error) {
    if (MISSING_FN.has(error.code) || MISSING_TABLE.has(error.code)) return null;
    throw error;
  }
  const row = Array.isArray(data) ? data[0] : data;
  const population = Number(row?.population) || 0;
  if (population < MIN_POPULATION) return null;

  const raw = {
    activeDays: row.active_days_pct,
    busiestDay: row.busiest_pct,
    longestStreak: row.longest_pct,
    currentStreak: row.current_pct,
  };
  const out = { population, computedAt: row.computed_at || null };
  for (const { key } of ACTIVITY_STAT_KEYS) {
    out[key] = v[key] > 0 && raw[key] != null ? Number(raw[key]) : null;
  }
  return out;
}

/** One member's actions by source since `since`, most first. */
export async function fetchActivityBreakdown(admin, userId, since) {
  const { data, error } = await admin.rpc('user_activity_breakdown', {
    p_user: userId,
    p_since: since,
  });
  if (error) {
    if (MISSING_FN.has(error.code)) return [];
    throw error;
  }
  return (data || []).map((r) => ({ source: String(r.source), actions: Number(r.actions) || 0 }));
}

/** Daily cron: rebuild the distribution. Returns the number of members written. */
export async function refreshActivityStats(admin, days = ACTIVITY_WINDOW_DAYS) {
  const { data, error } = await admin.rpc('refresh_user_activity_stats', { p_days: days });
  if (error) throw error;
  return Number(data) || 0;
}
