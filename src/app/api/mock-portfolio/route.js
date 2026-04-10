import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

/** Admin client bypasses RLS — used as fallback if anon auth is unavailable */
function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

/** Resolve user from cookie session OR Bearer token in Authorization header */
async function resolveUser(request) {
  // 1. Try cookie-based session (standard Next.js SSR path)
  try {
    const supabase = createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) return user;
  } catch { /* fall through */ }

  // 2. Try Bearer token from Authorization header (used by sendBeacon / unload flush)
  const authHeader = request.headers.get('authorization') || '';
  const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;

  // 3. Try token from query param (used by sendBeacon which can't set headers)
  const url = new URL(request.url);
  const queryToken = url.searchParams.get('token');

  const token = bearerToken || queryToken;
  if (token) {
    const admin = getAdminClient();
    if (admin) {
      const { data } = await admin.auth.getUser(token);
      if (data?.user) return data.user;
    }
  }

  return null;
}

export async function GET(request) {
  try {
    const user = await resolveUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const admin = getAdminClient();
    const supabase = admin ?? createServerSupabase();

    const { data, error } = await supabase
      .from('mock_portfolios')
      .select('portfolio, updated_at')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      console.error('[mock-portfolio GET] db error:', error.message, 'user:', user.id);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      portfolio: data?.portfolio ?? null,
      updated_at: data?.updated_at ?? null,
    });
  } catch (e) {
    console.error('[mock-portfolio GET] exception:', e?.message);
    return NextResponse.json({ error: e?.message || 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const user = await resolveUser(request);
    if (!user) {
      console.error('[mock-portfolio POST] no user — cookie and bearer both failed');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      // sendBeacon sends text/plain — try text parse
      const text = await request.text().catch(() => '{}');
      try { body = JSON.parse(text); } catch { body = {}; }
    }

    const portfolio = body?.portfolio;
    if (!portfolio || typeof portfolio !== 'object') {
      return NextResponse.json({ error: 'Invalid portfolio' }, { status: 400 });
    }

    // Always use admin client for writes — bypasses RLS entirely, guaranteed success
    const admin = getAdminClient();
    const supabase = admin ?? createServerSupabase();

    const { data, error } = await supabase
      .from('mock_portfolios')
      .upsert(
        { user_id: user.id, portfolio, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' }
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
    return NextResponse.json({ error: e?.message || 'Internal server error' }, { status: 500 });
  }
}
