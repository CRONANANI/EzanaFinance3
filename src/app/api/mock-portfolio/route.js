import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

/** Admin client — bypasses RLS for guaranteed writes. Only used server-side. */
function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function GET() {
  try {
    const supabase = createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use admin client to read — avoids any RLS read issues
    const admin = getAdminClient();
    const client = admin ?? supabase;

    const { data, error } = await client
      .from('mock_portfolios')
      .select('portfolio, updated_at')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      console.error('[mock-portfolio GET] db error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      portfolio: data?.portfolio ?? null,
      updated_at: data?.updated_at ?? null,
    });
  } catch (e) {
    console.error('[mock-portfolio GET] exception:', e?.message);
    return NextResponse.json(
      { error: e?.message || 'Internal server error' },
      { status: 500 },
    );
  }
}

export async function POST(request) {
  try {
    const supabase = createServerSupabase();
    let {
      data: { user },
    } = await supabase.auth.getUser();

    // Fallback: accept Bearer token in Authorization header (used by sendBeacon / unload flush)
    if (!user) {
      const authHeader = request.headers.get('authorization') || '';
      const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
      if (token) {
        const admin = getAdminClient();
        if (admin) {
          const { data } = await admin.auth.getUser(token);
          user = data?.user ?? null;
        }
      }
    }

    if (!user) {
      console.error('[mock-portfolio POST] no user session');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const portfolio = body?.portfolio;
    if (!portfolio || typeof portfolio !== 'object') {
      return NextResponse.json({ error: 'Invalid portfolio' }, { status: 400 });
    }

    // Use admin client to write — guarantees the upsert succeeds even if
    // the anon key RLS policy has a timing issue on first login.
    const admin = getAdminClient();
    const client = admin ?? supabase;

    const { data, error } = await client
      .from('mock_portfolios')
      .upsert(
        {
          user_id: user.id,
          portfolio,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' },
      )
      .select('updated_at')
      .single();

    if (error) {
      console.error('[mock-portfolio POST] upsert error:', error.message, 'user:', user.id);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, updated_at: data.updated_at });
  } catch (e) {
    console.error('[mock-portfolio POST] exception:', e?.message);
    return NextResponse.json(
      { error: e?.message || 'Internal server error' },
      { status: 500 },
    );
  }
}
