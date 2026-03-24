import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const { code } = await request.json();

    if (!code || String(code).length !== 6) {
      return NextResponse.json({ error: 'Please enter a valid 6-digit code' }, { status: 400 });
    }

    const codeStr = String(code).trim();

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

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey) {
      console.error('verify-code: missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

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
        { status: 400 }
      );
    }

    if (verificationRecord.attempts >= 5) {
      await supabaseAdmin.from('email_verification_codes').delete().eq('id', verificationRecord.id);

      return NextResponse.json(
        { error: 'Too many attempts. Please request a new code.' },
        { status: 429 }
      );
    }

    if (new Date(verificationRecord.expires_at) < new Date()) {
      await supabaseAdmin.from('email_verification_codes').delete().eq('id', verificationRecord.id);

      return NextResponse.json(
        { error: 'Code has expired. Please request a new one.' },
        { status: 400 }
      );
    }

    if (verificationRecord.code !== codeStr) {
      const newAttempts = verificationRecord.attempts + 1;
      await supabaseAdmin
        .from('email_verification_codes')
        .update({ attempts: newAttempts })
        .eq('id', verificationRecord.id);

      if (newAttempts >= 5) {
        await supabaseAdmin.from('email_verification_codes').delete().eq('id', verificationRecord.id);
        return NextResponse.json(
          { error: 'Too many attempts. Please request a new code.' },
          { status: 429 }
        );
      }

      const remainingAttempts = 5 - newAttempts;
      return NextResponse.json(
        {
          error: `Incorrect code. ${remainingAttempts} attempt${remainingAttempts !== 1 ? 's' : ''} remaining.`,
        },
        { status: 400 }
      );
    }

    await supabaseAdmin
      .from('email_verification_codes')
      .update({ verified: true })
      .eq('id', verificationRecord.id);

    const now = new Date().toISOString();

    const email = user.email ?? null;
    if (!email) {
      console.error('verify-code: authenticated user has no email on profile');
      return NextResponse.json({ error: 'Account email is missing' }, { status: 400 });
    }

    const { data: updatedRows, error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({
        email,
        email_verified: true,
        updated_at: now,
      })
      .eq('id', user.id)
      .select('id');

    if (updateError) {
      console.error('Failed to update profile (verify-code):', updateError);
      return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
    }

    if (!updatedRows?.length) {
      const { error: insertError } = await supabaseAdmin.from('profiles').insert({
        id: user.id,
        email,
        email_verified: true,
        onboarding_completed: false,
        updated_at: now,
      });

      if (insertError) {
        console.error('Failed to insert profile (verify-code):', insertError);
        return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Verify code error:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
