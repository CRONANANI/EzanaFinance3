/**
 * POST /api/auth/trial-signup
 *   { firstName, lastName, email, username, password, ageConfirmed }
 *
 * The one way to create an account without a waitlist invite (Nov 21, 2026):
 * the Advanced plan's free one-month trial on /pricing. The account is created
 * here, the page signs in and goes straight to Stripe Checkout for Advanced
 * with the trial. Every other plan still joins the waitlist.
 *
 * The account carries user_metadata.requires_checkout = true until Stripe
 * reports a trialing or active subscription, so leaving at the Stripe step
 * does not unlock the app (src/lib/trial.js, DashboardTrialShell).
 *
 * No email enumeration beyond what sign-in already reveals: an existing
 * address is told to sign in instead.
 */
import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit';
import {
  EMAIL_RE,
  USERNAME_RE,
  RESERVED_USERNAME_RE,
  validatePassword,
} from '@/lib/auth/password-rules';
import { isTrue } from '@/lib/legal/consent';

export const dynamic = 'force-dynamic';

const str = (v) => (typeof v === 'string' ? v.trim() : '');
const fail = (status, error, field) =>
  NextResponse.json({ ok: false, error, ...(field ? { field } : {}) }, { status });

export async function POST(request) {
  const rl = await checkRateLimit(`auth:trial-signup:${getClientIp(request)}`, {
    limit: 5,
    window: '600 s',
  });
  if (!rl.success) return rateLimitResponse(rl);

  const body = await request.json().catch(() => null);
  const firstName = str(body?.firstName);
  const lastName = str(body?.lastName);
  const email = str(body?.email).toLowerCase();
  const username = str(body?.username).toLowerCase();
  const password = typeof body?.password === 'string' ? body.password : '';

  if (!firstName || firstName.length > 60) return fail(400, 'Enter your first name.', 'firstName');
  if (!lastName || lastName.length > 60) return fail(400, 'Enter your last name.', 'lastName');
  if (!EMAIL_RE.test(email) || email.length > 254) {
    return fail(400, 'Enter a valid email address.', 'email');
  }
  if (!USERNAME_RE.test(username)) {
    return fail(
      400,
      'Usernames are 3 to 30 lowercase letters, numbers or underscores.',
      'username',
    );
  }
  if (RESERVED_USERNAME_RE.test(username)) {
    return fail(409, 'That username is not available.', 'username');
  }
  const pwdErrors = validatePassword(password);
  if (pwdErrors.length) {
    return fail(400, `Password must contain: ${pwdErrors.join(', ')}`, 'password');
  }
  if (!isTrue(body?.ageConfirmed)) {
    return fail(400, 'You must be 18 or older to use Ezana.', 'ageConfirmed');
  }

  const admin = getAdminClient();
  const { data: taken, error: takenErr } = await admin
    .from('profiles')
    .select('id')
    .eq('username', username)
    .limit(1);
  if (takenErr) {
    console.error('[trial-signup] username check failed:', takenErr.message);
    return fail(500, 'Could not create the account. Please try again.');
  }
  if (taken && taken.length) return fail(409, 'That username is taken.', 'username');

  const fullName = `${firstName} ${lastName}`;
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
      first_name: firstName,
      last_name: lastName,
      username,
      age_confirmed: true,
      age_confirmed_at: new Date().toISOString(),
      signup_source: 'advanced_trial',
      requires_checkout: true,
    },
    /* Nov 21: the same marker in app_metadata, which only the server can
       write. user_metadata is editable by the user, so server-side plan and
       waitlist checks read this copy (isTrialSignupAccount). */
    app_metadata: { signup_source: 'advanced_trial' },
  });
  if (createErr || !created?.user) {
    const msg = String(createErr?.message || '');
    if (/already.*(registered|exists)/i.test(msg) || createErr?.code === 'email_exists') {
      return fail(409, 'An account already exists for this email. Sign in instead.', 'email');
    }
    console.error('[trial-signup] createUser failed:', msg);
    return fail(500, 'Could not create the account. Please try again.');
  }

  const { error: profErr } = await admin
    .from('profiles')
    .update({ username, email_verified: true })
    .eq('id', created.user.id);
  if (profErr) {
    console.error('[trial-signup] profile update failed:', created.user.id, profErr.message);
  }

  return NextResponse.json({ ok: true, email });
}
