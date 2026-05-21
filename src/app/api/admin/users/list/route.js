import { NextResponse } from 'next/server';
import { getAdminClient, requireUser } from '@/lib/supabase';
import { isAdminUser } from '@/lib/admin-helpers';
import { sanitizeFilterValue } from '@/lib/sanitize';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/admin/users/list?q=<search>&limit=20
 */
export async function GET(request) {
  try {
    let user;
    try {
      const auth = await requireUser(request);
      user = auth.user;
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!isAdminUser(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const supabaseAdmin = getAdminClient();

    const { searchParams } = new URL(request.url);
    const q = (searchParams.get('q') || '').trim();
    const limit = Math.min(50, Math.max(5, parseInt(searchParams.get('limit') || '20', 10)));

    let query = supabaseAdmin
      .from('profiles')
      .select('id, username, full_name, is_partner, created_at')
      .order('is_partner', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(limit);

    if (q) {
      const safe = sanitizeFilterValue(q, 100);
      if (safe) {
        query = query.or(`full_name.ilike.%${safe}%,username.ilike.%${safe}%`);
      }
    }

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ users: data || [] });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function OPTIONS(request) {
  try {
    let user;
    try {
      const auth = await requireUser(request);
      user = auth.user;
    } catch {
      return new NextResponse(null, { status: 401 });
    }
    if (!isAdminUser(user)) return new NextResponse(null, { status: 403 });
    return new NextResponse(null, { status: 204 });
  } catch {
    return new NextResponse(null, { status: 500 });
  }
}
