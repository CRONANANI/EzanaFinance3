/**
 * Server-only: award/penalize ELO and sync tier (service role).
 *
 * Mirrors the structure of src/lib/rewards.js (awardXP) but with critical differences:
 *   - ELO can be NEGATIVE (penalty deltas)
 *   - ELO is FLOORED at 0 (never goes below) and CAPPED at 10000
 *   - Tier mapping uses chess-inspired names matching ELO bands
 *   - Every change is logged to elo_transactions with rating_before / rating_after
 *
 * Tables: user_elo, elo_transactions
 *
 * Categories:
 *   - 'learning'     — course completions
 *   - 'activity'     — streaks, profile completion, brokerage linking
 *   - 'portfolio'    — monthly performance awards / penalties
 *   - 'social'       — copy requests received, posts that go viral
 *   - 'competition'  — competition wins / losses
 *   - 'decay'        — inactivity penalties (auto-applied)
 *   - 'admin'        — manual adjustments by you (corrections, awards)
 */
import { getAdminClient } from '@/lib/supabase';
import { getCourseById } from '@/lib/learning-curriculum';

/** Minimum quiz score (percent) that counts as completing a course for ELO/badges. */
export const QUIZ_PASS_THRESHOLD = 70;

/** ELO award per course completion by curriculum level. */
export const ELO_PER_COURSE_LEVEL = {
  basic: 10,
  intermediate: 20,
  advanced: 35,
  expert: 55,
};

export const LEVEL_TO_TIER_NAME = {
  basic: 'bronze',
  intermediate: 'silver',
  advanced: 'gold',
  expert: 'platinum',
};

/** ELO tier bands. Lower bound is the minimum rating for the tier. */
export const ELO_TIERS = [
  { name: 'grandmaster', minRating: 8500 },
  { name: 'master', minRating: 7000 },
  { name: 'tactician', minRating: 5000 },
  { name: 'strategist', minRating: 2500 },
  { name: 'apprentice', minRating: 1000 },
  { name: 'novice', minRating: 0 },
];

export const ELO_CAP = 10000;
export const ELO_FLOOR = 0;
/** separate floor for decay (Sprint 5) — courses earned shouldn't disappear */
export const DECAY_FLOOR = 1000;

/** Compute the tier name for a given rating. */
export function tierForRating(rating) {
  const r = Math.max(0, Math.min(ELO_CAP, Math.round(rating)));
  return ELO_TIERS.find((t) => r >= t.minRating)?.name || 'novice';
}

/** Clamp a rating to [0, 10000]. */
export function clampRating(rating) {
  if (!Number.isFinite(rating)) return 0;
  return Math.max(ELO_FLOOR, Math.min(ELO_CAP, Math.round(rating)));
}

const MISSING_FN = new Set(['PGRST202', '42883']);
const VALID_CATEGORIES = [
  'learning',
  'activity',
  'portfolio',
  'social',
  'competition',
  'decay',
  'admin',
];

/**
 * Award (or penalize) ELO atomically through public.award_elo (reliability
 * audit P1-5): the rating row is locked, the clamped delta applied and the
 * transaction logged in one database transaction. `opts.key` makes it
 * idempotent: a repeated (user, key) changes nothing and returns null, the
 * same as "nothing awarded". Keys used: learning:<course>,
 * competition:<id>, activity:brokerage-linked, activity:email-verified,
 * decay:<YYYY-MM>, copiers:<YYYY-MM>, portfolio:<real|mock>:<YYYY-MM>,
 * copy-request:<id>.
 *
 * @param {string} userId          - auth.users.id
 * @param {number} delta           - integer; positive=gain, negative=penalty
 * @param {string} reason          - human-readable description (shown to the user)
 * @param {string} category        - one of: learning|activity|portfolio|social|competition|decay|admin
 * @param {object} [metadata={}]   - JSON metadata for later analysis (e.g., {course_id, tier})
 * @param {{ key?: string }} [opts]
 * @returns {Promise<{newRating: number, newTier: string, oldRating: number, oldTier: string} | null>}
 */
export async function awardELO(userId, delta, reason, category, metadata = {}, opts = {}) {
  if (!userId) {
    console.warn('[elo] awardELO: missing userId');
    return null;
  }
  if (!Number.isFinite(delta) || Math.round(delta) === 0) {
    console.warn('[elo] awardELO: delta must be nonzero finite number, got', delta);
    return null;
  }
  if (!reason || typeof reason !== 'string') {
    console.warn('[elo] awardELO: reason required');
    return null;
  }
  if (!VALID_CATEGORIES.includes(category)) {
    console.warn('[elo] awardELO: invalid category', category);
    return null;
  }

  try {
    const supabase = getAdminClient();
    const { data, error } = await supabase.rpc('award_elo', {
      p_user: userId,
      p_delta: Math.round(delta),
      p_reason: reason,
      p_category: category,
      p_key: opts?.key || null,
      p_metadata: metadata || {},
    });
    if (error) {
      if (MISSING_FN.has(error.code)) {
        return legacyAwardELO(supabase, userId, delta, reason, category, metadata);
      }
      console.error('[elo] awardELO: rpc failed:', error);
      return null;
    }
    const row = Array.isArray(data) ? data[0] : data;
    if (!row?.awarded) return null;
    return {
      newRating: row.new_rating,
      newTier: row.new_tier,
      oldRating: row.old_rating,
      oldTier: row.old_tier,
    };
  } catch (err) {
    console.error('[elo] awardELO: unexpected error:', err);
    return null;
  }
}

