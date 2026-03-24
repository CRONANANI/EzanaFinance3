import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-service-role';

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

    const supabaseAdmin = createServerSupabaseClient();

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

    const { error: profileErr } = await supabaseAdmin.from('profiles').upsert(
      {
        id: user.id,
        email_verified: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    );

    if (profileErr) {
      console.error('Verify code profile update:', profileErr);
      return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Verify code error:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
