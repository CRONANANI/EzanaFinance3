import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

/** Extract bearer token from Authorization header OR x-auth-token header */
function extractToken(request) {
  const auth = request.headers.get('authorization') || '';
  if (auth.startsWith('Bearer ')) return auth.slice(7).trim();
  const custom = request.headers.get('x-auth-token') || '';
  if (custom) return custom.trim();
  return null;
}

/** Validate token and return user using admin client */
async function getUser(token) {
  const admin = getAdminClient();
  if (!admin) return null;
  if (!token) return null;
  try {
    const { data, error } = await admin.auth.getUser(token);
    if (error || !data?.user) return null;
    return data.user;
  } catch {
    return null;
  }
}

export async function GET(request) {
  try {
    const token = extractToken(request);
    const user = await getUser(token);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const admin = getAdminClient();
    if (!admin) {
      console.error('[mock-portfolio GET] missing SUPABASE_SERVICE_ROLE_KEY');
      return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
    }
    const { data, error } = await admin
      .from('mock_portfolios')
      .select('portfolio, updated_at')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      console.error('[mock-portfolio GET]', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      portfolio: data?.portfolio ?? null,
      updated_at: data?.updated_at ?? null,
    });
  } catch (e) {
    console.error('[mock-portfolio GET] exception:', e?.message);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const token = extractToken(request);
    const user = await getUser(token);

    if (!user) {
      console.error('[mock-portfolio POST] no valid token');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const portfolio = body?.portfolio;

    if (!portfolio || typeof portfolio !== 'object') {
      return NextResponse.json({ error: 'Invalid portfolio' }, { status: 400 });
    }

    const admin = getAdminClient();
    if (!admin) {
      console.error('[mock-portfolio POST] missing SUPABASE_SERVICE_ROLE_KEY');
      return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
    }
    const { data, error } = await admin
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
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
