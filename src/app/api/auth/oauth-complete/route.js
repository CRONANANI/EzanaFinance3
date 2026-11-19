/**
 * POST /api/auth/oauth-complete  { ageConfirmed }
 *
 * Called by /auth/callback right after a Google or GitHub sign-in, before the
 * visitor is routed anywhere. Sign-up is invite-only, so:
 *
 *   an established account           200 { ok, state }   carry on
 *   a live invite for this email     the 18+ confirmation is required, then
 *                                    the account is finished exactly as
 *                                    /api/auth/accept-invite finishes one
 *                                    (username, verified, waitlist joined)
 *   no invite                        403 { uninvited }   and, when the
 *                                    provider created the user moments ago,
 *                                    that user is removed again so the email
 *                                    stays free for a later invite
 */
import { NextResponse } from 'next/server';
import { randomInt } from 'node:crypto';
import { getAdminClient, requireUser } from '@/lib/supabase';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit';
import { classifyOAuthAccount } from '@/lib/auth/oauth-gate';
import { inviteNames } from '@/lib/waitlist/invite';
import { USERNAME_RE, RESERVED_USERNAME_RE } from '@/lib/auth/password-rules';
import { isTrue } from '@/lib/legal/consent';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/* Only a user the provider created within this window is removed. */
const FRESH_MS = 30 * 60 * 1000;

/** A free username from the email's local part, or null if none is found. */
async function pickUsername(admin, email) {
  let base = String(email || '')
    .split('@')[0]
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 24);
  if (base.length < 3 || RESERVED_USERNAME_RE.test(base)) base = 'investor';
  for (let i = 0; i < 6; i += 1) {
    const candidate = i === 0 ? base : `${base}_${randomInt(1000, 10000)}`;
    if (!USERNAME_RE.test(candidate) || RESERVED_USERNAME_RE.test(candidate)) continue;
    const { data, error } = await admin
      .from('profiles')
      .select('id')
      .eq('username', candidate)
      .limit(1);
    if (!error && (!data || data.length === 0)) return candidate;
  }
  return null;
}

export async function POST(request) {
  const rl = await checkRateLimit(`auth:oauth-complete:${getClientIp(request)}`, { limit: 20 });
  if (!rl.success) return rateLimitResponse(rl);

  let sessionUser;
  try {
    sessionUser = (await requireUser(request)).user;
  } catch {
    return NextResponse.json({ ok: false, error: 'Not authenticated' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const admin = getAdminClient();

  let found;
  try {
    found = await classifyOAuthAccount(admin, sessionUser.id);
  } catch (err) {
    console.error('[oauth-complete] classify failed:', err?.message || err);
    return NextResponse.json({ ok: false, error: 'Could not check the account.' }, { status: 500 });
  }
  const { state, user, invite } = found;

  if (state === 'verified' || state === 'legacy') {
    return NextResponse.json({ ok: true, state });
  }

  if (state === 'invited') {
    const { firstName, lastName } = inviteNames(invite);
    if (!isTrue(body?.ageConfirmed)) {
      return NextResponse.json({ ok: false, needsAge: true, firstName }, { status: 200 });
    }
    const username = await pickUsername(admin, user.email);
    const fullName = invite.full_name || `${firstName} ${lastName}`.trim();
    const { error: metaErr } = await admin.auth.admin.updateUserById(user.id, {
      user_metadata: {
        ...(user.user_metadata || {}),
        full_name: fullName || user.user_metadata?.full_name || '',
        first_name: firstName,
        last_name: lastName,
        ...(username ? { username } : {}),
        age_confirmed: true,
        age_confirmed_at: new Date().toISOString(),
      },
    });
    if (metaErr) console.error('[oauth-complete] metadata update failed:', metaErr.message);

    const { error: profErr } = await admin
      .from('profiles')
      .update({ ...(username ? { username } : {}), email_verified: true })
      .eq('id', user.id);
    if (profErr) {
      console.error('[oauth-complete] profile update failed:', user.id, profErr.message);
      return NextResponse.json(
        { ok: false, error: 'Could not finish creating the account. Please try again.' },
        { status: 500 },
      );
    }

    const { error: wlErr } = await admin
      .from('waitlist')
      .update({
        status: 'joined',
        joined_at: new Date().toISOString(),
        joined_user_id: user.id,
        invite_token_hash: null,
      })
      .eq('id', invite.id);
    if (wlErr) console.error('[oauth-complete] waitlist update failed:', invite.id, wlErr.message);

    return NextResponse.json({
      ok: true,
      state: 'joined',
      referralCode: invite.metadata?.referral_code || null,
      redirect: invite.metadata?.redirect || null,
    });
  }

  if (state === 'uninvited') {
    const age = Date.now() - new Date(user.created_at).getTime();
    if (Number.isFinite(age) && age < FRESH_MS) {
      const { error: delErr } = await admin.auth.admin.deleteUser(user.id);
      if (delErr) console.error('[oauth-complete] cleanup failed:', user.id, delErr.message);
    }
    return NextResponse.json({ ok: false, uninvited: true }, { status: 403 });
  }

  return NextResponse.json({ ok: false, error: 'Could not check the account.' }, { status: 500 });
}
