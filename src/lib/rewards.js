/**
 * Server-only: award XP and sync tier (service role).
 * Tables: user_rewards, xp_transactions (see supabase migrations).
 */
import { getAdminClient } from '@/lib/supabase';

const TIERS = [
  { name: 'diamond', minXp: 15000 },
  { name: 'platinum', minXp: 5000 },
  { name: 'gold', minXp: 2000 },
  { name: 'silver', minXp: 500 },
  { name: 'bronze', minXp: 0 },
];

/** Tier perks when tier is (re)computed from XP — authoritative snapshot per tier */
const TIER_PERKS = {
  bronze: { trading_credit_balance: 0, sweepstakes_entries: 0 },
  silver: { trading_credit_balance: 5, sweepstakes_entries: 1 },
  gold: { trading_credit_balance: 15, sweepstakes_entries: 3 },
  platinum: { trading_credit_balance: 50, sweepstakes_entries: 10 },
  diamond: { trading_credit_balance: 100, sweepstakes_entries: 999 },
};

function tierForXp(total) {
  const row = TIERS.find((t) => total >= t.minXp);
  return row?.name || 'bronze';
}

const MISSING_FN = new Set(['PGRST202', '42883']);

/**
 * Award XP atomically through public.award_xp (reliability audit P1-5): the
 * ledger row, the running total, the tier and the tier perks change in one
 * transaction. `key` makes the award idempotent: a second call with the same
 * (user, key) changes nothing and returns awarded: false. Use deterministic
 * keys, e.g. checklist:<task>, quiz:<course>, post:<id>.
 *
 * @param {string} userId
 * @param {number} amount
 * @param {string} reason
 * @param {string} category — e.g. community | learning | engagement | trading | referral
 * @param {string|null} [key]
 * @returns {Promise<{ newTotal: number, newTier: string, oldTier: string, awarded: boolean } | null>}
 */
export async function awardXP(userId, amount, reason, category, key = null) {
  if (!userId || !amount || !reason || !category) return null;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const svc = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !svc) {
    console.warn('[rewards] awardXP: missing Supabase service env');
    return null;
  }

  try {
    const supabase = getAdminClient();
    const { data, error } = await supabase.rpc('award_xp', {
      p_user: userId,
      p_amount: Math.round(amount),
      p_reason: reason,
      p_category: category,
      p_key: key,
    });
    if (error) {
      if (MISSING_FN.has(error.code))
        return legacyAwardXP(supabase, userId, amount, reason, category);
      throw error;
    }
    const row = Array.isArray(data) ? data[0] : data;
    if (!row) return null;
    return {
      newTotal: row.total_xp,
      newTier: row.tier,
      oldTier: row.old_tier,
      awarded: row.awarded === true,
    };
  } catch (e) {
    console.error('[rewards] awardXP:', e);
    return null;
  }
}

/* Pre-migration path (read-modify-write); removed once award_xp exists. */
async function legacyAwardXP(supabase, userId, amount, reason, category, key) {
  if (key && key.startsWith('checklist:')) {
    /* The checklist reason is unique per task; other reasons repeat, so only
       it can be de-duped by reason until the unique key exists. */
    const { data: prior } = await supabase
      .from('xp_transactions')
      .select('id')
      .eq('user_id', userId)
      .eq('reason', reason)
      .limit(1);
    if (prior?.length) return { newTotal: null, newTier: null, oldTier: null, awarded: false };
  }
  const { error: insErr } = await supabase.from('xp_transactions').insert({
    user_id: userId,
    amount,
    reason,
    category,
  });
  if (insErr) throw insErr;

  const { data: rewards, error: readErr } = await supabase
    .from('user_rewards')
    .select('total_xp, tier')
    .eq('user_id', userId)
    .maybeSingle();
  if (readErr) throw readErr;

  const prevTotal = rewards?.total_xp ?? 0;
  const oldTier = rewards?.tier || 'bronze';
  const newTotal = prevTotal + amount;
  const newTier = tierForXp(newTotal);
  const perks = TIER_PERKS[newTier] || TIER_PERKS.bronze;
  const row = {
    user_id: userId,
    total_xp: newTotal,
    tier: newTier,
    updated_at: new Date().toISOString(),
  };
  if (!rewards || newTier !== oldTier) {
    row.trading_credit_balance = perks.trading_credit_balance;
    row.sweepstakes_entries = perks.sweepstakes_entries;
  }
  const { error: upErr } = await supabase
    .from('user_rewards')
    .upsert(row, { onConflict: 'user_id' });
  if (upErr) throw upErr;
  return { newTotal, newTier, oldTier, awarded: true };
}
