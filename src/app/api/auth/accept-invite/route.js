/**
 * POST /api/auth/accept-invite  { token, username, password, ageConfirmed }
 *
 * The only way to create an account: a live waitlist invite. The account is
 * created server side for the invited email (already proven by the link), the
 * new-user trigger writes the profile row, then the username is set and the
 * invite is marked joined and its token cleared. Never returns the token.
 * The 18+ confirmation is required and its time is kept in user_metadata.
 */
import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit';
import { findInvite, inviteNames } from '@/lib/waitlist/invite';
import { USERNAME_RE, validatePassword } from '@/lib/auth/password-rules';
import { isTrue } from '@/lib/legal/consent';

export const dynamic = 'force-dynamic';

const DEAD = { ok: false, error: 'This invite link is invalid or has expired.' };

export async function POST(request) {
  const rl = await checkRateLimit(`auth:accept-invite:${getClientIp(request)}`, { limit: 10 });
  if (!rl.success) return rateLimitResponse(rl);

  const body = await request.json().catch(() => null);
  const token = typeof body?.token === 'string' ? body.token : '';
  const username = typeof body?.username === 'string' ? body.username.trim().toLowerCase() : '';
  const password = typeof body?.password === 'string' ? body.password : '';

  const admin = getAdminClient();
  let invite;
  try {
    invite = await findInvite(admin, token);
  } catch (err) {
    console.error('[accept-invite] lookup failed:', err?.message || err);
  }
  if (!invite) return NextResponse.json(DEAD, { status: 404 });

  if (!isTrue(body?.ageConfirmed)) {
    return NextResponse.json(
      { ok: false, field: 'ageConfirmed', error: 'You must be 18 or older to use Ezana.' },
      { status: 400 },
    );
  }

  const pwdErrors = validatePassword(password);
  if (pwdErrors.length) {
    return NextResponse.json(
      { ok: false, field: 'password', error: `Password must contain: ${pwdErrors.join(', ')}` },
      { status: 400 },
    );
  }
  if (!USERNAME_RE.test(username)) {
    return NextResponse.json(
      {
        ok: false,
        field: 'username',
        error: 'Usernames are 3 to 30 lowercase letters, numbers or underscores.',
      },
      { status: 400 },
    );
  }

  const { data: taken, error: takenErr } = await admin
    .from('profiles')
    .select('id')
    .eq('username', username)
    .limit(1);
  if (takenErr) {
    console.error('[accept-invite] username check failed:', takenErr.message);
    return NextResponse.json(
      { ok: false, error: 'Could not create the account. Please try again.' },
      { status: 500 },
    );
  }
  if (taken && taken.length) {
    return NextResponse.json(
      { ok: false, field: 'username', error: 'That username is taken.' },
      { status: 409 },
    );
  }

  const { firstName, lastName } = inviteNames(invite);
  const fullName = invite.full_name || `${firstName} ${lastName}`.trim();
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email: invite.email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
      first_name: firstName,
      last_name: lastName,
      username,
      age_confirmed: true,
      age_confirmed_at: new Date().toISOString(),
    },
  });
  if (createErr || !created?.user) {
    const msg = String(createErr?.message || '');
    if (/already.*(registered|exists)/i.test(msg) || createErr?.code === 'email_exists') {
      return NextResponse.json(
        { ok: false, error: 'An account already exists for this email. Sign in instead.' },
        { status: 409 },
      );
    }
    console.error('[accept-invite] createUser failed:', msg);
    return NextResponse.json(
      { ok: false, error: 'Could not create the account. Please try again.' },
      { status: 500 },
    );
  }

  const userId = created.user.id;
  /* The account works from here on; a failure below is logged, not fatal. */
  const { error: profErr } = await admin
    .from('profiles')
    .update({ username, email_verified: true })
    .eq('id', userId);
  if (profErr) console.error('[accept-invite] profile update failed:', userId, profErr.message);

  const { error: wlErr } = await admin
    .from('waitlist')
    .update({
      status: 'joined',
      joined_at: new Date().toISOString(),
      joined_user_id: userId,
      invite_token_hash: null,
    })
    .eq('id', invite.id);
  if (wlErr) console.error('[accept-invite] waitlist update failed:', invite.id, wlErr.message);

  return NextResponse.json({
    ok: true,
    email: invite.email,
    referralCode: invite.metadata?.referral_code || null,
    redirect: invite.metadata?.redirect || null,
  });
}
