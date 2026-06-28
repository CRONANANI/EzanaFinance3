import { NextResponse } from 'next/server';
import { awardELO } from '@/lib/elo';
import { getAdminClient, requireUser } from '@/lib/supabase';
import { enforceAuthRateLimit } from '@/lib/auth-rate-limit';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit';
import { sanitizeText, sanitizeEmail } from '@/lib/sanitize';

async function grantEmailVerifiedElo(supabaseAdmin, userId) {
  try {
    const { data: existingActivity } = await supabaseAdmin
      .from('elo_transactions')
      .select('id')
      .eq('user_id', userId)
      .eq('category', 'activity')
      .eq('reason', 'Email verified + onboarding completed')
      .maybeSingle();

    if (!existingActivity) {
      await awardELO(userId, 25, 'Email verified + onboarding completed', 'activity', {
        event: 'email_verified',
      });
    }
  } catch (eloErr) {
    console.error('[verify-code] awardELO failed (non-fatal):', eloErr);
  }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request) {
  const rl = await checkRateLimit(`auth:verify-code:${getClientIp(request)}`, {
    limit: 15,
    window: '60 s',
  });
  if (!rl.success) return rateLimitResponse(rl);

  const limited = await enforceAuthRateLimit(request, { endpointLabel: 'verify-code' });
  if (limited) return limited;

  try {
    const { code } = await request.json();
    const codeStr = sanitizeText(String(code ?? ''), 16);

    if (!codeStr || codeStr.length !== 6) {
      return NextResponse.json({ error: 'Please enter a valid 6-digit code' }, { status: 400 });
    }

    let user;
    try {
      const auth = await requireUser(request);
      user = auth.user;
    } catch {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    let supabaseAdmin;
    try {
      supabaseAdmin = getAdminClient();
    } catch {
      console.error('verify-code: missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const { data: verificationRecord, error: fetchError } = await supabaseAdmin
      .from('email_verification_codes')
      .select('*')
      .eq('user_id', user.id)
      .eq('verified', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (fetchError || !verificationRecord) {
      return NextResponse.json(
        { error: 'No verification code found. Please request a new one.' },
        { status: 400 },
      );
    }

    if (verificationRecord.attempts >= 5) {
      await supabaseAdmin.from('email_verification_codes').delete().eq('id', verificationRecord.id);

      return NextResponse.json(
        { error: 'Too many attempts. Please request a new code.' },
        { status: 429 },
      );
    }

    if (new Date(verificationRecord.expires_at) < new Date()) {
      await supabaseAdmin.from('email_verification_codes').delete().eq('id', verificationRecord.id);

      return NextResponse.json(
        { error: 'Code has expired. Please request a new one.' },
        { status: 400 },
      );
    }

    if (verificationRecord.code !== codeStr) {
      const newAttempts = verificationRecord.attempts + 1;
      await supabaseAdmin
        .from('email_verification_codes')
        .update({ attempts: newAttempts })
        .eq('id', verificationRecord.id);

      if (newAttempts >= 5) {
        await supabaseAdmin
          .from('email_verification_codes')
          .delete()
          .eq('id', verificationRecord.id);
        return NextResponse.json(
          { error: 'Too many attempts. Please request a new code.' },
          { status: 429 },
        );
      }

      const remainingAttempts = 5 - newAttempts;
      return NextResponse.json(
        {
          error: `Incorrect code. ${remainingAttempts} attempt${remainingAttempts !== 1 ? 's' : ''} remaining.`,
        },
        { status: 400 },
      );
    }

    await supabaseAdmin
      .from('email_verification_codes')
      .update({ verified: true })
      .eq('id', verificationRecord.id);

    const now = new Date().toISOString();

    const email = sanitizeEmail(user.email ?? '');
    if (!email) {
      console.error('verify-code: authenticated user has no email on profile');
      return NextResponse.json({ error: 'Account email is missing' }, { status: 400 });
    }

    const { data: updatedRows, error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({
        email,
        email_verified: true,
        onboarding_completed: true,
        updated_at: now,
      })
      .eq('id', user.id)
      .select('id');

    if (updateError) {
      console.error('Failed to update profile (verify-code):', updateError);
      return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
    }

    if (updatedRows?.length) {
      await grantEmailVerifiedElo(supabaseAdmin, user.id);
      return NextResponse.json({ success: true });
    }

    const { error: insertError } = await supabaseAdmin.from('profiles').insert({
      id: user.id,
      email,
      email_verified: true,
      onboarding_completed: true,
      updated_at: now,
    });

    if (insertError) {
      console.error('Failed to insert profile (verify-code):', insertError);
      return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
    }

    await grantEmailVerifiedElo(supabaseAdmin, user.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Verify code error:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
