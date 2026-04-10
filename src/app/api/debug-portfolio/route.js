import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

/**
 * Diagnostic endpoint for mock portfolio pipeline (env + auth + DB touch).
 * Does not expose secrets — only booleans and non-sensitive ids.
 */
export async function GET() {
  const env = {
    hasPublicUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    hasServiceRoleKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
  };

  let auth = { cookieSession: false, userId: null, email: null };
  try {
    const supabase = createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      auth = {
        cookieSession: true,
        userId: user.id,
        email: user.email ?? null,
      };
    }
  } catch (e) {
    auth.error = e?.message ?? 'auth check failed';
  }

  let mockPortfolioRow = null;
  if (auth.userId) {
    const admin = getAdminClient();
    const client = admin ?? createServerSupabase();
    const { data, error } = await client
      .from('mock_portfolios')
      .select('updated_at')
      .eq('user_id', auth.userId)
      .maybeSingle();
    mockPortfolioRow = error
      ? { ok: false, error: error.message }
      : { ok: true, hasRow: !!data, updated_at: data?.updated_at ?? null };
  }

  return NextResponse.json({
    ok: true,
    at: new Date().toISOString(),
    env,
    auth,
    mock_portfolios: mockPortfolioRow,
    note: 'Safe diagnostics only — no API keys returned.',
  });
}
