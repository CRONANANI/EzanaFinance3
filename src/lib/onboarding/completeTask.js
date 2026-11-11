import 'server-only';
import { getAdminClient } from '@/lib/supabase';
import {
  ALL_TASK_IDS,
  isValidTaskId,
  missingForLiveTrading,
} from '@/lib/onboarding/checklistConfig';

/*
 * Getting Started checklist, server side (Nov 2026).
 *
 * Users can only read public.onboarding_task_completions (RLS); every write
 * goes through the service role here, from server code that proves the
 * action happened. Never pass a task id that came straight from the client,
 * except the page-view ids the /view route allow-lists.
 */

const TABLE = 'onboarding_task_completions';
const HOLD_MS = 72 * 3600 * 1000;

/**
 * Mark tasks complete for a user. Idempotent (ignoreDuplicates on the
 * user_id, task_id key). Never throws: the checklist must not break the
 * feature that calls it.
 */
export async function completeChecklistTasks(userId, taskIds, source = 'server') {
  const ids = [...new Set((taskIds || []).filter(isValidTaskId))];
  if (!userId || !ids.length) return { ok: false, reason: 'invalid' };
  try {
    const { error } = await getAdminClient()
      .from(TABLE)
      .upsert(
        ids.map((task_id) => ({ user_id: userId, task_id, source })),
        { onConflict: 'user_id,task_id', ignoreDuplicates: true },
      );
    if (error) {
      console.error('[checklist] complete failed', { ids, error: error.message });
      return { ok: false, reason: 'db' };
    }
    return { ok: true };
  } catch (e) {
    console.error('[checklist] complete failed', e?.message || e);
    return { ok: false, reason: 'db' };
  }
}

export function completeChecklistTask(userId, taskId, source = 'server') {
  return completeChecklistTasks(userId, [taskId], source);
}

/** The user's completed task ids. */
export async function getChecklistCompletions(userId, admin = getAdminClient()) {
  const { data, error } = await admin.from(TABLE).select('task_id').eq('user_id', userId);
  if (error) throw error;
  return (data || []).map((r) => r.task_id).filter(isValidTaskId);
}

const has = async (q) => {
  const { count, error } = await q;
  return !error && (count || 0) > 0;
};

/**
 * Evidence checks: each returns true when the user's own data proves the
 * task. They also credit members for what they did before the checklist
 * shipped, and cover the time-based task (a mock position held 3 days).
 */
const EVIDENCE = {
  'basics.create_account': async (_a, _uid, user) => Boolean(user?.email_confirmed_at),
  'basics.investor_profile': async (a, uid) => {
    const { data } = await a
      .from('profiles')
      .select('investor_questionnaire_completed')
      .eq('id', uid)
      .maybeSingle();
    return data?.investor_questionnaire_completed === true;
  },
  'basics.first_lesson': (a, uid) =>
    has(
      a
        .from('user_course_progress')
        .select('course_id', { count: 'exact', head: true })
        .eq('user_id', uid)
        .eq('course_id', 'stocks-basic-1')
        .eq('quiz_passed', true),
    ),
  'basics.first_quiz': (a, uid) =>
    has(
      a
        .from('user_course_progress')
        .select('course_id', { count: 'exact', head: true })
        .eq('user_id', uid)
        .eq('quiz_passed', true),
    ),
  'basics.risk_diversification': (a, uid) =>
    has(
      a
        .from('user_course_progress')
        .select('course_id', { count: 'exact', head: true })
        .eq('user_id', uid)
        .eq('course_id', 'stocks-basic-7')
        .eq('quiz_passed', true),
    ),
  'explore.first_sonar_ping': (a, uid) =>
    has(
      a
        .from('sonar_queries')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', uid)
        .eq('status', 'completed'),
    ),
  'explore.follow_member': (a, uid) =>
    has(
      a
        .from('user_watchlist_items')
        .select('list_id', { count: 'exact', head: true })
        .eq('user_id', uid)
        .eq('type', 'politician'),
    ),
  'watchlist.add_three': async (a, uid) => {
    const { count, error } = await a
      .from('user_watchlist_items')
      .select('list_id', { count: 'exact', head: true })
      .eq('user_id', uid)
      .eq('type', 'stock');
    return !error && (count || 0) >= 3;
  },
  'mock.first_trade': (a, uid) =>
    has(a.from('mock_trades').select('user_id', { count: 'exact', head: true }).eq('user_id', uid)),
  'mock.hold_three_days': async (a, uid) => {
    const { data } = await a
      .from('mock_portfolios')
      .select('portfolio')
      .eq('user_id', uid)
      .maybeSingle();
    const cutoff = Date.now() - HOLD_MS;
    return Object.values(data?.portfolio?.positions || {}).some((p) => {
      const t = Date.parse(p?.openedAt);
      return Number(p?.qty) > 0 && Number.isFinite(t) && t <= cutoff;
    });
  },
};

export const EVIDENCED_TASK_IDS = Object.keys(EVIDENCE);

/**
 * Check the evidence for every task the user has not completed yet and
 * record what is proven. Returns the full list of completed ids.
 * @param {string} userId
 * @param {{ user?: object, only?: string[] }} [opts] user: the auth user
 *   (for email confirmation); only: limit the checks to these ids.
 */
export async function reconcileChecklist(userId, { user = null, only = null } = {}) {
  const admin = getAdminClient();
  const done = new Set(await getChecklistCompletions(userId, admin));
  const todo = EVIDENCED_TASK_IDS.filter((id) => !done.has(id) && (!only || only.includes(id)));
  if (!todo.length) return [...done];
  const results = await Promise.allSettled(todo.map((id) => EVIDENCE[id](admin, userId, user)));
  const proven = todo.filter((_, i) => results[i].status === 'fulfilled' && results[i].value);
  if (proven.length) {
    const res = await completeChecklistTasks(userId, proven, 'reconcile');
    if (res.ok) proven.forEach((id) => done.add(id));
  }
  return ALL_TASK_IDS.filter((id) => done.has(id));
}

/**
 * Live trading gate (opening a brokerage account, placing a live order).
 * Requires every checklist task whose feature exists (LIVE_TRADING_TASK_IDS);
 * the "Coming soon" tasks join once they ship. Fails closed on a read error.
 * @returns {Promise<null | { status: number, body: object }>} null to proceed
 */
export async function liveTradingGate(userId) {
  let missing;
  try {
    missing = missingForLiveTrading(await reconcileChecklist(userId));
  } catch (e) {
    console.error('[checklist] live trading gate read failed', e?.message || e);
    return {
      status: 503,
      body: { error: 'Could not check your Getting Started progress. Try again in a moment.' },
    };
  }
  if (!missing.length) return null;
  const shown = missing
    .slice(0, 3)
    .map((m) => m.title)
    .join(', ');
  const more = missing.length > 3 ? ` and ${missing.length - 3} more` : '';
  return {
    status: 403,
    body: {
      error: `Finish your Getting Started checklist to unlock live trading: ${shown}${more}.`,
      code: 'checklist_incomplete',
      missing: missing.map((m) => m.id),
    },
  };
}

/** True when live trading is unlocked for the user. */
export async function isLiveTradingUnlocked(userId) {
  return (await liveTradingGate(userId)) === null;
}
