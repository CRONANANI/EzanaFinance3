import { NextResponse } from 'next/server';
import { resend } from '@/lib/services/resend';
import { getAdminClient, requireUser } from '@/lib/supabase';
import { enforceAuthRateLimit } from '@/lib/auth-rate-limit';
import { sanitizeEmail } from '@/lib/sanitize';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(request) {
  const limited = await enforceAuthRateLimit(request, { endpointLabel: 'send-verification' });
  if (limited) return limited;

  try {
    if (!process.env.RESEND_API_KEY) {
      console.error('RESEND_API_KEY is not set');
      return NextResponse.json({ error: 'Email delivery is not configured' }, { status: 503 });
    }

    let user;
    let supabase;
    try {
      const auth = await requireUser(request);
      user = auth.user;
      supabase = auth.client;
    } catch {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    let supabaseAdmin;
    try {
      supabaseAdmin = getAdminClient();
    } catch {
      console.error(
        'send-verification: missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL',
      );
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    let { data: profile } = await supabase
      .from('profiles')
      .select('email_verified')
      .eq('id', user.id)
      .maybeSingle();

    if (!profile) {
      const email = sanitizeEmail(user.email ?? '');
      const { error: insertProfileErr } = await supabaseAdmin.from('profiles').insert({
        id: user.id,
        email,
        email_verified: false,
        onboarding_completed: true,
        updated_at: new Date().toISOString(),
      });
      if (insertProfileErr) {
        console.error('send-verification: profile insert', insertProfileErr);
        return NextResponse.json({ error: 'Could not prepare your account' }, { status: 500 });
      }
      profile = { email_verified: false };
    }

    if (profile.email_verified) {
      return NextResponse.json(
        { error: 'Email already verified', alreadyVerified: true },
        { status: 200 },
      );
    }

    const { data: recentCode, error: recentErr } = await supabaseAdmin
      .from('email_verification_codes')
      .select('created_at')
      .eq('user_id', user.id)
      .eq('verified', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!recentErr && recentCode?.created_at) {
      const secondsSinceLastCode = (Date.now() - new Date(recentCode.created_at).getTime()) / 1000;
      if (secondsSinceLastCode < 60) {
        const waitSeconds = Math.ceil(60 - secondsSinceLastCode);
        return NextResponse.json(
          { error: `Please wait ${waitSeconds} seconds before requesting a new code` },
          { status: 429 },
        );
      }
    }

    await supabaseAdmin
      .from('email_verification_codes')
      .delete()
      .eq('user_id', user.id)
      .eq('verified', false);

    const code = generateCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    const email = sanitizeEmail(user.email ?? '');
    if (!email) {
      return NextResponse.json({ error: 'Account email is missing' }, { status: 400 });
    }

    const { error: insertError } = await supabaseAdmin.from('email_verification_codes').insert({
      user_id: user.id,
      email,
      code,
      expires_at: expiresAt,
    });

    if (insertError) {
      console.error('Failed to store verification code:', insertError);
      return NextResponse.json({ error: 'Failed to generate code' }, { status: 500 });
    }

    const fromAddress = process.env.RESEND_FROM_EMAIL || 'Ezana Finance <noreply@ezana.world>';

    const { error: emailError } = await resend.emails.send({
      from: fromAddress,
      to: email,
      subject: 'Your Ezana Finance verification code',
      html: `<div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
          <h2 style="color: #10b981; margin-bottom: 8px;">Ezana Finance</h2>
          <p style="color: #333; font-size: 16px;">Your verification code is:</p>
          <div style="background: #f0fdf4; border: 2px solid #10b981; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0;">
            <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #065f46;">${code}</span>
          </div>
          <p style="color: #666; font-size: 14px;">This code expires in 10 minutes.</p>
          <p style="color: #666; font-size: 14px;">If you did not create an account with Ezana Finance, you can safely ignore this email.</p>
        </div>`,
    });

    if (emailError) {
      console.error('Failed to send email:', emailError);
      return NextResponse.json({ error: 'Failed to send verification email' }, { status: 500 });
    }

    const [localPart, domain] = email.split('@');
    const maskedEmail = `${localPart.slice(0, 2)}${'*'.repeat(Math.max(localPart.length - 2, 2))}@${domain}`;

    return NextResponse.json({ success: true, email: maskedEmail });
  } catch (error) {
    console.error('Send verification error:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
