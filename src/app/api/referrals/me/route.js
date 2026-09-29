/**
 * GET /api/referrals/me: the signed-in user's referral code and progress.
 *
 * { code, shareUrl, confirmedCount, pendingCount, threshold,
 *   rewardStatus: 'none'|'earned', rewardEndsAt, rewardPlan,
 *   referees: [{ maskedEmail, status, createdAt }] }
 * Referee emails are masked; referee ids never leave the server.
 */
import { NextResponse } from 'next/server';
import { requireUser, getAdminClient } from '@/lib/supabase';
import { getOrCreateReferralCode } from '@/lib/referrals-server';
import { REFERRAL_THRESHOLD, REFERRER_REWARD, maskEmail, shareUrl } from '@/lib/referrals';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request) {
  let user;
  try {
    ({ user } = await requireUser(request));
  } catch {
    return NextResponse.json({ error: 'Sign in to see your referral code.' }, { status: 401 });
  }

  const admin = getAdminClient();
  const code = await getOrCreateReferralCode(admin, user.id);

  let rows = [];
  let reward = null;
  try {
    const [refs, rew] = await Promise.all([
      admin
        .from('referrals')
        .select('referee_id, status, created_at')
        .eq('referrer_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50),
      admin
        .from('referral_rewards')
        .select('plan, ends_at')
        .eq('user_id', user.id)
        .eq('kind', REFERRER_REWARD.kind)
        .order('created_at', { ascending: false })
        .limit(1),
    ]);
    rows = refs.error ? [] : refs.data || [];
    reward = rew.error ? null : rew.data?.[0] || null;
  } catch {
    rows = [];
  }

  /* Emails live in profiles; fetch only the referees' and mask them here. */
  const emails = new Map();
  const ids = rows.map((r) => r.referee_id);
  if (ids.length) {
    try {
      const { data } = await admin.from('profiles').select('id, email').in('id', ids);
      for (const p of data || []) emails.set(p.id, p.email);
    } catch {
      /* masked email falls back to *** */
    }
  }

  const confirmedCount = rows.filter((r) => r.status === 'confirmed').length;
  const pendingCount = rows.filter((r) => r.status === 'pending').length;
  const origin = new URL(request.url).origin;

  return NextResponse.json({
    code,
    shareUrl: code ? shareUrl(code, origin.includes('localhost') ? origin : undefined) : null,
    confirmedCount,
    pendingCount,
    threshold: REFERRAL_THRESHOLD,
    rewardStatus: reward ? 'earned' : 'none',
    rewardEndsAt: reward?.ends_at || null,
    rewardPlan: reward ? REFERRER_REWARD.planName : null,
    referees: rows
      .filter((r) => r.status !== 'rejected')
      .map((r) => ({
        maskedEmail: maskEmail(emails.get(r.referee_id)),
        status: r.status,
        createdAt: r.created_at,
      })),
  });
}
