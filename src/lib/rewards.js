/**
 * Server-only: award XP and sync tier (service role).
 * Tables: user_rewards, xp_transactions (see supabase migrations).
 */
import { createServerSupabaseClient } from '@/lib/supabase-service-role';

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

/**
 * @param {string} userId
 * @param {number} amount
 * @param {string} reason
 * @param {string} category — e.g. community | learning | engagement | trading | referral
 * @returns {Promise<{ newTotal: number, newTier: string, oldTier: string } | null>}
 */
export async function awardXP(userId, amount, reason, category) {
  if (!userId || !amount || !reason || !category) return null;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.warn('[rewards] awardXP: missing Supabase service env');
    return null;
  }

  try {
    const supabase = createServerSupabaseClient();

    const { error: insErr } = await supabase.from('xp_transactions').insert({
      user_id: userId,
      amount,
      reason,
      category,
    });
    if (insErr) throw insErr;

    const { data: rewards } = await supabase
      .from('user_rewards')
      .select('total_xp, tier')
      .eq('user_id', userId)
      .maybeSingle();

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

    const { error: upErr } = await supabase.from('user_rewards').upsert(row, { onConflict: 'user_id' });
    if (upErr) throw upErr;

    return { newTotal, newTier, oldTier };
  } catch (e) {
    console.error('[rewards] awardXP:', e);
    return null;
  }
}
