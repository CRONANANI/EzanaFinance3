/**
 * Referral program, server side: the entitlement override and code lookup.
 * Every read tolerates the referral tables not existing yet (migration
 * 20260929020000_referrals.sql is applied by hand): it then behaves as if
 * the user had no code and no reward, never throws.
 */
import { getPlanTier } from '@/lib/subscription';

/**
 * The plan an active referral reward grants this user right now, or null.
 * The highest-tier reward wins when several overlap.
 */
export async function getReferralPlanOverride(admin, userId) {
  if (!admin || !userId) return null;
  try {
    const nowIso = new Date().toISOString();
    const { data, error } = await admin
      .from('referral_rewards')
      .select('plan, ends_at')
      .eq('user_id', userId)
      .lte('starts_at', nowIso)
      .gt('ends_at', nowIso);
    if (error || !data?.length) return null;
    return data.reduce(
      (best, r) => (getPlanTier(r.plan) > getPlanTier(best) ? r.plan : best),
      data[0].plan,
    );
  } catch {
    return null;
  }
}

/** The user's code, creating it if the sign-up trigger has not (yet). */
export async function getOrCreateReferralCode(admin, userId) {
  try {
    const { data } = await admin
      .from('referral_codes')
      .select('code')
      .eq('user_id', userId)
      .maybeSingle();
    if (data?.code) return data.code;
    const { data: created, error } = await admin.rpc('ensure_referral_code_for', {
      p_user: userId,
    });
    return error ? null : created || null;
  } catch {
    return null;
  }
}

/** Referrer's user id for a code, or null. Never exposed to clients. */
export async function findReferrerByCode(admin, code) {
  try {
    const { data, error } = await admin
      .from('referral_codes')
      .select('user_id')
      .eq('code', code)
      .maybeSingle();
    return error ? null : data?.user_id || null;
  } catch {
    return null;
  }
}