/* Pre-migration path (read-modify-write); removed once award_elo exists. */
async function legacyAwardELO(supabase, userId, delta, reason, category, metadata) {
  const { data: disabledRow } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', userId)
    .eq('is_disabled', true)
    .maybeSingle();
  if (disabledRow) return null;

  const { data: existing, error: fetchErr } = await supabase
    .from('user_elo')
    .select('current_rating, peak_rating, tier')
    .eq('user_id', userId)
    .maybeSingle();
  if (fetchErr) {
    console.error('[elo] awardELO: fetch failed:', fetchErr);
    return null;
  }

  const oldRating = existing?.current_rating ?? 0;
  const oldTier = existing?.tier || 'novice';
  const newRating = clampRating(oldRating + Math.round(delta));
  const newTier = tierForRating(newRating);
  const upsertRow = {
    user_id: userId,
    current_rating: newRating,
    peak_rating: Math.max(existing?.peak_rating ?? 0, newRating),
    tier: newTier,
    updated_at: new Date().toISOString(),
  };
  if (category !== 'decay') upsertRow.last_activity_at = new Date().toISOString();

  const { error: upsertErr } = await supabase
    .from('user_elo')
    .upsert(upsertRow, { onConflict: 'user_id' });
  if (upsertErr) {
    console.error('[elo] awardELO: upsert failed:', upsertErr);
    return null;
  }
  const { error: txErr } = await supabase.from('elo_transactions').insert({
    user_id: userId,
    delta: newRating - oldRating,
    reason,
    category,
    metadata,
    rating_before: oldRating,
    rating_after: newRating,
  });
  if (txErr) console.error('[elo] awardELO: transaction log failed:', txErr);
  return { newRating, newTier, oldRating, oldTier };
}

/**
 * Get the leaderboard (top N users by current_rating).
 * Returns: [{user_id, current_rating, tier}, ...]
 *
 * @param {number} [limit=100] - how many top users to return (max 1000)
 */
export async function getEloLeaderboard(limit = 100) {
  const safeLimit = Math.max(1, Math.min(1000, Math.round(limit)));
  try {
    const supabase = getAdminClient();
    const { data, error } = await supabase
      .from('user_elo')
      .select('user_id, current_rating, peak_rating, tier, last_activity_at')
      .order('current_rating', { ascending: false })
      .limit(safeLimit);

    if (error) {
      console.error('[elo] getEloLeaderboard: fetch failed:', error);
      return [];
    }
    return data || [];
  } catch (err) {
    console.error('[elo] getEloLeaderboard: unexpected error:', err);
    return [];
  }
}

/**
 * Get a user's current ELO + recent transactions.
 *
 * @param {string} userId
 * @param {number} [transactionLimit=50] - recent transactions to include
 */
export async function getUserEloState(userId, transactionLimit = 50) {
  if (!userId) return null;
  try {
    const supabase = getAdminClient();
    const [eloResult, txResult] = await Promise.all([
      supabase.from('user_elo').select('*').eq('user_id', userId).maybeSingle(),
      supabase
        .from('elo_transactions')
        .select('id, delta, reason, category, metadata, rating_before, rating_after, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(transactionLimit),
    ]);

    if (eloResult.error) {
      console.error('[elo] getUserEloState: elo fetch failed:', eloResult.error);
      return null;
    }
    if (txResult.error) {
      console.error('[elo] getUserEloState: tx fetch failed:', txResult.error);
    }

    return {
      elo: eloResult.data || { current_rating: 0, peak_rating: 0, tier: 'novice' },
      transactions: txResult.data || [],
    };
  } catch (err) {
    console.error('[elo] getUserEloState: unexpected error:', err);
    return null;
  }
}

/**
 * Reconcile learning ELO: award once per completed course not yet credited.
 * Idempotent — dedupes by elo_transactions.metadata.course_id (learning category).
 *
 * @param {string} userId
 * @returns {Promise<{ credited: number, totalDelta: number }>}
 */
export async function reconcileLearningElo(userId) {
  if (!userId) return { credited: 0, totalDelta: 0 };
  const supabase = getAdminClient();

  const { data: progress, error: pErr } = await supabase
    .from('user_course_progress')
    .select('course_id, quiz_passed, quiz_score, status')
    .eq('user_id', userId);
  if (pErr || !progress) return { credited: 0, totalDelta: 0 };

  const completed = progress.filter(
    (p) =>
      p.quiz_passed === true ||
      (typeof p.quiz_score === 'number' && p.quiz_score >= QUIZ_PASS_THRESHOLD),
  );
  if (completed.length === 0) return { credited: 0, totalDelta: 0 };

  const { data: txs } = await supabase
    .from('elo_transactions')
    .select('metadata')
    .eq('user_id', userId)
    .eq('category', 'learning');
  const creditedCourseIds = new Set((txs || []).map((t) => t?.metadata?.course_id).filter(Boolean));

  let credited = 0;
  let totalDelta = 0;
  for (const p of completed) {
    if (creditedCourseIds.has(p.course_id)) continue;
    const course = getCourseById(p.course_id);
    if (!course) continue;
    const points = ELO_PER_COURSE_LEVEL[course.level] || 10;
    const tierName = LEVEL_TO_TIER_NAME[course.level] || 'bronze';
    const res = await awardELO(
      userId,
      points,
      `Completed ${tierName} course: ${course.title}`,
      'learning',
      { course_id: p.course_id, level: course.level, tier: tierName, reconciled: true },
      { key: `learning:${p.course_id}` },
    );
    if (res) {
      credited += 1;
      totalDelta += res.newRating - res.oldRating;
      creditedCourseIds.add(p.course_id);
    }
  }
  return { credited, totalDelta };
}
