/**
 * POST /api/referrals/apply { code }
 *
 * Records the signed-in user as a referee of `code`, as 'pending' until they
 * verify their email (confirm_referral then grants the rewards). Called by
 * the sign-up form right after supabase.auth.signUp succeeds; the referee is
 * always the session's user, never a body field. Enforced here:
 *   - the account is new (within APPLY_WINDOW_MS): codes apply at sign-up only;
 *   - no self-referral, and no referral between the same person's addresses
 *     (Gmail dots and +tags folded);
 *   - one referral per account (unique referee_id makes repeats a no-op).
 * Rate-limited per IP. Never reveals who owns a code.
 */
import { NextResponse } from 'next/server';
import { requireUser, getAdminClient } from '@/lib/supabase';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit';
import { applyProblem, codeFormatProblem, normalizeCode } from '@/lib/referrals';
import { findReferrerByCode } from '@/lib/referrals-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MESSAGES = {
  invalid: "We couldn't find that code.",
  self: "You can't use your own referral code.",
  same_person: "That code belongs to an account linked to your email, so it can't be used.",
  too_late: 'Referral codes can only be added when an account is created.',
};

export async function POST(request) {
  const rl = await checkRateLimit(`referral-apply:${getClientIp(request)}`, {
    limit: 10,
    window: '60 s',
  });
  if (!rl.success) return rateLimitResponse(rl);

  let user;
  try {
    ({ user } = await requireUser(request));
  } catch {
    return NextResponse.json({ ok: false, error: 'Not signed in.' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const formatProblem = codeFormatProblem(body?.code);
  if (formatProblem) return NextResponse.json({ ok: false, error: formatProblem }, { status: 400 });
  const code = normalizeCode(body.code);

  const admin = getAdminClient();
  try {
    const referrerId = await findReferrerByCode(admin, code);
    let referrerEmail = null;
    if (referrerId) {
      const { data } = await admin.auth.admin.getUserById(referrerId);
      referrerEmail = data?.user?.email || null;
    }
    const problem = applyProblem({
      referrerId,
      refereeId: user.id,
      referrerEmail,
      refereeEmail: user.email,
      refereeCreatedAt: user.created_at,
    });
    if (problem) {
      return NextResponse.json({ ok: false, error: MESSAGES[problem] }, { status: 400 });
    }

    const { error } = await admin
      .from('referrals')
      .upsert(
        { referrer_id: referrerId, referee_id: user.id, code, status: 'pending' },
        { onConflict: 'referee_id', ignoreDuplicates: true },
      );
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch {
    /* Before the migration is applied, or a transient failure: sign-up must
       still succeed, so this is a soft failure. */
    return NextResponse.json(
      { ok: false, error: 'Your referral could not be saved. Contact support with the code.' },
      { status: 503 },
    );
  }
}
