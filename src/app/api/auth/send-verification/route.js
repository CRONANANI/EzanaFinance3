import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { resend } from '@/lib/resend';
import { createServerSupabaseClient } from '@/lib/supabase-service-role';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST() {
  try {
    if (!process.env.RESEND_API_KEY) {
      console.error('RESEND_API_KEY is not set');
      return NextResponse.json({ error: 'Email delivery is not configured' }, { status: 503 });
    }

    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              try {
                cookieStore.set(name, value, options);
              } catch {
                // ignore
              }
            });
          },
        },
      }
    );

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('email_verified')
      .eq('id', user.id)
      .maybeSingle();

    if (profile?.email_verified) {
      return NextResponse.json(
        { error: 'Email already verified', alreadyVerified: true },
        { status: 200 }
      );
    }

    const supabaseAdmin = createServerSupabaseClient();

    const { data: recentCode, error: recentErr } = await supabaseAdmin
      .from('email_verification_codes')
      .select('created_at')
      .eq('user_id', user.id)
      .eq('verified', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!recentErr && recentCode?.created_at) {
      const secondsSinceLastCode =
        (Date.now() - new Date(recentCode.created_at).getTime()) / 1000;
      if (secondsSinceLastCode < 60) {
        const waitSeconds = Math.ceil(60 - secondsSinceLastCode);
        return NextResponse.json(
          { error: `Please wait ${waitSeconds} seconds before requesting a new code` },
          { status: 429 }
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

    const { error: insertError } = await supabaseAdmin.from('email_verification_codes').insert({
      user_id: user.id,
      email: user.email,
      code,
      expires_at: expiresAt,
    });

    if (insertError) {
      console.error('Failed to store verification code:', insertError);
      return NextResponse.json({ error: 'Failed to generate code' }, { status: 500 });
    }

    const fromAddress =
      process.env.RESEND_FROM_EMAIL || 'Ezana Finance <noreply@ezana.world>';

    const { error: emailError } = await resend.emails.send({
      from: fromAddress,
      to: user.email,
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

    const [localPart, domain] = user.email.split('@');
    const maskedEmail = `${localPart.slice(0, 2)}${'*'.repeat(Math.max(localPart.length - 2, 2))}@${domain}`;

    return NextResponse.json({ success: true, email: maskedEmail });
  } catch (error) {
    console.error('Send verification error:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
